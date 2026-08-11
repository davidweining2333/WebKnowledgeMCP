import { Injectable, NotFoundException } from '@nestjs/common';
import { CrawlerAgentService } from '../agents/crawler/crawler-agent.service.js';
import { OnboardingAgentService } from '../agents/onboarding/onboarding-agent.service.js';
import { CrawlRequest, KnowledgeDocument, SiteSummary } from '../common/types.js';
import { SiteRepository } from '../database/site.repository.js';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly onboardingAgent: OnboardingAgentService,
    private readonly crawlerAgent: CrawlerAgentService,
    private readonly siteRepository: SiteRepository,
  ) {}

  async onboardSite(url: string): Promise<{ siteId: string; status: 'success' }> {
    const profile = await this.onboardingAgent.learn(url);
    const siteId = await this.siteRepository.upsertSiteWithProfile(profile.siteName, url, profile);
    return { siteId, status: 'success' };
  }

  async crawlSite(request: CrawlRequest): Promise<{ documents: KnowledgeDocument[] }> {
    const profile = await this.siteRepository.getProfile(request.site);
    if (!profile) throw new NotFoundException(`Site not found: ${request.site}`);
    const documents = await this.crawlerAgent.collect(profile, request);
    return { documents };
  }

  async listSites(): Promise<{ sites: SiteSummary[] }> {
    return { sites: await this.siteRepository.listSites() };
  }

  async removeSite(site: string): Promise<{ removed: boolean }> {
    return { removed: await this.siteRepository.removeSite(site) };
  }
}
