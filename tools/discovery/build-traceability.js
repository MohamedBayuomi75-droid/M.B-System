// مصفوفة التتبّع (خطة v1.4.5 — المرحلة 3، البند 3.11؛ 04 §5.2؛ 05 §2.1). قراءة بس.
// لكل متطلب: مكانه في النظام القديم ← مكانه المستهدف ← الاختبارات اللي بتغطيه فعلًا ← الحالة ← القرارات المفتوحة اللي بتمنعه.
// الاختبارات بتتلاقى بالبحث عن اسم الدالة/الصفحة في ملفات الاختبار (tests-merge/، tests-web/، tools/formulas/، server/test)،
// يعني ربط بدليل من الكود، مش تخمين.
// المخرج: docs/discovery/TRACEABILITY_MATRIX.md   التشغيل: node tools/discovery/build-traceability.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const reg = JSON.parse(read('docs/discovery/requirements-registry.json'));

// ملفات الاختبار
const TEST_DIRS = ['tests-merge', 'tests-web', 'tools/formulas', 'server/test'];
const testFiles = [];
for (const d of TEST_DIRS) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) if (/\.(js|ts)$/.test(f) && !/^(harness|lib|fixture|decimal)\.js$/.test(f)) testFiles.push({ name: `${d}/${f}`, src: fs.readFileSync(path.join(abs, f), 'utf8') });
}
const testsFor = (needle) => (needle && needle.length > 3 ? testFiles.filter((t) => new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t.src)).map((t) => t.name) : []);

// القرارات المفتوحة اللي بتمنع كل موديول (من OPEN_BUSINESS_DECISIONS «ما الذي يمنع ماذا» + قرارات كل موديول)
const decStatus = new Map(reg.entries.filter((e) => e.prefix === 'DEC').map((e) => [(e.aliases || [])[0], e]));
const openOf = (bs) => bs.filter((b) => decStatus.get(b) && decStatus.get(b).status === 'open').map((b) => `${decStatus.get(b).id} (${b})`);
const MODULE_DECISIONS = [
  [/ledger|الموردون|suppliers/i, ['B-29']],
  [/clients|العملاء/i, ['B-29', 'B-35']],
  [/warehouses|المخازن/i, ['B-77']],
  [/hr|الموارد البشرية|حركة الموارد/i, ['B-45', 'B-46', 'B-47', 'B-73', 'B-74', 'B-76', 'B-42']],
  [/الحسابات|accounts/i, ['B-13', 'B-14', 'B-15', 'B-16', 'B-27']],
  [/الأرشيف|archive/i, ['B-61']],
  [/الإعدادات|settings|permission/i, ['B-35']],
];
const blockersOf = (mod) => openOf((MODULE_DECISIONS.find(([re]) => re.test(mod || '')) || [, []])[1]);

// حالة المتطلبات الفنية والجديدة (من أدلة المراحل 1 و2 بعد الدمج)
const TECH_STATUS = {
  'tech:money-4dp-half-up': ['Verified', 'money.spec + money.e2e (مطابقة PostgreSQL على 30,008 قيمة)'],
  'tech:no-gaps-numbering': ['Verified', 'server e2e (المرحلة 5)؛ النطاق والشكل B-29 مفتوح'],
  'tech:approved-not-posted': ['Verified', 'محرك الاعتمادات + B-51 (المرحلة 5، 6.2)'],
  'tech:idempotency': ['Verified', 'server e2e (المرحلة 5)'],
  'tech:audit-append-only': ['Verified', 'audit.e2e + بيئة معزولة (المرحلة 2)'],
  'tech:backup-restore': ['Verified', 'إثبات على نسخة البيانات الحقيقية (المرحلة 2 v1.4.5)'],
  'tech:server-authz': ['Partially Implemented', 'matrix.e2e؛ نطاقات B-35 لسه'],
  'tech:attachments-in-db': ['Partially Implemented', 'attachments.e2e؛ PDF المشفّر B-78 لسه'],
  'tech:ci': ['Not Started', '—'],
  'tech:visual-regression': ['Partially Implemented', 'خط الأساس موجود (المرحلة 3)؛ المقارنة الآلية لسه'],
};
for (const s of ['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7']) TECH_STATUS[`tech:${s}`] = ['Verified', 'المرحلة 2 القديمة + إعادة التحقق في المراحل 1 و2 v1.4.5'];
TECH_STATUS['tech:S-2'] = ['Partially Implemented', 'CSP فيها unsafe-inline (R-26)'];
TECH_STATUS['tech:S-8'] = ['Verified', '2FA + xlsx 0.20.3 (المرحلة 3 القديمة)'];
const NEW_STATUS = {
  'new:approvals-engine': ['Implemented', 'بيانات اختبار؛ مش متفعّل'], 'new:tax-engine': ['Implemented', 'من غير نسب (Policy C)'],
  'new:financial-rules-engine': ['Implemented', 'مسودات'], 'new:notifications': ['Implemented', ''], 'new:pwa': ['Partially Implemented', 'الأساس'],
  'new:procurement': ['Not Started', ''], 'new:safety': ['Not Started', ''], 'new:quality': ['Not Started', ''], 'new:double-entry': ['Not Started', 'المرحلة 10'],
};

