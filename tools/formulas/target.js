// القواعد المعتمدة للنظام الجديد (قرارات المستخدم 2026-11-17، الـ 13 بند) — مواصفة تنفيذية قابلة للاختبار.
// ده مش كود النظام الشغال: النظام القديم مابيتعدّلش. ده المرجع اللي موديولات المرحلة 6 لازم تطابقه،
// واللي بنقيس بيه الفروق المالية مع السلوك الحالي قبل أي ترحيل (docs/DATA_REMEDIATION_PLAN.md).
// المواصفة المكتوبة: docs/TARGET_BUSINESS_RULES.md (رقم كل قاعدة TR-xx هناك).
'use strict';
const { Dec, D, sum } = require('./decimal');

/** TR-01/TR-12 + DEC-0112: كل المبالغ NUMERIC بست خانات (كانت 4)، والتقريب HALF_UP للموجب والسالب (النص بعيد عن الصفر) */
const qm = (x) => D(x).round(6, 'halfAwayFromZero'); // خانات المبالغ: 6 (DEC-0112، كانت 4)
const num = (x) => { if (x == null || x === '') return Dec.zero(); if (typeof x === 'string' && /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/.test(x.replace(/,/g, ''))) return qm(D(x.replace(/,/g, '').trim())); const n = Number(String(x).replace(/,/g, '')); return Number.isFinite(n) ? qm(D(n)) : Dec.zero(); };

class PolicyRequired extends Error { constructor(what) { super('POLICY_REQUIRED: ' + what); this.code = 'POLICY_REQUIRED'; this.what = what; } }

// ---------------------------------------------------------------- الموردين
/**
 * TR-02 الإلغاء: الفاتورة الملغاة (cancelled بقرار صريح) أثرها المالي صفر، وسجلها محفوظ ويظهر في الكشف «ملغاة» بقيمة 0.
 * TR-03 المرتجع: حركة مستقلة مرتبطة بالفاتورة الأصلية؛ «مرتجع كامل» ≠ إلغاء — الفاتورة تفضل قائمة والمرتجع يعادلها.
 *        (لذلك العلامة cancelled اللي النظام القديم بيحطها تلقائيًا عند المرتجع الكامل بتتعامل هنا كـ fullyReturned، مش إلغاء.)
 * TR-05 الاتجاه: pay = الشركة سددت للمورد (يقلل اللي علينا) · collect = الشركة حصّلت من المورد (يزوّد اللي علينا / يقلل اللي لينا).
 *        دفعة من غير اتجاه = «غير مصنفة» ومش بتتحسب لحد ما تتصنّف (قائمة مراجعة) — ممنوع الافتراض.
 */
function invoiceState(inv, invoices) {
  if (inv.isReturn) return 'return';
  if (!inv.cancelled) return 'active';
  const rets = invoices.filter((r) => r.isReturn && r.linkedInvoiceId === inv.id);
  const retNet = sum(rets, (r) => num(r.netInvoice));
  // إلغاء تلقائي من النظام القديم بسبب مرتجع كامل (≥ الصافي − 0.02) = مرتجع كامل مش إلغاء
  if (rets.length && retNet.cmp(num(inv.netInvoice).sub('0.02')) >= 0 && !inv.cancelledByUser) return 'fullyReturned';
  return 'cancelled';
}

