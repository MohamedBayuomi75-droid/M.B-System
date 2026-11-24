# مصفوفة تطابق الحقول — اليوميات وحضور الموظفين (خطة v1.4.5 — المرحلة 8، الحزمة 8.5)

> **مولَّد** بـ `node tools/discovery/build-attendance-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** اللي نوافذ القديمة بتكتبه (`openWorkerAttModal`، و`openAttendanceModal`)، و`normalizeAttendanceRecord`، وقرار المراجعة (DEC-0133)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، وأعمدة الجداول (`server/src/migrations/1765600000000-AttendanceCutover.ts`).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107)، وعددها بيطلع في تقرير النقل (`untyped`).

## اليوميات (`workerAttendance` ← جدول `worker_attendance`)
- **الحقول:** 21 — ليها عمود: **21**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `date` | string | عمود `date` (text) | ✅ |
| `dayWage` | number | عمود `day_wage` (number) | ✅ |
| `dayWageSource` | (من الكود القديم) | عمود `day_wage_source` (text) | — (علامة تثبيت الأجر وقت النقل (DEC-0130) — في تقرير الفرق) |
| `days` | number | عمود `days` (number) | ✅ |
| `deduction` | number | عمود `deduction` (number) | ✅ |
| `driverId` | (من الكود القديم) | عمود `driver_id` (text) | — (نسخة من personId للسواق) |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `personId` | string | عمود `person_id` (text) | ✅ |
| `personKind` | string | عمود `person_kind` (text) | — (نسخة من personType) |
| `personType` | string | عمود `person_type` (text) | ✅ |
| `project` | string | عمود `project` (text) | ✅ |
| `projectId` | string | عمود `project_id` (text) | — (السيرفر بيحطه من اسم المشروع وقت الحفظ (DAILIES_ACCEPTANCE §4.2)) |
| `reviewDecision` | (من الكود القديم) | عمود `review_decision` (text) | ✅ |
| `reviewReason` | (من الكود القديم) | عمود `review_reason` (text) | ✅ |
| `reviewedAt` | (من الكود القديم) | عمود `reviewed_at` (text) | — (في التدقيق) |
| `reviewedBy` | (من الكود القديم) | عمود `reviewed_by` (text) | — (في التدقيق) |
| `site` | string | عمود `site` (text) | ✅ |
| `status` | string | عمود `status` (text) | ✅ |
| `supervisorId` | string | عمود `supervisor_id` (text) | ✅ |
| `workerId` | string | عمود `worker_id` (text) | ✅ |

## حضور الموظفين (`attendance` ← جدول `attendance`)
- **الحقول:** 7 — ليها عمود: **7**، ومحفوظة في `legacy_extra`: **0**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `checkIn` | (من الكود القديم) | عمود `check_in` (text) | ✅ |
| `checkOut` | (من الكود القديم) | عمود `check_out` (text) | ✅ |
| `date` | (من الكود القديم) | عمود `date` (text) | ✅ |
| `employeeId` | (من الكود القديم) | عمود `employee_id` (text) | ✅ |
| `id` | (من الكود القديم) | المفتاح الأساسي `id` | ✅ |
| `notes` | (من الكود القديم) | عمود `notes` (text) | ✅ |
| `status` | (من الكود القديم) | عمود `status` (text) | ✅ |

## الخلاصة
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع. **الاستثناء الوحيد المقصود:** تثبيت الأجر في اليوميات اللي مالهاش أجر (DEC-0130) — بيتعدّ في تقرير النقل (`normalizedOnWrite`).
