// مصفوفة تطابق الحقول — المخازن (خطة v1.4.5 — المرحلة 7، الحزمة 7.1؛ نفس معيار P6-B). قراءة بس.
// أسماء الحقول: من السجلات اللي الواجهة القديمة بتكتبها (openWhItemModal / openWhLocationModal / openWhMovementModal / whAddMovement)
// + شكل البيانات الحقيقية (tools/security/xss-shape.json، أسماء بس: فيه المخازن، ومفيش أصناف ولا حركات حقيقية)
// + البيانات المُركّبة (tools/security/xss-seed.js). المكان في القاعدة من أمر الكتابة في الجداول (الـ migration).
// الحقل اللي مالوش عمود بيروح legacy_extra تلقائيًا (p - ARRAY[...]) فمابيضيعش.
// المخرج: docs/modules/WAREHOUSES_FIELD_PARITY.md   التشغيل: node tools/discovery/build-warehouses-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const shape = JSON.parse(read('tools/security/xss-shape.json'));
const seed = read('tools/security/xss-seed.js');
const mig = read('server/src/migrations/1764600000000-WarehousesCutover.ts');
const legacy = read('renderer/modules/warehouses/pages-home.js') + read('renderer/modules/warehouses/helpers.js');
const page = read('frontend/src/app/features/warehouses.page.ts').split('\n').filter((l) => !/^\s*interface /.test(l)).join('\n');

/** المفاتيح الممسوكة بأعمدة: آخر مصفوفة في استدعاء upsert('<table>', ...) */
function mapped(table) {
  const i = mig.indexOf(`upsert('${table}'`);
  const block = mig.slice(i, mig.indexOf('$$`', i));
  const arrays = [...block.matchAll(/\[('[^\]]*')\]\)/g)];
  return arrays.length ? [...arrays[arrays.length - 1][1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}
/** مفاتيح كائن في دالة قديمة: const <name> = { ... }; */
function objKeys(fnName, varName) {
  const i = legacy.indexOf(`function ${fnName}(`);
  const body = legacy.slice(i, legacy.indexOf('\nfunction ', i + 10));
  const j = body.indexOf(`const ${varName} = {`);
  if (j < 0) return [];
  const obj = body.slice(j, body.indexOf('};', j));
  return [...obj.matchAll(/^\s*([A-Za-z_]\w*)\s*:/gm)].map((m) => m[1]);
}
const seedKeys = (coll) => (((seed.match(new RegExp(`'${coll.replace('.', '\\.')}':\\s*\\[\\{([^\\n]*)\\}\\]`)) || [])[1] || '').match(/(?:^\s*|[,{]\s*)([A-Za-z_]\w*)\s*:/g) || []).map((x) => x.replace(/[,{:\s]/g, ''));

const MODULES = [
  { name: 'المخازن (المواقع)', coll: 'warehouses.locations', table: 'wh_locations', fields: ['id', 'name', 'notes'] },
  { name: 'الأصناف', coll: 'warehouses.items', table: 'wh_items', fields: objKeys('openWhItemModal', 'rec') },
  { name: 'الحركات', coll: 'warehouses.movements', table: 'wh_movements', fields: [...objKeys('openWhMovementModal', 'm'), 'adjustmentId', 'adjustmentKind'] },
];
const SYSTEM = { id: 'المفتاح الأساسي `id`', createdAt: '`created_at`', updatedAt: '`updated_at`', rev: '`row_version`' };
const snake = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
/** في الشاشة الجديدة: الاسم ظاهر في القالب أو الكود (خانة أو عرض) */
const inNew = (k) => new RegExp(`\\b${k}\\b`).test(page);
// حقول ليها مكان بس مالهاش خانة في /app/ بقرار (التكلفة لحد B-20)
const DEFERRED = { adjustmentId: 'الربط بالتسوية — التسوية نفسها في تبويب «التسويات»', adjustmentKind: 'نوع التسوية — في تبويب «التسويات»', avgCost: 'عرض بس (التكلفة لحد B-20)', lastCost: 'عرض بس (التكلفة لحد B-20)', unitCost: 'الاستلام والصرف بتكلفتهم من الشاشة الكاملة (B-20)', supplierInvoiceId: 'عرض في عمود «مرجع». الربط وقت الاستلام من الشاشة الكاملة', supplierName: 'عرض في عمود «مرجع»', project: 'عرض في عمود «مرجع». الصرف من الشاشة الكاملة' };

let md = `# مصفوفة تطابق الحقول — المخازن (خطة v1.4.5 — المرحلة 7، الحزمة 7.1)

> **مولَّد** بـ \`node tools/discovery/build-warehouses-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** السجلات اللي الواجهة القديمة بتكتبها (\`renderer/modules/warehouses/\`)، وشكل البيانات الحقيقية (أسماء بس: فيها المخازن، **ومفيش أصناف ولا حركات حقيقية**)، والبيانات المُركّبة، وأمر الكتابة في الجداول (\`server/src/migrations/1764600000000-WarehousesCutover.ts\`)، وشاشة \`/app/warehouses\`.
> **المعنى:** «عمود» = ليه عمود. «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

`;
for (const M of MODULES) {
  const real = shape[M.coll] || {};
  const fromCode = new Set([...M.fields, ...Object.keys(real)]);
  const fields = [...new Set([...fromCode, ...seedKeys(M.coll)])].sort();
  const cols = new Set(mapped(M.table));
  const counts = { column: 0, extra: 0 };
  let rows = '';
  for (const k of fields) {
    let where, kind;
    if (SYSTEM[k]) { where = SYSTEM[k]; kind = 'column'; }
    else if (cols.has(k)) { where = `عمود \`${snake(k)}\``; kind = 'column'; }
    else { where = '`legacy_extra` (محفوظ زي ما هو)'; kind = 'extra'; }
    counts[kind]++;
    // حقل في البيانات المُركّبة بس (مش بيتكتب من الواجهة القديمة ولا موجود في البيانات الحقيقية): مكانه legacy_extra، ومالوش خانة في أي واجهة
    const shown = !fromCode.has(k) ? '— (مش في الواجهة القديمة: البيانات المُركّبة بس)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
    rows += `| \`${k}\` | ${real[k] ? real[k].type : fromCode.has(k) ? '(من الكود القديم)' : '(مُركّبة)'} | ${where} | ${shown} |\n`;
  }
  const missing = fields.filter((k) => fromCode.has(k) && !SYSTEM[k] && !inNew(k) && !DEFERRED[k]);
  md += `## ${M.name} (\`${M.coll}\` ← جدول \`${M.table}\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **ناقص في الشاشة الجديدة من غير قرار:** ${missing.map((k) => `\`${k}\``).join('، ') || 'مفيش'}

| الحقل القديم | النوع | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}
`;
}
md += `## الخلاصة (P7-B)
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف في \`legacy_extra\`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **حقول التكلفة** ليها أعمدة (\`numeric(18,5)\`، B-26)، وبتتعرض بس من غير حساب لحد اعتماد المعادلة (B-20). والاستلام والصرف بتكلفتهم من الشاشة الكاملة (DEC-0097).
`;
const file = path.join(ROOT, 'docs/modules/WAREHOUSES_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/modules/WAREHOUSES_FIELD_PARITY.md'); process.exit(1); }
  console.log('warehouses parity up to date');
} else { fs.writeFileSync(file, md); console.log('warehouses parity written'); }
