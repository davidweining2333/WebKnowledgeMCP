import { Module } from '@nestjs/common';
import { CrawlerModule } from '../agents/crawler/crawler.module.js';
import { OnboardingModule } from '../agents/onboarding/onboarding.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { WorkflowService } from './workflow.service.js';

@Module({
  imports: [OnboardingModule, CrawlerModule, DatabaseModule],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
