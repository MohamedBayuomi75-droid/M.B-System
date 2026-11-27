# مصفوفة تطابق الحقول — التكاليف (خطة v1.4.5 — المرحلة 8، الحزمة 8.8)

> **مولَّد** بـ `node tools/discovery/build-costs-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نافذة القديمة بتكتبه (`openCostModal`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765900000000-CostsCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`).

## التكاليف (`costs` ← جدول `costs`)
- **الحقول:** 15 — ليها عمود: **13**، ومحفوظة في `legacy_extra`: **2**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `amount` | number | عمود `amount` (number) | ✅ |
| `createdAt` | string | `legacy_extra` (محفوظ زي ما هو) | ✅ |
| `date` | string | عمود `date` (text) | ✅ |
| `departmentId` | string | عمود `department_id` (text) | — (مش في نافذة القديمة — محفوظ زي ما هو) |
| `extraFields` | array | عمود `extra_fields` (json) | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `item` | string | عمود `item` (text) | ✅ |
| `lines` | array | عمود `lines` (json) | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `personId` | string | عمود `person_id` (text) | ✅ |
| `personKind` | string | عمود `person_kind` (text) | ✅ |
| `project` | string | عمود `project` (text) | ✅ |
| `projectId` | string | عمود `project_id` (text) | — (الربط بالاسم زي القديمة (DEC-0142 د-4) — محفوظ زي ما هو) |
| `section` | string | عمود `section` (text) | ✅ |
| `updatedAt` | string | `legacy_extra` (محفوظ زي ما هو) | ✅ |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع، ومفيش تطبيع وقت النقل.
