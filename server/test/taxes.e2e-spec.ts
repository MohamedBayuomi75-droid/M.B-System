import { adminToken, bearer, createTestApp, newUser, TestApp } from './app';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TaxesService } from '../src/finance-rules/taxes.service';

/**
 * B-21 — إدارة الضرائب والاستقطاعات (محرك القواعد المالية). **كل الأكواد والنسب هنا بيانات اختبار** (TEST-*)،
 * مش النسب القانونية — النسب الفعلية بتدخل وتتعتمد من المدير المالي/المستشار الضريبي.
 */
describe('B-21 tax engine', () => {
  let t: TestApp;
  let admin: string;
  let approver: { id: string; token: string };
  let viewer: string;
  const base = '/api/v1/finance/taxes';
  const draft = (o: Record<string, unknown> = {}) => ({ method: 'PERCENT', rate: '10', base: 'NET_OF_DISCOUNT', appliesTo: ['test-invoice'], bearer: 'COUNTERPARTY',
    collector: 'COUNTERPARTY_CHARGES', effectiveFrom: '2026-01-01', legalRef: 'مرجع اختباري', changeReason: 'اختبار', ...o });
  const compute = (o: Record<string, unknown> = {}) => t.http().post(`${base}/compute`).set(bearer(viewer)).send({ documentType: 'test-invoice', date: '2026-06-01', codes: ['TEST-VAT'], bases: { NET_OF_DISCOUNT: '1000' }, ...o });
  const flow = async (code: string, body: Record<string, unknown>) => {
    const d = await t.http().post(`${base}/codes/${code}/versions`).set(bearer(admin)).send(body);
    expect(d.status).toBe(201);
    await t.http().post(`${base}/versions/${d.body.id}/submit`).set(bearer(admin)).expect(200);
    const a = await t.http().post(`${base}/versions/${d.body.id}/approve`).set(bearer(approver.token)).send({ note: 'ok' });
    return { id: d.body.id as string, approve: a };
  };

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    approver = await newUser(t, admin, 'tax_approver', 'viewer');
    await t.http().put(`/api/users/${approver.id}/doc-actions`).set(bearer(admin)).send({ approve: true }).expect(200);
    approver.token = (await t.http().post('/api/auth/login').set('x-forwarded-for', '10.9.9.9').send({ username: 'tax_approver', password: 'Data#User#2026' })).body.accessToken;
    viewer = (await newUser(t, admin, 'tax_viewer', 'viewer')).token;
  });
  afterAll(async () => t?.close());

  it('nothing is seeded; regular users cannot read or change; codes are admin-only', async () => {
    const [{ n }] = await t.ds.query(`SELECT (SELECT count(*) FROM tax_codes) + (SELECT count(*) FROM tax_code_versions) AS n`);
    expect(Number(n)).toBe(0);
    expect((await t.http().get(base).set(bearer(viewer))).status).toBe(403);
    expect((await t.http().post(`${base}/codes`).set(bearer(viewer)).send({ code: 'TEST-VAT', name: 'x', category: 'VAT' })).status).toBe(403);
    for (const [code, name, category] of [['TEST-VAT', 'قيمة مضافة (اختبار)', 'VAT'], ['TEST-WHT', 'خصم وإضافة (اختبار)', 'WHT'], ['TEST-RET', 'محتجزات (اختبار)', 'CONTRACTUAL'], ['TEST-PAY', 'مرتبات (اختبار)', 'PAYROLL_TAX']])
      expect((await t.http().post(`${base}/codes`).set(bearer(admin)).send({ code, name, category })).status).toBe(201);
    const [r] = await t.ds.query(`SELECT is_tax FROM tax_codes WHERE code = 'TEST-RET'`);
    expect(r.is_tax).toBe(false);
  });

  it('a draft or pending rate is never applied; approval needs a different person with the approve action', async () => {
    const d = await t.http().post(`${base}/codes/TEST-VAT/versions`).set(bearer(admin)).send(draft({ legalRef: undefined }));
    expect(d.body).toMatchObject({ status: 'draft', version: 1 }); // المسودة الممسوحة (اللي ماتبعتتش) مابتسيبش أثر، فالرقم بيتعاد
    expect((await compute()).body.code).toBe('NO_APPROVED_RATE');
    expect((await t.http().post(`${base}/versions/${d.body.id}/submit`).set(bearer(admin))).body.code).toBe('LEGAL_REF_REQUIRED');
    expect((await t.http().delete(`${base}/versions/${d.body.id}`).set(bearer(admin))).status).toBe(200);
    const d2 = await t.http().post(`${base}/codes/TEST-VAT/versions`).set(bearer(admin)).send(draft());
    await t.http().post(`${base}/versions/${d2.body.id}/submit`).set(bearer(admin)).expect(200);
    expect((await compute()).body.code).toBe('NO_APPROVED_RATE');
    expect((await t.http().post(`${base}/versions/${d2.body.id}/approve`).set(bearer(admin)).send({})).body.code).toBe('SELF_APPROVAL');
    expect((await t.http().post(`${base}/versions/${d2.body.id}/approve`).set(bearer(viewer)).send({})).status).toBe(403);
    expect((await t.http().post(`${base}/versions/${d2.body.id}/approve`).set(bearer(approver.token)).send({ note: 'مراجعة' })).body.status).toBe('approved');
    expect((await compute()).body).toEqual([expect.objectContaining({ code: 'TEST-VAT', version: 1, amount: '100.000000', taxableAmount: '1000.000000' })]);
    expect((await t.ds.query(`SELECT action FROM audit_log WHERE action LIKE 'tax.%' ORDER BY id`)).map((a: { action: string }) => a.action))
      .toEqual(['tax.code.create', 'tax.code.create', 'tax.code.create', 'tax.code.create', 'tax.version.create', 'tax.version.delete_draft', 'tax.version.create', 'tax.version.submit', 'tax.version.approve']);
  });

  it('approved versions are immutable in the database; submitted versions cannot be deleted', async () => {
    await expect(t.ds.query(`UPDATE tax_code_versions SET rate = 99 WHERE code = 'TEST-VAT' AND status = 'approved'`)).rejects.toThrow(/immutable/);
    await expect(t.ds.query(`DELETE FROM tax_code_versions WHERE code = 'TEST-VAT'`)).rejects.toThrow(/never deleted/);
    await expect(t.ds.query(`UPDATE tax_code_versions SET approved_by = created_by WHERE code = 'TEST-VAT'`)).rejects.toThrow();
  });

  it('new rate from a future date: old version closed the day before; documents keep the version they used', async () => {
    const svc = t.app.get(TaxesService);
    await t.ds.transaction((em) => svc.computeAndSnapshot(em, 'test-invoice', 'INV-1', { date: '2026-06-01', codes: ['TEST-VAT'], bases: { NET_OF_DISCOUNT: '1000' } }, null));
    const n = await flow('TEST-VAT', draft({ rate: '12', effectiveFrom: '2026-07-01', changeReason: 'تغيير النسبة (اختبار)' }));
    expect(n.approve.body.status).toBe('approved');
    const [old] = await t.ds.query(`SELECT to_char(effective_to, 'YYYY-MM-DD') AS e FROM tax_code_versions WHERE code = 'TEST-VAT' AND version = 1`);
    expect(old.e).toBe('2026-06-30');
    expect((await compute({ date: '2026-06-30' })).body[0]).toMatchObject({ version: 1, amount: '100.000000' });
    expect((await compute({ date: '2026-07-01' })).body[0]).toMatchObject({ version: 2, amount: '120.000000' });
    const lines = await svc.documentLines('test-invoice', 'INV-1');
    expect(lines.map((l: { version: number; amount: string }) => [l.version, l.amount])).toEqual([[1, '100.000000']]);
  });

  it('transitional treatment by contract date + exemption; same-condition overlap is refused', async () => {
    await flow('TEST-WHT', draft({ rate: '5', baseRatio: '40', conditions: { contractDateTo: '2026-03-15' }, collector: 'COMPANY_WITHHOLDS', exemptions: [{ reason: 'إعفاء اختباري', activities: ['exempt-activity'] }] }));
    await flow('TEST-WHT', draft({ rate: '5', conditions: { contractDateFrom: '2026-03-16' }, collector: 'COMPANY_WITHHOLDS', minBase: '300' }));
    const w = (context: Record<string, unknown>, amount = '1000') => compute({ codes: ['TEST-WHT'], bases: { NET_OF_DISCOUNT: amount }, context });
    expect((await w({ contractDate: '2026-03-01' })).body[0]).toMatchObject({ version: 1, taxableAmount: '400.000000', amount: '20.000000' });
    expect((await w({ contractDate: '2026-04-01' })).body[0]).toMatchObject({ version: 2, amount: '50.000000' });
    expect((await w({ contractDate: '2026-03-01', activity: 'exempt-activity' })).body[0]).toMatchObject({ amount: '0.000000', exemptReason: 'إعفاء اختباري' });
    expect((await w({ contractDate: '2026-04-01' }, '300')).body[0]).toMatchObject({ amount: '0.000000', exemptReason: 'BELOW_MIN_BASE' });
    expect((await w({})).body.code).toBe('NO_APPROVED_RATE');
    const dup = await t.http().post(`${base}/codes/TEST-WHT/versions`).set(bearer(admin)).send(draft({ rate: '6', effectiveFrom: '2025-01-01', conditions: { contractDateFrom: '2026-03-16' } }));
    await t.http().post(`${base}/versions/${dup.body.id}/submit`).set(bearer(admin)).expect(200);
    expect((await t.http().post(`${base}/versions/${dup.body.id}/approve`).set(bearer(approver.token)).send({})).body.code).toBe('OVERLAP');
    expect((await t.http().post(`${base}/versions/${dup.body.id}/reject`).set(bearer(approver.token)).send({})).body.code).toBe('REASON_REQUIRED');
    expect((await t.http().post(`${base}/versions/${dup.body.id}/reject`).set(bearer(approver.token)).send({ note: 'متداخل' })).body.status).toBe('rejected');
  });

  it('contractual deductions are separate from taxes; brackets; suspension stops use', async () => {
    // قرار 2026-11-17: الكود التعاقدي عام، والنسبة من بند العقد المعتمد — والإصدار بنسبة ثابتة مرفوض (خادم + قاعدة)
    expect((await t.http().post(`${base}/codes/TEST-RET/versions`).set(bearer(admin)).send(draft({ rate: '5', base: 'GROSS' }))).body.code).toBe('BAD_VERSION');
    expect((await t.http().post(`${base}/codes/TEST-VAT/versions`).set(bearer(admin)).send(draft({ method: 'CONTRACT', rate: undefined }))).body.code).toBe('BAD_VERSION');
    const ret = await flow('TEST-RET', draft({ method: 'CONTRACT', rate: undefined, templateRate: '5', base: 'GROSS', bearer: 'COUNTERPARTY', collector: 'COMPANY_WITHHOLDS' }));
    expect(ret.approve.body).toMatchObject({ status: 'approved', template_rate: '5.000000' });
    expect((await compute({ codes: ['TEST-RET'], bases: { GROSS: '1000' } })).body.code).toBe('CONTRACT_TERM_REQUIRED');
    const both = await compute({ codes: ['TEST-VAT', 'TEST-RET'], bases: { NET_OF_DISCOUNT: '1000', GROSS: '1000' }, contractTerms: { 'TEST-RET': { rate: '5', termRef: 'عقد اختبار — بند 12' } } });
    expect(both.body.map((l: { category: string; amount: string }) => [l.category, l.amount])).toEqual([['VAT', '100.000000'], ['CONTRACTUAL', '50.000000']]);
    await flow('TEST-PAY', draft({ method: 'BRACKETS', rate: undefined, base: 'TAXABLE_WAGE', appliesTo: ['test-payroll'], bearer: 'EMPLOYEE', collector: 'COMPANY_WITHHOLDS',
      brackets: [{ upTo: '1000', rate: '0' }, { upTo: '3000', rate: '10' }, { upTo: null, rate: '20' }] }));
    expect((await compute({ documentType: 'test-payroll', codes: ['TEST-PAY'], bases: { TAXABLE_WAGE: '5000' } })).body[0].amount).toBe('600.000000');
    expect((await t.http().post(`${base}/versions/${ret.id}/suspend`).set(bearer(approver.token)).send({ note: 'إيقاف اختباري' })).body.status).toBe('suspended');
    expect((await compute({ codes: ['TEST-RET'], bases: { GROSS: '1000' }, contractTerms: { 'TEST-RET': { rate: '5', termRef: 'x' } } })).body.code).toBe('NO_APPROVED_RATE');
  });

  it('draft-entry tool (taxes:drafts) creates drafts only — never submits, approves or applies; unverified rows skipped', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'taxdrafts-'));
    const file = join(dir, 'in.json');
    writeFileSync(file, JSON.stringify({ rows: [
      { code: 'TEST-IMP', name: 'استيراد اختبار', category: 'WHT', verified: true, version: { method: 'PERCENT', rate: '2', base: 'NET_OF_DISCOUNT', appliesTo: ['test-invoice'], bearer: 'COUNTERPARTY', collector: 'COMPANY_WITHHOLDS', effectiveFrom: '2026-01-01', legalRef: 'مرجع اختباري', changeReason: 'استيراد' } },
      { code: 'TEST-NOPE', name: 'غير متحقق', category: 'STAMP', verified: false, version: {} },
      { code: 'TEST-BAD', name: 'ناقص', category: 'STAMP', verified: true, version: { method: 'PERCENT', base: 'NET_OF_DISCOUNT' } },
    ] }));
    const out = execFileSync('node', ['dist/cli/tax-drafts.js', file, '--execute', '--by', 'admin'], { env: { ...process.env }, encoding: 'utf8' });
    expect(out).toMatch(/TEST-IMP v1: draft/);
    expect(out).toMatch(/TEST-NOPE: تخطّي/);
    expect(out).toMatch(/TEST-BAD: تخطّي/);
    const rows = await t.ds.query(`SELECT code, status FROM tax_code_versions WHERE code LIKE 'TEST-IMP%' OR code IN ('TEST-NOPE','TEST-BAD')`);
    expect(rows).toEqual([{ code: 'TEST-IMP', status: 'draft' }]);
    expect((await compute({ codes: ['TEST-IMP'] })).body.code).toBe('NO_APPROVED_RATE');
  });
});
