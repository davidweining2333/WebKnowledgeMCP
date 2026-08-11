import { Injectable } from '@nestjs/common';
import { SiteProfile, SiteSummary } from '../common/types.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class SiteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertSiteWithProfile(name: string, url: string, profile: SiteProfile): Promise<string> {
    const site = await this.prisma.site.upsert({
      where: { url },
      update: { name },
      create: { name, url },
    });

    const existing = await this.prisma.profile.findFirst({ where: { siteId: site.id } });
    const json = JSON.stringify(profile);

    if (existing) {
      await this.prisma.profile.update({ where: { id: existing.id }, data: { json } });
    } else {
      await this.prisma.profile.create({ data: { siteId: site.id, json } });
    }

    return site.id;
  }

  async listSites(): Promise<SiteSummary[]> {
    const sites = await this.prisma.site.findMany({ orderBy: { createdAt: 'asc' } });
    return sites.map((site) => ({
      id: site.id,
      name: site.name,
      url: site.url,
      createdAt: site.createdAt.toISOString(),
    }));
  }

  async findSiteByIdentifier(identifier: string) {
    return this.prisma.site.findFirst({
      where: {
        OR: [
          { id: identifier },
          { name: identifier },
          { url: identifier },
        ],
      },
      include: { profiles: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });
  }

  async getProfile(identifier: string): Promise<SiteProfile | null> {
    const site = await this.findSiteByIdentifier(identifier);
    const profile = site?.profiles[0];
    if (!profile) return null;
    return JSON.parse(profile.json) as SiteProfile;
  }

  async removeSite(identifier: string): Promise<boolean> {
    const site = await this.findSiteByIdentifier(identifier);
    if (!site) return false;
    await this.prisma.site.delete({ where: { id: site.id } });
    return true;
  }
}
