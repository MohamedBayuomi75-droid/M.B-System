import { ROLE_KEYS, roleTemplates } from '../src/authz/roles';
import { adminToken, createTestApp, createUser, login, TestApp } from './app';

describe('A2 users / roles / me', () => {
  let t: TestApp;
  let admin: string;
  const bearer = (tok: string) => ({ authorization: `Bearer ${tok}` });
  const PW = 'User#Pass#2026';
  async function userToken(username: string, role: string, extra: Record<string, unknown> = {}) {
    const r = await createUser(t, admin, { username, password: PW, role, ...extra });
    expect(r.status).toBe(201);
    return { id: r.body.id as string, token: (await login(t, username, PW)).token };
  }

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
  });
  afterAll(async () => { await t?.close(); });

  describe('permission matrix (role × endpoint) generated from roles.ts', () => {
    const T = roleTemplates();
    it.each(ROLE_KEYS.filter((r) => r !== 'admin'))('%s', async (role) => {
      const { token } = await userToken(`matrix_${role}`, role);
      const canManage = T[role].manageUsers;
      expect((await t.http().get('/api/me').set(bearer(token))).status).toBe(200);
      expect((await t.http().get('/api/roles').set(bearer(token))).status).toBe(200);
      expect((await t.http().get('/api/users').set(bearer(token))).status).toBe(canManage ? 200 : 403);
      expect((await t.http().post('/api/users').set(bearer(token)).send({ username: `x_${role}`, password: PW, role: 'viewer' })).status).toBe(canManage ? 201 : 403);
      const me = (await t.http().get('/api/me').set(bearer(token))).body;
      expect(me.role).toBe(role);
      expect(me.permissions.pages).toEqual(T[role].pages);
      expect({ e: me.permissions.editData, d: me.permissions.deleteData, m: me.permissions.manageUsers }).toEqual({ e: T[role].editData, d: T[role].deleteData, m: T[role].manageUsers });
    });

    it('admin: all endpoints', async () => {
      for (const url of ['/api/me', '/api/roles', '/api/users']) expect((await t.http().get(url).set(bearer(admin))).status).toBe(200);
    });
  });

  describe('CRUD + validation', () => {
    it('creates a user; flags default from the role template; response never leaks password data', async () => {
      const r = await createUser(t, admin, { username: 'Payroll.One', name: 'محاسب رواتب', password: PW, role: 'payroll' });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ username: 'Payroll.One', role: 'payroll', active: true, editData: true, deleteData: false, manageUsers: false, mustChangePassword: false, projectScope: null, pages: [] });
      expect(Object.keys(r.body).sort()).toEqual(['active', 'createdAt', 'deleteData', 'editData', 'id', 'lastLoginAt', 'lockedUntil', 'manageUsers', 'mustChangePassword', 'name', 'pages', 'projectScope', 'role', 'username']);
      const list = await t.http().get('/api/users').set(bearer(admin));
      expect(JSON.stringify(list.body).toLowerCase()).not.toMatch(/hash|salt|totp/);
    });

    it('duplicate username (case-insensitive) → 409', async () => {
      expect((await createUser(t, admin, { username: 'payroll.one', password: PW, role: 'viewer' })).status).toBe(409);
    });

    it.each([
      [{ username: 'weak1', password: 'short', role: 'viewer' }, 'WEAK_PASSWORD'],
      [{ username: 'weak2', password: '123456', role: 'viewer' }, 'WEAK_PASSWORD'],
      [{ username: 'badrole', password: PW, role: 'superuser' }, undefined],
      [{ username: 'ab', password: PW, role: 'viewer' }, undefined],
      [{ username: 'has space', password: PW, role: 'viewer' }, undefined],
      [{ username: 'extra', password: PW, role: 'viewer', isRoot: true }, undefined],
      [{ username: 'badpage', password: PW, role: 'viewer', pages: [{ page: 'not.a.page', view: true, add: false, edit: false, delete: false }] }, undefined],
      [{ username: 'badscope', password: PW, role: 'viewer', projectScope: 'p1' }, undefined],
    ])('400 for invalid input %#', async (body, code) => {
      const r = await createUser(t, admin, body);
      expect(r.status).toBe(400);
      if (code) expect(r.body.code).toBe(code);
    });

    it('arabic usernames are allowed', async () => {
      expect((await createUser(t, admin, { username: 'محمد.علي', password: PW, role: 'viewer' })).status).toBe(201);
    });

    it('per-page overrides + project scope show up in /api/me', async () => {
      const { id, token } = await userToken('custom1', 'custom', {
        projectScope: ['p1', 'p2'],
        pages: [{ page: 'payroll', view: true, add: true, edit: true, delete: false }, { page: 'employees', view: true, add: false, edit: false, delete: false }],
      });
      const me = (await t.http().get('/api/me').set(bearer(token))).body;
      expect(me.projectScope).toEqual(['p1', 'p2']);
      expect(me.permissions.pages.payroll).toEqual({ view: true, add: true, edit: true, delete: false });
      expect(me.permissions.pages.employees.view).toBe(true);
      expect(me.permissions.pages.workers.view).toBe(false);
      // تعديل التخصيصات بيسري فورًا على نفس التوكن (الصلاحيات بتتقري من الداتابيز كل طلب)
      expect((await t.http().patch(`/api/users/${id}`).set(bearer(admin)).send({ pages: [] })).status).toBe(200);
      expect((await t.http().get('/api/me').set(bearer(token))).body.permissions.pages.payroll.view).toBe(false);
    });

    it('role change re-derives flags from the new template', async () => {
      const r = await createUser(t, admin, { username: 'rolechange', password: PW, role: 'viewer' });
      const up = await t.http().patch(`/api/users/${r.body.id}`).set(bearer(admin)).send({ role: 'hr' });
      expect(up.body).toMatchObject({ role: 'hr', editData: true, deleteData: true, manageUsers: false });
      const down = await t.http().patch(`/api/users/${r.body.id}`).set(bearer(admin)).send({ role: 'viewer', editData: true });
      expect(down.body).toMatchObject({ role: 'viewer', editData: true, deleteData: false });
    });

    it('GET /:id, 404 for unknown, 400 for non-uuid', async () => {
      const r = await createUser(t, admin, { username: 'getone', password: PW, role: 'viewer' });
      expect((await t.http().get(`/api/users/${r.body.id}`).set(bearer(admin))).body.username).toBe('getone');
      expect((await t.http().get('/api/users/00000000-0000-4000-8000-000000000000').set(bearer(admin))).status).toBe(404);
      expect((await t.http().get('/api/users/not-a-uuid').set(bearer(admin))).status).toBe(400);
    });

    it('audit log records user management actions with the actor', async () => {
      const rows = await t.ds.query(`SELECT DISTINCT action FROM audit_log WHERE action LIKE 'users.%' AND username = 'admin'`);
      expect(rows.map((r: { action: string }) => r.action)).toEqual(expect.arrayContaining(['users.create', 'users.update']));
    });
  });

  describe('deactivate / reset password', () => {
    it('deactivating kills the user\'s tokens immediately and blocks login; reactivating restores login', async () => {
      const { id, token } = await userToken('todeactivate', 'hr');
      expect((await t.http().get('/api/me').set(bearer(token))).status).toBe(200);
      expect((await t.http().patch(`/api/users/${id}`).set(bearer(admin)).send({ active: false })).body.active).toBe(false);
      expect((await t.http().get('/api/me').set(bearer(token))).status).toBe(401);
      expect((await login(t, 'todeactivate', PW)).res.status).toBe(401);
      await t.http().patch(`/api/users/${id}`).set(bearer(admin)).send({ active: true });
      expect((await login(t, 'todeactivate', PW)).res.status).toBe(200);
      const acts = await t.ds.query(`SELECT action FROM audit_log WHERE entity_id = $1 ORDER BY id`, [id]);
      expect(acts.map((a: { action: string }) => a.action)).toEqual(['users.create', 'users.deactivate', 'users.activate']);
    });

    it('reset password: old tokens revoked, new password works, forced change by default', async () => {
      const { id, token } = await userToken('toreset', 'viewer');
      expect((await t.http().post(`/api/users/${id}/reset-password`).set(bearer(admin)).send({ newPassword: 'short' })).body.code).toBe('WEAK_PASSWORD');
      expect((await t.http().post(`/api/users/${id}/reset-password`).set(bearer(admin)).send({ newPassword: 'Reset#By#Admin1' })).status).toBe(204);
      expect((await t.http().get('/api/me').set(bearer(token))).status).toBe(401);
      expect((await login(t, 'toreset', PW)).res.status).toBe(401);
      const r = await login(t, 'toreset', 'Reset#By#Admin1');
      expect(r.res.body.user.mustChangePassword).toBe(true);
      expect((await t.http().get('/api/roles').set(bearer(r.token))).body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    });
  });

  describe('privilege escalation & safety rails', () => {
    let manager: { id: string; token: string };
    let adminId: string;
    beforeAll(async () => {
      manager = await userToken('usermanager', 'hr', { manageUsers: true });
      adminId = (await t.http().get('/api/me').set(bearer(admin))).body.id;
    });

    it('non-admin with manageUsers can manage normal users', async () => {
      const r = await createUser(t, manager.token, { username: 'by_manager', password: PW, role: 'viewer' });
      expect(r.status).toBe(201);
      expect((await t.http().patch(`/api/users/${r.body.id}`).set(bearer(manager.token)).send({ name: 'تعديل' })).status).toBe(200);
    });

    it('…but cannot create admins, grant manageUsers, or touch admin accounts', async () => {
      expect((await createUser(t, manager.token, { username: 'evil_admin', password: PW, role: 'admin' })).status).toBe(403);
      expect((await createUser(t, manager.token, { username: 'evil_mgr', password: PW, role: 'viewer', manageUsers: true })).status).toBe(403);
      const v = await createUser(t, manager.token, { username: 'promote_me', password: PW, role: 'viewer' });
      expect((await t.http().patch(`/api/users/${v.body.id}`).set(bearer(manager.token)).send({ role: 'admin' })).status).toBe(403);
      expect((await t.http().patch(`/api/users/${v.body.id}`).set(bearer(manager.token)).send({ manageUsers: true })).status).toBe(403);
      expect((await t.http().patch(`/api/users/${adminId}`).set(bearer(manager.token)).send({ active: false })).status).toBe(403);
      expect((await t.http().post(`/api/users/${adminId}/reset-password`).set(bearer(manager.token)).send({ newPassword: 'Hijack#Admin#1' })).status).toBe(403);
    });

    it('cannot deactivate yourself or change your own role', async () => {
      expect((await t.http().patch(`/api/users/${manager.id}`).set(bearer(manager.token)).send({ active: false })).status).toBe(400);
      expect((await t.http().patch(`/api/users/${manager.id}`).set(bearer(manager.token)).send({ role: 'viewer' })).status).toBe(400);
      expect((await t.http().patch(`/api/users/${adminId}`).set(bearer(admin)).send({ active: false })).status).toBe(400);
    });

    it('the last active admin cannot be demoted or deactivated', async () => {
      const second = await createUser(t, admin, { username: 'admin2', password: PW, role: 'admin' });
      expect(second.status).toBe(201);
      const tok2 = (await login(t, 'admin2', PW)).token;
      // admin2 يخفّض admin الأصلي (مسموح — لسه فيه أدمن تاني)
      expect((await t.http().patch(`/api/users/${adminId}`).set(bearer(tok2)).send({ role: 'hr' })).status).toBe(200);
      // دلوقتي admin2 هو الأخير — محدش يقدر يخفّضه (هو نفسه ممنوع يغيّر دوره، والأدمن القديم بقى hr)
      expect((await t.http().patch(`/api/users/${second.body.id}`).set(bearer(tok2)).send({ role: 'viewer' })).status).toBe(400);
      const n = await t.ds.query(`SELECT count(*)::int AS n FROM users WHERE role='admin' AND active`);
      expect(n[0].n).toBe(1);
      // إرجاع الوضع
      expect((await t.http().patch(`/api/users/${adminId}`).set(bearer(tok2)).send({ role: 'admin' })).status).toBe(200);
    });
  });

  it('GET /api/roles lists all role templates', async () => {
    const r = await t.http().get('/api/roles').set(bearer(admin));
    expect(r.body.map((x: { key: string }) => x.key)).toEqual([...ROLE_KEYS]);
    expect(r.body.find((x: { key: string }) => x.key === 'hr').label).toBe('موارد بشرية');
    const db = await t.ds.query(`SELECT key, is_system, permissions->'pages'->'payroll' AS p FROM roles WHERE key='payroll'`);
    expect(db[0]).toMatchObject({ is_system: true, p: { view: true, add: true, edit: true, delete: false } });
  });

  it('OpenAPI documents the A2 endpoints', async () => {
    const doc = (await t.http().get('/api/docs-json')).body;
    for (const p of ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/auth/logout-all', '/api/auth/change-password', '/api/me', '/api/roles', '/api/users', '/api/users/{id}', '/api/users/{id}/reset-password']) {
      expect(doc.paths[p]).toBeDefined();
    }
    expect(Object.keys(doc.components.schemas)).toEqual(expect.arrayContaining(['LoginDto', 'TokenResponseDto', 'MeDto', 'UserDto', 'CreateUserDto', 'UpdateUserDto', 'PageOverrideDto', 'RoleDto']));
  });
});
