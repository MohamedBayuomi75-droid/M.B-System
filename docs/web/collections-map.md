# خريطة الـ collections (مولَّدة آليًا — `npm run inventory`)

المصدر: شكل `DATA` الفعلي بعد تهيئة الواجهة وزيارة كل الصفحات (runtime) + مراجع `DATA.*` وأنماط الإسناد في الكود (static). SCHEMA_VERSION=9.

| النوع | العدد | التخزين المقترح |
|---|---|---|
| **collection** | 53 | records (صف لكل سجل) |
| **lookup** | 27 | docs (قائمة مرجعية كاملة) |
| **doc** | 27 | docs (كائن كامل) |
| **meta-flag** | 5 | docs: meta (أعلام ترحيل/حالة) |
| **system-table** | 2 | جدول مخصص (users / audit_log) |
| **legacy-ref** | 3 | — يتراجع (مقروء بس، مفيش تهيئة/كتابة في الكود) |

قواعد التصنيف: مصفوفة في المستوى الأعلى أو داخل قسم (`ledger/clients/warehouses`) = collection، إلا لو اسمها قائمة مرجعية (Categories/Types/Pool/Hidden/custom*...) = lookup. كائن = doc. قيمة بسيطة = meta-flag. **التصنيف مقترح ويتراجع في A3** (مثلًا lookup فيه سجلات بـ id ممكن يترقّى لـ collection).

⚠️ **legacy-ref** — مقروءة في الكود ومفيش كود بيهيّأها، ومش موجودة في data.json الحقيقي (fallback لمفاتيح قديمة — تتشال أو تتوثّق في A7)): `archiveAttachments`، `driverPayments`، `network`

