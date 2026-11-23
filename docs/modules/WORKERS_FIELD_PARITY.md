# مصفوفة تطابق الحقول — العمال (خطة v1.4.5 — المرحلة 8، الحزمة 8.1)

> **مولَّد** بـ `node tools/discovery/build-workers-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة العامل القديمة بتكتبه (`renderer/modules/hr/pages-workers.js` `openWorkerModal` + `collectPersonHrFields`)، واللي الحفظ بيضيفه (القسم والأرشيف)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجدول (`server/src/migrations/1765200000000-WorkersCutover.ts`)، وشاشة `frontend/src/app/features/workers.page.ts`.
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## العمال (`workers` ← جدول `workers`)
- **الحقول:** 40 — ليها عمود: **40**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` (text) | ✅ |
| `archiveGroup` | string | عمود `archive_group` (text) | — (بيتحسب في السيرفر مع الاستقالة) |
| `attachments` | array | عمود `attachments` (json) | ✅ |
| `basicSalary` | number | عمود `basic_salary` (number) | ✅ |
| `birthDate` | (من الكود القديم) | عمود `birth_date` (text) | ✅ |
| `categoryId` | string | عمود `category_id` (text) | — (نسخة من القسم (بتتكتب معاه)) |
| `code` | string | عمود `code` (text) | ✅ |
| `contractStatus` | string | عمود `contract_status` (text) | ✅ |
| `contractType` | string | عمود `contract_type` (text) | ✅ |
| `custom` | object | عمود `custom` (json) | — (خانات «تعديلات مخصصة» القديمة — في الشاشة الكاملة) |
| `dailyWage` | number | عمود `daily_wage` (number) | ✅ |
| `departmentId` | string | عمود `department_id` (text) | ✅ |
| `dismissedNotes` | array | عمود `dismissed_notes` (json) | — (الملاحظات المخفية — من الشاشة الكاملة) |
| `extraFields` | array | عمود `extra_fields` (json) | ✅ |
| `hireDate` | string | عمود `hire_date` (text) | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `idCardExpiry` | string | عمود `id_card_expiry` (text) | ✅ |
| `idCardStatus` | string | عمود `id_card_status` (text) | ✅ |
| `insuranceNumber` | string | عمود `insurance_number` (text) | ✅ |
| `insuranceStatus` | string | عمود `insurance_status` (text) | ✅ |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | — (قسم قديم قبل الأقسام الأساسية — للعرض في القديمة بس) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | — (الرخصة مش للعمال (personNotesIssues)) |
| `licenseGrade` | string | عمود `license_grade` (text) | — (الرخصة مش للعمال) |
| `licenseStatus` | string | عمود `license_status` (text) | — (الرخصة مش للعمال) |
| `name` | string | عمود `name` (text) | ✅ |
| `nationalId` | string | عمود `national_id` (text) | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `phone` | string | عمود `phone` (text) | ✅ |
| `position` | string | عمود `position` (text) | ✅ |
| `previousDepartmentId` | string | عمود `previous_department_id` (text) | — (القسم قبل الاستقالة — بيتحسب في السيرفر) |
| `project` | string | عمود `project` (text) | ✅ |
| `projectSince` | string | عمود `project_since` (text) | — (تاريخ الانضمام للمشروع — بيتختم في السيرفر) |
| `resignedAt` | string | عمود `resigned_at` (text) | — (بيتحط مع الاستقالة في السيرفر (النافذة القديمة مافيهاش خانة تاريخ)) |
| `retiredAt` | (من الكود القديم) | عمود `retired_at` (text) | — (الإحالة للمعاش من الشاشة الكاملة) |
| `salary` | number | عمود `salary` (number) | ✅ |
| `skill` | string | عمود `skill` (text) | ✅ |
| `status` | string | عمود `status` (text) | ✅ |
| `supervisorId` | string | عمود `supervisor_id` (text) | ✅ |
| `type` | string | عمود `type` (text) | ✅ |
| `workerType` | string | عمود `worker_type` (text) | ✅ |

## الخلاصة (P8.1-B)
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **الأجر والراتب** `numeric` من غير scale: القديم بكل خاناته. **وحمايتهم (B-48) زي ما هي** لأن القراية من `legacy_records` بنفس الشكل.
