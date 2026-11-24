# مصفوفة تطابق الحقول — الموظفين (خطة v1.4.5 — المرحلة 8، الحزمة 8.3)

> **مولَّد** بـ `node tools/discovery/build-employees-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي النافذة القديمة بتكتبه (`openEmployeeModal` + `collectPersonHrFields`)، واللي الحفظ بيضيفه (القسم والأرشيف)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765400000000-EmployeesCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## الموظفين (`employees` ← جدول `employees`)
- **الحقول:** 38 — ليها عمود: **36**، ومحفوظة في `legacy_extra`: **2**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 8.3.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` (text) | (الشاشة في 8.3.5) |
| `archiveGroup` | string | عمود `archive_group` (text) | (الشاشة في 8.3.5) |
| `attachments` | array | عمود `attachments` (json) | (الشاشة في 8.3.5) |
| `birthDate` | (من الكود القديم) | عمود `birth_date` (text) | (الشاشة في 8.3.5) |
| `categoryId` | string | عمود `category_id` (text) | (الشاشة في 8.3.5) |
| `code` | string | عمود `code` (text) | (الشاشة في 8.3.5) |
| `contractStatus` | string | عمود `contract_status` (text) | (الشاشة في 8.3.5) |
| `contractType` | string | عمود `contract_type` (text) | (الشاشة في 8.3.5) |
| `custom` | object | عمود `custom` (json) | (الشاشة في 8.3.5) |
| `dailyWage` | (من الكود القديم) | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 8.3.5) |
| `departmentId` | string | عمود `department_id` (text) | (الشاشة في 8.3.5) |
| `email` | string | عمود `email` (text) | (الشاشة في 8.3.5) |
| `employmentType` | string | عمود `employment_type` (text) | (الشاشة في 8.3.5) |
| `extraFields` | array | عمود `extra_fields` (json) | (الشاشة في 8.3.5) |
| `hireDate` | string | عمود `hire_date` (text) | (الشاشة في 8.3.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 8.3.5) |
| `idCardExpiry` | string | عمود `id_card_expiry` (text) | (الشاشة في 8.3.5) |
| `idCardStatus` | string | عمود `id_card_status` (text) | (الشاشة في 8.3.5) |
| `insuranceNumber` | string | عمود `insurance_number` (text) | (الشاشة في 8.3.5) |
| `insuranceStatus` | string | عمود `insurance_status` (text) | (الشاشة في 8.3.5) |
| `leaveAuto` | boolean | عمود `leave_auto` (bool) | (الشاشة في 8.3.5) |
| `leaveBalance` | number | عمود `leave_balance` (number) | (الشاشة في 8.3.5) |
| `legacyDepartmentId` | string | عمود `legacy_department_id` (text) | (الشاشة في 8.3.5) |
| `licenseExpiry` | string | عمود `license_expiry` (text) | (الشاشة في 8.3.5) |
| `licenseGrade` | string | عمود `license_grade` (text) | (الشاشة في 8.3.5) |
| `licenseStatus` | string | عمود `license_status` (text) | (الشاشة في 8.3.5) |
| `name` | string | عمود `name` (text) | (الشاشة في 8.3.5) |
| `nationalId` | string | عمود `national_id` (text) | (الشاشة في 8.3.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 8.3.5) |
| `phone` | string | عمود `phone` (text) | (الشاشة في 8.3.5) |
| `position` | string | عمود `position` (text) | (الشاشة في 8.3.5) |
| `previousDepartmentId` | string | عمود `previous_department_id` (text) | (الشاشة في 8.3.5) |
| `project` | string | عمود `project` (text) | (الشاشة في 8.3.5) |
| `resignedAt` | string | عمود `resigned_at` (text) | (الشاشة في 8.3.5) |
| `retiredAt` | (من الكود القديم) | عمود `retired_at` (text) | (الشاشة في 8.3.5) |
| `salary` | number | عمود `salary` (number) | (الشاشة في 8.3.5) |
| `skill` | (من الكود القديم) | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 8.3.5) |
| `status` | string | عمود `status` (text) | (الشاشة في 8.3.5) |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
