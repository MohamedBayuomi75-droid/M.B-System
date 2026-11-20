# خريطة الموديولات والاعتماديات (Module Dependency Map)

- **التاريخ:** 2026-11-17 · **المرحلة:** 1 (توثيق فقط — لا تعديل كود أو بيانات).
- **المرجع:** `ERP_MASTER_IMPLEMENTATION_PLAN.md` §10.
- **طريقة الإعداد (قابلة للإعادة، قراءة فقط):**
  1. تحليل الكود: كل ملف في `renderer/` ← أي مجموعات `DATA.*` يقرؤها أو يكتبها، وتجميعها حسب الموديول المالك للمجموعة.
  2. تحليل البيانات الحقيقية: كل حقل يحمل معرّفًا (`…Id`) ← يطابق أي مجموعة فعليًا، وكم مرجعًا لم يُحل. **أعداد فقط، بلا قيم.**
  3. قراءة مباشرة للمواضع المذكورة.
- **التصنيف:** `VERIFIED` (تحقق الآن) · `REPORTED` (من تقرير سابق) · `ASSUMPTION` (يحتاج تحققًا).

---

## 0. تحديث بعد دمج فرع 17 نوفمبر (خطة v1.4.5 — المرحلة 3، 2026-11-20)
> الأقسام 1–6 تحت كتبت في 2026-11-17 قبل المرحلة 5. القسم ده بيحدّث **الحالة** بس، والاعتماديات نفسها (من الكود والبيانات) لسه صالحة. الأرقام الموحّدة من `docs/discovery/REQUIREMENTS_REGISTRY.md`.

### 0.1 مين بقى صاحب البيانات دلوقتي
| الموديول | مكان البيانات | الحالة | الدليل |
|---|---|---|---|
| المشروعات (`projects`) | جدول `projects` علائقي (المصدر بيتحدد بـ `PROJECTS_SOURCE`، والافتراضي القديم) | جاهز، **مش متنقل افتراضيًا** | المرحلة 5.2 |
| الموردين والعملاء (`ledger.suppliers`، `clients.customers`) | جداول `suppliers` و`customers` و`customer_contacts` + view `legacy_records` | **أمر النقل جاهز** (`cutover parties`)، واتجرّب على نسخة من البيانات الحقيقية. شاشات `/app/` شغالة | `PHASE_06_1_CUTOVER_REPORT.md` |
| المخازن (`warehouses.*`) | `wh_items` و`wh_locations` و`wh_movements` (NUMERIC(18,5) — B-26) | أمر النقل جاهز (`cutover warehouses`)، ومفيش بيانات حقيقية | `PHASE_06_2B_AFTER_REPORT.md` |
| باقي الموديولات | طبقة JSONB الانتقالية (`records`/`docs`، ADR-009) | الواجهة القديمة | — |

### 0.2 مكونات مشتركة جديدة (بتعتمد عليها الموديولات الجاية)
| المكون | بيعتمد عليه | الحالة |
|---|---|---|
| محرك الاعتمادات (Approved ≠ Posted) | كل المستندات المالية والمخزنية (B-51 أول مستخدم) | منفّذ، ومن غير مسارات أو حدود افتراضية (B-01…B-08) |
| ترقيم NO_GAPS | كل المستندات المرقّمة | منفّذ؛ **النطاق والشكل B-29 مفتوح** |
| محرك القواعد المالية (B-20) | الفواتير، والمستخلصات، والمستحقات، والتكاليف | مسودات (25 معادلة) |
| محرك الضرايب (B-21) | فواتير الموردين والعملاء والمستخلصات | منفّذ، **من غير نسب** (Policy C) |
| المرفقات بالإصدارات | كل الموديولات | منفّذ؛ **PDF المشفّر B-78 (أ) لسه** |

