// سجل المتطلبات بالترقيم الموحّد (خطة v1.4.5 — 00 §3) + جدول ربط الأرقام القديمة (قرار C-04).
// قراءة بس من الكود والمستندات. المخرجات: docs/discovery/requirements-registry.json (المصدر)،
// REQUIREMENTS_REGISTRY.md، ID_MAPPING.md.
//
// قواعد الترقيم:
//  - كل عنصر ليه مفتاح ثابت (مثلًا page:dashboard، decision:B-01) والـ ID بيتربط بالمفتاح مرة واحدة.
//  - التشغيل التاني بيقرا السجل الموجود: العنصر القديم بياخد نفس الـ ID، والجديد بياخد الرقم اللي بعده.
//  - العنصر اللي اختفى من المصدر **مابيتمسحش ورقمه مابيتعادش**: بيتعلّم status=missing-in-source.
// التشغيل: node tools/discovery/build-registry.js   (--check: يفشل لو المخرجات مش محدّثة)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/discovery');
const REG = path.join(OUT, 'requirements-registry.json');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CHECK = process.argv.includes('--check');

// ---------------------------------------------------------------- المصادر
const inv = JSON.parse(read('docs/audit/feature-inventory.json'));
const routes = read('frontend/src/app/core/page-routes.ts');
const angularPages = new Map([...routes.matchAll(/key: '([^']+)'[^}]*target: 'angular', path: '([^']+)'/g)].map((m) => [m[1], m[2]]));

