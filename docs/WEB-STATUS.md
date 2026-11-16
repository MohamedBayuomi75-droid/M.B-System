# حالة مشروع الويب (WEB-STATUS)

> ⚠️ **من 2026-11-16 المرجع الرئيسي بقى [`ERP_System_Master_Implementation_Plan.md`](ERP_System_Master_Implementation_Plan.md) (v2.0)**. حالة المهام في [`IMPLEMENTATION_BACKLOG.md`](IMPLEMENTATION_BACKLOG.md)، والفحص في `CURRENT_SYSTEM_AUDIT.md` / `FEATURE_INVENTORY.md` / `ARCHITECTURE_GAP_ANALYSIS.md` / `DATABASE_AUDIT.md` / `SECURITY_AUDIT.md` / `TEST_BASELINE.md`. الملف ده سجل مراحل المسار A.
> بيتحدّث في آخر كل مرحلة. الخطة: [`UNIFIED-WEB-PLAN.md`](UNIFIED-WEB-PLAN.md) · القرارات: [`WEB-DECISIONS.md`](WEB-DECISIONS.md)

| المرحلة | الحالة |
|---|---|
| A0 — خط أساس | ✅ خلصت واتوافق عليها (2026-11-15) |
| A1 — هيكل السيرفر والداتابيز | ✅ خلصت واتوافق عليها (2026-11-16) |
| A2 — المصادقة والمستخدمون والأدوار | ✅ خلصت واتوافق عليها (2026-11-16) |
| A3 — طبقة البيانات + الصلاحيات + Realtime | ✅ خلصت واتوافق عليها (2026-11-16) |
| **A4 — غلاف الويب للواجهة القديمة** | ✅ خلصت (2026-11-16). مستنية موافقة |
| **الفحص الشامل حسب الخطة الرئيسية v2.0** | ✅ التقارير السبعة جاهزة (2026-11-16) — مستنية مراجعة وقرارات |
| A5 … A9 | ⏸️ موقوفة لحد قرارات `ARCHITECTURE_GAP_ANALYSIS.md §4` |
| B0 … B5 | ⏸️ |

---

## A4 — غلاف الويب للواجهة القديمة (2026-11-16)

### اللي اتعمل (التفاصيل في D-020)
1. **مفيش ولا سطر اتعدّل في `renderer/`.** نسخة الويب = نفس ملفات الواجهة + مجلد `web/`:
   - `web/index.html`: مولَّد من `renderer/index.html` (`npm run build:web`).
   - `web/web-session.js`: الدخول، والتوكن في الذاكرة، وتجديد تلقائي، وتغيير كلمة المرور الإجباري.
   - `web/sync-client.js`: الـ diff + `/api/sync` + التعارضات + Socket.IO.
   - `web/web-api.js`: `window.desktopApi` بنفس الـ 42 اسم.
   - `web/web-overrides.js`: بيوصّل «وضع الشبكة» الموجود في الواجهة بالسيرفر الجديد.
   - `web/web.css`: شاشة الدخول وإخفاء أجزاء الديسكتوب.
2. **السيرفر بيخدم الواجهة** على `/legacy/` من نفس الأصل (`server/src/legacy-ui.ts`)، وعميل Socket.IO من `/api/stream/socket.io.js`. وصورة Docker بقت فيها ملفات الواجهة.
3. **تعديلات السيرفر:** `meta.catalog` في bootstrap، و`applied[].data` (النسخة المدموجة لما حد تاني يكون عدّل)، وترتيب الإدراج بيتحفظ.
4. **Excel في المتصفح** (استيراد وتصدير بنفس تحويلات الديسكتوب)، وتنزيل الملفات، وPDF مؤقتًا من نافذة الطباعة.
5. **`tests-merge/harness.js` بقى فيه وضع ويب** (`WEB_MODE=1`): سيرفر وقاعدة جديدين لكل `openApp`، والـ seed بيعدي على ترحيلات الواجهة وبعدين يترفع عبر `/api/sync`، وبعدها تحميل من `/api/bootstrap`.
6. **`tests-web/web-e2e.js`:** اختبارات متعددة المتصفحات (`npm run test:web`).

