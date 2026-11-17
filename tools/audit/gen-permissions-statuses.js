// المرحلة 3 (3.4–3.5): يولّد docs/PAGE_PERMISSIONS_AND_STATUSES.md من الكود نفسه (مش يدوي):
//   - مصفوفة الصلاحيات لكل صفحة × دور (server/src/authz/roles.ts — المرجع على السيرفر)
//   - المجموعات والصفحات اللي بتتحكم في قراءتها وكتابتها (server/src/data/collection-pages.ts)
//   - قوائم الحالات في الواجهة القديمة (renderer/core/state.js + الموديولات)
// التشغيل: npm --prefix server run build && node tools/audit/gen-permissions-statuses.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const roles = require(path.join(ROOT, 'server/dist/authz/roles.js'));
const cp = require(path.join(ROOT, 'server/dist/data/collection-pages.js'));
const inv = require(path.join(ROOT, 'docs/audit/feature-inventory.json'));

const label = Object.fromEntries(inv.pages.map((p) => [p.key, p.label]));
const T = roles.roleTemplates();
const roleKeys = roles.ROLE_KEYS.filter((r) => r !== 'custom');
const cell = (p) => (!p || !p.view ? '—' : ['view', 'add', 'edit', 'delete'].filter((a) => p[a]).map((a) => ({ view: 'ع', add: 'إ', edit: 'ت', delete: 'ح' })[a]).join(''));

let md = `# الصلاحيات لكل صفحة وحالات المستندات (مولَّد من الكود)

> **مولَّد آليًا** بـ \`tools/audit/gen-permissions-statuses.js\` — ماتعدّلش يدويًا. المرحلة 3 (البندين 3.4 و3.5) · ${new Date().toISOString().slice(0, 10)}
> المرجع للصلاحيات = **السيرفر** (\`server/src/authz/roles.ts\`)؛ الواجهة بتعرض بس. الرموز: **ع** عرض · **إ** إضافة · **ت** تعديل · **ح** حذف · — مفيش.
> بالإضافة للصفحة: الإضافة/التعديل محتاجين العلم العام «تعديل البيانات»، والحذف محتاج «حذف البيانات». مدير المشروع مقيّد بنطاق مشروعاته (${roles.ROLES_REQUIRING_PROJECT_SCOPE.join('، ')}).

## 1. القوالب الافتراضية للأدوار × الصفحات

| الصفحة | ${roleKeys.map((r) => roles.ROLE_LABELS[r]).join(' | ')} |
|---|${roleKeys.map(() => '---').join('|')}|
`;
for (const p of roles.PAGES) md += `| ${label[p] ? label[p].replace(/\|/g, '/') + ' ' : ''}\`${p}\` | ${roleKeys.map((r) => cell(T[r].pages[p])).join(' | ')} |\n`;
md += `\n**الأعلام العامة:**\n\n| الدور | تعديل البيانات | حذف البيانات | إدارة المستخدمين |\n|---|---|---|---|\n`;
for (const r of roleKeys) md += `| ${roles.ROLE_LABELS[r]} | ${T[r].editData ? '✓' : '—'} | ${T[r].deleteData ? '✓' : '—'} | ${T[r].manageUsers ? '✓' : '—'} |\n`;

md += `\n## 2. المجموعات (البيانات) ← الصفحات اللي بتتحكم فيها\n\nالقراءة مسموحة لو المستخدم شايف أي صفحة من «القراءة»، والكتابة لو عنده الفعل على أي صفحة من «الكتابة».\n\n| المجموعة | القراءة من صفحات | الكتابة من صفحات | نطاق المشروع |\n|---|---|---|---|\n`;
for (const [k, a] of Object.entries(cp.COLLECTION_ACCESS).sort()) {
  const f = (x) => (x === 'any' ? 'أي مستخدم' : x === 'anyEditor' ? 'أي محرّر' : x === 'none' ? 'ممنوع (السيرفر بس)' : (x || []).map((p) => `\`${p}\``).join(' '));
  md += `| \`${k}\` | ${f(a.read)} | ${f(a.write)} | ${a.project ? 'نعم' : '—'} |\n`;
}