const sectionOfPage = new Map();
for (const s of inv.sections) for (const k of s.pages) sectionOfPage.set(k, s.label.replace(/^[^\p{L}]+/u, '').trim());
const MODULE_AR = { hr: 'الموارد البشرية', ledger: 'الموردون', clients: 'العملاء والمشاريع', warehouses: 'المخازن', core: 'مشترك (core)' };
const moduleOfFile = (f) => { const m = (f.match(/renderer\/modules\/([^/]+)\//) || [, f.includes('renderer/core/') ? 'core' : 'other'])[1]; return MODULE_AR[m] || m; };

// موديولات حسابها مالي ← أولوية مقترحة P0 لدوال الحساب (01 §3 + 00 §3: الصحة المالية P0)
const FINANCIAL_MODULES = new Set(['الموردون', 'العملاء والمشاريع', 'المخازن', 'الموارد البشرية']);
const FINANCIAL_HINT = /(cost|balance|total|net|due|pay|salary|wage|invoice|amount|price|vat|tax|deduct|retention|certificate|cert|stock|value|sum|profit|debt|credit|leave)/i;

// ---------------------------------------------------------------- عناصر LEG (قدرات قديمة مُتحقَّق منها)
const items = [];
const add = (o) => items.push(o);

for (const p of inv.pages) {
  add({
    key: `page:${p.key}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'page',
    title: `صفحة «${String(p.label || p.key).replace(/^[^\p{L}]+/u, '').trim()}» (${p.key})${p.aliasOf ? ` — اسم بديل لـ ${p.aliasOf}` : ''}`,
    module: sectionOfPage.get(p.key) || '(خارج القايمة)',
    priority: 'P1', evidence: p.definedAt || '', tests: p.tests || [],
    target: angularPages.has(p.key) ? `angular ${angularPages.get(p.key)}` : 'legacy /legacy/',
    notes: [p.inNavigation ? 'في القايمة' : 'مش في القايمة', p.inPermissionMatrix ? 'في مصفوفة الصلاحيات' : 'مش في مصفوفة الصلاحيات'].join('، '),
  });
}
for (const [file, v] of Object.entries(inv.perFile)) {
  const mod = moduleOfFile(file);
  for (const m of v.modals) {
    const [name, line] = m.split(':');
    add({ key: `modal:${file}#${name}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'modal', title: `نافذة ${name}`, module: mod, priority: 'P1', evidence: `${file}:${line}`, tests: [], target: 'legacy', notes: '' });
  }
  for (const c of v.calcs) {
    const [name, line] = c.split(':');
    const fin = FINANCIAL_MODULES.has(mod) && FINANCIAL_HINT.test(name);
    add({ key: `calc:${file}#${name}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'calc', title: `دالة حساب ${name}`, module: mod, priority: fin ? 'P0' : 'P1', evidence: `${file}:${line}`, tests: [], target: 'legacy', notes: fin ? 'حساب مالي/مخزني (أولوية مقترحة P0)' : '' });
  }
  for (const e of v.exportsFns) {
    add({ key: `export:${file}#${e}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'export/print', title: `تصدير/طباعة ${e}`, module: mod, priority: 'P1', evidence: file, tests: [], target: 'legacy', notes: '' });
  }
  for (const s of v.saves) {
    add({ key: `save:${file}#${s}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'data-write', title: `كتابة بيانات ${s}`, module: mod, priority: 'P0', evidence: file, tests: [], target: 'legacy', notes: 'سلامة البيانات (P0 مقترح)' });
  }
}
// دوال حساب بتستخدمها المعادلات المالية (tools/formulas/legacy-runner.js) والجرد الثابت فوّتها (بيتعرّف على دوال الحساب من الاسم)
{
  const runner = read('tools/formulas/legacy-runner.js');
  const inPage = runner.slice(runner.indexOf('function inPage'), runner.indexOf('async function runLegacy'));
  const known = new Set(items.filter((x) => x.kind === 'calc').map((x) => x.key.split('#')[1]));
  const NOT_FN = new Set(['put', 'String', 'Number', 'Math', 'forEach', 'map', 'filter', 'add', 'has', 'get', 'set', 'trim', 'from', 'keys', 'Set', 'Map', 'round', 'JSON', 'stringify', 'parse', 'slice', 'push', 'Boolean', 'inPage', 'Promise', 'setTimeout']);
  const files = Object.keys(inv.perFile);
  const srcOf = Object.fromEntries(files.map((f) => [f, read(f)]));
  for (const f of [...new Set([...inPage.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))].sort()) {
    if (known.has(f) || NOT_FN.has(f)) continue;
    const file = files.find((x) => new RegExp(`function\\s+${f}\\s*\\(`).test(srcOf[x]));
    if (!file) continue; // مش دالة في الواجهة القديمة
    const line = srcOf[file].slice(0, srcOf[file].search(new RegExp(`function\\s+${f}\\s*\\(`))).split('\n').length;
    add({ key: `calc:${file}#${f}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'calc', title: `دالة حساب ${f}`, module: moduleOfFile(file), priority: 'P0', evidence: `${file}:${line}`, tests: ['tests-merge/phase59.js', 'tools/formulas/compare.js'], target: 'legacy', notes: 'حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner)' });
  }
}
// قدرات الديسكتوب (window.desktopApi في preload.js) — مصفوفة البدائل: ELECTRON_CAPABILITIES.md
{
  const dinv = JSON.parse(read('docs/web/desktop-api-inventory.json'));
  const names = [...dinv.exposed.map((e) => e.name), ...(dinv.missing || [])].filter((v, i, a) => a.indexOf(v) === i).sort();
  for (const n of names) {
    const ex = dinv.exposed.find((e) => e.name === n);
    const [cat, rep] = (dinv.web || {})[n] || ['—', '—'];
    add({ key: `electron:${n}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'electron-capability', title: `قدرة ديسكتوب ${n}${ex ? '' : ' (مستخدمة ومش معرّفة في preload)'}`, module: 'ديسكتوب', priority: /attach|backup|data/.test(cat) ? 'P0' : 'P1', evidence: ex ? `preload.js (${ex.channel})` : 'renderer/ (من غير تعريف)', tests: [], target: rep, notes: `الفئة: ${cat}` });
  }
}
// الصلاحيات: المصفوفة + قوالب الأدوار
const perms = read('renderer/core/permissions.js');
add({ key: 'perm:page-matrix', prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'permission', title: 'مصفوفة صلاحيات الصفحات (عرض/إضافة/تعديل/حذف لكل صفحة)', module: 'الإعدادات', priority: 'P0', evidence: 'renderer/core/permissions.js', tests: [], target: 'server (ADR-016)', notes: 'السيرفر هو المرجع' });
const rolesBlock = (perms.match(/function roleTemplates\(\)\{([\s\S]*?)\n\}/) || [, ''])[1];
for (const r of new Set([...rolesBlock.matchAll(/^\s*T\.([a-zA-Z]+)\s*=/gm)].map((m) => m[1]))) {
  add({ key: `perm:role:${r}`, prefix: 'LEG', classification: 'LEGACY-PRESERVE', kind: 'permission', title: `قالب دور ${r}`, module: 'الإعدادات', priority: 'P1', evidence: 'renderer/core/permissions.js', tests: [], target: 'server', notes: '' });
}

// ---------------------------------------------------------------- DEC: قرارات (B-xx + قرارات v1.4.5)
const obd = read('docs/OPEN_BUSINESS_DECISIONS.md');
const decisions = new Map();
for (const line of obd.split('\n')) {
  const m = line.match(/^\| *(B-\d+) *\| *(.+?) *\|/);
  if (!m) continue;
  const id = m[1];
  const closed = /✅|محسوم|APPROVED/.test(line);
  const prev = decisions.get(id);
  // أول تعريف هو العنوان؛ أي سطر لاحق بـ «محسوم» بيقفل القرار
  if (!prev) decisions.set(id, { title: m[2].replace(/~~/g, '').replace(/\*\*/g, '').slice(0, 160), closed });
  else if (closed) prev.closed = true;
}
for (const [b, d] of [...decisions].sort((x, y) => Number(x[0].slice(2)) - Number(y[0].slice(2)))) {
  add({ key: `decision:${b}`, prefix: 'DEC', classification: 'OPEN-DECISION', kind: 'decision', title: d.title, module: 'قرارات', priority: '—', evidence: 'docs/OPEN_BUSINESS_DECISIONS.md', tests: [], target: '—', notes: d.closed ? 'محسوم' : 'مفتوح', aliases: [b], decisionStatus: d.closed ? 'resolved' : 'open' });
}
// قرارات بأرقام DEC- مباشرة (قرار DEC-0083: من 2026-11-20 القرارات الجديدة مابتاخدش B-xx)
for (const line of obd.split('\n')) {
  const m = line.match(/^\| *(DEC-\d{4}) *\| *(.+?) *\|/);
  if (!m) continue;
  const closed = /✅|محسوم/.test(line);
  add({ key: `decision:${m[1]}`, fixedId: m[1], prefix: 'DEC', classification: 'OPEN-DECISION', kind: 'decision', title: m[2].replace(/\*\*/g, '').slice(0, 160), module: 'قرارات', priority: '—', evidence: 'docs/OPEN_BUSINESS_DECISIONS.md', tests: [], target: '—', notes: closed ? 'محسوم' : 'مفتوح', aliases: [], decisionStatus: closed ? 'resolved' : 'open' });
}
for (const [u, t] of [['U-1', 'خطة v1.4.5 بتلغي الخطة القديمة v1.0 وبتحل محلها'], ['U-2', 'تعارض أهداف النسخ: Policy E في الخطة الرئيسية §4.1 هي اللي تمشي'], ['U-3', 'العدّ من مراحل v1.4.5، والشغل القديم يتراجع ويتأكد منه']]) {
  add({ key: `decision:${u}`, prefix: 'DEC', classification: 'OPEN-DECISION', kind: 'decision', title: t, module: 'حوكمة', priority: '—', evidence: 'docs/reports/v1.4.5/PHASE_00_BASELINE_REPORT.md', tests: [], target: '—', notes: 'محسوم 2026-11-19', aliases: [u], decisionStatus: 'resolved' });
}

// ---------------------------------------------------------------- CHG: قواعد معتمدة بتغيّر السلوك القديم (TR-xx) + F-xx كأسماء بديلة
const tbr = read('docs/TARGET_BUSINESS_RULES.md');
const brf = read('docs/BUSINESS_RULES_AND_FORMULAS.md');
const fToTr = {}; // F-xx ← TR-xx من جدول الربط في BUSINESS_RULES_AND_FORMULAS
for (const line of brf.split('\n')) {
  const m = line.match(/^\| *(F-\d+(?:، *F-\d+)*) *\| *[^|]*\| *([^|]*TR-[^|]*)\|/);
  if (!m) continue;
  const trs = [...m[2].matchAll(/TR-(\d+)(?:…TR-(\d+))?/g)].flatMap((x) => { const a = +x[1], b = x[2] ? +x[2] : a; return Array.from({ length: b - a + 1 }, (_, i) => `TR-${String(a + i).padStart(2, '0')}`); });
  for (const f of m[1].split(/، */)) fToTr[f.trim()] = trs;
}
const fTitles = {};
for (const line of brf.split('\n')) { const m = line.match(/^\| *(F-\d+) *\| *(.+?) *\|/); if (m && !fTitles[m[1]]) fTitles[m[1]] = m[2].replace(/\*\*/g, '').slice(0, 140); }
const trRows = [...tbr.matchAll(/^\| *(TR-\d+) *\| *([^|]+?) *\| *([^|]+?) *\|/gm)];
for (const [, tr, topic, rule] of trRows.sort((a, b) => a[1].localeCompare(b[1]))) {
  const fs_ = Object.entries(fToTr).filter(([, t]) => t.includes(tr)).map(([f]) => f).sort();
  add({ key: `rule:${tr}`, prefix: 'CHG', classification: 'APPROVED-CHANGE', kind: 'business-rule', title: `${topic.trim()}: ${rule.replace(/\*\*/g, '').trim().slice(0, 150)}`, module: 'قواعد مالية', priority: 'P0', evidence: 'docs/TARGET_BUSINESS_RULES.md', tests: ['tests-merge/phase62.js', 'tools/formulas/target.js'], target: 'server (ADR-025)', notes: fs_.length ? `بيعالج ${fs_.join('، ')}` : '', aliases: [tr, ...fs_] });
}

// ---------------------------------------------------------------- TECH: الأمان والتشغيل (S-x) + المكونات الفنية الأساسية
const sec = read('docs/SECURITY_AND_BACKUP_PLAN.md');
for (const m of sec.matchAll(/^\| *(S-\d+) *\| *([^|]+?) *\|/gm)) {
  add({ key: `tech:${m[1]}`, prefix: 'TECH', classification: 'TECHNICAL', kind: 'security/ops', title: m[2].replace(/\*\*/g, '').trim(), module: 'أمان وتشغيل', priority: 'P0', evidence: 'docs/SECURITY_AND_BACKUP_PLAN.md', tests: [], target: 'server/infra', notes: '', aliases: [m[1]] });
}
const TECH_CORE = [
  ['tech:money-4dp-half-up', 'الحساب العشري: NUMERIC بأربع خانات وHALF_UP على الخادم (Money)', 'ADR-011، ADR-023', 'server/src/common/money.ts'],
  ['tech:no-gaps-numbering', 'ترقيم NO_GAPS داخل معاملة الخادم، والرقم المُصدر مابيتعادش حتى مع الإلغاء', 'ADR-013، 01 §3.4', 'server/src/numbering/'],
  ['tech:approved-not-posted', 'Approved ≠ Posted، والمرحّل مابيتعدّلش (التصحيح بمستند عكسي)', 'ADR-012، Policy D', 'server/src/approvals/'],
  ['tech:idempotency', 'Idempotency-Key للعمليات الحساسة', '03 §21.3', 'server/src/common/'],
  ['tech:audit-append-only', 'سجل تدقيق إلحاقي محمي على مستوى القاعدة + القيمة السابقة', 'ADR-018', 'server/src/audit/'],
  ['tech:backup-restore', 'نسخ واستعادة: RPO 15 دقيقة، RTO 4 ساعات، نسخة مشفّرة خارجية، اختبار شهري', 'Policy E، ADR-020', 'docker/backup/'],
  ['tech:server-authz', 'الخادم المرجع الوحيد للصلاحيات (صفحة + فعل + نطاق مشروع)', 'ADR-016', 'server/src/authz/'],
  ['tech:attachments-in-db', 'المرفقات جوه PostgreSQL مع الفحص والإصدارات (والبديل المعتمد: نظام الملفات + بيانات وصفية)', 'ADR-007، ADR-014، 01 §4', 'server/src/files/'],
  ['tech:ci', 'تشغيل آلي للبناء والاختبارات (CI)', '02 Phase 4', '— (مش موجود)'],
  ['tech:visual-regression', 'مقارنة بصرية آلية مع خط الأساس', '04 §4.3', 'docs/discovery/visual-baseline/'],
];
for (const [key, title, src, ev] of TECH_CORE) add({ key, prefix: 'TECH', classification: 'TECHNICAL', kind: 'platform', title, module: 'المنصة', priority: 'P0', evidence: ev, tests: [], target: 'server/infra', notes: src });

// ---------------------------------------------------------------- NEW: قدرات مش موجودة في القديم (نطاق مرشّح، محتاجة اعتماد نطاق)
const NEW = [
  ['new:approvals-engine', 'محرك اعتمادات متعدد المستويات (B-01…B-08)', 'منفّذ ومختبر (بيانات اختبار)، مش متفعّل'],
  ['new:tax-engine', 'محرك الضرايب والاستقطاعات والدمغات (B-21)', 'منفّذ، **من غير نسب** (Policy C)'],
  ['new:financial-rules-engine', 'محرك القواعد المالية (B-20): معادلات بإصدارات واختبارات إلزامية', 'منفّذ، مسودات بس'],
  ['new:notifications', 'إشعارات مخزّنة', 'منفّذ'],
  ['new:procurement', 'المشتريات (طلب ← عرض ← أمر شراء ← استلام)', 'مش متنفّذ (B-36…B-38)'],
  ['new:safety', 'السلامة والمخاطر', 'مش متنفّذ (B-39)'],
  ['new:quality', 'الجودة والاستلام', 'مش متنفّذ (B-40، B-41)'],
  ['new:double-entry', 'المحاسبة بالقيد المزدوج (دليل حسابات، قيود، أستاذ، ميزان، إقفال)', 'المرحلة 10'],
  ['new:pwa', 'تطبيق ويب قابل للتثبيت (PWA)', 'الأساس منفّذ'],
];
for (const [key, title, status] of NEW) add({ key, prefix: 'NEW', classification: 'NEW-REQUIREMENT', kind: 'capability', title, module: 'نطاق جديد', priority: 'P1', evidence: 'docs/plan-v1.4.5/01_MASTER_PLAN.md §2', tests: [], target: '—', notes: status });

// ---------------------------------------------------------------- تخصيص الـ IDs (ثابتة ومابتتعادش)
const prev = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : { next: {}, entries: [] };
const byKey = new Map(prev.entries.map((e) => [e.key, e]));
const next = { LEG: 1, TECH: 1, NEW: 1, CHG: 1, DEC: 1, ...prev.next };
const seen = new Set();
const entries = [];
for (const it of [...items.filter((x) => x.fixedId), ...items.filter((x) => !x.fixedId)]) {
  if (seen.has(it.key)) continue; // نفس المفتاح مرتين في المصدر = عنصر واحد
  seen.add(it.key);
  const old = byKey.get(it.key);
  let id;
  if (it.fixedId) {
    // رقم مكتوب في المستند نفسه: لازم يكون مش محجوز لعنصر تاني، والعدّاد بيعدّيه
    const clash = prev.entries.find((e) => e.id === it.fixedId && e.key !== it.key);
    if (clash) throw new Error(`${it.fixedId} محجوز لـ ${clash.key}`);
    id = it.fixedId;
    const n = Number(id.split('-')[1]);
    if (n >= next[it.prefix]) next[it.prefix] = n + 1;
  } else id = old ? old.id : `${it.prefix}-${String(next[it.prefix]++).padStart(4, '0')}`;
  const { fixedId, ...rest } = it;
  // الأولويات: القاعدة اتعتمدت بقرار DEC-0085 (P0 للحساب المالي وكتابة البيانات، والباقي P1)
  const priorityStatus = it.priority && it.priority !== '—' ? 'approved (DEC-0085)' : '—';
  entries.push({ id, ...rest, priorityStatus, status: it.kind === 'decision' ? it.decisionStatus : (it.prefix === 'LEG' ? 'verified-static' : 'recorded') });
}
for (const old of prev.entries) if (!seen.has(old.key)) entries.push({ ...old, status: 'missing-in-source' });
entries.sort((a, b) => a.id.localeCompare(b.id));
const registry = { generatedBy: 'tools/discovery/build-registry.js', plan: 'v1.4.5 — 00 §3', next, entries };

// ---------------------------------------------------------------- المخرجات
const count = (p) => entries.filter((e) => e.id.startsWith(p + '-')).length;
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const kinds = {};
for (const e of entries.filter((x) => x.prefix === 'LEG')) kinds[e.kind] = (kinds[e.kind] || 0) + 1;

let md = `# سجل المتطلبات بالترقيم الموحّد (خطة v1.4.5)

> **مولَّد** بـ \`node tools/discovery/build-registry.js\` من الكود والمستندات (قراءة بس). **المصدر الثابت:** \`requirements-registry.json\`. ماتعدّلش الملف ده باليد.
> **قواعد الترقيم** (\`docs/plan-v1.4.5/00_README_DOCUMENT_INDEX.md\` §3): الـ ID بيتحجز مرة واحدة ومابيتعادش، والعنصر اللي يختفي من المصدر بيفضل بحالة \`missing-in-source\`.
> **الأولويات معتمدة كقاعدة** بقرار DEC-0085 (2026-11-20): P0 للحساب المالي وكتابة البيانات وسلامة البيانات، والباقي P1. أي تعديل لعنصر معيّن بيتسجّل كقرار. والأرقام القديمة (B-/F-/TR-/S-/U-) بتفضل أسماء بديلة: راجع \`ID_MAPPING.md\`.

## الملخص
| البادئة | التصنيف | العدد |
|---|---|---|
| \`LEG-\` | LEGACY-PRESERVE | ${count('LEG')} |
| \`CHG-\` | APPROVED-CHANGE | ${count('CHG')} |
| \`TECH-\` | TECHNICAL | ${count('TECH')} |
| \`NEW-\` | NEW-REQUIREMENT | ${count('NEW')} |
| \`DEC-\` | OPEN-DECISION (المفتوح والمحسوم) | ${count('DEC')} (مفتوح: ${entries.filter((e) => e.prefix === 'DEC' && e.status === 'open').length}) |
| **الإجمالي** | | **${entries.length}** |

**عناصر LEG حسب النوع:** ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(' · ')}

`;
const sections = [['LEG', 'القدرات القديمة (LEG)'], ['CHG', 'التغييرات المعتمدة (CHG)'], ['TECH', 'المتطلبات الفنية (TECH)'], ['NEW', 'القدرات الجديدة (NEW)'], ['DEC', 'القرارات (DEC)']];
for (const [p, title] of sections) {
  md += `## ${title}\n| ID | النوع | الموديول | الوصف | الأولوية (مقترحة) | الدليل | المكان المستهدف | الاختبارات | الحالة | ملاحظات |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const e of entries.filter((x) => x.prefix === p)) {
    md += `| ${e.id} | ${esc(e.kind)} | ${esc(e.module)} | ${esc(e.title)} | ${esc(e.priority)} | ${esc(e.evidence)} | ${esc(e.target)} | ${esc((e.tests || []).join('، '))} | ${esc(e.status)} | ${esc([e.notes, e.aliases && e.aliases.length ? `الأسماء القديمة: ${e.aliases.join('، ')}` : ''].filter(Boolean).join(' · '))} |\n`;
  }
  md += '\n';
}

// جدول الربط
const awdF = [...read('docs/APPROVAL_WORKFLOW_DESIGN.md').matchAll(/^\| *(F-\d+) *\| *([^|]+?) *\|/gm)].map((m) => [m[1], m[2]]);
const idOf = (key) => (entries.find((e) => e.key === key) || {}).id || '—';
let map = `# جدول ربط الأرقام القديمة بالترقيم الموحّد (قرار C-04)

> **مولَّد** بـ \`node tools/discovery/build-registry.js\`. **الأرقام القديمة مابتتمسحش** من المستندات، وبتفضل أسماء بديلة للـ IDs الجديدة.
> المعيار P3-D: كل رقم قديم من الأنواع B-، وF-، وTR-، وS-، وU- مربوط بـ ID موحّد، أو متسجّل سبب إنه مش متطلب.

## B-xx (قرارات) ← DEC-
| القديم | الجديد | الحالة |
|---|---|---|
${[...decisions.keys()].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))).map((b) => `| ${b} | ${idOf(`decision:${b}`)} | ${decisions.get(b).closed ? 'محسوم' : 'مفتوح'} |`).join('\n')}

## TR-xx (قواعد معتمدة) ← CHG-
| القديم | الجديد |
|---|---|
${trRows.map((r) => r[1]).sort().map((t) => `| ${t} | ${idOf(`rule:${t}`)} |`).join('\n')}

## F-xx في \`BUSINESS_RULES_AND_FORMULAS.md\` (ملاحظات على قواعد العمل الحالية) ← CHG- اللي بيعالجها
| القديم | الملاحظة | بيتعالج في | الـ ID |
|---|---|---|---|
${Object.keys(fTitles).sort().map((f) => `| ${f} | ${esc(fTitles[f])} | ${(fToTr[f] || []).join('، ') || '—'} | ${(fToTr[f] || []).map((t) => idOf(`rule:${t}`)).join('، ') || '— (راجع قائمة العيوب)'} |`).join('\n')}

## F-xx في \`APPROVAL_WORKFLOW_DESIGN.md\` (حالات اختبار فشل لمحرك الاعتمادات) — ⚠️ نفس البادئة لحاجة مختلفة
دي **حالات اختبار** مش متطلبات، فمالهاش ID في السجل. بتتربط بالمتطلب \`${idOf('new:approvals-engine')}\` (محرك الاعتمادات)، وبيتشار ليها بالاسم \`AWD-F-xx\` عشان ماتتلخبطش مع F-xx فوق.
| القديم | الاسم الجديد | الوصف |
|---|---|---|
${awdF.map(([f, t]) => `| ${f} | AWD-${f} | ${esc(t)} |`).join('\n')}

## F-xx في \`FINANCIAL_FORMULAS_REVIEW.md\` (مراجعة معادلات المدير المالي) — ⚠️ تالت استخدام لنفس البادئة
دي **أبواب في مراجعة المعادلات** مش متطلبات، وبيتشار ليها بالاسم \`FFR-F-xx\`. المعادلة المقابلة في مكتبة B-20 والقواعد المعتمدة في \`FORMULA_CATALOGUE.md\`.
| القديم | الاسم الجديد | الموضوع |
|---|---|---|
${[...read('docs/FINANCIAL_FORMULAS_REVIEW.md').matchAll(/^## (F-\d+) (.+)$/gm)].map((m) => `| ${m[1]} | FFR-${m[1]} | ${esc(m[2])} |`).join('\n')}

## S-x (بنود الأمان والتشغيل) ← TECH-
| القديم | الجديد |
|---|---|
${[...sec.matchAll(/^\| *(S-\d+) *\|/gm)].map((m) => `| ${m[1]} | ${idOf(`tech:${m[1]}`)} |`).join('\n')}

## U-x (قرارات المستخدم في v1.4.5) ← DEC-
| القديم | الجديد |
|---|---|
${['U-1', 'U-2', 'U-3'].map((u) => `| ${u} | ${idOf(`decision:${u}`)} |`).join('\n')}

## أرقام بتفضل زي ما هي (مش متطلبات)
| النوع | السبب |
|---|---|
| ADR-001…ADR-028 | قرارات معمارية، ليها سجلها (\`ARCHITECTURE_DECISIONS.md\`) |
| R-01…R-39 | مخاطر، ليها سجلها (\`ERP_RISK_REGISTER.md\` + تقارير v1.4.5) |
| D-001…D-020 | سجل قرارات قديم (\`WEB-DECISIONS.md\`) ومرجع تاريخي بس، والقرارات المعتمدة بقت في ADR-xxx |
| C-01…C-12 | تعارضات اتسجلت في تقرير المرحلة 1 (\`PHASE_01_REPORT.md\` §4 و§15)، واتحسمت هناك |
| P0…P3 / P1-x، P2-x… | أولويات ومعايير قبول المراحل، مش أرقام متطلبات |
`;

const outFiles = {
  [REG]: JSON.stringify(registry, null, 1) + '\n',
  [path.join(OUT, 'REQUIREMENTS_REGISTRY.md')]: md,
  [path.join(OUT, 'ID_MAPPING.md')]: map,
};
if (CHECK) {
  const stale = Object.entries(outFiles).filter(([f, c]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== c).map(([f]) => path.relative(ROOT, f));
  if (stale.length) { console.error('stale:', stale.join(', ')); process.exit(1); }
  console.log('registry up to date');
} else {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [f, c] of Object.entries(outFiles)) fs.writeFileSync(f, c);
  console.log(`registry: ${entries.length} entries — LEG ${count('LEG')} · CHG ${count('CHG')} · TECH ${count('TECH')} · NEW ${count('NEW')} · DEC ${count('DEC')}`);
}
