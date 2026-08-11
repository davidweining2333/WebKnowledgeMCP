import { Module } from '@nestjs/common';
import { PlaywrightBrowserAdapter } from './playwright-browser.adapter.js';

@Module({
  providers: [PlaywrightBrowserAdapter],
  exports: [PlaywrightBrowserAdapter],
})
export class BrowserModule {}