### الاختبارات
| الأمر | النتيجة |
|---|---|
| `server: npm run lint` + `npm test` | ✅ **195/195** |
| `npm run test:ui` (الديسكتوب، وضع الملف) | ✅ 58/58 ملف، 781 assertion |
| **`npm run test:ui:web`** (نفس الاختبارات فوق السيرفر الحقيقي) | ✅ **58/58 ملف، 781 assertion** |
| **`npm run test:web`** (متصفحات متعددة) | ✅ **38/38** |
| البيانات الحقيقية في الويب (محلي، قاعدة مؤقتة) | ✅ اترفعت كاملة (40 موظف، 182 عامل، 880 يومية، 648 فاتورة، 279 مورد، 244 دفعة، 14 مشروع). **الـ 48 صفحة فتحت من غير أي خطأ.** إعادة التحميل من السيرفر 0.7 ثانية، والأعداد متطابقة، ومفيش تغييرات معلّقة |
| Docker | ✅ الصورة بالواجهة (context 7MB)، والدخول والرسم والـ socket شغالين من الحاوية |
| `npm run check` / `npm test` (الديسكتوب) | ✅ 41/41 · 35/35 |

اللي `npm run test:web` بيغطيه:
- شاشة الدخول (كلمة غلط، التغيير الإجباري، الجلسة بتفضل بعد reload).
- **تعديل مستخدم بيظهر عند التاني لحظيًا** (~40ms) والشاشة بتترسم، ومن غير إعادة رسم وهو بيكتب.
- **تعارض مالي بيترفض برسالة واضحة**، ودمج الحقول المختلفة.
- viewer مابيبعتش حاجة، والطلب اليدوي بيرجع 403.
- من غير `payroll` الراتب الحقيقي مابيوصلش المتصفح، والتعديل بيسيبه زي ما هو على السيرفر.
- مدير المشروع بيشوف مشاريعه بس.
- شاشة المستخدمين القديمة شغالة على `/api/users`.
- من غير اتصال: التعديلات بتستنى وبتتبعت لما الاتصال يرجع.
- إغلاق التاب بيحفظ المعلّق.
- إخفاء إعدادات الديسكتوب، والخروج.

**معيار القبول:**
- ✅ كل الأقسام شغالة في المتصفح (الـ 48 صفحة بالبيانات الحقيقية).
- ✅ تعديل مستخدم بيظهر عند التاني لحظيًا.
- ✅ اختبارات `tests-merge` بتعدي فوق السيرفر.

### اللي الاختبارات كشفته واتصلّح
- **خطر:** كود اكتشاف حذف المستخدمين كان ممكن يعطّل الأدمن لو `DATA.users` اتغيّرت جملة (seed أو استرجاع نسخة). دلوقتي: مستخدم واحد بالظبط، ومش المستخدم الحالي.
- **فقد بيانات:** مفتاحين بيتكتبوا بشكل غير مباشر ومكانوش في الكتالوج (`clients.projectsUnifyLog` و`clients.paidReconcileLog`). اتضافوا، والعميل بقى بيحذّر، والاختبارات بتفشل لو ظهر مفتاح جديد.
- الحفظ في وضع الشبكة مكانش بيعدي على `desktopApi.saveData`.
- `/legacy` كان بيعمل redirect لنفسه (Express 5).

### ملاحظات
- **لسه مش شغال في الويب:** المرفقات (A5) وPDF السيرفر والنسخ الاحتياطي (A6). الأزرار بتدي رسالة واضحة ومفيش حاجة بتكسر.
- حد الدخول 5 مرات في الدقيقة لنفس المستخدم ونفس الـ IP. لو كذا واحد بيدخلوا بنفس الحساب من نفس الشبكة ممكن يتقفلوا دقيقة.
- أول refresh من غير cookie بيرجع 401 في console المتصفح (طبيعي).

