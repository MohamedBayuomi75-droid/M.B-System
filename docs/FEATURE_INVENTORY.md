# حصر وظائف النظام الحالي (Feature Inventory)

> **مولَّد آليًا** من الكود والتشغيل الفعلي (القسم 3 مكتوب يدويًا جوه السكربت) — `node tools/audit/feature-inventory.js && node tools/audit/crawl-pages.js && node tools/audit/render-inventory.js`.
> المرجع: «النظام الموحد» v1.3.53 (`renderer/`) — ده «البرنامج الأصلي» اللي الخطة الرئيسية بتطلب عدم فقد أي وظيفة منه.

## قواعد الحالة (والدليل المطلوب لكل حالة)
| الحالة | معناها هنا | الدليل |
|---|---|---|
| ✅ موجودة وتعمل وتم التحقق منها | الصفحة بتترسم من غير أخطاء JS بالبيانات الحقيقية **و** فيه اختبار آلي في `tests-merge/` بيشغّل عملياتها وبيعدي | عمود «رسم» + عمود «اختبارات» |
| 🟡 موجودة لكن لم يتم التحقق منها | موجودة في الكود وبتترسم من غير أخطاء، لكن **مفيش اختبار آلي لعملياتها** (إضافة/تعديل/حذف/طباعة) | عمود «رسم» بس |
| 🟠 موجودة جزئيًا | جزء منها شغال وجزء لأ (مذكور) | — |
| ❌ غير موجودة | مطلوبة في الخطة الرئيسية ومش موجودة في البرنامج | بحث في الكود |
| ❓ غير واضحة وتحتاج قرارًا | محتاجة قرار من صاحب المشروع | — |

**مهم:** «رسم ✔» معناه إن الصفحة فتحت وعرضت محتوى من غير أخطاء — **مش** إن كل زرار فيها اتجرّب. العمليات اللي ماعليهاش اختبار آلي محتاجة اختبار قبول يدوي أو آلي قبل ما تتنقل لأي واجهة جديدة.

## الأرقام الإجمالية
| | |
|---|---|
| ملفات الواجهة | 83 ملف، 46,312 سطر، 1411 دالة |
| الأقسام في التنقل | 11 |
| الصفحات | 44 في التنقل + 10 مفاتيح تانية (تفاصيل/أسماء قديمة/إعدادات) = 54 |
| النوافذ (modals) | 63 دالة `open…Modal` |
| الأزرار المعرّفة بـ id | 449 |
| دوال الحسابات (بالاسم) | 110 |
| ملفات الاختبار | 58 (781 assertion) |
| الزحف الفعلي | 54 صفحة بالبيانات الحقيقية — 0 خطأ JS · نسخة الويب: 54 صفحة — 0 خطأ |

---

## 1) الصفحات (حسب أقسام التنقل)

### 🧭 مركز المتابعة
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `dashboard` | 🧭 مركز المتابعة | `renderDashboardPage` — modules/hr/pages-dashboard.js:28 | ✔ 82 زرار · 1 جدول · 9 صف | ✔ | phase16, phase20, phase38 | ✅ موجودة وتعمل وتم التحقق منها |

