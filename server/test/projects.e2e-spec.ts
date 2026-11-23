import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { MODULES } from '../src/cutover/parties-cutover';

/**
 * 7.4.4 — API المشروعات (بيانات اختبار): الصلاحيات ونطاق المشروع، والإضافة (Idempotency + حدث project.saved)، ونشر تغيير الاسم في معاملة واحدة
 * بنفس صلاحيات الواجهة القديمة (لو مجموعة مربوطة مش مسموح للمستخدم يكتب فيها ← مفيش حاجة بتتحفظ)، وتقرير الأسماء غير المطابقة،
 * ونفس السلوك بعد نقل كل الموديولات للجداول (الاسم بيوصل لفواتير الموردين وحركات المخازن في جداولهم). المقارنة الحرفية بالقديم: tests-merge/phase72.js.
 */
describe('7.4.4 projects API', () => {
  let t: TestApp;
  let admin: string;
  let viewer: string;
  let cp: string;
  let pm: string;
  const P = '/api/v1/projects';
  let k = 0;
  const post = (tok: string, body: Record<string, unknown>, key: string | null = `pj-test-key-${++k}`) => { const r = t.http().post(P).set(bearer(tok)); return (key ? r.set('Idempotency-Key', key) : r).send(body); };
  const patch = async (tok: string, id: string, body: Record<string, unknown>) => {
    const cur = (await t.http().get(`${P}/${id}`).set(bearer(admin))).body;
    return t.http().patch(`${P}/${id}`).set(bearer(tok)).send({ rev: cur.rev, name: cur.name, customerId: cur.customerId || '', status: cur.stage, ...body });
  };
  const up = (collection: string, id: string, set: Record<string, unknown>) => ({ collection, id, op: 'upsert', baseRev: 0, set: { id, ...set } });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    viewer = (await newUser(t, admin, 'pj_viewer', 'viewer')).token;
    cp = (await newUser(t, admin, 'pj_cp', 'clientsProjects')).token;
    pm = (await newUser(t, admin, 'pj_pm', 'projectManager', { projectScope: ['pA'] })).token;
    expect((await sync(t, admin, { changes: [
      up('clients.customers', 'cA', { name: 'شركة الأمل', code: 'C1', status: 'active', contracts: [{ id: 'CON-1', title: 'عقد', project: 'مشروع الشروق', projectId: 'pA' }], invoices: [], boqs: [], workSurveys: [], collections: [], projects: [], extraFields: [] }),
      up('projects', 'pA', { code: 'PRJ-001', name: 'مشروع الشروق', status: 'active', budget: 1000, customerId: 'cA', customerName: 'شركة الأمل' }),
      up('projects', 'pB', { code: 'PRJ-002', name: 'مشروع وحيد', status: 'التعاقد', customerId: 'cA', customerName: 'شركة الأمل' }),
      up('workers', 'w1', { name: 'عامل', status: 'active', project: 'مشروع الشروق', projectId: 'pA' }),
      up('expenses', 'e1', { project: 'مشروع مجهول', amount: 1, date: '2026-01-01' }),
      up('ledger.suppliers', 's1', { name: 'مورد', extraFields: [], attachments: [] }),
      up('ledger.invoices', 'i1', { supplierId: 's1', invoiceNo: 'F-1', date: '2026-01-10', project: 'مشروع الشروق', projectId: 'pA', baseValue: 100, vat: 0, stampDuty: 0, withheld: 0, totalInvoice: 100, netInvoice: 100, isReturn: false, attachments: [] }),
      up('warehouses.locations', 'l1', { name: 'مخزن', code: 'L1' }), up('warehouses.items', 'it1', { name: 'صنف', code: 'IT1', unit: 'م' }),
      up('warehouses.movements', 'm1', { type: 'in', itemId: 'it1', locationId: 'l1', qty: 1, unitCost: 5, date: '2026-01-10', project: 'مشروع الشروق' }),
    ] })).status).toBe(200);
  });
  afterAll(async () => t?.close());

  it('permissions: viewer reads but cannot add/edit; project manager cannot add and sees only his scope', async () => {
    expect((await t.http().get(P).set(bearer(viewer))).status).toBe(200);
    expect((await post(viewer, { name: 'x', customerId: 'cA' })).status).toBe(403);
    expect((await patch(viewer, 'pB', { notes: 'x' })).status).toBe(403);
    expect((await post(pm, { name: 'x', customerId: 'cA' })).status).toBe(403);
    expect((await patch(pm, 'pB', { notes: 'x' })).status).toBe(404);
    expect((await t.http().get(`${P}/form-options`).set(bearer(viewer))).body).toMatchObject({ nextCode: 'PRJ-003', customers: [{ id: 'cA', name: 'شركة الأمل' }] });
  });

  it('create: Idempotency-Key required; legacy validation; event once; replay returns the same project', async () => {
    expect((await post(admin, { name: 'جديد', customerId: 'cA' }, null)).status).toBe(400);
    expect((await post(admin, { name: ' ', customerId: 'cA' })).body.code).toBe('VALIDATION');
    expect((await post(admin, { name: 'جديد' })).body.code).toBe('CUSTOMER_REQUIRED');
    expect((await post(admin, { name: 'جديد', customerId: 'nope' })).body.code).toBe('UNKNOWN_CUSTOMER');
    expect((await post(admin, { name: 'مشروع الشروق', customerId: 'cA' })).body.code).toBe('DUPLICATE_NAME');
    expect((await post(admin, { name: 'جديد', customerId: 'cA', status: 'مرحلة وهمية' })).body.code).toBe('BAD_STAGE');
    const a = await post(admin, { name: 'جديد', customerId: 'cA', value: '٢٬٥٠٠٫٧٥٥', progress: '150' }, 'pj-replay-key');
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ code: 'PRJ-003', value: 2500.76, budget: 2500.76, progress: 100, status: 'الدراسة والتخطيط', customerName: 'شركة الأمل', customer: 'شركة الأمل', stage: 'الدراسة والتخطيط' });
    expect(a.body.events.map((e: { type: string }) => e.type)).toEqual(['project.saved']);
    const b = await post(admin, { name: 'جديد', customerId: 'cA', value: '٢٬٥٠٠٫٧٥٥', progress: '150' }, 'pj-replay-key');
    expect([b.status, b.body.id]).toEqual([201, a.body.id]);
  });

  it('rename is all-or-nothing under the legacy write permissions', async () => {
    const before = (await bootstrap(t, admin)).data;
    const r = await patch(cp, 'pA', { name: 'محاولة' }); // clientsProjects مالوش يكتب في العمال ولا فواتير الموردين
    expect([r.status, r.body.code]).toEqual([403, 'FORBIDDEN']);
    const after = (await bootstrap(t, admin)).data;
    expect([after.projects.find((p: { id: string }) => p.id === 'pA').name, after.workers[0].project]).toEqual([before.projects.find((p: { id: string }) => p.id === 'pA').name, 'مشروع الشروق']);
    // حتى مشروع مالوش سجلات: projLinkAll بيربط أي اسم مطابق في كل البيانات (هنا حركة المخزن بتاعة «مشروع الشروق») — زي القديم، فبرضه ممنوع
    const side = await patch(cp, 'pB', { name: 'مشروع وحيد ٢' });
    expect([side.status, side.body.details.map((x: { collection: string }) => x.collection)]).toEqual([403, ['warehouses.movements']]);
    const ok = await patch(cp, 'pB', { notes: 'ملاحظة' }); // من غير تغيير اسم: برضه projLinkAll بيشتغل
    expect(ok.status).toBe(403);
  });

  it('unmatched names report (admin only, counts + names)', async () => {
    expect((await t.http().get(`${P}/unmatched-names`).set(bearer(viewer))).status).toBe(403);
    const r = await t.http().get(`${P}/unmatched-names`).set(bearer(admin)).expect(200);
    expect(r.body).toMatchObject({ distinctNames: 1, records: 1, byCollection: { expenses: 1 }, names: { 'مشروع مجهول': 1 } });
  });

  it('after every module is cut over: rename reaches the typed tables, the customer record and the workers; stage change moves the path', async () => {
    for (const m of ['parties', 'warehouses', 'supplier-invoices', 'supplier-payments', 'projects']) await cutoverModule(t.ds, MODULES[m], 'test', 'execute');
    const r = await patch(admin, 'pA', { name: 'الشروق الجديد' });
    expect(r.status).toBe(200);
    const d = (await bootstrap(t, admin)).data;
    expect([d.workers[0].project, d.ledger.invoices[0].project, d.warehouses.movements[0].project, d.clients.customers[0].contracts[0].project]).toEqual(Array(4).fill('الشروق الجديد'));
    expect(d.warehouses.movements[0].projectId).toBe('pA'); // اتربط بالاسم قبل التغيير (projLinkAll)
    expect(r.body.propagated).toBe(4); // العامل، والفاتورة، والحركة، والعميل (العقد جوه سجله)
    expect((await t.ds.query(`SELECT project FROM supplier_invoices WHERE id = 'i1'`))[0].project).toBe('الشروق الجديد');
    const s = await patch(admin, 'pB', { status: 'المستخلصات' });
    expect([s.status, s.body.stageMoved]).toEqual([200, false]); // مالوش stageKey: الحالة بس (زي القديم)
    await t.ds.query(`UPDATE projects SET stage_key = 'contracting', step_key = 'guarantee_letter' WHERE id = 'pB'`);
    const m = await patch(admin, 'pB', { status: 'التسليم الابتدائي' });
    expect([m.status, m.body.stageMoved, m.body.stageKey, m.body.stepKey, m.body.pathHistory[0].from]).toEqual([200, true, 'prelim_delivery', 'tech_inspect', 'contracting']);
    expect(m.body.events.map((e: { type: string }) => e.type)).toEqual(['project.saved', 'project.saved']);
  });
});