### الخطوة الجاية
⚠️ صاحب المشروع بعت خطة رئيسية جديدة (`ERP_System_Master_Implementation_Plan.md`) وmaster prompt بيطلب فحص شامل الأول. A5 موقوفة لحد ما الفحص والمقارنة يتراجعوا.

---

## A3 — طبقة البيانات + الصلاحيات + Realtime (2026-11-16)

### اللي اتعمل (التفاصيل والأسباب في D-019)
1. **`collection-pages.ts`:** كل collection من الـ 53 مربوطة بصفحات القراءة والكتابة وحقول المشروع، والقوائم المرجعية والإعدادات (52 مفتاح) ليها قاعدة موحّدة. الكتابة = فعل الصفحة + `editData`/`deleteData`.
2. **`field-guards.ts`:** الرواتب والأجور وأجر اليومية وأرصدة العملاء ولقطات الأرشيف بتتشال لمستخدم مالوش `payroll`/`workerDues`/حسابات العملاء، وكتابتها = 403. ويومية العامل من غير أجر بتتملا من السيرفر.
3. **نطاق المشاريع:** فلترة الصفوف بـ `projectId`/`fromProjectId`/`toProjectId`/`id` في القراءة والكتابة والبث.
4. **`GET /api/bootstrap`:** لقطة متسقة بشكل `DATA`، مفلترة بالصلاحية والمشروع والحقول، ومعاها `meta` (revs، hidden، writable، hiddenFields).
5. **`POST /api/sync`:** transaction بـ `baseRev`، ودمج على مستوى الحقل، و**رفض صريح للحقول المالية والمركّبة المتعارضة**، وآخر واحد يكسب للنص **مع إبلاغ** (`overwrote`)، وحذف soft، وdocs بـ set/patch/arrayDelta. والطلب كله بيترفض لو فيه تغيير واحد ممنوع.
6. **`changes` + `audit_log`:** كل تغيير بيتسجل بصاحبه والحقول اللي لمسها والـ diff. و`DATA.auditLog` القديم بيتحفظ في `audit_log` باسم المستخدم من السيرفر.
7. **Realtime:** migration **0003** (trigger `NOTIFY`) + listener بيعيد الاتصال تلقائي + Socket.IO على `/api/stream` بـ JWT + `reauth` + `resync` + فصل فوري عند التعطيل أو الخروج، والفلترة لكل مستخدم. و`GET /api/changes?since=` للي فاته وقت الانقطاع.
8. **Swagger:** كل الـ endpoints والـ DTOs موثّقة (`BootstrapDto`، `SyncRequestDto`، `SyncResponseDto`، `ConflictRecordDto`، …).

### الاختبارات
| الأمر | النتيجة |
|---|---|
| `server: npm run lint` | ✅ |
| `server: npm test` | ✅ **193/193** (12 ملف) |
| — `policy.spec` (23) | كل collection متغطية وكل صفحة معروفة، والخريطة المولّدة = JSON، وقواعد القراءة والكتابة والأعلام، والحقول المحمية، والنطاق، والحقول المالية |
| — `data.e2e` (32) | bootstrap، **viewer مايقدرش يعدّل حتى بطلب يدوي** (والطلب كله بيترجع)، **من غير payroll مفيش رواتب** (bootstrap/changes/conflict) وكتابتها 403، نطاق مدير المشروع وملء الأجر، دمج الحقول المختلفة، **تعارض مالي صريح**، نص بآخر واحد يكسب مع `overwrote`، حذف وإرجاع وتعارضاته، docs (patch/set/arrayDelta/nextPaymentNo)، auditLog، 10 حالات 400، دفعة 5MB، catch-up، Swagger |
| — `realtime.e2e` (8) | رفض من غير توكن، فلترة البث لكل مستخدم (راتب/نطاق/صفحة)، الحذف والـ docs، فصل فوري عند التعطيل وlogout-all، `resync`، `reauth` بعد التجديد (ومن غيره بيتقفل)، catch-up بعد الانقطاع، بث كتابة مباشرة على الداتابيز |
| — `load.e2e` (5) | **50 مستخدم + 50 socket:** 50 تعديل متزامن لحقول مختلفة = كلهم اتدمجوا (0.8 ث). **50 تعديل لنفس الحقل المالي = واحد كسب و49 تعارض صريح.** 50 تعديل نصي = 49 مُبلّغ عنهم في `overwrote`. 1000 إدراج متزامن (3.6 ث). وكل socket من الـ 50 استلم كل تغيير بالترتيب ومن غير فجوات. bootstrap = 78ms |
| — `matrix.e2e` (11) | **مصفوفة (دور × collection × فعل) على الـ HTTP: 1749 فحص** (11 دور × 53 collection × قراءة/إضافة/تعديل/حذف)، والتوقّع محسوب بشكل مستقل من القوالب |
| — A1/A2 (114) | كلهم شغالين (schema بعد 0003 من غير drift، وauth، وusers) |
| Docker | ✅ migrations 3/3، والـ sync شغال، والحدث وصل عبر WebSocket من جوه الحاوية |
| `npm run check` / `npm test` (الديسكتوب) | ✅ 41/41 · 35/35 |
| `npm run test:ui` (الديسكتوب) | ✅ 58/58 ملف، 781 assertion (من غير تغيير) |

