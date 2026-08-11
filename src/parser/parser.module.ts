import { Module } from '@nestjs/common';
import { HtmlParserAdapter } from './html-parser.adapter.js';

@Module({
  providers: [HtmlParserAdapter],
  exports: [HtmlParserAdapter],
})
export class ParserModule {}