### مهامي
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `tasks.my` | مهامي | `renderClientsTasksPage` — modules/clients/pages-tasks.js:38 | ✔ 4 زرار · 1 جدول · 1 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### الموارد البشرية
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `hrHome` | 🏠 لوحات الموارد البشرية | `renderHrHomePage` — core/boards.js:160 | ✔ 0 زرار · 0 جدول · 0 صف | ✔ | phase22 | ✅ موجودة وتعمل وتم التحقق منها |
| `employees` | الموظفين | `renderEmployeesPage` — modules/hr/pages-employees.js:77 | ✔ 6 زرار · 0 جدول · 0 صف | ✔ | phase22, phase26, phase27, phase28, phase29, phase30, phase31, phase32, phase33, phase34, phase35, phase36, phase38, phase39, phase40, phase42, phase44, phase45, phase49, phase51, phase52 | ✅ موجودة وتعمل وتم التحقق منها |
| `supervisors` | المشرفون | `renderSupervisorsPage` — modules/hr/pages-supervisors.js:12 | ✔ 6 زرار · 0 جدول · 0 صف | ✔ | phase27, phase42, phase43, phase49, phase50, phase53, phase54 | ✅ موجودة وتعمل وتم التحقق منها |
| `workers` | العمال | `renderWorkersPage` — modules/hr/pages-workers.js:29 | ✔ 7 زرار · 0 جدول · 0 صف | ✔ | phase24, phase26, phase27, phase28, phase29, phase30, phase37, phase39, phase40, phase41, phase42, phase43, phase45, phase47, phase49, phase50, phase51, phase52, phase53 | ✅ موجودة وتعمل وتم التحقق منها |
| `drivers` | السائقون | `renderDriversPage` — modules/hr/pages-ops.js:6 | ✔ 7 زرار · 0 جدول · 0 صف | ✔ | phase27, phase42, phase44, phase45, phase49, phase50, phase51 | ✅ موجودة وتعمل وتم التحقق منها |
| `equipment` | معدات ومركبات | `renderEquipmentPage` — modules/hr/pages-equipment.js:32 | ✔ 7 زرار · 0 جدول · 0 صف | ✔ | phase23, phase24, phase25, phase26, phase27, phase31, phase32, phase39, phase40, phase42, phase44, phase53, phase54 | ✅ موجودة وتعمل وتم التحقق منها |
| `attendance` | حضور الموظفين | `renderAttendancePage` — modules/hr/pages-attendance.js:19 | ✔ 6 زرار · 1 جدول · 1 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `workerAttendance` | اليوميات | `renderWorkerAttendancePage` — modules/hr/pages-worker-attendance.js:195 | ✔ 5 زرار · 0 جدول · 0 صف | ✔ | phase24, phase26, phase27, phase28, phase39, phase40, phase41, phase43, phase49, phase50, phase51, phase53 | ✅ موجودة وتعمل وتم التحقق منها |
| `leaves` | الإجازات | `renderLeavesPage` — modules/hr/pages-leaves.js:48 | ✔ 10 زرار · 1 جدول · 1 صف | ✔ | phase41 | ✅ موجودة وتعمل وتم التحقق منها |
| `performance` | تقييم الأداء | `renderPerformancePage` — modules/hr/pages-ops.js:540 | ✔ 6 زرار · 4 جدول · 4 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### العملاء والمشاريع
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `clients.customers` | العملاء | `renderClientsCustomersPage` — modules/clients/pages-customers.js:14 | ✔ 11 زرار · 1 جدول · 1 صف | ✔ | phase2, phase5, phase7, phase15, phase19, phase46, phase48, phase55, pages-smoke | ✅ موجودة وتعمل وتم التحقق منها |
| `projects` | المشاريع | `renderProjectsPage` — modules/hr/pages-projects.js:60 | ✔ 50 زرار · 1 جدول · 14 صف | ✔ | phase2, phase3, phase4, phase15, phase17, phase18, phase19, phase22, phase56, phase57, phase58 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.workSurveys` | أعمال الحصر | `renderClientsWorkSurveysPage` — modules/clients/pages-work-surveys.js:74 | ✔ 8 زرار · 1 جدول · 1 صف | ✔ | phase9 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.boqs` | المقايسات | `renderClientsBoqsPage` — modules/clients/pages-boqs.js:45 | ✔ 8 زرار · 1 جدول · 1 صف | ✔ | phase2, phase9 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.contracts` | العقود | `renderClientsContractsPage` — modules/clients/pages-contracts.js:28 | ✔ 8 زرار · 1 جدول · 1 صف | ✔ | phase5, phase7, phase12, phase14, phase15 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.invoices` | المستخلصات | `renderClientsInvoicesPage` — modules/clients/pages-invoices.js:42 | ✔ 8 زرار · 1 جدول · 1 صف | ✔ | phase9, phase12 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.guarantees` | الضمانات | `renderClientsGuaranteesPage` — modules/clients/guarantees.js:176 | ✔ 5 زرار · 0 جدول · 0 صف | ✔ | phase5, phase6 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.comparison` | المقارنة | `renderClientsComparisonPage` — modules/clients/comparison.js:62 | ✔ 3 زرار · 1 جدول · 1 صف | ✔ | phase11, phase12, phase14 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.crm` | CRM | `renderClientsCrmPage` — modules/clients/pages-crm.js:40 | ✔ 8 زرار · 1 جدول · 1 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### الموردون
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `ledger.suppliers` | الموردون | `renderSuppliersPage` — modules/ledger/pages-suppliers.js:3 | ✔ 26 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `ledger.invoices` | الفواتير | `renderInvoicesPage` — modules/ledger/pages-invoices.js:35 | ✔ 96 زرار · 1 جدول · 20 صف | ✔ | phase16 | ✅ موجودة وتعمل وتم التحقق منها |
| `ledger.quarterly` | إشعارات الخصم | `renderQuarterlyPage` — modules/ledger/pages-quarterly.js:39 | ✔ 113 زرار · 1 جدول · 20 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `ledger.returns` | المرتجعات | `renderInvoicesPage` — modules/ledger/pages-invoices.js:35 | ✔ 89 زرار · 1 جدول · 20 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### المخازن
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `warehouses.home` | المخازن | `renderWarehousesHomePage` — modules/warehouses/pages-home.js:6 | ✔ 11 زرار · 1 جدول · 1 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `warehouses.reports` | تقارير المخازن | `renderWarehousesReportsPage` — modules/warehouses/pages-reports.js:2 | ✔ 3 زرار · 2 جدول · 2 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### حركة الموارد
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `transfers` | حركة الموارد | `renderTransfersPage` — modules/hr/pages-ops.js:336 | ✔ 6 زرار · 1 جدول · 1 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### الحسابات
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `workerDues` | المستحقات | `renderWorkerDuesPage` — modules/hr/pages-worker-dues.js:79 | ✔ 8 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `ledger.payments` | الدفعات | `renderPaymentsPage` — modules/ledger/pages-payments.js:33 | ✔ 89 زرار · 1 جدول · 20 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `expenses` | مصاريف شاملة | `renderExpensesPage` — modules/hr/pages-ops.js:1244 | ✔ 9 زرار · 0 جدول · 0 صف | ✔ | phase17, phase26, phase53 | ✅ موجودة وتعمل وتم التحقق منها |
| `costs` | تكاليف شاملة | `renderCostsPage` — modules/hr/pages-costs.js:98 | ✔ 9 زرار · 0 جدول · 0 صف | ✔ | phase17 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.collections` | الإيرادات | `renderClientsCollectionsPage` — modules/clients/pages-collections.js:28 | ✔ 8 زرار · 1 جدول · 1 صف | ✔ | phase13, phase20 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.accounts` | حسابات العملاء | `renderClientsAccountsPage` — modules/clients/pages-accounts.js:73 | ✔ 5 زرار · 1 جدول · 2 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### التقارير
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `reports` | تقارير الموارد البشرية | `renderReportsPage` — modules/hr/pages-reports.js:56 | ✔ 27 زرار · 5 جدول · 19 صف | ✔ | phase22 | ✅ موجودة وتعمل وتم التحقق منها |
| `clients.reports` | تقارير العملاء والمشاريع | `renderClientsReportsPage` — modules/clients/pages-reports.js:4 | ✔ 3 زرار · 1 جدول · 1 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `ledger.reports` | تقارير الموردين | `lgRenderReportsPage` — modules/ledger/pages-reports.js:25 | ✔ 97 زرار · 1 جدول · 20 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `accounts.reports` | تقارير الحسابات | `renderAccountsReportsPage` — modules/accounts/pages-reports.js:2 | ✔ 3 زرار · 1 جدول · 13 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### الأرشيف
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `archive` | أرشيف الموارد البشرية | `renderArchivePage` — core/pages-archive.js:54 | ✔ 9 زرار · 0 جدول · 0 صف | ✔ | phase22 | ✅ موجودة وتعمل وتم التحقق منها |
| `ledger.archive` | أرشيف الموردين | `lgRenderArchivePage` — modules/ledger/pages-archive.js:215 | ✔ 282 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `clients.archive` | أرشيف العملاء والمشاريع | `renderClientsArchivePage` — modules/clients/pages-archive.js:36 | ✔ 4 زرار · 1 جدول · 1 صف | ✔ | phase8 | ✅ موجودة وتعمل وتم التحقق منها |

### الإعدادات
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `backup` | الإعدادات العامة | `renderBackupPage` — core/pages-backup.js:5 | ✔ 269 زرار · 1 جدول · 24 صف | ✔ | phase10, phase29, phase32, phase34, phase35, phase36, phase38, phase45 | ✅ موجودة وتعمل وتم التحقق منها |
| `users` | المستخدمون | `renderUsersPage` — core/pages-users.js:16 | ✔ 6 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |
| `ledger.categories` | الاقتراحات | `renderCategoriesPage` — modules/ledger/pages-categories.js:4 | ✔ 31 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها |

### مفاتيح خارج التنقل (تفاصيل، أسماء قديمة، صفحات اتدمجت)
| المفتاح | الاسم | دالة الرسم — الملف:السطر | رسم (بيانات حقيقية) | ويب | اختبارات | الحالة |
|---|---|---|---|---|---|---|
| `clients.dashboard` | — | `renderDashboardPage` — modules/hr/pages-dashboard.js:28 | ✔ 82 زرار · 1 جدول · 9 صف | ✔ | phase20 | ✅ موجودة وتعمل وتم التحقق منها — اسم قديم → `dashboard` |
| `fuel` | — | `renderEquipmentPage` — modules/hr/pages-equipment.js:32 | ✔ 7 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — اسم قديم → `equipment` |
| `documents` | — | `renderArchivePage` — core/pages-archive.js:54 | ✔ 9 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — اسم قديم → `archive` |
| `assistant` | — | `renderDashboardPage` — modules/hr/pages-dashboard.js:28 | ✔ 82 زرار · 1 جدول · 9 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — اسم قديم → `dashboard` |
| `departments` | — | `renderHrHomePage` — core/boards.js:160 | ✔ 0 زرار · 0 جدول · 0 صف | ✔ | phase22, phase39 | ✅ موجودة وتعمل وتم التحقق منها |
| `payroll` | — | `renderWorkerDuesPage` — modules/hr/pages-worker-dues.js:79 | ✔ 8 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — اسم قديم → `workerDues` |
| `employeeDetail` | — | `renderEmployeeDetailPage` — modules/hr/pages-employee-detail.js:1 | ✔ 1 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — محتاجة اختيار شخص (مش بتتفتح لوحدها) |
| `personDetail` | — | `renderPersonDetailPage` — modules/hr/pages-person-detail.js:238 | ✔ 1 زرار · 0 جدول · 0 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — محتاجة اختيار شخص (مش بتتفتح لوحدها) |
| `ledger.dashboard` | — | `renderLedgerPage` — modules/ledger/glue.js:41 | ✔ 82 زرار · 1 جدول · 9 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — اسم قديم → `dashboard` |
| `general.overview` | — | `renderDashboardPage` — modules/hr/pages-dashboard.js:28 | ✔ 82 زرار · 1 جدول · 9 صف | ✔ | — | 🟡 موجودة لكن لم يتم التحقق منها — اسم قديم → `dashboard` |

**الملخص:** 27 صفحة متحقق منها (رسم + اختبار) · 27 بتترسم ومن غير اختبار لعملياتها · 0 ناقصة.

---

## 2) الوظائف لكل ملف (نوافذ · أزرار · حفظ/حذف · تصدير/طباعة · حسابات · مرفقات)

> الحالة لكل اللي في القسم ده: 🟡 موجودة لكن لم يتم التحقق منها **إلا** لو الملف مذكور في اختبار في القسم 1 — الاختبارات بتغطي سيناريوهات محددة مش كل زرار.

### `core/alerts-center.js` — 311 سطر، 21 دالة
- **مؤشرات:** saveData×3 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (1):** `acHiddenBtn` «⏰ المؤجَّلة والمنجزة (' + hiddenCount + »

### `core/app.js` — 655 سطر، 16 دالة
- **صفحات:** `renderCurrentPage`
- **تصدير/مرفقات:** طباعة×1
- **مؤشرات:** saveData×1 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×1
- **أزرار (6):** `btnLogout` «خروج» · `btnToggleReadOnly` «${readOnlyMode?'🔓 قراءة':'🔒 قراءة'}» · `zoomOutBtn` «−» · `zoomInBtn` «+» · `validateBtn` «✓ فحص» · `btnShortcutsHelp` «⌨️»

### `core/boards.js` — 261 سطر، 18 دالة
- **صفحات:** `renderHrHomePage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (2):** `boardsBack` «◀ الأقسام» · `hrBackHome` «◀ ' + escapeHtml(sec.label) + '»

### `core/cost-center.js` — 104 سطر، 5 دالة
- **حسابات/ملخصات (5):** `compCostProjectNames:15`، `compCostCollected:26`، `compCostRows:32`، `comprehensiveCostsPageHtml:41`، `comprehensiveCostsBoardCard:78`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (2):** `compCostsBack` «◀ رجوع» · `ccClear` «مسح»

