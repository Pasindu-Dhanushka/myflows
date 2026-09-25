import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_REMEMBERED_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export type LoginContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
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

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      roleId: user.roleId,
      createdAt: user.createdAt,
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
        role: user.role.name,
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
        role: user.role.name,
      },
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
