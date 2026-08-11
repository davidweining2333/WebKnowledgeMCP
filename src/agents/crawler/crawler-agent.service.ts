import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CrawlRequest, KnowledgeDocument, SiteProfile } from '../../common/types.js';
import { PlaywrightBrowserAdapter } from '../../browser/playwright-browser.adapter.js';
import { DocxParserAdapter } from '../../parser/docx-parser.adapter.js';
import { HtmlParserAdapter } from '../../parser/html-parser.adapter.js';
import { PdfParserAdapter } from '../../parser/pdf-parser.adapter.js';

@Injectable()
export class CrawlerAgentService {
  constructor(
    private readonly browser: PlaywrightBrowserAdapter,
    private readonly htmlParser: HtmlParserAdapter,
    private readonly pdfParser: PdfParserAdapter,
    private readonly docxParser: DocxParserAdapter,
  ) {}

  async collect(profile: SiteProfile, request: CrawlRequest): Promise<KnowledgeDocument[]> {
    try {
      const links = await this.collectLinks(profile, request.limit || 20);
      const documents: KnowledgeDocument[] = [];
      for (const link of links) {
        const document = await this.fetchDocument(link.url);
        if (this.isInsideDateRange(document, request.from, request.to)) documents.push(document);
      }
      return documents;
    } finally {
      await this.browser.close();
    }
  }

  private async collectLinks(profile: SiteProfile, limit: number): Promise<Array<{ title: string; url: string }>> {
    await this.browser.open(profile.url);
    const selector = profile.articleSelector || 'a';
    const links = await this.browser.links(selector.includes('a') ? selector : `${selector} a`);
    const seen = new Set<string>();
    const normalized: Array<{ title: string; url: string }> = [];
    for (const link of links) {
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      normalized.push(link);
      if (normalized.length >= limit) break;
    }
    return normalized;
  }

  private async fetchDocument(url: string): Promise<KnowledgeDocument> {
    const response = await axios.get<ArrayBuffer | string>(url, {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebKnowledgeMCP/1.0)' },
      responseType: this.isBinaryDocument(url) ? 'arraybuffer' : 'text',
    });

    if (url.toLowerCase().endsWith('.pdf')) {
      return this.pdfParser.parse(Buffer.from(response.data as ArrayBuffer), url);
    }

    if (/\.docx?$/i.test(url)) {
      return this.docxParser.parse(Buffer.from(response.data as ArrayBuffer), url);
    }

    return this.htmlParser.parse(response.data as string, url);
  }

  private isBinaryDocument(url: string): boolean {
    return /\.(pdf|docx?|pptx?|xlsx?)$/i.test(url);
  }

  private isInsideDateRange(document: KnowledgeDocument, from?: string, to?: string): boolean {
    if (!document.publishTime) return true;
    const time = new Date(document.publishTime).getTime();
    if (from && time < new Date(from).getTime()) return false;
    if (to && time > new Date(to).getTime()) return false;
    return true;
  }
}
