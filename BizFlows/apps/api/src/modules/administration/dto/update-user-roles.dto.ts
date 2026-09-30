import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
} from 'class-validator';

export const SYSTEM_ROLES = ['OWNER', 'ADMIN', 'USER'] as const;

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(SYSTEM_ROLES, { each: true })
  roles!: string[];
}
