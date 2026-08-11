import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { McpToolsService } from './mcp-tools.service.js';

@Module({
  imports: [WorkflowModule],
  providers: [McpToolsService],
  exports: [McpToolsService],
})
export class ToolsModule {}
