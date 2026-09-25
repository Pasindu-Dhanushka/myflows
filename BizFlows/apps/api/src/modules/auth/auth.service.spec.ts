import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

describe('AuthService', () => {
  type LoginSessionInput = {
    userId: string;
    email: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };

  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findByEmailForAuthentication: jest.Mock;
    findUserRole: jest.Mock;
    createUser: jest.Mock;
    recordLoginAttempt: jest.Mock;
    createLoginSession: jest.MockedFunction<
      (data: LoginSessionInput) => Promise<{ id: string; expiresAt: Date }>
    >;
    revokeSession: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  const loginContext = {
    ipAddress: '127.0.0.1',
    userAgent: 'Jest',
  };

  const activeUser = {
    id: 'user-uuid',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    passwordHash: 'stored-password-hash',
    isActive: true,
    isEmailVerified: false,
    roleId: 2,
    role: {
      id: 2,
      name: 'USER',
      description: 'Standard authenticated platform user',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findByEmailForAuthentication: jest.fn(),
      findUserRole: jest.fn(),
      createUser: jest.fn(),
      recordLoginAttempt: jest.fn().mockResolvedValue(undefined),
      createLoginSession: jest.fn(),
      revokeSession: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );

    jest.clearAllMocks();
    delete process.env.JWT_ACCESS_TOKEN_TTL_SECONDS;
  });

  it('registers a new user without exposing the password hash', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findUserRole.mockResolvedValue(activeUser.role);
    usersService.createUser.mockResolvedValue(activeUser);
    jest.mocked(argon2.hash).mockResolvedValue('stored-password-hash');

    const result = await authService.register({
      firstName: ' John ',
      lastName: ' Doe ',
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
    expect(result).not.toHaveProperty('passwordHash');
    expect(usersService.createUser).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      passwordHash: 'stored-password-hash',
      roleId: 2,
    });
  });

  it('rejects registration when the email already exists', async () => {
    usersService.findByEmail.mockResolvedValue(activeUser);

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
  });

  it('logs in an active user, creates a session, and signs a JWT', async () => {
    const expiresAt = new Date(Date.now() + 900_000);
    usersService.findByEmailForAuthentication.mockResolvedValue(activeUser);
    usersService.createLoginSession.mockResolvedValue({
      id: 'session-uuid',
      expiresAt,
    });
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');
    jest.mocked(argon2.verify).mockResolvedValue(true);

    const result = await authService.login(
      {
        email: ' JOHN.DOE@EXAMPLE.COM ',
        password: 'Password123!',
      },
      loginContext,
    );

    expect(argon2.verify).toHaveBeenCalledWith(
      'stored-password-hash',
      'Password123!',
    );
    const sessionInput = usersService.createLoginSession.mock.calls[0][0];
    expect(sessionInput).toMatchObject({
      userId: 'user-uuid',
      email: 'john.doe@example.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
    });
    expect(sessionInput.expiresAt).toBeInstanceOf(Date);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 'user-uuid',
        sid: 'session-uuid',
        email: 'john.doe@example.com',
        role: 'USER',
      },
      { expiresIn: 900 },
    );
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      tokenType: 'Bearer',
      expiresIn: 900,
      rememberMe: false,
      session: {
        id: 'session-uuid',
        expiresAt,
      },
      user: {
        id: 'user-uuid',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'USER',
      },
    });
  });

  it('creates a 30-day persistent session when remember me is selected', async () => {
    usersService.findByEmailForAuthentication.mockResolvedValue(activeUser);
    usersService.createLoginSession.mockResolvedValue({
      id: 'remembered-session-uuid',
      expiresAt: new Date(Date.now() + 2_592_000_000),
    });
    jwtService.signAsync.mockResolvedValue('remembered.jwt.token');
    jest.mocked(argon2.verify).mockResolvedValue(true);

    const result = await authService.login(
      {
        email: activeUser.email,
        password: 'Password123!',
        rememberMe: true,
      },
      loginContext,
    );

    expect(result.rememberMe).toBe(true);
    expect(result.expiresIn).toBe(2_592_000);
    expect(jwtService.signAsync).toHaveBeenCalledWith(expect.any(Object), {
      expiresIn: 2_592_000,
    });
  });

  it('rejects and audits an unknown email with a generic message', async () => {
    usersService.findByEmailForAuthentication.mockResolvedValue(null);

    await expect(
      authService.login(
        { email: 'missing@example.com', password: 'WrongPassword!' },
        loginContext,
      ),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));

    expect(usersService.recordLoginAttempt).toHaveBeenCalledWith({
      email: 'missing@example.com',
      successful: false,
      failureReason: 'INVALID_CREDENTIALS',
      ...loginContext,
    });
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects and audits an incorrect password', async () => {
    usersService.findByEmailForAuthentication.mockResolvedValue(activeUser);
    jest.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      authService.login(
        { email: activeUser.email, password: 'WrongPassword!' },
        loginContext,
      ),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));

    expect(usersService.recordLoginAttempt).toHaveBeenCalledWith({
      userId: activeUser.id,
      email: activeUser.email,
      successful: false,
      failureReason: 'INVALID_CREDENTIALS',
      ...loginContext,
    });
    expect(usersService.createLoginSession).not.toHaveBeenCalled();
  });

  it('rejects and audits an inactive account', async () => {
    usersService.findByEmailForAuthentication.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);

    await expect(
      authService.login(
        { email: activeUser.email, password: 'Password123!' },
        loginContext,
      ),
    ).rejects.toThrow(new ForbiddenException('This account is inactive.'));

    expect(usersService.recordLoginAttempt).toHaveBeenCalledWith({
      userId: activeUser.id,
      email: activeUser.email,
      successful: false,
      failureReason: 'ACCOUNT_INACTIVE',
      ...loginContext,
    });
    expect(usersService.createLoginSession).not.toHaveBeenCalled();
  });

  it('revokes the active session during logout', async () => {
    await authService.logout('session-uuid');

    expect(usersService.revokeSession).toHaveBeenCalledWith('session-uuid');
  });
});
