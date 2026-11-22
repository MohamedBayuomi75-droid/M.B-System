# سجل المتطلبات بالترقيم الموحّد (خطة v1.4.5)

> **مولَّد** بـ `node tools/discovery/build-registry.js` من الكود والمستندات (قراءة بس). **المصدر الثابت:** `requirements-registry.json`. ماتعدّلش الملف ده باليد.
> **قواعد الترقيم** (`docs/plan-v1.4.5/00_README_DOCUMENT_INDEX.md` §3): الـ ID بيتحجز مرة واحدة ومابيتعادش، والعنصر اللي يختفي من المصدر بيفضل بحالة `missing-in-source`.
> **الأولويات معتمدة كقاعدة** بقرار DEC-0085 (2026-11-20): P0 للحساب المالي وكتابة البيانات وسلامة البيانات، والباقي P1. أي تعديل لعنصر معيّن بيتسجّل كقرار. والأرقام القديمة (B-/F-/TR-/S-/U-) بتفضل أسماء بديلة: راجع `ID_MAPPING.md`.

## الملخص
| البادئة | التصنيف | العدد |
|---|---|---|
| `LEG-` | LEGACY-PRESERVE | 351 |
| `CHG-` | APPROVED-CHANGE | 14 |
| `TECH-` | TECHNICAL | 18 |
| `NEW-` | NEW-REQUIREMENT | 9 |
| `DEC-` | OPEN-DECISION (المفتوح والمحسوم) | 110 (مفتوح: 41) |
| **الإجمالي** | | **502** |

**عناصر LEG حسب النوع:** page 54 · calc 120 · data-write 27 · modal 63 · export/print 37 · permission 8 · electron-capability 42

