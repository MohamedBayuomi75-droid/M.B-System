import { Money, MONEY_SCALE } from '../common/money';

/**
 * ⚠️ مرجع مراجعة B-20 بس — **مش متوصّل بأي موديول ولا بيتنفّذ في الإنتاج**.
 * الصيغ المقترحة في docs/FINANCIAL_FORMULAS_REVIEW.md مكتوبة هنا كدوال صافية عشان أمثلة الوثيقة تتختبر بالظبط
 * (6 خانات HALF_UP للمبالغ، 5 خانات للكميات وأسعار الوحدة — B-25/B-26). بعد اعتماد المدير المالي بتتنقل لمحرك القواعد
 * كإصدارات معتمدة، والنسب (الضريبة، الخصم، الاحتجاز…) من أكواد B-21 وبنود العقد — مش من الكود.
 */
const r4 = (x: Money) => x.round(MONEY_SCALE); // خانات المبالغ: 6 (DEC-0112، كانت 4)
const r5 = (x: Money) => x.round(5);
const M = (v: string | number) => Money.of(String(v));

/** F-01 فاتورة مشتريات: سطور ← إجمالي ← خصم تجاري ← صافي ← ضريبة القيمة المضافة (كود B-21) ← إجمالي الفاتورة ← خصم تحت الحساب (كود B-21) ← المستحق للمورد */
export function purchaseInvoice(i: { lines: { qty: string; unitPrice: string }[]; discountRate: string; vatRate: string; whtRate: string; stamp?: string }) {
  const lineAmounts = i.lines.map((l) => r4(M(l.qty).times(l.unitPrice)));
  const gross = Money.sum(lineAmounts);
  const discount = r4(gross.times(i.discountRate).div('100'));
  const net = gross.minus(discount);
  const vat = r4(net.times(i.vatRate).div('100'));
  const stamp = M(i.stamp ?? '0');
  const total = net.plus(vat).plus(stamp);
  const wht = r4(net.times(i.whtRate).div('100'));
  return { lineAmounts: lineAmounts.map((x) => x.toFixed()), gross: gross.toFixed(), discount: discount.toFixed(), net: net.toFixed(), vat: vat.toFixed(), total: total.toFixed(), wht: wht.toFixed(), payable: total.minus(wht).toFixed() };
}

/** F-03 مستخلص عميل تراكمي (TR-11): التراكمي ← المحتجز (بند العقد) ← استرداد الدفعة المقدمة ← استقطاعات ← الصافي التراكمي ← مستحق الفترة */
export function customerCertificate(c: { previousWorks: string; currentWorks: string; extras: string; excluded: string; retentionRate: string; advanceRecoveryCum: string; otherDeductionsCum: string; previousNet: string; vatRate: string }) {
  const cumGross = M(c.previousWorks).plus(c.currentWorks).plus(c.extras).minus(c.excluded);
  const retention = r4(cumGross.times(c.retentionRate).div('100'));
  const netCum = cumGross.minus(retention).minus(c.advanceRecoveryCum).minus(c.otherDeductionsCum);
  const periodGross = M(c.currentWorks).plus(c.extras).minus(c.excluded);
  const vat = r4(periodGross.times(c.vatRate).div('100'));
  const duePeriod = netCum.minus(c.previousNet);
  return { cumGross: cumGross.toFixed(), retention: retention.toFixed(), netCum: netCum.toFixed(), periodGross: periodGross.toFixed(), vat: vat.toFixed(), duePeriod: duePeriod.toFixed(), duePeriodWithVat: duePeriod.plus(vat).toFixed() };
}

/** F-05 رصيد المورد (TR-02/04/05/06): الملغاة صفر، والمرتجع بالسالب، و pay يقلّل، و collect يزوّد، وغير المصنّف مابيدخلش */
export function supplierBalance(b: { opening: string; docs: { kind: 'invoice' | 'return'; net: string; cancelled?: boolean }[]; payments: { direction?: 'pay' | 'collect'; amount: string }[] }) {
  let bal = M(b.opening); const unclassified: string[] = [];
  for (const d of b.docs) if (!d.cancelled) bal = d.kind === 'invoice' ? bal.plus(d.net) : bal.minus(d.net);
  for (const p of b.payments) {
    if (p.direction === 'pay') bal = bal.minus(p.amount);
    else if (p.direction === 'collect') bal = bal.plus(p.amount);
    else unclassified.push(M(p.amount).toFixed());
  }
  return { balance: r4(bal).toFixed(), unclassified };
}

/** F-08 يومية عامل (TR-07): الأجر × معامل الحالة − الخصم، بحد أدنى صفر — 6 خانات */
export function workerDay(d: { wage: string; factor: string; deduction?: string }) {
  const v = r4(M(d.wage).times(d.factor)).minus(d.deduction ?? '0');
  return (v.isNegative() ? Money.zero() : v).toFixed();
}

/** F-09 تكلفة الاستلام (TR-13 / EAS 2 متوسط مرجّح متحرك): سعر الوحدة 5 خانات */
export function receiptAverage(r: { oldQty: string; oldAvg: string; qty: string; unitCost: string }) {
  const oq = M(r.oldQty);
  if (oq.isZero() || oq.isNegative()) return r5(M(r.unitCost)).toFixed(5);
  return r5(oq.times(r.oldAvg).plus(M(r.qty).times(r.unitCost)).div(oq.plus(r.qty))).toFixed(5);
}
/** F-10 تكلفة الصرف (TR-13): المتوسط وقت الصرف بيتثبّت على الحركة */
export function issueValue(i: { qty: string; avgAtIssue: string }) { return r4(M(i.qty).times(i.avgAtIssue)).toFixed(); }

/** F-13 ربحية المشروع: الإيراد (المستخلصات المعتمدة من غير الضريبة) − التكلفة الفعلية، والهامش % */
export function projectProfit(p: { revenue: string; actualCost: string }) {
  const profit = M(p.revenue).minus(p.actualCost);
  const margin = M(p.revenue).isZero() ? null : r4(profit.div(p.revenue).times('100')).toFixed();
  return { profit: profit.toFixed(), marginPct: margin };
}

/** F-15 القيد المزدوج: كل قيد متوازن بالظبط (6 خانات) */
export function balancedEntry(lines: { debit: string; credit: string }[]) {
  const d = Money.sum(lines.map((l) => M(l.debit))), c = Money.sum(lines.map((l) => M(l.credit)));
  return { debit: d.toFixed(), credit: c.toFixed(), balanced: d.eq(c) };
}
