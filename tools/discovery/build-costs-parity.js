// مصفوفة تطابق الحقول — التكاليف (خطة v1.4.5 — المرحلة 8، الحزمة 8.8؛ نفس معيار 8.1–8.7). قراءة بس.
// أسماء الحقول: من اللي نافذة القديمة بتكتبه (openCostModal) + شكل البيانات الحقيقية
// (tools/security/xss-shape.json، أسماء وأنواع بس). المكان في القاعدة من أعمدة الـ migration.
// المخرج: docs/modules/COSTS_FIELD_PARITY.md   التشغيل: node tools/discovery/build-costs-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readIf = (p) => (p && fs.existsSync(path.join(ROOT, p)) ? read(p) : null);
const shape = JSON.parse(read('tools/security/xss-shape.json'));
const MIG = 'server/src/migrations/1765900000000-CostsCutover.ts';
const mig = read(MIG);
const colsOf = (name) => { const b = mig.slice(mig.indexOf(`export const ${name}`), mig.indexOf('];', mig.indexOf(`export const ${name}`))); return [...b.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json|bool)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] })); };
const cstSrc = read('renderer/modules/hr/pages-costs.js');
const keysIn = (src, start, end) => { const i = src.indexOf(start); const body = src.slice(src.indexOf('{', i), src.indexOf(end, i)); return [...body.matchAll(/[{,]\s*([a-z][A-Za-z_]*)\s*(?=[:,}])/g)].map((m) => m[1]); };
// الشاشة + الخدمة (السجلات بتتبني في السيرفر بنفس شكل النافذة القديمة)
const SCREEN = ['frontend/src/app/features/costs.page.ts', 'server/src/costs/costs.service.ts', 'server/src/costs/cost-rules.ts'];
const PAGES = { costs: SCREEN };
const SOURCES = {
  costs: { label: 'التكاليف', table: 'costs', cols: colsOf('COST_COLUMNS'), keys: [...keysIn(cstSrc, 'const rec = {', '\n    };'), 'id'] },
};
const JSON_TYPE = { text: 'string', number: 'number', json: 'object', bool: 'boolean' };
const typeOk = (real, col) => real === JSON_TYPE[col] || (col === 'json' && real === 'array');
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
const DEFERRED = { departmentId: 'مش في نافذة القديمة — محفوظ زي ما هو', projectId: 'الربط بالاسم زي القديمة (DEC-0142 د-4) — محفوظ زي ما هو' };
let md = `# مصفوفة تطابق الحقول — التكاليف (خطة v1.4.5 — المرحلة 8، الحزمة 8.8)

> **مولَّد** بـ \`node tools/discovery/build-costs-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نافذة القديمة بتكتبه (\`openCostModal\`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (\`${MIG}\`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في \`legacy_extra\` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (\`untyped\`).
`;
for (const [coll, src] of Object.entries(SOURCES)) {
  const byKey = Object.fromEntries(src.cols.map((c) => [c.key, c]));
  const real = shape[coll] || {};
  const page = PAGES[coll] ? PAGES[coll].map(readIf).filter(Boolean).join('\n') : null;
  const inNew = (k) => page && new RegExp(`\\b${k}\\b`).test(page);
  const fields = [...new Set([...src.keys, 'id', ...Object.keys(real)])].filter((k) => /^[a-z]/.test(k)).sort();
  const counts = { column: 0, extra: 0, mismatch: 0 }; let rows = '';
  for (const k of fields) {
    const r = real[k]; let where, kind;
    if (SYSTEM[k]) { where = SYSTEM[k]; kind = 'column'; }
    else if (byKey[k]) { const c = byKey[k]; const okT = !r || typeOk(r.type, c.type); where = `عمود \`${c.col}\` (${c.type})${okT ? '' : ` — ⚠️ النوع في البيانات الحقيقية ${r.type}: بيفضل في \`legacy_extra\``}`; kind = 'column'; if (!okT) counts.mismatch++; }
    else { where = '`legacy_extra` (محفوظ زي ما هو)'; kind = 'extra'; }
    counts[kind]++;
    const shown = !page ? '(الشاشة في 8.8.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
    rows += `| \`${k}\` | ${r ? r.type : '(من الكود القديم)'} | ${where} | ${shown} |\n`;
  }
  const missing = page ? fields.filter((k) => !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];
  md += `
## ${src.label} (\`${coll}\` ← جدول \`${src.table}\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 8.8.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}`;
}
md += `
## الخلاصة
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع، ومفيش تطبيع وقت النقل.
`;
const OUT = path.join(ROOT, 'docs/modules/COSTS_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== md) { console.error('COSTS_FIELD_PARITY.md is stale — run node tools/discovery/build-costs-parity.js'); process.exit(1); }
  console.log('costs parity up to date');
} else { fs.writeFileSync(OUT, md); console.log('costs parity written'); }
