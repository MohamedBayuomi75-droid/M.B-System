# كتالوج المعادلات والحالات الذهبية (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ `node tools/discovery/build-formula-catalogue.js`. ماتعدّلش الملف باليد. **مفيش أي معادلة اتغيّرت.**
> **المصادر:** الحساب المرجعي المستقل (`tools/formulas/reference.js`)، ومشغّل دوال النظام القديم (`legacy-runner.js`)، وبيانات الاختبار المصمّمة (`fixture.js`)، واختبار `tests-merge/phase59.js` (القيم المتوقعة محسوبة يدويًا)، ومكتبة B-20 (`server/finance-formulas/B20_LIBRARY.json`).
> **النتيجة المسجّلة:** النظام القديم ↔ المرجع على بيانات الاختبار: 71 معادلة، 107 قيمة، **0 فرق** (المرحلة 1 بعد الدمج). وعلى نسخة البيانات الحقيقية: 65 معادلة، **8,095/8,095** متطابقة (المرحلة 2).
> **عمودا «القاعدة المعتمدة» و«B-20»:** ربط بالتحليل حسب الموضوع، **مقترح للمراجعة** من المدير المالي.

## 1. الملخص
| المقياس | القيمة |
|---|---|
| معادلات الحساب المرجعي (بالفترات) | 71 |
| معادلات مختلفة (من غير تكرار الفترات) | 44 |
| قيم في الحالات الذهبية (بيانات الاختبار) | 107 |
| معادلات مكتبة B-20 (مسودات، مش متفعّلة) | 25 (47 حالة اختبار، كلها ناجحة — `docs/FORMULA_TEST_REPORT.md`) |
| دوال حساب في الواجهة القديمة (LEG) | 120 |

