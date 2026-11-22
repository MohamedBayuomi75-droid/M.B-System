# دليل تشغيل نقل دفعات الموردين — البروفة (خطة v1.4.5 — المرحلة 7، الحزمة 7.3)

> **نفس الطريقة المعتمدة** في `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md`، بالموديول `supplier-payments`. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** 244 دفعة (منها 165 من غير اتجاه، و242 مش مربوطة بفاتورة).
> **وكمان:** بروفة الموردين والعملاء **بتتعاد** هنا (§1)، لأن تقريب الرصيد الافتتاحي وقت النقل بقى 6 خانات بدل 4 (DEC-0112).
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**:
> - التقرير فيه أعداد، وأول 8 حروف من البصمات، وأوقات بس.
> - القوايم التفصيلية (`--out`) بتفضل على اللابتوب جوه فولدر العمل.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها الاختصارات (`$P` و`$F` و`$BK` و`Cut` و`InvRec`) من `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md` §0.
- **اختصار جديد** لتقرير الأرصدة (قراءة بس):
  ```powershell
  function BalRep { docker compose -p $P -f $F run --rm -v "${PWD}\out:/out" server node dist/cli/supplier-balances.js @args }
  ```
- **الكود:** آخر نسخة من الفرع، والصورة متبنية من جديد (`server` و`migrate`). الـ migrations الجديدة اتطبّقت: `MoneySixDecimals`، و`SupplierPayments`.
- **الحالة المبدئية:** كل الموديولات في `records` (بعد رجوع البروفات اللي فاتت).

## 1. إعادة بروفة الموردين والعملاء (DEC-0112)
نفس `PARTIES_CUTOVER_RUNBOOK.md` §1–§6 بالظبط، والمخرجات في `out\phase73\parties\`.

**المتوقع:**
- `R1 = R0`، و`R2 = R1`.
- **`rounding` في تقرير النقل:** عدد الأرصدة الافتتاحية اللي اتقرّبت لـ 6 خانات. المتوقع **0 أو أقل** من بروفة المرحلة 6 (اللي كانت بتقرّب لـ 4). **سجّل العدد.**

## 2. المطابقة المبدئية + تقرير الأرصدة (7.3.6)
```powershell
Cut supplier-payments reconcile > out\phase73\R0.json
BalRep --out /out/phase73/balances.json > out\phase73\BAL0.json
```
**المتوقع:**
- `ledger.payments` = 244، و`source: records`.
- `BAL0.json` (أعداد بس): عدد الموردين، وعدد اللي الرصيد بتاعهم مختلف بين الطريقة الحالية وF-05، والسبب (ملغاة، أو تحصيل، أو غير مصنّف).
- **مفيش أي تعديل.**
- `balances.json` فيه الأسماء والمبالغ، **ومابيتنقلش للمستودع**. ده اللي المدير المالي بيراجعه (DEC-0105).

## 3. dry-run مرتين
```powershell
Cut supplier-payments dry-run > out\phase73\D1.txt
Cut supplier-payments dry-run > out\phase73\D2.txt
Cut supplier-payments reconcile > out\phase73\R0b.json
```
**المتوقع:**
- الاتنين `✓ dry-run` بـ `migrated: 244`.
- أعداد `untyped` لكل حقل (سجّلها).
- `R0b = R0`.
- **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل بس.

## 4. نسخة كاملة + اختبار استعادة، وبعدين التنفيذ
نفس §3 في دليل الفواتير. وبعدين:
```powershell
Cut supplier-invoices execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase73\E-inv.txt
Cut supplier-payments execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase73\E.txt
Cut supplier-payments reconcile > out\phase73\R1.json
BalRep > out\phase73\BAL1.json
```
الفواتير بتتنقل هنا كمان، عشان الشاشات تشتغل فوق الجداول الاتنين.

**المتوقع:**
- **`R1 = R0`**، و`source: table`.
- **`BAL1 = BAL0`**: نفس الأرصدة من الجداول.

## 5. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#ledger.payments` و`/app/supplier-payments`: نفس العدد والكارتين، ومفيش أخطاء.
2. **الـ UAT** (`SUPPLIER_PAYMENTS_UAT.md`) بيتعمل هنا، **على النسخة المعزولة بس**.
3. `Cut supplier-payments reconcile > out\phase73\R1u.json`. **المتوقع:** عدد الدفعات **زاد** بعدد اللي اتضاف في الـ UAT.

## 6. الرجوع
نسخة + اختبار استعادة ← ثم:
```powershell
Cut supplier-payments rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase73\B.txt
Cut supplier-invoices rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase73\B-inv.txt
Cut supplier-payments reconcile > out\phase73\R2.json
```
**المتوقع:** **`R2 = R1u`**، و`source: records`، والواجهتين شغالين.

## 7. التقرير
`docs/reports/v1.4.5/PHASE_07_3_REHEARSAL.md`:
- الخطوات والنتايج والأوقات.
- نتيجة إعادة بروفة الموردين والعملاء، وعدد الأرصدة اللي اتقرّبت.
- الأعداد، وأعداد `untyped`، وأعداد `BAL0`، وأول 8 حروف من البصمات.
- نتايج الـ UAT.

**مفيش أسماء ولا مبالغ.**

## 8. لو حاجة فشلت
نفس `PARTIES_CUTOVER_RUNBOOK.md` §10.
