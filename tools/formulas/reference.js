// الحساب المرجعي المستقل للمعادلات المالية — المرحلة 3 (توثيق واختبار، من غير أي تعديل على النظام).
//
// كل دالة هنا بتعيد حساب معادلة من معادلات النظام القديم من **البيانات الخام** بحساب عشري دقيق (decimal.js)،
// بنفس القاعدة ونفس نقاط التقريب الموثّقة في docs/BUSINESS_RULES_AND_FORMULAS.md (والمرجع ملف:سطر عند كل دالة).
// ماينفعش تستدعي أي كود من renderer/ — الاستقلال هو اللي بيخلّي المقارنة ليها معنى.
//
// الناتج: { "<المعادلة>": { "<معرّف>": رقم } } بنفس شكل tools/formulas/legacy-runner.js
'use strict';
const { Dec, D, sum } = require('./decimal');

// ---------- تحويلات JS القديمة (عشان المدخلات تتقرا بنفس الطريقة) ----------
/** Number(x)||0 */
const jsNum = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const N = (x) => D(jsNum(x));
/** core/helpers.js:15 round2 — نصف بعيد عن الصفر لخانتين */
const round2 = (d) => D(d).round(2, 'halfAwayFromZero');
/** core/helpers.js:21 toInt — (الاسم قديم) رقم بخانتين؛ النصوص: أرقام عربية/فواصل بتتشال */
function toInt(v) {
  if (v == null || v === '') return Dec.zero();
  if (typeof v === 'number') return Number.isFinite(v) ? round2(D(v)) : Dec.zero();
  let s = String(v).trim();
  s = s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  s = s.replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/,/g, '').replace(/[^\d.\-]/g, '');
  const x = Number(s);
  if (!Number.isFinite(x)) return Dec.zero();
  return round2(D(x));
}
/** ledger/helpers.js:208 roundMoney — Math.round(x*10^d)/10^d: النص لفوق دايمًا */
const roundMoney = (d, digits = 6) => D(d).round(digits, 'halfCeiling');
const round2c = (d) => D(d).round(2, 'halfCeiling'); // Math.round(x*100)/100
const inRange = (date, from, to) => !((from && (date || '') < from) || (to && (date || '') > to));

