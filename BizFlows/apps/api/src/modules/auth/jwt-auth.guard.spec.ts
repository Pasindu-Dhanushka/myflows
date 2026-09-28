import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import type { AuthenticatedRequest } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let usersService: { findActiveSession: jest.Mock };

  const activeSession = {
    id: 'session-uuid',
    user: {
      id: 'user-uuid',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: {
        name: 'USER',
      },
    },
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    usersService = {
      findActiveSession: jest.fn(),
    };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      usersService as unknown as UsersService,
    );
  });

  function createContext(request: Partial<Request>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  it('authenticates a bearer token backed by an active server session', async () => {
    const request = {
      get: jest.fn((name: string) =>
        name === 'authorization' ? 'Bearer signed.jwt.token' : undefined,
      ),
      headers: {},
    } as unknown as Request;
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid',
      sid: 'session-uuid',
    });
    usersService.findActiveSession.mockResolvedValue(activeSession);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(usersService.findActiveSession).toHaveBeenCalledWith(
      'session-uuid',
      'user-uuid',
    );
    expect((request as AuthenticatedRequest).auth).toEqual({
      sessionId: 'session-uuid',
      user: {
        id: 'user-uuid',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'USER',
      },
    });
  });

  it('accepts the HttpOnly access-token cookie', async () => {
    const request = {
      get: jest.fn(),
      headers: {
        cookie: 'theme=dark; bizflows_access_token=signed.jwt.token',
      },
    } as unknown as Request;
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid',
      sid: 'session-uuid',
    });
    usersService.findActiveSession.mockResolvedValue(activeSession);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('signed.jwt.token');
  });

  it('rejects a token whose server session is revoked or expired', async () => {
    const request = {
      get: jest.fn(() => 'Bearer signed.jwt.token'),
      headers: {},
    } as unknown as Request;
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-uuid',
      sid: 'session-uuid',
    });
    usersService.findActiveSession.mockResolvedValue(null);

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      new UnauthorizedException('Your session is invalid or has expired.'),
    );
  });

  it('rejects requests without a JWT', async () => {
    const request = {
      get: jest.fn(),
      headers: {},
    } as unknown as Request;

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      new UnauthorizedException('Authentication is required.'),
    );
  });
});
