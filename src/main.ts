import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppModule } from './app.module.js';
import { McpToolsService } from './tools/mcp-tools.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const server = new McpServer({
    name: 'web-knowledge-mcp',
    version: '1.0.0',
  });

  app.get(McpToolsService).register(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
