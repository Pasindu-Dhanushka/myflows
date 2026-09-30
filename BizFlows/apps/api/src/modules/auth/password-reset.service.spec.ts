import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';

import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { PasswordResetService } from './password-reset.service';

jest.mock('argon2');

describe('PasswordResetService', () => {
  type CreatePasswordResetTokenInput = {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requestIp?: string;
    userAgent?: string;
  };

  let service: PasswordResetService;

  let usersService: {
    findByEmail: jest.Mock;
    countPasswordResetRequestsByEmail: jest.Mock;
    countPasswordResetRequestsByIp: jest.Mock;
    revokeActivePasswordResetTokens: jest.Mock;
    createPasswordResetToken: jest.MockedFunction<
      (data: CreatePasswordResetTokenInput) => Promise<{ id: string }>
    >;
    revokePasswordResetToken: jest.Mock;
    findValidPasswordResetToken: jest.Mock;
    recordPasswordResetAudit: jest.Mock;
    completePasswordReset: jest.Mock;
  };

  let mailService: {
    sendPasswordResetEmail: jest.Mock;
  };

  const context = {
    ipAddress: '127.0.0.1',
    userAgent: 'Jest',
  };

  const validToken = 'a'.repeat(64);

  const validTokenHash = createHash('sha256').update(validToken).digest('hex');

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),

      countPasswordResetRequestsByEmail: jest.fn().mockResolvedValue(0),

      countPasswordResetRequestsByIp: jest.fn().mockResolvedValue(0),

      revokeActivePasswordResetTokens: jest.fn().mockResolvedValue(undefined),

      createPasswordResetToken: jest.fn().mockResolvedValue({
        id: 'reset-token-id',
      }),

      revokePasswordResetToken: jest.fn().mockResolvedValue(undefined),

      findValidPasswordResetToken: jest.fn(),

      recordPasswordResetAudit: jest.fn().mockResolvedValue(undefined),

      completePasswordReset: jest.fn(),
    };

    mailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new PasswordResetService(
      usersService as unknown as UsersService,
      mailService as unknown as MailService,
    );
  });

  it('sends a reset email for a registered user', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'john@example.com',
    });

    const result = await service.requestReset(
      {
        email: ' JOHN@EXAMPLE.COM ',
      },
      context,
    );

    expect(result).toEqual({
      message: 'A password reset link has been sent to your email address.',
    });

    expect(usersService.createPasswordResetToken).toHaveBeenCalledTimes(1);

    const tokenInput = usersService.createPasswordResetToken.mock.calls[0]?.[0];

    expect(tokenInput).toBeDefined();

    if (!tokenInput) {
      throw new Error('Expected password reset token input.');
    }

    expect(tokenInput.userId).toBe('user-id');

    expect(tokenInput.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    expect(tokenInput.expiresAt).toBeInstanceOf(Date);

    expect(tokenInput.requestIp).toBe('127.0.0.1');

    expect(tokenInput.userAgent).toBe('Jest');

    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'john@example.com',
      expect.stringContaining('/reset-password?token='),
      15,
    );

    expect(usersService.recordPasswordResetAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        email: 'john@example.com',
        action: 'REQUEST',
        successful: true,
      }),
    );
  });

  it('rejects a password reset request for an unregistered email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.requestReset(
        {
          email: 'missing@example.com',
        },
        context,
      ),
    ).rejects.toThrow(
      new NotFoundException('No account was found with this email address.'),
    );

    expect(usersService.createPasswordResetToken).not.toHaveBeenCalled();

    expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();

    expect(usersService.recordPasswordResetAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'missing@example.com',
        action: 'REQUEST',
        successful: false,
        failureReason: 'EMAIL_NOT_REGISTERED',
      }),
    );
  });

  it('rate limits excessive reset requests', async () => {
    usersService.countPasswordResetRequestsByEmail.mockResolvedValue(5);

    await expect(
      service.requestReset(
        {
          email: 'john@example.com',
        },
        context,
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(usersService.findByEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired reset token', async () => {
    usersService.findValidPasswordResetToken.mockResolvedValue(null);

    await expect(
      service.validateResetToken({
        token: validToken,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(usersService.findValidPasswordResetToken).toHaveBeenCalledWith(
      validTokenHash,
    );
  });

  it('rejects password confirmation mismatch', async () => {
    await expect(
      service.resetPassword(
        {
          token: validToken,
          newPassword: 'Password123!',
          confirmPassword: 'DifferentPassword!',
        },
        context,
      ),
    ).rejects.toThrow(
      new BadRequestException('Password confirmation does not match.'),
    );
  });

  it('resets the password using a valid one-time token', async () => {
    usersService.findValidPasswordResetToken.mockResolvedValue({
      id: 'reset-token-id',

      user: {
        id: 'user-id',
        email: 'john@example.com',
      },
    });

    usersService.completePasswordReset.mockResolvedValue(true);

    jest.mocked(argon2.hash).mockResolvedValue('new-password-hash');

    const result = await service.resetPassword(
      {
        token: validToken,
        newPassword: 'Password123!',
        confirmPassword: 'Password123!',
      },
      context,
    );

    expect(argon2.hash).toHaveBeenCalledWith('Password123!');

    expect(usersService.completePasswordReset).toHaveBeenCalledWith({
      tokenId: 'reset-token-id',
      userId: 'user-id',
      email: 'john@example.com',
      passwordHash: 'new-password-hash',
      ...context,
    });

    expect(result).toEqual({
      message: 'Password has been reset successfully.',
    });
  });
});
