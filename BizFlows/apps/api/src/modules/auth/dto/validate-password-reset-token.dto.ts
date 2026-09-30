import { IsString, Length, Matches } from 'class-validator';

export class ValidatePasswordResetTokenDto {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/i)
  token!: string;
}
