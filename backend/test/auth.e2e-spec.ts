import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './../src/app.module';

/**
 * End-to-end auth flow against the real database:
 *   register -> verify token -> login -> GET /auth/me.
 *
 * Replaces the old throwaway script (backend/tmp-endpoint-check.js) so the
 * same checks run in CI. Needs a reachable DATABASE_URL, exactly like the
 * compiled server does. SMTP is not required: AuthMailerService logs instead
 * of sending when MAIL_USER/MAIL_PASS are unset.
 */
describe('Auth endpoints (e2e)', () => {
  // A run-unique email keeps parallel/aborted runs from colliding.
  const email = `e2e-${Date.now()}@example.com`;
  // Check 3 registers a derived address; both rows are cleaned up.
  const weakEmail = `x-${email}`;
  const password = 'rahasia123';

  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let accessToken: string;

  const cleanup = async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [email, weakEmail] } },
    });
  };

  beforeAll(async () => {
    // main.ts reads these at bootstrap; jest bypasses it, so mirror them here.
    process.env.JWT_SECRET ??= 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    process.env.CORS_ORIGINS ??= 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same global validation pipe as src/main.ts, so DTO rules are enforced.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        skipUndefinedProperties: true,
      }),
    );
    await app.init();

    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await app.close();
  });

  it('1. POST /auth/register creates an unverified account', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password })
      .expect(201);

    expect(res.body.message).toBeDefined();
  });

  it('2. re-registering an unverified account resends, not 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password })
      .expect(201);

    expect(res.body.message).toBeDefined();
  });

  it('3. rejects a password shorter than the policy', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'X', email: weakEmail, password: 'short' })
      .expect(400);
  });

  it('4. POST /auth/verify-email activates the account', async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.isVerified).toBe(false);
    expect(user?.verificationToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: user?.verificationToken })
      .expect(201);

    const verified = await prisma.user.findUnique({ where: { email } });
    expect(verified?.isVerified).toBe(true);
  });

  it('5. POST /auth/login returns an access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(typeof res.body.access_token).toBe('string');
    expect(res.body.access_token.length).toBeGreaterThan(0);
    accessToken = res.body.access_token;
  });

  it('6. GET /auth/me returns the caller without leaking the hash', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(email);
    expect(res.body).not.toHaveProperty('password');
  });

  it('7. GET /auth/me without a token returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('8. register on a verified account returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email, password })
      .expect(409);
  });
});
