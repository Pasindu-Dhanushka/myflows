import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AddActionHandler } from './engine/add-action.handler';
import { WorkflowExecutorService } from './engine/workflow-executor.service';
import {
  WorkflowRunsController,
  WorkflowsController,
} from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkflowsController, WorkflowRunsController],
  providers: [WorkflowsService, WorkflowExecutorService, AddActionHandler],
})
export class WorkflowsModule {}