**معيار القبول:**
- ✅ `viewer` مايقدرش يعدّل حتى بطلب يدوي.
- ✅ من غير `payroll.view` مابيستلمش الرواتب (لا في bootstrap ولا التغييرات ولا البث ولا ردود التعارض).
- ✅ 50 مستخدم متزامن من غير تعارض صامت.

### ملاحظات
- **الاختبارات كشفت تسريبات واتقفلت:**
  - `employees` كانت بتتقري عن طريق صفحة `projects`.
  - يوميات العمال والمصاريف والتكاليف كانت بتتقري عن طريق `projects` (أدوار الدفتر والعملاء).
  - مدير المشروع كان بيقرا حضور الموظفين الإداريين عن طريق `attendance`/`reports`.
  - الأرشيف كان فيه لقطات بالرواتب.
- **مستخدم ليه نطاق مشاريع مابيشوفش السجلات اللي مش مربوطة بـ `projectId`.** في البيانات الحقيقية عمال كتير فيهم اسم مشروع بس، وتقرير الربط وإصلاحه هيتعملوا في A7.
- الحقول المخصصة (`custom{}`/`extraFields`) مش محمية بـ field-guards، وهتتراجع في A8.
- القفل الواحد للكتابة كفاية لـ 50–100 مستخدم (أرقام الحمل فوق).

### الخطوة الجاية (بعد الموافقة)
A4 — غلاف الويب للواجهة القديمة:
- `web/web-api.js` (`window.desktopApi` بنفس الـ 42 اسم فوق `/api/*`).
- `web/sync-client.js`: `loadData` من bootstrap، و`saveData` = diff + sync مع حفظ الـ revs، و`saveDataSync` بـ keepalive، وSocket.IO بيحدّث `DATA` (مع احترام `isUserTypingOrEditing`)، والتعامل مع التعارضات و`resync`/`reauth`.
- شاشة دخول، وتشغيل كل الأقسام في المتصفح، وتشغيل `tests-merge` فوق السيرفر الحقيقي.

---

## A2 — المصادقة والمستخدمون والأدوار (2026-11-16)

### اللي اتعمل
1. **الأدوار والصلاحيات** (`server/src/authz/`):
   - `roles.ts` بقى المصدر الوحيد: الصفحات الـ 48 والأدوار الـ 7 القديمة **متطابقة حرفيًا مع الديسكتوب** (اختبار بيحمّل `permissions.js` الأصلي ويقارن).
   - أدوار جديدة: `warehouse` و`ledgerAccountant` و`custom`.
   - `effectivePermissions` بيحسب الصلاحية الفعلية: القالب + تخصيص المستخدم، والمنع هو الافتراضي (D-013).
   - Guards عامة: كل endpoint محتاج JWT إلا اللي عليه `@Public()`، و`@RequirePerms(...)` للصلاحيات، وبوابة تغيير كلمة المرور الإجباري.
   - migration **0002**: seed للأدوار + FK `users.role → roles.key`، والجدول بيتزامن من `roles.ts` مع كل إقلاع.
