# الصلاحيات لكل صفحة وحالات المستندات (مولَّد من الكود)

> **مولَّد آليًا** بـ `tools/audit/gen-permissions-statuses.js` — ماتعدّلش يدويًا. المرحلة 3 (البندين 3.4 و3.5) · 2026-11-17
> المرجع للصلاحيات = **السيرفر** (`server/src/authz/roles.ts`)؛ الواجهة بتعرض بس. الرموز: **ع** عرض · **إ** إضافة · **ت** تعديل · **ح** حذف · — مفيش.
> بالإضافة للصفحة: الإضافة/التعديل محتاجين العلم العام «تعديل البيانات»، والحذف محتاج «حذف البيانات». مدير المشروع مقيّد بنطاق مشروعاته (projectManager).

## 1. القوالب الافتراضية للأدوار × الصفحات

| الصفحة | مدير النظام | موارد بشرية | عرض فقط | رواتب ومستحقات | عملاء: مبيعات وعقود | عملاء: محاسب مستخلصات وتحصيل | عملاء: مدير مشاريع | أمين مخازن | محاسب دفتر الموردين | مدير مشروع (مشاريعه بس) |
|---|---|---|---|---|---|---|---|---|---|---|
| 🧭 مركز المتابعة `dashboard` | عإتح | عإتح | ع | ع | ع | ع | ع | ع | ع | ع |
| الموظفين `employees` | عإتح | عإتح | ع | ع | — | — | — | — | — | — |
| العمال `workers` | عإتح | عإتح | ع | ع | — | — | — | — | — | ع |
| المشرفون `supervisors` | عإتح | عإتح | ع | ع | — | — | — | — | — | ع |
| معدات ومركبات `equipment` | عإتح | عإتح | ع | — | — | — | — | — | — | ع |
| المشاريع `projects` | عإتح | عإتح | ع | ع | ع | ع | عإت | ع | ع | عت |
| السائقون `drivers` | عإتح | عإتح | ع | — | — | — | — | — | — | ع |
| حركة الموارد `transfers` | عإتح | عإتح | ع | — | — | — | — | — | — | عإت |
| تقييم الأداء `performance` | عإتح | عإتح | ع | — | — | — | — | — | — | — |
| `departments` | عإتح | عإتح | ع | — | — | — | — | — | — | — |
| حضور الموظفين `attendance` | عإتح | عإتح | ع | — | — | — | — | — | — | — |
| اليوميات `workerAttendance` | عإتح | عإتح | ع | — | — | — | — | — | — | عإت |
| المستحقات `workerDues` | عإتح | عإتح | ع | ع | — | — | — | — | — | — |
| مصاريف شاملة `expenses` | عإتح | عإتح | ع | ع | — | — | — | — | — | عإت |
| تكاليف شاملة `costs` | عإتح | عإتح | ع | ع | — | — | — | — | — | ع |
| الإجازات `leaves` | عإتح | عإتح | ع | عإت | — | — | — | — | — | — |
| `payroll` | عإتح | عإتح | ع | عإت | — | — | — | — | — | — |
| تقارير الموارد البشرية `reports` | عإتح | عإتح | ع | ع | — | — | — | — | — | — |
| أرشيف الموارد البشرية `archive` | عإتح | عإتح | ع | — | — | — | — | — | — | — |
| الإعدادات العامة `backup` | عإتح | ع | ع | — | — | — | — | — | — | — |
| المستخدمون `users` | عإتح | — | ع | — | — | — | — | — | — | — |
| `ledger.dashboard` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| الموردون `ledger.suppliers` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| الفواتير `ledger.invoices` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| المرتجعات `ledger.returns` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| الدفعات `ledger.payments` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| الاقتراحات `ledger.categories` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| إشعارات الخصم `ledger.quarterly` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| تقارير الموردين `ledger.reports` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| أرشيف الموردين `ledger.archive` | عإتح | عإتح | ع | — | — | — | — | — | عإت | — |
| `general.overview` | عإتح | عإتح | ع | — | ع | ع | ع | ع | ع | ع |
| مهامي `tasks.my` | عإتح | عإتح | ع | — | ع | ع | ع | ع | ع | ع |
| `clients.dashboard` | عإتح | عإتح | ع | — | ع | ع | ع | — | — | ع |
| العملاء `clients.customers` | عإتح | عإتح | ع | — | عإت | ع | ع | — | — | — |
| أعمال الحصر `clients.workSurveys` | عإتح | عإتح | ع | — | عإت | ع | عإت | — | — | عإت |
| المقايسات `clients.boqs` | عإتح | عإتح | ع | — | عإت | ع | عإت | — | — | عإت |
| العقود `clients.contracts` | عإتح | عإتح | ع | — | عإت | ع | ع | — | — | ع |
| المستخلصات `clients.invoices` | عإتح | عإتح | ع | — | ع | عإت | ع | — | — | ع |
| الضمانات `clients.guarantees` | عإتح | عإتح | ع | — | ع | عإت | عإت | — | — | — |
| المقارنة `clients.comparison` | عإتح | عإتح | ع | — | عإت | ع | عإت | — | — | — |
| CRM `clients.crm` | عإتح | عإتح | ع | — | عإت | ع | ع | — | — | — |
| الإيرادات `clients.collections` | عإتح | عإتح | ع | — | ع | عإت | ع | — | — | — |
| حسابات العملاء `clients.accounts` | عإتح | عإتح | ع | — | ع | عإت | ع | — | — | — |
| تقارير العملاء والمشاريع `clients.reports` | عإتح | عإتح | ع | — | ع | ع | ع | — | — | ع |
| أرشيف العملاء والمشاريع `clients.archive` | عإتح | عإتح | ع | — | ع | ع | ع | — | — | — |
| المخازن `warehouses.home` | عإتح | عإتح | ع | — | — | — | — | عإت | — | ع |
| تقارير المخازن `warehouses.reports` | عإتح | عإتح | ع | — | — | — | — | عإت | — | — |
| تقارير الحسابات `accounts.reports` | عإتح | عإتح | ع | — | — | — | — | — | — | — |

