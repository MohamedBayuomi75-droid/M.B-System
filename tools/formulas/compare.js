// مقارنة المعادلات: النظام القديم (دواله الحقيقية في المتصفح) ↔ الحساب المرجعي المستقل — المرحلة 3.
//
//   node tools/formulas/compare.js                         ← بيانات الاختبار المصمّمة (tools/formulas/fixture.js)
//   DATA_JSON=<نسخة خارج المستودع> node tools/formulas/compare.js   ← البيانات الحقيقية (التقرير أعداد ومجاميع؛ مفيش أسماء)
//   COMPARE_WEB=1 ...   ← كمان: نفس الدوال في وضع الويب (بعد المرور بالسيرفر والقاعدة) ↔ وضع الملف
//   FORMULA_REPORT=path.json   ← حفظ التقرير التفصيلي (للبيانات الحقيقية: احفظه خارج المستودع)
//
// التصنيف لكل قيمة: exact (متطابق) · floatNoise (فرق < 0.000001 — كسور JS، مش ظاهر) · diff (فرق حقيقي)
'use strict';
const fs = require('fs');
const path = require('path');
const { runLegacy } = require('./legacy-runner');
const { computeAll } = require('./reference');

const RANGES = [{ label: 'all' }, { label: '2026H1', from: '2026-01-01', to: '2026-06-30' }];

function diffMaps(a, b) {
  const rep = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of [...keys].sort()) {
    const A = a[k] || {}, B = b[k] || {};
    const r = { n: 0, exact: 0, floatNoise: 0, diff: 0, missing: 0, maxAbsDiff: 0, samples: [] };
    for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) {
      r.n++;
      if (!(id in A) || !(id in B)) { r.missing++; if (r.samples.length < 5) r.samples.push({ id, a: A[id], b: B[id] }); continue; }
      const x = Number(A[id]), y = Number(B[id]);
      const d = Math.abs(x - y);
      if (x === y) r.exact++;
      else if (d < 1e-6) r.floatNoise++;
      else { r.diff++; r.maxAbsDiff = Math.max(r.maxAbsDiff, d); if (r.samples.length < 5) r.samples.push({ id, a: x, b: y }); }
    }
    rep[k] = r;
  }
  return rep;
}

function summarize(title, rep, hideIds) {
  const rows = Object.entries(rep);
  const tot = rows.reduce((s, [, r]) => ({ n: s.n + r.n, exact: s.exact + r.exact, floatNoise: s.floatNoise + r.floatNoise, diff: s.diff + r.diff, missing: s.missing + r.missing }), { n: 0, exact: 0, floatNoise: 0, diff: 0, missing: 0 });
  console.log(`\n== ${title}: ${rows.length} formulas, ${tot.n} values — exact ${tot.exact} · floatNoise ${tot.floatNoise} · diff ${tot.diff} · missing ${tot.missing}`);
  for (const [k, r] of rows) if (r.diff || r.missing) console.log(`  ✗ ${k}: diff ${r.diff}, missing ${r.missing}, maxAbsDiff ${r.maxAbsDiff}` + (hideIds ? '' : ' ' + JSON.stringify(r.samples)));
  return tot;
}

async function main() {
  const real = !!process.env.DATA_JSON;
  const seed = real ? JSON.parse(fs.readFileSync(process.env.DATA_JSON, 'utf8')) : require('./fixture').fixture();
  const file = await runLegacy(seed, RANGES);
  const ref = computeAll(file.data, RANGES);
  const report = { data: real ? 'real (counts only)' : 'fixture', ranges: RANGES, legacyVsReference: diffMaps(file.results, ref), jsErrors: file.errors.length };
  const t1 = summarize('legacy (file mode) vs reference', report.legacyVsReference, real);
  // اتساق داخلي في النظام نفسه: رصيد المورد ↔ الرصيد الختامي لكشف حسابه (كل الفترات)
  const bal = file.results['supplier.balance'] || {}, st = file.results['supplier.statementClosing'] || {};
  const incons = Object.keys(bal).filter((id) => Math.abs(Number(bal[id]) - Number(st[id])) >= 0.005);
  report.consistency = { supplierBalanceVsStatement: { suppliers: Object.keys(bal).length, mismatched: incons.length, totalAbsDiff: Math.round(incons.reduce((s, id) => s + Math.abs(bal[id] - st[id]), 0) * 100) / 100, samples: real ? [] : incons.slice(0, 5) } };
  console.log(`\n== consistency: supplier balance vs statement closing — ${incons.length} of ${Object.keys(bal).length} suppliers differ (total ${report.consistency.supplierBalanceVsStatement.totalAbsDiff})`);
  let t2 = { diff: 0, missing: 0 };
  if (process.env.COMPARE_WEB === '1') {
    const web = await runLegacy(seed, RANGES, { web: true });
    report.fileVsWeb = diffMaps(file.results, web.results);
    t2 = summarize('legacy file mode vs legacy web mode (server round-trip)', report.fileVsWeb, real);
    report.webJsErrors = web.errors.length;
  }
  if (real) for (const k of Object.keys(report)) if (report[k] && typeof report[k] === 'object') for (const r of Object.values(report[k])) if (r && r.samples) r.samples = r.samples.map((s) => ({ a: s.a, b: s.b })); // من غير معرّفات
  if (process.env.FORMULA_REPORT) fs.writeFileSync(process.env.FORMULA_REPORT, JSON.stringify(report, null, 1));
  console.log(`\njs errors: ${file.errors.length}`);
  return { report, ok: t1.missing === 0 && t2.diff === 0 && t2.missing === 0 && !file.errors.length };
}

if (require.main === module) main().then((r) => process.exit(r.ok ? 0 : 1)).catch((e) => { console.error('FAIL', e); process.exit(2); });
module.exports = { main, diffMaps, RANGES };
