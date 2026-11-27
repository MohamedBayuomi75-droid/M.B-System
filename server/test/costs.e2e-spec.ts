import { adminToken, bearer, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { COSTS } from '../src/cutover/parties-cutover';

/**
 * 8.8.3 — API التكاليف وتكلفة المشروع (DEC-0142). القديم = projectCostSummary بالظبط (المصروف بسطور صفر F-10، والفاتورة بالإجمالي F-11)،
 * والجديد = TR-10 (السطور، والصافي، والمرتجع سالب، والملغاة صفر)؛ وصفحة التكاليف (الجدول والحفظ بالسطور والأقسام والبنود)، والصلاحيات،
 * والتعارض، والأحداث — قبل النقل للجدول وبعده.
 */
describe('8.8.3 costs & project cost API', () => {
  let t: TestApp;
  let admin: string;
  let k = 0;
  const C = '/api/v1/costs', PC = '/api/v1/project-cost';
  const post = (path: string, body: Record<string, unknown>, tok = admin) => t.http().post(path).set(bearer(tok)).set('Idempotency-Key', `cst-key-${++k}`).send(body);
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });
  const one = async (name: string) => (await t.http().get(`${PC}/one?name=${encodeURIComponent(name)}`).set(bearer(admin)).expect(200)).body;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    expect((await sync(t, admin, { changes: [
      up('projects', 'pA', { code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 1000 }),
      up('workers', 'w1', { code: 'WRK-001', name: 'عامل أول', status: 'active', dailyWage: 300 }),
      up('workerAttendance', 'a1', { personType: 'worker', personId: 'w1', workerId: 'w1', date: '2026-03-01', status: 'present', days: 1.5, dayWage: 300, project: 'مشروع الشروق', deduction: 0 }),
      up('expenses', 'x1', { date: '2026-03-07', project: 'مشروع الشروق', lines: [{ item: 'شاي', amount: 40 }, { item: 'مياه', amount: 60 }] }),
      up('ledger.suppliers', 'sp1', { name: 'مورد' }),
      up('ledger.invoices', 'i1', { supplierId: 'sp1', invoiceNo: 'F-1', date: '2026-03-12', project: 'مشروع الشروق', baseValue: 100, vat: 14, stampDuty: 0, totalInvoice: 114, withheld: 4, netInvoice: 110, isReturn: false }),
      up('ledger.invoices', 'i2', { supplierId: 'sp1', invoiceNo: 'F-2', date: '2026-03-13', project: 'مشروع الشروق', totalInvoice: 500, netInvoice: 500, cancelled: true }),
      up('costs', 'c1', { personKind: 'worker', personId: 'w1', date: '2026-03-03', amount: 75, item: 'مواصلات', project: 'مشروع الشروق', section: 'مواقع', notes: '', extraFields: [] }),
      up('costs', 'c2', { personKind: 'worker', personId: 'w1', date: '2026-03-04', amount: 30, item: 'نثريات', project: 'اسم قديم', section: '', notes: '', extraFields: [] }),
    ], docs: [{ key: 'costSections', baseRev: 0, op: 'set', value: { workers: ['مواقع'] } }] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  const checks = async () => {
    const s = await one('مشروع الشروق');
    expect([s.legacy.labor, s.legacy.expenses, s.legacy.suppliers, s.legacy.costs, s.legacy.total, s.legacy.budgetStatus]).toEqual([450, 0, 114, 75, 639, 'ok']);
    expect([s.new.labor, s.new.expenses, s.new.suppliers, s.new.costs, s.new.total, s.new.budgetStatus]).toEqual(['450', '100', '110', '75', '735', 'ok']);
    const comp = (await t.http().get(PC).set(bearer(admin)).expect(200)).body;
    expect(comp.rows.map((r: { name: string; registered: boolean }) => [r.name, r.registered])).toEqual([['مشروع الشروق', true], ['اسم قديم', false]]);
    expect(comp.unregistered).toEqual(['اسم قديم']);
    expect((await t.http().get(`${PC}/by-project`).set(bearer(admin)).expect(200)).body.pA).toMatchObject({ legacyTotal: 639, total: '735', budgetStatus: 'ok' });
  };
  it('project cost both ways (before cutover)', checks);

  it('costs page: boards, table, save with lines, sections, items, conflict, events', async () => {
    const b = (await t.http().get(`${C}/boards`).set(bearer(admin)).expect(200)).body;
    expect(b.kinds[0]).toMatchObject({ id: 'workers', count: 2, total: 105 });
    const tb = (await t.http().get(`${C}/table?tab=workers&all=1`).set(bearer(admin)).expect(200)).body;
    expect(tb.sections.map((x: { name: string; count: number }) => [x.name, x.count])).toEqual([['الكل', 2], ['مواقع', 1]]);
    const r = await post(C, { personKind: 'worker', personId: 'w1', date: '2026-03-20', project: 'مشروع الشروق', lines: [{ item: 'خامات', amount: '10.555' }, { item: 'بند جديد', amount: '5' }] });
    expect(r.status).toBe(201);
    expect([r.body.amount, r.body.item, r.body.lines]).toEqual([15.56, 'خامات + بند جديد', [{ item: 'خامات', amount: 10.56 }, { item: 'بند جديد', amount: 5 }]]);
    const fo = (await t.http().get(`${C}/form-options`).set(bearer(admin)).expect(200)).body;
    expect(fo.suggestions.worker).toContain('بند جديد');
    expect((await t.http().patch(`${C}/${r.body.id}`).set(bearer(admin)).send({ rev: r.body.rev + 5, personKind: 'worker', personId: 'w1', date: '2026-03-20', lines: [{ item: 'خامات', amount: '1' }] })).status).toBe(409);
    expect((await post(`${C}/sections`, { tab: 'workers', op: 'rename', name: 'مواقع', to: 'المواقع' })).status).toBe(201);
    expect((await t.http().get(`${C}/c1`).set(bearer(admin)).expect(200)).body.section).toBe('المواقع');
    expect((await post(`${C}/items`, { kind: 'worker', op: 'rename', label: 'مواصلات', to: 'انتقالات' })).status).toBe(201);
    expect((await t.http().get(`${C}/c1`).set(bearer(admin)).expect(200)).body.item).toBe('انتقالات');
    const cur = (await t.http().get(`${C}/${r.body.id}`).set(bearer(admin))).body;
    expect((await t.http().delete(`${C}/${r.body.id}?rev=${cur.rev}`).set(bearer(admin))).status).toBe(200);
    const ev = await t.ds.query(`SELECT event_type FROM integration_events WHERE aggregate_type = 'cost' AND aggregate_id = $1 ORDER BY seq`, [r.body.id]);
    expect(ev.map((e: { event_type: string }) => e.event_type)).toEqual(['cost.saved', 'cost.deleted']);
  });

  it('permissions: a viewer cannot add costs', async () => {
    const viewer = (await newUser(t, admin, 'cst_viewer', 'viewer')).token;
    expect((await post(C, { personKind: 'worker', personId: 'w1', date: '2026-03-20', lines: [{ item: 'x', amount: '1' }] }, viewer)).status).toBe(403);
  });

  it('same numbers after the costs cutover', async () => {
    await cutoverModule(t.ds, COSTS, 'test', 'execute');
    await checks();
  });
});