| المسار | النوع | الوحدة | مراجع `DATA.` | المصدر | ملفات |
|---|---|---|---|---|---|
| `_cfAligned` | doc | hr | 8 | runtime | core/helpers.js |
| `_cfAligned2` | doc | hr | 0 | runtime |  |
| `_cfAllHiddenFixed` | meta-flag | hr | 2 | runtime | core/helpers.js |
| `_cfAutoFlagsReset` | meta-flag | hr | 2 | runtime | core/helpers.js |
| `_cfRegKeys` | doc | hr | 4 | runtime | core/helpers.js |
| `_cfShowInTableMigrated` | meta-flag | hr | 2 | runtime | core/helpers.js |
| `alertState` | doc | hr | 4 | runtime | core/alerts-center.js |
| `archiveAttachments` | legacy-ref | hr | 2 | static (no init found) | core/helpers.js |
| `archiveTrash` | collection | hr | 16 | runtime | core/data-store.js, core/helpers.js, core/pages-archive.js |
| `attachments` | collection | hr | 1 | static | modules/hr/pages-dashboard.js |
| `attendance` | collection | hr | 23 | runtime | core/data-store.js, core/helpers.js, modules/hr/pages-attendance.js +3 |
| `auditLog` | system-table | system | 27 | runtime | core/data-store.js, core/follow-center.js, core/helpers.js +3 |
| `autoFields` | doc | config | 6 | runtime | core/helpers.js |
| `clients.activities` | collection | clients | 0 | runtime |  |
| `clients.boqs` | collection | clients | 0 | runtime |  |
| `clients.collections` | collection | clients | 0 | runtime |  |
| `clients.contracts` | collection | clients | 0 | runtime |  |
| `clients.customers` | collection | clients | 1 | runtime | core/pages-general.js |
| `clients.docs` | collection | clients | 0 | runtime |  |
| `clients.guarantees` | collection | clients | 0 | runtime |  |
| `clients.invoices` | collection | clients | 0 | runtime |  |
| `clients.opportunities` | collection | clients | 0 | runtime |  |
| `clients.paidReconcileLog` | doc | clients | 0 | manual (A4 web tests) |  |
| `clients.projectsUnifyLog` | doc | clients | 0 | manual (A4 web tests) |  |
| `clients.settings` | doc | clients | 1 | runtime | modules/clients/project-workflow.js |
| `clients.workSurveys` | collection | clients | 0 | runtime |  |
| `costItemHidden` | doc | hr | 11 | static | modules/hr/pages-costs.js |
| `costItemPools` | doc | hr | 11 | static | modules/hr/pages-costs.js |
| `costSections` | doc | hr | 24 | runtime | modules/hr/pages-costs.js |
| `costs` | collection | hr | 37 | runtime | core/cost-center.js, core/data-store.js, core/follow-center.js +7 |
| `customCards` | collection | config | 9 | runtime | core/helpers.js, core/pages-backup.js |
| `customFieldDefs` | doc | config | 17 | runtime | core/data-store.js, core/helpers.js |
| `dailyPayItemPool` | lookup | hr | 2 | runtime | core/data-store.js |
| `dailyTasks` | collection | hr | 9 | runtime | core/data-store.js, core/follow-center.js |
| `deadFields` | doc | config | 4 | runtime | core/helpers.js |
| `departments` | collection | hr | 82 | runtime | core/data-store.js, core/extras.js, core/helpers.js +6 |
| `documentTypeHidden` | lookup | hr | 14 | runtime | core/data-store.js, core/helpers.js, modules/hr/pages-ops.js |
| `documentTypes` | lookup | hr | 15 | runtime | core/data-store.js, core/helpers.js, modules/hr/pages-ops.js |
| `documentTypesByKind` | doc | hr | 12 | runtime | core/data-store.js, core/helpers.js |
| `driverCategories` | lookup | hr | 2 | runtime | core/data-store.js |
| `driverPayments` | legacy-ref | hr | 1 | static (no init found) | modules/hr/pages-reports.js |
| `drivers` | collection | hr | 94 | runtime | core/data-store.js, core/excel-import.js, core/follow-center.js +15 |
| `employeeCategories` | lookup | hr | 2 | runtime | core/data-store.js |
| `employeePenalties` | collection | hr | 16 | runtime | core/data-store.js, core/helpers.js, modules/hr/pages-reports.js +1 |
| `employees` | collection | hr | 77 | runtime | core/data-store.js, core/excel-import.js, core/follow-center.js +15 |
| `equipment` | collection | hr | 84 | runtime | core/data-store.js, core/excel-import.js, core/follow-center.js +12 |
| `equipmentCategories` | lookup | hr | 2 | runtime | core/data-store.js |
| `equipmentDaily` | collection | hr | 45 | runtime | core/data-store.js, core/helpers.js, core/project-links.js +8 |
| `equipmentLogs` | collection | hr | 19 | runtime | core/data-store.js, core/helpers.js, core/project-links.js +4 |
| `equipmentTypes` | lookup | hr | 17 | runtime | core/data-store.js, core/helpers.js |
| `expenseItemHidden` | doc | hr | 12 | static | modules/hr/pages-ops.js |
| `expenseItemPool` | lookup | hr | 6 | runtime | core/data-store.js, modules/hr/pages-ops.js |
| `expenseItemPools` | doc | hr | 16 | runtime | core/data-store.js, modules/hr/pages-ops.js |
| `expenseSections` | doc | hr | 12 | runtime | core/data-store.js, modules/hr/pages-ops.js |
| `expenseTypes` | lookup | hr | 2 | runtime | core/data-store.js |
| `expenses` | collection | hr | 60 | runtime | core/boards.js, core/cost-center.js, core/data-store.js +11 |
| `formCols` | doc | config | 6 | static | core/helpers.js, core/pages-backup.js |
| `formLayouts` | doc | config | 62 | runtime | core/extras.js, core/helpers.js, core/pages-backup.js |
| `fuelLogs` | collection | hr | 20 | runtime | core/data-store.js, core/helpers.js, core/project-links.js +4 |
| `leaves` | collection | hr | 34 | runtime | core/data-store.js, core/helpers.js, core/pages-backup.js +4 |
| `ledger.archiveFolders` | collection | ledger | 4 | runtime | modules/ledger/data-store.js |
| `ledger.archiveSections` | lookup | ledger | 4 | runtime | modules/ledger/data-store.js |
| `ledger.archiveTrash` | collection | ledger | 13 | runtime | modules/ledger/data-store.js, modules/ledger/modals.js, modules/ledger/pages-archive.js |
| `ledger.customCategories` | lookup | ledger | 8 | runtime | modules/ledger/app.js, modules/ledger/data-store.js, modules/ledger/helpers.js |
| `ledger.customInternalCodes` | lookup | ledger | 3 | runtime | modules/ledger/data-store.js, modules/ledger/helpers.js |
| `ledger.customItemDescriptions` | lookup | ledger | 3 | runtime | modules/ledger/data-store.js, modules/ledger/helpers.js |
| `ledger.customItemNames` | lookup | ledger | 3 | runtime | modules/ledger/data-store.js, modules/ledger/helpers.js |
| `ledger.customLinkedItems` | lookup | ledger | 15 | runtime | modules/ledger/data-store.js, modules/ledger/helpers.js, modules/ledger/pages-categories.js |
| `ledger.customProjects` | lookup | ledger | 17 | runtime | modules/ledger/app.js, modules/ledger/data-store.js, modules/ledger/helpers.js +1 |
| `ledger.customSupplierItemCodes` | lookup | ledger | 3 | runtime | modules/ledger/data-store.js, modules/ledger/helpers.js |
| `ledger.documentTypeHidden` | lookup | ledger | 15 | runtime | modules/ledger/data-store.js, modules/ledger/pages-archive.js |
| `ledger.documentTypes` | lookup | ledger | 11 | runtime | modules/ledger/data-store.js, modules/ledger/pages-archive.js |
| `ledger.hiddenProjects` | lookup | ledger | 13 | runtime | modules/ledger/app.js, modules/ledger/data-store.js, modules/ledger/helpers.js +1 |
| `ledger.hiddenSuggestions` | lookup | ledger | 7 | runtime | modules/ledger/app.js, modules/ledger/data-store.js, modules/ledger/helpers.js |
| `ledger.invoices` | collection | ledger | 130 | runtime | core/alerts-center.js, core/boards.js, core/cost-center.js +20 |
| `ledger.payments` | collection | ledger | 64 | runtime | core/boards.js, core/follow-center.js, modules/accounts/pages-reports.js +11 |
| `ledger.suppliers` | collection | ledger | 58 | runtime | core/boards.js, core/extras.js, core/follow-center.js +11 |
| `licenseExpenseFieldDefs` | lookup | hr | 2 | runtime | core/data-store.js |
| `licenseExpenseSections` | lookup | hr | 2 | runtime | core/data-store.js |
| `licenseExpenses` | collection | hr | 12 | runtime | core/data-store.js, modules/hr/pages-ops.js, modules/hr/pages-reports.js |
| `network` | legacy-ref | hr | 1 | static (no init found) | core/data-store.js |
| `paymentItemPool` | lookup | hr | 2 | runtime | core/data-store.js |
| `payments` | collection | hr | 5 | runtime | core/data-store.js, core/excel-import.js |
| `payroll` | collection | hr | 20 | runtime | core/data-store.js, core/helpers.js, core/pages-backup.js +3 |
| `penaltyItemPool` | lookup | hr | 2 | runtime | core/data-store.js |
| `penaltyItemPoolSeeded` | meta-flag | hr | 0 | data.json |  |
| `performanceReviews` | collection | hr | 13 | runtime | core/data-store.js, core/helpers.js, modules/hr/pages-dashboard.js +2 |
| `personDocuments` | collection | hr | 49 | runtime | core/data-store.js, core/helpers.js, core/pages-archive.js +4 |
| `personExpenseItems` | doc | hr | 5 | runtime | core/data-store.js, modules/hr/pages-ops.js |
| `projectDaily` | collection | hr | 10 | runtime | core/data-store.js, core/helpers.js, core/project-links.js +2 |
| `projectLinksLog` | doc | hr | 1 | runtime | core/project-links.js |
| `projectPlans` | collection | hr | 6 | runtime | core/data-store.js, core/helpers.js, modules/hr/project-statement.js |
| `projects` | collection | hr | 83 | runtime | core/alerts-center.js, core/boards.js, core/cost-center.js +20 |
| `requiredDocsByKind` | doc | hr | 26 | runtime | core/data-store.js, core/helpers.js, core/pages-backup.js |
| `requiredDocsEmpty` | doc | hr | 11 | static | core/helpers.js, core/pages-backup.js |
| `resignedArchive` | collection | hr | 13 | runtime | core/data-store.js, core/helpers.js |
| `resourceTransfers` | collection | hr | 16 | runtime | core/boards.js, core/data-store.js, core/project-links.js +4 |
| `schemaVersion` | meta-flag | hr | 3 | runtime | core/data-store.js |
| `settings` | doc | config | 93 | runtime | core/app.js, core/data-store.js, core/excel-import.js +13 |
| `supervisorCategories` | lookup | hr | 2 | runtime | core/data-store.js |
| `supervisorExpenses` | collection | hr | 23 | runtime | core/data-store.js, core/excel-import.js, core/helpers.js +3 |
| `supervisorPayments` | collection | hr | 1 | static | modules/hr/pages-reports.js |
| `supervisors` | collection | hr | 78 | runtime | core/data-store.js, core/excel-import.js, core/follow-center.js +14 |
| `tableLayouts` | doc | config | 1 | static (no init found) + data.json | core/extras.js |
| `transfers` | collection | hr | 1 | static | modules/hr/pages-reports.js |
| `users` | system-table | system | 39 | runtime | core/data-store.js, core/follow-center.js, core/network.js +2 |
| `vehicleExpenseItems` | doc | hr | 3 | runtime | core/data-store.js |
| `warehouses.items` | collection | warehouses | 1 | runtime | core/helpers.js |
| `warehouses.locations` | collection | warehouses | 0 | runtime |  |
| `warehouses.movements` | collection | warehouses | 3 | runtime | core/cost-center.js, core/helpers.js, core/project-links.js |
| `warehouses.settings` | doc | warehouses | 0 | runtime |  |
| `warehouses.stocktakes` | collection | warehouses | 0 | runtime |  |
| `workerAttendance` | collection | hr | 57 | runtime | core/data-store.js, core/excel-import.js, core/helpers.js +8 |
| `workerCategories` | lookup | hr | 2 | runtime | core/data-store.js |
| `workerPayments` | collection | hr | 55 | runtime | core/data-store.js, core/excel-import.js, core/helpers.js +3 |
| `workerPenalties` | collection | hr | 1 | static | modules/hr/pages-reports.js |
| `workers` | collection | hr | 87 | runtime | core/boards.js, core/data-store.js, core/excel-import.js +16 |

> المراجع بتتعد على مستوى المفتاح الأعلى (أو `قسم.مفتاح`). المصفوفات الأعمق (مثل `clients.customers[].projects`) جزء من سجلها الأب في المسار A، وتتفك لجداول في Promotion (المسار B).
