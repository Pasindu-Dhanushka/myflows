import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkflowActionDto } from '../dto/create-workflow.dto';
import type { ActionHandler } from './action-handler.interface';

@Injectable()
export class AddActionHandler implements ActionHandler {
  readonly type = 'ADD';

  execute(action: WorkflowActionDto, values: Record<string, unknown>): number {
    if (action.inputs.length !== 2) {
      throw new BadRequestException('ADD requires exactly two inputs.');
    }

    const [firstKey, secondKey] = action.inputs;
    const firstValue = values[firstKey];
    const secondValue = values[secondKey];

    if (
      typeof firstValue !== 'number' ||
      !Number.isFinite(firstValue) ||
      typeof secondValue !== 'number' ||
      !Number.isFinite(secondValue)
    ) {
      throw new BadRequestException('ADD inputs must be valid numbers.');
    }

    return firstValue + secondValue;
  }
}
