# قاموس البيانات (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ `node tools/discovery/build-data-dictionary.js`. ماتعدّلش الملف باليد.
> **مفيش أي قيمة من البيانات الحقيقية هنا.** أسماء الحقول وأنواعها من `tools/security/xss-shape.json` (اتولّد من البيانات الحقيقية بأسماء الحقول بس)، والأعداد مجاميع من زحف سابق على البيانات الحقيقية (`docs/audit/page-crawl-file-real.json`)، والحقول المُركّبة من `tools/security/xss-seed.js`.
> **المرحلة 2** قاست الحجم الكلي: 4,900 عنصر في 28 مجموعة فيها بيانات، وقاعدة 22 MB، و108 مرفق (`PHASE_02_AFTER_REPORT.md` §ج).

## 1. الملخص
| المقياس | القيمة |
|---|---|
| إصدار شكل البيانات (`SCHEMA_VERSION`) | 9 |
| المسارات في DATA | 117 (doc 27، meta-flag 5، legacy-ref 3، collection 53، system-table 2، lookup 27) |
| مجموعات ليها شكل حقول من البيانات الحقيقية | 20 |
| مجموع السجلات الحقيقية (من الزحف السابق) | 4,900 في 29 مسار فيه بيانات |
| جداول السيرفر | 43 من الـ migrations + جدول `migrations` بتاع TypeORM = 44 (نفس العدد اللي المرحلة 2 قاسته) |

## 2. ترحيلات شكل البيانات في الواجهة القديمة (1 ← 9)
| الإصدار | الوصف | الدالة |
|---|---|---|
| 2 | توحيد سجلات الحضور (personType/personId) + قائمة التكاليف | `normalizeAttendanceRecord` |
| 3 | ملف بيانات واحد للتلات وحدات — أقسام ledger و clients (كائنات). الملف بعد كده بيترفض الحفظ من نسخ أقدم (حماية). | `(inline)` |
| 4 | دمج دفتر الموردين — قسم ledger كان (في 0.3.0) فيه settings و auditLog؛ دلوقتي مشتركين مع البرنامج الموحّد (إعدادات HR وسجل التدقيق) | `lgMigrateLegacySection` |
| 5 | تهيئة قسم العملاء (customers + كيانات الدورة التجارية + إعدادات) | `ensureClientsSection` |
| 6 | — | `ensureWarehousesSection` |
| 7 | توحيد المشاريع — customer.projects[] ← DATA.projects (customerId) + ربط السجلات التجارية بـ projectId | `clMigrateNestedProjects` |
| 8 | مصدر واحد للمدفوع على المستخلص (paidManual + التحصيلات المربوطة) — قيمة المدفوع الحالية بتتحفظ | `clMigratePaidSource` |
| 9 | ربط كل سجلات (عمال/معدات/مصاريف/تكاليف/يوميات/فواتير موردين/حركات مخازن/نقل موارد) بالمشروع بالمعرّف projectId + تقرير الأسماء غير المطابقة | `projMigrateLinks` |

القاعدة: ملف بإصدار أحدث من 9 **مابيتلمسش** (`runSchemaMigrations`)، والواجهة بتشتغل قراءة بس (`__schemaTooNew`).

