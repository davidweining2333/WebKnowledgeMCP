import { Module } from '@nestjs/common';
import { ToolsModule } from './tools/tools.module.js';
import { WorkflowModule } from './workflow/workflow.module.js';

@Module({
  imports: [WorkflowModule, ToolsModule],
})
export class AppModule {}
