# خطة «النظام الموحد» → Web App متعدد المستخدمين (مسارين: تشغيل أولًا ثم Angular تدريجيًا)

> النسخة النهائية. تلغي `WEB-MIGRATION-PLAN.md` السابق.
> مبنية على فحص الكود الفعلي (v1.3.53): Electron + vanilla JS (~46 ألف سطر، 83 `<script>`)، كائن `DATA` واحد، 2075 مرجع `DATA.*`، 187 `saveData()`، `SCHEMA_VERSION=9`، 41 دالة `desktopApi`، 60 ملف اختبار في `tests-merge/`.

---

## 0) تعليمات لـ Claude Code (اقرأها الأول)

1. نفّذ **مرحلة واحدة في المرة**. في آخر كل مرحلة: شغّل الاختبارات، حدّث `docs/WEB-STATUS.md`، **واقف** واستنى موافقتي.
2. شغّل على branch `web`، وcommit قبل أي تغيير كبير.
3. **ممنوع** تعيد كتابة الواجهة الحالية في المسار A. الواجهة تفضل vanilla وبنغيّر طبقة البيانات تحتها بس.
4. **ممنوع** تكسر وضع الديسكتوب قبل نهاية المسار A. `desktopApi` تفضل واجهة ثابتة، و`webApi` بنفس الأسماء.
5. الصلاحيات والتحقق من المدخلات **على السيرفر دايمًا**. الواجهة للعرض بس.
6. كل تغيير في الداتابيز = migration مرقّم. مفيش تعديل يدوي.
7. أي كود سيرفر جديد: DTO مُحقَّق + Swagger decorators من أول سطر (ده اللي بيسهّل Angular بعدين).
8. لو الخطة مش متطابقة مع الكود، قول ولا تخمّن.

---

## 1) الفكرة في سطرين

- **المسار A (التشغيل):** نشغّل نفس الواجهة الحالية فوق سيرفر NestJS + PostgreSQL حقيقي بصلاحيات مفروضة على السيرفر. ~2 شهر.
- **المسار B (Angular):** بعد ما A يشتغل، نحوّل **وحدة وحدة** (مخازن ← دفتر ← عملاء ← HR) لـ Angular + جداول علائقية، من غير ما نوقف حاجة. الـ API متصمم من الأول عشان ده يحصل بسهولة.

**ليه مش Angular من الأول؟** ده إعادة كتابة 46 ألف سطر فيها منطق مالي (رواتب، مستخلصات، فواتير). بنقلل المخاطرة: نثبّت السيرفر والبيانات والصلاحيات الأول، وبعدين نبدّل الواجهة بأمان وكل وحدة بتتقارن أرقامها بالقديم.

---

## 2) القرارات المعمارية (ثابتة)

### 2.1 الـ Stack
| الطبقة | الاختيار |
|---|---|
| Backend | **NestJS (TypeScript)** — modules, Guards, Pipes |
| ORM | **TypeORM** + migrations مرقّمة (`synchronize: false` دايمًا) |
| DB | **PostgreSQL 16** |
| Auth | **Passport** (`passport-local` + `passport-jwt`), JWT access قصير (15 د) + refresh token في جدول (HttpOnly cookie) |
| كلمات المرور | **argon2id**. الحسابات القديمة scrypt بتتحقق بالقديم وأول دخول ناجح يعيد تشفيرها (ماتحولش لـ bcrypt مباشرة: هيجبر الكل على reset) |
| Validation | `class-validator` + `class-transformer`, `ValidationPipe({whitelist:true, forbidNonWhitelisted:true})` |
| Realtime | **Socket.IO** (NestJS Gateway) + Postgres `LISTEN/NOTIFY` |
| API docs | **Swagger/OpenAPI** (`@nestjs/swagger`) — مصدر توليد عميل Angular |
| ملفات | S3-compatible (MinIO محليًا / R2 / S3) |
| PDF | Playwright (Chromium) على السيرفر + خطوط عربية في الصورة |
| Excel | في المتصفح (`vendor/xlsx.full.min.js`) |
| Proxy | Caddy (HTTPS تلقائي) |
| النشر | Docker Compose على VPS |
| مراقبة | pino + Sentry + uptime monitor |

