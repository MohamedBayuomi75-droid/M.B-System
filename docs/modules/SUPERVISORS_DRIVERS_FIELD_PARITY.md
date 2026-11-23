# مصفوفة تطابق الحقول — المشرفين والسواقين (خطة v1.4.5 — المرحلة 8، الحزمة 8.2)

> **مولَّد** بـ `node tools/discovery/build-supervisors-drivers-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي النوافذ القديمة بتكتبه (`openSupervisorModal`، و`openDriverModal`، و`openExternalDriverModal` + `collectPersonHrFields`)، واللي الحفظ بيضيفه (القسم والأرشيف)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765300000000-SupervisorsDriversCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## المشرفين (`supervisors` ← جدول `supervisors`)
- **الحقول:** 33 — ليها عمود: **32**، ومحفوظة في `legacy_extra`: **1**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` (text) | ✅ |
| `archiveGroup` | (من الكود القديم) | عمود `archive_group` (text) | — (بيتحسب في السيرفر مع الاستقالة) |
| `attachments` | array | عمود `attachments` (json) | ✅ |
| `birthDate` | (من الكود القديم) | عمود `birth_date` (text) | ✅ |
| `categoryId` | string | عمود `category_id` (text) | — (نسخة من القسم (بتتكتب معاه)) |
| `code` | string | عمود `code` (text) | ✅ |
| `contractStatus` | string | عمود `contract_status` (text) | ✅ |
| `contractType` | string | عمود `contract_type` (text) | ✅ |
| `custom` | object | عمود `custom` (json) | ✅ |
| `dailyWage` | number | عمود `daily_wage` (number) | ✅ |
| `departmentId` | string | عمود `department_id` (text) | ✅ |
| `extraFields` | array | عمود `extra_fields` (json) | ✅ |
| `hireDate` | string | عمود `hire_date` (text) | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `idCardExpiry` | string | عمود `id_card_expiry` (text) | ✅ |
| `idCardStatus` | string | عمود `id_card_status` (text) | — (بتتحسب من تاريخ البطاقة) |
| `insuranceNumber` | string | عمود `insurance_number` (text) | ✅ |
| `insuranceStatus` | string | عمود `insurance_status` (text) | ✅ |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | — (قسم قديم قبل الأقسام الأساسية — للعرض في القديمة بس) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | ✅ |
| `licenseStatus` | string | عمود `license_status` (text) | — (بتتحسب من تاريخ الرخصة) |
| `name` | string | عمود `name` (text) | ✅ |
| `nationalId` | string | عمود `national_id` (text) | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `phone` | string | عمود `phone` (text) | ✅ |
| `position` | string | عمود `position` (text) | ✅ |
| `previousDepartmentId` | (من الكود القديم) | عمود `previous_department_id` (text) | — (القسم قبل الاستقالة — بيتحسب في السيرفر) |
| `projectSince` | string | عمود `project_since` (text) | — (تاريخ الانضمام للمشروع — بيتختم في السيرفر) |
| `resignedAt` | string | عمود `resigned_at` (text) | ✅ |
| `retiredAt` | (من الكود القديم) | عمود `retired_at` (text) | — (الإحالة للمعاش من الشاشة الكاملة) |
| `salary` | (من الكود القديم) | `legacy_extra` (محفوظ زي ما هو) | ✅ |
| `skill` | string | عمود `skill` (text) | ✅ |
| `status` | string | عمود `status` (text) | ✅ |

## السواقين (`drivers` ← جدول `drivers`)
- **الحقول:** 34 — ليها عمود: **34**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` (text) | ✅ |
| `archiveGroup` | string | عمود `archive_group` (text) | — (بيتحسب في السيرفر مع الاستقالة) |
| `attachments` | array | عمود `attachments` (json) | ✅ |
| `birthDate` | string | عمود `birth_date` (text) | ✅ |
| `categoryId` | string | عمود `category_id` (text) | — (نسخة من القسم (بتتكتب معاه)) |
| `code` | string | عمود `code` (text) | ✅ |
| `contractStatus` | string | عمود `contract_status` (text) | ✅ |
| `contractType` | string | عمود `contract_type` (text) | ✅ |
| `dailyWage` | number | عمود `daily_wage` (number) | ✅ |
| `departmentId` | string | عمود `department_id` (text) | ✅ |
| `external` | (من الكود القديم) | عمود `external` (bool) | ✅ |
| `extraFields` | array | عمود `extra_fields` (json) | ✅ |
| `hireDate` | string | عمود `hire_date` (text) | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `idCardExpiry` | string | عمود `id_card_expiry` (text) | ✅ |
| `idCardStatus` | string | عمود `id_card_status` (text) | — (بتتحسب من تاريخ البطاقة) |
| `insuranceNumber` | string | عمود `insurance_number` (text) | ✅ |
| `insuranceStatus` | string | عمود `insurance_status` (text) | ✅ |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | — (قسم قديم قبل الأقسام الأساسية — للعرض في القديمة بس) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | ✅ |
| `licenseGrade` | string | عمود `license_grade` (text) | ✅ |
| `licenseStatus` | string | عمود `license_status` (text) | — (بتتحسب من تاريخ الرخصة) |
| `name` | string | عمود `name` (text) | ✅ |
| `nationalId` | string | عمود `national_id` (text) | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `phone` | string | عمود `phone` (text) | ✅ |
| `position` | string | عمود `position` (text) | ✅ |
| `previousDepartmentId` | string | عمود `previous_department_id` (text) | — (القسم قبل الاستقالة — بيتحسب في السيرفر) |
| `project` | string | عمود `project` (text) | — (مالوش خانة في نافذة السائق القديمة ولا عمود في جدولها — بيفضل محفوظ زي ما هو) |
| `resignedAt` | string | عمود `resigned_at` (text) | ✅ |
| `retiredAt` | (من الكود القديم) | عمود `retired_at` (text) | — (الإحالة للمعاش من الشاشة الكاملة) |
| `salary` | number | عمود `salary` (number) | ✅ |
| `skill` | (من الكود القديم) | عمود `skill` (text) | ✅ |
| `status` | string | عمود `status` (text) | ✅ |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
