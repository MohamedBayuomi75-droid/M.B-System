// مصفوفة تطابق الحقول للموديول التجريبي: الموردين والعملاء (خطة v1.4.5 — المرحلة 6، البند 6.2). قراءة بس.
// لكل حقل في البيانات القديمة (أسماء الحقول من شكل البيانات الحقيقية tools/security/xss-shape.json، من غير قيم):
//   مكانه في القاعدة (عمود / legacy_extra / جدول جهات الاتصال / legacy) ← هل الشاشة الجديدة /app/ بتعرضه وبتعدّله
//   ← هل نافذة الإضافة في الواجهة القديمة فيها خانة ليه (من page-discovery.json).
// المعيار P6-B: كل حقل ليه مكان. «legacy_extra» = محفوظ زي ما هو ومش ضايع، بس مالوش عمود ولا خانة في الشاشة الجديدة.
// المخرج: docs/modules/PARTIES_FIELD_PARITY.md   التشغيل: node tools/discovery/build-parties-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const shape = JSON.parse(read('tools/security/xss-shape.json'));
const cut = read('server/src/migrations/1764100000000-PartiesCutover.ts');
const disc = JSON.parse(read('docs/discovery/page-discovery.json'));
const seed = read('tools/security/xss-seed.js');

// الحقول اللي ليها عمود: المفاتيح المستبعدة من legacy_extra في أمر الكتابة (p - ARRAY[...])
function mappedKeys(table) {
  const block = cut.slice(cut.indexOf(`INSERT INTO ${table} AS`));
  const m = block.match(/p - ARRAY\[([^\]]+)\]/);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}
const MODULES = [
  {
    name: 'الموردين', coll: 'ledger.suppliers', table: 'suppliers', page: 'frontend/src/app/features/suppliers.page.ts',
    legacyPage: 'ledger.suppliers', opener: /إضافة مورد/,
    special: {},
  },
  {
    name: 'العملاء', coll: 'clients.customers', table: 'customers', page: 'frontend/src/app/features/customers.page.ts',
    legacyPage: 'clients.customers', opener: /عميل/,
    special: { contacts: 'جدول `customer_contacts` (صف لكل جهة اتصال)' },
  },
];
const LEGACY_ARRAYS = ['projects', 'contracts', 'invoices', 'collections', 'workSurveys', 'boqs', 'guarantees', 'ledger', 'comms', 'opportunities', 'docs', 'attachments'];
const SYSTEM = { id: 'المفتاح الأساسي `id`', createdAt: '`created_at`', updatedAt: '`updated_at`', rev: '`row_version` (+ `legacy_rev`)' };