### `core/data-store.js` — 787 سطر، 28 دالة
- **عمليات (1):** `saveData`
- **مؤشرات:** saveData×3 · سجل تدقيق×4 · تأكيد حذف×0 · فحص صلاحية×0

### `core/excel-import.js` — 958 سطر، 8 دالة
- **نوافذ (1):** `openExcelImportModal:260`
- **تصدير/مرفقات:** Excel استيراد×2
- **مؤشرات:** saveData×1 · سجل تدقيق×1 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (4):** `ei_run` «استيراد» · `ei_do_update` «حدّث الموجود» · `ei_do_add` «أضف الكل كجديد» · `ei_do_skip` «تخطَّ المطابقين»

### `core/extras.js` — 886 سطر، 9 دالة
- **عمليات (1):** `approveExpense`
- **مؤشرات:** saveData×6 · سجل تدقيق×3 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (1):** `rsgSave` «تسجيل الاستقالة»

### `core/follow-center.js` — 340 سطر، 21 دالة
- **صفحات:** `renderFollowCenterPage`
- **حسابات/ملخصات (1):** `fcCostDetailHtml:202`
- **مؤشرات:** saveData×3 · سجل تدقيق×1 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (5):** `' + escapeHtml(String(c.id)) + '` · `fcTaskAdd` «＋ مهمة جديدة» · `fctSave` «حفظ» · `fcSearch` «🔍 بحث شامل» · `fcRefresh` «↻ تحديث»

### `core/helpers.js` — 8556 سطر، 374 دالة
- **نوافذ (8):** `openModal:472`، `openSubModal:614`، `openPersonDetailModal:2956`، `openPersonAlertsModal:3259`، `openAlertsMoreModal:3310`، `openAddCategoryModal:3793`، `openRenameCategoryModal:3818`، `openDeleteCategoryModal:3857`
- **عمليات (4):** `addAudit`، `deleteProjectById`، `addExtraFieldRow`، `updateBulkBar`
- **حسابات/ملخصات (48):** `employeeLeaveBalance:201`، `attendanceDayWage:260`، `workerDueAmount:343`، `workerWageSummary:349`، `extraFieldsSummary:1055`، `supervisorExpensesTotal:2095`، `supervisorWageStatement:2119`، `personUnpaidBonuses:4134`، `workerPaidTotal:4156`، `workerPenaltyTotal:4166`، `supervisorPenaltyTotal:4175`، `supervisorPaidTotal:4184`، `workerBalance:4193`، `employeePenaltyTotal:4200`، `driverDueAmount:4989`، `driverPaidTotal:4993`، `driverPenaltyTotal:5002`، `employeeDueAmount:5024`، `employeeBalance:5056`، `driverBalance:5071`، `extraCalcChecks:5081`، `validateCalculations:5146`، `paginateTotalsAtEnd:5924`، `statementHeaderHtml:6420`، `statementFooterHtml:6442`، `shouldBrandStatement:6459`، `personExpensesTotal:6469`، `costKindLabel:6483`، `costPersonName:6484`، `costsInRange:6498`، `personCostsTotal:6506`، `costsTableHtml:6510`، `costsStatementBlock:6520`، `personExtrasTotal:6525`، `duesPaidBadge:6547`، `expensesStatementBlock:6635`، `printEquipmentAccountStatement:6697`، `paymentsStatementBlock:6764`، `printWorkerStatement:7107`، `printDriverStatement:7157`، `_payTotalCard:7259`، `printDaysStatement:7458`، `printEmployeeStatement:7544`، `equipmentTotalHours:7801`، `equipmentTotalCost:7804`، `equipmentTotalFuel:7808`، `projectCostSummary:7816`، `projectSupplyCostLines:7894`
- **دوال تصدير/طباعة:** `downloadXlsx`، `downloadCsv`، `printAttachmentPdf`، `printHtml`، `exportArchiveFolder`، `printPersonFilePdf`، `printArchiveAllPdf`، `printExpenseRecord`، `exportExpenseExcel`، `printEquipmentAccountStatement`، `printWorkerStatement`، `printDriverStatement`، `printDaysStatement`، `printEmployeeStatement`، `printPayslip`، `printLeaveForm`
- **تصدير/مرفقات:** Excel تصدير×2 · PDF×6 · طباعة×2 · حفظ ملف×2 · تصدير أرشيف×2 · مرفقات: اختيار×8 · مرفقات: فتح×2 · مرفقات: حذف×2
- **مؤشرات:** saveData×17 · سجل تدقيق×11 · تأكيد حذف×4 · فحص صلاحية×0
- **أزرار (15):** `efPromptCancel` «إلغاء» · `efPromptOk` «إضافة» · `btnSavePersonNotes` «حفظ الملاحظة» · `btnEditFromDetail` «تعديل البيانات» · `btnOpenDetailFromAlert` «عرض التفاصيل» · `btnGoAlertPage` «فتح صفحة ${escapeHtml(label||'')}» · `btnBulkMove` «نقل» · `btnSaveNewCat` «حفظ» · `btnConfirmRenCat` «حفظ الاسم» · `btnConfirmDelCat` «حذف القسم» · `pinOk` «تأكيد» · `undoToastBtn` «استعادة» · `btnDupCancel` «إلغاء» · `btnDupForce` «حفظ على أي حال» · `btnDupX` «×»

### `core/modals-common.js` — 181 سطر، 2 دالة
- **نوافذ (1):** `openScanAttachModal:9`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (7):** `scanWiaBtn` «🖨 مسح من الماسح الضوئي (ويندوز)» · `scanOpenWinAppBtn` «فتح تطبيق مسح ويندوز» · `scanCaptureBtn` «📸 التقاط من الكاميرا» · `scanFlipBtn` «تبديل كاميرا» · `scanRetakeBtn` «مسح المعاينة» · `scanCancel` «إلغاء» · `scanConfirm` «تأكيد ورفع المرفق»

### `core/modules.js` — 152 سطر، 8 دالة
- **صفحات:** `renderPlaceholderPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×1

### `core/network.js` — 851 سطر، 52 دالة
- **عمليات (1):** `saveDataNetwork`
- **حسابات/ملخصات (3):** `activateHostMode:799`، `activateClientMode:820`، `deactivateNetworkMode:841`
- **مؤشرات:** saveData×3 · سجل تدقيق×2 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (7):** `fpSave` «حفظ والمتابعة» · `fpLogout` «تسجيل الخروج» · `loginTogglePass` «👁» · `loginBtn` «دخول إلى النظام» · `btnNetFallbackStandalone` «وضع جهاز واحد» · `btnNetRetryHost` «إعادة المحاولة» · `btnNetRetryClient` «إعادة المحاولة»

### `core/pages-archive.js` — 656 سطر، 16 دالة
- **صفحات:** `renderArchivePage`
- **حسابات/ملخصات (1):** `archiveTotalFilesForKind:44`
- **تصدير/مرفقات:** مرفقات: اختيار×2 · مرفقات: فتح×4 · مرفقات: حذف×6
- **مؤشرات:** saveData×8 · سجل تدقيق×0 · تأكيد حذف×4 · فحص صلاحية×0
- **أزرار (11):** `btnArchAddDoc` «+ إرفاق مستند» · `btnArchOpenTrash` · `btnArchBackKinds` «← كل الأرشيف» · `btnArchAddSec` «إضافة قسم» · `btnArchRenSec` «تعديل قسم» · `btnArchDelSec` «حذف قسم» · `btnArchBackSecs` «← الأقسام» · `btnArchBackPeople` «← المجلدات» · `btnArchAddFile` «+ إرفاق مستند» · `btnArchPersonPdf` «تصدير المستندات pdf» · `btnArchExportFolder` «تصدير المجلد»

### `core/pages-backup.js` — 1530 سطر، 6 دالة
- **صفحات:** `renderBackupPage`، `renderAuditTablePage`
- **تصدير/مرفقات:** حفظ ملف×2
- **مؤشرات:** saveData×11 · سجل تدقيق×6 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (48):** `btnSaveSettings` «💾 حفظ الإعدادات» · `secChangePinBtn` «تغيير / ضبط الرقم السري» · `secClearPinBtn` «مسح الرقم السري» · `secToggleRoBtn` «${readOnlyMode?'إلغاء وضع القراءة فقط':'» · `btnExportBackup` «⬇️ تنزيل نسخة احتياطية» · `btnImportBackup` «⬆️ استيراد نسخة احتياطية» · `btnPickExtraBackup` «اختيار مكان النسخة الإضافية» · `btnExtraBackupNow` «نسخ دلوقتي» · `btnClearExtraBackup` «إلغاء النسخة الإضافية» · `btnExcelImport` «📥 استيراد من إكسيل» · `clImportOldBtn` «📥 استيراد بيانات العملاء القديمة (data.» · `hrImportOldBtn` «📥 استيراد بيانات الموارد البشرية القديم» · `expEmpCsv` «CSV» · `expEmpXlsx` «إكسيل» · `expWrkCsv` «CSV» · `expWrkXlsx` «إكسيل» · `expSupCsv` «CSV» · `expSupXlsx` «إكسيل» · `expDrvCsv` «CSV» · `expDrvXlsx` «إكسيل» · `expEqCsv` «CSV» · `expEqXlsx` «إكسيل» · `expPayCsv` «CSV» · `expPayXlsx` «إكسيل» · `expLeaveCsv` «CSV» · `expLeaveXlsx` «إكسيل» · `expWattCsv` «CSV» · `expWattXlsx` «إكسيل» · `expCostCsv` «CSV» · `expCostXlsx` «إكسيل» · `expExpenseCsv` «CSV» · `expExpenseXlsx` «إكسيل» · `expArchPdf` «PDF» · `pickDataDirBtn` «📂 اختيار مجلد حفظ البيانات» · `resetDataDirBtn` «إعادة المسار الافتراضي» · `safeUpdateBtn` «🔄 اختيار ملف تحديث وتثبيته» · `netStartHostBtn` «▶ تشغيل كمضيف» · `netJoinBtn` «🔗 الاتصال كعميل» · `netTestBtn` «اختبار الاتصال» · `netStopBtn` «⏹ إيقاف الشبكة» · `cfPreviewSaveBtn` «حفظ» · `btnCfAdd` «+ إضافة خانة» · `btnCcAdd` «+ إضافة كرت» · `btnCfSave` «💾 حفظ التعديلات» · `btnCfReset` «↺ استعادة الافتراضي» · `btnReqDocAdd` «+ إضافة» · `btnReqDocReset` «استعادة الافتراضي» · `btnWipeData` «🗑️ مسح كل البيانات»

### `core/pages-general.js` — 87 سطر، 1 دالة
- **صفحات:** `renderGeneralOverviewPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0

