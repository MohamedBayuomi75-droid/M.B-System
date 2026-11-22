# مصفوفة تطابق الحقول — المشروعات (خطة v1.4.5 — المرحلة 7، الحزمة 7.4)

> **مولَّد** بـ `node tools/discovery/build-projects-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة المشروع القديمة بتكتبه (`renderer/modules/hr/pages-projects.js` `openProjectModal`)، وحقول مسار المشروع (`renderer/modules/clients/project-workflow.js`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجدول (`server/src/migrations/1765100000000-ProjectsCutover.ts`)، وشاشة `frontend/src/app/features/projects.page.ts`.
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## المشروعات (`projects` ← جدول `projects`)
- **الحقول:** 26 — ليها عمود: **26**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** `assignedTo`، `contractNo`، `customerId`، `customerName`، `end`، `extraFields`، `notes`، `stageKey`، `start`، `supervisorId`

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `assignedTo` | (من الكود القديم) | عمود `assigned_to` (text) | — |
| `attachments` | (من الكود القديم) | عمود `attachments` (json) | ✅ |
| `budget` | number | عمود `budget` (number) | ✅ |
| `code` | string | عمود `code` (text) | ✅ |
| `completedSteps` | array | عمود `completed_steps` (json) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `contractNo` | (من الكود القديم) | عمود `contract_no` (text) | — |
| `customer` | (من الكود القديم) | عمود `customer` (text) | — (نسخة من اسم العميل (بتتكتب مع customerName)) |
| `customerId` | (من الكود القديم) | عمود `customer_id` (text) | — |
| `customerName` | (من الكود القديم) | عمود `customer_name` (text) | — |
| `end` | (من الكود القديم) | عمود `end_date` (text) | — |
| `extraFields` | array | عمود `extra_fields` (json) | — |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `name` | string | عمود `name` (text) | ✅ |
| `notes` | string | عمود `notes` (text) | — |
| `pathHistory` | array | عمود `path_history` (json) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `rejectReason` | string | عمود `reject_reason` (text) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `stageKey` | string | عمود `stage_key` (text) | — |
| `start` | (من الكود القديم) | عمود `start_date` (text) | — |
| `status` | string | عمود `status` (text) | ✅ |
| `statusBeforeReject` | string | عمود `status_before_reject` (text) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `stepFiles` | object | عمود `step_files` (json) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `stepKey` | string | عمود `step_key` (text) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `stepMeta` | object | عمود `step_meta` (json) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `supervisorId` | string | عمود `supervisor_id` (text) | — |
| `tenderStance` | string | عمود `tender_stance` (text) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |
| `workflowSnapshot` | object | عمود `workflow_snapshot` (json) | — (مسار المشروع — في الواجهة القديمة (DEC-0117 د-1)) |

## الخلاصة (P7.4-B)
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **حقول مسار المشروع** أعمدة بقيمها بالظبط (jsonb للكائنات والمصفوفات)، والمسار التفاعلي بيفضل في الواجهة القديمة (DEC-0117 د-1).
- **القيمة والميزانية والتقدم** `numeric` من غير scale: القديم بكل خاناته.
