# تقرير اختبارات مكتبة المعادلات — B-20

> مولَّد آليًا من `server/finance-formulas/B20_LIBRARY.json` بمحرك التعبيرات (`expr.ts`). المعادلات **مقترحة — مش معتمدة**. القيم في الحالات أمثلة اختبار مش نسب معتمدة.

**النتيجة:** 47/47 حالة ناجحة في 25 معادلة.

## DOC-TOTALS — إجماليات المستند (البنود والخصومات والصافي) (المواصفات 2.1–2.4)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| عادي: خصم بند بنسبة + خصم بند بقيمة + خصم مستند | `{"lines":[{"Quantity":"10","UnitPrice":"100","DiscountRate":"0.05","LineDiscountAmount":"0"},{"Quantity":"2","UnitPrice":"50","DiscountRate":"0","LineDiscountAmount":"10"}],"DocumentDiscount":"40","AddedTaxes":"140","AddedFees":"0","WithholdingTaxes":"10","ContractualDeductions":"0","AdvancesApplied":"100","PreviousPayments":"30"}` | `{"GrossSubtotal":"1100.0000","TotalLineDiscount":"60.0000","TotalDiscount":"100.0000","NetSubtotal":"1000.0000","DocumentTotal":"1140.0000","NetPayable":"1000.0000"}` | `{"GrossSubtotal":"1100.0000","TotalLineDiscount":"60.0000","TotalDiscount":"100.0000","NetSubtotal":"1000.0000","DocumentTotal":"1140.0000","NetPayable":"1000.0000"}` | ✅ | — |
| تقريب HALF_UP على مستوى السطر | `{"lines":[{"Quantity":"3","UnitPrice":"0.33335","DiscountRate":"0","LineDiscountAmount":"0"}],"DocumentDiscount":"0","AddedTaxes":"0","AddedFees":"0","WithholdingTaxes":"0","ContractualDeductions":"0","AdvancesApplied":"0","PreviousPayments":"0"}` | `{"GrossSubtotal":"1.0001","NetPayable":"1.0001"}` | `{"GrossSubtotal":"1.0001","NetPayable":"1.0001"}` | ✅ | — |
| كمية صفر | `{"lines":[{"Quantity":"0","UnitPrice":"100","DiscountRate":"0","LineDiscountAmount":"0"}],"DocumentDiscount":"0","AddedTaxes":"0","AddedFees":"0","WithholdingTaxes":"0","ContractualDeductions":"0","AdvancesApplied":"0","PreviousPayments":"0"}` | `{"GrossSubtotal":"0.0000","DocumentTotal":"0.0000"}` | `{"GrossSubtotal":"0.0000","DocumentTotal":"0.0000"}` | ✅ | — |
| خصم المستند أكبر من الأساس ← مرفوض | `{"lines":[{"Quantity":"1","UnitPrice":"100","DiscountRate":"0","LineDiscountAmount":"0"}],"DocumentDiscount":"100.0001","AddedTaxes":"0","AddedFees":"0","WithholdingTaxes":"0","ContractualDeductions":"0","AdvancesApplied":"0","PreviousPayments":"0"}` | `{"error":"DOCUMENT_DISCOUNT_EXCEEDS_BASE"}` | `{"error":"DOCUMENT_DISCOUNT_EXCEEDS_BASE"}` | ✅ | — |
| خصم السطر أكبر من السطر ← مرفوض | `{"lines":[{"Quantity":"1","UnitPrice":"100","DiscountRate":"0.5","LineDiscountAmount":"60"}],"DocumentDiscount":"0","AddedTaxes":"0","AddedFees":"0","WithholdingTaxes":"0","ContractualDeductions":"0","AdvancesApplied":"0","PreviousPayments":"0"}` | `{"error":"LINE_DISCOUNT_EXCEEDS_LINE"}` | `{"error":"LINE_DISCOUNT_EXCEEDS_LINE"}` | ✅ | — |

**قرارات مفتوحة:** ترتيب تطبيق الخصومات المتعددة (المقترح: نسبة البند ← قيمة البند ← خصم المستند) · التقريب على مستوى السطر (المقترح) ولا المستند

