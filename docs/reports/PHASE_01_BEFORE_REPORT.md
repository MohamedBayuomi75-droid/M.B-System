# تقرير ما قبل المرحلة 1 — توحيد التقارير والتخطيط المعماري

- **التاريخ:** 2026-11-17 · **الفرع:** `claude/new-session-vlpwzt` · **آخر commit:** `fe40b15`
- **المرجع:** `docs/ERP_MASTER_IMPLEMENTATION_PLAN.md` (v1.0، 16 نوفمبر 2026) §9 المرحلة 1 و§12–§13.
- **الموافقة:** طلب المستخدم «ابدأ بتنفيذها مرحلة بمرحلة» ثم «كمل» (2026-11-17). النطاق محدود بالمرحلة 1 فقط.

## 1. الوضع الحالي

| البند | الحالة |
|---|---|
| كود التطبيق | آخر تغيير في commit `ce59f53` (A4). لا تعديلات غير محفوظة على الكود |
| وثائق موجودة ومحفوظة | تقارير الفحص السبعة (commit `fe40b15`): `CURRENT_SYSTEM_AUDIT`, `FEATURE_INVENTORY`, `ARCHITECTURE_GAP_ANALYSIS`, `DATABASE_AUDIT`, `SECURITY_AUDIT`, `IMPLEMENTATION_BACKLOG`, `TEST_BASELINE` |
| وثائق موجودة وغير محفوظة في git | `TARGET_ARCHITECTURE`, `ARCHITECTURE_DECISIONS`, `APPROVAL_WORKFLOW_DESIGN`, `ACCOUNTING_ROADMAP`, `OPEN_BUSINESS_DECISIONS` (من مرحلة التوثيق السابقة) |
| الخطة المرجعية | تغيّرت إلى `ERP_MASTER_IMPLEMENTATION_PLAN.md` v1.0، وفيها **قرارات جديدة محسومة**: دقة 4 خانات، تقريب HALF_UP، ترقيم NO_GAPS |
| وثائق تطلبها الخطة §13 وغير موجودة | `MODULE_MIGRATION_PLAN`, `MODULE_DEPENDENCY_MAP`, `SECURITY_AND_BACKUP_PLAN`, `ERP_RISK_REGISTER`, `CLAUDE_CODE_MASTER_INSTRUCTIONS`, `reports/` |

## 2. نطاق المرحلة 1 (من الخطة §9)

1. دمج تقارير الفحص في الخطة الرئيسية.
2. مراجعة التعارضات والاعتماديات.
3. تثبيت القرارات المؤكدة وتصحيح المفتوحة.
4. إعداد خريطة الموديولات والمخاطر.
5. إعداد معايير قبول كل مرحلة.

**خارج النطاق:** أي تعديل على الكود أو قاعدة البيانات أو البيانات؛ أي Migration؛ تثبيت تبعيات؛ أي تنفيذ من المرحلة 2.

## 3. الملفات المتأثرة

| الملف | العملية |
|---|---|
| `docs/ERP_MASTER_IMPLEMENTATION_PLAN.md` | نسخ الخطة كما هي (بلا تعديل) |
| `docs/reference/ERP_Target_Architecture_v1.md`, `docs/reference/Claude_Code_Next_Phase_Prompt.md` | نسخ مرجعية للمرفقات السابقة (كانت غير موجودة في المستودع) |
| `docs/TARGET_ARCHITECTURE.md`, `docs/ARCHITECTURE_DECISIONS.md`, `docs/OPEN_BUSINESS_DECISIONS.md`, `docs/ACCOUNTING_ROADMAP.md`, `docs/APPROVAL_WORKFLOW_DESIGN.md` | تحديث بالقرارات الجديدة (4 خانات، HALF_UP، NO_GAPS) دون حذف محتوى مهم |
| `docs/IMPLEMENTATION_BACKLOG.md` | إعادة ربط المهام بالمراحل الـ 12 للخطة الجديدة |
| `docs/MODULE_DEPENDENCY_MAP.md` | **جديد** — من تحليل فعلي للكود والبيانات |
| `docs/MODULE_MIGRATION_PLAN.md` | **جديد** |
| `docs/SECURITY_AND_BACKUP_PLAN.md` | **جديد** |
| `docs/ERP_RISK_REGISTER.md` | **جديد** |
| `docs/CLAUDE_CODE_MASTER_INSTRUCTIONS.md` | **جديد** — يشمل معايير قبول كل مرحلة |
| `docs/reports/PHASE_01_BEFORE_REPORT.md`, `PHASE_01_AFTER_REPORT.md` | **جديد** |

## 4. الاختبارات المخطط تشغيلها

اختبارات آمنة لا تغيّر أي بيانات: `npm run check`، `npm test`، `tsc --noEmit` للخادم، اختبارات الوحدة للخادم، `build-web --check`. للتحقق من سلوك التقريب في PostgreSQL: استعلام `SELECT` على مثيل PostgreSQL مؤقت داخل مجلد الجلسة المؤقت (لا يمس أي قاعدة للمشروع).

## 5. المخاطر

| الخطر | التعامل |
|---|---|
| فقد محتوى مهم عند تحديث الوثائق السابقة | تحديثات موضعية + قسم «ما تغيّر» في كل وثيقة؛ git يحفظ النسخة السابقة |
| خلط التصميم المقترح بالتنفيذ الفعلي | تصنيف إلزامي لكل بند: Implemented / Partially Implemented / Not Implemented / Needs Verification، وفصل Confirmed Decision / Recommendation / Open Business Decision |
| افتراض ترتيب نقل الموديولات (المخازن أولًا) | تحليل الاعتماديات من الكود والبيانات قبل أي ترتيب (الخطة §10) |

## 6. الاعتماديات والقرارات المطلوبة

لا شيء يمنع المرحلة 1. القرارات الإدارية المفتوحة تُوثَّق ولا تُحسم.

## 7. خطة الرجوع

المرحلة وثائق فقط. الرجوع = `git checkout`/`git revert` لملفات `docs/` المعنية. لا أثر على الكود أو البيانات.
