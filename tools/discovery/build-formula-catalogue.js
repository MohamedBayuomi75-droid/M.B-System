// كتالوج المعادلات والحالات الذهبية (خطة v1.4.5 — المرحلة 3، البند 3.7؛ 04 §6؛ 05 §18.3). قراءة بس.
// بيربط كل معادلة في الحساب المرجعي (tools/formulas/reference.js، 71 معادلة) بـ:
//   دوال النظام القديم اللي بتحسبها (LEG-) ← قسمها في BUSINESS_RULES_AND_FORMULAS.md ← القاعدة المعتمدة (CHG-)
//   ← المعادلة المقابلة في مكتبة B-20 (server/finance-formulas/B20_LIBRARY.json) ← الحالات الذهبية.
// **مفيش أي تغيير في أي معادلة.** الربط بمكتبة B-20 تحليل (مقترح للمراجعة).
// المخرج: docs/discovery/FORMULA_CATALOGUE.md   التشغيل: node tools/discovery/build-formula-catalogue.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const R = require(path.join(ROOT, 'tools/formulas/reference.js'));
const { fixture } = require(path.join(ROOT, 'tools/formulas/fixture.js'));
const { RANGES } = require(path.join(ROOT, 'tools/formulas/compare.js'));
const reg = JSON.parse(read('docs/discovery/requirements-registry.json'));
const lib = JSON.parse(read('server/finance-formulas/B20_LIBRARY.json'));
const libList = Array.isArray(lib) ? lib : (lib.formulas || Object.values(lib));
const runner = read('tools/formulas/legacy-runner.js');
const p59 = read('tests-merge/phase59.js');

const calcByName = new Map(reg.entries.filter((e) => e.kind === 'calc').map((e) => [e.key.split('#')[1], e]));
const idOf = (key) => (reg.entries.find((e) => e.key === key) || {}).id || '—';
const base = (k) => k.replace(/[@:].*$/, '');

// المعادلات وقيمها على بيانات الاختبار المصمّمة (الحالات الذهبية: القيم المتوقعة في phase59 محسوبة يدويًا)
const values = R.computeAll(fixture(), RANGES);
const keys = Object.keys(values);
const bases = [...new Set(keys.map(base))];

