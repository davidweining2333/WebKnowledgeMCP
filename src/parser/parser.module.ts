import { Module } from '@nestjs/common';
import { DocxParserAdapter } from './docx-parser.adapter.js';
import { HtmlParserAdapter } from './html-parser.adapter.js';
import { PdfParserAdapter } from './pdf-parser.adapter.js';

@Module({
  providers: [HtmlParserAdapter, PdfParserAdapter, DocxParserAdapter],
  exports: [HtmlParserAdapter, PdfParserAdapter, DocxParserAdapter],
})
export class ParserModule {}
