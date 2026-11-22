import { adminToken, bearer, bootstrap, createTestApp, newUser, sync, TestApp } from './app';
import { cutoverModule } from '../src/cutover/module-cutover';
import { PARTIES, SUPPLIER_INVOICES } from '../src/cutover/parties-cutover';

/**
 * 7.2.4 — API فواتير ومرتجعات الموردين (بيانات اختبار): نفس السلوك قبل وبعد نقل البيانات للجداول.
 * المعادلة الانتقالية (DEC-0107)، والرقم الداخلي (DEC-0103/0108)، وB-31 للجديد، والمرتجع المربوط، وأحداث outbox مرة واحدة (P7.2-I).
 */
describe('7.2.4 supplier invoices API', () => {
  let t: TestApp;
  let admin: string;
  let acc: string;
  let viewer: string;
  const P = '/api/v1/supplier-invoices';
  let k = 0;
  const post = (tok: string, body: Record<string, unknown>) => t.http().post(P).set(bearer(tok)).set('Idempotency-Key', `si-test-key-${++k}`).send(body);
  const legacyInv = async (id: string) => (await bootstrap(t, admin)).data.ledger.invoices.find((x: { id: string }) => x.id === id);
  const events = async (id: string) => (await t.ds.query(`SELECT event_type, idempotency_key, payload FROM integration_events WHERE aggregate_id = $1 ORDER BY seq`, [id]));

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    acc = (await newUser(t, admin, 'sia_acc', 'ledgerAccountant')).token;
    viewer = (await newUser(t, admin, 'sia_viewer', 'viewer')).token;
    const sup = (id: string) => ({ collection: 'ledger.suppliers', id, op: 'upsert', baseRev: 0, set: { id, name: `مورد ${id}`, taxId: '', openingBalance: 0, extraFields: [], attachments: [] } });
    const old = (id: string, o: Record<string, unknown>) => ({ collection: 'ledger.invoices', id, op: 'upsert', baseRev: 0, set: { id, supplierId: 'sA', date: '2020-01-10', baseValue: 1000, vat: 140, stampDuty: 0, withheld: 10, totalInvoice: 1140, netInvoice: 1130, isReturn: false, attachments: [], notes: '', ...o } });
    expect((await sync(t, admin, { changes: [sup('sA'), sup('sB'),
      old('oldA', { invoiceNo: 'OLD-1' }), old('oldB', { invoiceNo: 'OLD-1', notes: 'مكرر قديم' }), // B-31 مابيتطبّقش على القديم
      old('oldC', { invoiceNo: 'OLD-2', totalInvoice: 999, netInvoice: 999 }), // حسابها غلط: بتفضل بقيمتها
    ] })).body.applied).toHaveLength(5);
  });
  afterAll(async () => t?.close());

  const scenario = (label: string, cut: boolean) => it(`${label}: formula, internal number, B-31, linked returns, events`, async () => {
    if (cut) { await cutoverModule(t.ds, PARTIES, 'test', 'execute'); await cutoverModule(t.ds, SUPPLIER_INVOICES, 'test', 'execute'); }
    const x = cut ? 'B' : 'A';
    const base = { supplierId: 'sA', date: '2026-03-05', isReturn: false, baseValue: '1000.1234', vat: '140.0173', stampDuty: '0.9', withheld: '10.1', discountRate: '1', category: 'مواد', project: 'م1' };
    expect((await post(viewer, { ...base, invoiceNo: `${x}-0` })).status).toBe(403);
    // المعادلة الانتقالية: الإجمالي = 1000.1234 + 140.0173 + 0.9 = 1141.0407، والصافي = 1130.9407
    const a = await post(acc, { ...base, invoiceNo: `${x}-1` });
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ totalInvoice: 1141.0407, netInvoice: 1130.9407, cancelled: false, postReturnWht: false, linkedReturnIds: [], status: 'unpaid' });
    expect(a.body.internalNo).toMatch(/^PI-2026-\d{5}$/);
    const n1 = Number(a.body.internalNo.slice(-5));
    // نفس شكل السجل القديم (الواجهة القديمة بتقراه زي ما هو)
    expect(await legacyInv(a.body.id)).toMatchObject({ supplierId: 'sA', invoiceNo: `${x}-1`, baseValue: 1000.1234, vat: 140.0173, stampDuty: 0.9, withheld: 10.1, discountRate: '1', withheldStatus: 'unpaid', dueDate: '', linkedInvoiceId: '', internalNo: a.body.internalNo });
    // قواعد الإدخال بنفس رسايل القديم، وB-31 (من غير حالة أحرف ومسافات) — والرقم الداخلي مابيضيعش لما الحفظ يترفض (NO_GAPS)
    expect((await post(acc, { ...base, invoiceNo: `${x}-v`, withheld: '2000' })).body.message).toBe('المبلغ المخصوم أكبر من إجمالي الفاتورة');
    expect((await post(acc, { ...base, invoiceNo: `${x}-v`, dueDate: '2026-03-01' })).body.message).toBe('تاريخ الاستحقاق لا يمكن أن يكون قبل تاريخ الفاتورة');
    const dup = await post(acc, { ...base, invoiceNo: ` ${x}-1 `.toLowerCase() });
    expect([dup.status, dup.body.code]).toEqual([409, 'DUPLICATE_INVOICE_NO']);
    expect((await post(acc, { ...base, invoiceNo: 'OLD-1' })).body.code).toBe('DUPLICATE_INVOICE_NO'); // الجديد بيتقارن بالقديم كمان
    expect((await post(acc, { ...base, supplierId: 'sB', invoiceNo: `${x}-1` })).status).toBe(201); // مورد تاني: مسموح
    const b = await post(acc, { ...base, invoiceNo: `${x}-2`, baseValue: '500', vat: '70', stampDuty: '0', withheld: '0' });
    expect(Number(b.body.internalNo.slice(-5))).toBe(n1 + 2); // مفيش فجوات رغم الرفض
    // الأكواد الجديدة اتضافت لقوايم الاقتراحات (rememberManyCodes)، والاختيارات بتطلع منها
    const c = await post(acc, { ...base, invoiceNo: `${x}-codes`, internalCode: `IC-${x}\nIC-${x}2`, description: `صنف ${x}` });
    expect(c.status).toBe(201);
    const opts = (await t.http().get(`${P}/options`).set(bearer(viewer))).body;
    expect(opts.internalCodes).toEqual(expect.arrayContaining([`IC-${x}`, `IC-${x}2`]));
    expect(opts).toMatchObject({ moneyDecimals: 6, categories: expect.arrayContaining(['مصاريف', 'مواد']), projects: expect.arrayContaining(['م1']) });
    expect((await bootstrap(t, admin)).data.ledger.customInternalCodes).toEqual(expect.arrayContaining([`IC-${x}`, `IC-${x}2`]));
    // مرتجع جزئي على a (عليها محجوز) ← postReturnWht. ونفس رقم المورد للمرتجع مسموح (س1)
    const r1 = await post(acc, { supplierId: 'sA', invoiceNo: `${x}-1`, date: '2026-03-10', isReturn: true, linkedInvoiceId: a.body.id, baseValue: '100', vat: '14' });
    expect(r1.status).toBe(201);
    expect(r1.body.internalNo).toMatch(/^PR-2026-\d{5}$/);
    expect(await legacyInv(a.body.id)).toMatchObject({ cancelled: false, postReturnWht: true, linkedReturnIds: [r1.body.id] });
    // مرتجع تاني بيغطي الباقي (1130.9407 − 114 = 1016.9407) ← الأصل اتلغى + حدث إلغاء
    const r2 = await post(acc, { supplierId: 'sA', invoiceNo: `${x}-R2`, date: '2026-03-11', isReturn: true, linkedInvoiceId: a.body.id, baseValue: '1016.9407' });
    expect(await legacyInv(a.body.id)).toMatchObject({ cancelled: true, postReturnWht: false, linkedReturnIds: [r1.body.id, r2.body.id] });
    // الملغية مابتظهرش في قايمة الربط
    expect((await t.http().get(`${P}/linkable?supplierId=sA`).set(bearer(acc))).body.map((i: { id: string }) => i.id)).not.toContain(a.body.id);
    expect((await post(acc, { supplierId: 'sA', invoiceNo: `${x}-R3`, date: '2026-03-12', isReturn: true, linkedInvoiceId: a.body.id, baseValue: '1' })).body.code).toBe('BAD_LINK');
    // نقل r2 لفاتورة b ← a بترجع (حدث رجوع)، وb بتتقيّم (500+70=570 < 1016.9407؟ لا: المرتجع أكبر ← ملغية)
    const r2v = r2.body.rev;
    const mv = await t.http().patch(`${P}/${r2.body.id}`).set(bearer(acc)).send({ supplierId: 'sA', invoiceNo: `${x}-R2`, date: '2026-03-11', isReturn: true, linkedInvoiceId: b.body.id, baseValue: '1016.9407', rev: r2v });
    expect(mv.status).toBe(200);
    expect(await legacyInv(a.body.id)).toMatchObject({ cancelled: false, postReturnWht: true, linkedReturnIds: [r1.body.id] });
    expect(await legacyInv(b.body.id)).toMatchObject({ cancelled: true, linkedReturnIds: [r2.body.id] });
    // تعديل بـ rev قديم ← تعارض، ومفيش تحويل نوع لمستند ليه رقم داخلي
    expect((await t.http().patch(`${P}/${r2.body.id}`).set(bearer(acc)).send({ supplierId: 'sA', invoiceNo: `${x}-R2`, date: '2026-03-11', isReturn: true, baseValue: '1', rev: r2v })).body.code).toBe('CONFLICT');
    // UAT 7.2 J11: التعارض صريح حتى في الحقول النصية — نفس الحقل اتعدّل من حد تاني بعد الـ rev ده ← 409، والحفظ الأول بيفضل
    const bBody = { ...base, invoiceNo: `${x}-2`, baseValue: '500', vat: '70', stampDuty: '0', withheld: '0' };
    const bRev = (await t.http().get(`${P}/${b.body.id}`).set(bearer(acc))).body.rev;
    expect((await t.http().patch(`${P}/${b.body.id}`).set(bearer(acc)).send({ ...bBody, notes: `أول ${x}`, rev: bRev })).status).toBe(200);
    const stale = await t.http().patch(`${P}/${b.body.id}`).set(bearer(acc)).send({ ...bBody, notes: `تاني ${x}`, rev: bRev });
    expect([stale.status, stale.body.code]).toEqual([409, 'CONFLICT']);
    expect((await legacyInv(b.body.id)).notes).toBe(`أول ${x}`);
    const aRev = (await t.http().get(`${P}/${a.body.id}`).set(bearer(acc))).body.rev;
    expect((await t.http().patch(`${P}/${a.body.id}`).set(bearer(acc)).send({ ...base, invoiceNo: `${x}-1`, isReturn: true, rev: aRev })).body.code).toBe('KIND_LOCKED');
    // الأحداث: الترحيل مرة واحدة، والإلغاء والرجوع أحداث جديدة بالترتيب، ومفيش قيود
    expect((await events(a.body.id)).map((e: { event_type: string; idempotency_key: string }) => [e.event_type, e.idempotency_key])).toEqual([
      ['supplier-invoice.posted', `supplier-invoice.posted:${a.body.id}`],
      ['supplier-invoice.cancelled', `supplier-invoice.cancelled:${a.body.id}:1`],
      ['supplier-invoice.reinstated', `supplier-invoice.reinstated:${a.body.id}:1`],
    ]);
    const [posted] = await events(a.body.id);
    expect(posted.payload).toMatchObject({ internalNo: a.body.internalNo, total: '1141.0407', withheld: '10.1000', net: '1130.9407', currency: 'EGP', taxLines: [] });
    expect((await events(r1.body.id))[0]).toMatchObject({ event_type: 'supplier-return.posted', payload: { originalInvoiceId: a.body.id, originalEventKey: `supplier-invoice.posted:${a.body.id}` } });
    await expect(t.ds.query(`UPDATE integration_events SET payload = '{}'::jsonb`)).rejects.toThrow(/append-only/);
    // نفس Idempotency-Key ← نفس الرد من غير فاتورة تانية ولا حدث تاني
    const same = { ...base, invoiceNo: `${x}-idem` };
    const i1 = await t.http().post(P).set(bearer(acc)).set('Idempotency-Key', `si-idem-${x}-0001`).send(same);
    const i2 = await t.http().post(P).set(bearer(acc)).set('Idempotency-Key', `si-idem-${x}-0001`).send(same);
    expect([i1.status, i2.body.id]).toEqual([201, i1.body.id]);
    expect((await events(i1.body.id))).toHaveLength(1);
    // القديم: بيفضل من غير رقم داخلي حتى بعد التعديل، والمكرر القديم مسموح يتعدّل، وحسابه بيتعاد زي الحفظ القديم
    const oc = (await t.http().get(`${P}/oldC`).set(bearer(acc))).body;
    expect(oc).toMatchObject({ totalInvoice: 999, missing: expect.arrayContaining(['إجمالي غير متطابق']) });
    const ob = (await t.http().get(`${P}/oldB`).set(bearer(acc))).body;
    const ed = await t.http().patch(`${P}/oldB`).set(bearer(acc)).send({ supplierId: 'sA', invoiceNo: 'OLD-1', date: '2020-01-10', isReturn: false, baseValue: '1000', vat: '140', withheld: '10', notes: `تعديل ${x}`, rev: ob.rev });
    expect(ed.status).toBe(200);
    expect(ed.body.internalNo).toBeUndefined();
    // القايمة: نفس فلاتر القديم (المرتجعات، والبحث بالحروف المختلفة، والمتأخرة) والكروت بالسالب للمرتجع
    const rets = (await t.http().get(`${P}?mode=returns&supplierId=sA`).set(bearer(viewer))).body;
    expect(rets.rows.every((r: { isReturn: boolean }) => r.isReturn)).toBe(true);
    expect(rets.totals.net).toBeLessThan(0);
    expect((await t.http().get(`${P}?mode=invoices&q=${encodeURIComponent('مورد sa مواد')}`).set(bearer(viewer))).body.rows.map((r: { id: string }) => r.id)).toContain(a.body.id);
    expect((await t.http().get(`${P}?mode=invoices&overdueOnly=1&supplierId=sA`).set(bearer(viewer))).body.rows.map((r: { id: string }) => r.id)).toEqual(expect.arrayContaining(['oldA', 'oldC']));
  });

  scenario('before cutover (records)', false);
  scenario('after cutover (tables)', true);
});
