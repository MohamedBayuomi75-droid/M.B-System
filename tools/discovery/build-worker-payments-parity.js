// مصفوفة تطابق الحقول — الصرف والخصومات وخصومات الموظفين (خطة v1.4.5 — المرحلة 8، الحزمة 8.6؛ نفس معيار 8.1–8.5). قراءة بس.
// أسماء الحقول: من اللي نافذة الصرف القديمة بتكتبه (openUnifiedPayModal) + علامات السلفة (DEC-0132) + شكل البيانات الحقيقية
// (tools/security/xss-shape.json — 0 سجل حقيقي في الاتنين). المكان في القاعدة من أعمدة الـ migration.
// المخرج: docs/modules/WORKER_PAYMENTS_FIELD_PARITY.md   التشغيل: node tools/discovery/build-worker-payments-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readIf = (p) => (p && fs.existsSync(path.join(ROOT, p)) ? read(p) : null);
const shape = JSON.parse(read('tools/security/xss-shape.json'));
const MIG = 'server/src/migrations/1765700000000-WorkerPaymentsCutover.ts';
const mig = read(MIG);
const colsOf = (name) => { const b = mig.slice(mig.indexOf(`export const ${name}`), mig.indexOf('];', mig.indexOf(`export const ${name}`))); return [...b.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json|bool)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] })); };
const dues = read('renderer/modules/hr/pages-worker-dues.js');
const save = dues.slice(dues.indexOf("getElementById('btnSaveUp')"), dues.indexOf('function openPayItemsManageModal'));
const pushKeys = (needle) => [...save.matchAll(new RegExp(`${needle}\\.push\\(\\{([\\s\\S]*?)\\}\\);`, 'g'))].flatMap((m) => [...(',' + m[1]).matchAll(/[{,]\s*([a-z][A-Za-z_]*)\s*(?=[:,}])/g)].map((x) => x[1]));
const keysIn = (src, start, end) => { const a = src.indexOf(start); const body = src.slice(a, src.indexOf(end, a)); return [...body.matchAll(/[{,]\s*([A-Za-z_]\w*)\s*(?=[:,}])/g)].map((m) => m[1]).filter((k) => /^[a-z]/.test(k)); }; // المفتاح بعد { أو , بس (مش القيمة)
// الشاشة الجديدة (8.6.5)
const PAGES = { workerPayments: null, employeePenalties: null };
const SOURCES = {
  workerPayments: { label: 'الصرف والخصومات', table: 'worker_payments', cols: colsOf('WORKER_PAYMENT_COLUMNS'),
    keys: [...pushKeys('DATA\\.workerPayments'), 'status', 'paidDate', 'project', 'isAdvance', 'advanceApprovedBy', 'advanceApprovedAt'] },
  employeePenalties: { label: 'خصومات الموظفين', table: 'employee_penalties', cols: colsOf('EMPLOYEE_PENALTY_COLUMNS'), keys: pushKeys('DATA\\.employeePenalties') },
};
const JSON_TYPE = { text: 'string', number: 'number', json: 'object', bool: 'boolean' };
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
const DEFERRED = { workerId: 'نسخة من personId للعامل', advanceApprovedBy: 'في التدقيق', advanceApprovedAt: 'في التدقيق' };
let md = `# مصفوفة تطابق الحقول — الصرف والخصومات وخصومات الموظفين (خطة v1.4.5 — المرحلة 8، الحزمة 8.6)

> **مولَّد** بـ \`node tools/discovery/build-worker-payments-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نافذة الصرف القديمة بتكتبه (\`openUnifiedPayModal\`)، وعلامات السلفة (DEC-0132)، وشكل البيانات الحقيقية (**0 سجل** في الاتنين)، وأعمدة الجداول (\`${MIG}\`).
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
    const shown = !page ? '(الشاشة في 8.6.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
    rows += `| \`${k}\` | ${r ? r.type : '(من الكود القديم)'} | ${where} | ${shown} |\n`;
  }
  const missing = page ? fields.filter((k) => !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];
  md += `
## ${src.label} (\`${coll}\` ← جدول \`${src.table}\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 8.6.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}`;
}
md += `
## الخلاصة
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع، ومفيش تطبيع وقت النقل.
`;
const OUT = path.join(ROOT, 'docs/modules/WORKER_PAYMENTS_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== md) { console.error('WORKER_PAYMENTS_FIELD_PARITY.md is stale — run node tools/discovery/build-worker-payments-parity.js'); process.exit(1); }
  console.log('worker payments parity up to date');
} else { fs.writeFileSync(OUT, md); console.log('worker payments parity written'); }
