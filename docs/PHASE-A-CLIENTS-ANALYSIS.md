# المرحلة أ — تحليل برنامج العملاء والمشاريع + مخطط البيانات الموحّد

**التاريخ:** 2026-11-10  
**المصدر:** إدارة-العملاء-والمشاريع-1.8.2  
**الهدف:** أساس دمج 0.7 في النظام الموحد (HR كأساس)

---

## 1. نظرة عامة على برنامج العملاء

| البند | التفاصيل |
|---|---|
| التقنية | Electron + **React** (ملف واحد ضخم `app.js` ≈ 14,200 سطر) |
| التخزين | `data.json` عبر `desktopApi` (سطح المكتب) أو localStorage |
| مفتاح التخزين القديم | `cus-module-data-v1` |
| الهيكل | كل شيء تقريباً **متداخل تحت العميل** (`customers[]`) |
| الصفحات | 17 صفحة صلاحيات: dashboard, customers, projects, workSurveys, boqs, contracts, invoices, collections, costs, expenses, accounts, crm, archive, reports, users, settings, myTasks |

### الصفحات الرئيسية ودورة العمل

```
عميل
 └─ مشروع
     └─ أعمال حصر (Work Survey)
         └─ مقايسة (BOQ)
             └─ عقد (Contract)
                 └─ مستخلص (Invoice / Extract)
                     └─ تحصيل / إيراد (Collection)
```

مسار المشروع (Workflow) منفصل ومفصّل جداً (9 مراحل + خطوات داخل كل مرحلة + مرفقات وتواريخ وتخطي).

---

## 2. نموذج البيانات الحالي (Clients)

### 2.1 الجذر (State)

```js
{
  customers: [],      // المصفوفة الأساسية
  settings: {},
  users: [],
  activityLog: [],
  _rev: 0
}
```

### 2.2 العميل (Customer) — الكيان الأب

```js
{
  id: "CUS-0001",
  name: "",
  // ... حقول أساسية (عنوان، هاتف، بريد، تصنيف، رصيد افتتاحي...)
  contacts: [],       // جهات اتصال متعددة
  projects: [],
  contracts: [],
  invoices: [],       // المستخلصات
  collections: [],    // التحصيلات / الإيرادات
  workSurveys: [],    // أعمال الحصر
  boqs: [],           // المقايسات
  guarantees: [],
  ledger: [],         // حركة حساب العميل
  comms: [],          // أنشطة تواصل
  opportunities: [],  // فرص CRM
  docs: [],           // مرفقات عامة
  extraFields: []
}
```

### 2.3 المشروع (Project) — داخل العميل

```js
{
  code: "PRJ-....",
  name: "",
  contractNo: "",
  value: 0,
  start: "YYYY-MM-DD",
  end: "",
  progress: 0,              // نسبة إنجاز
  status: "الدراسة والتخطيط", // أو أي مرحلة من الـ workflow
  stageKey: "study",
  stepKey: "survey_works",
  completedSteps: [],
  stepMeta: {},             // تواريخ + مرفقات لكل خطوة
  stepFiles: {},
  rejectReason: "",
  notes: "",
  assignedTo: "",
  docs: [],
  extraFields: []
}
```

**مراحل الـ Workflow الافتراضية:**
1. الدراسة والتخطيط (حصر، مقايسة، كراسة)
2. تجهيز المستندات
3. المناقصة وترسية المشروع
4. التعاقد
5. التنفيذ والمتابعة
6. المستخلصات
7. المراجعة المالية
8. التسليم الابتدائي
9. الإدارة المركزية للحسابات
(+ تسليم نهائي / مكتمل / متوقف / ملغي)

### 2.4 أعمال الحصر (Work Survey)

- مرتبطة بمشروع
- بنود (items) بكميات وأسعار وطرق حساب (حجم/مساحة/طول/عدد)
- إجماليات حالية وسابقة
- حالة + مرفقات

### 2.5 المقايسة (BOQ)

- مرتبطة بمشروع + أعمال حصر
- بنود مفصّلة (كود، اسم، وحدة، كمية تعاقد، سعر)
- إجمالي

### 2.6 العقد (Contract)

