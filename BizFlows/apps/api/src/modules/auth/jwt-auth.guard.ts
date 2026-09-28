import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import type { AccessTokenPayload, AuthenticatedRequest } from './auth.types';

const ACCESS_TOKEN_COOKIE = 'bizflows_access_token';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException(
        'Your session is invalid or has expired.',
      );
    }

    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException(
        'Your session is invalid or has expired.',
      );
    }

    const session = await this.usersService.findActiveSession(
      payload.sid,
      payload.sub,
    );

    if (!session) {
      throw new UnauthorizedException(
        'Your session is invalid or has expired.',
      );
    }

    (request as AuthenticatedRequest).auth = {
      sessionId: session.id,
      user: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role.name,
      },
    };

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.get('authorization');

    if (authorization) {
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    for (const cookie of cookieHeader.split(';')) {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex < 0) continue;

      const name = cookie.slice(0, separatorIndex).trim();
      if (name !== ACCESS_TOKEN_COOKIE) continue;

      const value = cookie.slice(separatorIndex + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }

    return undefined;
  }
}