## 2. معادلات النظام القديم
| المعادلة | الفترات | قيم ذهبية | في phase59 | دوال النظام القديم (LEG) | القسم في BUSINESS_RULES_AND_FORMULAS | القاعدة المعتمدة (CHG) | B-20 (مقترح) |
|---|---|---|---|---|---|---|---|
| `invoice.expectedTotal` | — | 5 | أيوه | LEG-0242 `previewInvoiceCalculationFixes`، LEG-0295 `roundMoney` | §2.1–2.3، 2.6 | CHG-0001 (TR-01)، CHG-0002 (TR-02)، CHG-0003 (TR-03)، CHG-0012 (TR-12) | SUP-INVOICE، SUP-RETURN، DOC-TOTALS |
| `invoice.expectedNet` | — | 5 | أيوه | LEG-0295 `roundMoney` | §2.1–2.3، 2.6 | CHG-0001 (TR-01)، CHG-0002 (TR-02)، CHG-0003 (TR-03)، CHG-0012 (TR-12) | SUP-INVOICE، SUP-RETURN، DOC-TOTALS |
| `invoice.remaining` | — | 5 | أيوه | LEG-0246 `invoiceRemaining` | §2.1–2.3، 2.6 | CHG-0001 (TR-01)، CHG-0002 (TR-02)، CHG-0003 (TR-03)، CHG-0012 (TR-12) | SUP-INVOICE، SUP-RETURN، DOC-TOTALS |
| `invoice.noticeWithheld` | — | 4 | أيوه | LEG-0293 `noticeAmountsFor` | §2.1–2.3، 2.6 | CHG-0001 (TR-01)، CHG-0002 (TR-02)، CHG-0003 (TR-03)، CHG-0012 (TR-12) | SUP-INVOICE، SUP-RETURN، DOC-TOTALS |
| `invoice.noticeBase` | — | 4 | أيوه | LEG-0293 `noticeAmountsFor` | §2.1–2.3، 2.6 | CHG-0001 (TR-01)، CHG-0002 (TR-02)، CHG-0003 (TR-03)، CHG-0012 (TR-12) | SUP-INVOICE، SUP-RETURN، DOC-TOTALS |
| `supplier.balance` | — | 1 | أيوه | LEG-0245 `supplierBalance` | §2.4–2.5 | CHG-0004 (TR-04)، CHG-0005 (TR-05)، CHG-0006 (TR-06) | SUP-BALANCE |
| `supplier.openingAsOfDate` | — | 1 | أيوه | LEG-0294 `openingBalanceFor` | §2.4–2.5 | CHG-0004 (TR-04)، CHG-0005 (TR-05)، CHG-0006 (TR-06) | SUP-BALANCE |
| `supplier.statementClosing` | — | 1 | أيوه | LEG-0294 `openingBalanceFor`، LEG-0274 `statementRows` | §2.4–2.5 | CHG-0004 (TR-04)، CHG-0005 (TR-05)، CHG-0006 (TR-06) | SUP-BALANCE |
| `supplier.openingAt` | — | 1 | لأ | LEG-0294 `openingBalanceFor` | §2.4–2.5 | CHG-0004 (TR-04)، CHG-0005 (TR-05)، CHG-0006 (TR-06) | SUP-BALANCE |
| `attendance.netPay` | — | 9 | أيوه | LEG-0289 `attendanceNetPay` | §3 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR |
| `worker.due` | @all، @2026H1 | 2 | لأ | LEG-0074 `workerDueAmount` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `worker.paid` | @all، @2026H1 | 2 | لأ | LEG-0080 `workerPaidTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `worker.penalty` | @all، @2026H1 | 2 | لأ | LEG-0081 `workerPenaltyTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `worker.extras` | @all، @2026H1 | 2 | لأ | LEG-0105 `personExtrasTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `worker.expenses` | @all، @2026H1 | 2 | لأ | LEG-0098 `personExpensesTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `worker.balance` | @all، @2026H1 | 2 | لأ | LEG-0084 `workerBalance` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `driver.due` | @all، @2026H1 | 2 | أيوه | LEG-0086 `driverDueAmount` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `driver.paid` | @all، @2026H1 | 2 | أيوه | LEG-0087 `driverPaidTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `driver.penalty` | @all، @2026H1 | 2 | لأ | LEG-0088 `driverPenaltyTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `driver.extras` | @all، @2026H1 | 2 | لأ | LEG-0105 `personExtrasTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `driver.expenses` | @all، @2026H1 | 2 | لأ | LEG-0098 `personExpensesTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `driver.balance` | @all، @2026H1 | 2 | أيوه | LEG-0091 `driverBalance` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `supervisor.due` | @all، @2026H1 | 2 | أيوه | LEG-0296 `supervisorOwnDue` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `supervisor.paid` | @all، @2026H1 | 2 | لأ | LEG-0083 `supervisorPaidTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `supervisor.penalty` | @all، @2026H1 | 2 | أيوه | LEG-0082 `supervisorPenaltyTotal` | §3–4 | CHG-0007 (TR-07)، CHG-0008 (TR-08) | DAILY-LABOR، REMAINING-DUE |
| `employee.due` | @all، @2026H1 | 4 | أيوه | LEG-0089 `employeeDueAmount` | §5 | CHG-0009 (TR-09)، CHG-0014 (TR-14) | PAYROLL، REMAINING-DUE |
| `employee.balance` | @all، @2026H1 | 4 | أيوه | LEG-0090 `employeeBalance` | §5 | CHG-0009 (TR-09)، CHG-0014 (TR-14) | PAYROLL، REMAINING-DUE |
| `equipment.totalCost` | @all، @2026H1 | 4 | أيوه | LEG-0116 `equipmentTotalCost` | §6 | — | EQUIPMENT-COST |
| `project.labor` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.equip` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.fuel` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.maint` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.expenses` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.costs` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.suppliers` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.warehouse` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `project.total` | @all، @2026H1 | 2 | لأ | LEG-0118 `projectCostSummary` | §6 | CHG-0010 (TR-10) | PROJECT-COST، PROJECT-MATERIAL |
| `equipmentDaily.cost` | — | 4 | أيوه | LEG-0292 `equipmentDailyCost` | §6 | — | EQUIPMENT-COST |
| `client.invoiceNet` | — | 1 | أيوه | LEG-0290 `clInvNet` | §7 | CHG-0011 (TR-11) | CUS-CERT، CERT-CUMULATIVE |
| `client.boqTotal` | — | 2 | أيوه | LEG-0159 `clBoqTotal` | §7 | CHG-0011 (TR-11) | CUS-CERT، CERT-CUMULATIVE |
| `client.surveyTotal` | — | 1 | أيوه | LEG-0168 `clSurveyTotal` | §7 | CHG-0011 (TR-11) | CUS-CERT، CERT-CUMULATIVE |
| `client.voApproved` | — | 1 | أيوه | LEG-0291 `clVoApprovedSum` | §7 | CHG-0011 (TR-11) | CUS-CERT، CERT-CUMULATIVE |
| `warehouse.stockQty` | — | 1 | أيوه | LEG-0297 `whStockQty` | §8 | CHG-0013 (TR-13) | STOCK-QTY، MOVING-AVG |
| `warehouse.stockValue` | — | 1 | أيوه | LEG-0298 `whStockValue` | §8 | CHG-0013 (TR-13) | STOCK-QTY، MOVING-AVG |