2. **المصادقة** (`server/src/auth/`) — Passport local + JWT:
   - `POST /api/auth/login`، `refresh` (مع التدوير واكتشاف إعادة الاستخدام)، `logout`، `logout-all`، `change-password`.
   - rate limit 5/دقيقة لكل IP+مستخدم، وقفل مؤقت بعد 10 محاولات فاشلة لمدة 15 دقيقة.
   - أول admin بكلمة مؤقتة وتغييرها إجباري، والحد الأدنى للكلمات الجديدة 10 حروف.
   - حسابات scrypt القديمة بتدخل عادي وبتترقّى لـ argon2id تلقائيًا (D-014).
3. **المستخدمين** (`server/src/users/`):
   - `GET/POST /api/users`، `GET/PATCH /api/users/:id`، `POST /api/users/:id/reset-password`، `GET /api/me`، `GET /api/roles`.
   - منع تصعيد الصلاحيات، وحماية آخر أدمن، والتعطيل بيلغي الجلسات فورًا (D-015).
4. **سجل المراجعة** (`AuditService`): login (ناجح/فاشل)، قفل الحساب، logout، تغيير وترقية كلمة المرور، اكتشاف سرقة توكن، وكل عمليات المستخدمين. ومن غير أي أسرار.
5. **Swagger:** كل الـ endpoints موثّقة بـ DTOs وأكواد الأخطاء الثابتة (`INVALID_CREDENTIALS`، `ACCOUNT_LOCKED`، `PASSWORD_CHANGE_REQUIRED`، `FORBIDDEN`، `WEAK_PASSWORD`، `REFRESH_RACE`، …).
6. **Docker:** إعدادات المصادقة في `docker/.env.example` والـ Compose. وأي متغير فاضي في env بيتعامل كأنه مش موجود.
7. **البيانات الحقيقية:** اتحلّلت (أعداد وأحجام بس، والملف نفسه برّه git). تقرير الأحجام في `docs/web/code-metrics.md` والخريطة اتحدّثت (D-016).

### الاختبارات
| الأمر | النتيجة |
|---|---|
| `server: npm run lint` | ✅ |
| `server: npm test` | ✅ **111/111** (7 ملفات) — بعد دور projectManager: **114/114** |
| — unit (38) | parity الأدوار مع `permissions.js`، `effectivePermissions`، scrypt/argon2، env |
| — `auth.e2e` (24) | الأدمن الافتراضي والتغيير الإجباري، خصائص الكوكي، 401 (من غير توكن/مزوّر/منتهي)، رد واحد لمستخدم غلط وكلمة غلط، 400 للحقول الزيادة، **429** بعد 5 محاولات/دقيقة، **423** بعد المحاولات الفاشلة وفك القفل، تدوير الـ refresh + `REFRESH_RACE` + **اكتشاف السرقة بيلغي كل الأجهزة**، logout / logout-all فوري، دخول بهاش ديسكتوب حقيقي وترقيته لـ argon2id، ومفيش أسرار في الـ audit |
| — `users.e2e` (33) | **مصفوفة (دور × endpoint) متولّدة من `roles.ts`** لكل الأدوار التسعة غير الأدمن، CRUD، 409/400 (8 حالات)، التخصيص ونطاق المشاريع في `/api/me` بيسري فورًا، التعطيل وإعادة التعيين، **منع التصعيد** (مدير مستخدمين مش أدمن مايقدرش يعمل/يرقّي/يلمس أدمن)، حماية آخر أدمن، وتوثيق OpenAPI |
| — `schema.e2e` + `app.e2e` (16) | زي A1 بعد migration 0002 (مفيش drift، revert/re-apply، health، Swagger) |
| `docker compose up` من الصفر | ✅ أول admin بكلمة عشوائية في السجل ← الدخول ← 403 قبل التغيير ← 200 بعده ← 429 في المحاولة الخامسة ← الأدوار العشرة في الداتابيز ← أحداث الـ audit |
| `npm run check` / `npm test` (الديسكتوب) | ✅ 41/41 · 35/35 |
| `npm run test:ui` (الديسكتوب) | ✅ 58/58 ملف، 781 assertion (من غير تغيير) |

