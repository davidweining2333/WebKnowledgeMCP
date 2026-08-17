import { Injectable } from '@nestjs/common';
import { Browser, BrowserContext, BrowserContextOptions, chromium, Page } from 'playwright';
import { BrowserDiagnostics } from '../common/types.js';
import { BrowserAdapter, InteractiveControl, InteractiveField } from './browser-adapter.interface.js';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

@Injectable()
export class PlaywrightBrowserAdapter implements BrowserAdapter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private lastStatus: number | null = null;
  private lastNavigationError: string | undefined;

  async open(url: string): Promise<void> {
    await this.ensurePage();
    const page = this.requirePage();
    const timeout = this.navigationTimeoutMs();

    // Some protected sites return an initial 403/challenge response and then let
    // browser-side JavaScript, cookies, or redirects complete the real navigation.
    // A navigation timeout is recoverable only when the browser already reached the
    // requested origin and rendered a useful DOM; otherwise preserve the real error.
    this.lastStatus = null;
    this.lastNavigationError = undefined;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      this.lastStatus = response?.status() ?? null;
    } catch (error) {
      this.lastNavigationError = error instanceof Error ? error.message : String(error);
      this.lastStatus = null;
      const reachedTargetOrigin = this.sameOrigin(page.url(), url);
      const hasUsefulDom = reachedTargetOrigin && await page.locator('body').innerText({ timeout: 1000 })
        .then((text) => text.trim().length >= 80)
        .catch(() => false);
      if (!hasUsefulDom) throw error;
    }
    await page.waitForTimeout(this.navigationSettleMs());
    await page.waitForLoadState('networkidle', { timeout: Math.min(5000, timeout) }).catch(() => undefined);
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

  async fetchBuffer(url: string): Promise<Buffer> {
    await this.ensurePage();
    if (!this.context) throw new Error('Browser context is not open');
    const response = await this.context.request.get(url, { timeout: 30000 });
    if (!response.ok()) {
      throw new Error(`Browser-session download failed with HTTP ${response.status()}: ${url}`);
    }
    return Buffer.from(await response.body());
  }

  async content(): Promise<string> {
    return this.requirePage().content();
  }

  async currentUrl(): Promise<string> {
    return this.requirePage().url();
  }

  async diagnostics(): Promise<BrowserDiagnostics> {
    const page = this.requirePage();
    return {
      url: page.url(),
      title: await page.title().catch(() => ''),
      status: this.lastStatus,
      bodyPreview: (await page.locator('body').innerText().catch(() => '')).trim().replace(/\\s+/g, ' ').slice(0, 500),
      navigationError: this.lastNavigationError,
    };
  }

  async links(selector: string): Promise<Array<{ title: string; url: string }>> {
    const page = this.requirePage();
    return page.$$eval(selector, (elements) => {
      const records: Array<{ title: string; url: string }> = [];
      for (const element of elements) {
        const links = element.tagName.toLowerCase() === 'a'
          ? [element as HTMLAnchorElement]
          : Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href]'));
        for (const link of links) {
          const title = (link.textContent || link.getAttribute('title') || element.textContent || '')
            .trim()
            .replace(/\s+/g, ' ');
          const href = link.getAttribute('href') || '';
          if (!href || href === '#' || href.startsWith('javascript:') || title.length < 2) continue;
          records.push({ title, url: new URL(href, document.baseURI).href });
        }
      }
      return records;
    });
  }

  async interactiveControls(): Promise<InteractiveControl[]> {
    return this.requirePage().locator(
      'a, button, input[type="submit"], input[type="button"], [role="button"]',
    ).evaluateAll((elements) => {
      const escapeAttribute = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const unique = (selector: string) => {
        try {
          return document.querySelectorAll(selector).length === 1;
        } catch {
          return false;
        }
      };
      const pathFor = (element: Element): string => {
        const parts: string[] = [];
        let current: Element | null = element;
        while (current && current !== document.body && parts.length < 5) {
          const tag = current.tagName.toLowerCase();
          const siblings = current.parentElement
            ? Array.from(current.parentElement.children).filter((child) => child.tagName === current!.tagName)
            : [];
          const suffix = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : '';
          parts.unshift(`${tag}${suffix}`);
          current = current.parentElement;
        }
        return `body > ${parts.join(' > ')}`;
      };

      return elements.flatMap((element) => {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        const rect = htmlElement.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return [];

        const input = element as HTMLInputElement;
        const label = (
          htmlElement.innerText || input.value || element.getAttribute('aria-label') || element.getAttribute('title') || ''
        ).trim().replace(/\s+/g, ' ');
        if (!label) return [];

        const tag = element.tagName.toLowerCase();
        const id = element.getAttribute('id');
        const name = element.getAttribute('name');
        const ariaLabel = element.getAttribute('aria-label');
        const testId = element.getAttribute('data-testid');
        let selector = '';
        if (id) selector = `#${CSS.escape(id)}`;
        if (!selector && name) {
          const candidate = `${tag}[name="${escapeAttribute(name)}"]`;
          if (unique(candidate)) selector = candidate;
        }
        if (!selector && ariaLabel) {
          const candidate = `${tag}[aria-label="${escapeAttribute(ariaLabel)}"]`;
          if (unique(candidate)) selector = candidate;
        }
        if (!selector && testId) {
          const candidate = `[data-testid="${escapeAttribute(testId)}"]`;
          if (unique(candidate)) selector = candidate;
        }
        if (!selector) selector = pathFor(element);
        return [{ selector, label: label.slice(0, 160), tag }];
      });
    });
  }

  async interactiveFields(): Promise<InteractiveField[]> {
    return this.requirePage().locator('input:not([type="hidden"]), textarea').evaluateAll((elements) => {
      const escapeAttribute = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const unique = (selector: string) => {
        try {
          return document.querySelectorAll(selector).length === 1;
        } catch {
          return false;
        }
      };

      return elements.flatMap((element) => {
        const field = element as HTMLInputElement | HTMLTextAreaElement;
        const style = window.getComputedStyle(field);
        const rect = field.getBoundingClientRect();
        if (field.disabled || field.readOnly || style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return [];

        const id = field.id;
        const name = field.getAttribute('name') || '';
        const ariaLabel = field.getAttribute('aria-label') || '';
        const placeholder = field.getAttribute('placeholder') || '';
        const associatedLabel = id
          ? document.querySelector(`label[for="${escapeAttribute(id)}"]`)?.textContent || ''
          : field.closest('label')?.textContent || '';
        const label = `${associatedLabel} ${ariaLabel} ${placeholder} ${name}`.trim().replace(/\s+/g, ' ');
        const tag = field.tagName.toLowerCase();
        let selector = '';
        if (id) selector = `#${CSS.escape(id)}`;
        if (!selector && name) {
          const candidate = `${tag}[name="${escapeAttribute(name)}"]`;
          if (unique(candidate)) selector = candidate;
        }
        if (!selector && ariaLabel) {
          const candidate = `${tag}[aria-label="${escapeAttribute(ariaLabel)}"]`;
          if (unique(candidate)) selector = candidate;
        }
        if (!selector) return [];

        return [{
          selector,
          label: label.slice(0, 200),
          inputType: field instanceof HTMLInputElement ? field.type || 'text' : 'textarea',
        }];
      });
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
    this.resetClosedHandles();
    if (!this.context) {
      const headless = process.env.WEB_KNOWLEDGE_BROWSER_HEADLESS !== 'false';
      const userDataDir = process.env.WEB_KNOWLEDGE_BROWSER_PROFILE?.trim();
      const contextOptions: BrowserContextOptions = {
        locale: process.env.WEB_KNOWLEDGE_BROWSER_LOCALE || 'en-US',
        timezoneId: process.env.WEB_KNOWLEDGE_BROWSER_TIMEZONE || 'America/New_York',
        userAgent: process.env.WEB_KNOWLEDGE_BROWSER_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: {
          'Accept-Language': process.env.WEB_KNOWLEDGE_BROWSER_ACCEPT_LANGUAGE || 'en-US,en;q=0.9',
        },
      };

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

  private resetClosedHandles(): void {
    if (this.page?.isClosed()) this.page = null;
    if (this.browser && !this.browser.isConnected()) {
      this.page = null;
      this.context = null;
      this.browser = null;
      return;
    }
    if (!this.context) return;
    try {
      this.context.pages();
    } catch {
      this.page = null;
      this.context = null;
      this.browser = null;
    }
  }

  private navigationSettleMs(): number {
    const configured = Number(process.env.WEB_KNOWLEDGE_BROWSER_SETTLE_MS || 3000);
    return Number.isFinite(configured) && configured >= 0 ? configured : 3000;
  }

  private navigationTimeoutMs(): number {
    const configured = Number(process.env.WEB_KNOWLEDGE_BROWSER_NAVIGATION_TIMEOUT_MS || 30000);
    return Number.isFinite(configured) && configured >= 5000 ? configured : 30000;
  }

  private sameOrigin(currentUrl: string, requestedUrl: string): boolean {
    try {
      return new URL(currentUrl).origin === new URL(requestedUrl).origin;
    } catch {
      return false;
    }
  }

  private requirePage(): Page {
    if (!this.page) throw new Error('Browser page is not open');
    return this.page;
  }
}
