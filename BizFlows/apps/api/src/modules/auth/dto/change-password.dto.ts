import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, {
    message: 'New password must contain an uppercase letter.',
  })
  @Matches(/\d/, { message: 'New password must contain a number.' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'New password must contain a special character.',
  })
  newPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;
}