## 3. مسارات DATA ومكانها على السيرفر
| المسار | النوع | الوحدة | سجلات حقيقية | مكانه على السيرفر | مراجع في الكود | الملفات |
|---|---|---|---|---|---|---|
| `_cfAligned` | doc | hr | — | docs | 8 | core/helpers.js |
| `_cfAligned2` | doc | hr | — | docs | — |  |
| `_cfAllHiddenFixed` | meta-flag | hr | — | docs (meta) | 2 | core/helpers.js |
| `_cfAutoFlagsReset` | meta-flag | hr | — | docs (meta) | 2 | core/helpers.js |
| `_cfRegKeys` | doc | hr | — | docs | 4 | core/helpers.js |
| `_cfShowInTableMigrated` | meta-flag | hr | — | docs (meta) | 2 | core/helpers.js |
| `alertState` | doc | hr | — | docs | 4 | core/alerts-center.js |
| `archiveAttachments` | legacy-ref | hr | — | — (مرجع قديم، مفيش تخزين) | 2 | core/helpers.js |
| `archiveTrash` | collection | hr | 7 | records | 16 | core/data-store.js، core/helpers.js، core/pages-archive.js |
| `attachments` | collection | hr | — | records | 1 | modules/hr/pages-dashboard.js |
| `attendance` | collection | hr | 0 | records | 23 | core/data-store.js، core/helpers.js، modules/hr/pages-attendance.js… |
| `auditLog` | system-table | system | 1632 | audit_log (جدول نظام، إلحاقي) | 27 | core/data-store.js، core/follow-center.js، core/helpers.js… |
| `autoFields` | doc | config | — | docs | 6 | core/helpers.js |
| `clients.activities` | collection | clients | 0 | records | — |  |
| `clients.boqs` | collection | clients | 0 | records | — |  |
| `clients.collections` | collection | clients | 0 | records | — |  |
| `clients.contracts` | collection | clients | 0 | records | — |  |
| `clients.customers` | collection | clients | 1 | customers + customer_contacts (6.1، cutover parties) | 1 | core/pages-general.js |
| `clients.docs` | collection | clients | 0 | records | — |  |
| `clients.guarantees` | collection | clients | 0 | records | — |  |
| `clients.invoices` | collection | clients | 0 | records | — |  |
| `clients.opportunities` | collection | clients | 0 | records | — |  |
| `clients.paidReconcileLog` | doc | clients | — | docs | — |  |
| `clients.projectsUnifyLog` | doc | clients | — | docs | — |  |
| `clients.settings` | doc | clients | — | docs | 1 | modules/clients/project-workflow.js |
| `clients.workSurveys` | collection | clients | 0 | records | — |  |
| `costItemHidden` | doc | hr | — | docs | 11 | modules/hr/pages-costs.js |
| `costItemPools` | doc | hr | — | docs | 11 | modules/hr/pages-costs.js |
| `costs` | collection | hr | 41 | records | 37 | core/cost-center.js، core/data-store.js، core/follow-center.js… |
| `costSections` | doc | hr | — | docs | 24 | modules/hr/pages-costs.js |
| `customCards` | collection | config | 0 | records | 9 | core/helpers.js، core/pages-backup.js |
| `customFieldDefs` | doc | config | — | docs | 17 | core/data-store.js، core/helpers.js |
| `dailyPayItemPool` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `dailyTasks` | collection | hr | 0 | records | 9 | core/data-store.js، core/follow-center.js |
| `deadFields` | doc | config | — | docs | 4 | core/helpers.js |
| `departments` | collection | hr | 30 | records | 82 | core/data-store.js، core/extras.js، core/helpers.js… |
| `documentTypeHidden` | lookup | hr | 0 | docs | 14 | core/data-store.js، core/helpers.js، modules/hr/pages-ops.js |
| `documentTypes` | lookup | hr | 0 | docs | 15 | core/data-store.js، core/helpers.js، modules/hr/pages-ops.js |
| `documentTypesByKind` | doc | hr | — | docs | 12 | core/data-store.js، core/helpers.js |
| `driverCategories` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `driverPayments` | legacy-ref | hr | — | — (مرجع قديم، مفيش تخزين) | 1 | modules/hr/pages-reports.js |
| `drivers` | collection | hr | 23 | records | 94 | core/data-store.js، core/excel-import.js، core/follow-center.js… |
| `employeeCategories` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `employeePenalties` | collection | hr | 0 | records | 16 | core/data-store.js، core/helpers.js، modules/hr/pages-reports.js… |
| `employees` | collection | hr | 40 | records | 77 | core/data-store.js، core/excel-import.js، core/follow-center.js… |
| `equipment` | collection | hr | 31 | records | 84 | core/data-store.js، core/excel-import.js، core/follow-center.js… |
| `equipmentCategories` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `equipmentDaily` | collection | hr | 1 | records | 45 | core/data-store.js، core/helpers.js، core/project-links.js… |
| `equipmentLogs` | collection | hr | 0 | records | 19 | core/data-store.js، core/helpers.js، core/project-links.js… |
| `equipmentTypes` | lookup | hr | 17 | docs | 17 | core/data-store.js، core/helpers.js |
| `expenseItemHidden` | doc | hr | — | docs | 12 | modules/hr/pages-ops.js |
| `expenseItemPool` | lookup | hr | 0 | docs | 6 | core/data-store.js، modules/hr/pages-ops.js |
| `expenseItemPools` | doc | hr | — | docs | 16 | core/data-store.js، modules/hr/pages-ops.js |
| `expenses` | collection | hr | 0 | records | 60 | core/boards.js، core/cost-center.js، core/data-store.js… |
| `expenseSections` | doc | hr | — | docs | 12 | core/data-store.js، modules/hr/pages-ops.js |
| `expenseTypes` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `formCols` | doc | config | — | docs | 6 | core/helpers.js، core/pages-backup.js |
| `formLayouts` | doc | config | — | docs | 62 | core/extras.js، core/helpers.js، core/pages-backup.js |
| `fuelLogs` | collection | hr | 0 | records | 20 | core/data-store.js، core/helpers.js، core/project-links.js… |
| `leaves` | collection | hr | 1 | records | 34 | core/data-store.js، core/helpers.js، core/pages-backup.js… |
| `ledger.archiveFolders` | collection | ledger | 0 | records | 4 | modules/ledger/data-store.js |
| `ledger.archiveSections` | lookup | ledger | 0 | docs | 4 | modules/ledger/data-store.js |
| `ledger.archiveTrash` | collection | ledger | 0 | records | 13 | modules/ledger/data-store.js، modules/ledger/modals.js، modules/ledger/pages-archive.js |
| `ledger.customCategories` | lookup | ledger | 2 | docs | 8 | modules/ledger/app.js، modules/ledger/data-store.js، modules/ledger/helpers.js |
| `ledger.customInternalCodes` | lookup | ledger | 3 | docs | 3 | modules/ledger/data-store.js، modules/ledger/helpers.js |
| `ledger.customItemDescriptions` | lookup | ledger | 326 | docs | 3 | modules/ledger/data-store.js، modules/ledger/helpers.js |
| `ledger.customItemNames` | lookup | ledger | 130 | docs | 3 | modules/ledger/data-store.js، modules/ledger/helpers.js |
| `ledger.customLinkedItems` | lookup | ledger | 5 | docs | 15 | modules/ledger/data-store.js، modules/ledger/helpers.js، modules/ledger/pages-categories.js |
| `ledger.customProjects` | lookup | ledger | 0 | docs | 17 | modules/ledger/app.js، modules/ledger/data-store.js، modules/ledger/helpers.js… |
| `ledger.customSupplierItemCodes` | lookup | ledger | 317 | docs | 3 | modules/ledger/data-store.js، modules/ledger/helpers.js |
| `ledger.documentTypeHidden` | lookup | ledger | 0 | docs | 15 | modules/ledger/data-store.js، modules/ledger/pages-archive.js |
| `ledger.documentTypes` | lookup | ledger | 0 | docs | 11 | modules/ledger/data-store.js، modules/ledger/pages-archive.js |
| `ledger.hiddenProjects` | lookup | ledger | 0 | docs | 13 | modules/ledger/app.js، modules/ledger/data-store.js، modules/ledger/helpers.js… |
| `ledger.hiddenSuggestions` | lookup | ledger | 2 | docs | 7 | modules/ledger/app.js، modules/ledger/data-store.js، modules/ledger/helpers.js |
| `ledger.invoices` | collection | ledger | 648 | records | 130 | core/alerts-center.js، core/boards.js، core/cost-center.js… |
| `ledger.payments` | collection | ledger | 244 | records | 64 | core/boards.js، core/follow-center.js، modules/accounts/pages-reports.js… |
| `ledger.suppliers` | collection | ledger | 279 | suppliers (6.1، cutover parties) | 58 | core/boards.js، core/extras.js، core/follow-center.js… |
| `licenseExpenseFieldDefs` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `licenseExpenses` | collection | hr | 0 | records | 12 | core/data-store.js، modules/hr/pages-ops.js، modules/hr/pages-reports.js |
| `licenseExpenseSections` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `network` | legacy-ref | hr | — | — (مرجع قديم، مفيش تخزين) | 1 | core/data-store.js |
| `paymentItemPool` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `payments` | collection | hr | 0 | records | 5 | core/data-store.js، core/excel-import.js |
| `payroll` | collection | hr | 0 | records | 20 | core/data-store.js، core/helpers.js، core/pages-backup.js… |
| `penaltyItemPool` | lookup | hr | 7 | docs | 2 | core/data-store.js |
| `penaltyItemPoolSeeded` | meta-flag | hr | — | docs (meta) | — |  |
| `performanceReviews` | collection | hr | 0 | records | 13 | core/data-store.js، core/helpers.js، modules/hr/pages-dashboard.js… |
| `personDocuments` | collection | hr | 0 | records | 49 | core/data-store.js، core/helpers.js، core/pages-archive.js… |
| `personExpenseItems` | doc | hr | — | docs | 5 | core/data-store.js، modules/hr/pages-ops.js |
| `projectDaily` | collection | hr | 0 | records | 10 | core/data-store.js، core/helpers.js، core/project-links.js… |
| `projectLinksLog` | doc | hr | — | docs | 1 | core/project-links.js |
| `projectPlans` | collection | hr | 0 | records | 6 | core/data-store.js، core/helpers.js، modules/hr/project-statement.js |
| `projects` | collection | hr | 14 | projects (5.2، PROJECTS_SOURCE) | 83 | core/alerts-center.js، core/boards.js، core/cost-center.js… |
| `requiredDocsByKind` | doc | hr | — | docs | 26 | core/data-store.js، core/helpers.js، core/pages-backup.js |
| `requiredDocsEmpty` | doc | hr | — | docs | 11 | core/helpers.js، core/pages-backup.js |
| `resignedArchive` | collection | hr | 32 | records | 13 | core/data-store.js، core/helpers.js |
| `resourceTransfers` | collection | hr | 0 | records | 16 | core/boards.js، core/data-store.js، core/project-links.js… |
| `schemaVersion` | meta-flag | hr | — | docs (meta) | 3 | core/data-store.js |
| `settings` | doc | config | — | docs | 93 | core/app.js، core/data-store.js، core/excel-import.js… |
| `supervisorCategories` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `supervisorExpenses` | collection | hr | 0 | records | 23 | core/data-store.js، core/excel-import.js، core/helpers.js… |
| `supervisorPayments` | collection | hr | — | records | 1 | modules/hr/pages-reports.js |
| `supervisors` | collection | hr | 3 | records | 78 | core/data-store.js، core/excel-import.js، core/follow-center.js… |
| `tableLayouts` | doc | config | — | docs | 1 | core/extras.js |
| `transfers` | collection | hr | — | records | 1 | modules/hr/pages-reports.js |
| `users` | system-table | system | 1 | users (جدول نظام) | 39 | core/data-store.js، core/follow-center.js، core/network.js… |
| `vehicleExpenseItems` | doc | hr | — | docs | 3 | core/data-store.js |
| `warehouses.items` | collection | warehouses | 0 | wh_items (6.2، cutover warehouses) | 1 | core/helpers.js |
| `warehouses.locations` | collection | warehouses | 1 | wh_locations (6.2، cutover warehouses) | — |  |
| `warehouses.movements` | collection | warehouses | 0 | wh_movements (6.2، cutover warehouses) | 3 | core/cost-center.js، core/helpers.js، core/project-links.js |
| `warehouses.settings` | doc | warehouses | — | docs | — |  |
| `warehouses.stocktakes` | collection | warehouses | 0 | records | — |  |
| `workerAttendance` | collection | hr | 880 | records | 57 | core/data-store.js، core/excel-import.js، core/helpers.js… |
| `workerCategories` | lookup | hr | 0 | docs | 2 | core/data-store.js |
| `workerPayments` | collection | hr | 0 | records | 55 | core/data-store.js، core/excel-import.js، core/helpers.js… |
| `workerPenalties` | collection | hr | — | records | 1 | modules/hr/pages-reports.js |
| `workers` | collection | hr | 182 | records | 87 | core/boards.js، core/data-store.js، core/excel-import.js… |

