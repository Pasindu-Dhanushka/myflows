import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidatePasswordResetTokenDto } from './dto/validate-password-reset-token.dto';

const DEFAULT_TOKEN_TTL_MINUTES = 15;
const DEFAULT_RATE_WINDOW_MINUTES = 15;
const DEFAULT_EMAIL_LIMIT = 5;
const DEFAULT_IP_LIMIT = 20;

const PASSWORD_RESET_EMAIL_SENT_MESSAGE =
  'A password reset link has been sent to your email address.';

const INVALID_RESET_TOKEN_MESSAGE =
  'This password reset link is invalid or has expired.';

export type PasswordResetContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async requestReset(dto: ForgotPasswordDto, context: PasswordResetContext) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const sanitizedContext = this.sanitizeContext(context);

    await this.enforceRateLimit(normalizedEmail, sanitizedContext.ipAddress);

    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      await this.usersService.recordPasswordResetAudit({
        email: normalizedEmail,
        action: 'REQUEST',
        successful: false,
        failureReason: 'EMAIL_NOT_REGISTERED',
        ...sanitizedContext,
      });

      throw new NotFoundException(
        'No account was found with this email address.',
      );
    }

    const rawToken = randomBytes(32).toString('hex');

    const tokenHash = this.hashToken(rawToken);

    const ttlMinutes = this.readPositiveInteger(
      'PASSWORD_RESET_TOKEN_TTL_MINUTES',
      DEFAULT_TOKEN_TTL_MINUTES,
    );

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.usersService.revokeActivePasswordResetTokens(user.id);

    const resetToken = await this.usersService.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
      requestIp: sanitizedContext.ipAddress,
      userAgent: sanitizedContext.userAgent,
    });

    const webOrigin = (
      process.env.WEB_ORIGIN ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');

    const resetUrl = `${webOrigin}/reset-password?token=${encodeURIComponent(
      rawToken,
    )}`;

    try {
      await this.mailService.sendPasswordResetEmail(
        normalizedEmail,
        resetUrl,
        ttlMinutes,
      );
    } catch {
      await this.usersService.revokePasswordResetToken(resetToken.id);

      await this.usersService.recordPasswordResetAudit({
        userId: user.id,
        email: normalizedEmail,
        action: 'REQUEST',
        successful: false,
        failureReason: 'EMAIL_DELIVERY_FAILED',
        ...sanitizedContext,
      });

      throw new HttpException(
        'Unable to send the password reset email. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    await this.usersService.recordPasswordResetAudit({
      userId: user.id,
      email: normalizedEmail,
      action: 'REQUEST',
      successful: true,
      ...sanitizedContext,
    });

    return {
      message: PASSWORD_RESET_EMAIL_SENT_MESSAGE,
    };
  }

  async validateResetToken(dto: ValidatePasswordResetTokenDto) {
    const tokenHash = this.hashToken(dto.token);

    const resetToken =
      await this.usersService.findValidPasswordResetToken(tokenHash);

    if (!resetToken) {
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    return {
      valid: true,
      expiresAt: resetToken.expiresAt,
    };
  }

  async resetPassword(dto: ResetPasswordDto, context: PasswordResetContext) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    const sanitizedContext = this.sanitizeContext(context);

    const tokenHash = this.hashToken(dto.token);

    const resetToken =
      await this.usersService.findValidPasswordResetToken(tokenHash);

    if (!resetToken) {
      await this.usersService.recordPasswordResetAudit({
        action: 'RESET',
        successful: false,
        failureReason: 'INVALID_OR_EXPIRED_TOKEN',
        ...sanitizedContext,
      });

      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    const completed = await this.usersService.completePasswordReset({
      tokenId: resetToken.id,
      userId: resetToken.user.id,
      email: resetToken.user.email,
      passwordHash,
      ...sanitizedContext,
    });

    if (!completed) {
      await this.usersService.recordPasswordResetAudit({
        userId: resetToken.user.id,
        email: resetToken.user.email,
        action: 'RESET',
        successful: false,
        failureReason: 'TOKEN_ALREADY_CONSUMED',
        ...sanitizedContext,
      });

      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    return {
      message: 'Password has been reset successfully.',
    };
  }

  private async enforceRateLimit(
    email: string,
    ipAddress?: string,
  ): Promise<void> {
    const windowMinutes = this.readPositiveInteger(
      'PASSWORD_RESET_RATE_WINDOW_MINUTES',
      DEFAULT_RATE_WINDOW_MINUTES,
    );

    const emailLimit = this.readPositiveInteger(
      'PASSWORD_RESET_EMAIL_LIMIT',
      DEFAULT_EMAIL_LIMIT,
    );

    const ipLimit = this.readPositiveInteger(
      'PASSWORD_RESET_IP_LIMIT',
      DEFAULT_IP_LIMIT,
    );

    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    const emailRequestCount =
      await this.usersService.countPasswordResetRequestsByEmail(email, since);

    const ipRequestCount = ipAddress
      ? await this.usersService.countPasswordResetRequestsByIp(ipAddress, since)
      : 0;

    if (emailRequestCount >= emailLimit || ipRequestCount >= ipLimit) {
      throw new HttpException(
        'Too many password reset requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeContext(context: PasswordResetContext): PasswordResetContext {
    return {
      ipAddress: context.ipAddress?.slice(0, 64),

      userAgent: context.userAgent?.slice(0, 512),
    };
  }

  private readPositiveInteger(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? '', 10);

    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }
}
