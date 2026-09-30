import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findByEmailForAuthentication(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        roles: { include: { role: true } },
      },
    });
  }

  async findUserRole() {
    const role = await this.prisma.role.findUnique({
      where: {
        name: 'USER',
      },
    });

    if (!role) {
      throw new Error('Default USER role is not configured.');
    }

    return role;
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    roleId: number;
  }) {
    const { roleId, ...userData } = data;
    return this.prisma.user.create({
      data: {
        ...userData,
        roles: { create: { roleId } },
      },
    });
  }

  async findProfileById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
    },
  ) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
  }

  async findPasswordById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });
  }

  async changePasswordAndRevokeOtherSessions(
    userId: string,
    currentSessionId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordHash,
        },
      }),

      this.prisma.authSession.updateMany({
        where: {
          userId,
          id: {
            not: currentSessionId,
          },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revocationReason: 'PASSWORD_CHANGED',
        },
      }),
    ]);
  }

  async recordLoginAttempt(data: {
    userId?: string;
    email: string;
    successful: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.loginAudit.create({
      data,
    });
  }

  async createLoginSession(data: {
    userId: string;
    email: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const session = await transaction.authSession.create({
        data: {
          userId: data.userId,
          expiresAt: data.expiresAt,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      await transaction.loginAudit.create({
        data: {
          userId: data.userId,
          email: data.email,
          successful: true,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      return session;
    });
  }

  async findActiveSession(sessionId: string, userId: string) {
    return this.prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
        user: {
          isActive: true,
          isEmailVerified: true,
        },
      },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revocationReason: 'USER_LOGOUT',
      },
    });
  }

  async countPasswordResetRequestsByEmail(email: string, since: Date) {
    return this.prisma.passwordResetAudit.count({
      where: {
        action: 'REQUEST',
        email,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  async countPasswordResetRequestsByIp(ipAddress: string, since: Date) {
    return this.prisma.passwordResetAudit.count({
      where: {
        action: 'REQUEST',
        ipAddress,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  async revokeActivePasswordResetTokens(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requestIp?: string;
    userAgent?: string;
  }) {
    return this.prisma.passwordResetToken.create({
      data,
    });
  }

  async revokePasswordResetToken(tokenId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: {
        id: tokenId,
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async createEmailVerificationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.emailVerificationToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findValidPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findEmailVerificationTokenByHash(tokenHash: string) {
    return this.prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });
  }

  async deleteEmailVerificationToken(id: string) {
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        id,
      },
    });
  }

  async deleteOtherUnusedEmailVerificationTokens(
    userId: string,
    keepTokenId: string,
  ) {
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        userId,
        usedAt: null,
        id: {
          not: keepTokenId,
        },
      },
    });
  }

  async recordPasswordResetAudit(data: {
    userId?: string;
    email?: string;
    action: string;
    successful: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.passwordResetAudit.create({
      data,
    });
  }

  async completePasswordReset(data: {
    tokenId: string;
    userId: string;
    email: string;
    passwordHash: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();

      const consumedToken = await transaction.passwordResetToken.updateMany({
        where: {
          id: data.tokenId,
          userId: data.userId,
          usedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumedToken.count !== 1) {
        return false;
      }

      await transaction.user.update({
        where: {
          id: data.userId,
        },
        data: {
          passwordHash: data.passwordHash,
        },
      });

      await transaction.authSession.updateMany({
        where: {
          userId: data.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await transaction.passwordResetToken.updateMany({
        where: {
          userId: data.userId,
          id: {
            not: data.tokenId,
          },
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await transaction.passwordResetAudit.create({
        data: {
          userId: data.userId,
          email: data.email,
          action: 'RESET',
          successful: true,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      return true;
    });
  }

  async verifyUserEmail(userId: string, tokenId: string) {
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: userId,
        },
        data: {
          isEmailVerified: true,
        },
      });

      await transaction.emailVerificationToken.update({
        where: {
          id: tokenId,
        },
        data: {
          usedAt: now,
        },
      });

      await transaction.emailVerificationToken.deleteMany({
        where: {
          userId,
          usedAt: null,
          id: {
            not: tokenId,
          },
        },
      });
    });
  }

  async recordEmailVerificationAudit(data: {
    userId?: string;
    email: string;
    action: string;
    successful: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.emailVerificationAudit.create({
      data,
    });
  }
}
