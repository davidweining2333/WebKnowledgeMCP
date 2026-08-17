import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PlaywrightBrowserAdapter } from '../../browser/playwright-browser.adapter.js';
import { SiteProfile, SiteWorkflowAction, WorkflowParameter } from '../../common/types.js';
import { InteractiveControl, InteractiveField } from '../../browser/browser-adapter.interface.js';

@Injectable()
export class OnboardingAgentService {
  constructor(private readonly browser: PlaywrightBrowserAdapter) {}

  async learn(url: string): Promise<SiteProfile> {
    await this.browser.open(url);
    let html = await this.browser.content();
    this.assertNotBlocked(html, await this.browser.currentUrl());

    const initialPage = cheerio.load(html);
    const pageType = this.isContentPage(initialPage) ? 'content' : 'listing';
    const workflowActions = pageType === 'content' ? [] : await this.exploreWorkflow(html);
    html = await this.browser.content();
    this.assertNotBlocked(html, await this.browser.currentUrl());

    const $ = cheerio.load(html);
    const siteName = this.siteName($, url);
    const articleSelector = this.bestArticleSelector($);
    const interactiveScore = this.interactiveScore($, html);

    return {
      url,
      loginRequired: $('form input[type="password"]').length > 0,
      loginType: $('form input[type="password"]').length > 0 ? 'password' : 'none',
      entrySelector: 'body',
      articleSelector: articleSelector || 'a',
      nextPageSelector: this.firstExistingSelector($, ['a[rel="next"]', '.next a', 'a.next', '[aria-label*="Next"]']) || '',
      attachmentSelector: 'a[href$=".pdf"], a[href$=".docx"], a[href$=".doc"]',
      workflowVersion: 2,
      workflowActions,
      siteName,
      feedType: workflowActions.length > 0 || interactiveScore >= 0.6 && !articleSelector ? 'interactive' : 'static',
      pageType,
    };
  }

  private async exploreWorkflow(initialHtml: string): Promise<SiteWorkflowAction[]> {
    const actions: SiteWorkflowAction[] = [];
    const usedSelectors = new Set<string>();
    const learnedFields = new Set<string>();
    let previousHtml = initialHtml;
    let previousUrl = await this.browser.currentUrl();

    for (let step = 0; step < 6; step += 1) {
      const fields = await this.browser.interactiveFields();
      for (const field of fields) {
        const parameter = this.classifyField(field);
        if (!parameter || learnedFields.has(field.selector)) continue;
        learnedFields.add(field.selector);
        actions.push({
          type: 'fill',
          selector: field.selector,
          parameter,
          label: field.label,
          inputType: field.inputType,
        });
        await this.browser.type(field.selector, this.sampleValue(parameter, field)).catch(() => undefined);
      }

      const controls = await this.browser.interactiveControls();
      const control = this.bestExplorationControl(controls, usedSelectors);
      if (!control) break;
      usedSelectors.add(control.selector);

      try {
        await this.browser.click(control.selector);
        await this.browser.wait(3000);
      } catch {
        continue;
      }

      const currentHtml = await this.browser.content();
      const currentUrl = await this.browser.currentUrl();
      this.assertNotBlocked(currentHtml, currentUrl);
      if (currentHtml === previousHtml && currentUrl === previousUrl) continue;

      actions.push({ type: 'click', selector: control.selector, label: control.label });
      actions.push({ type: 'wait_time', ms: 3000 });
      previousHtml = currentHtml;
      previousUrl = currentUrl;
    }

    return actions;
  }

  private classifyField(field: InteractiveField): WorkflowParameter | undefined {
    const label = `${field.label} ${field.selector}`.toLowerCase();
    if (/\b(from|start|begin|after)\b|起始|开始|从/.test(label)) return 'from';
    if (/\b(to|end|before|through)\b|结束|截止|到/.test(label)) return 'to';
    if (/\b(query|keyword|search|term|text|title|subject|docket)\b|关键词|主题|标题|搜索|查询|检索/.test(label)) return 'query';
    if (field.inputType === 'search') return 'query';
    return undefined;
  }

  private sampleValue(parameter: WorkflowParameter, field: InteractiveField): string {
    if (parameter === 'query') return 'energy';
    const date = new Date();
    if (parameter === 'from') date.setDate(date.getDate() - 30);
    const iso = date.toISOString().slice(0, 10);
    return field.inputType === 'date' ? iso : this.formatDateForLabel(iso, field.label);
  }

  private formatDateForLabel(isoDate: string, label: string): string {
    const [year, month, day] = isoDate.split('-');
    if (/dd[\s/-]*mm[\s/-]*yyyy/i.test(label)) return `${day}/${month}/${year}`;
    if (/mm[\s/-]*dd[\s/-]*yyyy/i.test(label)) return `${month}/${day}/${year}`;
    return isoDate;
  }

