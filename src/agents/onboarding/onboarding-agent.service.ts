import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PlaywrightBrowserAdapter } from '../../browser/playwright-browser.adapter.js';
import { SiteProfile } from '../../common/types.js';

@Injectable()
export class OnboardingAgentService {
  constructor(private readonly browser: PlaywrightBrowserAdapter) {}

  async learn(url: string): Promise<SiteProfile> {
    await this.browser.open(url);
    const html = await this.browser.content();
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
      workflowVersion: 1,
      siteName,
      feedType: interactiveScore >= 0.6 && !articleSelector ? 'interactive' : 'static',
    };
  }

  private siteName($: cheerio.CheerioAPI, url: string): string {
    const title = $('title').first().text().trim().replace(/\s+/g, ' ');
    if (title) return title.slice(0, 80);
    return new URL(url).hostname.replace(/^www\./, '');
  }

  private bestArticleSelector($: cheerio.CheerioAPI): string {
    const candidates = [
      'article',
      'main',
      '.articles',
      '.posts',
      '.news-list',
      '.feed-list',
      '.story-list',
      '.article-list',
      '[role="main"]',
    ];

    let bestSelector = '';
    let maxCount = 0;
    for (const selector of candidates) {
      const count = $(selector).find('a[href]').filter((_, el) => {
        const title = $(el).text().trim();
        return title.length >= 10 && title.length <= 300;
      }).length;
      if (count > maxCount) {
        maxCount = count;
        bestSelector = selector;
      }
    }

    return maxCount >= 1 ? bestSelector : '';
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
