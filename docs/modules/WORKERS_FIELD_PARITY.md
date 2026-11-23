# مصفوفة تطابق الحقول — العمال (خطة v1.4.5 — المرحلة 8، الحزمة 8.1)

> **مولَّد** بـ `node tools/discovery/build-workers-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة العامل القديمة بتكتبه (`renderer/modules/hr/pages-workers.js` `openWorkerModal` + `collectPersonHrFields`)، واللي الحفظ بيضيفه (القسم والأرشيف)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجدول (`server/src/migrations/1765200000000-WorkersCutover.ts`)، والشاشة الجديدة (لسه، 8.1.5).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## العمال (`workers` ← جدول `workers`)
- **الحقول:** 40 — ليها عمود: **40**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 8.1.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` (text) | (الشاشة في 8.1.5) |
| `archiveGroup` | string | عمود `archive_group` (text) | (الشاشة في 8.1.5) |
| `attachments` | array | عمود `attachments` (json) | (الشاشة في 8.1.5) |
| `basicSalary` | number | عمود `basic_salary` (number) | (الشاشة في 8.1.5) |
| `birthDate` | (من الكود القديم) | عمود `birth_date` (text) | (الشاشة في 8.1.5) |
| `categoryId` | string | عمود `category_id` (text) | (الشاشة في 8.1.5) |
| `code` | string | عمود `code` (text) | (الشاشة في 8.1.5) |
| `contractStatus` | string | عمود `contract_status` (text) | (الشاشة في 8.1.5) |
| `contractType` | string | عمود `contract_type` (text) | (الشاشة في 8.1.5) |
| `custom` | object | عمود `custom` (json) | (الشاشة في 8.1.5) |
| `dailyWage` | number | عمود `daily_wage` (number) | (الشاشة في 8.1.5) |
| `departmentId` | string | عمود `department_id` (text) | (الشاشة في 8.1.5) |
| `dismissedNotes` | array | عمود `dismissed_notes` (json) | (الشاشة في 8.1.5) |
| `extraFields` | array | عمود `extra_fields` (json) | (الشاشة في 8.1.5) |
| `hireDate` | string | عمود `hire_date` (text) | (الشاشة في 8.1.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 8.1.5) |
| `idCardExpiry` | string | عمود `id_card_expiry` (text) | (الشاشة في 8.1.5) |
| `idCardStatus` | string | عمود `id_card_status` (text) | (الشاشة في 8.1.5) |
| `insuranceNumber` | string | عمود `insurance_number` (text) | (الشاشة في 8.1.5) |
| `insuranceStatus` | string | عمود `insurance_status` (text) | (الشاشة في 8.1.5) |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | (الشاشة في 8.1.5) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | (الشاشة في 8.1.5) |
| `licenseGrade` | string | عمود `license_grade` (text) | (الشاشة في 8.1.5) |
| `licenseStatus` | string | عمود `license_status` (text) | (الشاشة في 8.1.5) |
| `name` | string | عمود `name` (text) | (الشاشة في 8.1.5) |
| `nationalId` | string | عمود `national_id` (text) | (الشاشة في 8.1.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 8.1.5) |
| `phone` | string | عمود `phone` (text) | (الشاشة في 8.1.5) |
| `position` | string | عمود `position` (text) | (الشاشة في 8.1.5) |
| `previousDepartmentId` | string | عمود `previous_department_id` (text) | (الشاشة في 8.1.5) |
| `project` | string | عمود `project` (text) | (الشاشة في 8.1.5) |
| `projectSince` | string | عمود `project_since` (text) | (الشاشة في 8.1.5) |
| `resignedAt` | string | عمود `resigned_at` (text) | (الشاشة في 8.1.5) |
| `retiredAt` | (من الكود القديم) | عمود `retired_at` (text) | (الشاشة في 8.1.5) |
| `salary` | number | عمود `salary` (number) | (الشاشة في 8.1.5) |
| `skill` | string | عمود `skill` (text) | (الشاشة في 8.1.5) |
| `status` | string | عمود `status` (text) | (الشاشة في 8.1.5) |
| `supervisorId` | string | عمود `supervisor_id` (text) | (الشاشة في 8.1.5) |
| `type` | string | عمود `type` (text) | (الشاشة في 8.1.5) |
| `workerType` | string | عمود `worker_type` (text) | (الشاشة في 8.1.5) |

## الخلاصة (P8.1-B)
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **الأجر والراتب** `numeric` من غير scale: القديم بكل خاناته. **وحمايتهم (B-48) زي ما هي** لأن القراية من `legacy_records` بنفس الشكل.