```js
{
  id: "CON-....",
  title: "",
  project: "",              // اسم المشروع
  value: 0,
  start, end, durationMonths,
  status: "ساري",
  workSurveyIds: [],
  boqId: "",
  contractDate,
  paymentTerms, retentionPct, taxPct, advancePct, advanceAmount,
  penaltyPct, penaltyNote,
  notes, assignedTo, docs, extraFields
}
```

### 2.7 المستخلص (Invoice)

```js
{
  no: "",
  project: "",
  date: "",
  value: 0,                 // قيمة الأعمال
  previousWorks, extras, excluded, deductions, advanceDeduct,
  retentionPct, taxPct,
  paid: 0,
  status: "مسودة" | "معتمد" | ...,
  category: "",
  contractId: "",
  workSurveyId: "",
  notes, assignedTo, docs, extraFields
}
```

### 2.8 التحصيل / الإيراد (Collection)

```js
{
  id: "REC-....",
  date, method, amount, refNo,
  invoiceNo, project,
  checkBank, checkDue, checkStatus,
  notes, docs, extraFields
}
```

---

## 3. مقارنة مع النظام الموحد الحالي (HR)

| الجانب | HR / الموحد | Clients |
|---|---|---|
| **المشاريع** | `DATA.projects[]` مستقلة | مشاريع متداخلة تحت كل عميل |
| **التركيز** | موارد (عمال، معدات، مشرفين) + تكلفة لحظية + يوميات | دورة تجارية كاملة (حصر→عقد→مستخلص→تحصيل) |
| **الحالة** | active / paused / completed | 13+ مرحلة workflow |
| **العميل** | غير موجود ككيان | الكيان المركزي |
| **الحقول المشتركة** | code, name, budget, notes, supervisorId | code, name, value, start/end, progress, status |
| **التقنية** | Vanilla JS + صفحات منفصلة | React SPA |

**الخلاصة:**  
صفحة المشاريع في الموحد (التي عدلناها) غطّت الحقول التجارية الأساسية.  
الدمج الحقيقي يحتاج:
1. كيان `customers` في `DATA`
2. رفع المشاريع/العقود/المستخلصات... لمستوى أعلى أو الإبقاء على التداخل مع روابط واضحة
3. توحيد `DATA.projects` ليخدم الموارد (HR) والجانب التجاري (Clients)

---

## 4. المخطط المقترح للبيانات الموحّدة (`DATA`)

### المبدأ
- **HR يبقى الأساس** (مستخدمين، صلاحيات، أرشيف، شبكة، نسخ احتياطي).
- كل بيانات العملاء تحت `DATA.clients`.
- `DATA.projects` يبقى **المشروع الموحّد** (يُستخدم من HR للموارد ومن Clients للجانب التجاري).

```js
DATA = {
  // ===== موجود من HR =====
  employees, workers, supervisors, drivers, equipment,
  attendance, leaves, departments, costs, ...
  projects: [],          // ← المشروع الموحّد (مشترك)
  settings: {},
  users: [],
  auditLog: [],

  // ===== موجود من الدفتر =====
  ledger: { suppliers, invoices, payments, ... },

  // ===== جديد — وحدة العملاء =====
  clients: {
    customers: [],       // العملاء + contacts
    // الكيانات التالية يمكن أن تكون:
    // أ) متداخلة تحت customer (مثل الأصل) — أسهل للترحيل
    // ب) مسطّحة مع customerId — أفضل للاستعلامات والتقارير
    // التوصية للـ 0.7: الإبقاء على التداخل أولاً + فهارس
    workSurveys: [],     // أو داخل customer
    boqs: [],
    contracts: [],
    invoices: [],        // المستخلصات
    collections: [],
    guarantees: [],
    opportunities: [],
    activities: [],      // CRM + comms
    settings: {          // بادئات، فئات مستخلصات، workflow، فواصل أرشيف...
      customerPrefix: "CUS-",
      projectPrefix: "PRJ-",
      contractPrefix: "CON-",
      collectionPrefix: "REC-",
      surveyPrefix: "Q-",
      invoiceCategories: [],
      costCategories: [],
      expenseCategories: [],
      projectWorkflow: null,
      archiveSeparators: [],
      customFieldDefs: {},
      itemCatalog: []
    }
  }
}
```

### المشروع الموحّد (`DATA.projects[]`)