### 2.2 نموذج البيانات: طبقتين (ده مفتاح الانتقال لـ Angular)
**الطبقة 1 — جدول عام للوحدات القديمة (من أول يوم):**
```sql
records(collection text, id text, data jsonb, rev int, project_id text,
        deleted_at timestamptz, created_at, created_by, updated_at, updated_by,
        PRIMARY KEY (collection, id))
docs(key text PK, data jsonb, rev int, updated_at, updated_by)      -- settings, customFieldDefs, formLayouts...
changes(seq bigserial PK, collection, id, op, rev, user_id, at, diff jsonb)
audit_log, users, sessions, roles, user_permissions, attachments, schema_meta
```
كل مصفوفة في `DATA` (مثل `employees`, `ledger.invoices`, `clients.contracts`, `warehouses.movements`) = collection. الخريطة تتولد آليًا (`server/src/tools/collections-map.ts`).

**الطبقة 2 — جداول علائقية حقيقية لكل وحدة بتتحوّل لـ Angular ("Promotion"):**
لما وحدة تتحوّل: بنعمل لها جداول بأعمدة وعلاقات ومفاتيح أجنبية، ونرحّل بياناتها من `records`، و**الطبقة 1 تفضل شغالة كـ adapter فوق الجداول الجديدة** عشان الواجهة القديمة تكمّل شغل لحد ما الصفحة تتبدل. يعني مفيش وقت توقف ولا نسختين من الحقيقة.

### 2.3 واجهتين للـ API (نفس الداتا، نفس الصلاحيات)
- **Compat API (للواجهة القديمة):** `GET /api/bootstrap`, `POST /api/sync` (تغييرات على مستوى السجل مع `baseRev` ودمج حقول)، `WS /stream`.
- **Resource API (لـ Angular وأي عميل جديد):** `/api/v1/{module}/{resource}` REST تقليدي (GET list مع pagination/filter/sort، GET one، POST، PATCH، DELETE) + DTOs + Swagger. بيتبني **كل ما وحدة تتجهز**، وكمان لأي ميزة جديدة تتضاف (تقارير، إلخ).
- الاتنين بيمرّوا على **نفس طبقة الصلاحيات والـ audit والـ services**.

### 2.4 الصلاحيات (السيرفر هو المرجع)
- نفس مفاتيح الصفحات في `renderer/core/permissions.js` (`HR_PAGES` + قوالب الأدوار) تتنقل لـ `server/src/authz/roles.ts` كمصدر وحيد. الواجهة تقراها من `GET /api/me`.
- `collection-pages.ts`: كل collection/resource ← صفحة، والأفعال `view/add/edit/delete` + `editData/deleteData/manageUsers`.
- **نطاق المشروع (row-level):** مستخدم ممكن يتحدد له مشاريع → فلترة `project_id`.
- **حقول حساسة** (رواتب، أرصدة): `field-guards.ts` بيشيلها من الـ response لو مفيش صلاحية.
- أدوار seed: `admin, hr, viewer, payroll, clientsSales, clientsAccounts, clientsProjects` + `warehouse`, `ledgerAccountant`.
- **اختبار إلزامي:** مصفوفة (دور × collection × فعل) تتولّد وتتجرّب آليًا على الـ API.

