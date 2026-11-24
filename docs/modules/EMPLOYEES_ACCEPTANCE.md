# قبول الموظفين — الحزمة 8.3 (خطة v1.4.5، المرحلة 8)

> **المرجع:** `PHASE_08_3_BEFORE_REPORT.md` (DEC-0125). الواجهة القديمة: `renderer/modules/hr/pages-employees.js` و`modals-employees.js`، والدوال المشتركة في `renderer/core/helpers.js` و`extras.js` و`smart-tools.js`.
> **الحالة:** 8.3.1–8.3.4 خلصوا (الاستكشاف، واختبارات القديمة، والجدول والنقل، والـ API). الشاشة (8.3.5) والبروفة والـ UAT (8.3.6) بيتملوا مع كل خطوة.

## 1. الوظايف ← القديم ← الاختبار ← الحالة
| # | الوظيفة | القديم | الاختبار على القديمة | الجديد | الحالة |
|---|---|---|---|---|---|
| E1 | لوحات الأقسام بالأعداد | `entityDeptBoardsPageHtml` | `phase77.js` [2] | `boards(…, 'employee')` (👔) | ✅ السيرفر = القديمة (`phase78.js` [1]) — والشاشة (`employees-layout-e2e`) ✅ |
| E2 | القايمة: الحالة، ونوع التوظيف، والوظيفة، والبحث، والفلاتر الإضافية (ومنها الرخصة)، و«بدون قسم أو وظيفة» | `filteredEmployees` | `phase77.js` [3] (18 حالة) | `filterEmployees` | ✅ السيرفر (`phase78.js` [1]: 26 حالة) — والشاشة (`employees-layout-e2e`) ✅ |
| E3 | **قسم المستقيلين:** كروت خاصة (4)، وفلاتر خاصة (التأمين، وسنة الاستقالة)، وجدول خاص (بالقسم السابق، وتاريخ الاستقالة) | `resignedEmployeesCardsHtml`، `resignedEmployeesFiltersHtml`، `resignedEmployeesTableHtml` | `phase77.js` [3] [5] | `filterEmployees`، `employeeSectionCards`، `employeeResignYears`، `previousDepartmentName` | ✅ السيرفر (`phase78.js` [1]، و`employees.e2e`) — والشاشة (`employees-layout-e2e`) ✅ |
| E4 | الملاحظات وعلامة النقص | `personNotesIssues('employee')` | `phase77.js` [4] | `notesIssues(…, 'employee')` («بدون قسم» من `departmentId` بس) | ✅ السيرفر (`phase78.js` [1]) |
| E5 | الكروت العادية، والجدول العادي (وعمود «القسم» بيعرض **الوظيفة**) | `entityStatCardsHtml`، `renderEmployeesPage` | `phase77.js` [5] | `peopleCards(…, 'employee')` | ✅ الكروت والجدول (`employees-layout-e2e`: نفس الأعمدة والخلايا في الكل والقسم الأساسي) |
| E6 | نافذة الموظف: `EMP-`، ونوع التوظيف («full» افتراضي)، والبريد، ورصيد الإجازة (الافتراضي من الإعدادات)، والراتب، والرخصة، وبيانات الموارد البشرية | `openEmployeeModal` | `phase77.js` [6] | `employeePayload` (`POST /api/v1/employees`) | ✅ السيرفر = النافذة (`phase78.js` [2] نسختين) — والشاشة (`employees-layout-e2e`) ✅ |
| E7 | الدمج من غير مسح القيم بالفاضي | `mergePersonRecord` | `phase77.js` [7] | `commitPerson` (دمج) | ✅ (`phase78.js` [2]، `employees.e2e`) |
| E8 | الاستقالة (**مفيش خانة تاريخ** ← النهارده)، والأرشيف، وإعادة التفعيل | `syncPersonResignedState` | `phase77.js` [8] | `syncResigned(…, 'employee')` | ✅ (`phase78.js` [2]، `employees.e2e`) |
| E9 | منع التكرار | `guardEntityDuplicates` | `phase77.js` [9] | `person-duplicates.ts` | ✅ (`phase78.js` [4]) |
| E10 | حماية الأجور (الراتب) | `field-guards.ts` | — | الموجود (B-48) | ✅ (`phase78.js` [3]، `employees.e2e`) |
| E11 | تخطيط الأعمدة المحفوظ، وترتيب خانات النافذة | `apply`، `applyFormLayout`، `applyPeopleFormOrder` | — | `legacy-table-layout.ts`، `legacy-form-order.ts` | ✅ (`employees-layout-e2e`: من غير تخطيط ومع تخطيط محفوظ، والنافذة بالخانات والقيم والخيارات بالترتيب) |
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
7. **(8.3.5) صفوف جدول الموظفين في القديمة مافيهاش خلايا الخانات الإضافية** — العناوين بس (`customFieldsTableHeaders` من غير `customFieldsTableCells`). لو فيه خانة إضافية ظاهرة في الجدول، الصف بيبقى أقصر من العناوين، فتخطيط الأعمدة بيرتّب العناوين من غير الصفوف، و**الأعمدة بتتزحزح عن قيمها**. الشاشة الجديدة **بتعمل نفس الحاجة بالظبط** (LEGACY-PRESERVE)، والبروفة هتقول لو ده حاصل في البيانات الحقيقية. **مقترح للبوابة:** إصلاحه (تحسين) بقرارك.
8. **(8.3.5) عمود «رصيد الإجازة» التلقائي** (لو المستخدم فعّل خانة `#empLeaveBal` في الجدول): القديمة بتحسبه من الإجازات (`employeeLeaveBalance`)، والجديدة بتسيبه فاضي لحد الحزمة 8.4 (د-4). العمود مش ظاهر في الافتراضي، والبروفة هتقول لو مفعّل.
9. **(8.3.5) القوايم المنسدلة في القديمة مترتبة بالاسم** (`selectOptions`). اتصلّح في شاشة الموظفين، **وفي نوافذ المشرفين والسواقين كمان** (8.2 — كانت بترتيب ثابت)، وخانة «درجة الرخصة» الفاضية بقت «— اختر —» زي القديمة. ومعاهم مقارنة آلية للخيارات بالترتيب. (نوافذ العمال 8.1: مهمة منفصلة مقترحة.)

