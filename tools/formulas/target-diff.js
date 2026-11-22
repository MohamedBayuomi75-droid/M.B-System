// الفروق المالية: السلوك الحالي (reference.js = مطابق للنظام القديم) ↔ القواعد المعتمدة (target.js) — قراءة بس.
//   DATA_JSON=<نسخة خارج المستودع> REVIEW_OUT=<مجلد خارج المستودع> node tools/formulas/target-diff.js
// بيطبع ملخص (أعداد ومجاميع من غير أسماء) — وبيكتب قوائم المراجعة التفصيلية في REVIEW_OUT (فيها معرّفات؛ ممنوع ترفع).
// مابيعدّلش أي بيانات.
'use strict';
const fs = require('fs');
const path = require('path');
const { build } = require('./reference');
const T = require('./target');
const { Dec } = require('./decimal');

function main() {
  const DATA = JSON.parse(fs.readFileSync(process.env.DATA_JSON, 'utf8'));
  const R = build(DATA);
  const L = DATA.ledger || {};
  const out = { generatedAt: new Date().toISOString(), suppliers: {}, payments: {}, invoices: {}, attendance: {}, rounding: {} };
  const review = {};

  // الموردين: الرصيد الحالي ↔ المعتمد، والكشف الحالي ↔ المعتمد
  let changed = 0, totalAbs = Dec.zero(), stmtFixed = 0;
  review.supplierBalance = [];
  for (const s of L.suppliers || []) {
    const cur = R.supplierBalance(s.id), curSt = R.statementClosing(s.id);
    const tg = T.supplierLedger(DATA, s.id);
    const d = tg.balance.sub(cur);
    if (d.round(2).cmp(0) !== 0) { changed++; totalAbs = totalAbs.add(d.cmp(0) < 0 ? d.neg() : d); review.supplierBalance.push({ supplierId: s.id, current: cur.toString(), target: tg.balance.toString(), diff: d.toString(), unclassifiedPayments: tg.unclassified.length }); }
    if (curSt.sub(cur).round(2).cmp(0) !== 0) stmtFixed++;
  }
  out.suppliers = { count: (L.suppliers || []).length, balanceChanged: changed, totalAbsChange: totalAbs.round(2).toString(), statementMismatchesToday: stmtFixed, statementMismatchesAfter: 0 };

  // الدفعات: الاتجاه والتخصيص
  const pays = L.payments || [];
  const noDir = pays.filter((p) => p.direction !== 'pay' && p.direction !== 'collect');
  const unalloc = pays.filter((p) => !p.invoiceId && !Array.isArray(p.allocations));
  out.payments = { total: pays.length, withoutDirection: noDir.length, withoutDirectionAmount: noDir.reduce((s, p) => s + (Number(p.amount) || 0), 0).toFixed(2), unallocated: unalloc.length, unallocatedAmount: unalloc.reduce((s, p) => s + (Number(p.amount) || 0), 0).toFixed(2) };
  review.paymentsWithoutDirection = noDir.map((p) => ({ paymentId: p.id, paymentNo: p.paymentNo, date: p.date, amount: p.amount }));
  review.paymentsUnallocated = unalloc.map((p) => ({ paymentId: p.id, supplierId: p.supplierId, date: p.date, amount: p.amount }));

  // الفواتير: الإلغاء التلقائي، المرتجعات غير المربوطة، من غير تاريخ استحقاق
  const inv = L.invoices || [];
  const autoCancel = inv.filter((i) => i.cancelled && T.invoiceState(i, inv) === 'fullyReturned');
  const unlinkedRet = inv.filter((i) => i.isReturn && !i.linkedInvoiceId);
  review.returnLinkCandidates = unlinkedRet.map((r) => ({ returnId: r.id, supplierId: r.supplierId, date: r.date, net: r.netInvoice, candidates: inv.filter((i) => !i.isReturn && i.supplierId === r.supplierId && Number(i.netInvoice) >= Number(r.netInvoice) - 0.01 && (!r.date || !i.date || i.date <= r.date)).map((i) => i.id) }));
  out.invoices = {
    total: inv.length, autoCancelledByFullReturn: autoCancel.length, explicitCancelled: inv.filter((i) => i.cancelled && T.invoiceState(i, inv) === 'cancelled').length,
    unlinkedReturns: unlinkedRet.length, unlinkedReturnsWithOneCandidate: review.returnLinkCandidates.filter((c) => c.candidates.length === 1).length,
    withoutDueDate: inv.filter((i) => !i.isReturn && !i.cancelled && !i.dueDate).length,
  };
  review.autoCancelledByFullReturn = autoCancel.map((i) => ({ invoiceId: i.id, net: i.netInvoice }));

  // اليوميات
  const ar = T.attendanceReview(DATA);
  const curDue = (DATA.workerAttendance || []).reduce((s, a) => s.add(R.netPay(a)), Dec.zero());
  out.attendance = { records: (DATA.workerAttendance || []).length, counted: ar.counted.length, duplicatesSameProject: ar.duplicates.length, orphans: ar.orphans.length, needsPolicy: ar.needsPolicy.length, currentTotal: curDue.round(2).toString(), targetTotal: ar.total.round(2).toString(), diff: ar.total.sub(curDue).round(2).toString() };
  review.attendanceDuplicates = ar.duplicates; review.attendanceOrphans = ar.orphans; review.attendanceNeedsPolicy = ar.needsPolicy;
  review.attendanceZeroWage = (DATA.workerAttendance || []).filter((a) => !(Number(a.dayWage) > 0)).map((a) => a.id);
  out.attendance.zeroWage = review.attendanceZeroWage.length;

  // التقريب لست خانات (DEC-0112): قيم مخزّنة بأكتر من 6 خانات
  const fields = ['baseValue', 'vat', 'stampDuty', 'withheld', 'totalInvoice', 'netInvoice', 'unitPrice'];
  let n = 0, sumDiff = Dec.zero(); const byField = {};
  for (const i of inv) for (const f of fields) {
    const v = i[f]; if (v === '' || v == null) continue;
    const x = Number(String(v).replace(/,/g, '')); if (!Number.isFinite(x)) continue;
    const exact = Dec.of(x), r = T.qm(x);
    if (exact.cmp(r) !== 0) { n++; byField[f] = (byField[f] || 0) + 1; sumDiff = sumDiff.add(r.sub(exact)); }
  }
  out.rounding = { valuesAffected: n, byField, netEffectOnStoredValues: sumDiff.toString() };
  out.numbering = { payments: pays.length, minNo: Math.min(...pays.map((p) => Number(p.paymentNo) || 0)), maxNo: Math.max(...pays.map((p) => Number(p.paymentNo) || 0)), missingNumbers: Math.max(...pays.map((p) => Number(p.paymentNo) || 0)) - new Set(pays.map((p) => p.paymentNo)).size };

  if (process.env.REVIEW_OUT) {
    fs.mkdirSync(process.env.REVIEW_OUT, { recursive: true });
    for (const [k, v] of Object.entries(review)) fs.writeFileSync(path.join(process.env.REVIEW_OUT, k + '.json'), JSON.stringify(v, null, 1));
    fs.writeFileSync(path.join(process.env.REVIEW_OUT, 'summary.json'), JSON.stringify(out, null, 1));
  }
  console.log(JSON.stringify(out, null, 1));
}
main();