### 2.5 قواعد تسهّل Angular (تتطبق من أول يوم)
1. **منطق الحسابات ينتقل للسيرفر تدريجيًا** كـ services نقية (مثل `projectCostSummary`، الرواتب، أرصدة الموردين، مدفوع المستخلصات) بدل ما يفضل مدفون في `helpers.js`. وفي الواجهة القديمة نعزله في ملفات دوال نقية بدون لمس `DOM`.
2. **كل كيان له `id` ثابت**، والربط بالـ id (مش بالاسم). ترحيل v9 (`projectId`) موجود، وأي ربط نصي متبقي يتقفل قبل ترقية أي وحدة.
3. **حزمة أنواع مشتركة** `packages/shared-types` (interfaces للكيانات وحالاتها: `EMPLOYEE_STATUS`, `EQUIPMENT_STATUS`, ...) بتتولد من الـ entities وتتشارك مع Angular.
4. **عميل Angular مولَّد** من OpenAPI (`openapi-typescript-codegen` أو `ng-openapi-gen`) بدل كتابة services بإيدينا.
5. **نفس الأصل (origin) ونفس الكوكي:** الواجهة القديمة على `/legacy/*` وAngular على `/app/*` خلف نفس Caddy، فالجلسة واحدة ومفيش CORS.
6. **جدول توجيه الصفحات** `page-routing.json`: `{ "warehouses.home": "angular", "hr.employees": "legacy", ... }`. القائمة الجانبية بتفتح الصفحة في الواجهة المسؤولة عنها، ورابط واحد بيبدّل. تحويل صفحة = تغيير سطر في الملف ده.
7. **RTL من الأول** في Angular (`dir="rtl"`، Angular Material أو PrimeNG بدعم RTL) وخط عربي موحّد.

---

## 3) هيكل المشروع

```
/ (الجذر الحالي)
├── renderer/                  ← الواجهة القديمة (تفضل مصدر الحقيقة في المسار A)
├── server/                    ← NestJS
│   └── src/
│       ├── auth/  users/  roles/  authz/
│       ├── data/              (records, docs, bootstrap, sync, merge)
│       ├── realtime/          (Socket.IO gateway)
│       ├── attachments/  pdf/  backup/  audit/
│       ├── modules/           ← وحدات Promotion (warehouses/, ledger/, clients/, hr/) كل واحدة: entities, dto, service, controller
│       ├── migrations/
│       └── tools/             (collections-map.ts, import-legacy.ts)
├── packages/shared-types/
├── web/                       ← غلاف الويب للواجهة القديمة (web-api.js, sync-client.js, login.html)
├── web-ng/                    ← Angular (يتنشأ في المسار B)
├── docker/                    (compose, Caddyfile, Dockerfiles)
└── docs/WEB-STATUS.md, WEB-DECISIONS.md, OPERATIONS.md, page-routing.json
```

---

## 4) المسار A — التشغيل على سيرفر (الواجهة الحالية)

### A0 — خط أساس (يومين)
- `git init`, branch `web`, شغّل `npm run check` و`npm test` وسجّل النتيجة.
- نظّف `tests-merge/harness.js` من المسارات الثابتة (`/opt/npm-tools`, `/home/claude/work/...`) → env.
- ولّد: جرد `desktopApi.*`، خريطة الـ collections، تقرير بأحجامها (اطلب مني `data.json` حقيقي).
- اكتب `docs/WEB-DECISIONS.md`.
**قبول:** الاختبارات القديمة بتعدي، والجرد والخريطة في `docs/`.

### A1 — هيكل السيرفر والداتابيز (4 أيام)
- مشروع NestJS + TypeORM + PostgreSQL + Docker Compose، `GET /api/health`، pino، config من env، Swagger على `/api/docs`.
- migrations للجداول (الطبقة 1).
- اختبار توافق تحقق scrypt القديم + argon2 الجديد.
**قبول:** `docker compose up` يشغّل كل حاجة وmigrations من الصفر.

