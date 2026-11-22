# مصفوفة تطابق الحقول — دفعات الموردين (خطة v1.4.5 — المرحلة 7، الحزمة 7.3)

> **مولَّد** بـ `node tools/discovery/build-supplier-payments-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة الدفعة القديمة بتكتبه (`renderer/modules/ledger/modals.js` `openPaymentModal`)، وشكل البيانات الحقيقية (أسماء وأنواع بس)، والبيانات المُركّبة، وأعمدة الجدول (`server/src/migrations/1765000000000-SupplierPayments.ts`)، والشاشة الجديدة (لسه، 7.3.5).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## الدفعات (`ledger.payments` ← جدول `supplier_payments`)
- **الحقول:** 16 — ليها عمود: **14**، ومحفوظة في `legacy_extra`: **2**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 7.3.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `_lastEditBy` | object | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 7.3.5) |
| `_lastEditRole` | string | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 7.3.5) |
| `amount` | number | عمود `amount` (number) | (الشاشة في 7.3.5) |
| `attachments` | array | عمود `attachments` (json) | (الشاشة في 7.3.5) |
| `batchId` | string | عمود `batch_id` (text) | (الشاشة في 7.3.5) |
| `date` | string | عمود `date` (text) | (الشاشة في 7.3.5) |
| `direction` | string | عمود `direction` (text) | (الشاشة في 7.3.5) |
| `extraFields` | object | عمود `extra_fields` (json) | (الشاشة في 7.3.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 7.3.5) |
| `internalNo` | جديد (DEC-0113 د-4): الرقم الداخلي `PV-` للدفعة كلها، للجديد بس | عمود `internal_no` (text) | (الشاشة في 7.3.5) |
| `invoiceId` | string | عمود `invoice_id` (text) | (الشاشة في 7.3.5) |
| `method` | string | عمود `method` (text) | (الشاشة في 7.3.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 7.3.5) |
| `paymentNo` | number | عمود `payment_no` (number) | (الشاشة في 7.3.5) |
| `supplierId` | string | عمود `supplier_id` (text) | (الشاشة في 7.3.5) |
| `transferRef` | string | عمود `transfer_ref` (text) | (الشاشة في 7.3.5) |

## الخلاصة (P7.3-B)
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **المبلغ** `numeric` من غير scale: القديم بكل خاناته. الجديد من الـ API بست خانات HALF_UP (B-25 بعد DEC-0112).
