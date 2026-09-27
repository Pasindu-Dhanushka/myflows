//pnpm --filter api test -- auth.service.spec.ts

import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('argon2');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findUserRole: jest.Mock;
    createUser: jest.Mock;
  };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findUserRole: jest.fn(),
      createUser: jest.fn(),
    };

    authService = new AuthService(usersService as unknown as UsersService);

    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    usersService.findUserRole.mockResolvedValue({
      id: 2,
      name: 'USER',
      description: 'Standard authenticated platform user',
    });

    usersService.createUser.mockResolvedValue({
      id: 'user-uuid',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
      isEmailVerified: false,
      roleId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.mocked(argon2.hash).mockResolvedValue('hashed-password');

    const result = await authService.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'JOHN.DOE@EXAMPLE.COM',
      password: 'Password123!',
    });

    expect(result).toMatchObject({
      id: 'user-uuid',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      isEmailVerified: false,
      roleId: 2,
    });

    expect(result.createdAt).toBeInstanceOf(Date);

    expect(argon2.hash).toHaveBeenCalledWith('Password123!');

    expect(usersService.createUser).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
      roleId: 2,
    });
  });

  it('should reject registration when the email already exists', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'existing-user',
      email: 'john.doe@example.com',
    });

    await expect(
      authService.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(
      new ConflictException('An account with this email already exists.'),
    );

    expect(usersService.createUser).not.toHaveBeenCalled();
    expect(argon2.hash).not.toHaveBeenCalled();
  });

  it('should assign the USER role during registration', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    usersService.findUserRole.mockResolvedValue({
      id: 2,
      name: 'USER',
      description: 'Standard authenticated platform user',
    });

    usersService.createUser.mockResolvedValue({
      id: 'user-uuid',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
      isEmailVerified: false,
      roleId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.mocked(argon2.hash).mockResolvedValue('hashed-password');

    await authService.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Password123!',
    });

    expect(usersService.findUserRole).toHaveBeenCalled();

    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        roleId: 2,
      }),
    );
  });

  it('should not expose passwordHash in the registration response', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    usersService.findUserRole.mockResolvedValue({
      id: 2,
      name: 'USER',
      description: 'Standard authenticated platform user',
    });

    usersService.createUser.mockResolvedValue({
      id: 'user-uuid',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      passwordHash: 'secret-hash',
      isEmailVerified: false,
      roleId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.mocked(argon2.hash).mockResolvedValue('secret-hash');

    const result = await authService.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'Password123!',
    });

    expect(result).not.toHaveProperty('passwordHash');
  });
});
