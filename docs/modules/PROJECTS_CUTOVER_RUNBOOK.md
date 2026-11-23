# دليل تشغيل نقل المشروعات — البروفة (خطة v1.4.5 — المرحلة 7، الحزمة 7.4)

> **نفس الطريقة المعتمدة** في `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md`، بالموديول `projects`. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية:** 14 مشروع (حالتهم `active`)، ومعاهم حقول مسار المشروع.
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**:
> - التقرير فيه أعداد، وأول 8 حروف من البصمات، وأوقات بس.
> - قايمة الأسماء التفصيلية (`--out`) بتفضل على اللابتوب جوه فولدر العمل.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof`، ومعاها الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `SUPPLIER_INVOICES_CUTOVER_RUNBOOK.md` §0.
- **اختصار جديد** لتقرير الأسماء غير المطابقة (قراءة بس):
  ```powershell
  function PjNames { docker compose -p $P -f $F run --rm -v "${PWD}\out:/out" server node dist/cli/project-names.js @args }
  ```
- **الكود:** آخر نسخة من الفرع، والصورة متبنية من جديد (`server` و`migrate`). الـ migration الجديدة: `ProjectsCutover`.
  - **لو الـ migration وقفت برسالة `projects (phase-5 table) has N rows`:** وقّف وابعتلي الرسالة. الجدول القديم المفروض فاضي.
- **الحالة المبدئية:** كل الموديولات في `records` (بعد رجوع البروفات اللي فاتت).

## 1. المطابقة المبدئية + تقرير الأسماء (P7.4-J)
```powershell
Cut projects reconcile > out\phase74\R0.json
PjNames --out /out/phase74/names.json > out\phase74\N0.json
```
**المتوقع:**
- `projects` = 14، و`source: records`.
- `N0.json` (أعداد بس): عدد السجلات اللي فيها اسم مشروع، وعدد الأسماء اللي مالهاش مشروع وعدد سجلاتها لكل مجموعة.
- **مفيش أي تعديل.** `names.json` فيه الأسماء، **ومابيتنقلش للمستودع**.

## 2. dry-run مرتين
```powershell
Cut projects dry-run > out\phase74\D1.txt
Cut projects dry-run > out\phase74\D2.txt
Cut projects reconcile > out\phase74\R0b.json
```
**المتوقع:**
- الاتنين `✓ dry-run` بـ `migrated: 14`.
- أعداد `untyped` لكل حقل (سجّلها، والمتوقع 0).
- `R0b = R0`.
- **لو `PARITY_FAILED`:** وقّف، وابعتلي اسم الحقل بس.

## 3. نسخة كاملة + اختبار استعادة، وبعدين التنفيذ
نفس §3 في دليل الفواتير. وبعدين، **كل الموديولات المعتمدة بتتنقل** عشان الـ UAT يغطي نشر الاسم للجداول:
```powershell
Cut parties execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase74\E-parties.txt
Cut warehouses execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase74\E-wh.txt
Cut supplier-invoices execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase74\E-inv.txt
Cut supplier-payments execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase74\E-pay.txt
Cut projects execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase74\E.txt
Cut projects reconcile > out\phase74\R1.json
PjNames > out\phase74\N1.json
```
**المتوقع:**
- **`R1 = R0`**، و`source: table`.
- **`N1 = N0`**: نفس الأعداد من الجداول.

## 4. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#projects` و`/app/projects`: نفس العدد والكروت والترتيب، ومفيش أخطاء.
2. **الـ UAT** (`PROJECTS_UAT.md`) بيتعمل هنا، **على النسخة المعزولة بس**.
3. `Cut projects reconcile > out\phase74\R1u.json`. **المتوقع:** عدد المشروعات **زاد** بعدد اللي اتضاف في الـ UAT.

## 5. الرجوع (بالعكس)
نسخة + اختبار استعادة ← ثم:
```powershell
Cut projects rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase74\B.txt
Cut supplier-payments rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase74\B-pay.txt
Cut supplier-invoices rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase74\B-inv.txt
Cut warehouses rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase74\B-wh.txt
Cut parties rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase74\B-parties.txt
Cut projects reconcile > out\phase74\R2.json
```
**المتوقع:** **`R2 = R1u`**، و`source: records`، والواجهتين شغالين.

## 6. التقرير
`docs/reports/v1.4.5/PHASE_07_4_REHEARSAL.md`:
- الخطوات والنتايج والأوقات.
- الأعداد، وأعداد `untyped`، وأعداد `N0`، وأول 8 حروف من البصمات.
- نتايج الـ UAT.

**مفيش أسماء مشاريع ولا عملاء ولا مبالغ.**

## 7. لو حاجة فشلت
نفس `PARTIES_CUTOVER_RUNBOOK.md` §10.
