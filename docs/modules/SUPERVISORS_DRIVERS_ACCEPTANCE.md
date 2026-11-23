# قبول المشرفين والسواقين — الحزمة 8.2 (خطة v1.4.5، المرحلة 8)

> **المرجع:** `PHASE_08_2_BEFORE_REPORT.md` (DEC-0123). الواجهة القديمة: `renderer/modules/hr/pages-supervisors.js` و`pages-ops.js` (السواقين)، والدوال المشتركة في `renderer/core/helpers.js` و`extras.js`.
> **الحالة:** 8.2.1–8.2.2 خلصوا (الاستكشاف + اختبارات القديمة). الباقي بيتملا مع كل خطوة.

## 1. الوظايف ← القديم ← الاختبار ← الحالة
| # | الوظيفة | القديم | الاختبار على القديمة | الجديد | الحالة |
|---|---|---|---|---|---|
| N1 | لوحات الأقسام (المشرفين؛ وسائقين الشركة ومن خارجها) بالأعداد | `entityDeptBoardsPageHtml` | `phase75.js` [2] | — | ⏳ 8.2.4 |
| N2 | القايمة: القسم، والحالة، والبحث الذكي، والفلاتر الإضافية، والترتيب. **السواقين بترتيب خطوات مختلف** والحالة الفاضية = «نشط» | `filteredSupervisors`، و`renderDriversPage` | `phase75.js` [3] (9 + 8 حالات) | — | ⏳ |
| N3 | الملاحظات (ومنها «بدون يومية محددة» لسواق الشركة اللي ليه راتب) | `personNotesIssues` | `phase75.js` [4] | — | ⏳ |
| N4 | الكروت، وعمود «عدد العمال» (كل العمال المربوطين، والمستقيل كمان)، وجدولي السواقين | `entityStatCardsHtml`، `workersOfSupervisor` | `phase75.js` [5] | — | ⏳ |
| N5 | نافذة المشرف: `SUP-`، واليومية (`toInt`)، والرخصة وحالتها من التاريخ، و`skill` من الوظيفة، وتاريخ الاستقالة | `openSupervisorModal` | `phase75.js` [6] [9] | — | ⏳ |
| N6 | نافذة سواق الشركة: `DRV-`، والراتب، ودرجة الرخصة، و«سائق» افتراضي | `openDriverModal` | `phase75.js` [7] | — | ⏳ |
| N7 | نافذة السواق الخارجي: `external`، واليومية، **من غير دمج** | `openExternalDriverModal` | `phase75.js` [8] | — | ⏳ |
| N8 | الدمج من غير مسح القيم بالفاضي (المشرف وسواق الشركة) | `mergePersonRecord` | `phase75.js` [8] | — | ⏳ |
| N9 | الاستقالة: التاريخ من النافذة، وقسم المستقيلين، ولقطة في الأرشيف، وإعادة التفعيل | `syncPersonResignedState`، `readResignedDateFromForm` | `phase75.js` [9] | — | ⏳ |
| N10 | منع التكرار (مؤكد / تشابه / عبر الأنواع) | `guardEntityDuplicates` | `phase75.js` [10] | `common/person-duplicates.ts` (من 8.1) | ⏳ |
| N11 | حماية الأجور (يومية المشرف، وراتب ويومية السواق) | `field-guards.ts` | — | الموجود (B-48) | ⏳ |
| N12 | تطبيق تخطيط الأعمدة المحفوظ (`supervisors`، و`drivers`، و`driversExt`) | `apply`/`addAutoColumns` | — | `legacy-table-layout.ts` (من 8.1) | ⏳ |
| N13 | كشف حساب المشرف، وصفحة الشخص (👁) | `renderSupervisorStatementPage`، `openPersonDetailPage` | — | الشاشة الكاملة (د-2) | متأجل بقرار |
| N14 | الحذف، والإجراءات الجماعية، والتصدير، وتعديل تخطيط الأعمدة | `softDelete`، `bulkBarHtml`، `personListExport` | — | الشاشة الكاملة (د-3) | متأجل بقرار |

## 2. كل دالة بينادي عليها الحفظ والصفحة (8.2.1 — درس 8.1)
القايمة دي متطلّعة آليًا من الكود (كل نداء في `renderSupervisorsPage`، و`openSupervisorModal`، و`renderDriversPage`، و`openDriverModal`، و`openExternalDriverModal`)، وكل دالة ليها حالة:

