# دليل تشغيل نقل المخازن — البروفة (خطة v1.4.5 — المرحلة 7، الحزمة 7.1)

> **نفس الطريقة المعتمدة** في `PARTIES_CUTOVER_RUNBOOK.md` (DEC-0095)، بالموديول `warehouses` بدل `parties`. **ده مش تشغيل فعلي.**
> **البيانات الحقيقية للمخازن:** مخزن واحد، **و0 أصناف و0 حركات**. البروفة على النسخة المعزولة **من غير ما نضيف عليها أي بيانات مُركّبة**.
> **الأمان:** الملف الأصلي قراءة بس، **ومفيش بيانات حقيقية في المستودع**: التقرير فيه أعداد وأول 8 حروف من البصمات وأوقات بس.

## 0. المتطلبات
- **البيئة:** `erp-phase2-proof` (نفس بيئة بروفة الموردين والعملاء)، ومعاها نفس الاختصارات (`$P` و`$F` و`$BK` و`Cut`) من `PARTIES_CUTOVER_RUNBOOK.md` §0.
- **الكود:** آخر نسخة من الفرع، وصورة السيرفر متبنية من جديد (`server` و`migrate`).
- **الحالة المبدئية:** المخازن **مش متنقلة** (`Cut warehouses reconcile` بيقول `source: records`). والموردين والعملاء في `records` كمان (بعد رجوع بروفتهم).

## 1. المطابقة المبدئية R0
```powershell
Cut warehouses reconcile > out\phase7\R0.json
```
**المتوقع:** `warehouses.locations` = 1، و`warehouses.items` = 0، و`warehouses.movements` = 0، والكل `source: records`.

## 2. dry-run مرتين
```powershell
Cut warehouses dry-run > out\phase7\D1.txt
Cut warehouses dry-run > out\phase7\D2.txt
Cut warehouses reconcile > out\phase7\R0b.json
```
**المتوقع:** الاتنين `✓ dry-run` بنفس `migrated`، و`R0b = R0`.

## 3. نسخة كاملة + اختبار استعادة
نفس `PARTIES_CUTOVER_RUNBOOK.md` §3. سجّل وقت آخر `base`.

## 4. التنفيذ
```powershell
Cut warehouses execute --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة> > out\phase7\E.txt
Cut warehouses reconcile > out\phase7\R1.json
```
**المتوقع:** `✓ execute تم`، و**`R1 = R0`** في كل البصمات و`others`، و`source: table`.

## 5. الواجهتين فوق الجداول (ومكان الـ UAT)
1. `/legacy/#warehouses.home` و`/app/warehouses`: نفس المخزن، ومفيش أخطاء.
2. **الـ UAT** (`docs/modules/WAREHOUSES_UAT.md`) بيتعمل هنا. السيناريوهات بتضيف أصناف وحركات **على النسخة المعزولة بس**، وده متوقع ومقصود.
3. `Cut warehouses reconcile > out\phase7\R1u.json`. **المتوقع:** أعداد الأصناف والحركات **زادت** بعدد اللي اتعمل في الـ UAT (ده الدليل إن سيناريوهات الكتابة اتنفّذت فعلًا)، و`others` زي ما هي.

## 6. الرجوع
نسخة + اختبار استعادة (§3) ← ثم:
```powershell
Cut warehouses rollback --by "<اسمك>" --backup-log /backup/backup-log.jsonl --confirm-backup <وقت النسخة الجديدة> > out\phase7\B.txt
Cut warehouses reconcile > out\phase7\R2.json
```
**المتوقع:** **`R2 = R1u`** في كل البصمات (شاملة اللي اتضاف في الـ UAT)، و`source: records`، والواجهتين شغالين.

## 7. التقرير
`docs/reports/v1.4.5/PHASE_07_1_REHEARSAL.md`: جدول بالخطوات والنتايج (✅/❌)، والأعداد، وأول 8 حروف من البصمات، والأوقات. **مفيش أسماء ولا قيم.**

## 8. لو حاجة فشلت
نفس `PARTIES_CUTOVER_RUNBOOK.md` §10.
