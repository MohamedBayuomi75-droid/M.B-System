import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { effectivePermissions, hasPagePermission } from './effective-permissions';
import { PAGES, ROLE_KEYS, roleTemplates } from './roles';

/** تحميل permissions.js الأصلي من الواجهة في sandbox ومقارنته بـ roles.ts */
function loadDesktop() {
  const src = fs.readFileSync(path.resolve(__dirname, '../../../renderer/core/permissions.js'), 'utf8');
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(src + ';this.HR_PAGES = HR_PAGES; this.T = roleTemplates();', ctx);
  return ctx as { HR_PAGES: string[]; T: Record<string, { editData: boolean; deleteData: boolean; manageUsers: boolean; manageNetwork: boolean; pages: Record<string, unknown> }> };
}

describe('roles.ts parity with renderer/core/permissions.js', () => {
  const desktop = loadDesktop();
  const T = roleTemplates();

  it('same pages in the same order', () => {
    expect([...PAGES]).toEqual([...desktop.HR_PAGES]);
  });

  it.each(Object.keys(loadDesktop().T))('role %s is identical (except manageNetwork, dropped on web)', (role) => {
    const d = desktop.T[role];
    const s = T[role as keyof typeof T];
    expect(s).toBeDefined();
    expect({ editData: s.editData, deleteData: s.deleteData, manageUsers: s.manageUsers }).toEqual({ editData: d.editData, deleteData: d.deleteData, manageUsers: d.manageUsers });
    expect(JSON.parse(JSON.stringify(s.pages))).toEqual(JSON.parse(JSON.stringify(d.pages)));
  });

  it('every role covers every page with all 4 actions', () => {
    for (const r of ROLE_KEYS) for (const p of PAGES) expect(Object.keys(T[r].pages[p]).sort()).toEqual(['add', 'delete', 'edit', 'view']);
  });

  it('new web roles: warehouse / ledgerAccountant cannot delete or manage users', () => {
    expect(T.warehouse.pages['warehouses.home']).toEqual({ view: true, add: true, edit: true, delete: false });
    expect(T.warehouse.pages['payroll'].view).toBe(false);
    expect(T.ledgerAccountant.pages['ledger.invoices']).toEqual({ view: true, add: true, edit: true, delete: false });
    expect(T.ledgerAccountant.pages['employees'].view).toBe(false);
    for (const r of ['warehouse', 'ledgerAccountant'] as const) expect(T[r].manageUsers || T[r].deleteData).toBe(false);
  });

  it('projectManager: works on project ops, never payroll/employees/ledger/users, never deletes', () => {
    const pm = T.projectManager;
    expect(pm.pages.workerAttendance).toEqual({ view: true, add: true, edit: true, delete: false });
    expect(pm.pages.projects).toEqual({ view: true, add: false, edit: true, delete: false });
    for (const k of ['payroll', 'employees', 'attendance', 'reports', 'workerDues', 'users', 'backup', 'leaves', 'performance']) expect(pm.pages[k].view).toBe(false);
    for (const k of PAGES.filter((x) => x.startsWith('ledger.'))) expect(pm.pages[k].view).toBe(false);
    expect(Object.values(pm.pages).some((x) => x.delete)).toBe(false);
    expect(pm.manageUsers || pm.deleteData).toBe(false);
  });

  it('templates are fresh copies', () => {
    roleTemplates().admin.pages.dashboard.view = false;
    expect(roleTemplates().admin.pages.dashboard.view).toBe(true);
  });
});

describe('effectivePermissions', () => {
  const base = { canEditData: false, canDeleteData: false, canManageUsers: false };

  it('admin always gets everything regardless of flags/overrides', () => {
    const p = effectivePermissions({ role: 'admin', ...base }, [{ page: 'users', canView: false, canAdd: false, canEdit: false, canDelete: false }]);
    expect(p.manageUsers).toBe(true);
    expect(hasPagePermission(p, 'users', 'delete')).toBe(true);
  });

  it('per-user override beats the role template', () => {
    const p = effectivePermissions({ role: 'viewer', ...base }, [{ page: 'payroll', canView: true, canAdd: true, canEdit: false, canDelete: false }]);
    expect(hasPagePermission(p, 'payroll', 'add')).toBe(true);
    expect(hasPagePermission(p, 'employees', 'add')).toBe(false);
    expect(hasPagePermission(p, 'employees', 'view')).toBe(true);
  });

  it('unknown role → viewer; unknown page → denied (deny by default, D-013)', () => {
    const p = effectivePermissions({ role: 'hacker', ...base });
    expect(hasPagePermission(p, 'employees', 'view')).toBe(true);
    expect(hasPagePermission(p, 'employees', 'edit')).toBe(false);
    expect(hasPagePermission(p, 'not-a-page', 'view')).toBe(false);
  });

  it('custom role sees nothing without overrides', () => {
    const p = effectivePermissions({ role: 'custom', ...base });
    expect(PAGES.some((pg) => hasPagePermission(p, pg, 'view'))).toBe(false);
  });

  it('global flags come from the user columns', () => {
    expect(effectivePermissions({ role: 'hr', canEditData: true, canDeleteData: false, canManageUsers: false }).deleteData).toBe(false);
  });
});
