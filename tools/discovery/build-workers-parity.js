// مصفوفة تطابق الحقول — العمال (خطة v1.4.5 — المرحلة 8، الحزمة 8.1؛ نفس معيار 7.x). قراءة بس.
// أسماء الحقول: من السجل اللي نافذة العامل القديمة بتكتبه (payload في openWorkerModal + collectPersonHrFields) + اللي الحفظ بيضيفه (القسم والأرشيف)
// + شكل البيانات الحقيقية (tools/security/xss-shape.json، أسماء وأنواع بس).
// المكان في القاعدة من أعمدة الـ migration (WORKER_COLUMNS): الحقل بيروح عموده لو نوعه مطابق، وغير كده legacy_extra زي ما هو.
// المخرج: docs/modules/WORKERS_FIELD_PARITY.md   التشغيل: node tools/discovery/build-workers-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const shape = JSON.parse(read('tools/security/xss-shape.json'));
const mig = read('server/src/migrations/1765200000000-WorkersCutover.ts');
const modal = read('renderer/modules/hr/pages-workers.js');
const helpers = read('renderer/core/helpers.js');
const PAGE = 'frontend/src/app/features/workers.page.ts';
const page = fs.existsSync(path.join(ROOT, PAGE)) ? read(PAGE).split('\n').filter((l) => !/^\s*interface /.test(l)).join('\n') : null;

const colsBlock = mig.slice(mig.indexOf('const COLS'), mig.indexOf('];', mig.indexOf('const COLS')));
const COLS = [...colsBlock.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] }));
const byKey = Object.fromEntries(COLS.map((c) => [c.key, c]));
const JSON_TYPE = { text: 'string', number: 'number', json: 'object' };

// مفاتيح payload في زرار الحفظ (openWorkerModal) + payload.xxx = ... بعده
const fnAt = modal.indexOf('function openWorkerModal(');
const pAt = modal.indexOf('const payload = {', fnAt);
const pBody = modal.slice(pAt, modal.indexOf('\n        };', pAt));
const fromModal = [...pBody.matchAll(/^\s{10}([A-Za-z_]\w*)\s*:/gm)].map((m) => m[1]);
const assigned = [...modal.slice(pAt, modal.indexOf('const commitWorker', pAt)).matchAll(/payload\.([A-Za-z_]\w*)\s*=/g)].map((m) => m[1]);
// collectPersonHrFields (out = {...} + out.xxx =)
const hrAt = helpers.indexOf('function collectPersonHrFields(');
const hrBody = helpers.slice(hrAt, helpers.indexOf('\nfunction ', hrAt + 10));
const fromHr = [...hrBody.matchAll(/^\s{4}([A-Za-z_]\w*)\s*:/gm), ...hrBody.matchAll(/out\.([A-Za-z_]\w*)\s*=/g)].map((m) => m[1]);
// الحفظ: القسم (personDeptOnSave) والأرشيف (movePersonToResignedArchive)
const fromSave = ['departmentId', 'categoryId', 'archiveGroup', 'resignedAt', 'retiredAt', 'previousDepartmentId'];
const fromWorkflow = [...fromHr, ...fromSave, ...assigned];
const real = shape.workers || {};
const fromCode = new Set([...fromModal, ...fromWorkflow, 'id']);
const fields = [...new Set([...fromCode, ...Object.keys(real)])].sort();
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
// حقول ليها مكان ومالهاش خانة في الشاشة الجديدة بقرار
const DEFERRED = { custom: 'خانات «تعديلات مخصصة» القديمة — في الشاشة الكاملة', dismissedNotes: 'الملاحظات المخفية — من الشاشة الكاملة',
  legacyDepartmentId: 'قسم قديم قبل الأقسام الأساسية — للعرض في القديمة بس', previousDepartmentId: 'القسم قبل الاستقالة — بيتحسب في السيرفر', archiveGroup: 'بيتحسب في السيرفر مع الاستقالة',
  retiredAt: 'الإحالة للمعاش من الشاشة الكاملة', projectSince: 'تاريخ الانضمام للمشروع — بيتختم في السيرفر', attachments: 'المرفقات من لوحة المرفقات', licenseExpiry: 'الرخصة مش للعمال (personNotesIssues)', licenseStatus: 'الرخصة مش للعمال', licenseGrade: 'الرخصة مش للعمال',
  basicSalary: 'نسخة من الراتب (بتتكتب معاه)', type: 'نسخة من النوع (بتتكتب معاه)', categoryId: 'نسخة من القسم (بتتكتب معاه)', projectId: 'الربط بالمعرّف — بيتحسب في السيرفر' };
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
  const origin = r ? r.type : '(من الكود القديم)';
  const shown = !page ? '(الشاشة في 8.1.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
  rows += `| \`${k}\` | ${origin} | ${where} | ${shown} |\n`;
}
const missing = page ? fields.filter((k) => !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];

const md = `# مصفوفة تطابق الحقول — العمال (خطة v1.4.5 — المرحلة 8، الحزمة 8.1)

> **مولَّد** بـ \`node tools/discovery/build-workers-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة العامل القديمة بتكتبه (\`renderer/modules/hr/pages-workers.js\` \`openWorkerModal\` + \`collectPersonHrFields\`)، واللي الحفظ بيضيفه (القسم والأرشيف)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجدول (\`server/src/migrations/1765200000000-WorkersCutover.ts\`)، و${page ? `شاشة \`${PAGE}\`` : 'الشاشة الجديدة (لسه، 8.1.5)'}.
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في \`legacy_extra\` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (\`untyped\`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## العمال (\`workers\` ← جدول \`workers\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 8.1.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}
## الخلاصة (P8.1-B)
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في \`legacy_extra\`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **الأجر والراتب** \`numeric\` من غير scale: القديم بكل خاناته. **وحمايتهم (B-48) زي ما هي** لأن القراية من \`legacy_records\` بنفس الشكل.
`;
const file = path.join(ROOT, 'docs/modules/WORKERS_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/modules/WORKERS_FIELD_PARITY.md'); process.exit(1); }
  console.log('workers parity up to date');
} else { fs.writeFileSync(file, md); console.log(`workers parity written: ${fields.length} fields, ${counts.column} columns, ${counts.extra} extra, ${counts.mismatch} type mismatches, missing in new screen: ${missing.join(',') || 'none'}`); }