function build(DATA) {
  const L = DATA.ledger || {};
  const invoices = L.invoices || [], payments = L.payments || [], suppliers = L.suppliers || [];
  const byId = (arr) => { const m = new Map(); (arr || []).forEach((x) => x && m.set(x.id, x)); return m; };
  const W = byId(DATA.workers), DR = byId(DATA.drivers), SU = byId(DATA.supervisors), EM = byId(DATA.employees), EQ = byId(DATA.equipment);
  const att = DATA.workerAttendance || [];
  const wp = DATA.workerPayments || [];

  // ---------- الحضور (core/helpers.js:224-296) ----------
  const isPayable = (st) => { const s = String(st || '').toLowerCase(); return s !== 'absent' && s !== 'holiday'; };
  function attType(a) {
    if (!a) return 'worker';
    const t = String(a.personType || a.personKind || a.kind || '').toLowerCase();
    if (t === 'worker' || t === 'supervisor' || t === 'driver') return t;
    const id = a.personId || a.workerId || a.driverId || a.supervisorId;
    if (id) { if (W.has(id)) return 'worker'; if (DR.has(id)) return 'driver'; if (SU.has(id)) return 'supervisor'; }
    if (a.driverId && !a.workerId) return 'driver';
    return 'worker';
  }
  const attPid = (a) => (a && (a.personId || a.workerId || a.driverId || a.supervisorId)) || '';
  function dayWage(a, person) {
    if (a && a.dayWage != null && a.dayWage !== '' && Number.isFinite(Number(a.dayWage))) return toInt(a.dayWage);
    const pt = attType(a), pid = attPid(a);
    const w = person || (pt === 'supervisor' ? SU.get(pid) : pt === 'driver' ? DR.get(pid) : W.get(pid));
    return toInt(w && w.dailyWage);
  }
  function daysCredit(a) {
    if (!a || !isPayable(a.status)) return Dec.zero();
    const st = String(a.status || '').toLowerCase();
    let d = Number(a.days);
    if (!Number.isFinite(d) || d <= 0) d = st === 'half' ? 0.5 : 1;
    else if (st === 'half' && d >= 1) d = 0.5;
    return D(d).round(2, 'halfCeiling');
  }
  function netPay(a, person) {
    if (!a || !isPayable(a.status)) return Dec.zero();
    let total = round2(dayWage(a, person).mul(daysCredit(a)));
    const ded = toInt(a.deduction);
    if (ded.gt0()) total = total.sub(ded).max0();
    return toInt(total.toNumber());
  }
  const attOf = (type, id, from, to) => att.filter((a) => a && attType(a) === type && (type === 'worker' ? (a.workerId || a.personId) : attPid(a)) === id && inRange(a.date, from, to));

  // ---------- الدفعات والخصومات والإضافات (core/helpers.js:4103-4200، 6469-6546) ----------
  const isActualPayment = (p) => { if (!p) return false; const t = String(p.type || 'pay'); if (['penalty', 'deduction', 'bonus', 'allowance'].includes(t)) return false; return p.status !== 'accrued'; };
  const isBonus = (p) => p && ['bonus', 'allowance'].includes(String(p.type || ''));
  const belongs = (p, kind, id) => {
    if (kind === 'worker') return p.workerId === id || (p.personType === 'worker' && p.personId === id);
    return p.personType === kind && p.personId === id;
  };
  const paidTotal = (kind, id, from, to) => toInt(sum(wp.filter((p) => p && belongs(p, kind, id) && isActualPayment(p) && inRange(p.date, from, to)), (p) => toInt(p.amount)).toNumber());
  const penaltyTotal = (kind, id, from, to) => toInt(sum(wp.filter((p) => p && belongs(p, kind, id) && (p.type === 'penalty' || p.type === 'deduction') && inRange(p.date, from, to)), (p) => toInt(p.amount)).toNumber());
  const costsTotal = (kind, id, from, to) => toInt(sum((DATA.costs || []).filter((c) => c && c.personKind === kind && c.personId === id && inRange(c.date, from, to)), (c) => toInt(c.amount)).toNumber());
  function extrasTotal(kind, id, from, to) {
    const bon = wp.filter((p) => {
      if (!p || !isBonus(p)) return false;
      const pt = p.personType || (p.workerId ? 'worker' : '');
      const pid = p.personId || p.workerId || '';
      if (kind === 'worker') { if (!(pt === 'worker' || (!p.personType && p.workerId))) return false; if (pid !== id && p.workerId !== id) return false; }
      else if (pt !== kind || pid !== id) return false;
      return inRange(p.date, from, to);
    });
    return toInt(costsTotal(kind, id, from, to).add(sum(bon, (p) => toInt(p.amount || p.extrasAmount))).toNumber());
  }
  function expensesTotal(kind, id, from, to) {
    const list = (DATA.expenses || []).filter((e) => {
      if (!e) return false;
      const pid = e.personId || e.equipmentId || '';
      if (!(pid === id || e.equipmentId === id)) return false;
      const ek = e.personKind || (e.equipmentId ? 'equipment' : '');
      if (kind && ek && ek !== kind) return false;
      return inRange(e.date, from, to);
    });
    return toInt(sum(list, (e) => {
      if (Array.isArray(e.lines) && e.lines.length) return sum(e.lines, (l) => toInt(l.amount));
      if (e.amounts && typeof e.amounts === 'object') return sum(Object.keys(e.amounts), (k) => toInt(e.amounts[k]));
      return toInt(e.amount || e.total || 0);
    }).toNumber());
  }
  const due = (type, id, from, to) => {
    const person = type === 'worker' ? W.get(id) : type === 'driver' ? DR.get(id) : SU.get(id);
    return toInt(sum(attOf(type, id, from, to), (a) => netPay(a, person)).toNumber());
  };
  const balance = (type, id, from, to) => toInt(due(type, id, from, to).add(extrasTotal(type, id, from, to)).sub(paidTotal(type, id, from, to)).sub(penaltyTotal(type, id, from, to)).sub(expensesTotal(type, id, from, to)).toNumber());

  // ---------- الموظفون (core/helpers.js:5010-5070) ----------
  function monthsInRange(from, to) {
    if (!from || !to) return 1;
    const p = (s) => { const m = String(s).match(/^(\d{4})-(\d{1,2})/); return m ? [Number(m[1]), Number(m[2])] : null; };
    const a = p(from), b = p(to);
    if (!a || !b || String(to) < String(from)) return 1;
    return (b[0] - a[0]) * 12 + (b[1] - a[1]) + 1;
  }
  function empAbsentDays(id, from, to) {
    return new Set((DATA.attendance || []).filter((a) => a && a.employeeId === id && inRange(a.date, from, to) && String(a.status || '').toLowerCase() === 'absent').map((a) => a.date || '')).size;
  }
  function employeeDue(id, from, to) {
    const e = EM.get(id); if (!e) return Dec.zero();
    const legacy = (DATA.payroll || []).filter((p) => {
      if (p.employeeId !== id) return false;
      if (from || to) { const ym = p.year != null && p.month != null ? String(p.year) + '-' + String(p.month).padStart(2, '0') : ''; if (ym) { if (from && ym < String(from).slice(0, 7)) return false; if (to && ym > String(to).slice(0, 7)) return false; } }
      return true;
    });
    const legacySum = toInt(sum(legacy, (p) => toInt(p.netSalary || p.net || p.paid)).toNumber());
    if (!legacySum.isZero()) return legacySum;
    const salary = toInt(e.salary || e.basicSalary);
    if (salary.isZero()) return Dec.zero();
    let f = from, t = to;
    const hire = String(e.hireDate || '').slice(0, 10), res = String(e.resignedAt || '').slice(0, 10);
    if (f && t) { if (hire && hire > f) f = hire; if (res && res < t) t = res; if (f > t) return Dec.zero(); }
    let d = salary.mul(monthsInRange(f, t));
    if (String((DATA.settings || {}).employeeSalaryMode || 'fixed') === 'deductAbsence') {
      const wdm = Number((DATA.settings || {}).workDaysPerMonth) || 26;
      d = d.sub(round2(salary.div(wdm).mul(empAbsentDays(id, f, t)))).max0();
    }
    return round2(d);
  }
  function employeeBalance(id, from, to) {
    const base = EM.get(id) ? employeeDue(id, from, to) : Dec.zero();
    const pen = toInt(sum((DATA.employeePenalties || []).filter((p) => p.employeeId === id && inRange(p.date, from, to)), (p) => toInt(p.amount)).toNumber());
    return toInt(base.add(extrasTotal('employee', id, from, to)).sub(paidTotal('employee', id, from, to)).sub(pen).sub(expensesTotal('employee', id, from, to)).toNumber());
  }

  // ---------- المعدات (core/helpers.js:7778) ----------
  function equipDailyCost(log, eq) {
    if (!log) return Dec.zero();
    eq = eq || EQ.get(log.equipmentId);
    let days = Number(log.days); if (!Number.isFinite(days) || days < 0) days = 0;
    let hours = Number(log.hours); if (!Number.isFinite(hours) || hours < 0) hours = 0;
    if (log.cost != null && log.cost !== '' && Number.isFinite(Number(log.cost))) return toInt(log.cost);
    const dailyRate = toInt(log.dailyCost != null ? log.dailyCost : eq && eq.dailyCost);
    const hourRate = toInt(log.hourlyCost != null ? log.hourlyCost : eq && (eq.hourlyCost || eq.hourRate));
    let total = Dec.zero();
    if (days > 0 && dailyRate.gt0()) total = total.add(round2(D(days).mul(dailyRate)));
    else if (hours > 0 && hourRate.gt0()) total = total.add(round2(D(hours).mul(hourRate)));
    else if (days > 0 && hourRate.gt0()) total = total.add(round2(D(days).mul(8).mul(hourRate)));
    else if (hours > 0 && dailyRate.gt0()) total = total.add(round2(D(hours).div(8).mul(dailyRate)));
    const fuel = jsNum(log.fuelLiters);
    const fuelPrice = toInt(log.fuelPrice != null && log.fuelPrice !== '' ? log.fuelPrice : eq && (eq.fuelPrice != null && eq.fuelPrice !== '' ? eq.fuelPrice : eq.fuelPricePerLiter));
    if (fuel > 0 && fuelPrice.gt0()) total = total.add(round2(D(fuel).mul(fuelPrice)));
    return toInt(total.toNumber());
  }

  // ---------- الموردون (ledger/helpers.js:143، 576، 590، 606، 741؛ statement.js:43) ----------
  const signedNet = (i) => N(i.netInvoice || 0).mul(i.isReturn ? -1 : 1);
  const paidByInvoice = new Map();
  payments.forEach((p) => { if (p && p.invoiceId) paidByInvoice.set(p.invoiceId, (paidByInvoice.get(p.invoiceId) || Dec.zero()).add(N(p.amount || 0))); });

  // ---------- المشروعات (core/helpers.js:7816، 7894) ----------
  function supplyLines(name, from, to) {
    const stocked = new Set(((DATA.warehouses && DATA.warehouses.movements) || []).filter((m) => m && (m.type === 'in' || m.type === 'adjust_in') && m.supplierInvoiceId).map((m) => m.supplierInvoiceId));
    let suppliersAmt = Dec.zero(), whAmt = Dec.zero();
    invoices.forEach((inv) => {
      if (!inv || inv.cancelled || String(inv.project || '').trim() !== name || stocked.has(inv.id) || !inRange(inv.date, from, to)) return;
      suppliersAmt = suppliersAmt.add(N(inv.totalInvoice || 0).mul(inv.isReturn ? -1 : 1));
    });
    const items = (DATA.warehouses && DATA.warehouses.items) || [];
    ((DATA.warehouses && DATA.warehouses.movements) || []).forEach((m) => {
      if (!m || m.type !== 'out' || String(m.project || '').trim() !== name || !inRange(m.date, from, to)) return;
      const it = items.find((x) => x.id === m.itemId) || {};
      const unit = m.unitCost != null && m.unitCost !== '' ? N(m.unitCost) : (jsNum(it.avgCost) ? N(it.avgCost) : N(it.lastCost));
      whAmt = whAmt.add(round2c(N(m.qty).mul(unit)));
    });
    return { suppliers: suppliersAmt, warehouse: whAmt };
  }
  function projectCost(name, from, to) {
    const m = (x) => String((x && x.project) || '').trim() === name;
    let labor = sum(att.filter((a) => m(a) && inRange(a.date, from, to)), (a) => netPay(a));
    let equip = sum((DATA.equipmentDaily || []).filter((d) => m(d) && inRange(d.date, from, to)), (d) => equipDailyCost(d, EQ.get(d.equipmentId)));
    let fuel = sum((DATA.fuelLogs || []).filter((f) => m(f) && inRange(f.date, from, to)), (f) => toInt(f.cost));
    let maint = sum((DATA.equipmentLogs || []).filter((l) => m(l) && inRange(l.date, from, to)), (l) => toInt(l.cost));
    (DATA.projectDaily || []).filter((pd) => m(pd) && inRange(pd.date, from, to)).forEach((pd) => { labor = labor.add(toInt(pd.laborCost)); equip = equip.add(toInt(pd.equipCost)); fuel = fuel.add(toInt(pd.fuelCost)); });
    const expenses = toInt(sum((DATA.expenses || []).filter((e) => e && m(e) && inRange(e.date, from, to)), (e) => toInt(e.amount)).toNumber());
    const costs = toInt(sum((DATA.costs || []).filter((c) => c && m(c) && inRange(c.date, from, to)), (c) => toInt(c.amount)).toNumber());
    labor = toInt(labor.toNumber()); equip = toInt(equip.toNumber()); fuel = toInt(fuel.toNumber()); maint = toInt(maint.toNumber());
    const sl = supplyLines(name, from, to);
    const suppliers = toInt(sl.suppliers.toNumber()), warehouse = toInt(sl.warehouse.toNumber());
    const total = toInt(labor.add(equip).add(fuel).add(maint).add(expenses).add(costs).add(suppliers).add(warehouse).toNumber());
    return { labor, equip, fuel, maint, expenses, costs, suppliers, warehouse, total };
  }

  return {
    toInt, round2, roundMoney, netPay, dayWage, daysCredit, attType,
    invoiceExpected(inv) {
      const total = roundMoney(N(inv.baseValue).add(N(inv.vat)).add(N(inv.stampDuty)), 6);
      return { total, net: roundMoney(total.sub(N(inv.withheld)), 6) };
    },
    invoiceRemaining(inv) {
      if (!inv || inv.isReturn || inv.cancelled) return Dec.zero();
      return N(inv.netInvoice || 0).sub(paidByInvoice.get(inv.id) || Dec.zero());
    },
    supplierBalance(sid) {
      const s = suppliers.find((x) => x.id === sid);
      return N((s && s.openingBalance) || 0)
        .add(sum(invoices.filter((i) => i.supplierId === sid), signedNet))
        .sub(sum(payments.filter((p) => p.supplierId === sid), (p) => N(p.amount || 0)));
    },
    openingBalanceFor(sid, from) {
      const s = suppliers.find((x) => x.id === sid);
      let bal = N((s && s.openingBalance) || 0);
      const cut = from || ((s && s.openingBalanceDate) || '');
      if (cut) {
        invoices.filter((i) => i.supplierId === sid && i.date && i.date < cut).forEach((i) => { bal = bal.add(signedNet(i)); });
        payments.filter((p) => p.supplierId === sid && p.date && p.date < cut).forEach((p) => { bal = bal.sub(N(p.amount || 0)); });
      }
      return bal;
    },
    /** ledger/statement.js:3 — كشف الحساب: الفاتورة الملغاة مش بتظهر، المرتجع بيظهر مدين، الدفعة (>0) مدين؛ رصيد متحرك بتقريب خانتين كل سطر */
    statementClosing(sid) {
      const op = this.openingBalanceFor(sid, '');
      const ev = [];
      invoices.filter((i) => i.supplierId === sid).forEach((i) => {
        const amt = round2c(N(i.netInvoice));
        if (i.isReturn) ev.push({ date: i.date || '', t: 1, id: i.id, v: amt.neg() });
        else if (!i.cancelled) ev.push({ date: i.date || '', t: 0, id: i.id, v: amt });
      });
      payments.filter((p) => p.supplierId === sid).forEach((p) => { const amt = round2c(N(p.amount)); if (amt.gt0()) ev.push({ date: p.date || '', t: 2, id: p.id, v: amt.neg() }); });
      if (!ev.length) return op;
      ev.sort((a, b) => a.date.localeCompare(b.date) || a.t - b.t || String(a.id).localeCompare(String(b.id)));
      let run = Dec.zero();
      ev.forEach((e) => { run = round2c(run.add(e.v)); });
      return round2c(op.add(run));
    },
    noticeAmounts(inv) {
      let withheld = N(inv.withheld || 0), baseValue = N(inv.baseValue || 0);
      if (inv.isReturn) return { withheld, baseValue };
      const rets = invoices.filter((i) => i.isReturn && i.linkedInvoiceId === inv.id);
      if (rets.length) {
        withheld = round2c(withheld.sub(sum(rets, (r) => N(r.withheld || 0)))).max0();
        baseValue = round2c(baseValue.sub(sum(rets, (r) => N(r.baseValue || 0)))).max0();
      }
      return { withheld, baseValue };
    },
    due, balance, paidTotal, penaltyTotal, extrasTotal, expensesTotal, employeeDue, employeeBalance, equipDailyCost,
    equipTotalCost(id, from, to) { const eq = EQ.get(id); return toInt(sum((DATA.equipmentDaily || []).filter((d) => d.equipmentId === id && inRange(d.date, from, to)), (d) => equipDailyCost(d, eq)).toNumber()); },
    projectCost,
    // ---------- العملاء (clients/*) ----------
    clInvNet(inv) {
      const gross = N(inv.value).add(N(inv.extras)).sub(N(inv.excluded));
      const retention = gross.mul(N(inv.retentionPct).div(100));
      const tax = gross.mul(N(inv.taxPct).div(100));
      return round2c(gross.sub(N(inv.deductions)).sub(N(inv.advanceDeduct)).sub(retention).sub(tax));
    },
    boqItemTotal(it) { const qty = N(it.qty != null ? it.qty : it.contractQty); const price = N(it.price != null ? it.price : it.unitPrice); return round2c(qty.mul(price)); },
    boqTotal(b) { const items = b.items || []; if (!items.length) return N(b.total); return sum(items, (it) => this.boqItemTotal(it)); },
    surveyItem(it) {
      const method = it.method || 'يدوي';
      let qty = N(it.qty);
      const L = N(it.length), Wd = N(it.width), H = N(it.height), C = jsNum(it.count) || 1;
      if (method === 'حجم') { if (!L.isZero() || !Wd.isZero() || !H.isZero()) qty = L.mul(Wd).mul(H).mul(C); }
      else if (method === 'مساحة') { if (!L.isZero() || !Wd.isZero()) qty = L.mul(Wd).mul(C); }
      else if (method === 'طول') { if (!L.isZero()) qty = L.mul(C); }
      else if (method === 'عدد') qty = jsNum(it.count) ? N(it.count) : N(it.qty);
      qty = qty.round(3, 'halfCeiling');
      return { qty, total: round2c(qty.mul(N(it.price))) };
    },
    surveyTotal(items) { return sum(items || [], (it) => (it.isHeader ? Dec.zero() : this.surveyItem(it).total)); },
    voApproved(k) { return sum(k.changeOrders || [], (v) => (v.status === 'معتمد' ? N(v.amount) : Dec.zero())); },
    contractRetained(c, contractId) {
      return round2c(sum((c.invoices || []).filter((inv) => inv.contractId === contractId), (inv) => N(inv.value).add(N(inv.extras)).sub(N(inv.excluded)).mul(N(inv.retentionPct).div(100))));
    },
    whStockQty(itemId) {
      let q = Dec.zero();
      ((DATA.warehouses && DATA.warehouses.movements) || []).forEach((m) => {
        if (!m || m.itemId !== itemId) return;
        if (m.type === 'in' || m.type === 'adjust_in') q = q.add(N(m.qty));
        else if (m.type === 'out' || m.type === 'adjust_out') q = q.sub(N(m.qty));
      });
      return q.round(3, 'halfCeiling');
    },
    whStockValue(itemId) {
      const it = ((DATA.warehouses && DATA.warehouses.items) || []).find((x) => x.id === itemId);
      const cost = it ? (jsNum(it.avgCost) ? N(it.avgCost) : N(it.lastCost)) : Dec.zero();
      return round2c(this.whStockQty(itemId).mul(cost));
    },
  };
}

