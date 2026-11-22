import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adminToken, bearer, createTestApp, newUser, TestApp } from './app';
import { FormulasService } from '../src/finance-rules/formulas.service';

/**
 * B-20 — Financial Rules Engine فوق قاعدة اختبار. المعادلات من المكتبة الأولية (مقترحة) — **بيانات اختبار**، مش اعتماد.
 * بيغطي من البند 15: منع الاعتماد الذاتي، والاختبار قبل الإرسال، والإصدارات، وعدم تغيّر المستندات القديمة (#20)، والقسمة على صفر،
 * والصيغ غير الآمنة، ومنع الحساب المكرر للمستند (#18).
 */
describe('B-20 financial rules engine', () => {
  let t: TestApp;
  let admin: string;
  let approver: { id: string; token: string };
  let viewer: string;
  const F = '/api/v1/finance/formulas';
  const lib = JSON.parse(readFileSync(join(__dirname, '../finance-formulas/B20_LIBRARY.json'), 'utf8')).formulas as { code: string; name: string; module: string; variables: Record<string, string>; lists: Record<string, string[]>; steps: unknown[]; testCases: unknown[] }[];
  const sup = lib.find((f) => f.code === 'SUP-INVOICE')!;
  const version = (o: Record<string, unknown> = {}) => ({ changeKind: 'new', effectiveFrom: '2026-01-01', changeReason: 'اختبار', definition: { variables: sup.variables, lists: sup.lists, steps: sup.steps }, testCases: sup.testCases, ...o });
  const inputs = { lines: [{ Quantity: '1', UnitPrice: '100000' }], CommercialDiscounts: '0', InputVAT: '14000', OtherAddedTaxes: '0', Fees: '0', WithholdingAmount: '1000', AdvancesApplied: '0', OtherApprovedDeductions: '0' };
  const ev = (date = '2026-06-01', body = inputs) => t.http().post(`${F}/SUP-INVOICE/evaluate`).set(bearer(viewer)).send({ date, inputs: body });

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    approver = await newUser(t, admin, 'frm_approver', 'viewer');
    await t.http().put(`/api/users/${approver.id}/doc-actions`).set(bearer(admin)).send({ approve: true }).expect(200);
    approver.token = (await t.http().post('/api/auth/login').set('x-forwarded-for', '10.8.8.8').send({ username: 'frm_approver', password: 'Data#User#2026' })).body.accessToken;
    viewer = (await newUser(t, admin, 'frm_viewer', 'viewer')).token;
  });
  afterAll(async () => t?.close());

  it('nothing seeded; regular users cannot read or prepare; unsafe or invalid formulas are refused', async () => {
    const [{ n }] = await t.ds.query(`SELECT (SELECT count(*) FROM financial_formulas) + (SELECT count(*) FROM financial_formula_versions) AS n`);
    expect(Number(n)).toBe(0);
    expect((await t.http().get(F).set(bearer(viewer))).status).toBe(403);
    expect((await t.http().post(F).set(bearer(viewer)).send({ code: 'SUP-INVOICE', name: 'x', module: 'suppliers' })).status).toBe(403);
    await t.http().post(F).set(bearer(admin)).send({ code: sup.code, name: sup.name, module: sup.module }).expect(201);
    for (const expr of ["process.exit(1)", "require('child_process')", "x; DROP TABLE users", "UnknownVar * 2"]) {
      const r = await t.http().post(`${F}/SUP-INVOICE/versions`).set(bearer(admin)).send(version({ definition: { variables: sup.variables, lists: sup.lists, steps: [{ name: 'X', expr }] } }));
      expect([expr, r.status, r.body.code]).toEqual([expr, 400, 'INVALID_FORMULA']);
    }
  });

  it('draft/pending never applies; tests must pass before submission; the creator cannot approve', async () => {
    const bad = await t.http().post(`${F}/SUP-INVOICE/versions`).set(bearer(admin)).send(version({ testCases: [{ name: 'خطأ متعمّد', inputs, expected: { NetSupplierPayable: '1.000000' } }] }));
    expect(bad.body).toMatchObject({ status: 'draft', tests_passed: false });
    expect((await t.http().post(`${F}/versions/${bad.body.id}/submit`).set(bearer(admin))).body.code).toBe('TESTS_REQUIRED');
    await t.http().delete(`${F}/versions/${bad.body.id}`).set(bearer(admin)).expect(200);
    const d = await t.http().post(`${F}/SUP-INVOICE/versions`).set(bearer(admin)).send(version());
    expect(d.body).toMatchObject({ status: 'draft', tests_passed: true, version: 1 });
    expect(d.body.test_results.every((r: { status: string }) => r.status === 'PASS')).toBe(true);
    expect((await ev()).body.code).toBe('NO_APPROVED_FORMULA');
    const p = await t.http().post(`${F}/versions/${d.body.id}/preview`).set(bearer(admin)).send({ inputs });
    expect(p.body.outputs).toMatchObject({ InvoiceTotal: '114000.000000', NetSupplierPayable: '113000.000000' });
    await t.http().post(`${F}/versions/${d.body.id}/submit`).set(bearer(admin)).expect(200);
    expect((await ev()).body.code).toBe('NO_APPROVED_FORMULA');
    expect((await t.http().post(`${F}/versions/${d.body.id}/approve`).set(bearer(admin)).send({})).body.code).toBe('SELF_APPROVAL');
    expect((await t.http().post(`${F}/versions/${d.body.id}/approve`).set(bearer(viewer)).send({})).status).toBe(403);
    expect((await t.http().post(`${F}/versions/${d.body.id}/approve`).set(bearer(approver.token)).send({ note: 'مراجعة' })).body.status).toBe('approved');
    expect((await ev()).body).toMatchObject({ version: 1, outputs: { InvoiceTotal: '114000.000000', NetSupplierPayable: '113000.000000' } });
    expect((await ev('2026-06-01', { ...inputs, CommercialDiscounts: '100000.000100' })).body.code).toBe('DISCOUNT_EXCEEDS_BASE');
  });

  it('approved versions are immutable in the database; submitted versions cannot be deleted', async () => {
    await expect(t.ds.query(`UPDATE financial_formula_versions SET definition = '{}' WHERE code = 'SUP-INVOICE' AND status = 'approved'`)).rejects.toThrow(/immutable/);
    await expect(t.ds.query(`DELETE FROM financial_formula_versions WHERE code = 'SUP-INVOICE'`)).rejects.toThrow(/never deleted/);
  });

  it('#20 a new version from a future date does not change documents computed before; recomputation returns the stored snapshot (#18)', async () => {
    const svc = t.app.get(FormulasService);
    const first = await t.ds.transaction((em) => svc.computeAndSnapshot(em, 'supplier-invoice', 'INV-1', 'SUP-INVOICE', '2026-06-01', inputs, null));
    expect(first).toMatchObject({ version: 1, reused: false, outputs: { NetSupplierPayable: '113000.000000' } });
    // إصدار 2 (تعديل منطق): الدفعات المقدمة مابتطرحش من المستحق — مثال اختباري بس
    const steps2 = (sup.steps as { name: string; expr: string }[]).map((s) => (s.name === 'NetSupplierPayable' ? { ...s, expr: 'InvoiceTotal - WithholdingAmount - OtherApprovedDeductions' } : s));
    const tc2 = [{ name: 'منطق جديد', inputs: { ...inputs, AdvancesApplied: '500' }, expected: { NetSupplierPayable: '113000.000000' } }];
    const v2 = await t.http().post(`${F}/SUP-INVOICE/versions`).set(bearer(admin)).send(version({ changeKind: 'logic', effectiveFrom: '2026-07-01', definition: { variables: sup.variables, lists: sup.lists, steps: steps2 }, testCases: tc2 }));
    expect(v2.body).toMatchObject({ version: 2, tests_passed: true });
    await t.http().post(`${F}/versions/${v2.body.id}/submit`).set(bearer(admin)).expect(200);
    await t.http().post(`${F}/versions/${v2.body.id}/approve`).set(bearer(approver.token)).send({}).expect(200);
    const [old] = await t.ds.query(`SELECT to_char(effective_to, 'YYYY-MM-DD') AS e FROM financial_formula_versions WHERE code = 'SUP-INVOICE' AND version = 1`);
    expect(old.e).toBe('2026-06-30');
    expect((await ev('2026-06-30', { ...inputs, AdvancesApplied: '500' })).body).toMatchObject({ version: 1, outputs: { NetSupplierPayable: '112500.000000' } });
    expect((await ev('2026-07-01', { ...inputs, AdvancesApplied: '500' })).body).toMatchObject({ version: 2, outputs: { NetSupplierPayable: '113000.000000' } });
    const again = await t.ds.transaction((em) => svc.computeAndSnapshot(em, 'supplier-invoice', 'INV-1', 'SUP-INVOICE', '2026-07-15', { ...inputs, AdvancesApplied: '999' }, null));
    expect(again).toMatchObject({ version: 1, reused: true, outputs: { NetSupplierPayable: '113000.000000' } });
    await expect(t.ds.query(`UPDATE document_formula_snapshots SET outputs = '{}'`)).rejects.toThrow();
    const audit = (await t.ds.query(`SELECT action FROM audit_log WHERE action LIKE 'formula.%' ORDER BY id`)).map((a: { action: string }) => a.action);
    expect(audit).toEqual(expect.arrayContaining(['formula.create', 'formula.version.create', 'formula.version.submit', 'formula.version.approve', 'formula.version.delete_draft']));
  });

  it('division by zero is not computable (NULL), suspension stops use, expired is derived', async () => {
    const pc = lib.find((f) => f.code === 'PROJECT-COST')!;
    await t.http().post(F).set(bearer(admin)).send({ code: pc.code, name: pc.name, module: pc.module }).expect(201);
    const v = await t.http().post(`${F}/PROJECT-COST/versions`).set(bearer(admin)).send({ changeKind: 'new', effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', changeReason: 'اختبار', definition: { variables: pc.variables, lists: pc.lists, steps: pc.steps }, testCases: pc.testCases });
    await t.http().post(`${F}/versions/${v.body.id}/submit`).set(bearer(admin)).expect(200);
    await t.http().post(`${F}/versions/${v.body.id}/approve`).set(bearer(approver.token)).send({}).expect(200);
    const z = await t.http().post(`${F}/PROJECT-COST/evaluate`).set(bearer(viewer)).send({ date: '2025-06-01', inputs: { MaterialCost: '1', LaborCost: '0', EquipmentCost: '0', SubcontractorCost: '0', DirectExpenses: '0', AllocatedIndirectCosts: '0', BudgetedCost: '0' } });
    expect(z.body.outputs).toMatchObject({ ActualProjectCost: '1.000000', VariancePercentage: null });
    const list = (await t.http().get(F).set(bearer(admin))).body;
    expect(list.find((f: { code: string }) => f.code === 'PROJECT-COST').versions[0].status).toBe('expired');
    expect((await t.http().post(`${F}/versions/${v.body.id}/suspend`).set(bearer(approver.token)).send({})).body.code).toBe('REASON_REQUIRED');
    expect((await t.http().post(`${F}/versions/${v.body.id}/suspend`).set(bearer(approver.token)).send({ note: 'إيقاف اختباري' })).body.storedStatus).toBe('suspended');
    expect((await t.http().post(`${F}/PROJECT-COST/evaluate`).set(bearer(viewer)).send({ date: '2025-06-01', inputs: {} })).body.code).toBe('NO_APPROVED_FORMULA');
  });
});