## SUP-INVOICE — فاتورة مورد (المواصفات 3.1)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مثال المواصفات 12.2: 100,000 + ق.م 14,000 − خصم 1,000 | `{"lines":[{"Quantity":"1","UnitPrice":"100000"}],"CommercialDiscounts":"0","InputVAT":"14000","OtherAddedTaxes":"0","Fees":"0","WithholdingAmount":"1000","AdvancesApplied":"0","OtherApprovedDeductions":"0"}` | `{"GrossInvoice":"100000.0000","NetItems":"100000.0000","InvoiceTotal":"114000.0000","NetSupplierPayable":"113000.0000"}` | `{"GrossInvoice":"100000.0000","NetItems":"100000.0000","InvoiceTotal":"114000.0000","NetSupplierPayable":"113000.0000"}` | ✅ | — |
| سطور بكسور + خصم تجاري (مثال المراجعة F-01) | `{"lines":[{"Quantity":"10","UnitPrice":"125.5"},{"Quantity":"3.5","UnitPrice":"40.12345"}],"CommercialDiscounts":"27.9086","InputVAT":"191.4533","OtherAddedTaxes":"0","Fees":"0","WithholdingAmount":"13.6752","AdvancesApplied":"0","OtherApprovedDeductions":"0"}` | `{"GrossInvoice":"1395.4321","NetItems":"1367.5235","InvoiceTotal":"1558.9768","NetSupplierPayable":"1545.3016"}` | `{"GrossInvoice":"1395.4321","NetItems":"1367.5235","InvoiceTotal":"1558.9768","NetSupplierPayable":"1545.3016"}` | ✅ | — |
| دفعة مقدمة مطبّقة | `{"lines":[{"Quantity":"2","UnitPrice":"500"}],"CommercialDiscounts":"0","InputVAT":"140","OtherAddedTaxes":"0","Fees":"0","WithholdingAmount":"10","AdvancesApplied":"300","OtherApprovedDeductions":"0"}` | `{"NetSupplierPayable":"830.0000"}` | `{"NetSupplierPayable":"830.0000"}` | ✅ | — |

**قرارات مفتوحة:** الخصم تحت الحساب عند الفاتورة ولا عند الدفع · قابلية خصم ق.م لكل فئة مشتريات

## SUP-RETURN — مرتجع مشتريات (المواصفات 3.2)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مرتجع جزئي | `{"lines":[{"ReturnQuantity":"2","OriginalQuantity":"10","OriginalUnitPrice":"100"}],"RelatedDiscounts":"10","ReturnVAT":"26.6","OtherApplicableTaxes":"0"}` | `{"ReturnGross":"200.0000","ReturnNet":"190.0000","ReturnTotal":"216.6000"}` | `{"ReturnGross":"200.0000","ReturnNet":"190.0000","ReturnTotal":"216.6000"}` | ✅ | — |
| مرتجع أكبر من الأصل ← مرفوض | `{"lines":[{"ReturnQuantity":"11","OriginalQuantity":"10","OriginalUnitPrice":"100"}],"RelatedDiscounts":"0","ReturnVAT":"0","OtherApplicableTaxes":"0"}` | `{"error":"RETURN_QTY_EXCEEDS_ORIGINAL"}` | `{"error":"RETURN_QTY_EXCEEDS_ORIGINAL"}` | ✅ | — |

**قرارات مفتوحة:** الأثر الضريبي للمرتجع (TR-03: مفيش أثر لحد سياسة الضرائب)

## SUP-BALANCE — رصيد المورد (المواصفات 3.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مثال المراجعة F-05 | `{"OpeningBalance":"1000","PostedInvoices":"1130","PostedReturns":"113","PostedPayments":"500","PostedCollections":"100","PostedCreditAdjustments":"0","PostedDebitAdjustments":"0"}` | `{"SupplierBalance":"1617.0000"}` | `{"SupplierBalance":"1617.0000"}` | ✅ | — |
| دفع زيادة ← رصيد مدين (سالب) | `{"OpeningBalance":"0","PostedInvoices":"100","PostedReturns":"0","PostedPayments":"150","PostedCollections":"0","PostedCreditAdjustments":"0","PostedDebitAdjustments":"0"}` | `{"SupplierBalance":"-50.0000"}` | `{"SupplierBalance":"-50.0000"}` | ✅ | — |

