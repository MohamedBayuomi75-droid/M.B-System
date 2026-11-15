# حالة مشروع الويب (WEB-STATUS)

> بيتحدّث في آخر كل مرحلة. الخطة: [`UNIFIED-WEB-PLAN.md`](UNIFIED-WEB-PLAN.md) · القرارات: [`WEB-DECISIONS.md`](WEB-DECISIONS.md)

| المرحلة | الحالة |
|---|---|
| **A0 — خط أساس** | ✅ خلصت (2026-11-15). مستنية موافقة قبل A1 |
| A1 — هيكل السيرفر والداتابيز | ⏸️ لم تبدأ |
| A2 … A9 | ⏸️ |
| B0 … B5 | ⏸️ |

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
