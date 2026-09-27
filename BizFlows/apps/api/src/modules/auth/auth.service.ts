import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailVerificationService } from './email-verification.service';

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000;

export type VerificationContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mailService: MailService,
  ) {}

  async register(
    dto: RegisterDto,
    context: VerificationContext = {},
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser =
      await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    const userRole = await this.usersService.findUserRole();

    const user = await this.usersService.createUser({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: normalizedEmail,
      passwordHash,
      roleId: userRole.id,
    });

    const { token, tokenHash } =
      this.emailVerificationService.generateToken();

    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS,
    );

    const verificationToken =
      await this.usersService.createEmailVerificationToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

    const requestContext = {
      ipAddress: context.ipAddress?.slice(0, 64),
      userAgent: context.userAgent?.slice(0, 512),
    };

    try {
      await this.mailService.sendVerificationEmail(
        user.email,
        token,
      );
    } catch (error) {
      console.error('EMAIL SEND ERROR:', error);

      await this.usersService.deleteEmailVerificationToken(
        verificationToken.id,
      );

      await this.usersService.recordEmailVerificationAudit({
        userId: user.id,
        email: user.email,
        action: 'EMAIL_SENT',
        successful: false,
        failureReason: 'EMAIL_SEND_FAILED',
        ...requestContext,
      });

      throw new ServiceUnavailableException(
        'Account created, but the verification email could not be sent. Please request another verification email.',
      );
    }

    await this.usersService.recordEmailVerificationAudit({
      userId: user.id,
      email: user.email,
      action: 'EMAIL_SENT',
      successful: true,
      ...requestContext,
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      roleId: user.roleId,
      createdAt: user.createdAt,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(
    dto: VerifyEmailDto,
    context: VerificationContext = {},
  ) {
    const tokenHash =
      this.emailVerificationService.hashToken(dto.token);

    const verificationToken =
      await this.usersService.findEmailVerificationTokenByHash(
        tokenHash,
      );

    const requestContext = {
      ipAddress: context.ipAddress?.slice(0, 64),
      userAgent: context.userAgent?.slice(0, 512),
    };

    if (!verificationToken) {
      await this.usersService.recordEmailVerificationAudit({
        email: 'unknown',
        action: 'VERIFY_EMAIL',
        successful: false,
        failureReason: 'INVALID_TOKEN',
        ...requestContext,
      });

      throw new BadRequestException(
        'Verification link is invalid.',
      );
    }

    const user = verificationToken.user;

    if (user.isEmailVerified) {
      return {
        message: 'Email address is already verified.',
      };
    }

    if (verificationToken.usedAt) {
      await this.usersService.recordEmailVerificationAudit({
        userId: user.id,
        email: user.email,
        action: 'VERIFY_EMAIL',
        successful: false,
        failureReason: 'TOKEN_ALREADY_USED',
        ...requestContext,
      });

      throw new BadRequestException(
        'This verification link has already been used.',
      );
    }

    if (verificationToken.expiresAt <= new Date()) {
      await this.usersService.recordEmailVerificationAudit({
        userId: user.id,
        email: user.email,
        action: 'VERIFY_EMAIL',
        successful: false,
        failureReason: 'TOKEN_EXPIRED',
        ...requestContext,
      });

      throw new GoneException(
        'Verification link has expired. Please request a new one.',
      );
    }

    await this.usersService.verifyUserEmail(
      user.id,
      verificationToken.id,
    );

    await this.usersService.recordEmailVerificationAudit({
      userId: user.id,
      email: user.email,
      action: 'VERIFY_EMAIL',
      successful: true,
      ...requestContext,
    });

    return {
      message: 'Email verified successfully.',
    };
  }

  async resendVerificationEmail(
    dto: ResendVerificationDto,
    context: VerificationContext = {},
  ) {
    const normalizedEmail =
      dto.email.trim().toLowerCase();

    const requestContext = {
      ipAddress: context.ipAddress?.slice(0, 64),
      userAgent: context.userAgent?.slice(0, 512),
    };

    const genericResponse = {
      message:
        'If an unverified account exists for that email, a verification email has been sent.',
    };

    const user =
      await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      await this.usersService.recordEmailVerificationAudit({
        email: normalizedEmail,
        action: 'RESEND_EMAIL',
        successful: false,
        failureReason: 'USER_NOT_FOUND',
        ...requestContext,
      });

      return genericResponse;
    }

    if (user.isEmailVerified) {
      await this.usersService.recordEmailVerificationAudit({
        userId: user.id,
        email: user.email,
        action: 'RESEND_EMAIL',
        successful: false,
        failureReason: 'ALREADY_VERIFIED',
        ...requestContext,
      });

      return genericResponse;
    }

    const { token, tokenHash } =
      this.emailVerificationService.generateToken();

    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS,
    );

    const verificationToken =
      await this.usersService.createEmailVerificationToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

    try {
      await this.mailService.sendVerificationEmail(
        user.email,
        token,
      );
    } catch (error) {
      console.error('EMAIL RESEND ERROR:', error);

      await this.usersService.deleteEmailVerificationToken(
        verificationToken.id,
      );

      await this.usersService.recordEmailVerificationAudit({
        userId: user.id,
        email: user.email,
        action: 'RESEND_EMAIL',
        successful: false,
        failureReason: 'EMAIL_SEND_FAILED',
        ...requestContext,
      });

      throw new ServiceUnavailableException(
        'Verification email could not be sent. Please try again.',
      );
    }

    await this.usersService.deleteOtherUnusedEmailVerificationTokens(
      user.id,
      verificationToken.id,
    );

    await this.usersService.recordEmailVerificationAudit({
      userId: user.id,
      email: user.email,
      action: 'RESEND_EMAIL',
      successful: true,
      ...requestContext,
    });

    return genericResponse;
  }
}