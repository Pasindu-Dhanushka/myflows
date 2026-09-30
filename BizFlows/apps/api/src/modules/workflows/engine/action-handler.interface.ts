import type { WorkflowActionDto } from '../dto/create-workflow.dto';

export interface ActionHandler {
  readonly type: string;

  execute(action: WorkflowActionDto, values: Record<string, unknown>): unknown;
}
