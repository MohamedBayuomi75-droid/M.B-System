# قبول المستحقات والصرف — الحزمة 8.6 (خطة v1.4.5، المرحلة 8)

> **المرجع:** `PHASE_08_6_BEFORE_REPORT.md` (DEC-0137)، و`LABOR_ATTENDANCE_DECISIONS.md` (DEC-0129 لـ DEC-0134). الواجهة القديمة: `renderer/modules/hr/pages-worker-dues.js`، ودوال الأرصدة في `renderer/core/helpers.js`.
> **الحالة:** 8.6.1 خلص (الاستكشاف واختبارات القديمة `phase83.js`). الجداول والـ API والشاشة جاية.

## 1. الوظايف ← القديم ← الاختبار ← الحالة
| # | الوظيفة | القديم | الاختبار على القديمة | الحالة |
|---|---|---|---|---|
| D1 | لوحات الأنواع (الموظفين، والمشرفين، والعمال، والسواقين؛ والمعدات ← 8.7) والأقسام (الكل، و«بدون قسم»، والأقسام) | `renderDuesKindBoards`، `renderDuesDeptBoards` | `phase83.js` [1] | ⏳ |
| D2 | جدول العمال: الأيام، والغياب، والبدلات، والمستحق، والخصم، والمصاريف، والمدفوع، والمتبقي، و«تم الدفع» — والكروت | `renderDuesWorkers` + `workerBalance` | [2] [3] | ⏳ |
| D3 | جدول المشرفين من كشف واحد (مستحقه + عماله + معداته) | `renderDuesSupervisors` + `supervisorWageStatement` | [2] [3] | ⏳ |
| D4 | جدول السواقين | `renderDuesDrivers` + `driverBalance` | [2] [3] | ⏳ |
| D5 | جدول الموظفين (الراتب بالشهور، أو الرواتب المسجّلة) | `renderDuesEmployees` + `employeeBalance`، `employeeDueAmount` | [2] [3] | ⏳ |
| D6 | سجل الصرف والخصومات تحت الجدول، والبحث، والإجماليات | `renderDuesPaymentsList` | [2] [4] | ⏳ |
| D7 | نافذة الصرف: يومية، وراتب (بسقف الراتب المسجّل)، ودفع الإضافات المستحقة | `openUnifiedPayModal` | [5] | ⏳ (+ السلفة DEC-0132) |
| D8 | بدلات ومكافآت (مستحق مش مدفوع) | `openUnifiedPayModal(extrasOnly)` | [5] | ⏳ |
| D9 | الخصم / الجزاء (العامل والمشرف والسواق في `workerPayments`، والموظف في `employeePenalties`) | `openUnifiedPayModal('penalty')` | [5] | ⏳ |
| D10 | صرف المشرف بالنطاقات (للمشرف، وتوزيع على العمال بنسبة المتبقي الموجب، وإقفال حساب) | `openUnifiedPayModal` (المشرف) | [5] | ⏳ |
| D11 | الحذف من السجل | `btn-del-pay` | [6] | ⏳ |
| D12 | بنود الصرف والخصم (القوايم القابلة للتعديل) | `openPayItemsManageModal`، `paymentItemPool`… | — | ⏳ |
| D13 | كشوف الحساب للطباعة | `printWorkerStatement`… | — | الشاشة الكاملة (د-6) |
| D14 | مستحقات المعدات | `renderDuesEquipment` | — | الحزمة 8.7 (د-1) |

## 2. كل دالة بتقرا أو بتكتب الصرف والخصومات (8.6.1)
| الدالة | الأثر | الحالة في 8.6 |
|---|---|---|
| `isActualPayment`، `isBonusEntitlement` | الصرف الفعلي (مش خصم ولا مكافأة مستحقة) | تتنقل |
| `workerPaidTotal`/`PenaltyTotal`، `supervisorPaidTotal`/`PenaltyTotal`، `driverPaidTotal`/`PenaltyTotal`، `employeePenaltyTotal` | المدفوع والخصم لكل شخص | تتنقل |
| `workerBalance`، `driverBalance`، `employeeBalance`، `supervisorWageStatement` | المتبقي | تتنقل — **بالحساب الجديد للأيام (DEC-0129)**، والقديم كمرجع لتقرير الفرق |
| `personExtrasTotal`، `personCostsTotal`، `personExpensesTotal`، `supervisorExpensesInRange`، `supervisorEquipmentCost` (`equipmentDailyCost`) | البدلات والتكاليف والمصاريف وتكلفة المعدات | **قراية بس** (د-5) |
| `personUnpaidBonuses` | الإضافات المستحقة اللي لسه ماتدفعتش (للنافذة) | تتنقل |
| `getOutstandingAdvances` | تقرير السلف (بالنص «سلف» في البند) | التقارير — الشاشة الكاملة؛ **السلفة الجديدة (DEC-0132) ليها علامة صريحة** |
| `cleanupOrphanDataRecords` | «فحص البيانات»: بيمسح المكافآت المستحقة والخصومات لأشخاص محذوفين، وعمره ما بيمسح صرف فعلي | زي ما هي |
| `runSchemaMigrations`، `sanitizeLoadedData`، `ensureRecordIds` | وقت التحميل: المصفوفات والمعرّفات | البروفة المجمّعة بتقيس التعديلات |
| `paymentsStatementBlock`، `printEmployeeStatement`، `personFinData`، `repDuesFull`، `buildMonthlyOverviewStats`، `extraCalcChecks`، `validateCalculations` | الكشوف والتقارير وفحص الحسابات | الشاشة الكاملة (بالحساب الجديد بعد المفتاح — د-2) |

## 3. اللي الاستكشاف طلّعه
1. **الصرف فوق المتبقي مسموح في القديمة** لليومية والإضافات (الراتب بس ليه سقف = الراتب المسجّل). في الاختبار: دفع 5050 لعامل متبقيه 685 ← المتبقي بقى سالب. **الجديدة: سلفة بس (DEC-0132).**
2. **توزيع صرف المشرف على العمال** بياخد العمال اللي متبقيهم **موجب** بس، بالنسبة، والباقي للأخير.
3. **تقرير السلف القديم بيقرا النوع من `personKind`** — والصرف بيتسجّل بـ `personType`، فكل السلف بتظهر «عامل». (تقرير في الشاشة الكاملة — بيتسجّل هنا بس.)
4. **سجل صرف قديم من غير `type`** بيتحسب «دفع مستحق» (`type` الافتراضي `pay`) — بيتنقل زي ما هو.
5. **خصم الموظف ليه مكانين:** `employeePenalties` (من النافذة) و`workerPayments` بنوع `penalty` (من مصادر تانية) — والاتنين بيتجمعوا.

## 4. البيانات الحقيقية
`workerPayments` = 0، و`employeePenalties` = 0، و`payroll` = 0، و`expenses` = 0؛ و`costs` = 41، واليوميات = 880. الأثر الحقيقي في المستحق والمتبقي بس.
