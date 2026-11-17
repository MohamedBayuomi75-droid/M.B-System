import { ALL_MODULE_PAGES, DOC_ACTIONS, effectiveDocActions, PAGES_WITHOUT_MODULE, visibleModules } from './doc-actions';
import { PAGES, roleTemplates, ROLE_KEYS } from './roles';

describe('4-level permissions: modules + document actions', () => {
  it('every page belongs to exactly one module', () => {
    expect(PAGES_WITHOUT_MODULE).toEqual([]);
    expect(new Set(ALL_MODULE_PAGES).size).toBe(ALL_MODULE_PAGES.length);
    expect(ALL_MODULE_PAGES.every((p) => (PAGES as readonly string[]).includes(p))).toBe(true);
  });
  it('document actions: denied for every role by default (no invented defaults); admin has all', () => {
    for (const r of ROLE_KEYS) {
      const a = effectiveDocActions(r);
      expect(Object.values(a).every((v) => v === (r === 'admin'))).toBe(true);
      expect(Object.keys(a)).toEqual([...DOC_ACTIONS]);
    }
  });
  it('per-user grants (scope *) apply; unknown actions and other scopes ignored; admin cannot be restricted', () => {
    const a = effectiveDocActions('ledgerAccountant', [{ action: 'print', scope: '*', allowed: true }, { action: 'pay', scope: 'ledger.payments', allowed: true }, { action: 'hack', scope: '*', allowed: true }]);
    expect(a).toEqual({ approve: false, reject: false, print: true, export: false, pay: false, cancel: false, post: false });
    expect(effectiveDocActions('admin', [{ action: 'print', scope: '*', allowed: false }]).print).toBe(true);
  });
  it('modules are derived from visible pages', () => {
    const T = roleTemplates();
    expect(visibleModules(T.admin)).toEqual(expect.arrayContaining(['labor', 'suppliers', 'system']));
    const wh = visibleModules(T.warehouse);
    expect(wh).toContain('warehouses');
    expect(wh).not.toContain('system');
  });
});
