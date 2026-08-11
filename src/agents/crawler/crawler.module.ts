import { Module } from '@nestjs/common';
import { BrowserModule } from '../../browser/browser.module.js';
import { ParserModule } from '../../parser/parser.module.js';
import { CrawlerAgentService } from './crawler-agent.service.js';

@Module({
  imports: [BrowserModule, ParserModule],
  providers: [CrawlerAgentService],
  exports: [CrawlerAgentService],
})
export class CrawlerModule {}