### `core/pages-users.js` — 442 سطر، 6 دالة
- **صفحات:** `renderUsersPage`
- **نوافذ (1):** `openUserModal:190`
- **مؤشرات:** saveData×3 · سجل تدقيق×4 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (3):** `btnAddUser` «+ مستخدم جديد» · `btnSaveUser` «حفظ» · `btnSavePass` «حفظ كلمة المرور»

### `core/smart-tools.js` — 867 سطر، 42 دالة
- **حسابات/ملخصات (2):** `repAlertsSummaryTab:692`، `alertsSummaryExportData:726`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (2):** `repAClear` «مسح الفلاتر» · `repMClear` «مسح الفلاتر»

### `modules/accounts/pages-reports.js` — 111 سطر، 2 دالة
- **صفحات:** `renderAccountsReportsPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0

### `modules/clients/catalog.js` — 99 سطر، 5 دالة
- **مؤشرات:** saveData×1 · سجل تدقيق×1 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (3):** `catAdd` «+ كود» · `catSeed` «إضافة أمثلة افتراضية» · `catSave` «حفظ»

### `modules/clients/change-orders.js` — 139 سطر، 8 دالة
- **نوافذ (1):** `openChangeOrderModal:87`
- **حسابات/ملخصات (1):** `clRecalcContractValue:12`
- **مؤشرات:** saveData×0 · سجل تدقيق×2 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (2):** `voAttach` «📎 إرفاق مستند» · `btnSaveVo` «حفظ»

### `modules/clients/comparison.js` — 121 سطر، 6 دالة
- **صفحات:** `renderClientsComparisonPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0

### `modules/clients/dashboard.js` — 100 سطر، 3 دالة
- **صفحات:** `renderClientsDashboardPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0

### `modules/clients/guarantees.js` — 362 سطر، 20 دالة
- **صفحات:** `renderClientsGuaranteesPage`
- **نوافذ (2):** `openGuaranteeModal:231`، `openGuaranteeActionModal:329`
- **حسابات/ملخصات (2):** `clGuaranteeTotals:68`، `clGuaranteeTotalsHtml:122`
- **مؤشرات:** saveData×0 · سجل تدقيق×3 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (4):** `btnAddGuarantee` «+ ضمان» · `garAttach` «📎 إرفاق مستند» · `btnSaveGuarantee` «حفظ» · `btnGaSave` «تأكيد»

### `modules/clients/helpers.js` — 617 سطر، 35 دالة
- **حسابات/ملخصات (2):** `clReconcilePaid:590`، `clMigratePaidSource:600`
- **مؤشرات:** saveData×3 · سجل تدقيق×3 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (4):** `clSaveSettingsBtn` «💾 حفظ إعدادات العملاء» · `clWorkflowEditBtn` «⚙️ تعديل مسار العمل» · `clCatalogBtn` «📚 إدارة الكتالوج» · `clImportFromSettingsBtn` «📥 استيراد data.json للعملاء»

### `modules/clients/pages-accounts.js` — 185 سطر، 3 دالة
- **صفحات:** `renderClientsAccountsPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (1):** `acApply` «عرض»

### `modules/clients/pages-archive.js` — 106 سطر، 3 دالة
- **صفحات:** `renderClientsArchivePage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (1):** `arClear` «مسح»

### `modules/clients/pages-boqs.js` — 358 سطر، 9 دالة
- **صفحات:** `renderClientsBoqsPage`
- **نوافذ (1):** `openBoqModal:200`
- **حسابات/ملخصات (2):** `clCalcBoqItem:10`، `clBoqTotal:17`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (7):** `btnAddBoq` «+ مقايسة» · `boqClear` «مسح الفلاتر» · `boqBack` «← رجوع» · `boqPrint` «🖨️ طباعة / PDF» · `boqEditFromDetail` «تعديل» · `bqAddItem` «+ بند» · `btnSaveBoq` «حفظ»

### `modules/clients/pages-collections.js` — 238 سطر، 5 دالة
- **صفحات:** `renderClientsCollectionsPage`
- **نوافذ (1):** `openCollectionModal:136`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (3):** `btnAddColl` «+ تحصيل» · `coClear` «مسح» · `btnSaveColl` «حفظ»

### `modules/clients/pages-contracts.js` — 328 سطر، 6 دالة
- **صفحات:** `renderClientsContractsPage`
- **نوافذ (1):** `openContractModal:200`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (5):** `btnAddContract` «+ عقد» · `ctClear` «مسح الفلاتر» · `ctBack` «← رجوع» · `ctEditFromDetail` «تعديل» · `btnSaveContract` «حفظ»

### `modules/clients/pages-crm.js` — 325 سطر، 8 دالة
- **صفحات:** `renderClientsCrmPage`
- **نوافذ (2):** `openOppModal:230`، `openCommModal:289`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×2 · فحص صلاحية×0
- **أزرار (7):** `crmTabOpps` «الفرص» · `crmTabComms` «الأنشطة» · `btnAddOpp` «+ فرصة» · `crmClear` «مسح» · `btnAddComm` «+ نشاط» · `btnSaveOpp` «حفظ» · `btnSaveComm` «حفظ»

### `modules/clients/pages-customers.js` — 451 سطر، 5 دالة
- **صفحات:** `renderClientsCustomersPage`
- **نوافذ (1):** `openCustomerModal:290`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (9):** `btnAddCustomer` «+ عميل» · `custClear` «مسح الفلاتر» · `' + c.id + '` «🗑️» · `custBack` «← رجوع للقائمة» · `custEditFromDetail` «تعديل البيانات» · `custAddProject` «+ مشروع» · `' + e(p.id) + '` «✏️» · `cuAddContact` «+ جهة اتصال» · `btnSaveCustomer` «حفظ»

### `modules/clients/pages-invoices.js` — 364 سطر، 7 دالة
- **صفحات:** `renderClientsInvoicesPage`
- **نوافذ (1):** `openClientInvoiceModal:220`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (6):** `btnAddClInv` «+ مستخلص» · `ciClear` «مسح الفلاتر» · `ciBack` «← رجوع» · `ciPrint` «🖨️ طباعة / PDF» · `ciEditFromDetail` «تعديل» · `btnSaveClInv` «حفظ»

### `modules/clients/pages-reports.js` — 74 سطر، 2 دالة
- **صفحات:** `renderClientsReportsPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0

