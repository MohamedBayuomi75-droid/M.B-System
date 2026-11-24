// مصفوفة تطابق الحقول — الإجازات (خطة v1.4.5 — المرحلة 8، الحزمة 8.4؛ نفس معيار 8.1–8.3). قراءة بس.
// أسماء الحقول: من السجل اللي نافذة الإجازة القديمة بتكتبه (const rec في openLeaveModal) + الفلاتر والبحث (code، kind) + شكل البيانات
// الحقيقية (tools/security/xss-shape.json، أسماء وأنواع بس). المكان في القاعدة من أعمدة الـ migration.
// المخرج: docs/modules/LEAVES_FIELD_PARITY.md   التشغيل: node tools/discovery/build-leaves-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readIf = (p) => (p && fs.existsSync(path.join(ROOT, p)) ? read(p) : null);
const shape = JSON.parse(read('tools/security/xss-shape.json'));
const MIG = 'server/src/migrations/1765500000000-LeavesCutover.ts';
const mig = read(MIG);
const block = mig.slice(mig.indexOf('export const LEAVE_COLUMNS'), mig.indexOf('];', mig.indexOf('export const LEAVE_COLUMNS')));
const cols = [...block.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json|bool)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] }));
const src = read('renderer/modules/hr/pages-leaves.js');
const at = src.indexOf('const rec = {', src.indexOf('function openLeaveModal('));
const recBody = src.slice(at, src.indexOf('};', at));
const modal = [...recBody.matchAll(/^\s+([A-Za-z_]\w*)\s*:/gm)].map((m) => m[1]).concat(['from', 'to', 'days']); // «from, to, days» مكتوبين مختصر
// الشاشة الجديدة (8.4.5): leaves.page.ts
const PAGE = 'frontend/src/app/features/leaves.page.ts';
const JSON_TYPE = { text: 'string', number: 'number', json: 'object', bool: 'boolean' };
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
const EXTRA_KEYS = ['code', 'kind'];
const DEFERRED = { employeeId: 'نسخة من الشخص للموظف (بتتكتب معاه)', code: 'بيتدوّر فيه بس — مفيش خانة', kind: 'اسم قديم لـ personKind — للقراية بس' };
const byKey = Object.fromEntries(cols.map((c) => [c.key, c]));
const real = shape.leaves || {};
const page = readIf(PAGE);
// «code» في الشاشة = كود الشخص مش الإجازة: كود الإجازة بيتدوّر فيه في السيرفر بس
const inNew = (k) => page && k !== 'code' && new RegExp(`\\b${k}\\b`).test(page);
const fields = [...new Set([...modal, ...EXTRA_KEYS, 'id', ...Object.keys(real)])].filter((k) => /^[a-z]/.test(k)).sort();
const counts = { column: 0, extra: 0, mismatch: 0 };
let rows = '';
for (const k of fields) {
  const r = real[k]; let where, kind;
  if (SYSTEM[k]) { where = SYSTEM[k]; kind = 'column'; }
  else if (byKey[k]) {
    const c = byKey[k]; const ok = !r || r.type === JSON_TYPE[c.type];
    where = `عمود \`${c.col}\` (${c.type})${ok ? '' : ` — ⚠️ النوع في البيانات الحقيقية ${r.type}: بيفضل في \`legacy_extra\``}`;
    kind = 'column'; if (!ok) counts.mismatch++;
  } else { where = '`legacy_extra` (محفوظ زي ما هو)'; kind = 'extra'; }
  counts[kind]++;
  const shown = !page ? '(الشاشة في 8.4.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
  rows += `| \`${k}\` | ${r ? r.type : '(من الكود القديم)'} | ${where} | ${shown} |\n`;
}
const missing = page ? fields.filter((k) => !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];
const md = `# مصفوفة تطابق الحقول — الإجازات (خطة v1.4.5 — المرحلة 8، الحزمة 8.4)

> **مولَّد** بـ \`node tools/discovery/build-leaves-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة الإجازة القديمة بتكتبه (\`openLeaveModal\`)، والحقول اللي البحث والقراية بيستخدموها (\`code\`، \`kind\`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجدول (\`${MIG}\`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في \`legacy_extra\` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (\`untyped\`).

## الإجازات (\`leaves\` ← جدول \`leaves\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 8.4.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}
## الخلاصة
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في \`legacy_extra\`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
`;
const OUT = path.join(ROOT, 'docs/modules/LEAVES_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== md) { console.error('LEAVES_FIELD_PARITY.md is stale — run node tools/discovery/build-leaves-parity.js'); process.exit(1); }
  console.log('leaves parity up to date');
} else { fs.writeFileSync(OUT, md); console.log('leaves parity written'); }
