import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Authentication (e2e)', () => {
  type ErrorResponse = {
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
      role: string;
    };
  };

  type CurrentUserResponse = {
    sessionId: string;
    user: {
      email: string;
      role: string;
    };
  };

  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `login-e2e-${Date.now()}@example.com`;
  const password = 'ValidPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      role: 'USER',
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

    const currentUserResponse = await agent.get('/auth/me').expect(200);
    const currentUserBody =
      currentUserResponse.body as unknown as CurrentUserResponse;
    expect(currentUserBody.user).toMatchObject({ email, role: 'USER' });
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

    const audits = await prisma.loginAudit.findMany({
      where: { email },
      orderBy: { createdAt: 'asc' },
    });

    expect(audits).toHaveLength(3);
    expect(audits.map((audit) => audit.successful)).toEqual([
      false,
      true,
      true,
    ]);
    expect(audits[0].failureReason).toBe('INVALID_CREDENTIALS');
  });
});
