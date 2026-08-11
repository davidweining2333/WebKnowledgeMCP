import { Injectable } from '@nestjs/common';
import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { BrowserAdapter } from './browser-adapter.interface.js';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

@Injectable()
export class PlaywrightBrowserAdapter implements BrowserAdapter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async open(url: string): Promise<void> {
    await this.ensurePage();
    await this.page?.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    if (!this.context) {
      this.context = await this.browser.newContext({ userAgent: USER_AGENT });
    }
    if (!this.page) {
      this.page = await this.context.newPage();
    }
  }

  private requirePage(): Page {
    if (!this.page) throw new Error('Browser page is not open');
    return this.page;
  }
}
