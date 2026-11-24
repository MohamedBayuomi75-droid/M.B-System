# دليل تشغيل نقل الإجازات — البروفة (خطة v1.4.5 — المرحلة 8، الحزمة 8.4)

> **نفس الطريقة المعتمدة** في `EMPLOYEES_CUTOVER_RUNBOOK.md`، بالموديول `leaves`. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** إجازة واحدة (موظف، سنوية، معتمدة).
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: أعداد، وأول 8 حروف من البصمات، وأوقات بس.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md` §0.
- **الكود:** آخر نسخة من الفرع، والصورة متبنية من جديد. الـ migration الجديدة: `LeavesCutover`.
- **الحالة المبدئية:** كل الموديولات في `records` (بعد رجوع بروفة 8.3).

## 1. المطابقة المبدئية + التعديلات وقت التحميل
```powershell
Cut leaves reconcile > out\phase84\R0.json
```
**المتوقع:** `leaves` = 1 (أو أكتر بعدد السجلات الاصطناعية من قبل — سجّلها)، و`source: records`. **مفيش أي تعديل.**
افتح `/legacy/#leaves` واستنى الصفحة تخلص، وبعدين خد `R0x.json`. القديمة بتحط `status` و`type` الافتراضيين للإجازة اللي ناقصاهم (`data-store.js`)، وبتحدّث حالة الأشخاص (`syncLeaveStatuses`). لو `R0x ≠ R0` **سجّل عدد السجلات اللي اتغيّرت ونوع التغيير بس**، وكمّل بـ R0x.
**جديد في 8.4:** افتح `/app/workers` مرة (قبل النقل) وسجّل عدد الأشخاص اللي حالتهم اتغيّرت من المزامنة اليومية في السيرفر (د-2) — المتوقع **0** لأن القديمة عملتها عند الفتح.

## 2. dry-run مرتين
```powershell
Cut leaves dry-run > out\phase84\D1.txt
Cut leaves dry-run > out\phase84\D2.txt
```
**المتوقع:** `migrated` بنفس عدد R0x، وأعداد `untyped` لكل حقل (سجّلها). **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل بس.

## 3. نسخة كاملة + اختبار استعادة، وبعدين التنفيذ
نفس §3 في دليل الفواتير. وبعدين كل الموديولات المعتمدة بالترتيب (`parties`، و`warehouses`، و`supplier-invoices`، و`supplier-payments`، و`projects`، و`workers`، و`supervisors-drivers`، و`employees`)، وبعدهم:
```powershell
Cut leaves execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase84\E.txt
Cut leaves reconcile > out\phase84\R1.json
```
**المتوقع:** **`R1 = R0x`**، و`source: table`.

## 4. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#leaves` و`/app/leaves`: نفس الكروت والفلاتر والجدول، ومفيش أخطاء.
2. **الـ UAT** (`LEAVES_UAT.md`) هنا، **على النسخة المعزولة بس**.
3. `Cut leaves reconcile > out\phase84\R1u.json`. **المتوقع:** العدد زاد بعدد اللي اتضاف.

## 5. الرجوع (بالعكس)
نسخة + اختبار استعادة ← `Cut leaves rollback` ← وبعده باقي الموديولات بالعكس ← `Cut leaves reconcile > out\phase84\R2.json`.
**المتوقع:** **`R2 = R1u`**، و`source: records`.

## 6. التقرير
`docs/reports/v1.4.5/PHASE_08_4_REHEARSAL.md`: الخطوات والنتايج والأوقات، والأعداد، وأعداد `untyped`، وعدد التعديلات وقت التحميل ونوعها، والبصمات، ونتايج الـ UAT. **مفيش أسماء ولا أرقام قومية ولا أسباب إجازات حقيقية.**
