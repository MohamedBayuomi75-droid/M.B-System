# قبول الموظفين — الحزمة 8.3 (خطة v1.4.5، المرحلة 8)

> **المرجع:** `PHASE_08_3_BEFORE_REPORT.md` (DEC-0125). الواجهة القديمة: `renderer/modules/hr/pages-employees.js` و`modals-employees.js`، والدوال المشتركة في `renderer/core/helpers.js` و`extras.js` و`smart-tools.js`.
> **الحالة:** 8.3.1–8.3.2 خلصوا (الاستكشاف + اختبارات القديمة). الباقي بيتملا مع كل خطوة.

## 1. الوظايف ← القديم ← الاختبار ← الحالة
| # | الوظيفة | القديم | الاختبار على القديمة | الجديد | الحالة |
|---|---|---|---|---|---|
| E1 | لوحات الأقسام بالأعداد | `entityDeptBoardsPageHtml` | `phase77.js` [2] | — | ⏳ 8.3.4 |
| E2 | القايمة: الحالة، ونوع التوظيف، والوظيفة، والبحث، والفلاتر الإضافية (ومنها الرخصة)، و«بدون قسم أو وظيفة» | `filteredEmployees` | `phase77.js` [3] (18 حالة) | — | ⏳ |
| E3 | **قسم المستقيلين:** كروت خاصة (4)، وفلاتر خاصة (التأمين، وسنة الاستقالة)، وجدول خاص (بالقسم السابق، وتاريخ الاستقالة) | `resignedEmployeesCardsHtml`، `resignedEmployeesFiltersHtml`، `resignedEmployeesTableHtml` | `phase77.js` [3] [5] | — | ⏳ |
| E4 | الملاحظات وعلامة النقص | `personNotesIssues('employee')` | `phase77.js` [4] | الموجود (بالنوع) | ⏳ |
| E5 | الكروت العادية، والجدول العادي (وعمود «القسم» بيعرض **الوظيفة**) | `entityStatCardsHtml`، `renderEmployeesPage` | `phase77.js` [5] | — | ⏳ |
| E6 | نافذة الموظف: `EMP-`، ونوع التوظيف («full» افتراضي)، والبريد، ورصيد الإجازة (الافتراضي من الإعدادات)، والراتب، والرخصة، وبيانات الموارد البشرية | `openEmployeeModal` | `phase77.js` [6] | — | ⏳ |
| E7 | الدمج من غير مسح القيم بالفاضي | `mergePersonRecord` | `phase77.js` [7] | الموجود | ⏳ |
| E8 | الاستقالة (**مفيش خانة تاريخ** ← النهارده)، والأرشيف، وإعادة التفعيل | `syncPersonResignedState` | `phase77.js` [8] | الموجود (بالنوع) | ⏳ |
| E9 | منع التكرار | `guardEntityDuplicates` | `phase77.js` [9] | `person-duplicates.ts` | ⏳ |
| E10 | حماية الأجور (الراتب) | `field-guards.ts` | — | الموجود (B-48) | ⏳ |
| E11 | تخطيط الأعمدة المحفوظ، وترتيب خانات النافذة | `apply`، `applyFormLayout`، `applyPeopleFormOrder` | — | `legacy-table-layout.ts`، `legacy-form-order.ts` | ⏳ |
| E12 | صفحة الموظف (👁)، وكشف الحضور، والحذف، والإجراءات الجماعية، والتصدير، وتعديل التخطيط | `openPersonDetailPage`، `softDelete`… | — | الشاشة الكاملة (د-3) | متأجل بقرار |
| E13 | حساب رصيد الإجازات من الإجازات، وصفحة الإجازات والموافقة | `employeeLeaveBalance`، `pages-leaves.js` | — | الحزمة 8.4 (د-1، د-4) | متأجل بقرار |

