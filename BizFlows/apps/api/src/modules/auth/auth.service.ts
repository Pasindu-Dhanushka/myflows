import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailVerificationService } from './email-verification.service';

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_REMEMBERED_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000;

export type LoginContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type VerificationContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto, context: VerificationContext = {}) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
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

    const { token, tokenHash } = this.emailVerificationService.generateToken();

    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

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
      await this.mailService.sendVerificationEmail(user.email, token);
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
      roles: ['USER'],
      createdAt: user.createdAt,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto, context: LoginContext) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const loginContext = {
      ipAddress: context.ipAddress?.slice(0, 64),
      userAgent: context.userAgent?.slice(0, 512),
    };

    const user =
      await this.usersService.findByEmailForAuthentication(normalizedEmail);

    if (!user) {
      await this.usersService.recordLoginAttempt({
        email: normalizedEmail,
        successful: false,
        failureReason: 'INVALID_CREDENTIALS',
        ...loginContext,
      });

      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      await this.usersService.recordLoginAttempt({
        userId: user.id,
        email: normalizedEmail,
        successful: false,
        failureReason: 'INVALID_CREDENTIALS',
        ...loginContext,
      });

      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      await this.usersService.recordLoginAttempt({
        userId: user.id,
        email: normalizedEmail,
        successful: false,
        failureReason: 'ACCOUNT_INACTIVE',
        ...loginContext,
      });

      throw new ForbiddenException('This account is inactive.');
    }

    if (!user.isEmailVerified) {
      await this.usersService.recordLoginAttempt({
        userId: user.id,
        email: normalizedEmail,
        successful: false,
        failureReason: 'EMAIL_NOT_VERIFIED',
        ...loginContext,
      });

      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Verify your email address before signing in. You can request another verification email below.',
      });
    }

    const rememberMe = dto.rememberMe ?? false;
    const expiresIn = this.getAccessTokenTtlSeconds(rememberMe);

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const session = await this.usersService.createLoginSession({
      userId: user.id,
      email: normalizedEmail,
      expiresAt,
      ...loginContext,
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        sid: session.id,
        email: user.email,
        roles: user.roles.map(({ role }) => role.name),
      },
      {
        expiresIn,
      },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      rememberMe,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles.map(({ role }) => role.name),
      },
    };
  }

  async verifyEmail(dto: VerifyEmailDto, context: VerificationContext = {}) {
    const tokenHash = this.emailVerificationService.hashToken(dto.token);

    const verificationToken =
      await this.usersService.findEmailVerificationTokenByHash(tokenHash);

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

      throw new BadRequestException('Verification link is invalid.');
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

    await this.usersService.verifyUserEmail(user.id, verificationToken.id);

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
    const normalizedEmail = dto.email.trim().toLowerCase();

    const requestContext = {
      ipAddress: context.ipAddress?.slice(0, 64),
      userAgent: context.userAgent?.slice(0, 512),
    };

    const genericResponse = {
      message:
        'If an unverified account exists for that email, a verification email has been sent.',
    };

    const user = await this.usersService.findByEmail(normalizedEmail);

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

    const { token, tokenHash } = this.emailVerificationService.generateToken();

    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

    const verificationToken =
      await this.usersService.createEmailVerificationToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

    try {
      await this.mailService.sendVerificationEmail(user.email, token);
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

  async getProfile(userId: string) {
    const user = await this.usersService.findProfileById(userId);

    if (!user) {
      throw new UnauthorizedException('Your account is no longer available.');
    }

    return {
      user: {
        ...user,
        roles: user.roles.map(({ role }) => role.name),
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
    });

    return {
      user: {
        ...user,
        roles: user.roles.map(({ role }) => role.name),
      },
    };
  }

  async changePassword(
    userId: string,
    sessionId: string,
    dto: ChangePasswordDto,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match.');
    }

    const user = await this.usersService.findPasswordById(userId);

    if (!user) {
      throw new UnauthorizedException('Your account is no longer available.');
    }

    const currentPasswordMatches = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const reusesCurrentPassword = await argon2.verify(
      user.passwordHash,
      dto.newPassword,
    );

    if (reusesCurrentPassword) {
      throw new BadRequestException(
        'New password must be different from the current password.',
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.usersService.changePasswordAndRevokeOtherSessions(
      userId,
      sessionId,
      passwordHash,
    );

    return {
      message: 'Password changed successfully.',
    };
  }

  private getAccessTokenTtlSeconds(rememberMe: boolean): number {
    const environmentVariable = rememberMe
      ? process.env.JWT_REMEMBERED_TOKEN_TTL_SECONDS
      : process.env.JWT_ACCESS_TOKEN_TTL_SECONDS;

    const fallback = rememberMe
      ? DEFAULT_REMEMBERED_TOKEN_TTL_SECONDS
      : DEFAULT_ACCESS_TOKEN_TTL_SECONDS;

    const configuredValue = Number.parseInt(environmentVariable ?? '', 10);

    return Number.isSafeInteger(configuredValue) && configuredValue > 0
      ? configuredValue
      : fallback;
  }

  async logout(sessionId: string): Promise<void> {
    await this.usersService.revokeSession(sessionId);
  }
}