### A2 — المصادقة والمستخدمون والأدوار (4 أيام)
- Passport local + JWT، refresh في جدول وcookie `HttpOnly; Secure; SameSite=Lax`، logout من كل الأجهزة.
- Rate limit للدخول (5/دقيقة لكل IP+user) + قفل مؤقت للحساب. أول تغيير كلمة مرور إجباري للحساب الافتراضي، حد أدنى 10 حروف.
- CRUD المستخدمين (`manageUsers`)، تفعيل/تعطيل، reset.
- نقل قوالب الأدوار لـ `roles.ts` و`GET /api/me`.
**قبول:** مستخدمين بأدوار مختلفة يدخلوا، وكل endpoint محمي يرجّع 401/403 صح.

### A3 — طبقة البيانات + الصلاحيات + Realtime (أهم مرحلة، 8–10 أيام)
- `collection-pages.ts` + `field-guards.ts`.
- `GET /api/bootstrap` مفلتر بالصلاحيات والمشروع.
- `POST /api/sync` في transaction مع `baseRev`، دمج على مستوى الحقول، ورفض صريح بدل الدمج الصامت للحقول المالية لو اتغيّرت من اتنين.
- Socket.IO: توثيق JWT عند الاتصال، غرف حسب الصلاحية، بث `{seq, collection, id, op, data}` (بديل polling كل 4 ثواني).
- `changes` + `audit_log`.
- مصفوفة اختبار الصلاحيات + اختبار حمل (50 مستخدم) + اختبار تعارض.
**قبول:** `viewer` مايقدرش يعدّل حتى بـ request يدوي، ومن غير `payroll.view` مايستلمش الرواتب، و50 مستخدم متزامن من غير تعارض صامت.

### A4 — غلاف الويب للواجهة القديمة (8–10 أيام)
- `web/web-api.js`: `window.desktopApi` بنفس الأسماء فوق `/api/*`.
- `web/sync-client.js`: `loadData`←bootstrap، `saveData`←diff + sync، `saveDataSync`←`fetch keepalive`/`sendBeacon`، استقبال Socket.IO يحدّث `DATA` (مع احترام `isUserTypingOrEditing`).
- `index.html` للويب بدون: updater، مجلد البيانات، سكانر ويندوز، إعدادات الشبكة القديمة. + شاشة دخول.
- الصلاحيات من `/api/me`، وترحيل أي `localStorage` بيستخدم كمصدر بيانات.
- تحديث `harness.js` ليختبر `webApi` فوق سيرفر حقيقي.
**قبول:** كل أقسام الـ 11 شغالة في المتصفح، تعديل مستخدم بيظهر عند التاني لحظيًا، واختبارات `tests-merge` بتعدي.

### A5 — المرفقات (5 أيام)
- رفع/تحميل/حذف عبر S3 (multipart، حد 25MB، قائمة MIME، فحص magic bytes) وجدول `attachments`، التحميل بعد فحص صلاحية الـ owner (signed URL 5 دقايق).
- استبدال ~65 استدعاء (`pickAttachments/openAttachment/deleteAttachment/...`)، والسكانر ← كاميرا/رفع PDF.
- `cleanupOrphans` ← مهمة سيرفر (أدمن، dry-run أولًا).
**قبول:** كل صفحة فيها مرفقات شغالة، وعدم الوصول لملف من غير صلاحية حتى بمعرفة الـ id.

### A6 — PDF / Excel / نسخ احتياطي (5 أيام)
- `POST /api/pdf` (Playwright + خطوط عربية RTL) و`exportArchive` كـ ZIP stream.
- Excel (تصدير/استيراد) في المتصفح.
- `pg_dump` ليلي + WAL archiving (PITR) على S3 منفصل، **واختبار استعادة فعلي على بيئة تانية**.
- تعديل `pages-backup.js` لقائمة نسخ + تنزيل + "نسخة الآن".
**قبول:** PDF عربي سليم، Excel شغال، واستعادة ناجحة موثّقة.

