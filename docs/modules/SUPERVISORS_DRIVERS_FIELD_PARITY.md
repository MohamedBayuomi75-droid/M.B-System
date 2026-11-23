# مصفوفة تطابق الحقول — المشرفين والسواقين (خطة v1.4.5 — المرحلة 8، الحزمة 8.2)

> **مولَّد** بـ `node tools/discovery/build-supervisors-drivers-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي النوافذ القديمة بتكتبه (`openSupervisorModal`، و`openDriverModal`، و`openExternalDriverModal` + `collectPersonHrFields`)، واللي الحفظ بيضيفه (القسم والأرشيف)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765300000000-SupervisorsDriversCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## المشرفين (`supervisors` ← جدول `supervisors`)
- **الحقول:** 33 — ليها عمود: **32**، ومحفوظة في `legacy_extra`: **1**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 8.2.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` (text) | (الشاشة في 8.2.5) |
| `archiveGroup` | (من الكود القديم) | عمود `archive_group` (text) | (الشاشة في 8.2.5) |
| `attachments` | array | عمود `attachments` (json) | (الشاشة في 8.2.5) |
| `birthDate` | (من الكود القديم) | عمود `birth_date` (text) | (الشاشة في 8.2.5) |
| `categoryId` | string | عمود `category_id` (text) | (الشاشة في 8.2.5) |
| `code` | string | عمود `code` (text) | (الشاشة في 8.2.5) |
| `contractStatus` | string | عمود `contract_status` (text) | (الشاشة في 8.2.5) |
| `contractType` | string | عمود `contract_type` (text) | (الشاشة في 8.2.5) |
| `custom` | object | عمود `custom` (json) | (الشاشة في 8.2.5) |
| `dailyWage` | number | عمود `daily_wage` (number) | (الشاشة في 8.2.5) |
| `departmentId` | string | عمود `department_id` (text) | (الشاشة في 8.2.5) |
| `extraFields` | array | عمود `extra_fields` (json) | (الشاشة في 8.2.5) |
| `hireDate` | string | عمود `hire_date` (text) | (الشاشة في 8.2.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 8.2.5) |
| `idCardExpiry` | string | عمود `id_card_expiry` (text) | (الشاشة في 8.2.5) |
| `idCardStatus` | string | عمود `id_card_status` (text) | (الشاشة في 8.2.5) |
| `insuranceNumber` | string | عمود `insurance_number` (text) | (الشاشة في 8.2.5) |
| `insuranceStatus` | string | عمود `insurance_status` (text) | (الشاشة في 8.2.5) |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | (الشاشة في 8.2.5) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | (الشاشة في 8.2.5) |
| `licenseStatus` | string | عمود `license_status` (text) | (الشاشة في 8.2.5) |
| `name` | string | عمود `name` (text) | (الشاشة في 8.2.5) |
| `nationalId` | string | عمود `national_id` (text) | (الشاشة في 8.2.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 8.2.5) |
| `phone` | string | عمود `phone` (text) | (الشاشة في 8.2.5) |
| `position` | string | عمود `position` (text) | (الشاشة في 8.2.5) |
| `previousDepartmentId` | (من الكود القديم) | عمود `previous_department_id` (text) | (الشاشة في 8.2.5) |
| `projectSince` | string | عمود `project_since` (text) | (الشاشة في 8.2.5) |
| `resignedAt` | string | عمود `resigned_at` (text) | (الشاشة في 8.2.5) |
| `retiredAt` | (من الكود القديم) | عمود `retired_at` (text) | (الشاشة في 8.2.5) |
| `salary` | (من الكود القديم) | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 8.2.5) |
| `skill` | string | عمود `skill` (text) | (الشاشة في 8.2.5) |
| `status` | string | عمود `status` (text) | (الشاشة في 8.2.5) |

## السواقين (`drivers` ← جدول `drivers`)
- **الحقول:** 34 — ليها عمود: **34**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 8.2.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` (text) | (الشاشة في 8.2.5) |
| `archiveGroup` | string | عمود `archive_group` (text) | (الشاشة في 8.2.5) |
| `attachments` | array | عمود `attachments` (json) | (الشاشة في 8.2.5) |
| `birthDate` | string | عمود `birth_date` (text) | (الشاشة في 8.2.5) |
| `categoryId` | string | عمود `category_id` (text) | (الشاشة في 8.2.5) |
| `code` | string | عمود `code` (text) | (الشاشة في 8.2.5) |
| `contractStatus` | string | عمود `contract_status` (text) | (الشاشة في 8.2.5) |
| `contractType` | string | عمود `contract_type` (text) | (الشاشة في 8.2.5) |
| `dailyWage` | number | عمود `daily_wage` (number) | (الشاشة في 8.2.5) |
| `departmentId` | string | عمود `department_id` (text) | (الشاشة في 8.2.5) |
| `external` | (من الكود القديم) | عمود `external` (bool) | (الشاشة في 8.2.5) |
| `extraFields` | array | عمود `extra_fields` (json) | (الشاشة في 8.2.5) |
| `hireDate` | string | عمود `hire_date` (text) | (الشاشة في 8.2.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 8.2.5) |
| `idCardExpiry` | string | عمود `id_card_expiry` (text) | (الشاشة في 8.2.5) |
| `idCardStatus` | string | عمود `id_card_status` (text) | (الشاشة في 8.2.5) |
| `insuranceNumber` | string | عمود `insurance_number` (text) | (الشاشة في 8.2.5) |
| `insuranceStatus` | string | عمود `insurance_status` (text) | (الشاشة في 8.2.5) |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | (الشاشة في 8.2.5) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | (الشاشة في 8.2.5) |
| `licenseGrade` | string | عمود `license_grade` (text) | (الشاشة في 8.2.5) |
| `licenseStatus` | string | عمود `license_status` (text) | (الشاشة في 8.2.5) |
| `name` | string | عمود `name` (text) | (الشاشة في 8.2.5) |
| `nationalId` | string | عمود `national_id` (text) | (الشاشة في 8.2.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 8.2.5) |
| `phone` | string | عمود `phone` (text) | (الشاشة في 8.2.5) |
| `position` | string | عمود `position` (text) | (الشاشة في 8.2.5) |
| `previousDepartmentId` | string | عمود `previous_department_id` (text) | (الشاشة في 8.2.5) |
| `project` | string | عمود `project` (text) | (الشاشة في 8.2.5) |
| `resignedAt` | string | عمود `resigned_at` (text) | (الشاشة في 8.2.5) |
| `retiredAt` | (من الكود القديم) | عمود `retired_at` (text) | (الشاشة في 8.2.5) |
| `salary` | number | عمود `salary` (number) | (الشاشة في 8.2.5) |
| `skill` | (من الكود القديم) | عمود `skill` (text) | (الشاشة في 8.2.5) |
| `status` | string | عمود `status` (text) | (الشاشة في 8.2.5) |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
