import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export class WorkflowInputDto {
  @IsString()
  @Matches(KEY_PATTERN)
  key!: string;

  @Equals('number')
  type!: string;
}

export class WorkflowActionDto {
  @Equals('ADD')
  type!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  inputs!: string[];

  @IsString()
  @Matches(KEY_PATTERN)
  output!: string;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowInputDto)
  inputs!: WorkflowInputDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions!: WorkflowActionDto[];
}
