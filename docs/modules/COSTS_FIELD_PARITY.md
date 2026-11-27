# مصفوفة تطابق الحقول — التكاليف (خطة v1.4.5 — المرحلة 8، الحزمة 8.8)

> **مولَّد** بـ `node tools/discovery/build-costs-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نافذة القديمة بتكتبه (`openCostModal`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765900000000-CostsCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`).

## التكاليف (`costs` ← جدول `costs`)
- **الحقول:** 15 — ليها عمود: **13**، ومحفوظة في `legacy_extra`: **2**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 8.8.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `amount` | number | عمود `amount` (number) | (الشاشة في 8.8.5) |
| `createdAt` | string | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 8.8.5) |
| `date` | string | عمود `date` (text) | (الشاشة في 8.8.5) |
| `departmentId` | string | عمود `department_id` (text) | (الشاشة في 8.8.5) |
| `extraFields` | array | عمود `extra_fields` (json) | (الشاشة في 8.8.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 8.8.5) |
| `item` | string | عمود `item` (text) | (الشاشة في 8.8.5) |
| `lines` | array | عمود `lines` (json) | (الشاشة في 8.8.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 8.8.5) |
| `personId` | string | عمود `person_id` (text) | (الشاشة في 8.8.5) |
| `personKind` | string | عمود `person_kind` (text) | (الشاشة في 8.8.5) |
| `project` | string | عمود `project` (text) | (الشاشة في 8.8.5) |
| `projectId` | string | عمود `project_id` (text) | (الشاشة في 8.8.5) |
| `section` | string | عمود `section` (text) | (الشاشة في 8.8.5) |
| `updatedAt` | string | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 8.8.5) |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع، ومفيش تطبيع وقت النقل.
