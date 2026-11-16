# قرارات مشروع الويب (WEB-DECISIONS)

> سجل القرارات المعمارية لتحويل «النظام الموحد» لـ Web App. المرجع الكامل: [`UNIFIED-WEB-PLAN.md`](UNIFIED-WEB-PLAN.md).
> أي قرار جديد أو تعديل = سطر جديد هنا بتاريخ وسبب. القرارات المعلّمة **⏳** مستنية رد صاحب المشروع.

## D-001 — المسارين (2026-11-15)
**القرار:** المسار A (نفس الواجهة الـ vanilla فوق NestJS + PostgreSQL) أولًا، ثم المسار B (Angular وحدة وحدة).
**السبب:** 46k سطر فيها منطق مالي؛ إعادة الكتابة دفعة واحدة مخاطرة عالية. نثبّت السيرفر والصلاحيات والبيانات الأول.

## D-002 — الـ Stack (من الخطة §2.1، ثابت)
NestJS + TypeORM (`synchronize:false`، migrations مرقّمة) + PostgreSQL 16 + Passport (local+JWT) + argon2id + class-validator + Socket.IO + Swagger + S3/MinIO + Playwright PDF + Caddy + Docker Compose.

## D-003 — نموذج البيانات طبقتين (من الخطة §2.2)
- **الطبقة 1:** `records(collection,id,data jsonb,rev,project_id,...)` + `docs(key,data jsonb,rev)` + `changes` + `audit_log`.
- **الطبقة 2:** جداول علائقية لكل وحدة وقت ترقيتها لـ Angular، والطبقة 1 تفضل adapter فوقها.
- **تصنيف المفاتيح** متولّد آليًا في [`web/collections-map.md`](web/collections-map.md) (`npm run inventory`):
  - `collection` (53) → صف لكل سجل في `records`.
  - `lookup` (27) و`doc` (24) و`meta-flag` (4) → صف واحد لكل مفتاح في `docs`.
  - `users`/`auditLog` → جداول مخصصة (`users`, `audit_log`) مش `records`.
  - المصفوفات المتداخلة (مثل `clients.customers[].projects`) تفضل جزء من سجل الأب في المسار A؛ تتفك في Promotion.
  - التصنيف **مقترح ويتراجع في A3**، خصوصًا الـ `lookup` اللي فيه سجلات بـ `id`.

## D-004 — اسم الـ branch (2026-11-15)
**الخطة بتقول** branch اسمه `web`. **بيئة التشغيل الحالية (Claude Code على الويب) بتسمح بالـ push على branch واحد بس: `claude/new-session-vlpwzt`.**
**القرار:** الشغل كله على `claude/new-session-vlpwzt` لحد ما صاحب المشروع يأكد. ممكن نعمل `web` منه في أي وقت (`git branch web`) أو بـ PR.
**ملاحظة:** الـ repo كان فاضي — أول commit هو استيراد v1.3.53 من الـ zip زي ما هو (من غير تعديل) + نسخة الخطة في `docs/`.

## D-005 — كلمات المرور (يُطبَّق في A1/A2/A7)
- الهاش الحالي: `scrypt(normalize(p), salt, 64)` حيث `normalize` = `String(p).slice(0, 256)` (`src/main/password.js`). **لازم السيرفر يكرّر نفس الـ normalize بالظبط** وإلا كلمات مرور أطول من 256 حرف مش هتتطابق (نادر بس لازم يتغطى في اختبار التوافق).
- أول دخول ناجح بـ scrypt → إعادة تشفير بـ argon2id وتخزين نوع الخوارزمية في عمود (`password_algo`).
- **سياسة الطول:** الحالية 8 حروف؛ الخطة 10. **القرار:** 10 للكلمات الجديدة/المتغيّرة بس، والحسابات القديمة تدخل عادي (مش هنجبر reset).
- كلمات افتراضية ممنوعة (`admin123`, `123456`) تفضل ممنوعة.

## D-006 — مصدر المستخدمين المزدوج (ملاحظة لـ A2/A7)
النسخة الحالية فيها مصدرين للمستخدمين: `DATA.users` (وضع الجهاز الواحد) و`users.json` (وضع الشبكة في `src/main/server.js`). **القرار:** `import-legacy` (A7) يقرا الاتنين ويدمجهم بالـ `username` مع تقرير بالتعارضات؛ ونسخة الويب ماتخزّنش `users` جوه `DATA` خالص.

