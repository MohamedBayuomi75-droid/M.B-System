import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';

/**
 * المرحلة 5 (البند 5.3): البيانات المرجعية المشتركة — قراءة بس للموديولات الجديدة، من نفس المصدر اللي الواجهة القديمة بتكتب فيه.
 */
describe('phase 5: shared reference data (read-only)', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'ref_viewer', 'viewer')).token;
    const r = await sync(t, admin, { docs: [{ key: 'expenseTypes', baseRev: 0, op: 'set', value: ['نقل', 'إقامة', 'ضيافة'] }] });
    expect(r.status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('lists every lookup key of the data catalogue with counts and revs', async () => {
    const r = await t.http().get('/api/v1/reference').set(bearer(viewer)).expect(200);
    const keys = r.body.items.map((x: { key: string }) => x.key);
    expect(keys).toContain('expenseTypes');
    expect(keys).toContain('ledger.documentTypes');
    expect(keys).not.toContain('settings'); // إعدادات مش قايمة مرجعية
    expect(r.body.items.find((x: { key: string }) => x.key === 'expenseTypes')).toEqual({ key: 'expenseTypes', count: 3, rev: 1 });
  });
  it('returns a list exactly as the legacy UI stores it; any signed-in user can read (same as the legacy UI)', async () => {
    const r = await t.http().get('/api/v1/reference/expenseTypes').set(bearer(viewer)).expect(200);
    expect(r.body).toEqual({ key: 'expenseTypes', rev: 1, count: 3, items: ['نقل', 'إقامة', 'ضيافة'] });
    const legacy = await t.http().get('/api/bootstrap').set(bearer(viewer)).expect(200);
    expect(legacy.body.data.expenseTypes).toEqual(r.body.items);
  });
  it('empty list for a known key with no data; 404 for anything that is not a lookup; 401 without a token; no write routes', async () => {
    expect((await t.http().get('/api/v1/reference/equipmentTypes').set(bearer(viewer)).expect(200)).body).toEqual({ key: 'equipmentTypes', rev: 0, count: 0, items: [] });
    for (const k of ['settings', 'ledger.suppliers', 'users', 'x']) expect([k, (await t.http().get(`/api/v1/reference/${encodeURIComponent(k)}`).set(bearer(admin))).status]).toEqual([k, 404]);
    expect((await t.http().get('/api/v1/reference')).status).toBe(401);
    for (const m of ['post', 'put', 'patch', 'delete'] as const) expect((await t.http()[m]('/api/v1/reference/expenseTypes').set(bearer(admin))).status).toBe(404);
  });
});