**معيار القبول** («مستخدمين بأدوار مختلفة يدخلوا، وكل endpoint محمي يرجّع 401/403 صح») ✅

### ملاحظات
- **فرق مقصود عن الديسكتوب:** صفحة مش محفوظة في صلاحيات مستخدم = ممنوعة على السيرفر، والديسكتوب كان بيسمح بيها (D-013). ده هيأثر بس على مستخدمين مستوردين بصلاحيات ناقصة، وهنعرض تقرير بيهم في A7.
- عداد الـ rate limit في الذاكرة، ولو اتعمل أكتر من instance هيتنقل لـ Redis.
- تنضيف الجلسات المنتهية من جدول `sessions` هيبقى مهمة دورية في A6 مع النسخ الاحتياطي.
- `manageNetwork` اتشال (وضع الشبكة القديم مش موجود في الويب).

### إضافة بعد A2 — قرارات §8 (2026-11-16)
- القرارات كلها في **D-017**، و**الاستضافة اتعدّلت لسيرفر محلي في الشركة (D-018)**: MinIO للمرفقات، ونسخ محلية + مشفّرة على B2، وCloudflare Tunnel للوصول من برّه، 50/100 مستخدم، UTC + Cairo، الديسكتوب يتحوّل قراءة بس بعد التحويل، وPrimeNG.
- **دور `projectManager` اتنفّذ** (مشاريعه بس، و`projectScope` إجباري). الاختبارات بقت **114/114**، ومصفوفة الأدوار بقت 10 أدوار.
- المرفقات: مفيش ملفات، بس فيه 111 مرجع في دفتر الموردين هيتنقلوا في A7 «ملف مفقود» مع تقرير.

### الخطوة الجاية (بعد الموافقة)
A3: `collection-pages.ts` (كل collection مربوطة بصفحة وفعل)، و`field-guards.ts` (الرواتب والأرصدة)، و`GET /api/bootstrap` مفلتر بالصلاحية والمشروع، و`POST /api/sync` بـ `baseRev` ودمج على مستوى الحقول ورفض صريح للحقول المالية المتعارضة، و`changes` + NOTIFY + Socket.IO، ومصفوفة اختبار (دور × collection × فعل) واختبار حمل لـ 50 مستخدم.

---

## A1 — هيكل السيرفر والداتابيز (2026-11-15)

### اللي اتعمل
1. **`server/`**: NestJS 11 + TypeORM 1.1 + PostgreSQL 16 + TypeScript 5.9 (شوف D-009 عن سبب 11 مش 12).
   - `GET /api/health`: حالة السيرفر، والداتابيز (اتصال وزمن ونسخة)، والـ migrations (اللي اتطبقت واللي pending)، و`legacySchemaVersion`. بيرجّع `200` لو ok/degraded و`503` لو الداتابيز واقعة.
   - **Swagger** على `/api/docs` (والـ JSON على `/api/docs-json`)، بـ DTOs موثّقة من أول endpoint.
   - **pino** (JSON logs، `x-request-id`، وإخفاء `authorization`/`cookie`/كلمات المرور من السجلات).
   - **config من env** بيتحقق بـ class-validator عند الإقلاع، والإنتاج بيرفض يقوم من غير `JWT_SECRET` (32+ حرف) وكلمة سر الداتابيز.
   - `ValidationPipe({whitelist, forbidNonWhitelisted, transform})` global، ومن غير `x-powered-by`.