### 0.3 الترتيب المقترح حسب v1.4.5 (فرضية تخطيط، **مش معتمد**)
1. **المرحلة 6 — الموديول التجريبي:** الموردين والعملاء (اتنفّذ فعلًا)، والناقص **القبول الرسمي**: UAT وبروفة نقل ورجوع وموافقة صريحة (`02` Phase 6). **ممنوع موديول تاني قبله** (R-39).
2. **المرحلة 7:** المخازن (اتنفّذت، ومحتاجة نفس القبول) ← فواتير ومرتجعات الموردين (B-20 وB-31 محسومين) ← الدفعات والتحصيل (**B-29**) ← العقود والمستخلصات. وقبل الفواتير والدفعات: **عقود الواجهات اللي المحاسبة (المرحلة 10) هتستهلكها** (`02` Phase 7).
3. **المرحلة 8:** العمالة والمعدات (**B-42، B-45، B-46، B-47، B-73، B-74، B-76**).
4. **المرحلة 9:** السلامة والجودة (**B-39، B-40**). **المرحلة 10:** المحاسبة (**B-13…B-16، B-27**).

---

## 1. الملكية الحالية للبيانات

| الموديول (في الكود الحالي) | المجموعات التي يملكها | حجم البيانات الحقيقية |
|---|---|---|
| **hr** (`renderer/modules/hr/`) | employees, workers, supervisors, drivers, equipment, departments, attendance, workerAttendance, leaves, payroll, workerPayments, employeePenalties, equipmentLogs, equipmentDaily, fuelLogs, resourceTransfers, projectPlans, projectDaily, performanceReviews, personDocuments, expenses, supervisorExpenses, costs, licenseExpenses, archiveTrash, resignedArchive | 40 موظف · 182 عامل · 3 مشرفين · 23 سائق · 31 معدة · 30 قسم · 880 يومية · 41 تكلفة · 32 أرشيف مستقيلين |
| **ledger** (`modules/ledger/`) — الموردون والفواتير والدفعات | ledger.suppliers, ledger.invoices, ledger.payments, ledger.archiveFolders, ledger.archiveTrash | 279 مورد · 648 فاتورة (47 مرتجع) · 244 دفعة |
| **clients** (`modules/clients/`) — العملاء والعقود والمستخلصات | clients.customers (وبداخله مصفوفات متداخلة)، workSurveys, boqs, contracts, invoices, collections, guarantees, opportunities, activities, docs | **1 عميل؛ صفر** عقود/مستخلصات/تحصيلات/مقايسات |
| **warehouses** (`modules/warehouses/`) | warehouses.items, locations, movements, stocktakes | **موقع واحد؛ صفر** أصناف وحركات |
| **projects** (مشترك — صفحاته في hr ومساره في clients) | projects | 14 مشروع |
| **accounts** (`modules/accounts/`، 111 سطرًا) | لا يملك بيانات — تقارير فقط | — |

(VERIFIED — `docs/web/collections-map.json` + فحص البيانات.)

---

## 2. الاعتماديات في الكود (مَن يقرأ بيانات مَن) — VERIFIED

### 2.1 بين موديولات الأعمال
| الموديول | يقرأ من | المجموعات | الدليل |
|---|---|---|---|
| warehouses | **ledger** | invoices, suppliers (ربط حركة الوارد بفاتورة مورد `supplierInvoiceId`) | `renderer/modules/warehouses/pages-home.js:270-273, 326-329` |
| warehouses | projects | projects (المشروع على الحركة) | تحليل الكود |
| clients | projects | projects (يقرأ ويكتب) | تحليل الكود |
| hr | projects | projects (يقرأ ويكتب) | تحليل الكود |
| hr | clients | clients.customers | تحليل الكود |
| accounts | ledger, hr, warehouses | invoices, payments, costs, expenses, items, movements | تحليل الكود |

### 2.2 ملفات `core/` العابرة للموديولات (قراءة لأكثر من موديول)
| الملف | يقرأ من |
|---|---|
| `core/helpers.js`, `core/extras.js`, `core/boards.js`, `core/follow-center.js` | clients, hr, ledger, projects, warehouses |
| `core/cost-center.js` (تكلفة المشروع الشاملة) | hr, ledger, projects, warehouses |
| `core/alerts-center.js` | ledger, projects, warehouses |
| `core/project-links.js` (ربط السجلات بالمشروع) | hr, ledger, projects, warehouses |
| `core/pages-general.js` | clients, ledger, warehouses |
| `core/data-store.js`, `core/excel-import.js`, `core/pages-archive.js` | hr, projects |

