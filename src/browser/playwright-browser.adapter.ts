import { Injectable } from '@nestjs/common';
import { Browser, BrowserContext, BrowserContextOptions, chromium, Page } from 'playwright';
import { BrowserAdapter } from './browser-adapter.interface.js';

@Injectable()
export class PlaywrightBrowserAdapter implements BrowserAdapter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async open(url: string): Promise<void> {
    await this.ensurePage();
    const response = await this.page?.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (response && response.status() >= 400) {
      throw new Error(`Website returned HTTP ${response.status()} for ${url}`);
    }
    await this.page?.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
  }

  async click(selector: string): Promise<void> {
    await this.requirePage().click(selector, { timeout: 10000 });
  }

  async type(selector: string, value: string): Promise<void> {
    await this.requirePage().fill(selector, value, { timeout: 10000 });
  }

  async wait(selectorOrMs: string | number): Promise<void> {
    const page = this.requirePage();
    if (typeof selectorOrMs === 'number') {
      await page.waitForTimeout(selectorOrMs);
      return;
    }
    await page.waitForSelector(selectorOrMs, { timeout: 10000 });
  }

  async download(selector: string): Promise<string[]> {
    const page = this.requirePage();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.click(selector),
    ]);
    return [await download.path()].filter((path): path is string => Boolean(path));
  }

  async content(): Promise<string> {
    return this.requirePage().content();
  }

  async currentUrl(): Promise<string> {
    return this.requirePage().url();
  }

  async links(selector: string): Promise<Array<{ title: string; url: string }>> {
    const page = this.requirePage();
    return page.$$eval(selector, (elements) => {
      const records: Array<{ title: string; url: string }> = [];
      for (const element of elements) {
        const link = element.tagName.toLowerCase() === 'a' ? element as HTMLAnchorElement : element.querySelector('a');
        const title = (link?.textContent || element.textContent || '').trim().replace(/\s+/g, ' ');
        const href = link?.getAttribute('href') || '';
        if (!href || href === '#' || href.startsWith('javascript:') || title.length < 10) continue;
        records.push({ title, url: new URL(href, document.baseURI).href });
      }
      return records;
    });
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  private async ensurePage(): Promise<void> {
    if (!this.context) {
      const headless = process.env.WEB_KNOWLEDGE_BROWSER_HEADLESS !== 'false';
      const userDataDir = process.env.WEB_KNOWLEDGE_BROWSER_PROFILE?.trim();
      const contextOptions: BrowserContextOptions = {
        locale: process.env.WEB_KNOWLEDGE_BROWSER_LOCALE || 'zh-CN',
        viewport: { width: 1440, height: 900 },
      };
      const userAgent = process.env.WEB_KNOWLEDGE_BROWSER_USER_AGENT?.trim();
      if (userAgent) contextOptions.userAgent = userAgent;

      if (userDataDir) {
        this.context = await chromium.launchPersistentContext(userDataDir, {
          ...contextOptions,
          headless,
        });
      } else {
        this.browser = await chromium.launch({ headless });
        this.context = await this.browser.newContext(contextOptions);
      }
    }
    if (!this.page) {
      this.page = this.context.pages()[0] || await this.context.newPage();
    }
  }

  private requirePage(): Page {
    if (!this.page) throw new Error('Browser page is not open');
    return this.page;
  }
}
