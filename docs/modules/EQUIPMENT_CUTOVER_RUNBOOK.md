# دليل تشغيل نقل المعدات ويومياتها — جزء من البروفة المجمّعة (خطة v1.4.5 — المرحلة 8، الحزمة 8.7)

> **البروفة المجمّعة (DEC-0136):** الدليل ده بيتنفّذ **ضمن** البروفة الواحدة آخر المرحلة 8، بعد `WORKER_PAYMENTS_CUTOVER_RUNBOOK.md` وقبل موديولات 8.8. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية (قاموس البيانات):** `equipment` = 31، و`equipmentDaily` = 1، و`equipmentTypes` = 17 — يعني أثر الحساب الجديد (DEC-0140) على يومية واحدة بس لحد دلوقتي.
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: أعداد، ومجاميع، وأول 8 حروف من البصمات، وأوقات بس — من غير أسماء معدات ولا لوحات ولا أرقام شاسيه.

## 0. المتطلبات
- نفس §0 في دليل الفواتير (`$P` و`$F` و`$BK` و`Cut`). الـ migration الجديدة: `EquipmentCutover` (الجدولين `equipment` و`equipment_daily`).
- `WEB_CUTOVER` في البيئة المعزولة بيضيف `equipment`.

## 1. المطابقة المبدئية
```powershell
Cut equipment reconcile > out\phase8x\EQ_R0.json
```
**المتوقع:** `equipment` = 31، و`equipmentDaily` = 1 (أو أكتر لو اتسجّل جديد من بعد قاموس البيانات — **سجّل العدد بس**)، و`source: records`.

## 2. الأرقام قبل النقل (مجاميع بس)
بالأدمن: `GET /api/v1/equipment` (الكل) و`GET /api/v1/equipment/daily?from=2000-01-01&to=2099-12-31` و`GET /api/v1/dues/table?tab=equipment`. **سجّل:** عدد المعدات، وعدد اللي ليها ملاحظات (مستندات ناقصة)، وعدد اليوميات، و`cards.cost` و`cards.legacyCost`، و`cards.due` و`cards.legacyDue` في المستحقات، وعدد اليوميات حسب النوع (تشغيل / توقف / نقل).
**الفرق المتوقع بين الحسابين** بس في يوميات «توقف» (50%) و«نقل» (تكلفة النقل) واللي فيها «تكلفة إضافية». يومية «نقل» قديمة من غير تكلفة مسجّلة = **0 في الجديد** — سجّل عددها: دي محتاجة تتراجع وتتكتب تكلفتها بعد القلب.

## 3. dry-run مرتين، ونسخة، وتنفيذ
```powershell
Cut equipment dry-run > out\phase8x\EQ_D1.txt
Cut equipment dry-run > out\phase8x\EQ_D2.txt
Cut equipment execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase8x\EQ_E.txt
Cut equipment reconcile > out\phase8x\EQ_R1.json
```
**المتوقع:** D1 = D2، و`R1 = R0`، و`source: table`، و0 حقول ضايعة (`EQUIPMENT_FIELD_PARITY.md`).

## 4. الواجهتين فوق الجداول (ومكان الـ UAT)
`/legacy/#equipment` و`/app/equipment`، و`/legacy/#workerDues` ← المعدات و`/app/worker-dues` ← المعدات: نفس اللوحات والجداول والكروت (التكلفة بالحسابين)، ومفيش أخطاء. **الـ UAT** (`EQUIPMENT_UAT.md`) هنا، على النسخة المعزولة بس، وبمعدة «تجريبي».

## 5. مفتاح الحساب الجديد في القديمة — تجربة بس
على النسخة المعزولة: `settings.newDayPay = true`، وافتح `/legacy/#equipment` ← الجدول الشهري و`/legacy/#workerDues` ← المعدات: **التكلفة والمستحق لازم يساووا `cards.cost` و`cards.due` من §2** (بعد التقريب لخانتين). سجّل «مطابق / مش مطابق»، وبعدين رجّع المفتاح `false`. **التفعيل الفعلي مع قلب التوجيه في البوابة المجمّعة.**

## 6. الرجوع
`Cut equipment rollback` (قبل رجوع الصرف واليوميات) ← `Cut equipment reconcile > out\phase8x\EQ_R2.json`. **المتوقع:** `R2 = R1u`، و`source: records`، وقايمة `equipmentTypes` زي ما هي.

## 7. التقرير
في تقرير البروفة المجمّعة: الأعداد، ومجاميع §2 و§5، وعدد يوميات «نقل» من غير تكلفة، والبصمات، ونتايج الـ UAT. **مفيش أسماء ولا لوحات.**
