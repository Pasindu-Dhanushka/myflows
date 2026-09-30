import { AddActionHandler } from './add-action.handler';
import { WorkflowExecutorService } from './workflow-executor.service';

describe('WorkflowExecutorService', () => {
  const executor = new WorkflowExecutorService(new AddActionHandler());

  it('executes an ADD action and returns its configured output', () => {
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

    expect(executor.execute(definition, { a: 10, b: 20 })).toEqual({
      result: 30,
    });
  });
});
