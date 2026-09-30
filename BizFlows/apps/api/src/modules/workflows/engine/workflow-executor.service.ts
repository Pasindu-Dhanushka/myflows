import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateWorkflowDto } from '../dto/create-workflow.dto';
import type { ActionHandler } from './action-handler.interface';
import { AddActionHandler } from './add-action.handler';

@Injectable()
export class WorkflowExecutorService {
  private readonly handlers: ActionHandler[];

  constructor(addActionHandler: AddActionHandler) {
    this.handlers = [addActionHandler];
  }

  execute(
    definition: CreateWorkflowDto,
    inputs: Record<string, unknown>,
  ): Record<string, unknown> {
    this.validateInputs(definition, inputs);

    const values = { ...inputs };
    const outputs: Record<string, unknown> = {};

    for (const action of definition.actions) {
      const handler = this.handlers.find((item) => item.type === action.type);

      if (!handler) {
        throw new BadRequestException(
          `Unsupported action type: ${action.type}.`,
        );
      }

      const result = handler.execute(action, values);
      values[action.output] = result;
      outputs[action.output] = result;
    }

    return outputs;
  }

  private validateInputs(
    definition: CreateWorkflowDto,
    inputs: Record<string, unknown>,
  ): void {
    for (const input of definition.inputs) {
      const value = inputs[input.key];

      if (
        input.type === 'number' &&
        (typeof value !== 'number' || !Number.isFinite(value))
      ) {
        throw new BadRequestException(
          `Input "${input.key}" must be a valid number.`,
        );
      }
    }
  }
}
