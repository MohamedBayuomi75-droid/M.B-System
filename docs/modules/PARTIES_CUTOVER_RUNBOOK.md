# دليل تشغيل نقل الموردين والعملاء — البروفة (خطة v1.4.5 — المرحلة 6، البند 6.5)

> **الهدف:** إثبات إن النقل للجداول والرجوع منها **بيتكرر بنفس النتيجة، وبمطابقة 100%**، على نسخة البيانات الحقيقية في بيئة معزولة، وقياس الأوقات. **ده مش تشغيل فعلي** (مفيش إنتاج). نفس الدليل ده هو اللي هيتنفّذ في المرحلة 13.
> **المعيار:** P6-D في `docs/reports/v1.4.5/PHASE_06_BEFORE_REPORT.md`.
> **الأمان:** البيانات الأصلية `%APPDATA%\النظام الموحد` **قراءة بس**. **ممنوع أي بيانات حقيقية في المستودع**: التقرير فيه أعداد وبصمات وأوقات بس، والنتايج الخام بتفضل في فولدر العمل.

## 0. المتطلبات
| البند | القيمة |
|---|---|
| البيئة | البيئة المعزولة بتاعة المرحلة 2: مشروع Compose **`erp-phase2-proof`**، وفولدر العمل `C:\Users\levovo\erp-phase2-proof` (البيئة **A**، فيها نسخة البيانات الحقيقية محمّلة). لو اتمسحت: تتعمل من جديد بنفس خطوات المرحلة 2 (`PHASE_02_AFTER_REPORT.md` §أ–ج) |
| الكود | الفرع `claude/clever-einstein-pev30m` **آخر نسخة** (فيها أمر `reconcile`). صورة السيرفر لازم تتبني من جديد: `docker compose -p erp-phase2-proof -f <compose.yml> build server migrate` |
| الحالة المبدئية | الموردين والعملاء **مش متنقلين** (`reconcile` بيقول `source: records`). لو متنقلين من قبل: `rollback` الأول (§6) وبعدين ابدأ من §1 |

**اختصارات** (PowerShell، من فولدر العمل):
```powershell
$P = 'erp-phase2-proof'; $F = 'C:\Users\levovo\erp-phase2-proof\compose.yml'
$BK = '<مسار BACKUP_DIR بتاع البيئة A على اللابتوب>'   # نفس المسار المستخدم في المرحلة 2
function Cut { docker compose -p $P -f $F run --rm -v "${BK}:/backup:ro" server node dist/cli/cutover.js @args }
```
كل خطوة: سجّل **وقت البداية والنهاية** (`Measure-Command { ... }`) واحفظ المخرج في `out\phase6\<رقم الخطوة>.json` جوه فولدر العمل.

## 1. المطابقة المبدئية R0
```powershell
Cut parties reconcile > out\phase6\R0.json
```
**المتوقع:** `ledger.suppliers` و`clients.customers` بـ `source: "records"`، والأعداد = أعداد المرحلة 2 (279 مورد، وعميل واحد).

## 2. dry-run مرتين (التكرار بنفس النتيجة)
```powershell
Cut parties dry-run > out\phase6\D1.txt
Cut parties dry-run > out\phase6\D2.txt
Cut parties reconcile > out\phase6\R0b.json
```
**المتوقع:**
- الاتنين بيخلصوا بـ `✓ dry-run`.
- نفس `migrated` لكل مجموعة، ونفس قايمة `rounding` (فاضية في المرحلة 2).
- `R0b` = `R0` في كل البصمات (`content` و`order` و`others`): الـ dry-run مالوش أي أثر.

## 3. نسخة كاملة + اختبار استعادة
```powershell
docker compose -p $P -f $F exec backup /opt/backup/backup-full.sh
docker compose -p $P -f $F exec backup /opt/backup/restore-test.sh
```
**المتوقع:** الاتنين `ok` في `backup-log.jsonl`. سجّل **وقت النسخة** (`at` بتاع آخر سطر `"kind":"base"` بحالة `ok`، لأن `backup-full.sh` بيسجّل النسخة الكاملة كده): ده اللي بيتكتب في `--confirm-backup`. لو اتكتب وقت غلط، الأمر بيرفض وبيطبع الوقت الصح.

