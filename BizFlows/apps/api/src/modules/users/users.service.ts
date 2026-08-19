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
}
