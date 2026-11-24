# دليل تشغيل نقل اليوميات وحضور الموظفين — البروفة (خطة v1.4.5 — المرحلة 8، الحزمة 8.5)

> **نفس الطريقة المعتمدة** في `LEAVES_CUTOVER_RUNBOOK.md`، بالموديول `attendance` (جدولين: `worker_attendance` و`attendance`). **ده مش تشغيل فعلي.**
> **جديد في الحزمة دي:** **تثبيت الأجر (DEC-0130، د-3)** — اليومية اللي مالهاش أجر محفوظ صالح بتتكتب بأجر صاحبها وقت النقل، **والرجوع مابيشيلوش** (القرار دايم). و**الحساب الجديد للمستحق (DEC-0129)** بيظهر في الشاشة الجديدة بس، والقديمة بتفضل بحسابها لحد الحزمة 8.6 (د-2).
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: أعداد، وأول 8 حروف من البصمات، وأوقات، ومجاميع بس (من غير أسماء ولا أجور أفراد).

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md` §0.
- **الكود:** آخر نسخة من الفرع، والصورة متبنية من جديد. الـ migration الجديدة: `AttendanceCutover`.
- **الحالة المبدئية:** كل الموديولات في `records` (بعد رجوع بروفة 8.4).

## 1. المطابقة المبدئية + التعديلات وقت التحميل
```powershell
Cut attendance reconcile > out\phase85\R0.json
```
**المتوقع:** `workerAttendance` و`attendance` بعدد السجلات الحقيقية (سجّلهم)، و`source: records`.
افتح `/legacy/#workerAttendance` واستنى الصفحة تخلص، وبعدين خد `R0x.json`. القديمة بتكمّل النوع والصاحب للسجلات الناقصة (`normalizeAttendanceRecord`). لو `R0x ≠ R0` **سجّل عدد السجلات اللي اتغيّرت ونوع التغيير بس**، وكمّل بـ R0x.

## 2. تقرير الفرق قبل النقل (د-2)
وإنت داخل بالأدمن: `GET /api/v1/dailies/diff` (من غير فترة = كل اليوميات) و`GET /api/v1/dailies/review`. **سجّل:** `records`، و`changed`، و`byReason` (تقريب / مراجعة)، و`legacyTotal` و`newTotal` و`difference`، وعدد قايمة المراجعة لكل سبب (مكررة / يتيمة / أجر صفر / حالة مش معروفة). **دي مجاميع — مفيش أسماء.**
**المتوقع من بروفة 8.4:** 4 يوميات يتيمة على الأقل في قايمة المراجعة.

## 3. dry-run مرتين
```powershell
Cut attendance dry-run > out\phase85\D1.txt
Cut attendance dry-run > out\phase85\D2.txt
```
**المتوقع:** `migrated` بنفس عدد R0x، و**`normalizedOnWrite` = عدد اليوميات اللي هيتثبّت أجرها** (سجّله)، وأعداد `untyped` لكل حقل. D1 = D2. **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل بس.

## 4. نسخة كاملة + اختبار استعادة، وبعدين التنفيذ
نفس §3 في دليل الفواتير. وبعدين كل الموديولات المعتمدة بالترتيب (`parties`، و`warehouses`، و`supplier-invoices`، و`supplier-payments`، و`projects`، و`workers`، و`supervisors-drivers`، و`employees`، و`leaves`)، وبعدهم:
```powershell
Cut attendance execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase85\E.txt
Cut attendance reconcile > out\phase85\R1.json
```
**المتوقع:** **`R1 = R0x`** (المطابقة بتحسب التثبيت في الاتنين)، و`source: table`، و`normalizedOnWrite` = §3.
**بعد التنفيذ:** `GET /api/v1/dailies/diff` تاني — `legacyTotal` **ممكن يتغيّر** بس في اليوميات اللي اتثبّت أجرها لو أجر صاحبها اتغيّر من وقت ما اتسجّلت (ده بالظبط الهدف من DEC-0130). سجّل الفرق بين §2 وهنا.

## 5. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#workerAttendance` و`/app/worker-attendance`: نفس اللوحات والجدول والكروت (ما عدا «مستحق الشهر» — بالحساب الجديد)، ومفيش أخطاء. ونفس الكلام لـ `/legacy/#attendance` و`/app/attendance`.
2. **الـ UAT** (`ATTENDANCE_UAT.md`) هنا، **على النسخة المعزولة بس**.
3. `Cut attendance reconcile > out\phase85\R1u.json`. **المتوقع:** العدد زاد بعدد اللي اتضاف.

## 6. الرجوع (بالعكس)
نسخة + اختبار استعادة ← `Cut attendance rollback` ← وبعده باقي الموديولات بالعكس ← `Cut attendance reconcile > out\phase85\R2.json`.
**المتوقع:** **`R2 = R1u`**، و`source: records`. **التثبيت بيفضل** (`dayWage` و`dayWageSource: 'pinned-at-cutover'` في السجلات اللي اتثبّتت) — اتأكد بالعدد بس.

## 7. التقرير
`docs/reports/v1.4.5/PHASE_08_5_REHEARSAL.md`: الخطوات والنتايج والأوقات، والأعداد، وعدد التثبيت، وأعداد `untyped`، وعدد التعديلات وقت التحميل ونوعها، وتقرير الفرق (المجاميع)، وأعداد قايمة المراجعة لكل سبب، والبصمات، ونتايج الـ UAT. **مفيش أسماء ولا أجور أفراد ولا أرقام قومية.**
