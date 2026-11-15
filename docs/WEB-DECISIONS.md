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

## ⏳ قرارات مستنية صاحب المشروع (الخطة §8)
- [ ] الدومين
- [ ] الاستضافة (Hetzner / DigitalOcean / AWS / سيرفر داخلي)
- [ ] عدد المستخدمين (الآن / بعد سنة)
- [ ] مستخدمين خارج مصر؟
- [ ] الديسكتوب يكمّل جنب الويب لحد نهاية A9 ثم يتلغى؟
- [ ] أدوار إضافية (مثلًا مدير مشروع يشوف مشاريعه بس)
- [ ] نسخة `data.json` حقيقية + المرفقات (مطلوبة لتقرير الأحجام والـ legacy-refs)
- [ ] مكتبة UI لـ Angular
- [ ] اسم الـ branch: نكمّل على `claude/new-session-vlpwzt` ولا نعمل `web`؟ (D-004)