**قرارات مفتوحة:** اتجاه التسويات: المواصفات (− دائنة + مدينة) عكس طبيعة حساب المورد الدائن — محتاج تأكيد المعنى · إضافة التحصيلات من المورد (TR-05) — مش موجودة في صيغة المواصفات

## CUS-INVOICE — فاتورة عميل (المواصفات 4.1)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| فاتورة + تحصيل جزئي | `{"lines":[{"Quantity":"4","UnitPrice":"250"}],"Discounts":"0","OutputVAT":"140","OtherAddedTaxes":"0","Fees":"0","PostedReceipts":"500","CreditNotes":"0","ApprovedAdjustments":"0"}` | `{"GrossSales":"1000.0000","InvoiceTotal":"1140.0000","CustomerOutstanding":"640.0000"}` | `{"GrossSales":"1000.0000","InvoiceTotal":"1140.0000","CustomerOutstanding":"640.0000"}` | ✅ | — |

**قرارات مفتوحة:** هل فيه فواتير مبيعات غير المستخلصات؟

## CUS-RETURN — مرتجع مبيعات (المواصفات 4.2)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مرتجع مبيعات | `{"lines":[{"ReturnQuantity":"3","OriginalQuantity":"4","OriginalUnitPrice":"100"}],"RelatedDiscounts":"15","ReturnVAT":"39.9","OtherApplicableTaxes":"0"}` | `{"SalesReturn":"300.0000","ReturnCredit":"324.9000"}` | `{"SalesReturn":"300.0000","ReturnCredit":"324.9000"}` | ✅ | — |

## CUS-BALANCE — رصيد العميل (المواصفات 4.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| رصيد بعد تحصيل جزئي | `{"OpeningBalance":"0","PostedInvoices":"52270","PostedCreditNotes":"0","PostedReceipts":"50000","PostedDebitAdjustments":"0","PostedCreditAdjustments":"0"}` | `{"CustomerBalance":"2270.0000"}` | `{"CustomerBalance":"2270.0000"}` | ✅ | — |
| تحصيل زيادة ← رصيد دائن للعميل | `{"OpeningBalance":"100","PostedInvoices":"0","PostedCreditNotes":"0","PostedReceipts":"300","PostedDebitAdjustments":"0","PostedCreditAdjustments":"0"}` | `{"CustomerBalance":"-200.0000"}` | `{"CustomerBalance":"-200.0000"}` | ✅ | — |

**قرارات مفتوحة:** الخصم تحت الحساب اللي العميل بيخصمه: بيتسجّل كتحصيل ولا تسوية؟ · المحتجز داخل الرصيد ولا حساب منفصل

## CUS-CERT — مستخلص عميل (المواصفات 5.1)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مستخلص باحتجاز واسترداد مقدم وغرامة | `{"lines":[{"ExecutedQuantity":"1000","ContractUnitPrice":"50"}],"AdditionalWorkValue":"5000","RetentionBase":"55000","ContractRetentionRate":"0.05","AdvanceRecoveryBase":"55000","ContractRecoveryRate":"0.10","Penalties":"500","ContractualDeductions":"0","OtherApprovedDeductions":"0","AddedTaxes":"7700"}` | `{"ExecutedWorkValue":"50000.0000","GrossWorkValue":"55000.0000","RetentionAmount":"2750.0000","AdvanceRecovery":"5500.0000","NetCertificate":"53950.0000"}` | `{"ExecutedWorkValue":"50000.0000","GrossWorkValue":"55000.0000","RetentionAmount":"2750.0000","AdvanceRecovery":"5500.0000","NetCertificate":"53950.0000"}` | ✅ | — |

**قرارات مفتوحة:** المواصفات بتحسب المستخلص كفترة، وTR-11 المعتمد تراكمي — CERT-CUMULATIVE بيكمّلها؛ محتاج تأكيد الطريقة الرسمية · أساس الاحتجاز وأساس ق.م (إجمالي الأعمال؟ قبل ولا بعد الإضافات؟) · معنى taxPct في البيانات الحالية