## القدرات القديمة (LEG)
| ID | النوع | الموديول | الوصف | الأولوية (مقترحة) | الدليل | المكان المستهدف | الاختبارات | الحالة | ملاحظات |
|---|---|---|---|---|---|---|---|---|---|
| LEG-0001 | page | مركز المتابعة | صفحة «مركز المتابعة» (dashboard) | P1 | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase16.js، phase20.js، phase38.js، phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0002 | page | مهامي | صفحة «مهامي» (tasks.my) | P1 | renderer/modules/clients/pages-tasks.js:38 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0003 | page | الموارد البشرية | صفحة «لوحات الموارد البشرية» (hrHome) | P1 | renderer/core/boards.js:172 | legacy /legacy/ | phase22.js | verified-static | في القايمة، مش في مصفوفة الصلاحيات |
| LEG-0004 | page | الموارد البشرية | صفحة «الموظفين» (employees) | P1 | renderer/modules/hr/pages-employees.js:77 | legacy /legacy/ | phase22.js، phase26.js، phase27.js، phase28.js، phase29.js، phase30.js، phase31.js، phase32.js، phase33.js، phase34.js، phase35.js، phase36.js، phase38.js، phase39.js، phase40.js، phase42.js، phase44.js، phase45.js، phase49.js، phase51.js، phase52.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0005 | page | الموارد البشرية | صفحة «المشرفون» (supervisors) | P1 | renderer/modules/hr/pages-supervisors.js:12 | legacy /legacy/ | phase27.js، phase42.js، phase43.js، phase49.js، phase50.js، phase53.js، phase54.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0006 | page | الموارد البشرية | صفحة «العمال» (workers) | P1 | renderer/modules/hr/pages-workers.js:29 | legacy /legacy/ | phase24.js، phase26.js، phase27.js، phase28.js، phase29.js، phase30.js، phase37.js، phase39.js، phase40.js، phase41.js، phase42.js، phase43.js، phase45.js، phase47.js، phase49.js، phase50.js، phase51.js، phase52.js، phase53.js، phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0007 | page | الموارد البشرية | صفحة «السائقون» (drivers) | P1 | renderer/modules/hr/pages-ops.js:6 | legacy /legacy/ | phase27.js، phase42.js، phase44.js، phase45.js، phase49.js، phase50.js، phase51.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0008 | page | الموارد البشرية | صفحة «معدات ومركبات» (equipment) | P1 | renderer/modules/hr/pages-equipment.js:32 | legacy /legacy/ | phase23.js، phase24.js، phase25.js، phase26.js، phase27.js، phase31.js، phase32.js، phase39.js، phase40.js، phase42.js، phase44.js، phase53.js، phase54.js، phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0009 | page | الموارد البشرية | صفحة «حضور الموظفين» (attendance) | P1 | renderer/modules/hr/pages-attendance.js:19 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0010 | page | الموارد البشرية | صفحة «اليوميات» (workerAttendance) | P1 | renderer/modules/hr/pages-worker-attendance.js:195 | legacy /legacy/ | phase24.js، phase26.js، phase27.js، phase28.js، phase39.js، phase40.js، phase41.js، phase43.js، phase49.js، phase50.js، phase51.js، phase53.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0011 | page | الموارد البشرية | صفحة «الإجازات» (leaves) | P1 | renderer/modules/hr/pages-leaves.js:48 | legacy /legacy/ | phase41.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0012 | page | الموارد البشرية | صفحة «تقييم الأداء» (performance) | P1 | renderer/modules/hr/pages-ops.js:540 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0013 | page | العملاء والمشاريع | صفحة «العملاء» (clients.customers) | P1 | renderer/modules/clients/pages-customers.js:14 | angular /customers | phase2.js، phase5.js، phase7.js، phase15.js، phase19.js، phase46.js، phase48.js، phase55.js، pages-smoke.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0014 | page | العملاء والمشاريع | صفحة «المشاريع» (projects) | P1 | renderer/modules/hr/pages-projects.js:60 | angular /projects | phase2.js، phase3.js، phase4.js، phase15.js، phase17.js، phase18.js، phase19.js، phase22.js، phase56.js، phase57.js، phase58.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0015 | page | العملاء والمشاريع | صفحة «أعمال الحصر» (clients.workSurveys) | P1 | renderer/modules/clients/pages-work-surveys.js:74 | legacy /legacy/ | phase9.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0016 | page | العملاء والمشاريع | صفحة «المقايسات» (clients.boqs) | P1 | renderer/modules/clients/pages-boqs.js:45 | legacy /legacy/ | phase2.js، phase9.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0017 | page | العملاء والمشاريع | صفحة «العقود» (clients.contracts) | P1 | renderer/modules/clients/pages-contracts.js:28 | legacy /legacy/ | phase5.js، phase7.js، phase12.js، phase14.js، phase15.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0018 | page | العملاء والمشاريع | صفحة «المستخلصات» (clients.invoices) | P1 | renderer/modules/clients/pages-invoices.js:42 | legacy /legacy/ | phase9.js، phase12.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0019 | page | العملاء والمشاريع | صفحة «الضمانات» (clients.guarantees) | P1 | renderer/modules/clients/guarantees.js:176 | legacy /legacy/ | phase5.js، phase6.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0020 | page | العملاء والمشاريع | صفحة «المقارنة» (clients.comparison) | P1 | renderer/modules/clients/comparison.js:62 | legacy /legacy/ | phase11.js، phase12.js، phase14.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0021 | page | العملاء والمشاريع | صفحة «CRM» (clients.crm) | P1 | renderer/modules/clients/pages-crm.js:40 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0022 | page | الموردون | صفحة «الموردون» (ledger.suppliers) | P1 | renderer/modules/ledger/pages-suppliers.js:3 | angular /suppliers | phase60.js، phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0023 | page | الموردون | صفحة «الفواتير» (ledger.invoices) | P1 | renderer/modules/ledger/pages-invoices.js:35 | legacy /legacy/ | phase16.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0024 | page | الموردون | صفحة «إشعارات الخصم» (ledger.quarterly) | P1 | renderer/modules/ledger/pages-quarterly.js:39 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0025 | page | الموردون | صفحة «المرتجعات» (ledger.returns) | P1 | renderer/modules/ledger/pages-invoices.js:35 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0026 | page | المخازن | صفحة «المخازن» (warehouses.home) | P1 | renderer/modules/warehouses/pages-home.js:6 | angular /warehouses | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0027 | page | المخازن | صفحة «تقارير المخازن» (warehouses.reports) | P1 | renderer/modules/warehouses/pages-reports.js:2 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0028 | page | حركة الموارد | صفحة «حركة الموارد» (transfers) | P1 | renderer/modules/hr/pages-ops.js:336 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0029 | page | الحسابات | صفحة «المستحقات» (workerDues) | P1 | renderer/modules/hr/pages-worker-dues.js:79 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0030 | page | الحسابات | صفحة «الدفعات» (ledger.payments) | P1 | renderer/modules/ledger/pages-payments.js:33 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0031 | page | الحسابات | صفحة «مصاريف شاملة» (expenses) | P1 | renderer/modules/hr/pages-ops.js:1244 | legacy /legacy/ | phase17.js، phase26.js، phase53.js، phase59.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0032 | page | الحسابات | صفحة «تكاليف شاملة» (costs) | P1 | renderer/modules/hr/pages-costs.js:98 | legacy /legacy/ | phase17.js، phase59.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0033 | page | الحسابات | صفحة «الإيرادات» (clients.collections) | P1 | renderer/modules/clients/pages-collections.js:28 | legacy /legacy/ | phase13.js، phase20.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0034 | page | الحسابات | صفحة «حسابات العملاء» (clients.accounts) | P1 | renderer/modules/clients/pages-accounts.js:73 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0035 | page | التقارير | صفحة «تقارير الموارد البشرية» (reports) | P1 | renderer/modules/hr/pages-reports.js:56 | legacy /legacy/ | phase22.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0036 | page | التقارير | صفحة «تقارير العملاء والمشاريع» (clients.reports) | P1 | renderer/modules/clients/pages-reports.js:4 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0037 | page | التقارير | صفحة «تقارير الموردين» (ledger.reports) | P1 | renderer/modules/ledger/pages-reports.js:25 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0038 | page | التقارير | صفحة «تقارير الحسابات» (accounts.reports) | P1 | renderer/modules/accounts/pages-reports.js:2 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0039 | page | الأرشيف | صفحة «أرشيف الموارد البشرية» (archive) | P1 | renderer/core/pages-archive.js:54 | legacy /legacy/ | phase22.js، phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0040 | page | الأرشيف | صفحة «أرشيف الموردين» (ledger.archive) | P1 | renderer/modules/ledger/pages-archive.js:215 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0041 | page | الأرشيف | صفحة «أرشيف العملاء والمشاريع» (clients.archive) | P1 | renderer/modules/clients/pages-archive.js:36 | legacy /legacy/ | phase8.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0042 | page | الإعدادات | صفحة «الإعدادات العامة» (backup) | P1 | renderer/core/pages-backup.js:5 | legacy /legacy/ | phase10.js، phase29.js، phase32.js، phase34.js، phase35.js، phase36.js، phase38.js، phase45.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0043 | page | الإعدادات | صفحة «المستخدمون» (users) | P1 | renderer/core/pages-users.js:16 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0044 | page | الإعدادات | صفحة «الاقتراحات» (ledger.categories) | P1 | renderer/modules/ledger/pages-categories.js:4 | legacy /legacy/ | phase61.js | verified-static | في القايمة، في مصفوفة الصلاحيات |
| LEG-0045 | page | (خارج القايمة) | صفحة «clients.dashboard» (clients.dashboard) — اسم بديل لـ dashboard | P1 | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase20.js | verified-static | مش في القايمة، في مصفوفة الصلاحيات |
| LEG-0046 | page | (خارج القايمة) | صفحة «fuel» (fuel) — اسم بديل لـ equipment | P1 | renderer/modules/hr/pages-equipment.js:32 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، مش في مصفوفة الصلاحيات |
| LEG-0047 | page | (خارج القايمة) | صفحة «documents» (documents) — اسم بديل لـ archive | P1 | renderer/core/pages-archive.js:54 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، مش في مصفوفة الصلاحيات |
| LEG-0048 | page | (خارج القايمة) | صفحة «assistant» (assistant) — اسم بديل لـ dashboard | P1 | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، مش في مصفوفة الصلاحيات |
| LEG-0049 | page | (خارج القايمة) | صفحة «departments» (departments) | P1 | renderer/core/boards.js:172 | legacy /legacy/ | phase22.js، phase39.js | verified-static | مش في القايمة، في مصفوفة الصلاحيات |
| LEG-0050 | page | (خارج القايمة) | صفحة «payroll» (payroll) — اسم بديل لـ workerDues | P1 | renderer/modules/hr/pages-worker-dues.js:79 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، في مصفوفة الصلاحيات |
| LEG-0051 | page | (خارج القايمة) | صفحة «employeeDetail» (employeeDetail) | P1 | renderer/modules/hr/pages-employee-detail.js:1 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، مش في مصفوفة الصلاحيات |
| LEG-0052 | page | (خارج القايمة) | صفحة «personDetail» (personDetail) | P1 | renderer/modules/hr/pages-person-detail.js:238 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، مش في مصفوفة الصلاحيات |
| LEG-0053 | page | (خارج القايمة) | صفحة «ledger.dashboard» (ledger.dashboard) — اسم بديل لـ dashboard | P1 | renderer/modules/ledger/glue.js:41 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، في مصفوفة الصلاحيات |
| LEG-0054 | page | (خارج القايمة) | صفحة «general.overview» (general.overview) — اسم بديل لـ dashboard | P1 | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase61.js | verified-static | مش في القايمة، في مصفوفة الصلاحيات |
| LEG-0055 | calc | مشترك (core) | دالة حساب compCostProjectNames | P1 | renderer/core/cost-center.js:15 | legacy |  | verified-static |  |
| LEG-0056 | calc | مشترك (core) | دالة حساب compCostCollected | P1 | renderer/core/cost-center.js:26 | legacy |  | verified-static |  |
| LEG-0057 | calc | مشترك (core) | دالة حساب compCostRows | P1 | renderer/core/cost-center.js:32 | legacy |  | verified-static |  |
| LEG-0058 | calc | مشترك (core) | دالة حساب comprehensiveCostsPageHtml | P1 | renderer/core/cost-center.js:41 | legacy |  | verified-static |  |
| LEG-0059 | calc | مشترك (core) | دالة حساب comprehensiveCostsBoardCard | P1 | renderer/core/cost-center.js:78 | legacy |  | verified-static |  |
| LEG-0060 | data-write | مشترك (core) | كتابة بيانات saveData | P0 | renderer/core/data-store.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0061 | modal | مشترك (core) | نافذة openExcelImportModal | P1 | renderer/core/excel-import.js:260 | legacy |  | verified-static |  |
| LEG-0062 | data-write | مشترك (core) | كتابة بيانات approveExpense | P0 | renderer/core/extras.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0063 | calc | مشترك (core) | دالة حساب fcCostDetailHtml | P1 | renderer/core/follow-center.js:202 | legacy |  | verified-static |  |
| LEG-0064 | modal | مشترك (core) | نافذة openModal | P1 | renderer/core/helpers.js:472 | legacy |  | verified-static |  |
| LEG-0065 | modal | مشترك (core) | نافذة openSubModal | P1 | renderer/core/helpers.js:614 | legacy |  | verified-static |  |
| LEG-0066 | modal | مشترك (core) | نافذة openPersonDetailModal | P1 | renderer/core/helpers.js:2956 | legacy |  | verified-static |  |
| LEG-0067 | modal | مشترك (core) | نافذة openPersonAlertsModal | P1 | renderer/core/helpers.js:3259 | legacy |  | verified-static |  |
| LEG-0068 | modal | مشترك (core) | نافذة openAlertsMoreModal | P1 | renderer/core/helpers.js:3310 | legacy |  | verified-static |  |
| LEG-0069 | modal | مشترك (core) | نافذة openAddCategoryModal | P1 | renderer/core/helpers.js:3793 | legacy |  | verified-static |  |
| LEG-0070 | modal | مشترك (core) | نافذة openRenameCategoryModal | P1 | renderer/core/helpers.js:3818 | legacy |  | verified-static |  |
| LEG-0071 | modal | مشترك (core) | نافذة openDeleteCategoryModal | P1 | renderer/core/helpers.js:3857 | legacy |  | verified-static |  |
| LEG-0072 | calc | مشترك (core) | دالة حساب employeeLeaveBalance | P1 | renderer/core/helpers.js:201 | legacy |  | verified-static |  |
| LEG-0073 | calc | مشترك (core) | دالة حساب attendanceDayWage | P1 | renderer/core/helpers.js:260 | legacy |  | verified-static |  |
| LEG-0074 | calc | مشترك (core) | دالة حساب workerDueAmount | P1 | renderer/core/helpers.js:343 | legacy |  | verified-static |  |
| LEG-0075 | calc | مشترك (core) | دالة حساب workerWageSummary | P1 | renderer/core/helpers.js:349 | legacy |  | verified-static |  |
| LEG-0076 | calc | مشترك (core) | دالة حساب extraFieldsSummary | P1 | renderer/core/helpers.js:1055 | legacy |  | verified-static |  |
| LEG-0077 | calc | مشترك (core) | دالة حساب supervisorExpensesTotal | P1 | renderer/core/helpers.js:2095 | legacy |  | verified-static |  |
| LEG-0078 | calc | مشترك (core) | دالة حساب supervisorWageStatement | P1 | renderer/core/helpers.js:2119 | legacy |  | verified-static |  |
| LEG-0079 | calc | مشترك (core) | دالة حساب personUnpaidBonuses | P1 | renderer/core/helpers.js:4134 | legacy |  | verified-static |  |
| LEG-0080 | calc | مشترك (core) | دالة حساب workerPaidTotal | P1 | renderer/core/helpers.js:4156 | legacy |  | verified-static |  |
| LEG-0081 | calc | مشترك (core) | دالة حساب workerPenaltyTotal | P1 | renderer/core/helpers.js:4166 | legacy |  | verified-static |  |
| LEG-0082 | calc | مشترك (core) | دالة حساب supervisorPenaltyTotal | P1 | renderer/core/helpers.js:4175 | legacy |  | verified-static |  |
| LEG-0083 | calc | مشترك (core) | دالة حساب supervisorPaidTotal | P1 | renderer/core/helpers.js:4184 | legacy |  | verified-static |  |
| LEG-0084 | calc | مشترك (core) | دالة حساب workerBalance | P1 | renderer/core/helpers.js:4193 | legacy |  | verified-static |  |
| LEG-0085 | calc | مشترك (core) | دالة حساب employeePenaltyTotal | P1 | renderer/core/helpers.js:4200 | legacy |  | verified-static |  |
| LEG-0086 | calc | مشترك (core) | دالة حساب driverDueAmount | P1 | renderer/core/helpers.js:4989 | legacy |  | verified-static |  |
| LEG-0087 | calc | مشترك (core) | دالة حساب driverPaidTotal | P1 | renderer/core/helpers.js:4993 | legacy |  | verified-static |  |
| LEG-0088 | calc | مشترك (core) | دالة حساب driverPenaltyTotal | P1 | renderer/core/helpers.js:5002 | legacy |  | verified-static |  |
| LEG-0089 | calc | مشترك (core) | دالة حساب employeeDueAmount | P1 | renderer/core/helpers.js:5024 | legacy |  | verified-static |  |
| LEG-0090 | calc | مشترك (core) | دالة حساب employeeBalance | P1 | renderer/core/helpers.js:5056 | legacy |  | verified-static |  |
| LEG-0091 | calc | مشترك (core) | دالة حساب driverBalance | P1 | renderer/core/helpers.js:5071 | legacy |  | verified-static |  |
| LEG-0092 | calc | مشترك (core) | دالة حساب extraCalcChecks | P1 | renderer/core/helpers.js:5081 | legacy |  | verified-static |  |
| LEG-0093 | calc | مشترك (core) | دالة حساب validateCalculations | P1 | renderer/core/helpers.js:5146 | legacy |  | verified-static |  |
| LEG-0094 | calc | مشترك (core) | دالة حساب paginateTotalsAtEnd | P1 | renderer/core/helpers.js:5924 | legacy |  | verified-static |  |
| LEG-0095 | calc | مشترك (core) | دالة حساب statementHeaderHtml | P1 | renderer/core/helpers.js:6420 | legacy |  | verified-static |  |
| LEG-0096 | calc | مشترك (core) | دالة حساب statementFooterHtml | P1 | renderer/core/helpers.js:6442 | legacy |  | verified-static |  |
| LEG-0097 | calc | مشترك (core) | دالة حساب shouldBrandStatement | P1 | renderer/core/helpers.js:6459 | legacy |  | verified-static |  |
| LEG-0098 | calc | مشترك (core) | دالة حساب personExpensesTotal | P1 | renderer/core/helpers.js:6469 | legacy |  | verified-static |  |
| LEG-0099 | calc | مشترك (core) | دالة حساب costKindLabel | P1 | renderer/core/helpers.js:6483 | legacy |  | verified-static |  |
| LEG-0100 | calc | مشترك (core) | دالة حساب costPersonName | P1 | renderer/core/helpers.js:6484 | legacy |  | verified-static |  |
| LEG-0101 | calc | مشترك (core) | دالة حساب costsInRange | P1 | renderer/core/helpers.js:6498 | legacy |  | verified-static |  |
| LEG-0102 | calc | مشترك (core) | دالة حساب personCostsTotal | P1 | renderer/core/helpers.js:6506 | legacy |  | verified-static |  |
| LEG-0103 | calc | مشترك (core) | دالة حساب costsTableHtml | P1 | renderer/core/helpers.js:6510 | legacy |  | verified-static |  |
| LEG-0104 | calc | مشترك (core) | دالة حساب costsStatementBlock | P1 | renderer/core/helpers.js:6520 | legacy |  | verified-static |  |
| LEG-0105 | calc | مشترك (core) | دالة حساب personExtrasTotal | P1 | renderer/core/helpers.js:6525 | legacy |  | verified-static |  |
| LEG-0106 | calc | مشترك (core) | دالة حساب duesPaidBadge | P1 | renderer/core/helpers.js:6547 | legacy |  | verified-static |  |
| LEG-0107 | calc | مشترك (core) | دالة حساب expensesStatementBlock | P1 | renderer/core/helpers.js:6635 | legacy |  | verified-static |  |
| LEG-0108 | calc | مشترك (core) | دالة حساب printEquipmentAccountStatement | P1 | renderer/core/helpers.js:6697 | legacy |  | verified-static |  |
| LEG-0109 | calc | مشترك (core) | دالة حساب paymentsStatementBlock | P1 | renderer/core/helpers.js:6764 | legacy |  | verified-static |  |
| LEG-0110 | calc | مشترك (core) | دالة حساب printWorkerStatement | P1 | renderer/core/helpers.js:7107 | legacy |  | verified-static |  |
| LEG-0111 | calc | مشترك (core) | دالة حساب printDriverStatement | P1 | renderer/core/helpers.js:7157 | legacy |  | verified-static |  |
| LEG-0112 | calc | مشترك (core) | دالة حساب _payTotalCard | P1 | renderer/core/helpers.js:7259 | legacy |  | verified-static |  |
| LEG-0113 | calc | مشترك (core) | دالة حساب printDaysStatement | P1 | renderer/core/helpers.js:7458 | legacy |  | verified-static |  |
| LEG-0114 | calc | مشترك (core) | دالة حساب printEmployeeStatement | P1 | renderer/core/helpers.js:7544 | legacy |  | verified-static |  |
| LEG-0115 | calc | مشترك (core) | دالة حساب equipmentTotalHours | P1 | renderer/core/helpers.js:7801 | legacy |  | verified-static |  |
| LEG-0116 | calc | مشترك (core) | دالة حساب equipmentTotalCost | P1 | renderer/core/helpers.js:7804 | legacy |  | verified-static |  |
| LEG-0117 | calc | مشترك (core) | دالة حساب equipmentTotalFuel | P1 | renderer/core/helpers.js:7808 | legacy |  | verified-static |  |
| LEG-0118 | calc | مشترك (core) | دالة حساب projectCostSummary | P1 | renderer/core/helpers.js:7816 | legacy |  | verified-static |  |
| LEG-0119 | calc | مشترك (core) | دالة حساب projectSupplyCostLines | P1 | renderer/core/helpers.js:7894 | legacy |  | verified-static |  |
| LEG-0120 | export/print | مشترك (core) | تصدير/طباعة downloadXlsx | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0121 | export/print | مشترك (core) | تصدير/طباعة downloadCsv | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0122 | export/print | مشترك (core) | تصدير/طباعة printAttachmentPdf | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0123 | export/print | مشترك (core) | تصدير/طباعة printHtml | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0124 | export/print | مشترك (core) | تصدير/طباعة exportArchiveFolder | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0125 | export/print | مشترك (core) | تصدير/طباعة printPersonFilePdf | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0126 | export/print | مشترك (core) | تصدير/طباعة printArchiveAllPdf | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0127 | export/print | مشترك (core) | تصدير/طباعة printExpenseRecord | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0128 | export/print | مشترك (core) | تصدير/طباعة exportExpenseExcel | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0129 | export/print | مشترك (core) | تصدير/طباعة printEquipmentAccountStatement | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0130 | export/print | مشترك (core) | تصدير/طباعة printWorkerStatement | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0131 | export/print | مشترك (core) | تصدير/طباعة printDriverStatement | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0132 | export/print | مشترك (core) | تصدير/طباعة printDaysStatement | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0133 | export/print | مشترك (core) | تصدير/طباعة printEmployeeStatement | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0134 | export/print | مشترك (core) | تصدير/طباعة printPayslip | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0135 | export/print | مشترك (core) | تصدير/طباعة printLeaveForm | P1 | renderer/core/helpers.js | legacy |  | verified-static |  |
| LEG-0136 | data-write | مشترك (core) | كتابة بيانات addAudit | P0 | renderer/core/helpers.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0137 | data-write | مشترك (core) | كتابة بيانات deleteProjectById | P0 | renderer/core/helpers.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0138 | data-write | مشترك (core) | كتابة بيانات addExtraFieldRow | P0 | renderer/core/helpers.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0139 | data-write | مشترك (core) | كتابة بيانات updateBulkBar | P0 | renderer/core/helpers.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0140 | modal | مشترك (core) | نافذة openScanAttachModal | P1 | renderer/core/modals-common.js:9 | legacy |  | verified-static |  |
| LEG-0141 | calc | مشترك (core) | دالة حساب activateHostMode | P1 | renderer/core/network.js:799 | legacy |  | verified-static |  |
| LEG-0142 | calc | مشترك (core) | دالة حساب activateClientMode | P1 | renderer/core/network.js:820 | legacy |  | verified-static |  |
| LEG-0143 | calc | مشترك (core) | دالة حساب deactivateNetworkMode | P1 | renderer/core/network.js:841 | legacy |  | verified-static |  |
| LEG-0144 | data-write | مشترك (core) | كتابة بيانات saveDataNetwork | P0 | renderer/core/network.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0145 | calc | مشترك (core) | دالة حساب archiveTotalFilesForKind | P1 | renderer/core/pages-archive.js:44 | legacy |  | verified-static |  |
| LEG-0146 | modal | مشترك (core) | نافذة openUserModal | P1 | renderer/core/pages-users.js:190 | legacy |  | verified-static |  |
| LEG-0147 | calc | مشترك (core) | دالة حساب repAlertsSummaryTab | P1 | renderer/core/smart-tools.js:692 | legacy |  | verified-static |  |
| LEG-0148 | calc | مشترك (core) | دالة حساب alertsSummaryExportData | P1 | renderer/core/smart-tools.js:726 | legacy |  | verified-static |  |
| LEG-0149 | modal | العملاء والمشاريع | نافذة openChangeOrderModal | P1 | renderer/modules/clients/change-orders.js:87 | legacy |  | verified-static |  |
| LEG-0150 | calc | العملاء والمشاريع | دالة حساب clRecalcContractValue | P0 | renderer/modules/clients/change-orders.js:12 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0151 | modal | العملاء والمشاريع | نافذة openGuaranteeModal | P1 | renderer/modules/clients/guarantees.js:231 | legacy |  | verified-static |  |
| LEG-0152 | modal | العملاء والمشاريع | نافذة openGuaranteeActionModal | P1 | renderer/modules/clients/guarantees.js:329 | legacy |  | verified-static |  |
| LEG-0153 | calc | العملاء والمشاريع | دالة حساب clGuaranteeTotals | P0 | renderer/modules/clients/guarantees.js:68 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0154 | calc | العملاء والمشاريع | دالة حساب clGuaranteeTotalsHtml | P0 | renderer/modules/clients/guarantees.js:122 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0155 | calc | العملاء والمشاريع | دالة حساب clReconcilePaid | P1 | renderer/modules/clients/helpers.js:590 | legacy |  | verified-static |  |
| LEG-0156 | calc | العملاء والمشاريع | دالة حساب clMigratePaidSource | P1 | renderer/modules/clients/helpers.js:600 | legacy |  | verified-static |  |
| LEG-0157 | modal | العملاء والمشاريع | نافذة openBoqModal | P1 | renderer/modules/clients/pages-boqs.js:200 | legacy |  | verified-static |  |
| LEG-0158 | calc | العملاء والمشاريع | دالة حساب clCalcBoqItem | P1 | renderer/modules/clients/pages-boqs.js:10 | legacy |  | verified-static |  |
| LEG-0159 | calc | العملاء والمشاريع | دالة حساب clBoqTotal | P0 | renderer/modules/clients/pages-boqs.js:17 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0160 | modal | العملاء والمشاريع | نافذة openCollectionModal | P1 | renderer/modules/clients/pages-collections.js:136 | legacy |  | verified-static |  |
| LEG-0161 | modal | العملاء والمشاريع | نافذة openContractModal | P1 | renderer/modules/clients/pages-contracts.js:200 | legacy |  | verified-static |  |
| LEG-0162 | modal | العملاء والمشاريع | نافذة openOppModal | P1 | renderer/modules/clients/pages-crm.js:230 | legacy |  | verified-static |  |
| LEG-0163 | modal | العملاء والمشاريع | نافذة openCommModal | P1 | renderer/modules/clients/pages-crm.js:289 | legacy |  | verified-static |  |
| LEG-0164 | modal | العملاء والمشاريع | نافذة openCustomerModal | P1 | renderer/modules/clients/pages-customers.js:290 | legacy |  | verified-static |  |
| LEG-0165 | modal | العملاء والمشاريع | نافذة openClientInvoiceModal | P1 | renderer/modules/clients/pages-invoices.js:220 | legacy |  | verified-static |  |
| LEG-0166 | modal | العملاء والمشاريع | نافذة openWorkSurveyModal | P1 | renderer/modules/clients/pages-work-surveys.js:324 | legacy |  | verified-static |  |
| LEG-0167 | calc | العملاء والمشاريع | دالة حساب clCalcSurveyItem | P1 | renderer/modules/clients/pages-work-surveys.js:17 | legacy |  | verified-static |  |
| LEG-0168 | calc | العملاء والمشاريع | دالة حساب clSurveyTotal | P0 | renderer/modules/clients/pages-work-surveys.js:41 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0169 | modal | العملاء والمشاريع | نافذة openReasonModal | P1 | renderer/modules/clients/project-path.js:265 | legacy |  | verified-static |  |
| LEG-0170 | modal | العملاء والمشاريع | نافذة openStepModal | P1 | renderer/modules/clients/project-path.js:301 | legacy |  | verified-static |  |
| LEG-0171 | modal | العملاء والمشاريع | نافذة openPathHistoryModal | P1 | renderer/modules/clients/project-path.js:435 | legacy |  | verified-static |  |
| LEG-0172 | modal | الموارد البشرية | نافذة openEmployeeModal | P1 | renderer/modules/hr/modals-employees.js:1 | legacy |  | verified-static |  |
| LEG-0173 | modal | الموارد البشرية | نافذة openAttendanceModal | P1 | renderer/modules/hr/pages-attendance.js:121 | legacy |  | verified-static |  |
| LEG-0174 | modal | الموارد البشرية | نافذة openCostModal | P1 | renderer/modules/hr/pages-costs.js:411 | legacy |  | verified-static |  |
| LEG-0175 | calc | الموارد البشرية | دالة حساب ensureCostItemPool | P0 | renderer/modules/hr/pages-costs.js:12 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0176 | calc | الموارد البشرية | دالة حساب costLines | P0 | renderer/modules/hr/pages-costs.js:21 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0177 | calc | الموارد البشرية | دالة حساب costItemText | P0 | renderer/modules/hr/pages-costs.js:26 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0178 | calc | الموارد البشرية | دالة حساب costItemSuggestions | P0 | renderer/modules/hr/pages-costs.js:31 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0179 | calc | الموارد البشرية | دالة حساب saveCostItemSuggestion | P0 | renderer/modules/hr/pages-costs.js:40 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0180 | calc | الموارد البشرية | دالة حساب removeCostItemSuggestion | P0 | renderer/modules/hr/pages-costs.js:46 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0181 | calc | الموارد البشرية | دالة حساب renameCostItemSuggestion | P0 | renderer/modules/hr/pages-costs.js:51 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0182 | calc | الموارد البشرية | دالة حساب filteredCosts | P0 | renderer/modules/hr/pages-costs.js:65 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0183 | calc | الموارد البشرية | دالة حساب costPersonBalance | P0 | renderer/modules/hr/pages-costs.js:82 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0184 | calc | الموارد البشرية | دالة حساب costItemsUsed | P0 | renderer/modules/hr/pages-costs.js:92 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0185 | calc | الموارد البشرية | دالة حساب costSectionsFor | P0 | renderer/modules/hr/pages-costs.js:403 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0186 | calc | الموارد البشرية | دالة حساب costTabIdForKind | P0 | renderer/modules/hr/pages-costs.js:408 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0187 | data-write | الموارد البشرية | كتابة بيانات saveCostItemSuggestion | P0 | renderer/modules/hr/pages-costs.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0188 | data-write | الموارد البشرية | كتابة بيانات removeCostItemSuggestion | P0 | renderer/modules/hr/pages-costs.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0189 | modal | الموارد البشرية | نافذة openEquipmentModal | P1 | renderer/modules/hr/pages-equipment.js:665 | legacy |  | verified-static |  |
| LEG-0190 | modal | الموارد البشرية | نافذة openEquipmentDailyModal | P1 | renderer/modules/hr/pages-equipment.js:1074 | legacy |  | verified-static |  |
| LEG-0191 | modal | الموارد البشرية | نافذة openEquipLogModal | P1 | renderer/modules/hr/pages-equipment.js:1228 | legacy |  | verified-static |  |
| LEG-0192 | calc | الموارد البشرية | دالة حساب printEquipmentDaysStatement | P1 | renderer/modules/hr/pages-equipment.js:250 | legacy |  | verified-static |  |
| LEG-0193 | calc | الموارد البشرية | دالة حساب printEquipmentDailyStatement | P1 | renderer/modules/hr/pages-equipment.js:1024 | legacy |  | verified-static |  |
| LEG-0194 | export/print | الموارد البشرية | تصدير/طباعة printEquipmentDaysStatement | P1 | renderer/modules/hr/pages-equipment.js | legacy |  | verified-static |  |
| LEG-0195 | export/print | الموارد البشرية | تصدير/طباعة printEquipmentDailyStatement | P1 | renderer/modules/hr/pages-equipment.js | legacy |  | verified-static |  |
| LEG-0196 | modal | الموارد البشرية | نافذة openLeaveModal | P1 | renderer/modules/hr/pages-leaves.js:172 | legacy |  | verified-static |  |
| LEG-0197 | calc | الموارد البشرية | دالة حساب calcLeaveDays | P0 | renderer/modules/hr/pages-leaves.js:32 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0198 | modal | الموارد البشرية | نافذة openExternalDriverModal | P1 | renderer/modules/hr/pages-ops.js:133 | legacy |  | verified-static |  |
| LEG-0199 | modal | الموارد البشرية | نافذة openDriverModal | P1 | renderer/modules/hr/pages-ops.js:189 | legacy |  | verified-static |  |
| LEG-0200 | modal | الموارد البشرية | نافذة openFuelModal | P1 | renderer/modules/hr/pages-ops.js:274 | legacy |  | verified-static |  |
| LEG-0201 | modal | الموارد البشرية | نافذة openTransferModal | P1 | renderer/modules/hr/pages-ops.js:419 | legacy |  | verified-static |  |
| LEG-0202 | modal | الموارد البشرية | نافذة openPerfModal | P1 | renderer/modules/hr/pages-ops.js:610 | legacy |  | verified-static |  |
| LEG-0203 | modal | الموارد البشرية | نافذة openManageDocTypesModal | P1 | renderer/modules/hr/pages-ops.js:675 | legacy |  | verified-static |  |
| LEG-0204 | modal | الموارد البشرية | نافذة openDocModal | P1 | renderer/modules/hr/pages-ops.js:721 | legacy |  | verified-static |  |
| LEG-0205 | modal | الموارد البشرية | نافذة openExpenseDetailModal | P1 | renderer/modules/hr/pages-ops.js:1417 | legacy |  | verified-static |  |
| LEG-0206 | modal | الموارد البشرية | نافذة openExpenseModal | P1 | renderer/modules/hr/pages-ops.js:1464 | legacy |  | verified-static |  |
| LEG-0207 | modal | الموارد البشرية | نافذة openVehicleExpenseModal | P1 | renderer/modules/hr/pages-ops.js:1842 | legacy |  | verified-static |  |
| LEG-0208 | data-write | الموارد البشرية | كتابة بيانات saveExpenseItemSuggestion | P0 | renderer/modules/hr/pages-ops.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0209 | data-write | الموارد البشرية | كتابة بيانات removeExpenseItemSuggestion | P0 | renderer/modules/hr/pages-ops.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0210 | data-write | الموارد البشرية | كتابة بيانات saveVehicleExpenseItem | P0 | renderer/modules/hr/pages-ops.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0211 | calc | الموارد البشرية | دالة حساب printPersonFinanceStatement | P1 | renderer/modules/hr/pages-person-detail.js:126 | legacy |  | verified-static |  |
| LEG-0212 | export/print | الموارد البشرية | تصدير/طباعة printPersonFinanceStatement | P1 | renderer/modules/hr/pages-person-detail.js | legacy |  | verified-static |  |
| LEG-0213 | modal | الموارد البشرية | نافذة openProjectModal | P1 | renderer/modules/hr/pages-projects.js:334 | legacy |  | verified-static |  |
| LEG-0214 | modal | الموارد البشرية | نافذة openPlanModal | P1 | renderer/modules/hr/pages-projects.js:508 | legacy |  | verified-static |  |
| LEG-0215 | calc | الموارد البشرية | دالة حساب repDuesFull | P0 | renderer/modules/hr/pages-reports.js:365 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0216 | export/print | الموارد البشرية | تصدير/طباعة exportCurrentReportCsv | P1 | renderer/modules/hr/pages-reports.js | legacy |  | verified-static |  |
| LEG-0217 | export/print | الموارد البشرية | تصدير/طباعة exportCurrentReportXlsx | P1 | renderer/modules/hr/pages-reports.js | legacy |  | verified-static |  |
| LEG-0218 | export/print | الموارد البشرية | تصدير/طباعة printCurrentReport | P1 | renderer/modules/hr/pages-reports.js | legacy |  | verified-static |  |
| LEG-0219 | modal | الموارد البشرية | نافذة openSupervisorModal | P1 | renderer/modules/hr/pages-supervisors.js:323 | legacy |  | verified-static |  |
| LEG-0220 | calc | الموارد البشرية | دالة حساب supervisorStatementSectionsHtml | P1 | renderer/modules/hr/pages-supervisors.js:99 | legacy |  | verified-static |  |
| LEG-0221 | calc | الموارد البشرية | دالة حساب supervisorStatementCardsHtml | P1 | renderer/modules/hr/pages-supervisors.js:149 | legacy |  | verified-static |  |
| LEG-0222 | modal | الموارد البشرية | نافذة openWattDaySitesModal | P1 | renderer/modules/hr/pages-worker-attendance.js:541 | legacy |  | verified-static |  |
| LEG-0223 | modal | الموارد البشرية | نافذة openWorkerAttModal | P1 | renderer/modules/hr/pages-worker-attendance.js:577 | legacy |  | verified-static |  |
| LEG-0224 | modal | الموارد البشرية | نافذة openUnifiedPayModal | P1 | renderer/modules/hr/pages-worker-dues.js:741 | legacy |  | verified-static |  |
| LEG-0225 | modal | الموارد البشرية | نافذة openPayItemsManageModal | P1 | renderer/modules/hr/pages-worker-dues.js:1454 | legacy |  | verified-static |  |
| LEG-0226 | calc | الموارد البشرية | دالة حساب duesEntityKind | P0 | renderer/modules/hr/pages-worker-dues.js:12 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0227 | calc | الموارد البشرية | دالة حساب duesListForKind | P0 | renderer/modules/hr/pages-worker-dues.js:17 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0228 | modal | الموارد البشرية | نافذة openWorkerModal | P1 | renderer/modules/hr/pages-workers.js:216 | legacy |  | verified-static |  |
| LEG-0229 | calc | الموارد البشرية | دالة حساب projectStatement | P1 | renderer/modules/hr/project-statement.js:48 | legacy |  | verified-static |  |
| LEG-0230 | calc | الموارد البشرية | دالة حساب projectStatementSectionsHtml | P1 | renderer/modules/hr/project-statement.js:177 | legacy |  | verified-static |  |
| LEG-0231 | modal | الموردون | نافذة openGlobalValidationModal | P1 | renderer/modules/ledger/app.js:567 | legacy |  | verified-static |  |
| LEG-0232 | calc | الموردون | دالة حساب refreshOpenStatements | P1 | renderer/modules/ledger/app.js:773 | legacy |  | verified-static |  |
| LEG-0233 | calc | الموردون | دالة حساب normalizeTaxId | P0 | renderer/modules/ledger/excel-import.js:240 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0234 | export/print | الموردون | تصدير/طباعة exportCategoriesExcel | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0235 | export/print | الموردون | تصدير/طباعة exportSuppliersCsv | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0236 | export/print | الموردون | تصدير/طباعة exportAllInvoicesCsv | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0237 | export/print | الموردون | تصدير/طباعة exportAllPaymentsCsv | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0238 | export/print | الموردون | تصدير/طباعة exportSupplierCsv | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0239 | export/print | الموردون | تصدير/طباعة exportVisibleQuarterNoticesPdf | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0240 | export/print | الموردون | تصدير/طباعة exportSupplierDiscountNoticesPdf | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0241 | export/print | الموردون | تصدير/طباعة exportQuarterNoticesPdf | P1 | renderer/modules/ledger/exports.js | legacy |  | verified-static |  |
| LEG-0242 | calc | الموردون | دالة حساب previewInvoiceCalculationFixes | P0 | renderer/modules/ledger/helpers.js:143 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0243 | calc | الموردون | دالة حساب fixInvoiceCalculations | P0 | renderer/modules/ledger/helpers.js:169 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0244 | calc | الموردون | دالة حساب lgExtraFieldsSummary | P0 | renderer/modules/ledger/helpers.js:492 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0245 | calc | الموردون | دالة حساب supplierBalance | P0 | renderer/modules/ledger/helpers.js:576 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0246 | calc | الموردون | دالة حساب invoiceRemaining | P0 | renderer/modules/ledger/helpers.js:590 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0247 | calc | الموردون | دالة حساب getInvoiceDueDate | P0 | renderer/modules/ledger/helpers.js:720 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0248 | calc | الموردون | دالة حساب getOverdueInvoices | P0 | renderer/modules/ledger/helpers.js:734 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0249 | calc | الموردون | دالة حساب recalcLinkedOriginal | P1 | renderer/modules/ledger/helpers.js:1927 | legacy |  | verified-static |  |
| LEG-0250 | calc | الموردون | دالة حساب maybeShowOverdueAlert | P0 | renderer/modules/ledger/helpers.js:2031 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0251 | calc | الموردون | دالة حساب pfSummaryHtml | P0 | renderer/modules/ledger/helpers.js:2265 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0252 | export/print | الموردون | تصدير/طباعة downloadFile | P1 | renderer/modules/ledger/helpers.js | legacy |  | verified-static |  |
| LEG-0253 | export/print | الموردون | تصدير/طباعة exportExcelFile | P1 | renderer/modules/ledger/helpers.js | legacy |  | verified-static |  |
| LEG-0254 | export/print | الموردون | تصدير/طباعة printHtmlContent | P1 | renderer/modules/ledger/helpers.js | legacy |  | verified-static |  |
| LEG-0255 | data-write | الموردون | كتابة بيانات addDaysToIsoDate | P0 | renderer/modules/ledger/helpers.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0256 | data-write | الموردون | كتابة بيانات saveCustomLinkedItem | P0 | renderer/modules/ledger/helpers.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0257 | data-write | الموردون | كتابة بيانات deleteCustomLinkedItem | P0 | renderer/modules/ledger/helpers.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0258 | modal | الموردون | نافذة openAddSupplierModal | P1 | renderer/modules/ledger/modals.js:9 | legacy |  | verified-static |  |
| LEG-0259 | modal | الموردون | نافذة openDeleteSupplierModal | P1 | renderer/modules/ledger/modals.js:136 | legacy |  | verified-static |  |
| LEG-0260 | modal | الموردون | نافذة openPaymentModal | P1 | renderer/modules/ledger/modals.js:192 | legacy |  | verified-static |  |
| LEG-0261 | modal | الموردون | نافذة openAddEditInvoiceModal | P1 | renderer/modules/ledger/modals.js:660 | legacy |  | verified-static |  |
| LEG-0262 | modal | الموردون | نافذة openDiscountNoticeModal | P1 | renderer/modules/ledger/modals.js:1410 | legacy |  | verified-static |  |
| LEG-0263 | modal | الموردون | نافذة openViewInvoiceModal | P1 | renderer/modules/ledger/modals.js:1452 | legacy |  | verified-static |  |
| LEG-0264 | modal | الموردون | نافذة openViewPaymentModal | P1 | renderer/modules/ledger/modals.js:1633 | legacy |  | verified-static |  |
| LEG-0265 | calc | الموردون | دالة حساب printSupplierStatementTab | P1 | renderer/modules/ledger/modals.js:1439 | legacy |  | verified-static |  |
| LEG-0266 | calc | الموردون | دالة حساب printSupplierStatement | P1 | renderer/modules/ledger/modals.js:1446 | legacy |  | verified-static |  |
| LEG-0267 | export/print | الموردون | تصدير/طباعة printSupplierStatementTab | P1 | renderer/modules/ledger/modals.js | legacy |  | verified-static |  |
| LEG-0268 | export/print | الموردون | تصدير/طباعة printSupplierStatement | P1 | renderer/modules/ledger/modals.js | legacy |  | verified-static |  |
| LEG-0269 | data-write | الموردون | كتابة بيانات saveInvoiceData | P0 | renderer/modules/ledger/modals.js | legacy |  | verified-static | سلامة البيانات (P0 مقترح) |
| LEG-0270 | modal | الموردون | نافذة openAddSupplierDocumentModal | P1 | renderer/modules/ledger/pages-archive.js:774 | legacy |  | verified-static |  |
| LEG-0271 | calc | الموردون | دالة حساب archSummary | P0 | renderer/modules/ledger/pages-archive.js:138 | legacy |  | verified-static | حساب مالي/مخزني (أولوية مقترحة P0) |
| LEG-0272 | modal | الموردون | نافذة openLinkedItemModal | P1 | renderer/modules/ledger/pages-categories.js:231 | legacy |  | verified-static |  |
| LEG-0273 | export/print | الموردون | تصدير/طباعة exportPeriodicReportCsv | P1 | renderer/modules/ledger/pages-reports.js | legacy |  | verified-static |  |
| LEG-0274 | calc | الموردون | دالة حساب statementRows | P1 | renderer/modules/ledger/statement.js:3 | legacy |  | verified-static |  |
| LEG-0275 | calc | الموردون | دالة حساب buildAccountStatementHtml | P1 | renderer/modules/ledger/statement.js:61 | legacy |  | verified-static |  |
| LEG-0276 | calc | الموردون | دالة حساب printBankStatement | P1 | renderer/modules/ledger/statement.js:140 | legacy |  | verified-static |  |
| LEG-0277 | export/print | الموردون | تصدير/طباعة printBankStatement | P1 | renderer/modules/ledger/statement.js | legacy |  | verified-static |  |
| LEG-0278 | modal | المخازن | نافذة openWhItemModal | P1 | renderer/modules/warehouses/pages-home.js:203 | legacy |  | verified-static |  |
| LEG-0279 | modal | المخازن | نافذة openWhLocationModal | P1 | renderer/modules/warehouses/pages-home.js:237 | legacy |  | verified-static |  |
| LEG-0280 | modal | المخازن | نافذة openWhMovementModal | P1 | renderer/modules/warehouses/pages-home.js:260 | legacy |  | verified-static |  |
| LEG-0281 | permission | الإعدادات | مصفوفة صلاحيات الصفحات (عرض/إضافة/تعديل/حذف لكل صفحة) | P0 | renderer/core/permissions.js | server (ADR-016) |  | verified-static | السيرفر هو المرجع |
| LEG-0282 | permission | الإعدادات | قالب دور admin | P1 | renderer/core/permissions.js | server |  | verified-static |  |
| LEG-0283 | permission | الإعدادات | قالب دور hr | P1 | renderer/core/permissions.js | server |  | verified-static |  |
| LEG-0284 | permission | الإعدادات | قالب دور viewer | P1 | renderer/core/permissions.js | server |  | verified-static |  |
| LEG-0285 | permission | الإعدادات | قالب دور payroll | P1 | renderer/core/permissions.js | server |  | verified-static |  |
| LEG-0286 | permission | الإعدادات | قالب دور clientsSales | P1 | renderer/core/permissions.js | server |  | verified-static |  |
| LEG-0287 | permission | الإعدادات | قالب دور clientsAccounts | P1 | renderer/core/permissions.js | server |  | verified-static |  |
| LEG-0288 | permission | الإعدادات | قالب دور clientsProjects | P1 | renderer/core/permissions.js | server |  | verified-static |  |
| LEG-0289 | calc | مشترك (core) | دالة حساب attendanceNetPay | P0 | renderer/core/helpers.js:286 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0290 | calc | العملاء والمشاريع | دالة حساب clInvNet | P0 | renderer/modules/clients/pages-invoices.js:6 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0291 | calc | العملاء والمشاريع | دالة حساب clVoApprovedSum | P0 | renderer/modules/clients/change-orders.js:8 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0292 | calc | مشترك (core) | دالة حساب equipmentDailyCost | P0 | renderer/core/helpers.js:7778 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0293 | calc | الموردون | دالة حساب noticeAmountsFor | P0 | renderer/modules/ledger/helpers.js:606 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0294 | calc | الموردون | دالة حساب openingBalanceFor | P0 | renderer/modules/ledger/statement.js:43 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0295 | calc | الموردون | دالة حساب roundMoney | P0 | renderer/modules/ledger/helpers.js:208 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0296 | calc | مشترك (core) | دالة حساب supervisorOwnDue | P0 | renderer/core/helpers.js:2066 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0297 | calc | المخازن | دالة حساب whStockQty | P0 | renderer/modules/warehouses/helpers.js:27 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0298 | calc | المخازن | دالة حساب whStockValue | P0 | renderer/modules/warehouses/helpers.js:48 | legacy | tests-merge/phase59.js، tools/formulas/compare.js | verified-static | حساب مالي بتستخدمه المعادلات المرجعية (اتضافت من legacy-runner) |
| LEG-0299 | electron-capability | ديسكتوب | قدرة ديسكتوب askPin | P1 | preload.js (app:askPin) | يتراجع: صلاحيات السيرفر بدل PIN |  | verified-static | الفئة: auth |
| LEG-0300 | electron-capability | ديسكتوب | قدرة ديسكتوب backupNow | P0 | preload.js (backup:runNow) | POST /api/backups |  | verified-static | الفئة: backup |
| LEG-0301 | electron-capability | ديسكتوب | قدرة ديسكتوب cleanupOrphans | P0 | preload.js (storage:cleanupOrphans) | POST /api/admin/attachments/cleanup (dry-run) |  | verified-static | الفئة: attach |
| LEG-0302 | electron-capability | ديسكتوب | قدرة ديسكتوب clearExtraBackupDir | P1 | preload.js (backup:clearExtraDir) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0303 | electron-capability | ديسكتوب | قدرة ديسكتوب deleteAttachment | P0 | preload.js (attachment:delete) | DELETE /api/attachments/:id |  | verified-static | الفئة: attach |
| LEG-0304 | electron-capability | ديسكتوب | قدرة ديسكتوب exportArchive | P1 | preload.js (archive:export) | POST /api/archive (ZIP stream) |  | verified-static | الفئة: pdf |
| LEG-0305 | electron-capability | ديسكتوب | قدرة ديسكتوب exportExcel | P1 | preload.js (excel:export) | xlsx في المتصفح |  | verified-static | الفئة: browser |
| LEG-0306 | electron-capability | ديسكتوب | قدرة ديسكتوب getAppVersion | P0 | preload.js (app:getVersion) | GET /api/health (version) |  | verified-static | الفئة: data |
| LEG-0307 | electron-capability | ديسكتوب | قدرة ديسكتوب getDataPath | P1 | preload.js (app:dataPath) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0308 | electron-capability | ديسكتوب | قدرة ديسكتوب getDefaultDataPath | P1 | preload.js (app:getDefaultDataPath) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0309 | electron-capability | ديسكتوب | قدرة ديسكتوب getExtraBackupDir | P1 | preload.js (backup:getExtraDir) | لا ينطبق (النسخ على السيرفر) |  | verified-static | الفئة: remove |
| LEG-0310 | electron-capability | ديسكتوب | قدرة ديسكتوب getLockInfo | P1 | preload.js (app:lockInfo) | لا ينطبق (السيرفر هو القفل) |  | verified-static | الفئة: remove |
| LEG-0311 | electron-capability | ديسكتوب | قدرة ديسكتوب hashPassword | P1 | preload.js (auth:hashPassword) | POST /api/users (السيرفر يشفّر) |  | verified-static | الفئة: auth |
| LEG-0312 | electron-capability | ديسكتوب | قدرة ديسكتوب importExcel | P1 | preload.js (excel:import) | xlsx في المتصفح |  | verified-static | الفئة: browser |
| LEG-0313 | electron-capability | ديسكتوب | قدرة ديسكتوب inspectUpdate | P1 | preload.js (app:inspectUpdate) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0314 | electron-capability | ديسكتوب | قدرة ديسكتوب loadData | P0 | preload.js (data:load) | GET /api/bootstrap |  | verified-static | الفئة: data |
| LEG-0315 | electron-capability | ديسكتوب | قدرة ديسكتوب openAttachment | P0 | preload.js (attachment:open) | GET /api/attachments/:id (signed URL) |  | verified-static | الفئة: attach |
| LEG-0316 | electron-capability | ديسكتوب | قدرة ديسكتوب openExternalLink | P1 | preload.js (open-external-url) | window.open |  | verified-static | الفئة: browser |
| LEG-0317 | electron-capability | ديسكتوب | قدرة ديسكتوب openFile | P1 | preload.js (file:open) | <input type=file> |  | verified-static | الفئة: browser |
| LEG-0318 | electron-capability | ديسكتوب | قدرة ديسكتوب openWindowsScanApp | P1 | preload.js (scan:openWindowsScanApp) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0319 | electron-capability | ديسكتوب | قدرة ديسكتوب pickAttachments | P0 | preload.js (attachment:pick) | input file + POST /api/attachments |  | verified-static | الفئة: attach |
| LEG-0320 | electron-capability | ديسكتوب | قدرة ديسكتوب pickDataDir | P1 | preload.js (app:pickDataDir) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0321 | electron-capability | ديسكتوب | قدرة ديسكتوب pickExtraBackupDir | P1 | preload.js (backup:pickExtraDir) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0322 | electron-capability | ديسكتوب | قدرة ديسكتوب pickInstaller | P1 | preload.js (app:pickInstaller) | لا updater في الويب |  | verified-static | الفئة: remove |
| LEG-0323 | electron-capability | ديسكتوب | قدرة ديسكتوب readAttachmentDataUrl | P0 | preload.js (attachment:readDataUrl) | GET /api/attachments/:id |  | verified-static | الفئة: attach |
| LEG-0324 | electron-capability | ديسكتوب | قدرة ديسكتوب resetDataDir | P1 | preload.js (app:resetDataDir) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0325 | electron-capability | ديسكتوب | قدرة ديسكتوب runInstaller | P1 | preload.js (app:runInstaller) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0326 | electron-capability | ديسكتوب | قدرة ديسكتوب safetyBackup (مستخدمة ومش معرّفة في preload) | P0 | renderer/ (من غير تعريف) | POST /api/backups (سبب) |  | verified-static | الفئة: backup |
| LEG-0327 | electron-capability | ديسكتوب | قدرة ديسكتوب saveAttachmentBuffer | P0 | preload.js (attachment:saveBuffer) | POST /api/attachments |  | verified-static | الفئة: attach |
| LEG-0328 | electron-capability | ديسكتوب | قدرة ديسكتوب saveData | P0 | preload.js (data:save) | POST /api/sync (diff) |  | verified-static | الفئة: data |
| LEG-0329 | electron-capability | ديسكتوب | قدرة ديسكتوب saveDataSync | P0 | preload.js (data:saveSync) | fetch keepalive / sendBeacon → /api/sync |  | verified-static | الفئة: data |
| LEG-0330 | electron-capability | ديسكتوب | قدرة ديسكتوب saveFile | P1 | preload.js (file:save) | Blob + download |  | verified-static | الفئة: browser |
| LEG-0331 | electron-capability | ديسكتوب | قدرة ديسكتوب savePdf | P1 | preload.js (pdf:save) | POST /api/pdf |  | verified-static | الفئة: pdf |
| LEG-0332 | electron-capability | ديسكتوب | قدرة ديسكتوب savePdfHtml | P1 | preload.js (pdf:saveHtml) | POST /api/pdf |  | verified-static | الفئة: pdf |
| LEG-0333 | electron-capability | ديسكتوب | قدرة ديسكتوب scanAttachment (مستخدمة ومش معرّفة في preload) | P0 | renderer/ (من غير تعريف) | كاميرا / رفع PDF |  | verified-static | الفئة: attach |
| LEG-0334 | electron-capability | ديسكتوب | قدرة ديسكتوب scanWindows | P0 | preload.js (scan:windows) | كاميرا / رفع PDF |  | verified-static | الفئة: attach |
| LEG-0335 | electron-capability | ديسكتوب | قدرة ديسكتوب serverStart | P1 | preload.js (server:start) | وضع الشبكة القديم يتلغى |  | verified-static | الفئة: remove |
| LEG-0336 | electron-capability | ديسكتوب | قدرة ديسكتوب serverStatus | P1 | preload.js (server:status) | يتلغى |  | verified-static | الفئة: remove |
| LEG-0337 | electron-capability | ديسكتوب | قدرة ديسكتوب serverStop | P1 | preload.js (server:stop) | يتلغى |  | verified-static | الفئة: remove |
| LEG-0338 | electron-capability | ديسكتوب | قدرة ديسكتوب setDataDir | P1 | preload.js (app:setDataDir) | لا ينطبق |  | verified-static | الفئة: remove |
| LEG-0339 | electron-capability | ديسكتوب | قدرة ديسكتوب snapshotData | P0 | preload.js (data:snapshot) | POST /api/backups (أدمن) |  | verified-static | الفئة: backup |
| LEG-0340 | electron-capability | ديسكتوب | قدرة ديسكتوب verifyPassword | P1 | preload.js (auth:verifyPassword) | POST /api/auth/login |  | verified-static | الفئة: auth |
| LEG-0341 | data-write | العملاء والمشاريع | كتابة بيانات clSaveCustomers | P0 | renderer/modules/clients/helpers.js:327 | legacy |  | verified-static | سلامة البيانات (P0) — الموديول التجريبي (المرحلة 6) |
| LEG-0342 | data-write | العملاء والمشاريع | كتابة بيانات clUpsertCustomer | P0 | renderer/modules/clients/helpers.js:333 | legacy |  | verified-static | سلامة البيانات (P0) — الموديول التجريبي (المرحلة 6) |
| LEG-0343 | data-write | العملاء والمشاريع | كتابة بيانات clDeleteCustomer | P0 | renderer/modules/clients/helpers.js:352 | legacy |  | verified-static | سلامة البيانات (P0) — الموديول التجريبي (المرحلة 6) |
| LEG-0344 | data-write | العملاء والمشاريع | كتابة بيانات clNextCustomerCode | P0 | renderer/modules/clients/helpers.js:24 | legacy |  | verified-static | سلامة البيانات (P0) — الموديول التجريبي (المرحلة 6) — ترقيم |
| LEG-0345 | data-write | المخازن | كتابة بيانات whUpsertItem | P0 | renderer/modules/warehouses/helpers.js:56 | legacy |  | verified-static | سلامة البيانات (P0) — المخازن (المرحلة 7، الحزمة 7.1) |
| LEG-0346 | data-write | المخازن | كتابة بيانات whDeleteItem | P0 | renderer/modules/warehouses/helpers.js:63 | legacy |  | verified-static | سلامة البيانات (P0) — المخازن (المرحلة 7، الحزمة 7.1) |
| LEG-0347 | data-write | المخازن | كتابة بيانات whUpsertLocation | P0 | renderer/modules/warehouses/helpers.js:67 | legacy |  | verified-static | سلامة البيانات (P0) — المخازن (المرحلة 7، الحزمة 7.1) |
| LEG-0348 | data-write | المخازن | كتابة بيانات whAddMovement | P0 | renderer/modules/warehouses/helpers.js:74 | legacy |  | verified-static | سلامة البيانات (P0) — المخازن (المرحلة 7، الحزمة 7.1) — الحركة ومعها تحديث التكلفة |
| LEG-0349 | data-write | المخازن | كتابة بيانات whNextItemCode | P0 | renderer/modules/warehouses/helpers.js:18 | legacy |  | verified-static | سلامة البيانات (P0) — المخازن (المرحلة 7، الحزمة 7.1) — ترقيم |
| LEG-0350 | data-write | المخازن | كتابة بيانات whNextMovementId | P0 | renderer/modules/warehouses/helpers.js:19 | legacy |  | verified-static | سلامة البيانات (P0) — المخازن (المرحلة 7، الحزمة 7.1) — ترقيم |
| LEG-0351 | data-write | الموردون | كتابة بيانات applyReturnLinkEffects | P0 | renderer/modules/ledger/modals.js:1324 | legacy |  | verified-static | سلامة البيانات (P0) — فواتير الموردين (المرحلة 7، الحزمة 7.2) — أثر المرتجع على الفاتورة الأصلية (الإلغاء وpostReturnWht) |

