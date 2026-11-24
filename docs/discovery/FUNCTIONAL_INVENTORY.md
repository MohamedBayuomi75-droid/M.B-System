# الجرد الوظيفي لكل صفحة (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ `node tools/discovery/discover-pages.js` ثم `node tools/discovery/build-functional-inventory.js`. ماتعدّلش الملف باليد.
> **البيانات:** مُركّبة بس (synthetic (tools/security/xss-seed.js, plain text))، والساعة متثبّتة على 2026-03-15. **الوضع:** file (desktop renderer, mocked desktopApi).
> **النوافذ:** الأداة بتفتح بس أزرار الإضافة/التعديل/العرض (لحد 6 لكل صفحة)، وعمرها ما بتدوس حذف أو حفظ أو تصدير أو طباعة أو اعتماد. الأفعال دي متجرّدة من الأزرار نفسها (النص والدالة)، ومش متنفّذة.
> **الأرقام:** كل صفحة ونافذة ودالة ليها `LEG-` من `REQUIREMENTS_REGISTRY.md`.

## الملخص
| المقياس | القيمة |
|---|---|
| الصفحات | 54 (منها 44 في القايمة) |
| أزرار خاصة بالصفحات (من غير الهيدر والقايمة) | 756 |
| خانات إدخال في الصفحات | 358 |
| جداول | 40 |
| نوافذ اتفتحت فعلًا | 53 |
| أخطاء JS أثناء الاستكشاف | 0 |

## الهيدر والقايمة (مشتركين في كل الصفحات، ومستبعدين من جرد كل صفحة)
- **الهيدر:** خروج (`btnLogout`) · 🔒 قراءة (`btnToggleReadOnly`) · مضغوط · عادي · واسع · − (`zoomOutBtn`) · + (`zoomInBtn`) · ✓ فحص (`validateBtn`) · ⌨️ (`btnShortcutsHelp`)
- **أقسام القايمة (11):** 🧭 مركز المتابعة (`general`) · مهامي (`tasks`) · الموارد البشرية (`hr`) · العملاء والمشاريع (`clients`) · الموردون (`suppliers`) · المخازن (`warehouses`) · حركة الموارد (`movements`) · الحسابات (`accounts`) · التقارير (`reports`) · الأرشيف (`archive`) · الإعدادات (`settings`)