**الأعلام العامة:**

| الدور | تعديل البيانات | حذف البيانات | إدارة المستخدمين |
|---|---|---|---|
| مدير النظام | ✓ | ✓ | ✓ |
| موارد بشرية | ✓ | ✓ | — |
| عرض فقط | — | — | — |
| رواتب ومستحقات | ✓ | — | — |
| عملاء: مبيعات وعقود | ✓ | — | — |
| عملاء: محاسب مستخلصات وتحصيل | ✓ | — | — |
| عملاء: مدير مشاريع | ✓ | — | — |
| أمين مخازن | ✓ | — | — |
| محاسب دفتر الموردين | ✓ | — | — |
| مدير مشروع (مشاريعه بس) | ✓ | — | — |

## 2. المجموعات (البيانات) ← الصفحات اللي بتتحكم فيها

القراءة مسموحة لو المستخدم شايف أي صفحة من «القراءة»، والكتابة لو عنده الفعل على أي صفحة من «الكتابة».

| المجموعة | القراءة من صفحات | الكتابة من صفحات | نطاق المشروع |
|---|---|---|---|
| `archiveTrash` | `archive` | `archive` `employees` `workers` `supervisors` `drivers` `equipment` | — |
| `attachments` | `archive` | `archive` | — |
| `attendance` | `attendance` `payroll` `reports` `employees` | `attendance` | — |
| `clients.activities` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` | `clients.crm` | — |
| `clients.boqs` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` `projects` | `clients.boqs` | نعم |
| `clients.collections` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` | `clients.collections` | نعم |
| `clients.contracts` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` `projects` | `clients.contracts` | نعم |
| `clients.customers` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` `projects` | `clients.customers` `clients.crm` | — |
| `clients.docs` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` | `clients.archive` | — |
| `clients.guarantees` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` | `clients.guarantees` | نعم |
| `clients.invoices` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` | `clients.invoices` | نعم |
| `clients.opportunities` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` | `clients.crm` | — |
| `clients.workSurveys` | `clients.dashboard` `clients.customers` `clients.workSurveys` `clients.boqs` `clients.contracts` `clients.invoices` `clients.guarantees` `clients.comparison` `clients.crm` `clients.collections` `clients.accounts` `clients.reports` `clients.archive` `general.overview` `projects` | `clients.workSurveys` | نعم |
| `costs` | `costs` `expenses` `reports` | `costs` | نعم |
| `customCards` | أي مستخدم | أي محرّر | — |
| `dailyTasks` | أي مستخدم | أي محرّر | — |
| `departments` | أي مستخدم | `departments` | — |
| `drivers` | `employees` `workers` `supervisors` `drivers` `equipment` `attendance` `workerAttendance` `workerDues` `leaves` `payroll` `expenses` `costs` `reports` `transfers` `performance` `archive` | `drivers` | نعم |
| `employeePenalties` | `payroll` `employees` | `payroll` `employees` | — |
| `employees` | `employees` `workers` `supervisors` `drivers` `equipment` `attendance` `workerAttendance` `workerDues` `leaves` `payroll` `expenses` `costs` `reports` `transfers` `performance` `archive` | `employees` | نعم |
| `equipment` | `employees` `workers` `supervisors` `drivers` `equipment` `attendance` `workerAttendance` `workerDues` `leaves` `payroll` `expenses` `costs` `reports` `transfers` `performance` `archive` | `equipment` `transfers` | نعم |
| `equipmentDaily` | `equipment` `costs` `reports` | `equipment` | نعم |
| `equipmentLogs` | `equipment` `costs` `reports` | `equipment` | نعم |
| `expenses` | `expenses` `costs` `reports` | `expenses` | نعم |
| `fuelLogs` | `equipment` `drivers` `costs` `reports` | `equipment` `drivers` | نعم |
| `leaves` | `leaves` `payroll` `employees` `attendance` `reports` | `leaves` | — |
| `ledger.archiveFolders` | `ledger.archive` | `ledger.archive` | — |
| `ledger.archiveTrash` | `ledger.archive` | `ledger.archive` | — |
| `ledger.invoices` | `ledger.dashboard` `ledger.suppliers` `ledger.invoices` `ledger.returns` `ledger.payments` `ledger.categories` `ledger.quarterly` `ledger.reports` `ledger.archive` | `ledger.invoices` `ledger.returns` | نعم |
| `ledger.payments` | `ledger.dashboard` `ledger.suppliers` `ledger.invoices` `ledger.returns` `ledger.payments` `ledger.categories` `ledger.quarterly` `ledger.reports` `ledger.archive` | `ledger.payments` | — |
| `ledger.suppliers` | `ledger.dashboard` `ledger.suppliers` `ledger.invoices` `ledger.returns` `ledger.payments` `ledger.categories` `ledger.quarterly` `ledger.reports` `ledger.archive` | `ledger.suppliers` `ledger.invoices` `ledger.payments` | — |
| `licenseExpenses` | `equipment` `costs` `reports` | `equipment` | — |
| `payments` | `workerDues` `payroll` `reports` | `workerDues` `payroll` | — |
| `payroll` | `payroll` | `payroll` | — |
| `performanceReviews` | `performance` | `performance` | — |
| `personDocuments` | `archive` `employees` | `archive` `employees` `workers` `supervisors` `drivers` `equipment` | — |
| `projectDaily` | `projects` `reports` | `projects` | نعم |
| `projectPlans` | `projects` `reports` | `projects` | نعم |
| `projects` | أي مستخدم | `projects` | نعم |
| `resignedArchive` | `archive` | `archive` `employees` `workers` `supervisors` `drivers` | — |
| `resourceTransfers` | `transfers` `workers` `equipment` `reports` | `transfers` | نعم |
| `supervisorExpenses` | `expenses` `costs` `reports` | `expenses` | نعم |
| `supervisorPayments` | `workerDues` `payroll` `reports` | `workerDues` `payroll` | — |
| `supervisors` | `employees` `workers` `supervisors` `drivers` `equipment` `attendance` `workerAttendance` `workerDues` `leaves` `payroll` `expenses` `costs` `reports` `transfers` `performance` `archive` | `supervisors` `transfers` | نعم |
| `transfers` | `transfers` `reports` | `transfers` | نعم |
| `warehouses.items` | `warehouses.home` `warehouses.reports` | `warehouses.home` | — |
| `warehouses.locations` | `warehouses.home` `warehouses.reports` | `warehouses.home` | — |
| `warehouses.movements` | `warehouses.home` `warehouses.reports` | `warehouses.home` | نعم |
| `warehouses.stocktakes` | `warehouses.home` `warehouses.reports` | `warehouses.home` | — |
| `workerAttendance` | `workerAttendance` `workerDues` `payroll` `reports` `workers` | `workerAttendance` | نعم |
| `workerPayments` | `workerDues` `payroll` | `workerDues` `payroll` | — |
| `workerPenalties` | `workerDues` `payroll` `reports` | `workerDues` `payroll` | — |
| `workers` | `employees` `workers` `supervisors` `drivers` `equipment` `attendance` `workerAttendance` `workerDues` `leaves` `payroll` `expenses` `costs` `reports` `transfers` `performance` `archive` | `workers` `transfers` | نعم |

## 3. الحالات في النظام القديم

| القائمة | القيم | المصدر |
|---|---|---|
| حالة الموظف/العامل | نشط (`active`) · في إجازة (`on_leave`) · مستقيل (`resigned`) · على المعاش (`retired`) | `renderer/core/state.js` |
| نوع العامل | عامل مؤقت (`temporary`) · عامل شركة (`company`) · عامل يومية (`daily`) | `renderer/core/state.js` |
| حالة المعدة | تعمل (`working`) · متوقفة (`stopped`) · صيانة (`maintenance`) · مستأجرة (`rented`) · مؤجرة للغير (`rented_out`) | `renderer/core/state.js` |
| نوع الإجازة | إجازة سنوية (`annual`) · إجازة مرضية (`sick`) · إجازة بدون راتب (`unpaid`) · إجازة أمومة (`maternity`) · إجازة طارئة (`emergency`) · أخرى (`other`) | `renderer/core/state.js` |
| حالة الإجازة | قيد الانتظار (`pending`) · موافق عليها (`approved`) · مرفوضة (`rejected`) · ملغاة (`cancelled`) | `renderer/core/state.js` |
| حالة الحضور | حاضر (`present`) · غائب (`absent`) · متأخر (`late`) · نصف يوم (`half`) · عطلة (`holiday`) | `renderer/core/state.js` |
| مراحل المشروع | الدراسة والتخطيط · تجهيز المستندات · المناقصة وترسية المشروع · التعاقد · التنفيذ والمتابعة · المستخلصات · المراجعة المالية · التسليم الابتدائي · الإدارة المركزية للحسابات · التسليم النهائي · مكتمل · متوقف · ملغي | `renderer/modules/hr/pages-projects.js` |
| خطوات مسار المشروع | لم تبدأ (`pending`) · قيد التنفيذ (`in_progress`) · مكتملة (`done`) · متأخرة (`late`) · مرفوضة (`rejected`) · تم تخطيها (`skipped`) | `renderer/modules/clients/project-workflow.js` |
| حالة خطاب الضمان | ساري · قيد التجديد · منتهي · محرَّر · مصادَر | `renderer/modules/clients/guarantees.js` |
| حالة أمر التغيير | مسودة · معتمد · مرفوض | `renderer/modules/clients/change-orders.js` |
| مراحل الفرص (CRM) | عميل محتمل · تواصل · عرض سعر · تفاوض · ترسية · خسارة · فوز | `renderer/modules/clients/pages-crm.js` |
| حالة المستخلص | مسودة · معتمد · مُسلَّم · مدفوع جزئياً · مدفوع · مرفوض (اختيار يدوي — مش مشتقة من المدفوع) | `renderer/modules/clients/pages-invoices.js:226` |
| فاتورة/مرتجع المورد | علامات مش حالة: `isReturn` (مرتجع) · `cancelled` (ملغاة — **تلقائي** لما المرتجعات المرتبطة تغطي الصافي) · `postReturnWht` (مرتجع جزئي على فاتورة فيها خصم) | `renderer/modules/ledger/helpers.js:1927` |
| دفعة المورد | `direction`: `pay` (سداد — دائن) أو `collect` (قيد مدين)، و165 من 244 دفعة حقيقية **مالهاش اتجاه** (بتتعامل كـ pay) | `renderer/modules/ledger/statement.js:19` |
| سجل دفع العمالة | `type`: `pay` · `penalty`/`deduction` (خصم) · `bonus`/`allowance` (مستحق إضافي) · `status: accrued` (مستحق مش مدفوع) | `renderer/core/helpers.js:4103` |
| حركة المخزن | `in` · `out` · `adjust_in` · `adjust_out` · `transfer` | `renderer/modules/warehouses/helpers.js:27` |

**ملاحظات على دورات العمل الحالية (للمرحلة 5 — محرك الاعتمادات):**
- **مفيش اعتماد فعلي** لأي مستند مالي: فواتير الموردين والدفعات والمستخلصات بتتسجّل وتتعدّل وتتحذف مباشرة. حالة المستخلص «معتمد» مجرد اختيار في قائمة (R-05، ADR-003).
- الاعتماد الموجود فعلًا: الإجازات (قيد الانتظار ← موافق/مرفوض)، وأوامر التغيير (المعتمد بس بيدخل قيمة العقد).
- الإلغاء: الفواتير الملغاة بتفضل محفوظة (مش بتتمسح)، لكن «الحذف» العادي في الصفحات حذف ناعم في السلة (`archiveTrash`) — قرار ADR-024 (إلغاء بدل حذف) بيتطبق مع نقل كل موديول.