```js
{
  id: "",
  code: "PRJ-....",
  name: "",

  // --- من Clients ---
  customerId: "",          // ربط بالعميل (بعد دمج العملاء)
  customerName: "",        // نص احتياطي
  contractNo: "",
  value: 0,                // القيمة التعاقدية
  start: "",
  end: "",
  progress: 0,
  status: "الدراسة والتخطيط",  // أو stage label
  stageKey: "",
  stepKey: "",
  stepMeta: {},
  assignedTo: "",

  // --- من HR ---
  budget: 0,               // ميزانية تشغيلية
  supervisorId: "",
  notes: "",
  extraFields: [],

  // توافق
  docs: []
}
```

**قاعدة المزامنة:**  
- أي مشروع يُنشأ من شاشة العملاء → يُضاف/يُحدَّث في `DATA.projects`.  
- الموارد (عمال/معدات) تربط بـ `project.name` أو `project.id` كما هو حالياً في HR.

---

## 5. خريطة الصفحات → مفاتيح التنقل في الموحد

| صفحة Clients | مفتاح NAV في الموحد | الإصدار |
|---|---|---|
| لوحة التحكم | clients.dashboard | 0.7 |
| العملاء | clients.customers | 0.7 |
| المشاريع | projects (موجود) | تم تحسينه |
| أعمال الحصر | clients.workSurveys | 0.7 |
| المقايسات | clients.boqs | 0.7 |
| العقود | clients.contracts | 0.7 |
| المستخلصات | clients.invoices | 0.7 |
| CRM | clients.crm | 0.7 |
| مهامي | tasks.my | 0.7 |
| الإيرادات/التحصيلات | clients.collections | 0.8 |
| حسابات العملاء | clients.accounts | 0.8 |
| التقارير | clients.reports | 0.7 |
| الأرشيف | clients.archive | 0.7 → 1.0 توحيد |

---

## 6. تحديات الدمج الرئيسية

1. **React → Vanilla JS**  
   إعادة كتابة الواجهات بأسلوب HR (نفس `renderXxxPage` + `initXxxEvents` + modals).  
   هذا هو المسار الموصى به للحفاظ على توحيد الشكل والصلاحيات والتصدير.

2. **تداخل البيانات تحت العميل**  
   التقارير الشاملة والكشوف تحتاج فهارس أو نسخ مسطّحة.

3. **مسار المشروع (Workflow UI)**  
   `ProjectPathTrack` معقّد. يمكن في 0.7:
   - اختيار المرحلة فقط (كما فعلنا في صفحة المشاريع)
   - ثم إضافة مسار مبسّط
   - المسار الكامل لاحقاً

4. **المستخدمون والصلاحيات**  
   استخدام نظام HR فقط. ترحيل أدوار Clients إلى مصفوفة صلاحيات الصفحات الجديدة.

5. **المرفقات**  
   استخدام نظام مرفقات HR/الموحد الموجود.

6. **الترحيل**  
   أداة استيراد `data.json` من برنامج العملاء → `DATA.clients` + مزامنة المشاريع إلى `DATA.projects`.

---

## 7. ترتيب التنفيذ المقترح لـ 0.7 (بعد انتهاء أ)

1. **أساس البيانات**
   - إضافة `DATA.clients` في `data-store.js` + migration schema
   - ترحيل الحقول الجديدة للمشروع في `DATA.projects` (تم جزء منه)

2. **العملاء + جهات الاتصال** (`clients.customers`)
   - قائمة + نموذج + تفاصيل
   - استيراد Excel

3. **ربط المشاريع بالعملاء**
   - تحديث صفحة المشاريع لاستخدام قائمة العملاء بدل النص الحر

4. **أعمال الحصر → المقايسات → العقود → المستخلصات**
   - بالترتيب (كل واحد يعتمد على اللي قبله)

5. **CRM + مهامي**

6. **التقارير + الأرشيف الأولي**

7. **الصلاحيات + الاستيراد من النسخة القديمة**

---

## 8. الخطوة التالية فوراً

حسب ترتيب الخطة:

**→ تصميم وتنفيذ هيكل `DATA.clients` + migration في `data-store.js`**  
ثم بناء صفحة **العملاء** (`clients.customers`) بنفس أسلوب صفحات HR.