## 2. كل دالة بينادي عليها الحفظ والصفحة (8.3.1)
| الدالة | الأثر | الحالة في 8.3 |
|---|---|---|
| `ensureUniqueCode` (`EMP-`)، `nextEmployeeCode` | الكود | تتنقل (موجودة) |
| `collectPersonHrFields('emp', { showSalary })` | الحقول (والرخصة كمان) | تتنقل (موجودة من 8.2) |
| `readResignedDateFromForm('emp', …)` | **مفيش خانة `#empResignDate` في النافذة** ← دايمًا فاضي | تتنقل زي ما هي (تاريخ الاستقالة = النهارده من `syncPersonResignedState`) |
| `syncDocStatusesFromDates` | حالة البطاقة والرخصة | تتنقل (موجودة) |
| **`personDeptOnSave` — مش بيتنادى** | الموظف الجديد بيتحفظ **من غير قسم**، والقسم الأساسي بيتحط عند التحميل الجاي (`assignCoreDepartments`) | **سلوك القديمة بيتنقل زي ما هو**، والبروفة بتقيس التعديلات وقت التحميل (§3) |
| `guardEntityDuplicates('employee', …)` | منع التكرار | تتنقل (موجودة) |
| `mergePersonRecord` | الدمج | تتنقل (موجودة) |
| `syncPersonResignedState('employee', …)` | الأرشيف | تتنقل (موجودة بالنوع) |
| `Number(empLeaveBal) \|\| 0` | رصيد الإجازة (الافتراضي في النافذة `settings.defaultLeaveDays \|\| 21`) | يتنقل زي ما هو (د-4) |
| `addAudit` | سجل التدقيق القديم | التدقيق الموحّد (تقني مقبول) |
| `takeFormDraftAttachments`، `formAttachmentsBlockHtml` | المرفقات | لوحة المرفقات |
| `customFieldsFormHtml`، `collectExtraFieldsForSave` | الخانات الإضافية | تتنقل (من 8.2) |
| `bindResignedStatusToggle`، `bindAutoStatusDates`، `bindExtraFieldsButton` | سلوك الخانات | شكل بس |
| `filteredEmployees` (ومنها `resignYear` و`insuranceStatus` في قسم المستقيلين) | القايمة | تتنقل |
| `resignedEmployeesCardsHtml` / `FiltersHtml` / `TableHtml` | قسم المستقيلين | تتنقل (د-2) |
| `entityStatCardsHtml('employees')`، `personNotesIssues`، `personWarningBadge` | الكروت والملاحظات | تتنقل (موجودة بالنوع) |
| `openPersonDetailPage`، `softDelete`، `bulkBarHtml`، `personListExport` | الصفحة والحذف والجماعي والتصدير | الشاشة الكاملة (د-3) |

## 3. اللي الاستكشاف طلّعه (مهم للنقل)
1. **الموظف الجديد بيتحفظ من غير قسم.** القسم بيتحط عند التحميل الجاي للقديمة، وده تعديل وقت التحميل. **في الجديدة:** نفس السلوك (السيرفر مابيحطش قسم)، والبروفة بتقيس التعديلات وقت التحميل قبل النقل وبعده.
2. **مفيش خانة تاريخ استقالة** في نافذة الموظف (رغم إن الحفظ بيقراها) ← تاريخ الاستقالة = النهارده.
3. **عمود «القسم» في الجدول العادي بيعرض الوظيفة** (`e.position || e.job || e.jobTitle || departmentName`).
4. **الموظف المستقيل مابيتنقلش لقسم المستقيلين** غير لما يتحفظ (زي العمال). البيانات القديمة ممكن يكون فيها مستقيل في «الموظفين».
5. **كروت قسم المستقيلين للموظفين مختلفة** عن باقي الأنواع (4 كروت: العدد، وهذا العام، ومتوسط مدة الخدمة، وبدون تاريخ).
6. نوع التوظيف في الإضافة بيبان فاضي («— اختر —»)، وبيتحفظ «full» لو فضل فاضي.
