# مصفوفة تطابق الحقول — الموردين والعملاء (خطة v1.4.5 — المرحلة 6، البند 6.2)

> **مولَّد** بـ `node tools/discovery/build-parties-parity.js`. ماتعدّلش الملف باليد.
> **المصادر:** أسماء الحقول من شكل البيانات الحقيقية (`tools/security/xss-shape.json`، أسماء بس)، وأمر الكتابة في الجداول (`server/src/migrations/1764100000000-PartiesCutover.ts`)، وشاشات `/app/`، ونافذة الإضافة في الواجهة القديمة (`docs/discovery/page-discovery.json`).
> **المعنى:** «عمود» = ليه عمود في الجدول. «legacy_extra» = **محفوظ زي ما هو** في عمود JSON ومابيضيعش، والواجهة القديمة بتقراه وتكتبه عادي، بس مالوش عمود ولا خانة في الشاشة الجديدة.

## الموردين (`ledger.suppliers` ← جدول `suppliers`)
- **الحقول:** 18 — ليها عمود: **14**، ومحفوظة في `legacy_extra`: **4**. **ضايعة: 0** (أي حقل مش معروف بيروح `legacy_extra` تلقائيًا بأمر الكتابة نفسه).
- **خانات نافذة الإضافة في الواجهة القديمة** («إضافة مورد جديد»، 11 خانة، من الاستكشاف الفعلي): اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG...
- **ناقص في الشاشة الجديدة:** `extraFields` (حقول ليها مكان في القاعدة ومالهاش خانة في /app/)

| الحقل القديم | النوع (من البيانات الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `__justCreated` | boolean | `legacy_extra` (محفوظ زي ما هو) | — |
| `_lastEditBy` | object | `legacy_extra` (محفوظ زي ما هو) | — |
| `_lastEditRole` | string | `legacy_extra` (محفوظ زي ما هو) | — |
| `address` | string | عمود `address` | ✅ |
| `attachments` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `bankAccount` | string | عمود `bank_account` | ✅ |
| `businessNature` | string | عمود `business_nature` | ✅ |
| `commercialReg` | string | عمود `commercial_reg` | ✅ |
| `email` | string | عمود `email` | ✅ |
| `extraFields` | array | عمود `extra_fields` | — |
| `iban` | string | عمود `iban` | ✅ |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `name` | string | عمود `name` | ✅ |
| `notes` | string | عمود `notes` | ✅ |
| `openingBalance` | number | عمود `opening_balance` | ✅ |
| `openingBalanceDate` | string | عمود `opening_balance_date` | ✅ |
| `phone` | string | عمود `phone` | ✅ |
| `taxId` | string | عمود `tax_id` | ✅ |

## العملاء (`clients.customers` ← جدول `customers`)
- **الحقول:** 28 — ليها عمود: **16**، وجدول تابع: **1**، ومحفوظة في `legacy_extra`: **11**. **ضايعة: 0** (أي حقل مش معروف بيروح `legacy_extra` تلقائيًا بأمر الكتابة نفسه).
- **خانات نافذة الإضافة في الواجهة القديمة** («عميل جديد ×»، 12 خانة، من الاستكشاف الفعلي): الكود، اسم العميل، الهاتف، البريد، المدينة، التصنيف، الرقم الضريبي، القسم، رصيد افتتاحي (ج.م)، العنوان، ملاحظات، نوع المستند * (اكتب للبحث أو أضف نوعاً جديداً)
- **ناقص في الشاشة الجديدة:** `extraFields`، `status` (حقول ليها مكان في القاعدة ومالهاش خانة في /app/)

| الحقل القديم | النوع (من البيانات الحقيقية) | مكانه في القاعدة | في الشاشة الجديدة |
|---|---|---|---|
| `address` | string | عمود `address` | ✅ |
| `boqs` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `category` | string | عمود `category` | ✅ |
| `city` | string | عمود `city` | ✅ |
| `code` | string | عمود `code` | ✅ |
| `collections` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `comms` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `contacts` | array | جدول `customer_contacts` (صف لكل جهة اتصال) | ✅ |
| `contracts` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `createdAt` | string | `created_at` | — |
| `department` | string | عمود `department` | ✅ |
| `docs` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `email` | string | عمود `email` | ✅ |
| `extraFields` | array | عمود `extra_fields` | — |
| `guarantees` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `id` | string | المفتاح الأساسي `id` | ✅ |
| `invoices` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `ledger` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `name` | string | عمود `name` | ✅ |
| `notes` | string | عمود `notes` | ✅ |
| `openingBalance` | number | عمود `opening_balance` | ✅ |
| `opportunities` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `phone` | string | عمود `phone` | ✅ |
| `projects` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |
| `status` | string (active) | عمود `status` | — |
| `taxId` | string | عمود `tax_id` | ✅ |
| `updatedAt` | string | `updated_at` | — |
| `workSurveys` | array | `legacy_extra` (مصفوفة بتخص موديول تاني — بتتنقل معاه) | — |

## الخلاصة (P6-B)
- **كل حقل ليه مكان**: عمود، أو جدول تابع، أو `legacy_extra`. ومفيش حقل بيضيع، لأن أمر الكتابة في الجداول بيحط أي مفتاح مش معروف في `legacy_extra` (`p - ARRAY[...]`)، واختبار التكافؤ في أمر النقل بيقارن كل سجل بعد النقل (`cutover … dry-run`).
- **الحقول اللي في `legacy_extra` مالهاش خانة في الشاشة الجديدة.** بتتعدّل من «الشاشة الكاملة» في الواجهة القديمة (موجود رابط ليها من `/app/`)، أو تاخد عمود لما الموديول بتاعها يتنقل (الفواتير، والعقود…). ده **متوافق مع النطاق المعتمد** (S7، C5 متأجلين).
