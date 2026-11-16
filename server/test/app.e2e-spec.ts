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

  it('serves the legacy UI on the same origin (/legacy) with the web scripts injected', async () => {
    expect((await request(app.getHttpServer()).get('/')).headers.location).toBe('/legacy/');
    expect((await request(app.getHttpServer()).get('/legacy')).headers.location).toBe('/legacy/');
    const idx = await request(app.getHttpServer()).get('/legacy/').expect(200);
    expect(idx.text).toContain('web/web-session.js');
    expect(idx.text).toContain('web/web-overrides.js');
    expect(idx.text).toContain('core/app.js');
    expect(idx.headers['cache-control']).toBe('no-cache');
    await request(app.getHttpServer()).get('/legacy/core/app.js').expect(200);
    await request(app.getHttpServer()).get('/legacy/web/sync-client.js').expect(200);
    await request(app.getHttpServer()).get('/legacy/vendor/xlsx.full.min.js').expect(200);
    await request(app.getHttpServer()).get('/favicon.ico').expect(200);
    await request(app.getHttpServer()).get('/legacy/nope.js').expect(404);
    // مفيش تسريب لملفات برّه renderer/web/vendor
    await request(app.getHttpServer()).get('/legacy/../package.json').expect(404);
    await request(app.getHttpServer()).get('/legacy/%2e%2e/server/package.json').expect(404);
  });

  it('web/index.html is up to date with renderer/index.html (npm run build:web)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execFileSync } = require('node:child_process');
    expect(() => execFileSync(process.execPath, [require('node:path').resolve(__dirname, '../../tools/web/build-web.js'), '--check'], { stdio: 'pipe' })).not.toThrow();
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
