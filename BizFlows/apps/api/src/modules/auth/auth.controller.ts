import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ) {
    return this.authService.register(dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() request: Request,
  ) {
    return this.authService.verifyEmail(dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerificationEmail(
    @Body() dto: ResendVerificationDto,
    @Req() request: Request,
  ) {
    return this.authService.resendVerificationEmail(dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}