2. **Migration `InitLayer1`**: الجداول العشرة بتاعة الطبقة 1 (`users, sessions, roles, user_permissions, records, docs, changes, audit_log, attachments, schema_meta`) بـ PK/FK/CHECK/فهارس. التفاصيل في D-010.
3. **`PasswordService`**: argon2id للجديد + تحقق scrypt القديم بنفس `normalize` (قطع 256) + `needsRehash`.
4. **Docker Compose** (`docker/`): `db` ← `migrate` ← `server`. التفاصيل في D-011.
5. سكربتات في الجذر: `npm run server:build | server:test | server:up | server:down`. وفيه `server/README.md`.

### الاختبارات
| الأمر | النتيجة |
|---|---|
| `server: npm run lint` (tsc) | ✅ |
| `server: npm run test:unit` | ✅ 20/20: توافق scrypt (متجه ثابت + الكود الفعلي لـ `src/main/password.js` + كود HR الأصلي + القطع عند 256 + مدخلات تالفة)، ومسار الترقية لـ argon2id، وrehash للإعدادات الضعيفة، والسياسة، والتحقق من env |
| `server: npm run test:e2e` (PostgreSQL حقيقي، قاعدة مؤقتة) | ✅ 16/16: migrations من الصفر، **مفيش drift** بين الـ entities والـ schema، الـ seed، القيود (اسم مستخدم فريد بدون حساسية للحالة، salt إجباري للـ scrypt، rev>0، op، cascade)، revert كامل وإعادة تطبيق، health 200/503، و Swagger |
| `docker compose up` من volume فاضي | ✅ `migrate` خرج بـ 0 بعد ما طبّق `InitLayer1`، و`server` بقى healthy، و`/api/health` = ok، و`/api/docs` = 200. وتشغيل تاني = «No migrations are pending». المستخدم جوه الحاوية `node`، وport الداتابيز مش مكشوف |
| `npm run check` / `npm test` (الديسكتوب) | ✅ 41/41 · 35/35 |
| `npm run test:ui` (الديسكتوب) | ✅ 58/58 ملف، 781 assertion (من غير تغيير) |

**معيار القبول** («`docker compose up` يشغّل كل حاجة وmigrations من الصفر») ✅

### ملاحظات
- في بيئة التطوير دي الـ build محتاج `--network host` + build-arg للـ proxy + secret الـ CA (D-011). ده خاص بالبيئة، وعلى VPS عادي `docker compose up --build` كفاية.
- `users.role → roles.key` FK والـ seed بتاع الأدوار في A2. والـ NOTIFY trigger على `changes` في A3.

### الخطوة الجاية (بعد الموافقة)
A2: Passport local + JWT (15 دقيقة) + refresh token في `sessions` (cookie `HttpOnly; Secure; SameSite=Lax`) مع التدوير، وrate limit وقفل مؤقت للحساب، وتغيير كلمة المرور الإجباري، وCRUD المستخدمين، و`roles.ts` من `renderer/core/permissions.js` + seed، و`GET /api/me`.

---

## A0 — خط أساس (2026-11-15)

### اللي اتعمل
1. **الـ repo:** كان فاضي → أول commit = v1.3.53 من الـ zip زي ما هو + `docs/UNIFIED-WEB-PLAN.md` + `.gitignore`.
   - ⚠️ الشغل على `claude/new-session-vlpwzt` مش `web` (قيد البيئة — شوف D-004).
2. **الاختبارات قبل أي تغيير** (Node 22.23، Chromium من Playwright):

   | الأمر | النتيجة | السجل |
   |---|---|---|
   | `npm run check` | ✅ 41 ناجح / 0 فشل | [`web/baseline-check.txt`](web/baseline-check.txt) |
   | `npm test` | ✅ 35 ناجح / 0 فشل | [`web/baseline-node-tests.txt`](web/baseline-node-tests.txt) |
   | `npm run test:ui` (جديد — كل `tests-merge`) | ✅ 58/58 ملف، 781 assertion، 0 فشل (~5.5 دقيقة) | [`web/baseline-ui-tests.txt`](web/baseline-ui-tests.txt) |