| الدالة | الأثر | الحالة في 8.2 |
|---|---|---|
| `ensureUniqueCode`، `nextSupervisorCode`، `nextDriverCode` | الكود | تتنقل (موجودة من 8.1، بالبادئة `SUP-` / `DRV-`) |
| `collectPersonHrFields` (بالخيارات: يومية للمشرف، وراتب للسواق، ورخصة للاتنين، و`skillFromPos` للمشرف) | الحقول | تتنقل |
| `readResignedDateFromForm`، `resignedDateFieldHtml`، `bindResignedStatusToggle` | تاريخ الاستقالة | تتنقل (جديد قدام 8.1) |
| `syncDocStatusesFromDates` | حالة البطاقة والرخصة من التاريخ | تتنقل (موجودة) |
| `personDeptOnSave`، `coreDeptIdFor` | القسم (والخارجي له قسم لوحده) | تتنقل |
| `guardEntityDuplicates` | منع التكرار | تتنقل (موجودة من 8.1) |
| `mergePersonRecord` | الدمج (المشرف وسواق الشركة بس) | تتنقل (موجودة) |
| `Object.keys(payload).forEach(...)` في الخارجي | كتابة من غير دمج | تتنقل زي ما هي (د-4) |
| `syncPersonResignedState` | أرشيف المستقيلين | تتنقل (موجودة للعمال، تتعمّم) |
| `sortByNameAr(DATA.supervisors)` بعد الحفظ | ترتيب المصفوفة في الملف | مالهاش أثر في الجداول (القايمة بتترتّب بالاسم أصلًا) |
| `ensureProjectSaved` | ولا حاجة (بترجع على طول في القديمة) | مالهاش أثر |
| `addAudit` | سطر في سجل التدقيق القديم | التدقيق الموحّد (تقني مقبول، زي 8.1) |
| `takeFormDraftAttachments`، `formAttachmentsBlockHtml`، `bindAttachmentHandlers` | المرفقات | لوحة المرفقات (زي 8.1) |
| `customFieldsFormHtml`، `collectExtraFieldsForSave` | الخانات الإضافية | تتنقل (القيم بس، زي 8.1) |
| `bindAutoStatusDates`، `bindExtraFieldsButton`، `bindEntityCombos` | سلوك الخانات في النافذة | شكل بس |
| `applyFormLayout('expenses', …)` في نافذة سواق الشركة | بيطبّق تخطيط نموذج «المصروفات» على نافذة السواق (شكله غلطة في القديمة) | **لسه ماتأكدتش من أثره:** اختبار النسختين في 8.2.4 هيقارن السجل المحفوظ، ولو ليه أثر يتنقل أو يتسجّل |
| `smartSearchList`، `applyExtraPersonFilters`، `filterByDeptFilter`، `sortByNameAr`، `smartMatch` | القايمة | تتنقل (موجودة) |
| `entityStatCardsHtml`، `personNotesIssues`، `personWarningBadge`، `personStatusCellHtml`، `workersOfSupervisor` | الكروت والملاحظات والجدول | تتنقل (تتعمّم من العمال) |
| `renderSupervisorStatementPage`، `openPersonDetailPage`، `softDelete`، `bulkBarHtml`، `personListExport` | الكشف، والصفحة، والحذف، والجماعي، والتصدير | الشاشة الكاملة (د-2، د-3) |

## 3. اللي الاستكشاف طلّعه (مهم للنقل)
1. **السواق الخارجي من غير دمج:** تعديله بيكتب كل الخانات زي ما هي، فالخانة الفاضية بتمسح القيمة (`phase75.js` [8]). سواق الشركة والمشرف بالدمج.
2. **ترتيب خطوات قايمة السواقين** مختلف عن المشرفين والعمال (الترتيب بالاسم الأول، والبحث بعده)، والحالة الفاضية بتتحسب «نشط».
3. **البحث بـ «سواق»** مابيلاقيش «أحمد السواق»: البحث الذكي بيطابق بداية الكلمة، و«ال» جزء من الكلمة.
4. **«بدون يومية محددة»** بتظهر لسواق الشركة اللي ليه راتب، وده سلوك القديمة.
5. **حفظ نافذة المشرف** بيملا تاريخ التعيين بالنهارده لو فاضي (زي العمال). ولوحظ إن مشرف من غير يومية اتحفظ باليومية 0 (`phase75.js` [9]). السبب لسه ماتحددش، واختبار النسختين في 8.2.4 هيثبّت نفس النتيجة.
6. **جدول السواقين من بره** عنوان العمود فيه «الهاتف» (مش «رقم التليفون» زي جدول سواقين الشركة).