## التغييرات المعتمدة (CHG)
| ID | النوع | الموديول | الوصف | الأولوية (مقترحة) | الدليل | المكان المستهدف | الاختبارات | الحالة | ملاحظات |
|---|---|---|---|---|---|---|---|---|---|
| CHG-0001 | business-rule | قواعد مالية | المبالغ: NUMERIC بأربع خانات، والحساب على الخادم، وممنوع JS `Number` (ADR-011، ADR-023) | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-03، F-14 · الأسماء القديمة: TR-01، F-03، F-14 |
| CHG-0002 | business-rule | قواعد مالية | إلغاء الفاتورة: قرار صريح (`cancelledByUser`)، والأثر المالي = صفر، والسجل محفوظ ويظهر في الكشف «ملغاة» بقيمة صفر. ممنوع الحذف (ADR-024) | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-01، F-02 · الأسماء القديمة: TR-02، F-01، F-02 |
| CHG-0003 | business-rule | قواعد مالية | المرتجع: حركة مستقلة لازم تكون مربوطة بفاتورتها الأصلية (`linkedInvoiceId`). المرتجع الكامل مش إلغاء: الفاتورة بتفضل قائمة والمرتجع بيعادلها (تفسير B-75 محتاج  | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-01، F-02، F-05 · الأسماء القديمة: TR-03، F-01، F-02، F-05 |
| CHG-0004 | business-rule | قواعد مالية | الرصيد = الكشف: رصيد المورد وكشف حسابه بيتبنوا من نفس الحركات، فختامي الكشف = الرصيد دايمًا | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-01، F-02 · الأسماء القديمة: TR-04، F-01، F-02 |
| CHG-0005 | business-rule | قواعد مالية | اتجاه الدفعة: `pay` = الشركة سددت للمورد (بيقلّل اللي علينا). `collect` = الشركة حصّلت من المورد (بيزوّد اللي علينا أو بيقلّل اللي لينا). الدفعة من غير اتجاه = غير  | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-06 · الأسماء القديمة: TR-05، F-06 |
| CHG-0006 | business-rule | قواعد مالية | تخصيص الدفعات: `allocations[{invoiceId, amount}]`: الدفعة ممكن تتخصّص جزئيًا أو تتوزع على كذا فاتورة. متبقي الفاتورة = الصافي − مرتجعاتها المرتبطة − المخصّص ليها (تف | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-04 · الأسماء القديمة: TR-06، F-04 |
| CHG-0007 | business-rule | قواعد مالية | أجر الحضور: معامل صريح لكل حالة من إعداد معتمد. الحالات القياسية (B-76): حاضر 1، ونصف يوم ½، ومتأخر 1 ناقص الخصم المسجّل، وغائب وعطلة 0. أي حالة تانية (إجازة سنوي | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-07 · الأسماء القديمة: TR-07، F-07 |
| CHG-0008 | business-rule | قواعد مالية | التكرار والسجلات اليتيمة: مكرر = نفس الشخص + نفس اليوم + نفس المشروع. ونفس الشخص في نفس اليوم على مشروع تاني = يومية مشروعة. المكرر واليومية لشخص مش موجود بيتعزلوا للمراجعة (ما | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-08 · الأسماء القديمة: TR-08، F-08 |
| CHG-0009 | business-rule | قواعد مالية | الراتب الجزئي: بالتناسب مع أيام الاستحقاق، بطريقة سياسة الرواتب (B-74). من غير سياسة الحساب بيرفض (`POLICY_REQUIRED`) | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-09 · الأسماء القديمة: TR-09، F-09 |
| CHG-0010 | business-rule | قواعد مالية | تكلفة المشروع: المصروفات الفعلية (كل سطورها) + الفواتير بـ الصافي بعد الخصم، والمرتجع بالسالب، والملغاة صفر، والصرف المخزني بتكلفته المثبّتة. معاملة ضريبة القيمة الم | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-10، F-11 · الأسماء القديمة: TR-10، F-10، F-11 |
| CHG-0011 | business-rule | قواعد مالية | المستخلصات: تراكمي: الإجمالي التراكمي = الأعمال السابقة + الحالية (+ الإضافات − المستبعد). الصافي التراكمي = التراكمي − المحتجز − الاستقطاعات. مستحق الفترة = الصا | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-12 · الأسماء القديمة: TR-11، F-12 |
| CHG-0012 | business-rule | قواعد مالية | التقريب: HALF_UP للموجب والسالب: 2.00005 ← 2.0001، و−2.00005 ← −2.0001 | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-03، F-14 · الأسماء القديمة: TR-12، F-03، F-14 |
| CHG-0013 | business-rule | قواعد مالية | تكلفة المخزون: متوسط متحرك. تكلفة الصرف بتتثبّت على الحركة وقت الصرف ومابتتعادش. الحركات القديمة اللي مالهاش تكلفة: اقتراح بالمتوسط وقتها للمراجعة | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-15 · الأسماء القديمة: TR-13، F-15 |
| CHG-0014 | business-rule | قواعد مالية | الإجازات: الرصيد من سجلات الموظف المعتمدة (`employeeId`، أو `personId` لنوع موظف). السنين القديمة محفوظة، ومفيش مسح | P0 | docs/TARGET_BUSINESS_RULES.md | server (ADR-025) | tests-merge/phase62.js، tools/formulas/target.js | recorded | بيعالج F-13 · الأسماء القديمة: TR-14، F-13 |

## المتطلبات الفنية (TECH)
| ID | النوع | الموديول | الوصف | الأولوية (مقترحة) | الدليل | المكان المستهدف | الاختبارات | الحالة | ملاحظات |
|---|---|---|---|---|---|---|---|---|---|
| TECH-0001 | security/ops | أمان وتشغيل | XSS | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-1 |
| TECH-0002 | security/ops | أمان وتشغيل | CSP وترويسات الأمان | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-2 |
| TECH-0003 | security/ops | أمان وتشغيل | Nginx + HTTPS داخلي | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-3 |
| TECH-0004 | security/ops | أمان وتشغيل | مراجعة Authentication/RBAC/Data Scope | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-4 |
| TECH-0005 | security/ops | أمان وتشغيل | تأمين رفع الملفات (الهيكل الأمني فقط؛ الموديول كاملًا في المرحلة 5) | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-5 |
| TECH-0006 | security/ops | أمان وتشغيل | سجل التدقيق | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-6 |
| TECH-0007 | security/ops | أمان وتشغيل | Backup & Restore | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-7 |
| TECH-0008 | security/ops | أمان وتشغيل | تحديث `xlsx` + 2FA للإدارة | P0 | docs/SECURITY_AND_BACKUP_PLAN.md | server/infra |  | recorded | الأسماء القديمة: S-8 |
| TECH-0009 | platform | المنصة | الحساب العشري: NUMERIC بأربع خانات وHALF_UP على الخادم (Money) | P0 | server/src/common/money.ts | server/infra |  | recorded | ADR-011، ADR-023 |
| TECH-0010 | platform | المنصة | ترقيم NO_GAPS داخل معاملة الخادم، والرقم المُصدر مابيتعادش حتى مع الإلغاء | P0 | server/src/numbering/ | server/infra |  | recorded | ADR-013، 01 §3.4 |
| TECH-0011 | platform | المنصة | Approved ≠ Posted، والمرحّل مابيتعدّلش (التصحيح بمستند عكسي) | P0 | server/src/approvals/ | server/infra |  | recorded | ADR-012، Policy D |
| TECH-0012 | platform | المنصة | Idempotency-Key للعمليات الحساسة | P0 | server/src/common/ | server/infra |  | recorded | 03 §21.3 |
| TECH-0013 | platform | المنصة | سجل تدقيق إلحاقي محمي على مستوى القاعدة + القيمة السابقة | P0 | server/src/audit/ | server/infra |  | recorded | ADR-018 |
| TECH-0014 | platform | المنصة | نسخ واستعادة: RPO 15 دقيقة، RTO 4 ساعات، نسخة مشفّرة خارجية، اختبار شهري | P0 | docker/backup/ | server/infra |  | recorded | Policy E، ADR-020 |
| TECH-0015 | platform | المنصة | الخادم المرجع الوحيد للصلاحيات (صفحة + فعل + نطاق مشروع) | P0 | server/src/authz/ | server/infra |  | recorded | ADR-016 |
| TECH-0016 | platform | المنصة | المرفقات جوه PostgreSQL مع الفحص والإصدارات (والبديل المعتمد: نظام الملفات + بيانات وصفية) | P0 | server/src/files/ | server/infra |  | recorded | ADR-007، ADR-014، 01 §4 |
| TECH-0017 | platform | المنصة | تشغيل آلي للبناء والاختبارات (CI) | P0 | — (مش موجود) | server/infra |  | recorded | 02 Phase 4 |
| TECH-0018 | platform | المنصة | مقارنة بصرية آلية مع خط الأساس | P0 | docs/discovery/visual-baseline/ | server/infra |  | recorded | 04 §4.3 |

## القدرات الجديدة (NEW)
| ID | النوع | الموديول | الوصف | الأولوية (مقترحة) | الدليل | المكان المستهدف | الاختبارات | الحالة | ملاحظات |
|---|---|---|---|---|---|---|---|---|---|
| NEW-0001 | capability | نطاق جديد | محرك اعتمادات متعدد المستويات (B-01…B-08) | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | منفّذ ومختبر (بيانات اختبار)، مش متفعّل |
| NEW-0002 | capability | نطاق جديد | محرك الضرايب والاستقطاعات والدمغات (B-21) | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | منفّذ، **من غير نسب** (Policy C) |
| NEW-0003 | capability | نطاق جديد | محرك القواعد المالية (B-20): معادلات بإصدارات واختبارات إلزامية | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | منفّذ، مسودات بس |
| NEW-0004 | capability | نطاق جديد | إشعارات مخزّنة | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | منفّذ |
| NEW-0005 | capability | نطاق جديد | المشتريات (طلب ← عرض ← أمر شراء ← استلام) | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | مش متنفّذ (B-36…B-38) |
| NEW-0006 | capability | نطاق جديد | السلامة والمخاطر | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | مش متنفّذ (B-39) |
| NEW-0007 | capability | نطاق جديد | الجودة والاستلام | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | مش متنفّذ (B-40، B-41) |
| NEW-0008 | capability | نطاق جديد | المحاسبة بالقيد المزدوج (دليل حسابات، قيود، أستاذ، ميزان، إقفال) | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | المرحلة 10 |
| NEW-0009 | capability | نطاق جديد | تطبيق ويب قابل للتثبيت (PWA) | P1 | docs/plan-v1.4.5/01_MASTER_PLAN.md §2 | — |  | recorded | الأساس منفّذ |

## القرارات (DEC)
| ID | النوع | الموديول | الوصف | الأولوية (مقترحة) | الدليل | المكان المستهدف | الاختبارات | الحالة | ملاحظات |
|---|---|---|---|---|---|---|---|---|---|
| DEC-0001 | decision | قرارات | ما أنواع المستندات الخاضعة للاعتماد؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-01 |
| DEC-0002 | decision | قرارات | ما حدود القيمة (من/إلى) لكل نوع مستند؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-02 |
| DEC-0003 | decision | قرارات | كم مستوى لكل نطاق قيمة، ومن يعتمد في كل مستوى (أدوار أم أشخاص)، وهل المستوى يتطلب الجميع أم أيًّا منهم؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-03 |
| DEC-0004 | decision | قرارات | هل يُسمح استثناءً لمقدّم الطلب باعتماد مستنده؟ وهل يجوز لنفس الشخص الاعتماد في مستويين؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-04 |
| DEC-0005 | decision | قرارات | من يُرحِّل المستند بعد اعتماده؟ وهل المعتمِد يجوز أن يُرحِّل؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-05 |
| DEC-0006 | decision | قرارات | هل الإلغاء والعكس بعد الترحيل يحتاجان اعتمادًا؟ وبأي مسار؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-06 |
| DEC-0007 | decision | قرارات | ما الحقول «الجوهرية» في كل مستند (التي يُمنع تعديلها أثناء الاعتماد ويستلزم تغييرها إعادة التقييم)؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-07 |
| DEC-0008 | decision | قرارات | كيف تُعامَل المستندات القائمة عند تفعيل الاعتماد (648 فاتورة و244 دفعة حاليًا)؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-08 |
| DEC-0009 | decision | قرارات | هل توجد مستندات معفاة من الاعتماد؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-09 |
| DEC-0010 | decision | قرارات | من يحق له إنشاء تفويض مؤقت؟ ولأي مدة قصوى؟ وهل يُقيَّد بنوع مستند أو حد قيمة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-10 |
| DEC-0011 | decision | قرارات | ماذا يحدث لطلب معتمِده الوحيد غائب أو أُوقف حسابه؟ ومدد التصعيد؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-11 |
| DEC-0012 | decision | قرارات | من يملك صلاحية الاستثناءات (تجاوز رصيد، إعادة فتح فترة، تعديل مستند معتمد)؟ وكيف تُوثَّق؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-12 |
| DEC-0013 | decision | قرارات | ما دليل الحسابات المعتمد (البنية، الأرقام، المستويات، حسابات المراقبة)؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-13 |
| DEC-0014 | decision | قرارات | متى تبدأ السنة المالية؟ وما طول الفترة (شهر/ربع)؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-14 |
| DEC-0015 | decision | قرارات | ما قوالب الترحيل: أي حسابات تتأثر بكل مكوّن من فاتورة المورد والمرتجع والمستخلص والدفعة والتحصيل والمصروف ومستحقات العمالة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-15 |
| DEC-0016 | decision | قرارات | ما تاريخ بدء العمل بالمحاسبة (Cut-over)؟ وهل يُعاد ترحيل المستندات التاريخية أم يُكتفى بقيد افتتاحي؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-16 |
| DEC-0017 | decision | قرارات | من أين يأتي الميزان الافتتاحي المعتمد؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-17 |
| DEC-0018 | decision | قرارات | سياسة إقفال الفترات وإعادة فتحها، وإقفال السنة | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-18 |
| DEC-0019 | decision | قرارات | تاريخ القيد العكسي: تاريخ الأصل أم تاريخ العكس؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-19 |
| DEC-0020 | decision | قرارات | هل المعادلات الحالية في البرنامج هي السياسة المعتمدة؟ (إجمالي وصافي الفاتورة، صافي المستخلص، رصيد المورد، مستحقات العمالة — موثّقة في `TARGET_ARCHITECTURE.md` م | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-20 |
| DEC-0021 | decision | قرارات | ما أنواع الضرائب والاستقطاعات والدمغات المطبّقة ونسبها وتواريخ سريانها؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-21 |
| DEC-0022 | decision | قرارات | هل يحسب النظام الضريبة والاستقطاع من النسبة، أم تبقى مبالغ مُدخلة مع تحقق؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-22 |
| DEC-0023 | decision | قرارات | المعالجة المحاسبية للمخصوم من المنبع ونسبة الضمان والدفعة المقدمة | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-23 |
| DEC-0024 | decision | قرارات | متطلبات التقارير الضريبية الدورية وشكلها | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-24 |
| DEC-0025 | decision | قرارات | كم خانة عشرية للمبالغ؟ وما طريقة التقريب؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-25 |
| DEC-0026 | decision | قرارات | كم خانة عشرية للكميات والأسعار؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-26 |
| DEC-0027 | decision | قرارات | هل تتعامل الشركة بعملات غير الجنيه؟ (العملة الآن مكتوبة ثابتة في الكود) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-27 |
| DEC-0028 | decision | قرارات | هل فروق التقريب عند ترحيل البيانات القديمة مقبولة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-28 |
| DEC-0029 | decision | قرارات | نطاق تسلسل كل نوع مستند (عام/سنوي/لكل مشروع) وشكل الرقم | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-29 |
| DEC-0030 | decision | قرارات | هل يُشترط تسلسل بلا فجوات؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-30 |
| DEC-0031 | decision | قرارات | هل رقم فاتورة المورد يجب أن يكون فريدًا لكل مورد؟ (يوجد الآن 11 رقمًا مكررًا لدى نفس المورد) — وهل هذه الحالات تكرار فعلي؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-31 |
| DEC-0032 | decision | قرارات | هيكل مراكز التكلفة؟ وهل المشروع نفسه مركز تكلفة أم بُعد مستقل؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-32 |
| DEC-0033 | decision | قرارات | سياسة تحميل التكاليف غير المباشرة والمعدات المشتركة على المشروعات | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-33 |
| DEC-0034 | decision | قرارات | ربط اليوميات والتكاليف بالمشروع بالاسم | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-34 |
| DEC-0035 | decision | قرارات | نطاقات البيانات المطلوبة: «مشاريع إدارته» و«ما أنشأه فقط» — ما تعريف «الإدارة» ومن ينتمي لها؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-35 |
| DEC-0036 | decision | قرارات | دورة الشراء المعتمدة ومستنداتها وحقولها (طلب، عروض أسعار؟، أمر، استلام، مطابقة مع الفاتورة؟) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-36 |
| DEC-0037 | decision | قرارات | قواعد المطابقة بين أمر الشراء والاستلام والفاتورة ونسب السماح | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-37 |
| DEC-0038 | decision | قرارات | من يطلب ومن يعتمد الشراء (يرتبط بـ B-01…B-03) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-38 |
| DEC-0039 | decision | قرارات | ما المطلوب تسجيله (حوادث، تصاريح عمل، تفتيش، سجل مخاطر، تدريب…)؟ والنماذج المعتمدة والتقارير | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-39 |
| DEC-0040 | decision | قرارات | ما المطلوب (طلبات فحص، عدم مطابقة، محاضر استلام ابتدائي/نهائي، ملاحظات…)؟ والنماذج ودورة الاعتماد | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-40 |
| DEC-0041 | decision | قرارات | علاقة الاستلام بالمستخلصات والضمانات (هل يشترط أحدها الآخر؟) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-41 |
| DEC-0042 | decision | قرارات | كيف تُحمَّل تكلفة المعدة على المشروع (يومي/بالساعة/فعلي)؟ وهل المعادلة الحالية معتمدة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-42 |
| DEC-0043 | decision | قرارات | هل تُعامَل المعدات كأصول ثابتة بإهلاك في المحاسبة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-43 |
| DEC-0044 | decision | قرارات | هل تحتاج مصروفات الصيانة والوقود اعتمادًا؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-44 |
| DEC-0045 | decision | قرارات | دورة صرف المستحقات: من يراجع ومن يعتمد ومن يصرف؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-45 |
| DEC-0046 | decision | قرارات | هل معادلة المستحق الحالية (أجر اليوم × الأيام − الخصم) وقواعد نصف اليوم والتأخير معتمدة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-46 |
| DEC-0047 | decision | قرارات | هل يجوز صرف ما يتجاوز المستحق (سلفة)؟ وبأي إجراء؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-47 |
| DEC-0048 | decision | قرارات | من يحق له رؤية الرواتب والأجور؟ (يحدد صلاحيات الحقول الحساسة، بما فيها الحقول المخصصة) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-48 |
| DEC-0049 | decision | قرارات | طريقة تقييم المخزون (متوسط/وارد أولًا…)؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-49 |
| DEC-0050 | decision | قرارات | هل يُسمح برصيد سالب في أي حالة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-50 |
| DEC-0051 | decision | قرارات | هل حركات المخزون تحتاج اعتمادًا؟ وهل تولّد قيودًا محاسبية؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-51 |
| DEC-0052 | decision | قرارات | قائمة الخزائن والحسابات البنكية | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-52 |
| DEC-0053 | decision | قرارات | تصنيف الـ 165 دفعة من غير اتجاه | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-53 |
| DEC-0054 | decision | قرارات | مواصفات الخادم المتاح ونظام تشغيله | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-54 |
| DEC-0055 | decision | قرارات | عدد المستخدمين الآن وبعد سنة، والمتزامنون منهم | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-55 |
| DEC-0056 | decision | قرارات | هل الهواتف والأجهزة اللوحية ستُستخدم على شبكة الشركة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-56 |
| DEC-0057 | decision | قرارات | طريقة شهادة HTTPS الداخلية | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-57 |
| DEC-0058 | decision | قرارات | هل أجهزة المواقع خارج المقر تحتاج وصولًا لاحقًا (VPN)؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-58 |
| DEC-0059 | decision | قرارات | الحد الأقصى لحجم الملف وأنواع الملفات المسموحة | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-59 |
| DEC-0060 | decision | قرارات | الحجم المتوقع للمرفقات سنويًا | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-60 |
| DEC-0061 | decision | قرارات | أين ملفات المرفقات الحالية (111 مرجعًا في البيانات)؟ وهل ستُرفع؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-61 |
| DEC-0062 | decision | قرارات | مدة الاحتفاظ بالمستندات وهل يُسمح بحذفها | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-62 |
| DEC-0063 | decision | قرارات | RPO: أقصى فقد بيانات مقبول | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-63 |
| DEC-0064 | decision | قرارات | RTO: أقصى مدة توقف مقبولة | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-64 |
| DEC-0065 | decision | قرارات | مدة الاحتفاظ بالنسخ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-65 |
| DEC-0066 | decision | قرارات | مكان النسخة المنفصلة | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-66 |
| DEC-0067 | decision | قرارات | من يحتفظ بمفاتيح تشفير النسخ؟ ومن المسؤول عن اختبار الاستعادة؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-67 |
| DEC-0068 | decision | قرارات | مدة الاحتفاظ بسجل التدقيق ومن يطّلع عليه | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-68 |
| DEC-0069 | decision | قرارات | الفجوات التاريخية في الترقيم | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-69 |
| DEC-0070 | decision | قرارات | تأكيد تفسير HALF_UP للأرقام السالبة: التفسير المعياري (وسلوك PostgreSQL المُتحقَّق منه) = الحالة النصفية بعيدًا عن الصفر (−2.00005 ← −2.0001) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-70 |
| DEC-0071 | decision | قرارات | معنى «الفاتورة الملغاة» في رصيد المورد وكشف حسابه: النظام بيلغي الفاتورة تلقائيًا لما المرتجعات تغطيها. الرصيد بيحسبها هي ومرتجعها (فالمحصلة صفر)، لكن الكشف بيخ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-71 |
| DEC-0072 | decision | قرارات | تخصيص الدفعات على الفواتير: 242 من 244 دفعة مش مربوطة بفاتورة، فمتبقي الفاتورة والمتأخرات مش معبّرين. هل التخصيص هيبقى إلزامي، ولا تلقائي بالأقدم أولًا (FIFO)،  | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-72 |
| DEC-0073 | decision | قرارات | سياسة أجر حالات الحضور غير القياسية (إجازة سنوية، مرضية، رسمية…): هل الأجر كامل، أو جزئي، أو مفيش؟ القرار 6 قال «ممنوع الافتراض»، والقاعدة قابلة للتهيئة (TR-07) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-73 |
| DEC-0074 | decision | قرارات | سياسة الرواتب: طريقة حساب الراتب الجزئي (أيام تقويمية / 30 يوم / أيام عمل)، واستحقاق شهر التعيين والاستقالة (TR-09) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-74 |
| DEC-0075 | decision | قرارات | تأكيد تفسير الإلغاء التلقائي والمتبقي | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-75 |
| DEC-0076 | decision | قرارات | قواعد الحضور القياسية: الإبقاء على قواعد النظام الحالي لحاضر (يوم) ونصف يوم (½) ومتأخر (يوم ناقص الخصم المسجّل) وغائب وعطلة (صفر)، كما في TR-07؟ (يكمّل B-46) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-76 |
| DEC-0077 | decision | قرارات | أي أصناف بتتقيّم بالتحديد العيني (تتبّع فردي أو بالدفعة) بدل المتوسط المتحرك؟ | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح · الأسماء القديمة: B-77 |
| DEC-0078 | decision | قرارات | مرفقات PDF المشفّرة: 108/108 مرفق حقيقي PDF بتشفير قياسي، والفاحص بيرفضهم (`PDF_ENCRYPTED`). (أ) قبول التشفير اللي بيقيّد الصلاحيات بس (كلمة سر فتح فاضية) بعد ف | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-78 |
| DEC-0079 | decision | قرارات | RPO للنسخة الخارجية: لو السيرفر وجهاز النسخ ضاعوا مع بعض، أسوأ حالة حوالي 30 دقيقة (مقابل 15 في Policy E). نقبلها كحالة استثنائية، ولا ننقل WAL للخارج كل 5 دقاي | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم · الأسماء القديمة: B-79 |
| DEC-0080 | decision | حوكمة | خطة v1.4.5 بتلغي الخطة القديمة v1.0 وبتحل محلها | — | docs/reports/v1.4.5/PHASE_00_BASELINE_REPORT.md | — |  | resolved | محسوم 2026-11-19 · الأسماء القديمة: U-1 |
| DEC-0081 | decision | حوكمة | تعارض أهداف النسخ: Policy E في الخطة الرئيسية §4.1 هي اللي تمشي | — | docs/reports/v1.4.5/PHASE_00_BASELINE_REPORT.md | — |  | resolved | محسوم 2026-11-19 · الأسماء القديمة: U-2 |
| DEC-0082 | decision | حوكمة | العدّ من مراحل v1.4.5، والشغل القديم يتراجع ويتأكد منه | — | docs/reports/v1.4.5/PHASE_00_BASELINE_REPORT.md | — |  | resolved | محسوم 2026-11-19 · الأسماء القديمة: U-3 |
| DEC-0083 | decision | قرارات | ترقيم القرارات الجديدة بـ `DEC-` مباشرة بدل B-xx | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0084 | decision | قرارات | الماسح الضوئي (WIA) في الويب: المستخدم بيصوّر بتطبيق الماسح على جهازه وبيرفع الملف. أداة على الجهاز بس لو ده طلع مش كفاية في التشغيل | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0085 | decision | قرارات | قاعدة الأولويات معتمدة: P0 للحساب المالي والمخزني وكتابة البيانات وسلامة البيانات، والباقي P1 (`REQUIREMENTS_REGISTRY.md`) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0086 | decision | قرارات | اختبارات القبول للعناصر P0 اللي مالهاش اختبار (53 عنصر، `TRACEABILITY_MATRIX.md` §3) شرط قبل نقل الموديول بتاعها، مش شغل منفصل دلوقتي | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0087 | decision | قرارات | الخطوة الجاية: المرحلة 4 (الناقص من الأساس: CI، والمقارنة البصرية، والـ ADRs الناقصة، وOpenAPI) قبل القبول الرسمي للموديول التجريبي (المرحلة 6) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0088 | decision | قرارات | اعتماد ADR-029 لـ ADR-033 كما هم: الإصدار في المسار + عقد OpenAPI متتبّع، والمهام الخلفية بطابور فوق PostgreSQL، والمراقبة بالتدريج + بريد عند الأعطال، وDocker  | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0089 | decision | قرارات | خط أساس بصري خاص بالـ CI (`docs/discovery/visual-baseline-ci/`) بيتولّد على أجهزة GitHub ويتراجع، وبعدها المقارنة البصرية إلزامية في الـ CI كمان | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0090 | decision | قرارات | الخطوة الجاية: المرحلة 6 — القبول الرسمي للموردين والعملاء كموديول تجريبي (UAT، وبروفة نقل ورجوع على نسخة البيانات الحقيقية، واختبارات P0 حسب DEC-0086) | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0091 | decision | قرارات | فرق حقول في شاشات `/app/`: الخانات المخصصة (`extraFields`) للموردين والعملاء، وحالة العميل (`status`)، ليها مكان في القاعدة والـ API وبتتحفظ زي ما هي، بس مالهاش | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0092 | decision | قرارات | ملاحظات شكل في شاشات `/app/` (درجة منخفضة): السجل المختار مش متعلّم في القايمة، وخانة التاريخ بتظهر `mm/dd/yyyy`، والرصيد الافتتاحي بأرقام عربية في سطر وإنجليزي | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0093 | decision | قرارات | تطابق شكل `/app/` مع الواجهة القديمة (ملاحظة الـ UAT): (أ) تطابق كامل للإطار والشاشتين (مقترح، وده طلب الخطة) · (ب) الشاشتين بس، والإطار بعدين · (ج) اعتماد الشك | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0094 | decision | قرارات | نطاق الـ UAT اليدوي للموديول التجريبي: المستخدم نفّذ UAT الشكل والقراءة (G1–G3، G6، G7، G9، G11) ونتيجته «تمام». سيناريوهات الكتابة (G4، G5، G8، G10) مااتحفظش م | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0095 | decision | قرارات | بوابة المرحلة 6: الموردين والعملاء Accepted كموديول تجريبي، وطريقة النقل والرجوع (الدليل + reconcile) معتمدة للمرحلة 13 | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0096 | decision | قرارات | بوابة المرحلة 5: الأساسيات المشتركة Accepted (الصلاحيات، والتدقيق، والمرفقات مع B-78 أ، والإشعارات، والإصدارات، ومحرك الاعتمادات من غير سياسة حقيقية، والترقيم N | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0097 | decision | قرارات | المرحلة 7، الحزمة 7.1 = المخازن: الشاشة بشكل الواجهة القديمة، والتتبّع، ومصفوفة الحقول، واختبارات P0، وUAT، وبروفة نقل ورجوع. B-77 متأجل لحد ما يبقى فيه أصناف ف | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0098 | decision | قرارات | UAT الحزمة 7.1 اتنفّذ آليًا (جلسة Claude على اللابتوب بالمتصفح، بطلب المستخدم، ببيانات اصطناعية على النسخة المعزولة)، والمستخدم وافق على النتيجة (10 نجح، و2 بمل | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0099 | decision | قرارات | تعديل في الواجهة القديمة (صفحة المخازن) بطلب المستخدم: الأزرار والإجراءات بقت بتحترم صلاحيات الصفحة (زي الموردين والعملاء) بدل `readOnlyMode` بس (UAT H13). ومعا | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0100 | decision | قرارات | مسار اعتماد التسويات المخزنية للتشغيل الفعلي (B-51): نوع المستند `stock-adjustment` ومستويات الاعتماد بالمعتمدين الحقيقيين (مسؤول المخازن، والمحاسب المختص، والم | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح |
| DEC-0101 | decision | قرارات | بوابة الحزمة 7.1: المخازن Accepted (من غير التكلفة والتقييم: B-20 وB-77)، وطريقة النقل والرجوع نفس المعتمدة | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0102 | decision | قرارات | B-27: جنيه مصري بس. مفيش أعمدة عملة ولا أسعار صرف. لو ظهرت عملة تانية بعدين، بتبقى تغيير بقرار منفصل | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0103 | decision | قرارات | B-29: الترقيم: رقم داخلي لفاتورة المورد (بالإضافة لرقم المورد)، وتسلسل سنوي لكل نوع مستند (فاتورة، ومرتجع، ودفعة)، والبادئات من الإعدادات، وأرقام الدفعات القديم | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0104 | decision | قرارات | عقود الواجهة مع المحاسبة: أحداث append-only بمفتاح idempotency (`supplier-invoice.posted/cancelled`، و`supplier-return.posted`، و`supplier-payment.posted/revers | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0105 | decision | قرارات | الأرصدة الافتتاحية: قبل التشغيل الفعلي، تقرير مطابقة لكل مورد (الرصيد الحالي، والرصيد بالقاعدة المعتمدة F-05، والفرق وسببه)، والمدير المالي بيعتمده كأرصدة افتتا | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0106 | decision | قرارات | نطاق الحزمة 7.2: فواتير ومرتجعات الموردين بس. الدفعات والتخصيص في الحزمة 7.3 | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0107 | decision | قرارات | معادلة فاتورة المورد الانتقالية (B-20): بتتنقل للسيرفر زي الواجهة الحالية بالظبط: المبالغ يدوي، `الإجمالي = الأساسي + ق.م + الدمغة`، و`الصافي = الإجمالي − المحج | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0108 | decision | قرارات | نطاق الحزمة 7.2 معتمد: الفواتير القديمة من غير رقم داخلي (برقم المورد)، والرقم الداخلي `PI-`/`PR-` السنوي للجديد بس، وحذف الفاتورة يفضل في الواجهة القديمة لحد ح | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0109 | decision | قرارات | التعارض في فواتير الموردين صريح لكل الحقول (حتى النصية زي الملاحظات والبيان): الحفظ بـ `rev` قديم على حقل اتعدّل من مستخدم تاني بيترفض 409 بنفس الرسالة، والحفظ  | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | resolved | محسوم |
| DEC-0110 | decision | قرارات | UAT الحزمة 7.2 اتنفّذ آليًا (جلسة Claude على اللابتوب بالمتصفح، بطلب المستخدم، ببيانات اصطناعية على النسخة المعزولة): 14 نجح بعد إصلاح J11 (DEC-0109). سيناريوها | — | docs/OPEN_BUSINESS_DECISIONS.md | — |  | open | مفتوح |

