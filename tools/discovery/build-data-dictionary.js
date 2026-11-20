// قاموس البيانات (خطة v1.4.5 — المرحلة 3، البند 3.6؛ 04 §10.3). قراءة بس.
// المصادر:
//  - docs/web/collections-map.json: كل مسار في DATA (النوع، الوحدة، التخزين، المراجع في الكود)
//  - tools/security/xss-shape.json: أسماء الحقول وأنواعها في البيانات الحقيقية (**أسماء بس، من غير قيم**)
//  - tools/security/xss-seed.js (MANUAL): حقول المجموعات اللي مالهاش بيانات حقيقية (مُركّبة)
//  - docs/audit/page-crawl-file-real.json: أعداد السجلات الحقيقية (مجاميع بس)
//  - renderer/core/data-store.js: ترحيلات DATA (schemaVersion 1 ← 9)
//  - server/src/migrations/*.ts: جداول السيرفر وأعمدتها
// المخرج: docs/discovery/DATA_DICTIONARY.md   التشغيل: node tools/discovery/build-data-dictionary.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const cmap = JSON.parse(read('docs/web/collections-map.json'));
const shape = JSON.parse(read('tools/security/xss-shape.json'));
const realCounts = (JSON.parse(read('docs/audit/page-crawl-file-real.json')).recordCounts) || {};
const seedSrc = read('tools/security/xss-seed.js');
const manualFields = {};
for (const m of seedSrc.matchAll(/^\s*'([\w.]+)':\s*\[\{([^\n]*)\}\],?\s*$/gm)) manualFields[m[1]] = [...new Set([...m[2].matchAll(/(?:^\s*|[,{]\s*)([A-Za-z_]\w*)\s*:/g)].map((x) => x[1]))];

// ترحيلات DATA
const ds = read('renderer/core/data-store.js');
const SCHEMA_VERSION = (ds.match(/const SCHEMA_VERSION = (\d+)/) || [])[1];
const migBlock = (ds.match(/const SCHEMA_MIGRATIONS = \{([\s\S]*?)\n\};/) || [, ''])[1];
const migrations = [];
let pendingComment = '';
for (const line of migBlock.split('\n')) {
  const c = line.match(/^\s*\/\/\s*(.*)$/);
  if (c) { pendingComment = c[1].replace(/^\d+:\s*/, '').trim(); continue; }
  const v = line.match(/^\s*(\d+):\s*function\(\)\{(.*)/);
  if (v) { const fn = (v[2].match(/typeof (\w+) === 'function'/) || v[2].match(/forEach\((\w+)\)/) || [])[1] || '(inline)'; migrations.push({ v: Number(v[1]), comment: pendingComment, fn }); pendingComment = ''; }
}

// جداول السيرفر من الـ migrations (parser صغير للأقواس المتداخلة)
const migDir = path.join(ROOT, 'server/src/migrations');
const tables = new Map();
for (const f of fs.readdirSync(migDir).filter((x) => /^\d+-.*\.ts$/.test(x)).sort()) {
  const src = fs.readFileSync(path.join(migDir, f), 'utf8');
  const re = /CREATE TABLE (?:IF NOT EXISTS )?"?(\w+)"?\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex, depth = 1;
    while (i < src.length && depth) { if (src[i] === '(') depth++; else if (src[i] === ')') depth--; i++; }
    const body = src.slice(re.lastIndex, i - 1);
    // تقسيم على الفواصل في المستوى الأول بس
    const parts = []; let d = 0, cur = '';
    for (const ch of body) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; }
    if (cur.trim()) parts.push(cur);
    const cols = [], constraints = [];
    for (const p of parts.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
      const cm = p.match(/^"?([a-z_][a-z0-9_]*)"?\s+([A-Za-z][\w ]*?(?:\([^)]*\))?(?:\[\])?)(?:\s|$)(.*)$/i);
      if (cm && !/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN|EXCLUDE)$/i.test(cm[1])) cols.push({ name: cm[1], type: cm[2].trim(), extra: cm[3].trim() });
      else constraints.push(p);
    }
    if (!tables.has(m[1])) tables.set(m[1], { migration: f.replace(/\.ts$/, ''), cols, constraints });
  }
}

// الربط بين DATA والسيرفر (ADR-009: طبقة JSONB انتقالية، والموديولات اللي اتنقلت بقت جداول علائقية)
const RELATIONAL = {
  'ledger.suppliers': 'suppliers (6.1، cutover parties)',
  'clients.customers': 'customers + customer_contacts (6.1، cutover parties)',
  projects: 'projects (5.2، PROJECTS_SOURCE)',
  'warehouses.items': 'wh_items (6.2، cutover warehouses)',
  'warehouses.locations': 'wh_locations (6.2، cutover warehouses)',
  'warehouses.movements': 'wh_movements (6.2، cutover warehouses)',
  users: 'users (جدول نظام)',
  auditLog: 'audit_log (جدول نظام، إلحاقي)',
};
const target = (p, e) => RELATIONAL[p] || ({ collection: 'records', lookup: 'docs', doc: 'docs', 'meta-flag': 'docs (meta)', 'system-table': 'جدول مخصص', 'legacy-ref': '— (مرجع قديم، مفيش تخزين)' })[e.kind] || e.storage || '—';