## D-007 — دوال `desktopApi` (يُطبَّق في A4)
- الجرد في [`web/desktop-api-inventory.md`](web/desktop-api-inventory.md): **40** دالة في `preload.js` (الخطة قالت 41).
- اتنين **مستخدمين في الواجهة ومش موجودين في `preload.js`**: `scanAttachment` (`core/helpers.js`) و`safetyBackup` (`modules/ledger/helpers.js`). الكود بيتحقق من وجودهم قبل النداء فبيتجاهلهم بصمت → في الديسكتوب «نسخة أمان قبل العملية» في الدفتر **مش بتحصل فعليًا**. في الويب: `safetyBackup` ← `POST /api/backups`، و`scanAttachment` ← رفع/كاميرا.
- `webApi` هيكشف **نفس الأسماء الـ 42**، والدوال من فئة `remove` (مجلد البيانات، updater، وضع الشبكة القديم) هترجّع `{ ok:false, reason:'not-available-on-web' }` بدل ما تتشال، عشان مفيش نداء يكسر.

## D-008 — مسارات الاختبارات
`tests-merge/harness.js` بقى بياخد كل المسارات من env: `PLAYWRIGHT_PATH` (افتراضي `require('playwright')`)، `CHROME_PATH` (افتراضي متصفح playwright)، `APP_ROOT` (افتراضي جذر المشروع). وأضفنا `npm run test:ui` يشغّل الـ 58 ملف.

## D-009 — NestJS 11 مش 12 (A1، 2026-11-15)
**الموقف:** NestJS 12 (أحدث نسخة) بقى **ESM فقط**. السيرفر بيشتغل عادي على Node 22، بس Jest على Node 22 مش بيقدر يحمّله (محتاج Node ≥ 24.9).
**القرار:** نثبّت خط **NestJS 11** (`@nestjs/* ^11.2`، `@nestjs/swagger ^11.4`، `@nestjs/typeorm ^11`، `@nestjs/config ^4`) — CommonJS ومستقر، ونفس الـ API تقريبًا. TypeORM 1.1 و TypeScript 5.9 (ts-jest مش بيدعم TS 7 لسه).
**إعادة النظر:** لما نرقّي لـ Node 24 LTS (أو قبل B0)، الترقية لـ 12 = تغيير أرقام النسخ + تشغيل الاختبارات.

## D-010 — تصميم جداول الطبقة 1 (A1)
- **`users`**: `id uuid` (`gen_random_uuid()`) + `legacy_id` (id الديسكتوب للترحيل). اسم المستخدم فريد بدون حساسية للحالة (`uq_users_username_lower` على `lower(username)`).
  كلمة المرور: `password_algo ∈ {argon2id, scrypt}` + `password_hash` + `password_salt` (إجباري لو scrypt — CHECK). الصلاحيات العامة كأعمدة (`can_edit_data`, `can_delete_data`, `can_manage_users`)، و`project_scope text[]` (null = كل المشاريع). كمان `failed_attempts`/`locked_until` (A2)، `token_version` (خروج من كل الأجهزة)، `totp_*` (A8).
  `manageNetwork` القديم **اتشال** (وضع الشبكة القديم بيتلغى في الويب).
- **`user_permissions`**: صف لكل (مستخدم، صفحة) بـ `can_view/add/edit/delete` — نفس شكل `pages[page]` في الديسكتوب، تخصيص فوق قالب الدور.
- **`roles`**: `key` + `permissions jsonb` (نفس شكل `roleTemplates()`). **FK من `users.role` لـ `roles.key` مأجّل لـ A2** مع الـ seed.
- **`records`**: PK `(collection, id)`، `rev > 0`، `project_id` مستخرج، soft delete بـ `deleted_at` + فهرس جزئي للسجلات الحية.
- **`changes`**: `seq bigserial`، `op ∈ {insert, update, delete}`. الـ trigger بتاع `LISTEN/NOTIFY` مأجّل لـ A3 (migration منفصلة).
- **`sessions`**: بنخزن **hash** الـ refresh token بس + `replaced_by` لاكتشاف إعادة استخدام توكن مسروق.
- `schema_meta`: `legacy_schema_version = 9`، `data_layer = "records-v1"`.
- الـ migrations مستوردة صراحةً في `src/migrations/index.ts` (مش glob) عشان نفس القائمة تشتغل في ts-jest و`dist`.
- اختبار **drift** (`createSchemaBuilder().log()` لازم يرجع صفر استعلامات) بيضمن إن الـ entities = الـ migrations.

