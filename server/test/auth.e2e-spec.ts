import { JwtService } from '@nestjs/jwt';
import * as path from 'node:path';
import { ADMIN_NEW_PW, ADMIN_PW, adminToken, createTestApp, createUser, login, refreshCookie, TestApp } from './app';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const desktop = require(path.resolve(__dirname, '../../src/main/password.js')) as { hashPassword(p: string): { salt: string; hash: string } };

describe('A2 auth', () => {
  let t: TestApp;
  beforeAll(async () => { t = await createTestApp({ LOGIN_RATE_LIMIT_PER_MIN: '5', LOGIN_MAX_FAILURES: '4', LOGIN_LOCK_MINUTES: '15' }); });
  afterAll(async () => { await t?.close(); });
  const bearer = (tok: string) => ({ authorization: `Bearer ${tok}` });

  describe('default admin + forced password change', () => {
    let token: string;
    let cookie: string | undefined;

    it('bootstrap admin exists, must change password; username is case-insensitive', async () => {
      const r = await login(t, 'ADMIN', ADMIN_PW, '10.1.0.1');
      expect(r.res.status).toBe(200);
      expect(r.res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900, user: { username: 'admin', role: 'admin', mustChangePassword: true } });
      expect(r.res.body.user.permissions.manageUsers).toBe(true);
      expect(r.res.body.user.pages).toHaveLength(48);
      expect(r.res.headers['cache-control']).toBe('no-store');
      token = r.token; cookie = r.cookie;
    });

    it('refresh cookie is HttpOnly; Secure; SameSite=Lax; Path=/api/auth', async () => {
      const r = await login(t, 'admin', ADMIN_PW, '10.1.0.2');
      const raw = ([] as string[]).concat(r.res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('rt='))!;
      expect(raw).toMatch(/HttpOnly/);
      expect(raw).toMatch(/Secure/);
      expect(raw).toMatch(/SameSite=Lax/);
      expect(raw).toMatch(/Path=\/api\/auth/);
      expect(raw).toMatch(/Max-Age=1209600/); // 14 يوم
    });

    it('everything except me/change-password/logout is blocked until the password changes', async () => {
      expect((await t.http().get('/api/users').set(bearer(token))).body).toMatchObject({ statusCode: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
      expect((await t.http().get('/api/roles').set(bearer(token))).status).toBe(403);
      expect((await t.http().get('/api/me').set(bearer(token))).status).toBe(200);
    });

    it('rejects weak / default / unchanged passwords', async () => {
      for (const pw of ['short', 'admin123', '123456']) {
        const r = await t.http().post('/api/auth/change-password').set(bearer(token)).send({ newPassword: pw });
        expect(r.status).toBe(400);
        expect(r.body.code).toBe('WEAK_PASSWORD');
      }
      const same = await t.http().post('/api/auth/change-password').set(bearer(token)).send({ newPassword: ADMIN_PW });
      expect(same.body.code).toBe('WEAK_PASSWORD');
    });

    it('forced change works without the old password, revokes all old sessions/tokens', async () => {
      const r = await t.http().post('/api/auth/change-password').set(bearer(token)).send({ newPassword: ADMIN_NEW_PW });
      expect(r.status).toBe(200);
      expect(r.body.user.mustChangePassword).toBe(false);
      expect(refreshCookie(r)).toBeDefined();
      expect((await t.http().get('/api/me').set(bearer(token))).status).toBe(401);
      expect((await t.http().post('/api/auth/refresh').set('cookie', cookie!)).status).toBe(401);
      expect((await t.http().get('/api/users').set(bearer(r.body.accessToken))).status).toBe(200);
      expect((await login(t, 'admin', ADMIN_PW, '10.1.0.3')).res.status).toBe(401);
    });

    it('normal change requires the correct current password', async () => {
      const tok = (await login(t, 'admin', ADMIN_NEW_PW, '10.1.0.4')).token;
      expect((await t.http().post('/api/auth/change-password').set(bearer(tok)).send({ newPassword: 'Another#Pass#1' })).body.code).toBe('CURRENT_PASSWORD_WRONG');
      expect((await t.http().post('/api/auth/change-password').set(bearer(tok)).send({ currentPassword: 'wrong', newPassword: 'Another#Pass#1' })).body.code).toBe('CURRENT_PASSWORD_WRONG');
      const ok = await t.http().post('/api/auth/change-password').set(bearer(tok)).send({ currentPassword: ADMIN_NEW_PW, newPassword: 'Another#Pass#1' });
      expect(ok.status).toBe(200);
      const back = await t.http().post('/api/auth/change-password').set(bearer(ok.body.accessToken)).send({ currentPassword: 'Another#Pass#1', newPassword: ADMIN_NEW_PW });
      expect(back.status).toBe(200);
    });
  });

  describe('401 on protected endpoints', () => {
    it.each(['/api/me', '/api/users', '/api/roles'])('%s without / with bad tokens', async (url) => {
      expect((await t.http().get(url)).body).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
      expect((await t.http().get(url).set('authorization', 'Bearer garbage')).status).toBe(401);
      const forged = new JwtService({ secret: 'some-other-secret-'.padEnd(48, 'y') }).sign({ sub: '00000000-0000-0000-0000-000000000000', tv: 0, sid: 'x' });
      expect((await t.http().get(url).set('authorization', `Bearer ${forged}`)).status).toBe(401);
    });

    it('expired access token → 401', async () => {
      const tok = await adminToken(t);
      const payload = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString());
      const expired = new JwtService({ secret: process.env.JWT_SECRET! }).sign({ sub: payload.sub, tv: payload.tv, sid: payload.sid, exp: Math.floor(Date.now() / 1000) - 10 });
      expect((await t.http().get('/api/me').set('authorization', `Bearer ${expired}`)).status).toBe(401);
      // نفس الـ payload بتوقيع صحيح وصلاحية سارية = 200 (يعني الرفض فعلًا بسبب الانتهاء)
      const valid = new JwtService({ secret: process.env.JWT_SECRET! }).sign({ sub: payload.sub, tv: payload.tv, sid: payload.sid }, { expiresIn: 60 });
      expect((await t.http().get('/api/me').set('authorization', `Bearer ${valid}`)).status).toBe(200);
    });

    it('/api/health stays public', async () => {
      expect((await t.http().get('/api/health')).status).toBe(200);
    });
  });

  describe('login validation, rate limit, lockout', () => {
    it('same generic error for wrong password and unknown user', async () => {
      const a = await login(t, 'admin', 'wrong-password', '10.2.0.1');
      const b = await login(t, 'nobody-here', 'wrong-password', '10.2.0.2');
      expect(a.res.status).toBe(401);
      expect(b.res.status).toBe(401);
      expect(a.res.body).toEqual(b.res.body);
      expect(a.res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('400 for missing or extra fields (validated before passport)', async () => {
      expect((await t.http().post('/api/auth/login').send({ username: 'admin' })).status).toBe(400);
      expect((await t.http().post('/api/auth/login').send({ username: 'admin', password: 'x', isAdmin: true })).status).toBe(400);
      expect((await t.http().post('/api/auth/login').send({ username: ['admin'], password: 'x' })).status).toBe(400);
    });

    it('rate limit: 6th attempt/minute for the same IP+username → 429; other usernames unaffected', async () => {
      const ip = '10.3.0.1';
      for (let i = 0; i < 5; i++) expect((await login(t, 'ratelimit-user', 'x', ip)).res.status).toBe(401);
      expect((await login(t, 'ratelimit-user', 'x', ip)).res.status).toBe(429);
      expect((await login(t, 'ratelimit-other', 'x', ip)).res.status).toBe(401);
      expect((await login(t, 'ratelimit-user', 'x', '10.3.0.2')).res.status).toBe(401);
    });

    it('lockout after LOGIN_MAX_FAILURES consecutive failures (even from many IPs), then unlocks', async () => {
      const admin = await adminToken(t);
      expect((await createUser(t, admin, { username: 'lockme', password: 'Lock#Me#Pass1', role: 'viewer' })).status).toBe(201);
      for (let i = 0; i < 4; i++) expect((await login(t, 'lockme', 'bad', `10.4.0.${i}`)).res.status).toBe(401);
      const locked = await login(t, 'lockme', 'Lock#Me#Pass1', '10.4.1.1');
      expect(locked.res.status).toBe(423);
      expect(locked.res.body).toMatchObject({ code: 'ACCOUNT_LOCKED', retryAfterSec: expect.any(Number) });
      expect(locked.res.body.retryAfterSec).toBeGreaterThan(14 * 60);
      await t.ds.query(`UPDATE users SET locked_until = now() - interval '1 second' WHERE username = 'lockme'`);
      expect((await login(t, 'lockme', 'Lock#Me#Pass1', '10.4.1.2')).res.status).toBe(200);
      const [u] = await t.ds.query(`SELECT failed_attempts FROM users WHERE username = 'lockme'`);
      expect(u.failed_attempts).toBe(0);
      const audit = await t.ds.query(`SELECT action FROM audit_log WHERE username = 'lockme' ORDER BY id`);
      expect(audit.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(['auth.login_failed', 'auth.account_locked', 'auth.login']));
    });

    it('a successful login resets the failure counter', async () => {
      const admin = await adminToken(t);
      await createUser(t, admin, { username: 'resetcount', password: 'Reset#Count#1', role: 'viewer' });
      for (let i = 0; i < 3; i++) await login(t, 'resetcount', 'bad', `10.5.0.${i}`);
      expect((await login(t, 'resetcount', 'Reset#Count#1', '10.5.1.1')).res.status).toBe(200);
      for (let i = 0; i < 3; i++) await login(t, 'resetcount', 'bad', `10.5.2.${i}`);
      expect((await login(t, 'resetcount', 'Reset#Count#1', '10.5.3.1')).res.status).toBe(200);
    });

    it('inactive users cannot log in (same generic error)', async () => {
      const admin = await adminToken(t);
      const u = await createUser(t, admin, { username: 'inactive1', password: 'Inactive#Pass1', role: 'viewer', active: false });
      expect(u.status).toBe(201);
      expect((await login(t, 'inactive1', 'Inactive#Pass1', '10.6.0.1')).res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('refresh tokens', () => {
    it('rotates: new access token + new cookie; old cookie within grace → REFRESH_RACE (no mass revoke)', async () => {
      const { cookie, token } = await login(t, 'admin', ADMIN_NEW_PW, '10.7.0.1');
      const r1 = await t.http().post('/api/auth/refresh').set('cookie', cookie!);
      expect(r1.status).toBe(200);
      const c2 = refreshCookie(r1)!;
      expect(c2).not.toBe(cookie);
      expect((await t.http().get('/api/me').set(bearer(r1.body.accessToken))).status).toBe(200);
      const race = await t.http().post('/api/auth/refresh').set('cookie', cookie!);
      expect(race.body).toMatchObject({ statusCode: 401, code: 'REFRESH_RACE' });
      expect((await t.http().post('/api/auth/refresh').set('cookie', c2)).status).toBe(200);
      // الـ access token القديم مربوط بالجلسة اللي اتدوّرت → اتلغى (العميل بيستخدم الجديد)
      expect((await t.http().get('/api/me').set(bearer(token))).status).toBe(401);
    });

    it('reuse of a rotated token after the grace period = theft → every session + access token revoked', async () => {
      const admin = await adminToken(t);
      await createUser(t, admin, { username: 'victim', password: 'Victim#Pass#1', role: 'viewer' });
      const a = await login(t, 'victim', 'Victim#Pass#1', '10.8.0.1');
      const b = await login(t, 'victim', 'Victim#Pass#1', '10.8.0.2'); // جهاز تاني
      const r1 = await t.http().post('/api/auth/refresh').set('cookie', a.cookie!);
      expect(r1.status).toBe(200);
      await t.ds.query(`UPDATE sessions SET revoked_at = now() - interval '5 minutes' WHERE replaced_by IS NOT NULL AND user_id = (SELECT id FROM users WHERE username='victim')`);
      const reuse = await t.http().post('/api/auth/refresh').set('cookie', a.cookie!);
      expect(reuse.body.code).toBe('REFRESH_INVALID');
      expect((await t.http().get('/api/me').set(bearer(r1.body.accessToken))).status).toBe(401);
      expect((await t.http().get('/api/me').set(bearer(b.token))).status).toBe(401);
      expect((await t.http().post('/api/auth/refresh').set('cookie', refreshCookie(r1)!)).status).toBe(401);
      expect((await t.http().post('/api/auth/refresh').set('cookie', b.cookie!)).status).toBe(401);
      const [ev] = await t.ds.query(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'auth.refresh_reuse_detected'`);
      expect(ev.n).toBe(1);
    });

    it('missing / unknown / expired refresh cookie → 401 and cookie cleared', async () => {
      expect((await t.http().post('/api/auth/refresh')).status).toBe(401);
      const r = await t.http().post('/api/auth/refresh').set('cookie', 'rt=not-a-real-token');
      expect(r.status).toBe(401);
      expect(String(r.headers['set-cookie'])).toMatch(/rt=;/);
      const { cookie } = await login(t, 'admin', ADMIN_NEW_PW, '10.9.0.1');
      await t.ds.query(`UPDATE sessions SET expires_at = now() - interval '1 second' WHERE revoked_at IS NULL`);
      expect((await t.http().post('/api/auth/refresh').set('cookie', cookie!)).status).toBe(401);
    });
  });

  describe('logout', () => {
    it('logout revokes this session: its access token and cookie stop working immediately', async () => {
      const a = await login(t, 'admin', ADMIN_NEW_PW, '10.10.0.1');
      const b = await login(t, 'admin', ADMIN_NEW_PW, '10.10.0.2');
      const out = await t.http().post('/api/auth/logout').set('cookie', a.cookie!);
      expect(out.status).toBe(204);
      expect(String(out.headers['set-cookie'])).toMatch(/rt=;/);
      expect((await t.http().get('/api/me').set(bearer(a.token))).status).toBe(401);
      expect((await t.http().post('/api/auth/refresh').set('cookie', a.cookie!)).status).toBe(401);
      expect((await t.http().get('/api/me').set(bearer(b.token))).status).toBe(200); // الجهاز التاني شغال
    });

    it('logout-all revokes every device', async () => {
      const a = await login(t, 'admin', ADMIN_NEW_PW, '10.11.0.1');
      const b = await login(t, 'admin', ADMIN_NEW_PW, '10.11.0.2');
      expect((await t.http().post('/api/auth/logout-all').set(bearer(a.token))).status).toBe(204);
      for (const s of [a, b]) {
        expect((await t.http().get('/api/me').set(bearer(s.token))).status).toBe(401);
        expect((await t.http().post('/api/auth/refresh').set('cookie', s.cookie!)).status).toBe(401);
      }
      expect((await login(t, 'admin', ADMIN_NEW_PW, '10.11.0.3')).res.status).toBe(200);
    });
  });

  describe('legacy desktop accounts (scrypt)', () => {
    it('logs in with the desktop hash, then the hash is upgraded to argon2id in place', async () => {
      const legacy = desktop.hashPassword('Desktop#Old#Pw');
      await t.ds.query(
        `INSERT INTO users (legacy_id, username, name, role, password_algo, password_hash, password_salt, can_edit_data) VALUES ('u_legacy_1','legacyuser','مستخدم قديم','hr','scrypt',$1,$2,true)`,
        [legacy.hash, legacy.salt],
      );
      const r = await login(t, 'legacyuser', 'Desktop#Old#Pw', '10.12.0.1');
      expect(r.res.status).toBe(200);
      expect(r.res.body.user).toMatchObject({ role: 'hr', mustChangePassword: false });
      const [u] = await t.ds.query(`SELECT password_algo, password_salt, password_hash FROM users WHERE username='legacyuser'`);
      expect(u.password_algo).toBe('argon2id');
      expect(u.password_salt).toBeNull();
      expect(u.password_hash).toMatch(/^\$argon2id\$/);
      expect((await login(t, 'legacyuser', 'Desktop#Old#Pw', '10.12.0.2')).res.status).toBe(200);
      expect((await login(t, 'legacyuser', 'wrong', '10.12.0.3')).res.status).toBe(401);
      const [ev] = await t.ds.query(`SELECT details FROM audit_log WHERE action='auth.password_rehashed' AND username='legacyuser'`);
      expect(ev.details).toEqual({ from: 'scrypt', to: 'argon2id' });
    });
  });

  it('never logs secrets into the audit log', async () => {
    const rows = await t.ds.query(`SELECT details::text AS d FROM audit_log WHERE details IS NOT NULL`);
    const all = rows.map((r: { d: string }) => r.d).join('\n');
    for (const secret of [ADMIN_PW, ADMIN_NEW_PW, 'Desktop#Old#Pw', 'Lock#Me#Pass1']) expect(all).not.toContain(secret);
  });
});