/** كل النواتج المقارَنة — نفس المفاتيح اللي legacy-runner بيطلّعها */
function computeAll(DATA, ranges) {
  const R = build(DATA);
  const out = {};
  const put = (k, id, v) => { (out[k] = out[k] || {})[id] = v instanceof Dec ? v.toNumber() : v; };
  const L = DATA.ledger || {};
  (L.invoices || []).forEach((inv) => {
    const e = R.invoiceExpected(inv);
    put('invoice.expectedTotal', inv.id, e.total); put('invoice.expectedNet', inv.id, e.net);
    put('invoice.remaining', inv.id, R.invoiceRemaining(inv));
    if (!inv.isReturn) { const n = R.noticeAmounts(inv); put('invoice.noticeWithheld', inv.id, n.withheld); put('invoice.noticeBase', inv.id, n.baseValue); }
  });
  (L.suppliers || []).forEach((s) => {
    put('supplier.balance', s.id, R.supplierBalance(s.id));
    put('supplier.openingAsOfDate', s.id, R.openingBalanceFor(s.id, ''));
    put('supplier.statementClosing', s.id, R.statementClosing(s.id));
    ranges.forEach((r) => r.from && put('supplier.openingAt:' + r.from, s.id, R.openingBalanceFor(s.id, r.from)));
  });
  (DATA.workerAttendance || []).forEach((a) => { if (a && a.id) put('attendance.netPay', a.id, R.netPay(a)); });
  for (const r of ranges) {
    const tag = r.label;
    for (const [kind, list] of [['worker', DATA.workers], ['driver', DATA.drivers], ['supervisor', DATA.supervisors]]) {
      (list || []).forEach((p) => {
        put(`${kind}.due@${tag}`, p.id, R.due(kind, p.id, r.from, r.to));
        put(`${kind}.paid@${tag}`, p.id, R.paidTotal(kind, p.id, r.from, r.to));
        put(`${kind}.penalty@${tag}`, p.id, R.penaltyTotal(kind, p.id, r.from, r.to));
        if (kind !== 'supervisor') {
          put(`${kind}.extras@${tag}`, p.id, R.extrasTotal(kind, p.id, r.from, r.to));
          put(`${kind}.expenses@${tag}`, p.id, R.expensesTotal(kind, p.id, r.from, r.to));
          put(`${kind}.balance@${tag}`, p.id, R.balance(kind, p.id, r.from, r.to));
        }
      });
    }
    (DATA.employees || []).forEach((e) => { put(`employee.due@${tag}`, e.id, R.employeeDue(e.id, r.from, r.to)); put(`employee.balance@${tag}`, e.id, R.employeeBalance(e.id, r.from, r.to)); });
    (DATA.equipment || []).forEach((e) => put(`equipment.totalCost@${tag}`, e.id, R.equipTotalCost(e.id, r.from, r.to)));
    const names = new Set((DATA.projects || []).map((p) => String(p.name || '').trim()).filter(Boolean));
    (DATA.workerAttendance || []).forEach((a) => a && a.project && names.add(String(a.project).trim()));
    (L.invoices || []).forEach((i) => i && i.project && names.add(String(i.project).trim()));
    (DATA.costs || []).forEach((c) => c && c.project && names.add(String(c.project).trim()));
    [...names].forEach((n) => { const c = R.projectCost(n, r.from, r.to); Object.entries(c).forEach(([k, v]) => put(`project.${k}@${tag}`, n, v)); });
  }
  (DATA.equipmentDaily || []).forEach((d) => d && d.id && put('equipmentDaily.cost', d.id, R.equipDailyCost(d)));
  const C = DATA.clients || {};
  (C.invoices || []).forEach((inv, i) => put('client.invoiceNet', inv.id || inv.no || String(i), R.clInvNet(inv)));
  (C.boqs || []).forEach((b, i) => put('client.boqTotal', b.id || String(i), R.boqTotal(b)));
  (C.workSurveys || []).forEach((w, i) => put('client.surveyTotal', w.id || String(i), R.surveyTotal(w.items)));
  (C.contracts || []).forEach((k, i) => put('client.voApproved', k.id || String(i), R.voApproved(k)));
  ((DATA.warehouses && DATA.warehouses.items) || []).forEach((it) => { put('warehouse.stockQty', it.id, R.whStockQty(it.id)); put('warehouse.stockValue', it.id, R.whStockValue(it.id)); });
  return out;
}

module.exports = { build, computeAll, toInt, round2, roundMoney };
