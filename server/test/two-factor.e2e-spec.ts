import { adminToken, bearer, createTestApp, createUser, login, TestApp } from './app';
import { currentStep, totpAt } from '../src/auth/totp';

/** المرحلة 2 — S-8: التحقق بخطوتين (TOTP) + أكواد الاسترداد + إلزام أدوار + تصفير من المدير. */
describe('two-factor authentication (phase 2)', () => {
  let t: TestApp;
  let admin: string;
  const PW = 'TwoFactor#User#2026';
  let userId = '';
  let secret = '';
  let recovery: string[] = [];
  const loginOtp = (otp?: string) => t.http().post('/api/auth/login').set('x-forwarded-for', `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`).send({ username: 'tf_user', password: PW, ...(otp !== undefined ? { otp } : {}) });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await createUser(t, admin, { username: 'tf_user', password: PW, role: 'hr' });
    expect(r.status).toBe(201);
    userId = r.body.id;
  });
  afterAll(async () => { delete process.env.REQUIRE_2FA_ROLES; await t?.close(); });

  it('setup requires the current password, enable requires a valid code; secret stored encrypted', async () => {
    const tok = (await login(t, 'tf_user', PW)).token;
    expect((await t.http().post('/api/auth/2fa/setup').set(bearer(tok)).send({ password: 'wrong' })).status).toBe(401);
    const s = await t.http().post('/api/auth/2fa/setup').set(bearer(tok)).send({ password: PW }).expect(200);
    secret = s.body.secret;
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(s.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\/.*secret=/);
    expect((await t.http().post('/api/auth/2fa/enable').set(bearer(tok)).send({ otp: '000000' })).body.code).toBe('OTP_INVALID');
    const e = await t.http().post('/api/auth/2fa/enable').set(bearer(tok)).send({ otp: totpAt(secret, currentStep()) }).expect(200);
    recovery = e.body.recoveryCodes;
    expect(recovery).toHaveLength(10);
    const [row] = await t.ds.query(`SELECT totp_secret, totp_enabled, totp_pending, totp_recovery FROM users WHERE id = $1`, [userId]);
    expect(row.totp_enabled).toBe(true);
    expect(row.totp_pending).toBeNull();
    expect(row.totp_secret).not.toContain(secret);
    expect(row.totp_recovery.join(',')).not.toContain(recovery[0]);
    const me = await t.http().get('/api/me').set(bearer(tok)).expect(200);
    expect(me.body.twoFactorEnabled).toBe(true);
  });

  it('login: password alone → 401 OTP_REQUIRED; wrong code → OTP_INVALID; right code → tokens; same code twice → rejected', async () => {
    expect((await loginOtp()).body.code).toBe('OTP_REQUIRED');
    expect((await loginOtp('123456')).body.code).toBe('OTP_INVALID');
    const code = totpAt(secret, currentStep() + 1);
    const ok = await loginOtp(code);
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();
    expect((await loginOtp(code)).body.code).toBe('OTP_INVALID'); // إعادة استخدام
  });

  it('wrong password still fails before the OTP step (no OTP oracle)', async () => {
    const r = await t.http().post('/api/auth/login').send({ username: 'tf_user', password: 'nope-nope-nope', otp: '123456' });
    expect(r.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('recovery code works once', async () => {
    const r1 = await loginOtp(recovery[0].toLowerCase());
    expect(r1.status).toBe(200);
    expect((await loginOtp(recovery[0])).body.code).toBe('OTP_INVALID');
    const [row] = await t.ds.query(`SELECT cardinality(totp_recovery) AS n FROM users WHERE id = $1`, [userId]);
    expect(row.n).toBe(9);
  });

  it('wrong OTP counts toward the account lockout', async () => {
    const [{ failed_attempts: before }] = await t.ds.query(`SELECT failed_attempts FROM users WHERE id = $1`, [userId]);
    await loginOtp('999999');
    const [{ failed_attempts: after }] = await t.ds.query(`SELECT failed_attempts FROM users WHERE id = $1`, [userId]);
    expect(after).toBe(before + 1);
  });

  it('REQUIRE_2FA_ROLES: a user in a required role can log in but is limited to enrolment until 2FA is on', async () => {
    process.env.REQUIRE_2FA_ROLES = 'viewer';
    const pw = 'Viewer#Needs#2FA1';
    expect((await createUser(t, admin, { username: 'tf_viewer', password: pw, role: 'viewer' })).status).toBe(201);
    const tok = (await login(t, 'tf_viewer', pw)).token;
    const me = await t.http().get('/api/me').set(bearer(tok)).expect(200);
    expect(me.body.twoFactorSetupRequired).toBe(true);
    const b = await t.http().get('/api/bootstrap').set(bearer(tok));
    expect([b.status, b.body.code]).toEqual([403, 'TWO_FACTOR_SETUP_REQUIRED']);
    const s = await t.http().post('/api/auth/2fa/setup').set(bearer(tok)).send({ password: pw }).expect(200);
    await t.http().post('/api/auth/2fa/enable').set(bearer(tok)).send({ otp: totpAt(s.body.secret, currentStep()) }).expect(200);
    expect((await t.http().get('/api/bootstrap').set(bearer(tok))).status).toBe(200);
    delete process.env.REQUIRE_2FA_ROLES;
  });

  it('admin reset (manageUsers): clears 2FA and revokes sessions; not for own account; non-admin forbidden', async () => {
    const userTok = (await loginOtp(recovery[1])).body.accessToken;
    expect((await t.http().post(`/api/users/${userId}/2fa/reset`).set(bearer(userTok))).status).toBe(403);
    const meAdmin = await t.http().get('/api/me').set(bearer(admin));
    expect((await t.http().post(`/api/users/${meAdmin.body.id}/2fa/reset`).set(bearer(admin))).status).toBe(403);
    await t.http().post(`/api/users/${userId}/2fa/reset`).set(bearer(admin)).expect(204);
    expect((await t.http().get('/api/me').set(bearer(userTok))).status).toBe(401); // الجلسة اتقفلت
    expect((await loginOtp()).status).toBe(200); // من غير كود دلوقتي
    const audit = await t.ds.query(`SELECT action FROM audit_log WHERE action LIKE 'auth.2fa%' OR action = 'auth.recovery_code_used'`);
    expect(audit.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(['auth.2fa_setup_started', 'auth.2fa_enabled', 'auth.recovery_code_used', 'auth.2fa_reset_by_admin']));
  });

  it('disable needs password + current code', async () => {
    const tok = (await loginOtp()).body.accessToken;
    const s = await t.http().post('/api/auth/2fa/setup').set(bearer(tok)).send({ password: PW }).expect(200);
    await t.http().post('/api/auth/2fa/enable').set(bearer(tok)).send({ otp: totpAt(s.body.secret, currentStep()) }).expect(200);
    expect((await t.http().post('/api/auth/2fa/disable').set(bearer(tok)).send({ password: PW, otp: '000000' })).status).toBe(401);
    await t.http().post('/api/auth/2fa/disable').set(bearer(tok)).send({ password: PW, otp: totpAt(s.body.secret, currentStep() + 1) }).expect(204);
    expect((await loginOtp()).status).toBe(200);
  });
});
