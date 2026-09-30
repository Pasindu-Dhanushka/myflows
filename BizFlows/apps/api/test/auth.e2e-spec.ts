import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MailService } from '../src/modules/mail/mail.service';

describe('Authentication (e2e)', () => {
  type ErrorResponse = {
    code?: string;
    message: string;
  };

  type LoginResponse = {
    accessToken: string;
    expiresIn: number;
    rememberMe: boolean;
    session: { id: string };
    user: {
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
    };
  };

  type CurrentUserResponse = {
    sessionId: string;
    user: {
      email: string;
      roles: string[];
    };
  };

  type ProfileResponse = {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };

  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `login-e2e-${Date.now()}@example.com`;
  const password = 'ValidPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.loginAudit.deleteMany({
        where: { email },
      });
      await prisma.user.deleteMany({
        where: { email },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it('completes the login, authenticated-session, and logout lifecycle', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/auth/register')
      .send({
        firstName: 'Login',
        lastName: 'Tester',
        email,
        password,
      })
      .expect(201);

    const unverifiedLoginResponse = await agent
      .post('/auth/login')
      .send({ email, password })
      .expect(403);
    const unverifiedLoginBody =
      unverifiedLoginResponse.body as unknown as ErrorResponse;
    expect(unverifiedLoginBody).toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
      message:
        'Verify your email address before signing in. You can request another verification email below.',
    });

    await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    const invalidLoginResponse = await agent
      .post('/auth/login')
      .send({ email, password: 'IncorrectPassword!' })
      .expect(401);
    const invalidLoginBody =
      invalidLoginResponse.body as unknown as ErrorResponse;
    expect(invalidLoginBody.message).toBe('Invalid email or password.');

    const normalLoginResponse = await agent
      .post('/auth/login')
      .send({ email, password, rememberMe: false })
      .expect(200);
    const normalLoginBody =
      normalLoginResponse.body as unknown as LoginResponse;
    const normalCookies = normalLoginResponse.headers['set-cookie'];

    expect(normalLoginBody.rememberMe).toBe(false);
    expect(normalLoginBody.expiresIn).toBe(900);
    expect(
      Array.isArray(normalCookies) ? normalCookies[0] : normalCookies,
    ).not.toContain('Max-Age=');

    await agent.post('/auth/logout').expect(204);

    const loginResponse = await agent
      .post('/auth/login')
      .send({ email, password, rememberMe: true })
      .expect(200);
    const loginBody = loginResponse.body as unknown as LoginResponse;

    expect(loginBody.rememberMe).toBe(true);
    expect(loginBody.expiresIn).toBe(2_592_000);
    expect(loginBody.accessToken).toMatch(
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    );
    expect(loginBody.user).toMatchObject({
      email,
      firstName: 'Login',
      lastName: 'Tester',
      roles: ['USER'],
    });

    const cookies = loginResponse.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies) ? cookies[0] : cookies).toContain(
      'bizflows_access_token=',
    );
    expect(Array.isArray(cookies) ? cookies[0] : cookies).toContain('HttpOnly');
    expect(Array.isArray(cookies) ? cookies[0] : cookies).toContain(
      'Max-Age=2592000',
    );

    await agent
      .patch('/auth/profile')
      .send({ firstName: 'A', lastName: 'Tester' })
      .expect(400);

    const profileResponse = await agent.get('/auth/profile').expect(200);
    expect(
      (profileResponse.body as unknown as ProfileResponse).user,
    ).toMatchObject({
      firstName: 'Login',
      lastName: 'Tester',
      email,
    });

    await agent
      .patch('/auth/profile')
      .send({
        firstName: 'Login',
        lastName: 'Tester',
        email: 'new@example.com',
      })
      .expect(400);

    const updatedProfileResponse = await agent
      .patch('/auth/profile')
      .send({ firstName: 'Updated', lastName: 'Tester' })
      .expect(200);
    expect(
      (updatedProfileResponse.body as unknown as ProfileResponse).user,
    ).toMatchObject({
      firstName: 'Updated',
      lastName: 'Tester',
      email,
    });

    const otherAgent = request.agent(app.getHttpServer());
    const otherLoginResponse = await otherAgent
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const otherLoginBody = otherLoginResponse.body as unknown as LoginResponse;

    await agent
      .patch('/auth/password')
      .send({
        currentPassword: password,
        newPassword: 'weakpassword',
        confirmPassword: 'weakpassword',
      })
      .expect(400);

    const incorrectPasswordResponse = await agent
      .patch('/auth/password')
      .send({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      })
      .expect(400);
    expect(
      (incorrectPasswordResponse.body as unknown as ErrorResponse).message,
    ).toBe('Current password is incorrect.');

    await agent
      .patch('/auth/password')
      .send({
        currentPassword: password,
        newPassword: 'NewPassword456!',
        confirmPassword: 'DifferentPassword789!',
      })
      .expect(400);

    const changePasswordResponse = await agent
      .patch('/auth/password')
      .send({
        currentPassword: password,
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      })
      .expect(200);
    expect(
      (changePasswordResponse.body as unknown as { message: string }).message,
    ).toBe('Password changed successfully.');

    const changedUser = await prisma.user.findUnique({ where: { email } });
    expect(changedUser).not.toBeNull();
    await expect(
      argon2.verify(changedUser!.passwordHash, 'NewPassword456!'),
    ).resolves.toBe(true);

    await otherAgent.get('/auth/me').expect(401);
    const revokedOtherSession = await prisma.authSession.findUnique({
      where: { id: otherLoginBody.session.id },
    });
    expect(revokedOtherSession?.revocationReason).toBe('PASSWORD_CHANGED');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(401);

    const changedPasswordAgent = request.agent(app.getHttpServer());
    await changedPasswordAgent
      .post('/auth/login')
      .send({ email, password: 'NewPassword456!' })
      .expect(200);
    await changedPasswordAgent.post('/auth/logout').expect(204);

    const currentUserResponse = await agent.get('/auth/me').expect(200);
    const currentUserBody =
      currentUserResponse.body as unknown as CurrentUserResponse;
    expect(currentUserBody.user).toMatchObject({ email, roles: ['USER'] });
    expect(currentUserBody.sessionId).toBe(loginBody.session.id);

    await agent.post('/auth/logout').expect(204);
    await agent.get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(401);

    const revokedSession = await prisma.authSession.findUnique({
      where: { id: loginBody.session.id },
    });
    expect(revokedSession?.revokedAt).toBeInstanceOf(Date);
    expect(revokedSession?.revocationReason).toBe('USER_LOGOUT');

    const audits = await prisma.loginAudit.findMany({
      where: { email },
      orderBy: { createdAt: 'asc' },
    });

    expect(audits).toHaveLength(7);
    expect(audits.map((audit) => audit.successful)).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(audits[0].failureReason).toBe('EMAIL_NOT_VERIFIED');
    expect(audits[1].failureReason).toBe('INVALID_CREDENTIALS');
  });
});
