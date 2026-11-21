# مصفوفة التتبّع (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ `node tools/discovery/build-traceability.js` من `requirements-registry.json` + ملفات الاختبار. ماتعدّلش الملف باليد.
> **الاختبارات** بتتلاقى بالبحث عن اسم الدالة أو الصفحة في `tests-merge/` و`tests-web/` و`tools/formulas/` و`server/test/` (101 ملف). ده **دليل إن الاختبار بيلمس العنصر**، مش إثبات إنه بيغطي كل حالاته.
> **الحالات** (`02` §20): Implemented ≠ Verified ≠ Accepted. **مفيش حاجة هنا Accepted**: القبول بيكون لكل موديول ببوابة.
> **الأولويات مقترحة.**

## 1. التغطية حسب النوع (LEG)
| النوع | العدد | ليه اختبار بيلمسه | اتنقل للنظام الجديد |
|---|---|---|---|
| page | 54 | 54 (100%) | 4 |
| calc | 120 | 40 (33%) | 0 |
| data-write | 26 | 12 (46%) | 0 |
| modal | 63 | 21 (33%) | 0 |
| export/print | 37 | 5 (14%) | 0 |
| permission | 8 | 0 (0%) | 8 |
| electron-capability | 42 | 6 (14%) | 0 |
| **الإجمالي** | **350** | **138 (39%)** | **12** |

## 2. التغطية حسب الموديول (LEG)
| الموديول | العدد | منها P0 (مقترح) | ليه اختبار | اتنقل | قرارات مفتوحة بتمنعه |
|---|---|---|---|---|---|
| مشترك (core) | 97 | 10 | 30 (31%) | 0 | — |
| الموارد البشرية | 69 | 21 | 19 (28%) | 0 | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| الموردون | 54 | 18 | 15 (28%) | 1 | DEC-0029 (B-29) |
| ديسكتوب | 42 | 15 | 6 (14%) | 0 | — |
| العملاء والمشاريع | 38 | 11 | 28 (74%) | 2 | DEC-0029 (B-29)، DEC-0035 (B-35) |
| المخازن | 13 | 8 | 11 (85%) | 1 | DEC-0077 (B-77) |
| الإعدادات | 11 | 1 | 3 (27%) | 8 | DEC-0035 (B-35) |
| (خارج القايمة) | 10 | 0 | 10 (100%) | 0 | — |
| الحسابات | 6 | 0 | 6 (100%) | 0 | DEC-0013 (B-13)، DEC-0014 (B-14)، DEC-0015 (B-15)، DEC-0016 (B-16)، DEC-0027 (B-27) |
| التقارير | 4 | 0 | 4 (100%) | 0 | — |
| الأرشيف | 3 | 0 | 3 (100%) | 0 | DEC-0061 (B-61) |
| مركز المتابعة | 1 | 0 | 1 (100%) | 0 | — |
| مهامي | 1 | 0 | 1 (100%) | 0 | — |
| حركة الموارد | 1 | 0 | 1 (100%) | 0 | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |

## 3. ⚠️ عناصر P0 (مقترحة) من غير أي اختبار بيلمسها — 51
دي أولوية لاختبارات القبول قبل نقل موديولاتها (`05` §18.4).
| ID | النوع | الموديول | العنصر | الدليل |
|---|---|---|---|---|
| LEG-0136 | data-write | مشترك (core) | كتابة بيانات addAudit | renderer/core/helpers.js |
| LEG-0137 | data-write | مشترك (core) | كتابة بيانات deleteProjectById | renderer/core/helpers.js |
| LEG-0138 | data-write | مشترك (core) | كتابة بيانات addExtraFieldRow | renderer/core/helpers.js |
| LEG-0139 | data-write | مشترك (core) | كتابة بيانات updateBulkBar | renderer/core/helpers.js |
| LEG-0144 | data-write | مشترك (core) | كتابة بيانات saveDataNetwork | renderer/core/network.js |
| LEG-0150 | calc | العملاء والمشاريع | دالة حساب clRecalcContractValue | renderer/modules/clients/change-orders.js:12 |
| LEG-0154 | calc | العملاء والمشاريع | دالة حساب clGuaranteeTotalsHtml | renderer/modules/clients/guarantees.js:122 |
| LEG-0175 | calc | الموارد البشرية | دالة حساب ensureCostItemPool | renderer/modules/hr/pages-costs.js:12 |
| LEG-0176 | calc | الموارد البشرية | دالة حساب costLines | renderer/modules/hr/pages-costs.js:21 |
| LEG-0177 | calc | الموارد البشرية | دالة حساب costItemText | renderer/modules/hr/pages-costs.js:26 |
| LEG-0178 | calc | الموارد البشرية | دالة حساب costItemSuggestions | renderer/modules/hr/pages-costs.js:31 |
| LEG-0179 | calc | الموارد البشرية | دالة حساب saveCostItemSuggestion | renderer/modules/hr/pages-costs.js:40 |
| LEG-0180 | calc | الموارد البشرية | دالة حساب removeCostItemSuggestion | renderer/modules/hr/pages-costs.js:46 |
| LEG-0181 | calc | الموارد البشرية | دالة حساب renameCostItemSuggestion | renderer/modules/hr/pages-costs.js:51 |
| LEG-0182 | calc | الموارد البشرية | دالة حساب filteredCosts | renderer/modules/hr/pages-costs.js:65 |
| LEG-0183 | calc | الموارد البشرية | دالة حساب costPersonBalance | renderer/modules/hr/pages-costs.js:82 |
| LEG-0184 | calc | الموارد البشرية | دالة حساب costItemsUsed | renderer/modules/hr/pages-costs.js:92 |
| LEG-0185 | calc | الموارد البشرية | دالة حساب costSectionsFor | renderer/modules/hr/pages-costs.js:403 |
| LEG-0186 | calc | الموارد البشرية | دالة حساب costTabIdForKind | renderer/modules/hr/pages-costs.js:408 |
| LEG-0187 | data-write | الموارد البشرية | كتابة بيانات saveCostItemSuggestion | renderer/modules/hr/pages-costs.js |
| LEG-0188 | data-write | الموارد البشرية | كتابة بيانات removeCostItemSuggestion | renderer/modules/hr/pages-costs.js |
| LEG-0197 | calc | الموارد البشرية | دالة حساب calcLeaveDays | renderer/modules/hr/pages-leaves.js:32 |
| LEG-0208 | data-write | الموارد البشرية | كتابة بيانات saveExpenseItemSuggestion | renderer/modules/hr/pages-ops.js |
| LEG-0209 | data-write | الموارد البشرية | كتابة بيانات removeExpenseItemSuggestion | renderer/modules/hr/pages-ops.js |
| LEG-0210 | data-write | الموارد البشرية | كتابة بيانات saveVehicleExpenseItem | renderer/modules/hr/pages-ops.js |
| LEG-0215 | calc | الموارد البشرية | دالة حساب repDuesFull | renderer/modules/hr/pages-reports.js:365 |
| LEG-0226 | calc | الموارد البشرية | دالة حساب duesEntityKind | renderer/modules/hr/pages-worker-dues.js:12 |
| LEG-0227 | calc | الموارد البشرية | دالة حساب duesListForKind | renderer/modules/hr/pages-worker-dues.js:17 |
| LEG-0243 | calc | الموردون | دالة حساب fixInvoiceCalculations | renderer/modules/ledger/helpers.js:169 |
| LEG-0247 | calc | الموردون | دالة حساب getInvoiceDueDate | renderer/modules/ledger/helpers.js:720 |
| LEG-0248 | calc | الموردون | دالة حساب getOverdueInvoices | renderer/modules/ledger/helpers.js:734 |
| LEG-0250 | calc | الموردون | دالة حساب maybeShowOverdueAlert | renderer/modules/ledger/helpers.js:2031 |
| LEG-0251 | calc | الموردون | دالة حساب pfSummaryHtml | renderer/modules/ledger/helpers.js:2265 |
| LEG-0255 | data-write | الموردون | كتابة بيانات addDaysToIsoDate | renderer/modules/ledger/helpers.js |
| LEG-0256 | data-write | الموردون | كتابة بيانات saveCustomLinkedItem | renderer/modules/ledger/helpers.js |
| LEG-0257 | data-write | الموردون | كتابة بيانات deleteCustomLinkedItem | renderer/modules/ledger/helpers.js |
| LEG-0269 | data-write | الموردون | كتابة بيانات saveInvoiceData | renderer/modules/ledger/modals.js |
| LEG-0271 | calc | الموردون | دالة حساب archSummary | renderer/modules/ledger/pages-archive.js:138 |
| LEG-0281 | permission | الإعدادات | مصفوفة صلاحيات الصفحات (عرض/إضافة/تعديل/حذف لكل صفحة) | renderer/core/permissions.js |
| LEG-0300 | electron-capability | ديسكتوب | قدرة ديسكتوب backupNow | preload.js (backup:runNow) |
| LEG-0301 | electron-capability | ديسكتوب | قدرة ديسكتوب cleanupOrphans | preload.js (storage:cleanupOrphans) |
| LEG-0303 | electron-capability | ديسكتوب | قدرة ديسكتوب deleteAttachment | preload.js (attachment:delete) |
| LEG-0306 | electron-capability | ديسكتوب | قدرة ديسكتوب getAppVersion | preload.js (app:getVersion) |
| LEG-0314 | electron-capability | ديسكتوب | قدرة ديسكتوب loadData | preload.js (data:load) |
| LEG-0323 | electron-capability | ديسكتوب | قدرة ديسكتوب readAttachmentDataUrl | preload.js (attachment:readDataUrl) |
| LEG-0326 | electron-capability | ديسكتوب | قدرة ديسكتوب safetyBackup (مستخدمة ومش معرّفة في preload) | renderer/ (من غير تعريف) |
| LEG-0327 | electron-capability | ديسكتوب | قدرة ديسكتوب saveAttachmentBuffer | preload.js (attachment:saveBuffer) |
| LEG-0329 | electron-capability | ديسكتوب | قدرة ديسكتوب saveDataSync | preload.js (data:saveSync) |
| LEG-0333 | electron-capability | ديسكتوب | قدرة ديسكتوب scanAttachment (مستخدمة ومش معرّفة في preload) | renderer/ (من غير تعريف) |
| LEG-0334 | electron-capability | ديسكتوب | قدرة ديسكتوب scanWindows | preload.js (scan:windows) |
| LEG-0339 | electron-capability | ديسكتوب | قدرة ديسكتوب snapshotData | preload.js (data:snapshot) |