## CERT-CUMULATIVE — المستخلصات التراكمية والمتبقي من العقد (المواصفات 5.2)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| داخل قيمة العقد + أوامر تغيير معتمدة | `{"ContractValue":"1000000","ApprovedVariations":"50000","PreviousApprovedGross":"600000","CurrentCertificateGross":"300000","CurrentCertificateDeductions":"30000"}` | `{"CumulativeApprovedGrossCertificates":"900000.0000","RemainingContractValue":"150000.0000","CurrentNetCertificate":"270000.0000"}` | `{"CumulativeApprovedGrossCertificates":"900000.0000","RemainingContractValue":"150000.0000","CurrentNetCertificate":"270000.0000"}` | ✅ | — |
| تجاوز قيمة العقد ← مرفوض | `{"ContractValue":"1000000","ApprovedVariations":"50000","PreviousApprovedGross":"600000","CurrentCertificateGross":"450000.0001","CurrentCertificateDeductions":"0"}` | `{"error":"CERTIFICATES_EXCEED_CONTRACT"}` | `{"error":"CERTIFICATES_EXCEED_CONTRACT"}` | ✅ | — |

## SUB-CERT — مستخلص مقاول باطن (المواصفات 5.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مستخلص باطن باحتجاز وخصم تحت الحساب ومدفوع سابق | `{"lines":[{"ApprovedExecutedQuantity":"600","SubcontractUnitPrice":"100"}],"RetentionBase":"60000","ContractRetentionRate":"0.10","AdvanceRecoveryBase":"0","ContractRecoveryRate":"0","Penalties":"0","AddedTaxes":"0","ContractualDeductions":"0","WithholdingTaxes":"540","PreviousPayments":"30000"}` | `{"SubcontractGrossWork":"60000.0000","SubcontractRetention":"6000.0000","SubcontractNetPayable":"23460.0000"}` | `{"SubcontractGrossWork":"60000.0000","SubcontractRetention":"6000.0000","SubcontractNetPayable":"23460.0000"}` | ✅ | — |

**قرارات مفتوحة:** مستخلص الباطن مستند منفصل ولا فاتورة مورد بنوع «مقاول»

## VOUCHER-ALLOC — سند قبض/صرف وتوزيعه (المواصفات 6.1–6.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| قبض موزّع على فاتورتين + مقدم | `{"allocations":[{"Amount":"600","DocumentRemaining":"700"},{"Amount":"300","DocumentRemaining":"300"}],"VoucherAmount":"1000","PreviousPartyBalance":"2000"}` | `{"AllocatedTotal":"900.0000","UnallocatedAdvance":"100.0000","PartyRemainingBalance":"1000.0000"}` | `{"AllocatedTotal":"900.0000","UnallocatedAdvance":"100.0000","PartyRemainingBalance":"1000.0000"}` | ✅ | — |
| تخصيص أكبر من متبقي المستند ← مرفوض | `{"allocations":[{"Amount":"800","DocumentRemaining":"700"}],"VoucherAmount":"1000","PreviousPartyBalance":"2000"}` | `{"error":"ALLOCATION_EXCEEDS_REMAINING"}` | `{"error":"ALLOCATION_EXCEEDS_REMAINING"}` | ✅ | — |
| التخصيص أكبر من السند ← مرفوض | `{"allocations":[{"Amount":"700","DocumentRemaining":"700"},{"Amount":"400","DocumentRemaining":"500"}],"VoucherAmount":"1000","PreviousPartyBalance":"0"}` | `{"error":"ALLOCATIONS_EXCEED_VOUCHER"}` | `{"error":"ALLOCATIONS_EXCEED_VOUCHER"}` | ✅ | — |

**قرارات مفتوحة:** المواصفات بتطرح مجموع التخصيصات من الرصيد؛ المقترح يطرح قيمة السند كلها (الجزء غير المخصّص = مقدم بيقلّل الرصيد برضه) — محتاج تأكيد · السماح بالمقدم غير المخصّص لكل نوع سند

## PAYROLL — راتب موظف (المواصفات 7.1)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| راتب بضريبة وتأمينات وسلفة | `{"BasicSalary":"8000","Allowances":"1500","Overtime":"0","Bonuses":"500","IncomeTax":"600","EmployeeInsurance":"1045","Loans":"0","Advances":"1000","ApprovedDeductions":"0"}` | `{"GrossSalary":"10000.0000","NetSalary":"7355.0000"}` | `{"GrossSalary":"10000.0000","NetSalary":"7355.0000"}` | ✅ | — |

**قرارات مفتوحة:** B-46/B-73/B-74 (سياسات الأجور والإجازات والراتب الجزئي) — مانعة للتفعيل

