import { Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { KnowledgeDocument } from '../common/types.js';
import { ParserAdapter } from './parser-adapter.interface.js';

@Injectable()
export class PdfParserAdapter implements ParserAdapter {
  async parse(input: string | Buffer, sourceUrl: string): Promise<KnowledgeDocument> {
    const data = await pdfParse(Buffer.isBuffer(input) ? input : Buffer.from(input));
    const filename = sourceUrl.split('/').pop() || sourceUrl;

    return {
      title: data.info?.Title || filename,
      url: sourceUrl,
      publishTime: null,
      content: data.text.replace(/\s+/g, ' ').trim(),
      attachments: [],
    };
  }
}
