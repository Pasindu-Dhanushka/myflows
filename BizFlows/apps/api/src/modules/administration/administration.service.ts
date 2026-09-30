import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SYSTEM_ROLES } from './dto/update-user-roles.dto';

@Injectable()
export class AdministrationService {
  constructor(private readonly prisma: PrismaService) {}

  getAvailableRoles() {
    return this.prisma.role.findMany({
      where: { name: { in: [...SYSTEM_ROLES] } },
      select: { name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ roles, ...user }) => ({
      ...user,
      roles: roles.map(({ role }) => role.name),
    }));
  }

  async updateUserRoles(
    actorUserId: string,
    targetUserId: string,
    names: string[],
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: targetUserId },
        select: { roles: { select: { role: { select: { name: true } } } } },
      });
      if (!target) throw new NotFoundException('User not found.');

      const roles = await transaction.role.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true },
      });
      if (roles.length !== names.length)
        throw new NotFoundException('One or more roles do not exist.');

      const previousRoles = target.roles.map(({ role }) => role.name).sort();
      const newRoles = roles.map((role) => role.name).sort();
      if (previousRoles.join(',') === newRoles.join(',')) {
        return { userId: targetUserId, roles: newRoles };
      }
      await transaction.userRole.deleteMany({
        where: { userId: targetUserId },
      });
      await transaction.userRole.createMany({
        data: roles.map((role) => ({ userId: targetUserId, roleId: role.id })),
        skipDuplicates: true,
      });
      await transaction.roleAudit.create({
        data: {
          actorUserId,
          targetUserId,
          action: 'USER_ROLES_UPDATED',
          previousRoles,
          newRoles,
        },
      });
      return { userId: targetUserId, roles: newRoles };
    });
  }

  async getAuditLog() {
    return this.prisma.roleAudit.findMany({
      select: {
        id: true,
        action: true,
        previousRoles: true,
        newRoles: true,
        createdAt: true,
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        target: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
