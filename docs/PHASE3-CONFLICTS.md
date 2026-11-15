# تصادم الأسماء العامة بين HR ودفتر الموردين (تقرير مرجعي)

> **تحديث 0.5.0:** التصادمات دي اتحلّت بإعادة تسمية آلية (52 اسم → `lg…`، راجع `tools/merge/rename-map.json`). التقرير محفوظ كمرجع، وإزالة التكرار الفعلي بين نسخ الدفتر وHR بتتم في 0.6.

> مولَّد آلياً من مقارنة `renderer/core` + `renderer/modules/hr` بملفات واجهة دفتر الموردين (نسخة 1.1.3).
> الأسماء اللي نفس الاسم **ونفس التعريف** بالظبط (حوالي 30) مش ظاهرة هنا لأنها مش مشكلة.

**الملخص:** 70 اسم عام بنفس الاسم وتعريف مختلف:

- حالة مشتركة (متغيرات/ثوابت عامة): **9**
- تقريباً متطابقة (تشابه ≥ 90%): **16**
- متشابهة (60–90%): **19**
- مختلفة جداً (< 60%): **26**

باقي أسماء الدفتر (حوالي 330) مش متصادمة ومش محتاجة أي تغيير في الاسم.

## طريقة الحل المقترحة (المرحلة 3)
1. ندمج الفئة A ثم B في نسخة HR المشتركة مع اختبار مقارنة لكل دالة.
2. فئة C: إعادة تسمية ميكانيكية (بادئة `lg`) لدوال الدفتر المتصادمة مع كل أماكن استخدامها (استدعاءات و`onclick` داخل القوالب)، والتحقق بالاختبارات.
3. فئة S: نقل حالة الدفتر لقسمه في ملف البيانات وكائن حالة خاص (`LG`).
4. بعد كل خطوة: `npm run check` + اختبار مقارنة صفحات HR (لازم تفضل مطابقة).


## حالة مشتركة (متغيرات/ثوابت عامة)
نفس الاسم لحالة مختلفة في كل برنامج (مثل `DATA` و`currentPage` و`pageState`). **لازم تتفصل** — حالة الدفتر تتنقل لـ `getDataSection('ledger')` وكائن حالة خاص بالوحدة.

| الاسم | النوع | HR (ملف:سطر) | الدفتر (ملف:سطر) | أسطر HR/الدفتر | التشابه |
|---|---|---|---|---|---|
| `uiZoom` | let | state.js:198 | state.js:68 | 2 / 3 | 85% |
| `__netSaveInFlight` | let | network.js:104 | network.js:101 | 3 / 3 | 62% |
| `readOnlyMode` | let | state.js:200 | state.js:71 | 1 / 2 | 56% |
| `currentPage` | let | state.js:151 | state.js:17 | 1 / 1 | 43% |
| `pageState` | const | state.js:164 | state.js:34 | 6 / 1 | 35% |
| `archiveFilters` | let | pages-archive.js:1 | pages-archive.js:2 | 7 / 12 | 30% |
| `__indexes` | let | data-store.js:4 | data-store.js:6 | 8 / 1 | 28% |
| `uiDensity` | let | state.js:197 | state.js:65 | 1 / 3 | 17% |
| `DATA` | let | state.js:6 | state.js:6 | 59 / 1 | 15% |

## تقريباً متطابقة (تشابه ≥ 90%)
نفس الوظيفة بفروق بسيطة. **الخطة:** نستخدم نسخة HR ونراجع الفرق سطر بسطر قبل حذف نسخة الدفتر.

| الاسم | النوع | HR (ملف:سطر) | الدفتر (ملف:سطر) | أسطر HR/الدفتر | التشابه |
|---|---|---|---|---|---|
| `changeRoPin` | function | helpers.js:3650 | helpers.js:1547 | 7 / 7 | 99% |
| `hashPin` | function | helpers.js:3635 | helpers.js:1526 | 6 / 6 | 99% |
| `tablePagerHtml` | function | state.js:185 | state.js:50 | 11 / 11 | 99% |
| `clearStoredRoPin` | function | helpers.js:3643 | helpers.js:1538 | 1 / 3 | 98% |
| `getStoredRoPin` | function | helpers.js:3641 | helpers.js:1532 | 1 / 3 | 98% |
| `persistReadOnlyFlag` | function | helpers.js:3657 | helpers.js:1554 | 1 / 3 | 98% |
| `setStoredRoPin` | function | helpers.js:3642 | helpers.js:1535 | 1 / 3 | 98% |
| `showUndoToast` | function | helpers.js:3821 | helpers.js:1906 | 30 / 35 | 98% |
| `emptyPagePerms` | function | permissions.js:4 | permissions.js:27 | 5 / 5 | 95% |
| `isUserTypingOrEditing` | function | network.js:165 | network.js:167 | 13 / 14 | 93% |
| `paginateRows` | function | state.js:173 | state.js:38 | 12 / 12 | 93% |
| `apiLogin` | function | network.js:83 | network.js:79 | 8 / 8 | 92% |
| `docTypeComboHtml` | function | helpers.js:4067 | pages-archive.js:681 | 9 / 8 | 92% |
| `initExtraFieldsWrap` | function | helpers.js:970 | helpers.js:473 | 9 / 8 | 91% |
| `verifyRoPin` | function | helpers.js:3645 | helpers.js:1542 | 5 / 5 | 91% |
| `saveData` | function | data-store.js:615 | data-store.js:278 | 15 / 18 | 90% |

## متشابهة (60–90%)
نفس الفكرة بتفاصيل مختلفة. **الخطة:** نقارن، ندمج أي تحسين في نسخة واحدة مشتركة، ونختبر الاتنين.

