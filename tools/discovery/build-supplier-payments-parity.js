// مصفوفة تطابق الحقول — دفعات الموردين (خطة v1.4.5 — المرحلة 7، الحزمة 7.3؛ نفس معيار 7.2). قراءة بس.
// أسماء الحقول: من السجل اللي نافذة الفاتورة القديمة بتكتبه (m_save في openAddEditInvoiceModal) + اللي saveInvoiceData/recalcLinkedOriginal بيضيفوه
// + شكل البيانات الحقيقية (tools/security/xss-shape.json، أسماء وأنواع بس) + البيانات المُركّبة (tools/security/xss-seed.js).
// المكان في القاعدة من أعمدة الـ migration (SUPPLIER_INVOICE_COLUMNS): الحقل بيروح عموده لو نوعه مطابق، وغير كده legacy_extra زي ما هو.
// المخرج: docs/modules/SUPPLIER_PAYMENTS_FIELD_PARITY.md   التشغيل: node tools/discovery/build-supplier-invoices-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const shape = JSON.parse(read('tools/security/xss-shape.json'));
const seed = read('tools/security/xss-seed.js');
const mig = read('server/src/migrations/1765000000000-SupplierPayments.ts');
const modals = read('renderer/modules/ledger/modals.js');
const helpers = read('renderer/modules/ledger/helpers.js');
const PAGE = 'frontend/src/app/features/supplier-payments.page.ts';
const page = fs.existsSync(path.join(ROOT, PAGE)) ? read(PAGE).split('\n').filter((l) => !/^\s*interface /.test(l)).join('\n') : null;

/** أعمدة الجدول: [عمود، مفتاح، نوع] من مصفوفة COLS في الـ migration */
const colsBlock = mig.slice(mig.indexOf('const COLS'), mig.indexOf('];', mig.indexOf('const COLS')));
const COLS = [...colsBlock.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] }));
const byKey = Object.fromEntries(COLS.map((c) => [c.key, c]));
const JSON_TYPE = { text: 'string', number: 'number', json: 'object' };

/** مفاتيح كائن fields في زرار الحفظ */
// مفاتيح سجل الدفعة في الحفظ القديم: DATA.ledger.payments.push({ ... }) في openPaymentModal
const pushAt = modals.indexOf('DATA.ledger.payments.push({', modals.indexOf('function openPaymentModal('));
const pushLine = modals.slice(pushAt + 'DATA.ledger.payments.push({'.length, modals.indexOf('});', pushAt));
const fromModal = [...pushLine.matchAll(/([A-Za-z_]\w*)\s*(?::[^,]*)?(?:,|$)/g)].map((m) => m[1]);
/** اللي saveInvoiceData وrecalcLinkedOriginal بيكتبوه على السجل */
const bodyOf = (src, fn) => { const i = src.indexOf(`function ${fn}(`); return src.slice(i, src.indexOf('\nfunction ', i + 10)); };
const written = ['direction', 'transferRef', 'extraFields', 'notes', 'attachments'];
const seedKeys = (((seed.match(/'ledger\.payments':\s*\[\{([^\n]*)\}\]/) || [])[1] || '').match(/(?:^\s*|[,{]\s*)([A-Za-z_]\w*)\s*:/g) || []).map((x) => x.replace(/[,{:\s]/g, ''));

const real = shape['ledger.payments'] || {};
const fromCode = new Set([...fromModal, ...written, 'id']);
const fields = [...new Set([...fromCode, ...Object.keys(real), ...seedKeys, 'internalNo'])].sort();
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
const NEW_FIELDS = { internalNo: 'جديد (DEC-0113 د-4): الرقم الداخلي `PV-` للدفعة كلها، للجديد بس' };
// حقول ليها مكان ومالهاش خانة في الشاشة الجديدة بقرار
const DEFERRED = { _lastEditRole: 'تدقيق قديم — بيتعرض في سجل التدقيق مش في الشاشة', _lastEditBy: 'تدقيق قديم — بيتعرض في سجل التدقيق مش في الشاشة', attachments: 'عرض بس، والإضافة من الشاشة الكاملة', batchId: 'ربط سجلات الدفعة الموزّعة (بيتعرض كدفعة واحدة)' };
const inNew = (k) => page && new RegExp(`\\b${k}\\b`).test(page);

const counts = { column: 0, extra: 0, mismatch: 0 };
let rows = '';
for (const k of fields) {
  const r = real[k];
  let where, kind;
  if (SYSTEM[k]) { where = SYSTEM[k]; kind = 'column'; }
  else if (byKey[k]) {
    const c = byKey[k];
    const ok = !r || r.type === JSON_TYPE[c.type] || (c.type === 'json' && (r.type === 'object' || r.type === 'array'));
    where = `عمود \`${c.col}\` (${c.type})${ok ? '' : ` — ⚠️ النوع في البيانات الحقيقية ${r.type}: بيفضل في \`legacy_extra\``}`;
    kind = 'column'; if (!ok) counts.mismatch++;
  } else { where = '`legacy_extra` (محفوظ زي ما هو)'; kind = 'extra'; }
  counts[kind]++;
  const origin = NEW_FIELDS[k] ? NEW_FIELDS[k] : r ? r.type : fromCode.has(k) ? '(من الكود القديم)' : '(مُركّبة)';
  const shown = !page ? '(الشاشة في 7.3.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : !fromCode.has(k) && !r && !NEW_FIELDS[k] ? '— (مُركّبة بس)' : '—';
  rows += `| \`${k}\` | ${origin} | ${where} | ${shown} |\n`;
}
const missing = page ? fields.filter((k) => (fromCode.has(k) || real[k]) && !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];

const md = `# مصفوفة تطابق الحقول — دفعات الموردين (خطة v1.4.5 — المرحلة 7، الحزمة 7.3)

> **مولَّد** بـ \`node tools/discovery/build-supplier-payments-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة الدفعة القديمة بتكتبه (\`renderer/modules/ledger/modals.js\` \`openPaymentModal\`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، والبيانات المُركّبة، وأعمدة الجدول (\`server/src/migrations/1765000000000-SupplierPayments.ts\`)، و${page ? `شاشة \`${PAGE}\`` : 'الشاشة الجديدة (لسه، 7.3.5)'}.
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في \`legacy_extra\` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (\`untyped\`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## الدفعات (\`ledger.payments\` ← جدول \`supplier_payments\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 7.3.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}
## الخلاصة (P7.3-B)
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في \`legacy_extra\`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **المبلغ** \`numeric\` من غير scale: القديم بكل خاناته. الجديد من الـ API بست خانات HALF_UP (B-25 بعد DEC-0112).
`;
const file = path.join(ROOT, 'docs/modules/SUPPLIER_PAYMENTS_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/modules/SUPPLIER_PAYMENTS_FIELD_PARITY.md'); process.exit(1); }
  console.log('supplier payments parity up to date');
} else { fs.writeFileSync(file, md); console.log(`supplier payments parity written: ${fields.length} fields, ${counts.column} columns, ${counts.extra} extra, ${counts.mismatch} type mismatches`); }
