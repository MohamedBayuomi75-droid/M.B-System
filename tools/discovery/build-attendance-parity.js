// مصفوفة تطابق الحقول — اليوميات وحضور الموظفين (خطة v1.4.5 — المرحلة 8، الحزمة 8.5؛ نفس معيار 8.1–8.4). قراءة بس.
// أسماء الحقول: من اللي نوافذ القديمة بتكتبه (openWorkerAttModal / openAttendanceModal) + normalizeAttendanceRecord + قرار المراجعة (DEC-0133)
// + شكل البيانات الحقيقية (tools/security/xss-shape.json، أسماء وأنواع بس). المكان في القاعدة من أعمدة الـ migration.
// المخرج: docs/modules/ATTENDANCE_FIELD_PARITY.md   التشغيل: node tools/discovery/build-attendance-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readIf = (p) => (p && fs.existsSync(path.join(ROOT, p)) ? read(p) : null);
const shape = JSON.parse(read('tools/security/xss-shape.json'));
const MIG = 'server/src/migrations/1765600000000-AttendanceCutover.ts';
const mig = read(MIG);
const colsOf = (name) => { const b = mig.slice(mig.indexOf(`export const ${name}`), mig.indexOf('];', mig.indexOf(`export const ${name}`))); return [...b.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json|bool)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] })); };
const watt = read('renderer/modules/hr/pages-worker-attendance.js');
const att = read('renderer/modules/hr/pages-attendance.js');
const keysIn = (src, start, end) => { const a = src.indexOf(start); const body = src.slice(a, src.indexOf(end, a)); return [...body.matchAll(/[{,]\s*([A-Za-z_]\w*)\s*(?=[:,}])/g)].map((m) => m[1]).filter((k) => /^[a-z]/.test(k)); }; // المفتاح بعد { أو , بس (مش القيمة)
// الشاشات الجديدة (8.5.5)
const PAGES = { workerAttendance: 'frontend/src/app/features/worker-attendance.page.ts', attendance: 'frontend/src/app/features/attendance.page.ts' };
const SOURCES = {
  workerAttendance: { label: 'اليوميات', table: 'worker_attendance', cols: colsOf('WORKER_ATTENDANCE_COLUMNS'),
    keys: [...keysIn(watt, 'let payload = {', '};'), 'workerId', 'supervisorId', 'driverId', 'personKind', 'dayWageSource', 'reviewDecision', 'reviewReason', 'reviewedBy', 'reviewedAt'] },
  attendance: { label: 'حضور الموظفين', table: 'attendance', cols: colsOf('ATTENDANCE_COLUMNS'), keys: keysIn(att, 'const payload = {', '};') },
};
const JSON_TYPE = { text: 'string', number: 'number', json: 'object', bool: 'boolean' };
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
const DEFERRED = { dayWageSource: 'علامة تثبيت الأجر وقت النقل (DEC-0130) — في تقرير الفرق', reviewedBy: 'في التدقيق', reviewedAt: 'في التدقيق', personKind: 'نسخة من personType', driverId: 'نسخة من personId للسواق', supervisorId: 'المشرف وقت الحفظ (للعامل) — بيتحسب في السيرفر', workerId: 'نسخة من personId للعامل', projectId: 'السيرفر بيحطه من اسم المشروع وقت الحفظ (DAILIES_ACCEPTANCE §4.2)' };
let md = `# مصفوفة تطابق الحقول — اليوميات وحضور الموظفين (خطة v1.4.5 — المرحلة 8، الحزمة 8.5)

> **مولَّد** بـ \`node tools/discovery/build-attendance-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نوافذ القديمة بتكتبه (\`openWorkerAttModal\`، و\`openAttendanceModal\`)، و\`normalizeAttendanceRecord\`، وقرار المراجعة (DEC-0133)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (\`${MIG}\`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في \`legacy_extra\` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (\`untyped\`).
`;
for (const [coll, src] of Object.entries(SOURCES)) {
  const byKey = Object.fromEntries(src.cols.map((c) => [c.key, c]));
  const real = shape[coll] || {};
  const page = readIf(PAGES[coll]);
  const inNew = (k) => page && new RegExp(`\\b${k}\\b`).test(page);
  const fields = [...new Set([...src.keys, 'id', ...Object.keys(real)])].filter((k) => /^[a-z]/.test(k)).sort();
  const counts = { column: 0, extra: 0, mismatch: 0 }; let rows = '';
  for (const k of fields) {
    const r = real[k]; let where, kind;
    if (SYSTEM[k]) { where = SYSTEM[k]; kind = 'column'; }
    else if (byKey[k]) { const c = byKey[k]; const okT = !r || r.type === JSON_TYPE[c.type]; where = `عمود \`${c.col}\` (${c.type})${okT ? '' : ` — ⚠️ النوع في البيانات الحقيقية ${r.type}: بيفضل في \`legacy_extra\``}`; kind = 'column'; if (!okT) counts.mismatch++; }
    else { where = '`legacy_extra` (محفوظ زي ما هو)'; kind = 'extra'; }
    counts[kind]++;
    const shown = !page ? '(الشاشة في 8.5.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
    rows += `| \`${k}\` | ${r ? r.type : '(من الكود القديم)'} | ${where} | ${shown} |\n`;
  }
  const missing = page ? fields.filter((k) => !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];
  md += `
## ${src.label} (\`${coll}\` ← جدول \`${src.table}\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 8.5.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}`;
}
md += `
## الخلاصة
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع. **الاستثناء الوحيد المقصود:** تثبيت الأجر في اليوميات اللي مالهاش أجر (DEC-0130) — بيتعدّ في تقرير النقل (\`normalizedOnWrite\`).
`;
const OUT = path.join(ROOT, 'docs/modules/ATTENDANCE_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== md) { console.error('ATTENDANCE_FIELD_PARITY.md is stale — run node tools/discovery/build-attendance-parity.js'); process.exit(1); }
  console.log('attendance parity up to date');
} else { fs.writeFileSync(OUT, md); console.log('attendance parity written'); }