## 4. حقول المجموعات
### `archiveTrash` (من شكل البيانات الحقيقية) — 7 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `kind` | string | worker، employee، driver |
| `personId` | string | — |
| `name` | string | — |
| `code` | string | — |
| `sectionName` | string | — |
| `attachments` | array | — |
| `entity` | object | — |
| `personDocuments` | array | — |
| `deletedAt` | string | — |
| `entityDeleted` | boolean | — |

### `clients.activities` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `name`، `title`، `customerId`، `customerName`، `date`، `notes`، `type`

### `clients.boqs` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `code`، `name`، `title`، `project`، `customerName`، `notes`، `customerId`، `items`، `id`، `unit`، `qty`، `price`، `unitPrice`، `total`، `contractQty`

### `clients.collections` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `no`، `date`، `project`، `customerName`، `invoiceNo`، `method`، `amount`، `refNo`، `notes`، `customerId`

### `clients.contracts` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `code`، `title`، `name`، `project`، `contractDate`، `originalValue`، `value`، `customerId`، `boqs`، `workSurveys`، `changeOrders`، `notes`

### `clients.customers` (من شكل البيانات الحقيقية) — 1 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `code` | string | — |
| `phone` | string | — |
| `email` | string | — |
| `address` | string | — |
| `city` | string | — |
| `department` | string | — |
| `taxId` | string | — |
| `category` | string | — |
| `status` | string | active |
| `openingBalance` | number | — |
| `notes` | string | — |
| `contacts` | array | — |
| `projects` | array | — |
| `contracts` | array | — |
| `invoices` | array | — |
| `collections` | array | — |
| `workSurveys` | array | — |
| `boqs` | array | — |
| `guarantees` | array | — |
| `ledger` | array | — |
| `comms` | array | — |
| `opportunities` | array | — |
| `docs` | array | — |
| `extraFields` | array | — |
| `createdAt` | string | — |
| `updatedAt` | string | — |

### `clients.docs` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `entity`، `name`، `entityName`، `date`، `type`، `customerName`، `letterNo`، `fileName`، `stepLabel`، `title`، `no`

### `clients.guarantees` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `letterNo`، `status`، `type`، `customerName`، `issuer`، `name`، `amount`، `issueDate`، `expiryDate`، `projectId`، `contractId`، `customerId`، `project`، `renewals`، `releaseNote`، `notes`

### `clients.invoices` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `no`، `invoiceNo`، `code`، `project`، `date`، `deductions`، `advanceDeduct`، `retentionPct`، `taxPct`، `notes`، `previousWorks`، `extras`، `excluded`، `paid`، `value`، `customerName`، `status`، `contractId`، `category`، `customerId`

### `clients.opportunities` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `name`، `title`، `stage`، `comms`، `expectedValue`، `customerId`، `customerName`، `date`، `notes`، `source`، `nextFollowUp`

### `clients.workSurveys` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `code`، `name`، `project`، `execDate`، `status`، `workType`، `location`، `officer`، `supervisor`، `customerName`، `notes`، `customerId`، `items`، `id`، `unit`، `qty`، `count`، `width`، `height`، `price`، `total`

### `costs` (من شكل البيانات الحقيقية) — 41 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `personKind` | string | supervisor |
| `personId` | string | — |
| `date` | string | — |
| `amount` | number | — |
| `lines` | array | — |
| `item` | string | — |
| `project` | string | — |
| `departmentId` | string | — |
| `section` | string | — |
| `notes` | string | — |
| `createdAt` | string | — |
| `updatedAt` | string | — |
| `extraFields` | array | — |
| `projectId` | string | — |

### `departments` (من شكل البيانات الحقيقية) — 30 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `kind` | string | workers، equipment، employees، drivers |
| `manager` | string | — |
| `notes` | string | — |
| `custom` | object | — |
| `system` | boolean | — |
| `locked` | boolean | — |
| `core` | boolean | — |
| `dailiesName` | string | — |

### `drivers` (من شكل البيانات الحقيقية) — 23 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `code` | string | — |
| `dailyWage` | number | — |
| `status` | string | active، resigned، left |
| `attachments` | array | — |
| `notes` | string | — |
| `nationalId` | string | — |
| `idCardExpiry` | string | — |
| `idCardStatus` | string | — |
| `licenseExpiry` | string | — |
| `licenseStatus` | string | — |
| `licenseGrade` | string | — |
| `hireDate` | string | — |
| `contractType` | string | — |
| `insuranceStatus` | string | — |
| `insuranceNumber` | string | — |
| `phone` | string | — |
| `departmentId` | string | — |
| `position` | string | — |
| `address` | string | — |
| `contractStatus` | string | — |
| `project` | string | — |
| `categoryId` | string | — |
| `extraFields` | array | — |
| `legacyDepartmentId` | string | — |
| `resignedAt` | string | — |
| `birthDate` | string | — |
| `salary` | number | — |
| `previousDepartmentId` | string | — |
| `archiveGroup` | string | — |

### `employees` (من شكل البيانات الحقيقية) — 40 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `code` | string | — |
| `salary` | number | — |
| `email` | string | — |
| `status` | string | resigned، active، on_leave، terminated |
| `employmentType` | string | — |
| `leaveBalance` | number | — |
| `attachments` | array | — |
| `notes` | string | — |
| `nationalId` | string | — |
| `idCardExpiry` | string | — |
| `idCardStatus` | string | — |
| `licenseExpiry` | string | — |
| `licenseStatus` | string | — |
| `licenseGrade` | string | — |
| `hireDate` | string | — |
| `contractType` | string | — |
| `insuranceStatus` | string | — |
| `insuranceNumber` | string | — |
| `phone` | string | — |
| `departmentId` | string | — |
| `position` | string | — |
| `address` | string | — |
| `contractStatus` | string | — |
| `project` | string | — |
| `categoryId` | string | — |
| `custom` | object | — |
| `extraFields` | array | — |
| `legacyDepartmentId` | string | — |
| `leaveAuto` | boolean | — |
| `resignedAt` | string | — |
| `archiveGroup` | string | — |
| `previousDepartmentId` | string | — |

### `equipment` (من شكل البيانات الحقيقية) — 31 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `code` | string | — |
| `typeLabel` | string | — |
| `type` | string | other |
| `status` | string | working |
| `vehicleNumber` | string | — |
| `plate` | string | — |
| `color` | string | — |
| `motorNumber` | string | — |
| `serial` | string | — |
| `chassisNumber` | string | — |
| `insuranceNumber` | string | — |
| `insuranceStatus` | string | — |
| `model` | string | — |
| `brand` | string | — |
| `inspectionDate` | string | — |
| `licenseIssueDate` | string | — |
| `vehicleLicenseExpiry` | string | — |
| `vehicleLicenseStatus` | string | — |
| `licenseCategory` | string | — |
| `ownership` | string | — |
| `driverName` | string | — |
| `driverLicenseExpiry` | string | — |
| `driverLicenseStatus` | string | — |
| `project` | string | — |
| `notes` | string | — |
| `categoryId` | string | — |
| `departmentId` | string | — |
| `attachments` | array | — |
| `dailyCost` | number | — |
| `hourlyCost` | number | — |
| `custom` | object | — |
| `fuelPrice` | number | — |
| `totalHours` | number | — |
| `supervisorId` | string | — |
| `location` | string | — |
| `rentalDaily` | number | — |
| `purchaseDate` | string | — |
| `purchasePrice` | number | — |
| `lastMaintenance` | string | — |
| `nextMaintenance` | string | — |
| `extraFields` | array | — |
| `legacyDepartmentId` | string | — |
| `licenseExpiry` | string | — |
| `licenseStatus` | string | — |
| `projectSince` | string | — |

