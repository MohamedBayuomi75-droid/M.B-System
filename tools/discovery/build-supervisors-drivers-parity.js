// مصفوفة تطابق الحقول — المشرفين والسواقين (خطة v1.4.5 — المرحلة 8، الحزمة 8.2؛ نفس معيار 8.1). قراءة بس.
// أسماء الحقول: من السجل اللي النوافذ القديمة بتكتبه (payload في openSupervisorModal / openDriverModal / openExternalDriverModal
// + collectPersonHrFields) + اللي الحفظ بيضيفه (القسم والأرشيف) + شكل البيانات الحقيقية (tools/security/xss-shape.json، أسماء وأنواع بس).
// المكان في القاعدة من أعمدة الـ migration: الحقل بيروح عموده لو نوعه مطابق، وغير كده legacy_extra زي ما هو.
// المخرج: docs/modules/SUPERVISORS_DRIVERS_FIELD_PARITY.md   التشغيل: node tools/discovery/build-supervisors-drivers-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readIf = (p) => (fs.existsSync(path.join(ROOT, p)) ? read(p).split('\n').filter((l) => !/^\s*interface /.test(l)).join('\n') : null);

const shape = JSON.parse(read('tools/security/xss-shape.json'));
const MIG = 'server/src/migrations/1765300000000-SupervisorsDriversCutover.ts';
const mig = read(MIG);
const sup = read('renderer/modules/hr/pages-supervisors.js');
const ops = read('renderer/modules/hr/pages-ops.js');
const helpers = read('renderer/core/helpers.js');
const colsOf = (block) => [...block.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json|bool)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] }));
const personBlock = mig.slice(mig.indexOf('const PERSON'), mig.indexOf('];', mig.indexOf('const PERSON')));
const driverLine = mig.slice(mig.indexOf('export const DRIVER_COLUMNS'), mig.indexOf('\n', mig.indexOf('export const DRIVER_COLUMNS')));
const PERSON = colsOf(personBlock);
const TABLES = { supervisors: PERSON, drivers: [...PERSON, ...colsOf(driverLine)] };
const JSON_TYPE = { text: 'string', number: 'number', json: 'object', bool: 'boolean' };

