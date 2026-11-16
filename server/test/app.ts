import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTempDb } from './db';

export const ADMIN_PW = 'Initial#Admin2026';
export const ADMIN_NEW_PW = 'Admin#Strong#2026';

export interface TestApp {
  app: INestApplication;
  ds: DataSource;
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
  /** عنوان السيرفر لو اتشغّل بـ listen (للـ Socket.IO) */
  url?: string;
}

/** تطبيق كامل فوق قاعدة مؤقتة جديدة (migrations + seed الأدوار + أول admin). env لازم يتظبط قبل import AppModule. */
export async function createTestApp(env: Record<string, string> = {}, opts: { listen?: boolean } = {}): Promise<TestApp> {
  const db = await createTempDb();
  Object.assign(process.env, {
    NODE_ENV: 'test', DATABASE_URL: db.url, DB_MIGRATIONS_RUN: 'true', LOG_LEVEL: 'silent', SWAGGER_ENABLED: 'true',
    JWT_SECRET: 'test-secret-'.padEnd(48, 'x'), ADMIN_INITIAL_PASSWORD: ADMIN_PW, LOGIN_RATE_LIMIT_PER_MIN: '1000',
    ...env,
  });
  const { AppModule } = await import('../src/app.module');
  const { setupApp } = await import('../src/setup-app');
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication({ logger: false });
  setupApp(app);
  let url: string | undefined;
  if (opts.listen) {
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  } else await app.init();
  const ds = app.get<DataSource>(getDataSourceToken());
  return {
    app, ds, url,
    http: () => request(app.getHttpServer()),
    close: async () => { await app.close(); await db.drop(); },
  };
}

export function refreshCookie(res: { headers: Record<string, unknown> }): string | undefined {
  const raw = res.headers['set-cookie'] as string[] | string | undefined;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const c = list.find((x) => x.startsWith('rt='));
  return c ? c.split(';')[0] : undefined;
}

let ipSeq = 0;
/** كل نداء من IP مختلف افتراضيًا (عشان حد الدخول/الدقيقة مايأثرش على الاختبارات اللي مش بتختبره) */
export async function login(t: TestApp, username: string, password: string, ip = `172.16.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`) {
  const res = await t.http().post('/api/auth/login').set('x-forwarded-for', ip).send({ username, password });
  return { res, token: res.body.accessToken as string, cookie: refreshCookie(res) };
}

/** يدخل بالأدمن الافتراضي ويغيّر كلمة المرور الإجبارية → توكن صالح لكل الـ endpoints */
export async function adminToken(t: TestApp): Promise<string> {
  const first = await login(t, 'admin', ADMIN_PW);
  if (first.res.status === 200) {
    const ch = await t.http().post('/api/auth/change-password').set('authorization', `Bearer ${first.token}`).send({ newPassword: ADMIN_NEW_PW });
    return ch.body.accessToken;
  }
  return (await login(t, 'admin', ADMIN_NEW_PW)).token;
}

export async function createUser(t: TestApp, token: string, body: Record<string, unknown>) {
  return t.http().post('/api/users').set('authorization', `Bearer ${token}`).send(body);
}

export const bearer = (tok: string) => ({ authorization: `Bearer ${tok}` });

export async function sync(t: TestApp, token: string, body: { changes?: unknown[]; docs?: unknown[] }) {
  return t.http().post('/api/sync').set(bearer(token)).send(body);
}

export async function bootstrap(t: TestApp, token: string) {
  const r = await t.http().get('/api/bootstrap').set(bearer(token));
  if (r.status !== 200) throw new Error(`bootstrap ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body as { seq: number; data: Record<string, any>; meta: { revs: Record<string, Record<string, number>>; docRevs: Record<string, number>; hidden: string[]; writable: Record<string, { add: boolean; edit: boolean; delete: boolean }>; docsWritable: boolean; hiddenFields: Record<string, string[]> } };
}

/** مستخدم جديد بدور معيّن (من الأدمن) + توكن */
export async function newUser(t: TestApp, admin: string, username: string, role: string, extra: Record<string, unknown> = {}) {
  const PW = 'Data#User#2026';
  const r = await createUser(t, admin, { username, password: PW, role, ...extra });
  if (r.status !== 201) throw new Error(`create ${username}: ${r.status} ${JSON.stringify(r.body)}`);
  return { id: r.body.id as string, token: (await login(t, username, PW)).token };
}

/** عميل Socket.IO متوثّق — بيجمع كل أحداث 'change' */
export async function connectSocket(t: TestApp, token: string | undefined) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('socket.io-client') as typeof import('socket.io-client');
  const socket = io(t.url!, { path: '/api/stream', transports: ['websocket'], auth: token ? { token } : {}, reconnection: false, forceNew: true });
  const changes: any[] = [];
  const events: { name: string; payload: any }[] = [];
  socket.on('change', (e: any) => changes.push(e));
  socket.onAny((name: string, payload: any) => { if (name !== 'change') events.push({ name, payload }); });
  const outcome = await new Promise<'ready' | 'rejected'>((resolve) => {
    socket.once('ready', () => resolve('ready'));
    socket.once('auth_error', () => resolve('rejected'));
    socket.once('disconnect', () => resolve('rejected'));
    socket.once('connect_error', () => resolve('rejected'));
  });
  return { socket, changes, events, outcome };
}

/** يستنى لحد ما شرط يتحقق (للأحداث اللحظية) */
export async function waitFor(cond: () => boolean, ms = 5000, label = 'condition') {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}