## 4. المتطلبات الفنية والجديدة والتغييرات المعتمدة
| ID | العنصر | الحالة | الدليل/الملاحظة |
|---|---|---|---|
| CHG-0001 | المبالغ: NUMERIC بأربع خانات، والحساب على الخادم، وممنوع JS `Number` (ADR-011، ADR-023) | Approved — مختبر كمواصفة (phase62، target.js) | TR-01، F-03، F-14 |
| CHG-0002 | إلغاء الفاتورة: قرار صريح (`cancelledByUser`)، والأثر المالي = صفر، والسجل محفوظ ويظهر في الكشف «ملغاة» بقيمة صفر. ممنوع الحذف (ADR-024) | Approved — مختبر كمواصفة (phase62، target.js) | TR-02، F-01، F-02 |
| CHG-0003 | المرتجع: حركة مستقلة لازم تكون مربوطة بفاتورتها الأصلية (`linkedInvoiceId`). المرتجع الكامل مش إلغاء: الفاتورة بتفضل قائمة والمرتجع بيعادلها (تفسير B-75 محتاج  | Approved — مختبر كمواصفة (phase62، target.js) | TR-03، F-01، F-02، F-05 |
| CHG-0004 | الرصيد = الكشف: رصيد المورد وكشف حسابه بيتبنوا من نفس الحركات، فختامي الكشف = الرصيد دايمًا | Approved — مختبر كمواصفة (phase62، target.js) | TR-04، F-01، F-02 |
| CHG-0005 | اتجاه الدفعة: `pay` = الشركة سددت للمورد (بيقلّل اللي علينا). `collect` = الشركة حصّلت من المورد (بيزوّد اللي علينا أو بيقلّل اللي لينا). الدفعة من غير اتجاه = غير  | Approved — مختبر كمواصفة (phase62، target.js) | TR-05، F-06 |
| CHG-0006 | تخصيص الدفعات: `allocations[{invoiceId, amount}]`: الدفعة ممكن تتخصّص جزئيًا أو تتوزع على كذا فاتورة. متبقي الفاتورة = الصافي − مرتجعاتها المرتبطة − المخصّص ليها (تف | Approved — مختبر كمواصفة (phase62، target.js) | TR-06، F-04 |
| CHG-0007 | أجر الحضور: معامل صريح لكل حالة من إعداد معتمد. الحالات القياسية (B-76): حاضر 1، ونصف يوم ½، ومتأخر 1 ناقص الخصم المسجّل، وغائب وعطلة 0. أي حالة تانية (إجازة سنوي | Approved — مختبر كمواصفة (phase62، target.js) | TR-07، F-07 |
| CHG-0008 | التكرار والسجلات اليتيمة: مكرر = نفس الشخص + نفس اليوم + نفس المشروع. ونفس الشخص في نفس اليوم على مشروع تاني = يومية مشروعة. المكرر واليومية لشخص مش موجود بيتعزلوا للمراجعة (ما | Approved — مختبر كمواصفة (phase62، target.js) | TR-08، F-08 |
| CHG-0009 | الراتب الجزئي: بالتناسب مع أيام الاستحقاق، بطريقة سياسة الرواتب (B-74). من غير سياسة الحساب بيرفض (`POLICY_REQUIRED`) | Approved — مختبر كمواصفة (phase62، target.js) | TR-09، F-09 |
| CHG-0010 | تكلفة المشروع: المصروفات الفعلية (كل سطورها) + الفواتير بـ الصافي بعد الخصم، والمرتجع بالسالب، والملغاة صفر، والصرف المخزني بتكلفته المثبّتة. معاملة ضريبة القيمة الم | Approved — مختبر كمواصفة (phase62، target.js) | TR-10، F-10، F-11 |
| CHG-0011 | المستخلصات: تراكمي: الإجمالي التراكمي = الأعمال السابقة + الحالية (+ الإضافات − المستبعد). الصافي التراكمي = التراكمي − المحتجز − الاستقطاعات. مستحق الفترة = الصا | Approved — مختبر كمواصفة (phase62، target.js) | TR-11، F-12 |
| CHG-0012 | التقريب: HALF_UP للموجب والسالب: 2.00005 ← 2.0001، و−2.00005 ← −2.0001 | Approved — مختبر كمواصفة (phase62، target.js) | TR-12، F-03، F-14 |
| CHG-0013 | تكلفة المخزون: متوسط متحرك. تكلفة الصرف بتتثبّت على الحركة وقت الصرف ومابتتعادش. الحركات القديمة اللي مالهاش تكلفة: اقتراح بالمتوسط وقتها للمراجعة | Approved — مختبر كمواصفة (phase62، target.js) | TR-13، F-15 |
| CHG-0014 | الإجازات: الرصيد من سجلات الموظف المعتمدة (`employeeId`، أو `personId` لنوع موظف). السنين القديمة محفوظة، ومفيش مسح | Approved — مختبر كمواصفة (phase62، target.js) | TR-14، F-13 |
| NEW-0001 | محرك اعتمادات متعدد المستويات (B-01…B-08) | Implemented | بيانات اختبار؛ مش متفعّل |
| NEW-0002 | محرك الضرايب والاستقطاعات والدمغات (B-21) | Implemented | من غير نسب (Policy C) |
| NEW-0003 | محرك القواعد المالية (B-20): معادلات بإصدارات واختبارات إلزامية | Implemented | مسودات |
| NEW-0004 | إشعارات مخزّنة | Implemented |  |
| NEW-0005 | المشتريات (طلب ← عرض ← أمر شراء ← استلام) | Not Started |  |
| NEW-0006 | السلامة والمخاطر | Not Started |  |
| NEW-0007 | الجودة والاستلام | Not Started |  |
| NEW-0008 | المحاسبة بالقيد المزدوج (دليل حسابات، قيود، أستاذ، ميزان، إقفال) | Not Started | المرحلة 10 |
| NEW-0009 | تطبيق ويب قابل للتثبيت (PWA) | Partially Implemented | الأساس |
| TECH-0001 | XSS | Verified | المرحلة 2 القديمة + إعادة التحقق في المراحل 1 و2 v1.4.5 |
| TECH-0002 | CSP وترويسات الأمان | Partially Implemented | CSP فيها unsafe-inline (R-26) |
| TECH-0003 | Nginx + HTTPS داخلي | Verified | المرحلة 2 القديمة + إعادة التحقق في المراحل 1 و2 v1.4.5 |
| TECH-0004 | مراجعة Authentication/RBAC/Data Scope | Verified | المرحلة 2 القديمة + إعادة التحقق في المراحل 1 و2 v1.4.5 |
| TECH-0005 | تأمين رفع الملفات (الهيكل الأمني فقط؛ الموديول كاملًا في المرحلة 5) | Verified | المرحلة 2 القديمة + إعادة التحقق في المراحل 1 و2 v1.4.5 |
| TECH-0006 | سجل التدقيق | Verified | المرحلة 2 القديمة + إعادة التحقق في المراحل 1 و2 v1.4.5 |
| TECH-0007 | Backup & Restore | Verified | المرحلة 2 القديمة + إعادة التحقق في المراحل 1 و2 v1.4.5 |
| TECH-0008 | تحديث `xlsx` + 2FA للإدارة | Verified | 2FA + xlsx 0.20.3 (المرحلة 3 القديمة) |
| TECH-0009 | الحساب العشري: NUMERIC بأربع خانات وHALF_UP على الخادم (Money) | Verified | money.spec + money.e2e (مطابقة PostgreSQL على 30,008 قيمة) |
| TECH-0010 | ترقيم NO_GAPS داخل معاملة الخادم، والرقم المُصدر مابيتعادش حتى مع الإلغاء | Verified | server e2e (المرحلة 5)؛ النطاق والشكل B-29 مفتوح |
| TECH-0011 | Approved ≠ Posted، والمرحّل مابيتعدّلش (التصحيح بمستند عكسي) | Verified | محرك الاعتمادات + B-51 (المرحلة 5، 6.2) |
| TECH-0012 | Idempotency-Key للعمليات الحساسة | Verified | server e2e (المرحلة 5) |
| TECH-0013 | سجل تدقيق إلحاقي محمي على مستوى القاعدة + القيمة السابقة | Verified | audit.e2e + بيئة معزولة (المرحلة 2) |
| TECH-0014 | نسخ واستعادة: RPO 15 دقيقة، RTO 4 ساعات، نسخة مشفّرة خارجية، اختبار شهري | Verified | إثبات على نسخة البيانات الحقيقية (المرحلة 2 v1.4.5) |
| TECH-0015 | الخادم المرجع الوحيد للصلاحيات (صفحة + فعل + نطاق مشروع) | Partially Implemented | matrix.e2e؛ نطاقات B-35 لسه |
| TECH-0016 | المرفقات جوه PostgreSQL مع الفحص والإصدارات (والبديل المعتمد: نظام الملفات + بيانات وصفية) | Partially Implemented | attachments.e2e؛ PDF المشفّر B-78 لسه |
| TECH-0017 | تشغيل آلي للبناء والاختبارات (CI) | Not Started | — |
| TECH-0018 | مقارنة بصرية آلية مع خط الأساس | Partially Implemented | خط الأساس موجود (المرحلة 3)؛ المقارنة الآلية لسه |

## 5. المصفوفة الكاملة (LEG)
| ID | النوع | الموديول | العنصر | النظام القديم | المستهدف | الاختبارات | الحالة | قرارات بتمنعه |
|---|---|---|---|---|---|---|---|---|
| LEG-0001 | page | مركز المتابعة | صفحة «مركز المتابعة» (dashboard) | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase16.js، phase20.js، phase38.js، phase61.js، phase14.js، phase27.js (+2) | Verified (باختبار) | — |
| LEG-0002 | page | مهامي | صفحة «مهامي» (tasks.my) | renderer/modules/clients/pages-tasks.js:38 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0003 | page | الموارد البشرية | صفحة «لوحات الموارد البشرية» (hrHome) | renderer/core/boards.js:172 | legacy /legacy/ | phase22.js، app-e2e.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0004 | page | الموارد البشرية | صفحة «الموظفين» (employees) | renderer/modules/hr/pages-employees.js:77 | legacy /legacy/ | phase22.js، phase26.js، phase27.js، phase28.js، phase29.js، phase30.js (+30) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0005 | page | الموارد البشرية | صفحة «المشرفون» (supervisors) | renderer/modules/hr/pages-supervisors.js:12 | legacy /legacy/ | phase27.js، phase42.js، phase43.js، phase49.js، phase50.js، phase53.js (+13) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0006 | page | الموارد البشرية | صفحة «العمال» (workers) | renderer/modules/hr/pages-workers.js:29 | legacy /legacy/ | phase24.js، phase26.js، phase27.js، phase28.js، phase29.js، phase30.js (+27) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0007 | page | الموارد البشرية | صفحة «السائقون» (drivers) | renderer/modules/hr/pages-ops.js:6 | legacy /legacy/ | phase27.js، phase42.js، phase44.js، phase45.js، phase49.js، phase50.js (+8) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0008 | page | الموارد البشرية | صفحة «معدات ومركبات» (equipment) | renderer/modules/hr/pages-equipment.js:32 | legacy /legacy/ | phase23.js، phase24.js، phase25.js، phase26.js، phase27.js، phase31.js (+14) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0009 | page | الموارد البشرية | صفحة «حضور الموظفين» (attendance) | renderer/modules/hr/pages-attendance.js:19 | legacy /legacy/ | phase61.js، phase59.js، legacy-runner.js، reference.js، target-diff.js، data.e2e-spec.ts | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0010 | page | الموارد البشرية | صفحة «اليوميات» (workerAttendance) | renderer/modules/hr/pages-worker-attendance.js:195 | legacy /legacy/ | phase24.js، phase26.js، phase27.js، phase28.js، phase39.js، phase40.js (+15) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0011 | page | الموارد البشرية | صفحة «الإجازات» (leaves) | renderer/modules/hr/pages-leaves.js:48 | legacy /legacy/ | phase41.js، phase13.js، phase30.js، phase31.js، phase33.js، phase36.js (+5) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0012 | page | الموارد البشرية | صفحة «تقييم الأداء» (performance) | renderer/modules/hr/pages-ops.js:540 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0013 | page | العملاء والمشاريع | صفحة «العملاء» (clients.customers) | renderer/modules/clients/pages-customers.js:14 | angular /customers | phase2.js، phase5.js، phase7.js، phase15.js، phase19.js، phase46.js (+7) | Implemented (اتنقل) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0014 | page | العملاء والمشاريع | صفحة «المشاريع» (projects) | renderer/modules/hr/pages-projects.js:60 | angular /projects | phase2.js، phase3.js، phase4.js، phase15.js، phase17.js، phase18.js (+41) | Implemented (اتنقل) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0015 | page | العملاء والمشاريع | صفحة «أعمال الحصر» (clients.workSurveys) | renderer/modules/clients/pages-work-surveys.js:74 | legacy /legacy/ | phase9.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0016 | page | العملاء والمشاريع | صفحة «المقايسات» (clients.boqs) | renderer/modules/clients/pages-boqs.js:45 | legacy /legacy/ | phase2.js، phase9.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0017 | page | العملاء والمشاريع | صفحة «العقود» (clients.contracts) | renderer/modules/clients/pages-contracts.js:28 | legacy /legacy/ | phase5.js، phase7.js، phase12.js، phase14.js، phase15.js، data.e2e-spec.ts | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0018 | page | العملاء والمشاريع | صفحة «المستخلصات» (clients.invoices) | renderer/modules/clients/pages-invoices.js:42 | legacy /legacy/ | phase9.js، phase12.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0019 | page | العملاء والمشاريع | صفحة «الضمانات» (clients.guarantees) | renderer/modules/clients/guarantees.js:176 | legacy /legacy/ | phase5.js، phase6.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0020 | page | العملاء والمشاريع | صفحة «المقارنة» (clients.comparison) | renderer/modules/clients/comparison.js:62 | legacy /legacy/ | phase11.js، phase12.js، phase14.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0021 | page | العملاء والمشاريع | صفحة «CRM» (clients.crm) | renderer/modules/clients/pages-crm.js:40 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0022 | page | الموردون | صفحة «الموردون» (ledger.suppliers) | renderer/modules/ledger/pages-suppliers.js:3 | angular /suppliers | phase60.js، phase61.js، phase16.js، phase17.js، phase21.js، app-e2e.js (+4) | Implemented (اتنقل) | DEC-0029 (B-29) |
| LEG-0023 | page | الموردون | صفحة «الفواتير» (ledger.invoices) | renderer/modules/ledger/pages-invoices.js:35 | legacy /legacy/ | phase16.js، phase17.js، phase21.js، phase62.js، app-e2e.js، attachments.e2e-spec.ts (+5) | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0024 | page | الموردون | صفحة «إشعارات الخصم» (ledger.quarterly) | renderer/modules/ledger/pages-quarterly.js:39 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0025 | page | الموردون | صفحة «المرتجعات» (ledger.returns) | renderer/modules/ledger/pages-invoices.js:35 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0026 | page | المخازن | صفحة «المخازن» (warehouses.home) | renderer/modules/warehouses/pages-home.js:6 | angular /warehouses | phase61.js، phase66.js، app-e2e.js، stock-adjustments.e2e-spec.ts | Implemented (اتنقل) | DEC-0077 (B-77) |
| LEG-0027 | page | المخازن | صفحة «تقارير المخازن» (warehouses.reports) | renderer/modules/warehouses/pages-reports.js:2 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0028 | page | حركة الموارد | صفحة «حركة الموارد» (transfers) | renderer/modules/hr/pages-ops.js:336 | legacy /legacy/ | phase61.js، phase65.js، app-e2e.js، stock.e2e-spec.ts، warehouses.e2e-spec.ts | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0029 | page | الحسابات | صفحة «المستحقات» (workerDues) | renderer/modules/hr/pages-worker-dues.js:79 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0013 (B-13)، DEC-0014 (B-14)، DEC-0015 (B-15)، DEC-0016 (B-16)، DEC-0027 (B-27) |
| LEG-0030 | page | الحسابات | صفحة «الدفعات» (ledger.payments) | renderer/modules/ledger/pages-payments.js:33 | legacy /legacy/ | phase61.js، phase21.js، parties.e2e-spec.ts | Verified (باختبار) | DEC-0013 (B-13)، DEC-0014 (B-14)، DEC-0015 (B-15)، DEC-0016 (B-16)، DEC-0027 (B-27) |
| LEG-0031 | page | الحسابات | صفحة «مصاريف شاملة» (expenses) | renderer/modules/hr/pages-ops.js:1244 | legacy /legacy/ | phase17.js، phase26.js، phase53.js، phase59.js، phase18.js، phase19.js (+7) | Verified (باختبار) | DEC-0013 (B-13)، DEC-0014 (B-14)، DEC-0015 (B-15)، DEC-0016 (B-16)، DEC-0027 (B-27) |
| LEG-0032 | page | الحسابات | صفحة «تكاليف شاملة» (costs) | renderer/modules/hr/pages-costs.js:98 | legacy /legacy/ | phase17.js، phase59.js، phase18.js، web-e2e.js، legacy-runner.js، reference.js (+1) | Verified (باختبار) | DEC-0013 (B-13)، DEC-0014 (B-14)، DEC-0015 (B-15)، DEC-0016 (B-16)، DEC-0027 (B-27) |
| LEG-0033 | page | الحسابات | صفحة «الإيرادات» (clients.collections) | renderer/modules/clients/pages-collections.js:28 | legacy /legacy/ | phase13.js، phase20.js | Verified (باختبار) | DEC-0013 (B-13)، DEC-0014 (B-14)، DEC-0015 (B-15)، DEC-0016 (B-16)، DEC-0027 (B-27) |
| LEG-0034 | page | الحسابات | صفحة «حسابات العملاء» (clients.accounts) | renderer/modules/clients/pages-accounts.js:73 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0013 (B-13)، DEC-0014 (B-14)، DEC-0015 (B-15)، DEC-0016 (B-16)، DEC-0027 (B-27) |
| LEG-0035 | page | التقارير | صفحة «تقارير الموارد البشرية» (reports) | renderer/modules/hr/pages-reports.js:56 | legacy /legacy/ | phase22.js، phase61.js، foundation.e2e-spec.ts، parties.e2e-spec.ts، security.e2e-spec.ts | Verified (باختبار) | — |
| LEG-0036 | page | التقارير | صفحة «تقارير العملاء والمشاريع» (clients.reports) | renderer/modules/clients/pages-reports.js:4 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0037 | page | التقارير | صفحة «تقارير الموردين» (ledger.reports) | renderer/modules/ledger/pages-reports.js:25 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0038 | page | التقارير | صفحة «تقارير الحسابات» (accounts.reports) | renderer/modules/accounts/pages-reports.js:2 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0039 | page | الأرشيف | صفحة «أرشيف الموارد البشرية» (archive) | renderer/core/pages-archive.js:54 | legacy /legacy/ | phase22.js، phase61.js، phase14.js، phase3.js، phase8.js | Verified (باختبار) | DEC-0061 (B-61) |
| LEG-0040 | page | الأرشيف | صفحة «أرشيف الموردين» (ledger.archive) | renderer/modules/ledger/pages-archive.js:215 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0061 (B-61) |
| LEG-0041 | page | الأرشيف | صفحة «أرشيف العملاء والمشاريع» (clients.archive) | renderer/modules/clients/pages-archive.js:36 | legacy /legacy/ | phase8.js | Verified (باختبار) | DEC-0061 (B-61) |
| LEG-0042 | page | الإعدادات | صفحة «الإعدادات العامة» (backup) | renderer/core/pages-backup.js:5 | legacy /legacy/ | phase10.js، phase29.js، phase32.js، phase34.js، phase35.js، phase36.js (+3) | Verified (باختبار) | DEC-0035 (B-35) |
| LEG-0043 | page | الإعدادات | صفحة «المستخدمون» (users) | renderer/core/pages-users.js:16 | legacy /legacy/ | phase61.js، pages-smoke.js، phase10.js، phase11.js، phase12.js، phase13.js (+75) | Verified (باختبار) | DEC-0035 (B-35) |
| LEG-0044 | page | الإعدادات | صفحة «الاقتراحات» (ledger.categories) | renderer/modules/ledger/pages-categories.js:4 | legacy /legacy/ | phase61.js | Verified (باختبار) | DEC-0035 (B-35) |
| LEG-0045 | page | (خارج القايمة) | صفحة «clients.dashboard» (clients.dashboard) — اسم بديل لـ dashboard | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase20.js | Verified (باختبار) | — |
| LEG-0046 | page | (خارج القايمة) | صفحة «fuel» (fuel) — اسم بديل لـ equipment | renderer/modules/hr/pages-equipment.js:32 | legacy /legacy/ | phase61.js، phase18.js، phase26.js، legacy-runner.js، reference.js | Verified (باختبار) | — |
| LEG-0047 | page | (خارج القايمة) | صفحة «documents» (documents) — اسم بديل لـ archive | renderer/core/pages-archive.js:54 | legacy /legacy/ | phase61.js، data.e2e-spec.ts، formulas.e2e-spec.ts، foundation.e2e-spec.ts، openapi.e2e-spec.ts، taxes.e2e-spec.ts (+1) | Verified (باختبار) | — |
| LEG-0048 | page | (خارج القايمة) | صفحة «assistant» (assistant) — اسم بديل لـ dashboard | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0049 | page | (خارج القايمة) | صفحة «departments» (departments) | renderer/core/boards.js:172 | legacy /legacy/ | phase22.js، phase39.js، phase21.js، phase23.js، phase24.js، phase25.js (+8) | Verified (باختبار) | — |
| LEG-0050 | page | (خارج القايمة) | صفحة «payroll» (payroll) — اسم بديل لـ workerDues | renderer/modules/hr/pages-worker-dues.js:79 | legacy /legacy/ | phase61.js، phase59.js، web-e2e.js، reference.js، data.e2e-spec.ts، foundation.e2e-spec.ts (+2) | Verified (باختبار) | — |
| LEG-0051 | page | (خارج القايمة) | صفحة «employeeDetail» (employeeDetail) | renderer/modules/hr/pages-employee-detail.js:1 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0052 | page | (خارج القايمة) | صفحة «personDetail» (personDetail) | renderer/modules/hr/pages-person-detail.js:238 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0053 | page | (خارج القايمة) | صفحة «ledger.dashboard» (ledger.dashboard) — اسم بديل لـ dashboard | renderer/modules/ledger/glue.js:41 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0054 | page | (خارج القايمة) | صفحة «general.overview» (general.overview) — اسم بديل لـ dashboard | renderer/modules/hr/pages-dashboard.js:28 | legacy /legacy/ | phase61.js | Verified (باختبار) | — |
| LEG-0055 | calc | مشترك (core) | دالة حساب compCostProjectNames | renderer/core/cost-center.js:15 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0056 | calc | مشترك (core) | دالة حساب compCostCollected | renderer/core/cost-center.js:26 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0057 | calc | مشترك (core) | دالة حساب compCostRows | renderer/core/cost-center.js:32 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0058 | calc | مشترك (core) | دالة حساب comprehensiveCostsPageHtml | renderer/core/cost-center.js:41 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0059 | calc | مشترك (core) | دالة حساب comprehensiveCostsBoardCard | renderer/core/cost-center.js:78 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0060 | data-write | مشترك (core) | كتابة بيانات saveData | renderer/core/data-store.js | legacy | phase2.js، phase3.js، phase60.js، web-e2e.js | Verified (باختبار) | — |
| LEG-0061 | modal | مشترك (core) | نافذة openExcelImportModal | renderer/core/excel-import.js:260 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0062 | data-write | مشترك (core) | كتابة بيانات approveExpense | renderer/core/extras.js | legacy | phase19.js | Verified (باختبار) | — |
| LEG-0063 | calc | مشترك (core) | دالة حساب fcCostDetailHtml | renderer/core/follow-center.js:202 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0064 | modal | مشترك (core) | نافذة openModal | renderer/core/helpers.js:472 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0065 | modal | مشترك (core) | نافذة openSubModal | renderer/core/helpers.js:614 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0066 | modal | مشترك (core) | نافذة openPersonDetailModal | renderer/core/helpers.js:2956 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0067 | modal | مشترك (core) | نافذة openPersonAlertsModal | renderer/core/helpers.js:3259 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0068 | modal | مشترك (core) | نافذة openAlertsMoreModal | renderer/core/helpers.js:3310 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0069 | modal | مشترك (core) | نافذة openAddCategoryModal | renderer/core/helpers.js:3793 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0070 | modal | مشترك (core) | نافذة openRenameCategoryModal | renderer/core/helpers.js:3818 | legacy | phase34.js | Verified (باختبار) | — |
| LEG-0071 | modal | مشترك (core) | نافذة openDeleteCategoryModal | renderer/core/helpers.js:3857 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0072 | calc | مشترك (core) | دالة حساب employeeLeaveBalance | renderer/core/helpers.js:201 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0073 | calc | مشترك (core) | دالة حساب attendanceDayWage | renderer/core/helpers.js:260 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0074 | calc | مشترك (core) | دالة حساب workerDueAmount | renderer/core/helpers.js:343 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0075 | calc | مشترك (core) | دالة حساب workerWageSummary | renderer/core/helpers.js:349 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0076 | calc | مشترك (core) | دالة حساب extraFieldsSummary | renderer/core/helpers.js:1055 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0077 | calc | مشترك (core) | دالة حساب supervisorExpensesTotal | renderer/core/helpers.js:2095 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0078 | calc | مشترك (core) | دالة حساب supervisorWageStatement | renderer/core/helpers.js:2119 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0079 | calc | مشترك (core) | دالة حساب personUnpaidBonuses | renderer/core/helpers.js:4134 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0080 | calc | مشترك (core) | دالة حساب workerPaidTotal | renderer/core/helpers.js:4156 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0081 | calc | مشترك (core) | دالة حساب workerPenaltyTotal | renderer/core/helpers.js:4166 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0082 | calc | مشترك (core) | دالة حساب supervisorPenaltyTotal | renderer/core/helpers.js:4175 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0083 | calc | مشترك (core) | دالة حساب supervisorPaidTotal | renderer/core/helpers.js:4184 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0084 | calc | مشترك (core) | دالة حساب workerBalance | renderer/core/helpers.js:4193 | legacy | phase61.js، legacy-runner.js | Verified (باختبار) | — |
| LEG-0085 | calc | مشترك (core) | دالة حساب employeePenaltyTotal | renderer/core/helpers.js:4200 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0086 | calc | مشترك (core) | دالة حساب driverDueAmount | renderer/core/helpers.js:4989 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0087 | calc | مشترك (core) | دالة حساب driverPaidTotal | renderer/core/helpers.js:4993 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0088 | calc | مشترك (core) | دالة حساب driverPenaltyTotal | renderer/core/helpers.js:5002 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0089 | calc | مشترك (core) | دالة حساب employeeDueAmount | renderer/core/helpers.js:5024 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0090 | calc | مشترك (core) | دالة حساب employeeBalance | renderer/core/helpers.js:5056 | legacy | legacy-runner.js، reference.js | Verified (باختبار) | — |
| LEG-0091 | calc | مشترك (core) | دالة حساب driverBalance | renderer/core/helpers.js:5071 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0092 | calc | مشترك (core) | دالة حساب extraCalcChecks | renderer/core/helpers.js:5081 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0093 | calc | مشترك (core) | دالة حساب validateCalculations | renderer/core/helpers.js:5146 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0094 | calc | مشترك (core) | دالة حساب paginateTotalsAtEnd | renderer/core/helpers.js:5924 | legacy | phase54.js | Verified (باختبار) | — |
| LEG-0095 | calc | مشترك (core) | دالة حساب statementHeaderHtml | renderer/core/helpers.js:6420 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0096 | calc | مشترك (core) | دالة حساب statementFooterHtml | renderer/core/helpers.js:6442 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0097 | calc | مشترك (core) | دالة حساب shouldBrandStatement | renderer/core/helpers.js:6459 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0098 | calc | مشترك (core) | دالة حساب personExpensesTotal | renderer/core/helpers.js:6469 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0099 | calc | مشترك (core) | دالة حساب costKindLabel | renderer/core/helpers.js:6483 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0100 | calc | مشترك (core) | دالة حساب costPersonName | renderer/core/helpers.js:6484 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0101 | calc | مشترك (core) | دالة حساب costsInRange | renderer/core/helpers.js:6498 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0102 | calc | مشترك (core) | دالة حساب personCostsTotal | renderer/core/helpers.js:6506 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0103 | calc | مشترك (core) | دالة حساب costsTableHtml | renderer/core/helpers.js:6510 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0104 | calc | مشترك (core) | دالة حساب costsStatementBlock | renderer/core/helpers.js:6520 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0105 | calc | مشترك (core) | دالة حساب personExtrasTotal | renderer/core/helpers.js:6525 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0106 | calc | مشترك (core) | دالة حساب duesPaidBadge | renderer/core/helpers.js:6547 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0107 | calc | مشترك (core) | دالة حساب expensesStatementBlock | renderer/core/helpers.js:6635 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0108 | calc | مشترك (core) | دالة حساب printEquipmentAccountStatement | renderer/core/helpers.js:6697 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0109 | calc | مشترك (core) | دالة حساب paymentsStatementBlock | renderer/core/helpers.js:6764 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0110 | calc | مشترك (core) | دالة حساب printWorkerStatement | renderer/core/helpers.js:7107 | legacy | phase24.js | Verified (باختبار) | — |
| LEG-0111 | calc | مشترك (core) | دالة حساب printDriverStatement | renderer/core/helpers.js:7157 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0112 | calc | مشترك (core) | دالة حساب _payTotalCard | renderer/core/helpers.js:7259 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0113 | calc | مشترك (core) | دالة حساب printDaysStatement | renderer/core/helpers.js:7458 | legacy | phase26.js | Verified (باختبار) | — |
| LEG-0114 | calc | مشترك (core) | دالة حساب printEmployeeStatement | renderer/core/helpers.js:7544 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0115 | calc | مشترك (core) | دالة حساب equipmentTotalHours | renderer/core/helpers.js:7801 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0116 | calc | مشترك (core) | دالة حساب equipmentTotalCost | renderer/core/helpers.js:7804 | legacy | legacy-runner.js | Verified (باختبار) | — |
| LEG-0117 | calc | مشترك (core) | دالة حساب equipmentTotalFuel | renderer/core/helpers.js:7808 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0118 | calc | مشترك (core) | دالة حساب projectCostSummary | renderer/core/helpers.js:7816 | legacy | phase17.js، legacy-runner.js | Verified (باختبار) | — |
| LEG-0119 | calc | مشترك (core) | دالة حساب projectSupplyCostLines | renderer/core/helpers.js:7894 | legacy | phase17.js | Verified (باختبار) | — |
| LEG-0120 | export/print | مشترك (core) | تصدير/طباعة downloadXlsx | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0121 | export/print | مشترك (core) | تصدير/طباعة downloadCsv | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0122 | export/print | مشترك (core) | تصدير/طباعة printAttachmentPdf | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0123 | export/print | مشترك (core) | تصدير/طباعة printHtml | renderer/core/helpers.js | legacy | phase14.js، phase24.js، phase25.js، phase26.js، phase41.js، phase43.js (+1) | Verified (باختبار) | — |
| LEG-0124 | export/print | مشترك (core) | تصدير/طباعة exportArchiveFolder | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0125 | export/print | مشترك (core) | تصدير/طباعة printPersonFilePdf | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0126 | export/print | مشترك (core) | تصدير/طباعة printArchiveAllPdf | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0127 | export/print | مشترك (core) | تصدير/طباعة printExpenseRecord | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0128 | export/print | مشترك (core) | تصدير/طباعة exportExpenseExcel | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0129 | export/print | مشترك (core) | تصدير/طباعة printEquipmentAccountStatement | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0130 | export/print | مشترك (core) | تصدير/طباعة printWorkerStatement | renderer/core/helpers.js | legacy | phase24.js | Verified (باختبار) | — |
| LEG-0131 | export/print | مشترك (core) | تصدير/طباعة printDriverStatement | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0132 | export/print | مشترك (core) | تصدير/طباعة printDaysStatement | renderer/core/helpers.js | legacy | phase26.js | Verified (باختبار) | — |
| LEG-0133 | export/print | مشترك (core) | تصدير/طباعة printEmployeeStatement | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0134 | export/print | مشترك (core) | تصدير/طباعة printPayslip | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0135 | export/print | مشترك (core) | تصدير/طباعة printLeaveForm | renderer/core/helpers.js | legacy | phase41.js، phase43.js | Verified (باختبار) | — |
| LEG-0136 | data-write | مشترك (core) | كتابة بيانات addAudit | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0137 | data-write | مشترك (core) | كتابة بيانات deleteProjectById | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0138 | data-write | مشترك (core) | كتابة بيانات addExtraFieldRow | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0139 | data-write | مشترك (core) | كتابة بيانات updateBulkBar | renderer/core/helpers.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0140 | modal | مشترك (core) | نافذة openScanAttachModal | renderer/core/modals-common.js:9 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0141 | calc | مشترك (core) | دالة حساب activateHostMode | renderer/core/network.js:799 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0142 | calc | مشترك (core) | دالة حساب activateClientMode | renderer/core/network.js:820 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0143 | calc | مشترك (core) | دالة حساب deactivateNetworkMode | renderer/core/network.js:841 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0144 | data-write | مشترك (core) | كتابة بيانات saveDataNetwork | renderer/core/network.js | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0145 | calc | مشترك (core) | دالة حساب archiveTotalFilesForKind | renderer/core/pages-archive.js:44 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0146 | modal | مشترك (core) | نافذة openUserModal | renderer/core/pages-users.js:190 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0147 | calc | مشترك (core) | دالة حساب repAlertsSummaryTab | renderer/core/smart-tools.js:692 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0148 | calc | مشترك (core) | دالة حساب alertsSummaryExportData | renderer/core/smart-tools.js:726 | legacy |  | Verified (جرد ثابت بس) | — |
| LEG-0149 | modal | العملاء والمشاريع | نافذة openChangeOrderModal | renderer/modules/clients/change-orders.js:87 | legacy | phase7.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0150 | calc | العملاء والمشاريع | دالة حساب clRecalcContractValue | renderer/modules/clients/change-orders.js:12 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0151 | modal | العملاء والمشاريع | نافذة openGuaranteeModal | renderer/modules/clients/guarantees.js:231 | legacy | phase5.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0152 | modal | العملاء والمشاريع | نافذة openGuaranteeActionModal | renderer/modules/clients/guarantees.js:329 | legacy | phase5.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0153 | calc | العملاء والمشاريع | دالة حساب clGuaranteeTotals | renderer/modules/clients/guarantees.js:68 | legacy | phase5.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0154 | calc | العملاء والمشاريع | دالة حساب clGuaranteeTotalsHtml | renderer/modules/clients/guarantees.js:122 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0155 | calc | العملاء والمشاريع | دالة حساب clReconcilePaid | renderer/modules/clients/helpers.js:590 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0156 | calc | العملاء والمشاريع | دالة حساب clMigratePaidSource | renderer/modules/clients/helpers.js:600 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0157 | modal | العملاء والمشاريع | نافذة openBoqModal | renderer/modules/clients/pages-boqs.js:200 | legacy | phase14.js، phase2.js، phase8.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0158 | calc | العملاء والمشاريع | دالة حساب clCalcBoqItem | renderer/modules/clients/pages-boqs.js:10 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0159 | calc | العملاء والمشاريع | دالة حساب clBoqTotal | renderer/modules/clients/pages-boqs.js:17 | legacy | legacy-runner.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0160 | modal | العملاء والمشاريع | نافذة openCollectionModal | renderer/modules/clients/pages-collections.js:136 | legacy | pages-smoke.js، phase13.js، phase14.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0161 | modal | العملاء والمشاريع | نافذة openContractModal | renderer/modules/clients/pages-contracts.js:200 | legacy | phase10.js، phase12.js، phase14.js، phase7.js، phase8.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0162 | modal | العملاء والمشاريع | نافذة openOppModal | renderer/modules/clients/pages-crm.js:230 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0163 | modal | العملاء والمشاريع | نافذة openCommModal | renderer/modules/clients/pages-crm.js:289 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0164 | modal | العملاء والمشاريع | نافذة openCustomerModal | renderer/modules/clients/pages-customers.js:290 | legacy | pages-smoke.js، phase14.js، phase55.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0165 | modal | العملاء والمشاريع | نافذة openClientInvoiceModal | renderer/modules/clients/pages-invoices.js:220 | legacy | phase12.js، phase13.js، phase14.js، phase8.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0166 | modal | العملاء والمشاريع | نافذة openWorkSurveyModal | renderer/modules/clients/pages-work-surveys.js:324 | legacy | pages-smoke.js، phase10.js، phase14.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0167 | calc | العملاء والمشاريع | دالة حساب clCalcSurveyItem | renderer/modules/clients/pages-work-surveys.js:17 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0168 | calc | العملاء والمشاريع | دالة حساب clSurveyTotal | renderer/modules/clients/pages-work-surveys.js:41 | legacy | legacy-runner.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0169 | modal | العملاء والمشاريع | نافذة openReasonModal | renderer/modules/clients/project-path.js:265 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0170 | modal | العملاء والمشاريع | نافذة openStepModal | renderer/modules/clients/project-path.js:301 | legacy | phase3.js، phase56.js، phase57.js، phase58.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0171 | modal | العملاء والمشاريع | نافذة openPathHistoryModal | renderer/modules/clients/project-path.js:435 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0172 | modal | الموارد البشرية | نافذة openEmployeeModal | renderer/modules/hr/modals-employees.js:1 | legacy | phase23.js، phase35.js، phase36.js، phase44.js، phase47.js، phase49.js (+3) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0173 | modal | الموارد البشرية | نافذة openAttendanceModal | renderer/modules/hr/pages-attendance.js:121 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0174 | modal | الموارد البشرية | نافذة openCostModal | renderer/modules/hr/pages-costs.js:411 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0175 | calc | الموارد البشرية | دالة حساب ensureCostItemPool | renderer/modules/hr/pages-costs.js:12 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0176 | calc | الموارد البشرية | دالة حساب costLines | renderer/modules/hr/pages-costs.js:21 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0177 | calc | الموارد البشرية | دالة حساب costItemText | renderer/modules/hr/pages-costs.js:26 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0178 | calc | الموارد البشرية | دالة حساب costItemSuggestions | renderer/modules/hr/pages-costs.js:31 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0179 | calc | الموارد البشرية | دالة حساب saveCostItemSuggestion | renderer/modules/hr/pages-costs.js:40 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0180 | calc | الموارد البشرية | دالة حساب removeCostItemSuggestion | renderer/modules/hr/pages-costs.js:46 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0181 | calc | الموارد البشرية | دالة حساب renameCostItemSuggestion | renderer/modules/hr/pages-costs.js:51 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0182 | calc | الموارد البشرية | دالة حساب filteredCosts | renderer/modules/hr/pages-costs.js:65 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0183 | calc | الموارد البشرية | دالة حساب costPersonBalance | renderer/modules/hr/pages-costs.js:82 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0184 | calc | الموارد البشرية | دالة حساب costItemsUsed | renderer/modules/hr/pages-costs.js:92 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0185 | calc | الموارد البشرية | دالة حساب costSectionsFor | renderer/modules/hr/pages-costs.js:403 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0186 | calc | الموارد البشرية | دالة حساب costTabIdForKind | renderer/modules/hr/pages-costs.js:408 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0187 | data-write | الموارد البشرية | كتابة بيانات saveCostItemSuggestion | renderer/modules/hr/pages-costs.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0188 | data-write | الموارد البشرية | كتابة بيانات removeCostItemSuggestion | renderer/modules/hr/pages-costs.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0189 | modal | الموارد البشرية | نافذة openEquipmentModal | renderer/modules/hr/pages-equipment.js:665 | legacy | phase27.js، phase44.js، phase52.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0190 | modal | الموارد البشرية | نافذة openEquipmentDailyModal | renderer/modules/hr/pages-equipment.js:1074 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0191 | modal | الموارد البشرية | نافذة openEquipLogModal | renderer/modules/hr/pages-equipment.js:1228 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0192 | calc | الموارد البشرية | دالة حساب printEquipmentDaysStatement | renderer/modules/hr/pages-equipment.js:250 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0193 | calc | الموارد البشرية | دالة حساب printEquipmentDailyStatement | renderer/modules/hr/pages-equipment.js:1024 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0194 | export/print | الموارد البشرية | تصدير/طباعة printEquipmentDaysStatement | renderer/modules/hr/pages-equipment.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0195 | export/print | الموارد البشرية | تصدير/طباعة printEquipmentDailyStatement | renderer/modules/hr/pages-equipment.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0196 | modal | الموارد البشرية | نافذة openLeaveModal | renderer/modules/hr/pages-leaves.js:172 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0197 | calc | الموارد البشرية | دالة حساب calcLeaveDays | renderer/modules/hr/pages-leaves.js:32 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0198 | modal | الموارد البشرية | نافذة openExternalDriverModal | renderer/modules/hr/pages-ops.js:133 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0199 | modal | الموارد البشرية | نافذة openDriverModal | renderer/modules/hr/pages-ops.js:189 | legacy | phase36.js، phase47.js، phase49.js، phase50.js، phase51.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0200 | modal | الموارد البشرية | نافذة openFuelModal | renderer/modules/hr/pages-ops.js:274 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0201 | modal | الموارد البشرية | نافذة openTransferModal | renderer/modules/hr/pages-ops.js:419 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0202 | modal | الموارد البشرية | نافذة openPerfModal | renderer/modules/hr/pages-ops.js:610 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0203 | modal | الموارد البشرية | نافذة openManageDocTypesModal | renderer/modules/hr/pages-ops.js:675 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0204 | modal | الموارد البشرية | نافذة openDocModal | renderer/modules/hr/pages-ops.js:721 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0205 | modal | الموارد البشرية | نافذة openExpenseDetailModal | renderer/modules/hr/pages-ops.js:1417 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0206 | modal | الموارد البشرية | نافذة openExpenseModal | renderer/modules/hr/pages-ops.js:1464 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0207 | modal | الموارد البشرية | نافذة openVehicleExpenseModal | renderer/modules/hr/pages-ops.js:1842 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0208 | data-write | الموارد البشرية | كتابة بيانات saveExpenseItemSuggestion | renderer/modules/hr/pages-ops.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0209 | data-write | الموارد البشرية | كتابة بيانات removeExpenseItemSuggestion | renderer/modules/hr/pages-ops.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0210 | data-write | الموارد البشرية | كتابة بيانات saveVehicleExpenseItem | renderer/modules/hr/pages-ops.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0211 | calc | الموارد البشرية | دالة حساب printPersonFinanceStatement | renderer/modules/hr/pages-person-detail.js:126 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0212 | export/print | الموارد البشرية | تصدير/طباعة printPersonFinanceStatement | renderer/modules/hr/pages-person-detail.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0213 | modal | الموارد البشرية | نافذة openProjectModal | renderer/modules/hr/pages-projects.js:334 | legacy | phase14.js، phase18.js، phase2.js، phase3.js، phase4.js، phase48.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0214 | modal | الموارد البشرية | نافذة openPlanModal | renderer/modules/hr/pages-projects.js:508 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0215 | calc | الموارد البشرية | دالة حساب repDuesFull | renderer/modules/hr/pages-reports.js:365 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0216 | export/print | الموارد البشرية | تصدير/طباعة exportCurrentReportCsv | renderer/modules/hr/pages-reports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0217 | export/print | الموارد البشرية | تصدير/طباعة exportCurrentReportXlsx | renderer/modules/hr/pages-reports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0218 | export/print | الموارد البشرية | تصدير/طباعة printCurrentReport | renderer/modules/hr/pages-reports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0219 | modal | الموارد البشرية | نافذة openSupervisorModal | renderer/modules/hr/pages-supervisors.js:323 | legacy | phase36.js، phase47.js، phase49.js، phase50.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0220 | calc | الموارد البشرية | دالة حساب supervisorStatementSectionsHtml | renderer/modules/hr/pages-supervisors.js:99 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0221 | calc | الموارد البشرية | دالة حساب supervisorStatementCardsHtml | renderer/modules/hr/pages-supervisors.js:149 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0222 | modal | الموارد البشرية | نافذة openWattDaySitesModal | renderer/modules/hr/pages-worker-attendance.js:541 | legacy | phase28.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0223 | modal | الموارد البشرية | نافذة openWorkerAttModal | renderer/modules/hr/pages-worker-attendance.js:577 | legacy | phase26.js، phase28.js، phase49.js، phase50.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0224 | modal | الموارد البشرية | نافذة openUnifiedPayModal | renderer/modules/hr/pages-worker-dues.js:741 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0225 | modal | الموارد البشرية | نافذة openPayItemsManageModal | renderer/modules/hr/pages-worker-dues.js:1454 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0226 | calc | الموارد البشرية | دالة حساب duesEntityKind | renderer/modules/hr/pages-worker-dues.js:12 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0227 | calc | الموارد البشرية | دالة حساب duesListForKind | renderer/modules/hr/pages-worker-dues.js:17 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0228 | modal | الموارد البشرية | نافذة openWorkerModal | renderer/modules/hr/pages-workers.js:216 | legacy | phase29.js، phase36.js، phase37.js، phase39.js، phase47.js، phase50.js (+1) | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0229 | calc | الموارد البشرية | دالة حساب projectStatement | renderer/modules/hr/project-statement.js:48 | legacy | phase17.js | Verified (باختبار) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0230 | calc | الموارد البشرية | دالة حساب projectStatementSectionsHtml | renderer/modules/hr/project-statement.js:177 | legacy |  | Verified (جرد ثابت بس) | DEC-0045 (B-45)، DEC-0046 (B-46)، DEC-0047 (B-47)، DEC-0073 (B-73)، DEC-0074 (B-74)، DEC-0076 (B-76)، DEC-0042 (B-42) |
| LEG-0231 | modal | الموردون | نافذة openGlobalValidationModal | renderer/modules/ledger/app.js:567 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0232 | calc | الموردون | دالة حساب refreshOpenStatements | renderer/modules/ledger/app.js:773 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0233 | calc | الموردون | دالة حساب normalizeTaxId | renderer/modules/ledger/excel-import.js:240 | legacy | phase63.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0234 | export/print | الموردون | تصدير/طباعة exportCategoriesExcel | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0235 | export/print | الموردون | تصدير/طباعة exportSuppliersCsv | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0236 | export/print | الموردون | تصدير/طباعة exportAllInvoicesCsv | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0237 | export/print | الموردون | تصدير/طباعة exportAllPaymentsCsv | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0238 | export/print | الموردون | تصدير/طباعة exportSupplierCsv | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0239 | export/print | الموردون | تصدير/طباعة exportVisibleQuarterNoticesPdf | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0240 | export/print | الموردون | تصدير/طباعة exportSupplierDiscountNoticesPdf | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0241 | export/print | الموردون | تصدير/طباعة exportQuarterNoticesPdf | renderer/modules/ledger/exports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0242 | calc | الموردون | دالة حساب previewInvoiceCalculationFixes | renderer/modules/ledger/helpers.js:143 | legacy | legacy-runner.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0243 | calc | الموردون | دالة حساب fixInvoiceCalculations | renderer/modules/ledger/helpers.js:169 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0244 | calc | الموردون | دالة حساب lgExtraFieldsSummary | renderer/modules/ledger/helpers.js:492 | legacy | phase63.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0245 | calc | الموردون | دالة حساب supplierBalance | renderer/modules/ledger/helpers.js:576 | legacy | phase61.js، legacy-runner.js، reference.js، target-diff.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0246 | calc | الموردون | دالة حساب invoiceRemaining | renderer/modules/ledger/helpers.js:590 | legacy | legacy-runner.js، reference.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0247 | calc | الموردون | دالة حساب getInvoiceDueDate | renderer/modules/ledger/helpers.js:720 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0248 | calc | الموردون | دالة حساب getOverdueInvoices | renderer/modules/ledger/helpers.js:734 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0249 | calc | الموردون | دالة حساب recalcLinkedOriginal | renderer/modules/ledger/helpers.js:1927 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0250 | calc | الموردون | دالة حساب maybeShowOverdueAlert | renderer/modules/ledger/helpers.js:2031 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0251 | calc | الموردون | دالة حساب pfSummaryHtml | renderer/modules/ledger/helpers.js:2265 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0252 | export/print | الموردون | تصدير/طباعة downloadFile | renderer/modules/ledger/helpers.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0253 | export/print | الموردون | تصدير/طباعة exportExcelFile | renderer/modules/ledger/helpers.js | legacy | phase60.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0254 | export/print | الموردون | تصدير/طباعة printHtmlContent | renderer/modules/ledger/helpers.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0255 | data-write | الموردون | كتابة بيانات addDaysToIsoDate | renderer/modules/ledger/helpers.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0256 | data-write | الموردون | كتابة بيانات saveCustomLinkedItem | renderer/modules/ledger/helpers.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0257 | data-write | الموردون | كتابة بيانات deleteCustomLinkedItem | renderer/modules/ledger/helpers.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0258 | modal | الموردون | نافذة openAddSupplierModal | renderer/modules/ledger/modals.js:9 | legacy | phase38.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0259 | modal | الموردون | نافذة openDeleteSupplierModal | renderer/modules/ledger/modals.js:136 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0260 | modal | الموردون | نافذة openPaymentModal | renderer/modules/ledger/modals.js:192 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0261 | modal | الموردون | نافذة openAddEditInvoiceModal | renderer/modules/ledger/modals.js:660 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0262 | modal | الموردون | نافذة openDiscountNoticeModal | renderer/modules/ledger/modals.js:1410 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0263 | modal | الموردون | نافذة openViewInvoiceModal | renderer/modules/ledger/modals.js:1452 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0264 | modal | الموردون | نافذة openViewPaymentModal | renderer/modules/ledger/modals.js:1633 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0265 | calc | الموردون | دالة حساب printSupplierStatementTab | renderer/modules/ledger/modals.js:1439 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0266 | calc | الموردون | دالة حساب printSupplierStatement | renderer/modules/ledger/modals.js:1446 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0267 | export/print | الموردون | تصدير/طباعة printSupplierStatementTab | renderer/modules/ledger/modals.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0268 | export/print | الموردون | تصدير/طباعة printSupplierStatement | renderer/modules/ledger/modals.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0269 | data-write | الموردون | كتابة بيانات saveInvoiceData | renderer/modules/ledger/modals.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0270 | modal | الموردون | نافذة openAddSupplierDocumentModal | renderer/modules/ledger/pages-archive.js:774 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0271 | calc | الموردون | دالة حساب archSummary | renderer/modules/ledger/pages-archive.js:138 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0272 | modal | الموردون | نافذة openLinkedItemModal | renderer/modules/ledger/pages-categories.js:231 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0273 | export/print | الموردون | تصدير/طباعة exportPeriodicReportCsv | renderer/modules/ledger/pages-reports.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0274 | calc | الموردون | دالة حساب statementRows | renderer/modules/ledger/statement.js:3 | legacy | legacy-runner.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0275 | calc | الموردون | دالة حساب buildAccountStatementHtml | renderer/modules/ledger/statement.js:61 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0276 | calc | الموردون | دالة حساب printBankStatement | renderer/modules/ledger/statement.js:140 | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0277 | export/print | الموردون | تصدير/طباعة printBankStatement | renderer/modules/ledger/statement.js | legacy |  | Verified (جرد ثابت بس) | DEC-0029 (B-29) |
| LEG-0278 | modal | المخازن | نافذة openWhItemModal | renderer/modules/warehouses/pages-home.js:203 | legacy | phase38.js، phase66.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0279 | modal | المخازن | نافذة openWhLocationModal | renderer/modules/warehouses/pages-home.js:237 | legacy |  | Verified (جرد ثابت بس) | DEC-0077 (B-77) |
| LEG-0280 | modal | المخازن | نافذة openWhMovementModal | renderer/modules/warehouses/pages-home.js:260 | legacy |  | Verified (جرد ثابت بس) | DEC-0077 (B-77) |
| LEG-0281 | permission | الإعدادات | مصفوفة صلاحيات الصفحات (عرض/إضافة/تعديل/حذف لكل صفحة) | renderer/core/permissions.js | server (ADR-016) |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0282 | permission | الإعدادات | قالب دور admin | renderer/core/permissions.js | server |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0283 | permission | الإعدادات | قالب دور hr | renderer/core/permissions.js | server |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0284 | permission | الإعدادات | قالب دور viewer | renderer/core/permissions.js | server |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0285 | permission | الإعدادات | قالب دور payroll | renderer/core/permissions.js | server |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0286 | permission | الإعدادات | قالب دور clientsSales | renderer/core/permissions.js | server |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0287 | permission | الإعدادات | قالب دور clientsAccounts | renderer/core/permissions.js | server |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0288 | permission | الإعدادات | قالب دور clientsProjects | renderer/core/permissions.js | server |  | Implemented (اتنقل) | DEC-0035 (B-35) |
| LEG-0289 | calc | مشترك (core) | دالة حساب attendanceNetPay | renderer/core/helpers.js:286 | legacy | phase59.js، compare.js، legacy-runner.js | Verified (باختبار) | — |
| LEG-0290 | calc | العملاء والمشاريع | دالة حساب clInvNet | renderer/modules/clients/pages-invoices.js:6 | legacy | phase59.js، compare.js، phase14.js، phase9.js، legacy-runner.js، reference.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0291 | calc | العملاء والمشاريع | دالة حساب clVoApprovedSum | renderer/modules/clients/change-orders.js:8 | legacy | phase59.js، compare.js، legacy-runner.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0292 | calc | مشترك (core) | دالة حساب equipmentDailyCost | renderer/core/helpers.js:7778 | legacy | phase59.js، compare.js، legacy-runner.js | Verified (باختبار) | — |
| LEG-0293 | calc | الموردون | دالة حساب noticeAmountsFor | renderer/modules/ledger/helpers.js:606 | legacy | phase59.js، compare.js، legacy-runner.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0294 | calc | الموردون | دالة حساب openingBalanceFor | renderer/modules/ledger/statement.js:43 | legacy | phase59.js، compare.js، legacy-runner.js، reference.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0295 | calc | الموردون | دالة حساب roundMoney | renderer/modules/ledger/helpers.js:208 | legacy | phase59.js، compare.js، legacy-runner.js، reference.js | Verified (باختبار) | DEC-0029 (B-29) |
| LEG-0296 | calc | مشترك (core) | دالة حساب supervisorOwnDue | renderer/core/helpers.js:2066 | legacy | phase59.js، compare.js، legacy-runner.js | Verified (باختبار) | — |
| LEG-0297 | calc | المخازن | دالة حساب whStockQty | renderer/modules/warehouses/helpers.js:27 | legacy | phase59.js، compare.js، phase65.js، phase66.js، legacy-runner.js، reference.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0298 | calc | المخازن | دالة حساب whStockValue | renderer/modules/warehouses/helpers.js:48 | legacy | phase59.js، compare.js، legacy-runner.js، reference.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0299 | electron-capability | ديسكتوب | قدرة ديسكتوب askPin | preload.js (app:askPin) | يتراجع: صلاحيات السيرفر بدل PIN |  | Verified (جرد ثابت بس) | — |
| LEG-0300 | electron-capability | ديسكتوب | قدرة ديسكتوب backupNow | preload.js (backup:runNow) | POST /api/backups |  | Verified (جرد ثابت بس) | — |
| LEG-0301 | electron-capability | ديسكتوب | قدرة ديسكتوب cleanupOrphans | preload.js (storage:cleanupOrphans) | POST /api/admin/attachments/cleanup (dry-run) |  | Verified (جرد ثابت بس) | — |
| LEG-0302 | electron-capability | ديسكتوب | قدرة ديسكتوب clearExtraBackupDir | preload.js (backup:clearExtraDir) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0303 | electron-capability | ديسكتوب | قدرة ديسكتوب deleteAttachment | preload.js (attachment:delete) | DELETE /api/attachments/:id |  | Verified (جرد ثابت بس) | — |
| LEG-0304 | electron-capability | ديسكتوب | قدرة ديسكتوب exportArchive | preload.js (archive:export) | POST /api/archive (ZIP stream) |  | Verified (جرد ثابت بس) | — |
| LEG-0305 | electron-capability | ديسكتوب | قدرة ديسكتوب exportExcel | preload.js (excel:export) | xlsx في المتصفح | phase60.js | Verified (باختبار) | — |
| LEG-0306 | electron-capability | ديسكتوب | قدرة ديسكتوب getAppVersion | preload.js (app:getVersion) | GET /api/health (version) |  | Verified (جرد ثابت بس) | — |
| LEG-0307 | electron-capability | ديسكتوب | قدرة ديسكتوب getDataPath | preload.js (app:dataPath) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0308 | electron-capability | ديسكتوب | قدرة ديسكتوب getDefaultDataPath | preload.js (app:getDefaultDataPath) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0309 | electron-capability | ديسكتوب | قدرة ديسكتوب getExtraBackupDir | preload.js (backup:getExtraDir) | لا ينطبق (النسخ على السيرفر) |  | Verified (جرد ثابت بس) | — |
| LEG-0310 | electron-capability | ديسكتوب | قدرة ديسكتوب getLockInfo | preload.js (app:lockInfo) | لا ينطبق (السيرفر هو القفل) |  | Verified (جرد ثابت بس) | — |
| LEG-0311 | electron-capability | ديسكتوب | قدرة ديسكتوب hashPassword | preload.js (auth:hashPassword) | POST /api/users (السيرفر يشفّر) | auth.e2e-spec.ts | Verified (باختبار) | — |
| LEG-0312 | electron-capability | ديسكتوب | قدرة ديسكتوب importExcel | preload.js (excel:import) | xlsx في المتصفح | phase60.js | Verified (باختبار) | — |
| LEG-0313 | electron-capability | ديسكتوب | قدرة ديسكتوب inspectUpdate | preload.js (app:inspectUpdate) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0314 | electron-capability | ديسكتوب | قدرة ديسكتوب loadData | preload.js (data:load) | GET /api/bootstrap |  | Verified (جرد ثابت بس) | — |
| LEG-0315 | electron-capability | ديسكتوب | قدرة ديسكتوب openAttachment | preload.js (attachment:open) | GET /api/attachments/:id (signed URL) | phase3.js، phase8.js | Verified (باختبار) | — |
| LEG-0316 | electron-capability | ديسكتوب | قدرة ديسكتوب openExternalLink | preload.js (open-external-url) | window.open |  | Verified (جرد ثابت بس) | — |
| LEG-0317 | electron-capability | ديسكتوب | قدرة ديسكتوب openFile | preload.js (file:open) | <input type=file> |  | Verified (جرد ثابت بس) | — |
| LEG-0318 | electron-capability | ديسكتوب | قدرة ديسكتوب openWindowsScanApp | preload.js (scan:openWindowsScanApp) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0319 | electron-capability | ديسكتوب | قدرة ديسكتوب pickAttachments | preload.js (attachment:pick) | input file + POST /api/attachments | phase3.js، phase8.js | Verified (باختبار) | — |
| LEG-0320 | electron-capability | ديسكتوب | قدرة ديسكتوب pickDataDir | preload.js (app:pickDataDir) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0321 | electron-capability | ديسكتوب | قدرة ديسكتوب pickExtraBackupDir | preload.js (backup:pickExtraDir) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0322 | electron-capability | ديسكتوب | قدرة ديسكتوب pickInstaller | preload.js (app:pickInstaller) | لا updater في الويب |  | Verified (جرد ثابت بس) | — |
| LEG-0323 | electron-capability | ديسكتوب | قدرة ديسكتوب readAttachmentDataUrl | preload.js (attachment:readDataUrl) | GET /api/attachments/:id |  | Verified (جرد ثابت بس) | — |
| LEG-0324 | electron-capability | ديسكتوب | قدرة ديسكتوب resetDataDir | preload.js (app:resetDataDir) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0325 | electron-capability | ديسكتوب | قدرة ديسكتوب runInstaller | preload.js (app:runInstaller) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0326 | electron-capability | ديسكتوب | قدرة ديسكتوب safetyBackup (مستخدمة ومش معرّفة في preload) | renderer/ (من غير تعريف) | POST /api/backups (سبب) |  | Verified (جرد ثابت بس) | — |
| LEG-0327 | electron-capability | ديسكتوب | قدرة ديسكتوب saveAttachmentBuffer | preload.js (attachment:saveBuffer) | POST /api/attachments |  | Verified (جرد ثابت بس) | — |
| LEG-0328 | electron-capability | ديسكتوب | قدرة ديسكتوب saveData | preload.js (data:save) | POST /api/sync (diff) | phase2.js، phase3.js، phase60.js، web-e2e.js | Verified (باختبار) | — |
| LEG-0329 | electron-capability | ديسكتوب | قدرة ديسكتوب saveDataSync | preload.js (data:saveSync) | fetch keepalive / sendBeacon → /api/sync |  | Verified (جرد ثابت بس) | — |
| LEG-0330 | electron-capability | ديسكتوب | قدرة ديسكتوب saveFile | preload.js (file:save) | Blob + download |  | Verified (جرد ثابت بس) | — |
| LEG-0331 | electron-capability | ديسكتوب | قدرة ديسكتوب savePdf | preload.js (pdf:save) | POST /api/pdf |  | Verified (جرد ثابت بس) | — |
| LEG-0332 | electron-capability | ديسكتوب | قدرة ديسكتوب savePdfHtml | preload.js (pdf:saveHtml) | POST /api/pdf |  | Verified (جرد ثابت بس) | — |
| LEG-0333 | electron-capability | ديسكتوب | قدرة ديسكتوب scanAttachment (مستخدمة ومش معرّفة في preload) | renderer/ (من غير تعريف) | كاميرا / رفع PDF |  | Verified (جرد ثابت بس) | — |
| LEG-0334 | electron-capability | ديسكتوب | قدرة ديسكتوب scanWindows | preload.js (scan:windows) | كاميرا / رفع PDF |  | Verified (جرد ثابت بس) | — |
| LEG-0335 | electron-capability | ديسكتوب | قدرة ديسكتوب serverStart | preload.js (server:start) | وضع الشبكة القديم يتلغى |  | Verified (جرد ثابت بس) | — |
| LEG-0336 | electron-capability | ديسكتوب | قدرة ديسكتوب serverStatus | preload.js (server:status) | يتلغى |  | Verified (جرد ثابت بس) | — |
| LEG-0337 | electron-capability | ديسكتوب | قدرة ديسكتوب serverStop | preload.js (server:stop) | يتلغى |  | Verified (جرد ثابت بس) | — |
| LEG-0338 | electron-capability | ديسكتوب | قدرة ديسكتوب setDataDir | preload.js (app:setDataDir) | لا ينطبق |  | Verified (جرد ثابت بس) | — |
| LEG-0339 | electron-capability | ديسكتوب | قدرة ديسكتوب snapshotData | preload.js (data:snapshot) | POST /api/backups (أدمن) |  | Verified (جرد ثابت بس) | — |
| LEG-0340 | electron-capability | ديسكتوب | قدرة ديسكتوب verifyPassword | preload.js (auth:verifyPassword) | POST /api/auth/login |  | Verified (جرد ثابت بس) | — |
| LEG-0341 | data-write | العملاء والمشاريع | كتابة بيانات clSaveCustomers | renderer/modules/clients/helpers.js:327 | legacy | phase63.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0342 | data-write | العملاء والمشاريع | كتابة بيانات clUpsertCustomer | renderer/modules/clients/helpers.js:333 | legacy | phase12.js، phase63.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0343 | data-write | العملاء والمشاريع | كتابة بيانات clDeleteCustomer | renderer/modules/clients/helpers.js:352 | legacy | phase2.js، phase63.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0344 | data-write | العملاء والمشاريع | كتابة بيانات clNextCustomerCode | renderer/modules/clients/helpers.js:24 | legacy | phase63.js | Verified (باختبار) | DEC-0029 (B-29)، DEC-0035 (B-35) |
| LEG-0345 | data-write | المخازن | كتابة بيانات whUpsertItem | renderer/modules/warehouses/helpers.js:56 | legacy | phase66.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0346 | data-write | المخازن | كتابة بيانات whDeleteItem | renderer/modules/warehouses/helpers.js:63 | legacy | phase66.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0347 | data-write | المخازن | كتابة بيانات whUpsertLocation | renderer/modules/warehouses/helpers.js:67 | legacy | phase66.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0348 | data-write | المخازن | كتابة بيانات whAddMovement | renderer/modules/warehouses/helpers.js:74 | legacy | phase17.js، phase66.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0349 | data-write | المخازن | كتابة بيانات whNextItemCode | renderer/modules/warehouses/helpers.js:18 | legacy | phase66.js | Verified (باختبار) | DEC-0077 (B-77) |
| LEG-0350 | data-write | المخازن | كتابة بيانات whNextMovementId | renderer/modules/warehouses/helpers.js:19 | legacy | phase65.js، phase66.js | Verified (باختبار) | DEC-0077 (B-77) |
