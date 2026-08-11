import { Module } from '@nestjs/common';
import { OnboardingAgentService } from './onboarding-agent.service.js';

@Module({
  providers: [OnboardingAgentService],
  exports: [OnboardingAgentService],
})
export class OnboardingModule {}
