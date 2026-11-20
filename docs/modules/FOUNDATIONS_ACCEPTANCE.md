# قبول الأساسيات المشتركة — تتبّع بوابة المرحلة 5 (خطة v1.4.5)

> **المرجع:** `docs/plan-v1.4.5/02_EXECUTION_ROADMAP.md` §Phase 5، و`docs/reports/v1.4.5/PHASE_05_BEFORE_REPORT.md` (النطاق المعتمد 2026-11-20).
> **البوابة:** اختبارات الصلاحيات، والتدقيق، وسلامة المرفقات، والترقيم (تزامن ورجوع)، والـ idempotency **كلها ناجحة**، و**سياسة الاعتمادات الحقيقية مش مفعّلة**.

## 1. الأنشطة ← الكود ← الاختبارات ← الحالة
| النشاط | الكود | الاختبارات | الحالة |
|---|---|---|---|
| المستخدمين والأدوار والصلاحيات | `server/src/users`، `auth`، `authz` | `users.e2e-spec.ts`، و`auth.e2e-spec.ts`، و`two-factor.e2e-spec.ts`، و`matrix.e2e-spec.ts` (دور × مجموعة × فعل على HTTP)، و`security.e2e-spec.ts` | Verified |
| نطاق المشاريع | `server/src/data/policy.ts` (`inProjectScope`) | `platform.e2e-spec.ts`، و`attachments.e2e-spec.ts` (مدير مشروع)، و`data.e2e-spec.ts` | Verified |
| سجل التدقيق | `server/src/audit`، والـ triggers في الـ migrations | `audit.e2e-spec.ts` (القيمة القديمة في كل تعديل وحذف، والجداول insert-only لدور التطبيق، ومنع تعطيل الـ triggers)، و`foundation.e2e-spec.ts` (تاريخ السجل) | Verified |
| المرفقات والأرشيف | `server/src/files` (`file-inspector.ts`، و`pdf-scan.ts`) | `file-inspector.spec.ts`، و**`pdf-scan.spec.ts`** (11 ملف مولّد بـ qpdf)، و`attachments.e2e-spec.ts` (منها **B-78 أ**) | Verified. **B-78 (أ) اتنفّذ** (§2) |
| الإشعارات | `server/src/notifications` | `foundation.e2e-spec.ts` (notifications)، و`tests-web/app-e2e.js` [6b] (الجرس) | Verified |
| هوية المستند والإصدارات | `server/src/files` (versions) | `foundation.e2e-spec.ts` (replacing creates a new version)، و`app-e2e.js` [6b] | Verified |
| محرك الاعتمادات | `server/src/approvals` | `foundation.e2e-spec.ts`: ANY/ALL/N_OF_M، والرفض بسبب، والإرجاع والسحب والإلغاء، والفصل بين المهام، وB-05 وB-07، والسجل append-only | Verified. **السياسة الحقيقية مش مفعّلة**: مفيش workflow افتراضي، والطلب من غير workflow ← `422 NO_WORKFLOW` |
| الترقيم NO_GAPS | `server/src/numbering` | `foundation.e2e-spec.ts`: 50 متزامن ← 1..50، والمعاملة الفاشلة مابتستهلكش رقم، والإصدار برا معاملة مرفوض، والإلغاء بيحتفظ بالرقم | Verified |
| Idempotency والتزامن | `server/src/common/idempotency.ts`، و`rev` في `DataService`، والأقفال | `foundation.e2e-spec.ts` (إعادة نفس الرد `idempotent-replay`)، و`data.e2e-spec.ts` (تعارض `rev`)، و`platform.e2e-spec.ts` (الرجوع الكامل والأقفال) | Verified |
| البيانات المرجعية المشتركة | **`server/src/reference`** (جديد) | **`reference.e2e-spec.ts`** | Verified (قراءة بس، §3) |

## 2. B-78 (أ): PDF بتشفير بيقيّد الصلاحيات بس
- **المقبول:** Standard Security Handler من R2 لـ R4 (RC4 40/128، وAES-128)، بكلمة سر مستخدم فاضية. بيتفك **في الذاكرة بس** عشان الفحص، **والملف الأصلي بيتخزّن زي ما هو** (الاختبار بيقارن التنزيل بالأصل بايت ببايت).
- **المرفوض بكود واضح:**
  - `PDF_PASSWORD`: كلمة سر فتح فعلية.
  - `PDF_ENCRYPTION_UNSUPPORTED`: AES-256 (R5/R6)، أو handler غير Standard (قرار المستخدم 2026-11-20).
  - `PDF_UNREADABLE`: object stream تالف أو بضغط غير مدعوم.
  - `PDF_ACTIVE_CONTENT`: محتوى نشط.
- **ثغرة اتقفلت في نفس الوقت:** JavaScript جوه **object stream مضغوط** كان بيعدّي الفحص حتى في الملفات **اللي مش مشفّرة**، لأن الفحص كان على البايتات الخام بس. دلوقتي الـ object streams بتتفك (وبيتفك تشفيرها) قبل الفحص (`js-plain-objstm.pdf`، و`js-aes-128-objstm.pdf`).
- **ملفات الاختبار** مولّدة بمكتبة مستقلة (qpdf عن طريق pikepdf، `tools/security/make-pdf-fixtures.py`)، **ومفيش أي ملف حقيقي**.

## 3. البيانات المرجعية (قراءة بس)
- `GET /api/v1/reference`: كل المفاتيح من النوع `lookup` في كتالوج البيانات المولَّد، بالعدد و`rev`.
- `GET /api/v1/reference/:key`: القايمة بنفس شكلها في الواجهة القديمة. الاختبار بيقارنها بـ `/api/bootstrap`.
- **الصلاحية زي القديمة** (أي مستخدم مسجّل). **الكتابة لسه من الواجهة القديمة** لحد ما موديول القايمة يتنقل.

## 4. الإثبات على المرفقات الحقيقية (5.2، على اللابتوب)
```powershell
docker compose -p erp-phase2-proof -f <compose.yml> run --rm -v "<مجلد نسخة المرفقات>:/files:ro" server node dist/cli/inspect-files.js /files
```
المخرج **أعداد وأكواد بس** (مفيش أسماء ولا محتوى): عدد الملفات، والنتايج حسب الكود، وكام PDF مشفّر اتقبل، وإن الفحص مابيغيّرش الملفات. **النتيجة:** ⏳ (بتتسجّل في تقرير ما بعد المرحلة 5).

## 5. مش جوه البوابة
- تفعيل سياسة اعتمادات حقيقية (B-01…B-08).
- الإشعارات بالبريد (المرحلة 12).
- ترحيل المرفقات الفعلي (مع موديولاتها).