## فهرس الصفحات
| ID | الصفحة | القسم | المكان المستهدف | أفعال | نوافذ اتفتحت | لقطة |
|---|---|---|---|---|---|---|
| LEG-0001 | [🧭 مركز المتابعة](#dashboard) | 🧭 مركز المتابعة | legacy /legacy/ | 53 | 1 | [ديسكتوب](visual-baseline/desktop/dashboard.png) · [موبايل](visual-baseline/mobile/dashboard.png) |
| LEG-0002 | [مهامي](#tasksmy) | مهامي | legacy /legacy/ | 4 | 0 | [ديسكتوب](visual-baseline/desktop/tasks.my.png) · [موبايل](visual-baseline/mobile/tasks.my.png) |
| LEG-0003 | [🏠 لوحات الموارد البشرية](#hrHome) | الموارد البشرية | legacy /legacy/ | 9 | 0 | [ديسكتوب](visual-baseline/desktop/hrHome.png) · [موبايل](visual-baseline/mobile/hrHome.png) |
| LEG-0004 | [الموظفين](#employees) | الموارد البشرية | angular /employees | 6 | 0 | [ديسكتوب](visual-baseline/desktop/employees.png) · [موبايل](visual-baseline/mobile/employees.png) |
| LEG-0005 | [المشرفون](#supervisors) | الموارد البشرية | angular /supervisors | 6 | 0 | [ديسكتوب](visual-baseline/desktop/supervisors.png) · [موبايل](visual-baseline/mobile/supervisors.png) |
| LEG-0006 | [العمال](#workers) | الموارد البشرية | angular /workers | 7 | 0 | [ديسكتوب](visual-baseline/desktop/workers.png) · [موبايل](visual-baseline/mobile/workers.png) |
| LEG-0007 | [السائقون](#drivers) | الموارد البشرية | angular /drivers | 7 | 0 | [ديسكتوب](visual-baseline/desktop/drivers.png) · [موبايل](visual-baseline/mobile/drivers.png) |
| LEG-0008 | [معدات ومركبات](#equipment) | الموارد البشرية | legacy /legacy/ | 7 | 0 | [ديسكتوب](visual-baseline/desktop/equipment.png) · [موبايل](visual-baseline/mobile/equipment.png) |
| LEG-0009 | [حضور الموظفين](#attendance) | الموارد البشرية | legacy /legacy/ | 6 | 1 | [ديسكتوب](visual-baseline/desktop/attendance.png) · [موبايل](visual-baseline/mobile/attendance.png) |
| LEG-0010 | [اليوميات](#workerAttendance) | الموارد البشرية | legacy /legacy/ | 5 | 0 | [ديسكتوب](visual-baseline/desktop/workerAttendance.png) · [موبايل](visual-baseline/mobile/workerAttendance.png) |
| LEG-0011 | [الإجازات](#leaves) | الموارد البشرية | legacy /legacy/ | 10 | 2 | [ديسكتوب](visual-baseline/desktop/leaves.png) · [موبايل](visual-baseline/mobile/leaves.png) |
| LEG-0012 | [تقييم الأداء](#performance) | الموارد البشرية | legacy /legacy/ | 6 | 5 | [ديسكتوب](visual-baseline/desktop/performance.png) · [موبايل](visual-baseline/mobile/performance.png) |
| LEG-0013 | [العملاء](#clientscustomers) | العملاء والمشاريع | angular /customers | 11 | 1 | [ديسكتوب](visual-baseline/desktop/clients.customers.png) · [موبايل](visual-baseline/mobile/clients.customers.png) |
| LEG-0014 | [المشاريع](#projects) | العملاء والمشاريع | angular /projects | 11 | 1 | [ديسكتوب](visual-baseline/desktop/projects.png) · [موبايل](visual-baseline/mobile/projects.png) |
| LEG-0015 | [أعمال الحصر](#clientsworkSurveys) | العملاء والمشاريع | legacy /legacy/ | 8 | 1 | [ديسكتوب](visual-baseline/desktop/clients.workSurveys.png) · [موبايل](visual-baseline/mobile/clients.workSurveys.png) |
| LEG-0016 | [المقايسات](#clientsboqs) | العملاء والمشاريع | legacy /legacy/ | 8 | 1 | [ديسكتوب](visual-baseline/desktop/clients.boqs.png) · [موبايل](visual-baseline/mobile/clients.boqs.png) |
| LEG-0017 | [العقود](#clientscontracts) | العملاء والمشاريع | legacy /legacy/ | 8 | 1 | [ديسكتوب](visual-baseline/desktop/clients.contracts.png) · [موبايل](visual-baseline/mobile/clients.contracts.png) |
| LEG-0018 | [المستخلصات](#clientsinvoices) | العملاء والمشاريع | legacy /legacy/ | 8 | 1 | [ديسكتوب](visual-baseline/desktop/clients.invoices.png) · [موبايل](visual-baseline/mobile/clients.invoices.png) |
| LEG-0019 | [الضمانات](#clientsguarantees) | العملاء والمشاريع | legacy /legacy/ | 5 | 1 | [ديسكتوب](visual-baseline/desktop/clients.guarantees.png) · [موبايل](visual-baseline/mobile/clients.guarantees.png) |
| LEG-0020 | [المقارنة](#clientscomparison) | العملاء والمشاريع | legacy /legacy/ | 3 | 0 | [ديسكتوب](visual-baseline/desktop/clients.comparison.png) · [موبايل](visual-baseline/mobile/clients.comparison.png) |
| LEG-0021 | [CRM](#clientscrm) | العملاء والمشاريع | legacy /legacy/ | 8 | 1 | [ديسكتوب](visual-baseline/desktop/clients.crm.png) · [موبايل](visual-baseline/mobile/clients.crm.png) |
| LEG-0022 | [الموردون](#ledgersuppliers) | الموردون | angular /suppliers | 6 | 1 | [ديسكتوب](visual-baseline/desktop/ledger.suppliers.png) · [موبايل](visual-baseline/mobile/ledger.suppliers.png) |
| LEG-0023 | [الفواتير](#ledgerinvoices) | الموردون | angular /supplier-invoices | 14 | 3 | [ديسكتوب](visual-baseline/desktop/ledger.invoices.png) · [موبايل](visual-baseline/mobile/ledger.invoices.png) |
| LEG-0024 | [إشعارات الخصم](#ledgerquarterly) | الموردون | legacy /legacy/ | 17 | 2 | [ديسكتوب](visual-baseline/desktop/ledger.quarterly.png) · [موبايل](visual-baseline/mobile/ledger.quarterly.png) |
| LEG-0025 | [المرتجعات](#ledgerreturns) | الموردون | angular /supplier-returns | 9 | 2 | [ديسكتوب](visual-baseline/desktop/ledger.returns.png) · [موبايل](visual-baseline/mobile/ledger.returns.png) |
| LEG-0026 | [المخازن](#warehouseshome) | المخازن | angular /warehouses | 11 | 3 | [ديسكتوب](visual-baseline/desktop/warehouses.home.png) · [موبايل](visual-baseline/mobile/warehouses.home.png) |
| LEG-0027 | [تقارير المخازن](#warehousesreports) | المخازن | legacy /legacy/ | 3 | 0 | [ديسكتوب](visual-baseline/desktop/warehouses.reports.png) · [موبايل](visual-baseline/mobile/warehouses.reports.png) |
| LEG-0028 | [حركة الموارد](#transfers) | حركة الموارد | legacy /legacy/ | 6 | 1 | [ديسكتوب](visual-baseline/desktop/transfers.png) · [موبايل](visual-baseline/mobile/transfers.png) |
| LEG-0029 | [المستحقات](#workerDues) | الحسابات | legacy /legacy/ | 8 | 0 | [ديسكتوب](visual-baseline/desktop/workerDues.png) · [موبايل](visual-baseline/mobile/workerDues.png) |
| LEG-0030 | [الدفعات](#ledgerpayments) | الحسابات | angular /supplier-payments | 12 | 3 | [ديسكتوب](visual-baseline/desktop/ledger.payments.png) · [موبايل](visual-baseline/mobile/ledger.payments.png) |
| LEG-0031 | [مصاريف شاملة](#expenses) | الحسابات | legacy /legacy/ | 9 | 0 | [ديسكتوب](visual-baseline/desktop/expenses.png) · [موبايل](visual-baseline/mobile/expenses.png) |
| LEG-0032 | [تكاليف شاملة](#costs) | الحسابات | legacy /legacy/ | 9 | 0 | [ديسكتوب](visual-baseline/desktop/costs.png) · [موبايل](visual-baseline/mobile/costs.png) |
| LEG-0033 | [الإيرادات](#clientscollections) | الحسابات | legacy /legacy/ | 8 | 1 | [ديسكتوب](visual-baseline/desktop/clients.collections.png) · [موبايل](visual-baseline/mobile/clients.collections.png) |
| LEG-0034 | [حسابات العملاء](#clientsaccounts) | الحسابات | legacy /legacy/ | 5 | 1 | [ديسكتوب](visual-baseline/desktop/clients.accounts.png) · [موبايل](visual-baseline/mobile/clients.accounts.png) |
| LEG-0035 | [تقارير الموارد البشرية](#reports) | التقارير | legacy /legacy/ | 27 | 0 | [ديسكتوب](visual-baseline/desktop/reports.png) · [موبايل](visual-baseline/mobile/reports.png) |
| LEG-0036 | [تقارير العملاء والمشاريع](#clientsreports) | التقارير | legacy /legacy/ | 3 | 0 | [ديسكتوب](visual-baseline/desktop/clients.reports.png) · [موبايل](visual-baseline/mobile/clients.reports.png) |
| LEG-0037 | [تقارير الموردين](#ledgerreports) | التقارير | legacy /legacy/ | 16 | 2 | [ديسكتوب](visual-baseline/desktop/ledger.reports.png) · [موبايل](visual-baseline/mobile/ledger.reports.png) |
| LEG-0038 | [تقارير الحسابات](#accountsreports) | التقارير | legacy /legacy/ | 3 | 0 | [ديسكتوب](visual-baseline/desktop/accounts.reports.png) · [موبايل](visual-baseline/mobile/accounts.reports.png) |
| LEG-0039 | [أرشيف الموارد البشرية](#archive) | الأرشيف | legacy /legacy/ | 9 | 1 | [ديسكتوب](visual-baseline/desktop/archive.png) · [موبايل](visual-baseline/mobile/archive.png) |
| LEG-0040 | [أرشيف الموردين](#ledgerarchive) | الأرشيف | legacy /legacy/ | 5 | 1 | [ديسكتوب](visual-baseline/desktop/ledger.archive.png) · [موبايل](visual-baseline/mobile/ledger.archive.png) |
| LEG-0041 | [أرشيف العملاء والمشاريع](#clientsarchive) | الأرشيف | legacy /legacy/ | 4 | 0 | [ديسكتوب](visual-baseline/desktop/clients.archive.png) · [موبايل](visual-baseline/mobile/clients.archive.png) |
| LEG-0042 | [الإعدادات العامة](#backup) | الإعدادات | legacy /legacy/ | 115 | 6 | [ديسكتوب](visual-baseline/desktop/backup.png) · [موبايل](visual-baseline/mobile/backup.png) |
| LEG-0043 | [المستخدمون](#users) | الإعدادات | legacy /legacy/ | 6 | 2 | [ديسكتوب](visual-baseline/desktop/users.png) · [موبايل](visual-baseline/mobile/users.png) |
| LEG-0044 | [الاقتراحات](#ledgercategories) | الإعدادات | legacy /legacy/ | 8 | 2 | [ديسكتوب](visual-baseline/desktop/ledger.categories.png) · [موبايل](visual-baseline/mobile/ledger.categories.png) |
| LEG-0045 | [clients.dashboard](#clientsdashboard) | — | legacy /legacy/ | 53 | 1 | [ديسكتوب](visual-baseline/desktop/clients.dashboard.png) |
| LEG-0046 | [fuel](#fuel) | — | legacy /legacy/ | 7 | 0 | [ديسكتوب](visual-baseline/desktop/fuel.png) |
| LEG-0047 | [documents](#documents) | — | legacy /legacy/ | 9 | 1 | [ديسكتوب](visual-baseline/desktop/documents.png) |
| LEG-0048 | [assistant](#assistant) | — | legacy /legacy/ | 53 | 1 | [ديسكتوب](visual-baseline/desktop/assistant.png) |
| LEG-0049 | [departments](#departments) | — | legacy /legacy/ | 9 | 0 | [ديسكتوب](visual-baseline/desktop/departments.png) |
| LEG-0050 | [payroll](#payroll) | — | legacy /legacy/ | 8 | 0 | [ديسكتوب](visual-baseline/desktop/payroll.png) |
| LEG-0051 | [employeeDetail](#employeeDetail) | — | legacy /legacy/ | 1 | 0 | [ديسكتوب](visual-baseline/desktop/employeeDetail.png) |
| LEG-0052 | [personDetail](#personDetail) | — | legacy /legacy/ | 1 | 0 | [ديسكتوب](visual-baseline/desktop/personDetail.png) |
| LEG-0053 | [ledger.dashboard](#ledgerdashboard) | — | legacy /legacy/ | 53 | 1 | [ديسكتوب](visual-baseline/desktop/ledger.dashboard.png) |
| LEG-0054 | [general.overview](#generaloverview) | — | legacy /legacy/ | 53 | 1 | [ديسكتوب](visual-baseline/desktop/general.overview.png) |

### <a id="dashboard"></a>🧭 مركز المتابعة — `dashboard` — LEG-0001
- **القسم:** 🧭 مركز المتابعة · **في القايمة:** أيوه · **دالة الرسم:** `renderDashboardPage` (renderer/modules/hr/pages-dashboard.js:28)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase16.js، phase20.js، phase38.js، phase61.js
- **العنوان الظاهر:** 🧭 مركز المتابعة · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/dashboard.png) · [موبايل](visual-baseline/mobile/dashboard.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | ＋ مهمة جديدة |
| بحث/فلترة | 🔍 بحث شامل |
| تنقّل | فتح كل المهام ← |
| أخرى | ↻ تحديث · كل السنوات · 2026 · 👥 العملاء 2 · 🏗️ المشاريع 4 50 ج.م · 📐 أعمال الحصر 0 · 📋 المقايسات 0 · 📑 العقود 0 0 ج.م · 🧾 المستخلصات 0 0 ج.م · 🟢 مشاريع نشطة 4 · 🛡️ الضمانات 0 · 🏭 الموردون 2 · 🧾 فواتير الموردين 2 50 ج.م · 💳 الدفعات 2 50 ج.م · ↩️ المرتجعات 0 0 ج.م · 💸 مستحق للموردين 50 ج.م · 🔔 إشعارات الخصم 2 50 ج.م · 🏬 المخازن 1 · 📦 الأصناف 1 · 💎 قيمة المخزون 6 ج.م · ⚠️ تحت الحد الأدنى 0 · 👔 الموظفون 2 2 نشط · 🧑‍🔧 العمال 2 2 نشط · 👷 المشرفون 2 2 نشط · 🧑‍🚒 السائقون 2 2 نشط · 🛻 معدات ومركبات 2 2 عاملة · 🧮 المصاريف الشاملة 0 0 ج.م · 📊 التكاليف الشاملة 3 3,930 ج.م مشروع عليه تكلفة · 💰 الإيرادات 0 0 ج.م تحصيل · الكل (15) · الموارد البشرية (12) · الموردون (1) · المخازن (0) · العملاء والمشاريع (0) · الحسابات والتكاليف (2) · سن المعاش (0) · ⏰ المؤجَّلة والمنجزة (0) · 📅 لا حضور عمال/سائقين مسجّل اليوم لم يُسجَّل أي يومية اليوم ⏰ تأجيل أسبوع ✓ تم · ⏰ تأجيل أسبوع · ✓ تم · 💰 متبقي مستحقات عمال/سائقين هذا الشهر: ٨٧٠ ج.م صافي مستحقات الشهر: ٨٧٠ ج.م ⏰ تأ · 🔴 تجاوز ميزانية: نص name 1 إجمالي ١٬٣٠٠ ج.م من ميزانية ٢٠ ج.م ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 نص code 1 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 ناقص: صورة البطاقة الشخصية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 فاتورة نص invoiceNo 2 — نص name 1 المتبقي: ٣٠ ج.م ⏰ تأجيل أسبوع ✓ تم · 🔗 1 اسم مشروع مكتوب في سجلات ومالوش مشروع مسجّل مشروع (1 سجل) ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 — تجاوز الميزانية التكلفة: ١٬٣٠٠ ج.م ⏰ تأجيل أسبوع ✓ تم |

**الجداول:** (1) البند، القيمة، النسبة — 9 صف
**الخانات (3):** 📅، 📅، 🔍 بحث في التنبيهات…


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| ＋ مهمة جديدة | أيوه | ＋ مهمة جديدة × | 3: اختر أو اكتب الاسم، مثال: متابعة توريد الحديد لمشروع الشروق، الموظف / المسؤول | ×، حفظ، إلغاء | [لقطة](visual-baseline/dialogs/dashboard__1.png) |

### <a id="tasksmy"></a>مهامي — `tasks.my` — LEG-0002
- **القسم:** مهامي · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsTasksPage` (renderer/modules/clients/pages-tasks.js:38)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** مهامي · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/tasks.my.png) · [موبايل](visual-baseline/mobile/tasks.my.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| حذف | مسح |
| تنقّل | السابق · التالي |
| أخرى | ◀ الأقسام |

**الجداول:** (1) النوع، المعرف، العنوان، العميل، الحالة، المسؤول — 1 صف
**الخانات (3):** بحث...، مهامي فقط، مهامي فقط


### <a id="hrHome"></a>🏠 لوحات الموارد البشرية — `hrHome` — LEG-0003
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderHrHomePage` (renderer/core/boards.js:172)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase22.js
- **العنوان الظاهر:** 👥 لوحات الموارد البشرية · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/hrHome.png) · [موبايل](visual-baseline/mobile/hrHome.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تنقّل | 👔 الموظفون 2 نشط 2 2 الموظفين اضغط للدخول ← · 👷 المشرفون 2 نشط 2 2 المشرفين اضغط للدخول ← · 🧑‍🔧 العمال 2 نشط 2 2 عمال الشركة اضغط للدخول ← · 🧑‍🚒 السائقون 2 نشط 2 2 سائقين الشركة اضغط للدخول ← · 🛻 معدات ومركبات 2 نشط 2 لا أقسام بعد اضغط للدخول ← · 🕒 حضور الموظفين سجل 0 اضغط للدخول ← · 📅 اليوميات سجل 2 اضغط للدخول ← · 🏖️ الإجازات إجازة 2 اضغط للدخول ← · ⭐ تقييم الأداء تقييم 0 اضغط للدخول ← |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="employees"></a>الموظفين — `employees` — LEG-0004
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderEmployeesPage` (renderer/modules/hr/pages-employees.js:77)
- **المكان المستهدف:** angular /employees · **الاختبارات:** phase22.js، phase26.js، phase27.js، phase28.js، phase29.js، phase30.js، phase31.js، phase32.js، phase33.js، phase34.js، phase35.js، phase36.js، phase38.js، phase39.js، phase40.js، phase42.js، phase44.js، phase45.js، phase49.js، phase51.js، phase52.js
- **العنوان الظاهر:** الموظفين · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/employees.png) · [موبايل](visual-baseline/mobile/employees.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| أخرى | ◀ الموارد البشرية · 📋 2 الكل اضغط للدخول · 📂 0 بدون قسم أو وظيفة اضغط للدخول · 🚪 0 المستقيلين اضغط للدخول · 🏖️ 0 المعاشات اضغط للدخول · 👔 2 الموظفين اضغط للدخول |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="supervisors"></a>المشرفون — `supervisors` — LEG-0005
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderSupervisorsPage` (renderer/modules/hr/pages-supervisors.js:12)
- **المكان المستهدف:** angular /supervisors · **الاختبارات:** phase27.js، phase42.js، phase43.js، phase49.js، phase50.js، phase53.js، phase54.js
- **العنوان الظاهر:** المشرفون · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/supervisors.png) · [موبايل](visual-baseline/mobile/supervisors.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| أخرى | ◀ الموارد البشرية · 📋 2 الكل اضغط للدخول · 📂 0 بدون قسم أو وظيفة اضغط للدخول · 🚪 0 المستقيلين اضغط للدخول · 🏖️ 0 المعاشات اضغط للدخول · 👷 2 المشرفين اضغط للدخول |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="workers"></a>العمال — `workers` — LEG-0006
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderWorkersPage` (renderer/modules/hr/pages-workers.js:29)
- **المكان المستهدف:** angular /workers · **الاختبارات:** phase24.js، phase26.js، phase27.js، phase28.js، phase29.js، phase30.js، phase37.js، phase39.js، phase40.js، phase41.js، phase42.js، phase43.js، phase45.js، phase47.js، phase49.js، phase50.js، phase51.js، phase52.js، phase53.js، phase61.js
- **العنوان الظاهر:** العمال · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/workers.png) · [موبايل](visual-baseline/mobile/workers.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| أخرى | ◀ الموارد البشرية · 📋 2 الكل اضغط للدخول · 📂 0 بدون قسم أو وظيفة اضغط للدخول · 🚪 0 المستقيلين اضغط للدخول · 🏖️ 0 المعاشات اضغط للدخول · 🧑‍🔧 2 عمال الشركة اضغط للدخول · 🧑‍🔧 0 عمالة مؤقتة اضغط للدخول |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="drivers"></a>السائقون — `drivers` — LEG-0007
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderDriversPage` (renderer/modules/hr/pages-ops.js:6)
- **المكان المستهدف:** angular /drivers · **الاختبارات:** phase27.js، phase42.js، phase44.js، phase45.js، phase49.js، phase50.js، phase51.js
- **العنوان الظاهر:** السائقون · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/drivers.png) · [موبايل](visual-baseline/mobile/drivers.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| أخرى | ◀ الموارد البشرية · 📋 2 الكل اضغط للدخول · 📂 0 بدون قسم أو وظيفة اضغط للدخول · 🚪 0 المستقيلين اضغط للدخول · 🏖️ 0 المعاشات اضغط للدخول · 🧑‍🚒 2 سائقين الشركة اضغط للدخول · 🧑‍🚒 0 سائقون من خارج الشركة اضغط للدخول |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="equipment"></a>معدات ومركبات — `equipment` — LEG-0008
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderEquipmentPage` (renderer/modules/hr/pages-equipment.js:32)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase23.js، phase24.js، phase25.js، phase26.js، phase27.js، phase31.js، phase32.js، phase39.js، phase40.js، phase42.js، phase44.js، phase53.js، phase54.js، phase61.js
- **العنوان الظاهر:** المعدات والمركبات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/equipment.png) · [موبايل](visual-baseline/mobile/equipment.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| أخرى | ◀ الموارد البشرية · 📋 2 الكل اضغط للدخول · 📂 0 بدون قسم أو نوع ترخيص اضغط للدخول · 🛻 0 المعدات اضغط للدخول · 🛻 0 السيارات الملاكى اضغط للدخول · 🛻 0 سيارات النقل اضغط للدخول · 🛻 0 سيارات خارجية اضغط للدخول |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="attendance"></a>حضور الموظفين — `attendance` — LEG-0009
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderAttendancePage` (renderer/modules/hr/pages-attendance.js:19)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** حضور الموظفين · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/attendance.png) · [موبايل](visual-baseline/mobile/attendance.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + تسجيل حضور |
| تصدير | إكسيل · CSV |
| تنقّل | السابق · التالي |
| أخرى | ◀ الموارد البشرية |

**الجداول:** (1) التاريخ، الموظف، الحالة، وقت الحضور، وقت الانصراف، ملاحظات — 1 صف
**الخانات (6):** بحث، القسم، الموظف، الحالة، من، إلى


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + تسجيل حضور | أيوه | تسجيل حضور موظف × | 7: التاريخ، القسم، الموظف، الحالة، وقت الحضور، وقت الانصراف، ملاحظات | ×، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/attendance__1.png) |

### <a id="workerAttendance"></a>اليوميات — `workerAttendance` — LEG-0010
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderWorkerAttendancePage` (renderer/modules/hr/pages-worker-attendance.js:195)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase24.js، phase26.js، phase27.js، phase28.js، phase39.js، phase40.js، phase41.js، phase43.js، phase49.js، phase50.js، phase51.js، phase53.js
- **العنوان الظاهر:** العمال · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/workerAttendance.png) · [موبايل](visual-baseline/mobile/workerAttendance.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تنقّل | ← كل اليوميات |
| أخرى | ◀ الموارد البشرية · 📂 الكل 2 سجل · 📁 يوميات عمالة الشركة 2 سجل · 📁 يوميات عمالة مؤقتة 0 سجل |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="leaves"></a>الإجازات — `leaves` — LEG-0011
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderLeavesPage` (renderer/modules/hr/pages-leaves.js:48)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase41.js
- **العنوان الظاهر:** الإجازات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/leaves.png) · [موبايل](visual-baseline/mobile/leaves.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + طلب إجازة ← `openLeaveModal` |
| حذف | 🗑️ |
| تعديل | ✏️ |
| تصدير | إكسيل · CSV |
| تنقّل | السابق · التالي |
| أخرى | ◀ الموارد البشرية · تطبيق · 🧾 |

**الجداول:** (1) الاسم، الفئة، النوع، من، إلى، أيام، الحالة، السبب — 2 صف
**الخانات (6):** بحث بالاسم / السبب...، من، من، من، من، إلى
**مربوط بالسجل:** LEG-0196 (نافذة openLeaveModal)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + طلب إجازة | أيوه | طلب إجازة × | 8: الفئة *، القسم، الشخص *، نوع الإجازة، عدد الأيام، من تاريخ، إلى تاريخ، السبب | ×، إلغاء، إرسال الطلب | [لقطة](visual-baseline/dialogs/leaves__1.png) |
| ✏️ | أيوه | تعديل إجازة × | 8: الفئة *، القسم، الشخص *، نوع الإجازة، عدد الأيام، من تاريخ، إلى تاريخ، السبب | ×، إلغاء، حفظ التعديل | [لقطة](visual-baseline/dialogs/leaves__2.png) |

### <a id="performance"></a>تقييم الأداء — `performance` — LEG-0012
- **القسم:** الموارد البشرية · **في القايمة:** أيوه · **دالة الرسم:** `renderPerformancePage` (renderer/modules/hr/pages-ops.js:540)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** تقييم الأداء · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/performance.png) · [موبايل](visual-baseline/mobile/performance.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + تقييم جديد ← `openPerfModal` · + تقييم الموظفين · + تقييم العمال · + تقييم المشرفون · + تقييم السائقون |
| أخرى | ◀ الموارد البشرية |

**الجداول:** (1) التاريخ، الاسم، الالتزام، الحضور، الإنتاجية، الجودة، تقييم المدير، المخالفات، المجموع — 1 صف · (2) التاريخ، الاسم، الالتزام، الحضور، الإنتاجية، الجودة، تقييم المدير، المخالفات، المجموع — 1 صف · (3) التاريخ، الاسم، الالتزام، الحضور، الإنتاجية، الجودة، تقييم المدير، المخالفات، المجموع — 1 صف · (4) التاريخ، الاسم، الالتزام، الحضور، الإنتاجية، الجودة، تقييم المدير، المخالفات، المجموع — 1 صف
**الخانات (0):** —
**مربوط بالسجل:** LEG-0202 (نافذة openPerfModal)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + تقييم جديد | أيوه | تقييم أداء × | 10: الفئة *، التاريخ، الشخص *، الالتزام (1-10)، الحضور (1-10)، الإنتاجية (1-10)، جودة العمل (1-10)، عدد المخالفات، تقييم المدير (1-10)، ملاحظات | ×، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/performance__1.png) |
| + تقييم الموظفين | أيوه | تقييم أداء × | 10: الفئة *، التاريخ، الشخص *، الالتزام (1-10)، الحضور (1-10)، الإنتاجية (1-10)، جودة العمل (1-10)، عدد المخالفات، تقييم المدير (1-10)، ملاحظات | ×، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/performance__2.png) |
| + تقييم العمال | أيوه | تقييم أداء × | 10: الفئة *، التاريخ، الشخص *، الالتزام (1-10)، الحضور (1-10)، الإنتاجية (1-10)، جودة العمل (1-10)، عدد المخالفات، تقييم المدير (1-10)، ملاحظات | ×، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/performance__3.png) |
| + تقييم المشرفون | أيوه | تقييم أداء × | 10: الفئة *، التاريخ، الشخص *، الالتزام (1-10)، الحضور (1-10)، الإنتاجية (1-10)، جودة العمل (1-10)، عدد المخالفات، تقييم المدير (1-10)، ملاحظات | ×، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/performance__4.png) |
| + تقييم السائقون | أيوه | تقييم أداء × | 10: الفئة *، التاريخ، الشخص *، الالتزام (1-10)، الحضور (1-10)، الإنتاجية (1-10)، جودة العمل (1-10)، عدد المخالفات، تقييم المدير (1-10)، ملاحظات | ×، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/performance__5.png) |

### <a id="clientscustomers"></a>العملاء — `clients.customers` — LEG-0013
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsCustomersPage` (renderer/modules/clients/pages-customers.js:14)
- **المكان المستهدف:** angular /customers · **الاختبارات:** phase2.js، phase5.js، phase7.js، phase15.js، phase19.js، phase46.js، phase48.js، phase55.js، pages-smoke.js
- **العنوان الظاهر:** العملاء · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.customers.png) · [موبايل](visual-baseline/mobile/clients.customers.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + عميل ← `openCustomerModal` |
| حذف | 🗑️ |
| تعديل | ✏️ |
| تصدير | إكسيل · CSV |
| بحث/فلترة | مسح الفلاتر |
| تنقّل | السابق · التالي |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام |
| عرض/تفاصيل | 👁️ |

**الجداول:** (1) الكود، العميل، الهاتف، المدينة، القسم، مشاريع، عقود، مستخلصات، أعمال الحصر، المقايسات، ملاحظات — 2 صف
**الخانات (5):** بحث: اسم، كود، هاتف، قسم...، custDept، custProject، custInvoice، custSurvey
**مربوط بالسجل:** LEG-0164 (نافذة openCustomerModal)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + عميل | أيوه | عميل جديد × | 12: الكود، اسم العميل، الهاتف، البريد، المدينة، التصنيف، الرقم الضريبي، القسم، رصيد افتتاحي (ج.م)، العنوان، ملاحظات، نوع المستند * (اكتب للبحث أو أضف نوعاً جديداً) | ×، + جهة اتصال، 📎 إرفاق مستند، 📷 مسح / كاميرا، رفع ملف، حذف نوع من القائمة، إخفاء، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/clients.customers__1.png) |
| 👁️ | لأ | — | — | — | — |
| ✏️ | لأ | — | — | — | — |

### <a id="projects"></a>المشاريع — `projects` — LEG-0014
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderProjectsPage` (renderer/modules/hr/pages-projects.js:60)
- **المكان المستهدف:** angular /projects · **الاختبارات:** phase2.js، phase3.js، phase4.js، phase15.js، phase17.js، phase18.js، phase19.js، phase22.js، phase56.js، phase57.js، phase58.js
- **العنوان الظاهر:** المشاريع · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/projects.png) · [موبايل](visual-baseline/mobile/projects.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + مشروع ← `openProjectModal` |
| حذف | 🗑️ |
| تعديل | ✏️ |
| تصدير | إكسيل · CSV |
| بحث/فلترة | مسح الفلاتر |
| تنقّل | السابق · التالي |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام |
| عرض/تفاصيل | 👁️ |

**الجداول:** (1) الكود، المشروع، العميل، المرحلة، القيمة، التقدم، موارد، التكلفة، ملاحظات — 4 صف
**الخانات (4):** بحث: اسم، كود، عميل، عقد، ملاحظات...، projStatus، projHasRes، projBudget
**مربوط بالسجل:** LEG-0213 (نافذة openProjectModal)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + مشروع | أيوه | مشروع جديد × | 13: الكود، الاسم، العميل، رقم العقد، قيمة المشروع (ج.م)، الميزانية، تاريخ البداية، تاريخ النهاية المتوقع، نسبة الإنجاز %، الحالة، مشرف المشروع، المسؤول (تعيين) | ×، 📎 إرفاق مستند، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/projects__1.png) |
| 👁️ | لأ | — | — | — | — |
| ✏️ | لأ | — | — | — | — |

### <a id="clientsworkSurveys"></a>أعمال الحصر — `clients.workSurveys` — LEG-0015
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsWorkSurveysPage` (renderer/modules/clients/pages-work-surveys.js:74)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase9.js
- **العنوان الظاهر:** أعمال الحصر · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.workSurveys.png) · [موبايل](visual-baseline/mobile/clients.workSurveys.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + حصر |
| تصدير | إكسيل · CSV |
| بحث/فلترة | مسح الفلاتر |
| تنقّل | السابق · التالي |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام |

**الجداول:** (1) الكود، العميل، المشروع، نوع العمل، التاريخ، الحالة، الإجمالي — 1 صف
**الخانات (3):** بحث: كود، مشروع، موقع، عميل...، wsCustomer، wsStatus


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + حصر | أيوه | عمل حصر جديد × | 22: الكود، العميل *، المشروع، نوع العمل، الموقع، تاريخ التنفيذ، المهندس / المسؤول، المشرف، الحالة، ملاحظات | ×، + بند، 🗑️، 📎 إرفاق مستند، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/clients.workSurveys__1.png) |

### <a id="clientsboqs"></a>المقايسات — `clients.boqs` — LEG-0016
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsBoqsPage` (renderer/modules/clients/pages-boqs.js:45)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase2.js، phase9.js
- **العنوان الظاهر:** المقايسات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.boqs.png) · [موبايل](visual-baseline/mobile/clients.boqs.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + مقايسة |
| تصدير | إكسيل · CSV |
| بحث/فلترة | مسح الفلاتر |
| تنقّل | السابق · التالي |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام |

**الجداول:** (1) الكود، العنوان، العميل، المشروع، بنود، الإجمالي — 1 صف
**الخانات (2):** بحث: كود، عنوان، مشروع، عميل...، boqCustomer


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + مقايسة | أيوه | مقايسة جديدة × | 16: الكود، العميل *، العنوان، المشروع، أعمال حصر مرتبطة Ctrl لاختيار أكثر من حصر، ملاحظات | ×، + بند، 🗑️، 📎 إرفاق مستند، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/clients.boqs__1.png) |

### <a id="clientscontracts"></a>العقود — `clients.contracts` — LEG-0017
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsContractsPage` (renderer/modules/clients/pages-contracts.js:28)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase5.js، phase7.js، phase12.js، phase14.js، phase15.js
- **العنوان الظاهر:** العقود · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.contracts.png) · [موبايل](visual-baseline/mobile/clients.contracts.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + عقد |
| تصدير | إكسيل · CSV |
| بحث/فلترة | مسح الفلاتر |
| تنقّل | السابق · التالي |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام |

**الجداول:** (1) الكود، العنوان، العميل، المشروع، القيمة، الفترة، الحالة، ملاحظات — 1 صف
**الخانات (3):** بحث: كود، عنوان، مشروع، عميل...، ctCustomer، ctStatus


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + عقد | أيوه | عقد جديد × | 14: كود العقد، العميل *، عنوان العقد، المشروع، القيمة، الحالة، تاريخ البداية، تاريخ النهاية، تاريخ العقد، نسبة الاحتجاز %، المقايسة المرتبطة، شروط الدفع | ×، 📎 إرفاق مستند، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/clients.contracts__1.png) |

### <a id="clientsinvoices"></a>المستخلصات — `clients.invoices` — LEG-0018
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsInvoicesPage` (renderer/modules/clients/pages-invoices.js:42)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase9.js، phase12.js
- **العنوان الظاهر:** المستخلصات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.invoices.png) · [موبايل](visual-baseline/mobile/clients.invoices.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + مستخلص |
| تصدير | إكسيل · CSV |
| بحث/فلترة | مسح الفلاتر |
| تنقّل | السابق · التالي |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام |

**الجداول:** (1) الرقم، العميل، المشروع، التاريخ، الصافي، المدفوع، الحالة، ملاحظات — 1 صف
**الخانات (3):** بحث: رقم، مشروع، عميل، عقد...، ciCustomer، ciStatus


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + مستخلص | أيوه | مستخلص جديد × | 17: العميل *، رقم المستخلص، المشروع، التاريخ، العقد، التصنيف، قيمة الأعمال، أعمال سابقة، إضافات، مستبعد، استقطاعات، خصم دفعة مقدمة | ×، 📎 إرفاق مستند، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/clients.invoices__1.png) |

### <a id="clientsguarantees"></a>الضمانات — `clients.guarantees` — LEG-0019
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsGuaranteesPage` (renderer/modules/clients/guarantees.js:176)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase5.js، phase6.js
- **العنوان الظاهر:** خطابات الضمان · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.guarantees.png) · [موبايل](visual-baseline/mobile/clients.guarantees.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + ضمان |
| تصدير | إكسيل · CSV |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام |

**الجداول:** مفيش
**الخانات (4):** بحث…، garCust، garStatus، garType


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + ضمان | أيوه | ضمان جديد × | 13: الكود، العميل *، العقد، المشروع، النوع، الحالة، رقم الخطاب، البنك، المبلغ، النسبة من العقد %، تاريخ الإصدار، تاريخ الانتهاء | ×، 📎 إرفاق مستند، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/clients.guarantees__1.png) |

### <a id="clientscomparison"></a>المقارنة — `clients.comparison` — LEG-0020
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsComparisonPage` (renderer/modules/clients/comparison.js:62)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase11.js، phase12.js، phase14.js
- **العنوان الظاهر:** المقارنة وربط السلسلة · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.comparison.png) · [موبايل](visual-baseline/mobile/clients.comparison.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ العملاء والمشاريع |

**الجداول:** (1) كود، البند، كمية حصر، قيمة حصر، كمية مقايسة، قيمة مقايسة، فرق كمية، فرق قيمة، الحالة — 1 صف
**الخانات (4):** العميل، العقد، الحصر، المقايسة


### <a id="clientscrm"></a>CRM — `clients.crm` — LEG-0021
- **القسم:** العملاء والمشاريع · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsCrmPage` (renderer/modules/clients/pages-crm.js:40)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** CRM · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.crm.png) · [موبايل](visual-baseline/mobile/clients.crm.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + فرصة |
| حذف | مسح |
| تنقّل | السابق · التالي |
| أخرى | ◀ العملاء والمشاريع · ◀ الأقسام · الفرص · الأنشطة |

**الجداول:** (1) الكود، الفرصة، العميل، المرحلة، القيمة المتوقعة، التالي — 1 صف
**الخانات (2):** بحث في الفرص...، crmStage


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + فرصة | أيوه | فرصة جديدة × | 9: العميل *، الكود، عنوان الفرصة *، المرحلة، القيمة المتوقعة، المصدر، متابعة بتاريخ، تاريخ، ملاحظات | ×، إلغاء، حفظ | [لقطة](visual-baseline/dialogs/clients.crm__1.png) |

### <a id="ledgersuppliers"></a>الموردون — `ledger.suppliers` — LEG-0022
- **القسم:** الموردون · **في القايمة:** أيوه · **دالة الرسم:** `renderSuppliersPage` (renderer/modules/ledger/pages-suppliers.js:3)
- **المكان المستهدف:** angular /suppliers · **الاختبارات:** phase60.js، phase61.js
- **العنوان الظاهر:** النظام الموحد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.suppliers.png) · [موبايل](visual-baseline/mobile/ledger.suppliers.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إضافة مورد جديد ← `openAddSupplierModal` |
| تصدير | تصدير الموردين (الظاهرين) Excel ← `exportSuppliersCsv` |
| أخرى | ✓ فحص البيانات ← `openGlobalValidationModal` · ⌨ اختصارات الدفتر ← `lgOpenShortcutsHelp` · ⚙️ الإعدادات ← `goToPage` · ◀ الموردون |

**الجداول:** مفيش
**الخانات (3):** اسم، رقم ضريبي، سجل، هاتف، رقم فاتورة/دفعة...، supBalanceFilter، supSortMode
**مربوط بالسجل:** LEG-0231 (نافذة openGlobalValidationModal) · LEG-0258 (نافذة openAddSupplierModal) · LEG-0235 (تصدير/طباعة exportSuppliersCsv)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + | لأ | — | — | — | — |
| + إضافة مورد جديد | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.suppliers__2.png) |

### <a id="ledgerinvoices"></a>الفواتير — `ledger.invoices` — LEG-0023
- **القسم:** الموردون · **في القايمة:** أيوه · **دالة الرسم:** `renderInvoicesPage` (renderer/modules/ledger/pages-invoices.js:35)
- **المكان المستهدف:** angular /supplier-invoices · **الاختبارات:** phase16.js
- **العنوان الظاهر:** النظام الموحد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.invoices.png) · [موبايل](visual-baseline/mobile/ledger.invoices.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إضافة فاتورة ← `openAddEditInvoiceModal` |
| تصدير | تصدير Excel (النتائج الظاهرة) ← `exportAllInvoicesCsv` |
| تنقّل | السابق · التالي |
| أخرى | ✓ فحص البيانات ← `openGlobalValidationModal` · ⌨ اختصارات الدفتر ← `lgOpenShortcutsHelp` · ⚙️ الإعدادات ← `goToPage` · ◀ الموردون · ◀ الأقسام · فواتير متأخرة فقط · 🧾 · ✎ · ✕ |
| عرض/تفاصيل | 👁 |

**الجداول:** (1) رقم الفاتورة، التاريخ، المورد، البيان، كود داخلي، كود المورد، نوع الفاتورة، المشروع، طبيعة التعامل، نوع الخصم، القيمة الإجمالية، الضريبة، الدمغات، إجمالي الفاتورة، المخصوم، الصافي — 2 صف
**الخانات (13):** رقم فاتورة، مورد، رقم ضريبي، بيان، كود، مبلغ، ملاحظات... (كل، كل الموردين — ابحث...، كل التصنيفات — ابحث...، كل المشاريع — ابحث...، السنة، من تاريخ، إلى تاريخ، الشهر، الحالة، الخصم، ٠، ∞، الترتيب
**مربوط بالسجل:** LEG-0231 (نافذة openGlobalValidationModal) · LEG-0261 (نافذة openAddEditInvoiceModal) · LEG-0236 (تصدير/طباعة exportAllInvoicesCsv)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.invoices__1.png) |
| + إضافة فاتورة | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.invoices__2.png) |
| 👁 | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.invoices__3.png) |

### <a id="ledgerquarterly"></a>إشعارات الخصم — `ledger.quarterly` — LEG-0024
- **القسم:** الموردون · **في القايمة:** أيوه · **دالة الرسم:** `renderQuarterlyPage` (renderer/modules/ledger/pages-quarterly.js:39)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** النظام الموحد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.quarterly.png) · [موبايل](visual-baseline/mobile/ledger.quarterly.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | تصدير إشعارات PDF |
| تنقّل | السابق · التالي |
| أخرى | ✓ فحص البيانات ← `openGlobalValidationModal` · ⌨ اختصارات الدفتر ← `lgOpenShortcutsHelp` · ⚙️ الإعدادات ← `goToPage` · ◀ الموردون · ◀ الأقسام · الربع الأول (يناير - مارس) · الربع الثاني (أبريل - يونيو) · الربع الثالث (يوليو - سبتمبر) · الربع الرابع (أكتوبر - ديسمبر) · السنة كاملة · 🧾 · ✎ · ✕ |
| عرض/تفاصيل | 👁 |

**الجداول:** (1) رقم الفاتورة، التاريخ، المورد، البيان، كود داخلي، كود المورد، نوع الفاتورة، المشروع، طبيعة التعامل، نوع الخصم، القيمة الإجمالية، الضريبة، الدمغات، إجمالي الفاتورة، المخصوم، الصافي — 2 صف
**الخانات (11):** مورد، رقم ضريبي، رقم فاتورة، بيان، مبلغ... (كلمات متعددة = ك، السنة، من تاريخ (اختياري)، إلى تاريخ (اختياري)، كل الموردين — ابحث...، الشهر، التصنيف، المشروع، ٠، ∞، الترتيب
**مربوط بالسجل:** LEG-0231 (نافذة openGlobalValidationModal)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.quarterly__1.png) |
| 👁 | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.quarterly__2.png) |

### <a id="ledgerreturns"></a>المرتجعات — `ledger.returns` — LEG-0025
- **القسم:** الموردون · **في القايمة:** أيوه · **دالة الرسم:** `renderInvoicesPage` (renderer/modules/ledger/pages-invoices.js:35)
- **المكان المستهدف:** angular /supplier-returns · **الاختبارات:** phase61.js
- **العنوان الظاهر:** النظام الموحد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.returns.png) · [موبايل](visual-baseline/mobile/ledger.returns.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إضافة مرتجع ← `openAddEditInvoiceModal` |
| تصدير | تصدير Excel (النتائج الظاهرة) ← `exportAllInvoicesCsv` |
| تنقّل | السابق · التالي |
| أخرى | ✓ فحص البيانات ← `openGlobalValidationModal` · ⌨ اختصارات الدفتر ← `lgOpenShortcutsHelp` · ⚙️ الإعدادات ← `goToPage` · ◀ الموردون · ◀ الأقسام |

**الجداول:** (1) رقم الفاتورة، التاريخ، المورد، البيان، كود داخلي، كود المورد، نوع الفاتورة، المشروع، طبيعة التعامل، نوع الخصم، القيمة الإجمالية، الضريبة، الدمغات، إجمالي الفاتورة، المخصوم، الصافي — 1 صف
**الخانات (13):** رقم فاتورة، مورد، رقم ضريبي، بيان، كود، مبلغ، ملاحظات... (كل، كل الموردين — ابحث...، كل التصنيفات — ابحث...، كل المشاريع — ابحث...، السنة، من تاريخ، إلى تاريخ، الشهر، الحالة، الخصم، ٠، ∞، الترتيب
**مربوط بالسجل:** LEG-0231 (نافذة openGlobalValidationModal) · LEG-0261 (نافذة openAddEditInvoiceModal) · LEG-0236 (تصدير/طباعة exportAllInvoicesCsv)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.returns__1.png) |
| + إضافة مرتجع | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.returns__2.png) |

### <a id="warehouseshome"></a>المخازن — `warehouses.home` — LEG-0026
- **القسم:** المخازن · **في القايمة:** أيوه · **دالة الرسم:** `renderWarehousesHomePage` (renderer/modules/warehouses/pages-home.js:6)
- **المكان المستهدف:** angular /warehouses · **الاختبارات:** phase61.js
- **العنوان الظاهر:** المخازن · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/warehouses.home.png) · [موبايل](visual-baseline/mobile/warehouses.home.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + استلام ← `openWhMovementModal` · + صرف ← `openWhMovementModal` · + تحويل ← `openWhMovementModal` |
| تنقّل | السابق · التالي |
| أخرى | ◀ المخازن · ◀ الأقسام · الأرصدة · الأصناف · الحركات · المخازن |

**الجداول:** (1) الكود، الصنف، الوحدة، الرصيد، تكلفة متوسطة، القيمة، ملاحظات — 1 صف
**الخانات (2):** بحث أصناف...، whLoc
**مربوط بالسجل:** LEG-0280 (نافذة openWhMovementModal)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + استلام | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/warehouses.home__1.png) |
| + صرف | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/warehouses.home__2.png) |
| + تحويل | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/warehouses.home__3.png) |

### <a id="warehousesreports"></a>تقارير المخازن — `warehouses.reports` — LEG-0027
- **القسم:** المخازن · **في القايمة:** أيوه · **دالة الرسم:** `renderWarehousesReportsPage` (renderer/modules/warehouses/pages-reports.js:2)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** تقارير المخازن · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/warehouses.reports.png) · [موبايل](visual-baseline/mobile/warehouses.reports.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ المخازن |

**الجداول:** (1) المخزن، أصناف برصيد، القيمة — 1 صف · (2) الكود، الصنف، الرصيد، التكلفة، القيمة — 1 صف
**الخانات (0):** —


### <a id="transfers"></a>حركة الموارد — `transfers` — LEG-0028
- **القسم:** حركة الموارد · **في القايمة:** أيوه · **دالة الرسم:** `renderTransfersPage` (renderer/modules/hr/pages-ops.js:336)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** حركة ونقل الموارد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/transfers.png) · [موبايل](visual-baseline/mobile/transfers.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + أمر نقل ← `openTransferModal` |
| تصدير | إكسيل · CSV |
| تنقّل | السابق · التالي |
| أخرى | تطبيق |

**الجداول:** (1) التاريخ، النوع، الاسم، من، إلى، السائق، السبب — 1 صف
**الخانات (2):** بحث بالاسم / المشروع / السبب...، trFilterKind
**مربوط بالسجل:** LEG-0201 (نافذة openTransferModal)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + أمر نقل | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/transfers__1.png) |

### <a id="workerDues"></a>المستحقات — `workerDues` — LEG-0029
- **القسم:** الحسابات · **في القايمة:** أيوه · **دالة الرسم:** `renderWorkerDuesPage` (renderer/modules/hr/pages-worker-dues.js:79)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** المستحقات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/workerDues.png) · [موبايل](visual-baseline/mobile/workerDues.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ الحسابات · 👔 الموظفين 2 سجل 3 قسم · 👷 المشرفون 2 سجل 3 قسم · 🧑‍🔧 العمال 2 سجل 4 قسم · 🧑‍🚒 السائقون 2 سجل 4 قسم · 🛻 المعدات والمركبات 2 سجل 4 قسم |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="ledgerpayments"></a>الدفعات — `ledger.payments` — LEG-0030
- **القسم:** الحسابات · **في القايمة:** أيوه · **دالة الرسم:** `renderPaymentsPage` (renderer/modules/ledger/pages-payments.js:33)
- **المكان المستهدف:** angular /supplier-payments · **الاختبارات:** phase61.js
- **العنوان الظاهر:** النظام الموحد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.payments.png) · [موبايل](visual-baseline/mobile/ledger.payments.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إضافة دفعة ← `openPaymentModal` |
| تصدير | تصدير Excel (النتائج الظاهرة) ← `exportAllPaymentsCsv` |
| تنقّل | السابق · التالي |
| أخرى | ✓ فحص البيانات ← `openGlobalValidationModal` · ⌨ اختصارات الدفتر ← `lgOpenShortcutsHelp` · ⚙️ الإعدادات ← `goToPage` · ◀ الحسابات · ◀ الأقسام · ✎ · ✕ |
| عرض/تفاصيل | 👁 |

**الجداول:** (1) رقم الدفعة، التاريخ، المورد، النوع، طريقة الدفع، الفاتورة المرتبطة، رقم التحويل / تفاصيل، ملاحظات، المبلغ — 2 صف
**الخانات (12):** رقم الدفعة، مورد، فاتورة، تحويل، مبلغ، ملاحظات... (كلمات متع، السنة، من تاريخ، إلى تاريخ، كل الموردين — ابحث...، الشهر، طريقة الدفع، نوع الحركة، الربط، ٠، ∞، الترتيب
**مربوط بالسجل:** LEG-0231 (نافذة openGlobalValidationModal) · LEG-0260 (نافذة openPaymentModal) · LEG-0237 (تصدير/طباعة exportAllPaymentsCsv)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + | أيوه | إضافة مورد جديد | 11: اسم المورد *، الرقم الضريبي، السجل التجاري، اكتب أو اختر طبيعة النشاط...، ٠، تاريخ الرصيد الافتتاحي، رقم الهاتف، البريد الإلكتروني، العنوان، رقم الحساب البنكي، EG... | + إضافة خانة مخصصة أخرى، + إضافة خانة (هاتف / إيميل / عنوان / حساب بنكي / IBAN)، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة | [لقطة](visual-baseline/dialogs/ledger.payments__1.png) |
| + إضافة دفعة | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.payments__2.png) |
| 👁 | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.payments__3.png) |

### <a id="expenses"></a>مصاريف شاملة — `expenses` — LEG-0031
- **القسم:** الحسابات · **في القايمة:** أيوه · **دالة الرسم:** `renderExpensesPage` (renderer/modules/hr/pages-ops.js:1244)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase17.js، phase26.js، phase53.js، phase59.js
- **العنوان الظاهر:** المصاريف · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/expenses.png) · [موبايل](visual-baseline/mobile/expenses.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ الحسابات · 🏗️ تكلفة المشاريع الشاملة كل المصادر + الموردين + المخازن ٣٬٩٣٠ ج.م · 👔 الموظفين 0 سجل ٠ ج.م · 👷 المشرفون 0 سجل ٠ ج.م · 🧑‍🔧 العمال 0 سجل ٠ ج.م · 🧑‍🚒 السائقون 0 سجل ٠ ج.م · 🛻 المعدات والمركبات 0 سجل ٠ ج.م |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="costs"></a>تكاليف شاملة — `costs` — LEG-0032
- **القسم:** الحسابات · **في القايمة:** أيوه · **دالة الرسم:** `renderCostsPage` (renderer/modules/hr/pages-costs.js:98)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase17.js، phase59.js
- **العنوان الظاهر:** التكاليف · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/costs.png) · [موبايل](visual-baseline/mobile/costs.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ الحسابات · 🏗️ تكلفة المشاريع الشاملة كل المصادر + الموردين + المخازن ٣٬٩٣٠ ج.م · 🧑‍🔧 العمال 0 سجل ٠ ج.م · 👷 المشرفون 2 سجل ٥٠ ج.م · 🧑‍🚒 السائقون 0 سجل ٠ ج.م · 👔 الموظفين 0 سجل ٠ ج.م · 🛻 المعدات والمركبات 0 سجل ٠ ج.م |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="clientscollections"></a>الإيرادات — `clients.collections` — LEG-0033
- **القسم:** الحسابات · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsCollectionsPage` (renderer/modules/clients/pages-collections.js:28)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase13.js، phase20.js
- **العنوان الظاهر:** الإيرادات / التحصيلات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.collections.png) · [موبايل](visual-baseline/mobile/clients.collections.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + تحصيل |
| حذف | مسح |
| تصدير | إكسيل · CSV |
| تنقّل | السابق · التالي |
| أخرى | ◀ الحسابات · ◀ الأقسام |

**الجداول:** (1) الكود، التاريخ، العميل، المبلغ، الطريقة، مستخلص — 1 صف
**الخانات (2):** بحث...، coCustomer


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + تحصيل | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/clients.collections__1.png) |

### <a id="clientsaccounts"></a>حسابات العملاء — `clients.accounts` — LEG-0034
- **القسم:** الحسابات · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsAccountsPage` (renderer/modules/clients/pages-accounts.js:73)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** حسابات العملاء · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.accounts.png) · [موبايل](visual-baseline/mobile/clients.accounts.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ الحسابات · ◀ الأقسام |
| عرض/تفاصيل | عرض |

**الجداول:** (1) التاريخ، النوع، المرجع، البيان، مدين، دائن، الرصيد — 2 صف
**الخانات (3):** من، من، إلى


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| عرض | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/clients.accounts__1.png) |

### <a id="reports"></a>تقارير الموارد البشرية — `reports` — LEG-0035
- **القسم:** التقارير · **في القايمة:** أيوه · **دالة الرسم:** `renderReportsPage` (renderer/modules/hr/pages-reports.js:56)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase22.js
- **العنوان الظاهر:** التقارير · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/reports.png) · [موبايل](visual-baseline/mobile/reports.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| حذف | مسح التواريخ |
| تصدير | إكسيل · CSV |
| أخرى | ◀ التقارير · تطبيق · نظرة عامة · تقارير التنبيهات · ملخص التنبيهات · مصفوفة الأوراق · تقرير فردي · الموظفين · المشرفون · العمال · السائقون · الأقسام · المشاريع · معدات ومركبات · حضور الموظفين · اليوميات · المستحقات · المصاريف · الإجازات · تقييم الأداء · حركة الموارد · خصومات وجزاءات |
| طباعة/PDF | طباعة · 🖨️ طباعة التقرير الشهري |

**الجداول:** (1) الفئة، المستحق، منها بدلات، المدفوع، خصم/جزاء، مصاريف على الحساب، المتبقي — 2 صف · (2) فئة المصروف، المبلغ، النسبة من الإجمالي — 1 صف · (3) البند، نشط، الإجمالي — 7 صف · (4) الفئة، مستحق، بدلات، مدفوع، خصم، مصاريف، متبقي — 2 صف · (5) البند، القيمة — 8 صف
**الخانات (4):** السنة، الشهر، من، إلى


### <a id="clientsreports"></a>تقارير العملاء والمشاريع — `clients.reports` — LEG-0036
- **القسم:** التقارير · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsReportsPage` (renderer/modules/clients/pages-reports.js:4)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** تقارير العملاء والمشاريع · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.reports.png) · [موبايل](visual-baseline/mobile/clients.reports.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ التقارير |

**الجداول:** (1) العميل، مشاريع، عقود، مستخلصات، صافي، مدفوع، محصّل، متبقي — 2 صف
**الخانات (0):** —


### <a id="ledgerreports"></a>تقارير الموردين — `ledger.reports` — LEG-0037
- **القسم:** التقارير · **في القايمة:** أيوه · **دالة الرسم:** `lgRenderReportsPage` (renderer/modules/ledger/pages-reports.js:25)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** النظام الموحد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.reports.png) · [موبايل](visual-baseline/mobile/ledger.reports.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | تصدير Excel (النتائج الظاهرة) ← `exportPeriodicReportCsv` |
| تنقّل | السابق · التالي |
| أخرى | ✓ فحص البيانات ← `openGlobalValidationModal` · ⌨ اختصارات الدفتر ← `lgOpenShortcutsHelp` · ⚙️ الإعدادات ← `goToPage` · ◀ التقارير · الربع الأول (يناير - مارس) · الربع الثاني (أبريل - يونيو) · الربع الثالث (يوليو - سبتمبر) · الربع الرابع (أكتوبر - ديسمبر) · السنة كاملة · 🧾 · ✎ · ✕ |
| عرض/تفاصيل | 👁 |

**الجداول:** (1) رقم الفاتورة، التاريخ، المورد، البيان، كود داخلي، كود المورد، نوع الفاتورة، المشروع، طبيعة التعامل، نوع الخصم، القيمة الإجمالية، الضريبة، الدمغات، إجمالي الفاتورة، المخصوم، الصافي — 2 صف
**الخانات (14):** السنة، من تاريخ (اختياري)، إلى تاريخ (اختياري)، مورد، رقم ضريبي، رقم فاتورة، بيان، تصنيف، مشروع، مبلغ... (كل، كل الموردين — ابحث...، الشهر، التصنيف، المشروع، النوع، الحالة، الخصم، ٠، ∞، الترتيب
**مربوط بالسجل:** LEG-0231 (نافذة openGlobalValidationModal) · LEG-0273 (تصدير/طباعة exportPeriodicReportCsv)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.reports__1.png) |
| 👁 | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.reports__2.png) |

### <a id="accountsreports"></a>تقارير الحسابات — `accounts.reports` — LEG-0038
- **القسم:** التقارير · **في القايمة:** أيوه · **دالة الرسم:** `renderAccountsReportsPage` (renderer/modules/accounts/pages-reports.js:2)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** تقارير الحسابات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/accounts.reports.png) · [موبايل](visual-baseline/mobile/accounts.reports.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ التقارير |

**الجداول:** (1) المشروع، إيراد مستخلصات، تكاليف، محصّل، الهامش — 1 صف
**الخانات (0):** —


### <a id="archive"></a>أرشيف الموارد البشرية — `archive` — LEG-0039
- **القسم:** الأرشيف · **في القايمة:** أيوه · **دالة الرسم:** `renderArchivePage` (renderer/core/pages-archive.js:54)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase22.js، phase61.js
- **العنوان الظاهر:** الأرشيف · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/archive.png) · [موبايل](visual-baseline/mobile/archive.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إرفاق مستند |
| مرفقات | 👔 الموظفين 2 مجلد 0 مرفق · 👷 المشرفون 2 مجلد 0 مرفق · 🧑‍🔧 العمال 2 مجلد 0 مرفق · 🧑‍🚒 السائقون 2 مجلد 0 مرفق · 🚜 المعدات والمركبات 2 مجلد 0 مرفق · 🏗️ المشاريع 4 مجلد 0 مرفق |
| حذف | 🗑️ سلة المهملات 2 عنصر قابل للاسترجاع |
| أخرى | ◀ الأرشيف |

**الجداول:** مفيش
**الخانات (0):** —


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + إرفاق مستند | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/archive__1.png) |

### <a id="ledgerarchive"></a>أرشيف الموردين — `ledger.archive` — LEG-0040
- **القسم:** الأرشيف · **في القايمة:** أيوه · **دالة الرسم:** `lgRenderArchivePage` (renderer/modules/ledger/pages-archive.js:215)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** الأرشيف · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.archive.png) · [موبايل](visual-baseline/mobile/ledger.archive.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إرفاق مستند لمورد |
| حذف | 🗑️ سلة المهملات (0) |
| أخرى | ◀ الأرشيف · 🗂️ نص name 1 ر.ض: نص taxId 1 📋 0 · 📄 2 · 💳 2 · 🧾 2 · 🗂️ نص name 2 ر.ض: نص taxId 2 📋 0 · 📄 0 · 💳 0 · 🧾 0 |

**الجداول:** مفيش
**الخانات (5):** اسم مورد، رقم ضريبي، سجل، هاتف، رقم فاتورة/دفعة، مبلغ، اسم م، السنة، المحتوى، نوع المستند، الترتيب


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + إرفاق مستند لمورد | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.archive__1.png) |

### <a id="clientsarchive"></a>أرشيف العملاء والمشاريع — `clients.archive` — LEG-0041
- **القسم:** الأرشيف · **في القايمة:** أيوه · **دالة الرسم:** `renderClientsArchivePage` (renderer/modules/clients/pages-archive.js:36)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase8.js
- **العنوان الظاهر:** أرشيف العملاء والمشاريع · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.archive.png) · [موبايل](visual-baseline/mobile/clients.archive.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| حذف | مسح |
| تنقّل | السابق · التالي |
| أخرى | ◀ الأرشيف |

**الجداول:** (1) الاسم، النوع، الكيان، العميل، التاريخ — 1 صف
**الخانات (2):** بحث...، arType


### <a id="backup"></a>الإعدادات العامة — `backup` — LEG-0042
- **القسم:** الإعدادات · **في القايمة:** أيوه · **دالة الرسم:** `renderBackupPage` (renderer/core/pages-backup.js:5)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase10.js، phase29.js، phase32.js، phase34.js، phase35.js، phase36.js، phase38.js، phase45.js
- **العنوان الظاهر:** إعدادات النظام الموحد · **التبويبات:** 🏢 الشركة، 🔒 الأمان، 💾 النسخ الاحتياطي، 📤 الاستيراد والتصدير، 🧾 الموردون، 🏗️ العملاء، 📦 المخازن، ⚙️ التخزين والتحديث، 🧩 تعديلات مخصصة، 📋 أوراق العمل، 🌐 الشبكة، 🧾 سجل التدقيق، ⚠️ منطقة الخطر
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/backup.png) · [موبايل](visual-baseline/mobile/backup.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | إضافة · + إضافة خانة · + إضافة كرت · + إضافة |
| مرفقات | 📎 إرفاق مستند |
| حذف | مسح الرقم السري · 🗑️ مسح بيانات الموردين والفواتير · 📷 مسح / كاميرا · حذف نوع من القائمة · 🗑️ مسح كل البيانات |
| تعديل | 🧩 تعديلات مخصصة · ⚙️ تعديل مسار العمل |
| تصدير | 📤 الاستيراد والتصدير · 📥 استيراد من إكسيل · CSV · إكسيل · استيراد من إكسيل · تصدير الموردين · تصدير كل الفواتير · تصدير كل الدفعات |
| استيراد | ⬆️ استيراد نسخة احتياطية · 📥 استيراد بيانات العملاء القديمة (data.json) · 📥 استيراد بيانات الموارد البشرية القديمة (data.json) · 📥 استيراد بيانات دفتر الموردين القديمة (data.json) · 📥 استيراد data.json للعملاء |
| أخرى | 🏢 الشركة · 🔒 الأمان · 🧾 الموردون · 🏗️ العملاء · 📦 المخازن · ⚙️ التخزين والتحديث · 📋 أوراق العمل · 🌐 الشبكة · 🧾 سجل التدقيق · ⚠️ منطقة الخطر · تغيير / ضبط الرقم السري · تفعيل وضع القراءة فقط · ⬇️ تنزيل نسخة احتياطية · اختيار مكان النسخة الإضافية · نسخ دلوقتي · إلغاء النسخة الإضافية · ✓ فحص البيانات الآن · إصلاح حسابات الفواتير (الإجمالي والصافي) · 📚 إدارة الكتالوج · إعادة المسار الافتراضي · 🔄 اختيار ملف تحديث وتثبيته · ▶ تشغيل كمضيف · 🔗 الاتصال كعميل · اختبار الاتصال · ⏹ إيقاف الشبكة · موظف · عامل · عامل مؤقت · مشرف · سائق · إجازة · تقييم · حضور موظف · تسجيل يومية · يومية معدة · معدة/مركبة · مشروع · وقود · أمر نقل · سجل صيانة معدة · خطة يومية · مصروف أشخاص · مصروف معدات · تكلفة · دفع مستحق · إرفاق مستند · عميل · عقد · مستخلص · مقايسة · حصر · تحصيل · ضمان · فرصة بيع · تواصل مع عميل · أمر تغيير · صنف مخزني · مخزن · حركة مخزنية · مورد · فاتورة مورد · دفعة لمورد · مستند مورد · مستخدم · × · ▦ · ↔ · ✎ · رفع ملف · إخفاء · إلغاء · ▲ · ▼ · ↺ استعادة الافتراضي · موظفين · عمال · مشرفين · سائقين · معدات ومركبات · المستقيلين · استعادة الافتراضي |
| طباعة/PDF | PDF |
| حفظ | 💾 النسخ الاحتياطي · 💾 حفظ الإعدادات · 💾 حفظ إعدادات العملاء · 💾 حفظ إعدادات المخازن · 📂 اختيار مجلد حفظ البيانات · حفظ · 💾 حفظ التعديلات |
| عرض/تفاصيل | 👁 |

**الجداول:** (1) ⠿، #، اسم الخانة، التصنيف، الطول (px)، العرض (px)، نوع الإدخال، في النموذج، في الجدول، ترتيب — 23 صف
**الخانات (210):** اسم الشركة، رئيس مجلس الإدارة، مدير الشركة، إيميل الشركة، الهاتف، الرقم الضريبي، أيام العمل شهرياً، العنوان، clImportOldFile، hrImportOldFile، عدد الخانات العشرية، lgImportOldFile، بادئة كود العميل، بادئة أعمال الحصر، بادئة المقايسات، بادئة العقود، بادئة التحصيل، تصنيفات المستخلصات (سطر لكل تصنيف)، بادئة الأصناف، بادئة الحركات، المخزن الافتراضي، منفذ المضيف، عنوان المضيف (للعميل)، ▦👁↔✎⠿ 1الكود، ▦👁↔✎⠿ 2الاسم…


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| 🧩 تعديلات مخصصة | أيوه | إضافة موظف جديد × | 24: ▦👁↔✎⠿ 1الكود، ▦👁↔✎⠿ 2الاسم، ▦👁↔✎⠿ 3الرقم القومي، ▦👁↔✎⠿ 4تاريخ الميلاد، ▦👁↔✎⠿ 5الهاتف، ▦👁↔✎⠿ 6البريد الإلكتروني، ▦👁↔✎⠿ 7رصيد الإجازة السنوية، ▦👁↔✎⠿ 8القسم، ▦👁↔✎⠿ 9الوظيفة، ▦👁↔✎⠿ 10الراتب، ▦👁↔✎⠿ 11تاريخ التعيين، ▦👁↔✎⠿ 12نوع العقد | ×، ▦، 👁، ↔، ✎، 📎 إرفاق مستند، 📷 مسح / كاميرا، رفع ملف، حذف نوع من القائمة، إخفاء | [لقطة](visual-baseline/dialogs/backup__1.png) |
| ⚙️ تعديل مسار العمل | أيوه | إضافة موظف جديد × | 24: ▦👁↔✎⠿ 1الكود، ▦👁↔✎⠿ 2الاسم، ▦👁↔✎⠿ 3الرقم القومي، ▦👁↔✎⠿ 4تاريخ الميلاد، ▦👁↔✎⠿ 5الهاتف، ▦👁↔✎⠿ 6البريد الإلكتروني، ▦👁↔✎⠿ 7رصيد الإجازة السنوية، ▦👁↔✎⠿ 8القسم، ▦👁↔✎⠿ 9الوظيفة، ▦👁↔✎⠿ 10الراتب، ▦👁↔✎⠿ 11تاريخ التعيين، ▦👁↔✎⠿ 12نوع العقد | ×، ▦، 👁، ↔، ✎، 📎 إرفاق مستند، 📷 مسح / كاميرا، رفع ملف، حذف نوع من القائمة، إخفاء | [لقطة](visual-baseline/dialogs/backup__2.png) |
| 👁 | أيوه | إضافة موظف جديد × | 24: كود الموظف (تلقائي — قابل للتعديل)، ▦👁↔✎⠿ 2الاسم، ▦👁↔✎⠿ 3الرقم القومي، ▦👁↔✎⠿ 4تاريخ الميلاد، ▦👁↔✎⠿ 5الهاتف، ▦👁↔✎⠿ 6البريد الإلكتروني، ▦👁↔✎⠿ 7رصيد الإجازة السنوية، ▦👁↔✎⠿ 8القسم، ▦👁↔✎⠿ 9الوظيفة، ▦👁↔✎⠿ 10الراتب، ▦👁↔✎⠿ 11تاريخ التعيين، ▦👁↔✎⠿ 12نوع العقد | ×، ▦، 👁، ↔، ✎، 📎 إرفاق مستند، 📷 مسح / كاميرا، رفع ملف، حذف نوع من القائمة، إخفاء | [لقطة](visual-baseline/dialogs/backup__3.png) |
| + إضافة خانة | أيوه | إضافة موظف جديد × | 24: كود الموظف (تلقائي — قابل للتعديل)، ▦👁↔✎⠿ 2الاسم، ▦👁↔✎⠿ 3الرقم القومي، ▦👁↔✎⠿ 4تاريخ الميلاد، ▦👁↔✎⠿ 5الهاتف، ▦👁↔✎⠿ 6البريد الإلكتروني، ▦👁↔✎⠿ 7رصيد الإجازة السنوية، ▦👁↔✎⠿ 8القسم، ▦👁↔✎⠿ 9الوظيفة، ▦👁↔✎⠿ 10الراتب، ▦👁↔✎⠿ 11تاريخ التعيين، ▦👁↔✎⠿ 12نوع العقد | ×، ▦، 👁، ↔، ✎، 📎 إرفاق مستند، 📷 مسح / كاميرا، رفع ملف، حذف نوع من القائمة، إخفاء | [لقطة](visual-baseline/dialogs/backup__4.png) |
| + إضافة كرت | أيوه | إضافة موظف جديد × | 24: كود الموظف (تلقائي — قابل للتعديل)، ▦👁↔✎⠿ 2الاسم، ▦👁↔✎⠿ 3الرقم القومي، ▦👁↔✎⠿ 4تاريخ الميلاد، ▦👁↔✎⠿ 5الهاتف، ▦👁↔✎⠿ 6البريد الإلكتروني، ▦👁↔✎⠿ 7رصيد الإجازة السنوية، ▦👁↔✎⠿ 8القسم، ▦👁↔✎⠿ 9الوظيفة، ▦👁↔✎⠿ 10الراتب، ▦👁↔✎⠿ 11تاريخ التعيين، ▦👁↔✎⠿ 12نوع العقد | ×، ▦، 👁، ↔، ✎، 📎 إرفاق مستند، 📷 مسح / كاميرا، رفع ملف، حذف نوع من القائمة، إخفاء | [لقطة](visual-baseline/dialogs/backup__5.png) |
| + إضافة | أيوه | إضافة موظف جديد × | 24: كود الموظف (تلقائي — قابل للتعديل)، ▦👁↔✎⠿ 2الاسم، ▦👁↔✎⠿ 3الرقم القومي، ▦👁↔✎⠿ 4تاريخ الميلاد، ▦👁↔✎⠿ 5الهاتف، ▦👁↔✎⠿ 6البريد الإلكتروني، ▦👁↔✎⠿ 7رصيد الإجازة السنوية، ▦👁↔✎⠿ 8القسم، ▦👁↔✎⠿ 9الوظيفة، ▦👁↔✎⠿ 10الراتب، ▦👁↔✎⠿ 11تاريخ التعيين، ▦👁↔✎⠿ 12نوع العقد | ×، ▦، 👁، ↔، ✎، 📎 إرفاق مستند، 📷 مسح / كاميرا، رفع ملف، حذف نوع من القائمة، إخفاء | [لقطة](visual-baseline/dialogs/backup__6.png) |

### <a id="users"></a>المستخدمون — `users` — LEG-0043
- **القسم:** الإعدادات · **في القايمة:** أيوه · **دالة الرسم:** `renderUsersPage` (renderer/core/pages-users.js:16)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** المستخدمون والصلاحيات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/users.png) · [موبايل](visual-baseline/mobile/users.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + مستخدم جديد |
| حذف | حذف |
| تعديل | ⚙️ تعديل الحساب |
| أخرى | 🔑 تغيير كلمة المرور · ⚙️ صلاحيات · 🔑 كلمة المرور |

**الجداول:** مفيش
**الخانات (1):** بحث بالاسم أو اسم المستخدم أو الدور...


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + مستخدم جديد | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/users__1.png) |
| ⚙️ تعديل الحساب | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/users__2.png) |

### <a id="ledgercategories"></a>الاقتراحات — `ledger.categories` — LEG-0044
- **القسم:** الإعدادات · **في القايمة:** أيوه · **دالة الرسم:** `renderCategoriesPage` (renderer/modules/ledger/pages-categories.js:4)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** النظام الموحد · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.categories.png) · [موبايل](visual-baseline/mobile/ledger.categories.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إضافة تصنيف |
| تصدير | تصدير Excel (الظاهر) ← `exportCategoriesExcel` |
| أخرى | ✓ فحص البيانات ← `openGlobalValidationModal` · ⌨ اختصارات الدفتر ← `lgOpenShortcutsHelp` · ⚙️ الإعدادات ← `goToPage` · التصنيفات · المشاريع · اقتراحات أكواد وأصناف الموردين |

**الجداول:** مفيش
**الخانات (1):** اسم تصنيف جديد...
**مربوط بالسجل:** LEG-0231 (نافذة openGlobalValidationModal) · LEG-0234 (تصدير/طباعة exportCategoriesExcel)

**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.categories__1.png) |
| + إضافة تصنيف | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.categories__2.png) |

### <a id="clientsdashboard"></a>clients.dashboard — `clients.dashboard` — LEG-0045
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderDashboardPage` (renderer/modules/hr/pages-dashboard.js:28)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase20.js
- **العنوان الظاهر:** 🧭 مركز المتابعة · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/clients.dashboard.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | ＋ مهمة جديدة |
| بحث/فلترة | 🔍 بحث شامل |
| تنقّل | فتح كل المهام ← |
| أخرى | ↻ تحديث · كل السنوات · 2026 · 👥 العملاء 2 · 🏗️ المشاريع 4 50 ج.م · 📐 أعمال الحصر 0 · 📋 المقايسات 0 · 📑 العقود 0 0 ج.م · 🧾 المستخلصات 0 0 ج.م · 🟢 مشاريع نشطة 4 · 🛡️ الضمانات 0 · 🏭 الموردون 2 · 🧾 فواتير الموردين 2 50 ج.م · 💳 الدفعات 2 50 ج.م · ↩️ المرتجعات 0 0 ج.م · 💸 مستحق للموردين 50 ج.م · 🔔 إشعارات الخصم 2 50 ج.م · 🏬 المخازن 1 · 📦 الأصناف 1 · 💎 قيمة المخزون 6 ج.م · ⚠️ تحت الحد الأدنى 0 · 👔 الموظفون 2 2 نشط · 🧑‍🔧 العمال 2 2 نشط · 👷 المشرفون 2 2 نشط · 🧑‍🚒 السائقون 2 2 نشط · 🛻 معدات ومركبات 2 2 عاملة · 🧮 المصاريف الشاملة 0 0 ج.م · 📊 التكاليف الشاملة 3 3,930 ج.م مشروع عليه تكلفة · 💰 الإيرادات 0 0 ج.م تحصيل · الكل (15) · الموارد البشرية (12) · الموردون (1) · المخازن (0) · العملاء والمشاريع (0) · الحسابات والتكاليف (2) · سن المعاش (0) · ⏰ المؤجَّلة والمنجزة (0) · 📅 لا حضور عمال/سائقين مسجّل اليوم لم يُسجَّل أي يومية اليوم ⏰ تأجيل أسبوع ✓ تم · ⏰ تأجيل أسبوع · ✓ تم · 💰 متبقي مستحقات عمال/سائقين هذا الشهر: ٨٧٠ ج.م صافي مستحقات الشهر: ٨٧٠ ج.م ⏰ تأ · 🔴 تجاوز ميزانية: نص name 1 إجمالي ١٬٣٠٠ ج.م من ميزانية ٢٠ ج.م ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 نص code 1 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 ناقص: صورة البطاقة الشخصية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 فاتورة نص invoiceNo 2 — نص name 1 المتبقي: ٣٠ ج.م ⏰ تأجيل أسبوع ✓ تم · 🔗 1 اسم مشروع مكتوب في سجلات ومالوش مشروع مسجّل مشروع (1 سجل) ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 — تجاوز الميزانية التكلفة: ١٬٣٠٠ ج.م ⏰ تأجيل أسبوع ✓ تم |

**الجداول:** (1) البند، القيمة، النسبة — 9 صف
**الخانات (3):** 📅، 📅، 🔍 بحث في التنبيهات…


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| ＋ مهمة جديدة | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/clients.dashboard__1.png) |

### <a id="fuel"></a>fuel — `fuel` — LEG-0046
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderEquipmentPage` (renderer/modules/hr/pages-equipment.js:32)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** المعدات والمركبات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/fuel.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| أخرى | ◀ الموارد البشرية · 📋 2 الكل اضغط للدخول · 📂 0 بدون قسم أو نوع ترخيص اضغط للدخول · 🛻 0 المعدات اضغط للدخول · 🛻 0 السيارات الملاكى اضغط للدخول · 🛻 0 سيارات النقل اضغط للدخول · 🛻 0 سيارات خارجية اضغط للدخول |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="documents"></a>documents — `documents` — LEG-0047
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderArchivePage` (renderer/core/pages-archive.js:54)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** الأرشيف · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/documents.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | + إرفاق مستند |
| مرفقات | 👔 الموظفين 2 مجلد 0 مرفق · 👷 المشرفون 2 مجلد 0 مرفق · 🧑‍🔧 العمال 2 مجلد 0 مرفق · 🧑‍🚒 السائقون 2 مجلد 0 مرفق · 🚜 المعدات والمركبات 2 مجلد 0 مرفق · 🏗️ المشاريع 4 مجلد 0 مرفق |
| حذف | 🗑️ سلة المهملات 2 عنصر قابل للاسترجاع |
| أخرى | ◀ الأرشيف |

**الجداول:** مفيش
**الخانات (0):** —


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| + إرفاق مستند | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/documents__1.png) |

### <a id="assistant"></a>assistant — `assistant` — LEG-0048
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderDashboardPage` (renderer/modules/hr/pages-dashboard.js:28)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** 🧭 مركز المتابعة · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/assistant.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | ＋ مهمة جديدة |
| بحث/فلترة | 🔍 بحث شامل |
| تنقّل | فتح كل المهام ← |
| أخرى | ↻ تحديث · كل السنوات · 2026 · 👥 العملاء 2 · 🏗️ المشاريع 4 50 ج.م · 📐 أعمال الحصر 0 · 📋 المقايسات 0 · 📑 العقود 0 0 ج.م · 🧾 المستخلصات 0 0 ج.م · 🟢 مشاريع نشطة 4 · 🛡️ الضمانات 0 · 🏭 الموردون 2 · 🧾 فواتير الموردين 2 50 ج.م · 💳 الدفعات 2 50 ج.م · ↩️ المرتجعات 0 0 ج.م · 💸 مستحق للموردين 50 ج.م · 🔔 إشعارات الخصم 2 50 ج.م · 🏬 المخازن 1 · 📦 الأصناف 1 · 💎 قيمة المخزون 6 ج.م · ⚠️ تحت الحد الأدنى 0 · 👔 الموظفون 2 2 نشط · 🧑‍🔧 العمال 2 2 نشط · 👷 المشرفون 2 2 نشط · 🧑‍🚒 السائقون 2 2 نشط · 🛻 معدات ومركبات 2 2 عاملة · 🧮 المصاريف الشاملة 0 0 ج.م · 📊 التكاليف الشاملة 3 3,930 ج.م مشروع عليه تكلفة · 💰 الإيرادات 0 0 ج.م تحصيل · الكل (15) · الموارد البشرية (12) · الموردون (1) · المخازن (0) · العملاء والمشاريع (0) · الحسابات والتكاليف (2) · سن المعاش (0) · ⏰ المؤجَّلة والمنجزة (0) · 📅 لا حضور عمال/سائقين مسجّل اليوم لم يُسجَّل أي يومية اليوم ⏰ تأجيل أسبوع ✓ تم · ⏰ تأجيل أسبوع · ✓ تم · 💰 متبقي مستحقات عمال/سائقين هذا الشهر: ٨٧٠ ج.م صافي مستحقات الشهر: ٨٧٠ ج.م ⏰ تأ · 🔴 تجاوز ميزانية: نص name 1 إجمالي ١٬٣٠٠ ج.م من ميزانية ٢٠ ج.م ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 نص code 1 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 ناقص: صورة البطاقة الشخصية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 فاتورة نص invoiceNo 2 — نص name 1 المتبقي: ٣٠ ج.م ⏰ تأجيل أسبوع ✓ تم · 🔗 1 اسم مشروع مكتوب في سجلات ومالوش مشروع مسجّل مشروع (1 سجل) ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 — تجاوز الميزانية التكلفة: ١٬٣٠٠ ج.م ⏰ تأجيل أسبوع ✓ تم |

**الجداول:** (1) البند، القيمة، النسبة — 9 صف
**الخانات (3):** 📅، 📅، 🔍 بحث في التنبيهات…


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| ＋ مهمة جديدة | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/assistant__1.png) |

### <a id="departments"></a>departments — `departments` — LEG-0049
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderHrHomePage` (renderer/core/boards.js:172)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase22.js، phase39.js
- **العنوان الظاهر:** 👥 لوحات الموارد البشرية · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/departments.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تنقّل | 👔 الموظفون 2 نشط 2 2 الموظفين اضغط للدخول ← · 👷 المشرفون 2 نشط 2 2 المشرفين اضغط للدخول ← · 🧑‍🔧 العمال 2 نشط 2 2 عمال الشركة اضغط للدخول ← · 🧑‍🚒 السائقون 2 نشط 2 2 سائقين الشركة اضغط للدخول ← · 🛻 معدات ومركبات 2 نشط 2 لا أقسام بعد اضغط للدخول ← · 🕒 حضور الموظفين سجل 0 اضغط للدخول ← · 📅 اليوميات سجل 2 اضغط للدخول ← · 🏖️ الإجازات إجازة 2 اضغط للدخول ← · ⭐ تقييم الأداء تقييم 0 اضغط للدخول ← |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="payroll"></a>payroll — `payroll` — LEG-0050
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderWorkerDuesPage` (renderer/modules/hr/pages-worker-dues.js:79)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** المستحقات · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/payroll.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تصدير | إكسيل · CSV |
| أخرى | ◀ الحسابات · 👔 الموظفين 2 سجل 3 قسم · 👷 المشرفون 2 سجل 3 قسم · 🧑‍🔧 العمال 2 سجل 4 قسم · 🧑‍🚒 السائقون 2 سجل 4 قسم · 🛻 المعدات والمركبات 2 سجل 4 قسم |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="employeeDetail"></a>employeeDetail — `employeeDetail` — LEG-0051
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderEmployeeDetailPage` (renderer/modules/hr/pages-employee-detail.js:1)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** — · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/employeeDetail.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تنقّل | رجوع |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="personDetail"></a>personDetail — `personDetail` — LEG-0052
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderPersonDetailPage` (renderer/modules/hr/pages-person-detail.js:238)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** — · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/personDetail.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| تنقّل | رجوع |

**الجداول:** مفيش
**الخانات (0):** —


### <a id="ledgerdashboard"></a>ledger.dashboard — `ledger.dashboard` — LEG-0053
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderLedgerPage` (renderer/modules/ledger/glue.js:41)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** 🧭 مركز المتابعة · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/ledger.dashboard.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | ＋ مهمة جديدة |
| بحث/فلترة | 🔍 بحث شامل |
| تنقّل | فتح كل المهام ← |
| أخرى | ↻ تحديث · كل السنوات · 2026 · 👥 العملاء 2 · 🏗️ المشاريع 4 50 ج.م · 📐 أعمال الحصر 0 · 📋 المقايسات 0 · 📑 العقود 0 0 ج.م · 🧾 المستخلصات 0 0 ج.م · 🟢 مشاريع نشطة 4 · 🛡️ الضمانات 0 · 🏭 الموردون 2 · 🧾 فواتير الموردين 2 50 ج.م · 💳 الدفعات 2 50 ج.م · ↩️ المرتجعات 0 0 ج.م · 💸 مستحق للموردين 50 ج.م · 🔔 إشعارات الخصم 2 50 ج.م · 🏬 المخازن 1 · 📦 الأصناف 1 · 💎 قيمة المخزون 6 ج.م · ⚠️ تحت الحد الأدنى 0 · 👔 الموظفون 2 2 نشط · 🧑‍🔧 العمال 2 2 نشط · 👷 المشرفون 2 2 نشط · 🧑‍🚒 السائقون 2 2 نشط · 🛻 معدات ومركبات 2 2 عاملة · 🧮 المصاريف الشاملة 0 0 ج.م · 📊 التكاليف الشاملة 3 3,930 ج.م مشروع عليه تكلفة · 💰 الإيرادات 0 0 ج.م تحصيل · الكل (15) · الموارد البشرية (12) · الموردون (1) · المخازن (0) · العملاء والمشاريع (0) · الحسابات والتكاليف (2) · سن المعاش (0) · ⏰ المؤجَّلة والمنجزة (0) · 📅 لا حضور عمال/سائقين مسجّل اليوم لم يُسجَّل أي يومية اليوم ⏰ تأجيل أسبوع ✓ تم · ⏰ تأجيل أسبوع · ✓ تم · 💰 متبقي مستحقات عمال/سائقين هذا الشهر: ٨٧٠ ج.م صافي مستحقات الشهر: ٨٧٠ ج.م ⏰ تأ · 🔴 تجاوز ميزانية: نص name 1 إجمالي ١٬٣٠٠ ج.م من ميزانية ٢٠ ج.م ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 نص code 1 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 ناقص: صورة البطاقة الشخصية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 فاتورة نص invoiceNo 2 — نص name 1 المتبقي: ٣٠ ج.م ⏰ تأجيل أسبوع ✓ تم · 🔗 1 اسم مشروع مكتوب في سجلات ومالوش مشروع مسجّل مشروع (1 سجل) ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 — تجاوز الميزانية التكلفة: ١٬٣٠٠ ج.م ⏰ تأجيل أسبوع ✓ تم |

**الجداول:** (1) البند، القيمة، النسبة — 9 صف
**الخانات (3):** 📅، 📅، 🔍 بحث في التنبيهات…


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| ＋ مهمة جديدة | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/ledger.dashboard__1.png) |

### <a id="generaloverview"></a>general.overview — `general.overview` — LEG-0054
- **القسم:** — · **في القايمة:** لأ · **دالة الرسم:** `renderDashboardPage` (renderer/modules/hr/pages-dashboard.js:28)
- **المكان المستهدف:** legacy /legacy/ · **الاختبارات:** phase61.js
- **العنوان الظاهر:** 🧭 مركز المتابعة · **التبويبات:** —
- **اللقطات:** [ديسكتوب](visual-baseline/desktop/general.overview.png)

**الأفعال حسب النوع:**
| النوع | الأزرار (النص ← الدالة) |
|---|---|
| إضافة | ＋ مهمة جديدة |
| بحث/فلترة | 🔍 بحث شامل |
| تنقّل | فتح كل المهام ← |
| أخرى | ↻ تحديث · كل السنوات · 2026 · 👥 العملاء 2 · 🏗️ المشاريع 4 50 ج.م · 📐 أعمال الحصر 0 · 📋 المقايسات 0 · 📑 العقود 0 0 ج.م · 🧾 المستخلصات 0 0 ج.م · 🟢 مشاريع نشطة 4 · 🛡️ الضمانات 0 · 🏭 الموردون 2 · 🧾 فواتير الموردين 2 50 ج.م · 💳 الدفعات 2 50 ج.م · ↩️ المرتجعات 0 0 ج.م · 💸 مستحق للموردين 50 ج.م · 🔔 إشعارات الخصم 2 50 ج.م · 🏬 المخازن 1 · 📦 الأصناف 1 · 💎 قيمة المخزون 6 ج.م · ⚠️ تحت الحد الأدنى 0 · 👔 الموظفون 2 2 نشط · 🧑‍🔧 العمال 2 2 نشط · 👷 المشرفون 2 2 نشط · 🧑‍🚒 السائقون 2 2 نشط · 🛻 معدات ومركبات 2 2 عاملة · 🧮 المصاريف الشاملة 0 0 ج.م · 📊 التكاليف الشاملة 3 3,930 ج.م مشروع عليه تكلفة · 💰 الإيرادات 0 0 ج.م تحصيل · الكل (15) · الموارد البشرية (12) · الموردون (1) · المخازن (0) · العملاء والمشاريع (0) · الحسابات والتكاليف (2) · سن المعاش (0) · ⏰ المؤجَّلة والمنجزة (0) · 📅 لا حضور عمال/سائقين مسجّل اليوم لم يُسجَّل أي يومية اليوم ⏰ تأجيل أسبوع ✓ تم · ⏰ تأجيل أسبوع · ✓ تم · 💰 متبقي مستحقات عمال/سائقين هذا الشهر: ٨٧٠ ج.م صافي مستحقات الشهر: ٨٧٠ ج.م ⏰ تأ · 🔴 تجاوز ميزانية: نص name 1 إجمالي ١٬٣٠٠ ج.م من ميزانية ٢٠ ج.م ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 نص code 1 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 بطاقة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 ناقص: صورة البطاقة الشخصية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 1 نص code 1 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 نص name 2 نص code 2 رخصة المركبة منتهية ⏰ تأجيل أسبوع ✓ تم · 🔴 فاتورة نص invoiceNo 2 — نص name 1 المتبقي: ٣٠ ج.م ⏰ تأجيل أسبوع ✓ تم · 🔗 1 اسم مشروع مكتوب في سجلات ومالوش مشروع مسجّل مشروع (1 سجل) ⏰ تأجيل أسبوع ✓ ت · 🔴 نص name 1 — تجاوز الميزانية التكلفة: ١٬٣٠٠ ج.م ⏰ تأجيل أسبوع ✓ تم |

**الجداول:** (1) البند، القيمة، النسبة — 9 صف
**الخانات (3):** 📅، 📅، 🔍 بحث في التنبيهات…


**النوافذ:**
| الزرار | اتفتحت؟ | العنوان | الخانات | الأزرار | اللقطة |
|---|---|---|---|---|---|
| ＋ مهمة جديدة | أيوه | إضافة دفعة جديدة | 10: اسم المورد *، رقم التسجيل الضريبي، السجل التجاري، التاريخ، نوع الحركة *، دفعة عامة (مقدمة / تحت الحساب — بدون ربط بفاتورة)، طريقة الدفع، المبلغ الإجمالي *، رقم التحويل البنكي، ملاحظات | + إضافة خانة أخرى، 📷 مسح ضوئي / كاميرا، إلغاء، إضافة الدفعة | [لقطة](visual-baseline/dialogs/general.overview__1.png) |

## تغطية الربط (معيار P3-B)
كل نافذة ودالة تصدير وكتابة ليها `LEG-` من الجرد الثابت. الجدول ده بيقول مين فيهم اتوصلّه **من زرار ظاهر** في الاستكشاف الفعلي، والباقي اتجرد من الكود بس (بيتفتح من سياق تاني، زي صف معيّن في جدول أو حالة بيانات مختلفة).

| النوع | الإجمالي | اتوصلّه من زرار ظاهر | من الكود بس |
|---|---|---|---|
| النوافذ | 63 | 10 | 53 |
| التصدير والطباعة | 37 | 5 | 32 |
| كتابة البيانات | 30 | 0 | 30 |

<details><summary>القائمة الكاملة للنوافذ والتصدير والكتابة اللي ماتوصلّهاش من زرار ظاهر</summary>

| ID | النوع | الدالة | الدليل |
|---|---|---|---|
| LEG-0060 | data-write | كتابة بيانات saveData | renderer/core/data-store.js |
| LEG-0061 | modal | نافذة openExcelImportModal | renderer/core/excel-import.js:260 |
| LEG-0062 | data-write | كتابة بيانات approveExpense | renderer/core/extras.js |
| LEG-0064 | modal | نافذة openModal | renderer/core/helpers.js:472 |
| LEG-0065 | modal | نافذة openSubModal | renderer/core/helpers.js:614 |
| LEG-0066 | modal | نافذة openPersonDetailModal | renderer/core/helpers.js:2956 |
| LEG-0067 | modal | نافذة openPersonAlertsModal | renderer/core/helpers.js:3259 |
| LEG-0068 | modal | نافذة openAlertsMoreModal | renderer/core/helpers.js:3310 |
| LEG-0069 | modal | نافذة openAddCategoryModal | renderer/core/helpers.js:3793 |
| LEG-0070 | modal | نافذة openRenameCategoryModal | renderer/core/helpers.js:3818 |
| LEG-0071 | modal | نافذة openDeleteCategoryModal | renderer/core/helpers.js:3857 |
| LEG-0120 | export/print | تصدير/طباعة downloadXlsx | renderer/core/helpers.js |
| LEG-0121 | export/print | تصدير/طباعة downloadCsv | renderer/core/helpers.js |
| LEG-0122 | export/print | تصدير/طباعة printAttachmentPdf | renderer/core/helpers.js |
| LEG-0123 | export/print | تصدير/طباعة printHtml | renderer/core/helpers.js |
| LEG-0124 | export/print | تصدير/طباعة exportArchiveFolder | renderer/core/helpers.js |
| LEG-0125 | export/print | تصدير/طباعة printPersonFilePdf | renderer/core/helpers.js |
| LEG-0126 | export/print | تصدير/طباعة printArchiveAllPdf | renderer/core/helpers.js |
| LEG-0127 | export/print | تصدير/طباعة printExpenseRecord | renderer/core/helpers.js |
| LEG-0128 | export/print | تصدير/طباعة exportExpenseExcel | renderer/core/helpers.js |
| LEG-0129 | export/print | تصدير/طباعة printEquipmentAccountStatement | renderer/core/helpers.js |
| LEG-0130 | export/print | تصدير/طباعة printWorkerStatement | renderer/core/helpers.js |
| LEG-0131 | export/print | تصدير/طباعة printDriverStatement | renderer/core/helpers.js |
| LEG-0132 | export/print | تصدير/طباعة printDaysStatement | renderer/core/helpers.js |
| LEG-0133 | export/print | تصدير/طباعة printEmployeeStatement | renderer/core/helpers.js |
| LEG-0134 | export/print | تصدير/طباعة printPayslip | renderer/core/helpers.js |
| LEG-0135 | export/print | تصدير/طباعة printLeaveForm | renderer/core/helpers.js |
| LEG-0136 | data-write | كتابة بيانات addAudit | renderer/core/helpers.js |
| LEG-0137 | data-write | كتابة بيانات deleteProjectById | renderer/core/helpers.js |
| LEG-0138 | data-write | كتابة بيانات addExtraFieldRow | renderer/core/helpers.js |
| LEG-0139 | data-write | كتابة بيانات updateBulkBar | renderer/core/helpers.js |
| LEG-0140 | modal | نافذة openScanAttachModal | renderer/core/modals-common.js:9 |
| LEG-0144 | data-write | كتابة بيانات saveDataNetwork | renderer/core/network.js |
| LEG-0146 | modal | نافذة openUserModal | renderer/core/pages-users.js:190 |
| LEG-0149 | modal | نافذة openChangeOrderModal | renderer/modules/clients/change-orders.js:87 |
| LEG-0151 | modal | نافذة openGuaranteeModal | renderer/modules/clients/guarantees.js:231 |
| LEG-0152 | modal | نافذة openGuaranteeActionModal | renderer/modules/clients/guarantees.js:329 |
| LEG-0157 | modal | نافذة openBoqModal | renderer/modules/clients/pages-boqs.js:200 |
| LEG-0160 | modal | نافذة openCollectionModal | renderer/modules/clients/pages-collections.js:136 |
| LEG-0161 | modal | نافذة openContractModal | renderer/modules/clients/pages-contracts.js:200 |
| LEG-0162 | modal | نافذة openOppModal | renderer/modules/clients/pages-crm.js:230 |
| LEG-0163 | modal | نافذة openCommModal | renderer/modules/clients/pages-crm.js:289 |
| LEG-0165 | modal | نافذة openClientInvoiceModal | renderer/modules/clients/pages-invoices.js:220 |
| LEG-0166 | modal | نافذة openWorkSurveyModal | renderer/modules/clients/pages-work-surveys.js:324 |
| LEG-0169 | modal | نافذة openReasonModal | renderer/modules/clients/project-path.js:265 |
| LEG-0170 | modal | نافذة openStepModal | renderer/modules/clients/project-path.js:301 |
| LEG-0171 | modal | نافذة openPathHistoryModal | renderer/modules/clients/project-path.js:435 |
| LEG-0172 | modal | نافذة openEmployeeModal | renderer/modules/hr/modals-employees.js:1 |
| LEG-0173 | modal | نافذة openAttendanceModal | renderer/modules/hr/pages-attendance.js:121 |
| LEG-0174 | modal | نافذة openCostModal | renderer/modules/hr/pages-costs.js:411 |
| LEG-0187 | data-write | كتابة بيانات saveCostItemSuggestion | renderer/modules/hr/pages-costs.js |
| LEG-0188 | data-write | كتابة بيانات removeCostItemSuggestion | renderer/modules/hr/pages-costs.js |
| LEG-0189 | modal | نافذة openEquipmentModal | renderer/modules/hr/pages-equipment.js:665 |
| LEG-0190 | modal | نافذة openEquipmentDailyModal | renderer/modules/hr/pages-equipment.js:1074 |
| LEG-0191 | modal | نافذة openEquipLogModal | renderer/modules/hr/pages-equipment.js:1228 |
| LEG-0194 | export/print | تصدير/طباعة printEquipmentDaysStatement | renderer/modules/hr/pages-equipment.js |
| LEG-0195 | export/print | تصدير/طباعة printEquipmentDailyStatement | renderer/modules/hr/pages-equipment.js |
| LEG-0198 | modal | نافذة openExternalDriverModal | renderer/modules/hr/pages-ops.js:133 |
| LEG-0199 | modal | نافذة openDriverModal | renderer/modules/hr/pages-ops.js:189 |
| LEG-0200 | modal | نافذة openFuelModal | renderer/modules/hr/pages-ops.js:274 |
| LEG-0203 | modal | نافذة openManageDocTypesModal | renderer/modules/hr/pages-ops.js:675 |
| LEG-0204 | modal | نافذة openDocModal | renderer/modules/hr/pages-ops.js:721 |
| LEG-0205 | modal | نافذة openExpenseDetailModal | renderer/modules/hr/pages-ops.js:1417 |
| LEG-0206 | modal | نافذة openExpenseModal | renderer/modules/hr/pages-ops.js:1464 |
| LEG-0207 | modal | نافذة openVehicleExpenseModal | renderer/modules/hr/pages-ops.js:1842 |
| LEG-0208 | data-write | كتابة بيانات saveExpenseItemSuggestion | renderer/modules/hr/pages-ops.js |
| LEG-0209 | data-write | كتابة بيانات removeExpenseItemSuggestion | renderer/modules/hr/pages-ops.js |
| LEG-0210 | data-write | كتابة بيانات saveVehicleExpenseItem | renderer/modules/hr/pages-ops.js |
| LEG-0212 | export/print | تصدير/طباعة printPersonFinanceStatement | renderer/modules/hr/pages-person-detail.js |
| LEG-0214 | modal | نافذة openPlanModal | renderer/modules/hr/pages-projects.js:508 |
| LEG-0216 | export/print | تصدير/طباعة exportCurrentReportCsv | renderer/modules/hr/pages-reports.js |
| LEG-0217 | export/print | تصدير/طباعة exportCurrentReportXlsx | renderer/modules/hr/pages-reports.js |
| LEG-0218 | export/print | تصدير/طباعة printCurrentReport | renderer/modules/hr/pages-reports.js |
| LEG-0219 | modal | نافذة openSupervisorModal | renderer/modules/hr/pages-supervisors.js:323 |
| LEG-0222 | modal | نافذة openWattDaySitesModal | renderer/modules/hr/pages-worker-attendance.js:541 |
| LEG-0223 | modal | نافذة openWorkerAttModal | renderer/modules/hr/pages-worker-attendance.js:577 |
| LEG-0224 | modal | نافذة openUnifiedPayModal | renderer/modules/hr/pages-worker-dues.js:741 |
| LEG-0225 | modal | نافذة openPayItemsManageModal | renderer/modules/hr/pages-worker-dues.js:1454 |
| LEG-0228 | modal | نافذة openWorkerModal | renderer/modules/hr/pages-workers.js:216 |
| LEG-0238 | export/print | تصدير/طباعة exportSupplierCsv | renderer/modules/ledger/exports.js |
| LEG-0239 | export/print | تصدير/طباعة exportVisibleQuarterNoticesPdf | renderer/modules/ledger/exports.js |
| LEG-0240 | export/print | تصدير/طباعة exportSupplierDiscountNoticesPdf | renderer/modules/ledger/exports.js |
| LEG-0241 | export/print | تصدير/طباعة exportQuarterNoticesPdf | renderer/modules/ledger/exports.js |
| LEG-0252 | export/print | تصدير/طباعة downloadFile | renderer/modules/ledger/helpers.js |
| LEG-0253 | export/print | تصدير/طباعة exportExcelFile | renderer/modules/ledger/helpers.js |
| LEG-0254 | export/print | تصدير/طباعة printHtmlContent | renderer/modules/ledger/helpers.js |
| LEG-0255 | data-write | كتابة بيانات addDaysToIsoDate | renderer/modules/ledger/helpers.js |
| LEG-0256 | data-write | كتابة بيانات saveCustomLinkedItem | renderer/modules/ledger/helpers.js |
| LEG-0257 | data-write | كتابة بيانات deleteCustomLinkedItem | renderer/modules/ledger/helpers.js |
| LEG-0259 | modal | نافذة openDeleteSupplierModal | renderer/modules/ledger/modals.js:136 |
| LEG-0262 | modal | نافذة openDiscountNoticeModal | renderer/modules/ledger/modals.js:1410 |
| LEG-0263 | modal | نافذة openViewInvoiceModal | renderer/modules/ledger/modals.js:1452 |
| LEG-0264 | modal | نافذة openViewPaymentModal | renderer/modules/ledger/modals.js:1633 |
| LEG-0267 | export/print | تصدير/طباعة printSupplierStatementTab | renderer/modules/ledger/modals.js |
| LEG-0268 | export/print | تصدير/طباعة printSupplierStatement | renderer/modules/ledger/modals.js |
| LEG-0269 | data-write | كتابة بيانات saveInvoiceData | renderer/modules/ledger/modals.js |
| LEG-0270 | modal | نافذة openAddSupplierDocumentModal | renderer/modules/ledger/pages-archive.js:774 |
| LEG-0272 | modal | نافذة openLinkedItemModal | renderer/modules/ledger/pages-categories.js:231 |
| LEG-0277 | export/print | تصدير/طباعة printBankStatement | renderer/modules/ledger/statement.js |
| LEG-0278 | modal | نافذة openWhItemModal | renderer/modules/warehouses/pages-home.js:203 |
| LEG-0279 | modal | نافذة openWhLocationModal | renderer/modules/warehouses/pages-home.js:237 |
| LEG-0341 | data-write | كتابة بيانات clSaveCustomers | renderer/modules/clients/helpers.js:327 |
| LEG-0342 | data-write | كتابة بيانات clUpsertCustomer | renderer/modules/clients/helpers.js:333 |
| LEG-0343 | data-write | كتابة بيانات clDeleteCustomer | renderer/modules/clients/helpers.js:352 |
| LEG-0344 | data-write | كتابة بيانات clNextCustomerCode | renderer/modules/clients/helpers.js:24 |
| LEG-0345 | data-write | كتابة بيانات whUpsertItem | renderer/modules/warehouses/helpers.js:56 |
| LEG-0346 | data-write | كتابة بيانات whDeleteItem | renderer/modules/warehouses/helpers.js:63 |
| LEG-0347 | data-write | كتابة بيانات whUpsertLocation | renderer/modules/warehouses/helpers.js:67 |
| LEG-0348 | data-write | كتابة بيانات whAddMovement | renderer/modules/warehouses/helpers.js:74 |
| LEG-0349 | data-write | كتابة بيانات whNextItemCode | renderer/modules/warehouses/helpers.js:18 |
| LEG-0350 | data-write | كتابة بيانات whNextMovementId | renderer/modules/warehouses/helpers.js:19 |
| LEG-0351 | data-write | كتابة بيانات applyReturnLinkEffects | renderer/modules/ledger/modals.js:1324 |
| LEG-0352 | data-write | كتابة بيانات nextPaymentNo | renderer/modules/ledger/data-store.js:114 |
| LEG-0353 | data-write | كتابة بيانات confirmAndSoftDeletePayment | renderer/modules/ledger/helpers.js:1967 |
| LEG-0354 | data-write | كتابة بيانات confirmAndSoftDeleteInvoice | renderer/modules/ledger/helpers.js:1942 |

</details>
