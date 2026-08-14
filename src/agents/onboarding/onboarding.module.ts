import { Module } from '@nestjs/common';
import { BrowserModule } from '../../browser/browser.module.js';
import { OnboardingAgentService } from './onboarding-agent.service.js';

@Module({
  imports: [BrowserModule],
  providers: [OnboardingAgentService],
  exports: [OnboardingAgentService],
})
export class OnboardingModule {}