`core/` **يكتب** كذلك في مجموعات hr كلها وفي projects وفي `ledger.suppliers` (`core/helpers.js:569`).

**الأثر:** نقل أي موديول يجب ألا يكسر هذه القراءات. في المرحلة الانتقالية، الواجهة الحالية تقرأ `DATA` من `/api/bootstrap`؛ لذلك **Adapter كل موديول منقول يجب أن يعيد نفس شكل البيانات بالضبط** — هذا شرط قبول لكل نقل (MODULE_MIGRATION_PLAN §3).

---

## 3. الاعتماديات في البيانات (المراجع الفعلية بالمعرّف) — VERIFIED

| من | الحقل | إلى | مراجع | غير محلولة |
|---|---|---|---|---|
| ledger.invoices | supplierId | ledger.suppliers | 648 | 0 |
| ledger.payments | supplierId | ledger.suppliers | 244 | 0 |
| ledger.payments | invoiceId | ledger.invoices | 2 | 0 |
| ledger.invoices | linkedInvoiceId / linkedReturnIds | ledger.invoices | 1 / 1 | 0 |
| ledger.payments | batchId | (دفعة موزّعة — ليست مجموعة) | 77 | — |
| workerAttendance | personId | workers 843 · supervisors 33 | 880 | **4** |
| workerAttendance | supervisorId | supervisors | 876 | 0 |
| workerAttendance | projectId | projects | **202 فقط من 880** | 0 |
| costs | personId | supervisors | 41 | 0 |
| costs | projectId | projects | **12 فقط من 41** | 0 |
| costs | departmentId | departments | 11 | 0 |
| workers / employees / supervisors / drivers / equipment | departmentId, categoryId | departments | كلها | 0 |
| workers | supervisorId | supervisors | 120 | 0 |
| equipmentDaily | equipmentId | equipment | 1 | 0 |
| leaves | employeeId | employees | 1 | 0 |
| projects | supervisorId | supervisors | 4 | 0 |
| resignedArchive | personId | employees 23 · workers 3 · drivers 6 | 32 | 0 |
| archiveTrash | personId | (أشخاص محذوفون) | 7 | 7 (متوقع) |

**ربط بالاسم بدل المعرّف (VERIFIED):** 675 يومية و28 تكلفة تحمل اسم المشروع فقط؛ **كل الأسماء (13) مطابقة تمامًا لمشاريع مسجّلة**. تكلفة المشروع تُحسب بالاسم (`renderer/core/helpers.js:7816`).

**تصحيح لتقرير سابق:** `DATABASE_AUDIT.md` (D3) ذكر أن العمال الـ 182 مربوطون بالمشروع بالاسم — غير دقيق؛ سجلات العمال لا تحمل مشروعًا. المشكلة في اليوميات والتكاليف.

---

## 4. الرسم (المستهدف — مبني على الاعتماديات الفعلية)