// تتبّع كل عنصر
const rows = [];
for (const e of reg.entries) {
  let tests = [...(e.tests || [])].map((t) => (t.includes('/') ? t : `tests-merge/${t}`));
  const fn = (e.key.match(/#(.+)$/) || [])[1];
  if (e.kind === 'page') tests = [...new Set([...tests, ...testsFor(e.key.slice(5))])];
  else if (fn) tests = [...new Set([...tests, ...testsFor(fn)])];
  else if (e.kind === 'electron-capability') tests = [...new Set([...tests, ...testsFor(e.key.split(':')[1])])];
  let status, note = '';
  if (e.prefix === 'LEG') {
    const migrated = /^angular|^server/.test(e.target || '');
    status = migrated ? 'Implemented (اتنقل)' : (tests.length ? 'Verified (باختبار)' : 'Verified (جرد ثابت بس)');
  } else if (e.prefix === 'TECH') [status, note] = TECH_STATUS[e.key] || ['Recorded', ''];
  else if (e.prefix === 'NEW') [status, note] = NEW_STATUS[e.key] || ['Recorded', ''];
  else if (e.prefix === 'CHG') status = 'Approved — مختبر كمواصفة (phase62، target.js)';
  else status = e.status === 'open' ? 'Open' : 'Resolved';
  rows.push({ ...e, tests, status, note, blockers: e.prefix === 'LEG' ? blockersOf(e.module) : [] });
}

// الملخص
const leg = rows.filter((r) => r.prefix === 'LEG');
const byKind = {};
for (const r of leg) { const k = byKind[r.kind] ||= { n: 0, tested: 0, migrated: 0 }; k.n++; if (r.tests.length) k.tested++; if (/^Implemented/.test(r.status)) k.migrated++; }
const byModule = {};
for (const r of leg) { const k = byModule[r.module] ||= { n: 0, tested: 0, migrated: 0, p0: 0 }; k.n++; if (r.tests.length) k.tested++; if (/^Implemented/.test(r.status)) k.migrated++; if (r.priority === 'P0') k.p0++; }
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
const untestedP0 = leg.filter((r) => r.priority === 'P0' && !r.tests.length);

let md = `# مصفوفة التتبّع (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ \`node tools/discovery/build-traceability.js\` من \`requirements-registry.json\` + ملفات الاختبار. ماتعدّلش الملف باليد.
> **الاختبارات** بتتلاقى بالبحث عن اسم الدالة أو الصفحة في ${TEST_DIRS.map((d) => `\`${d}/\``).join(' و')} (${testFiles.length} ملف). ده **دليل إن الاختبار بيلمس العنصر**، مش إثبات إنه بيغطي كل حالاته.
> **الحالات** (\`02\` §20): Implemented ≠ Verified ≠ Accepted. **مفيش حاجة هنا Accepted**: القبول بيكون لكل موديول ببوابة.
> **الأولويات مقترحة.**

## 1. التغطية حسب النوع (LEG)
| النوع | العدد | ليه اختبار بيلمسه | اتنقل للنظام الجديد |
|---|---|---|---|
${Object.entries(byKind).map(([k, v]) => `| ${k} | ${v.n} | ${v.tested} (${pct(v.tested, v.n)}) | ${v.migrated} |`).join('\n')}
| **الإجمالي** | **${leg.length}** | **${leg.filter((r) => r.tests.length).length} (${pct(leg.filter((r) => r.tests.length).length, leg.length)})** | **${leg.filter((r) => /^Implemented/.test(r.status)).length}** |

## 2. التغطية حسب الموديول (LEG)
| الموديول | العدد | منها P0 (مقترح) | ليه اختبار | اتنقل | قرارات مفتوحة بتمنعه |
|---|---|---|---|---|---|
${Object.entries(byModule).sort((a, b) => b[1].n - a[1].n).map(([m, v]) => `| ${esc(m)} | ${v.n} | ${v.p0} | ${v.tested} (${pct(v.tested, v.n)}) | ${v.migrated} | ${blockersOf(m).join('، ') || '—'} |`).join('\n')}

## 3. ⚠️ عناصر P0 (مقترحة) من غير أي اختبار بيلمسها — ${untestedP0.length}
دي أولوية لاختبارات القبول قبل نقل موديولاتها (\`05\` §18.4).
| ID | النوع | الموديول | العنصر | الدليل |
|---|---|---|---|---|
${untestedP0.map((r) => `| ${r.id} | ${r.kind} | ${esc(r.module)} | ${esc(r.title)} | ${esc(r.evidence)} |`).join('\n') || '| — | | | | |'}

## 4. المتطلبات الفنية والجديدة والتغييرات المعتمدة
| ID | العنصر | الحالة | الدليل/الملاحظة |
|---|---|---|---|
${rows.filter((r) => ['TECH', 'NEW', 'CHG'].includes(r.prefix)).map((r) => `| ${r.id} | ${esc(r.title)} | ${esc(r.status)} | ${esc(r.note || (r.aliases || []).join('، '))} |`).join('\n')}

## 5. المصفوفة الكاملة (LEG)
| ID | النوع | الموديول | العنصر | النظام القديم | المستهدف | الاختبارات | الحالة | قرارات بتمنعه |
|---|---|---|---|---|---|---|---|---|
${leg.map((r) => `| ${r.id} | ${r.kind} | ${esc(r.module)} | ${esc(r.title)} | ${esc(r.evidence)} | ${esc(r.target)} | ${esc(r.tests.map((t) => t.split('/').pop()).slice(0, 6).join('، '))}${r.tests.length > 6 ? ` (+${r.tests.length - 6})` : ''} | ${r.status} | ${r.blockers.join('، ') || '—'} |`).join('\n')}
`;

const file = path.join(ROOT, 'docs/discovery/TRACEABILITY_MATRIX.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/discovery/TRACEABILITY_MATRIX.md'); process.exit(1); }
  console.log('traceability matrix up to date');
} else {
  fs.writeFileSync(file, md);
  console.log(`traceability: ${leg.length} LEG, ${leg.filter((r) => r.tests.length).length} with tests, ${untestedP0.length} untested P0, ${testFiles.length} test files scanned`);
}