## DAILY-LABOR — مستحقات عامل يومية (المواصفات 7.2)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| أيام بكسور + إضافي (HALF_UP 4 خانات) | `{"WorkedDays":"22.5","DailyRate":"333.33","OvertimeHours":"10","ApprovedHourlyRate":"50","Bonuses":"100","Advances":"1000","Deductions":"50"}` | `{"DailyLaborGross":"7499.9250","OvertimeAmount":"500.0000","DailyLaborNet":"7049.9250"}` | `{"DailyLaborGross":"7499.9250","OvertimeAmount":"500.0000","DailyLaborNet":"7049.9250"}` | ✅ | — |
| 1.5 يوم × 333.33 (الحالي بيقرّب لـ 500) | `{"WorkedDays":"1.5","DailyRate":"333.33","OvertimeHours":"0","ApprovedHourlyRate":"0","Bonuses":"0","Advances":"0","Deductions":"0"}` | `{"DailyLaborGross":"499.9950"}` | `{"DailyLaborGross":"499.9950"}` | ✅ | — |

**قرارات مفتوحة:** B-47 (الصرف فوق المستحق) · حد أدنى صفر لليوم (TR-07) بيتطبّق قبل الجمع

## REMAINING-DUE — المتبقي للعامل أو الموظف (المواصفات 7.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| متبقي عادي | `{"TotalApprovedEntitlements":"5000","PreviousPayments":"3000"}` | `{"RemainingDue":"2000.0000","OverPaid":false}` | `{"RemainingDue":"2000.0000","OverPaid":false}` | ✅ | — |
| مدفوع زيادة ← بيتعلّم | `{"TotalApprovedEntitlements":"1000","PreviousPayments":"1200"}` | `{"RemainingDue":"-200.0000","OverPaid":true}` | `{"RemainingDue":"-200.0000","OverPaid":true}` | ✅ | — |

**قرارات مفتوحة:** B-47: هل المدفوع الزيادة مسموح (سلفة) ولا مرفوض؟

## STOCK-QTY — الرصيد المخزني والمتاح (المواصفات 8.1)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| صرف بالظبط المتاح مسموح | `{"OpeningQty":"100","PostedReceipts":"50","PostedReturnsIn":"5","PostedTransfersIn":"10","PostedIssues":"40","PostedReturnsOut":"2","PostedTransfersOut":"20","ReservedQty":"10","BlockedQty":"3","IssueQuantity":"90"}` | `{"OnHandQty":"103.00000","AvailableQty":"90.00000","IssueAllowed":true}` | `{"OnHandQty":"103.00000","AvailableQty":"90.00000","IssueAllowed":true}` | ✅ | — |
| صرف أكبر من المتاح بـ 0.00001 ← غير مسموح | `{"OpeningQty":"100","PostedReceipts":"50","PostedReturnsIn":"5","PostedTransfersIn":"10","PostedIssues":"40","PostedReturnsOut":"2","PostedTransfersOut":"20","ReservedQty":"10","BlockedQty":"3","IssueQuantity":"90.00001"}` | `{"IssueAllowed":false}` | `{"IssueAllowed":false}` | ✅ | — |

**قرارات مفتوحة:** الكمية «المحظورة» (BlockedQty) مفهوم جديد — مش موجود في قاعدة البيانات (المحجوز موجود)

## MOVING-AVG — متوسط التكلفة المرجّح المتحرك وتكلفة الصرف (المواصفات 8.2)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مثال المراجعة F-09/F-10 | `{"PreviousStockQty":"7","PreviousStockValue":"86.41969","NewReceiptQty":"3","NewReceiptValue":"45.3","IssueQty":"4"}` | `{"NewAverageCost":"13.17197","IssueCost":"52.6879"}` | `{"NewAverageCost":"13.17197","IssueCost":"52.6879"}` | ✅ | — |
| قسمة على صفر ← غير قابل للحساب | `{"PreviousStockQty":"0","PreviousStockValue":"0","NewReceiptQty":"0","NewReceiptValue":"0","IssueQty":"0"}` | `{"NewAverageCost":null,"IssueCost":null}` | `{"NewAverageCost":null,"IssueCost":null}` | ✅ | — |

