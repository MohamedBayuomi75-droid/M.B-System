# دليل البروفة المجمّعة — المرحلة 8 (الحزم 8.5–8.8) (خطة v1.4.5، DEC-0136، DEC-0143)

> **بروفة واحدة** لكل اللي اتقفل بالاختبارات: اليوميات وحضور الموظفين (8.5) ← الصرف والخصومات (8.6) ← المعدات ويومياتها (8.7) ← التكاليف (8.8). **ده مش تشغيل فعلي** — على النسخة المعزولة `erp-phase2-proof` بس.
> **التوفير:** الخطوات الآلية كلها في سكربت واحد (`tools/ops/phase8-rehearsal.ps1`) بيطبع ✅/❌ لكل مطابقة؛ الإنسان بيتدخّل في 4 نقط بس: فتح الصفحات القديمة، والنسخ الاحتياطية، والـ UAT، والتقرير.
> **الأمان:** الملف الأصلي في `%APPDATA%\النظام الموحد` قراءة بس. **مفيش بيانات حقيقية في المستودع**: أعداد، ومجاميع، وأول 8 حروف من البصمات، وأوقات بس. مخرجات السكربت في `out\phase8x\` (برّه المستودع).
> **التفاصيل لكل موديول** في أدلته: `ATTENDANCE_CUTOVER_RUNBOOK.md`، و`WORKER_PAYMENTS_CUTOVER_RUNBOOK.md`، و`EQUIPMENT_CUTOVER_RUNBOOK.md`، و`COSTS_CUTOVER_RUNBOOK.md` — الدليل ده بيجمعهم بالترتيب ومابيلغيهمش.

## 0. التجهيز (مرة واحدة)
1. فولدر العمل `C:\Users\levovo\erp-phase2-proof`، وآخر نسخة من الفرع `claude/clever-einstein-pev30m`.
2. بناء الصورة من جديد وتطبيق الـ migrations (الجديد من آخر بروفة: `WorkerPaymentsCutover`، و`EquipmentCutover`، و`CostsCutover`):
   ```powershell
   docker compose -p erp-phase2-proof -f compose.yml build server migrate
   docker compose -p erp-phase2-proof -f compose.yml run --rm migrate
   docker compose -p erp-phase2-proof -f compose.yml up -d
   ```
3. **الحالة المبدئية:** كل الموديولات في `records` (بعد رجوع بروفة 8.5). لو حاجة متنقلة: ارجعها الأول.
4. انسخ السكربت لفولدر العمل، وحدد الإعدادات:
   ```powershell
   Copy-Item <المستودع>\tools\ops\phase8-rehearsal.ps1 .
   $env:ERP_BASE = 'http://127.0.0.1:<بورت السيرفر>'
   $env:ERP_BACKUP_DIR = '<مسار BACKUP_DIR بتاع البيئة A>'
   $env:ERP_TOKEN = '<توكن الأدمن>'   # افتح /legacy/ بالأدمن ← F12 ← Console: WebSession.token()
   ```
   التوكن بيخلص بعد فترة — لو أمر الـ API رجّع 401، هات توكن جديد بنفس الطريقة.

## 1. قبل النقل (آلي)
```powershell
.\phase8-rehearsal.ps1 -Stage pre
```
بيعمل: R0 للموديولات الأربعة ← **يوقف** عشان تفتح `/legacy/#workerAttendance` و`#workerDues` و`#equipment` و`#costs` (كل صفحة لحد ما تخلص) ← R0x ومقارنته بـ R0 ← dry-run مرتين لكل موديول ومقارنتهم ← مجاميع الـ API قبل النقل (`api.S0.json`).
**المتوقع:** `R0 = R0x` (أو سجّل اللي اتغيّر وقت التحميل — عدد ونوع بس)، و`D1 = D2` للأربعة، ومفيش `PARITY_FAILED`. **لو أي ❌:** وقّف وابعت السطر بس.

## 2. نسخة كاملة + اختبار استعادة
```powershell
docker compose -p erp-phase2-proof -f compose.yml exec backup /opt/backup/backup-full.sh
docker compose -p erp-phase2-proof -f compose.yml exec backup /opt/backup/restore-test.sh
```
سجّل **وقت النسخة** (`at` بتاع آخر سطر `"kind":"base"` بحالة `ok` في `backup-log.jsonl`).

