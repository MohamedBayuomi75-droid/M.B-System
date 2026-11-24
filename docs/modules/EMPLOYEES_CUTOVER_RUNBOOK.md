# دليل تشغيل نقل الموظفين — البروفة (خطة v1.4.5 — المرحلة 8، الحزمة 8.3)

> **نفس الطريقة المعتمدة** في `WORKERS_CUTOVER_RUNBOOK.md` و`SUPERVISORS_DRIVERS_CUTOVER_RUNBOOK.md`، بالموديول `employees`. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** 40 موظف.
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: أعداد، وأول 8 حروف من البصمات، وأوقات بس.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md` §0.
- **الكود:** آخر نسخة من الفرع، والصورة متبنية من جديد. الـ migration الجديدة: `EmployeesCutover`.
- **الحالة المبدئية:** كل الموديولات في `records` (بعد رجوع بروفة 8.2).

## 1. المطابقة المبدئية + التعديلات وقت التحميل
```powershell
Cut employees reconcile > out\phase83\R0.json
```
**المتوقع:** `employees` = 40 (أو أكتر بعدد السجلات الاصطناعية من بروفات قبل كده — سجّلها)، و`source: records`. **مفيش أي تعديل.**
افتح `/legacy/#employees` واستنى الصفحة تخلص، وبعدين خد `R0x.json`. **مهم هنا:** القديمة بتحط القسم الأساسي للموظف اللي مالوش قسم وقت التحميل (`assignCoreDepartments`)، وبتحدّث حالة «في إجازة» (`syncLeaveStatuses`). لو `R0x ≠ R0` **سجّل عدد السجلات اللي اتغيّرت بس** (ونوع التغيير: القسم، أو حالة الإجازة)، وكمّل بـ R0x.

## 2. dry-run مرتين
```powershell
Cut employees dry-run > out\phase83\D1.txt
Cut employees dry-run > out\phase83\D2.txt
```
**المتوقع:** `migrated` بنفس عدد R0x، وأعداد `untyped` لكل حقل (سجّلها — مثلًا رصيد إجازة متخزن كنص). **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل بس.

## 3. نسخة كاملة + اختبار استعادة، وبعدين التنفيذ
نفس §3 في دليل الفواتير. وبعدين كل الموديولات المعتمدة بالترتيب (`parties`، و`warehouses`، و`supplier-invoices`، و`supplier-payments`، و`projects`، و`workers`، و`supervisors-drivers`)، وبعدهم:
```powershell
Cut employees execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase83\E.txt
Cut employees reconcile > out\phase83\R1.json
```
**المتوقع:** **`R1 = R0x`**، و`source: table`.

## 4. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#employees` و`/app/employees`: نفس اللوحات والأعداد والكروت، **وقسم المستقيلين بكروته وفلاتره وجدوله الخاص**، ومفيش أخطاء.
2. **الـ UAT** (`EMPLOYEES_UAT.md`) هنا، **على النسخة المعزولة بس**.
3. `Cut employees reconcile > out\phase83\R1u.json`. **المتوقع:** العدد زاد بعدد اللي اتضاف.

## 5. الرجوع (بالعكس)
نسخة + اختبار استعادة ← `Cut employees rollback` ← وبعده باقي الموديولات بالعكس ← `Cut employees reconcile > out\phase83\R2.json`.
**المتوقع:** **`R2 = R1u`**، و`source: records`.

## 6. التقرير
`docs/reports/v1.4.5/PHASE_08_3_REHEARSAL.md`: الخطوات والنتايج والأوقات، والأعداد، وأعداد `untyped`، وعدد التعديلات وقت التحميل (§1) ونوعها، والبصمات، ونتايج الـ UAT. **مفيش أسماء ولا أرقام قومية ولا رواتب ولا بريد.**