**قرارات مفتوحة:** المتوسط لكل صنف ولا صنف × مخزن · FIFO / التمييز المحدد: مش مطبّقين — محتاجين سياسة تقييم لكل صنف (وتغييرها لصنف عليه حركات = إجراء محاسبي)

## LANDED-COST — تكلفة استلام المخزون وقيمته (المواصفات 8.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| تكلفة استلام بنقل وتحميل | `{"PurchaseCost":"1000","DirectFreight":"50","DirectAcquisitionCosts":"25","NonRecoverableTaxes":"0","ReceivedQty":"100","OnHandQty":"40","ApplicableUnitCost":"10.75"}` | `{"LandedCost":"1075.0000","UnitLandedCost":"10.75000","InventoryValue":"430.0000"}` | `{"LandedCost":"1075.0000","UnitLandedCost":"10.75000","InventoryValue":"430.0000"}` | ✅ | — |

**قرارات مفتوحة:** مكوّنات التكلفة المباشرة المعتمدة

## PROJECT-MATERIAL — تكلفة مواد المشروع (المواصفات 8.4)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مجموع أذون الصرف المرحّلة للمشروع | `{"issues":[{"IssueCost":"52.6879"},{"IssueCost":"1000"}]}` | `{"ProjectMaterialCost":"1052.6879"}` | `{"ProjectMaterialCost":"1052.6879"}` | ✅ | — |

## EQUIPMENT-COST — تكلفة تشغيل المعدات وتحميلها (المواصفات 9.1–9.4)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| تشغيل + تحميل 40% + إهلاك | `{"FuelCost":"5000","MaintenanceCost":"2000","OperatorCost":"3000","OtherDirectOperatingCosts":"0","ActualOperatingHours":"200","ActualOperatingDays":"25","ProjectHours":"80","AllocatedDepreciation":"1500"}` | `{"EquipmentOperatingCost":"10000.0000","HourlyOperatingCost":"50.0000","DailyOperatingCost":"400.0000","ProjectEquipmentCost":"5500.0000"}` | `{"EquipmentOperatingCost":"10000.0000","HourlyOperatingCost":"50.0000","DailyOperatingCost":"400.0000","ProjectEquipmentCost":"5500.0000"}` | ✅ | — |
| صفر ساعات ← غير قابل للحساب | `{"FuelCost":"100","MaintenanceCost":"0","OperatorCost":"0","OtherDirectOperatingCosts":"0","ActualOperatingHours":"0","ActualOperatingDays":"0","ProjectHours":"0","AllocatedDepreciation":"0"}` | `{"HourlyOperatingCost":null,"DailyOperatingCost":null,"ProjectEquipmentCost":null}` | `{"HourlyOperatingCost":null,"DailyOperatingCost":null,"ProjectEquipmentCost":null}` | ✅ | — |

**قرارات مفتوحة:** B-42 (أساس التحميل: ساعات؟ أيام؟) · B-43 (المعدات كأصول والإهلاك)

## PROJECT-COST — التكلفة الفعلية للمشروع والانحراف (المواصفات 10.1–10.2)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| تجاوز الميزانية | `{"MaterialCost":"8000","LaborCost":"40000","EquipmentCost":"12500","SubcontractorCost":"0","DirectExpenses":"2000","AllocatedIndirectCosts":"0","BudgetedCost":"60000"}` | `{"ActualProjectCost":"62500.0000","CostVariance":"2500.0000","VariancePercentage":"4.1667"}` | `{"ActualProjectCost":"62500.0000","CostVariance":"2500.0000","VariancePercentage":"4.1667"}` | ✅ | — |
| ميزانية صفر ← غير قابل للحساب | `{"MaterialCost":"1","LaborCost":"0","EquipmentCost":"0","SubcontractorCost":"0","DirectExpenses":"0","AllocatedIndirectCosts":"0","BudgetedCost":"0"}` | `{"VariancePercentage":null}` | `{"VariancePercentage":null}` | ✅ | — |

**قرارات مفتوحة:** B-33 (التكاليف غير المباشرة) · ق.م غير القابلة للخصم كتكلفة (TR-10)