### `equipmentDaily` (من شكل البيانات الحقيقية) — 1 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `equipmentId` | string | — |
| `date` | string | — |
| `project` | string | — |
| `kind` | string | work |
| `days` | number | — |
| `dailyCost` | number | — |
| `hours` | number | — |
| `fuelLiters` | number | — |
| `hourlyCost` | number | — |
| `fuelPrice` | number | — |
| `extraCost` | number | — |
| `productivity` | string | — |
| `notes` | string | — |
| `id` | string | — |

### `equipmentTypes` (من شكل البيانات الحقيقية) — 17 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |

### `leaves` (من شكل البيانات الحقيقية) — 1 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `personKind` | string | employee |
| `personId` | string | — |
| `employeeId` | string | — |
| `type` | string | annual |
| `from` | string | — |
| `to` | string | — |
| `days` | number | — |
| `reason` | string | — |
| `status` | string | approved |

### `ledger.customLinkedItems` (من شكل البيانات الحقيقية) — 5 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `desc` | string | — |
| `supplierCode` | string | — |
| `internalCode` | string | — |
| `itemDescription` | string | — |
| `unitPrice` | string | — |
| `supplierId` | string | — |

### `ledger.invoices` (من شكل البيانات الحقيقية) — 648 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `supplierId` | string | — |
| `invoiceNo` | string | — |
| `date` | string | — |
| `category` | string | — |
| `project` | string | — |
| `description` | string | — |
| `internalCode` | string | — |
| `supplierItemCode` | string | — |
| `baseValue` | number | — |
| `vat` | number | — |
| `stampDuty` | number | — |
| `discountRate` | string | — |
| `withheld` | number | — |
| `totalInvoice` | number | — |
| `netInvoice` | number | — |
| `nature` | string | — |
| `discountType` | string | — |
| `isReturn` | boolean | — |
| `attachments` | array | — |
| `unitPrice` | string | — |
| `_lastEditRole` | string | — |
| `_lastEditBy` | object | — |
| `dueDate` | string | — |
| `invoiceLink` | string | — |
| `notes` | string | — |
| `itemDescription` | string | — |
| `quantity` | string | — |
| `withheldStatus` | string | — |
| `linkedInvoiceId` | string | — |
| `cancelled` | boolean | — |
| `postReturnWht` | boolean | — |
| `linkedReturnIds` | array | — |

### `ledger.payments` (من شكل البيانات الحقيقية) — 244 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `paymentNo` | number | — |
| `supplierId` | string | — |
| `date` | string | — |
| `amount` | number | — |
| `method` | string | — |
| `invoiceId` | string | — |
| `transferRef` | string | — |
| `notes` | string | — |
| `extraFields` | object | — |
| `attachments` | array | — |
| `_lastEditRole` | string | — |
| `_lastEditBy` | object | — |
| `direction` | string | pay |
| `batchId` | string | — |

### `ledger.suppliers` (من شكل البيانات الحقيقية) — 279 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `taxId` | string | — |
| `businessNature` | string | — |
| `phone` | string | — |
| `email` | string | — |
| `address` | string | — |
| `bankAccount` | string | — |
| `iban` | string | — |
| `notes` | string | — |
| `openingBalance` | number | — |
| `openingBalanceDate` | string | — |
| `commercialReg` | string | — |
| `attachments` | array | — |
| `_lastEditRole` | string | — |
| `_lastEditBy` | object | — |
| `extraFields` | array | — |
| `__justCreated` | boolean | — |

### `projects` (من شكل البيانات الحقيقية) — 14 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `code` | string | — |
| `name` | string | — |
| `budget` | number | — |
| `status` | string | active |
| `supervisorId` | string | — |
| `notes` | string | — |
| `extraFields` | array | — |
| `id` | string | — |
| `stepMeta` | object | — |
| `completedSteps` | array | — |
| `stepFiles` | object | — |
| `pathHistory` | array | — |
| `workflowSnapshot` | object | — |
| `stageKey` | string | — |
| `stepKey` | string | — |
| `tenderStance` | string | — |
| `rejectReason` | string | — |
| `statusBeforeReject` | string | — |

### `resignedArchive` (من شكل البيانات الحقيقية) — 32 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `kind` | string | employee، driver، worker |
| `personId` | string | — |
| `name` | string | — |
| `code` | string | — |
| `sectionName` | string | — |
| `archiveGroup` | string | — |
| `attachments` | array | — |
| `entity` | object | — |
| `previousDepartmentId` | string | — |
| `resignedAt` | string | — |
| `movedAt` | string | — |

### `supervisors` (من شكل البيانات الحقيقية) — 3 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `code` | string | — |
| `name` | string | — |
| `departmentId` | string | — |
| `categoryId` | string | — |
| `status` | string | active |
| `address` | string | — |
| `notes` | string | — |
| `extraFields` | array | — |
| `attachments` | array | — |
| `nationalId` | string | — |
| `idCardExpiry` | string | — |
| `licenseExpiry` | string | — |
| `hireDate` | string | — |
| `contractType` | string | — |
| `contractStatus` | string | — |
| `insuranceNumber` | string | — |
| `insuranceStatus` | string | — |
| `phone` | string | — |
| `idCardStatus` | string | — |
| `licenseStatus` | string | — |
| `position` | string | — |
| `skill` | string | — |
| `id` | string | — |
| `dailyWage` | number | — |
| `custom` | object | — |
| `legacyDepartmentId` | string | — |
| `resignedAt` | string | — |
| `projectSince` | string | — |

### `warehouses.items` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `code`، `name`، `type`، `unit`، `category`، `minQty`، `avgCost`، `lastCost`، `notes`

### `warehouses.locations` (من شكل البيانات الحقيقية) — 1 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `notes` | string | — |

### `warehouses.movements` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `type`، `itemId`، `locationId`، `toLocationId`، `qty`، `val`، `project`، `supplierInvoiceId`، `supplierName`، `date`، `notes`

### `warehouses.stocktakes` (حقول مُركّبة — مفيش بيانات حقيقية) — 0 سجل حقيقي
الحقول: `code`، `locationId`، `date`، `notes`، `lines`

### `workerAttendance` (من شكل البيانات الحقيقية) — 880 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `personType` | string | worker، supervisor |
| `personId` | string | — |
| `date` | string | — |
| `status` | string | present |
| `days` | number | — |
| `dayWage` | number | — |
| `deduction` | number | — |
| `project` | string | — |
| `notes` | string | — |
| `workerId` | string | — |
| `supervisorId` | string | — |
| `id` | string | — |
| `personKind` | string | worker، supervisor |
| `projectId` | string | — |
| `site` | string | — |