```
                        ┌──────────────────────────────────────────┐
  منصّة (كل الموديولات   │ Users & Permissions · Audit Log ·        │
  تعتمد عليها)           │ Attachments · Numbering (NO_GAPS) ·      │
                        │ Workflow & Approvals · Notifications      │
                        └──────────────────────────────────────────┘
                                          ▲
  بيانات أساسية     ┌──────────┐   ┌─────────────┐   ┌───────────┐   ┌──────────────┐
  (تُرجع إليها      │ Projects │   │ Departments │   │ Suppliers │   │  Customers   │
   كل الحركات)      └────┬─────┘   └──────┬──────┘   └─────┬─────┘   └──────┬───────┘
                         │                │                │                │
        ┌────────────────┼────────────────┼────────┐       │                │
        ▼                ▼                ▼        ▼       ▼                ▼
  ┌───────────┐  ┌───────────────┐  ┌─────────┐  ┌────────────────┐  ┌──────────────────┐
  │ Labor     │  │ Equipment     │  │ Costs & │  │ Supplier       │  │ Contracts & BOQ  │
  │ (عمال،    │  │ (معدات،يومية، │  │Expenses │  │ Invoices &     │──▶ Client Certificates│
  │ يوميات،   │  │ وقود، صيانة)  │  │         │  │ Returns        │  │ Collections      │
  │ مستحقات)  │  └───────┬───────┘  └────┬────┘  └───┬────────┬───┘  └────────┬─────────┘
  └─────┬─────┘          │               │           │        │               │
        │                │               │           ▼        ▼               │
        │                │               │    ┌──────────┐ ┌────────────┐     │
        │                │               │    │ Payments │ │ Warehouses │◀─ Procurement (جديد)
        │                │               │    └────┬─────┘ └─────┬──────┘
        ▼                ▼               ▼         ▼             ▼            ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │ Accounting & Cost Centers (جديد) — يستقبل الترحيل من كل الحركات المالية بعد Approved │
  └──────────────────────────────────────────────────────────────────────────────────┘
        Safety & Risks (جديد) ── Projects        Quality & Handover (جديد) ── Projects, Contracts
        Reports / Dashboard: يقرأ من الكل (لا يملك بيانات)
```

---

## 5. بطاقة كل موديول (الإجابات الخمس المطلوبة في الخطة §10)

> «القرارات المانعة» بأرقامها في `OPEN_BUSINESS_DECISIONS.md`. الحالة: Implemented / Partially Implemented / Not Implemented (في الواجهة الحالية).

### 5.1 Projects — **Implemented** (الواجهة)
| | |
|---|---|
| يعتمد على | Customers (`customerId`)، Supervisors |
| يحتاج من بيانات | 14 مشروع؛ مسار المشروع وخطواته |
| يتأثر بنقله | **تقريبًا كل الموديولات**: hr, clients, warehouses, costs, `core/cost-center`, `core/project-links`، ونطاق صلاحيات المشاريع على الخادم |
| قرارات مانعة | B-32 (المشروع = مركز تكلفة؟)، B-34 (تأكيد ربط 675+28 سجلًا) |
| اختبارات القبول والمطابقة | 14 مشروعًا متطابقة؛ كل سجل كان مربوطًا بالاسم أصبح مربوطًا بالمعرّف؛ تكلفة كل مشروع قبل = بعد |

### 5.2 Suppliers — **Implemented**
| | |
|---|---|
| يعتمد على | لا شيء (بيانات أساسية) |
| يحتاج | 279 موردًا (الأرصدة الافتتاحية كلها صفر) |
| يتأثر بنقله | Invoices, Payments, Warehouses (ربط الوارد بالفاتورة)، `core/helpers.js:569`، كشف الحساب |
| قرارات مانعة | لا قرار يمنع نقل بيانات المورد نفسها (الدقة 4 خانات محسومة للرصيد الافتتاحي) |
| اختبارات | العدد والحقول متطابقة؛ الرقم الضريبي محفوظ؛ لا كسر لاختيار المورد في الفاتورة |

### 5.3 Customers — **Implemented** (بيانات قليلة)
| | |
|---|---|
| يعتمد على | لا شيء |
| يحتاج | عميل واحد + مصفوفات متداخلة داخل سجله (مشاريع/عقود/فواتير قديمة) |
| يتأثر بنقله | Projects (`customerId`)، Contracts, Certificates, Collections, CRM، `core/boards`, `core/follow-center` |
| قرارات مانعة | لا شيء لبيانات العميل؛ فك المصفوفات المتداخلة يحتاج تصميمًا |
| اختبارات | تطابق العميل وكل المصفوفات المتداخلة |

### 5.4 Supplier Invoices & Returns — **Implemented**
| | |
|---|---|
| يعتمد على | Suppliers، Projects (اسم المشروع على الفاتورة)، Numbering، Workflow (لاحقًا)، Accounting (لاحقًا) |
| يحتاج | 648 فاتورة؛ 102 منها صافيها بأكثر من 4 خانات؛ `unitPrice` و`quantity` مخزّنة كنصوص |
| يتأثر بنقله | Payments (المتبقي على الفاتورة)، Warehouses، التقارير الضريبية الربعية، كشف الحساب، `core/cost-center` |
| قرارات مانعة | **B-20** (اعتماد المعادلات)، **B-31** (11 رقمًا مكررًا لدى نفس المورد)، B-26 (دقة الكمية/السعر)، B-21/B-22 للضرائب لاحقًا |
| اختبارات | M-1, M-2, M-3, M-6 في `ACCOUNTING_ROADMAP.md`؛ فروق التقريب لـ 4 خانات موثّقة سجلًا بسجل |