### A7 — ترحيل البيانات الحالية (4 أيام)
- `import-legacy.ts`: يشغّل ترقيات الـ schema لـ v9 → يوزّع على `records/docs` ويستخرج `project_id` → يرحّل المستخدمين (نفس salt/hash) → يرفع المرفقات ويحوّل `filePath` ← `attachmentId` → `auditLog`.
- **dry-run** بتقرير (أعداد قبل/بعد، مرفوضات، مرفقات مفقودة)، ومقارنة إعادة بناء `DATA` بالأصل.
**قبول:** مطابقة 100% على بيانات حقيقية، وأرقام الفواتير والدفعات والمستخلصات متطابقة مع الديسكتوب.

### A8 — الأمان والأداء (6 أيام)
- مراجعة XSS شاملة (الواجهة بتبني HTML نصًا): فحص آلي لكل `innerHTML` + اختبار payload `<img onerror>` على كل الحقول. CSP من `report-only` لإنفاذ.
- 2FA (TOTP) للأدمن، CORS مقفول، headers أمنية، HSTS.
- أداء: pagination/lazy-load للـ collections الكبيرة (الحضور اليومي أولًا)، gzip/brotli، فهارس، `EXPLAIN`.
- OWASP ZAP baseline.
**قبول:** ZAP بدون High، bootstrap < 3 ث ببيانات حقيقية، 100 مستخدم متزامن مستقرين.

### A9 — النشر والـ Pilot (5 أيام)
- VPS + دومين + Caddy + Compose، `staging` و`production`، CI (lint+test+build+deploy staging).
- Sentry/uptime/تنبيهات قرص، `docs/OPERATIONS.md` (نشر، rollback، استعادة، تدوير أسرار).
- **Pilot أسبوعين** بمجموعة صغيرة بالتوازي مع الديسكتوب، وبعدها التحويل الكامل.
**قبول:** شغال على دومينك بـ HTTPS، ونشر واستعادة مجرّبين.

---

## 5) المسار B — التحويل التدريجي لـ Angular (بعد نجاح A9)

### B0 — تجهيز Angular (أسبوع)
- `web-ng/` بـ Angular 18+ (Standalone + Signals)، Angular Material أو PrimeNG بدعم RTL.
- عميل API مولَّد من OpenAPI + `packages/shared-types`.
- Auth: بيشارك نفس الكوكي، `AuthGuard`/`PermissionGuard` بيقرا `/api/me`، و`PermissionDirective` (`*hasPerm="'ledger.invoices:edit'"`).
- غلاف موحّد (Header + قائمة جانبية) متطابق مع القديم، وSocket.IO service للتحديث اللحظي.
- Caddy: `/legacy/*` ← القديم، `/app/*` ← Angular، و`page-routing.json` شغّال.
**قبول:** صفحة تجريبية Angular تفتح من القائمة بنفس الجلسة وبنفس الصلاحيات.

### B1…B4 — ترقية الوحدات (بالترتيب)
**الترتيب المقترح:** `warehouses` (الأصغر 557 سطر، تجربة للعملية) ← `ledger` (مالي، 9k) ← `clients` (6k) ← `hr` (الأكبر 12.5k).

**قائمة الترقية لكل وحدة (Promotion Checklist):**
1. تصميم الجداول العلائقية (مفاتيح أجنبية، قيود، فهارس) + migration يرحّل من `records`.
2. Entities + DTOs + Services (منطق الحسابات يتنقل هنا) + Controllers REST + Swagger.
3. **Adapter** يخلّي الـ Compat API للـ collections دي تقرا/تكتب من الجداول الجديدة (الواجهة القديمة تفضل شغالة).
4. صفحات Angular (واحدة واحدة) بنفس الوظائف.
5. **اختبارات تكافؤ (parity):** نفس بيانات الدخل ← نفس الأرقام في الواجهتين (مجاميع، أرصدة، رواتب، تقارير).
6. قلب السطر في `page-routing.json` لصفحة صفحة، مع إمكانية الرجوع فورًا.
7. بعد استقرار أسبوعين: حذف الصفحة القديمة وكود الـ adapter غير المستخدم.