function supplierLedger(DATA, sid) {
  const L = DATA.ledger || {};
  const invoices = (L.invoices || []).filter((i) => i.supplierId === sid);
  const payments = (L.payments || []).filter((p) => p.supplierId === sid);
  const s = (L.suppliers || []).find((x) => x.id === sid) || {};
  const events = [];
  for (const inv of invoices) {
    const st = invoiceState(inv, L.invoices || []);
    const net = num(inv.netInvoice);
    if (st === 'return') events.push({ kind: 'return', id: inv.id, date: inv.date || '', debit: net, credit: Dec.zero(), linkedTo: inv.linkedInvoiceId || null });
    else if (st === 'cancelled') events.push({ kind: 'cancelled', id: inv.id, date: inv.date || '', debit: Dec.zero(), credit: Dec.zero(), info: net });
    else events.push({ kind: 'invoice', id: inv.id, date: inv.date || '', debit: Dec.zero(), credit: net, fullyReturned: st === 'fullyReturned' });
  }
  const unclassified = [];
  for (const p of payments) {
    const a = num(p.amount);
    if (p.direction === 'pay') events.push({ kind: 'pay', id: p.id, date: p.date || '', debit: a, credit: Dec.zero() });
    else if (p.direction === 'collect') events.push({ kind: 'collect', id: p.id, date: p.date || '', debit: Dec.zero(), credit: a });
    else unclassified.push({ id: p.id, amount: a });
  }
  const order = { invoice: 0, cancelled: 0, return: 1, pay: 2, collect: 2 };
  events.sort((x, y) => x.date.localeCompare(y.date) || order[x.kind] - order[y.kind] || String(x.id).localeCompare(String(y.id)));
  const opening = num(s.openingBalance);
  let run = opening;
  for (const e of events) { run = run.add(e.credit).sub(e.debit); e.balance = run; }
  // TR-04 الرصيد والكشف من نفس الحركات ⇒ الختامي = الرصيد دايمًا
  return { opening, events, balance: run, unclassified, unclassifiedTotal: sum(unclassified, (u) => u.amount) };
}

/**
 * TR-06 التخصيص: الدفعة (pay) ليها allocations[{invoiceId, amount}] — جزئي أو موزّع على أكتر من فاتورة.
 *   متبقي الفاتورة = الصافي − مرتجعاتها المرتبطة − المخصّص ليها (الملغاة = 0).
 *   غير المخصّص للدفعة = مبلغها − مجموع تخصيصاتها، ولازم يظهر.
 *   البيانات القديمة: invoiceId على الدفعة = تخصيص بكامل المبلغ؛ غير كده الدفعة كلها «غير مخصّصة» (من غير تخصيص تلقائي).
 */
function allocationsOf(p) {
  if (Array.isArray(p.allocations)) return p.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: num(a.amount) }));
  if (p.invoiceId) return [{ invoiceId: p.invoiceId, amount: num(p.amount) }];
  return [];
}
function allocationReport(DATA, sid) {
  const L = DATA.ledger || {};
  const invoices = (L.invoices || []).filter((i) => i.supplierId === sid && !i.isReturn);
  const pays = (L.payments || []).filter((p) => p.supplierId === sid && p.direction !== 'collect');
  const allocatedTo = new Map();
  const errors = [];
  const paymentRows = pays.map((p) => {
    const al = allocationsOf(p);
    const allocated = sum(al, (a) => a.amount);
    if (allocated.cmp(num(p.amount)) > 0) errors.push({ code: 'OVER_ALLOCATED_PAYMENT', paymentId: p.id });
    al.forEach((a) => allocatedTo.set(a.invoiceId, (allocatedTo.get(a.invoiceId) || Dec.zero()).add(a.amount)));
    return { id: p.id, amount: num(p.amount), allocated, unallocated: num(p.amount).sub(allocated) };
  });
  const invoiceRows = invoices.map((inv) => {
    const st = invoiceState(inv, L.invoices || []);
    const returned = sum((L.invoices || []).filter((r) => r.isReturn && r.linkedInvoiceId === inv.id), (r) => num(r.netInvoice));
    const allocated = allocatedTo.get(inv.id) || Dec.zero();
    const outstanding = st === 'cancelled' ? Dec.zero() : num(inv.netInvoice).sub(returned).sub(allocated);
    if (outstanding.cmp(0) < 0) errors.push({ code: 'OVER_ALLOCATED_INVOICE', invoiceId: inv.id });
    return { id: inv.id, state: st, net: num(inv.netInvoice), returned, allocated, outstanding, dueDate: inv.dueDate || null };
  });
  return { paymentRows, invoiceRows, unallocatedTotal: sum(paymentRows, (r) => r.unallocated), errors };
}

// ---------------------------------------------------------------- الحضور واليوميات
/**
 * TR-07 حالات الحضور: الأجر بمعامل صريح لكل حالة من إعداد معتمد. الافتراضي المعتمد بس للحالات المعروفة في النظام:
 *   present 1 · half 0.5 · late 1 (مع الخصم المسجّل) · absent 0 · holiday 0.
 *   أي حالة تانية (إجازة سنوية/مرضية/…) = «محتاجة سياسة» ⇒ مش بتتدفع ولا بتتصفّر بصمت: بتطلع في قائمة مراجعة.
 */
