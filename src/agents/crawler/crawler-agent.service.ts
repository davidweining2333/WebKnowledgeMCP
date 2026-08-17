import { Injectable } from '@nestjs/common';
import { CrawlRequest, KnowledgeDocument, SiteProfile, SiteWorkflowAction } from '../../common/types.js';
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
    if (profile.pageType === 'content') {
      await this.browser.open(profile.url);
      const document = await this.htmlParser.parse(await this.browser.content(), await this.browser.currentUrl());
      if (!this.isInsideDateRange(document, request.from, request.to)) return [];
      await this.appendAttachmentContent(document);
      return [document];
    }

    const links = await this.collectLinks(profile, request, request.limit || 20);
    const targets = links.length > 0
      ? links
      : [{ title: profile.siteName, url: await this.browser.currentUrl() || profile.url }];
    const documents: KnowledgeDocument[] = [];
    for (const link of targets) {
      const document = await this.fetchDocument(link.url);
      if (!this.isInsideDateRange(document, request.from, request.to)) continue;
      await this.appendAttachmentContent(document);
      documents.push(document);
    }
    return documents;
  }

  private async collectLinks(
    profile: SiteProfile,
    request: CrawlRequest,
    limit: number,
  ): Promise<Array<{ title: string; url: string }>> {
    await this.browser.open(profile.url);
    await this.replayWorkflow(profile.workflowActions || [], request);
    const selector = profile.articleSelector || 'a';
    const links = await this.browser.links(selector);
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

  private async replayWorkflow(actions: SiteWorkflowAction[], request: CrawlRequest): Promise<void> {
    for (const action of actions) {
      if (action.type === 'fill') {
        const value = this.workflowValue(action, request);
        if (value) await this.browser.type(action.selector, value);
        continue;
      }
      if (action.type === 'click') {
        await this.browser.click(action.selector);
        continue;
      }
      if (action.type === 'wait_time') {
        await this.browser.wait(action.ms);
        continue;
      }
      if (action.type === 'wait_for') {
        await this.browser.wait(action.selector);
      }
    }
  }

  private workflowValue(
    action: Extract<SiteWorkflowAction, { type: 'fill' }>,
    request: CrawlRequest,
  ): string | undefined {
    const value = request[action.parameter];
    if (!value || action.parameter === 'query') return value;
    if (action.inputType === 'date') return new Date(value).toISOString().slice(0, 10);
    const [year, month, day] = new Date(value).toISOString().slice(0, 10).split('-');
    if (/dd[\s/-]*mm[\s/-]*yyyy/i.test(action.label || '')) return `${day}/${month}/${year}`;
    if (/mm[\s/-]*dd[\s/-]*yyyy/i.test(action.label || '')) return `${month}/${day}/${year}`;
    return `${year}-${month}-${day}`;
  }

  private async fetchDocument(url: string): Promise<KnowledgeDocument> {
    if (!this.isBinaryDocument(url)) {
      await this.browser.open(url);
      return this.htmlParser.parse(await this.browser.content(), await this.browser.currentUrl());
    }

    return this.parseBinaryDocument(await this.browser.fetchBuffer(url), url);
  }

  private async appendAttachmentContent(document: KnowledgeDocument): Promise<void> {
    const extracted: string[] = [];
    for (const attachment of document.attachments) {
      if (!/\.(pdf|docx?)(?:$|[?#])/i.test(attachment.url)) continue;
      try {
        const parsed = await this.parseBinaryDocument(
          await this.browser.fetchBuffer(attachment.url),
          attachment.url,
        );
        if (parsed.content) extracted.push(`[Attachment: ${attachment.filename}]\n${parsed.content}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        extracted.push(`[Attachment: ${attachment.filename}] Extraction failed: ${message}`);
      }
    }
    if (extracted.length > 0) {
      document.content = `${document.content}\n\n${extracted.join('\n\n')}`.trim();
    }
  }

  private async parseBinaryDocument(buffer: Buffer, url: string): Promise<KnowledgeDocument> {
    if (/\.pdf(?:$|[?#])/i.test(url)) return this.pdfParser.parse(buffer, url);
    if (/\.docx?(?:$|[?#])/i.test(url)) return this.docxParser.parse(buffer, url);
    throw new Error(`Unsupported binary document type: ${url}`);
  }

  private isBinaryDocument(url: string): boolean {
    return /\.(pdf|docx?|pptx?|xlsx?)(?:$|[?#])/i.test(url);
  }

  private isInsideDateRange(document: KnowledgeDocument, from?: string, to?: string): boolean {
    if (!document.publishTime) return true;
    const time = new Date(document.publishTime).getTime();
    if (from && time < new Date(from).getTime()) return false;
    if (to && time > new Date(to).getTime()) return false;
    return true;
  }
}
