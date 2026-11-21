# مصفوفة تطابق الحقول — فواتير ومرتجعات الموردين (خطة v1.4.5 — المرحلة 7، الحزمة 7.2)

> **مولَّد** بـ `node tools/discovery/build-supplier-invoices-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة الفاتورة القديمة بتكتبه (`renderer/modules/ledger/modals.js`) واللي `saveInvoiceData`/`recalcLinkedOriginal` بيضيفوه، وشكل البيانات الحقيقية (أسماء وأنواع بس)، والبيانات المُركّبة، وأعمدة الجدول (`server/src/migrations/1764800000000-SupplierInvoices.ts`)، والشاشة الجديدة (لسه، 7.2.5).
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## الفواتير والمرتجعات (`ledger.invoices` ← جدول `supplier_invoices`)
- **الحقول:** 34 — ليها عمود: **32**، ومحفوظة في `legacy_extra`: **2**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** (الشاشة في 7.2.5)

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `_lastEditBy` | object | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 7.2.5) |
| `_lastEditRole` | string | `legacy_extra` (محفوظ زي ما هو) | (الشاشة في 7.2.5) |
| `attachments` | array | عمود `attachments` (array) | (الشاشة في 7.2.5) |
| `baseValue` | number | عمود `base_value` (number) | (الشاشة في 7.2.5) |
| `cancelled` | boolean | عمود `cancelled` (boolean) | (الشاشة في 7.2.5) |
| `category` | string | عمود `category` (text) | (الشاشة في 7.2.5) |
| `date` | string | عمود `date` (text) | (الشاشة في 7.2.5) |
| `description` | string | عمود `description` (text) | (الشاشة في 7.2.5) |
| `discountRate` | string | عمود `discount_rate` (text) | (الشاشة في 7.2.5) |
| `discountType` | string | عمود `discount_type` (text) | (الشاشة في 7.2.5) |
| `dueDate` | string | عمود `due_date` (text) | (الشاشة في 7.2.5) |
| `id` | string | المفتاح الأساسي `id` | (الشاشة في 7.2.5) |
| `internalCode` | string | عمود `internal_code` (text) | (الشاشة في 7.2.5) |
| `internalNo` | جديد (DEC-0103): الرقم الداخلي `PI-`/`PR-` للجديد بس (DEC-0108) | عمود `internal_no` (text) | (الشاشة في 7.2.5) |
| `invoiceLink` | string | عمود `invoice_link` (text) | (الشاشة في 7.2.5) |
| `invoiceNo` | string | عمود `invoice_no` (text) | (الشاشة في 7.2.5) |
| `isReturn` | boolean | عمود `is_return` (boolean) | (الشاشة في 7.2.5) |
| `itemDescription` | string | عمود `item_description` (text) | (الشاشة في 7.2.5) |
| `linkedInvoiceId` | string | عمود `linked_invoice_id` (text) | (الشاشة في 7.2.5) |
| `linkedReturnIds` | array | عمود `linked_return_ids` (array) | (الشاشة في 7.2.5) |
| `nature` | string | عمود `nature` (text) | (الشاشة في 7.2.5) |
| `netInvoice` | number | عمود `net_invoice` (number) | (الشاشة في 7.2.5) |
| `notes` | string | عمود `notes` (text) | (الشاشة في 7.2.5) |
| `postReturnWht` | boolean | عمود `post_return_wht` (boolean) | (الشاشة في 7.2.5) |
| `project` | string | عمود `project` (text) | (الشاشة في 7.2.5) |
| `quantity` | string | عمود `quantity` (text) | (الشاشة في 7.2.5) |
| `stampDuty` | number | عمود `stamp_duty` (number) | (الشاشة في 7.2.5) |
| `supplierId` | string | عمود `supplier_id` (text) | (الشاشة في 7.2.5) |
| `supplierItemCode` | string | عمود `supplier_item_code` (text) | (الشاشة في 7.2.5) |
| `totalInvoice` | number | عمود `total_invoice` (number) | (الشاشة في 7.2.5) |
| `unitPrice` | string | عمود `unit_price` (text) | (الشاشة في 7.2.5) |
| `vat` | number | عمود `vat` (number) | (الشاشة في 7.2.5) |
| `withheld` | number | عمود `withheld` (number) | (الشاشة في 7.2.5) |
| `withheldStatus` | string | عمود `withheld_status` (text) | (الشاشة في 7.2.5) |

## الخلاصة (P7.2-B)
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **المبالغ** `numeric` من غير scale: القديم بكل خاناته (DEC-0107). الجديد من الـ API بأربع خانات HALF_UP (B-25).