## 4. الجدول والنقل (8.3.3)
- جدول `employees` (`server/src/migrations/1765400000000-EmployeesCutover.ts`) بنفس طريقة العمال والمشرفين والسواقين: كل حقل في عموده **لو نوعه مطابق**، والباقي في `legacy_extra` زي ما هو (DEC-0107). ومنهم `email`، و`employment_type`، و`leave_balance` (رقم زي ما هو — د-4)، و`leave_auto`.
- أمر النقل `npm run cutover -- employees dry-run|execute|rollback` (`EMPLOYEES` في `parties-cutover.ts`)، والواجهة القديمة بتكتب فوق الجدول من غير ما تحس (`RELATIONAL_WRITERS`).
- مصفوفة الحقول: `EMPLOYEES_FIELD_PARITY.md` (مولّدة، وفي الـ CI): 38 حقل، 36 ليهم عمود، و2 في `legacy_extra` (`dailyWage` و`skill` — من الدالة المشتركة)، و0 ضايع.
- الاختبارات: `emp-cutover.e2e` (النقل والرجوع بمطابقة كاملة، وحماية الراتب، والقيم اللي نوعها مختلف)، و`phase77`/`phase78` فوق الجداول (`WEB_CUTOVER` في الـ CI فيه `employees`).

## 6. الشاشة (8.3.5)
- `/app/employees` (نفس مكوّن المشرفين والسواقين `people.page.ts` بالنوع `employee`): اللوحات، والكروت، والفلاتر (نوع التوظيف، والوظيفة، والإضافية)، والجدول بتخطيط الأعمدة المحفوظ، و**قسم المستقيلين والمعاشات بكروته وفلاتره وجدوله الخاص من غير تخطيط** (زي القديمة)، والنافذة بترتيب خاناتها الظاهر (البريد، ورصيد الإجازة الافتراضي، ومن غير خانة تاريخ استقالة).
- القايمة لسه بتفتح الواجهة القديمة: قلب التوجيه في البوابة (د-6).
- `tests-web/employees-layout-e2e.js` (في الـ CI): الكروت، والفلاتر بالمعرّفات والخيارات، والجدولين، في 4 أقسام × وضعين (من غير تخطيط، وبتخطيط محفوظ)، والنافذة (الخانات بالترتيب، والقيم، وخيارات القوايم)، والحفظ من الشاشة الجديدة (الإضافة من غير قسم، والاستقالة، ومنع التكرار).

## 5. الـ API (8.3.4)
- `GET /api/v1/employees` (اللوحات، والقايمة بالفلاتر، والكروت، والملاحظات، وخيارات الوظيفة وسنين الاستقالة، و`mode`: company / resigned / retired، وتخطيط الأعمدة المحفوظ)، و`GET /:id`، و`GET /form-options` (أنواع التوظيف، ورصيد الإجازة الافتراضي)، و`POST` (Idempotency-Key)، و`PATCH` (rev).
- نفس طبقة المشرفين والسواقين (`PeopleService`، بالنوع `employee`)، والحفظ في معاملة واحدة بنفس صلاحيات `/api/sync`، وحدث `employee.saved`.
