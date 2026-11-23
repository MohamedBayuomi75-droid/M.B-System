# دليل تشغيل نقل العمال — البروفة (خطة v1.4.5 — المرحلة 8، الحزمة 8.1)

> **نفس الطريقة المعتمدة** في `PROJECTS_CUTOVER_RUNBOOK.md`، بالموديول `workers`. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** 182 عامل.
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: أعداد، وأول 8 حروف من البصمات، وأوقات بس.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md` §0.
- **الكود:** آخر نسخة من الفرع، والصورة متبنية من جديد. الـ migration الجديدة: `WorkersCutover`.
- **الحالة المبدئية:** كل الموديولات في `records`.

## 1. المطابقة المبدئية
```powershell
Cut workers reconcile > out\phase81\R0.json
```
**المتوقع:** `workers` = 182، و`source: records`. **مفيش أي تعديل.**

**مهم (`WORKERS_ACCEPTANCE.md` §3.1):** افتح `/legacy/#workers` مرة **قبل** R0، واستنى الصفحة تخلص، وبعدين خد R0 تاني (`R0x.json`).
- لو `R0x ≠ R0`، يبقى الواجهة القديمة عدّلت بيانات وقت التحميل (قسم، أو كود، أو حالة إجازة). **سجّل عدد السجلات اللي اتغيّرت بس**، وكمّل بـ R0x.

## 2. dry-run مرتين
```powershell
Cut workers dry-run > out\phase81\D1.txt
Cut workers dry-run > out\phase81\D2.txt
```
**المتوقع:** `migrated: 182`، وأعداد `untyped` لكل حقل (سجّلها). **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل بس.

## 3. نسخة كاملة + اختبار استعادة، وبعدين التنفيذ
نفس §3 في دليل الفواتير. وبعدين كل الموديولات المعتمدة بالترتيب (`parties`، و`warehouses`، و`supplier-invoices`، و`supplier-payments`، و`projects`)، وبعدهم:
```powershell
Cut workers execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase81\E.txt
Cut workers reconcile > out\phase81\R1.json
```
**المتوقع:** **`R1 = R0x`** (أو R0)، و`source: table`.

## 4. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#workers` و`/app/workers`: نفس اللوحات والأعداد والكروت، ومفيش أخطاء.
2. **الـ UAT** (`WORKERS_UAT.md`) هنا، **على النسخة المعزولة بس**.
3. `Cut workers reconcile > out\phase81\R1u.json`. **المتوقع:** العمال زادوا بعدد اللي اتضاف.

## 5. الرجوع (بالعكس)
نسخة + اختبار استعادة ← `Cut workers rollback` ← وبعده باقي الموديولات بالعكس ← `Cut workers reconcile > out\phase81\R2.json`.
**المتوقع:** **`R2 = R1u`**، و`source: records`.

## 6. التقرير
`docs/reports/v1.4.5/PHASE_08_1_REHEARSAL.md`: الخطوات والنتايج والأوقات، والأعداد، وأعداد `untyped`، وعدد التعديلات وقت التحميل (§1)، والبصمات، ونتايج الـ UAT. **مفيش أسماء ولا أرقام قومية ولا أجور.**
