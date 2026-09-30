import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { WorkflowExecutorService } from './engine/workflow-executor.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  createWorkflow(dto: CreateWorkflowDto, userId: string) {
    return this.prisma.workflow.create({
      data: {
        name: dto.name,
        definition: dto as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }

  async executeWorkflow(
    workflowId: string,
    dto: ExecuteWorkflowDto,
    userId: string,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        createdById: userId,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found.');
    }

    const definition = workflow.definition as unknown as CreateWorkflowDto;
    const startedAt = new Date();
    let outputs: Record<string, unknown>;

    try {
      outputs = this.executor.execute(definition, dto.inputs);
    } catch (error) {
      await this.prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          status: 'FAILED',
          input: dto.inputs as Prisma.InputJsonValue,
          output: { error: this.getErrorMessage(error) },
          startedAt,
          completedAt: new Date(),
        },
      });

      throw error;
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        status: 'COMPLETED',
        input: dto.inputs as Prisma.InputJsonValue,
        output: outputs as Prisma.InputJsonValue,
        startedAt,
        completedAt: new Date(),
      },
    });

    return {
      runId: run.id,
      status: run.status,
      outputs,
    };
  }

  async getWorkflowRun(runId: string, userId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: {
        id: runId,
        workflow: {
          createdById: userId,
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found.');
    }

    return {
      id: run.id,
      workflowId: run.workflowId,
      status: run.status,
      inputs: run.input,
      outputs: run.output,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Workflow execution failed.';
  }
}
