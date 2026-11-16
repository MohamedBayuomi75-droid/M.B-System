import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { MIGRATIONS } from '../src/migrations';
import { createTempDb } from './db';

describe('HTTP app (health + swagger)', () => {
  let db: { url: string; drop: () => Promise<void> };
  let app: INestApplication;

  beforeAll(async () => {
    db = await createTempDb();
    Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: db.url, DB_MIGRATIONS_RUN: 'true', LOG_LEVEL: 'silent', SWAGGER_ENABLED: 'true' });
    // الاستيراد بعد ضبط env (AppModule بيقرا env وقت التحميل)
    const { AppModule } = await import('../src/app.module');
    const { setupApp } = await import('../src/setup-app');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await db?.drop();
  });

  it('GET /api/health → 200 ok, migrations applied on boot, none pending', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      version: expect.any(String),
      legacySchemaVersion: 9,
      db: { up: true, latencyMs: expect.any(Number), version: expect.stringMatching(/^16\./) },
      migrations: { applied: MIGRATIONS.length, pending: 0, latest: MIGRATIONS.at(-1)!.name },
    });
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('propagates an incoming x-request-id', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').set('x-request-id', 'abc-123').expect(200);
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('serves Swagger UI and the OpenAPI JSON with documented health schema', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths['/api/health'].get.responses['200']).toBeDefined();
    expect(Object.keys(res.body.components.schemas)).toEqual(expect.arrayContaining(['HealthDto', 'DbHealthDto', 'MigrationsHealthDto']));
  });

  it('unknown route → 404 JSON', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.body.statusCode).toBe(404);
  });

  it('GET /api/health → 503 when the database is gone', async () => {
    const ds = app.get<DataSource>(getDataSourceToken());
    await ds.destroy();
    const res = await request(app.getHttpServer()).get('/api/health').expect(503);
    expect(res.body.status).toBe('error');
    expect(res.body.db.up).toBe(false);
  });
});
