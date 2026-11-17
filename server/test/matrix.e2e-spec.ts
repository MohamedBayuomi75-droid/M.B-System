import { COLLECTION_ACCESS } from '../src/data/collection-pages';
import { FIELD_GUARDS } from '../src/data/field-guards';
import { ROLE_KEYS, roleTemplates } from '../src/authz/roles';
import { adminToken, bootstrap, createTestApp, newUser, sync, TestApp } from './app';

/**
 * مصفوفة (دور × collection × فعل) متولّدة من roles.ts + collection-pages.ts ومتجرّبة على الـ API نفسه (UNIFIED-WEB-PLAN §2.4).
 * التوقّع بيتحسب هنا بشكل مستقل (من القوالب مباشرةً) مش من policy.ts.
 */
const T = roleTemplates();
const COLLS = Object.keys(COLLECTION_ACCESS).sort();
const SCOPE = ['p1'];

function expected(role: (typeof ROLE_KEYS)[number], coll: string) {
  const tpl = T[role];
  const a = COLLECTION_ACCESS[coll];
  const page = (p: string, act: 'view' | 'add' | 'edit' | 'delete') => !!tpl.pages[p]?.[act];
  const anyEditor = tpl.editData && Object.values(tpl.pages).some((p) => p.add || p.edit);
  const can = (act: 'add' | 'edit' | 'delete') => {
    if (role === 'admin') return true;
    const flag = act === 'delete' ? tpl.deleteData : tpl.editData;
    if (!flag) return false;
    if (a.write === 'anyEditor') return anyEditor;
    if (a.write === 'none') return false;
    return a.write.some((p) => page(p, act));
  };
  // نطاق المشاريع: في «projects» المعرّف نفسه هو المشروع — السجلات المزروعة (غير p1) برّه نطاق مدير المشروع
  const outOfScope = role === 'projectManager' && !!a.project?.includes('id');
  return {
    read: !outOfScope && (role === 'admin' || a.read === 'any' || a.read.some((p) => page(p, 'view'))),
    add: !outOfScope && can('add'), edit: !outOfScope && can('edit'), delete: !outOfScope && can('delete'),
  };
}

/** حركات المخزن ليها شكل إلزامي على مستوى القاعدة (B-50) — الاختبار ده عن الصلاحيات، فبيستخدم حركة استلام سليمة */
const VALID_SHAPE: Record<string, Record<string, unknown>> = { 'warehouses.movements': { type: 'in', itemId: 'mx-item', qty: 1, locationId: 'mx-loc' } };

describe('A3 permission matrix: role × collection × action (over HTTP)', () => {
  let t: TestApp;
  let admin: string;
  const tokens: Record<string, string> = {};
  const results: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    admin = await adminToken(t);
    tokens.admin = admin;
    for (const role of ROLE_KEYS.filter((r) => r !== 'admin')) {
      tokens[role] = (await newUser(t, admin, `mx_${role}`, role, role === 'projectManager' ? { projectScope: SCOPE } : {})).token;
    }
    // سجل للتعديل وسجل للحذف لكل (collection × دور) — مربوطين بـ p1 عشان نطاق مدير المشروع
    const changes = [];
    for (const c of COLLS) for (const role of ROLE_KEYS) {
      for (const suffix of ['edit', 'del']) changes.push({ collection: c, id: `${role}-${suffix}`, op: 'upsert', baseRev: 0, set: { title: 'seed', projectId: 'p1', fromProjectId: 'p1', ...VALID_SHAPE[c] } });
    }
    const r = await sync(t, admin, { changes: [...changes, { collection: 'projects', id: 'p1', op: 'upsert', baseRev: 0, set: { name: 'p1' } }] });
    expect(r.status).toBe(200);
  }, 120_000);
  afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log(`matrix: ${results.length} checks (${ROLE_KEYS.length} roles × ${COLLS.length} collections × read/add/edit/delete)`);
    await t?.close();
  });

  it.each([...ROLE_KEYS])('%s', async (role) => {
    const tok = tokens[role];
    const b = await bootstrap(t, tok);
    const mismatches: string[] = [];
    for (const c of COLLS) {
      const exp = expected(role, c);
      const [x, y] = c.split('.');
      const arr: { id: string }[] = y ? b.data[x][y] : b.data[x];
      const sees = arr.some((r) => r.id === `${role}-edit`);
      if (sees !== exp.read) mismatches.push(`${c} read: got ${sees} want ${exp.read}`);
      if (b.meta.hidden.includes(c) === exp.read && exp.read) mismatches.push(`${c} meta.hidden mismatch`);
      if (exp.read && !(role === 'projectManager' && COLLECTION_ACCESS[c].project?.includes('id')) && JSON.stringify(b.meta.writable[c]) !== JSON.stringify({ add: exp.add, edit: exp.edit, delete: exp.delete })) mismatches.push(`${c} meta.writable mismatch`);

      const guarded = (FIELD_GUARDS[c] ?? []).flatMap((g) => g.fields);
      const safeField = guarded.includes('title') ? 'note' : 'title';
      const attempts: [string, boolean, object][] = [
        ['add', exp.add, { collection: c, id: `${role}-new`, op: 'upsert', baseRev: 0, set: { [safeField]: 'x', projectId: 'p1', fromProjectId: 'p1', ...VALID_SHAPE[c] } }],
        ['edit', exp.edit, { collection: c, id: `${role}-edit`, op: 'upsert', baseRev: 1, set: { [safeField]: 'edited' } }],
        ['delete', exp.delete, { collection: c, id: `${role}-del`, op: 'delete', baseRev: 1 }],
      ];
      for (const [act, want, change] of attempts) {
        const r = await sync(t, tok, { changes: [change] });
        results.push(`${role}:${c}:${act}`);
        const ok = r.status === 200 && r.body.applied.length === 1 && r.body.applied[0].op !== 'noop';
        if (ok !== want) mismatches.push(`${c} ${act}: got ${r.status}/${JSON.stringify(r.body.applied ?? r.body.code)} want ${want ? 'allowed' : '403'}`);
        if (!want && r.status !== 403) mismatches.push(`${c} ${act}: expected 403, got ${r.status}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