**معيار قبول كل وحدة:** كل صفحاتها في Angular، أرقام التكافؤ متطابقة، ومفيش اعتماد من الباقي على `DATA.<unit>` القديم.

### B5 — إنهاء القديم
- حذف `renderer/` و`web/` وAdapters، والـ `records` يفضل فقط لأي collection لم تُرقَّ (ولازم تبقى صفر).
- مراجعة نهائية للأداء والأمان، وتحديث `OPERATIONS.md`.

---

## 6) المخاطر

| الخطر | التعامل |
|---|---|
| XSS (HTML نصي + متعدد المستخدمين) | مراجعة شاملة + CSP + اختبار payloads (A8) وتبدأ بدري |
| فقد بيانات أثناء الترحيل | dry-run + نسخة كاملة + pilot بالتوازي |
| دمج تلقائي يخبّي خطأ مالي | رفض صريح للحقول المالية المتعارضة بدل الدمج |
| `DATA` ضخم في الذاكرة | lazy-load وفلترة بالصلاحية والمشروع |
| اختلاف أرقام بين القديم وAngular | اختبارات parity إلزامية قبل قلب أي صفحة |
| ربط المشاريع بالاسم في سجلات قديمة | تقرير ترحيل v9 يتراجع قبل A7 |
| PDF عربي/RTL | خطوط ثابتة في Docker + اختبار بصري |

---

## 7) الوقت والتكلفة (تقريبي)

- **المسار A:** 8–10 أسابيع.
- **المسار B:** ~2–3 أسابيع لـ B0+مخازن، وكل وحدة كبيرة 4–8 أسابيع. يتنفذ بالتوازي مع تشغيل الشركة على النظام الجديد.
- **تشغيل شهري (سيرفر محلي — D-018):** نسخ احتياطي برّه الشركة ≈ 1–3$ + دومين ≈ 1$ ≈ **2–4$** (من غير الكهربا والصيانة).

---

## 8) قرارات محتاجها منك قبل ما نبدأ

- [x] الدومين: دومين على Cloudflare + Tunnel، و`APP_DOMAIN` في env (D-018)
- [x] الاستضافة: **سيرفر محلي في الشركة** (Ubuntu 24.04 + Docker Compose + Cloudflare Tunnel)، MinIO للمرفقات، ونسخ محلية + مشفّرة على B2 (D-018)
- [x] عدد المستخدمين (الآن / بعد سنة): `50 / 100` متزامن كهدف تصميم (D-017)
- [x] مستخدمين خارج مصر؟ مش مفترض، ومن غير حجب جغرافي، UTC + عرض Africa/Cairo (D-017)
- [x] الديسكتوب يكمّل جنب الويب لحد نهاية A9، وبعد التحويل قراءة بس لشهر ثم يتلغى (D-017)
- [x] أدوار إضافية: `projectManager` اتنفّذ (D-017)
- [x] `data.json` حقيقية اتسلّمت. المرفقات: مفيش ملفات، و111 مرجع هيتنقلوا «مفقود» (D-017)
- [x] مكتبة UI لـ Angular: PrimeNG (D-017)

---

## 9) أول رسالة تديها لـ Claude Code

```
اقرأ UNIFIED-WEB-PLAN.md كامل. هنفّذ على مراحل ومش هتنتقل لمرحلة جديدة قبل ما أوافق.
ابدأ بالمرحلة A0 فقط:
- git init + branch web
- شغّل npm run check و npm test وسجّل النتيجة
- نظّف tests-merge/harness.js من المسارات الثابتة
- ولّد جرد desktopApi وخريطة الـ collections
- اكتب docs/WEB-STATUS.md و docs/WEB-DECISIONS.md
ولما تخلص لخّص اللي اتعمل ووقّف.
```