### `workers` (من شكل البيانات الحقيقية) — 182 سجل حقيقي
| الحقل | النوع | قيم محددة (enum) |
|---|---|---|
| `id` | string | — |
| `name` | string | — |
| `code` | string | — |
| `skill` | string | — |
| `dailyWage` | number | — |
| `status` | string | active، resigned |
| `type` | string | temporary، daily، company |
| `attachments` | array | — |
| `notes` | string | — |
| `nationalId` | string | — |
| `idCardExpiry` | string | — |
| `idCardStatus` | string | — |
| `licenseExpiry` | string | — |
| `licenseStatus` | string | — |
| `licenseGrade` | string | — |
| `hireDate` | string | — |
| `contractType` | string | — |
| `insuranceStatus` | string | — |
| `insuranceNumber` | string | — |
| `phone` | string | — |
| `departmentId` | string | — |
| `position` | string | — |
| `address` | string | — |
| `contractStatus` | string | — |
| `project` | string | — |
| `categoryId` | string | — |
| `supervisorId` | string | — |
| `custom` | object | — |
| `legacyDepartmentId` | string | — |
| `extraFields` | array | — |
| `workerType` | string | — |
| `salary` | number | — |
| `basicSalary` | number | — |
| `dismissedNotes` | array | — |
| `resignedAt` | string | — |
| `projectSince` | string | — |
| `archiveGroup` | string | — |
| `previousDepartmentId` | string | — |

**مجموعات من غير شكل حقول متسجّل** (مفيش بيانات حقيقية ولا مُركّبة ليها، والحقول بتتعرف من الكود وقت نقل الموديول): `attachments`، `attendance`، `customCards`، `dailyTasks`، `employeePenalties`، `equipmentLogs`، `expenses`، `fuelLogs`، `ledger.archiveFolders`، `ledger.archiveTrash`، `licenseExpenses`، `payments`، `payroll`، `performanceReviews`، `personDocuments`، `projectDaily`، `projectPlans`، `resourceTransfers`، `supervisorExpenses`، `supervisorPayments`، `transfers`، `workerPayments`، `workerPenalties`

## 5. جداول السيرفر (PostgreSQL)
### `approval_decisions` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `bigserial` | PRIMARY KEY |
| `request_id` | `uuid` | NOT NULL REFERENCES "approval_requests"("id") |
| `step_id` | `uuid` | NOT NULL REFERENCES "approval_request_steps"("id") |
| `decided_by` | `uuid` | NOT NULL |
| `decision` | `text` | NOT NULL CHECK ("decision" IN ('APPROVE','REJECT','RETURN')) |
| `comment` | `text` | — |
| `decided_at` | `timestamptz` | NOT NULL DEFAULT now() |

**قيود الجدول:** `UNIQUE ("step_id", "decided_by")`

### `approval_document_types` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `code` | `text` | PRIMARY KEY CHECK ("code" ~ '^[a-z][a-z0-9_.-]{1,60}$') |
| `name` | `text` | NOT NULL |
| `module` | `text` | NOT NULL |
| `active` | `boolean` | NOT NULL DEFAULT true |
| `created_by` | `uuid` | — |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `approval_level_approvers` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `level_id` | `uuid` | NOT NULL REFERENCES "approval_workflow_levels"("id") ON DELETE CASCADE |
| `approver_type` | `text` | NOT NULL CHECK ("approver_type" IN ('ROLE','USER')) |
| `approver_ref` | `text` | NOT NULL |

**قيود الجدول:** `PRIMARY KEY ("level_id", "approver_type", "approver_ref")`

### `approval_request_steps` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `request_id` | `uuid` | NOT NULL REFERENCES "approval_requests"("id") |
| `sequence` | `int` | NOT NULL |
| `mode` | `text` | NOT NULL |
| `required_count` | `int` | — |
| `approvers` | `jsonb` | NOT NULL |
| `status` | `text` | NOT NULL DEFAULT 'Pending' CHECK ("status" IN ('Pending','Approved','Rejected','Returned','Skipped')) |

**قيود الجدول:** `UNIQUE ("request_id", "sequence")`

### `approval_requests` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `document_type` | `text` | NOT NULL REFERENCES "approval_document_types"("code") |
| `document_id` | `text` | NOT NULL |
| `cycle` | `int` | NOT NULL DEFAULT 1 |
| `workflow_id` | `uuid` | NOT NULL REFERENCES "approval_workflows"("id") |
| `workflow_version` | `int` | NOT NULL |
| `allow_self_approval` | `boolean` | NOT NULL |
| `allow_same_approver_across_levels` | `boolean` | NOT NULL |
| `amount` | `numeric(18,4)` | — |
| `material_hash` | `text` | — |
| `status` | `text` | NOT NULL CHECK ("status" IN ('Submitted','Under Review','Approved','Rejected','Returned','Cancelled','Withdrawn')) |
| `current_sequence` | `int` | — |
| `submitted_by` | `uuid` | NOT NULL |
| `submitted_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `row_version` | `int` | NOT NULL DEFAULT 1 |

**قيود الجدول:** `UNIQUE ("document_type", "document_id", "cycle")`

### `approval_state_log` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `bigserial` | PRIMARY KEY |
| `request_id` | `uuid` | NOT NULL REFERENCES "approval_requests"("id") |
| `from_status` | `text` | — |
| `to_status` | `text` | NOT NULL |
| `command` | `text` | NOT NULL |
| `user_id` | `uuid` | NOT NULL |
| `reason` | `text` | — |
| `at` | `timestamptz` | NOT NULL DEFAULT now() |

### `approval_workflow_levels` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `workflow_id` | `uuid` | NOT NULL REFERENCES "approval_workflows"("id") ON DELETE CASCADE |
| `sequence` | `int` | NOT NULL CHECK ("sequence" >= 1) |
| `mode` | `text` | NOT NULL CHECK ("mode" IN ('ALL','ANY','N_OF_M')) |
| `required_count` | `int` | CHECK ("required_count" IS NULL OR "required_count" >= 1) |

**قيود الجدول:** `UNIQUE ("workflow_id", "sequence")` · `CHECK (("mode" = 'N_OF_M') = ("required_count" IS NOT NULL))`

### `approval_workflows` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `document_type` | `text` | NOT NULL REFERENCES "approval_document_types"("code") |
| `version` | `int` | NOT NULL CHECK ("version" >= 1) |
| `amount_from` | `numeric(18,4)` | — |
| `amount_to` | `numeric(18,4)` | — |
| `allow_self_approval` | `boolean` | NOT NULL |
| `allow_same_approver_across_levels` | `boolean` | NOT NULL |
| `active` | `boolean` | NOT NULL DEFAULT true |
| `created_by` | `uuid` | — |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

**قيود الجدول:** `UNIQUE ("document_type", "version")` · `CHECK ("amount_from" IS NULL OR "amount_to" IS NULL OR "amount_from" <= "amount_to")`

### `attachments` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | NOT NULL DEFAULT gen_random_uuid() |
| `owner_collection` | `text` | — |
| `owner_id` | `text` | — |
| `storage_key` | `text` | NOT NULL |
| `filename` | `text` | NOT NULL |
| `mime` | `text` | NOT NULL |
| `size_bytes` | `bigint` | NOT NULL |
| `sha256` | `text` | — |
| `legacy_path` | `text` | — |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `created_by` | `uuid` | — |
| `deleted_at` | `TIMESTAMP` | WITH TIME ZONE |

**قيود الجدول:** `CONSTRAINT "UQ_ec3648b85f6af7eafe865a3257b" UNIQUE ("storage_key")` · `CONSTRAINT "ck_attachments_size" CHECK ("size_bytes" >= 0)` · `CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id")`

### `audit_log` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `BIGSERIAL` | NOT NULL |
| `at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `user_id` | `uuid` | — |
| `username` | `text` | — |
| `action` | `text` | NOT NULL |
| `entity` | `text` | — |
| `entity_id` | `text` | — |
| `details` | `jsonb` | — |
| `ip` | `inet` | — |
| `user_agent` | `text` | — |

**قيود الجدول:** `CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id")`