## D-011 — Docker (A1)
- صورة واحدة `unified-server` (multi-stage، `node:22-alpine`، بتشتغل كمستخدم `node` مش root، HEALTHCHECK على `/api/health`).
- خدمة `migrate` منفصلة بتشغّل `migration:run` وتخرج، والـ `server` مايقومش غير بعد ما تخلص بنجاح (`service_completed_successfully`). السيرفر في الإنتاج **مابيشغّلش migrations بنفسه**.
- PostgreSQL مش مكشوف برّه شبكة Compose. الأسرار من `docker/.env` (متجاهل في git)، و Compose بيرفض يقوم من غير `DB_PASSWORD` و`JWT_SECRET`.
- `init: true` بدل تثبيت `tini` (أبسط، ومن غير ما نحتاج apk وقت الـ build).
- secret اختياري `npm_ca` وقت الـ build للبيئات اللي ورا proxy بيفك TLS (زي بيئة التطوير دي). مابيتنسخش للصورة، ومن غيره الـ build عادي.

## D-012 — سياسة كلمات المرور في السيرفر (تكملة D-005)
`PasswordService`: argon2id (`m=19MiB, t=3, p=1`)، قطع عند 256 حرف (نفس الديسكتوب)، و`needsRehash` بيرجع true للـ scrypt أو argon2 بإعدادات أضعف. السياسة للكلمات الجديدة: 10–128 حرف، و`admin123`/`123456` ممنوعين.

## D-013 — حساب الصلاحيات على السيرفر (A2)
- **المصدر الوحيد:** `server/src/authz/roles.ts` (الصفحات الـ 48 + قوالب الأدوار). اختبار `roles.spec.ts` بيحمّل `renderer/core/permissions.js` الأصلي ويتأكد إن الصفحات والأدوار الـ 7 القديمة **متطابقة حرفيًا**. أي صفحة جديدة تتضاف هنا الأول.
- **أدوار جديدة:** `warehouse` (أمين مخازن) و`ledgerAccountant` (محاسب الدفتر): الوحدة كاملة من غير حذف، وعرض الصفحات العامة والمشاريع. كمان `custom`: من غير أي صفحة، والصلاحيات كلها من التخصيص.
- **الصلاحية الفعلية لكل صفحة:** admin = كل حاجة. غير كده: تخصيص المستخدم (`user_permissions`)، وإلا قالب الدور، وإلا **ممنوع**.
  ⚠️ ده **مختلف عن الديسكتوب**: الديسكتوب كان بيسمح بأي صفحة من غير بادئة لو مش محفوظة في صلاحيات المستخدم (`hasPagePermission` → `return true`). السيرفر بيمنع بالافتراض.
- الصلاحيات بتتقري من الداتابيز **في كل طلب**: تعطيل مستخدم أو تغيير صلاحياته بيسري فورًا، من غير ما نستنى الـ access token يخلص.
- جدول `roles` بيتزامن من `roles.ts` مع كل إقلاع. والـ FK `users.role → roles.key` اتعمل في migration 0002.

## D-014 — المصادقة (A2)
- **Access token:** JWT HS256 صلاحيته 15 دقيقة، وفيه `{sub, tv, sid}` بس (من غير صلاحيات). بيترفض لو `tv ≠ users.token_version` أو لو الجلسة `sid` اتلغت، فـ logout بيسري فورًا.
- **Refresh token:** 32 byte عشوائي في cookie اسمها `rt` (`HttpOnly; Secure; SameSite=Lax; Path=/api/auth`) وعمرها 14 يوم. في الداتابيز بنخزن sha256 بس، و**بيتدوّر مع كل استخدام**.
  - **إعادة استخدام توكن قديم:** دي علامة سرقة، فكل جلسات المستخدم وكل الـ access tokens بتاعته بتتلغي، وبيتسجل `auth.refresh_reuse_detected`.
  - **استثناء التابين:** لو تابين عملوا refresh في نفس اللحظة، فيه فترة سماح 30 ثانية بترجّع `REFRESH_RACE` من غير إلغاء.
- **حماية الدخول:**
  - rate limit: 5 محاولات في الدقيقة لكل (IP + اسم مستخدم). بيترد بـ 429، والعداد في الذاكرة (instance واحد).
  - قفل مؤقت للحساب: بعد **10** محاولات فاشلة متتالية من أي IP، الحساب بيتقفل **15 دقيقة** وبيترد بـ 423 ومعاه `retryAfterSec`.
  - الرد لاسم مستخدم غلط ولكلمة مرور غلط **واحد**، وبنفس الزمن تقريبًا (hash وهمي)، عشان محدش يعرف مين موجود.
