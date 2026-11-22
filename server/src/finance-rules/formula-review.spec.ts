import { balancedEntry, customerCertificate, issueValue, projectProfit, purchaseInvoice, receiptAverage, supplierBalance, workerDay } from './formula-review.reference';

/**
 * B-20 — اختبارات المقارنة لأمثلة docs/FINANCIAL_FORMULAS_REVIEW.md: الصيغة المقترحة مقابل سلوك البرنامج الحالي
 * (الموثّق في BUSINESS_RULES_AND_FORMULAS.md). النسب هنا **قيم أمثلة** مش نسب معتمدة.
 */
describe('B-20 formula review — proposed vs current (examples in the review document)', () => {
  it('F-01 purchase invoice: computed from lines at 6dp (DEC-0112; current: manual amounts, 6dp)', () => {
    const r = purchaseInvoice({ lines: [{ qty: '10', unitPrice: '125.5' }, { qty: '3.5', unitPrice: '40.12345' }], discountRate: '2', vatRate: '14', whtRate: '1' });
    // القيم متحسبة كمان بشكل مستقل (Python Decimal، 6 خانات HALF_UP) وطلعت نفسها
    expect(r).toEqual({ lineAmounts: ['1255.000000', '140.432075'], gross: '1395.432075', discount: '27.908642', net: '1367.523433', vat: '191.453281', total: '1558.976714', wht: '13.675234', payable: '1545.301480' });
  });

  it('F-03 customer certificate: cumulative (TR-11); current excludes previous works and subtracts the tax %', () => {
    const r = customerCertificate({ previousWorks: '100000', currentWorks: '50000', extras: '5000', excluded: '2000', retentionRate: '5', advanceRecoveryCum: '10000', otherDeductionsCum: '500', previousNet: '90000', vatRate: '14' });
    expect(r).toEqual({ cumGross: '153000.000000', retention: '7650.000000', netCum: '134850.000000', periodGross: '53000.000000', vat: '7420.000000', duePeriod: '44850.000000', duePeriodWithVat: '52270.000000' });
    // السلوك الحالي (clients/pages-invoices.js:6): إجمالي = 50000 + 5000 − 2000 (من غير السابق) − 500 − 10000 − 5% − ضريبة% (0)
    const current = 53000 - 500 - 10000 - 53000 * 0.05;
    expect(current).toBe(39850);
  });

  it('F-05 supplier balance: cancelled = 0, collect adds, unclassified excluded and listed (current: 1916.9)', () => {
    const r = supplierBalance({ opening: '1000', docs: [{ kind: 'invoice', net: '1130' }, { kind: 'invoice', net: '500', cancelled: true }, { kind: 'return', net: '113' }],
      payments: [{ direction: 'pay', amount: '500' }, { direction: 'collect', amount: '100' }, { amount: '0.1' }] });
    expect(r).toEqual({ balance: '1617.000000', unclassified: ['0.100000'] });
    const current = 1000 + 1130 + 500 - 113 - (500 + 100 + 0.1); // ledger/helpers.js:576
    expect(Math.round(current * 10) / 10).toBe(1916.9);
  });

  it('F-08 worker day at 6dp (DEC-0112; current rounds to 2dp: 333.33 × 1.5 → 500)', () => {
    expect(workerDay({ wage: '333.33', factor: '1.5' })).toBe('499.995000');
    expect(workerDay({ wage: '300', factor: '1', deduction: '400' })).toBe('0.000000');
    expect(workerDay({ wage: '300', factor: '0.5' })).toBe('150.000000');
  });

  it('F-09/F-10 receipt average 5dp and issue cost fixed at issue (current: avg 2dp → 13.17, issue 52.68)', () => {
    expect(receiptAverage({ oldQty: '7', oldAvg: '12.34567', qty: '3', unitCost: '15.1' })).toBe('13.17197');
    expect(issueValue({ qty: '4', avgAtIssue: '13.17197' })).toBe('52.687880');
    expect(receiptAverage({ oldQty: '0', oldAvg: '9', qty: '5', unitCost: '11.123456' })).toBe('11.12346');
  });

  it('F-13 project profitability on approved revenue (current: collected − cost)', () => {
    expect(projectProfit({ revenue: '153000', actualCost: '118430.25' })).toEqual({ profit: '34569.750000', marginPct: '22.594608' });
    expect(projectProfit({ revenue: '0', actualCost: '10' }).marginPct).toBeNull();
  });

  it('F-15 double entry: every entry balances exactly', () => {
    // قيد فاتورة F-01: مدين المشتريات 1367.523433 + ضريبة مدخلات 191.453281 / دائن المورد 1558.976714
    expect(balancedEntry([{ debit: '1367.523433', credit: '0' }, { debit: '191.453281', credit: '0' }, { debit: '0', credit: '1558.976714' }])).toMatchObject({ balanced: true });
    expect(balancedEntry([{ debit: '100', credit: '0' }, { debit: '0', credit: '99.999999' }]).balanced).toBe(false);
  });
});
