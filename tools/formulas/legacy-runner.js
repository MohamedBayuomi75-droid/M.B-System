// بيشغّل دوال النظام القديم نفسها (renderer/ زي ما هو) في المتصفح على بيانات معيّنة، ويرجّع نتايج المعادلات
// بنفس شكل reference.js — المرحلة 3. مفيش أي تعديل على البيانات: النتايج قراءة بس.
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

/** بيتنفّذ جوه الصفحة: بيستدعي دوال الواجهة القديمة بس */
function inPage(ranges) {
  const out = {};
  const put = (k, id, v) => { (out[k] = out[k] || {})[id] = v; };
  const L = DATA.ledger || {};
  const fixes = new Map(previewInvoiceCalculationFixes().map((f) => [f.id, f]));
  (L.invoices || []).forEach((inv) => {
    const b = Number(inv.baseValue) || 0, v = Number(inv.vat) || 0, s = Number(inv.stampDuty) || 0, w = Number(inv.withheld) || 0;
    const total = roundMoney(b + v + s, 6);
    put('invoice.expectedTotal', inv.id, fixes.has(inv.id) ? fixes.get(inv.id).newTotal : total);
    put('invoice.expectedNet', inv.id, fixes.has(inv.id) ? fixes.get(inv.id).newNet : roundMoney(total - w, 6));
    put('invoice.remaining', inv.id, invoiceRemaining(inv));
    if (!inv.isReturn) { const n = noticeAmountsFor(inv); put('invoice.noticeWithheld', inv.id, n.withheld); put('invoice.noticeBase', inv.id, n.baseValue); }
  });
  (L.suppliers || []).forEach((s) => {
    put('supplier.balance', s.id, supplierBalance(s.id));
    put('supplier.openingAsOfDate', s.id, openingBalanceFor(s.id, ''));
    { const op = Number(openingBalanceFor(s.id, '')) || 0; const rows = statementRows(s.id, '', ''); put('supplier.statementClosing', s.id, rows.length ? Math.round((op + rows[rows.length - 1].balance) * 100) / 100 : op); }
    ranges.forEach((r) => r.from && put('supplier.openingAt:' + r.from, s.id, openingBalanceFor(s.id, r.from)));
  });
  (DATA.workerAttendance || []).forEach((a) => { if (a && a.id) put('attendance.netPay', a.id, attendanceNetPay(a)); });
  for (const r of ranges) {
    const tag = r.label, F = r.from || undefined, T = r.to || undefined;
    (DATA.workers || []).forEach((p) => {
      put(`worker.due@${tag}`, p.id, workerDueAmount(p.id, F, T)); put(`worker.paid@${tag}`, p.id, workerPaidTotal(p.id, F, T));
      put(`worker.penalty@${tag}`, p.id, workerPenaltyTotal(p.id, F, T)); put(`worker.extras@${tag}`, p.id, personExtrasTotal('worker', p.id, F, T));
      put(`worker.expenses@${tag}`, p.id, personExpensesTotal('worker', p.id, F, T)); put(`worker.balance@${tag}`, p.id, workerBalance(p.id, F, T));
    });
    (DATA.drivers || []).forEach((p) => {
      put(`driver.due@${tag}`, p.id, driverDueAmount(p.id, F, T)); put(`driver.paid@${tag}`, p.id, driverPaidTotal(p.id, F, T));
      put(`driver.penalty@${tag}`, p.id, driverPenaltyTotal(p.id, F, T)); put(`driver.extras@${tag}`, p.id, personExtrasTotal('driver', p.id, F, T));
      put(`driver.expenses@${tag}`, p.id, personExpensesTotal('driver', p.id, F, T)); put(`driver.balance@${tag}`, p.id, driverBalance(p.id, F, T));
    });
    (DATA.supervisors || []).forEach((p) => {
      put(`supervisor.due@${tag}`, p.id, supervisorOwnDue(p.id, F, T)); put(`supervisor.paid@${tag}`, p.id, supervisorPaidTotal(p.id, F, T));
      put(`supervisor.penalty@${tag}`, p.id, supervisorPenaltyTotal(p.id, F, T));
    });
    (DATA.employees || []).forEach((e) => { put(`employee.due@${tag}`, e.id, employeeDueAmount(e.id, F, T)); put(`employee.balance@${tag}`, e.id, employeeBalance(e.id, F, T)); });
    (DATA.equipment || []).forEach((e) => put(`equipment.totalCost@${tag}`, e.id, equipmentTotalCost(e.id, F, T)));
    const names = new Set((DATA.projects || []).map((p) => String(p.name || '').trim()).filter(Boolean));
    (DATA.workerAttendance || []).forEach((a) => a && a.project && names.add(String(a.project).trim()));
    (L.invoices || []).forEach((i) => i && i.project && names.add(String(i.project).trim()));
    (DATA.costs || []).forEach((c) => c && c.project && names.add(String(c.project).trim()));
    [...names].forEach((n) => {
      const c = projectCostSummary(n, F, T);
      ['labor', 'equip', 'fuel', 'maint', 'expenses', 'costs', 'suppliers', 'warehouse', 'total'].forEach((k) => put(`project.${k}@${tag}`, n, c[k]));
    });
  }
  (DATA.equipmentDaily || []).forEach((d) => d && d.id && put('equipmentDaily.cost', d.id, equipmentDailyCost(d)));
  const C = DATA.clients || {};
  (C.invoices || []).forEach((inv, i) => put('client.invoiceNet', inv.id || inv.no || String(i), clInvNet(inv)));
  (C.boqs || []).forEach((b, i) => put('client.boqTotal', b.id || String(i), clBoqTotal(b)));
  (C.workSurveys || []).forEach((w, i) => put('client.surveyTotal', w.id || String(i), clSurveyTotal(w.items)));
  (C.contracts || []).forEach((k, i) => put('client.voApproved', k.id || String(i), clVoApprovedSum(k)));
  ((DATA.warehouses && DATA.warehouses.items) || []).forEach((it) => { put('warehouse.stockQty', it.id, whStockQty(it.id)); put('warehouse.stockValue', it.id, whStockValue(it.id)); });
  return out;
}

/**
 * يفتح النظام القديم (وضع الملف، أو الويب لو web=true) بالبيانات، ويرجّع { results, data }
 *  data = DATA بعد ترحيلات التحميل في الواجهة (المرجع بيحسب من نفس النسخة دي)
 */
async function runLegacy(seed, ranges, { web = false } = {}) {
  const H = require(path.join(ROOT, 'tests-merge/harness'));
  const { baseUser } = require(path.join(ROOT, 'tests-merge/lib'));
  const s = JSON.parse(JSON.stringify(seed));
  if (!web) s.users = [baseUser]; else delete s.users;
  const open = web ? H.openWebApp : H.openFileApp;
  const { browser, page, errors } = await open(s);
  try {
    const before = await page.evaluate(() => JSON.stringify(DATA));
    const results = await page.evaluate(inPage, ranges);
    const after = await page.evaluate(() => JSON.stringify(DATA));
    if (before !== after) throw new Error('legacy formulas changed DATA — the run must be read-only');
    return { results, data: JSON.parse(after), errors };
  } finally { await browser.close(); }
}

module.exports = { runLegacy, inPage };
