import { z } from 'zod';

export const onboardSiteSchema = z.object({
  url: z.string().url(),
});

export const crawlSiteSchema = z.object({
  site: z.string().min(1),
  query: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const removeSiteSchema = z.object({
  site: z.string().min(1),
});

export type OnboardSiteInput = z.infer<typeof onboardSiteSchema>;
export type CrawlSiteInput = z.infer<typeof crawlSiteSchema>;
export type RemoveSiteInput = z.infer<typeof removeSiteSchema>;