3. **`tests-merge/harness.js`:** اتشالت المسارات الثابتة (`/opt/npm-tools/...`، `/home/claude/work/...`، `/usr/bin/google-chrome`) → `PLAYWRIGHT_PATH` / `CHROME_PATH` / `APP_ROOT` مع افتراضات بتشتغل لوحدها. + `tests-merge/run-all.js` (`npm run test:ui`، وممكن `node tests-merge/run-all.js phase2 phase3`).
4. **أداة جرد آلية** `tools/web/inventory.js` (`npm run inventory`) بتولّد:
   - [`web/desktop-api-inventory.md`](web/desktop-api-inventory.md) (+ `.json`): كل دالة، الـ IPC، عدد المراجع والملفات، والبديل المقترح في الويب.
   - [`web/collections-map.md`](web/collections-map.md) (+ `.json`، وده مصدر `server/src/tools/collections-map.ts` في A3): من شكل `DATA` الفعلي بعد تشغيل الواجهة وزيارة كل الصفحات + تحليل الكود.
   - [`web/code-metrics.md`](web/code-metrics.md): المقاييس، الأسطر لكل وحدة، مفاتيح `localStorage`، وتقرير الأحجام لما `DATA_JSON` يتحدد.
5. **`docs/WEB-DECISIONS.md`** اتكتب (D-001 … D-008).

### مقارنة الخطة بالكود الفعلي
| البند | الخطة | الفعلي | ملاحظة |
|---|---|---|---|
| أسطر JS في `renderer/` | ~46k | 46,312 (83 ملف) | ✅ |
| `<script>` | 83 | 83 | ✅ |
| مراجع `DATA.*` | 2075 | 2075 | ✅ |
| `saveData()` | 187 | 188 | فرق بسيط (طريقة العد) |
| `SCHEMA_VERSION` | 9 | 9 | ✅ |
| دوال `desktopApi` | 41 | **40** في preload + **2** مستخدمين ومش موجودين = 42 اسم | شوف D-007 |
| ملفات `tests-merge` | 60 | 60 (58 اختبار + `harness.js` + `lib.js`) | ✅ |
| أحجام الوحدات | warehouses 557، ledger 9k، clients 6k، hr 12.5k | 560 / 8,997 / 6,121 / 12,489 (+ core 18,034) | ✅ |

### نتايج مهمة تأثّر على المراحل الجاية
- **`safetyBackup` و`scanAttachment` مش موجودين في `preload.js`** والواجهة بتتجاهلهم بصمت. يعني «نسخة أمان قبل العملية» في الدفتر مش شغالة في الديسكتوب دلوقتي. (A4/A6)
- **مصدرين للمستخدمين:** `DATA.users` و`users.json` (وضع الشبكة). (D-006 → A2/A7)
- **scrypt بيقطع كلمة المرور لـ 256 حرف** قبل الهاش، ولازم السيرفر يعمل نفس الحاجة. (D-005 → A1)
- **سياسة الطول الحالية 8 حروف** والخطة 10: هتتطبق على الكلمات الجديدة بس. (D-005)
- **4 مراجع legacy** بتتقري ومحدش بيكتبها: `archiveAttachments`، `driverPayments`، `network`، `tableLayouts`. هتتأكد من `data.json` الحقيقي.
- **`localStorage`:** مفاتيح بيانات (`hr-data`، `hr_users_cred`) غير مفاتيح الواجهة (`uiZoom`، `uiDensity`). مفاتيح البيانات لازم تتنقل في A4.
- **XSS:** 216 إسناد `innerHTML` + 16 `insertAdjacentHTML` في الواجهة (حجم مراجعة A8).

### ناقص (محتاج من صاحب المشروع)
- ⏳ نسخة **`data.json` حقيقية** (+ عينة مرفقات) عشان تقرير الأحجام: `DATA_JSON=/path/data.json npm run inventory`.
- ⏳ قرارات الخطة §8 (في آخر `WEB-DECISIONS.md`).

### الخطوة الجاية (بعد الموافقة)
A1 — `server/` (NestJS + TypeORM + PostgreSQL 16 + Docker Compose)، `GET /api/health`، Swagger على `/api/docs`، migrations الطبقة 1، واختبار توافق scrypt (بنفس `normalize`) مع argon2id.