### 5.5 Payments — **Implemented** · Receipts/Collections — **Implemented** (لا بيانات)
| | |
|---|---|
| يعتمد على | Suppliers/Customers، Invoices، Numbering (NO_GAPS)، Treasury (جديد) |
| يحتاج | 244 دفعة؛ أرقامها 1…305 مع **61 رقمًا مفقودًا** (دفعات حُذفت سابقًا)؛ 165 دفعة بلا «اتجاه» |
| يتأثر بنقله | رصيد المورد، المتبقي على الفاتورة، كشف الحساب، `accounts` |
| قرارات مانعة | **B-69** (معاملة الفجوات التاريخية)، B-29 (نطاق التسلسل)، B-53 (معنى الاتجاه)، B-52 (الخزائن والبنوك) |
| اختبارات | الأرصدة قبل = بعد؛ لا تكرار رقم تحت التزامن؛ لا رقم يُستهلك عند الفشل؛ الملغاة تحتفظ برقمها |

### 5.6 Contracts & BOQ & Client Certificates — **Implemented** (لا بيانات حقيقية)
| | |
|---|---|
| يعتمد على | Customers, Projects, Numbering, Workflow |
| يحتاج | لا بيانات حالية (صفر عقود/مستخلصات/مقايسات) |
| يتأثر بنقله | Collections, Guarantees, Change Orders, `core/boards`, التقارير |
| قرارات مانعة | B-20 (معادلة صافي المستخلص)، B-23 (الضمان والدفعة المقدمة)، B-26 |
| اختبارات | الـ 58 ملف اختبار واجهة تغطي جزءًا (مثلًا `clInvNet` في phase9/phase14) |

### 5.7 Warehouses — **Partially Implemented** (أساسي)
| | |
|---|---|
| يعتمد على | Projects، **Suppliers/Invoices** (ربط اختياري بفاتورة مورد) |
| يحتاج | **لا بيانات حقيقية** (موقع واحد) |
| يتأثر بنقله | `accounts` (تقارير المخازن)، `core/cost-center`, `core/alerts-center`، (لاحقًا) Procurement |
| قرارات مانعة | **B-26** (دقة الكميات)، **B-49** (طريقة التقييم)، **B-50** (الرصيد السالب) |
| اختبارات | اتساق الرصيد مع الحركات؛ منع الصرف الزائد **على الخادم** تحت التزامن |

### 5.8 Procurement — **Not Implemented**
| | |
|---|---|
| يعتمد على | Suppliers, Warehouses, Projects, Workflow, Invoices |
| قرارات مانعة | **B-36, B-37, B-38** (المتطلبات نفسها غير موجودة) |

### 5.9 Labor (العمال، اليوميات، المستحقات) — **Implemented**
| | |
|---|---|
| يعتمد على | Projects, Departments, Supervisors |
| يحتاج | 182 عاملًا، 880 يومية (4 بمرجع شخص مفقود)، المستحقات والجزاءات |
| يتأثر بنقله | تكلفة المشروع، الرواتب، `core/boards`، حماية الأجور على الخادم (`field-guards`) |
| قرارات مانعة | **B-46** (معادلة المستحق)، B-45 (دورة الصرف)، B-47 |
| اختبارات | M-8 (مستحقات كل عامل قبل = بعد) |

### 5.10 Equipment — **Implemented**
| | |
|---|---|
| يعتمد على | Projects, Departments, Supervisors, Drivers |
| قرارات مانعة | B-42 (تحميل التكلفة) |

### 5.11 Costs & Expenses — **Implemented**
| | |
|---|---|
| يعتمد على | Projects (28 من 41 تكلفة بالاسم)، Departments، الأشخاص |
| قرارات مانعة | B-32, B-34 |