| الاسم | النوع | HR (ملف:سطر) | الدفتر (ملف:سطر) | أسطر HR/الدفتر | التشابه |
|---|---|---|---|---|---|
| `extraFieldRowHtml` | function | helpers.js:919 | helpers.js:427 | 10 / 8 | 85% |
| `extraFieldsSummary` | function | helpers.js:990 | helpers.js:492 | 5 / 4 | 83% |
| `stopNetworkPolling` | function | network.js:196 | network.js:206 | 5 / 3 | 83% |
| `bindDocTypeCombos` | function | helpers.js:4076 | pages-archive.js:689 | 72 / 51 | 82% |
| `addExtraFieldRow` | function | helpers.js:929 | helpers.js:435 | 5 / 6 | 81% |
| `openManageDocTypesModal` | function | pages-ops.js:619 | pages-archive.js:740 | 45 / 36 | 79% |
| `startNetworkPolling` | function | network.js:179 | network.js:182 | 17 / 24 | 78% |
| `saveDataNetwork` | function | network.js:137 | network.js:131 | 28 / 36 | 77% |
| `escapeHtml` | function | helpers.js:10 | helpers.js:414 | 5 / 5 | 76% |
| `preferredAttachNameFromInvoice` | function | modals-common.js:5 | modals.js:3 | 4 / 4 | 74% |
| `loadDataNetwork` | function | network.js:118 | network.js:104 | 19 / 27 | 73% |
| `setTablePage` | function | state.js:171 | state.js:36 | 1 / 1 | 73% |
| `uid` | function | helpers.js:9 | helpers.js:2 | 1 / 3 | 72% |
| `promptAddExtraField` | function | helpers.js:934 | helpers.js:441 | 36 / 32 | 71% |
| `ensureDocumentTypeSaved` | function | helpers.js:4038 | pages-archive.js:674 | 14 / 7 | 69% |
| `flushSave` | function | data-store.js:631 | data-store.js:297 | 30 / 30 | 68% |
| `getAllDocumentTypeLabels` | function | helpers.js:4053 | pages-archive.js:663 | 14 / 11 | 65% |
| `brandLogoHtml` | function | helpers.js:152 | helpers.js:419 | 4 / 5 | 63% |
| `resetTablePage` | function | state.js:172 | state.js:37 | 1 / 1 | 61% |

## مختلفة جداً (< 60%)
نفس الاسم لكن وظيفتين مختلفتين (غالباً صفحات/نماذج خاصة بكل وحدة). **الخطة:** إعادة تسمية دوال الدفتر ببادئة `lg` (أو نقلها لـ namespace) — مش دمج.

| الاسم | النوع | HR (ملف:سطر) | الدفتر (ملف:سطر) | أسطر HR/الدفتر | التشابه |
|---|---|---|---|---|---|
| `renderArchiveTrash` | function | pages-archive.js:212 | pages-archive.js:231 | 33 / 49 | 60% |
| `loadReadOnlyFlag` | function | helpers.js:3658 | helpers.js:1557 | 1 / 6 | 59% |
| `el` | function | helpers.js:7 | helpers.js:424 | 2 / 3 | 56% |
| `renderArchivePage` | function | pages-archive.js:54 | pages-archive.js:214 | 11 / 11 | 54% |
| `applyUiDensity` | function | helpers.js:3887 | app.js:164 | 13 / 12 | 53% |
| `showToast` | function | helpers.js:137 | helpers.js:497 | 15 / 11 | 50% |
| `rebuildIndexes` | function | data-store.js:155 | data-store.js:8 | 51 / 26 | 43% |
| `render` | function | app.js:2 | app.js:3 | 56 / 139 | 40% |
| `toggleReadOnlyMode` | function | helpers.js:3688 | helpers.js:1801 | 26 / 45 | 37% |
| `firstVisiblePage` | function | permissions.js:64 | permissions.js:147 | 6 / 5 | 36% |
| `fmtDateTime` | function | helpers.js:95 | helpers.js:249 | 22 / 13 | 36% |
| `hasPagePermission` | function | permissions.js:53 | permissions.js:137 | 11 / 10 | 36% |
| `promptPinDialog` | function | helpers.js:3660 | helpers.js:1741 | 27 / 59 | 36% |
| `fmtDate` | function | helpers.js:89 | helpers.js:232 | 6 / 17 | 34% |
| `openShortcutsHelp` | function | app.js:507 | app.js:1333 | 68 / 78 | 32% |
| `showLoginScreen` | function | network.js:561 | network.js:209 | 145 / 52 | 32% |
| `initAppEntry` | function | network.js:708 | network.js:261 | 91 / 29 | 29% |
| `loadData` | function | data-store.js:319 | data-store.js:184 | 55 / 28 | 21% |
| `renderBackupPage` | function | pages-backup.js:5 | pages-backup.js:32 | 319 / 175 | 20% |
| `sanitizeLoadedData` | function | data-store.js:216 | data-store.js:153 | 102 / 30 | 20% |
| `renderReportsPage` | function | pages-reports.js:56 | pages-reports.js:24 | 71 / 59 | 18% |
| `rerenderCurrentPage` | function | app.js:282 | app.js:1278 | 32 / 53 | 15% |
| `renderUsersPage` | function | pages-users.js:16 | pages-users.js:8 | 120 / 52 | 13% |
| `applyUiZoom` | function | app.js:315 | app.js:143 | 117 / 21 | 10% |
| `attachPageHandlers` | function | app.js:175 | app.js:240 | 35 / 485 | 10% |
| `openExcelImportModal` | function | excel-import.js:260 | excel-import.js:4 | 698 / 10 | 10% |