let md = `# مصفوفة تطابق الحقول — الموردين والعملاء (خطة v1.4.5 — المرحلة 6، البند 6.2)

> **مولَّد** بـ \`node tools/discovery/build-parties-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** أسماء الحقول من شكل البيانات الحقيقية (\`tools/security/xss-shape.json\`، أسماء بس)، وأمر الكتابة في الجداول (\`server/src/migrations/1764100000000-PartiesCutover.ts\`)، وشاشات \`/app/\`، ونافذة الإضافة في الواجهة القديمة (\`docs/discovery/page-discovery.json\`).
> **المعنى:** «عمود» = ليه عمود في الجدول. «legacy_extra» = **محفوظ زي ما هو** في عمود JSON ومابيضيعش، والواجهة القديمة بتقراه وتكتبه عادي، بس مالوش عمود ولا خانة في الشاشة الجديدة.

`;
let missing = 0;
for (const M of MODULES) {
  const real = shape[M.coll] || {};
  const seedFields = ((seed.match(new RegExp(`'${M.coll.replace('.', '\\.')}':\\s*\\[\\{([^\\n]*)\\}\\]`)) || [])[1] || '').match(/(?:^\s*|[,{]\s*)([A-Za-z_]\w*)\s*:/g) || [];
  const fields = [...new Set([...Object.keys(real), ...seedFields.map((x) => x.replace(/[,{:\s]/g, ''))])].sort();
  const mapped = new Set(mappedKeys(M.table));
  // الشاشة الجديدة: من غير تعريفات الأنواع (interface)، عشان الحقل يتحسب «في الشاشة» بس لو ليه خانة أو عرض فعلي
  const pageSrc = read(M.page).split('\n').filter((l) => !/^\s*export interface /.test(l)).join('\n');
  const lp = disc.pages.find((p) => p.key === M.legacyPage) || { dialogs: [] };
  const dlg = lp.dialogs.find((d) => d.opened && M.opener.test(d.opener)) || { fields: [] };
  const legacyLabels = (dlg.fields || []).map((f) => f.label).filter(Boolean);
  const inNew = (k) => new RegExp(`\\b${k}\\b`).test(pageSrc);
  let rows = '';
  const counts = { column: 0, extra: 0, special: 0 };
  for (const k of fields) {
    let where, kind;
    if (SYSTEM[k]) { where = SYSTEM[k]; kind = 'column'; }
    else if (M.special[k]) { where = M.special[k]; kind = 'special'; }
    else if (mapped.has(k)) { where = `عمود \`${k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())}\``; kind = 'column'; }
    else if (LEGACY_ARRAYS.includes(k)) { where = '`legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه)'; kind = 'extra'; }
    else { where = '`legacy_extra` (محفوظ زي ما هو)'; kind = 'extra'; }
    counts[kind]++;
    const t = real[k] ? `${real[k].type}${real[k].enums ? ` (${real[k].enums.join('/')})` : ''}` : '(مُركّب)';
    rows += `| \`${k}\` | ${t} | ${where} | ${inNew(k) ? '✅' : '—'} |\n`;
  }
  md += `## ${M.name} (\`${M.coll}\` ← جدول \`${M.table}\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، و${M.special && Object.keys(M.special).length ? `جدول تابع: **${counts.special}**، و` : ''}محفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0** (أي حقل مش معروف بيروح \`legacy_extra\` تلقائيًا بأمر الكتابة نفسه).
- **خانات نافذة الإضافة في الواجهة القديمة** (${dlg.opened ? `«${dlg.heading || dlg.opener}»، ${(dlg.fields || []).length} خانة، من الاستكشاف الفعلي` : 'مااتفتحتش في الاستكشاف'}): ${legacyLabels.slice(0, 20).join('، ') || '—'}
- **ناقص في الشاشة الجديدة:** ${fields.filter((k) => !inNew(k) && !SYSTEM[k] && (mapped.has(k) || M.special[k])).map((k) => `\`${k}\``).join('، ') || 'مفيش'} (حقول ليها مكان في القاعدة ومالهاش خانة في /app/)

| الحقل القديم | النوع (من البيانات الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}
`;
}
md += `## الخلاصة (P6-B)
- **كل حقل ليه مكان**: عمود، أو جدول تابع، أو \`legacy_extra\`. ومفيش حقل بيضيع، لأن أمر الكتابة في الجداول بيحط أي مفتاح مش معروف في \`legacy_extra\` (\`p - ARRAY[...]\`)، واختبار التكافؤ في أمر النقل بيقارن كل سجل بعد النقل (\`cutover … dry-run\`).
- **الحقول اللي في \`legacy_extra\` مالهاش خانة في الشاشة الجديدة.** بتتعدّل من «الشاشة الكاملة» في الواجهة القديمة (موجود رابط ليها من \`/app/\`)، أو تاخد عمود لما الموديول بتاعها يتنقل (الفواتير، والعقود…). ده **متوافق مع النطاق المعتمد** (S7، C5 متأجلين).
`;
const file = path.join(ROOT, 'docs/modules/PARTIES_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/modules/PARTIES_FIELD_PARITY.md'); process.exit(1); }
  console.log('parties parity up to date');
} else { fs.writeFileSync(file, md); console.log('parties parity written'); }
