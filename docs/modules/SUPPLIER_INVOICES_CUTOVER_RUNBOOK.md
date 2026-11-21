# دليل تشغيل نقل فواتير ومرتجعات الموردين — البروفة (خطة v1.4.5 — المرحلة 7، الحزمة 7.2)

> **نفس الطريقة المعتمدة** في `PARTIES_CUTOVER_RUNBOOK.md` (DEC-0095) و`WAREHOUSES_CUTOVER_RUNBOOK.md`، بالموديول `supplier-invoices`. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** 648 فاتورة، منها 47 مرتجع. **دي أول بروفة على بيانات مالية حقيقية بالحجم ده.**
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**:
> - التقرير فيه أعداد، وأول 8 حروف من البصمات، وأوقات بس.
> - القايمة التفصيلية لتقرير المطابقة (`--out`) بتفضل على اللابتوب جوه فولدر العمل، **ومابتترفعش**.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها نفس الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `PARTIES_CUTOVER_RUNBOOK.md` §0.
- **اختصار جديد** لتقرير مطابقة الفواتير (قراءة بس):
  ```powershell
  function InvRec { docker compose -p $P -f $F run --rm -v "${PWD}\out:/out" server node dist/cli/invoice-reconcile.js @args }
  ```
- **الكود:** آخر نسخة من الفرع، وصورة السيرفر متبنية من جديد (`server` و`migrate`)، و**الـ migrations متطبّقة** (فيها جدول `supplier_invoices`).
- **الحالة المبدئية:** الفواتير **مش متنقلة** (`Cut supplier-invoices reconcile` بيقول `source: records`). الموردين والمخازن في `records` كمان (بعد رجوع بروفاتهم).

## 1. المطابقة المبدئية R0 + تقرير الفواتير القديمة (7.2.6)
```powershell
Cut supplier-invoices reconcile > out\phase72\R0.json
InvRec --out /out/phase72/invoice-issues.json > out\phase72\INV0.json
```
**المتوقع:**
- `ledger.invoices` = 648، و`source: records`.
- `INV0.json` (أعداد بس) بيطلع:
  - عدد الفروق في الإجمالي والصافي (`TAX_ENGINE.md` §8.3 كان لاقي 52).
  - الـ 11 رقم مكرر (B-31).
  - وأي ربط مقطوع أو حالة إلغاء مش متسقة.
- **مفيش أي تعديل.** `invoice-issues.json` فيه المعرّفات، **ومابيتنقلش للمستودع**.

## 2. dry-run مرتين
```powershell
Cut supplier-invoices dry-run > out\phase72\D1.txt
Cut supplier-invoices dry-run > out\phase72\D2.txt
Cut supplier-invoices reconcile > out\phase72\R0b.json
```
**المتوقع:**
- الاتنين `✓ dry-run` بـ `migrated: 648`.
- عدد `untyped` لكل حقل، وده عدد القيم اللي نوعها مختلف عن العمود (مثلًا مبلغ مكتوب كنص). القيم دي بتفضل زي ما هي في `legacy_extra`. **سجّل الأعداد.**
- `R0b = R0`.
- **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل اللي في الرسالة بس (من غير قيم).

## 3. نسخة كاملة + اختبار استعادة
نفس `PARTIES_CUTOVER_RUNBOOK.md` §3. سجّل وقت آخر `base`.

## 4. التنفيذ
```powershell
Cut supplier-invoices execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase72\E.txt
Cut supplier-invoices reconcile > out\phase72\R1.json
InvRec > out\phase72\INV1.json
```
**المتوقع:**
- `✓ execute تم`.
- **`R1 = R0`** في كل البصمات و`others`، و`source: table`.
- **`INV1 = INV0`** في كل الأعداد. يعني تقرير الفواتير القديمة بيطلع نفس النتيجة من الجدول.

## 5. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#ledger.invoices` و`/app/supplier-invoices`: نفس العدد والكروت، ومفيش أخطاء.
2. **الـ UAT** (`docs/modules/SUPPLIER_INVOICES_UAT.md`) بيتعمل هنا. السيناريوهات بتضيف فواتير ومرتجعات **على النسخة المعزولة بس**، وده متوقع ومقصود.
3. `Cut supplier-invoices reconcile > out\phase72\R1u.json`. **المتوقع:**
   - عدد `ledger.invoices` **زاد** بعدد اللي اتضاف في الـ UAT. ده الدليل إن سيناريوهات الكتابة اتنفّذت فعلًا.
   - `others` اتغيّرت بس في قوايم الاقتراحات (لو اتكتبت أكواد جديدة).

## 6. الرجوع
نسخة + اختبار استعادة (§3) ← ثم:
```powershell
Cut supplier-invoices rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase72\B.txt
Cut supplier-invoices reconcile > out\phase72\R2.json
```
**المتوقع:** **`R2 = R1u`** في كل البصمات (شاملة اللي اتضاف في الـ UAT)، و`source: records`، والواجهتين شغالين.

## 7. التقرير
`docs/reports/v1.4.5/PHASE_07_2_REHEARSAL.md`:
- جدول بالخطوات والنتايج (✅ أو ❌)، والأوقات.
- الأعداد، وأعداد `untyped`، وأعداد `INV0` لكل نوع فرق، وأول 8 حروف من البصمات.
- **مفيش أسماء ولا أرقام فواتير ولا قيم.**

## 8. لو حاجة فشلت
نفس `PARTIES_CUTOVER_RUNBOOK.md` §10.
