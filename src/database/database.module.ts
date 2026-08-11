import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { SiteRepository } from './site.repository.js';

@Module({
  providers: [PrismaService, SiteRepository],
  exports: [SiteRepository],
})
export class DatabaseModule {}