## 3. النقل (آلي)
```powershell
.\phase8-rehearsal.ps1 -Stage execute -ConfirmBackup <وقت النسخة>
```
بينفّذ الـ 13 موديول بالترتيب: المعتمدين (الموردين والعملاء، والمخازن، والفواتير، والدفعات، والمشروعات، والعمال، والمشرفين والسواقين، والموظفين، والإجازات) وبعدهم **اليوميات ← الصرف ← المعدات ← التكاليف** ← R1 ومقارنته بـ R0x ← مجاميع الـ API بعد النقل (`api.S1.json`).
**المتوقع:** كل الأوامر `exit 0`، و**`R1 = R0x`** للأربعة، و`source: table`، و**`api.S1` = `api.S0`** في كل المجاميع (النقل مابيغيّرش رقم).

## 4. تقرير الفرق المجمّع (من `api.S0.json` — مجاميع بس)
| البند | من فين | المتوقع |
|---|---|---|
| اليوميات | `dailies`: `records`، و`changed` و`byReason` (تقريب / مراجعة)، و`legacyTotal` / `newTotal` / `difference`، و`review` | زي بروفة 8.5 تقريبًا (−3,200 و6 يوميات مراجعة و8 في القايمة) + أي يومية جديدة اتسجّلت من وقتها |
| المستحقات | `dues` لكل نوع: الصفوف، و`legacyDue`/`due`، و`legacyBal`/`bal`، و`changed` | نفس اتجاه فرق اليوميات؛ الصرف الحقيقي 0 |
| المعدات | `equipment`: اليوميات بالنوع، و`legacyCost`/`cost`، و`moveWithoutCost` | يومية واحدة؛ الفرق صفر إلا لو كانت توقف / نقل / فيها تكلفة إضافية |
| تكلفة المشاريع | `projectCost`: الصفوف، و`unregistered`، و`pendingDailies`، و`legacyTotal`/`newTotal`، و`byColumn`، و`budgetStatusChanged` | الفرق في `suppliers` (الصافي بدل الإجمالي) و`labor` (فرق اليوميات) بس؛ `expenses` = 0 |
**أي فرق في عمود مش متوقع ← وقّف وسجّله.**

## 5. الواجهتين فوق الجداول
`/legacy/` و`/app/` لكل موديول من الأربعة (اليوميات، وحضور الموظفين، والمستحقات، والمعدات، والتكاليف، والمشاريع — عمود التكلفة): نفس اللوحات والجداول، ومفيش أخطاء JS.

## 6. الـ UAT (على النسخة المعزولة بس، وبيانات «تجريبي»)
بالترتيب: `ATTENDANCE_UAT.md` (Y1–Y17) ← `WORKER_PAYMENTS_UAT.md` (U1–U16) ← `EQUIPMENT_UAT.md` (E1–E19) ← `PROJECT_COST_UAT.md` (T1–T15). **سيناريوهات المفتاح** (U16، وE19، وT15) تتعمل **مرة واحدة في الآخر**: `settings.newDayPay = true` ← اتأكد من الأربع صفحات القديمة ← رجّعه `false`.
سجّل لكل سيناريو: نجح / فشل / ملاحظة. **لو فشل:** صورة الشاشة (من غير بيانات حقيقية) ورقم السيناريو.
بعد الـ UAT:
```powershell
.\phase8-rehearsal.ps1 -Stage after-uat
```
**المتوقع:** العدد زاد بعدد اللي اتضاف في الـ UAT بس.

## 7. الرجوع
نسخة + اختبار استعادة (§2) ← :
```powershell
.\phase8-rehearsal.ps1 -Stage rollback -ConfirmBackup <وقت النسخة الجديدة>
```
بيرجّع الـ 13 بالعكس (التكاليف ← المعدات ← الصرف ← اليوميات ← الإجازات … ← الموردين والعملاء) ← R2.
**المتوقع:** **`R2 = R1u`** للأربعة، و`source: records`، وتثبيت الأجر بيفضل (DEC-0130).

## 8. التقرير
```powershell
.\phase8-rehearsal.ps1 -Stage summary
```
وبعدين `docs/reports/v1.4.5/PHASE_08_COMBINED_REHEARSAL.md` بنفس شكل `PHASE_08_5_REHEARSAL.md`: البيئة، وجدول الخطوات (من `SUMMARY.md`)، وتقرير الفرق المجمّع (§4)، ونتايج الـ UAT (67 سيناريو)، والملاحظات. **راجع إن مفيش اسم ولا مبلغ فرد قبل الـ push.** وبعدين قولّي «البروفة خلصت» عشان أكتب البوابة.

## لو حاجة وقفت
- `PARITY_FAILED` أو `R ≠ R` ← **وقّف**، وماتكمّلش، وابعت اسم الموديول والمجموعة والحقل بس.
- أمر `cutover` رفض النسخة ← الأمر بيطبع الوقت الصح — استخدمه.
- السكربت نفسه وقع (PowerShell) ← الأوامر اللي جواه هي هي اللي في أدلة الموديولات؛ كمّل يدوي من نفس الخطوة وسجّل.
