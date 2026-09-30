import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'USER')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  createWorkflow(
    @Body() dto: CreateWorkflowDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workflowsService.createWorkflow(dto, request.auth.user.id);
  }

  @Post(':id/execute')
  executeWorkflow(
    @Param('id', ParseUUIDPipe) workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workflowsService.executeWorkflow(
      workflowId,
      dto,
      request.auth.user.id,
    );
  }
}

@Controller('workflow-runs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'USER')
export class WorkflowRunsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get(':id')
  getWorkflowRun(
    @Param('id', ParseUUIDPipe) runId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workflowsService.getWorkflowRun(runId, request.auth.user.id);
  }
}
