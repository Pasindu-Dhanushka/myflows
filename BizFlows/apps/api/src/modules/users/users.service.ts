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
        role: true,
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
    return this.prisma.user.create({
      data,
    });
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
        },
      },
      include: {
        user: {
          include: {
            role: true,
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
      },
    });
  }
}
