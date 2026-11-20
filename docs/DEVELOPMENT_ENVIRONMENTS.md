# البيئات: التطوير والاختبار والإنتاج

- **التاريخ:** 2026-11-17 · **المرحلة:** 4 (4.4)

| البيئة | القاعدة | الإعداد | الأسرار | البيانات |
|---|---|---|---|---|
| **Development** | `docker/docker-compose.dev.yml` (PostgreSQL على `127.0.0.1:55432`) | `server/.env.development.example` | قيم تطوير بس | بيانات اختبار بس، **ممنوع البيانات الحقيقية** |
| **Testing** | نفس السيرفر، و**قاعدة مؤقتة لكل ملف اختبار** بتتمسح في الآخر | `server/.env.test.example` | قيم اختبار | مُركّبة (`tools/formulas/fixture.js`، `tools/security/xss-seed.js`). البيانات الحقيقية بتتقري من **نسخة خارج المستودع** للقياس بس (أعداد ومجاميع) |
| **Production** | `docker/docker-compose.yml` (Nginx + Internal CA + النسخ) | `docker/.env.example` | `docker/.env` (برّه git) | الحقيقية، وأي معالجة بموافقة (`DATA_REMEDIATION_PLAN.md`) |

## التشغيل محليًا
```bash
docker compose -f docker/docker-compose.dev.yml up -d   # القاعدة
npm --prefix server ci && npm --prefix frontend ci && npm ci
npm --prefix server run build && npm --prefix frontend run build
cd server && env $(grep -v '^#' .env.development | xargs) node dist/main.js
# الواجهة الحالية: http://localhost:3000/legacy/   ·   الجديدة: http://localhost:3000/app/   ·   Swagger: /api/docs
# تطوير Angular بإعادة تحميل فورية: npm --prefix frontend start  (بيكلّم السيرفر على نفس الجهاز)
```

## الاختبارات (كلها على بيانات مؤقتة)
| الأمر | بيختبر |
|---|---|
| `npm run check` · `npm test` | بنية المشروع، وأمان الديسكتوب، والإكسيل |
| `npm --prefix server test` | الخادم: unit + e2e، ومنهم Money ↔ PostgreSQL، والموديول التجريبي، وحدود الطبقات |
| `npm --prefix frontend test -- --watch=false` | الواجهة الجديدة (Vitest) |
| `npm run test:ui` · `npm run test:ui:web` | الواجهة الحالية: 62 ملف، في وضعي الملف والويب |
| `npm run test:web` | الواجهة الحالية على متصفحات متعددة |
| `npm run test:app` | الواجهة الجديدة على `/app/` فوق السيرفر الحقيقي |
| `node tools/security/xss-probe.js` | فحص XSS (لازم 0) |
| `node tools/formulas/compare.js` | المعادلات: القديم ↔ المرجع |

## الـ CI والفحوص الإضافية (خطة v1.4.5 — المرحلة 4)
- **CI:** `.github/workflows/ci.yml` بيشتغل مع كل push وPR على GitHub Actions، بـ 3 مهام بالتوازي: فحوص سريعة (البنية، والأمان، والمستندات المولَّدة، والسيرفر unit، والواجهة الجديدة)، والسيرفر e2e فوق PostgreSQL 16، والمتصفح (الواجهة القديمة في أوضاعها التلاتة، و`test:web`، و`test:app`، وXSS، والمعادلات). **مفيش أسرار ولا نشر.**

| الأمر | بيختبر |
|---|---|
| `node tools/discovery/visual-compare.js` | **المقارنة البصرية:** بيصوّر الواجهة القديمة تاني ويقارنها بـ `docs/discovery/visual-baseline/` (التقرير والفروق في مجلد مؤقت، أو `--out <dir>`). **إلزامية هنا**، وتقرير بس في الـ CI لحد ما خط أساس من بيئة الـ CI يتعتمد |
| `UPDATE_OPENAPI=1 npm --prefix server run test:e2e` | تحديث **عقد الـ API** `docs/api/openapi.json` بعد تغيير مقصود في الـ API. ومن غير المتغيّر، الاختبار بيفشل لو الملف مختلف عن السيرفر |
| `for t in build-registry build-functional-inventory build-data-dictionary build-formula-catalogue build-electron-capabilities build-traceability; do node tools/discovery/$t.js --check; done` | إن مستندات الاستكشاف المولَّدة محدّثة (`docs/discovery/README.md`) |
| `node tools/discovery/capture-app.js --out <dir>` | لقطات للواجهة الجديدة `/app/` (للمقارنة قبل وبعد تغيير شكل) |

**تحديث خط الأساس البصري** (بعد تغيير شكل **مقصود ومعتمد** في الواجهة القديمة بس): `node tools/discovery/discover-pages.js` ← راجع الفرق في الصور ← commit.

## قواعد
- **الأسرار:** في `.env` بس، وكل ملفات `.env*` (ماعدا `*.example`) متجاهلة في git.
- **ممنوع** تشغيل اختبارات أو migrations على قاعدة الإنتاج. الاختبارات بتعمل قاعدتها المؤقتة بنفسها.
- **NODE_ENV:** `development` (Swagger شغال، ولوج مقروء)، و`test` (لوج صامت)، و`production` (لازم `JWT_SECRET`، وSwagger مقفول).