// payload = Object.assign({ ... }, hr) أو payload = { ... } — مفاتيح السطر الأول من كل خانة
const payloadKeys = (src, fn) => {
  const at = src.indexOf(`function ${fn}(`);
  const p = src.indexOf('const payload =', at);
  const end = src.indexOf('\n    }', p) > 0 ? src.indexOf('\n    }', p) : src.indexOf('};', p);
  const body = src.slice(p, end);
  const keys = [...body.matchAll(/^\s{6,8}([A-Za-z_]\w*)\s*:/gm), ...body.matchAll(/[{,]\s*([A-Za-z_]\w*)\s*:/g)].map((m) => m[1]);
  const assigned = [...src.slice(p, src.indexOf('const commit', p)).matchAll(/payload\.([A-Za-z_]\w*)\s*=/g)].map((m) => m[1]);
  return [...keys, ...assigned].filter((k) => !/^(id|ok)$/.test(k) || k === 'id');
};
const hrAt = helpers.indexOf('function collectPersonHrFields(');
const hrBody = helpers.slice(hrAt, helpers.indexOf('\nfunction ', hrAt + 10));
const fromHr = [...hrBody.matchAll(/^\s{4}([A-Za-z_]\w*)\s*:/gm), ...hrBody.matchAll(/out\.([A-Za-z_]\w*)\s*=/g)].map((m) => m[1]);
const fromSave = ['departmentId', 'categoryId', 'archiveGroup', 'resignedAt', 'retiredAt', 'previousDepartmentId'];
const SOURCES = {
  supervisors: { label: 'المشرفين', modal: [...payloadKeys(sup, 'openSupervisorModal'), ...fromHr, ...fromSave], page: 'frontend/src/app/features/supervisors.page.ts' },
  drivers: { label: 'السواقين', modal: [...payloadKeys(ops, 'openDriverModal'), ...payloadKeys(ops, 'openExternalDriverModal'), ...fromHr, ...fromSave], page: 'frontend/src/app/features/drivers.page.ts' },
};
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
const DEFERRED = { custom: 'خانات «تعديلات مخصصة» القديمة — في الشاشة الكاملة', dismissedNotes: 'الملاحظات المخفية — من الشاشة الكاملة',
  legacyDepartmentId: 'قسم قديم قبل الأقسام الأساسية — للعرض في القديمة بس', previousDepartmentId: 'القسم قبل الاستقالة — بيتحسب في السيرفر', archiveGroup: 'بيتحسب في السيرفر مع الاستقالة',
  retiredAt: 'الإحالة للمعاش من الشاشة الكاملة', projectSince: 'تاريخ الانضمام للمشروع — بيتختم في السيرفر', attachments: 'المرفقات من لوحة المرفقات', categoryId: 'نسخة من القسم (بتتكتب معاه)',
  projectId: 'الربط بالمعرّف — بيتحسب في السيرفر', basicSalary: 'نسخة من الراتب', idCardStatus: 'بتتحسب من تاريخ البطاقة', licenseStatus: 'بتتحسب من تاريخ الرخصة' };

let md = `# مصفوفة تطابق الحقول — المشرفين والسواقين (خطة v1.4.5 — المرحلة 8، الحزمة 8.2)

> **مولَّد** بـ \`node tools/discovery/build-supervisors-drivers-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي النوافذ القديمة بتكتبه (\`openSupervisorModal\`، و\`openDriverModal\`، و\`openExternalDriverModal\` + \`collectPersonHrFields\`)، واللي الحفظ بيضيفه (القسم والأرشيف)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (\`${MIG}\`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في \`legacy_extra\` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (\`untyped\`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.
`;
for (const [coll, src] of Object.entries(SOURCES)) {
  const cols = TABLES[coll]; const byKey = Object.fromEntries(cols.map((c) => [c.key, c]));
  const real = shape[coll] || {};
  const page = readIf(src.page);
  const inNew = (k) => page && new RegExp(`\\b${k}\\b`).test(page);
  const fields = [...new Set([...src.modal, 'id', ...Object.keys(real)])].filter((k) => /^[a-z]/.test(k) && !/^(hr|hrS|name2)$/.test(k)).sort();
  const counts = { column: 0, extra: 0, mismatch: 0 };
  let rows = '';
  for (const k of fields) {
    const r = real[k]; let where, kind;
    if (SYSTEM[k]) { where = SYSTEM[k]; kind = 'column'; }
    else if (byKey[k]) {
      const c = byKey[k];
      const ok = !r || r.type === JSON_TYPE[c.type] || (c.type === 'json' && (r.type === 'object' || r.type === 'array'));
      where = `عمود \`${c.col}\` (${c.type})${ok ? '' : ` — ⚠️ النوع في البيانات الحقيقية ${r.type}: بيفضل في \`legacy_extra\``}`;
      kind = 'column'; if (!ok) counts.mismatch++;
    } else { where = '`legacy_extra` (محفوظ زي ما هو)'; kind = 'extra'; }
    counts[kind]++;
    const shown = !page ? '(الشاشة في 8.2.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
    rows += `| \`${k}\` | ${r ? r.type : '(من الكود القديم)'} | ${where} | ${shown} |\n`;
  }
  const missing = page ? fields.filter((k) => !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];
  md += `
## ${src.label} (\`${coll}\` ← جدول \`${coll}\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 8.2.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}`;
}
md += `
## الخلاصة
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في \`legacy_extra\`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
`;
const OUT = path.join(ROOT, 'docs/modules/SUPERVISORS_DRIVERS_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== md) { console.error('SUPERVISORS_DRIVERS_FIELD_PARITY.md is stale — run node tools/discovery/build-supervisors-drivers-parity.js'); process.exit(1); }
  console.log('supervisors/drivers parity up to date');
} else {
  fs.writeFileSync(OUT, md);
  console.log('supervisors/drivers parity written');
}
