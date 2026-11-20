import { adminToken, bearer, bootstrap, createTestApp, sync, TestApp } from './app';
import { MODULES, partiesCutover, partiesRollback } from '../src/cutover/parties-cutover';
import { reconcileModule, ReconcileReport } from '../src/cutover/module-cutover';

/**
 * المرحلة 6.1 — نقل الموردين والعملاء للجداول (الخطوات 6 و7 و§5 الرجوع) ببيانات اختبار.
 * المعيار: الواجهة الحالية (/api/bootstrap و/api/sync و/api/changes) مش بتحس بأي فرق قبل وبعد النقل وبعد الرجوع.
 */
describe('phase 6.1 cutover: records → relational tables (and back)', () => {
  let t: TestApp;
  let admin: string;
  const up = (collection: string, id: string, set: Record<string, unknown>, baseRev = 0) => ({ collection, id, op: 'upsert', baseRev, set });
  const sup = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `مورد ${id}`, taxId: '', commercialReg: '', businessNature: 'حديد', openingBalance: 0, openingBalanceDate: '',
    phone: '', email: '', address: '', bankAccount: '', iban: '', notes: '', extraFields: [], attachments: [], ...extra });
  const parties = async () => { const b = await bootstrap(t, admin); return { s: b.data.ledger.suppliers, c: b.data.clients.customers, revs: [b.meta.revs['ledger.suppliers'], b.meta.revs['clients.customers']], other: b.data.ledger.invoices }; };
  let before: Awaited<ReturnType<typeof parties>>;
  // المطابقة (المرحلة 6، البند 6.5): أعداد وبصمات بس، ولازم تتطابق قبل النقل وبعده وبعد الرجوع
  const reconcile = () => reconcileModule(t.ds, MODULES.parties);
  const sig = (r: ReconcileReport) => ({ c: r.collections.map(({ collection, count, content, order }) => ({ collection, count, content, order })), o: r.others });
  let r0: ReconcileReport;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    expect((await sync(t, admin, { changes: [
      up('ledger.suppliers', 's1', sup('s1', { openingBalance: -1500.5, openingBalanceDate: '2026-01-01', email: 'a@b.co', extraFields: [{ label: 'مندوب', value: 'أحمد' }], attachments: [{ id: 'att1', name: 'x.pdf' }], _lastEditBy: { u: 'x' } })),
      up('ledger.suppliers', 's2', sup('s2', { taxId: '123456789' })),
      up('ledger.suppliers', 's3', sup('s3')),
      up('clients.customers', 'c1', { id: 'c1', code: 'CUS-0001', name: 'عميل 1', phone: '', email: '', city: 'القاهرة', category: 'خاص', taxId: '', department: '', status: 'active', openingBalance: 250.75,
        address: '', notes: '', contacts: [{ name: 'م. علي', title: 'مدير', phone: '011', email: '' }], projects: [], contracts: [{ id: 'k1' }], invoices: [], collections: [], workSurveys: [], boqs: [],
        guarantees: [], ledger: [], comms: [], opportunities: [], attachments: [], docs: [], extraFields: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }),
      up('ledger.invoices', 'i1', { supplierId: 's1', invoiceNo: '7' }),
    ] })).status).toBe(200);
    const s3 = (await bootstrap(t, admin)).meta.revs['ledger.suppliers'].s3;
    expect((await sync(t, admin, { changes: [{ collection: 'ledger.suppliers', id: 's3', op: 'delete', baseRev: s3 }] })).status).toBe(200);
    expect((await sync(t, admin, { changes: [up('ledger.suppliers', 's2', { notes: 'rev2' }, 1)] })).status).toBe(200);
    before = await parties();
  });
  afterAll(async () => t?.close());

  it('dry-run migrates + verifies everything, then leaves no trace', async () => {
    r0 = await reconcile();
    expect(r0.collections.map((c) => [c.collection, c.source, c.count])).toEqual([['ledger.suppliers', 'records', 2], ['clients.customers', 'records', 1]]);
    expect(r0.others.count).toBeGreaterThan(0);
    const r = await partiesCutover(t.ds, 'test', 'dry-run');
    expect(r.collections.map((c) => [c.collection, c.migrated])).toEqual([['ledger.suppliers', 2], ['clients.customers', 1]]);
    const [{ n }] = await t.ds.query(`SELECT (SELECT count(*) FROM suppliers) + (SELECT count(*) FROM customers) + (SELECT count(*) FROM module_cutover) AS n`);
    expect(Number(n)).toBe(0);
    expect(sig(await reconcile())).toEqual(sig(r0));
  });

  it('execute: the legacy UI sees exactly the same data, order and revs; records are frozen', async () => {
    await partiesCutover(t.ds, 'test', 'execute');
    const after = await parties();
    expect(after).toEqual(before);
    const r1 = await reconcile();
    expect(r1.collections.map((c) => c.source)).toEqual(['table', 'table']);
    expect(sig(r1)).toEqual(sig(r0)); // نفس الأعداد والبصمات والترتيب من الجداول، ومفيش مجموعة تانية اتلمست
    const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM customer_contacts`);
    expect(n).toBe(1);
    await expect(t.ds.query(`UPDATE records SET data = data WHERE collection = 'ledger.suppliers' AND id = 's1'`)).rejects.toThrow(/frozen/);
    await expect(partiesCutover(t.ds, 'test', 'execute')).rejects.toThrow(/ALREADY_CUT_OVER/);
    expect((await t.http().get('/api/v1/suppliers/migration-plan').set(bearer(admin))).body).toMatchObject({ executed: true, relationalRowsNow: { suppliers: 2, customers: 1 } });
  });

  it('legacy sync writes land in the tables: update with a pending baseRev, insert, delete, restore; change events + history', async () => {
    const seq0 = (await t.http().get('/api/changes?since=0').set(bearer(admin))).body.seq;
    const r = await sync(t, admin, { changes: [up('ledger.suppliers', 's2', { phone: '0100' }, before.revs[0].s2), up('ledger.suppliers', 's4', sup('s4'))] });
    expect(r.body.applied.map((a: { op: string; rev: number }) => [a.op, a.rev])).toEqual([['update', 3], ['insert', 1]]);
    const [row] = await t.ds.query(`SELECT phone, notes, row_version FROM suppliers WHERE id = 's2'`);
    expect(row).toEqual({ phone: '0100', notes: 'rev2', row_version: 3 });
    const ev = await t.http().get(`/api/changes?since=${seq0}`).set(bearer(admin));
    expect(ev.body.changes.map((e: { id: string; data: { phone?: string } }) => [e.id, e.data?.phone])).toEqual([['s2', '0100'], ['s4', '']]);
    expect((await sync(t, admin, { changes: [{ collection: 'ledger.suppliers', id: 's4', op: 'delete', baseRev: 1 }] })).body.applied[0].op).toBe('delete');
    expect((await bootstrap(t, admin)).data.ledger.suppliers.map((s: { id: string }) => s.id)).toEqual(['s1', 's2']);
    expect((await sync(t, admin, { changes: [up('ledger.suppliers', 's4', sup('s4', { notes: 'restored' }))] })).body.applied[0].op).toBe('insert');
    const h = await t.http().get('/api/v1/history/ledger.suppliers/s2').set(bearer(admin)).expect(200);
    expect(h.body.changes[0].set).toEqual({ phone: '0100' });
  });

  it('table constraints reach the legacy UI as an explicit conflict (unique customer code, emails, value types) — nothing half-saved', async () => {
    const c = { id: 'c2', code: 'cus-0001 ', name: 'مكرر', contacts: [] };
    const r = await sync(t, admin, { changes: [up('clients.customers', 'c2', c), up('ledger.suppliers', 's1', { openingBalance: 'abc' }, before.revs[0].s1), up('ledger.suppliers', 's2', { extraFields: 'x' }, 3)] });
    expect(r.status).toBe(200);
    expect(r.body.conflicts.map((x: { id: string; reason: string; fields: string[] }) => [x.id, x.reason, x.fields[0].split(':')[0]])).toEqual([['c2', 'constraint', 'duplicate'], ['s1', 'constraint', 'invalid'], ['s2', 'constraint', 'invalid']]);
    const [{ n }] = await t.ds.query(`SELECT count(*)::int AS n FROM customers`);
    expect(n).toBe(1);
    expect((await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'x', code: 'CUS-0001' })).body.code).toBe('DUPLICATE_CODE');
    const ok = await t.http().post('/api/v1/customers').set(bearer(admin)).send({ name: 'عميل جديد بعد النقل' });
    expect(ok.body).toMatchObject({ code: 'CUS-0002', rev: 1 });
  });

  it('rollback: everything (including changes made after the cutover) goes back to records; tables emptied; legacy writes go to records again', async () => {
    const mid = await parties();
    const rMid = await reconcile();
    expect(sig(rMid)).not.toEqual(sig(r0)); // التعديلات بعد النقل باينة في البصمة
    const res = await partiesRollback(t.ds, 'test');
    expect(res.restored).toEqual({ 'ledger.suppliers': 3, 'clients.customers': 2 }); // s3 كان ممسوح قبل النقل فمااتنقلش (حذفه في records زي ما هو)
    expect(await parties()).toEqual(mid);
    const r2 = await reconcile();
    expect(r2.collections.map((c) => c.source)).toEqual(['records', 'records']);
    expect(sig(r2)).toEqual(sig(rMid)); // الرجوع: نفس الحالة اللي كانت في الجداول بالظبط (شاملة التعديلات بعد النقل)
    const [{ n }] = await t.ds.query(`SELECT (SELECT count(*) FROM suppliers) + (SELECT count(*) FROM customers) + (SELECT count(*) FROM module_cutover) AS n`);
    expect(Number(n)).toBe(0);
    const s2 = (await bootstrap(t, admin)).meta.revs['ledger.suppliers'].s2;
    expect((await sync(t, admin, { changes: [up('ledger.suppliers', 's2', { iban: 'EG1' }, s2)] })).body.applied[0].rev).toBe(s2 + 1);
    const [rec] = await t.ds.query(`SELECT data->>'iban' AS iban FROM records WHERE collection = 'ledger.suppliers' AND id = 's2'`);
    expect(rec.iban).toBe('EG1');
    const actions = (await t.ds.query(`SELECT action FROM audit_log WHERE action LIKE 'module.cutover%' ORDER BY id`)).map((a: { action: string }) => a.action);
    expect(actions).toEqual(['module.cutover', 'module.cutover.rollback']);
  });
});