  private bestExplorationControl(
    controls: InteractiveControl[],
    usedSelectors: Set<string>,
  ): InteractiveControl | undefined {
    const forbidden = /\b(delete|remove|logout|log out|sign out|purchase|buy|pay|unsubscribe|cancel account|register|sign up|download)\b|删除|移除|退出|购买|支付|注销|注册|下载/i;
    const priorities: Array<[RegExp, number]> = [
      [/\b(general search|advanced search|document search|docket search)\b|高级检索|综合检索/i, 100],
      [/\b(search|find|submit query|apply filters)\b|搜索|查询|检索/i, 80],
      [/\b(submit|continue|proceed|enter)\b|提交|继续|进入/i, 60],
    ];

    return controls
      .filter((control) => !usedSelectors.has(control.selector) && !forbidden.test(control.label))
      .map((control) => ({
        control,
        score: priorities.reduce((score, [pattern, value]) => pattern.test(control.label) ? Math.max(score, value) : score, 0),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)[0]?.control;
  }

  private isContentPage($: cheerio.CheerioAPI): boolean {
    const declaredType = $('meta[property="og:type"]').attr('content')?.toLowerCase();
    if (declaredType === 'article') return true;
    if ($('meta[property="article:published_time"], meta[name="author"], [itemprop="articleBody"]').length > 0) return true;

    const articleText = $('article').first().text().trim().replace(/\s+/g, ' ');
    if (articleText.length >= 500 && $('article h1, article h2').length > 0) return true;

    const mainText = $('main').first().text().trim().replace(/\s+/g, ' ');
    const hasSingleHeading = $('main h1').length === 1 || $('body h1').length === 1;
    const hasArticleSignals = $('main article, main [itemprop="articleBody"], time, [class*="author"], [class*="publish"]').length > 0;
    return mainText.length >= 1500 && hasSingleHeading && hasArticleSignals;
  }

  private siteName($: cheerio.CheerioAPI, url: string): string {
    const title = $('title').first().text().trim().replace(/\s+/g, ' ');
    if (title) return title.slice(0, 80);
    return new URL(url).hostname.replace(/^www\./, '');
  }

  private bestArticleSelector($: cheerio.CheerioAPI): string {
    const candidates = [
      'table tbody tr',
      '[role="row"]',
      '.search-results article',
      '.search-results li',
      '.results article',
      '.results li',
      'article',
      '.articles',
      '.posts',
      '.news-list',
      '.feed-list',
      '.story-list',
      '.article-list',
      'main',
      '[role="main"]',
    ];

    let bestSelector = '';
    let maxScore = 0;
    for (const selector of candidates) {
      const elements = $(selector);
      const rowLike = selector.includes('tr') || selector.includes('row') ||
        selector.includes(' li') || selector.endsWith('article');
      const count = rowLike
        ? elements.filter((_, element) => $(element).text().trim().replace(/\s+/g, ' ').length >= 10).length
        : elements.find('a[href]').filter((_, element) => {
          const title = $(element).text().trim().replace(/\s+/g, ' ');
          return title.length >= 10 && title.length <= 300;
        }).length;
      const score = count + (rowLike && count >= 2 ? 5 : 0);
      if (score > maxScore) {
        maxScore = score;
        bestSelector = selector;
      }
    }

    return maxScore >= 1 ? bestSelector : '';
  }

  private firstExistingSelector($: cheerio.CheerioAPI, selectors: string[]): string {
    return selectors.find((selector) => $(selector).length > 0) || '';
  }

  private assertNotBlocked(html: string, currentUrl: string): void {
    const $ = cheerio.load(html);
    const text = `${$('title').text()} ${$('body').text()}`.replace(/\s+/g, ' ').toLowerCase();
    const challengeMarkers = [
      'captcha',
      'cloudflare ray id',
      'checking your browser',
      'verify you are human',
      'access denied',
      '访问验证',
      '安全验证',
      '请完成验证',
      '访问过于频繁',
    ];
    if (challengeMarkers.some((marker) => text.includes(marker))) {
      throw new Error(
        `The site returned an anti-bot or verification page (${currentUrl}). ` +
        'Set WEB_KNOWLEDGE_BROWSER_HEADLESS=false and WEB_KNOWLEDGE_BROWSER_PROFILE to a persistent directory, ' +
        'restart the MCP server, complete any required verification in the opened browser, then retry.',
      );
    }
  }

  private interactiveScore($: cheerio.CheerioAPI, html: string): number {
    let score = 0;
    const bodyText = $('body').text().trim();
    if (bodyText.length < 200) score += 0.3;
    if (['__NEXT_DATA__', '__NUXT__', 'window.__INITIAL_STATE__', '<div id="app"', '<div id="root"'].some((marker) => html.includes(marker))) score += 0.25;
    if ($('form').length > 0 && $('input, select, textarea').length > 0) score += 0.2;
    if ($('noscript').text().toLowerCase().includes('javascript')) score += 0.15;
    return Math.min(score, 1);
  }
}
