import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';
import { TransactionRunner } from '../src/common/transaction';

/** المرحلة 4: الموديول التجريبي (Resource API بالطبقات)، صيغة الأخطاء الموحّدة، المعاملات */
describe('platform (phase 4)', () => {
  let t: TestApp;
  let admin: string;
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    const r = await sync(t, admin, { changes: [
      up('projects', 'p1', { name: 'مشروع الشروق', code: 'PRJ-2', budget: 1250000.5, status: 'active', stageKey: 'exec' }),
      up('projects', 'p2', { name: 'مشروع النيل', code: 'PRJ-1', budget: '2,000.0000005', status: 'active' }),
      up('projects', 'p3', { name: 'أرشيف', code: 'PRJ-3', status: 'مكتمل' }),
    ] });
    expect(r.status).toBe(200);
  });
  afterAll(async () => t?.close());

  describe('GET /api/v1/projects (pilot, layered)', () => {
    it('lists with money as 6-decimal strings (HALF_UP, DEC-0112), sorted, with source marker', async () => {
      const r = await t.http().get('/api/v1/projects').set(bearer(admin)).expect(200);
      expect(r.body.source).toBe('legacy-records');
      expect(r.body.total).toBe(3);
      expect(r.body.items.map((p: { id: string }) => p.id)).toEqual(['p3', 'p1', 'p2']); // ترتيب أبجدي عربي
      const p1 = r.body.items.find((p: { id: string }) => p.id === 'p1');
      const p2 = r.body.items.find((p: { id: string }) => p.id === 'p2');
      expect([p1.budget, p2.budget, r.body.items.find((p: { id: string }) => p.id === 'p3').budget]).toEqual(['1250000.500000', '2000.000001', null]);
      expect(p1).toMatchObject({ code: 'PRJ-2', name: 'مشروع الشروق', status: 'active', stage: 'exec', rev: 1 });
    });
    it('filters, searches, paginates; validates query', async () => {
      expect((await t.http().get('/api/v1/projects?status=active&sort=code').set(bearer(admin))).body.items.map((p: { code: string }) => p.code)).toEqual(['PRJ-1', 'PRJ-2']);
      expect((await t.http().get('/api/v1/projects?q=نيل').set(bearer(admin))).body.total).toBe(1);
      expect((await t.http().get('/api/v1/projects?limit=1&offset=1').set(bearer(admin))).body.items).toHaveLength(1);
      const bad = await t.http().get('/api/v1/projects?limit=9999').set(bearer(admin));
      expect([bad.status, bad.body.code, typeof bad.body.requestId]).toEqual([400, 'VALIDATION_FAILED', 'string']);
    });
    it('project scope: project manager sees only his project; others are 404', async () => {
      const pm = (await newUser(t, admin, 'pm_v1', 'projectManager', { projectScope: ['p1'] })).token;
      expect((await t.http().get('/api/v1/projects').set(bearer(pm))).body.items.map((p: { id: string }) => p.id)).toEqual(['p1']);
      expect((await t.http().get('/api/v1/projects/p1').set(bearer(pm))).status).toBe(200);
      const hidden = await t.http().get('/api/v1/projects/p2').set(bearer(pm));
      expect([hidden.status, hidden.body.code]).toEqual([404, 'NOT_FOUND']);
    });
    it('unauthenticated → 401 in the unified shape', async () => {
      const r = await t.http().get('/api/v1/projects');
      expect(r.status).toBe(401);
      expect(r.body).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
      expect(r.body.requestId).toBeTruthy();
    });
    it('the pilot is read-only (no write routes)', async () => {
      for (const m of ['post', 'put', 'patch', 'delete'] as const) expect([404, 405]).toContain((await (t.http() as any)[m]('/api/v1/projects/p1').set(bearer(admin)).send({})).status);
    });
  });

  describe('unified error format', () => {
    it('unknown API route → 404 with code + requestId; echoes client x-request-id', async () => {
      const r = await t.http().get('/api/v1/nope').set(bearer(admin)).set('x-request-id', 'req-test-123');
      expect(r.status).toBe(404);
      expect(r.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND', requestId: 'req-test-123' });
      expect(r.body.error).toBeUndefined();
    });
  });

  describe('TransactionRunner', () => {
    it('rolls back everything when the work throws; advisory locks serialise concurrent work', async () => {
      const tx = t.app.get(TransactionRunner);
      await t.ds.query(`CREATE TABLE tx_probe (n int)`);
      await expect(tx.run(async (em) => { await em.query(`INSERT INTO tx_probe VALUES (1)`); throw new Error('boom'); })).rejects.toThrow('boom');
      expect((await t.ds.query(`SELECT count(*)::int AS c FROM tx_probe`))[0].c).toBe(0);
      const order: string[] = [];
      const slow = tx.run(async (em) => { order.push('a-start'); await em.query('SELECT pg_sleep(0.3)'); order.push('a-end'); }, { lockKeys: [99] });
      await new Promise((r) => setTimeout(r, 50));
      const fast = tx.run(async () => { order.push('b'); }, { lockKeys: [99] });
      await Promise.all([slow, fast]);
      expect(order).toEqual(['a-start', 'a-end', 'b']);
      await t.ds.query(`DROP TABLE tx_probe`);
    });
  });
});