### `modules/clients/pages-tasks.js` — 117 سطر، 3 دالة
- **صفحات:** `renderClientsTasksPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (1):** `tkClear` «مسح»

### `modules/clients/pages-work-surveys.js` — 579 سطر، 9 دالة
- **صفحات:** `renderClientsWorkSurveysPage`
- **نوافذ (1):** `openWorkSurveyModal:324`
- **حسابات/ملخصات (2):** `clCalcSurveyItem:17`، `clSurveyTotal:41`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (7):** `btnAddSurvey` «+ حصر» · `wsClear` «مسح الفلاتر» · `wsBack` «← رجوع» · `wsPrint` «🖨️ طباعة / PDF» · `wsEditFromDetail` «تعديل» · `wsAddItem` «+ بند» · `btnSaveSurvey` «حفظ»

### `modules/clients/project-path.js` — 447 سطر، 13 دالة
- **نوافذ (3):** `openReasonModal:265`، `openStepModal:301`، `openPathHistoryModal:435`
- **تصدير/مرفقات:** مرفقات: حذف×2
- **مؤشرات:** saveData×5 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (11):** `pwAdvance` «إتمام الخطوة الحالية ◀» · `pwHistory` «🕘 السجل» · `pwReasonOk` «↷ تأكيد التخطي» · `pwCmAdd` «➕ إضافة تعليق» · `pwAttach` «📎 إرفاق مستند» · `pwSave` «💾 حفظ البيانات» · `pwAccept` «✓ قبول» · `pwReject` «✕ رفض» · `pwSkip` «↷ تخطي» · `pwDone` «✓ إتمام» · `pwReopen` «↶ إعادة فتح»

### `modules/clients/workflow-editor.js` — 151 سطر، 3 دالة
- **مؤشرات:** saveData×1 · سجل تدقيق×1 · تأكيد حذف×2 · فحص صلاحية×0
- **أزرار (3):** `wfeAddStage` «+ مرحلة جديدة» · `wfeReset` «↺ استعادة المسار الافتراضي» · `wfeSave` «💾 حفظ مسار العمل»

### `modules/hr/modals-employees.js` — 85 سطر، 1 دالة
- **نوافذ (1):** `openEmployeeModal:1`
- **مؤشرات:** saveData×1 · سجل تدقيق×2 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (1):** `btnSaveEmp` «${isEdit?'حفظ التعديلات':'إضافة'}»

### `modules/hr/pages-attendance.js` — 204 سطر، 4 دالة
- **صفحات:** `renderAttendancePage`
- **نوافذ (1):** `openAttendanceModal:121`
- **مؤشرات:** saveData×2 · سجل تدقيق×2 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (2):** `btnAddAtt` «+ تسجيل حضور» · `btnSaveAtt` «حفظ»

### `modules/hr/pages-costs.js` — 635 سطر، 16 دالة
- **صفحات:** `renderCostsPage`
- **نوافذ (1):** `openCostModal:411`
- **عمليات (2):** `saveCostItemSuggestion`، `removeCostItemSuggestion`
- **حسابات/ملخصات (12):** `ensureCostItemPool:12`، `costLines:21`، `costItemText:26`، `costItemSuggestions:31`، `saveCostItemSuggestion:40`، `removeCostItemSuggestion:46`، `renameCostItemSuggestion:51`، `filteredCosts:65`، `costPersonBalance:82`، `costItemsUsed:92`، `costSectionsFor:403`، `costTabIdForKind:408`
- **مؤشرات:** saveData×8 · سجل تدقيق×3 · تأكيد حذف×2 · فحص صلاحية×0
- **أزرار (15):** `btnCostBackKinds` «← كل التكاليف» · `btnCostAddSec` «إضافة قسم» · `btnCostRenSec` «تعديل قسم» · `btnCostDelSec` «حذف قسم» · `btnAddCost` «+ إضافة تكلفة» · `btnCostBackSecs` «← أقسام ${escapeHtml(tabDef.label)}» · `cstApply` «تطبيق» · `cstClear` «مسح» · `btnDoCostSec` «إضافة» · `btnDoCostRen` «حفظ» · `btnDoCostDel` «حذف» · `btnCstAddLine` «+ بند» · `btnCstManageItems` «إدارة البنود» · `btnSaveCost` «${existing ? 'حفظ التعديل' : 'حفظ'}» · `btnCstNewItem` «+ إضافة بند»

### `modules/hr/pages-dashboard.js` — 322 سطر، 3 دالة
- **صفحات:** `renderDashboardPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0

### `modules/hr/pages-departments.js` — 239 سطر، 4 دالة
- **صفحات:** `renderDepartmentsPage`
- **مؤشرات:** saveData×3 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (4):** `btnDeptBack` «← كل الأقسام» · `btnDoRenDept` «حفظ» · `btnDoDelDept` «حذف» · `btnSaveDept` «حفظ»

### `modules/hr/pages-employee-detail.js` — 88 سطر، 2 دالة
- **صفحات:** `renderEmployeeDetailPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (2):** `backToEmpList` «← رجوع للقائمة» · `btnEditEmpDetail` «تعديل البيانات»

### `modules/hr/pages-employees.js` — 216 سطر، 8 دالة
- **صفحات:** `renderEmployeesPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×1 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (1):** `btnAddEmployee` «+ إضافة موظف»

### `modules/hr/pages-equipment.js` — 1319 سطر، 19 دالة
- **صفحات:** `renderEquipmentPage`
- **نوافذ (3):** `openEquipmentModal:665`، `openEquipmentDailyModal:1074`، `openEquipLogModal:1228`
- **حسابات/ملخصات (2):** `printEquipmentDaysStatement:250`، `printEquipmentDailyStatement:1024`
- **دوال تصدير/طباعة:** `printEquipmentDaysStatement`، `printEquipmentDailyStatement`
- **مؤشرات:** saveData×12 · سجل تدقيق×6 · تأكيد حذف×6 · فحص صلاحية×0
- **أزرار (13):** `btnExportEquip` «CSV» · `btnAddExtCar` «+ إضافة سيارة خارجية» · `btnAddEquip` «+ إضافة معدة» · `btnEqBack` «← رجوع للقائمة» · `btnEqDetailEdit` «تعديل البطاقة» · `btnEqSaveNote` «حفظ» · `eqDetApply` «تطبيق» · `btnSaveEq` «${isEdit?'حفظ التعديلات':'إضافة'}» · `btnEqDailyBack` «← رجوع للمعدات» · `btnEqDailyAdd` «+ يومية معدة» · `btnDelEd` «حذف» · `btnSaveEd` «${existing?'حفظ التعديل':'حفظ اليومية'}» · `btnSaveElog` «حفظ»

### `modules/hr/pages-leaves.js` — 308 سطر، 7 دالة
- **صفحات:** `renderLeavesPage`
- **نوافذ (1):** `openLeaveModal:172`
- **حسابات/ملخصات (1):** `calcLeaveDays:32`
- **مؤشرات:** saveData×4 · سجل تدقيق×4 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (3):** `btnAddLeave` «+ طلب إجازة» · `lvApply` «تطبيق» · `btnSaveLv` «${existing?'حفظ التعديل':'إرسال الطلب'}»

### `modules/hr/pages-ops.js` — 2286 سطر، 35 دالة
- **صفحات:** `renderDriversPage`، `renderTransfersPage`، `renderPerformancePage`، `renderExpensesPage`
- **نوافذ (10):** `openExternalDriverModal:133`، `openDriverModal:189`، `openFuelModal:274`، `openTransferModal:419`، `openPerfModal:610`، `openManageDocTypesModal:675`، `openDocModal:721`، `openExpenseDetailModal:1417`، `openExpenseModal:1464`، `openVehicleExpenseModal:1842`
- **عمليات (3):** `saveExpenseItemSuggestion`، `removeExpenseItemSuggestion`، `saveVehicleExpenseItem`
- **تصدير/مرفقات:** مرفقات: اختيار×2
- **مؤشرات:** saveData×24 · سجل تدقيق×11 · تأكيد حذف×6 · فحص صلاحية×0
- **أزرار (33):** `btnAddDriver` «+ سائق» · `btnAddExtDriver` «+ إضافة سائق خارجي» · `btnSaveDriver` «${isEdit?'حفظ التعديل':'إضافة'}» · `btnSaveFl` «حفظ» · `btnAddTransfer` «+ أمر نقل» · `trApply` «تطبيق» · `btnSaveTr` «تنفيذ النقل» · `btnAddPerf` «+ تقييم جديد» · `btnSavePf` «حفظ» · `btnAddDocType` «إضافة» · `btnManageDocTypes` «إدارة الاقتراحات» · `btnDocPickFile` «📁 رفع ملف من الجهاز» · `btnDocScan` «📷 مسح / كاميرا» · `btnSaveDoc` «حفظ في الأرشيف» · `btnExpBackKinds` «← كل المصاريف» · `btnExpAddSec` «إضافة قسم» · `btnExpRenSec` «تعديل قسم» · `btnExpDelSec` «حذف قسم» · `btnExpFuel` «⛽ صرف وقود» · `btnAddExp` «+ مصروف» · `btnExpSecBack` «← أقسام ${escapeHtml(tabDef.label)}» · `expApply` «تطبيق» · `btnExpDetailEdit` «تعديل» · `btnExAddLine` «+ بند» · `btnExManageItems` «إدارة البنود» · `btnSaveEx` «حفظ» · `btnAddPItem` «إضافة» · `btnVexpAddLine` «+ بند» · `btnVexpManageItems` «إدارة البنود» · `btnSaveVexp` «حفظ» · `btnDoExpSec` «إضافة» · `btnDoExpRen` «حفظ» · `btnDoExpDel` «حذف»