// دوال النظام القديم لكل معادلة (من legacy-runner: النداءات في نفس جملة put للمعادلة دي)
const NOT_FN = new Set(['put', 'String', 'Number', 'Math', 'forEach', 'map', 'filter', 'add', 'has', 'get', 'set', 'trim', 'from', 'keys', 'Set', 'Map', 'round', 'fixes', 'JSON', 'stringify', 'parse', 'slice', 'push', 'Boolean']);
const legacyFns = {};
const addFn = (b, f) => (legacyFns[b] ||= new Set()).add(f);
for (const m of runner.matchAll(/put\(\s*([`'"])([\w.]+?)(?=@|\$\{|\1|:)/g)) {
  const rest = runner.slice(m.index + 4);
  const seg = rest.slice(0, Math.min(...[rest.indexOf('put('), rest.indexOf('\n')].filter((i) => i >= 0)));
  const b = m[2].replace(/\.$/, '');
  const fns = [...seg.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1]).filter((f) => !NOT_FN.has(f));
  if (b === 'project') { for (const k of keys.filter((k) => k.startsWith('project.'))) addFn(base(k), 'projectCostSummary'); continue; }
  for (const f of fns) addFn(b, f);
}
// جمل بتحسب القيمة قبل put (مش جوه نفس الجملة)
const HINTS = { 'invoice.expectedTotal': ['previewInvoiceCalculationFixes', 'roundMoney'], 'invoice.noticeWithheld': ['noticeAmountsFor'], 'invoice.noticeBase': ['noticeAmountsFor'], 'supplier.statementClosing': ['openingBalanceFor', 'statementRows'] };
for (const [b, fs_] of Object.entries(HINTS)) for (const f of fs_) addFn(b, f);
// الربط بالتحليل: البادئة ← قسم القواعد + القاعدة المعتمدة + معادلة B-20
const MAP = [
  [/^invoice\./, '§2.1–2.3، 2.6', ['TR-01', 'TR-02', 'TR-03', 'TR-12'], ['SUP-INVOICE', 'SUP-RETURN', 'DOC-TOTALS']],
  [/^supplier\./, '§2.4–2.5', ['TR-04', 'TR-05', 'TR-06'], ['SUP-BALANCE']],
  [/^attendance\./, '§3', ['TR-07', 'TR-08'], ['DAILY-LABOR']],
  [/^(worker|driver|supervisor)\./, '§3–4', ['TR-07', 'TR-08'], ['DAILY-LABOR', 'REMAINING-DUE']],
  [/^employee\./, '§5', ['TR-09', 'TR-14'], ['PAYROLL', 'REMAINING-DUE']],
  [/^equipment(Daily)?\./, '§6', [], ['EQUIPMENT-COST']],
  [/^project\./, '§6', ['TR-10'], ['PROJECT-COST', 'PROJECT-MATERIAL']],
  [/^client\./, '§7', ['TR-11'], ['CUS-CERT', 'CERT-CUMULATIVE']],
  [/^warehouse\./, '§8', ['TR-13'], ['STOCK-QTY', 'MOVING-AVG']],
];
const mapOf = (b) => MAP.find(([re]) => re.test(b)) || [null, '—', [], []];
const p59Has = (b) => p59.includes(`'${b}`);

let md = `# كتالوج المعادلات والحالات الذهبية (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ \`node tools/discovery/build-formula-catalogue.js\`. ماتعدّلش الملف باليد. **مفيش أي معادلة اتغيّرت.**
> **المصادر:** الحساب المرجعي المستقل (\`tools/formulas/reference.js\`)، ومشغّل دوال النظام القديم (\`legacy-runner.js\`)، وبيانات الاختبار المصمّمة (\`fixture.js\`)، واختبار \`tests-merge/phase59.js\` (القيم المتوقعة محسوبة يدويًا)، ومكتبة B-20 (\`server/finance-formulas/B20_LIBRARY.json\`).
> **النتيجة المسجّلة:** النظام القديم ↔ المرجع على بيانات الاختبار: 71 معادلة، 107 قيمة، **0 فرق** (المرحلة 1 بعد الدمج). وعلى نسخة البيانات الحقيقية: 65 معادلة، **8,095/8,095** متطابقة (المرحلة 2).
> **عمودا «القاعدة المعتمدة» و«B-20»:** ربط بالتحليل حسب الموضوع، **مقترح للمراجعة** من المدير المالي.

## 1. الملخص
| المقياس | القيمة |
|---|---|
| معادلات الحساب المرجعي (بالفترات) | ${keys.length} |
| معادلات مختلفة (من غير تكرار الفترات) | ${bases.length} |
| قيم في الحالات الذهبية (بيانات الاختبار) | ${keys.reduce((n, k) => n + Object.keys(values[k] || {}).length, 0)} |
| معادلات مكتبة B-20 (مسودات، مش متفعّلة) | ${libList.length} (${libList.reduce((n, f) => n + (f.testCases || []).length, 0)} حالة اختبار، كلها ناجحة — \`docs/FORMULA_TEST_REPORT.md\`) |
| دوال حساب في الواجهة القديمة (LEG) | ${calcByName.size} |

## 2. معادلات النظام القديم
| المعادلة | الفترات | قيم ذهبية | في phase59 | دوال النظام القديم (LEG) | القسم في BUSINESS_RULES_AND_FORMULAS | القاعدة المعتمدة (CHG) | B-20 (مقترح) |
|---|---|---|---|---|---|---|---|
${bases.map((b) => {
  const ks = keys.filter((k) => base(k) === b);
  const n = ks.reduce((s, k) => s + Object.keys(values[k] || {}).length, 0);
  const [, sec, trs, libs] = mapOf(b);
  const fns = [...(legacyFns[b] || [])].sort();
  return `| \`${b}\` | ${ks.length > 1 ? ks.map((k) => k.slice(b.length) || '—').join('، ') : '—'} | ${n} | ${p59Has(b) ? 'أيوه' : 'لأ'} | ${fns.map((f) => (calcByName.get(f) ? `${calcByName.get(f).id} \`${f}\`` : `\`${f}\``)).join('، ') || '—'} | ${sec} | ${trs.map((t) => `${idOf(`rule:${t}`)} (${t})`).join('، ') || '—'} | ${libs.join('، ')} |`;
}).join('\n')}

## 3. مكتبة B-20 (مسودات — مش متفعّلة)
| الكود | الاسم | الموديول | مرجع المواصفات | حالات الاختبار | قرارات مفتوحة |
|---|---|---|---|---|---|
${libList.map((f) => `| \`${f.code}\` | ${esc(f.name)} | ${f.module} | ${esc(f.specRef || '—')} | ${(f.testCases || []).length} | ${esc((f.openDecisions || []).join(' · ') || '—')} |`).join('\n')}

## 4. ملاحظات
- **الحالات الذهبية** للنظام القديم = القيم المحسوبة يدويًا في \`phase59.js\` على \`fixture.js\`، ومعاها الحساب المرجعي المستقل. وللقواعد المعتمدة (CHG): \`phase62.js\` و\`tools/formulas/target.js\`. ولمكتبة B-20: حالات الاختبار جوه المكتبة نفسها.
- **قواعد التغيير:** أي تغيير في معادلة لازم يمشي بالحساب الموازي (المواصفة المالية §13): الحساب الحالي يفضل، والجديد يتحسب جنبه، والفروق تتسجّل، وماتتغيّرش المعادلة المعتمدة غير بموافقة.
- **⚠️ تعارض أسماء:** \`docs/FINANCIAL_FORMULAS_REVIEW.md\` بيرقّم المعادلات المراجَعة F-01…F-15، وده **غير** F-xx في \`BUSINESS_RULES_AND_FORMULAS.md\`. الربط في \`ID_MAPPING.md\` (الاسم الجديد \`FFR-F-xx\`).
`;

const file = path.join(ROOT, 'docs/discovery/FORMULA_CATALOGUE.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/discovery/FORMULA_CATALOGUE.md'); process.exit(1); }
  console.log('formula catalogue up to date');
} else {
  fs.writeFileSync(file, md);
  console.log(`formula catalogue: ${keys.length} formulas (${bases.length} distinct), ${libList.length} B-20 library formulas; legacy fns linked for ${Object.keys(legacyFns).length} formulas`);
}