const DEFAULT_PAY_FACTORS = Object.freeze({ present: 1, half: 0.5, late: 1, absent: 0, holiday: 0 });
/**
 * TR-08 التكرار: نفس الشخص + نفس اليوم + نفس المشروع = مكرر (معزول للمراجعة، مش بيتحسب، مش بيتمسح).
 *   نفس الشخص + نفس اليوم + مشروع تاني = يومية إضافية مشروعة.
 *   يومية لشخص مش موجود = معزولة للمراجعة.
 */
function attendanceReview(DATA, payFactors = DEFAULT_PAY_FACTORS) {
  const people = new Map();
  for (const [kind, arr] of [['worker', DATA.workers], ['driver', DATA.drivers], ['supervisor', DATA.supervisors]]) (arr || []).forEach((p) => people.set(p.id, { kind, p }));
  const seen = new Map();
  const counted = [], duplicates = [], orphans = [], needsPolicy = [];
  for (const a of DATA.workerAttendance || []) {
    if (!a) continue;
    const pid = a.personId || a.workerId || a.driverId || a.supervisorId || '';
    if (!people.has(pid)) { orphans.push(a.id); continue; }
    const key = pid + '|' + (a.date || '') + '|' + String(a.project || '').trim();
    if (seen.has(key)) { duplicates.push({ id: a.id, duplicateOf: seen.get(key) }); continue; }
    seen.set(key, a.id);
    const st = String(a.status || 'present').toLowerCase();
    if (!(st in payFactors)) { needsPolicy.push({ id: a.id, status: st }); continue; }
    const wage = a.dayWage != null && a.dayWage !== '' ? num(a.dayWage) : num(people.get(pid).p.dailyWage);
    let days = Number(a.days);
    if (!Number.isFinite(days) || days <= 0) days = 1;
    const factor = st === 'half' ? D(payFactors.half) : D(payFactors[st]).mul(days);
    const pay = qm(wage.mul(factor).sub(num(a.deduction)).max0());
    counted.push({ id: a.id, personId: pid, pay });
  }
  return { counted, duplicates, orphans, needsPolicy, total: sum(counted, (c) => c.pay) };
}

/** TR-09 الراتب الجزئي: بالتناسب مع أيام الاستحقاق — طريقة العد لازم تتحدد في سياسة الرواتب (مفيش افتراض) */
function proratedSalary(monthlySalary, entitledDays, periodDays, policy) {
  if (!policy || !policy.method) throw new PolicyRequired('salary proration method (B-47)');
  const denom = policy.method === 'calendar' ? periodDays : policy.method === 'fixed30' ? 30 : policy.method === 'workdays' ? policy.workDaysInMonth : null;
  if (!denom) throw new PolicyRequired('salary proration method (B-47)');
  return qm(num(monthlySalary).mul(entitledDays).div(denom));
}

// ---------------------------------------------------------------- المشروعات
/**
 * TR-10 تكلفة المشروع: من المصروفات الفعلية وبنود الفواتير بعد الخصومات —
 *   الفاتورة: الصافي بعد الخصم (netInvoice)، والمرتجع بالسالب، والملغاة صفر. **مش** الإجمالي قبل الخصم.
 *   (معالجة ضريبة القيمة المضافة كتكلفة أو كأصل قابل للاسترداد = سياسة ضرائب B-20 — مش متطبقة هنا)
 *   المصروفات: كل سطورها (lines/amounts) مش amount بس.
 *   الصرف المخزني: كمية × تكلفة الصرف المثبّتة على الحركة (TR-13).
 */
function projectSupplyCost(DATA, projectName) {
  const L = DATA.ledger || {};
  const stocked = new Set(((DATA.warehouses && DATA.warehouses.movements) || []).filter((m) => (m.type === 'in' || m.type === 'adjust_in') && m.supplierInvoiceId).map((m) => m.supplierInvoiceId));
  let s = Dec.zero();
  for (const inv of L.invoices || []) {
    if (String(inv.project || '').trim() !== projectName || stocked.has(inv.id)) continue;
    const st = invoiceState(inv, L.invoices || []);
    if (st === 'cancelled') continue;
    s = s.add(num(inv.netInvoice).mul(inv.isReturn ? -1 : 1));
  }
  return s;
}
function expenseActual(e) {
  if (Array.isArray(e.lines) && e.lines.length) return sum(e.lines, (l) => num(l.amount));
  if (e.amounts && typeof e.amounts === 'object') return sum(Object.values(e.amounts), num);
  return num(e.amount || e.total);
}

