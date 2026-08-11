import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { crawlSiteSchema, onboardSiteSchema, removeSiteSchema } from '../common/schemas.js';
import { WorkflowService } from '../workflow/workflow.service.js';

@Injectable()
export class McpToolsService {
  constructor(private readonly workflow: WorkflowService) {}

  register(server: McpServer): void {
    server.tool(
      'onboard_site',
      'Learn a new website and persist its Site Profile configuration.',
      onboardSiteSchema.shape,
      async ({ url }) => this.asToolResult(await this.workflow.onboardSite(url)),
    );

    server.tool(
      'crawl_site',
      'Collect structured documents from a configured website. Returns raw documents, not summaries.',
      crawlSiteSchema.shape,
      async (input) => this.asToolResult(await this.workflow.crawlSite(input)),
    );

    server.tool(
      'list_sites',
      'List configured websites.',
      {},
      async () => this.asToolResult(await this.workflow.listSites()),
    );

    server.tool(
      'remove_site',
      'Remove a configured website and its persisted configuration.',
      removeSiteSchema.shape,
      async ({ site }) => this.asToolResult(await this.workflow.removeSite(site)),
    );
  }

  private asToolResult(value: unknown) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(value, null, 2),
        },
      ],
    };
  }
}
