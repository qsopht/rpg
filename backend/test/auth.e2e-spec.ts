/**
 * Smoke e2e — assumes Postgres+Redis are running per docker-compose.
 *   - Boots the Nest app on a random port
 *   - Registers a fresh user
 *   - Logs in
 *   - Hits /players/me with the access token
 *
 * Run via: npm run test:e2e
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
import { AppModule } from '../src/app.module';

describe('auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-secret-32-bytes-min-test-test';
    process.env.DATABASE_URL ??= 'postgres://aetheria:aetheria@localhost:5432/aetheria';
    process.env.REDIS_URL ??= 'redis://localhost:6379';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => app && (await app.close()));

  it('register → login → me', async () => {
    const email = `test+${Date.now()}@example.test`;
    const displayName = `Tester${Date.now().toString().slice(-6)}`;
    const password = 'correcthorsebattery';

    const reg = await supertest(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, displayName })
      .expect(201);

    expect(reg.body.accessToken).toBeDefined();
    expect(reg.body.user.displayName).toBe(displayName);

    const login = await supertest(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const me = await supertest(app.getHttpServer())
      .get('/players/me')
      .set('Authorization', 'Bearer ' + login.body.accessToken)
      .expect(200);

    expect(me.body.displayName).toBe(displayName);
  });
});
