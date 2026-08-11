import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { KnowledgeDocument } from '../common/types.js';
import { ParserAdapter } from './parser-adapter.interface.js';

@Injectable()
export class HtmlParserAdapter implements ParserAdapter {
  async parse(input: string | Buffer, sourceUrl: string): Promise<KnowledgeDocument> {
    const $ = cheerio.load(input.toString());
    $('script, style, nav, header, footer, aside, noscript, .sidebar, .ad, .advertisement, [class*="comment"]').remove();

    const title = this.firstText($, ['meta[property="og:title"]', 'h1', 'title']) || sourceUrl;
    const publishTime = this.publishTime($);
    const body = $('article').length ? $('article')
      : $('main').length ? $('main')
      : $('[class*="content"], [id*="content"], .post, .entry').length ? $('[class*="content"], [id*="content"], .post, .entry').first()
      : $('body');

    const content = body.text().replace(/\s+/g, ' ').trim();
    const attachments = $('a[href$=".pdf"], a[href$=".docx"], a[href$=".doc"]').map((_, el) => {
      const href = $(el).attr('href') || '';
      const url = new URL(href, sourceUrl).href;
      const filename = url.split('/').pop() || 'attachment';
      return { filename, type: filename.split('.').pop()?.toLowerCase() || 'file', url };
    }).get();

    return { title, url: sourceUrl, publishTime, content, attachments };
  }

  private firstText($: cheerio.CheerioAPI, selectors: string[]): string {
    for (const selector of selectors) {
      const element = $(selector).first();
      const value = element.attr('content') || element.text();
      if (value?.trim()) return value.trim().replace(/\s+/g, ' ');
    }
    return '';
  }

  private publishTime($: cheerio.CheerioAPI): string | null {
    const selectors = [
      'meta[property="article:published_time"]',
      'meta[name="publishdate"]',
      'meta[name="date"]',
      'time[datetime]',
    ];
    for (const selector of selectors) {
      const element = $(selector).first();
      const value = element.attr('content') || element.attr('datetime') || element.text();
      if (!value) continue;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    return null;
  }
}