- **أول admin:** الداتابيز لو فاضية بيتعمل `admin` بـ `ADMIN_INITIAL_PASSWORD`، أو بكلمة عشوائية بتظهر مرة واحدة في السجل. تغييرها إجباري.
  - طول ما `mustChangePassword` مفعّل، كل حاجة بترجع 403 `PASSWORD_CHANGE_REQUIRED`، ماعدا `/api/me` و`change-password` و`logout(-all)`.
- **تغيير كلمة المرور:** بيلغي كل الجلسات (بما فيها الحالية) ويرجّع جلسة جديدة للجهاز ده.
  - التغيير الإجباري مش محتاج الكلمة القديمة (زي الديسكتوب). التغيير العادي محتاجها.
  - الكلمة الجديدة لازم تختلف عن الحالية.
- **body الدخول بيتحقق قبل Passport** (`LoginBodyGuard`)، لأن الـ guards بتشتغل قبل الـ ValidationPipe.
- **CSRF:** `SameSite=Lax` + الكوكي محصورة في `/api/auth` + الـ API نفسه بيعتمد على `Authorization: Bearer` (مش كوكي)، فمفيش endpoint بيتأثر بطلب من موقع تاني. فحص `Origin` إضافي هيتعمل في A8.

## D-015 — قواعد إدارة المستخدمين (A2)
- كل `/api/users` محتاج `manageUsers`.
- **منع تصعيد الصلاحيات:** الدور `admin`، أو منح `manageUsers`، أو تعديل حساب أدمن أو تغيير كلمة مروره = **للأدمن بس**. يعني مستخدم عنده `manageUsers` ومش أدمن مايقدرش يعمل أدمن جديد ولا يرقّي نفسه.
- مينفعش حد يعطّل حسابه أو يغيّر دوره بنفسه، ومينفعش تعطيل أو تخفيض **آخر أدمن نشط** (بقفل صف في transaction).
- التعطيل وإعادة تعيين كلمة المرور بيلغوا كل جلسات المستخدم فورًا. إعادة التعيين افتراضيًا بتجبره يغيّرها.
- تغيير الدور بيرجّع الأعلام (`editData/deleteData/manageUsers`) لقيم القالب الجديد، إلا لو اتبعتت صراحةً.
- `pages` في الـ PATCH **بتستبدل** كل التخصيصات (نفس سلوك شاشة الديسكتوب).
- مفيش حذف نهائي للمستخدمين، تعطيل بس، عشان سجل المراجعة يفضل مربوط.
- اسم المستخدم: 3–64 حرف (عربي/إنجليزي/أرقام و `. _ @ -`)، وفريد بدون حساسية لحالة الأحرف.

## D-016 — البيانات الحقيقية (data.json اتسلّم 2026-11-16)
- **النسخة دي متخزنة برّه الـ repo** (scratchpad للجلسة دي بس) **وممنوع ترتفع على git**. اللي في `docs/web/` أعداد وأحجام ومفاتيح بس.
- 1.54 MB، `schemaVersion=9`، و**كل الـ collections عندها `id` فريد** (مفيش سجلات من غير id ولا تكرار)، ودي حاجة كويسة لـ A3/A7.
- فيه مستخدم واحد (admin، scrypt بـ salt 32 hex وhash 128 hex)، وشكل `permissions` بتاعه = `{editData, deleteData, manageUsers, manageNetwork, pages}` زي ما الكود متوقع.
- مفاتيح موجودة في البيانات ومكانتش في الخريطة: `penaltyItemPoolSeeded` (meta-flag) و`tableLayouts` (doc). الخريطة اتحدّثت آليًا (`DATA_JSON=… npm run inventory`).
- مراجع legacy مش موجودة في البيانات الحقيقية: `archiveAttachments`، `driverPayments`، `network`. هتتشال أو تتوثّق في A7.
- فيه 111 مرجع `filePath/path` للمرفقات (حجم شغل A5/A7).

## ⏳ قرارات مستنية صاحب المشروع (الخطة §8)
- [ ] الدومين
- [ ] الاستضافة (Hetzner / DigitalOcean / AWS / سيرفر داخلي)
- [ ] عدد المستخدمين (الآن / بعد سنة)
- [ ] مستخدمين خارج مصر؟
- [ ] الديسكتوب يكمّل جنب الويب لحد نهاية A9 ثم يتلغى؟
- [ ] أدوار إضافية (مثلًا مدير مشروع يشوف مشاريعه بس)
- [x] نسخة `data.json` حقيقية (اتسلّمت 2026-11-16، D-016)
- [ ] عينة من المرفقات (لـ A5/A7)
- [ ] مكتبة UI لـ Angular
- [x] اسم الـ branch: **نكمّل على `claude/new-session-vlpwzt`** (اتأكد 2026-11-15، D-004)
