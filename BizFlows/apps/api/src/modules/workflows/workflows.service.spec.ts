import { PrismaService } from '../../database/prisma.service';
import { AddActionHandler } from './engine/add-action.handler';
import { WorkflowExecutorService } from './engine/workflow-executor.service';
import { WorkflowsService } from './workflows.service';

describe('WorkflowsService', () => {
  it('executes a workflow, stores its run, and returns the result', async () => {
    type CreateRunInput = {
      data: {
        workflowId: string;
        status: string;
        input: unknown;
        output: unknown;
        startedAt: Date;
        completedAt: Date;
      };
    };

    const definition = {
      name: 'Addition Workflow',
      inputs: [
        { key: 'a', type: 'number' },
        { key: 'b', type: 'number' },
      ],
      actions: [
        {
          type: 'ADD',
          inputs: ['a', 'b'],
          output: 'result',
        },
      ],
    };
    const createRun: jest.MockedFunction<
      (args: CreateRunInput) => Promise<{ id: string; status: string }>
    > = jest.fn();
    createRun.mockResolvedValue({
      id: 'run-id',
      status: 'COMPLETED',
    });
    const prisma = {
      workflow: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'workflow-id',
          definition,
        }),
      },
      workflowRun: {
        create: createRun,
      },
    };
    const executor = new WorkflowExecutorService(new AddActionHandler());
    const service = new WorkflowsService(
      prisma as unknown as PrismaService,
      executor,
    );

    await expect(
      service.executeWorkflow(
        'workflow-id',
        { inputs: { a: 10, b: 20 } },
        'user-id',
      ),
    ).resolves.toEqual({
      runId: 'run-id',
      status: 'COMPLETED',
      outputs: { result: 30 },
    });

    expect(createRun.mock.calls[0][0]).toMatchObject({
      data: {
        workflowId: 'workflow-id',
        status: 'COMPLETED',
        input: { a: 10, b: 20 },
        output: { result: 30 },
      },
    });
  });
});
