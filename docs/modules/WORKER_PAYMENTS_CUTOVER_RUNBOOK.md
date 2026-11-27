# دليل تشغيل نقل الصرف والخصومات — جزء من البروفة المجمّعة (خطة v1.4.5 — المرحلة 8، الحزمة 8.6)

> **البروفة المجمّعة (DEC-0136):** الدليل ده بيتنفّذ **ضمن** البروفة الواحدة آخر المرحلة 8، بعد `ATTENDANCE_CUTOVER_RUNBOOK.md` وقبل موديولات 8.7 و8.8. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** `workerPayments` = 0، و`employeePenalties` = 0 — النقل نفسه شكلي. **الأثر الحقيقي في المستحق والمتبقي** (من 880 يومية و41 تكلفة) — وده اللي §2 و§5 بيقيسوه.
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: أعداد، ومجاميع، وأول 8 حروف من البصمات، وأوقات بس — من غير أسماء ولا أرصدة أفراد.

## 0. المتطلبات
- نفس §0 في دليل الفواتير (`$P` و`$F` و`$BK` و`Cut`). الـ migration الجديدة: `WorkerPaymentsCutover`.

## 1. المطابقة المبدئية
```powershell
Cut worker-payments reconcile > out\phase8x\WP_R0.json
```
**المتوقع:** `workerPayments` = 0، و`employeePenalties` = 0 (أو أكتر لو اتسجّل صرف حقيقي من بعد قاموس البيانات — **سجّل العدد بس**).

## 2. المستحقات قبل النقل (مجاميع بس)
بالأدمن: `GET /api/v1/dues/table?tab=workers` و`supervisors` و`drivers` و`employees`. **سجّل لكل نوع:** عدد الصفوف، و`cards.legacyDue` و`cards.due`، و`cards.legacyBal` و`cards.bal`، وعدد الصفوف اللي `legacyBal ≠ bal`. **ده الفرق بسبب الحساب الجديد (DEC-0129) والمراجعة (DEC-0133)** — لازم يطابق اتجاه تقرير فرق اليوميات.
وقارن بالواجهة القديمة: `/legacy/#workerDues` نفس الكروت (بالحساب القديم) — سجّل «مطابق / مش مطابق» لكل نوع.

## 3. dry-run مرتين، ونسخة، وتنفيذ
```powershell
Cut worker-payments dry-run > out\phase8x\WP_D1.txt
Cut worker-payments dry-run > out\phase8x\WP_D2.txt
Cut worker-payments execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase8x\WP_E.txt
Cut worker-payments reconcile > out\phase8x\WP_R1.json
```
**المتوقع:** D1 = D2، و`R1 = R0`، و`source: table`.

## 4. الواجهتين فوق الجداول (ومكان الـ UAT)
`/legacy/#workerDues` و`/app/worker-dues`: نفس اللوحات والجداول والسجل، ومفيش أخطاء. **الـ UAT** (`WORKER_PAYMENTS_UAT.md`) هنا، على النسخة المعزولة بس، وببيانات «تجريبي».

## 5. مفتاح الحساب الجديد في القديمة (د-2) — تجربة بس
على النسخة المعزولة: `settings.newDayPay = true` (من الإعدادات أو بالـ sync كـ doc)، وافتح `/legacy/#workerDues`: **الكروت لازم تساوي `cards.bal` من §2** (بعد التقريب لخانتين). سجّل «مطابق / مش مطابق» لكل نوع، وبعدين رجّع المفتاح `false`. **التفعيل الفعلي مع قلب التوجيه في البوابة المجمّعة.**

## 6. الرجوع
`Cut worker-payments rollback` (قبل رجوع اليوميات) ← `Cut worker-payments reconcile > out\phase8x\WP_R2.json`. **المتوقع:** `R2 = R1u`، و`source: records`.

## 7. التقرير
في تقرير البروفة المجمّعة: الأعداد، ومجاميع §2 و§5، والبصمات، ونتايج الـ UAT. **مفيش أسماء ولا أرصدة أفراد.**
