// الجرد الوظيفي لكل صفحة (خطة v1.4.5 — المرحلة 3، البند 3.3).
// بيجمع: الجرد الثابت (docs/audit/feature-inventory.json) + الاستكشاف الفعلي (page-discovery.json)
// + سجل المتطلبات (requirements-registry.json) ← docs/discovery/FUNCTIONAL_INVENTORY.md
// التشغيل: node tools/discovery/build-functional-inventory.js   (--check: يفشل لو الملف مش محدّث)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const D = path.join(ROOT, 'docs/discovery');
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audit/feature-inventory.json'), 'utf8'));
const disc = JSON.parse(fs.readFileSync(path.join(D, 'page-discovery.json'), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(D, 'requirements-registry.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// اسم الدالة ← عنصر السجل (نافذة / تصدير / كتابة بيانات / دالة حساب)
const fnToReq = new Map();
for (const e of reg.entries) {
  const m = e.key.match(/^(modal|export|save|calc):[^#]+#(.+)$/);
  if (m && !fnToReq.has(m[2])) fnToReq.set(m[2], e);
}
// ربط من الكود: معرّف الزرار ← addEventListener/onclick ← الدالة (أغلب الأزرار بتتربط كده مش بـ onclick في الـ HTML)
function walk(d, acc = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else if (p.endsWith('.js')) acc.push(p); } return acc; }
const SRC = walk(path.join(ROOT, 'renderer')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const handlerCache = new Map();
function handlerFns(id) {
  if (!id || id.includes('*')) return [];
  if (handlerCache.has(id)) return handlerCache.get(id);
  const out = new Set();
  const re = new RegExp(`getElementById\\(\\s*['"\`]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]\\s*\\)`, 'g');
  let m;
  while ((m = re.exec(SRC))) {
    const tail = SRC.slice(m.index, m.index + 400).split(/\n/)[0];
    for (const f of tail.matchAll(/([A-Za-z_$][\w$]*)\s*(?:\(|\)|;|,)/g)) if (fnToReq.has(f[1])) out.add(f[1]);
  }
  const r = [...out];
  handlerCache.set(id, r);
  return r;
}
const callsOf = (b) => [...new Set([...(b.calls || []), ...handlerFns(b.id)])];

const pageReq = new Map(reg.entries.filter((e) => e.kind === 'page').map((e) => [e.key.slice(5), e]));
const KIND_AR = { add: 'إضافة', edit: 'تعديل', view: 'عرض/تفاصيل', delete: 'حذف', save: 'حفظ', export: 'تصدير', import: 'استيراد', print: 'طباعة/PDF', approve: 'اعتماد/رفض', attachment: 'مرفقات', filter: 'بحث/فلترة', navigate: 'تنقّل', other: 'أخرى' };
const KIND_RE = [
  ['filter', /مسح الفلاتر|إعادة تعيين|reset/i], ['delete', /حذف|🗑|مسح|delete|remove/i], ['export', /تصدير|Excel|إكسيل|اكسيل|xlsx|csv|export|download/i], ['import', /استيراد|import/i],
  ['print', /طباعة|🖨|PDF|print|pdf/i], ['approve', /اعتماد|موافقة|رفض|approve|reject/i], ['attachment', /مرفق|📎|attach/i],
  ['save', /حفظ|💾|save/i], ['add', /إضافة|اضافة|جديد|➕|＋|^\+|add|new/i], ['edit', /تعديل|✏️|edit/i], ['view', /عرض|تفاصيل|👁|كشف|view|detail/i],
  ['filter', /بحث|فلتر|تصفية|🔍|filter|search/i], ['navigate', /رجوع|←|→|التالي|السابق|back/i],
];
const kindOf = (t) => (KIND_RE.find(([, re]) => re.test(t)) || ['other'])[0];

// الأزرار العامة (شريط الهيدر والقايمة) بتتكرر في كل صفحة؛ بتتعرض مرة واحدة فوق
const counts = new Map();
for (const p of disc.pages) for (const b of new Set((p.buttons || []).map((b) => b.text + '|' + b.calls.join(',')))) counts.set(b, (counts.get(b) || 0) + 1);
const GLOBAL = new Set([...counts].filter(([, n]) => n >= Math.ceil(disc.pages.length * 0.8)).map(([k]) => k));

const reached = new Set();
let md = `# الجرد الوظيفي لكل صفحة (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ \`node tools/discovery/discover-pages.js\` ثم \`node tools/discovery/build-functional-inventory.js\`. ماتعدّلش الملف باليد.
> **البيانات:** مُركّبة بس (${esc(disc.data)})، والساعة متثبّتة على ${disc.fixedTime.slice(0, 10)}. **الوضع:** ${esc(disc.mode)}.
> **النوافذ:** الأداة بتفتح بس أزرار الإضافة/التعديل/العرض (لحد ${disc.maxDialogsPerPage} لكل صفحة)، وعمرها ما بتدوس حذف أو حفظ أو تصدير أو طباعة أو اعتماد. الأفعال دي متجرّدة من الأزرار نفسها (النص والدالة)، ومش متنفّذة.
> **الأرقام:** كل صفحة ونافذة ودالة ليها \`LEG-\` من \`REQUIREMENTS_REGISTRY.md\`.

`;
const pages = disc.pages;
const totals = { pages: pages.length, nav: pages.filter((p) => p.inNavigation).length, dialogs: pages.reduce((n, p) => n + p.dialogs.filter((d) => d.opened).length, 0), buttons: 0, fields: 0, tables: 0, errors: disc.jsErrors.length };
for (const p of pages) { totals.buttons += (p.buttons || []).filter((b) => !GLOBAL.has(b.text + '|' + b.calls.join(','))).length; totals.fields += (p.fields || []).length; totals.tables += (p.tables || []).length; }

md += `## الملخص
| المقياس | القيمة |
|---|---|
| الصفحات | ${totals.pages} (منها ${totals.nav} في القايمة) |
| أزرار خاصة بالصفحات (من غير الهيدر والقايمة) | ${totals.buttons} |
| خانات إدخال في الصفحات | ${totals.fields} |
| جداول | ${totals.tables} |
| نوافذ اتفتحت فعلًا | ${totals.dialogs} |
| أخطاء JS أثناء الاستكشاف | ${totals.errors} |

## الهيدر والقايمة (مشتركين في كل الصفحات، ومستبعدين من جرد كل صفحة)
- **الهيدر:** ${(disc.chrome ? disc.chrome.header : []).map((b) => `${esc(b.text) || '(أيقونة)'}${b.id ? ` (\`${b.id}\`)` : ''}`).join(' · ') || '—'}
- **أقسام القايمة (${disc.chrome ? disc.chrome.sections.length : 0}):** ${(disc.chrome ? disc.chrome.sections : []).map((x) => `${esc(x.text)} (\`${x.section}\`)`).join(' · ') || '—'}

## فهرس الصفحات
| ID | الصفحة | القسم | المكان المستهدف | أفعال | نوافذ اتفتحت | لقطة |
|---|---|---|---|---|---|---|
`;
for (const p of pages) {
  const r = pageReq.get(p.key) || {};
  const own = (p.buttons || []).filter((b) => !GLOBAL.has(b.text + '|' + b.calls.join(',')));
  md += `| ${r.id || '—'} | [${esc(p.label || p.key)}](#${p.key.replace(/\./g, '')}) | ${esc(p.section || '—')} | ${esc(r.target || '')} | ${own.length} | ${p.dialogs.filter((d) => d.opened).length} | ${p.screenshots ? `[ديسكتوب](${p.screenshots.desktop})${p.screenshots.mobile ? ` · [موبايل](${p.screenshots.mobile})` : ''}` : '—'} |\n`;
}
md += '\n';

for (const p of pages) {
  const r = pageReq.get(p.key) || {};
  const own = (p.buttons || []).filter((b) => !GLOBAL.has(b.text + '|' + b.calls.join(',')));
  const byKind = {};
  for (const b of own) (byKind[kindOf(b.text + ' ' + b.calls.join(' '))] ||= []).push(b);
  const linked = new Map();
  for (const b of own) for (const f of callsOf(b)) { const e = fnToReq.get(f); if (e) { linked.set(e.id, e); reached.add(e.id); } }
  for (const d of p.dialogs) for (const b of d.buttons || []) for (const f of callsOf(b)) { const e = fnToReq.get(f); if (e) { linked.set(e.id, e); reached.add(e.id); } }
  md += `### <a id="${p.key.replace(/\./g, '')}"></a>${esc(p.label || p.key)} — \`${p.key}\` — ${r.id || '—'}
- **القسم:** ${esc(p.section || '—')} · **في القايمة:** ${p.inNavigation ? 'أيوه' : 'لأ'} · **دالة الرسم:** \`${p.renderFn || '—'}\` (${esc(p.definedAt || '—')})
- **المكان المستهدف:** ${esc(r.target || '—')} · **الاختبارات:** ${esc((r.tests || []).join('، ') || '—')}
- **العنوان الظاهر:** ${esc(p.heading || '—')} · **التبويبات:** ${esc((p.tabs || []).join('، ') || '—')}
- **اللقطات:** ${p.screenshots ? `[ديسكتوب](${p.screenshots.desktop})${p.screenshots.mobile ? ` · [موبايل](${p.screenshots.mobile})` : ''}` : '—'}${p.threw || p.jsErrors ? ` · ⚠️ ${esc(p.threw || '')} أخطاء JS: ${p.jsErrors}` : ''}

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
${Object.entries(byKind).sort().map(([k, bs]) => `| ${KIND_AR[k] || k} | ${bs.map((b) => `${esc(b.text) || '(أيقونة)'}${callsOf(b).length ? ` ← \`${callsOf(b).join('`, `')}\`` : ''}`).join(' · ')} |`).join('\n') || '| — | — |'}

**الجداول:** ${(p.tables || []).length ? (p.tables || []).map((t, i) => `(${i + 1}) ${t.headers.length ? esc(t.headers.join('، ')) : 'من غير عناوين'} — ${t.rows} صف`).join(' · ') : 'مفيش'}
**الخانات (${(p.fields || []).length}):** ${esc((p.fields || []).map((f) => f.label || f.id || f.tag).filter(Boolean).slice(0, 25).join('، ') || '—')}${(p.fields || []).length > 25 ? '…' : ''}
${linked.size ? `**مربوط بالسجل:** ${[...linked.values()].map((e) => `${e.id} (${esc(e.title)})`).join(' · ')}` : ''}
${p.dialogs.length ? `\n**النوافذ:**\n| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |\n|---|---|---|---|---|---|\n${p.dialogs.map((d) => `| ${esc(d.opener)} | ${d.opened ? 'أيوه' : 'لأ'} | ${esc(d.heading || '—')} | ${d.opened ? `${(d.fields || []).length}: ${esc((d.fields || []).map((f) => f.label || f.id).filter(Boolean).slice(0, 12).join('، '))}` : '—'} | ${d.opened ? esc((d.buttons || []).map((b) => b.text).filter(Boolean).slice(0, 10).join('، ')) : '—'} | ${d.screenshot ? `[لقطة](${d.screenshot})` : '—'} |`).join('\n')}\n` : ''}
`;
}

// تغطية النوافذ ودوال التصدير: اللي اتوصلّه من الواجهة فعلًا مقابل الجرد الثابت بس
const kinds = [['modal', 'النوافذ'], ['export/print', 'التصدير والطباعة'], ['data-write', 'كتابة البيانات']];
md += `## تغطية الربط (معيار P3-B)
كل نافذة ودالة تصدير وكتابة ليها \`LEG-\` من الجرد الثابت. الجدول ده بيقول مين فيهم اتوصلّه **من زرار ظاهر** في الاستكشاف الفعلي، والباقي اتجرد من الكود بس (بيتفتح من سياق تاني، زي صف معيّن في جدول أو حالة بيانات مختلفة).

| النوع | الإجمالي | اتوصلّه من زرار ظاهر | من الكود بس |
|---|---|---|---|
${kinds.map(([k, ar]) => { const all = reg.entries.filter((e) => e.kind === k); const r = all.filter((e) => reached.has(e.id)).length; return `| ${ar} | ${all.length} | ${r} | ${all.length - r} |`; }).join('\n')}

<details><summary>القائمة الكاملة للنوافذ والتصدير والكتابة اللي ماتوصلّهاش من زرار ظاهر</summary>

| ID | النوع | الدالة | الدليل |
|---|---|---|---|
${reg.entries.filter((e) => kinds.some(([k]) => k === e.kind) && !reached.has(e.id)).map((e) => `| ${e.id} | ${e.kind} | ${esc(e.title)} | ${esc(e.evidence)} |`).join('\n')}

</details>
`;

const file = path.join(D, 'FUNCTIONAL_INVENTORY.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/discovery/FUNCTIONAL_INVENTORY.md'); process.exit(1); }
  console.log('functional inventory up to date');
} else {
  fs.writeFileSync(file, md);
  console.log(`functional inventory: ${pages.length} pages, ${totals.dialogs} dialogs, reached ${reached.size} registry items from visible buttons`);
}
