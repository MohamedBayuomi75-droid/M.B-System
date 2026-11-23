# دليل تشغيل نقل المشرفين والسواقين — البروفة (خطة v1.4.5 — المرحلة 8، الحزمة 8.2)

> **نفس الطريقة المعتمدة** في `WORKERS_CUTOVER_RUNBOOK.md`، بالموديول `supervisors-drivers` (الاتنين في أمر واحد). **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** 3 مشرفين و23 سواق.
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: أعداد، وأول 8 حروف من البصمات، وأوقات بس.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md` §0.
- **الكود:** آخر نسخة من الفرع، والصورة متبنية من جديد. الـ migration الجديدة: `SupervisorsDriversCutover`.
- **الحالة المبدئية:** كل الموديولات في `records`.

## 1. المطابقة المبدئية + التعديلات وقت التحميل
```powershell
Cut supervisors-drivers reconcile > out\phase82\R0.json
```
**المتوقع:** `supervisors` = 3، و`drivers` = 23، و`source: records`. **مفيش أي تعديل.**
افتح `/legacy/#supervisors` و`/legacy/#drivers` واستنى الصفحتين يخلصوا، وبعدين خد `R0x.json`. لو `R0x ≠ R0` **سجّل عدد السجلات اللي اتغيّرت بس** (القسم، أو الكود، أو حالة الإجازة)، وكمّل بـ R0x.

## 2. dry-run مرتين
```powershell
Cut supervisors-drivers dry-run > out\phase82\D1.txt
Cut supervisors-drivers dry-run > out\phase82\D2.txt
```
**المتوقع:** `migrated` 3 و23، وأعداد `untyped` لكل حقل (سجّلها). **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل بس.

## 3. نسخة كاملة + اختبار استعادة، وبعدين التنفيذ
نفس §3 في دليل الفواتير. وبعدين كل الموديولات المعتمدة بالترتيب (`parties`، و`warehouses`، و`supplier-invoices`، و`supplier-payments`، و`projects`، و`workers`)، وبعدهم:
```powershell
Cut supervisors-drivers execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase82\E.txt
Cut supervisors-drivers reconcile > out\phase82\R1.json
```
**المتوقع:** **`R1 = R0x`**، و`source: table` للاتنين.

## 4. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#supervisors` و`/app/supervisors`، و`/legacy/#drivers` و`/app/drivers`: نفس اللوحات والأعداد والكروت، ومفيش أخطاء.
2. **الـ UAT** (`SUPERVISORS_DRIVERS_UAT.md`) هنا، **على النسخة المعزولة بس**.
3. `Cut supervisors-drivers reconcile > out\phase82\R1u.json`. **المتوقع:** الأعداد زادت بعدد اللي اتضاف.

## 5. الرجوع (بالعكس)
نسخة + اختبار استعادة ← `Cut supervisors-drivers rollback` ← وبعده باقي الموديولات بالعكس ← `Cut supervisors-drivers reconcile > out\phase82\R2.json`.
**المتوقع:** **`R2 = R1u`**، و`source: records`.

## 6. التقرير
`docs/reports/v1.4.5/PHASE_08_2_REHEARSAL.md`: الخطوات والنتايج والأوقات، والأعداد، وأعداد `untyped`، وعدد التعديلات وقت التحميل (§1)، والبصمات، ونتايج الـ UAT. **مفيش أسماء ولا أرقام قومية ولا أجور.**
