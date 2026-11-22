// مصفوفة تطابق الحقول — المشروعات (خطة v1.4.5 — المرحلة 7، الحزمة 7.4؛ نفس معيار 7.2/7.3). قراءة بس.
// أسماء الحقول: من السجل اللي نافذة المشروع القديمة بتكتبه (payload في openProjectModal) + حقول مسار المشروع (project-workflow.js)
// + شكل البيانات الحقيقية (tools/security/xss-shape.json، أسماء وأنواع بس).
// المكان في القاعدة من أعمدة الـ migration (PROJECT_COLUMNS): الحقل بيروح عموده لو نوعه مطابق، وغير كده legacy_extra زي ما هو.
// المخرج: docs/modules/PROJECTS_FIELD_PARITY.md   التشغيل: node tools/discovery/build-projects-parity.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const shape = JSON.parse(read('tools/security/xss-shape.json'));
const mig = read('server/src/migrations/1765100000000-ProjectsCutover.ts');
const modal = read('renderer/modules/hr/pages-projects.js');
const workflow = read('renderer/modules/clients/project-workflow.js');
const PAGE = 'frontend/src/app/features/projects.page.ts';
const page = fs.existsSync(path.join(ROOT, PAGE)) ? read(PAGE).split('\n').filter((l) => !/^\s*interface /.test(l)).join('\n') : null;

const colsBlock = mig.slice(mig.indexOf('const COLS'), mig.indexOf('];', mig.indexOf('const COLS')));
const COLS = [...colsBlock.matchAll(/\['([a-z_]+)', '([A-Za-z_]+)', '(text|number|json)'\]/g)].map((m) => ({ col: m[1], key: m[2], type: m[3] }));
const byKey = Object.fromEntries(COLS.map((c) => [c.key, c]));
const JSON_TYPE = { text: 'string', number: 'number', json: 'object' };

// مفاتيح payload في زرار الحفظ (openProjectModal)
const fnAt = modal.indexOf('function openProjectModal(');
const pAt = modal.indexOf('const payload = {', fnAt);
const pBody = modal.slice(pAt, modal.indexOf('\n    };', pAt));
const fromModal = [...pBody.matchAll(/^\s{6}([A-Za-z_]\w*)\s*:/gm)].map((m) => m[1]);
// حقول المسار من تعليق رأس project-workflow.js + اللي بيكتبه (p.xxx =)
const fromWorkflow = [...new Set([...workflow.matchAll(/\bp\.(stageKey|stepKey|stepMeta|completedSteps|stepFiles|tenderStance|rejectReason|statusBeforeReject|pathHistory|workflowSnapshot)\b/g)].map((m) => m[1]))];
const real = shape.projects || {};
const fromCode = new Set([...fromModal, ...fromWorkflow, 'id']);
const fields = [...new Set([...fromCode, ...Object.keys(real)])].sort();
const SYSTEM = { id: 'المفتاح الأساسي `id`' };
// حقول ليها مكان ومالهاش خانة في الشاشة الجديدة بقرار
const WF = 'مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)';
const DEFERRED = { stepMeta: WF, completedSteps: WF, stepFiles: WF, pathHistory: WF, workflowSnapshot: WF, stepKey: WF, tenderStance: WF, rejectReason: WF, statusBeforeReject: WF,
  attachments: 'المرفقات من الشاشة الكاملة', customer: 'نسخة من اسم العميل (بتتكتب مع customerName)' };
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
  const shown = !page ? '(الشاشة في 7.4.5)' : inNew(k) ? '✅' : DEFERRED[k] ? `— (${DEFERRED[k]})` : '—';
  rows += `| \`${k}\` | ${origin} | ${where} | ${shown} |\n`;
}
const missing = page ? fields.filter((k) => !SYSTEM[k] && !inNew(k) && !DEFERRED[k]) : [];

const md = `# مصفوفة تطابق الحقول — المشروعات (خطة v1.4.5 — المرحلة 7، الحزمة 7.4)

> **مولَّد** بـ \`node tools/discovery/build-projects-parity.js\`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة المشروع القديمة بتكتبه (\`renderer/modules/hr/pages-projects.js\` \`openProjectModal\`)، وحقول مسار المشروع (\`renderer/modules/clients/project-workflow.js\`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجدول (\`server/src/migrations/1765100000000-ProjectsCutover.ts\`)، و${page ? `شاشة \`${PAGE}\`` : 'الشاشة الجديدة (لسه، 7.4.5)'}.
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في \`legacy_extra\` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (\`untyped\`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## المشروعات (\`projects\` ← جدول \`projects\`)
- **الحقول:** ${fields.length} — ليها عمود: **${counts.column}**، ومحفوظة في \`legacy_extra\`: **${counts.extra}**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** ${counts.mismatch}
- **ناقص في الشاشة الجديدة من غير قرار:** ${page ? missing.map((k) => `\`${k}\``).join('، ') || 'مفيش' : '(الشاشة في 7.4.5)'}

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
${rows}
## الخلاصة (P7.4-B)
- **كل حقل ليه مكان** (عمود أو \`legacy_extra\`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في \`legacy_extra\`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **حقول مسار المشروع** أعمدة بقيمها بالظبط (jsonb للكائنات والمصفوفات)، والمسار التفاعلي بيفضل في الواجهة القديمة (DEC-0117 د-1).
- **القيمة والميزانية والتقدم** \`numeric\` من غير scale: القديم بكل خاناته.
`;
const file = path.join(ROOT, 'docs/modules/PROJECTS_FIELD_PARITY.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/modules/PROJECTS_FIELD_PARITY.md'); process.exit(1); }
  console.log('projects parity up to date');
} else { fs.writeFileSync(file, md); console.log(`projects parity written: ${fields.length} fields, ${counts.column} columns, ${counts.extra} extra, ${counts.mismatch} type mismatches, missing in new screen: ${missing.join(',') || 'none'}`); }
