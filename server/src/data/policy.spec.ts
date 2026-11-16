import * as path from 'node:path';
import { effectivePermissions } from '../authz/effective-permissions';
import { isPageKey } from '../authz/roles';
import { accessFor, COLLECTION_ACCESS, DOC_ACCESS } from './collection-pages';
import { COLLECTIONS_MAP } from './collections-map.generated';
import { FIELD_GUARDS } from './field-guards';
import { isFinancialField } from './financial-fields';
import { canRead, canWrite, hiddenFields, inProjectScope, projectIdsOf, stripHidden } from './policy';

const user = (role: string, extra: Partial<{ scope: string[] | null; overrides: { page: string; canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }[]; edit: boolean; del: boolean }> = {}) => {
  const perms = effectivePermissions({ role, canEditData: extra.edit ?? true, canDeleteData: extra.del ?? true, canManageUsers: false }, extra.overrides ?? []);
  return { role, permissions: perms, projectScope: extra.scope ?? null };
};

describe('collections catalog', () => {
  it('generated catalog matches docs/web/collections-map.json', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const json = require(path.resolve(__dirname, '../../../docs/web/collections-map.json'));
    expect(Object.fromEntries(Object.entries(json.entries).map(([k, v]) => [k, (v as { kind: string }).kind]))).toEqual({ ...COLLECTIONS_MAP });
  });

  it('every collection has an access rule, and only known collections do', () => {
    const collections = Object.entries(COLLECTIONS_MAP).filter(([, k]) => k === 'collection').map(([p]) => p).sort();
    expect(Object.keys(COLLECTION_ACCESS).sort()).toEqual(collections);
  });

  it('every page referenced in collection-pages / field-guards is a real page key', () => {
    const pages = new Set<string>();
    for (const a of Object.values(COLLECTION_ACCESS)) {
      if (a.read !== 'any') a.read.forEach((p) => pages.add(p));
      if (Array.isArray(a.write)) a.write.forEach((p) => pages.add(p));
    }
    for (const gs of Object.values(FIELD_GUARDS)) for (const g of gs) g.pages.forEach((p) => pages.add(p));
    expect([...pages].filter((p) => !isPageKey(p))).toEqual([]);
  });

  it('docs / lookups / meta-flags use the shared doc rule; system tables & legacy refs have none', () => {
    for (const [p, k] of Object.entries(COLLECTIONS_MAP)) {
      if (k === 'doc' || k === 'lookup' || k === 'meta-flag') expect(accessFor(p)).toBe(DOC_ACCESS);
      if (k === 'system-table' || k === 'legacy-ref') expect(accessFor(p)).toBeNull();
    }
    expect(accessFor('not-a-key')).toBeNull();
  });
});

describe('read / write rules', () => {
  it('viewer reads everything with a page, writes nothing', () => {
    const v = user('viewer', { edit: false, del: false });
    expect(canRead(v, 'employees')).toBe(true);
    expect(canRead(v, 'ledger.invoices')).toBe(true);
    for (const a of ['add', 'edit', 'delete'] as const) expect(canWrite(v, 'employees', a)).toBe(false);
    expect(canWrite(v, 'settings', 'edit')).toBe(false);
  });

  it('page action AND global flag are both required', () => {
    const noDeleteFlag = user('hr', { del: false });
    expect(canWrite(noDeleteFlag, 'employees', 'edit')).toBe(true);
    expect(canWrite(noDeleteFlag, 'employees', 'delete')).toBe(false);
    const noEditFlag = user('hr', { edit: false });
    expect(canWrite(noEditFlag, 'employees', 'add')).toBe(false);
  });

  it('payroll role: reads people, edits payroll only, never ledger', () => {
    const p = user('payroll', { del: false });
    expect(canRead(p, 'employees')).toBe(true);
    expect(canWrite(p, 'payroll', 'edit')).toBe(true);
    expect(canWrite(p, 'employees', 'edit')).toBe(false);
    expect(canRead(p, 'ledger.invoices')).toBe(false);
  });

  it('ledgerAccountant: ledger only (+ project list); clientsSales: clients only', () => {
    const l = user('ledgerAccountant', { del: false });
    expect(canWrite(l, 'ledger.invoices', 'add')).toBe(true);
    expect(canWrite(l, 'ledger.invoices', 'delete')).toBe(false);
    expect(canRead(l, 'employees')).toBe(false);
    expect(canRead(l, 'projects')).toBe(true);
    for (const c of ['workers', 'workerAttendance', 'costs', 'expenses', 'equipment']) expect(canRead(l, c)).toBe(false); // view المشاريع مايفتحش بيانات التشغيل
    const s = user('clientsSales', { del: false });
    expect(canWrite(s, 'clients.contracts', 'add')).toBe(true);
    expect(canWrite(s, 'clients.invoices', 'add')).toBe(false);
    expect(canRead(s, 'payroll')).toBe(false);
  });
});

describe('field guards', () => {
  it('salary hidden without payroll view; wages hidden without payroll/workerDues', () => {
    const custom = user('custom', { overrides: [{ page: 'employees', canView: true, canAdd: true, canEdit: true, canDelete: false }, { page: 'workers', canView: true, canAdd: false, canEdit: false, canDelete: false }] });
    expect(hiddenFields(custom, 'employees')).toContain('salary');
    expect(hiddenFields(custom, 'workers')).toContain('dailyWage');
    expect(hiddenFields(user('hr'), 'employees')).toEqual([]);
    expect(hiddenFields(user('projectManager', { scope: ['p1'] }), 'workerAttendance')).toEqual(['dayWage', 'deduction']);
    expect(stripHidden({ id: 'e1', name: 'x', salary: 9000 }, ['salary'])).toEqual({ id: 'e1', name: 'x' });
  });
});

describe('project scope', () => {
  const pm = user('projectManager', { scope: ['p1'] });
  it('project-bound collections: only rows of the user projects (rows without a project are hidden)', () => {
    expect(inProjectScope(pm, 'workerAttendance', { projectId: 'p1' })).toBe(true);
    expect(inProjectScope(pm, 'workerAttendance', { projectId: 'p2' })).toBe(false);
    expect(inProjectScope(pm, 'workerAttendance', { project: 'اسم بس' })).toBe(false);
    expect(inProjectScope(pm, 'projects', { id: 'p1' })).toBe(true);
    expect(inProjectScope(pm, 'projects', { id: 'p2' })).toBe(false);
  });
  it('transfers match on either side; non project-bound collections are unaffected; no scope = everything', () => {
    expect(projectIdsOf('resourceTransfers', { fromProjectId: 'p2', toProjectId: 'p1' })).toEqual(['p2', 'p1']);
    expect(inProjectScope(pm, 'resourceTransfers', { fromProjectId: 'p2', toProjectId: 'p1' })).toBe(true);
    expect(inProjectScope(pm, 'departments', { id: 'd1' })).toBe(true);
    expect(inProjectScope(user('hr'), 'workerAttendance', { projectId: 'p9' })).toBe(true);
  });
});

describe('financial fields', () => {
  it.each([
    ['ledger.invoices', 'totalInvoice', true], ['ledger.invoices', 'vat', true], ['ledger.invoices', 'supplierId', true], ['ledger.invoices', 'notes', false],
    ['ledger.payments', 'amount', true], ['employees', 'salary', true], ['employees', 'phone', false], ['payroll', 'anything', true],
    ['settings', 'nextPaymentNo', true], ['settings', 'companyName', false], ['workerAttendance', 'status', true], ['costs', 'lines', true],
  ])('%s.%s → %s', (p, f, want) => expect(isFinancialField(p, f)).toBe(want));
});