## PROJECT-PROFIT — ربحية المشروع (المواصفات 10.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مثال المراجعة F-13 | `{"RecognizedRevenue":"153000","RecognizedProjectCost":"118430.25"}` | `{"GrossProfit":"34569.7500","ProfitMargin":"22.5946"}` | `{"GrossProfit":"34569.7500","ProfitMargin":"22.5946"}` | ✅ | — |
| إيراد صفر | `{"RecognizedRevenue":"0","RecognizedProjectCost":"10"}` | `{"GrossProfit":"-10.0000","ProfitMargin":null}` | `{"GrossProfit":"-10.0000","ProfitMargin":null}` | ✅ | — |

**قرارات مفتوحة:** أساس الاعتراف بالإيراد (EAS 48: المستخلصات المعتمدة؟ نسبة الإنجاز؟)

## PROJECT-EAC — التكلفة المتوقعة عند الإكمال (المواصفات 10.4)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| توقع تجاوز | `{"ActualCostToDate":"62500","EstimatedCostToComplete":"30000","ApprovedBudget":"90000"}` | `{"EstimateAtCompletion":"92500.0000","EstimatedCostVariance":"2500.0000"}` | `{"EstimateAtCompletion":"92500.0000","EstimatedCostVariance":"2500.0000"}` | ✅ | — |

**قرارات مفتوحة:** أساس التكلفة المتوقعة للإكمال ومين بيعتمدها

## CASH-BANK-BALANCE — رصيد الخزينة أو البنك الدفتري (المواصفات 11.1–11.3)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مثال المراجعة F-14 | `{"OpeningBalance":"50000","PostedReceipts":"1130","PostedPayments":"23760","TransfersIn":"0","TransfersOut":"10000"}` | `{"ClosingBalance":"17370.0000"}` | `{"ClosingBalance":"17370.0000"}` | ✅ | — |

**قرارات مفتوحة:** B-52a…f

## BANK-RECON — المطابقة البنكية (المواصفات 11.4)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مطابقة متزنة | `{"StatementBalance":"19270","BookBalance":"17370","UnrecordedBankCredits":"50","UnrecordedBankCharges":"20","OutstandingCheques":"3000","DepositsInTransit":"1130"}` | `{"AdjustedBookBalance":"19270.0000","BankReconciliationDifference":"0.0000","Reconciled":true}` | `{"AdjustedBookBalance":"19270.0000","BankReconciliationDifference":"0.0000","Reconciled":true}` | ✅ | — |
| فرق غير مفسّر | `{"StatementBalance":"19300","BookBalance":"17370","UnrecordedBankCredits":"50","UnrecordedBankCharges":"20","OutstandingCheques":"3000","DepositsInTransit":"1130"}` | `{"BankReconciliationDifference":"30.0000","Reconciled":false}` | `{"BankReconciliationDifference":"30.0000","Reconciled":false}` | ✅ | — |

**قرارات مفتوحة:** B-52f (شكل كشف البنك وقواعد المطابقة)

## JOURNAL-BALANCE — توازن القيد (المواصفات 12.1–12.2)

| الحالة | المدخلات | المتوقع | الفعلي | النتيجة | السبب |
|---|---|---|---|---|---|
| مثال المواصفات 12.2: 114,000 = 114,000 | `{"lines":[{"Debit":"100000","Credit":"0"},{"Debit":"14000","Credit":"0"},{"Debit":"0","Credit":"113000"},{"Debit":"0","Credit":"1000"}]}` | `{"TotalDebit":"114000.0000","TotalCredit":"114000.0000","JournalDifference":"0.0000","CanPost":true}` | `{"TotalDebit":"114000.0000","TotalCredit":"114000.0000","JournalDifference":"0.0000","CanPost":true}` | ✅ | — |
| قيد غير متوازن بـ 0.0001 ← مايترحّلش | `{"lines":[{"Debit":"100","Credit":"0"},{"Debit":"0","Credit":"99.9999"}]}` | `{"JournalDifference":"0.0001","CanPost":false}` | `{"JournalDifference":"0.0001","CanPost":false}` | ✅ | — |
| سطر فيه مدين ودائن ← مرفوض | `{"lines":[{"Debit":"10","Credit":"10"}]}` | `{"error":"INVALID_JOURNAL_LINE"}` | `{"error":"INVALID_JOURNAL_LINE"}` | ✅ | — |

**قرارات مفتوحة:** دليل الحسابات والفترات المالية (B-13…B-19)