### 5.12 Accounting & Cost Centers — **Not Implemented**
| | |
|---|---|
| يعتمد على | كل الموديولات المالية بعد نقلها + Workflow + Numbering |
| قرارات مانعة | B-13…B-19, B-21…B-23, B-32 |

### 5.13 Safety & Risks · Quality & Handover — **Not Implemented** (الجودة: خطوات في مسار المشروع فقط)
| | |
|---|---|
| يعتمد على | Projects (والجودة: Contracts) |
| قرارات مانعة | **B-39, B-40** (المتطلبات غير موجودة) |

### 5.14 Workflow & Approvals — **Not Implemented** (تصميم فقط: `APPROVAL_WORKFLOW_DESIGN.md`)
| | |
|---|---|
| يعتمد على | Users & Permissions، Numbering، Audit |
| يتأثر بتفعيله | كل مستند مالي — **يغيّر سلوكًا قائمًا** (التعديل والحذف الحر حاليًا) |
| قرارات مانعة | B-01…B-08 (للتفعيل؛ البناء ممكن ببيانات اختبار) |

### 5.15 Users & Permissions — **Partially Implemented** (على الخادم)
صفحة × 4 أفعال + نطاق مشاريع محددة + حقول حساسة؛ ناقص: مستوى الموديول، أفعال Approve/Reject/Print/Export/Pay/Cancel/Post، نطاقا «إدارته» و«ما أنشأه» (B-35).

### 5.16 Attachments & Reports
- **Attachments — Not Implemented** على الخادم (القرار: داخل PostgreSQL). يعتمد عليه: Invoices (109 مرجعًا)، Suppliers (2)، الأرشيف، الموارد البشرية. قرارات: B-59, B-61.
- **Reports — Implemented** (الواجهة). تقرأ من الكل؛ تُعاد بناؤها مع كل موديول.

---

## 6. استنتاجات للترتيب (Recommendation — يُعتمد في بداية المرحلة 6)

1. **Projects هو أكثر موديول يُرجَع إليه.** نقله (أو على الأقل تثبيت جدوله العلائقي كبيانات أساسية) شرط لأي مفتاح أجنبي في باقي الموديولات. الخطة تضعه في المرحلة 5 «الأساس المشترك — المشروعات والبيانات الأساسية»، وهذا متسق مع التحليل.
2. **Suppliers وCustomers بيانات أساسية بلا اعتماديات وبلا قرارات مانعة** لبياناتها نفسها، ويُرجَع إليها من الفواتير والدفعات والمخازن والعقود.
3. **المخازن ليست مستقلة:** تقرأ فواتير وموردي الدفتر (`warehouses/pages-home.js:270, 326`)، و**تمنعها ثلاثة قرارات** (B-26, B-49, B-50)، و**لا بيانات حقيقية فيها** — أي أن نقلها أولًا يختبر الدورة الهندسية لكنه لا يختبر مطابقة البيانات.
4. **الفواتير والدفعات** هي أكبر بيانات مالية (648 + 244) وأعلى قيمة وأعلى خطرًا، وتمنعها B-20 وB-31 وB-69.
5. **العقود والمستخلصات** بلا بيانات حقيقية حاليًا — خطر ترحيل منخفض، لكن معادلاتها تحتاج B-20.

**الترتيب المقترح (بديل لقائمة الخطة §9 المرحلة 6 — يحتاج موافقة):**
`Projects (المرحلة 5)` ← `Suppliers + Customers (بيانات أساسية)` ← `Warehouses` (بعد B-26/B-49/B-50) ← `Supplier Invoices & Returns` (بعد B-20/B-31) ← `Payments & Collections` (بعد B-69/B-29) ← `Contracts & Certificates` ← `Procurement` (بعد B-36…B-38) ← المرحلة 7 (العمالة والمعدات).

الفرق عن قائمة الخطة: Suppliers/Customers قبل Warehouses لأن المخازن تعتمد عليهم وتمنعها قرارات أكثر. **القرار للمستخدم.**
