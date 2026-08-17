import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { crawlSiteSchema, onboardSiteSchema, removeSiteSchema } from '../common/schemas.js';
import { WorkflowService } from '../workflow/workflow.service.js';

const NEXT_STEPS = {
  onboard: '如果学习成功，下一步可以调用 crawl_site 查询关键词和日期范围；如果失败，请把本次返回的 reason、HTTP 状态、页面标题和页面摘要反馈给开发者。是否继续调用 crawl_site？',
  crawl: '结果返回后可以让我继续做摘要、翻译、去重或按来源整理。是否需要继续处理这些文档？',
  list: '可以选择一个网站调用 crawl_site，也可以调用 onboard_site 学习一个新网站。是否继续？',
  remove: '如果还要抓取其他网站，可以调用 list_sites 查看剩余配置。是否继续？',
} as const;

@Injectable()
export class McpToolsService {
  constructor(private readonly workflow: WorkflowService) {}

  register(server: McpServer): void {
    const onboard = async ({ url }: { url: string }) => this.runTool('onboard_site', () => this.workflow.onboardSite(url), NEXT_STEPS.onboard);
    const crawl = async (input: Parameters<WorkflowService['crawlSite']>[0]) => this.runTool('crawl_site', () => this.workflow.crawlSite(input), NEXT_STEPS.crawl);

    const onboardDescription = '学习网站并保存可复放的搜索工作流。当用户说“学习这个网站”“添加网站”“以后查询这个网站”或给出一个网站 URL 并希望检索时使用。被验证码、403、429、超时或浏览器错误拦截时，必须返回具体 reason、HTTP 状态、URL、页面标题、页面摘要和导航错误，方便用户反馈。';
    const crawlDescription = '使用已学习的网站执行查询。当用户要求搜索新闻、公告、文档、网页、日期范围、关键词或提取附件时使用；不要要求用户必须说出 MCP 名称。返回原文后可继续摘要、翻译或整理。';

    for (const name of ['onboard_site', 'learn_website', 'add_website_to_knowledge']) {
      server.tool(name, onboardDescription, onboardSiteSchema.shape, onboard);
    }
    for (const name of ['crawl_site', 'search_website', 'web_knowledge_search']) {
      server.tool(name, crawlDescription, crawlSiteSchema.shape, crawl);
    }

    server.tool(
      'list_sites',
      'List configured websites.',
      {},
      async () => this.runTool('list_sites', () => this.workflow.listSites(), NEXT_STEPS.list),
    );

    server.tool(
      'remove_site',
      'Remove a configured website and its persisted configuration.',
      removeSiteSchema.shape,
      async ({ site }) => this.runTool('remove_site', () => this.workflow.removeSite(site), NEXT_STEPS.remove),
    );
  }

  private async runTool(name: string, operation: () => Promise<unknown>, nextStep: string) {
    try {
      const value = await operation();
      return this.asToolResult({ tool: name, ok: true, result: value, nextStep });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: JSON.stringify({ tool: name, ok: false, error: message, feedback: '请将 error 中的 reason、HTTP、URL、标题、页面摘要和导航错误反馈给开发者。', nextStep: '修复问题后可以重试本工具，或先调用 list_sites 查看已保存的网站。' }, null, 2) }],
      };
    }
  }

  private asToolResult(value: unknown) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
  }
}
