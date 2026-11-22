# مصفوفة تطابق الحقول — فواتير ومرتجعات الموردين (خطة v1.4.5 — المرحلة 7، الحزمة 7.2)

> **مولَّد** بـ `node tools/discovery/build-supplier-invoices-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** السجل اللي نافذة الفاتورة القديمة بتكتبه (`renderer/modules/ledger/modals.js`) واللي `saveInvoiceData`/`recalcLinkedOriginal` بيضيفوه، وشكل البيانات الحقيقية (أسماء وأنواع بس)، والبيانات المُركّبة، وأعمدة الجدول (`server/src/migrations/1764800000000-SupplierInvoices.ts`)، وشاشة `frontend/src/app/features/supplier-invoices.page.ts`.
> **المعنى:** «عمود» = ليه عمود **لما نوعه يطابق**. لو النوع مختلف في سجل معيّن، القيمة بتفضل في `legacy_extra` بالظبط (DEC-0107: القديم بقيمه)، وعددها بيطلع في تقرير النقل (`untyped`). «legacy_extra» = **محفوظ زي ما هو** ومابيضيعش.

## الفواتير والمرتجعات (`ledger.invoices` ← جدول `supplier_invoices`)
- **الحقول:** 34 — ليها عمود: **32**، ومحفوظة في `legacy_extra`: **2**. **ضايعة: 0**.
- **أنواع مختلفة عن العمود في شكل البيانات الحقيقية:** 0
- **ناقص في الشاشة الجديدة من غير قرار:** مفيش

| الحقل القديم | النوع (الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `_lastEditBy` | object | `legacy_extra` (محفوظ زي ما هو) | — (تدقيق قديم — بيتعرض في سجل التدقيق مش في الشاشة) |
| `_lastEditRole` | string | `legacy_extra` (محفوظ زي ما هو) | — (تدقيق قديم — بيتعرض في سجل التدقيق مش في الشاشة) |
| `attachments` | array | عمود `attachments` (array) | ✅ |
| `baseValue` | number | عمود `base_value` (number) | ✅ |
| `cancelled` | boolean | عمود `cancelled` (boolean) | ✅ |
| `category` | string | عمود `category` (text) | ✅ |
| `date` | string | عمود `date` (text) | ✅ |
| `description` | string | عمود `description` (text) | ✅ |
| `discountRate` | string | عمود `discount_rate` (text) | ✅ |
| `discountType` | string | عمود `discount_type` (text) | ✅ |
| `dueDate` | string | عمود `due_date` (text) | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `internalCode` | string | عمود `internal_code` (text) | ✅ |
| `internalNo` | جديد (DEC-0103): الرقم الداخلي `PI-`/`PR-` للجديد بس (DEC-0108) | عمود `internal_no` (text) | ✅ |
| `invoiceLink` | string | عمود `invoice_link` (text) | ✅ |
| `invoiceNo` | string | عمود `invoice_no` (text) | ✅ |
| `isReturn` | boolean | عمود `is_return` (boolean) | ✅ |
| `itemDescription` | string | عمود `item_description` (text) | ✅ |
| `linkedInvoiceId` | string | عمود `linked_invoice_id` (text) | ✅ |
| `linkedReturnIds` | array | عمود `linked_return_ids` (array) | — (مشتق من المرتجعات المربوطة (بيتحسب، مش خانة)) |
| `nature` | string | عمود `nature` (text) | ✅ |
| `netInvoice` | number | عمود `net_invoice` (number) | ✅ |
| `notes` | string | عمود `notes` (text) | ✅ |
| `postReturnWht` | boolean | عمود `post_return_wht` (boolean) | ✅ |
| `project` | string | عمود `project` (text) | ✅ |
| `quantity` | string | عمود `quantity` (text) | ✅ |
| `stampDuty` | number | عمود `stamp_duty` (number) | ✅ |
| `supplierId` | string | عمود `supplier_id` (text) | ✅ |
| `supplierItemCode` | string | عمود `supplier_item_code` (text) | ✅ |
| `totalInvoice` | number | عمود `total_invoice` (number) | ✅ |
| `unitPrice` | string | عمود `unit_price` (text) | ✅ |
| `vat` | number | عمود `vat` (number) | ✅ |
| `withheld` | number | عمود `withheld` (number) | ✅ |
| `withheldStatus` | string | عمود `withheld_status` (text) | ✅ |

## الخلاصة (P7.2-B)
- **كل حقل ليه مكان** (عمود أو `legacy_extra`)، ومفيش حقل بيضيع: أمر الكتابة بيحط أي مفتاح مش معروف، أو نوعه مختلف، في `legacy_extra`، وتحقق التكافؤ في أمر النقل بيقارن كل سجل.
- **المبالغ** `numeric` من غير scale: القديم بكل خاناته (DEC-0107). الجديد من الـ API بست خانات HALF_UP (B-25 بعد DEC-0112).