### `changes` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `seq` | `BIGSERIAL` | NOT NULL |
| `collection` | `text` | NOT NULL |
| `record_id` | `text` | NOT NULL |
| `op` | `text` | NOT NULL |
| `rev` | `integer` | NOT NULL |
| `user_id` | `uuid` | — |
| `at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `diff` | `jsonb` | — |

**قيود الجدول:** `CONSTRAINT "ck_changes_op" CHECK ("op" IN ('insert', 'update', 'delete'))` · `CONSTRAINT "PK_6ebae225b8451fb270bfdaacd56" PRIMARY KEY ("seq")`

### `customer_contacts` — `1764000000000-Parties`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `bigserial` | PRIMARY KEY |
| `customer_id` | `text` | NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE |
| `sort` | `int` | NOT NULL |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `title` | `text` | — |
| `phone` | `text` | — |
| `email` | `text` | — |

**قيود الجدول:** `UNIQUE ("customer_id", "sort")`

### `customers` — `1764000000000-Parties`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `code` | `text` | — |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `phone` | `text` | — |
| `email` | `text` | — |
| `city` | `text` | — |
| `category` | `text` | — |
| `tax_id` | `text` | — |
| `department` | `text` | — |
| `status` | `text` | NOT NULL DEFAULT 'active' |
| `opening_balance` | `numeric(18,4)` | NOT NULL DEFAULT 0 |
| `address` | `text` | — |
| `notes` | `text` | — |
| `extra_fields` | `jsonb` | NOT NULL DEFAULT '[]'::jsonb |
| `legacy` | `jsonb` | NOT NULL DEFAULT '{}'::jsonb |
| `legacy_rev` | `int` | — |
| `row_version` | `int` | NOT NULL DEFAULT 1 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `docs` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `key` | `text` | NOT NULL |
| `data` | `jsonb` | NOT NULL |
| `rev` | `integer` | NOT NULL DEFAULT '1' |
| `updated_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `updated_by` | `uuid` | — |

**قيود الجدول:** `CONSTRAINT "ck_docs_rev_positive" CHECK ("rev" > 0)` · `CONSTRAINT "PK_e60c91159c7b78fb41f5b499904" PRIMARY KEY ("key")`

### `document_counters` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `scope` | `text` | PRIMARY KEY |
| `last_value` | `bigint` | NOT NULL DEFAULT 0 CHECK ("last_value" >= 0) |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `document_formula_snapshots` — `1764700000000-FinancialFormulas`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `bigserial` | PRIMARY KEY |
| `document_type` | `text` | NOT NULL |
| `document_id` | `text` | NOT NULL |
| `formula_code` | `text` | NOT NULL REFERENCES "financial_formulas"("code") |
| `version_id` | `uuid` | NOT NULL REFERENCES "financial_formula_versions"("id") |
| `inputs` | `jsonb` | NOT NULL |
| `outputs` | `jsonb` | NOT NULL |
| `computed_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `computed_by` | `uuid` | — |

**قيود الجدول:** `UNIQUE ("document_type", "document_id", "formula_code")`

### `document_numbers` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `scope` | `text` | NOT NULL REFERENCES "document_counters"("scope") |
| `number` | `bigint` | NOT NULL CHECK ("number" >= 1) |
| `document_type` | `text` | NOT NULL |
| `document_id` | `text` | NOT NULL |
| `status` | `text` | NOT NULL DEFAULT 'issued' CHECK ("status" IN ('issued','cancelled')) |
| `issued_by` | `uuid` | — |
| `issued_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `cancelled_by` | `uuid` | — |
| `cancelled_at` | `timestamptz` | — |
| `cancel_reason` | `text` | — |

**قيود الجدول:** `PRIMARY KEY ("scope", "number")` · `UNIQUE ("document_type", "document_id")` · `CHECK (("status" = 'cancelled') = ("cancelled_at" IS NOT NULL))`

### `document_tax_lines` — `1764200000000-TaxEngine`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `bigserial` | PRIMARY KEY |
| `document_type` | `text` | NOT NULL |
| `document_id` | `text` | NOT NULL |
| `line_no` | `int` | NOT NULL CHECK ("line_no" >= 1) |
| `code` | `text` | NOT NULL REFERENCES "tax_codes"("code") |
| `version_id` | `uuid` | NOT NULL REFERENCES "tax_code_versions"("id") |
| `base_amount` | `numeric(18,4)` | NOT NULL |
| `taxable_amount` | `numeric(18,4)` | NOT NULL |
| `rate` | `numeric(9,6)` | — |
| `amount` | `numeric(18,4)` | NOT NULL |
| `exempt_reason` | `text` | — |
| `computed_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `computed_by` | `uuid` | — |

**قيود الجدول:** `UNIQUE ("document_type", "document_id", "line_no")`

### `financial_formula_versions` — `1764700000000-FinancialFormulas`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | `text` | NOT NULL REFERENCES "financial_formulas"("code") |
| `version` | `int` | NOT NULL CHECK ("version" >= 1) |
| `status` | `text` | NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','pending','approved','rejected','suspended')) |
| `change_kind` | `text` | NOT NULL CHECK ("change_kind" IN ('new','logic','parameters')) |
| `definition` | `jsonb` | NOT NULL |
| `test_cases` | `jsonb` | NOT NULL DEFAULT '[]'::jsonb |
| `test_results` | `jsonb` | — |
| `tests_passed` | `boolean` | NOT NULL DEFAULT false |
| `tested_at` | `timestamptz` | — |
| `conditions` | `jsonb` | NOT NULL DEFAULT '{}'::jsonb |
| `effective_from` | `date` | NOT NULL |
| `effective_to` | `date` | — |
| `change_reason` | `text` | NOT NULL CHECK (length(btrim("change_reason")) > 0) |
| `created_by` | `uuid` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `submitted_by` | `uuid` | — |
| `submitted_at` | `timestamptz` | — |
| `approved_by` | `uuid` | — |
| `approved_at` | `timestamptz` | — |
| `decision_note` | `text` | — |

**قيود الجدول:** `UNIQUE ("code", "version")` · `CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")` · `CHECK ("status" NOT IN ('pending','approved','suspended') OR ("tests_passed" AND jsonb_array_length("test_cases") > 0))` · `CHECK ("status" NOT IN ('approved','suspended') OR ("approved_by" IS NOT NULL AND "approved_at" IS NOT NULL))` · `CHECK ("approved_by" IS NULL OR "approved_by" <> "created_by")`

### `financial_formulas` — `1764700000000-FinancialFormulas`
| العمود | النوع | قيود |
|---|---|---|
| `code` | `text` | PRIMARY KEY CHECK ("code" ~ '^[A-Z][A-Z0-9_-]{1,40}$') |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `module` | `text` | NOT NULL |
| `description` | `text` | — |
| `created_by` | `uuid` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `idempotency_keys` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `user_id` | `uuid` | NOT NULL |
| `key` | `text` | NOT NULL CHECK (length("key") BETWEEN 8 AND 200) |
| `method` | `text` | NOT NULL |
| `path` | `text` | NOT NULL |
| `request_hash` | `text` | NOT NULL |
| `status_code` | `int` | — |
| `response` | `jsonb` | — |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

**قيود الجدول:** `PRIMARY KEY ("user_id", "key")`

### `integration_events` — `1764800000000-SupplierInvoices`
| العمود | النوع | قيود |
|---|---|---|
| `seq` | `bigserial` | PRIMARY KEY |
| `event_type` | `text` | NOT NULL CHECK ("event_type" ~ '^[a-z][a-z-]*\\.[a-z][a-z-]*$') |
| `aggregate_type` | `text` | NOT NULL |
| `aggregate_id` | `text` | NOT NULL |
| `idempotency_key` | `text` | NOT NULL UNIQUE |
| `payload` | `jsonb` | NOT NULL |
| `occurred_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `created_by` | `uuid` | — |

### `module_cutover` — `1764100000000-PartiesCutover`
| العمود | النوع | قيود |
|---|---|---|
| `collection` | `text` | PRIMARY KEY |
| `cutover_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `cutover_by` | `text` | NOT NULL |
| `report` | `jsonb` | NOT NULL |