const entries = Object.entries(cmap.entries).sort((a, b) => a[0].localeCompare(b[0]));
const kinds = {};
for (const [, e] of entries) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
const totalReal = Object.values(realCounts).reduce((a, b) => a + (Number(b) || 0), 0);

let md = `# قاموس البيانات (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ \`node tools/discovery/build-data-dictionary.js\`. ماتعدّلش الملف باليد.
> **مفيش أي قيمة من البيانات الحقيقية هنا.** أسماء الحقول وأنواعها من \`tools/security/xss-shape.json\` (اتولّد من البيانات الحقيقية بأسماء الحقول بس)، والأعداد مجاميع من زحف سابق على البيانات الحقيقية (\`docs/audit/page-crawl-file-real.json\`)، والحقول المُركّبة من \`tools/security/xss-seed.js\`.
> **المرحلة 2** قاست الحجم الكلي: 4,900 عنصر في 28 مجموعة فيها بيانات، وقاعدة 22 MB، و108 مرفق (\`PHASE_02_AFTER_REPORT.md\` §ج).

## 1. الملخص
| المقياس | القيمة |
|---|---|
| إصدار شكل البيانات (\`SCHEMA_VERSION\`) | ${SCHEMA_VERSION} |
| المسارات في DATA | ${entries.length} (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join('، ')}) |
| مجموعات ليها شكل حقول من البيانات الحقيقية | ${Object.keys(shape).length} |
| مجموع السجلات الحقيقية (من الزحف السابق) | ${totalReal.toLocaleString('en')} في ${Object.values(realCounts).filter((n) => n > 0).length} مسار فيه بيانات |
| جداول السيرفر | ${tables.size} من الـ migrations + جدول \`migrations\` بتاع TypeORM = ${tables.size + 1} (نفس العدد اللي المرحلة 2 قاسته) |

## 2. ترحيلات شكل البيانات في الواجهة القديمة (1 ← ${SCHEMA_VERSION})
| الإصدار | الوصف | الدالة |
|---|---|---|
${migrations.map((m) => `| ${m.v} | ${esc(m.comment || '—')} | \`${m.fn}\` |`).join('\n')}

القاعدة: ملف بإصدار أحدث من ${SCHEMA_VERSION} **مابيتلمسش** (\`runSchemaMigrations\`)، والواجهة بتشتغل قراءة بس (\`__schemaTooNew\`).

## 3. مسارات DATA ومكانها على السيرفر
| المسار | النوع | الوحدة | سجلات حقيقية | مكانه على السيرفر | مراجع في الكود | الملفات |
|---|---|---|---|---|---|---|
${entries.map(([p, e]) => `| \`${p}\` | ${e.kind} | ${e.unit || '—'} | ${p in realCounts ? realCounts[p] : '—'} | ${esc(target(p, e))} | ${e.refs ?? '—'} | ${esc((e.files || []).slice(0, 3).join('، '))}${(e.files || []).length > 3 ? '…' : ''} |`).join('\n')}

## 4. حقول المجموعات
`;
const fieldColls = [...new Set([...Object.keys(shape), ...Object.keys(manualFields)])].sort();
for (const c of fieldColls) {
  const real = shape[c];
  md += `### \`${c}\` ${real ? '(من شكل البيانات الحقيقية)' : '(حقول مُركّبة — مفيش بيانات حقيقية)'}${c in realCounts ? ` — ${realCounts[c]} سجل حقيقي` : ''}\n`;
  if (real) {
    md += `| الحقل | النوع | قيم محددة (enum) |\n|---|---|---|\n${Object.entries(real).map(([k, v]) => `| \`${k}\` | ${v.type}${v.types ? ` (${v.types.join('/')})` : ''} | ${v.enums ? esc(v.enums.join('، ')) : '—'} |`).join('\n')}\n\n`;
  } else {
    md += `الحقول: ${manualFields[c].map((k) => `\`${k}\``).join('، ')}\n\n`;
  }
}
const noFields = entries.filter(([p, e]) => e.kind === 'collection' && !fieldColls.includes(p)).map(([p]) => p);
md += `**مجموعات من غير شكل حقول متسجّل** (مفيش بيانات حقيقية ولا مُركّبة ليها، والحقول بتتعرف من الكود وقت نقل الموديول): ${noFields.map((p) => `\`${p}\``).join('، ') || '—'}

## 5. جداول السيرفر (PostgreSQL)
`;
for (const [t, v] of [...tables].sort((a, b) => a[0].localeCompare(b[0]))) {
  md += `### \`${t}\` — \`${v.migration}\`\n| العمود | النوع | قيود |\n|---|---|---|\n${v.cols.map((c) => `| \`${c.name}\` | \`${esc(c.type)}\` | ${esc(c.extra.slice(0, 120)) || '—'} |`).join('\n')}\n${v.constraints.length ? `\n**قيود الجدول:** ${v.constraints.map((x) => `\`${esc(x.slice(0, 140))}\``).join(' · ')}\n` : ''}\n`;
}

const file = path.join(ROOT, 'docs/discovery/DATA_DICTIONARY.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/discovery/DATA_DICTIONARY.md'); process.exit(1); }
  console.log('data dictionary up to date');
} else {
  fs.writeFileSync(file, md);
  console.log(`data dictionary: ${entries.length} DATA paths, ${fieldColls.length} collections with fields, ${tables.size} server tables, ${migrations.length} schema migrations`);
}