## 3. مكتبة B-20 (مسودات — مش متفعّلة)
| الكود | الاسم | الموديول | مرجع المواصفات | حالات الاختبار | قرارات مفتوحة |
|---|---|---|---|---|---|
| `DOC-TOTALS` | إجماليات المستند (البنود والخصومات والصافي) | common | 2.1–2.4 | 5 | ترتيب تطبيق الخصومات المتعددة (المقترح: نسبة البند ← قيمة البند ← خصم المستند) · التقريب على مستوى السطر (المقترح) ولا المستند |
| `SUP-INVOICE` | فاتورة مورد | suppliers | 3.1 | 3 | الخصم تحت الحساب عند الفاتورة ولا عند الدفع · قابلية خصم ق.م لكل فئة مشتريات |
| `SUP-RETURN` | مرتجع مشتريات | suppliers | 3.2 | 2 | الأثر الضريبي للمرتجع (TR-03: مفيش أثر لحد سياسة الضرائب) |
| `SUP-BALANCE` | رصيد المورد | suppliers | 3.3 | 2 | اتجاه التسويات: المواصفات (− دائنة + مدينة) عكس طبيعة حساب المورد الدائن — محتاج تأكيد المعنى · إضافة التحصيلات من المورد (TR-05) — مش موجودة في صيغة المواصفات |
| `CUS-INVOICE` | فاتورة عميل | customers | 4.1 | 1 | هل فيه فواتير مبيعات غير المستخلصات؟ |
| `CUS-RETURN` | مرتجع مبيعات | customers | 4.2 | 1 | — |
| `CUS-BALANCE` | رصيد العميل | customers | 4.3 | 2 | الخصم تحت الحساب اللي العميل بيخصمه: بيتسجّل كتحصيل ولا تسوية؟ · المحتجز داخل الرصيد ولا حساب منفصل |
| `CUS-CERT` | مستخلص عميل | contracts | 5.1 | 1 | المواصفات بتحسب المستخلص كفترة، وTR-11 المعتمد تراكمي — CERT-CUMULATIVE بيكمّلها؛ محتاج تأكيد الطريقة الرسمية · أساس الاحتجاز وأساس ق.م (إجمالي الأعمال؟ قبل ولا بعد الإضافات؟) · معنى taxPct في البيانات الحالية |
| `CERT-CUMULATIVE` | المستخلصات التراكمية والمتبقي من العقد | contracts | 5.2 | 2 | — |
| `SUB-CERT` | مستخلص مقاول باطن | contracts | 5.3 | 1 | مستخلص الباطن مستند منفصل ولا فاتورة مورد بنوع «مقاول» |
| `VOUCHER-ALLOC` | سند قبض/صرف وتوزيعه | treasury | 6.1–6.3 | 3 | المواصفات بتطرح مجموع التخصيصات من الرصيد؛ المقترح يطرح قيمة السند كلها (الجزء غير المخصّص = مقدم بيقلّل الرصيد برضه) — محتاج تأكيد · السماح بالمقدم غير المخصّص لكل نوع سند |
| `PAYROLL` | راتب موظف | hr | 7.1 | 1 | B-46/B-73/B-74 (سياسات الأجور والإجازات والراتب الجزئي) — مانعة للتفعيل |
| `DAILY-LABOR` | مستحقات عامل يومية | labor | 7.2 | 2 | B-47 (الصرف فوق المستحق) · حد أدنى صفر لليوم (TR-07) بيتطبّق قبل الجمع |
| `REMAINING-DUE` | المتبقي للعامل أو الموظف | labor | 7.3 | 2 | B-47: هل المدفوع الزيادة مسموح (سلفة) ولا مرفوض؟ |
| `STOCK-QTY` | الرصيد المخزني والمتاح | warehouses | 8.1 | 2 | الكمية «المحظورة» (BlockedQty) مفهوم جديد — مش موجود في قاعدة البيانات (المحجوز موجود) |
| `MOVING-AVG` | متوسط التكلفة المرجّح المتحرك وتكلفة الصرف | warehouses | 8.2 | 2 | المتوسط لكل صنف ولا صنف × مخزن · FIFO / التمييز المحدد: مش مطبّقين — محتاجين سياسة تقييم لكل صنف (وتغييرها لصنف عليه حركات = إجراء محاسبي) |
| `LANDED-COST` | تكلفة استلام المخزون وقيمته | warehouses | 8.3 | 1 | مكوّنات التكلفة المباشرة المعتمدة |
| `PROJECT-MATERIAL` | تكلفة مواد المشروع | projects | 8.4 | 1 | — |
| `EQUIPMENT-COST` | تكلفة تشغيل المعدات وتحميلها | equipment | 9.1–9.4 | 2 | B-42 (أساس التحميل: ساعات؟ أيام؟) · B-43 (المعدات كأصول والإهلاك) |
| `PROJECT-COST` | التكلفة الفعلية للمشروع والانحراف | projects | 10.1–10.2 | 2 | B-33 (التكاليف غير المباشرة) · ق.م غير القابلة للخصم كتكلفة (TR-10) |
| `PROJECT-PROFIT` | ربحية المشروع | projects | 10.3 | 2 | أساس الاعتراف بالإيراد (EAS 48: المستخلصات المعتمدة؟ نسبة الإنجاز؟) |
| `PROJECT-EAC` | التكلفة المتوقعة عند الإكمال | projects | 10.4 | 1 | أساس التكلفة المتوقعة للإكمال ومين بيعتمدها |
| `CASH-BANK-BALANCE` | رصيد الخزينة أو البنك الدفتري | treasury | 11.1–11.3 | 1 | B-52a…f |
| `BANK-RECON` | المطابقة البنكية | treasury | 11.4 | 2 | B-52f (شكل كشف البنك وقواعد المطابقة) |
| `JOURNAL-BALANCE` | توازن القيد | accounting | 12.1–12.2 | 3 | دليل الحسابات والفترات المالية (B-13…B-19) |

## 4. ملاحظات
- **الحالات الذهبية** للنظام القديم = القيم المحسوبة يدويًا في `phase59.js` على `fixture.js`، ومعاها الحساب المرجعي المستقل. وللقواعد المعتمدة (CHG): `phase62.js` و`tools/formulas/target.js`. ولمكتبة B-20: حالات الاختبار جوه المكتبة نفسها.
- **قواعد التغيير:** أي تغيير في معادلة لازم يمشي بالحساب الموازي (المواصفة المالية §13): الحساب الحالي يفضل، والجديد يتحسب جنبه، والفروق تتسجّل، وماتتغيّرش المعادلة المعتمدة غير بموافقة.
- **⚠️ تعارض أسماء:** `docs/FINANCIAL_FORMULAS_REVIEW.md` بيرقّم المعادلات المراجَعة F-01…F-15، وده **غير** F-xx في `BUSINESS_RULES_AND_FORMULAS.md`. الربط في `ID_MAPPING.md` (الاسم الجديد `FFR-F-xx`).