// الحالات: نقرا الثوابت من الواجهة القديمة من غير تشغيلها كلها
const src = (f) => fs.readFileSync(path.join(ROOT, 'renderer', f), 'utf8');
const pick = (code, names) => { const ctx = {}; vm.createContext(ctx); const out = {}; for (const n of names) { const m = code.match(new RegExp(`const ${n}\\s*=\\s*(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\});`)); if (m) out[n] = vm.runInContext('(' + m[1] + ')', ctx); } return out; };
const st = pick(src('core/state.js'), ['EMPLOYEE_STATUS', 'WORKER_TYPES', 'EQUIPMENT_STATUS', 'LEAVE_TYPES', 'LEAVE_STATUS', 'ATTENDANCE_STATUS']);
const cl = { ...pick(src('modules/clients/guarantees.js'), ['CL_GUARANTEE_STATUS']), ...pick(src('modules/clients/change-orders.js'), ['CL_VO_STATUS']), ...pick(src('modules/clients/pages-crm.js'), ['CRM_STAGES']), ...pick(src('modules/clients/project-workflow.js'), ['PW_STATUS']), ...pick(src('modules/hr/pages-projects.js'), ['PROJECT_STAGES']) };
const lst = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x.label ? `${x.label} (\`${x.code}\`)` : x.value)).join(' · ') : Object.entries(v).map(([k, x]) => `${x.label} (\`${k}\`)`).join(' · '));
md += `\n## 3. الحالات في النظام القديم\n\n| القائمة | القيم | المصدر |\n|---|---|---|\n`;
const rows = [
  ['حالة الموظف/العامل', st.EMPLOYEE_STATUS, 'core/state.js'], ['نوع العامل', st.WORKER_TYPES, 'core/state.js'], ['حالة المعدة', st.EQUIPMENT_STATUS, 'core/state.js'],
  ['نوع الإجازة', st.LEAVE_TYPES, 'core/state.js'], ['حالة الإجازة', st.LEAVE_STATUS, 'core/state.js'], ['حالة الحضور', st.ATTENDANCE_STATUS, 'core/state.js'],
  ['مراحل المشروع', cl.PROJECT_STAGES, 'modules/hr/pages-projects.js'], ['خطوات مسار المشروع', cl.PW_STATUS, 'modules/clients/project-workflow.js'],
  ['حالة خطاب الضمان', cl.CL_GUARANTEE_STATUS, 'modules/clients/guarantees.js'], ['حالة أمر التغيير', cl.CL_VO_STATUS, 'modules/clients/change-orders.js'], ['مراحل الفرص (CRM)', cl.CRM_STAGES, 'modules/clients/pages-crm.js'],
];
for (const [n, v, f] of rows) if (v) md += `| ${n} | ${lst(v)} | \`renderer/${f}\` |\n`;
md += `| حالة المستخلص | مسودة · معتمد · مُسلَّم · مدفوع جزئياً · مدفوع · مرفوض (اختيار يدوي — مش مشتقة من المدفوع) | \`renderer/modules/clients/pages-invoices.js:226\` |
| فاتورة/مرتجع المورد | علامات مش حالة: \`isReturn\` (مرتجع) · \`cancelled\` (ملغاة — **تلقائي** لما المرتجعات المرتبطة تغطي الصافي) · \`postReturnWht\` (مرتجع جزئي على فاتورة فيها خصم) | \`renderer/modules/ledger/helpers.js:1927\` |
| دفعة المورد | \`direction\`: \`pay\` (سداد — دائن) أو \`collect\` (قيد مدين)، و165 من 244 دفعة حقيقية **مالهاش اتجاه** (بتتعامل كـ pay) | \`renderer/modules/ledger/statement.js:19\` |
| سجل دفع العمالة | \`type\`: \`pay\` · \`penalty\`/\`deduction\` (خصم) · \`bonus\`/\`allowance\` (مستحق إضافي) · \`status: accrued\` (مستحق مش مدفوع) | \`renderer/core/helpers.js:4103\` |
| حركة المخزن | \`in\` · \`out\` · \`adjust_in\` · \`adjust_out\` · \`transfer\` | \`renderer/modules/warehouses/helpers.js:27\` |

**ملاحظات على دورات العمل الحالية (للمرحلة 5 — محرك الاعتمادات):**
- **مفيش اعتماد فعلي** لأي مستند مالي: فواتير الموردين والدفعات والمستخلصات بتتسجّل وتتعدّل وتتحذف مباشرة. حالة المستخلص «معتمد» مجرد اختيار في قائمة (R-05، ADR-003).
- الاعتماد الموجود فعلًا: الإجازات (قيد الانتظار ← موافق/مرفوض)، وأوامر التغيير (المعتمد بس بيدخل قيمة العقد).
- الإلغاء: الفواتير الملغاة بتفضل محفوظة (مش بتتمسح)، لكن «الحذف» العادي في الصفحات حذف ناعم في السلة (\`archiveTrash\`) — قرار ADR-024 (إلغاء بدل حذف) بيتطبق مع نقل كل موديول.
`;
fs.writeFileSync(path.join(ROOT, 'docs/PAGE_PERMISSIONS_AND_STATUSES.md'), md);
console.log('wrote docs/PAGE_PERMISSIONS_AND_STATUSES.md', roles.PAGES.length, 'pages ×', roleKeys.length, 'roles,', Object.keys(cp.COLLECTION_ACCESS).length, 'collections');
