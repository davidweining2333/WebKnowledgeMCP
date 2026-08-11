import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import { KnowledgeDocument } from '../common/types.js';
import { ParserAdapter } from './parser-adapter.interface.js';

@Injectable()
export class DocxParserAdapter implements ParserAdapter {
  async parse(input: string | Buffer, sourceUrl: string): Promise<KnowledgeDocument> {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const result = await mammoth.extractRawText({ buffer });
    const filename = sourceUrl.split('/').pop() || sourceUrl;

    return {
      title: filename,
      url: sourceUrl,
      publishTime: null,
      content: result.value.replace(/\s+/g, ' ').trim(),
      attachments: [],
    };
  }
}