## 4. التنفيذ
```powershell
Cut parties execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase6\E.txt
Cut parties reconcile > out\phase6\R1.json
```
**المتوقع:**
- `✓ execute تم`، وتكافؤ كل سجل بيتعمل جوه الأمر نفسه (أي فرق = فشل ومفيش حاجة بتتحفظ).
- **`R1` = `R0` في `count` و`content` و`order` لكل مجموعة، و`others` كلها**، و`source: "table"`.

## 5. الواجهة القديمة فوق الجداول + تعديل تجريبي
1. افتح `/legacy/#ledger.suppliers` و`/legacy/#clients.customers`: العدد في القايمة = R1، ومفيش أخطاء.
2. افتح `/app/suppliers` و`/app/customers`: نفس العدد.
3. **تعديل تجريبي** (على النسخة المعزولة بس): من `/app/suppliers` عدّل «ملاحظات» مورد واحد واحفظ، وتأكد إن التعديل ظاهر في `/legacy/`. ومن `/legacy/` عدّل هاتف عميل واحد واحفظ، وتأكد إنه ظاهر في `/app/customers`.
4. `Cut parties reconcile > out\phase6\R1b.json`. **المتوقع:** البصمة اتغيّرت في المجموعتين بس (`content`)، والأعداد والترتيب و`others` زي ما هم.

## 6. الرجوع
```powershell
docker compose -p $P -f $F exec backup /opt/backup/backup-full.sh
docker compose -p $P -f $F exec backup /opt/backup/restore-test.sh
Cut parties rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase6\B.txt
Cut parties reconcile > out\phase6\R2.json
```
**المتوقع:**
- `restored` = أعداد R1b.
- **`R2` = `R1b` في كل البصمات** (الرجوع بيرجّع الحالة الحالية بالظبط، **شاملة التعديل التجريبي**)، و`source: "records"`.
- الواجهة القديمة شغالة على records تاني، والتعديلين التجريبيين موجودين.

## 7. التكرار (اختياري، مستحسن)
كرّر §4–§6 مرة تانية من غير تعديل تجريبي: **R1 تاني = R2**، و**R2 تاني = R2**.

## 8. المطابقة النهائية (P6-D)
| البند | المعيار |
|---|---|
| dry-run × 2 | نفس النتيجة، و`R0b = R0` |
| execute | `R1 = R0` (أعداد، وبصمة المحتوى، والترتيب، وباقي المجموعات) |
| الواجهة القديمة فوق الجداول | الأعداد مطابقة، والتعديل التجريبي ظاهر في الواجهتين |
| rollback | `R2 = R1b` |
| الأوقات | لكل خطوة (dry-run، والنسخة، واختبار الاستعادة، وexecute، وreconcile، وrollback) |

## 9. التقرير
يتكتب في **`docs/reports/v1.4.5/PHASE_06_REHEARSAL.md`** على نفس الفرع: جدول §8 بنتيجة كل بند (✅/❌)، والأعداد، و**أول 8 حروف بس** من كل بصمة (للمقارنة)، والأوقات. **مفيش أسماء ولا قيم.** النتايج الخام تفضل في `out\phase6\`.

## 10. لو حاجة فشلت
| الحالة | التصرّف |
|---|---|
| `PARITY_FAILED` في dry-run أو execute | مفيش أي حاجة اتحفظت (معاملة واحدة). سجّل **أسماء الحقول** اللي في رسالة الخطأ (من غير قيم) ووقّف |
| `R1 ≠ R0` | `rollback` فورًا (§6)، وبعدين `reconcile` وقارن بـ R0، ووقّف وسجّل |
| الواجهة القديمة فيها خطأ فوق الجداول | `rollback` (§6) ووقّف وسجّل الخطأ |
| `rollback` فشل | مفيش حاجة اتغيّرت (معاملة واحدة). الحل الأخير: استعادة النسخة الكاملة من §6 (`restore.sh`)، ده **بيئة معزولة** |
| `مفيش نسخة كاملة ناجحة في السجل` / `مفيش اختبار استعادة ناجح بعد آخر نسخة كاملة` | الأمر رفض قبل ما يتصل بالقاعدة، ومفيش حاجة اتغيّرت. شغّل `backup-full.sh` وبعده `restore-test.sh` (§3) وأعد المحاولة. **ممنوع تعديل `backup-log.jsonl` باليد** |