### `notifications` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `bigserial` | PRIMARY KEY |
| `user_id` | `uuid` | NOT NULL REFERENCES "users"("id") ON DELETE CASCADE |
| `kind` | `text` | NOT NULL |
| `title` | `text` | NOT NULL |
| `body` | `text` | — |
| `entity` | `text` | — |
| `entity_id` | `text` | — |
| `read_at` | `timestamptz` | — |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `projects` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `code` | `text` | — |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `status` | `text` | — |
| `stage` | `text` | — |
| `budget` | `numeric(18,4)` | CHECK ("budget" IS NULL OR "budget" >= 0) |
| `customer_id` | `text` | — |
| `supervisor_id` | `text` | — |
| `legacy_name` | `text` | — |
| `legacy_rev` | `int` | — |
| `extra` | `jsonb` | NOT NULL DEFAULT '{}' |
| `row_version` | `int` | NOT NULL DEFAULT 1 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

### `records` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `collection` | `text` | NOT NULL |
| `id` | `text` | NOT NULL |
| `data` | `jsonb` | NOT NULL |
| `rev` | `integer` | NOT NULL DEFAULT '1' |
| `project_id` | `text` | — |
| `deleted_at` | `TIMESTAMP` | WITH TIME ZONE |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `created_by` | `uuid` | — |
| `updated_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `updated_by` | `uuid` | — |

**قيود الجدول:** `CONSTRAINT "ck_records_rev_positive" CHECK ("rev" > 0)` · `CONSTRAINT "PK_4b69b89752c60ab90299859501c" PRIMARY KEY ("collection", "id")`

### `roles` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `key` | `text` | NOT NULL |
| `label` | `text` | NOT NULL |
| `permissions` | `jsonb` | NOT NULL DEFAULT '{}'::jsonb |
| `is_system` | `boolean` | NOT NULL DEFAULT false |
| `updated_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |

**قيود الجدول:** `CONSTRAINT "PK_a87cf0659c3ac379b339acf36a2" PRIMARY KEY ("key")`

### `schema_meta` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `key` | `text` | NOT NULL |
| `value` | `jsonb` | NOT NULL |
| `updated_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |

**قيود الجدول:** `CONSTRAINT "PK_844e699f1b8c86a40d805e4d032" PRIMARY KEY ("key")`

### `sessions` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | NOT NULL DEFAULT gen_random_uuid() |
| `user_id` | `uuid` | NOT NULL |
| `token_hash` | `text` | NOT NULL |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `expires_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL |
| `revoked_at` | `TIMESTAMP` | WITH TIME ZONE |
| `replaced_by` | `uuid` | — |
| `user_agent` | `text` | — |
| `ip` | `inet` | — |

**قيود الجدول:** `CONSTRAINT "UQ_abaa9e068cdd390bc5210f79884" UNIQUE ("token_hash")` · `CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id")`

### `stock_adjustments` — `1764500000000-StockAdjustments`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `kind` | `text` | NOT NULL CHECK ("kind" IN ('increase','deficit','damage','correction','stocktake','transfer')) |
| `direction` | `text` | NOT NULL CHECK ("direction" IN ('in','out','transfer')) |
| `item_id` | `text` | NOT NULL CHECK (length(btrim("item_id")) > 0) |
| `location_id` | `text` | NOT NULL DEFAULT '' |
| `to_location_id` | `text` | — |
| `qty` | `numeric(18,5)` | NOT NULL CHECK ("qty" > 0) |
| `reason` | `text` | NOT NULL CHECK (length(btrim("reason")) > 0) |
| `status` | `text` | NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','submitted','approved','posted','rejected','returned','cancelled',' |
| `approval_request_id` | `uuid` | — |
| `movement_id` | `text` | — |
| `post_error` | `text` | — |
| `created_by` | `uuid` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `submitted_at` | `timestamptz` | — |
| `approved_at` | `timestamptz` | — |
| `posted_by` | `uuid` | — |
| `posted_at` | `timestamptz` | — |
| `cancel_reason` | `text` | — |
| `row_version` | `int` | NOT NULL DEFAULT 1 |

**قيود الجدول:** `CHECK (("kind" = 'increase' AND "direction" = 'in') OR ("kind" IN ('deficit','damage') AND "direction" = 'out') OR ("kind" IN ('correction',` · `CHECK (("direction" = 'transfer') = ("to_location_id" IS NOT NULL))` · `CHECK ("to_location_id" IS NULL OR "to_location_id" <> "location_id")` · `CHECK (("status" = 'posted') = ("movement_id" IS NOT NULL AND "posted_at" IS NOT NULL))`

### `stock_reservations` — `1764400000000-StockGuard`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `item_id` | `text` | NOT NULL |
| `location_id` | `text` | NOT NULL DEFAULT '' |
| `qty` | `numeric(18,5)` | NOT NULL CHECK ("qty" > 0) |
| `source_type` | `text` | NOT NULL |
| `source_id` | `text` | NOT NULL |
| `status` | `text` | NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','released','consumed')) |
| `created_by` | `uuid` | — |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `closed_at` | `timestamptz` | — |

### `supplier_invoices` — `1764800000000-SupplierInvoices`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `legacy_extra` | `jsonb` | NOT NULL DEFAULT '{}'::jsonb |
| `row_version` | `int` | NOT NULL DEFAULT 1 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `deleted_at` | `timestamptz` | — |

**قيود الجدول:** `${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')}`

### `supplier_payments` — `1765000000000-SupplierPayments`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `legacy_extra` | `jsonb` | NOT NULL DEFAULT '{}'::jsonb |
| `row_version` | `int` | NOT NULL DEFAULT 1 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `deleted_at` | `timestamptz` | — |

**قيود الجدول:** `${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')}`

### `suppliers` — `1764000000000-Parties`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `tax_id` | `text` | — |
| `commercial_reg` | `text` | — |
| `business_nature` | `text` | — |
| `opening_balance` | `numeric(18,4)` | NOT NULL DEFAULT 0 |
| `opening_balance_date` | `date` | — |
| `phone` | `text` | — |
| `email` | `text` | — |
| `address` | `text` | — |
| `bank_account` | `text` | — |
| `iban` | `text` | — |
| `notes` | `text` | — |
| `extra_fields` | `jsonb` | NOT NULL DEFAULT '[]'::jsonb |
| `legacy_rev` | `int` | — |
| `row_version` | `int` | NOT NULL DEFAULT 1 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

**قيود الجدول:** `CHECK ("tax_id" IS NULL OR length(btrim("tax_id")) = 0 OR length(btrim("tax_id")) >= 5)`

### `tax_code_versions` — `1764200000000-TaxEngine`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | `text` | NOT NULL REFERENCES "tax_codes"("code") |
| `version` | `int` | NOT NULL CHECK ("version" >= 1) |
| `status` | `text` | NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','pending','approved','suspended','rejected')) |
| `method` | `text` | NOT NULL CHECK ("method" IN ('PERCENT','FIXED','BRACKETS')) |
| `rate` | `numeric(9,6)` | CHECK ("rate" IS NULL OR ("rate" >= 0 AND "rate" <= 100)) |
| `fixed_amount` | `numeric(18,4)` | CHECK ("fixed_amount" IS NULL OR "fixed_amount" >= 0) |
| `brackets` | `jsonb` | — |
| `base` | `text` | NOT NULL CHECK ("base" IN ('NET_OF_DISCOUNT','GROSS','NET_PLUS_VAT','TAXABLE_WAGE','CONTRACT_VALUE')) |
| `base_ratio` | `numeric(9,6)` | NOT NULL DEFAULT 100 CHECK ("base_ratio" > 0 AND "base_ratio" <= 100) |
| `min_base` | `numeric(18,4)` | CHECK ("min_base" IS NULL OR "min_base" >= 0) |
| `applies_to` | `text[]` | NOT NULL CHECK (cardinality("applies_to") > 0) |
| `bearer` | `text` | NOT NULL CHECK ("bearer" IN ('COMPANY','COUNTERPARTY','EMPLOYEE','EMPLOYER')) |
| `collector` | `text` | NOT NULL CHECK ("collector" IN ('COMPANY_WITHHOLDS','COUNTERPARTY_CHARGES','COMPANY_CHARGES','PAID_DIRECTLY')) |
| `conditions` | `jsonb` | NOT NULL DEFAULT '{}'::jsonb |
| `exemptions` | `jsonb` | NOT NULL DEFAULT '[]'::jsonb |
| `allow_stacking` | `boolean` | NOT NULL DEFAULT false |
| `effective_from` | `date` | NOT NULL |
| `effective_to` | `date` | — |
| `legal_ref` | `text` | — |
| `notes_cfo` | `text` | — |
| `notes_advisor` | `text` | — |
| `change_reason` | `text` | NOT NULL CHECK (length(btrim("change_reason")) > 0) |
| `created_by` | `uuid` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `submitted_by` | `uuid` | — |
| `submitted_at` | `timestamptz` | — |
| `approved_by` | `uuid` | — |
| `approved_at` | `timestamptz` | — |
| `decision_note` | `text` | — |