### `modules/hr/pages-person-detail.js` — 432 سطر، 14 دالة
- **صفحات:** `renderPersonDetailPage`
- **حسابات/ملخصات (1):** `printPersonFinanceStatement:126`
- **دوال تصدير/طباعة:** `printPersonFinanceStatement`
- **مؤشرات:** saveData×4 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (8):** `btnPfApply` «تطبيق» · `btnPfPrint` «${(kind==='worker' && typeof isTempWorke» · `btnPfPay` «＋ تسجيل صرف / استلام» · `btnPfPen` «＋ خصم / جزاء» · `btnPersonDetDoc2` «＋ إرفاق» · `btnPersonDetBack` «← رجوع للقائمة» · `btnPersonDetEdit` «تعديل البيانات» · `btnPersonDetSaveNote` «حفظ»

### `modules/hr/pages-projects.js` — 606 سطر، 7 دالة
- **صفحات:** `renderProjectsPage`
- **نوافذ (2):** `openProjectModal:334`، `openPlanModal:508`
- **مؤشرات:** saveData×3 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (6):** `btnAddProject` «+ مشروع» · `projClear` «مسح الفلاتر» · `' + p.id + '` «🗑️» · `btnSavePr` «حفظ» · `pdAutoFill` «تعبئة تلقائية من الحضور والمعدات» · `btnSavePd` «حفظ»

### `modules/hr/pages-reports.js` — 1998 سطر، 26 دالة
- **صفحات:** `renderReportsPage`
- **حسابات/ملخصات (1):** `repDuesFull:365`
- **دوال تصدير/طباعة:** `exportCurrentReportCsv`، `exportCurrentReportXlsx`، `printCurrentReport`
- **تصدير/مرفقات:** طباعة×2
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (8):** `btnRepXlsx` «إكسيل» · `btnRepCsv` «CSV» · `btnRepPrint` «طباعة» · `btnRepApply` «تطبيق» · `btnRepClearDates` «مسح التواريخ» · `repFClear` «مسح الفلاتر» · `repFOpClear` «مسح الفلاتر» · `btnPrintMonthlyOverview` «🖨️ طباعة التقرير الشهري»

### `modules/hr/pages-supervisors.js` — 416 سطر، 7 دالة
- **صفحات:** `renderSupervisorsPage`، `renderSupervisorStatementPage`
- **نوافذ (1):** `openSupervisorModal:323`
- **حسابات/ملخصات (2):** `supervisorStatementSectionsHtml:99`، `supervisorStatementCardsHtml:149`
- **مؤشرات:** saveData×4 · سجل تدقيق×3 · تأكيد حذف×2 · فحص صلاحية×0
- **أزرار (6):** `btnAddSup` «+ إضافة مشرف» · `btnBackSup` «← رجوع للمشرفين» · `btnPrintSupDays` «طباعة كشف أيام» · `btnPrintSupStmt` «طباعة كشف الحساب» · `supStmtApply` «تطبيق» · `btnSaveSup` «${isEdit?'حفظ التعديلات':'إضافة'}»

### `modules/hr/pages-worker-attendance.js` — 879 سطر، 17 دالة
- **صفحات:** `renderWorkerAttendancePage`
- **نوافذ (2):** `openWattDaySitesModal:541`، `openWorkerAttModal:577`
- **مؤشرات:** saveData×4 · سجل تدقيق×2 · تأكيد حذف×3 · فحص صلاحية×0
- **أزرار (8):** `btnDailiesBackKinds` «← كل اليوميات» · `btnDailiesBackDepts` «← الأقسام» · `btnAddWatt` «+ تسجيل يومية» · `wattClearFilters` «مسح الفلاتر» · `btnWsiteAdd` «+ موقع آخر لنفس اليوم» · `btnDelWattModal` «حذف» · `btnSaveWattMore` «حفظ + موقع آخر لنفس اليوم» · `btnSaveWatt` «${existing?'حفظ التعديل':'تسجيل'}»

### `modules/hr/pages-worker-dues.js` — 1582 سطر، 14 دالة
- **صفحات:** `renderWorkerDuesPage`
- **نوافذ (2):** `openUnifiedPayModal:741`، `openPayItemsManageModal:1454`
- **حسابات/ملخصات (2):** `duesEntityKind:12`، `duesListForKind:17`
- **مؤشرات:** saveData×5 · سجل تدقيق×6 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (15):** `btnDuesBackKinds` «← كل المستحقات» · `btnDuesBackDepts` «← أقسام ${escapeHtml(label)}» · `btnAddWPay` «💵 دفع مستحق» · `btnAddWExtras` «بدلات ومكافآت» · `btnAddWPen` «⚠️ خصم / جزاء» · `duesApply` «تطبيق» · `btnUpAddLine` «+ بند» · `btnUpManageItems` «إدارة البنود» · `btnUpAddLineDaily` «+ بند» · `btnUpManageItemsDaily` «إدارة البنود» · `btnSaveUp` «حفظ» · `btnXClosePItems` «×» · `btnAddPItem` «إضافة» · `btnClosePItems` «إغلاق» · `btnSavePItems` «حفظ»

### `modules/hr/pages-workers.js` — 514 سطر، 5 دالة
- **صفحات:** `renderWorkersPage`
- **نوافذ (1):** `openWorkerModal:216`
- **مؤشرات:** saveData×1 · سجل تدقيق×3 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (4):** `btnExportWorkers` «CSV» · `btnAddTempWorker` «+ إضافة عامل مؤقت» · `btnAddWorker` «+ إضافة عامل» · `btnSaveWrk` «${isEdit ? 'حفظ التعديلات' : 'إضافة'}»

### `modules/hr/project-statement.js` — 360 سطر، 9 دالة
- **صفحات:** `renderProjectStatementPage`
- **حسابات/ملخصات (2):** `projectStatement:48`، `projectStatementSectionsHtml:177`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (5):** `btnBackProj` «← رجوع للمشاريع» · `btnPrintProjStmt` «🖨️ طباعة الكشف» · `btnEditProjDetail` «✏️ تعديل المشروع» · `pstApply` «تطبيق» · `pstClear` «مسح الفلاتر»

### `modules/ledger/app.js` — 972 سطر، 13 دالة
- **نوافذ (1):** `openGlobalValidationModal:567`
- **حسابات/ملخصات (1):** `refreshOpenStatements:773`
- **تصدير/مرفقات:** مرفقات: فتح×1 · مرفقات: حذف×1
- **مؤشرات:** saveData×11 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×2
- **أزرار (5):** `fix_cancel` «إلغاء» · `fix_ok` «موافق — إصلاح ${list.length} فاتورة» · `gval_close` «إغلاق» · `gval_fix` «إصلاح حسابات الفواتير» · `sc_close` «حسناً»

### `modules/ledger/excel-import.js` — 617 سطر، 19 دالة
- **حسابات/ملخصات (1):** `normalizeTaxId:240`
- **تصدير/مرفقات:** Excel استيراد×1
- **مؤشرات:** saveData×2 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (6):** `ei_cancel` «إلغاء» · `ei_import` «استيراد ${dataRows.length} صف» · `imp_cancel` «إلغاء» · `imp_new_only` «إضافة الجديد فقط (بدون تحديث)» · `imp_selected` «تحديث المحدد + إضافة الجديد» · `imp_all` «تأكيد الإضافة»

### `modules/ledger/glue.js` — 283 سطر، 17 دالة
- **صفحات:** `renderLedgerPage`
- **مؤشرات:** saveData×5 · سجل تدقيق×2 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (8):** `lgImportOldBtn` «📥 استيراد بيانات دفتر الموردين القديمة » · `lgExcelImportBtn` «استيراد من إكسيل» · `lgExportSuppliersBtn` «تصدير الموردين» · `lgExportInvoicesBtn` «تصدير كل الفواتير» · `lgExportPaymentsBtn` «تصدير كل الدفعات» · `lgValidateBtn` «✓ فحص البيانات الآن» · `lgFixCalcBtn` «إصلاح حسابات الفواتير (الإجمالي والصافي)» · `lgResetBtn` «🗑️ مسح بيانات الموردين والفواتير»

### `modules/ledger/helpers.js` — 2348 سطر، 143 دالة
- **عمليات (3):** `addDaysToIsoDate`، `saveCustomLinkedItem`، `deleteCustomLinkedItem`
- **حسابات/ملخصات (10):** `previewInvoiceCalculationFixes:143`، `fixInvoiceCalculations:169`، `lgExtraFieldsSummary:492`، `supplierBalance:576`، `invoiceRemaining:590`، `getInvoiceDueDate:720`، `getOverdueInvoices:734`، `recalcLinkedOriginal:1927`، `maybeShowOverdueAlert:2031`، `pfSummaryHtml:2265`
- **دوال تصدير/طباعة:** `downloadFile`، `exportExcelFile`، `printHtmlContent`
- **تصدير/مرفقات:** Excel تصدير×1 · PDF×1 · حفظ ملف×1
- **مؤشرات:** saveData×6 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×4
- **أزرار (11):** `efPromptCancel` «إلغاء» · `efPromptOk` «إضافة» · `appDlgCancel` «${lgEscapeHtml(cancelText)}» · `appDlgOk` «${lgEscapeHtml(okText)}» · `pinEye2` «👁» · `pinEye1` «👁» · `pinCancel` «إلغاء» · `pinOk` «تأكيد» · `undoToastBtn` «استعادة» · `overdueAlertClose` «لاحقاً» · `overdueAlertGo` «عرض الفواتير المتأخرة»

### `modules/ledger/modals.js` — 1675 سطر، 15 دالة
- **نوافذ (7):** `openAddSupplierModal:9`، `openDeleteSupplierModal:136`، `openPaymentModal:192`، `openAddEditInvoiceModal:660`، `openDiscountNoticeModal:1410`، `openViewInvoiceModal:1452`، `openViewPaymentModal:1633`
- **عمليات (1):** `saveInvoiceData`
- **حسابات/ملخصات (2):** `printSupplierStatementTab:1439`، `printSupplierStatement:1446`
- **دوال تصدير/طباعة:** `printSupplierStatementTab`، `printSupplierStatement`
- **تصدير/مرفقات:** مرفقات: فتح×5 · مرفقات: حذف×4
- **مؤشرات:** saveData×9 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×5
- **أزرار (32):** `m_addCustomFieldBtn` «+ إضافة خانة مخصصة أخرى» · `m_showExtraFields` «+ إضافة خانة (هاتف / إيميل / عنوان / حسا» · `m_sup_scanAtt` «📷 مسح ضوئي / كاميرا» · `m_cancel` «إلغاء» · `m_save` «${editing?'حفظ التعديل':'إضافة الفاتورة'» · `m_confirm` «تحديث الفاتورة الموجودة» · `m_pay_addFieldBtn` «+ إضافة خانة أخرى» · `m_pay_scanAtt` «📷 مسح ضوئي / كاميرا» · `m_pay_cancel` «إلغاء» · `m_pay_save` «'+(editing?'حفظ التعديل':'إضافة الدفعة')» · `scanWiaBtn` «🖨 مسح من الماسح الضوئي (ويندوز)» · `scanOpenWinAppBtn` «فتح تطبيق مسح ويندوز» · `scanCaptureBtn` «📸 التقاط من الكاميرا» · `scanFlipBtn` «تبديل كاميرا» · `scanRetakeBtn` «مسح المعاينة» · `scanCancel` «إلغاء» · `scanConfirm` «تأكيد ورفع المرفق» · `inv_addItemBtn` «+ إضافة صنف» · `inv_openLinkBtn` «🔗 فتح» · `invFormScanAtt` «📷 مسح ضوئي / كاميرا» · `m_close` «إغلاق» · `m_print` «حفظ PDF (يفتح تلقائياً)» · `m_open_inv_link` «🔗 فتح الفاتورة الأصلية» · `m_open_linked_orig` «فتح الفاتورة الأصلية» · `m_close_view` «إغلاق» · `m_scan_att` «📷 مسح / كاميرا» · `m_copy_inv` «نسخ كفاتورة جديدة» · `m_view_notice` «${inv.postReturnWht?'إشعار خصم بعد مرتجع» · `m_view_edit` «تعديل» · `m_close_pay_view` «إغلاق» · `m_pay_edit` «تعديل الدفعة» · `m_pay_view_inv` «عرض الفاتورة المرتبطة»

### `modules/ledger/pages-archive.js` — 1309 سطر، 49 دالة
- **نوافذ (1):** `openAddSupplierDocumentModal:774`
- **حسابات/ملخصات (1):** `archSummary:138`
- **تصدير/مرفقات:** تصدير أرشيف×4 · مرفقات: اختيار×6 · مرفقات: فتح×5 · مرفقات: حذف×8
- **مؤشرات:** saveData×8 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (14):** `btnArchResetFilters` «✕ مسح الفلاتر (${n})» · `btnArchBackList` «← كل الموردين» · `btnArchOpenTrash` «🗑️ سلة المهملات (${(DATA.ledger.archive» · `btnArchAddDoc` «+ إرفاق مستند» · `btnArchExportSup` «💾 حفظ المجلد على الجهاز» · `btnArchBackSup` «← مجلد ${lgEscapeHtml(s.name||'')}» · `btnArchPrintAllNotices` «🖨 طباعة ${n>0?'الإشعارات الظاهرة':'كل ا» · `btnAddDocType` «إضافة» · `btnCloseManageDocTypes` «إغلاق» · `btnManageDocTypes` «إدارة الاقتراحات» · `btnDocPickFile` «📁 رفع ملف من الجهاز» · `btnDocScan` «📷 مسح / كاميرا» · `docCancel` «إلغاء» · `btnSaveDoc` «حفظ في أوراق المورد»

### `modules/ledger/pages-categories.js` — 336 سطر، 6 دالة
- **صفحات:** `renderCategoriesPage`
- **نوافذ (1):** `openLinkedItemModal:231`
- **مؤشرات:** saveData×1 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×3
- **أزرار (9):** `addCategoryBtn` «+ إضافة تصنيف» · `exportCategoriesExcelBtn` «تصدير Excel (الظاهر)» · `addProjectBtn` «+ إضافة مشروع» · `addLinkedItemBtn` «＋ إضافة صنف / أكواد للمورد» · `li_cancel` «إلغاء» · `li_save` «حفظ» · `applySupplierStatementBtn` «تحديث الكشف» · `printSupplierStatementTabBtn` «حفظ PDF» · `clearSupplierStatementDatesBtn` «كل الفترة»

### `modules/ledger/pages-dashboard.js` — 240 سطر، 3 دالة
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×2
- **أزرار (3):** `dashAddSupplier` «+ مورد جديد» · `dashAddInvoice` «+ فاتورة جديدة» · `dashAddPayment` «+ إضافة دفعة»

### `modules/ledger/pages-invoices.js` — 128 سطر، 3 دالة
- **صفحات:** `renderInvoicesPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×2
- **أزرار (5):** `invClearDates` «مسح فلتر التاريخ» · `invFilterOverdue` «${invoiceFilters.overdueOnly?'إلغاء فلتر» · `openAddInvoiceModalBtnGlobal` «+ إضافة فاتورة» · `openAddReturnModalBtn` «+ إضافة مرتجع» · `exportAllInvoicesCsv` «تصدير Excel (النتائج الظاهرة)»

### `modules/ledger/pages-payments.js` — 96 سطر، 3 دالة
- **صفحات:** `renderPaymentsPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×2
- **أزرار (3):** `paymentsClearDates` «مسح فلتر التاريخ» · `openAddPaymentPageBtn` «+ إضافة دفعة» · `exportAllPaymentsPageBtn` «تصدير Excel (النتائج الظاهرة)»

### `modules/ledger/pages-quarterly.js` — 100 سطر، 4 دالة
- **صفحات:** `renderQuarterlyPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (2):** `quarterlyClearDates` «مسح فلتر التاريخ» · `exportQuarterNoticesPdf` «تصدير إشعارات PDF»

### `modules/ledger/pages-reports.js` — 100 سطر، 6 دالة
- **دوال تصدير/طباعة:** `exportPeriodicReportCsv`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (2):** `reportsClearDates` «مسح فلتر التاريخ» · `exportPeriodicReportCsvBtn` «تصدير Excel (النتائج الظاهرة)»

### `modules/ledger/pages-suppliers.js` — 306 سطر، 10 دالة
- **صفحات:** `renderSuppliersPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×6
- **أزرار (14):** `addSupplierBtn` «+ إضافة مورد جديد» · `exportSuppliersListBtn` «تصدير الموردين (الظاهرين) Excel» · `printStatementBtn` «حفظ PDF لكشف الحساب» · `exportSupplierCsvBtn` «تصدير Excel» · `exportSupplierNoticesPdfBtn` «تصدير إشعارات الخصم PDF» · `deleteSupplierBtn` «حذف المورد» · `f_sup_scanAtt` «📷 مسح ضوئي / كاميرا» · `f_addCustomFieldBtn` «+ إضافة خانة مخصصة أخرى» · `saveInfoBtn` «حفظ البيانات» · `openAddInvoiceModalBtn` «+ إضافة فاتورة» · `openAddReturnModalBtnSupplier` «+ إضافة مرتجع» · `openAddPaymentModalSupplierBtn` «+ إضافة دفعة» · `pay_addFieldBtn` «+ إضافة خانة أخرى» · `addPaymentBtn` «إضافة الدفعة»

### `modules/ledger/statement.js` — 145 سطر، 5 دالة
- **صفحات:** `renderStatementPage`
- **حسابات/ملخصات (3):** `statementRows:3`، `buildAccountStatementHtml:61`، `printBankStatement:140`
- **دوال تصدير/طباعة:** `printBankStatement`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (2):** `generateStatementBtn` «عرض الكشف» · `printStatementPageBtn` «حفظ PDF (يفتح تلقائياً)»

### `modules/warehouses/helpers.js` — 138 سطر، 21 دالة
- **مؤشرات:** saveData×2 · سجل تدقيق×1 · تأكيد حذف×0 · فحص صلاحية×0
- **أزرار (1):** `whSaveSettingsBtn` «💾 حفظ إعدادات المخازن»

### `modules/warehouses/pages-home.js` — 354 سطر، 10 دالة
- **صفحات:** `renderWarehousesHomePage`
- **نوافذ (3):** `openWhItemModal:203`، `openWhLocationModal:237`، `openWhMovementModal:260`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×1 · فحص صلاحية×0
- **أزرار (10):** `btnWhIn` «+ استلام» · `btnWhOut` «+ صرف» · `btnWhTransfer` «+ تحويل» · `btnWhAddItem` «+ صنف» · `btnWhAddLoc` «+ مخزن» · `' + it.id + '` «🗑️» · `' + L.id + '` «✏️» · `btnSaveWhItem` «حفظ» · `btnSaveWhLoc` «حفظ» · `btnSaveWhMove` «حفظ»

### `modules/warehouses/pages-reports.js` — 68 سطر، 2 دالة
- **صفحات:** `renderWarehousesReportsPage`
- **مؤشرات:** saveData×0 · سجل تدقيق×0 · تأكيد حذف×0 · فحص صلاحية×0

---

## 3) موديولات الخطة الرئيسية (ERP_System_Master_Implementation_Plan §3) مقابل الموجود فعلًا

> الدليل: بحث نصي في `renderer/` عن المصطلحات العربية والإنجليزية لكل موديول + قراءة الملفات المذكورة.

| # | موديول الخطة | الحالة | الموجود فعلًا (الدليل) | الناقص عن الخطة |
|---|---|---|---|---|
| 1 | Dashboard | ✅ موجودة وتعمل وتم التحقق منها | مركز المتابعة `dashboard` + `core/follow-center.js` + `alerts-center.js` | — |
| 2 | HR | ✅ موجودة وتعمل وتم التحقق منها | موظفين، حضور، إجازات، تقييم أداء، أقسام (`modules/hr/`) | — |
| 3 | Employees & Labor | ✅ موجودة وتعمل وتم التحقق منها | عمال، مشرفين، سائقين، يوميات، مستحقات، نقل موارد | دورة اعتماد للصرف (مراجعة ← اعتماد ← صرف) مش موجودة كحالات |
| 4 | Projects | ✅ موجودة وتعمل وتم التحقق منها | `projects` + مسار المشروع بخطوات (`clients/project-workflow.js`, `project-path.js`) + `core/cost-center.js` (ملخص تكلفة المشروع) | «مراكز تكلفة» ككيان مستقل · «أعضاء المشروع» كجدول |
| 5 | Clients | ✅ موجودة وتعمل وتم التحقق منها | عملاء، CRM، حسابات عملاء، تحصيلات | — |
| 6 | Suppliers | ✅ موجودة وتعمل وتم التحقق منها | موردين، فواتير، مرتجعات، دفعات، إشعارات خصم، كشف حساب (`modules/ledger/`) | — |
| 7 | Accounting & Ledger | 🟠 موجودة جزئيًا | دفتر موردين + مصاريف + تكاليف + إيرادات + حسابات عملاء + تقارير حسابات | **مفيش محاسبة قيد مزدوج**: لا دليل حسابات (Accounts) ولا قيود يومية (Journal Entries/Lines) ولا ميزان مراجعة |
| 8 | Warehouses | 🟠 موجودة جزئيًا | أصناف، مخازن، حركات، جرد (`modules/warehouses/` — 560 سطر) | تصنيفات أصناف · منع صرف غير المتاح موجود في الواجهة بس (`pages-home.js:321`) مش على السيرفر · ربط بالمشتريات |
| 9 | Procurement | ❌ غير موجودة | 0 نتيجة لـ «طلب شراء / أمر شراء / purchaseOrder» | الموديول كله: طلب شراء ← اعتماد ← أمر شراء ← استلام ← فاتورة |
| 10 | Equipment | ✅ موجودة وتعمل وتم التحقق منها | معدات، يوميات تشغيل، صيانة، وقود، تراخيص، تخصيص لمشروع | — |
| 11 | Safety & Risks | ❌ غير موجودة | مفيش صفحات/بيانات للسلامة أو المخاطر | الموديول كله |
| 12 | Quality & Handover | ❌ غير موجودة | «استلام ابتدائي/نهائي» بتظهر كخطوات في مسار المشروع بس | موديول جودة/فحوصات/محاضر استلام |
| 13 | Contracts & BOQ | ✅ موجودة وتعمل وتم التحقق منها | عقود، مقايسات، أعمال حصر، مستخلصات، ضمانات، **أوامر تغيير** (`clients/change-orders.js`) | — |
| 14 | Documents & Archive | 🟠 موجودة جزئيًا | أرشيف HR + أرشيف الدفتر + أرشيف العملاء + مستندات أشخاص بتاريخ انتهاء؛ الملفات على القرص | **إصدارات المستندات** · التخزين داخل PostgreSQL · فحص الملفات · (في الويب: المرفقات لسه — A5) |
| 15 | Workflow & Approvals | 🟠 موجودة جزئيًا | مسار المشروع قابل للتعديل (`workflow-editor.js`)، اعتماد إجازات، حد اعتماد مصروف (`settings.expenseApprovalLimit`) | **محرك اعتمادات عام** (Draft/Submitted/Approved/Rejected/Returned/Cancelled) حسب نوع المستند والمبلغ والإدارة |
| 16 | Notifications | 🟠 موجودة جزئيًا | مركز تنبيهات داخل الواجهة (انتهاء مستندات/تراخيص…) محسوب وقت العرض | إشعارات لكل مستخدم مخزّنة · «إشعار المسؤول التالي» |
| 17 | Reports | ✅ موجودة وتعمل وتم التحقق منها | تقارير HR، الدفتر، العملاء، المخازن، الحسابات + Excel/PDF/طباعة | — |
| 18 | Users & Permissions | 🟠 موجودة جزئيًا | مستخدمين + أدوار + صلاحيات صفحة × (عرض/إضافة/تعديل/حذف)؛ **على السيرفر** في نسخة الويب + نطاق مشاريع | إجراءات Approve/Reject/Print/Export/Pay/Cancel · نطاق «إدارته» و«اللي أنشأه بس» |
| 19 | System Settings | ✅ موجودة وتعمل وتم التحقق منها | بيانات الشركة، حقول مخصصة، تخطيط النماذج، مستندات مطلوبة | — |
| 20 | Backup & Restore | 🟠 موجودة جزئيًا | الديسكتوب: نسخ تلقائية + نسخة إضافية + استيراد/تصدير | في الويب: نسخ السيرفر واختبار الاستعادة لسه (A6) |
| — | PWA | ❌ غير موجودة | مفيش manifest ولا service worker | — |
| — | Audit Log | 🟠 موجودة جزئيًا | `DATA.auditLog` (وصف نصي)؛ في الويب: `changes` (مين/إمتى/الحقول/القيم الجديدة) + `audit_log` | القيم **القديمة** في السجل · سبب الإلغاء/الرفض · سياسة احتفاظ |
