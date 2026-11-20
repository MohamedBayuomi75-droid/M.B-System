# مخرجات الاستكشاف العميق (خطة v1.4.5 — المرحلة 3)

كل الملفات هنا **مولَّدة بأدوات قابلة للإعادة** من الكود والمستندات، وعلى **بيانات مُركّبة بس**، ما عدا `ATTACHMENTS_INVENTORY.md` و`DEFECTS_AND_GAPS.md` اللي اتكتبوا يدويًا من مصادر مذكورة فيهم. **ماتعدّلش الملفات المولَّدة باليد**: عدّل المصدر وشغّل الأداة.

| الملف | المحتوى | الأداة |
|---|---|---|
| `REQUIREMENTS_REGISTRY.md` + `requirements-registry.json` | سجل المتطلبات بالترقيم الموحّد (`LEG-`/`CHG-`/`TECH-`/`NEW-`/`DEC-`). **الـ JSON هو المصدر الثابت للأرقام** | `tools/discovery/build-registry.js` |
| `ID_MAPPING.md` | ربط الأرقام القديمة (B-، F-، TR-، S-، U-) بالموحّدة | نفس الأداة |
| `FUNCTIONAL_INVENTORY.md` + `page-discovery.json` | جرد كل صفحة: الأفعال، والجداول، والخانات، والنوافذ، واللقطات | `discover-pages.js` ثم `build-functional-inventory.js` |
| `visual-baseline/` | لقطات: 54 صفحة ديسكتوب (1366×768)، و44 موبايل (390×844)، و53 نافذة | `discover-pages.js` |
| `visual-baseline-ci/` | نفس اللقطات **على أجهزة GitHub** (خطوط مختلفة)، والـ CI بيقارن بيها إلزاميًا (DEC-0089). بتتولّد بتعديل `visual-baseline-ci/REQUEST` + push | `.github/workflows/visual-baseline-ci.yml` |
| `app-baseline/` + `app-baseline-ci/` | لقطات الواجهة الجديدة `/app/` (10: الصفحات، ونماذج تعديل وإضافة الموردين والعملاء) على بيانات مُركّبة — المرحلة 6، البند 6.4. المقارنة: `visual-compare.js --app` (بيئة التطوير) و`--app --baseline docs/discovery/app-baseline-ci` (الـ CI) | `capture-app.js` (ونسخة الـ CI بنفس الـ workflow) |
| `frontend/src/legacy-skin.css` + `frontend/src/app/core/legacy-nav.ts` | CSS الواجهة القديمة محصور في `.lx` وأقسام التنقل، للشاشات المطابقة في `/app/` (DEC-0093). الفحص: `node tools/ui/build-legacy-skin.js --check` | `tools/ui/build-legacy-skin.js` |
| `DESIGN_TOKENS.md` + `tokens.json` | الألوان والخطوط والمقاسات والحواف والظلال والشكل المحسوب | `extract-design-tokens.js` |
| `DATA_DICTIONARY.md` | مسارات DATA، والترحيلات، والحقول، وجداول السيرفر | `build-data-dictionary.js` |
| `FORMULA_CATALOGUE.md` | المعادلات الـ 71 ودوالها وقواعدها ومكتبة B-20 | `build-formula-catalogue.js` |
| `ELECTRON_CAPABILITIES.md` | 42 قدرة ديسكتوب وحالتها الفعلية في الويب | `build-electron-capabilities.js` |
| `TRACEABILITY_MATRIX.md` | المتطلب ← المكان ← الاختبارات ← الحالة ← القرارات المانعة | `build-traceability.js` |
| `ATTACHMENTS_INVENTORY.md` | أعداد المرفقات وأنواعها (من المرحلة 2) | يدوي |
| `DEFECTS_AND_GAPS.md` | العيوب والتكرارات والميزات الناقصة (من غير أي تصليح) | يدوي |

## إعادة التوليد
بالترتيب ده (كل أداة بتقرا مخرجات اللي قبلها):

```bash
node tools/audit/feature-inventory.js
node tools/discovery/build-registry.js
node tools/discovery/discover-pages.js
node tools/discovery/build-functional-inventory.js
node tools/discovery/extract-design-tokens.js
node tools/discovery/build-data-dictionary.js
node tools/discovery/build-formula-catalogue.js
node tools/discovery/build-electron-capabilities.js
node tools/discovery/build-traceability.js
```

**التحقق إن كل حاجة محدّثة** (بيفشل لو أي ملف محتاج يتولّد تاني):

```bash
for t in build-registry build-functional-inventory build-data-dictionary build-formula-catalogue build-electron-capabilities build-traceability build-parties-parity build-warehouses-parity; do node tools/discovery/$t.js --check || exit 1; done
```

## قواعد
- **الأرقام الموحّدة بتتحجز مرة واحدة ومابتتعادش.** العنصر اللي يختفي من الكود بيفضل في السجل بحالة `missing-in-source`. ماتمسحش `requirements-registry.json` ولا تعيد ترقيمه.
- **أي قرار جديد** ياخد رقم `DEC-` من السجل مباشرة، بدل B-xx، عشان مايتعارضش مع أسماء الخطة زي «B-80» (`DEFECTS_AND_GAPS.md` §4).
- **ممنوع** تشغيل `discover-pages.js` أو `extract-design-tokens.js` على بيانات حقيقية والمخرجات جوه المستودع. الأداتين مكتوب فيهم البيانات المُركّبة صراحة.
- **الأولويات كلها مقترحة** لحد ما تتعتمد.