**قيود الجدول:** `UNIQUE ("code", "version")` · `CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")` · `CHECK (("method" = 'PERCENT') = ("rate" IS NOT NULL))` · `CHECK (("method" = 'FIXED') = ("fixed_amount" IS NOT NULL))` · `CHECK (("method" = 'BRACKETS') = ("brackets" IS NOT NULL))` · `CHECK ("status" NOT IN ('approved','suspended') OR ("approved_by" IS NOT NULL AND "approved_at" IS NOT NULL AND length(btrim(coalesce("legal` · `CHECK ("approved_by" IS NULL OR "approved_by" <> "created_by")`

### `tax_codes` — `1764200000000-TaxEngine`
| العمود | النوع | قيود |
|---|---|---|
| `code` | `text` | PRIMARY KEY CHECK ("code" ~ '^[A-Z][A-Z0-9_-]{1,40}$') |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `category` | `text` | NOT NULL CHECK ("category" IN ('VAT','SCHEDULE','WHT','STAMP','PAYROLL_TAX','SOCIAL_INSURANCE','CONTRACTUAL')) |
| `is_tax` | `boolean` | NOT NULL |
| `status` | `text` | NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','suspended')) |
| `created_by` | `uuid` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

**قيود الجدول:** `CHECK (("category" = 'CONTRACTUAL') = (NOT "is_tax"))`

### `user_action_permissions` — `1763800000000-Foundation`
| العمود | النوع | قيود |
|---|---|---|
| `user_id` | `uuid` | NOT NULL REFERENCES "users"("id") ON DELETE CASCADE |
| `action` | `text` | NOT NULL CHECK ("action" IN ('approve','reject','print','export','pay','cancel','post')) |
| `scope` | `text` | NOT NULL DEFAULT '*' |
| `allowed` | `boolean` | NOT NULL |
| `granted_by` | `uuid` | — |
| `granted_at` | `timestamptz` | NOT NULL DEFAULT now() |

**قيود الجدول:** `PRIMARY KEY ("user_id", "action", "scope")`

### `user_permissions` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `user_id` | `uuid` | NOT NULL |
| `page` | `text` | NOT NULL |
| `can_view` | `boolean` | NOT NULL DEFAULT false |
| `can_add` | `boolean` | NOT NULL DEFAULT false |
| `can_edit` | `boolean` | NOT NULL DEFAULT false |
| `can_delete` | `boolean` | NOT NULL DEFAULT false |

**قيود الجدول:** `CONSTRAINT "PK_61c5d30ade880a70678098ff294" PRIMARY KEY ("user_id", "page")`

### `users` — `1763200000000-InitLayer1`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `uuid` | NOT NULL DEFAULT gen_random_uuid() |
| `legacy_id` | `text` | — |
| `username` | `text` | NOT NULL |
| `name` | `text` | NOT NULL DEFAULT '' |
| `role` | `text` | NOT NULL DEFAULT 'viewer' |
| `active` | `boolean` | NOT NULL DEFAULT true |
| `password_algo` | `text` | NOT NULL |
| `password_hash` | `text` | NOT NULL |
| `password_salt` | `text` | — |
| `must_change_password` | `boolean` | NOT NULL DEFAULT false |
| `password_changed_at` | `TIMESTAMP` | WITH TIME ZONE |
| `can_edit_data` | `boolean` | NOT NULL DEFAULT false |
| `can_delete_data` | `boolean` | NOT NULL DEFAULT false |
| `can_manage_users` | `boolean` | NOT NULL DEFAULT false |
| `project_scope` | `text` | array |
| `failed_attempts` | `integer` | NOT NULL DEFAULT '0' |
| `locked_until` | `TIMESTAMP` | WITH TIME ZONE |
| `last_login_at` | `TIMESTAMP` | WITH TIME ZONE |
| `token_version` | `integer` | NOT NULL DEFAULT '0' |
| `totp_secret` | `text` | — |
| `totp_enabled` | `boolean` | NOT NULL DEFAULT false |
| `created_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |
| `updated_at` | `TIMESTAMP` | WITH TIME ZONE NOT NULL DEFAULT now() |

**قيود الجدول:** `CONSTRAINT "UQ_60fbe7e9fbad9f9d76088fc5475" UNIQUE ("legacy_id")` · `CONSTRAINT "ck_users_username_not_blank" CHECK (length(btrim("username")) > 0)` · `CONSTRAINT "ck_users_scrypt_salt" CHECK ( "password_algo" <> 'scrypt' OR "password_salt" IS NOT NULL )` · `CONSTRAINT "ck_users_password_algo" CHECK ("password_algo" IN ('argon2id', 'scrypt'))` · `CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")`

### `wh_items` — `1764600000000-WarehousesCutover`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `code` | `text` | — |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `unit` | `text` | — |
| `category` | `text` | — |
| `min_qty` | `numeric(18,5)` | — |
| `avg_cost` | `numeric(18,5)` | — |
| `last_cost` | `numeric(18,5)` | — |
| `notes` | `text` | — |

**قيود الجدول:** `${common}`

### `wh_locations` — `1764600000000-WarehousesCutover`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `name` | `text` | NOT NULL CHECK (length(btrim("name")) > 0) |
| `notes` | `text` | — |

**قيود الجدول:** `${common}`

### `wh_movements` — `1764600000000-WarehousesCutover`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `type` | `text` | NOT NULL CHECK ("type" IN ('in','out','transfer','adjust_in','adjust_out')) |
| `item_id` | `text` | NOT NULL CHECK (length(btrim("item_id")) > 0) |
| `qty` | `numeric(18,5)` | NOT NULL CHECK ("qty" > 0) |
| `location_id` | `text` | — |
| `to_location_id` | `text` | — |
| `date` | `text` | — |
| `unit_cost` | `numeric(18,5)` | — |
| `project` | `text` | — |
| `supplier_invoice_id` | `text` | — |
| `supplier_name` | `text` | — |
| `notes` | `text` | — |
| `adjustment_id` | `text` | — |
| `adjustment_kind` | `text` | — |

**قيود الجدول:** `${common}` · `CHECK ("type" <> 'transfer' OR (coalesce("to_location_id", '') <> '' AND "to_location_id" <> coalesce("location_id", '')))`

### `workers` — `1765200000000-WorkersCutover`
| العمود | النوع | قيود |
|---|---|---|
| `id` | `text` | PRIMARY KEY |
| `legacy_extra` | `jsonb` | NOT NULL DEFAULT '{}'::jsonb |
| `row_version` | `int` | NOT NULL DEFAULT 1 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `deleted_at` | `timestamptz` | — |

**قيود الجدول:** `${COLS.map(([c, , t]) => `"${c}" ${SQL_TYPE[t]}`).join(', ')}`

