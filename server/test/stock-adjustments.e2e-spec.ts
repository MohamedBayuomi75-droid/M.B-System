import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';
import { pdf } from '../src/files/file-fixtures.spec-helper';

/**
 * B-51 — التسويات المخزنية المعتمدة. المسار (3 مستويات: مسؤول المخازن ← المحاسب ← المدير المالي) **بيانات اختبار**
 * بيعرّفها المدير من الإعداد — مفيش أي مسار أو مستوى متسجّل في النظام نفسه.
 */
describe('B-51 stock adjustments', () => {
  let t: TestApp;
  let admin: string;
  const u: Record<string, { id: string; token: string }> = {};
  let k = 0;
  const idem = () => ({ 'idempotency-key': `adj-test-${Date.now()}-${++k}` });
  const api = (tok: string) => ({
    post: (p: string, b: object = {}) => t.http().post(p).set(bearer(tok)).set(idem()).send(b),
    patch: (p: string, b: object) => t.http().patch(p).set(bearer(tok)).send(b),
    get: (p: string) => t.http().get(p).set(bearer(tok)),
  });
  const A = '/api/v1/stock/adjustments';
  const balance = async (loc = 'L1') => Number((await t.ds.query(`SELECT wh_balance('it1', $1)::text AS b`, [loc]))[0].b);
  const create = (o: Record<string, unknown> = {}) => api(u.keeper.token).post(A, { kind: 'increase', itemId: 'it1', locationId: 'L1', qty: '5', reason: 'استلام غير مسجّل (اختبار)', ...o });
  const approveAll = async (id: string) => {
    const a = (await api(admin).get(`${A}/${id}`)).body;
    for (const who of ['whMgr', 'accountant', 'cfo']) expect((await api(u[who].token).post(`/api/v1/approvals/requests/${a.approvalRequestId}/approve`)).status).toBe(200);
    return (await api(admin).get(`${A}/${id}`)).body;
  };

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    u.keeper = await newUser(t, admin, 'b51_keeper', 'warehouse');
    for (const n of ['whMgr', 'accountant', 'cfo', 'poster', 'other']) u[n] = await newUser(t, admin, `b51_${n}`, 'viewer');
    await t.http().put(`/api/users/${u.poster.id}/doc-actions`).set(bearer(admin)).send({ post: true }).expect(200);
    u.poster.token = (await t.http().post('/api/auth/login').set('x-forwarded-for', '10.7.7.7').send({ username: 'b51_poster', password: 'Data#User#2026' })).body.accessToken;
    expect((await sync(t, admin, { changes: [
      { collection: 'warehouses.items', id: 'it1', op: 'upsert', baseRev: 0, set: { id: 'it1', name: 'صنف اختبار' } },
      { collection: 'warehouses.locations', id: 'L1', op: 'upsert', baseRev: 0, set: { id: 'L1', name: 'مخزن 1' } },
      { collection: 'warehouses.locations', id: 'L2', op: 'upsert', baseRev: 0, set: { id: 'L2', name: 'مخزن 2' } },
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('no workflow configured → cannot submit; SoD exceptions are refused for this document type even with an admin reference', async () => {
    const d = await create();
    expect(d.status).toBe(201);
    expect((await api(u.keeper.token).post(`${A}/${d.body.id}/submit`)).body.code).toBe('UNKNOWN_DOCUMENT_TYPE');
    await api(admin).post('/api/v1/approvals/config/document-types', { code: 'stock-adjustment', name: 'تسوية مخزنية', module: 'warehouses.home' }).expect(201);
    expect((await api(u.keeper.token).post(`${A}/${d.body.id}/submit`)).body.code).toBe('NO_WORKFLOW');
    const levels = [{ mode: 'ANY', approvers: [{ type: 'USER', ref: u.whMgr.id }] }];
    for (const flags of [{ allowSelfApproval: true }, { allowSameApproverAcrossLevels: true }]) {
      const r = await api(admin).post('/api/v1/approvals/config/workflows', { documentType: 'stock-adjustment', ...flags, sodExceptionRef: 'قرار إدارة', levels });
      expect([r.status, r.body.code]).toEqual([422, 'SOD_MANDATORY']);
    }
    // المسار الاختباري: المنشئ نفسه ضمن معتمدي المستوى الأول (عشان نتأكد إنه مايقدرش يعتمد طلبه)، ومسؤول المخازن في المستويين 1 و2
    const wf = await api(admin).post('/api/v1/approvals/config/workflows', { documentType: 'stock-adjustment', levels: [
      { mode: 'ANY', approvers: [{ type: 'USER', ref: u.keeper.id }, { type: 'USER', ref: u.whMgr.id }] },
      { mode: 'ANY', approvers: [{ type: 'USER', ref: u.accountant.id }, { type: 'USER', ref: u.whMgr.id }] },
      { mode: 'ANY', approvers: [{ type: 'USER', ref: u.cfo.id }] },
    ] });
    expect(wf.status).toBe(201);
  });

  it('a pending (partially approved) adjustment never counts toward available stock; auto-posts after the last approval', async () => {
    const d = await create();
    const s = await api(u.keeper.token).post(`${A}/${d.body.id}/submit`);
    expect(s.body).toMatchObject({ status: 'submitted' });
    const req = s.body.approvalRequestId;
    expect((await api(u.keeper.token).post(`/api/v1/approvals/requests/${req}/approve`)).body.code).toBe('SELF_APPROVAL');
    await api(u.whMgr.token).post(`/api/v1/approvals/requests/${req}/approve`).expect(200);
    expect((await api(u.whMgr.token).post(`/api/v1/approvals/requests/${req}/approve`)).body.code).toBe('SAME_APPROVER_OTHER_LEVEL');
    await api(u.accountant.token).post(`/api/v1/approvals/requests/${req}/approve`).expect(200);
    // اتنين من تلاتة اعتمدوا — الكمية لسه برا الرصيد، وصرف بيعتمد عليها مرفوض (B-51 §5)
    expect(await balance()).toBe(0);
    const issue = await sync(t, u.keeper.token, { changes: [{ collection: 'warehouses.movements', id: 'mv-x1', op: 'upsert', baseRev: 0, set: { id: 'mv-x1', type: 'out', itemId: 'it1', qty: 3, locationId: 'L1' } }] });
    expect(issue.body.conflicts[0].fields[0]).toMatch(/^negative_stock/);
    await api(u.cfo.token).post(`/api/v1/approvals/requests/${req}/approve`).expect(200);
    const after = (await api(u.keeper.token).get(`${A}/${d.body.id}`)).body;
    expect(after).toMatchObject({ status: 'posted', movementId: `adj-${d.body.id}`, postError: null });
    expect(await balance()).toBe(5);
    const [m] = await t.ds.query(`SELECT data FROM records WHERE collection = 'warehouses.movements' AND id = $1`, [`adj-${d.body.id}`]);
    expect(m.data).toMatchObject({ type: 'adjust_in', qty: 5, adjustmentId: d.body.id, adjustmentKind: 'increase' });
    const acts = (await t.ds.query(`SELECT action FROM audit_log WHERE entity_id = $1 OR entity = 'stock-adjustment' ORDER BY id`, [d.body.id])).map((x: { action: string }) => x.action);
    expect(acts).toEqual(expect.arrayContaining(['stock.adjustment.create', 'approvals.submit', 'approvals.approve', 'stock.adjustment.posted']));
  });

  it('immutable after submission (API + database); attachments only before submission', async () => {
    const d = await create({ kind: 'damage', qty: '1', reason: 'تلف (اختبار)' });
    const up = (tok: string) => t.http().post(`/api/attachments?collection=stock.adjustments&recordId=${d.body.id}`).set(bearer(tok)).attach('file', pdf(), 'محضر تلف.pdf');
    expect((await up(u.other.token)).status).toBe(403);
    expect((await up(u.keeper.token)).status).toBe(201);
    await api(u.keeper.token).post(`${A}/${d.body.id}/submit`).expect(200);
    expect((await api(u.keeper.token).patch(`${A}/${d.body.id}`, { rowVersion: 2, qty: '9' })).body.code).toBe('IMMUTABLE');
    await expect(t.ds.query(`UPDATE stock_adjustments SET qty = 9 WHERE id = $1`, [d.body.id])).rejects.toThrow(/immutable/);
    await expect(t.ds.query(`DELETE FROM stock_adjustments WHERE id = $1`, [d.body.id])).rejects.toThrow(/kept forever/);
    expect((await up(u.keeper.token)).status).toBe(403);
    // المعتمد يشوف المرفق من غير صفحة المخازن لو هو طرف في المسار؛ والغريب لأ
    expect((await t.http().get(`/api/attachments?collection=stock.adjustments&recordId=${d.body.id}`).set(bearer(u.cfo.token))).body).toHaveLength(1);
    expect((await api(u.keeper.token).post(`${A}/${d.body.id}/cancel`, {})).body.code).toBe('REASON_REQUIRED');
    expect((await api(u.keeper.token).post(`${A}/${d.body.id}/cancel`, { reason: 'إلغاء اختباري' })).body.status).toBe('cancelled');
  });

  it('a fully approved deficit cannot bypass B-50: stays approved with the reason; manual post needs the separate post permission', async () => {
    const d = await create({ kind: 'deficit', qty: '8', reason: 'عجز جرد (اختبار)' });
    await api(u.keeper.token).post(`${A}/${d.body.id}/submit`).expect(200);
    expect((await api(u.poster.token).post(`${A}/${d.body.id}/post`)).body.code).toBe('NOT_APPROVED');
    const done = await approveAll(d.body.id);
    expect(done).toMatchObject({ status: 'approved', movementId: null });
    expect(done.postError).toMatch(/^negative_stock/);
    expect(await balance()).toBe(5);
    expect((await api(u.cfo.token).post(`${A}/${d.body.id}/post`)).status).toBe(403); // المعتمد مايترحّلش (B-05)
    expect((await api(u.keeper.token).post(`${A}/${d.body.id}/post`)).status).toBe(403);
    expect((await api(u.poster.token).post(`${A}/${d.body.id}/post`)).body.status).toBe('approved'); // لسه الرصيد مايكفيش
    await sync(t, admin, { changes: [{ collection: 'warehouses.movements', id: 'mv-in2', op: 'upsert', baseRev: 0, set: { id: 'mv-in2', type: 'in', itemId: 'it1', qty: 10, locationId: 'L1' } }] });
    const p = await api(u.poster.token).post(`${A}/${d.body.id}/post`);
    expect(p.body).toMatchObject({ status: 'posted' });
    expect(await balance()).toBe(7);
    expect((await api(u.keeper.token).post(`${A}/${d.body.id}/cancel`, { reason: 'x' })).body.code).toBe('POSTED');
    expect((await t.ds.query(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'stock.adjustment.post_failed' AND entity_id = $1`, [d.body.id]))[0].n).toBe(2);
  });

  it('transfer adjustment moves stock between locations after approval; incomplete inputs are refused', async () => {
    expect((await create({ kind: 'correction' })).body.code).toBe('DIRECTION_REQUIRED');
    expect((await create({ kind: 'transfer' })).body.code).toBe('BAD_TRANSFER');
    expect((await create({ kind: 'transfer', toLocationId: 'L1' })).body.code).toBe('BAD_TRANSFER');
    expect((await create({ itemId: 'nope' })).body.code).toBe('UNKNOWN_ITEM');
    expect((await create({ qty: '1.123456' })).status).toBe(400);
    expect((await api(u.other.token).post(A, { kind: 'increase', itemId: 'it1', locationId: 'L1', qty: '1', reason: 'xxx' })).status).toBe(403);
    const d = await create({ kind: 'transfer', toLocationId: 'L2', qty: '2.5', reason: 'تحويل (اختبار)' });
    await api(u.keeper.token).post(`${A}/${d.body.id}/submit`).expect(200);
    expect((await approveAll(d.body.id)).status).toBe('posted');
    expect([await balance('L1'), await balance('L2')]).toEqual([4.5, 2.5]);
  });
});