/**
 * TR-13 تكلفة المخزون: تكلفة الصرف بتتثبّت على الحركة وقت الصرف = متوسط التكلفة المتحرك في اللحظة دي، ومابتتغيرش بعد كده.
 *   ده بيحسب المتوسط المتحرك تاريخيًا (للحركات القديمة اللي مالهاش unitCost — بيطلع اقتراح للمراجعة، مش تعديل).
 */
function movingAverageIssueCosts(DATA, itemId) {
  const mv = ((DATA.warehouses && DATA.warehouses.movements) || []).filter((m) => m.itemId === itemId).slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
  let qty = Dec.zero(), value = Dec.zero();
  const out = [];
  for (const m of mv) {
    const q = num(m.qty);
    if (m.type === 'in' || m.type === 'adjust_in') {
      const unit = m.unitCost != null && m.unitCost !== '' ? num(m.unitCost) : (qty.isZero() ? Dec.zero() : value.div(qty));
      qty = qty.add(q); value = value.add(qm(q.mul(unit)));
    } else if (m.type === 'out' || m.type === 'adjust_out') {
      const avg = qty.isZero() ? Dec.zero() : qm(value.div(qty));
      const fixed = m.unitCost != null && m.unitCost !== '';
      const unit = fixed ? num(m.unitCost) : avg;
      out.push({ id: m.id, unitCost: unit, fixed, suggested: fixed ? null : avg });
      qty = qty.sub(q); value = value.sub(qm(q.mul(unit)));
    }
  }
  return out;
}

// ---------------------------------------------------------------- العملاء
/**
 * TR-11 المستخلص التراكمي: الإجمالي التراكمي = الأعمال السابقة + الحالية (+ إضافات − مستبعد)؛
 *   الصافي التراكمي = التراكمي − نسبة المحتجز − الاستقطاعات المعتمدة؛ مستحق الفترة = الصافي التراكمي − صافي المستخلصات السابقة.
 *   نسب الضرائب على المستخلصات: سياسة ضرائب (B-20/B-23) — ممنوع تطبيقها هنا من غير اعتماد (taxPct بيتسجل بس).
 *   الحالة: مسودة ← معتمد (من محرك الاعتمادات) ← محصّل جزئيًا / محصّل (من التحصيلات)؛ مرفوض من الاعتماد.
 */
function clientCertificate(cert, previousNetTotal) {
  const cumulative = num(cert.previousWorks).add(num(cert.value)).add(num(cert.extras)).sub(num(cert.excluded));
  const retention = qm(cumulative.mul(num(cert.retentionPct)).div(100));
  const cumulativeNet = cumulative.sub(retention).sub(num(cert.deductions)).sub(num(cert.advanceDeduct));
  return { cumulative, retention, cumulativeNet, periodDue: cumulativeNet.sub(num(previousNetTotal)), taxApplied: false };
}
function clientCertificateStatus({ approval, due, collected }) {
  if (approval === 'rejected') return 'مرفوض';
  if (approval !== 'approved') return 'مسودة';
  const c = num(collected), d = num(due);
  if (c.isZero()) return 'معتمد';
  return c.cmp(d) >= 0 ? 'محصّل' : 'محصّل جزئيًا';
}

// ---------------------------------------------------------------- الإجازات
/** TR-14 رصيد الإجازات: من سجلات الموظف المعتمدة (employeeId أو personId لنوع موظف)، والتاريخ محفوظ (مفيش مسح للسجلات القديمة) */
function leaveUsed(DATA, employeeId, year, type = 'annual') {
  return sum((DATA.leaves || []).filter((l) => l && l.status === 'approved' && l.type === type && (l.employeeId === employeeId || ((l.personKind || 'employee') === 'employee' && l.personId === employeeId)) && String(l.from || '').startsWith(String(year))), (l) => num(l.days));
}

module.exports = { qm, num, PolicyRequired, invoiceState, supplierLedger, allocationReport, DEFAULT_PAY_FACTORS, attendanceReview, proratedSalary, projectSupplyCost, expenseActual, movingAverageIssueCosts, clientCertificate, clientCertificateStatus, leaveUsed };
