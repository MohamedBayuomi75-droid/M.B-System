# خط أساس الاختبارات (Test Baseline)

> كل النتايج دي من **تشغيل فعلي يوم 2026-11-16** على الكود الحالي (بعد commit A4، ومع ملفات الفحص). مفيش اختبار متسجّل هنا من غير ما يتشغّل.
> البيئة: Linux · Node 22.23 · Chromium (Playwright) · PostgreSQL 16 (حاوية اختبار).

## 1. النتايج

| # | الأمر (من جذر المشروع) | بيختبر إيه | النتيجة الفعلية | السجل |
|---|---|---|---|---|
| T1 | `npm run check` | بنية الواجهة: الملفات، التنقل، مصفوفة الصلاحيات، ترتيب السكربتات | ✅ 41 ناجح / 0 فشل | — |
| T2 | `npm test` | أمان الديسكتوب: scrypt، سيرفر الشبكة القديم، كلمات المرور الافتراضية | ✅ 35 ناجح / 0 فشل | — |
| T3 | `npm run test:ui` | 58 ملف اختبار واجهة (Playwright) في **وضع الملف** (الواجهة الأصلية بـ `desktopApi` وهمي) | ✅ 58/58 ملف · 781 assertion · 0 فشل | [`audit/baseline-ui-file.txt`](audit/baseline-ui-file.txt) |
| T4 | `npm run test:ui:web` | **نفس الـ 58 ملف** فوق السيرفر الحقيقي (NestJS + PostgreSQL، قاعدة جديدة لكل اختبار) | ✅ 58/58 ملف · 781 assertion · 0 فشل | [`audit/baseline-ui-web.txt`](audit/baseline-ui-web.txt) |
| T5 | `npm run test:web` | نسخة الويب بمتصفحات متعددة: دخول، تحديث لحظي، تعارض مالي، صلاحيات، حقول حساسة، نطاق مشاريع، بدون اتصال، إغلاق الصفحة | ✅ 38 ناجح / 0 فشل | [`audit/baseline-web-e2e.txt`](audit/baseline-web-e2e.txt) |
| T6 | `npm --prefix server run lint` | TypeScript (`tsc --noEmit`) | ✅ من غير أخطاء | — |
| T7 | `npm --prefix server test` | السيرفر: unit + e2e على PostgreSQL حقيقي | ✅ **195/195** (12 ملف) | الجدول تحت |
| T8 | `DATA_JSON=… node tools/audit/crawl-pages.js` | فتح كل الصفحات الـ 54 **بالبيانات الحقيقية** — وضع الملف | ✅ 0 أخطاء JS · 52 صفحة بمحتوى (+2 صفحات تفاصيل محتاجة اختيار شخص) | [`audit/page-crawl-file-real.json`](audit/page-crawl-file-real.json) |
| T9 | `WEB_MODE=1 DATA_JSON=… node tools/audit/crawl-pages.js` | نفس الزحف على **نسخة الويب** بعد رفع البيانات الحقيقية لقاعدة اختبار | ✅ 0 أخطاء JS · نفس النتيجة | [`audit/page-crawl-web-real.json`](audit/page-crawl-web-real.json) |
| T10 | `node tools/audit/crawl-pages.js` | نفس الزحف ببيانات فاضية | ✅ 0 أخطاء JS | [`audit/page-crawl-file-empty.json`](audit/page-crawl-file-empty.json) |
| T11 | `npm --prefix server audit --omit=dev` | ثغرات تبعيات السيرفر | ✅ 0 ثغرات | — |
| T12 | `npm audit --omit=dev` (الجذر/الديسكتوب) | ثغرات تبعيات الديسكتوب | ⚠️ **ماشتغلش**: مفيش `package-lock.json` في الجذر (`ENOLOCK`) | `SECURITY_AUDIT.md` S10 |

### تفصيل T7 (السيرفر)
| الملف | ناجح/الكل | المحتوى |
|---|---|---|
| `src/auth/password.service.spec.ts` | 16/16 | توافق scrypt مع الديسكتوب + argon2id + السياسة |
| `src/authz/roles.spec.ts` | 17/17 | تطابق الأدوار والصفحات مع `renderer/core/permissions.js` |
| `src/data/policy.spec.ts` | 23/23 | قواعد القراءة/الكتابة/النطاق/الحقول الحساسة/المالية |
| `src/config/env.validation.spec.ts` | 6/6 | إعدادات البيئة |
| `test/schema.e2e-spec.ts` | 11/11 | migrations من الصفر، مطابقة الكيانات، القيود، التراجع |
| `test/app.e2e-spec.ts` | 7/7 | health، Swagger، خدمة الواجهة |
| `test/auth.e2e-spec.ts` | 24/24 | دخول، refresh دوّار، سرقة توكن، قفل، 429، خروج |
| `test/users.e2e-spec.ts` | 35/35 | إدارة مستخدمين، مصفوفة الأدوار، منع التصعيد |
| `test/data.e2e-spec.ts` | 32/32 | bootstrap، sync، تعارضات، حقول حساسة، نطاق مشاريع |
| `test/realtime.e2e-spec.ts` | 8/8 | البث اللحظي وفلترته |
| `test/load.e2e-spec.ts` | 5/5 | 50 مستخدم متزامن |
| `test/matrix.e2e-spec.ts` | 11/11 | 1,749 فحص صلاحية على HTTP |

## 2. اللي الاختبارات **مابتغطيهوش** (مهم قبل أي نقل)

| الفجوة | التفصيل |
|---|---|
| عمليات 27 صفحة من 54 | بتترسم من غير أخطاء لكن مفيش اختبار لإضافة/تعديل/حذف/طباعة فيها — القائمة في `FEATURE_INVENTORY.md §1` (🟡) |
| **الحسابات المالية** | مفيش اختبارات مباشرة لمعادلات الفواتير (ضريبة/خصم/دمغة)، أرصدة الموردين، الرواتب، مستحقات العمال — غير اللي بيعدّي عليها ضمنيًا في اختبارات الواجهة |
| المخازن | مفيش اختبار لاتساق الأرصدة مع الحركات |
| المرفقات | مش متاحة في الويب؛ في الديسكتوب بتتختبر بـ `desktopApi` وهمي بس |
| الطباعة وPDF وExcel | مفيش اختبار لمحتوى الملفات الناتجة |
| النسخ الاحتياطي والاستعادة | مفيش (للويب) |
| اختبار يدوي على موبايل/تابلت | ماتعملش |
| Electron الفعلي | الاختبارات بتشغّل الواجهة في Chromium بـ `desktopApi` وهمي، مش تطبيق Electron المبني |

## 3. تشغيل الاختبارات

```bash
npm run check && npm test                 # الديسكتوب (ثواني)
npm run test:ui                           # واجهة — وضع الملف (~6 دقايق)
# اللي تحت محتاج PostgreSQL للاختبار (افتراضي: postgres://unified:devpass@localhost:55432/postgres)
npm --prefix server ci && npm --prefix server test    # السيرفر (~1.5 دقيقة)
npm run test:ui:web                       # واجهة فوق السيرفر (~9 دقايق)
npm run test:web                          # ويب متعدد المتصفحات (~1 دقيقة)
```
