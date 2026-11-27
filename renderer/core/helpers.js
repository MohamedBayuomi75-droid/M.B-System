function debounceRerender(key, ms){
  ms = ms==null ? 320 : ms;
  if(!window.__rerenderTimers) window.__rerenderTimers = {};
  if(window.__rerenderTimers[key]) clearTimeout(window.__rerenderTimers[key]);
  window.__rerenderTimers[key] = setTimeout(()=>{ try{ rerenderCurrentPage(); }catch(e){} }, ms);
}
function el(html){ const d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstElementChild; }
/* ---------------- helpers ---------------- */
function uid(){ return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2,9); }
function escapeHtml(s){
  if(s==null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
/** تقريب لخانتين عشريتين (قروش) — بدل تقريب المبالغ لجنيه صحيح */
function round2(n){
  const x = Number(n);
  if(!Number.isFinite(x)) return 0;
  return Math.round((x + (x < 0 ? -Number.EPSILON : Number.EPSILON)) * 100) / 100;
}
/** تحويل أي قيمة (نص/عربي/أرقام مفصولة بفواصل) لرقم بخانتين عشريتين — الاسم قديم لكن الدالة بقت بتحافظ على القروش */
function toInt(n){
  if(n == null || n === '') return 0;
  if(typeof n === 'number') return Number.isFinite(n) ? round2(n) : 0;
  let s = String(n).trim();
  // أرقام عربية شرقية
  s = s.replace(/[٠-٩]/g, d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  s = s.replace(/[۰-۹]/g, d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  s = s.replace(/٫/g, '.').replace(/[٬،]/g, '').replace(/,/g, '').replace(/[^\d.\-]/g, '');
  const x = Number(s);
  if(!Number.isFinite(x)) return 0;
  return round2(x);
}
function fmtNum(n){
  n = toInt(n);
  return n.toLocaleString('ar-EG', { maximumFractionDigits: 2 });
}
function fmtMoney(n){
  return fmtNum(n) + ' ج.م';
}
/** عرض أيام العمل مع دعم نصف يوم — مثال: 3.5 → 3½ أو 3½ يوم */
function fmtDays(n){
  const x = Number(n)||0;
  if(!x) return '0';
  const r = Math.round(x * 100) / 100;
  if(Math.abs(r - Math.round(r)) < 0.005) return String(Math.round(r));
  // 2.5 → 2½ ، 0.5 → ½ ، 2.25 → 2¼ ، 2.75 → 2¾ (أي كسر تاني بيظهر بالأرقام العشرية زي ما هو)
  const whole = Math.floor(r), frac = Math.round((r - whole) * 100) / 100;
  const sym = frac === 0.5 ? '½' : (frac === 0.25 ? '¼' : (frac === 0.75 ? '¾' : ''));
  if(sym) return whole === 0 ? sym : (whole + sym);
  return String(r);
}
/** عرض يوم واحد من سجل حضور */
function fmtAttendanceDays(a){
  if(!a) return '—';
  const st = String(a.status||'').toLowerCase();
  if(st==='absent' || st==='holiday') return '0';
  const c = typeof attendanceDaysCredit==='function' ? attendanceDaysCredit(a) : (Number(a.days)||0);
  if(!c) return '0';
  // نصف يوم
  if(Math.abs(c - 0.5) < 0.001) return '½';
  // عدد صحيح 1، 2، 3...
  if(Math.abs(c - Math.round(c)) < 0.001) return String(Math.round(c));
  // كسر آخر مثل 1.5 → 1½
  return fmtDays(c);
}
function monthNameAr(m){
  const names=['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return names[Number(m)]||String(m);
}
/** تحليل تاريخ محلي بدون إزاحة UTC (مهم لمصر والمنطقة) */
function parseLocalDate(d){
  if(d == null || d === '') return null;
  if(d instanceof Date){
    if(isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const s = String(d).trim();
  // YYYY-MM-DD أو YYYY-MM-DDTHH:mm...
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // D/M/YYYY أو DD/MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const dt = new Date(s);
  if(isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
/** عرض تاريخ بالتوقيت المحلي: 25/9/2026 */
function fmtDate(d){
  const dt = parseLocalDate(d);
  if(!dt) return d ? escapeHtml(String(d)) : '—'; // تاريخ غير صالح بيتطبع جوه HTML — يترمّز (S-1)
  return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
}
/** تاريخ+وقت بتوقيت القاهرة: 25/9/2026 14:30 */
function fmtDateTime(d){
  if(d == null || d === '') return '—';
  try{
    const dt = (d instanceof Date) ? d : new Date(d);
    if(isNaN(dt.getTime())) return escapeHtml(String(d));
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(dt);
    const g = t => (parts.find(p=>p.type===t)||{}).value || '';
    return Number(g('day')) + '/' + Number(g('month')) + '/' + g('year') + ' ' + g('hour') + ':' + g('minute');
  }catch(_e){
    const dt = (d instanceof Date) ? d : new Date(d);
    if(isNaN(dt.getTime())) return escapeHtml(String(d));
    const datePart = dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2,'0');
    const mm = String(dt.getMinutes()).padStart(2,'0');
    return datePart + ' ' + hh + ':' + mm;
  }
}
/** الوقت الحالي بتوقيت القاهرة (Africa/Cairo) */
function cairoNow(){
  try{
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    const g = t => Number((parts.find(p=>p.type===t)||{}).value||0);
    return new Date(g('year'), g('month')-1, g('day'), g('hour'), g('minute'), g('second'));
  }catch(_e){
    return new Date();
  }
}
/** اليوم الحالي بتوقيت القاهرة كـ YYYY-MM-DD للتخزين في input type=date */
function todayISO(){
  const d = cairoNow();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function showToast(msg, ms){
  ms = ms || 2800;
  let t = document.getElementById('appToast');
  if(!t){
    t = document.createElement('div');
    t.id = 'appToast';
    t.className = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1B4332;color:#F6F1E4;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);max-width:90%;text-align:center;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  t.style.zIndex = '200000';
  if(t.parentElement !== document.body || document.body.lastElementChild !== t) document.body.appendChild(t);
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.style.display='none'; }, ms);
}
function brandLogoHtml(size){
  size = size || 48;
  return `<img class="mark-logo" src="assets/logo.png" alt="HR" style="width:${size}px;height:${size}px;" onerror="this.style.display='none'" />`;
}
function getEmployee(id){ return (__indexes && __indexes.employeesById && __indexes.employeesById[id]) || (DATA.employees||[]).find(e=>e.id===id) || null; }
function getWorker(id){ return (__indexes && __indexes.workersById && __indexes.workersById[id]) || (DATA.workers||[]).find(w=>w.id===id) || null; }
function getEquipment(id){ return (__indexes && __indexes.equipmentById && __indexes.equipmentById[id]) || (DATA.equipment||[]).find(eq=>eq.id===id) || null; }
function getDepartment(id){ return (__indexes && __indexes.departmentsById && __indexes.departmentsById[id]) || (DATA.departments||[]).find(d=>d.id===id) || null; }
function employeeName(id){ const e=getEmployee(id); return e ? (e.name||e.code||id) : '—'; }
function workerName(id){ const w=getWorker(id); return w ? (w.name||w.code||id) : '—'; }
function departmentName(id){ const d=getDepartment(id); return d ? (d.name||id) : '—'; }
function getSupervisor(id){ return (DATA.supervisors||[]).find(s=>s.id===id) || null; }
function supervisorName(id){ const s=getSupervisor(id); return s ? (s.name||s.code||id) : '—'; }
function sortByNameAr(list, nameFn){
  nameFn = nameFn || (x => x && (x.name || x.label || '') || '');
  return (list||[]).slice().sort((a,b)=> String(nameFn(a)||'').localeCompare(String(nameFn(b)||''), 'ar', { sensitivity:'base' }));
}
const STATUS_LEGACY_LABELS = { inactive:'غير نشط', left:'غادر', terminated:'منتهي الخدمة', temporary:'مؤقت' };
function labelOf(list, code){ const o=(list||[]).find(x=>x.code===code); return o ? o.label : (STATUS_LEGACY_LABELS[code] || code || '—'); }
/** خيارات قائمة الحالة للأشخاص — الترتيب: نشط ← في إجازة ← مؤقت ← مستقيل ← على المعاش (+ حالة قديمة إن كانت مسجلة) */
function personStatusOptionsHtml(cur, opts){
  opts = opts || {};
  let _blank = '';
  if(opts.blank && !cur){ cur = '__none__'; _blank = '<option value="" selected>— اختر —</option>'; }
  cur = cur || 'active';
  const list = (typeof EMPLOYEE_STATUS!=='undefined') ? EMPLOYEE_STATUS : [];
  let html = _blank + list.map(o=>{ const v = (opts.tempValue && o.code==='temporary') ? opts.tempValue : o.code; return '<option value="'+v+'"'+(v===cur?' selected':'')+'>'+escapeHtml(o.label)+'</option>'; }).join('');
  if(!list.some(o=>o.code===cur) && cur!==opts.tempValue && STATUS_LEGACY_LABELS[cur]) html += '<option value="'+cur+'" selected>'+escapeHtml(STATUS_LEGACY_LABELS[cur])+'</option>';
  return html;
}

function employeeLeaveUsed(empId, year){
  year = Number(year) || new Date().getFullYear();
  const y0 = new Date(year, 0, 1), y1 = new Date(year, 11, 31);
  const DAY = 24*3600*1000;
  const total = (DATA.leaves||[]).filter(l => l.employeeId===empId && l.status==='approved' && l.type==='annual').reduce((s,l)=>{
    const days = Number(l.days) || (typeof calcLeaveDays==='function' && l.from && l.to ? calcLeaveDays(l.from, l.to) : 0);
    const a = parseLocalDate(l.from), b = parseLocalDate(l.to || l.from);
    if(!a || !b || b < a) return s + (String(l.from||'').startsWith(String(year)) ? days : 0);
    // الإجازة اللي بتعدّي رأس السنة بتتوزّع على السنتين بنسبة الأيام
    const span = Math.round((b - a)/DAY) + 1;
    const lo = a > y0 ? a : y0, hi = b < y1 ? b : y1;
    const overlap = hi >= lo ? Math.round((hi - lo)/DAY) + 1 : 0;
    return s + (days * overlap / span);
  }, 0);
  return Math.round(total * 100) / 100;
}
function employeeLeaveBalance(empId){
  const e = getEmployee(empId);
  if(!e) return 0;
  const total = Number(e.leaveBalance != null ? e.leaveBalance : (DATA.settings.defaultLeaveDays||21));
  const used = employeeLeaveUsed(empId);
  return Math.round((total - used) * 100) / 100;   // الرصيد السالب (استهلاك زيادة) بيظهر زي ما هو
}
function countActiveEmployees(){
  return (DATA.employees||[]).filter(e => e.status==='active' || e.status==='on_leave' || e.status==='temporary').length;
}
function countActiveWorkers(){
  return (DATA.workers||[]).filter(w => w.status==='active').length;
}
function countAvailableEquipment(){
  return (DATA.equipment||[]).filter(e=>{
    const st = e.status||'';
    return st==='available' || st==='working' || st==='stopped';
  }).length;
}
function countPendingLeaves(){
  return (DATA.leaves||[]).filter(l => l.status==='pending').length;
}
/** هل حالة الحضور تُحسب في اليومية؟ */
function isPayableAttendance(status){
  const s = String(status||'').toLowerCase();
  return s !== 'absent' && s !== 'holiday';
}
/** نوع صاحب سجل الحضور: worker | supervisor | driver (يتعامل مع السجلات القديمة/المستوردة اللي ناقصها personType) */
function attType(a){
  if(!a) return 'worker';
  const t = String(a.personType || a.personKind || a.kind || '').toLowerCase();
  if(t === 'worker' || t === 'supervisor' || t === 'driver') return t;
  const id = a.personId || a.workerId || a.driverId || a.supervisorId;
  if(id){
    if(typeof getWorker==='function' && getWorker(id)) return 'worker';
    if(typeof getDriver==='function' && getDriver(id)) return 'driver';
    if(typeof getSupervisor==='function' && getSupervisor(id)) return 'supervisor';
  }
  if(a.driverId && !a.workerId) return 'driver';
  return 'worker';
}
function attPersonId(a){
  if(!a) return '';
  return a.personId || a.workerId || a.driverId || a.supervisorId || '';
}
/** توحيد حقول سجل حضور (بيتنادى عند التحميل والاستيراد) — بيحافظ على كل الحقول الأصلية */
function normalizeAttendanceRecord(a){
  if(!a || typeof a !== 'object') return a;
  const t = attType(a), id = attPersonId(a);
  if(!a.personType) a.personType = t;
  if(!a.personKind) a.personKind = t;
  if(!a.personId && id) a.personId = id;
  if(t === 'worker' && !a.workerId && id) a.workerId = id;
  if(t === 'driver' && !a.driverId && id) a.driverId = id;
  if(t === 'supervisor' && !a.supervisorId && id) a.supervisorId = id;
  return a;
}

/** يومية الأساس المحفوظة مع السجل (قبل نصف اليوم / الخصم) */
function attendanceDayWage(a, worker){
  if(a && a.dayWage != null && a.dayWage !== '' && Number.isFinite(Number(a.dayWage)))
    return toInt(a.dayWage);
  const pt = attType(a), pid = attPersonId(a);
  const w = worker || (pt==='supervisor' ? getSupervisor(pid) : (pt==='driver' ? getDriver(pid) : getWorker(pid)));
  return toInt(w && w.dailyWage);
}
/** عدد الأيام المحسوبة للعرض (نصف يوم = 0.5) */
function attendanceDaysCredit(a){
  if(!a || !isPayableAttendance(a.status)) return 0;
  const st = String(a.status||'').toLowerCase();
  let d = Number(a.days);
  if(!Number.isFinite(d) || d <= 0){
    d = (st === 'half') ? 0.5 : 1;
  } else if(st === 'half' && d >= 1){
    d = 0.5;   // حالة "نصف يوم" مع أيام=1 كانت بتتحسب يوم كامل — بقت نصف يوم
  }
  return Math.round(d * 100) / 100;
}
/**
 * صافي المستحق لسجل حضور واحد:
 * - حاضر: اليومية كاملة
 * - نصف يوم: نصف اليومية (تقريب لأقرب جنيه)
 * - متأخر: اليومية − خصم التأخير
 * - غائب/إجازة: 0
 */
function attendanceNetPay(a, worker){
  if(newDayPayOn()) return attendanceNetPayNew(a, worker);
  if(!a || !isPayableAttendance(a.status)) return 0;
  const base = attendanceDayWage(a, worker);
  const days = attendanceDaysCredit(a);
  // المستحق = اليومية × عدد الأيام − أي خصم (تأخير أو جزاء)
  let total = round2(base * days);
  const ded = toInt(a.deduction);
  if(ded > 0) total = Math.max(0, total - ded);
  return toInt(total);
}
/**
 * الحساب الجديد للأيام (DEC-0129/0130، DEC-0133 — د-2 في DEC-0137): مقفول لحد البوابة المجمّعة (DEC-0136)، وبيتفعّل بـ settings.newDayPay = true
 * علشان كشوف الحساب والتقارير ولوحة المتابعة في الشاشة الكاملة يطلعوا نفس رقم الشاشات الجديدة. نفس قاعدة السيرفر (dailies-rules.ts: newNet):
 * - قرار المراجعة «تتلغي» ← 0؛ واليومية المعلّمة (مكررة، أو صاحبها مش موجود، أو أجر صفر، أو حالة مش معروفة) ← 0 لحد قرار «تتحسب».
 * - غائب / عطلة ← 0؛ وإلا الأجر × الأيام (6 خانات) − الخصم، بحد أدنى صفر.
 */
function newDayPayOn(){ try{ return !!(DATA && DATA.settings && DATA.settings.newDayPay === true); }catch(_e){ return false; } }
let __attFlagCache = { arr: null, len: -1, at: 0, map: null };
function attendanceReviewFlags(a){
  const arr = (DATA && DATA.workerAttendance) || [];
  const now = Date.now();
  if(__attFlagCache.arr !== arr || __attFlagCache.len !== arr.length || now - __attFlagCache.at > 1000){
    const map = new Map(), seen = new Set(), KNOWN = new Set(['present','absent','late','half','holiday']);
    arr.forEach(x=>{
      if(!x) return;
      const f = [];
      const t = attType(x), pid = attPersonId(x);
      const k = t+'|'+pid+'|'+x.date+'|'+String(x.project||'').trim();
      if(seen.has(k)) f.push('duplicate'); else seen.add(k);
      const owner = t==='supervisor' ? getSupervisor(pid) : t==='driver' ? getDriver(pid) : getWorker(pid);
      if(!owner) f.push('orphan');
      if(isPayableAttendance(x.status) && attendanceDayWage(x, owner) === 0) f.push('zeroWage');
      if(!KNOWN.has(String(x.status||'').toLowerCase())) f.push('unknownStatus');
      if(f.length) map.set(x.id, f);
    });
    __attFlagCache = { arr, len: arr.length, at: now, map };
  }
  return (a && __attFlagCache.map.get(a.id)) || [];
}
function attendanceNetPayNew(a, worker){
  if(!a) return 0;
  const dec = String(a.reviewDecision||'');
  if(dec === 'void') return 0;
  if(attendanceReviewFlags(a).length && dec !== 'count') return 0;
  const st = String(a.status||'').toLowerCase();
  if(st === 'absent' || st === 'holiday') return 0;
  const v = Number((attendanceDayWage(a, worker) * attendanceDaysCredit(a)).toFixed(6)) - toInt(a.deduction);
  return v > 0 ? Number(v.toFixed(6)) : 0;
}
function workerAttendanceInRange(workerId, from, to){
  return indexedRecords('workerAttendance','aw',a=>attType(a)==='worker'?(a.workerId||a.personId):'',workerId).filter(a=>{
    if(attType(a) !== 'worker' || (a.workerId || a.personId) !== workerId) return false;
    if(from && (a.date||'') < from) return false;
    if(to && (a.date||'') > to) return false;
    return true;
  });
}
/** أيام حضور/غياب الموظف من صفحة حضور الموظفين (DATA.attendance) */
function employeeAttendanceInRange(employeeId, from, to){
  return indexedRecords('attendance','ae',a=>a.employeeId,employeeId).filter(a=>{
    if(a.employeeId!==employeeId) return false;
    if(from && (a.date||'') < from) return false;
    if(to && (a.date||'') > to) return false;
    return true;
  });
}
function employeeDaysWorked(employeeId, from, to){
  let days = 0;
  employeeAttendanceInRange(employeeId, from, to).forEach(a=>{
    const st = String(a.status||'present').toLowerCase();
    if(st==='absent' || st==='holiday') return;
    if(typeof attendanceDaysCredit==='function') days += attendanceDaysCredit(a);
    else if(st==='half') days += 0.5;
    else days += (a.days!=null && a.days!=='') ? Number(a.days) : 1;
  });
  return Math.round(days*100)/100;
}
function employeeDaysAbsent(employeeId, from, to){
  // أيام الغياب = تواريخ مختلفة (سجلين غياب لنفس اليوم يتحسبوا يوم واحد)
  return new Set(employeeAttendanceInRange(employeeId, from, to)
    .filter(a=>String(a.status||'').toLowerCase()==='absent').map(a=>a.date||'')).size;
}

function workerDaysWorked(workerId, from, to){
  // نعرض مجموع كسور الأيام (نصف يوم = 0.5) ثم نقرّب للعرض عند الحاجة
  const sum = workerAttendanceInRange(workerId, from, to)
    .reduce((s,a)=> s + attendanceDaysCredit(a), 0);
  return Math.round(sum * 100) / 100;
}
/** أيام الغياب في الفترة */
function workerDaysAbsent(workerId, from, to){
  // أيام الغياب = تواريخ مختلفة (سجلين غياب لنفس اليوم يتحسبوا يوم واحد)
  return new Set(workerAttendanceInRange(workerId, from, to)
    .filter(a => String(a.status||'').toLowerCase()==='absent').map(a=>a.date||'')).size;
}
/** المستحق = مجموع صافي كل يوم (يراعي نصف اليوم وخصم التأخير) */
function workerDueAmount(workerId, from, to){
  const w = getWorker(workerId);
  return toInt(workerAttendanceInRange(workerId, from, to)
    .reduce((s,a)=> s + attendanceNetPay(a, w), 0));
}
/** ملخص حساب عامل لفترة */
function workerWageSummary(workerId, from, to){
  const w = getWorker(workerId);
  const atts = workerAttendanceInRange(workerId, from, to);
  let presentDays = 0, halfDays = 0, holidayDays = 0, lateDays = 0, due = 0;
  const absentDates = new Set(), holidayDates = new Set();
  atts.forEach(a=>{
    const st = String(a.status||'').toLowerCase();
    if(st==='absent') absentDates.add(a.date||'');
    else if(st==='holiday') holidayDates.add(a.date||'');
    else if(st==='half') halfDays += attendanceDaysCredit(a);
    else if(st==='late') lateDays += attendanceDaysCredit(a);
    else presentDays += attendanceDaysCredit(a);
    due += attendanceNetPay(a, w);       // نفس المصدر بتاع شاشة المستحقات (بعد خصم التأخير)
  });
  const absentDays = absentDates.size; holidayDays = holidayDates.size;
  const paid = workerPaidTotal(workerId, from, to);
  const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('worker', workerId, from, to) : 0;
  const penalty = typeof workerPenaltyTotal==='function' ? workerPenaltyTotal(workerId, from, to) : 0;
  const expenses = typeof personExpensesTotal==='function' ? personExpensesTotal('worker', workerId, from, to) : 0;
  const dueTotal = toInt(due + extras);
  return {
    worker: w,
    presentDays, halfDays, lateDays, absentDays, holidayDays,
    workDays: presentDays + halfDays + lateDays,
    due: dueTotal, baseDue: toInt(due), extras, paid, penalty, expenses,
    balance: toInt(dueTotal - paid - penalty - expenses),
    rate: Number(w && w.dailyWage) || 0
  };
}
function addAudit(action, details){
  if(!DATA.auditLog) DATA.auditLog = [];
  DATA.auditLog.unshift({
    id: uid(),
    at: new Date().toISOString(),
    action: action || '',
    details: details || '',
    user: (typeof currentUser!=='undefined' && currentUser) ? (currentUser.name||currentUser.username) : 'محلي'
  });
  if(DATA.auditLog.length > 3000) DATA.auditLog = DATA.auditLog.slice(0, 3000);
}

/** نقل مجلد الأرشيف + نسخة من السجل لسلة المهملات عند حذف شخص/معدة */
function archiveFolderToTrashOnEntityDelete(kind, personId, personName, personCode, entitySnapshot){
  try{
    if(!Array.isArray(DATA.archiveTrash)) DATA.archiveTrash = [];
    const folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];
    const f = folders.find(x=>x.kind===kind && x.id===personId);
    const atts = (f && f.attachments) ? f.attachments.map(a=>Object.assign({},a)) : [];
    (DATA.personDocuments||[]).forEach(d=>{
      if(d && d.personId===personId && (!d.kind || d.kind===kind)){
        (d.attachments||[]).forEach(a=>{
          if(a && a.path && !atts.some(x=>x.path===a.path)) atts.push(Object.assign({},a,{fromDoc:d.title||d.docType}));
        });
      }
    });
    // إزالة أي سجل سلة سابق لنفس الشخص
    DATA.archiveTrash = DATA.archiveTrash.filter(t=>!(t.personId===personId && t.kind===kind));
    DATA.archiveTrash.push({
      id: typeof uid==='function'?uid():('tr_'+Date.now()),
      kind, personId,
      name: personName || (entitySnapshot&&entitySnapshot.name) || (f&&f.name) || personId,
      code: personCode || (entitySnapshot&&entitySnapshot.code) || (f&&f.code) || '',
      sectionName: 'حذف سجل',
      attachments: atts,
      entity: entitySnapshot ? JSON.parse(JSON.stringify(entitySnapshot)) : null,
      personDocuments: (DATA.personDocuments||[]).filter(d=>d && d.personId===personId && (!d.kind || d.kind===kind)).map(d=>JSON.parse(JSON.stringify(d))),
      deletedAt: new Date().toISOString(),
      entityDeleted: true
    });
    DATA.personDocuments = (DATA.personDocuments||[]).filter(d=>!(d && d.personId===personId && (!d.kind || d.kind===kind)));
  }catch(e){ console.warn('archiveFolderToTrash', e); }
}

/** تأكيد بنفس تنسيق البرنامج — يعيد Promise<boolean> */
function confirmApp(msg, opts){
  opts = opts || {};
  const title = opts.title || 'تأكيد';
  const okLabel = opts.okLabel || 'تأكيد';
  const cancelLabel = opts.cancelLabel || 'إلغاء';
  // افتراضياً غير خطر إلا لو اتحدد danger:true (الحذف يمرّر true)
  const danger = opts.danger === true;
  return new Promise((resolve)=>{
    const prev = document.getElementById('appConfirmModal');
    if(prev) prev.remove();
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = 'appConfirmModal';
    ov.style.zIndex = '500000';
    const icon = danger ? '🗑️' : (opts.icon || 'ℹ️');
    ov.innerHTML =
      '<div class="modal app-confirm-modal">'
      + '<div class="modal-header app-confirm-head'+(danger?' danger':'')+'">'
      + '<span class="confirm-icon" aria-hidden="true">'+icon+'</span>'
      + '<h3 style="margin:0;flex:1;">'+escapeHtml(title)+'</h3>'
      + '<button type="button" class="modal-close" data-c="0" aria-label="إغلاق">×</button>'
      + '</div>'
      + '<div class="modal-body">'+escapeHtml(msg || 'هل أنت متأكد؟')+'</div>'
      + '<div class="modal-footer">'
      + '<button type="button" class="btn '+(danger?'btn-danger':'btn-primary')+'" data-c="1">'+escapeHtml(okLabel)+'</button>'
      + '<button type="button" class="btn btn-outline" data-c="0">'+escapeHtml(cancelLabel)+'</button>'
      + '</div></div>';
    const finish = (v)=>{
      ov.classList.add('modal-overlay-out');
      const box = ov.querySelector('.modal');
      if(box){ box.style.transition='transform .16s ease, opacity .16s ease'; box.style.opacity='0'; box.style.transform='translateY(8px) scale(.97)'; }
      setTimeout(()=>{ try{ ov.remove(); }catch(_e){} resolve(!!v); }, 160);
    };
    ov.addEventListener('click', e=>{ if(e.target===ov) finish(false); });
    ov.addEventListener('keydown', e=>{
      if(e.key==='Escape'){ e.preventDefault(); finish(false); }
      if(e.key==='Enter'){ e.preventDefault(); finish(true); }
    });
    ov.querySelectorAll('[data-c]').forEach(btn=>{
      btn.addEventListener('click', ()=> finish(btn.getAttribute('data-c')==='1'));
    });
    document.body.appendChild(ov);
    setTimeout(()=>{ try{ ov.querySelector('[data-c="1"]')?.focus(); }catch(_e){} }, 40);
  });
}
function confirmDelete(msg){
  return confirmApp(msg || 'هل أنت متأكد من الحذف؟', { title:'تأكيد الحذف', okLabel:'حذف', danger:true });
}

function openModal(html){
  // وضع التقاط لمعاينة التعديلات المخصصة — نفس HTML بالضبط بدون إظهار للمستخدم
  if(window.__cfCaptureModal){
    try{
      const old = document.getElementById('appModal');
      if(old) old.remove();
    }catch(_e){}
    document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = 'appModal';
    ov.setAttribute('data-cf-capture','1');
    ov.style.cssText = 'position:fixed!important;left:-10000px!important;top:0!important;opacity:0!important;pointer-events:none!important;z-index:-1!important;';
    ov.innerHTML = `<div class="modal modal-wide">${html}</div>`;
    document.body.appendChild(ov);
    return;
  }
  closeModal();
  document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.id = 'appModal';
  ov.innerHTML = `<div class="modal modal-wide">${html}</div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov) closeModal(); });
  ov.addEventListener('keydown', e=>{ e.stopPropagation(); }, true);
  document.body.appendChild(ov);
  /* تطبيق التخطيط قبل أول رسم للشاشة (microtask) بدل بعد 50ms — علشان الخانات ما تهتزّش وقت الفتح */
  ov.style.visibility = 'hidden';
  const _applyLayoutNow = ()=>{
    try{
      if(typeof applyFormLayout==='function'){
        const ent = typeof detectFormEntity==='function' ? detectFormEntity(ov) : '';
        if(ent) applyFormLayout(ent, ov);
      }
    }catch(_e){}
    try{ normalizeModalTextareas(ov); }catch(_e){}
  };
  Promise.resolve().then(()=>{ _applyLayoutNow(); ov.style.visibility = ''; });
  setTimeout(()=>{
    const first = ov.querySelector('select, input:not([type="hidden"]):not(.entity-combo-text):not(.doc-type-combo-text), textarea');
    if(first && typeof first.focus==='function'){
      try{ first.focus(); }catch(e){}
    }
  }, 50);
}

/** بناء معاينة = نسخة حقيقية من قائمة الإضافة/التعديل */
/* سجل قوائم الإضافة: كل قائمة إضافة/تعديل في البرنامج تظهر تلقائياً في «تعديلات مخصصة» تحت قسمها.
   قائمة جديدة: registerFormEntity({ key, label, group, open: ()=>…, detect: '#idفريد' }) */
const FORM_GROUPS = [
  ['hr','👥 الموارد البشرية'], ['att','🕒 الحضور واليوميات'], ['eq','🛻 المعدات والمشاريع'], ['fin','💰 المصروفات والمستحقات'],
  ['cl','🤝 العملاء والمشاريع'], ['wh','📦 المخازن'], ['lg','📒 دفتر الموردين'], ['sys','⚙️ النظام']
];
const FORM_REGISTRY = [];
function registerFormEntity(def){
  if(!def || !def.key) return;
  const i = FORM_REGISTRY.findIndex(x=>x.key===def.key);
  if(i>=0) FORM_REGISTRY[i] = Object.assign({}, FORM_REGISTRY[i], def); else FORM_REGISTRY.push(def);
  if(def.groupLabel && !FORM_GROUPS.some(g=>g[0]===(def.group||'sys'))) FORM_GROUPS.push([def.group||'sys', def.groupLabel]);
}
(function(){
  const R = (group,key,label,open,detect)=>registerFormEntity({group,key,label,open,detect});
  const call = n=>function(){ return typeof window[n]==='function' ? window[n].apply(null, arguments) : null; }; // S-2: من غير eval — كل دوال open* متعرّفة بـ function (موجودة على window)
  R('hr','employees','موظف',call('openEmployeeModal')); R('hr','workers','عامل',call('openWorkerModal')); R('hr','workersTemp','عامل مؤقت',()=>call('openWorkerModal')(null,{defaultType:'temporary'}),'#wrkWorkerType[value="temporary"]'); R('hr','supervisors','مشرف',call('openSupervisorModal')); R('hr','drivers','سائق',call('openDriverModal'));
  R('hr','leaves','إجازة',call('openLeaveModal')); R('hr','performance','تقييم',call('openPerfModal'));
  R('att','attendance','حضور موظف',call('openAttendanceModal')); R('att','workerAttendance','تسجيل يومية',call('openWorkerAttModal')); R('att','equipmentDaily','يومية معدة',call('openEquipmentDailyModal'));
  R('eq','equipment','معدة/مركبة',call('openEquipmentModal')); R('eq','projects','مشروع',call('openProjectModal')); R('eq','fuel','وقود',call('openFuelModal')); R('eq','transfers','أمر نقل',call('openTransferModal'));
  R('eq','equipLog','سجل صيانة معدة',call('openEquipLogModal'),'#elogEq, #elogType'); R('eq','dailyPlan','خطة يومية',call('openPlanModal'),'#pdProj, #pdLabor');
  R('fin','expenses','مصروف أشخاص',call('openExpenseModal')); R('fin','vehicleExpenses','مصروف معدات',call('openVehicleExpenseModal')); R('fin','costs','تكلفة',call('openCostModal')); R('fin','payments','دفع مستحق',()=>call('openUnifiedPayModal')('pay')); R('fin','documents','إرفاق مستند',()=>call('openDocModal')({}));
  R('cl','clCustomers','عميل',call('openCustomerModal')); R('cl','clContracts','عقد',call('openContractModal')); R('cl','clInvoices','مستخلص',call('openClientInvoiceModal')); R('cl','clBoqs','مقايسة',call('openBoqModal'));
  R('cl','clSurveys','حصر',call('openWorkSurveyModal')); R('cl','clCollections','تحصيل',call('openCollectionModal')); R('cl','clGuarantees','ضمان',call('openGuaranteeModal'));
  R('cl','clOpps','فرصة بيع',call('openOppModal')); R('cl','clComms','تواصل مع عميل',call('openCommModal')); R('cl','clChangeOrders','أمر تغيير',call('openChangeOrderModal'));
  R('wh','whItems','صنف مخزني',call('openWhItemModal'),'#whICode, #whIName'); R('wh','whLocations','مخزن',call('openWhLocationModal'),'#whLId, #whLName'); R('wh','whMovements','حركة مخزنية',()=>call('openWhMovementModal')('in'));
  R('lg','lgSuppliers','مورد',call('openAddSupplierModal'),'#m_businessNature, #m_sup_attList'); R('lg','lgInvoices','فاتورة مورد',()=>call('openAddEditInvoiceModal')(), '#m_invNo, #m_invDate'); R('lg','lgPayments','دفعة لمورد',()=>call('openPaymentModal')(), '#m_payAmount, #m_payDate');
  R('lg','lgSupDocs','مستند مورد',call('openAddSupplierDocumentModal'));
  R('sys','users','مستخدم',call('openUserModal'));
  const D = { leaves:'#lvKind, #lvEmp', performance:'#pfKind, #pfPerson', equipmentDaily:'#edEq, #edKind', fuel:'#flEq', vehicleExpenses:'#vexpEq', clOpps:'#oppTitle', clComms:'#cmCh', users:'#uUser', expenses:'#exKind', costs:'#cstFKind', payments:'#upType', attendance:'#attEmp', whMovements:'#whMType, #whMItem', clChangeOrders:'#voContract, #voTitle', lgInvoices:'#inv_isReturn, #inv_supplier_name', lgPayments:'#m_pay_supplier', lgSupDocs:'#docSupplier' };
  Object.keys(D).forEach(k=>{ const r = FORM_REGISTRY.find(x=>x.key===k); if(r && !r.detect) r.detect = D[k]; });
})();

function captureRealFormPreview(entity){
  window.__cfCaptureModal = true;
  let html = '';
  try{
    const _reg = FORM_REGISTRY.find(x=>x.key===entity);
    const fn = _reg && _reg.open;
    // نماذج العملاء تحتاج عميلاً واحداً على الأقل — نضيف عميلاً مؤقتاً للمعاينة فقط
    let tmpCust = null;
    try{
      if(/^cl[A-Z]/.test(entity) && typeof clientsData==='function'){
        const cd = clientsData(); cd.customers = cd.customers || [];
        if(!cd.customers.length){ tmpCust = { id:'__preview__', name:'عميل تجريبي', contacts:[], boqs:[], contracts:[{id:'__pvc__',title:'عقد تجريبي',value:0}], invoices:[], surveys:[], collections:[], guarantees:[] }; cd.customers.push(tmpCust); }
      }
    }catch(_e){}
    // بيانات مؤقتة للمعاينة فقط تُزال فوراً (ليفتح النموذج بدل رسالة «أضف أولاً»)
    const _undo = [];
    try{
      if(/^lg/.test(entity) && DATA.ledger && Array.isArray(DATA.ledger.suppliers) && !DATA.ledger.suppliers.length){ const t={id:'__pv__',name:'مورد تجريبي'}; DATA.ledger.suppliers.push(t); _undo.push(()=>{ DATA.ledger.suppliers = DATA.ledger.suppliers.filter(x=>x!==t); }); }
      if(/^wh/.test(entity) && typeof whData==='function'){ const w = whData(); w.items = w.items||[]; w.locations = w.locations||[];
        if(!w.items.length){ const t={id:'__pvi__',code:'—',name:'صنف تجريبي',unit:'قطعة'}; w.items.push(t); _undo.push(()=>{ w.items = w.items.filter(x=>x!==t); }); }
        if(!w.locations.length){ const t={id:'__pvl__',name:'مخزن تجريبي'}; w.locations.push(t); _undo.push(()=>{ w.locations = w.locations.filter(x=>x!==t); }); } }
    }catch(_e){}
    const _before = new Set(Array.from(document.querySelectorAll('.modal-overlay')));
    try{ if(entity==='clChangeOrders'){ if(typeof openChangeOrderModal==='function') openChangeOrderModal(null,{customerId:(typeof clCustomers==='function'&&clCustomers()[0]||{}).id}); } else if(fn) fn(); } finally {
      _undo.forEach(u=>{ try{ u(); }catch(_e){} });
      if(tmpCust){ try{ const cd = clientsData(); cd.customers = cd.customers.filter(c=>c!==tmpCust); }catch(_e){} }
    }
    let ov = document.getElementById('appModal');
    if(!ov){ const _n = Array.from(document.querySelectorAll('.modal-overlay')).filter(o=>!_before.has(o)); ov = _n[_n.length-1] || null; }
    if(ov){
      const box = ov.querySelector('.modal');
      try{ if(box){ const cw = parseFloat(getComputedStyle(box).width); if(cw>200) window.__cfModalW = cw; } }catch(_e){}
      window.__cfModalCls = box ? box.className : 'modal';
      html = box ? box.innerHTML : ov.innerHTML;
      try{ ov.remove(); }catch(_e){}
    }
  }catch(e){
    console.warn('captureRealFormPreview', entity, e);
    try{ const ov=document.getElementById('appModal'); if(ov) ov.remove(); }catch(_e){}
  }
  window.__cfCaptureModal = false;
  document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
  return html;
}

function closeModal(){
  document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
  const sub = document.getElementById('appSubModal');
  if(sub){
    sub.classList.add('modal-overlay-out');
    setTimeout(()=>{ try{ sub.remove(); }catch(_e){} }, 150);
    return;
  }
  const ov = document.getElementById('appModal');
  if(ov){
    ov.classList.add('modal-overlay-out');
    const box = ov.querySelector('.modal');
    if(box){ box.style.transition='transform .15s ease, opacity .15s ease'; box.style.opacity='0'; box.style.transform='translateY(8px) scale(.97)'; }
    setTimeout(()=>{ try{ ov.remove(); }catch(_e){} }, 150);
  }
}
/** نافذة فوق القائمة الحالية دون إغلاقها */
function openSubModal(html){
  const old = document.getElementById('appSubModal');
  if(old) old.remove();
  document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
  const ov = document.createElement('div');
  ov.className = 'modal-overlay modal-overlay-sub';
  ov.id = 'appSubModal';
  ov.style.zIndex = '400000';
  ov.innerHTML = `<div class="modal modal-wide">${html}</div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov) closeSubModal(); });
  ov.addEventListener('keydown', e=>{ e.stopPropagation(); }, true);
  document.body.appendChild(ov);
  setTimeout(()=>{
    const first = ov.querySelector('input:not([type="hidden"]), select, textarea');
    if(first && first.focus) try{ first.focus(); }catch(e){}
  }, 40);
  return ov;
}
function closeSubModal(){
  document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>d.remove());
  const sub = document.getElementById('appSubModal');
  if(sub) sub.remove();
}
function selectOptions(list, selected, emptyLabel){
  let h = emptyLabel ? `<option value="">${escapeHtml(emptyLabel)}</option>` : '';
  const items = (list||[]).map(o=>{
    const val = o.code != null ? o.code : (o.id || '');
    const lab = o.label != null ? o.label : (o.name || val);
    return { val, lab };
  });
  items.sort((a,b)=> String(a.lab||'').localeCompare(String(b.lab||''), 'ar', { sensitivity:'base' }));
  items.forEach(o=>{
    h += `<option value="${escapeHtml(o.val)}" ${String(selected)===String(o.val)?'selected':''}>${escapeHtml(o.lab)}</option>`;
  });
  return h;
}
function deptOptions(selected){
  return selectOptions((DATA.departments||[]).map(d=>({id:d.id, name:d.name})), selected, '— اختر القسم —');
}
/** اختيار شخص/معدة بالكتابة + اقتراحات */
function listEntitiesForKind(kind){
  // __entityDeptFilter من نوافذ التكلفة/المصاريف له الأولوية؛ وإلا فلاتر الصفحات الأخرى
  const deptFilter = (window.__entityDeptFilter != null && window.__entityDeptFilter !== undefined)
    ? String(window.__entityDeptFilter || '')
    : (window.__upDeptFilter || window.__leaveDeptFilter || window.__attEmpDeptFilter || '');
  function applyDept(list){
    if(!deptFilter) return list;
    return list.filter(e => {
      if(!e) return false;
      const d = e.departmentId || e.categoryId || '';
      return String(d) === String(deptFilter);
    });
  }
  let list = [];
  if(kind==='employee') list = (DATA.employees||[]).filter(e=>e && e.id);
  else if(kind==='worker') list = (DATA.workers||[]).filter(w=>w && w.id);
  else if(kind==='supervisor') list = (DATA.supervisors||[]).filter(s=>s && s.id);
  else if(kind==='driver') list = (DATA.drivers||[]).filter(d=>d && d.id);
  else if(kind==='equipment') list = (DATA.equipment||[]).filter(eq=>eq && eq.id);
  else if(kind==='project') list = (DATA.projects||[]).filter(p=>p && p.id);
  else if(kind==='respPerson') return (DATA.supervisors||[]).filter(s=>s && s.id).concat((DATA.employees||[]).filter(e=>e && e.id && /مهندس/.test([e.position, e.jobTitle, e.skill].join(' '))));
  else return [];
  return applyDept(list);
}
function deptOptionsForKind(kind, selected){
  const labs = {employees:'موظفين',workers:'عمال',supervisors:'مشرفين',drivers:'سائقين',equipment:'معدات'};
  const k = kind || 'employees';
  const list = sortByNameAr((DATA.departments||[]).filter(d=>!d.kind || d.kind===k || d.kind==='all'), d=>d.name);
  let h = '<option value="">— كل الأقسام —</option>';
  list.forEach(d=>{
    h += `<option value="${escapeHtml(d.id)}" ${selected===d.id?'selected':''}>${escapeHtml(d.name)}</option>`;
  });
  return h;
}
function entityDisplayName(ent){
  if(!ent) return '';
  const code = ent.code ? (' — '+ent.code) : '';
  return (ent.name||ent.code||ent.id||'') + code;
}
function entityComboHtml(fieldId, kind, selectedId, placeholder){
  const list = sortByNameAr(listEntitiesForKind(kind), e=>e.name||e.code||'');
  const sel = list.find(x=>x.id===selectedId);
  const ph = placeholder || 'اكتب للبحث...';
  return `<div class="entity-combo-wrap" data-combo-wrap="${escapeHtml(fieldId)}">
    <input type="hidden" id="${escapeHtml(fieldId)}" value="${escapeHtml(selectedId||'')}">
    <input type="text" class="input entity-combo-text" id="${escapeHtml(fieldId)}_text"
      value="${escapeHtml(sel?entityDisplayName(sel):'')}" placeholder="${escapeHtml(ph)}" autocomplete="off"
      data-combo-id="${escapeHtml(fieldId)}" data-combo-kind="${escapeHtml(kind)}">
  </div>`;
}

/** قراءة قيمة كومبو الكيان (مخفي + نص مكتوب) */
function getEntityComboValue(fieldId){
  const hidden = document.getElementById(fieldId);
  let id = (hidden && hidden.value) ? String(hidden.value).trim() : '';
  if(id) return id;
  const textEl = document.getElementById(fieldId+'_text');
  const q = (textEl && textEl.value ? textEl.value : '').trim();
  if(!q) return '';
  // ابحث بالاسم أو الكود في كل الأنواع الشائعة
  const kinds = ['employee','worker','supervisor','driver','equipment'];
  const kindFromInp = textEl && textEl.getAttribute('data-combo-kind');
  const order = kindFromInp ? [kindFromInp].concat(kinds.filter(k=>k!==kindFromInp)) : kinds;
  for(const kind of order){
    const list = typeof listEntitiesForKind==='function' ? listEntitiesForKind(kind) : [];
    const found = list.find(e=>{
      if(!e) return false;
      const name = String(e.name||'').trim();
      const code = String(e.code||'').trim();
      const disp = typeof entityDisplayName==='function' ? entityDisplayName(e) : (name+(code?' — '+code:''));
      return name===q || code===q || disp===q
        || name.includes(q) || (q.length>=3 && name.indexOf(q)===0);
    });
    if(found){
      if(hidden) hidden.value = found.id;
      if(textEl) textEl.value = typeof entityDisplayName==='function' ? entityDisplayName(found) : (found.name||'');
      return found.id;
    }
  }
  return '';
}

function bindEntityCombos(scope){
  const root = scope || document;
  // تنظيف قوائم عالقة على body
  document.querySelectorAll('.entity-combo-drop-fixed').forEach(d=>{
    if(d.parentElement === document.body) d.remove();
  });

  root.querySelectorAll('.entity-combo-text').forEach(inp=>{
    if(inp.dataset.boundCombo === '1') return;
    inp.dataset.boundCombo = '1';
    const fid = inp.getAttribute('data-combo-id');
    const kind = inp.getAttribute('data-combo-kind');
    const hidden = document.getElementById(fid);
    if(!hidden) return;
    let wrap = inp.closest('.entity-combo-wrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'entity-combo-wrap';
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);
    }
    // تأكيد أن الـ wrap نسبي
    wrap.style.position = 'relative';
    wrap.style.display = 'block';
    wrap.style.width = '100%';

    let drop = null;
    const ensureDrop = ()=>{
      if(drop && wrap.contains(drop)) return drop;
      if(drop && drop.parentNode) drop.parentNode.removeChild(drop);
      drop = document.createElement('div');
      drop.className = 'entity-combo-drop';
      drop.setAttribute('data-for', fid);
      drop.setAttribute('dir', 'rtl');
      // داخل الـ wrap مباشرة — دائماً تحت الخانة
      wrap.appendChild(drop);
      return drop;
    };
    const positionDrop = ()=>{
      const d = ensureDrop();
      if(!d.dataset.posReady){
        d.style.position = 'absolute';
        d.style.top = 'calc(100% + 2px)';
        d.style.left = '0';
        d.style.right = '0';
        d.style.width = '100%';
        d.style.maxHeight = '220px';
        d.style.overflowY = 'auto';
        d.style.overflowX = 'hidden';
        d.style.zIndex = '5000';
        d.style.boxSizing = 'border-box';
        d.style.margin = '0';
        d.dataset.posReady = '1';
      }
      d.style.display = 'block';
      d.hidden = false;
    };
    const hideDrop = ()=>{
      if(drop){
        drop.hidden = true;
        drop.innerHTML = '';
        drop.style.display = 'none';
      }
    };
    const renderDrop = (q)=>{
      const list = sortByNameAr(listEntitiesForKind(kind), e=>e.name||e.code||'');
      const qq = String(q||'').trim().toLowerCase();
      let matches = list;
      if(qq){
        // بحث مرتّب: بداية الاسم الأول ثم التاني... (نفس منطق صفحات القوائم)
        matches = typeof smartSearchList==='function'
          ? smartSearchList(list, qq)
          : list.filter(e=>(e.name||'').toLowerCase().includes(qq) || (e.code||'').toLowerCase().includes(qq) || entityDisplayName(e).toLowerCase().includes(qq));
      }
      /* بدون حد أقصى للأسماء */
      const d = ensureDrop();
      if(!matches.length){
        d.innerHTML = '<div class="entity-combo-empty">لا نتائج</div>';
        positionDrop();
        return;
      }
      d.innerHTML = matches.map(e=>`
        <button type="button" class="entity-combo-item${hidden && hidden.value===e.id ? ' is-selected' : ''}" data-id="${escapeHtml(e.id)}" data-label="${escapeHtml(entityDisplayName(e))}">
          <span class="eci-name">${escapeHtml(e.name||e.code||'')}</span>
          ${e.code?`<span class="eci-code">${escapeHtml(e.code)}</span>`:''}
        </button>`).join('');
      positionDrop();
      d.querySelectorAll('.entity-combo-item').forEach(btn=>{
        btn.addEventListener('mousedown', (ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
          const id = btn.getAttribute('data-id');
          const label = btn.getAttribute('data-label')||'';
          hidden.value = id;
          inp.value = label;
          hideDrop();
          window.__comboPickedAt = Date.now();
          try{ inp.blur(); }catch(_e){}
          hidden.dispatchEvent(new Event('change', { bubbles:true }));
          inp.dispatchEvent(new Event('change', { bubbles:true }));
        });
      });
    };
    const trySyncExact = ()=>{
      const val = (inp.value||'').trim();
      if(!val){ hidden.value = ''; return; }
      const list = listEntitiesForKind(kind);
      const found = list.find(e=> entityDisplayName(e)===val || (e.name||'')===val || (e.code||'')===val);
      if(found){ hidden.value = found.id; inp.value = entityDisplayName(found); }
    };

    let _dropTimer = null;
    let _lastQ = null;
    inp.addEventListener('focus', ()=>{
      if(Date.now() - (window.__comboPickedAt||0) < 1200) return;   // رجوع التركيز بعد إعادة رسم الصفحة لا يفتح القائمة
      if(drop && !drop.hidden) return;
      renderDrop('');
      _lastQ = inp.value;
    });
    // الضغط على الخانة بعد الاختيار يفتح القائمة كاملة من جديد (مثل قوائم الفلاتر)
    inp.addEventListener('click', ()=>{
      if(Date.now() - (window.__comboPickedAt||0) < 300) return;
      if(drop && !drop.hidden) return;
      renderDrop('');
      _lastQ = inp.value;
    });
    inp.addEventListener('input', ()=>{
      hidden.value = '';
      clearTimeout(_dropTimer);
      _dropTimer = setTimeout(()=>{
        renderDrop(inp.value);
        _lastQ = inp.value;
      }, 120);
    });
    inp.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Escape'){ hideDrop(); return; }
      if(ev.key === 'Enter'){
        const first = drop && drop.querySelector('.entity-combo-item');
        if(first && drop && !drop.hidden){ first.dispatchEvent(new MouseEvent('mousedown', { bubbles:true })); ev.preventDefault(); }
        else trySyncExact();
      }
      if(ev.key === 'ArrowDown'){
        const items = drop && drop.querySelectorAll('.entity-combo-item');
        if(items && items.length){ items[0].focus(); ev.preventDefault(); }
      }
    });
    inp.addEventListener('blur', ()=>{
      setTimeout(()=>{ hideDrop(); trySyncExact(); }, 180);
    });
  });
}


function empOptions(selected){
  return selectOptions((DATA.employees||[]).filter(e=>e.status==='active'||e.status==='on_leave'||e.status==='temporary').map(e=>({id:e.id, name:e.name+(e.code?' ('+e.code+')':'')})), selected, '— اختر الموظف —');
}
function workerOptions(selected){
  return selectOptions((DATA.workers||[]).filter(w=>w.status==='active'||w.status==='inactive').map(w=>({id:w.id, name:w.name+(w.code?' ('+w.code+')':'')})), selected, '— اختر العامل —');
}
function supervisorOptions(selected, emptyLabel){
  return selectOptions(
    (DATA.supervisors||[]).filter(s=>s.status!=='left' && s.status!=='inactive').map(s=>({id:s.id, name:s.name+(s.code?' ('+s.code+')':'')})),
    selected,
    emptyLabel != null ? emptyLabel : '— اختر المشرف —'
  );
}
function empOptionsForDepartment(departmentId, selected, emptyLabel){
  let list = (DATA.employees||[]).filter(e=>e.status==='active'||e.status==='on_leave'||e.status==='temporary');
  if(departmentId) list = list.filter(e=>e.departmentId===departmentId);
  return selectOptions(
    list.map(e=>({id:e.id, name:e.name+(e.code?' ('+e.code+')':'')})),
    selected,
    emptyLabel != null ? emptyLabel : '— اختر الموظف —'
  );
}
function nextSupervisorCode(){ return nextCode('SUP-', DATA.supervisors||[]); }

/* ---- مشاريع محفوظة ---- */
function ensureEquipmentTypeSaved(name){
  name = String(name||'').trim();
  if(!name) return name;
  DATA.equipmentTypes = DATA.equipmentTypes || [];
  if(!DATA.equipmentTypes.some(p => String(p.name||'').trim() === name)){
    DATA.equipmentTypes.push({ id: uid(), name });
    DATA.equipmentTypes.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||''), 'ar', { sensitivity:'base' }));
  }
  return name;
}
/** نوع المعدة مربوط بأقسام صفحة المعدات والمركبات (ملاكي / نقل ...) */
function equipmentDeptTypeHtml(inputId, eq){
  inputId = inputId || 'eqType';
  const deps = typeof departmentsForKind==='function' ? departmentsForKind('equipment') : [];
  const curId = eq && (eq.departmentId || eq.categoryId) || '';
  const curName = eq && (eq.typeLabel || eq.typeName || '') || '';
  // إن وُجدت أقسام: قائمة اختيار؛ مع إمكانية كتابة نوع جديد يُحفظ كقسم
  let opts = '<option value="">— اختر نوع الترخيص (ملاكي / نقل) —</option>';
  deps.forEach(d=>{
    const sel = (curId && curId===d.id) || (curName && curName===d.name) ? 'selected' : '';
    opts += `<option value="${escapeHtml(d.id)}" ${sel}>${escapeHtml(d.name)}</option>`;
  });
  // لو القيمة الحالية مش في القائمة
  if(curName && !deps.some(d=>d.name===curName || d.id===curId)){
    opts += `<option value="${escapeHtml(curName)}" selected>${escapeHtml(curName)}</option>`;
  }
  const listId = inputId + 'List';
  const datalistOpts = deps.map(d=>`<option value="${escapeHtml(d.name)}"></option>`).join('');
  // select + إمكانية الكتابة عبر datalist على input مخفي؟ نستخدم input list للأقسام
  return `<select class="input" id="${escapeHtml(inputId)}">${opts}</select>`;
}
function expenseTypeLabel(codeOrName){
  if(!codeOrName) return '—';
  const s = String(codeOrName).trim();
  const fixed = (typeof EXPENSE_TYPES!=='undefined'?EXPENSE_TYPES:[]).find(t=>t.code===s || t.label===s);
  if(fixed) return fixed.label;
  // ترجمة شائعة
  const map = { food:'أكل / إعاشة', tools:'أدوات / معدات', transport:'انتقالات', housing:'سكن', other:'أخرى', rent:'إيجار' };
  if(map[s.toLowerCase()]) return map[s.toLowerCase()];
  return s;
}
function migrateExpenseTypeLabels(){
  (DATA.supervisorExpenses||[]).forEach(e=>{
    if(!e || !e.type) return;
    const lab = expenseTypeLabel(e.type);
    if(lab && lab !== e.type) e.type = lab;
  });
}
function ensureProjectSaved(name){
  name = String(name||'').trim();
  if(!name) return;
  DATA.projects = DATA.projects || [];
  // لا يُنشأ مشروع تلقائياً من نماذج الموارد البشرية: المشروع لازم يُضاف من صفحة المشاريع مع تحديد العميل
  return;
}
function deleteProjectById(id){
  DATA.projects = (DATA.projects||[]).filter(p=>p.id!==id);
}
function projectDatalistHtml(listId){
  listId = listId || 'projectList';
  const opts = sortByNameAr(DATA.projects||[], p=>p.name).map(p=>`<option value="${escapeHtml(p.name)}"></option>`).join('');
  return `<datalist id="${listId}">${opts}</datalist>`;
}
function projectInputHtml(inputId, value, listId){
  listId = listId || 'projectList';
  return `<input class="input" id="${inputId}" list="${listId}" value="${escapeHtml(value||'')}" placeholder="اكتب أو اختر مشروعاً..." autocomplete="off">
    ${projectDatalistHtml(listId)}`;
}

/* ---- خانات مخصصة (نفس أسلوب الدفتر: خانة لكل سجل + زر إضافة) ---- */
function extraFieldRowHtml(label, value){
  return `
    <div class="extra-field-row" style="position:relative;grid-column:1/-1;">
      <label style="display:block;">
        ${escapeHtml(label||'خانة')}
        <span class="ef-remove" title="حذف الخانة" style="cursor:pointer;color:var(--debt);font-weight:900;margin-right:8px;">✕</span>
      </label>
      <input class="input ef-value" data-ef-label="${escapeHtml(label||'خانة')}" value="${escapeHtml(value||'')}" />
    </div>`;
}
function addExtraFieldRow(wrapId, label, value){
  const wrap = document.getElementById(wrapId); if(!wrap) return;
  initExtraFieldsWrap(wrapId);
  wrap.insertAdjacentHTML('beforeend', extraFieldRowHtml(label, value));
}
function promptAddExtraField(wrapId){
  // نافذة صغيرة بدل prompt (غير مدعوم جيداً في Electron)
  const existing = document.getElementById('efPromptOverlay');
  if(existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'efPromptOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:10000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--paper,#fff);border-radius:12px;padding:18px;min-width:300px;max-width:360px;box-shadow:0 8px 30px rgba(0,0,0,.2);">
      <h3 style="margin:0 0 12px;">اسم الخانة الجديدة</h3>
      <label style="display:block;margin-bottom:12px;">اسم الخانة
        <input class="input" id="efPromptInput" placeholder="مثال: IBAN أو رقم حساب" style="width:100%;margin-top:4px;">
      </label>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" class="btn btn-outline" id="efPromptCancel">إلغاء</button>
        <button type="button" class="btn btn-primary" id="efPromptOk">إضافة</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = document.getElementById('efPromptInput');
  setTimeout(()=>input && input.focus(), 40);
  const close = ()=> overlay.remove();
  document.getElementById('efPromptCancel').onclick = close;
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  const confirmAdd = ()=>{
    const label = (input.value||'').trim();
    if(!label){ input.focus(); return; }
    close();
    addExtraFieldRow(wrapId, label, '');
    const wrap = document.getElementById(wrapId);
    const last = wrap && wrap.querySelector('.extra-field-row:last-child .ef-value');
    if(last) last.focus();
  };
  document.getElementById('efPromptOk').onclick = confirmAdd;
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); confirmAdd(); }});
}
function initExtraFieldsWrap(wrapId){
  const wrap = document.getElementById(wrapId); if(!wrap || wrap.dataset.wired) return;
  wrap.dataset.wired = '1';
  wrap.addEventListener('click', (e)=>{
    const btn = e.target.closest('.ef-remove');
    if(btn){ const row = btn.closest('.extra-field-row'); if(row) row.remove(); }
  });
}
/** عند الحفظ: خانات لها اسم (القيمة قد تكون فارغة أو لا) */
function collectExtraFieldsForSave(wrapId){
  const wrap = document.getElementById(wrapId); if(!wrap) return [];
  const out = [];
  wrap.querySelectorAll('.extra-field-row').forEach(row=>{
    const valueInput = row.querySelector('.ef-value'); if(!valueInput) return;
    const label = (valueInput.getAttribute('data-ef-label')||'').trim();
    if(!label) return;
    out.push({ label, value: (valueInput.value||'').trim() });
  });
  return out;
}
function extraFieldsSummary(fields){
  if(!fields || !fields.length) return '';
  return fields.map(f=>`${f.label}: ${f.value}`).join(' | ');
}
/** HTML داخل نموذج الإضافة/التعديل — نفس شكل الصورة */
function extraFieldsBlockHtml(wrapId, existingFields){
  // الإضافة/الحذف فقط من تبويب «تعديلات مخصصة» — هنا عرض القيم فقط إن وُجدت
  const fields = existingFields || [];
  if(!fields.length) return `<div id="${escapeHtml(wrapId)}" style="display:none;"></div>`;
  const rows = fields.map(f=>extraFieldRowHtml(f.label, f.value)).join('');
  return `
    <div style="grid-column:1/-1;margin-top:4px;">
      <div id="${escapeHtml(wrapId)}" class="form-grid form-grid-2" style="gap:10px;">${rows}</div>
    </div>`;
}
function bindExtraFieldsButton(wrapId){
  // إضافة الخانات فقط من تبويب التعديلات المخصصة
  initExtraFieldsWrap(wrapId);
  try{
    const ent = String(wrapId||'').replace(/^extraFields_/,'');
    if(ent && typeof applyFormLayout==='function'){
      setTimeout(()=>applyFormLayout(ent, document.getElementById('appModal')||document), 30);
    }
  }catch(_e){}
}
/* توافق مع الاستدعاءات القديمة */

/** خانات نموذج تلقائية لها عمود أصلي في الجداول (لاحقة المعرّف ← عناوين الأعمدة) */
const AUTO_HDR_ALIAS = {
  IdCardExp:['انتهاء البطاقة'], IdCardStatus:['حالة البطاقة'], LicExp:['انتهاء الرخصة'], LicStatus:['حالة الرخصة'],
  Hire:['تاريخ التعيين'], ContractType:['نوع العقد'], ContractStatus:['حالة العقد'], InsNo:['الرقم التأميني'], InsStatus:['حالة التأمين'],
  Pos:['الوظيفة'], WageTemp:['اليومية'], ProjSince:['تاريخ الربط بالمشروع','تاريخ الانضمام للمشروع']
};
function autoFieldSuffix(sel){ return String(sel||'').replace(/^#/,'').replace(/^(emp|wrk|sup|drv|eq)/,''); }
/** مخططات قوائم الإضافة — الحقول الأساسية + المخصصة */
const FORM_BUILTIN_FIELDS = {
  employees: [
    { key:'code', label:'الكود', selector:'#empCode' },
    { key:'name', label:'الاسم', selector:'#empName' },
    { key:'nationalId', label:'الرقم القومي', selector:'#empNid' },
    { key:'birthDate', label:'تاريخ الميلاد', selector:'#empBirth', table:false },
    { key:'phone', label:'الهاتف', selector:'#empPhone' },
    { key:'department', label:'القسم', selector:'#empDept' },
    { key:'position', label:'الوظيفة', selector:'#empPos' },
    { key:'salary', label:'الراتب', selector:'#empSalary' },
    { key:'hireDate', label:'تاريخ التعيين', selector:'#empHire' },
    { key:'status', label:'الحالة', selector:'#empStatus' },
    { key:'address', label:'العنوان', selector:'#empAddress' },
    { key:'cardExpiry', label:'تاريخ انتهاء البطاقة الشخصية', selector:'#empIdCardExp' },
    { key:'insuranceNo', label:'الرقم التأميني', selector:'#empInsNo' },
    { key:'insuranceStatus', label:'حالة التأمين', selector:'#empInsStatus' },
    { key:'notes', label:'الملاحظات', selector:'#empNotes' }
  ],
  workers: [
    { key:'code', label:'الكود', selector:'#wrkCode' },
    { key:'name', label:'الاسم', selector:'#wrkName' },
    { key:'nationalId', label:'الرقم القومي', selector:'#wrkNid' },
    { key:'birthDate', label:'تاريخ الميلاد', selector:'#wrkBirth', table:false },
    { key:'phone', label:'الهاتف', selector:'#wrkPhone' },
    { key:'supervisor', label:'المشرف', selector:'#wrkSupervisor_text' },
    { key:'department', label:'القسم', selector:'#wrkDept' },
    { key:'job', label:'الوظيفة', selector:'#wrkPos' },
    { key:'salary', label:'الراتب', selector:'#wrkSalary' },
    { key:'project', label:'المشروع', selector:'#wrkProject' },
    { key:'address', label:'العنوان', selector:'#wrkAddress' },
    { key:'status', label:'الحالة', selector:'#wrkStatus' },
    { key:'notes', label:'الملاحظات', selector:'#wrkNotes' }
  ],
  driversExt: [
    { key:'code', label:'الكود', selector:'#drvCode' },
    { key:'name', label:'الاسم', selector:'#drvName' },
    { key:'status', label:'الحالة', selector:'#drvStatus' },
    { key:'nationalId', label:'الرقم القومي', selector:'#drvNid' },
    { key:'job', label:'الوظيفة', selector:'#drvPos' },
    { key:'department', label:'القسم', selector:'#drvDept' },
    { key:'dailyWage', label:'اليومية', selector:'#drvWage' },
    { key:'phone', label:'الهاتف', selector:'#drvPhone' },
    { key:'address', label:'العنوان', selector:'#drvAddress' },
    { key:'notes', label:'الملاحظات', selector:'#drvNotes' }
  ],
  workersTemp: [
    { key:'code', label:'الكود', selector:'#wrkCode' },
    { key:'name', label:'الاسم', selector:'#wrkName' },
    { key:'status', label:'الحالة', selector:'#wrkStatus' },
    { key:'nationalId', label:'الرقم القومي', selector:'#wrkNidTemp' },
    { key:'job', label:'الوظيفة', selector:'#wrkPosTemp' },
    { key:'department', label:'القسم', selector:'#wrkDept' },
    { key:'supervisor', label:'المشرف', selector:'#wrkSupervisor_text' },
    { key:'dailyWage', label:'اليومية', selector:'#wrkWageTemp' },
    { key:'phone', label:'الهاتف', selector:'#wrkPhoneTemp' },
    { key:'address', label:'العنوان', selector:'#wrkAddress' },
    { key:'notes', label:'الملاحظات', selector:'#wrkNotes' }
  ],
  supervisors: [
    { key:'code', label:'الكود', selector:'#supCode' },
    { key:'name', label:'الاسم', selector:'#supName' },
    { key:'nationalId', label:'الرقم القومي', selector:'#supNid' },
    { key:'birthDate', label:'تاريخ الميلاد', selector:'#supBirth', table:false },
    { key:'phone', label:'الهاتف', selector:'#supPhone' },
    { key:'department', label:'القسم', selector:'#supDept' },
    { key:'dailyWage', label:'اليومية', selector:'#supWage' },
    { key:'status', label:'الحالة', selector:'#supStatus' },
    { key:'address', label:'العنوان', selector:'#supAddress' },
    { key:'notes', label:'الملاحظات', selector:'#supNotes' }
  ],
  drivers: [
    { key:'code', label:'الكود', selector:'#drvCode' },
    { key:'name', label:'الاسم', selector:'#drvName' },
    { key:'nationalId', label:'الرقم القومي', selector:'#drvNid' },
    { key:'birthDate', label:'تاريخ الميلاد', selector:'#drvBirth', table:false },
    { key:'phone', label:'الهاتف', selector:'#drvPhone' },
    { key:'licenseDegree', label:'درجة الرخصة', selector:'#drvLicGrade' },
    { key:'licenseExpiry', label:'تاريخ انتهاء الرخصة', selector:'#drvLicExp' },
    { key:'salary', label:'الراتب', selector:'#drvSalary' },
    { key:'project', label:'المشروع', selector:'#drvProject' },
    { key:'department', label:'القسم', selector:'#drvDept' },
    { key:'address', label:'العنوان', selector:'#drvAddress' },
    { key:'status', label:'الحالة', selector:'#drvStatus' },
    { key:'notes', label:'الملاحظات', selector:'#drvNotes' }
  ],
  equipment: [
    { key:'code', label:'الكود', selector:'#eqCode' },
    { key:'licenseType', label:'نوع الترخيص', selector:'#eqType' },
    { key:'carType', label:'نوع السيارة', selector:'#eqCarType' },
    { key:'status', label:'الحالة', selector:'#eqStatus' },
    { key:'ownership', label:'الملكية', selector:'#eqOwnership' },
    { key:'vehicleNumber', label:'رقم اللوحة', selector:'#eqVehicleNumber' },
    { key:'color', label:'اللون', selector:'#eqColor' },
    { key:'motorNumber', label:'رقم الماتور', selector:'#eqMotor' },
    { key:'chassisNumber', label:'رقم الشاسيه', selector:'#eqChassis' },
    { key:'insuranceNumber', label:'الرقم التأميني', selector:'#eqInsNo' },
    { key:'insuranceStatus', label:'حالة التأمين', selector:'#eqInsStatus' },
    { key:'model', label:'الموديل', selector:'#eqModel' },
    { key:'driverName', label:'اسم السائق', selector:'#eqDriver_text' },
    { key:'purchasePrice', label:'سعر الشراء', selector:'#eqPurchasePrice' },
    { key:'inspectionDate', label:'تاريخ الفحص', selector:'#eqInspection' },
    { key:'licenseIssueDate', label:'تاريخ إصدار الرخصة', selector:'#eqLicIssue' },
    { key:'vehicleLicenseExpiry', label:'تاريخ انتهاء رخصة السيارة', selector:'#eqVehLicExp' },
    { key:'purchaseDate', label:'تاريخ الشراء', selector:'#eqPurchaseDate', table:false },
    { key:'lastMaintenance', label:'تاريخ آخر صيانة', selector:'#eqLastMaint', table:false },
    { key:'nextMaintenance', label:'موعد الصيانة القادمة', selector:'#eqNextMaint', table:false },
    { key:'notes', label:'الملاحظات', selector:'#eqNotes' }
  ],
  expenses: [
    { key:'date', label:'التاريخ', selector:'#exDate' },
    { key:'kind', label:'الفئة', selector:'#exKind' },
    { key:'person', label:'الشخص', selector:'#exPerson' },
    { key:'section', label:'نوع المصاريف', selector:'#exSection' },
    { key:'project', label:'المشروع', selector:'#exProject' },
    { key:'notes', label:'الملاحظات', selector:'#exNotes' }
  ],
  costs: [
    { key:'kind', label:'الفئة', selector:'#cstKind' },
    { key:'section', label:'نوع التكلفة', selector:'#cstSection' },
    { key:'date', label:'التاريخ', selector:'#cstDate' },
    { key:'person', label:'الشخص', selector:'#cstPerson' },
    { key:'project', label:'المشروع', selector:'#cstFProject' },
    { key:'items', label:'بنود التكلفة', selector:'#cstLines', size:'lg' },
    { key:'total', label:'الإجمالي', selector:'#cstTotal', size:'lg' },
    { key:'notes', label:'الملاحظات', selector:'#cstFNotes', size:'lg' }
  ],
  clCustomers: [
    { key:'name', label:'اسم العميل', selector:'#cuName' }, { key:'code', label:'الكود', selector:'#cuCode' },
    { key:'phone', label:'الهاتف', selector:'#cuPhone' }, { key:'email', label:'البريد', selector:'#cuEmail' },
    { key:'department', label:'القسم', selector:'#cuDept' },
    { key:'address', label:'العنوان', selector:'#cuAddress' }, { key:'notes', label:'ملاحظات', selector:'#cuNotes' }
  ],
  clContracts: [
    { key:'id', label:'كود العقد', selector:'#ctId' }, { key:'title', label:'عنوان العقد', selector:'#ctTitle' },
    { key:'project', label:'المشروع', selector:'#ctProject' }, { key:'value', label:'القيمة', selector:'#ctValue' },
    { key:'notes', label:'ملاحظات', selector:'#ctNotes' }
  ],
  clInvoices: [
    { key:'no', label:'رقم المستخلص', selector:'#ciNo' }, { key:'project', label:'المشروع', selector:'#ciProject' },
    { key:'value', label:'قيمة الأعمال', selector:'#ciValue' }, { key:'notes', label:'ملاحظات', selector:'#ciNotes' }
  ],
  clBoqs: [
    { key:'id', label:'الكود', selector:'#bqId' }, { key:'title', label:'العنوان', selector:'#bqTitle' },
    { key:'project', label:'المشروع', selector:'#bqProject' }, { key:'notes', label:'ملاحظات', selector:'#bqNotes' }
  ],
  clSurveys: [
    { key:'id', label:'الكود', selector:'#wsId' }, { key:'project', label:'المشروع', selector:'#wsProject' },
    { key:'workType', label:'نوع العمل', selector:'#wsType' }, { key:'location', label:'الموقع', selector:'#wsLoc' },
    { key:'notes', label:'ملاحظات', selector:'#wsNotes' }
  ],
  clCollections: [
    { key:'id', label:'الكود', selector:'#coId' }, { key:'amount', label:'المبلغ', selector:'#coAmt' },
    { key:'project', label:'المشروع', selector:'#coProject' }, { key:'notes', label:'ملاحظات', selector:'#coNotes' }
  ],
  clGuarantees: [
    { key:'id', label:'الكود', selector:'#garId' }, { key:'letterNo', label:'رقم الخطاب', selector:'#garLetter' },
    { key:'issuer', label:'البنك', selector:'#garIssuer' }, { key:'amount', label:'المبلغ', selector:'#garAmount' },
    { key:'notes', label:'ملاحظات', selector:'#garNotes' }
  ],
  projects: [
    { key:'code', label:'الكود', selector:'#prCode' },
    { key:'name', label:'الاسم', selector:'#prName' },
    { key:'budget', label:'الميزانية', selector:'#prBudget' },
    { key:'status', label:'الحالة', selector:'#prStatus' },
    { key:'supervisor', label:'مشرف المشروع', selector:'#prSup' },
    { key:'notes', label:'الملاحظات', selector:'#prNotes' }
  ],
  attendance: [
    { key:'date', label:'التاريخ', selector:'#attDate' },
    { key:'department', label:'القسم', selector:'#attDept' },
    { key:'employee', label:'الموظف', selector:'#attEmp' },
    { key:'status', label:'الحالة', selector:'#attStatus' },
    { key:'notes', label:'ملاحظات', selector:'#attNotes' }
  ],
  workerAttendance: [
    { key:'kind', label:'النوع', selector:'#wattType' },
    { key:'person', label:'الشخص', selector:'#wattPerson' },
    { key:'status', label:'الحالة', selector:'#wattStatus' },
    { key:'date', label:'التاريخ', selector:'#wattDate' },
    { key:'days', label:'عدد الأيام', selector:'#wattDays' },
    { key:'deduction', label:'خصم', selector:'#wattDed' },
    { key:'project', label:'المشروع', selector:'#wattProject' },
    { key:'notes', label:'ملاحظات', selector:'#wattNotes' }
  ],
  leaves: [
    { key:'department', label:'القسم', selector:'#lvDept' },
    { key:'person', label:'الشخص', selector:'#lvPerson' },
    { key:'type', label:'نوع الإجازة', selector:'#lvType' },
    { key:'from', label:'من تاريخ', selector:'#lvFrom' },
    { key:'to', label:'إلى تاريخ', selector:'#lvTo' },
    { key:'status', label:'الحالة', selector:'#lvStatus' },
    { key:'notes', label:'ملاحظات', selector:'#lvNotes' }
  ],
  transfers: [
    { key:'date', label:'التاريخ', selector:'#trDate' },
    { key:'kind', label:'نوع المورد', selector:'#trKind' },
    { key:'person', label:'الشخص / المعدة', selector:'#trPerson' },
    { key:'fromProject', label:'من مشروع', selector:'#trFrom' },
    { key:'toProject', label:'إلى مشروع', selector:'#trTo' },
    { key:'reason', label:'السبب', selector:'#trReason' },
    { key:'notes', label:'ملاحظات', selector:'#trNotes' }
  ],
  payments: [
    { key:'type', label:'النوع', selector:'#upType' },
    { key:'department', label:'القسم', selector:'#upDept' },
    { key:'person', label:'الشخص', selector:'#upPerson' },
    { key:'date', label:'التاريخ', selector:'#upDate' },
    { key:'payKind', label:'نوع المستحق', selector:'#upPayKind' },
    { key:'items', label:'بنود اليوميات / الإضافات', selector:'#upLines', size:'lg' },
    { key:'total', label:'الإجمالي', selector:'#upTotal', size:'lg' },
    { key:'notes', label:'ملاحظات', selector:'#upNotes', size:'lg' }
  ],
  equipmentDaily: [
    { key:'date', label:'التاريخ', selector:'#eqdDate' },
    { key:'equipment', label:'المعدة', selector:'#eqdEq' },
    { key:'hours', label:'الساعات', selector:'#eqdHours' },
    { key:'days', label:'الأيام', selector:'#eqdDays' },
    { key:'fuel', label:'الوقود', selector:'#eqdFuel' },
    { key:'project', label:'المشروع', selector:'#eqdProject' },
    { key:'notes', label:'ملاحظات', selector:'#eqdNotes' }
  ],
  fuel: [
    { key:'date', label:'التاريخ', selector:'#fuelDate' },
    { key:'equipment', label:'المعدة', selector:'#fuelEq' },
    { key:'liters', label:'اللترات', selector:'#fuelLiters' },
    { key:'cost', label:'التكلفة', selector:'#fuelCost' },
    { key:'project', label:'المشروع', selector:'#fuelProject' },
    { key:'notes', label:'ملاحظات', selector:'#fuelNotes' }
  ],
  documents: [
    { key:'kind', label:'نوع السجل', selector:'#docKind' },
    { key:'expiryDate', label:'تاريخ الانتهاء', selector:'#docExp' },
    { key:'person', label:'الشخص / المعدة / المشروع', selector:'#docPerson' },
    { key:'docType', label:'نوع المستند', selector:'#docType' },
    { key:'notes', label:'ملاحظات', selector:'#docNotes' },
    { key:'attachments', label:'المرفقات', selector:'#docAttList' }
  ],
  vehicleExpenses: [
    { key:'date', label:'التاريخ', selector:'#vexDate' },
    { key:'equipment', label:'المعدة', selector:'#vexEq' },
    { key:'section', label:'نوع المصروف', selector:'#vexSection' },
    { key:'project', label:'المشروع', selector:'#vexProject' },
    { key:'notes', label:'ملاحظات', selector:'#vexNotes' }
  ],
  performance: [
    { key:'kind', label:'النوع', selector:'#perfKind' },
    { key:'person', label:'الشخص', selector:'#perfPerson' },
    { key:'period', label:'الفترة', selector:'#perfPeriod' },
    { key:'score', label:'التقييم', selector:'#perfScore' },
    { key:'notes', label:'ملاحظات', selector:'#perfNotes' }
  ],
  departments: [
    { key:'name', label:'اسم القسم', selector:'#catName' },
    { key:'kind', label:'يتبع صفحة', selector:'#catKind' }
  ],
  users: [
    { key:'username', label:'اسم المستخدم', selector:'#usrName' },
    { key:'password', label:'كلمة المرور', selector:'#usrPass' },
    { key:'role', label:'الصلاحية', selector:'#usrRole' },
    { key:'displayName', label:'الاسم الظاهر', selector:'#usrDisplay' }
  ]

};

/** الكود دائماً أول خانة، والملاحظات دائماً آخر خانة وكبيرة (ثابتة في كل النماذج والجداول) */
function _cfIsCodeField(x){ return !!x && x.type!=='custom' && (x.key==='code' || (x.key==='id' && /كود/.test(x.label||'')) || /^(ال)?كود\s*(ال)?(موظف|عامل|مشرف|سائق|معدة|عميل|مشروع)?$/.test(String(x.label||'').trim())); }
function _cfIsNotesField(x){ return !!x && x.type!=='custom' && (x.key==='notes' || /^(ال)?ملاحظات$/.test(String(x.label||'').trim())); }
function _cfEnforceOrder(out){
  const ci = out.findIndex(_cfIsCodeField);
  if(ci > 0){ const c = out.splice(ci,1)[0]; out.unshift(c); }
  const ni = out.findIndex(_cfIsNotesField);
  if(ni >= 0){
    const n = out.splice(ni,1)[0];
    n.size = 'lg'; n.height = Math.max(Number(n.height)||0, 90);
    out.push(n);
  }
  return out;
}
function ensureFormLayout(entity){
  DATA.formLayouts = DATA.formLayouts || {};
  // الحقول الأساسية تظهر في الجدول افتراضياً (يمكن إخفاؤها من التعديلات المخصصة)
  const _dead = new Set((DATA.deadFields && DATA.deadFields[entity]) || []);
  const builtins = (FORM_BUILTIN_FIELDS[entity] || []).filter(f=>!_dead.has(f.key)).map(f=>({
    key: f.key, label: f.label, type: 'builtin', visible: true, size: f.size||'md',
    showInTable: f.table!==false, selector: f.selector||'', fieldType: 'text'
  }));
  ((DATA.autoFields && DATA.autoFields[entity]) || []).forEach(a=>{
    if(a && a.key && !builtins.some(b=>b.key===a.key)) builtins.push({ key:a.key, label:a.label, type:'builtin', visible:true, size:a.size||'md', showInTable: !!AUTO_HDR_ALIAS[autoFieldSuffix(a.selector)] || entity==='workersTemp', selector:a.selector||'', fieldType:'text', auto:true });
  });
  const customs = (typeof getCustomFieldDefs==='function' ? getCustomFieldDefs(entity) : (DATA.customFieldDefs&&DATA.customFieldDefs[entity]) || []).map(f=>({
    key: f.id || ('cf_'+f.label), label: f.label, type: 'custom', visible: true, size: f.size||'md', showInTable: f.showInTable!==false, id: f.id
  }));
  let layout = DATA.formLayouts[entity];
  if(!Array.isArray(layout) || !layout.length){
    layout = _cfEnforceOrder(builtins.concat(customs));
    DATA.formLayouts[entity] = layout;
    return layout;
  }
  const out = [];
  const seenKeys = new Set();
  layout.forEach(x=>{
    if(!x || !x.key) return;
    if(_dead.has(x.key) && x.type!=='custom') return;
    // إن حوّلها المستخدم لإضافية تبقى إضافية وقابلة للحذف
    if(x.type==='custom'){
      out.push(Object.assign({
        type: 'custom', visible: true, size: 'md', showInTable: true, fieldType: 'text'
      }, x, {
        type: 'custom',
        visible: x.visible!==false,
        showInTable: x.showInTable!==false
      }));
      seenKeys.add(x.key);
      return;
    }
    const b = builtins.find(t=>t.key===x.key);
    if(!b && x.type==='builtin' && String(x.key).indexOf('f_')!==0) return;   // خانة أساسية اتشالت من النموذج في الكود → تتشال من التعديلات المخصصة
    if(b){
      let lab = (x.label||'').trim();
      if(!lab || lab===x.key || lab===b.key) lab = b.label;
      /* مزامنة تلقائية مع الكود: لو الاسم الافتراضي اتغيّر والمستخدم ما غيّرش الاسم بإيده → ياخد الاسم الجديد */
      lab = lab.replace(/\s*[\(\[]?\s*(تحدد|تحديد|تُحدد|يحدد)\s*يدو[يى]?[اًا]?\s*[\)\]]?/g,'').trim() || b.label;
      if(String(x.key).indexOf('f_')!==0){
        if(x._defLabel===undefined){ if(lab!==b.label) lab = b.label; }
        else if(x._defLabel!==b.label && lab===x._defLabel) lab = b.label;
      }
      let showT = (x.showInTable===false ? false : true);
      if(x._defTable!==undefined && x._defTable!==b.showInTable) showT = b.showInTable;
      out.push(Object.assign({}, b, x, {
        type: 'builtin',
        label: lab,
        _defLabel: b.label, _defTable: b.showInTable,
        visible: x.visible!==false,
        size: x.size || b.size || 'md',
        showInTable: showT,
        fieldType: x.fieldType || 'text',
        selector: b.selector || x.selector || ''
      }));
      seenKeys.add(x.key);
    } else {
      // مخصص قديم بلا type
      out.push(Object.assign({ type:'custom', visible:true, size:'md', showInTable:true, fieldType:'text' }, x));
      seenKeys.add(x.key);
    }
  });
  // أضف أساسيات ناقصة فقط إن لم تُحذف كلياً (وليست موجودة كمخصص بنفس المفتاح)
  builtins.forEach(b=>{
    if(!seenKeys.has(b.key)) out.push(Object.assign({}, b));
  });
  customs.forEach(c=>{
    if(!out.some(x=>x.type==='custom' && (x.id===c.id || x.key===c.key || x.label===c.label))) out.push(c);
  });
  /* لو ترتيب الخانات الأساسية في الكود اتغيّر → التعديلات المخصصة تتبعه تلقائياً (مرة عند كل تغيير) */
  try{
    DATA._cfRegKeys = DATA._cfRegKeys || {};
    const regList = (FORM_BUILTIN_FIELDS[entity]||[]).filter(f=>!_dead.has(f.key)).map(f=>f.key);
    const regSig = regList.join(',');
    if(DATA._cfRegKeys[entity] !== regSig){
      const idxs = []; out.forEach((x,i)=>{ if(x.type!=='custom' && regList.indexOf(x.key)>=0) idxs.push(i); });
      const items = idxs.map(i=>out[i]).sort((a,b)=>regList.indexOf(a.key)-regList.indexOf(b.key));
      idxs.forEach((i,k)=>{ out[i] = items[k]; });
      DATA._cfRegKeys[entity] = regSig;
    }
  }catch(_e){}
  _cfEnforceOrder(out);
  DATA.formLayouts[entity] = out;
  return out;
}

/** يكتشف كل خانات النموذج الفعلي التي لا يغطيها المخطط، ويضيفها كخانات أساسية تلقائية (مطابقة النموذج الأصلي بالكامل) */
function syncAutoFields(entity){
  try{
    if(typeof captureRealFormPreview!=='function') return 0;
    window.__cfNoLayout = true; let html = ''; try{ html = captureRealFormPreview(entity) || ''; } finally { window.__cfNoLayout = false; }
    if(!html) return 0;
    const box = document.createElement('div'); box.innerHTML = html;
    const defs = FORM_BUILTIN_FIELDS[entity] || [];
    DATA.autoFields = DATA.autoFields || {};
    const have = DATA.autoFields[entity] = DATA.autoFields[entity] || [];
    const covered = new Set();
    defs.concat(have).forEach(d=>{ if(!d.selector) return; try{ box.querySelectorAll(d.selector).forEach(e=>covered.add(e)); }catch(_e){} });
    let added = 0;
    // خانات الاختيار المبحوثة: الحقل الظاهر هو id_text
    const dead = DATA.deadFields = DATA.deadFields || {};
    const deadList = [];
    defs.forEach(d=>{ if(d.selector){ let ok=false; try{ ok = !!box.querySelector(d.selector); }catch(_e){} if(!ok) deadList.push(d.key); } });
    dead[entity] = deadList;
    box.querySelectorAll('input,select,textarea').forEach(el=>{
      let id = el.id; if(!id || covered.has(el)) return;
      if(el.type==='hidden'){ const tw = box.querySelector('#'+id+'_text'); if(!tw) return; el = tw; }
      else if(/_text$/.test(id)){ const base = box.querySelector('#'+id.replace(/_text$/,'')); if(base && base.type==='hidden') return; }
      id = el.id; if(covered.has(el)) return;
      if(/^inl/.test(id) || /(^|\s)(it-|ex-|up-)/.test(el.className||'')) return;
      if(el.closest('[data-no-field]')) return;
      const lab = el.closest('label, .field'); if(!lab) return;
      if(lab.closest('[style*="display:none"],[style*="display: none"]')) return;
      const c = lab.cloneNode(true); c.querySelectorAll('input,select,textarea,small,.hint,button').forEach(n=>n.remove());
      let label = (c.textContent||'').replace(/\s+/g,' ').replace(/[*]/g,'').trim().split('(')[0].split(' — ')[0].split(' تُحدَّد')[0].split(' تلقائي')[0].trim();
      if(!label) return;
      const key = 'f_'+id;
      if(have.some(a=>a.key===key)) return;
      have.push({ key, label, selector:'#'+id, size: el.tagName==='TEXTAREA'?'lg':'md' }); added++;
    });
    // مطابقة تلقائية للنموذج الأصلي: الحجم الطبيعي (مرة واحدة) + وضع الخانات المكتشفة بجوار جارتها الفعلية
    DATA._cfAligned = DATA._cfAligned || {}; DATA._cfAligned2 = DATA._cfAligned2 || {};
    const _all = Array.from(box.querySelectorAll('input,select,textarea'));
    const _pos = it=>{ if(!it || it.type==='custom' || !it.selector) return -1; let el=null; try{ el = box.querySelector(it.selector); }catch(_e){} return el ? _all.indexOf(el) : -1; };
    if(!DATA._cfAligned[entity]){
      DATA._cfAligned[entity] = true;
      ensureFormLayout(entity).forEach(it=>{
        let el = null; if(it.type!=='custom' && it.selector){ try{ el = box.querySelector(it.selector); }catch(_e){} }
        const lab = el && (el.closest('label') || el.parentElement); if(!lab) return;
        const wide = /\/\s*-1|span\s*(2|3|4)/.test(lab.getAttribute('style')||'') || /(^|\s)(full|span-2|wide)(\s|$)/.test(lab.className||'') || !!lab.querySelector('textarea');
        if(it.size==null || it.size==='md') it.size = wide ? 'lg' : 'md';
      });
    }
    if(!DATA._cfAligned2[entity]){
      DATA._cfAligned2[entity] = true;
      const lay = ensureFormLayout(entity);
      const nonAuto = lay.filter(x=>!x.auto);
      const have = nonAuto.filter(x=>_pos(x)>=0);
      const nat = have.slice().sort((a,b)=>_pos(a)-_pos(b)).map(x=>x.key).join('|');
      let base = nonAuto;
      if(nat === have.map(x=>x.key).join('|')){
        // الترتيب الحالي = ترتيب النموذج الطبيعي (من المطابقة القديمة) → نرجع الترتيب الافتراضي للقائمة
        const idx = k=>{ const i=defs.findIndex(d=>d.key===k); return i<0 ? 1e6 : i; };
        base = nonAuto.slice().sort((a,b)=> ((a.type==='custom')?1:0)-((b.type==='custom')?1:0) || idx(a.key)-idx(b.key));
      }
      const out = base.slice();
      lay.filter(x=>x.auto).sort((a,b)=>_pos(a)-_pos(b)).forEach(a=>{
        let best = -1, bi = -1; out.forEach((x,i)=>{ const p = _pos(x); if(p>=0 && p<_pos(a) && p>best){ best = p; bi = i; } });
        out.splice(bi+1, 0, a);
      });
      DATA.formLayouts[entity] = out;
    }
    window.__cfSynced = window.__cfSynced || {}; window.__cfSynced[entity] = true;
    return added;
  }catch(e){ console.warn('syncAutoFields', e); return 0; }
}
/** هل يظهر عمود هذا الحقل في جداول الصفحة؟ */
function resetFormLayoutDefault(entity){
  try{
    DATA.formLayouts = DATA.formLayouts || {};
    delete DATA.formLayouts[entity];
    // امسح المخصص المرتبط إن رغب المستخدم بالافتراضي الكامل
    if(DATA.customFieldDefs && DATA.customFieldDefs[entity]){
      // نترك التعريفات لكن المخطط يُبنى من الأساسي + المخصص عبر ensureFormLayout
    }
    if(typeof ensureFormLayout==='function') ensureFormLayout(entity);
    return true;
  }catch(e){ console.warn(e); return false; }
}
function fieldShownInTable(entity, key){
  try{
    if(window.__cfAllCols) return true;
    if(!entity || !key) return true;
    DATA.formLayouts = DATA.formLayouts || {};
    const layout = (DATA.formLayouts[entity] && DATA.formLayouts[entity].length)
      ? DATA.formLayouts[entity]
      : (typeof ensureFormLayout==='function' ? ensureFormLayout(entity) : []);
    const f = (layout||[]).find(x=>x && x.key===key);
    if(!f) return true;
    // false صراحة فقط = مخفي من الجدول (البيانات تبقى)
    return f.showInTable !== false;
  }catch(_e){ return true; }
}
function thIf(entity, key, labelHtml){
  const show = fieldShownInTable(entity, key);
  const hide = show ? '' : ' style="display:none"';
  return '<th data-col-key="'+String(key).replace(/"/g,'')+'" data-col-ent="'+String(entity).replace(/"/g,'')+'"'+hide+'>'+labelHtml+'</th>';
}
function tdIf(entity, key, cellHtml){
  const show = fieldShownInTable(entity, key);
  const html = String(cellHtml||'');
  // أضف data-col على td وأظهر/أخفِ بدون حذف الخلية
  if(/^\s*<td\b/i.test(html)){
    let out = html.replace(/^\s*<td\b/i, function(m){
      return m + ' data-col-key="'+String(key).replace(/"/g,'')+'" data-col-ent="'+String(entity).replace(/"/g,'')+'"';
    });
    if(!show){
      if(/\sstyle="/i.test(out)){
        out = out.replace(/\sstyle="/i, ' style="display:none;');
      } else {
        out = out.replace(/^\s*<td\b([^>]*)>/i, '<td$1 style="display:none">');
      }
    }
    return out;
  }
  if(!show) return '';
  return html;
}



function normalizeEntityLayout(entity, order, fullKeys){
  try{
    DATA.formLayouts = DATA.formLayouts || {};
    let cur = DATA.formLayouts[entity];
    if(!Array.isArray(cur)) cur = [];
    const builtins = (FORM_BUILTIN_FIELDS[entity]||[]);
    const byKey = {};
    cur.forEach(x=>{ if(x && x.key) byKey[x.key]=x; });
    const missing = (order||[]).filter(k=>!byKey[k]);
    // إن كانت الخانات الأساسية كلها موجودة: لا تعيد الترتيب (يحافظ على سحب المستخدم)
    // فقط أضف الناقص في النهاية وحدّث الأحجام الافتراضية للناقص
    if(!missing.length && cur.length){
      fullKeys = fullKeys || [];
      cur.forEach(x=>{
        if(!x) return;
        if(fullKeys.includes(x.key) && !x._sizeUser) x.size = 'lg';
      });
      DATA.formLayouts[entity] = cur;
      return;
    }
    const out = [];
    (order||[]).forEach(k=>{
      if(byKey[k]){ out.push(byKey[k]); delete byKey[k]; }
      else {
        const b = builtins.find(t=>t.key===k);
        if(b) out.push(Object.assign({}, b, { type:'builtin', visible:true, size: (fullKeys||[]).includes(k)?'lg':(b.size||'md'), showInTable:false }));
      }
    });
    Object.keys(byKey).forEach(k=> out.push(byKey[k]));
    fullKeys = fullKeys || [];
    out.forEach(x=>{
      if(!x) return;
      if(fullKeys.includes(x.key)) x.size = x.size || 'lg';
    });
    DATA.formLayouts[entity] = out;
  }catch(e){}
}

function migrateStaleFormLayouts(){
  try{
    // إصلاح: لو كل الأعمدة الأساسية لقائمة ما مخفية (خلل قديم عند فتح الإعدادات لأول مرة) نرجّعها ظاهرة
    if(!DATA._cfAllHiddenFixed){
      DATA._cfAllHiddenFixed = true;
      Object.keys(DATA.formLayouts||{}).forEach(ent=>{
        const b = (DATA.formLayouts[ent]||[]).filter(x=>x && x.type!=='custom');
        if(b.length > 2 && b.every(x=>x.showInTable===false)){
          const defs = FORM_BUILTIN_FIELDS[ent]||[];
          b.forEach(x=>{ const d = defs.find(t=>t.key===x.key); x.showInTable = !(d && d.table===false); });
        }
      });
    }
    if(!DATA._cfAutoFlagsReset){
      DATA._cfAutoFlagsReset = true;
      Object.keys(DATA.formLayouts||{}).forEach(ent=>{
        (DATA.formLayouts[ent]||[]).forEach(x=>{
          if(x && x.type!=='custom' && String(x.key||'').indexOf('f_')===0){
            const m = !!AUTO_HDR_ALIAS[autoFieldSuffix(x.selector)];
            x.showInTable = m; delete x._userHidTable;
          }
        });
      });
    }
    // ترقية: الحقول الأساسية التي showInTable===false بسبب الافتراضي القديم
    if(!DATA._cfShowInTableMigrated){
      DATA._cfShowInTableMigrated = true;
      Object.keys(DATA.formLayouts||{}).forEach(ent=>{
        (DATA.formLayouts[ent]||[]).forEach(x=>{
          if(x && x.type!=='custom' && !x.auto && x.showInTable===false && x._userHidTable!==true && !(((FORM_BUILTIN_FIELDS[ent]||[]).find(d=>d.key===x.key)||{}).table===false)){
            x.showInTable = true;
          }
        });
      });
    }
  }catch(_e){}

  try{
    DATA.formLayouts = DATA.formLayouts || {};
    const pay = DATA.formLayouts.payments;
    if(Array.isArray(pay) && pay.some(x=>x && (x.key==='amount' || (x.key==='kind' && x.label==='الفئة')))){
      // مخطط قديم لدفعة مستحق — إعادة بناء
      delete DATA.formLayouts.payments;
    }
    const doc = DATA.formLayouts.documents;
    if(Array.isArray(doc) && !doc.some(x=>x && x.key==='attachments')){
      // سيُكمَّل عبر normalize
    }
  }catch(e){}
}

function normalizeDocumentsLayout(){
  normalizeEntityLayout('documents',
    ['kind','expiryDate','person','docType','notes','attachments'],
    ['notes','attachments']);
  normalizeEntityLayout('payments',
    ['type','department','person','date','payKind','items','total','notes'],
    ['items','total','notes']);
  normalizeEntityLayout('expenses',
    ['date','kind','person','section','project','notes'],
    ['notes']);
  normalizeEntityLayout('costs',
    ['kind','section','date','person','project','notes'],
    ['notes']);
  normalizeEntityLayout('attendance',
    ['date','department','employee','status','notes'],
    ['notes']);
  normalizeEntityLayout('workerAttendance',
    ['date','kind','person','status','days','deduction','project','notes'],
    ['notes']);
  normalizeEntityLayout('leaves',
    ['department','person','type','from','to','status','notes'],
    ['notes']);
  normalizeEntityLayout('transfers',
    ['date','kind','person','fromProject','toProject','reason','notes'],
    ['reason','notes']);
  normalizeEntityLayout('fuel',
    ['date','equipment','liters','cost','project','notes'],
    ['notes']);
  normalizeEntityLayout('equipmentDaily',
    ['date','equipment','hours','days','fuel','project','notes'],
    ['notes']);
}

function repairAllFormLayouts(){
  try{
    DATA.formLayouts = DATA.formLayouts || {};
    migrateStaleFormLayouts();
    normalizeDocumentsLayout();
    Object.keys(FORM_BUILTIN_FIELDS||{}).forEach(ent=>{
      const builtins = FORM_BUILTIN_FIELDS[ent]||[];
      let cur = DATA.formLayouts[ent];
      if(!Array.isArray(cur)) cur = [];
      // إصلاح أسماء الخانات الموجودة
      cur.forEach(x=>{
        if(!x) return;
        const b = builtins.find(t=>t.key===x.key);
        if(b){
          const lab = (x.label||'').trim();
          // لا تلمس الاسم إن كان المستخدم عدّله (أي نص غير المفتاح الإنجليزي)
          if(!lab || lab===x.key || lab===b.key) x.label = b.label;
          // إن كان type محوّل لإضافية بإرادة المستخدم نتركه
          if(x.type!=='custom') x.type = 'builtin';
          if(!x.selector) x.selector = b.selector;
        }
      });
      // إضافة أي خانة أساسية ناقصة
      builtins.forEach(b=>{
        if(!cur.some(x=>x && x.key===b.key)){
          cur.push(Object.assign({}, b, { type:'builtin', visible:true, size:'md', showInTable:b.table!==false, fieldType:'text' }));
        }
      });
      DATA.formLayouts[ent] = cur;
      ensureFormLayout(ent);
    });
  }catch(e){ console.warn(e); }
}

function syncCustomDefsFromLayout(entity){
  DATA.customFieldDefs = DATA.customFieldDefs || {};
  const layout = DATA.formLayouts && DATA.formLayouts[entity] || [];
  DATA.customFieldDefs[entity] = layout.filter(x=>x.type==='custom' && (x.label||'').trim()).map(x=>({
    id: x.id || x.key,
    label: x.label,
    size: x.size || 'md',
    width: x.width || 0,
    fieldType: x.fieldType || 'text',
    showInTable: x.showInTable === true
  }));
}

/** إخفاء الحقول الأساسية حسب المخطط بعد فتح النموذج */
function detectFormEntity(root){
  root = root || document.getElementById('appModal') || document;
  if(!root || !root.querySelector) return '';
  if(root.querySelector('#docSupplier')) return 'lgSupDocs';
  if(root.querySelector('#voContract, #voTitle')) return 'clChangeOrders';
  if(root.querySelector('#cuName')) return 'clCustomers';
  if(root.querySelector('#ctTitle')) return 'clContracts';
  if(root.querySelector('#ciNo')) return 'clInvoices';
  if(root.querySelector('#bqTitle')) return 'clBoqs';
  if(root.querySelector('#wsId') && root.querySelector('#wsType')) return 'clSurveys';
  if(root.querySelector('#coAmt')) return 'clCollections';
  if(root.querySelector('#garAmount')) return 'clGuarantees';
  { const _t = root.querySelector('#wrkWorkerType'); if(_t && _t.value==='temporary') return 'workersTemp'; }
  if(root.querySelector('#empCode, #empName, #empNid')) return 'employees';
  if(root.querySelector('#wrkCode, #wrkName, #wrkType')) return 'workers';
  if(root.querySelector('#supCode, #supName')) return 'supervisors';
  if(root.querySelector('#drvCode, #drvName')) return 'drivers';
  if(root.querySelector('#eqCode, #eqCarType, #eqVehicleNumber')) return 'equipment';
  if(root.querySelector('#prCode, #prName, #prBudget')) return 'projects';
  if(root.querySelector('#exDate, #exNotes') && root.querySelector('#exPerson, #exKind')) return 'expenses';
  if(root.querySelector('#cstDate, #cstFNotes, #cstProject')) return 'costs';
  if(root.querySelector('#docKind, #docType, #docPerson')) return 'documents';
  if(root.querySelector('#attDate, #attEmp')) return 'attendance';
  if(root.querySelector('#wattDate, #wattPerson, #wattKind')) return 'workerAttendance';
  if(root.querySelector('#eqdDate, #eqdEq')) return 'equipmentDaily';
  if(root.querySelector('#lvFrom, #lvTo, #lvPerson')) return 'leaves';
  if(root.querySelector('#trFrom, #trTo, #trKind')) return 'transfers';
  if(root.querySelector('#payAmount, #payType, #payPerson')) return 'payments';
  if(root.querySelector('#fuelLiters, #fuelEq')) return 'fuel';
  if(root.querySelector('#vexEq, #vexDate')) return 'vehicleExpenses';
  for(const r of FORM_REGISTRY){ if(r.detect){ try{ if(root.querySelector(r.detect)) return r.key; }catch(_e){} } }
  return '';
}

/** تطبيق مخطط التعديلات المخصصة على النموذج المفتوح: أسماء · إخفاء · حجم */
function applyFormLayout(entity, root){
  if(window.__cfNoLayout) return;
  try{
    root = root || document.getElementById('appModal') || document;
    if(!entity) entity = detectFormEntity(root);
    if(!entity) return;
    const layout = ensureFormLayout(entity);
    const builtins = FORM_BUILTIN_FIELDS[entity] || [];
    layout.forEach(x=>{
      if(!x || x.type==='custom') return; // المخصص يُرسم من customFieldsFormHtml بالاسم المحفوظ
      const def = builtins.find(b=>b.key===x.key) || { selector: x.selector, label: x.label, key: x.key };
      const sel = def.selector || x.selector;
      if(!sel) return;
      let el = null;
      try{ el = root.querySelector(sel); }catch(_e){ return; }
      if(!el) return;
      const lab = el.closest('label, .field') || el.parentElement;
      if(!lab) return;

      // إظهار / إخفاء
      if(x.visible===false){
        lab.style.display = 'none';
        return;
      }
      lab.style.display = '';

      // الحجم — بدون كسر شبكة النموذج
      lab.classList.remove('cf-size-sm','cf-size-md','cf-size-lg');
      lab.classList.add('cf-size-'+(x.size||'md'));
      const _perRow = Number((DATA.formCols||{})[entity])||0;
      if(x.size==='lg' && !_perRow){ lab.style.gridColumn = '1 / -1'; }
      else { lab.style.gridColumn = ''; }
      if(_perRow && lab.parentElement && lab.parentElement.style){ lab.parentElement.style.display = 'grid'; lab.parentElement.style.gridTemplateColumns = 'repeat('+_perRow+', minmax(0,1fr))'; }
      const _h = Number(x.height)||0;
      const _ctl = el && el.matches && el.matches('input,select,textarea') ? el : null;
      if(_ctl){ if(_h>0){ _ctl.style.height = _h+'px'; _ctl.style.minHeight = _h+'px'; } else { _ctl.style.height=''; _ctl.style.minHeight=''; } }
      lab.style.maxWidth = '';
      const _w = Number(x.width)||0;
      if(_w>0){ lab.style.width = _w+'px'; lab.style.maxWidth = '100%'; lab.style.justifySelf = 'start'; lab.style.boxSizing = 'border-box'; }
      else { lab.style.width = ''; lab.style.justifySelf = ''; }

      // تحديث اسم الخانة الظاهر دائماً حسب المحفوظ
      const newLabel = String(x.label || def.label || '').replace(/\s*[\(\[]?\s*(تحدد|تحديد|تُحدد|يحدد)\s*يدو[يى]?[اًا]?\s*[\)\]]?/g,'').trim();
      if(!newLabel) return;
      const _inl = (lab.matches && lab.matches('.field')) ? Array.from(lab.children).find(c=>c.tagName==='LABEL') : null;
      if(_inl){ if(_inl.textContent.trim()!==newLabel) _inl.textContent = newLabel; return; }
      let title = lab.querySelector('.cf-field-title');
      if(!title){
        // انقل أول نص ظاهر إلى span ثابت
        title = document.createElement('span');
        title.className = 'cf-field-title';
        title.style.display = 'block';
        title.style.marginBottom = '4px';
        title.style.fontSize = '12.5px';
        // أزل العقد النصية الأولى التي تشكّل العنوان
        const toRemove = [];
        for(const node of Array.from(lab.childNodes)){
          if(node.nodeType===3){
            if(node.textContent.trim()) toRemove.push(node);
          } else if(node.nodeType===1){
            const tag = (node.tagName||'').toLowerCase();
            if(tag==='input'||tag==='select'||tag==='textarea'||tag==='div'||tag==='button') break;
            // span/br صغير قبل الحقل
            if(tag==='br'){ toRemove.push(node); continue; }
          }
        }
        const prevText = toRemove.map(n=>n.textContent).join(' ').replace(/\s+/g,' ').trim();
        toRemove.forEach(n=>n.remove());
        title.textContent = newLabel;
        lab.insertBefore(title, lab.firstChild);
      } else {
        title.textContent = newLabel;
      }
    });
    // ترتيب الخانات حسب مخطط «تعديلات مخصصة» (داخل نفس الحاوية)
    try{
      const groups = new Map();
      layout.forEach(x=>{
        if(!x || x.type==='custom') return;
        const def = builtins.find(b=>b.key===x.key); const sel = (def && def.selector) || x.selector; if(!sel) return;
        let el = null; try{ el = root.querySelector(sel); }catch(_e){ return; }
        const lab = el && (el.closest('label') || el.parentElement); if(!lab || !lab.parentElement) return;
        if(!groups.has(lab.parentElement)) groups.set(lab.parentElement, []);
        const g = groups.get(lab.parentElement); if(g.indexOf(lab) < 0) g.push(lab);
      });
      groups.forEach((want, parent)=>{
        if(want.length < 2) return;
        const dom = want.slice().sort((a,b)=> (a.compareDocumentPosition(b) & 4) ? -1 : 1);
        if(dom.every((n,i)=>n===want[i])) return;
        const marks = dom.map(n=>{ const m = document.createComment(''); parent.insertBefore(m, n); return m; });
        want.forEach((n,i)=>{ marks[i].parentNode.insertBefore(n, marks[i]); });
        marks.forEach(m=>m.remove());
      });
    }catch(_e){}
    // الكود أول خانة، والملاحظات آخر خانة وكبيرة وبعرض الصف كله
    try{
      const findLab = x=>{ if(!x || x.type==='custom') return null; const def = builtins.find(b=>b.key===x.key); const sel = (def && def.selector) || x.selector; if(!sel) return null; let el=null; try{ el = root.querySelector(sel); }catch(_e){ return null; } return el ? { el, lab: el.closest('label, .field') || el.parentElement } : null; };
      const codeF = findLab(layout.find(_cfIsCodeField));
      if(codeF && codeF.lab && codeF.lab.parentElement){
        const par = codeF.lab.parentElement;
        const first = Array.from(par.children).find(c=>c.tagName==='LABEL' || c.classList.contains('field'));
        if(first && first !== codeF.lab) par.insertBefore(codeF.lab, first);
      }
      const notesF = findLab(layout.find(_cfIsNotesField));
      if(notesF && notesF.lab && notesF.lab.parentElement && notesF.lab.style.display!=='none'){
        const par = notesF.lab.parentElement;
        const labs = Array.from(par.children).filter(c=>c.tagName==='LABEL' || c.classList.contains('field') || (c.querySelector && c.id && /^extraFields_/.test(c.id)));
        const lastLab = labs[labs.length-1];
        if(lastLab && lastLab !== notesF.lab) par.insertBefore(notesF.lab, lastLab.nextSibling);
        notesF.lab.style.gridColumn = '1 / -1'; notesF.lab.style.width = ''; notesF.lab.style.maxWidth = '';
        const c = notesF.el;
        if(c && c.matches && c.matches('textarea,input')){ c.style.minHeight = '90px'; if(c.matches('textarea')){ c.style.height = '90px'; c.rows = Math.max(c.rows||2, 4); } else { c.style.height = '90px'; } }
      }
    }catch(_e){}
    try{ applyPeopleFormOrder(root); normalizeModalTextareas(root); }catch(_e){}
  }catch(e){ console.warn('applyFormLayout', e); }
}

/** ترتيب موحّد لنماذج الناس (موظف/عامل/مشرف/سائق) — بالـ CSS order فيعمل حتى داخل الأغلفة */
const PEOPLE_FORM_RANK = [
  /^Code$/, /^Name$/, /^Status$/, /^ResignDateWrap$/, /^Nid(Temp)?$/, /^Pos(Temp)?$/, /^Dept$/, /^Hire$/, /^Type$/,
  /^IdCardExp$/, /^IdCardStatus$/, /^LicExp$/, /^LicStatus$/, /^LicGrade$/, /^ContractType$/, /^ContractStatus$/,
  /^InsNo$/, /^InsStatus$/, /^Supervisor(_text)?$/, /^(Wage(Temp)?|Salary)$/, /^Phone(Temp)?$/, /^Email$/, /^LeaveBal$/
];
/** خانات الملاحظات (textarea) بعرض النموذج كله وبمقاس موحّد في كل القوائم */
function normalizeModalTextareas(root){
  (root||document).querySelectorAll('textarea.input').forEach(function(t){
    if(t.closest('.inline-doc-panel')) return;
    t.style.width = '100%'; t.style.maxWidth = '100%'; t.style.boxSizing = 'border-box'; t.style.display = 'block';
    t.style.minHeight = '90px'; t.style.height = '90px';
    const lab = t.closest('label');
    if(lab && lab.parentElement && /form-grid/.test(lab.parentElement.className||'')){ lab.style.gridColumn = '1 / -1'; lab.style.justifySelf = 'stretch'; lab.style.width = '100%'; lab.style.maxWidth = '100%'; lab.style.minWidth = '0'; }
  });
}
function applyPeopleFormOrder(root){
  root = root || document;
  const m = root.querySelector && root.querySelector('#empName, #wrkName, #supName, #drvName');
  if(!m) return;
  const pre = m.id.slice(0,3);
  const grid = m.closest('.form-grid') || m.closest('.modal-body');
  if(!grid) return;
  grid.querySelectorAll('label, .field, [id^="extraFields_"]').forEach(function(lab){
    if(lab.parentElement && lab.parentElement.closest('label, .form-att-block')) return;
    if(lab.closest('.form-att-block')) return;
    let rank = 500;
    const ctl = lab.matches('label,.field') ? (lab.querySelector('input:not([type=hidden]),select,textarea')) : null;
    const id = (lab.id && /ResignDateWrap$/.test(lab.id)) ? lab.id : (ctl && ctl.id) || '';
    if(id.indexOf(pre) === 0){
      const key = id.slice(3);
      const i = PEOPLE_FORM_RANK.findIndex(function(r){ return r.test(key); });
      if(i >= 0) rank = (i + 1) * 10;
    }
    if(/Address$/.test(id) && id.indexOf(pre)===0) rank = 8900;
    if(/Notes$/.test(id) || (ctl && ctl.tagName==='TEXTAREA' && /Notes$/.test(ctl.id))) rank = 9000;
    if(/^extraFields_/.test(lab.id||'')) rank = 800;
    if(rank===500 && !ctl && !(lab.id||'')) return;
    lab.style.order = String(rank);
    const NAMES = { IdCardExp:'تاريخ انتهاء البطاقة الشخصية', IdCardStatus:'حالة البطاقة', LicExp:'تاريخ انتهاء الرخصة الشخصية', LicStatus:'حالة الرخصة', InsStatus:'حالة التأمين', Phone:'الهاتف', PhoneTemp:'الهاتف' };
    if(pre==='drv') NAMES.LicExp = 'تاريخ انتهاء الرخصة';
    const nm = id.indexOf(pre)===0 ? NAMES[id.slice(3)] : '';
    if(nm && lab.matches('label')){
      const tn = Array.from(lab.childNodes).find(function(n){ return n.nodeType===3 && n.textContent.trim(); });
      if(tn) tn.textContent = '\n      ' + nm + '\n      ';
    }
  });
  // مرفقات النموذج دائماً بعد الملاحظات
  grid.querySelectorAll('.form-att-block').forEach(function(a){ a.style.order = '9500'; });
}

function getCustomFieldDefs(entity){
  DATA.customFieldDefs = DATA.customFieldDefs || {};
  const list = DATA.customFieldDefs[entity] || DATA.customFieldDefs[entity==='employee'?'employees':entity] || [];
  return Array.isArray(list) ? list : [];
}
function customFieldsFormHtml(entity, record){
  const wrapId = 'extraFields_'+entity;
  const layout = typeof ensureFormLayout==='function' ? ensureFormLayout(entity) : [];
  const defs = (layout.length ? layout.filter(x=>x.type==='custom' && x.visible!==false) : getCustomFieldDefs(entity)).map(x=>({
    id: x.id||x.key, label: x.label, size: x.size||'md', width: x.width||0, height: x.height||0, fieldType: x.fieldType||'text', showInTable: x.showInTable
  }));
  if(!defs.length) return '';
  const existing = (record && (record.extraFields || [])) || [];
  if(record && record.custom && typeof record.custom==='object'){
    Object.keys(record.custom).forEach(k=>{
      if(!existing.some(f=>f.label===k)) existing.push({ label: k, value: String(record.custom[k]??'') });
    });
  }
  const byLabel = {};
  existing.forEach(f=>{ if(f && f.label) byLabel[f.label] = f.value; });
  // فقط الخانات المعرّفة وبالترتيب المحفوظ
  const rows = defs.filter(d=>d && d.label).map(d=>({
    label: d.label,
    value: byLabel[d.label] != null ? byLabel[d.label] : '',
    size: d.size||'md',
    width: d.width||0,
    fieldType: d.fieldType||'text'
  }));
  const rowHtml = rows.map(f=>{
    const sizeCls = f.width>0 ? 'style="width:'+Number(f.width)+'px;max-width:100%;justify-self:start;box-sizing:border-box;"' : (f.size==='lg' ? 'style="grid-column:1/-1;"' : (f.size==='sm' ? 'style="max-width:200px;"' : ''));
    const ft = f.fieldType||'text';
    let inp = '';
    if(ft==='textarea') inp = `<textarea class="input ef-value" data-ef-label="${escapeHtml(f.label)}" rows="2" placeholder="${escapeHtml(f.label)}" style="width:100%;box-sizing:border-box;">${escapeHtml(f.value||'')}</textarea>`;
    else inp = `<input class="input ef-value" data-ef-label="${escapeHtml(f.label)}" type="${ft==='number'?'number':(ft==='date'?'date':'text')}" value="${escapeHtml(f.value||'')}" placeholder="${escapeHtml(f.label)}" style="width:100%;box-sizing:border-box;">`;
    return `<label class="extra-field-row" ${sizeCls}>
      <span style="font-size:12px;color:var(--ink-soft);display:block;margin-bottom:4px;">${escapeHtml(f.label)}</span>
      ${inp}
    </label>`;
  }).join('');
  return `
    <div style="grid-column:1/-1;margin-top:8px;padding-top:10px;border-top:1px dashed var(--line,#ddd);">
      <div style="font-size:12.5px;font-weight:700;color:var(--ink-soft);margin-bottom:8px;">خانات مخصصة</div>
      <div id="${escapeHtml(wrapId)}" class="form-grid form-grid-2" style="gap:10px;">${rowHtml}</div>
    </div>`;
}
function customFieldsTableHeaders(entity){
  const layout = typeof ensureFormLayout==='function' ? ensureFormLayout(entity) : [];
  // الأعمدة الأساسية تُدار بـ thIf — هنا الإضافية فقط
  const cols = layout.filter(d=>d && d.type==='custom' && d.label && d.showInTable!==false && d.visible!==false);
  return cols.map(d=>`<th>${escapeHtml(d.label)}</th>`).join('');
}
function customFieldsTableCells(entity, record){
  const layout = typeof ensureFormLayout==='function' ? ensureFormLayout(entity) : [];
  const cols = layout.filter(d=>d && d.type==='custom' && d.label && d.showInTable!==false && d.visible!==false);
  if(!cols.length) return '';
  const map = {};
  (record && record.extraFields || []).forEach(f=>{ if(f && f.label) map[f.label] = f.value; });
  if(record && record.custom && typeof record.custom==='object'){
    Object.keys(record.custom).forEach(k=>{ if(map[k]==null) map[k] = record.custom[k]; });
  }
  return cols.map(d=>{
    let v = '';
    if(d.type==='custom'){
      v = map[d.label] != null ? String(map[d.label]) : '';
    } else {
      // حقل أساسي من السجل
      const k = d.key;
      if(record){
        if(k==='department') v = typeof departmentName==='function'?departmentName(record.departmentId||record.categoryId): (record.departmentId||'');
        else if(k==='supervisor') v = typeof supervisorName==='function'?supervisorName(record.supervisorId):'';
        else if(k==='job' || k==='position') v = record.job || record.position || record.skill || '';
        else if(k==='dailyWage') v = record.dailyWage!=null?String(record.dailyWage):'';
        else if(k==='salary') v = record.salary!=null?String(record.salary):'';
        else if(k==='status') v = record.status||'';
        else if(k==='phone') v = record.phone||'';
        else if(k==='nationalId') v = record.nationalId||record.nid||'';
        else if(k==='address') v = record.address||'';
        else if(k==='project') v = record.project||'';
        else if(k==='code') v = record.code||'';
        else if(k==='name') v = record.name||'';
        else if(k==='notes') v = record.notes||'';
        else if(record[k]!=null) v = String(record[k]);
        else if(map[d.label]!=null) v = String(map[d.label]);
      }
    }
    return `<td style="font-size:12.5px;max-width:140px;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(v)}">${escapeHtml(v||'—')}</td>`;
  }).join('');
}
function customFieldsManageHtml(entity){ return ''; }
function bindCustomFieldsManage(entity){ /* إدارة من تبويب التعديلات المخصصة */ }


function workersOfSupervisor(supervisorId){
  if(!supervisorId) return [];
  return sortByNameAr((DATA.workers||[]).filter(w=>w.supervisorId===supervisorId), w=>w.name);
}
function supervisorOwnAttendance(supervisorId, from, to){
  return indexedRecords('workerAttendance','as',a=>attType(a)==='supervisor'?attPersonId(a):'',supervisorId).filter(a=>{
    if(attType(a)!=='supervisor' || attPersonId(a)!==supervisorId) return false;
    if(from && (a.date||'') < from) return false;
    if(to && (a.date||'') > to) return false;
    return true;
  });
}
function supervisorOwnDays(supervisorId, from, to){
  const sum = supervisorOwnAttendance(supervisorId, from, to).reduce((s,a)=>s+attendanceDaysCredit(a),0);
  return Math.round(sum * 100) / 100;
}
function supervisorOwnDue(supervisorId, from, to){
  const s = getSupervisor(supervisorId);
  return toInt(supervisorOwnAttendance(supervisorId, from, to).reduce((sum,a)=>sum+attendanceNetPay(a,s),0));
}


function equipmentOfSupervisor(supervisorId){
  return (DATA.equipment||[]).filter(eq=>eq.supervisorId===supervisorId);
}
function supervisorExpensesInRange(supervisorId, from, to){
  const fromLegacy = (DATA.supervisorExpenses||[]).filter(e=>{
    if(!e || e.supervisorId!==supervisorId) return false;
    if(from && (e.date||'')<from) return false;
    if(to && (e.date||'')>to) return false;
    return true;
  });
  const fromUnified = indexedRecords('expenses','exk',e=>e.personKind+'|'+e.personId,'supervisor|'+supervisorId).filter(e=>{
    if(!e || e.personKind!=='supervisor' || e.personId!==supervisorId) return false;
    if(from && (e.date||'')<from) return false;
    if(to && (e.date||'')>to) return false;
    // تجنب التكرار مع legacy
    if(fromLegacy.some(x=>x.id===e.id)) return false;
    return true;
  }).map(e=>({
    id: e.id, supervisorId: e.personId, date: e.date,
    type: e.type, amount: e.amount, project: e.project, notes: e.notes, section: e.section
  }));
  return fromLegacy.concat(fromUnified);
}
function supervisorExpensesTotal(supervisorId, from, to){
  return toInt(supervisorExpensesInRange(supervisorId, from, to).reduce((s,e)=>s+toInt(e.amount),0));
}
function supervisorEquipmentCost(supervisorId, from, to){
  const ids = new Set(equipmentOfSupervisor(supervisorId).map(eq=>eq.id));
  return toInt((DATA.equipmentDaily||[]).filter(d=>{
    if(!ids.has(d.equipmentId)) return false;
    if(from && (d.date||'')<from) return false;
    if(to && (d.date||'')>to) return false;
    return true;
  }).reduce((s,d)=>s+equipmentDailyCost(d, getEquipment(d.equipmentId)),0));
}

/**
 * كشف حساب المشرف — مصدر واحد لكل الشاشات والطباعة.
 * الحساب: المستحق (أجور + بدلات + تكاليف) لكل من (عماله + المشرف نفسه + معداته)
 *         − خصومات/جزاءات − مصاريف − المدفوع = المتبقي.
 * بالتعريف: المتبقي الكلي = متبقي العمال + متبقي المشرف + متبقي المعدات (بيتحقق في فحص البيانات).
 */
function matchesStmtProject(val, projectFilter){
  const f = String(projectFilter||'').trim();
  if(!f) return true;
  return String(val||'').trim() === f;
}
function supervisorWageStatement(supervisorId, from, to, project){
  const F = from||undefined, T = to||undefined;
  const P = String(project||'').trim();
  const matchP = (val)=> matchesStmtProject(val, P);
  // عند اختيار مشروع: نحسب من السجلات المرتبطة بالمشروع فقط
  function workerAttFiltered(workerId){
    return workerAttendanceInRange(workerId, F, T).filter(a=>matchP(a.project));
  }
  function workerDaysWorkedP(workerId){
    if(!P) return workerDaysWorked(workerId, F, T);
    const sum = workerAttFiltered(workerId).reduce((s,a)=>s+attendanceDaysCredit(a),0);
    return Math.round(sum*100)/100;
  }
  function workerDaysAbsentP(workerId){
    if(!P) return toInt(workerDaysAbsent(workerId, F, T));
    return new Set(workerAttFiltered(workerId).filter(a=>String(a.status||'').toLowerCase()==='absent').map(a=>a.date||'')).size;
  }
  function workerDueAmountP(workerId){
    if(!P) return workerDueAmount(workerId, F, T);
    const w = getWorker(workerId);
    return toInt(workerAttFiltered(workerId).reduce((s,a)=>s+attendanceNetPay(a,w),0));
  }
  function filterByProjectList(list, getProj){
    if(!P) return list||[];
    return (list||[]).filter(x=>matchP(typeof getProj==='function'?getProj(x):x.project));
  }
  function paymentsForPerson(personType, personId){
    return (DATA.workerPayments||[]).filter(p=>{
      if(!p || p.personType!==personType || p.personId!==personId) return false;
      if(!isActualPayment(p)) return false;
      if(F && (p.date||'')<F) return false;
      if(T && (p.date||'')>T) return false;
      if(P && !matchP(p.project)) return false;
      return true;
    });
  }
  function penaltiesForPerson(personType, personId){
    return (DATA.workerPayments||[]).filter(p=>{
      if(!p || p.personType!==personType || p.personId!==personId) return false;
      const t = String(p.type||'').toLowerCase();
      if(t!=='penalty' && t!=='deduction' && t!=='خصم' && t!=='جزاء') return false;
      if(F && (p.date||'')<F) return false;
      if(T && (p.date||'')>T) return false;
      if(P && !matchP(p.project)) return false;
      return true;
    });
  }
  const workers = workersOfSupervisor(supervisorId);
  const rows = workers.map(w=>{
    const days = workerDaysWorkedP(w.id);
    const absent = toInt(workerDaysAbsentP(w.id));
    const baseDue = workerDueAmountP(w.id);
    let extras, costs, paid, penalty, expenses;
    if(!P){
      extras = personExtrasTotal('worker', w.id, F, T);
      costs = personCostsTotal('worker', w.id, F, T);
      paid = workerPaidTotal(w.id, F, T);
      penalty = workerPenaltyTotal(w.id, F, T);
      expenses = personExpensesTotal('worker', w.id, F, T);
    } else {
      costs = toInt(filterByProjectList(costsInRange('worker', w.id, F, T)).reduce((s,c)=>s+toInt(c.amount),0));
      // بدلات بدون تكاليف ضمن extras: personExtrasTotal = costs + bonuses — نفصل
      const allExtras = personExtrasTotal('worker', w.id, F, T);
      const allCosts = personCostsTotal('worker', w.id, F, T);
      const bonusesOnly = toInt(allExtras - allCosts);
      // عند فلتر المشروع: التكاليف بالمشروع + البدلات إن وُجد لها مشروع (أو نُبقي البدلات 0 إن لا مشروع)
      const bonusPays = (DATA.workerPayments||[]).filter(p=>{
        if(!p || p.personType!=='worker' || p.personId!==w.id) return false;
        if(String(p.type||'')!=='bonus' && String(p.payKind||'')!=='bonus') return false;
        if(F && (p.date||'')<F) return false;
        if(T && (p.date||'')>T) return false;
        return matchP(p.project);
      });
      const bonusAmt = toInt(bonusPays.reduce((s,p)=>s+toInt(p.amount),0));
      extras = toInt(costs + bonusAmt);
      paid = toInt(paymentsForPerson('worker', w.id).reduce((s,p)=>s+toInt(p.amount),0));
      penalty = toInt(penaltiesForPerson('worker', w.id).reduce((s,p)=>s+toInt(p.amount),0));
      expenses = toInt(filterByProjectList(
        (typeof personExpensesList==='function'?personExpensesList('worker',w.id,F,T):null) ||
        (DATA.expenses||[]).filter(e=>e.personKind==='worker'&&e.personId===w.id)
      ).filter(e=>{
        if(F && (e.date||'')<F) return false;
        if(T && (e.date||'')>T) return false;
        return true;
      }).reduce((s,e)=>s+toInt(e.amount),0));
    }
    const due = toInt(baseDue + extras);
    const bal = toInt(due - penalty - expenses - paid);
    return { w, days, absent, baseDue, extras, costs, due, paid, penalty, expenses, bal };
  }).filter(r=> !(F||T||P) || r.days>0 || r.baseDue>0);   // عند تحديد فترة/مشروع: العمال اللي اشتغلوا فيها فقط
  const sum = (k)=> toInt(rows.reduce((s,r)=>s+(Number(r[k])||0),0));
  const workersBaseDue = sum('baseDue'), workersExtras = sum('extras'), workersCosts = sum('costs');
  const workersDue = sum('due'), workersPaid = sum('paid'), workersPenalty = sum('penalty'), workersExpenses = sum('expenses');
  const workersBal = toInt(workersDue - workersPenalty - workersExpenses - workersPaid);

  let ownDays, ownBaseDue, ownExtras, ownCosts, ownDue, ownPaid, ownPenalty, ownExpenses, ownBal;
  if(!P){
    ownDays = supervisorOwnDays(supervisorId, F, T);
    ownBaseDue = supervisorOwnDue(supervisorId, F, T);
    ownExtras = personExtrasTotal('supervisor', supervisorId, F, T);
    ownCosts = personCostsTotal('supervisor', supervisorId, F, T);
    ownDue = toInt(ownBaseDue + ownExtras);
    ownPaid = supervisorPaidTotal(supervisorId, F, T);
    ownPenalty = supervisorPenaltyTotal(supervisorId, F, T);
    ownExpenses = supervisorExpensesTotal(supervisorId, F, T);
    ownBal = toInt(ownDue - ownPenalty - ownExpenses - ownPaid);
  } else {
    const ownAtt = supervisorOwnAttendance(supervisorId, F, T).filter(a=>matchP(a.project));
    const sRec0 = getSupervisor(supervisorId);
    ownDays = Math.round(ownAtt.reduce((s,a)=>s+attendanceDaysCredit(a),0)*100)/100;
    ownBaseDue = toInt(ownAtt.reduce((s,a)=>s+attendanceNetPay(a,sRec0),0));
    ownCosts = toInt(filterByProjectList(costsInRange('supervisor', supervisorId, F, T)).reduce((s,c)=>s+toInt(c.amount),0));
    ownExtras = ownCosts; // + bonuses for project if any
    ownDue = toInt(ownBaseDue + ownExtras);
    ownPaid = toInt(paymentsForPerson('supervisor', supervisorId).reduce((s,p)=>s+toInt(p.amount),0));
    ownPenalty = toInt(penaltiesForPerson('supervisor', supervisorId).reduce((s,p)=>s+toInt(p.amount),0));
    ownExpenses = toInt(filterByProjectList(supervisorExpensesInRange(supervisorId, F, T)).reduce((s,e)=>s+toInt(e.amount),0));
    ownBal = toInt(ownDue - ownPenalty - ownExpenses - ownPaid);
  }

  const eqIds = new Set(equipmentOfSupervisor(supervisorId).map(eq=>eq.id));
  let equipCost, equipPaid, equipBal;
  if(!P){
    equipCost = supervisorEquipmentCost(supervisorId, F, T);
    equipPaid = toInt((DATA.workerPayments||[]).filter(p=>{
      if(p.personType!=='equipment' || !eqIds.has(p.personId)) return false;
      if(!isActualPayment(p)) return false;
      if(F && (p.date||'')<F) return false;
      if(T && (p.date||'')>T) return false;
      return true;
    }).reduce((s,p)=>s+toInt(p.amount),0));
  } else {
    equipCost = toInt((DATA.equipmentDaily||[]).filter(d=>{
      if(!eqIds.has(d.equipmentId)) return false;
      if(F && (d.date||'')<F) return false;
      if(T && (d.date||'')>T) return false;
      return matchP(d.project);
    }).reduce((s,d)=>s+equipmentDailyCost(d, getEquipment(d.equipmentId)),0));
    equipPaid = toInt((DATA.workerPayments||[]).filter(p=>{
      if(p.personType!=='equipment' || !eqIds.has(p.personId)) return false;
      if(!isActualPayment(p)) return false;
      if(F && (p.date||'')<F) return false;
      if(T && (p.date||'')>T) return false;
      return matchP(p.project);
    }).reduce((s,p)=>s+toInt(p.amount),0));
  }
  equipBal = toInt(equipCost - equipPaid);

  const expList = filterByProjectList(supervisorExpensesInRange(supervisorId, F, T));
  const equipLogs = (DATA.equipmentDaily||[]).filter(d=>{
    if(!eqIds.has(d.equipmentId)) return false;
    if(F && (d.date||'') < F) return false;
    if(T && (d.date||'') > T) return false;
    if(P && !matchP(d.project)) return false;
    return true;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(d=>{
    const eq = getEquipment(d.equipmentId);
    return {
      d, eq, date: d.date,
      name: eq ? (eq.name||eq.code||'') : '—', code: eq ? (eq.code||'') : '',
      project: d.project||'',
      days: Number(d.days)||0, hours: Number(d.hours)||0, fuel: Number(d.fuelLiters)||0,
      dailyCost: toInt(d.dailyCost!=null?d.dailyCost:(eq&&eq.dailyCost)),
      cost: equipmentDailyCost(d, eq)
    };
  });
  // يوميات المشرف نفسه — بنفس قواعد الأيام والأجر المستخدمة في باقي النظام
  const sRec = getSupervisor(supervisorId);
  const ownLogs = supervisorOwnAttendance(supervisorId, F, T).filter(a=>matchP(a.project)).slice()
    .sort((a,b)=>(a.date||'').localeCompare(b.date||''))
    .map(a=>({
      a, date: a.date, status: a.status||'present',
      days: attendanceDaysCredit(a),
      wage: attendanceDayWage(a, sRec),
      net: attendanceNetPay(a, sRec),
      project: a.project||'', notes: a.notes||''
    }));
  // كل التكاليف (المشرف + عماله) كصفوف للجدول
  const costsList = [];
  const addCosts = (kind, id, name)=> costsInRange(kind, id, F, T).filter(c=>matchP(c.project)).forEach(c=>costsList.push({ date:c.date, kind, name, item:costItemText(c), project:c.project, notes:c.notes, amount:toInt(c.amount) }));
  addCosts('supervisor', supervisorId, sRec ? sRec.name : '');
  workers.forEach(w=>addCosts('worker', w.id, w.name));
  costsList.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));

  const totalDue = toInt(workersDue + ownDue + equipCost);
  const totalPenalty = toInt(workersPenalty + ownPenalty);
  const totalExpenses = toInt(workersExpenses + ownExpenses);
  const totalPaid = toInt(workersPaid + ownPaid + equipPaid);
  return {
    workers: rows,
    workersBaseDue, workersExtras, workersCosts, workersDue, workersPenalty, workersExpenses, workersPaid, workersBal,
    ownDays, ownBaseDue, ownExtras, ownCosts, ownDue, ownPenalty, ownExpenses, ownPaid, ownBal, ownLogs,
    equipCost, equipPaid, equipBal, equipLogs,
    totalDue, totalPenalty, totalExpenses, totalPaid,
    totalBal: toInt(totalDue - totalPenalty - totalExpenses - totalPaid),
    totalDays: Math.round((rows.reduce((s,r)=>s+(Number(r.days)||0),0) + (Number(ownDays)||0)) * 100) / 100,
    expenses: ownExpenses, expList, costsList
  };
}

function equipmentOptions(selected){
  return selectOptions((DATA.equipment||[]).map(eq=>({id:eq.id, name:eq.name+(eq.code?' ('+eq.code+')':'')})), selected, '— اختر المعدة —');
}
async function downloadXlsx(filename, headers, rows, sheetName){
  const fname = (filename||'تصدير').endsWith('.xlsx') ? filename : (filename||'تصدير')+'.xlsx';
  let h = headers || [];
  let r = (rows || []).map(row => (Array.isArray(row) ? row : [row]).map(c => c==null?'':c));
  // لا نعيد التنسيق إذا استُدعي من bind بعد prepare — آمن إعادة التنسيق
  if(typeof prepareExportTable==='function'){
    const p = prepareExportTable(h, r);
    h = p.headers; r = p.rows;
  }
  // 1) سطح المكتب عبر IPC
  if(window.desktopApi && window.desktopApi.exportExcel){
    try{
      const res = await window.desktopApi.exportExcel({
        filename: fname,
        sheetName: (sheetName || 'بيانات').toString().slice(0, 31),
        headers: h,
        rows: r
      });
      if(res && res.canceled) return false;
      if(res && res.ok){ showToast('تم تصدير إكسيل'); return true; }
      if(res && res.error){ showToast('إكسيل: '+res.error); console.warn(res.error); }
    }catch(e){ console.warn('exportExcel failed', e); }
  }
  // 2) متصفح: محاولة SheetJS إن وُجدت
  try{
    if(typeof XLSX!=='undefined' && XLSX.utils){
      const aoa = [h, ...r];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'بيانات').toString().slice(0, 31));
      XLSX.writeFile(wb, fname);
      showToast('تم تصدير إكسيل');
      return true;
    }
  }catch(e){ console.warn('browser xlsx failed', e); }
  showToast('تعذر إنشاء ملف إكسيل. تأكد أنك تشغّل نسخة سطح المكتب.');
  return false;
}
/** تصدير الصفحة الحالية (البيانات الظاهرة بعد الفلاتر) */
window.__pageExport = null;
/** تصنيفات الكيانات: workers | employees | supervisors | drivers | equipment */

/** حقول العاملين حسب أعمدة كشف الأسماء (إكسيل الشركة) */
const CARD_STATUS_OPTS = [
  { code:'valid', label:'سارية' },
  { code:'expired', label:'منتهية' },
  { code:'none', label:'لا يوجد' }
];
const CONTRACT_TYPE_OPTS = [
  { code:'permanent', label:'دائم' },
  { code:'temp', label:'مؤقت' },
  { code:'daily', label:'يومي' },
  { code:'contract', label:'عقد محدد المدة' }
];
const CONTRACT_STATUS_OPTS = [
  { code:'active', label:'ساري' },
  { code:'expired', label:'منتهي' },
  { code:'suspended', label:'موقوف' }
];
const INSURANCE_STATUS_OPTS = [
  { code:'insured', label:'مؤمَّن' },
  { code:'none', label:'غير مؤمن عليه' },
  { code:'pending', label:'قيد التسجيل' }
];
function personHrFieldsHtml(prefix, p, opts){
  opts = opts || {};
  p = p || {};
  const showSalary = opts.showSalary !== false;
  const showWage = !!opts.showWage;
  const showPosition = opts.showPosition !== false;
  const showLicense = opts.showLicense !== false;
  return `
    <label>الوظيفة ${showPosition?'':'style="display:none"'}
      <input class="input" id="${prefix}Pos" value="${escapeHtml(p.position||p.jobTitle||p.skill||'')}" placeholder="مهندس، محاسب، نجار...">
    </label>
    <label>الرقم القومي
      <input class="input" id="${prefix}Nid" value="${escapeHtml(p.nationalId||'')}" placeholder="14 رقم">
    </label>
    <label>تاريخ الميلاد
      <input class="input" id="${prefix}Birth" type="date" value="${escapeHtml(p.birthDate||'')}">
    </label>
    <label>تاريخ انتهاء البطاقة الشخصية
      <input class="input auto-status-date" id="${prefix}IdCardExp" type="date" value="${escapeHtml(p.idCardExpiry||'')}" data-status-target="${prefix}IdCardStatus">
    </label>
    <label>حالة البطاقة
      <select class="input" id="${prefix}IdCardStatus" disabled>
        <option value="">—</option>
        ${selectOptions(CARD_STATUS_OPTS, p.idCardExpiry?statusFromExpiry(p.idCardExpiry):(p.idCardStatus||''))}
      </select>
    </label>
    ${showLicense?`
    <label>تاريخ انتهاء الرخصة الشخصية
      <input class="input auto-status-date" id="${prefix}LicExp" type="date" value="${escapeHtml(p.licenseExpiry||'')}" data-status-target="${prefix}LicStatus">
    </label>
    <label>حالة الرخصة
      <select class="input" id="${prefix}LicStatus" disabled>
        <option value="">—</option>
        ${selectOptions(CARD_STATUS_OPTS, p.licenseExpiry?statusFromExpiry(p.licenseExpiry):(p.licenseStatus||''))}
      </select>
    </label>`:''}
    <label>تاريخ التعيين
      <input class="input" id="${prefix}Hire" type="date" value="${escapeHtml(p.hireDate||todayISO())}">
    </label>
    <label>نوع العقد
      <select class="input" id="${prefix}ContractType">
        <option value="">—</option>
        ${selectOptions(CONTRACT_TYPE_OPTS, p.contractType||'')}
      </select>
    </label>
    <label>حالة العقد
      <select class="input" id="${prefix}ContractStatus">
        <option value="">—</option>
        ${selectOptions(CONTRACT_STATUS_OPTS, p.contractStatus||'')}
      </select>
    </label>
    ${showSalary?`<label>الراتب الأساسي
      <input class="input" id="${prefix}Salary" type="number" min="0" step="0.01" value="${(p.salary||p.basicSalary)?toInt(p.salary||p.basicSalary):''}" placeholder="">
    </label>`:''}
    ${showWage?`<label>اليومية الافتراضية (ج.م)
      <input class="input" id="${prefix}Wage" type="number" min="0" step="0.01" value="${p.dailyWage?toInt(p.dailyWage):''}" placeholder="">
    </label>`:''}
    <label>الرقم التأميني
      <input class="input auto-ins-no" id="${prefix}InsNo" value="${escapeHtml(p.insuranceNumber||'')}" placeholder="رقم التأمين" data-ins-status="${prefix}InsStatus">
    </label>
    <label>حالة التأمين
      <select class="input" id="${prefix}InsStatus">
        <option value="">—</option>
        ${selectOptions(INSURANCE_STATUS_OPTS, p.insuranceStatus||'')}
      </select>
    </label>
    <label>الهاتف
      <input class="input" id="${prefix}Phone" value="${escapeHtml(p.phone||'')}" placeholder="01xxxxxxxxx">
    </label>
  `;
}

function bindAutoInsurance(scope){
  // لا ربط تلقائي بين الرقم التأميني وحالة التأمين — التعديل يدوي بالكامل
}
function bindAutoStatusDates(scope){
  if(typeof bindAutoInsurance==='function') bindAutoInsurance(scope);

  const root = scope || document;
  root.querySelectorAll('.auto-status-date').forEach(inp=>{
    if(inp.dataset.boundAuto) return;
    inp.dataset.boundAuto = '1';
    const sync = ()=>{
      const tid = inp.getAttribute('data-status-target');
      const sel = tid ? document.getElementById(tid) : null;
      if(!sel) return;
      const st = statusFromExpiry(inp.value||'');
      sel.disabled = false;
      sel.value = st;
      sel.disabled = true;
    };
    inp.addEventListener('change', sync);
    inp.addEventListener('input', sync);
  });
}

function collectPersonHrFields(prefix, opts){
  opts = opts || {};
  const g = (id)=>{ const el=document.getElementById(prefix+id); return el?el.value:''; };
  const idExpRaw = g('IdCardExp')||'';
  const licExpRaw = g('LicExp')||'';
  const idExp = typeof toISODate==='function'?toISODate(idExpRaw):idExpRaw;
  const licExp = typeof toISODate==='function'?toISODate(licExpRaw):licExpRaw;
  const hireRaw = g('Hire')||'';
  const hire = typeof toISODate==='function'?toISODate(hireRaw):hireRaw;
  const out = {
    nationalId: (g('Nid')||'').trim(),
    birthDate: (typeof toISODate==='function'?toISODate(g('Birth')||''):(g('Birth')||'')) || '',
    idCardExpiry: idExp||'',
    licenseExpiry: licExp||'',
    hireDate: hire||'',
    contractType: g('ContractType')||'',
    contractStatus: g('ContractStatus')||'',
    insuranceNumber: (g('InsNo')||'').trim(),
    insuranceStatus: (g('InsStatus')||'').trim(),
    phone: (g('Phone')||'').trim()
  };
  // حالة البطاقة/الرخصة من التاريخ فقط لو التاريخ موجود — وإلا لا نمس الحالة القديمة
  if(idExpRaw) out.idCardStatus = statusFromExpiry(idExpRaw);
  if(licExpRaw) out.licenseStatus = statusFromExpiry(licExpRaw);
  const pos = (g('Pos')||'').trim();
  if(pos){ out.position = pos; if(opts.skillFromPos) out.skill = pos; }
  if(opts.showSalary !== false){
    const sal = document.getElementById(prefix+'Salary');
    if(sal && sal.value!=='') out.salary = toInt(sal.value);
  }
  if(opts.showWage){
    const w = document.getElementById(prefix+'Wage');
    if(w && w.value!=='') out.dailyWage = toInt(w.value);
  }
  return out;
}

/** دمج تعديل شخص بدون مسح بيانات الأعمدة بقيم فارغة من الفورم */
function mergePersonRecord(target, payload){
  if(!target || !payload) return target;
  const preserveIfEmpty = new Set([
    'phone','nationalId','idCardExpiry','idCardStatus','licenseExpiry','licenseStatus',
    'insuranceNumber','insuranceStatus','contractType','contractStatus','hireDate',
    'address','notes','email','salary','basicSalary','dailyWage','skill','position','jobTitle',
    'project','supervisorId','birthDate','qualification','militaryStatus','photo',
    'attachments','extraFields','leaveBalance','employmentType','code','name'
  ]);
  Object.keys(payload).forEach(k=>{
    const v = payload[k];
    if(v===undefined) return;
    // لا تمسح قيمة موجودة بقيمة فارغة
    if(preserveIfEmpty.has(k)){
      const empty = (v==='' || v===null || (typeof v==='number' && isNaN(v)));
      const had = target[k]!==undefined && target[k]!==null && target[k]!=='';
      if(empty && had) return;
    }
    // المرفقات: لا تستبدل بمصفوفة فاضية لو كان فيه مرفقات
    if(k==='attachments' && Array.isArray(v) && v.length===0 && Array.isArray(target.attachments) && target.attachments.length){
      return;
    }
    target[k] = v;
  });
  return target;
}


const HIRE_REQUIRED_DOCS = [
  { code:'qualification', label:'أصل شهادة المؤهل' },
  { code:'military', label:'أصل شهادة الجيش' },
  { code:'birth', label:'أصل شهادة الميلاد' },
  { code:'contract', label:'عقد العمل' },
  { code:'criminal', label:'فيش وتشبيه' },
  { code:'id_card', label:'صورة البطاقة الشخصية' },
  { code:'photo', label:'صور شخصية' },
  { code:'work_stub', label:'كعب عمل' },
  { code:'insurance', label:'برنت تأميني' }
];
const DRIVER_EXTRA_DOCS = [
  { code:'driver_license_img', label:'صورة الرخصة الشخصية' },
  { code:'driver_license_data', label:'شهادة بيانات الرخصة' }
];

function defaultRequiredDocsForKind(kind){
  if(kind==='resigned' || kind==='مستقيلين'){
    return [
      { code:'res_id_card', label:'صورة البطاقة الشخصية' },
      { code:'res_contract', label:'صورة من عقد العمل' },
      { code:'res_qualification', label:'صورة المؤهل' },
      { code:'res_birth', label:'صورة شهادة الميلاد' },
      { code:'res_military', label:'صورة شهادة الجيش' },
      { code:'res_resign_request', label:'طلب استقالة' },
      { code:'res_clearance', label:'نموذج إخلاء طرف' },
      { code:'res_final_settlement', label:'مخالصة مالية نهائية' },
      { code:'res_docs_receipt', label:'إيصال استلام أصول المستندات' }
    ];
  }
  if(kind==='equipment') return (typeof EQUIPMENT_REQUIRED_DOCS!=='undefined'?EQUIPMENT_REQUIRED_DOCS:[]).map(d=>({code:d.code,label:d.label}));
  const base = (typeof HIRE_REQUIRED_DOCS!=='undefined'?HIRE_REQUIRED_DOCS:[]).map(d=>({code:d.code,label:d.label}));
  if(kind==='driver') return base.concat((typeof DRIVER_EXTRA_DOCS!=='undefined'?DRIVER_EXTRA_DOCS:[]).map(d=>({code:d.code,label:d.label})));
  return base;
}
function personRequiredDocsList(kind){
  kind = kind || 'employee';
  if(!DATA.requiredDocsByKind) DATA.requiredDocsByKind = {};
  const custom = DATA.requiredDocsByKind[kind];
  // لو المستخدم مسح كل الأوراق المطلوبة عمداً (من الإعدادات) نحترم ده ومنرجعش الافتراضي
  if(Array.isArray(custom) && !custom.length && DATA.requiredDocsEmpty && DATA.requiredDocsEmpty[kind]) return [];
  if(Array.isArray(custom) && custom.length){
    return custom.map(d=>({ code: d.code||d.id||String(d.label||d.name||'').slice(0,24), label: d.label||d.name||d.code||'' })).filter(d=>d.label);
  }
  return defaultRequiredDocsForKind(kind);
}
function ensureRequiredDocsDefaults(){
  if(!DATA.requiredDocsByKind) DATA.requiredDocsByKind = {};
  ['employee','worker','supervisor','driver','equipment','resigned'].forEach(k=>{
    if(DATA.requiredDocsEmpty && DATA.requiredDocsEmpty[k] && Array.isArray(DATA.requiredDocsByKind[k]) && !DATA.requiredDocsByKind[k].length) return;
    if(!Array.isArray(DATA.requiredDocsByKind[k]) || !DATA.requiredDocsByKind[k].length){
      DATA.requiredDocsByKind[k] = defaultRequiredDocsForKind(k).map(d=>({code:d.code,label:d.label}));
    }
  });
}


/** توحيد النص العربي للمطابقة (همزات/ياء/تاء مربوطة/تشكيل) — يتجاهل اختلاف طريقة الكتابة */
function docNormText(x){
  if(typeof normAr==='function') return normAr(x);
  return String(x==null?'':x).toLowerCase();
}
/** كلمات لا تُعتبر دليلاً على ورقة بعينها (لمنع أن ورقة تغطي ورقة تانية بالغلط) */
const DOC_EXCLUDE_WORDS = {
  driver_license_img: ['بيانات'],
  driver_license: ['بيانات'],
  vehicle_license: ['سائق','قيادة'],
  photo: ['بطاقة']
};
function docTextMatches(txt, words, excludes){
  const t = docNormText(txt);
  if(!t.trim()) return false;
  if((excludes||[]).some(x=>x && t.indexOf(docNormText(x))!==-1)) return false;
  return words.some(w=>w && t.indexOf(w)!==-1);
}
/** فهرس مستندات الأرشيف حسب الشخص — لتسريع الفحص الجماعي */
function buildPersonDocsIndex(){
  const m = {};
  (DATA.personDocuments||[]).forEach(d=>{
    if(!d || !d.personId) return;
    (m[d.personId] = m[d.personId] || []).push(d);
  });
  return m;
}

function personHasDocHint(person, doc, docsIdx){
  if(!person || !doc) return false;
  const aliases = {
    id_card:['بطاقة','قومي','رقم قومي','بطاقة شخصية','صورة البطاقة'],
    birth:['ميلاد','شهادة الميلاد'],
    military:['جيش','عسكري','شهادة الجيش'],
    qualification:['مؤهل','شهادة المؤهل'],
    insurance:['تأمين','برنت','برنت تأميني'],
    work_stub:['كعب','كعب عمل'],
    contract:['عقد','عقد عمل'],
    criminal:['فيش','تشبيه'],
    photo:['صورة شخصية','صور شخصية'],
    driver_license_img:['رخصة','قيادة','رخصة القيادة'],
    driver_license_data:['بيانات الرخصة','شهادة بيانات'],
    res_id_card:['بطاقة','قومي','بطاقة شخصية','صورة البطاقة'],
    res_contract:['عقد','عقد عمل'],
    res_qualification:['مؤهل','شهادة المؤهل'],
    res_birth:['ميلاد','شهادة الميلاد'],
    res_military:['جيش','عسكري','شهادة الجيش'],
    res_resign_request:['طلب استقالة','استقالة'],
    res_clearance:['إخلاء طرف','اخلاء طرف'],
    res_final_settlement:['مخالصة','مخالصة مالية','مخالصة نهائية'],
    res_docs_receipt:['إيصال استلام','استلام أصول','أصول المستندات']
  };
  const words = (aliases[doc.code]||[]).concat([doc.label, doc.code, ...(doc.keys||[])]).filter(Boolean).map(w=>docNormText(w));
  const excl = DOC_EXCLUDE_WORDS[doc.code] || [];
  const hasFile = (a)=> !!(a && (a.path || a.storedName || a.dataUrl || a.url));
  // مرفقات الكيان فقط إن وُجد ملف فعلي
  for(const a of (person.attachments||[])){
    if(!hasFile(a)) continue;
    const t = [a.docType, a.fromDoc, a.name, a.note, a.title].join(' ');
    if(docTextMatches(t, words, excl)) return true;
  }
  // مستندات الأرشيف: نوع مطابق + ملف موجود
  const docs = docsIdx ? (docsIdx[person.id]||[]) : (DATA.personDocuments||[]).filter(d=>d && d.personId===person.id);
  for(const d of docs){
    if(!docTextMatches([d.docType, d.title, d.name].join(' '), words, excl)) continue;
    if((d.attachments||[]).some(hasFile)) return true;
  }
  return false;
}


const EQUIPMENT_REQUIRED_DOCS = [
  { code:'purchase_contract', label:'أصل عقد الشراء' },
  { code:'driver_license', label:'رخصة قيادة السائق' },
  { code:'vehicle_data', label:'شهادة البيانات' },
  { code:'insurance_doc', label:'وثيقة التأمين' },
  { code:'owner_id', label:'بطاقة الرقم القومي للمالك' },
  { code:'vehicle_license', label:'رخصة المركبة أو المعدة' },
  { code:'inspection', label:'شهادة الفحص الفني' }
];

function equipmentHasDocHint(eq, doc, docsIdx){
  if(!eq || !doc) return false;
  const aliases = {
    purchase_contract:['عقد شراء','عقد الشراء','شراء'],
    driver_license:['رخصة قيادة','رخصة السائق','قيادة'],
    vehicle_data:['شهادة بيانات','شهادة البيانات','بيانات'],
    insurance_doc:['وثيقة التأمين','تأمين','تامين'],
    owner_id:['بطاقة','قومي','المالك','رقم قومي'],
    vehicle_license:['رخصة المركبة','رخصة المعدة','استمارة','ترخيص'],
    inspection:['فحص فني','فحص','شهادة الفحص']
  };
  const words = (aliases[doc.code]||[]).concat([doc.label, doc.code]).filter(Boolean).map(w=>docNormText(w));
  const excl = DOC_EXCLUDE_WORDS[doc.code] || [];
  const hasFile = (a)=> !!(a && (a.path || a.storedName || a.dataUrl || a.url));
  for(const a of (eq.attachments||[])){
    if(!hasFile(a)) continue;
    if(docTextMatches([a.docType,a.fromDoc,a.name,a.note,a.title].join(' '), words, excl)) return true;
  }
  const docs = docsIdx ? (docsIdx[eq.id]||[]) : (DATA.personDocuments||[]).filter(d=>d && d.personId===eq.id);
  for(const d of docs){
    if(!docTextMatches([d.docType,d.title,d.name].join(' '), words, excl)) continue;
    if((d.attachments||[]).some(hasFile)) return true;
  }
  return false;
}

function equipmentNotesIssues(eq){
  if(!eq) return [];
  const issues = [];
  const today = typeof todayISO==='function' ? todayISO() : new Date().toISOString().slice(0,10);
  // حالة التشغيل
  const st = String(eq.status||'').toLowerCase();
  if(st==='maintenance' || st==='صيانة') issues.push('تحت الصيانة');
  if(st==='broken' || st==='عاطلة') issues.push('عاطلة / معطلة');
  if(st==='stopped' || st==='متوقفة' || st==='stopped_down') issues.push('متوقفة / عاطلة');
  if(st==='rented' || st==='مؤجرة' || st==='rented_out') issues.push('مؤجرة');
  if(!(eq.project||'').toString().trim()) issues.push('بدون مشروع');
  if(!eq.supervisorId) issues.push('بدون مشرف');
  // رخصة المركبة
  const vExp = eq.vehicleLicenseExpiry || eq.licenseExpiry || '';
  if(vExp){
    if(typeof statusFromExpiry==='function' && statusFromExpiry(vExp)==='expired') issues.push('رخصة المركبة منتهية');
    else if(typeof statusFromExpiry==='function' && statusFromExpiry(vExp)==='soon') issues.push('رخصة المركبة قاربت على الانتهاء');
  } else {
    issues.push('لا يوجد تاريخ انتهاء رخصة');
  }
  // رخصة السائق إن وُجدت
  const dExp = eq.driverLicenseExpiry || '';
  if(dExp && typeof statusFromExpiry==='function' && statusFromExpiry(dExp)==='expired')
    issues.push('رخصة السائق منتهية');
  // التأمين
  const insSt = String(eq.insuranceStatus||'').toLowerCase().trim();
  if(!insSt){
    issues.push('حالة التأمين ناقصة');
  } else if(insSt==='none' || insSt==='uninsured' || insSt==='غير مؤمن' || insSt.indexOf('غير مؤمن')>=0){
    issues.push('غير مؤمن عليها');
  } else if((insSt==='insured' || insSt==='مؤم') && !(eq.insuranceNumber||'').toString().trim()){
    issues.push('الرقم التأميني ناقص');
  }
  // رقم اللوحة
  if(!(eq.vehicleNumber||eq.plate||'').toString().trim()){
    issues.push('رقم اللوحة ناقص');
  }
  // صيانة
  if(eq.nextMaintenance){
    const nm = String(eq.nextMaintenance).slice(0,10);
    if(nm < today) issues.push('تجاوز موعد الصيانة');
    else {
      // خلال 14 يوم
      try{
        const d1 = new Date(nm+'T12:00:00');
        const d0 = new Date(today+'T12:00:00');
        const diff = (d1-d0)/(86400000);
        if(diff>=0 && diff<=14) issues.push('صيانة قريبة خلال '+Math.round(diff)+' يوم');
      }catch(_e){}
    }
  }
  // أوراق ناقصة (من الإعدادات)
  (typeof personRequiredDocsList==='function'?personRequiredDocsList('equipment'):(EQUIPMENT_REQUIRED_DOCS||[])).forEach(doc=>{
    if(!equipmentHasDocHint(eq, doc)) issues.push('ناقص: '+doc.label);
  });
  // ملاحظات يدوية من notesLog — تُعرض في القائمة المنفصلة وليس كتنبيه تلقائي مكرر
  const dismissed = new Set((eq.dismissedNotes||[]).map(x=>String(x).trim()));
  return issues.filter(i=>!dismissed.has(String(i).trim()));
}

function equipmentNotesCellHtml(eq){
  const issues = equipmentNotesIssues(eq);
  if(!issues.length) return '<span class="notes-ok">✓ مكتمل</span>';
  const show = issues.slice(0, 3);
  const more = issues.length > 3 ? issues.length - 3 : 0;
  return `<ul class="notes-list" title="${escapeHtml(issues.join('\\n'))}">
    ${show.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}
    ${more?`<li class="notes-more">+${more} أخرى</li>`:''}
  </ul>`;
}


/** عامل شركة فقط يُتوقَّع تأمينه — عامل يومية / مشروع / حرفي لا */
function workerNeedsInsurance(person){
  if(!person) return false;
  const wt = String(person.workerType||person.type||'').toLowerCase();
  if(wt==='temporary' || wt==='temp' || wt==='daily' || wt==='مؤقت') return false;
  if(wt==='company' || wt==='permanent' || wt==='شركة' || wt==='company_worker') return true;
  const job = String(person.skill||person.position||person.jobTitle||'');
  if(/شركة/.test(job)) return true;
  if(/مؤقت|يومية|يوميه/.test(job)) return false;
  return false;
}

function isTemporaryWorker(person){
  if(!person) return false;
  const t = String(person.workerType || person.type || '').toLowerCase();
  return /temporary|temp|daily|مؤقت|يومية|يوميه/.test(t);
}
function personNotesIssues(kind, person){
  if(!person) return [];
  if(kind==='equipment' && typeof equipmentNotesIssues==='function') return equipmentNotesIssues(person);
  const issues = [];
  const dismissed = new Set((person.dismissedNotes||[]).map(x=>String(x).trim()));

  // المستقيلون: أوراق ملف الاستقالة فقط + تاريخ الاستقالة
  if(typeof isResignedStatus==='function' && isResignedStatus(person.status)){
    if(!(person.resignedAt||person.resignDate||'').toString().trim())
      issues.push('تاريخ الاستقالة ناقص');
    const docs = (typeof personRequiredDocsList==='function') ? personRequiredDocsList('resigned') : [];
    const docsIdx = typeof buildPersonDocsIndex==='function' ? buildPersonDocsIndex() : null;
    docs.forEach(doc=>{
      if(typeof personHasDocHint==='function' && !personHasDocHint(person, doc, docsIdx))
        issues.push('ناقص: '+(doc.label||doc.code||''));
    });
    return issues.filter(i=>!dismissed.has(String(i).trim()));
  }

  // عمال مؤقتون: تنبيهات محدودة فقط (مشرف / قسم / يومية / قومي)
  if(kind==='worker' && isTemporaryWorker(person)){
    if(!(person.nationalId||person.idNumber||'').toString().trim()) issues.push('الرقم القومي ناقص');
    if(!person.supervisorId) issues.push('بدون مشرف');
    if(!(person.departmentId||person.categoryId||person.department||'').toString().trim())
      issues.push('بدون قسم');
    if(!toInt(person.dailyWage)) issues.push('بدون يومية محددة');
    return issues.filter(i=>!dismissed.has(String(i).trim()));
  }

  // بيانات أساسية
  if(!(person.name||'').trim()) issues.push('الاسم ناقص');
  if(!(person.nationalId||person.idNumber||'').toString().trim()) issues.push('الرقم القومي ناقص');
  if(!(person.phone||person.mobile||'').toString().trim()) issues.push('رقم الهاتف ناقص');
  // قسم / مشرف / يومية حسب النوع
  if(kind==='employee'){
    if(!(person.departmentId||person.department||'').toString().trim())
      issues.push('بدون قسم');
  }
  if(kind==='worker'){
    if(!person.supervisorId) issues.push('بدون مشرف');
    if(!(person.departmentId||person.categoryId||person.department||'').toString().trim())
      issues.push('بدون قسم');
    if(!toInt(person.dailyWage)) issues.push('بدون يومية محددة');
  }
  if(kind==='supervisor'){
    if(!toInt(person.dailyWage)) issues.push('بدون يومية محددة');
  }
  if(kind==='driver'){
    if(!toInt(person.dailyWage)) issues.push('بدون يومية محددة');
  }
  // بطاقة / رخصة
  if(person.idCardExpiry){
    if(statusFromExpiry(person.idCardExpiry)==='expired') issues.push('بطاقة منتهية');
    else if(statusFromExpiry(person.idCardExpiry)==='soon') issues.push('بطاقة قاربت على الانتهاء');
  } else issues.push('لا يوجد تاريخ بطاقة');
  // الرخصة للسائقين فقط — مش للعمال
  if(kind!=='worker'){
    if(person.licenseExpiry){
      if(statusFromExpiry(person.licenseExpiry)==='expired') issues.push('رخصة منتهية');
      else if(statusFromExpiry(person.licenseExpiry)==='soon') issues.push('رخصة قاربت على الانتهاء');
    } else if(kind==='driver'){
      issues.push('لا يوجد تاريخ رخصة');
    }
  }
  // درجة الرخصة للسائقين
  if(kind==='driver' && !(person.licenseGrade||'').toString().trim()){
    issues.push('درجة الرخصة ناقصة');
  }
  // أوراق مطلوبة
  personRequiredDocsList(kind).forEach(doc=>{
    if(!personHasDocHint(person, doc)) issues.push('ناقص: '+doc.label);
  });
  // تأمين — حسب حالة التأمين اليدوية فقط (مستقلة عن الرقم)
  const insSt = String(person.insuranceStatus||'').toLowerCase();
  if(insSt==='none' || insSt==='uninsured' || insSt==='غير مؤمن عليه' || insSt==='لا يوجد')
    issues.push('غير مؤمن عليه');
  // استبعاد المخفاة
  return issues.filter(i=>!dismissed.has(String(i).trim()));
}
function dismissPersonNote(kind, personId, text){
  let person = null;
  if(kind==='employee') person = getEmployee(personId);
  else if(kind==='worker') person = getWorker(personId);
  else if(kind==='supervisor') person = getSupervisor(personId);
  else if(kind==='driver') person = typeof getDriver==='function'?getDriver(personId):(DATA.drivers||[]).find(x=>x.id===personId);
  else if(kind==='equipment') person = getEquipment(personId);
  if(!person) return;
  if(!Array.isArray(person.dismissedNotes)) person.dismissedNotes = [];
  const t = String(text||'').trim();
  if(t && !person.dismissedNotes.includes(t)) person.dismissedNotes.push(t);
  saveData(true);
}


/** أزرار الصف: عرض / تعديل / حذف — رموز موفّرة للمساحة */
function rowActionBtnsHtml(opts){
  opts = opts || {};
  const id = opts.id || '';
  const viewCls = opts.viewClass || '';
  const editCls = opts.editClass || '';
  const delCls = opts.delClass || '';
  const ro = opts.readOnly || (typeof readOnlyMode!=='undefined' && readOnlyMode);
  return `<div class="row-actions">
    ${viewCls?`<button type="button" class="icon-btn icon-view ${viewCls}" data-id="${id}" title="عرض" aria-label="عرض">👁️</button>`:''}
    ${editCls?`<button type="button" class="icon-btn icon-edit ${editCls}" data-id="${id}" title="تعديل" aria-label="تعديل">✏️</button>`:''}
    ${delCls?`<button type="button" class="icon-btn icon-del ${delCls}" data-id="${id}" title="حذف" aria-label="حذف" ${ro?'disabled':''}>🗑️</button>`:''}
  </div>`;
}
function personNotesCellHtml(kind, person){
  const issues = personNotesIssues(kind, person);
  if(!issues.length) return '<span class="notes-ok">✓ مكتمل</span>';
  const show = issues.slice(0, 3);
  const more = issues.length > 3 ? issues.length - 3 : 0;
  return `<ul class="notes-list" title="${escapeHtml(issues.join('\n'))}">
    ${show.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}
    ${more?`<li class="notes-more">+${more} أخرى</li>`:''}
  </ul>`;
}


/** تصدير قوائم الأشخاص (موظفين / عمال / مشرفين / سائقين) بنفس أعمدة الجدول الظاهر بالضبط */
function personListExport(kind, list){
  const lab = (c)=> (typeof arabicLabelForCode==='function' ? arabicLabelForCode(c) : c) || '';
  const fd = (d)=> (d && typeof fmtDate==='function') ? fmtDate(d) : (d||'');
  const codeLabel = { employee:'كود الموظف', worker:'كود العامل', supervisor:'كود المشرف', driver:'كود السائق' }[kind] || 'الكود';
  const wageLabel = kind==='employee' ? 'الراتب الأساسي' : 'اليومية';
  const headers = [codeLabel,'الاسم','الوظيفة','الرقم القومي','انتهاء البطاقة','حالة البطاقة','انتهاء الرخصة','حالة الرخصة'];
  if(kind==='driver') headers.push('درجة الرخصة');
  headers.push('تاريخ التعيين','نوع العقد','حالة العقد',wageLabel,'حالة التأمين','الرقم التأميني','رقم التليفون','العنوان');
  if(kind==='worker') headers.push('المشروع','المشرف');
  headers.push('القسم');
  if(kind==='supervisor') headers.push('عدد العمال');
  headers.push('الحالة','الملاحظات');
  const rows = (list||[]).map(r=>{
    const cardSt = r.idCardExpiry && typeof statusFromExpiry==='function' ? statusFromExpiry(r.idCardExpiry) : r.idCardStatus;
    const licSt = r.licenseExpiry && typeof statusFromExpiry==='function' ? statusFromExpiry(r.licenseExpiry) : r.licenseStatus;
    const ins = r.insuranceStatus==='none' ? 'غير مؤمن عليه' : lab(r.insuranceStatus);
    const contractType = (typeof labelOf==='function' ? labelOf(typeof CONTRACT_TYPE_OPTS!=='undefined'?CONTRACT_TYPE_OPTS:[], r.contractType) : '') || lab(r.contractType);
    const position = kind==='driver' ? (r.position||'سائق') : (r.position||r.skill||'');
    const wage = kind==='employee' ? toInt(r.salary) : toInt(r.dailyWage);
    const row = [r.code||'', r.name||'', position, r.nationalId||'', fd(r.idCardExpiry), lab(cardSt), fd(r.licenseExpiry), lab(licSt)];
    if(kind==='driver') row.push(r.licenseGrade||'');
    row.push(fd(r.hireDate), contractType, lab(r.contractStatus), wage, ins, r.insuranceNumber||'', r.phone||'', r.address||'');
    if(kind==='worker') row.push(r.project||'', typeof supervisorName==='function' ? supervisorName(r.supervisorId) : '');
    row.push(typeof departmentName==='function' ? departmentName(r.departmentId||r.categoryId) : '');
    if(kind==='supervisor') row.push((DATA.workers||[]).filter(w=>w.supervisorId===r.id).length);
    const st = kind==='driver' ? (r.status==='active' ? 'نشط' : 'متوقف') : lab(r.status);
    const issues = typeof personNotesIssues==='function' ? personNotesIssues(kind, r) : [];
    row.push(st, issues.length ? issues.join(' | ') : 'مكتمل');
    return row;
  });
  return { headers, rows };
}

/** عرض تفاصيل شخص كاملة مع الملاحظات والأوراق الناقصة */
function openPersonDetailModal(kind, personId){
  if(kind==='equipment'){
    try{
      if(typeof equipmentFilters==='object') equipmentFilters.detailId = personId;
      currentPage = 'equipment';
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
      else if(typeof render==='function') render();
      return;
    }catch(e){}
  }
  if(typeof openPersonDetailPage==='function' && kind && personId){
    try{ openPersonDetailPage(kind, personId); return; }catch(e){}
  }
  let person = null, kindLabel = '';
  if(kind==='employee'){ person=getEmployee(personId); kindLabel='موظف'; }
  else if(kind==='worker'){ person=getWorker(personId); kindLabel='عامل'; }
  else if(kind==='supervisor'){ person=getSupervisor(personId); kindLabel='مشرف'; }
  else if(kind==='driver'){ person=typeof getDriver==='function'?getDriver(personId):(DATA.drivers||[]).find(x=>x.id===personId); kindLabel='سائق'; }
  if(!person){ showToast('السجل غير موجود'); return; }
  const issues = typeof personNotesIssues==='function' ? personNotesIssues(kind, person) : [];
  const docs = (DATA.personDocuments||[]).filter(d=>d.personId===personId);
  openModal(`
    <div class="modal-header"><h3>عرض ${kindLabel}: ${escapeHtml(person.name||'')}</h3>
      <button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2" style="margin-bottom:12px;">
        <div><strong>الكود:</strong> ${escapeHtml(person.code||'—')}</div>
        <div><strong>الوظيفة:</strong> ${escapeHtml(person.position||person.skill||'—')}</div>
        <div><strong>الرقم القومي:</strong> ${escapeHtml(person.nationalId||'—')}</div>
        <div><strong>التليفون:</strong> ${escapeHtml(person.phone||'—')}</div>
        <div><strong>العنوان:</strong> ${escapeHtml(person.address||'—')}</div>
        <div><strong>القسم:</strong> ${escapeHtml(typeof departmentName==='function'?departmentName(person.departmentId||person.categoryId):'—')}</div>
        <div><strong>انتهاء البطاقة:</strong> ${fmtDate(person.idCardExpiry)} — ${typeof statusBadgeSarya==='function'?statusBadgeSarya(person.idCardExpiry?statusFromExpiry(person.idCardExpiry):person.idCardStatus,'card'):''}</div>
        <div><strong>انتهاء الرخصة:</strong> ${fmtDate(person.licenseExpiry)} — ${typeof statusBadgeSarya==='function'?statusBadgeSarya(person.licenseExpiry?statusFromExpiry(person.licenseExpiry):person.licenseStatus,'license'):''}</div>
        <div><strong>حالة التأمين:</strong> ${typeof statusBadgeSarya==='function'?statusBadgeSarya(person.insuranceStatus||'','insurance'):''} ${escapeHtml(person.insuranceNumber||'')}</div>
        <div><strong>تاريخ التعيين:</strong> ${fmtDate(person.hireDate)}</div>
        ${kind==='worker'?`<div><strong>المشروع:</strong> ${escapeHtml(person.project||'—')}</div><div><strong>اليومية:</strong> ${fmtMoney(person.dailyWage)}</div>`:''}
        ${kind==='employee'?`<div><strong>الراتب:</strong> ${fmtMoney(person.salary)}</div>`:''}
      </div>
      <div class="section-title">الملاحظات والتنبيهات</div>
      <div id="personNotesBox" class="notes-detail-box">
        ${issues.length
          ? `<ul class="notes-list notes-list-detail">${issues.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>`
          : '<div class="notes-ok">✓ لا تنبيهات ناقصة حالياً</div>'}
        ${person.notes ? `<div class="notes-manual"><strong>ملاحظة يدوية:</strong> ${escapeHtml(person.notes)}</div>` : ''}
      </div>
      <div class="notes-edit-block">
        <label class="notes-edit-label">الملاحظات اليدوية</label>
        <div id="personNotesLogList" class="notes-log-list">
          ${(()=>{
            const log = Array.isArray(person.notesLog) ? person.notesLog : (person.notes ? [{id:'legacy', text:person.notes, at:''}] : []);
            if(!log.length) return '<div class="notes-log-empty">لا ملاحظات محفوظة</div>';
            return log.map(n=>`<div class="notes-log-item" data-nid="${escapeHtml(n.id||'')}">
              <span class="notes-log-text">${escapeHtml(n.text||'')}</span>
              <button type="button" class="icon-btn icon-del btn-del-note" data-nid="${escapeHtml(n.id||'')}" title="حذف">🗑️</button>
            </div>`).join('');
          })()}
        </div>
        <textarea class="input notes-edit-input" id="personNotesEdit" rows="2" placeholder="اكتب ملاحظة جديدة..."></textarea>
        <button type="button" class="btn btn-primary btn-sm" id="btnSavePersonNotes" style="margin-top:6px;">حفظ الملاحظة</button>
      </div>
      <div class="section-title">المستندات المسجّلة (${docs.length})</div>
      <ul style="margin:0;padding-right:18px;font-size:13px;">
        ${docs.length ? docs.map(d=>`<li>${escapeHtml(d.title||d.docType||'مستند')} ${d.expiryDate?'— ينتهي '+fmtDate(d.expiryDate):''}</li>`).join('') : '<li style="color:var(--ink-soft);">لا مستندات بعد — أرفق من الأرشيف</li>'}
      </ul>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
      <button class="btn btn-outline" id="btnEditFromDetail">تعديل البيانات</button>
    </div>
  `);
  function refreshNotesLogList(){
    const listEl = document.getElementById('personNotesLogList');
    if(!listEl) return;
    const log = Array.isArray(person.notesLog) ? person.notesLog : [];
    listEl.innerHTML = log.length
      ? log.map(n=>`<div class="notes-log-item" data-nid="${escapeHtml(n.id||'')}">
          <span class="notes-log-text">${escapeHtml(n.text||'')}</span>
          <button type="button" class="icon-btn icon-del btn-del-note" data-nid="${escapeHtml(n.id||'')}" title="حذف">🗑️</button>
        </div>`).join('')
      : '<div class="notes-log-empty">لا ملاحظات محفوظة</div>';
    listEl.querySelectorAll('.btn-del-note').forEach(b=>{
      b.addEventListener('click', ()=>{
        const nid = b.getAttribute('data-nid');
        person.notesLog = (person.notesLog||[]).filter(n=>n.id!==nid);
        person.notes = (person.notesLog||[]).map(n=>n.text).join('\n');
        saveData(true);
        showToast('تم حذف الملاحظة');
        refreshNotesLogList();
        refreshNotesBox();
      });
    });
  }
  function refreshNotesBox(){
    const box = document.getElementById('personNotesBox');
    if(!box) return;
    const issues = typeof personNotesIssues==='function' ? personNotesIssues(kind, person) : [];
    const issuesHtml = issues.length
      ? `<ul class="notes-list notes-list-detail">${issues.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>`
      : '<div class="notes-ok">✓ لا تنبيهات ناقصة حالياً</div>';
    const man = (person.notesLog&&person.notesLog.length)
      ? `<div class="notes-manual"><strong>ملاحظات:</strong> ${escapeHtml(person.notesLog.map(n=>n.text).join(' · '))}</div>`
      : (person.notes ? `<div class="notes-manual"><strong>ملاحظة:</strong> ${escapeHtml(person.notes)}</div>` : '');
    box.innerHTML = issuesHtml + man;
  }
  // ترحيل ملاحظة قديمة
  if(person.notes && (!person.notesLog || !person.notesLog.length)){
    person.notesLog = [{ id: uid(), text: person.notes, at: new Date().toISOString() }];
  }
  refreshNotesLogList();
  document.getElementById('btnSavePersonNotes')?.addEventListener('click', ()=>{
    const text = (document.getElementById('personNotesEdit')?.value||'').trim();
    if(!text){ showToast('اكتب ملاحظة أولاً'); return; }
    if(!Array.isArray(person.notesLog)) person.notesLog = [];
    person.notesLog.push({ id: uid(), text, at: new Date().toISOString() });
    person.notes = person.notesLog.map(n=>n.text).join('\n');
    addAudit('ملاحظات '+kindLabel, person.name||'');
    saveData(true);
    showToast('تم حفظ الملاحظة');
    document.getElementById('personNotesEdit').value = '';
    refreshNotesLogList();
    refreshNotesBox();
  });
  document.getElementById('btnEditFromDetail')?.addEventListener('click', ()=>{
    closeModal();
    if(kind==='employee' && typeof openEmployeeModal==='function') openEmployeeModal(personId);
    else if(kind==='worker' && typeof openWorkerModal==='function') openWorkerModal(personId);
    else if(kind==='supervisor' && typeof openSupervisorModal==='function') openSupervisorModal(personId);
    else if(kind==='driver' && typeof openDriverModal==='function') openDriverModal(personId);
  });
}

function collectMissingDocsAlerts(){
  const alerts = [];
  const add = (kind, list, label, page)=>{
    (list||[]).forEach(p=>{
      if(!p || p.status==='inactive' || p.status==='left') return;
      const issues = typeof personNotesIssues==='function' ? personNotesIssues(kind, p) : [];
      if(!issues.length) return;
      const severity = issues.some(i=>/منتهية|تجاوز|ناقص|بدون يومية|بدون مشرف|بدون قسم|عاطلة|متوقفة|بدون مشروع|غير مؤمن|درجة الرخصة|رخصة/.test(i)) ? 'high' : 'med';
      alerts.push({
        icon: severity==='high' ? '🔴' : '⚠️',
        page,
        msg: (p.name||p.code||''),
        detail: issues.slice(0,6).join(' · ')+(issues.length>6?'…':''),
        issues,
        personId: p.id,
        kind,
        kindLabel: label,
        severity,
        code: p.code||''
      });
    });
  };
  add('employee', DATA.employees, 'موظف', 'employees');
  add('worker', DATA.workers, 'عامل', 'workers');
  add('supervisor', DATA.supervisors, 'مشرف', 'supervisors');
  add('driver', DATA.drivers, 'سائق', 'drivers');
  (DATA.equipment||[]).forEach(eq=>{
    if(!eq || eq.status==='sold' || eq.status==='scrapped') return;
    const issues = typeof equipmentNotesIssues==='function' ? equipmentNotesIssues(eq) : [];
    if(!issues.length) return;
    const severity = issues.some(i=>/منتهية|تجاوز|ناقص|بدون يومية|بدون مشرف|بدون قسم|عاطلة|متوقفة|بدون مشروع|غير مؤمن|درجة الرخصة|رخصة/.test(i)) ? 'high' : 'med';
    alerts.push({
      icon: severity==='high' ? '🔴' : '⚠️',
      page: 'equipment',
      msg: (eq.name||eq.code||'معدة'),
      detail: issues.slice(0,6).join(' · ')+(issues.length>6?'…':''),
      issues,
      personId: eq.id,
      kind: 'equipment',
      kindLabel: 'معدة / مركبة',
      severity,
      code: eq.code||''
    });
  });
  return alerts;
}

function pageLabelAr(page){
  const map = {
    dashboard:'لوحة المتابعة', employees:'الموظفين', workers:'العمال', supervisors:'المشرفون',
    drivers:'السائقون', equipment:'معدات ومركبات', departments:'الأقسام', projects:'المشاريع',
    attendance:'حضور الموظفين', workerAttendance:'اليوميات', workerDues:'المستحقات',
    expenses:'المصاريف', leaves:'الإجازات', archive:'الأرشيف', reports:'التقارير',
    performance:'تقييم الأداء', transfers:'حركة الموارد', users:'المستخدمون', backup:'الإعدادات',
    payroll:'الرواتب'
  };
  return map[page] || (page && !/^[a-zA-Z]/.test(page) ? page : 'تنبيه');
}
function alertSeverity(a){
  if(a.severity) return a.severity;
  if(a.level==='danger') return 'high';
  if(a.level==='warn') return 'med';
  return 'med';
}
function dashboardAlertsHtml(alerts){
  if(!alerts || !alerts.length){
    return `<div class="alert-empty">✓ لا تنبيهات حالياً — كل السجلات مكتملة</div>`;
  }
  // تطبيع عربي
  const normalized = alerts.map(a=>{
    const label = a.kindLabel || pageLabelAr(a.page) || 'تنبيه';
    // لو kindLabel إنجليزي حوّله
    const arLabel = (/^[a-zA-Z]/.test(String(label)) ? pageLabelAr(a.page) : label) || 'تنبيه';
    return Object.assign({}, a, {
      kindLabel: arLabel,
      severity: alertSeverity(a),
      msg: a.msg || a.detail || '',
      issues: a.issues || (a.detail ? [a.detail] : [])
    });
  });
  const alias = {
    'معدات ومركبات':'معدة / مركبة',
    'المعدات':'معدة / مركبة',
    'معدات':'معدة / مركبة'
  };
  const groups = {};
  const seen = new Set();
  normalized.forEach(a=>{
    let k = a.kindLabel || 'تنبيه';
    if(alias[k]) k = alias[k];
    a.kindLabel = k;
    // تجاهل التنبيه العام إذا فيه كرت تفصيلي لنفس الصفحة بدون شخص
    const key = (a.kind||'')+'|'+(a.personId||a.msg||'');
    if(a.personId && seen.has(key)) return;
    if(a.personId) seen.add(key);
    if(!groups[k]) groups[k] = [];
    groups[k].push(a);
  });
  // داخل كل مجموعة: الكروت اللي فيها أوراق ناقصة أولاً
  Object.keys(groups).forEach(k=>{
    groups[k].sort((a,b)=>{
      const ai = (a.issues&&a.issues.length)?0:1;
      const bi = (b.issues&&b.issues.length)?0:1;
      if(ai!==bi) return ai-bi;
      return String(a.msg||'').localeCompare(String(b.msg||''),'ar');
    });
    // لو المجموعة فيها كروت أشخاص/معدات: احتفظ فقط بالكرت الفردي (personId)
    // الملخصات العامة بدون personId تُحذف من مجموعة الأشخاص لتفادي التكرار
    const hasEntity = groups[k].some(x=>x.personId);
    if(hasEntity) groups[k] = groups[k].filter(x=>!!x.personId);
    // إزالة التكرار لنفس الشخص (دمج issues)
    const byPerson = {};
    const merged = [];
    groups[k].forEach(x=>{
      if(!x.personId){ merged.push(x); return; }
      const key = (x.kind||'')+'::'+x.personId;
      if(!byPerson[key]){
        byPerson[key] = Object.assign({}, x, { issues: (x.issues||[]).slice() });
        merged.push(byPerson[key]);
      } else {
        const cur = byPerson[key];
        (x.issues||[]).forEach(i=>{ if(i && !cur.issues.includes(i)) cur.issues.push(i); });
        if((x.severity==='high') || (x.level==='danger')){ cur.severity='high'; cur.icon='🔴'; }
        cur.detail = cur.issues.slice(0,6).join(' · ')+(cur.issues.length>6?'…':'');
      }
    });
    groups[k] = merged;
  });
  const MAX = window.__alertsMax || 10;
  return `<div class="alerts-panel">
    <div class="alerts-panel-head">
      <span class="alerts-count">${normalized.length} تنبيه</span>
      <span class="alerts-hint">اضغط البطاقة لعرض التنبيهات</span>
    </div>
    ${Object.keys(groups).map(g=>{
      const items = groups[g];
      const preview = items.slice(0, MAX);
      const rest = items.length - preview.length;
      const page = (items[0]&&items[0].page) || 'dashboard';
      const kind = (items[0]&&items[0].kind) || '';
      return `
      <div class="alerts-group">
        <div class="alerts-group-title">
          <span>${escapeHtml(g)} <span class="ag-count">(${items.length})</span></span>
          ${rest>0?`<button type="button" class="btn btn-outline btn-sm btn-alerts-more"
            data-page="${escapeHtml(page)}" data-kind="${escapeHtml(kind)}" data-label="${escapeHtml(g)}">عرض المزيد (${rest}+)</button>`:''}
        </div>
        <div class="alerts-list">
          ${preview.map(a=>`
            <button type="button" class="alert-card ${a.severity==='high'?'alert-high':'alert-med'} dash-goto"
              data-person-id="${escapeHtml(a.personId||'')}"
              data-person-kind="${escapeHtml(a.kind||'')}"
              ${a.personId?'':`data-goto="${escapeHtml(a.page||'dashboard')}"`}${typeof alertOpenAttr==='function'?alertOpenAttr(a):''}>
              <div class="alert-card-top">
                <span class="alert-ico">${a.icon||'⚠️'}</span>
                <span class="alert-name">${escapeHtml(a.msg||'')}</span>
                ${a.code?`<span class="alert-code">${escapeHtml(a.code)}</span>`:''}
              </div>
              <ul class="alert-issues">
                ${(a.issues||[]).slice(0,4).map(i=>`<li>${escapeHtml(i)}</li>`).join('')}
                ${(a.issues||[]).length>4?`<li class="notes-more">+${(a.issues||[]).length-4}</li>`:''}
              </ul>
            </button>
          `).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/** نافذة تنبيهات/ملاحظات شخص أو معدة واحدة */
function openPersonAlertsModal(kind, personId){
  if(!kind || !personId) return;
  let person = null, title = '', page = '';
  if(kind==='employee'){ person = typeof getEmployee==='function'?getEmployee(personId):(DATA.employees||[]).find(x=>x.id===personId); title='موظف'; page='employees'; }
  else if(kind==='worker'){ person = typeof getWorker==='function'?getWorker(personId):(DATA.workers||[]).find(x=>x.id===personId); title='عامل'; page='workers'; }
  else if(kind==='supervisor'){ person = typeof getSupervisor==='function'?getSupervisor(personId):(DATA.supervisors||[]).find(x=>x.id===personId); title='مشرف'; page='supervisors'; }
  else if(kind==='driver'){ person = typeof getDriver==='function'?getDriver(personId):(DATA.drivers||[]).find(x=>x.id===personId); title='سائق'; page='drivers'; }
  else if(kind==='equipment'){ person = (DATA.equipment||[]).find(x=>x.id===personId); title='معدة / مركبة'; page='equipment'; }
  if(!person){ if(typeof showToast==='function') showToast('السجل غير موجود'); return; }
  const issues = kind==='equipment'
    ? (typeof equipmentNotesIssues==='function'?equipmentNotesIssues(person):[])
    : (typeof personNotesIssues==='function'?personNotesIssues(kind, person):[]);
  const name = person.name || person.code || '—';
  const code = person.code || '';
  openModal(`
    <div class="modal-header">
      <h3>تنبيهات وملاحظات — ${escapeHtml(title)}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="alert-person-head" style="margin-bottom:12px;">
        <strong style="font-size:1.05em;">${escapeHtml(name)}</strong>
        ${code?`<span class="alert-code" style="margin-inline-start:8px;opacity:.75;">${escapeHtml(code)}</span>`:''}
      </div>
      ${issues.length
        ? `<ul class="alert-issues alert-issues-full" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
            ${issues.map(i=>`<li style="padding:8px 12px;background:var(--surface-2,#f5f5f5);border-radius:8px;border-right:3px solid var(--warn,#e6a700);">${escapeHtml(i)}</li>`).join('')}
          </ul>`
        : '<div class="alert-empty">✓ لا تنبيهات لهذا السجل</div>'}
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
      <button class="btn btn-primary" id="btnOpenDetailFromAlert">عرض التفاصيل</button>
    </div>
  `);
  document.getElementById('btnOpenDetailFromAlert')?.addEventListener('click', ()=>{
    closeModal();
    if(kind==='equipment'){
      if(typeof equipmentFilters==='object') equipmentFilters.detailId = personId;
      if(typeof dashGo==='function') dashGo('equipment');
      else if(typeof goToPage==='function') goToPage('equipment');
      else { currentPage = 'equipment'; if(typeof render==='function') render(); }
    } else if(typeof openPersonDetailPage==='function'){
      openPersonDetailPage(kind, personId);
    } else if(typeof openPersonDetailModal==='function'){
      openPersonDetailModal(kind, personId);
    }
  });
}

/** نافذة كل تنبيهات قسم واحد */
function openAlertsMoreModal(kind, label, page){
  let all = [];
  try{ all = (typeof collectAllAlerts==='function' ? collectAllAlerts() : (typeof collectSystemAlerts==='function' ? collectSystemAlerts() : [])).slice(); }catch(e){}
  if(!all.length && typeof collectMissingDocsAlerts==='function') all = collectMissingDocsAlerts();
  all = all.map(a=>{
    const ar = a.kindLabel && !/^[a-zA-Z]/.test(String(a.kindLabel)) ? a.kindLabel : (typeof pageLabelAr==='function'?pageLabelAr(a.page):a.page);
    return Object.assign({}, a, { kindLabel: ar || a.kindLabel || 'تنبيه' });
  });
  const items = (!kind || kind==='all')
    ? (label ? all.filter(a=>a.kindLabel===label || a.kind===kind) : all)
    : all.filter(a=>a.kind===kind || a.kindLabel===label);
  openModal(`
    <div class="modal-header">
      <h3>تنبيهات ${escapeHtml(label||'')} (${items.length})</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="alerts-list dash-alerts-responsive" style="grid-template-columns:1fr;" style="--alert-min:">
        ${items.length? items.map(a=>`
          <button type="button" class="alert-card ${a.severity==='high'?'alert-high':'alert-med'} btn-alert-open-person"
            data-person-id="${escapeHtml(a.personId||'')}" data-person-kind="${escapeHtml(a.kind||'')}"${typeof alertOpenAttr==='function'?alertOpenAttr(a):''}>
            <div class="alert-card-top">
              <span class="alert-ico">${a.icon||'⚠️'}</span>
              <span class="alert-name">${escapeHtml(a.msg||'')}</span>
              ${a.code?`<span class="alert-code">${escapeHtml(a.code)}</span>`:''}
            </div>
            <ul class="alert-issues">${(a.issues||[]).map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </button>`).join('') : '<div class="alert-empty">لا تنبيهات</div>'}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
      ${page?`<button class="btn btn-primary" id="btnGoAlertPage">فتح صفحة ${escapeHtml(label||'')}</button>`:''}
    </div>
  `);
  document.querySelectorAll('.btn-alert-open-person').forEach(b=>{
    b.addEventListener('click', ()=>{
      const pid = b.getAttribute('data-person-id');
      const pk = b.getAttribute('data-person-kind');
      closeModal();
      if(pid && pk && typeof openPersonAlertsModal==='function') openPersonAlertsModal(pk, pid);
      else if(pid && pk && typeof openPersonDetailModal==='function') openPersonDetailModal(pk, pid);
    });
  });
  document.getElementById('btnGoAlertPage')?.addEventListener('click', ()=>{
    closeModal();
    if(page){
      if(typeof dashGo==='function') dashGo(page);
      else if(typeof goToPage==='function') goToPage(page);
      else { currentPage = page; if(typeof render==='function') render(); }
    }
  });
}





/** شريط التحديد المتعدد */
function bulkBarHtml(kind){
  return `<div class="bulk-bar" id="bulkBar_${kind}" hidden>
    <span class="bulk-count">تم تحديد <strong id="bulkCount_${kind}">0</strong></span>
    <button type="button" class="btn btn-outline btn-sm bulk-move-dept" data-kind="${kind}">نقل إلى قسم</button>
    <button type="button" class="btn btn-outline btn-sm bulk-delete" data-kind="${kind}" style="color:var(--debt);">حذف المحدد</button>
    <button type="button" class="btn btn-outline btn-sm bulk-clear" data-kind="${kind}">إلغاء التحديد</button>
  </div>`;
}
function getBulkSet(kind){
  if(!window.__bulkSel) window.__bulkSel = {};
  if(!window.__bulkSel[kind]) window.__bulkSel[kind] = new Set();
  return window.__bulkSel[kind];
}
function updateBulkBar(kind){
  const set = getBulkSet(kind);
  const bar = document.getElementById('bulkBar_'+kind);
  const cnt = document.getElementById('bulkCount_'+kind);
  if(cnt) cnt.textContent = String(set.size);
  if(bar) bar.hidden = set.size===0;
  document.querySelectorAll(`.row-check[data-kind="${kind}"]`).forEach(cb=>{
    cb.checked = set.has(cb.getAttribute('data-id'));
  });
  const all = document.getElementById('checkAll_'+kind);
  if(all){
    const boxes = document.querySelectorAll(`.row-check[data-kind="${kind}"]`);
    all.checked = boxes.length>0 && Array.from(boxes).every(b=>b.checked);
  }
}
function bindBulkUI(kind, dataKey, nameFn){
  const set = getBulkSet(kind);
  document.getElementById('checkAll_'+kind)?.addEventListener('change', e=>{
    document.querySelectorAll(`.row-check[data-kind="${kind}"]`).forEach(cb=>{
      cb.checked = e.target.checked;
      const id = cb.getAttribute('data-id');
      if(e.target.checked) set.add(id); else set.delete(id);
    });
    updateBulkBar(kind);
  });
  document.querySelectorAll(`.row-check[data-kind="${kind}"]`).forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const id = cb.getAttribute('data-id');
      if(cb.checked) set.add(id); else set.delete(id);
      updateBulkBar(kind);
    });
  });
  document.querySelector(`.bulk-clear[data-kind="${kind}"]`)?.addEventListener('click', ()=>{
    set.clear(); updateBulkBar(kind);
  });
  document.querySelector(`.bulk-delete[data-kind="${kind}"]`)?.addEventListener('click', ()=>{
    if(!set.size) return;
    confirmDelete('حذف '+set.size+' سجل محدد؟ ستنتقل الملفات لسلة المهملات.').then(ok=>{ if(!ok) return;
      const key = dataKey || kind;
      const kindMap = {
      employees:'employee', workers:'worker', supervisors:'supervisor',
      drivers:'driver', equipment:'equipment',
      employee:'employee', worker:'worker', supervisor:'supervisor',
      driver:'driver'
      };
      const entityKind = kindMap[key] || kindMap[kind] || '';
      const list = DATA[key] || [];
      const ids = Array.from(set);
      ids.forEach(id=>{
      const item = list.find(r=>r && r.id===id);
      if(item && entityKind && typeof archiveFolderToTrashOnEntityDelete==='function'){
        try{
          archiveFolderToTrashOnEntityDelete(entityKind, id, item.name||id, item.code||'', item);
        }catch(_e){}
      }
      try{ addAudit('حذف جماعي', (item&&item.name)||id); }catch(_e){}
      });
      DATA[key] = list.filter(r=>!(r && set.has(r.id)));
      if(typeof rebuildIndexes==='function') try{ rebuildIndexes(); }catch(_e){}
      set.clear();
      saveData(true);
      showToast('تم حذف المحدد — الملفات في سلة المهملات');
      rerenderCurrentPage();
    });
  });
  document.querySelector(`.bulk-move-dept[data-kind="${kind}"]`)?.addEventListener('click', ()=>{
    if(!set.size) return;
    const deps = typeof departmentsForKind==='function' ? departmentsForKind(kind) : (DATA.departments||[]);
    openModal(`
      <div class="modal-header"><h3>نقل ${set.size} سجل إلى قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <label>القسم
          <select class="input" id="bulkDeptSel">
            <option value="">— بدون قسم —</option>
            ${deps.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnBulkMove">نقل</button>
      </div>
    `);
    document.getElementById('btnBulkMove')?.addEventListener('click', ()=>{
      const deptId = document.getElementById('bulkDeptSel')?.value || '';
      const key = dataKey || kind;
      (DATA[key]||[]).forEach(r=>{
        if(set.has(r.id)){ r.departmentId = deptId; r.categoryId = deptId; }
      });
      addAudit('نقل جماعي لقسم', kind+' × '+set.size);
      set.clear();
      saveData(true); closeModal(); showToast('تم النقل'); rerenderCurrentPage();
    });
  });
  updateBulkBar(kind);
}
function statusBadgeSarya(st, kind){
  // kind: card | license | contract | insurance
  st = (st==null || st===undefined) ? '' : String(st).trim();
  kind = kind || 'card';

  if(kind==='insurance'){
    if(!st || st==='—' ) return '<span style="color:var(--ink-soft);">—</span>';
    if(st==='insured' || st==='مؤمَّن' || st==='مؤمن') return '<span class="badge badge-ok">مؤمَّن</span>';
    if(st==='pending' || st==='قيد التسجيل') return '<span class="badge badge-warn">قيد التسجيل</span>';
    if(st==='none' || st==='uninsured' || st==='غير مؤمن عليه' || st==='لا يوجد')
      return '<span class="badge badge-err">غير مؤمن عليه</span>';
    return '<span class="badge badge-warn">'+escapeHtml(labelOf(INSURANCE_STATUS_OPTS, st)||st)+'</span>';
  }

  // بطاقة / رخصة / عقد — من التاريخ أو الحالة
  if(!st || st==='—' || st==='none' || st==='لا يوجد')
    return '<span style="color:var(--ink-soft);">—</span>';
  if(st==='valid' || st==='active' || st==='سارية' || st==='ساري')
    return '<span class="badge badge-ok">'+(kind==='contract'?'ساري':'سارية')+'</span>';
  if(st==='expired' || st==='منتهية' || st==='منتهي')
    return '<span class="badge badge-err">'+(kind==='contract'?'منتهي':'منتهية')+'</span>';
  if(st==='suspended' || st==='موقوف')
    return '<span class="badge badge-warn">موقوف</span>';
  const lab = labelOf(CARD_STATUS_OPTS, st) || labelOf(CONTRACT_STATUS_OPTS, st) || st;
  return escapeHtml(lab || '—');
}

function statusFromExpiry(expiryDate){
  if(!expiryDate) return '';
  try{
    const exp = typeof parseLocalDate==='function' ? parseLocalDate(expiryDate) : null;
    if(!exp) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // منتهية إذا تاريخ الانتهاء قبل اليوم (اليوم نفسه يُعد سارياً)
    if(exp.getTime() < today.getTime()) return 'expired';
    return 'valid';
  }catch(e){ return ''; }
}

/** توحيد أي تاريخ إلى YYYY-MM-DD للتخزين والمقارنة */
function toISODate(d){
  const dt = typeof parseLocalDate==='function' ? parseLocalDate(d) : null;
  if(!dt) return '';
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
}

function syncDocStatusesFromDates(rec){
  if(!rec) return rec;
  if(rec.idCardExpiry) rec.idCardStatus = statusFromExpiry(rec.idCardExpiry);
  if(rec.licenseExpiry) rec.licenseStatus = statusFromExpiry(rec.licenseExpiry);
  return rec;
}
/** أقسام مفصولة حسب النوع: employees|workers|supervisors|drivers|equipment */
function departmentsForKind(kind){
  kind = ({employee:'employees',worker:'workers',supervisor:'supervisors',driver:'drivers'})[kind] || kind;
  DATA.departments = DATA.departments || [];
  const matched = DATA.departments.filter(d => {
    if(!d) return false;
    if(!d.kind || d.kind === '' || d.kind === 'all') return true;
    if(d.kind === kind) return true;
    if(Array.isArray(d.kinds) && d.kinds.includes(kind)) return true;
    return false;
  });
  // أقسام لها أشخاص/معدات من هذا النوع حتى لو kind مختلف
  try{
    let list = [];
    if(kind==='employee'||kind==='employees') list = DATA.employees||[];
    else if(kind==='worker'||kind==='workers') list = DATA.workers||[];
    else if(kind==='supervisor'||kind==='supervisors') list = DATA.supervisors||[];
    else if(kind==='driver'||kind==='drivers') list = DATA.drivers||[];
    else if(kind==='equipment') list = DATA.equipment||[];
    const used = new Set();
    list.forEach(p=>{
      const id = p && (p.departmentId||p.categoryId||'');
      if(id) used.add(id);
    });
    DATA.departments.forEach(d=>{
      if(d && used.has(d.id) && !matched.some(x=>x.id===d.id)) matched.push(d);
    });
  }catch(_e){}
  const _k = ({employee:'employees',worker:'workers',supervisor:'supervisors',driver:'drivers'})[kind] || kind;
  if(typeof CORE_DEPTS!=='undefined' && CORE_DEPTS[_k]){
    // أقسام الناس والمعدات ثابتة: الأقسام الأساسية + المستقيلين + المعاشات فقط
    const order = CORE_DEPTS[_k].map(c=>c.id);
    return matched.filter(d=>d && d.system && !d.jobDept).sort((a,b)=>{ const ia = order.indexOf(a.id), ib = order.indexOf(b.id); const ra = ia<0?(a.jobDept?50:99):ia, rb = ib<0?(b.jobDept?50:99):ib; return (ra-rb) || String(a.name||'').localeCompare(String(b.name||''),'ar'); });
  }
  return sortByNameAr(matched, d => d.name);
}
/** أقسام النظام الثابتة (المستقيلين/المعاشات) — لا تُعدَّل ولا تُحذف */
function isFixedDept(d){ return !!(d && (d.system || d.locked || (typeof isResignedDeptId==='function' && isResignedDeptId(d.id)))); }
/** قيمة خاصة: بدون قسم */
const DEPT_NONE = '__none__';

/** بدون قسم أو وظيفة (الناس) / بدون قسم أو نوع ترخيص (المعدات) */
function entityNoDeptOrJob(e){
  if(!e) return false;
  let isEq = false;
  try{ isEq = (DATA.equipment||[]).indexOf(e) >= 0; }catch(_e){}
  if(isEq) return !String(e.licenseCategory||'').trim();
  return !String(e.position||e.job||e.jobTitle||e.skill||'').trim();
}
function entityNoneLabel(kind){ return (kind==='equipment') ? 'بدون قسم أو نوع ترخيص' : 'بدون قسم أو وظيفة'; }
function entityDepartmentId(rec){
  if(!rec) return '';
  return String(rec.departmentId || rec.categoryId || '').trim();
}

/** تصفية بالقسم: '' = الكل ، '__none__' = بدون قسم ، وإلا id القسم */
function filterByDeptFilter(list, deptF){
  if(!Array.isArray(list)) return [];
  const f = deptF == null ? '' : String(deptF);
  if(!f) return list;
  if(f === DEPT_NONE || f === 'none'){
    return list.filter(e => entityNoDeptOrJob(e));
  }
  return list.filter(e => entityDepartmentId(e) === f);
}
function categorySelectHtml(kind, fieldId, selectedId){
  const deps = departmentsForKind(kind);
  return `<select class="input" id="${escapeHtml(fieldId)}">
    <option value="">— بدون قسم —</option>
    ${deps.map(d=>`<option value="${d.id}" ${selectedId===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}
  </select>`;
}
function ensureDepartmentSaved(name, kind){
  name = String(name||'').trim();
  if(!name) return '';
  DATA.departments = DATA.departments || [];
  let d = DATA.departments.find(x => String(x.name||'').trim()===name && (!kind || !x.kind || x.kind===kind));
  if(!d){
    d = { id: uid(), name, kind: kind||'', manager:'', notes:'', code: '' };
    DATA.departments.push(d);
    DATA.departments = sortByNameAr(DATA.departments, x=>x.name);
  } else if(kind && !d.kind){
    d.kind = kind;
  }
  return d.id;
}


/** هل الصفحة في وضع لوحات الأقسام (قبل الدخول للجدول) */
function isEntityBoardsView(filters){
  if(!filters) return true;
  return filters._boardLevel !== 'list';
}
function enterEntityDeptBoard(filters, deptId){
  if(!filters) return;
  filters._boardLevel = 'list';
  filters.departmentId = deptId == null ? '' : String(deptId);
  filters.categoryId = filters.departmentId;
  try{ resetTablePage && resetTablePage(); }catch(_e){}
}
function backToEntityDeptBoards(filters){
  if(!filters) return;
  filters._boardLevel = 'boards';
  filters.departmentId = '';
  filters.categoryId = '';
  filters.insuranceStatus = ''; filters.resignYear = '';
  filters.q = filters.q || '';
}
/** لوحات أقسام فقط — اضغط للدخول (زي المستحقات) */
function entityDeptBoardsPageHtml(kind, pageTitle, pageSub){
  try{ if(typeof ensureAllResignedDepartments==='function') ensureAllResignedDepartments(); }catch(_e){}
  const _allDeps = typeof departmentsForKind==='function' ? departmentsForKind(kind) : [];
  const _isRes = d=>/^__resigned_/.test(d.id||''), _isRet = d=>/^__retired_/.test(d.id||'');
  const _fixed = [_allDeps.find(_isRes), _allDeps.find(_isRet)].filter(Boolean);
  const deps = _allDeps.filter(d=>!_isRes(d)&&!_isRet(d));
  const icon = ({employee:'👔',employees:'👔',worker:'🧑‍🔧',workers:'🧑‍🔧',supervisor:'👷',supervisors:'👷',driver:'🧑‍🚒',drivers:'🧑‍🚒',equipment:'🛻'}[kind])||'📁';
  const countIn = (id)=>{
    let list = [];
    try{
      if(kind==='employee'||kind==='employees') list = DATA.employees||[];
      else if(kind==='worker'||kind==='workers') list = DATA.workers||[];
      else if(kind==='supervisor'||kind==='supervisors') list = DATA.supervisors||[];
      else if(kind==='driver'||kind==='drivers') list = DATA.drivers||[];
      else if(kind==='equipment') list = DATA.equipment||[];
    }catch(_e){}
    if(id===DEPT_NONE || id==='none') return list.filter(x=>entityNoDeptOrJob(x)).length;
    if(id==='' || id==null) return list.length;
    return list.filter(x=>entityDepartmentId(x)===id).length;
  };
  const card = (id, label, ico, cnt)=>`
    <button type="button" class="board-card entity-dept-board" data-kind="${escapeHtml(kind)}" data-dept="${escapeHtml(id)}" style="cursor:pointer;text-align:right;">
      <div class="board-card-icon" style="font-size:28px;margin-bottom:6px;">${ico}</div>
      <div class="num" style="font-size:22px;">${cnt}</div>
      <div class="lbl" style="font-size:15px;font-weight:800;color:var(--ink);">${escapeHtml(label)}</div>
      <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">اضغط للدخول</div>
    </button>`;
  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <div>
          <h2 class="page-title" style="margin:0;">${escapeHtml(pageTitle||'')}</h2>
          ${pageSub?`<p class="page-sub" style="margin:4px 0 0;">${escapeHtml(pageSub)}</p>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;" class="entity-dept-boards" data-kind="${escapeHtml(kind)}">
        ${card('', 'الكل', '📋', countIn(''))}
        ${card(DEPT_NONE, entityNoneLabel(kind), '📂', countIn(DEPT_NONE))}
        ${_fixed.map(d=>card(d.id, d.name, _isRes(d)?'🚪':'🏖️', countIn(d.id))).join('')}
        ${deps.map(d=>card(d.id, d.name, icon, countIn(d.id))).join('')}
      </div>
    </div>`;
}
function bindEntityDeptBoards(kind, filtersRef){
  // أزرار الإضافة من لوحة الأقسام
  try{
    const map = {
      workers: ['btnAddWorker', typeof openWorkerModal==='function'?openWorkerModal:null],
      worker: ['btnAddWorker', typeof openWorkerModal==='function'?openWorkerModal:null],
      employees: ['btnAddEmployee', typeof openEmployeeModal==='function'?openEmployeeModal:null],
      employee: ['btnAddEmployee', typeof openEmployeeModal==='function'?openEmployeeModal:null],
      supervisors: ['btnAddSupervisor', typeof openSupervisorModal==='function'?openSupervisorModal:null],
      supervisor: ['btnAddSupervisor', typeof openSupervisorModal==='function'?openSupervisorModal:null],
      drivers: ['btnAddDriver', typeof openDriverModal==='function'?openDriverModal:null],
      driver: ['btnAddDriver', typeof openDriverModal==='function'?openDriverModal:null],
      equipment: ['btnAddEquipment', typeof openEquipmentModal==='function'?openEquipmentModal:null]
    };
    const conf = map[kind];
    if(conf && conf[0]){
      const btn = document.getElementById(conf[0]);
      // btnAddWorker مربوط بتفويض document — لا ربط مزدوج
      if(btn && conf[0]==='btnAddWorker') { /* skip */ }
      else if(btn && !btn.dataset.boundAdd){
        btn.dataset.boundAdd = '1';
        const fnName = conf[0];
        btn.addEventListener('click', (e)=>{
          e.preventDefault();
          try{
            let fn = conf[1];
            if(!fn && fnName==='btnAddEmployee' && typeof openEmployeeModal==='function') fn = openEmployeeModal;
            if(!fn && fnName==='btnAddSupervisor' && typeof openSupervisorModal==='function') fn = openSupervisorModal;
            if(!fn && fnName==='btnAddDriver' && typeof openDriverModal==='function') fn = openDriverModal;
            if(!fn && fnName==='btnAddEquipment' && typeof openEquipmentModal==='function') fn = openEquipmentModal;
            if(typeof fn==='function') fn();
            else if(typeof showToast==='function') showToast('النموذج غير متاح');
          }catch(err){ console.error(err); if(typeof showToast==='function') showToast('تعذر فتح النموذج'); }
        });
      }
    }
  }catch(_e){}
  document.querySelectorAll(`.entity-dept-board[data-kind="${kind}"]`).forEach(b=>{
    b.addEventListener('click', ()=>{
      const dept = b.getAttribute('data-dept');
      enterEntityDeptBoard(filtersRef, dept === null ? '' : dept);
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
      else if(typeof render==='function') render();
    });
  });
  // أزرار إضافة/تعديل/حذف قسم
  if(typeof bindCategoryUI==='function'){
    try{ bindCategoryUI(kind, filtersRef); }catch(_e){}
  } else {
    document.querySelectorAll(`.btn-add-cat[data-cat-kind="${kind}"]`).forEach(b=>{
      b.addEventListener('click', ()=>{ if(typeof openAddCategoryModal==='function') openAddCategoryModal(kind); });
    });
    document.querySelectorAll(`.btn-rename-cat[data-cat-kind="${kind}"]`).forEach(b=>{
      b.addEventListener('click', ()=>{ if(typeof openRenameCategoryModal==='function') openRenameCategoryModal(kind); });
    });
    document.querySelectorAll(`.btn-del-cat[data-cat-kind="${kind}"]`).forEach(b=>{
      b.addEventListener('click', ()=>{ if(typeof openDeleteCategoryModal==='function') openDeleteCategoryModal(kind, filtersRef); });
    });
  }
}
function entityListBackBarHtml(kind, filtersRef, titleExtra){
  const deptId = (filtersRef && (filtersRef.departmentId||filtersRef.categoryId)) || '';
  let deptLabel = 'الكل';
  if(deptId === DEPT_NONE || deptId === 'none') deptLabel = entityNoneLabel(kind);
  else if(deptId) deptLabel = (typeof departmentName==='function'?departmentName(deptId):'') || deptId;
  return `
    <div style="margin-bottom:10px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
      <button type="button" class="btn btn-outline btn-sm btn-entity-back-boards" data-kind="${escapeHtml(kind)}">← رجوع للأقسام</button>
      <span style="font-weight:700;font-size:14px;color:var(--ink-soft);">${escapeHtml(deptLabel)}</span>
    </div>`;
}
function bindEntityListBack(kind, filtersRef){
  document.querySelectorAll(`.btn-entity-back-boards[data-kind="${kind}"]`).forEach(b=>{
    b.addEventListener('click', ()=>{
      backToEntityDeptBoards(filtersRef);
      if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
      else if(typeof render==='function') render();
    });
  });
}

function bindCategoryUI(kind, filtersRef, onChange){
  const applyDept = (v)=>{
    if(filtersRef){
      filtersRef.departmentId = v;
      filtersRef.categoryId = v;
    }
    if(typeof onChange==='function') onChange();
    else { try{ resetTablePage(kind); }catch(e){} if(typeof rerenderCurrentPage==='function') rerenderCurrentPage(); }
  };
  document.querySelectorAll(`.cat-tabs-bar[data-cat-kind="${kind}"] .cat-tab-btn`).forEach(b=>{
    b.addEventListener('click', ()=>{
      applyDept(b.getAttribute('data-cat')||'');
    });
  });
  document.querySelectorAll(`.btn-show-all-records[data-kind="${kind}"]`).forEach(b=>{
    b.addEventListener('click', ()=>{
      applyDept(''); // الكل
    });
  });
  document.querySelectorAll(`.btn-add-cat[data-cat-kind="${kind}"]`).forEach(b=>{
    b.addEventListener('click', ()=> openAddCategoryModal(kind));
  });
  document.querySelectorAll(`.btn-rename-cat[data-cat-kind="${kind}"]`).forEach(b=>{
    b.addEventListener('click', ()=> openRenameCategoryModal(kind));
  });
  document.querySelectorAll(`.btn-del-cat[data-cat-kind="${kind}"]`).forEach(b=>{
    b.addEventListener('click', ()=> openDeleteCategoryModal(kind, filtersRef));
  });
}
function openAddCategoryModal(kind){
  openModal(`
    <div class="modal-header"><h3>إضافة قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <label>اسم القسم *
        <input class="input" id="catNewName" placeholder="مثال: هندسة، حسابات، مواقع...">
      </label>
      <p style="font-size:12.5px;color:var(--ink-soft);margin-top:8px;">يُسجَّل تلقائياً في صفحة الأقسام ويظهر في كل الصفحات.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnSaveNewCat">حفظ</button>
    </div>
  `);
  document.getElementById('btnSaveNewCat')?.addEventListener('click', ()=>{
    const name = (document.getElementById('catNewName')?.value||'').trim();
    if(!name){ showToast('أدخل اسم القسم'); return; }
    DATA.departments = DATA.departments || [];
    if(DATA.departments.some(d=>String(d.name||'').trim()===name)){ showToast('القسم موجود مسبقاً'); return; }
    DATA.departments.push({ id: uid(), name, kind: kind||'', manager:'', notes:'' });
    DATA.departments = sortByNameAr(DATA.departments, d=>d.name);
    addAudit('إضافة قسم', (kind||'')+' — '+name);
    saveData(true); closeModal(); showToast('تم تسجيل القسم'); rerenderCurrentPage();
  });
}
function openRenameCategoryModal(kind){
  const list = departmentsForKind(kind).filter(d=>!isFixedDept(d));
  if(!list.length){ showToast('لا أقسام للتعديل'); return; }
  openModal(`
    <div class="modal-header"><h3>تعديل اسم قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <label>اختر القسم *
        <select class="input" id="catRenId">${list.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}</select>
      </label>
      <label>الاسم الجديد *
        <input class="input" id="catRenName" placeholder="الاسم الجديد">
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnConfirmRenCat">حفظ الاسم</button>
    </div>
  `);
  const sel = document.getElementById('catRenId');
  const fill = ()=>{
    const d = (DATA.departments||[]).find(x=>x.id===sel.value);
    if(d) document.getElementById('catRenName').value = d.name||'';
  };
  sel?.addEventListener('change', fill); fill();
  document.getElementById('btnConfirmRenCat')?.addEventListener('click', ()=>{
    const id = document.getElementById('catRenId')?.value;
    const name = (document.getElementById('catRenName')?.value||'').trim();
    if(!id || !name){ showToast('أدخل الاسم الجديد'); return; }
    const dep = (DATA.departments||[]).find(d=>d.id===id);
    if(!dep) return;
    if(isFixedDept(dep)){ showToast('هذا قسم أساسي ثابت — لا يُعدَّل'); return; }
    if((DATA.departments||[]).some(d=>d.id!==id && String(d.name||'').trim()===name && (d.kind||'')===(dep.kind||''))){
      showToast('اسم القسم موجود مسبقاً'); return;
    }
    dep.name = name;
    addAudit('تعديل قسم', name);
    saveData(true); closeModal(); showToast('تم تعديل الاسم'); rerenderCurrentPage();
  });
}
function openDeleteCategoryModal(kind, filtersRef){
  const list = departmentsForKind(kind).filter(d=>!isFixedDept(d));
  if(!list.length){ showToast('لا أقسام للحذف في هذا النوع'); return; }
  openModal(`
    <div class="modal-header"><h3>حذف قسم</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--ink-soft);">السجلات المرتبطة بهذا القسم تصبح بدون قسم.</p>
      <label>اختر القسم *
        <select class="input" id="catDelId">${list.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}</select>
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="btnConfirmDelCat">حذف القسم</button>
    </div>
  `);
  document.getElementById('btnConfirmDelCat')?.addEventListener('click', ()=>{
    const id = document.getElementById('catDelId')?.value;
    if(!id) return;
    const _selDep = (DATA.departments||[]).find(x=>x.id===id);
    if(_selDep && (_selDep.system||_selDep.locked||(typeof isResignedDeptId==='function'&&isResignedDeptId(_selDep.id)))){
      showToast('هذا قسم أساسي ثابت — لا يُحذف'); return;
    }
    confirmDelete('حذف هذا القسم من النظام؟').then(ok=>{ if(!ok) return;
      DATA.departments = (DATA.departments||[]).filter(d=>d.id!==id);
      ['employees','workers','supervisors','drivers','equipment'].forEach(k=>{
        (DATA[k]||[]).forEach(rec=>{
          if(rec.departmentId===id) rec.departmentId = '';
          if(rec.categoryId===id) rec.categoryId = ''; // ترحيل قديم
        });
      });
      if(filtersRef){
        if(filtersRef.categoryId===id) filtersRef.categoryId = '';
        if(filtersRef.departmentId===id) filtersRef.departmentId = '';
      }
      addAudit('حذف قسم', id);
      saveData(true); closeModal(); showToast('تم حذف القسم'); rerenderCurrentPage();
    });
  });
}
/** تحويل أكواد الحالة/النوع إلى نص عربي عند التصدير */
function arabicLabelForCode(code){
  if(code==null || code==='') return '';
  const s = String(code).trim();
  const lists = [];
  try{ if(typeof EQUIPMENT_STATUS!=='undefined') lists.push(EQUIPMENT_STATUS); }catch(_e){}
  try{ if(typeof EQUIPMENT_OWNERSHIP!=='undefined') lists.push(EQUIPMENT_OWNERSHIP); }catch(_e){}
  try{ if(typeof EQUIPMENT_TYPES!=='undefined') lists.push(EQUIPMENT_TYPES); }catch(_e){}
  try{ if(typeof EMPLOYEE_STATUS!=='undefined') lists.push(EMPLOYEE_STATUS); }catch(_e){}
  try{ if(typeof EMPLOYMENT_TYPES!=='undefined') lists.push(EMPLOYMENT_TYPES); }catch(_e){}
  try{ if(typeof WORKER_STATUS!=='undefined') lists.push(WORKER_STATUS); }catch(_e){}
  try{ if(typeof WORKER_TYPES!=='undefined') lists.push(WORKER_TYPES); }catch(_e){}
  try{ if(typeof CONTRACT_TYPE_OPTS!=='undefined') lists.push(CONTRACT_TYPE_OPTS); }catch(_e){}
  try{ if(typeof CONTRACT_STATUS_OPTS!=='undefined') lists.push(CONTRACT_STATUS_OPTS); }catch(_e){}
  try{ if(typeof CARD_STATUS_OPTS!=='undefined') lists.push(CARD_STATUS_OPTS); }catch(_e){}
  try{ if(typeof LEAVE_TYPES!=='undefined') lists.push(LEAVE_TYPES); }catch(_e){}
  try{ if(typeof LEAVE_STATUS!=='undefined') lists.push(LEAVE_STATUS); }catch(_e){}
  for(const list of lists){
    if(!Array.isArray(list)) continue;
    const f = list.find(x=>x && (x.code===s || x.id===s || x.label===s));
    if(f) return f.label || f.name || s;
  }
  // ترجمات شائعة إضافية
  const map = {
    active:'نشط', inactive:'غير نشط', left:'غادر', resigned:'مستقيل', terminated:'منتهي الخدمة', on_leave:'في إجازة', working:'تعمل', stopped:'متوقفة',
    maintenance:'صيانة', rented:'مستأجرة', rented_out:'مؤجرة للغير', owned:'ملك الشركة',
    available:'متاحة', broken:'عاطلة', retired:'مستبعدة', in_use:'مستأجرة',
    permanent:'دائم', temp:'مؤقت', daily:'يومي', contract:'عقد', contract_type:'عقد',
    valid:'سارية', expired:'منتهية', soon:'قاربت على الانتهاء', none:'غير مؤمن عليه',
    present:'حضور', absent:'غياب', half:'نصف يوم', late:'متأخر', holiday:'إجازة',
    employee:'موظف', worker:'عامل', supervisor:'مشرف', driver:'سائق', equipment:'معدة', project:'مشروع',
    insured:'مؤمن عليه', uninsured:'غير مؤمن عليه', 'غير مؤمن':'غير مؤمن عليه',
    machine:'معدة', vehicle:'مركبة', truck:'نقل', car:'ملاكي'
  };
  if(map[s]) return map[s];
  return s;
}
/** تنسيق خلية للتصدير: تواريخ عربية، أكواد مترجمة، بدون قيم خام إنجليزية */
function formatExportValue(v){
  if(v==null || v==='') return '';
  if(typeof v==='boolean') return v ? 'نعم' : 'لا';
  if(typeof v==='number' && Number.isFinite(v)) return v;
  const s = String(v).trim();
  // تاريخ مع وقت ISO (لازم يتفحص الأول، وإلا الوقت بيضيع)
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)) return fmtDateTime(s);
  // تاريخ ISO
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return fmtDate(s);
  // كود معروف → عربي
  const ar = arabicLabelForCode(s);
  if(ar !== s) return ar;
  // تنظيف HTML إن وُجد
  if(s.indexOf('<')>=0) return s.replace(/<[^>]+>/g,'').trim();
  return s;
}
function prepareExportTable(headers, rows){
  const h = (headers||[]).map(x => formatExportValue(x));
  const r = (rows||[]).map(row => {
    const arr = Array.isArray(row) ? row : [row];
    return arr.map(c => formatExportValue(c));
  });
  return { headers: h, rows: r };
}

function setPageExport(filename, headers, rows){
  window.__pageExport = {
    filename: filename || 'export',
    headers: headers || [],
    rows: (rows || []).map(r => (Array.isArray(r) ? r : [r])),
    sheetName: 'بيانات'
  };
}
function pageExportButtonsHtml(){
  return `<span class="page-export-bar" style="display:inline-flex;flex-wrap:nowrap;gap:6px;align-items:center;">
    <button type="button" class="btn btn-outline btn-sm btn-page-exp-xlsx" title="تصدير إكسيل">إكسيل</button>
    <button type="button" class="btn btn-outline btn-sm btn-page-exp-csv" title="تصدير CSV">CSV</button>
  </span>`;
}
function bindPageExportButtons(){
  document.querySelectorAll('.btn-page-exp-csv').forEach(b=>{
    b.onclick = async ()=>{
      const pe = window.__pageExport;
      if(!pe || !pe.headers){ showToast('لا بيانات للتصدير في هذه الشاشة'); return; }
      const prepared = typeof prepareExportTable==='function' ? prepareExportTable(pe.headers, pe.rows||[]) : pe;
      const fname = (pe.filename||'تصدير') + '.csv';
      const res = await downloadCsv(fname, prepared.headers, prepared.rows);
      if(res && res.canceled) return;                       // المستخدم لغى نافذة الحفظ
      if(res && res.ok === false){ showToast('تعذر حفظ الملف'+(res.error?': '+res.error:'')); return; }
      showToast('تم تصدير CSV ('+((prepared.rows||[]).length)+' صف)');
    };
  });
  document.querySelectorAll('.btn-page-exp-xlsx').forEach(b=>{
    b.onclick = ()=>{
      const pe = window.__pageExport;
      if(!pe || !pe.headers){ showToast('لا بيانات للتصدير في هذه الشاشة'); return; }
      const prepared = typeof prepareExportTable==='function' ? prepareExportTable(pe.headers, pe.rows||[]) : pe;
      const fname = (pe.filename||'تصدير') + '.xlsx';
      const sheet = pe.sheetName || 'بيانات';
      if(typeof downloadXlsx==='function')
        downloadXlsx(fname, prepared.headers, prepared.rows, sheet);
      else {
        downloadCsv(fname.replace(/\.xlsx$/i,'.csv'), prepared.headers, prepared.rows);
        showToast('تم CSV');
      }
    };
  });
}
function downloadCsv(filename, headers, rows){
  const escape = v => {
    const s = v==null ? '' : String(v);
    if(/[",\n\r]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  (rows||[]).forEach(r => lines.push(r.map(escape).join(',')));
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  if(window.desktopApi && window.desktopApi.saveFile){
    return window.desktopApi.saveFile(filename, bom + lines.join('\n'));
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    return { ok: true };
  }
}
/* ---- PIN / Read-only security ---- */
function hashPin(pin){
  const s = String(pin||'');
  let h = 5381;
  for(let i=0;i<s.length;i++) h = ((h<<5)+h) ^ s.charCodeAt(i);
  return 'hr_'+((h>>>0).toString(16));
}
function getStoredRoPin(){ try{ return localStorage.getItem('hr_ro_pin') || ''; }catch(e){ return ''; } }
function setStoredRoPin(pin){ try{ localStorage.setItem('hr_ro_pin', hashPin(pin)); }catch(e){} }
function clearStoredRoPin(){ try{ localStorage.removeItem('hr_ro_pin'); }catch(e){} }
function hasRoPin(){ return !!getStoredRoPin(); }
function verifyRoPin(pin){
  const stored = getStoredRoPin();
  if(!stored) return true;
  return hashPin(pin) === stored;
}
function changeRoPin(oldPin, newPin){
  if(hasRoPin() && !verifyRoPin(oldPin)) return { ok:false, error:'الرقم السري الحالي غير صحيح' };
  const n = String(newPin||'').trim();
  if(n.length < 4) return { ok:false, error:'الرقم السري يجب ألا يقل عن 4 خانات' };
  setStoredRoPin(n);
  return { ok:true };
}
function persistReadOnlyFlag(on){ try{ localStorage.setItem('hr_readonly', on ? '1' : '0'); }catch(e){} }
function loadReadOnlyFlag(){ try{ return localStorage.getItem('hr_readonly') === '1'; }catch(e){ return false; } }

function promptPinDialog(title, message, onOk, needConfirm){
  openModal(`
    <div class="modal-header"><h3>${escapeHtml(title||'الرقم السري')}</h3>
      <button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 12px;">${escapeHtml(message||'')}</p>
      <label>الرقم السري<input class="input" id="pinInput" type="password" style="direction:ltr;text-align:center;letter-spacing:3px;font-size:18px;"></label>
      ${needConfirm?`<label style="margin-top:10px;display:block;">تأكيد<input class="input" id="pinInput2" type="password" style="direction:ltr;text-align:center;letter-spacing:3px;font-size:18px;"></label>`:''}
      <p id="pinErr" style="color:var(--debt);font-size:13px;min-height:18px;margin:8px 0 0;"></p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="pinOk">تأكيد</button>
    </div>
  `);
  setTimeout(()=>{ try{ document.getElementById('pinInput').focus(); }catch(e){} }, 50);
  document.getElementById('pinOk').addEventListener('click', ()=>{
    const p1 = document.getElementById('pinInput').value || '';
    if(needConfirm){
      const p2 = (document.getElementById('pinInput2')||{}).value || '';
      if(p1 !== p2){ document.getElementById('pinErr').textContent = 'الرقمان غير متطابقين'; return; }
      if(p1.length < 4){ document.getElementById('pinErr').textContent = '4 خانات على الأقل'; return; }
    }
    closeModal();
    if(typeof onOk==='function') onOk(p1);
  });
}

function toggleReadOnlyMode(){
  if(readOnlyMode){
    // unlocking needs PIN if set
    if(hasRoPin()){
      promptPinDialog('إلغاء وضع القراءة فقط', 'أدخل الرقم السري للمتابعة', (pin)=>{
        if(!verifyRoPin(pin)){ showToast('الرقم السري غير صحيح'); return; }
        readOnlyMode = false;
        persistReadOnlyFlag(false);
        showToast('تم إلغاء وضع القراءة فقط');
        render();
      });
    } else {
      readOnlyMode = false;
      persistReadOnlyFlag(false);
      showToast('تم إلغاء وضع القراءة فقط');
      render();
    }
  } else {
    readOnlyMode = true;
    persistReadOnlyFlag(true);
    showToast('🔒 تم تفعيل وضع القراءة فقط');
    render();
  }
}

/** هل السجل صرف فعلي (مش مكافأة مستحقة ولا خصم) */
function isActualPayment(p){
  if(!p) return false;
  const t = String(p.type||'pay');
  if(t==='penalty' || t==='deduction' || t==='bonus' || t==='allowance') return false;
  if(p.status==='accrued') return false; // مستحق غير مدفوع
  // سطور إضافة داخل صرف فعلي تُحسب مدفوعة (type=pay)
  return true;
}
/** هل السجل إضافة/مكافأة مستحقة (مش مدفوعة) */
function isBonusEntitlement(p){
  if(!p) return false;
  const t = String(p.type||'');
  return t==='bonus' || t==='allowance';
}
/** إضافات/مكافآت مستحقة غير مدفوعة لشخص */

/** الراتب المسجّل للشخص (سقف دفع الراتب) */
function getPersonConfiguredSalary(personType, personId){
  if(!personId) return 0;
  let ent = null;
  if(personType==='employee') ent = typeof getEmployee==='function' ? getEmployee(personId) : (DATA.employees||[]).find(x=>x.id===personId);
  else if(personType==='worker') ent = typeof getWorker==='function' ? getWorker(personId) : (DATA.workers||[]).find(x=>x.id===personId);
  else if(personType==='supervisor') ent = typeof getSupervisor==='function' ? getSupervisor(personId) : (DATA.supervisors||[]).find(x=>x.id===personId);
  else if(personType==='driver') ent = typeof getDriver==='function' ? getDriver(personId) : (DATA.drivers||[]).find(x=>x.id===personId);
  else if(personType==='equipment') ent = typeof getEquipment==='function' ? getEquipment(personId) : (DATA.equipment||[]).find(x=>x.id===personId);
  if(!ent) return 0;
  const s = toInt(ent.salary!=null ? ent.salary : ent.basicSalary);
  if(s>0) return s;
  return 0;
}

function personUnpaidBonuses(kind, personId){
  return (DATA.workerPayments||[]).filter(p=>{
    if(!isBonusEntitlement(p)) return false;
    if(p.status==='paid') return false;
    const pt = p.personType || (p.workerId ? 'worker' : '');
    const pid = p.personId || p.workerId || '';
    if(kind==='worker'){
      if(!(pt==='worker' || (!p.personType && p.workerId))) return false;
      if(pid!==personId && p.workerId!==personId) return false;
    } else {
      if(pt!==kind || pid!==personId) return false;
    }
    return toInt(p.amount||p.extrasAmount)>0;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}

function paymentBelongsToWorker(p, workerId){
  if(!p || !workerId) return false;
  if(p.workerId===workerId) return true;
  if(p.personType==='worker' && p.personId===workerId) return true;
  return false;
}
function workerPaidTotal(workerId, from, to){
  return toInt(indexedRecords('workerPayments','pw',p=>[p.workerId, p.personType==='worker'?p.personId:''],workerId).filter(p=>{
    if(!paymentBelongsToWorker(p, workerId)) return false;
    if(!isActualPayment(p)) return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
}
/** إجمالي الخصومات/الجزاءات على عامل */
function workerPenaltyTotal(workerId, from, to){
  return toInt(indexedRecords('workerPayments','pw',p=>[p.workerId, p.personType==='worker'?p.personId:''],workerId).filter(p=>{
    if(!paymentBelongsToWorker(p, workerId)) return false;
    if(p.type !== 'penalty' && p.type !== 'deduction') return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
}
function supervisorPenaltyTotal(supervisorId, from, to){
  return toInt(indexedRecords('workerPayments','pp',p=>(p.personType||'')+'|'+(p.personId||p.workerId||''),'supervisor|'+supervisorId).filter(p=>{
    if(p.personType!=='supervisor' || p.personId!==supervisorId) return false;
    if(p.type!=='penalty' && p.type!=='deduction') return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
}
function supervisorPaidTotal(supervisorId, from, to){
  return toInt(indexedRecords('workerPayments','pp',p=>(p.personType||'')+'|'+(p.personId||p.workerId||''),'supervisor|'+supervisorId).filter(p=>{
    if(p.personType!=='supervisor' || p.personId!==supervisorId) return false;
    if(!isActualPayment(p)) return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
}
function workerBalance(workerId, from, to){
  const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('worker', workerId, from, to) : 0;
  const exp = typeof personExpensesTotal==='function' ? personExpensesTotal('worker', workerId, from, to) : 0;
  // المتبقي = المستحق + بدلات − المدفوع − الخصم − المصاريف (المصاريف تُخصم)
  return toInt(workerDueAmount(workerId, from, to) + extras - workerPaidTotal(workerId, from, to) - workerPenaltyTotal(workerId, from, to) - exp);
}
/** خصومات الموظفين */
function employeePenaltyTotal(employeeId, from, to){
  return toInt((DATA.employeePenalties||[]).filter(p=>{
    if(p.employeeId!==employeeId) return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
}

/* ---- Undo ---- */
function showUndoToast(message, onUndo){
  const existing = document.getElementById('undoToast');
  if(existing) existing.remove();
  if(window.__undoTimer){ clearInterval(window.__undoTimer); window.__undoTimer = null; }
  window.__undoAction = onUndo;
  const elToast = document.createElement('div');
  elToast.id = 'undoToast';
  elToast.className = 'undo-toast';
  elToast.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" id="undoToastBtn">استعادة</button><span class="undo-timer" id="undoTimerLabel">5</span>`;
  document.body.appendChild(elToast);
  let left = 5;
  document.getElementById('undoToastBtn').addEventListener('click', ()=>{
    if(window.__undoAction) window.__undoAction();
    window.__undoAction = null;
    if(window.__undoTimer) clearInterval(window.__undoTimer);
    elToast.remove();
    showToast('تم الاستعادة');
  });
  window.__undoTimer = setInterval(()=>{
    left -= 1;
    const lab = document.getElementById('undoTimerLabel');
    if(lab) lab.textContent = String(left);
    if(left <= 0){
      clearInterval(window.__undoTimer);
      window.__undoTimer = null;
      window.__undoAction = null;
      elToast.remove();
    }
  }, 1000);
}

function softDelete(listKey, id, label){
  const list = DATA[listKey] || [];
  const idx = list.findIndex(x => x && x.id === id);
  if(idx < 0) return;
  const item = list[idx];
  // نقل مجلد الأرشيف لسلة المهملات
  const kindMap = { employees:'employee', workers:'worker', supervisors:'supervisor', drivers:'driver', equipment:'equipment' };
  const kind = kindMap[listKey] || '';
  if(kind && typeof archiveFolderToTrashOnEntityDelete==='function'){
    try{ archiveFolderToTrashOnEntityDelete(kind, id, label||item.name, item.code, item); }catch(_e){}
  }
  list.splice(idx, 1);
  saveData();
  showUndoToast('تم حذف «'+(label||id)+'» — المرفقات في سلة المهملات', ()=>{
    DATA[listKey].splice(idx, 0, item);
    // استرجاع من سلة المهملات إن أمكن
    try{
      if(Array.isArray(DATA.archiveTrash)){
        const ti = DATA.archiveTrash.findIndex(t=>t.personId===id && t.kind===kind && t.entityDeleted);
        if(ti>=0){
          const tr = DATA.archiveTrash[ti];
          if(item && Array.isArray(tr.attachments)){
            item.attachments = (item.attachments||[]).concat(tr.attachments);
          }
          DATA.archiveTrash.splice(ti,1);
        }
      }
    }catch(_e){}
    saveData();
    if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
    else if(typeof render==='function') render();
  });
}

/* ---- Density ---- */
function applyUiDensity(){
  document.body.classList.remove('density-compact','density-wide');
  if(uiDensity===0) document.body.classList.add('density-compact');
  if(uiDensity===2) document.body.classList.add('density-wide');
  try{ localStorage.setItem('uiDensity', String(uiDensity)); }catch(e){}
}
try{
  const d = parseInt(localStorage.getItem('uiDensity'),10);
  if(d===0||d===1||d===2) uiDensity = d;
}catch(e){}

/* ---- Attachments UI ---- */
/** طباعة/حفظ مرفق واحد كـ PDF */
function printAttachmentPdf(att, meta){
  meta = meta || {};
  if(!att){ showToast('المرفق غير موجود'); return; }
  const name = att.name || att.storedName || 'مرفق';
  const path = att.path || '';
  const isImg = /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(name) || /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(path)
    || String(att.mime||'').startsWith('image/');
  const isPdf = /\.pdf$/i.test(name) || /\.pdf$/i.test(path) || String(att.mime||'').includes('pdf');
  const co = DATA.settings||{};
  let body = '';
  if(isImg && path){
    body = `<div style="text-align:center;"><img src="${escapeHtml(path)}" style="max-width:100%;max-height:90vh;border:1px solid #ccc;" onerror="this.outerHTML='<p>تعذر عرض الصورة</p>'"></div>`;
  } else if(isPdf && path){
    // PDF أصلي — حاول فتحه ثم اطبع عبر iframe إن أمكن
    body = `<p style="text-align:center;">ملف PDF: <strong>${escapeHtml(name)}</strong></p>
      <p style="text-align:center;font-size:13px;color:#555;">المسار: ${escapeHtml(path)}</p>
      <iframe src="${escapeHtml(path)}" style="width:100%;height:80vh;border:1px solid #ccc;"></iframe>`;
  } else if(path){
    body = `<p>الملف: <strong>${escapeHtml(name)}</strong></p>
      <p style="font-size:13px;">نوع غير قابل للعرض المباشر داخل البرنامج. افتح الملف من زر «فتح» ثم اطبعه من العارض.</p>
      <p style="font-size:12px;color:#666;">${escapeHtml(path)}</p>`;
  } else {
    showToast('مسار الملف غير متاح'); return;
  }
  printHtml(`
    <div class="print-sheet">
      <div style="text-align:center;border-bottom:1px solid #1B4332;padding-bottom:8px;margin-bottom:12px;">
        <h2 style="margin:0;font-size:16px;">${escapeHtml(co.companyName||brandName())}</h2>
        <h3 style="margin:8px 0 0;">${escapeHtml(name)}</h3>
        <div style="font-size:12px;color:#555;">${escapeHtml(meta.owner||'')} · ${fmtDateTime(new Date())}</div>
      </div>
      ${body}
    </div>
  `, 'مرفق - '+name);
}

function attachmentsListHtml(attachments, entityKind, entityId){
  const list = attachments || [];
  if(!list.length){
    return `<div class="att-empty" style="color:var(--ink-soft);font-size:13px;margin:6px 0;">لا توجد مرفقات بعد</div>`;
  }
  if(!list.length) return '<div style="font-size:12.5px;color:var(--ink-soft);padding:6px 0;">لا مرفقات</div>';
  return `<div class="attach-list">${list.map((a,i)=>`
    <div class="attach-item" data-att-idx="${i}">
      <span>${(a.mime||a.name||'').match(/image|jpg|png|jpeg|webp/i)?'🖼️':(a.mime||a.name||'').match(/pdf/i)?'📄':'📎'}</span>
      <span class="attach-name" title="${escapeHtml(a.name||'')}">${escapeHtml(a.name||a.storedName||'ملف')}</span>
      <button type="button" class="btn btn-outline btn-sm btn-open-att" data-kind="${entityKind}" data-eid="${entityId}" data-idx="${i}">فتح</button>
      <button type="button" class="btn btn-outline btn-sm btn-print-att" data-kind="${entityKind}" data-eid="${entityId}" data-idx="${i}">طباعة PDF</button>
      <button type="button" class="btn btn-outline btn-sm btn-del-att-item" data-kind="${entityKind}" data-eid="${entityId}" data-idx="${i}" ${readOnlyMode?'disabled':''}>حذف</button>
    </div>`).join('')}</div>`;
}

function attachmentsToolbarHtml(entityKind, entityId){
  // داخل مسودة مستند (أرشيف): رفع ملف مباشر + مسح
  if(entityKind==='document'){
    return `<div class="att-toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;">
      <button type="button" class="btn btn-primary btn-sm btn-pick-file-att" data-kind="document" data-eid="${entityId}" ${readOnlyMode?'disabled':''}>📁 رفع ملف من الجهاز</button>
      <button type="button" class="btn btn-outline btn-sm btn-scan-att" data-kind="document" data-eid="${entityId}" ${readOnlyMode?'disabled':''}>📷 مسح / كاميرا</button>
    </div>`;
  }
  // في نماذج الأشخاص: إرفاق مستند (يفتح اختيار النوع) + مسح
  return `<div class="att-toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;">
    <button type="button" class="btn btn-primary btn-sm btn-open-doc-att" data-kind="${entityKind}" data-eid="${entityId}" ${readOnlyMode?'disabled':''}>📎 إرفاق مستند</button>
    <button type="button" class="btn btn-outline btn-sm btn-scan-att" data-kind="${entityKind}" data-eid="${entityId}" ${readOnlyMode?'disabled':''}>📷 مسح / كاميرا</button>
  </div>`;
}

function ensureFormDraft(kind, id){
  if(!window.__formDrafts) window.__formDrafts = {};
  const key = kind+':'+id;
  if(!window.__formDrafts[key]) window.__formDrafts[key] = { id, kind, attachments: [] };
  return window.__formDrafts[key];
}
function takeFormDraftAttachments(kind, id){
  if(!window.__formDrafts) return [];
  const key = kind+':'+id;
  const d = window.__formDrafts[key];
  const atts = d && d.attachments ? d.attachments.slice() : [];
  delete window.__formDrafts[key];
  return atts;
}
function getEntityByKind(kind, id){
  if(window.__formDrafts){
    const draft = window.__formDrafts[kind+':'+id];
    if(draft) return draft;
  }
  if(kind==='employee') return getEmployee(id);
  if(kind==='worker') return getWorker(id);
  if(kind==='equipment') return getEquipment(id);
  if(kind==='supervisor') return getSupervisor(id);
  if(kind==='driver') return typeof getDriver==='function' ? getDriver(id) : (DATA.drivers||[]).find(d=>d.id===id);
  if(kind==='project') return (DATA.projects||[]).find(p=>p && p.id===id) || null;
  if(kind==='customer' && typeof clCustomerById==='function'){ const cu = clCustomerById(id); if(cu && !cu.attachments) cu.attachments = (cu.docs||[]).slice(); return cu; }
  if(kind==='document'){
    if(window.__docDrafts && window.__docDrafts[id]) return window.__docDrafts[id];
    return (DATA.personDocuments||[]).find(d=>d.id===id) || null;
  }
  return null;
}


function getDocumentTypeLabelsForKind(kind){
  kind = kind || 'worker';
  const hidden = new Set((DATA.documentTypeHidden||[]).map(x=>String(x).trim()));
  const add = (s, arr, seen)=>{
    s = String(s||'').trim();
    if(!s || seen[s] || hidden.has(s)) return;
    seen[s]=1; arr.push(s);
  };
  const labels = [];
  const seen = {};
  // أساسيات حسب النوع
  const common = ['صورة البطاقة الشخصية','أصل شهادة الميلاد','أصل شهادة الجيش','أصل شهادة المؤهل','عقد عمل','فيش وتشبيه','صور شخصية','كعب عمل','برنت تأميني'];
  const workerExtra = ['إثبات سكن','توكيل'];
  const driverExtra = ['صورة الرخصة الشخصية','شهادة بيانات الرخصة','رخصة قيادة'];
  const empExtra = ['إثبات حساب بنكي','جواز سفر','شهادة خبرة'];
  const projectExtra = ['مستند تكلفة','كشف مصاريف موقع','كشف عمالة موقع','عقد مقاولة','محضر استلام','محضر تسليم','فاتورة مورد','إيصال صرف','صورة موقع','تقرير فترة'];
  const eqExtra = ['أصل عقد الشراء','رخصة قيادة السائق','شهادة البيانات','وثيقة التأمين','بطاقة الرقم القومي للمالك','رخصة المركبة أو المعدة','شهادة الفحص الفني'];
  const supExtra = ['تعيين مشرف','تفويض'];
  let base = common.slice();
  if(kind==='worker') base = base.concat(workerExtra);
  else if(kind==='driver') base = base.concat(driverExtra);
  else if(kind==='employee') base = base.concat(empExtra);
  else if(kind==='equipment') base = eqExtra;
  else if(kind==='supervisor') base = base.concat(supExtra);
  else if(kind==='project') base = projectExtra.slice();
  base.forEach(x=>add(x, labels, seen));
  // أنواع مخصصة عامة
  (DATA.documentTypes||[]).forEach(t=>add(t.name||t.label||t.code, labels, seen));
  // أنواع خاصة بالنوع من التخزين
  if(DATA.documentTypesByKind && Array.isArray(DATA.documentTypesByKind[kind])){
    DATA.documentTypesByKind[kind].forEach(t=>add(typeof t==='string'?t:(t.name||t.label), labels, seen));
  }
  // أنواع مستخدمة سابقاً لنفس النوع
  (DATA.personDocuments||[]).forEach(d=>{
    if(d && (d.kind===kind || d.personKind===kind)) add(d.title||d.docType, labels, seen);
  });
  return labels.sort((a,b)=>String(a).localeCompare(String(b),'ar'));
}
function ensureDocumentTypeSaved(name, kind){
  name = String(name||'').trim();
  if(!name) return;
  DATA.documentTypes = DATA.documentTypes||[];
  if(!DATA.documentTypes.some(t=>String(t.name||t.label||'').trim()===name)){
    DATA.documentTypes.push({ id: uid(), name });
  }
  if(kind){
    if(!DATA.documentTypesByKind) DATA.documentTypesByKind = {};
    if(!Array.isArray(DATA.documentTypesByKind[kind])) DATA.documentTypesByKind[kind] = [];
    if(!DATA.documentTypesByKind[kind].includes(name)) DATA.documentTypesByKind[kind].push(name);
  }
  if(DATA.documentTypeHidden) DATA.documentTypeHidden = (DATA.documentTypeHidden||[]).filter(x=>x!==name);
}

function getAllDocumentTypeLabels(){
  const labels = [];
  const seen = {};
  const hidden = new Set((DATA.documentTypeHidden||[]).map(x=>String(x).trim()));
  const add = (s)=>{
    s = String(s||'').trim();
    if(!s || seen[s] || hidden.has(s)) return;
    seen[s]=1; labels.push(s);
  };
  (typeof REQUIRED_PERSON_DOCS!=='undefined'?REQUIRED_PERSON_DOCS:[]).forEach(r=>add(r.label||r.code));
  ['جواز سفر','رخصة قيادة','شهادة طبية','فيش وتشبيه','صورة شخصية','إثبات حساب بنكي','توكيل','عقد عمل','بطاقة شخصية','أخرى'].forEach(add);
  (DATA.documentTypes||[]).forEach(t=>add(t.name||t.label||t.code));
  return labels.sort((a,b)=>a.localeCompare(b,'ar'));
}
function docTypeComboHtml(fieldId, selected){
  const val = selected || '';
  return `<div class="entity-combo-wrap" data-combo-wrap="${escapeHtml(fieldId)}">
    <input type="hidden" id="${escapeHtml(fieldId)}" value="${escapeHtml(val)}">
    <input type="text" class="input doc-type-combo-text" id="${escapeHtml(fieldId)}_text"
      value="${escapeHtml(val)}" placeholder="اكتب نوع المستند..." autocomplete="off"
      data-doctype-id="${escapeHtml(fieldId)}">
  </div>`;
}
function bindDocTypeCombos(scope){
  const root = scope || document;
  root.querySelectorAll('.doc-type-combo-text').forEach(inp=>{
    if(inp.dataset.boundDocType) return;
    inp.dataset.boundDocType = '1';
    const fid = inp.getAttribute('data-doctype-id');
    const hidden = document.getElementById(fid);
    let wrap = inp.closest('.entity-combo-wrap') || inp.parentElement;
    if(wrap){ wrap.style.position = 'relative'; wrap.style.width = '100%'; }

    let drop = null;
    const ensureDrop = ()=>{
      if(drop && wrap && wrap.contains(drop)) return drop;
      if(drop && drop.parentNode) drop.parentNode.removeChild(drop);
      drop = document.createElement('div');
      drop.className = 'entity-combo-drop';
      drop.setAttribute('dir','rtl');
      (wrap || document.body).appendChild(drop);
      return drop;
    };
    const positionDrop = ()=>{
      const d = ensureDrop();
      d.style.cssText = 'position:absolute;top:calc(100% + 2px);left:0;right:0;width:100%;max-height:220px;overflow-y:auto;z-index:5000;display:block;box-sizing:border-box;';
      d.hidden = false;
    };
    const hideDrop = ()=>{ if(drop){ drop.hidden=true; drop.innerHTML=''; drop.style.display='none'; } };
    const renderDrop = (q)=>{
      const labels = getAllDocumentTypeLabels();
      const qq = String(q||'').trim().toLowerCase();
      let matches = qq ? (typeof smartMatch==='function' ? labels.filter(l=>smartMatch(l, qq)) : labels.filter(l=>l.toLowerCase().includes(qq))) : labels;
      /* بدون حد أقصى */
      const d = ensureDrop();
      if(!matches.length){
        d.innerHTML = `<div class="entity-combo-empty">Enter لحفظ «${escapeHtml(q||'')}» كنوع جديد</div>`;
        positionDrop();
        return;
      }
      d.innerHTML = matches.map(l=>`
        <button type="button" class="entity-combo-item${l===(hidden&&hidden.value) ? ' is-selected' : ''}" data-label="${escapeHtml(l)}">
          <span class="eci-name">${escapeHtml(l)}</span>
        </button>`).join('');
      positionDrop();
      d.querySelectorAll('.entity-combo-item').forEach(btn=>{
        btn.addEventListener('mousedown', (ev)=>{
          ev.preventDefault();
          const lab = btn.getAttribute('data-label')||'';
          inp.value = lab;
          if(hidden) hidden.value = lab;
          hideDrop();
          inp.dispatchEvent(new Event('change', { bubbles:true }));
        });
      });
    };
    inp.addEventListener('focus', ()=> renderDrop(''));
    inp.addEventListener('click', ()=>{ if(!drop || drop.hidden || drop.style.display==='none') renderDrop(''); });
    inp.addEventListener('input', ()=> renderDrop(inp.value));
    inp.addEventListener('blur', ()=> setTimeout(hideDrop, 180));
    inp.addEventListener('keydown', (e)=>{
      if(e.key==='Escape') hideDrop();
      if(e.key==='Enter'){
        e.preventDefault();
        const v = (inp.value||'').trim();
        if(hidden) hidden.value = v;
        if(v && typeof ensureDocumentTypeSaved==='function') ensureDocumentTypeSaved(v);
        hideDrop();
      }
    });
  });
}



/** HTML مرفقات يظهر في الإضافة والتعديل */
function formAttachmentsBlockHtml(kind, entityId, existingAtts){
  return `<div style="grid-column:1/-1;" class="form-att-block">
    <div class="section-title" style="margin-top:8px;">المرفقات والمستندات</div>
    <div class="form-att-list" data-kind="${escapeHtml(kind)}" data-eid="${escapeHtml(entityId)}">${attachmentsListHtml(existingAtts||[], kind, entityId)}</div>
    ${attachmentsToolbarHtml(kind, entityId)}
    <div class="inline-doc-panel" id="inlineDocPanel_${escapeHtml(entityId)}" hidden>
      <label style="display:block;margin-bottom:8px;">نوع المستند * (اكتب للبحث أو أضف نوعاً جديداً)
        ${typeof docTypeComboHtml==='function'?docTypeComboHtml('inlDocType_'+entityId, ''):`<input class="input" id="inlDocType_${escapeHtml(entityId)}" list="docTypeList_${escapeHtml(entityId)}" placeholder="نوع المستند..."><datalist id="docTypeList_${escapeHtml(entityId)}"></datalist>`}
      </label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center;">
        <button type="button" class="btn btn-primary btn-sm btn-inl-pick" data-kind="${escapeHtml(kind)}" data-eid="${escapeHtml(entityId)}">رفع ملف</button>
        <button type="button" class="btn btn-outline btn-sm btn-inl-scan" data-kind="${escapeHtml(kind)}" data-eid="${escapeHtml(entityId)}">📷 مسح / كاميرا</button>
        <button type="button" class="btn btn-outline btn-sm btn-del-doctype" data-eid="${escapeHtml(entityId)}" title="حذف نوع مخصص من القائمة">حذف نوع من القائمة</button>
        <button type="button" class="btn btn-outline btn-sm btn-inl-close" data-eid="${escapeHtml(entityId)}">إخفاء</button>
      </div>
      <p style="font-size:12px;color:var(--ink-soft);margin:8px 0 0;">أي نوع جديد يُحفظ تلقائياً. الحذف للأنواع المخصصة فقط. القائمة لا تُغلق بعد الإرفاق.</p>
    </div>
  </div>`;
}


function refreshAttachmentsInModal(kind, eid){
  const ent = getEntityByKind(kind, eid);
  if(!ent) return;
  const html = attachmentsListHtml(ent.attachments||[], kind, eid);
  const listEl = document.getElementById('docAttList');
  if(listEl) listEl.innerHTML = html;
  document.querySelectorAll('.form-att-list').forEach(el=>{
    if(el.getAttribute('data-kind')===kind && el.getAttribute('data-eid')===eid)
      el.innerHTML = html;
  });
  if(typeof bindAttachmentHandlers==='function') bindAttachmentHandlers(document.getElementById('appModal'));
}

function bindAttachmentHandlers(scope){
  const root = scope || document;
  if(typeof bindDocTypeCombos==='function') bindDocTypeCombos(root);
  root.querySelectorAll('.btn-open-doc-att').forEach(btn=>{
    if(btn.dataset.boundDocAtt) return;
    btn.dataset.boundDocAtt = '1';
    btn.addEventListener('click', async ()=>{
      const kind = btn.getAttribute('data-kind');
      const eid = btn.getAttribute('data-eid');
      const panel = document.getElementById('inlineDocPanel_'+eid);
      if(panel){
        panel.hidden = !panel.hidden;
        if(!panel.hidden) panel.scrollIntoView({block:'nearest', behavior:'smooth'});
        return;
      }
      // لا توجد لوحة نوع — رفع ملف مباشرة
      if(typeof window.__pickAttachmentFile==='function'){
        await window.__pickAttachmentFile(kind, eid, false);
      }
    });
  });
  root.querySelectorAll('.btn-inl-close').forEach(btn=>{
    if(btn.dataset.boundInl) return;
    btn.dataset.boundInl = '1';
    btn.addEventListener('click', ()=>{
      const panel = document.getElementById('inlineDocPanel_'+btn.getAttribute('data-eid'));
      if(panel) panel.hidden = true;
    });
  });
  root.querySelectorAll('.btn-del-doctype').forEach(btn=>{
    if(btn.dataset.boundDelDt) return;
    btn.dataset.boundDelDt = '1';
    btn.addEventListener('click', ()=>{
      const eid = btn.getAttribute('data-eid');
      const hid = document.getElementById('inlDocType_'+eid);
      const txt = document.getElementById('inlDocType_'+eid+'_text');
      const name = ((txt && txt.value) || (hid && hid.value) || '').trim();
      if(!name){ showToast('اكتب النوع المراد حذفه في خانة النوع'); return; }
      const customs = DATA.documentTypes || [];
      const before = customs.length;
      DATA.documentTypes = customs.filter(t=>String(t.name||t.label||'').trim()!==name);
      if(DATA.documentTypes.length===before){
        showToast('هذا النوع أساسي ولا يُحذف من القائمة الثابتة'); return;
      }
      saveData(true);
      if(txt) txt.value = '';
      if(hid) hid.value = '';
      showToast('تم حذف النوع من القائمة');
    });
  });
  /** رفع ملف مباشر (من الجهاز) بدون اشتراط لوحة النوع */
  window.__pickAttachmentFile = async function(kind, eid, scan){
    const ent = getEntityByKind(kind, eid);
    if(!ent){
      // مسودة مستند
      if(kind==='document' && window.__docDrafts){
        if(!window.__docDrafts[eid]) window.__docDrafts[eid] = { id:eid, attachments:[] };
      } else {
        showToast('أكمل البيانات أولاً'); return;
      }
    }
    const entity = getEntityByKind(kind, eid);
    if(!entity){ showToast('تعذر الوصول للسجل'); return; }
    // نوع المستند من حقول المودال إن وُجدت
    let title = (document.getElementById('docType')?.value||'').trim()
      || (document.getElementById('docType_text')?.value||'').trim();
    if(!title){
      const typeInp = document.getElementById('inlDocType_'+eid) || document.getElementById('inlDocType_'+eid+'_text');
      if(typeInp) title = (typeInp.value||'').trim();
      const hid = document.getElementById('inlDocType_'+eid);
      if(hid && hid.value) title = (hid.value||'').trim() || title;
    }
    if(!title) title = 'مرفق';
    if(!window.desktopApi){ showToast('الإرفاق متاح في نسخة سطح المكتب'); return; }
    try{
      const folderId = String(kind||'file')+'_'+String(eid||'tmp');
      let res;
      if(scan && window.desktopApi.scanWindows){
        // فتح أداة المسح ثم اختيار الملف الناتج
        try{ await window.desktopApi.scanWindows(); }catch(_e){}
        if(window.desktopApi.pickAttachments)
          res = await window.desktopApi.pickAttachments(folderId, title);
        else { showToast('اختر الملف بعد المسح من زر رفع ملف'); return; }
      } else if(window.desktopApi.pickAttachments){
        res = await window.desktopApi.pickAttachments(folderId, title);
      } else { showToast('ميزة الإرفاق غير متاحة'); return; }
      if(!res || res.canceled) return;
      const files = res.files || (res.path ? [res] : []);
      if(!files.length){ showToast('لم يتم اختيار ملفات'); return; }
      if(!entity.attachments) entity.attachments = [];
      files.forEach(f=>{
        entity.attachments.push({
          id: typeof uid==='function'?uid():String(Date.now()),
          name: title || f.name || f.storedName || 'ملف',
          docType: title,
          path: f.path || '',
          storedName: f.storedName || f.name || '',
          mime: f.mime || f.type || '',
          addedAt: new Date().toISOString()
        });
      });
      const isDraft = !!(window.__formDrafts && window.__formDrafts[kind+':'+eid]) || kind==='document' || !!(window.__docDrafts && window.__docDrafts[eid]);
      if(!isDraft) saveData(true);
      showToast('تم إرفاق '+(files.length)+' ملف');
      if(typeof refreshAttachmentsInModal==='function') refreshAttachmentsInModal(kind, eid);
      // تحديث قائمة المرفقات داخل مودال المستند
      const listEl = document.getElementById('docAttList');
      if(listEl && kind==='document'){
        listEl.innerHTML = typeof attachmentsListHtml==='function' ? attachmentsListHtml(entity.attachments||[], kind, eid) : '';
        bindAttachmentHandlers(document.getElementById('appModal'));
      }
    }catch(err){ console.error(err); showToast('فشل الإرفاق'); }
  };

  root.querySelectorAll('.btn-pick-file-att').forEach(btn=>{
    if(btn.dataset.boundPickFile) return;
    btn.dataset.boundPickFile = '1';
    btn.addEventListener('click', async ()=>{
      await window.__pickAttachmentFile(btn.getAttribute('data-kind'), btn.getAttribute('data-eid'), false);
    });
  });

  const pickWithMeta = async (kind, eid, scan)=>{
    const ent = getEntityByKind(kind, eid);
    if(!ent){ showToast('أكمل البيانات أولاً'); return; }
    const typeInp = document.getElementById('inlDocType_'+eid) || document.getElementById('inlDocType_'+eid+'_text');
    let docType = '';
    if(typeInp) docType = (typeInp.value||'').trim();
    // hidden for doc type combo stores the value too
    const hid = document.getElementById('inlDocType_'+eid);
    if(hid && hid.value) docType = (hid.value||'').trim() || docType;
    if(!docType){ showToast('اكتب أو اختر نوع المستند'); return; }
    if(typeof ensureDocumentTypeSaved==='function') ensureDocumentTypeSaved(docType);
    const title = docType;
    if(!window.desktopApi){ showToast('الإرفاق متاح في نسخة سطح المكتب'); return; }
    try{
      const folderId = String(kind||'file')+'_'+String(eid||'tmp');
      let res;
      if(scan && window.desktopApi.scanAttachment)
        res = await window.desktopApi.scanAttachment(folderId, title);
      else if(window.desktopApi.pickAttachments)
        res = await window.desktopApi.pickAttachments(folderId, title);
      else { showToast('ميزة الإرفاق غير متاحة'); return; }
      if(!res || res.canceled) return;
      const files = res.files || (res.path ? [res] : []);
      if(!ent.attachments) ent.attachments = [];
      files.forEach(f=>{
        ent.attachments.push({
          id: uid(),
          name: title || f.name || 'ملف',
          docType: docType || title,
          path: f.path || '',
          storedName: f.storedName || f.name || '',
          mime: f.mime || f.type || '',
          addedAt: new Date().toISOString()
        });
      });
      // سجل في أرشيف المستندات أيضاً إن أمكن
      if(docType){
        DATA.personDocuments = DATA.personDocuments || [];
        DATA.personDocuments.push({
          id: uid(), personKind: kind, personId: eid,
          docType: docType, title: title,
          expiryDate: '', notes: '',
          attachments: (ent.attachments||[]).slice(-files.length)
        });
      }
      const isDraft = !!(window.__formDrafts && window.__formDrafts[kind+':'+eid]) || kind==='document' || !!(window.__docDrafts && window.__docDrafts[eid]);
      if(!isDraft) saveData(true);
      showToast('تم إرفاق المستند');
      refreshAttachmentsInModal(kind, eid);
    }catch(err){ showToast('فشل الإرفاق'); console.error(err); }
  };
  root.querySelectorAll('.btn-inl-pick').forEach(btn=>{
    if(btn.dataset.boundInl) return;
    btn.dataset.boundInl = '1';
    btn.addEventListener('click', ()=> pickWithMeta(btn.getAttribute('data-kind'), btn.getAttribute('data-eid'), false));
  });
  root.querySelectorAll('.btn-inl-scan').forEach(btn=>{
    if(btn.dataset.boundInl) return;
    btn.dataset.boundInl = '1';
    btn.addEventListener('click', ()=> pickWithMeta(btn.getAttribute('data-kind'), btn.getAttribute('data-eid'), true));
  });
  root.querySelectorAll('.btn-pick-att, .btn-upload-att').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const kind = btn.getAttribute('data-kind');
      const eid = btn.getAttribute('data-eid');
      const ent = getEntityByKind(kind, eid);
      if(!ent) return;
      if(!window.desktopApi || !window.desktopApi.pickAttachments){ showToast('الإرفاق متاح في نسخة سطح المكتب'); return; }
      try{
        const folderId = String(kind||'file') + '_' + String(eid||'tmp');
        const res = await window.desktopApi.pickAttachments(folderId, ent.name||ent.code||'');
        if(!res || res.canceled) return;
        const files = res.files || (res.path ? [res] : []);
        if(!ent.attachments) ent.attachments = [];
        files.forEach(f=>{
          ent.attachments.push({
            id: uid(),
            name: 'مرفق',
            path: f.path || '',
            storedName: f.storedName || f.name || '',
            mime: f.mime || f.type || '',
            addedAt: new Date().toISOString()
          });
        });
        addAudit('إرفاق ملف', kind+' — '+(ent.name||eid));
        const isDraft = !!(window.__formDrafts && window.__formDrafts[kind+':'+eid]) || kind==='document';
        if(!isDraft) saveData();
        showToast('تم الإرفاق');
        if(document.getElementById('appModal') && document.getElementById('appModal').style.display!=='none'){
          refreshAttachmentsInModal(kind, eid);
        } else if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
      }catch(e){ console.error(e); showToast('فشل الإرفاق'); }
    });
  });
  root.querySelectorAll('.btn-scan-att').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const kind = btn.getAttribute('data-kind');
      const eid = btn.getAttribute('data-eid');
      if(typeof openScanAttachModal==='function'){
        openScanAttachModal(eid, (saved)=>{
          const ent = getEntityByKind(kind, eid);
          if(!ent) return;
          if(!ent.attachments) ent.attachments = [];
          if(Array.isArray(saved)) saved.forEach(s=>ent.attachments.push(s));
          else if(saved) ent.attachments.push(saved);
          addAudit('مسح مرفق', kind+' — '+(ent.name||eid));
          const isDraft = !!(window.__formDrafts && window.__formDrafts[kind+':'+eid]) || kind==='document';
          if(!isDraft) saveData();
          if(document.getElementById('appModal')) refreshAttachmentsInModal(kind, eid);
          else if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
        }, (getEntityByKind(kind,eid)||{}).name||'');
      } else showToast('المسح غير متاح');
    });
  });
  root.querySelectorAll('.btn-open-att').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const kind = btn.getAttribute('data-kind');
      const eid = btn.getAttribute('data-eid');
      const idx = Number(btn.getAttribute('data-idx'));
      const ent = getEntityByKind(kind, eid);
      const att = ent && ent.attachments && ent.attachments[idx];
      if(!att || !att.path){ showToast('المسار غير متاح'); return; }
      if(window.desktopApi && window.desktopApi.openAttachment) await window.desktopApi.openAttachment(att.path);
    });
  });
  root.querySelectorAll('.btn-print-att').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const kind = btn.getAttribute('data-kind');
      const eid = btn.getAttribute('data-eid');
      const idx = Number(btn.getAttribute('data-idx'));
      const ent = getEntityByKind(kind, eid);
      const att = ent && ent.attachments && ent.attachments[idx];
      if(!att){ showToast('المرفق غير موجود'); return; }
      printAttachmentPdf(att, { owner: (ent&&ent.name)||'' });
    });
  });
  root.querySelectorAll('.btn-del-att-item').forEach(btn=>{
    if(btn.dataset.boundDelAtt) return;
    btn.dataset.boundDelAtt = '1';
    btn.addEventListener('click', async (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      confirmDelete('حذف المرفق؟').then(async ok=>{ if(!ok) return;
        const kind = btn.getAttribute('data-kind');
        const eid = btn.getAttribute('data-eid');
        const idx = Number(btn.getAttribute('data-idx'));
        const ent = getEntityByKind(kind, eid);
        if(!ent || !ent.attachments) return;
        const att = ent.attachments[idx];
        if(att && att.path && window.desktopApi && window.desktopApi.deleteAttachment){
        try{ await window.desktopApi.deleteAttachment(att.path); }catch(e){}
        }
        ent.attachments.splice(idx, 1);
        try{ if(typeof detachFromPersonDocuments==='function') detachFromPersonDocuments(eid, att); }catch(_e){}
        const isDraft = !!(window.__formDrafts && window.__formDrafts[kind+':'+eid]);
        if(!isDraft) saveData(true);
        showToast('تم حذف المرفق');
        // تحديث القائمة فوراً دون إغلاق النافذة
        if(document.getElementById('appModal')){
        refreshAttachmentsInModal(kind, eid);
        } else if(typeof rerenderCurrentPage==='function'){
        rerenderCurrentPage();
        }
      });
    });
  });
}

/** شيل مرفق محذوف من سجلات المستندات (الأرشيف) لنفس الشخص، وامسح السجل لو بقى فاضي بدون تاريخ انتهاء */
function detachFromPersonDocuments(personId, att){
  if(!att || !personId || !Array.isArray(DATA.personDocuments)) return 0;
  let removed = 0;
  const same = (x)=> x && ((att.id && x.id===att.id) || (att.path && x.path===att.path) || (att.storedName && x.storedName===att.storedName && x.path===att.path));
  DATA.personDocuments.forEach(d=>{
    if(!d || d.personId!==personId || !Array.isArray(d.attachments)) return;
    const before = d.attachments.length;
    d.attachments = d.attachments.filter(x=>!same(x));
    removed += before - d.attachments.length;
  });
  if(removed){
    DATA.personDocuments = DATA.personDocuments.filter(d=>{
      if(!d || d.personId!==personId) return true;
      const emptyNow = Array.isArray(d.attachments) && !d.attachments.length;
      return !(emptyNow && !d.expiryDate && !String(d.notes||'').trim());
    });
  }
  return removed;
}

/* ---- Collect all attachments for archive ---- */
function archiveFolderKey(kind, id){
  return String(kind||'') + '::' + String(id||'');
}
function collectArchiveFolders(){
  const folders = [];
  const pushFolder = (list, kind, kindLabel, nameFn)=>{
    (list||[]).forEach(ent=>{
      if(!ent || !ent.id) return;
      const atts = (ent.attachments||[]).filter(Boolean).map(a=>Object.assign({}, a, { fromDoc: a.fromDoc||a.note||'مرفق مباشر' }));
      folders.push({
        key: archiveFolderKey(kind, ent.id),
        kind, kindLabel,
        id: ent.id,
        name: nameFn(ent) || ent.code || ent.id,
        code: ent.code||'',
        count: atts.length,
        attachments: atts
      });
    });
  };
  pushFolder(DATA.employees, 'employee', 'موظف', e=>e.name);
  pushFolder(DATA.workers, 'worker', 'عامل', w=>w.name);
  pushFolder(DATA.supervisors, 'supervisor', 'مشرف', s=>s.name);
  pushFolder(DATA.drivers, 'driver', 'سائق', d=>d.name);
  pushFolder(DATA.equipment, 'equipment', 'معدة / مركبة', eq=>eq.name);
  pushFolder(DATA.projects, 'project', 'مشروع', p=>p.name);
  // دمج مستندات personDocuments بدون تكرار نفس المسار
  (DATA.personDocuments||[]).forEach(d=>{
    if(!d || !d.personId) return;
    const kind = d.kind||d.personKind||'worker';
    const key = archiveFolderKey(kind, d.personId);
    let f = folders.find(x=>x.key===key);
    if(!f){
      let nm = d.personId;
      try{
        if(kind==='worker') nm = workerName(d.personId);
        else if(kind==='driver') nm = driverName(d.personId);
        else if(kind==='supervisor') nm = supervisorName(d.personId);
        else if(kind==='equipment') nm = (getEquipment(d.personId)||{}).name||d.personId;
        else nm = employeeName(d.personId);
      }catch(_e){}
      f = { key, kind, kindLabel: kind==='worker'?'عامل':kind==='driver'?'سائق':kind==='supervisor'?'مشرف':kind==='equipment'?'معدة / مركبة':kind==='project'?'مشروع':'موظف', id:d.personId, name:nm, code:'', count:0, attachments:[] };
      folders.push(f);
    }
    const existingPaths = new Set((f.attachments||[]).map(a=>a && a.path).filter(Boolean));
    (d.attachments||[]).forEach(a=>{
      if(!a) return;
      if(a.path && existingPaths.has(a.path)) return;
      if(a.path) existingPaths.add(a.path);
      f.attachments.push(Object.assign({}, a, { fromDoc: d.title||d.docType||'مستند', docId: d.id }));
    });
    f.count = f.attachments.length;
  });
  folders.sort((a,b)=>{
    const c = String(a.kindLabel||'').localeCompare(String(b.kindLabel||''),'ar');
    if(c) return c;
    return String(a.name||'').localeCompare(String(b.name||''),'ar');
  });
  return folders;
}

function collectAllAttachments(){
  const items = [];
  function pushAll(list, kind, kindLabel, nameFn){
    (list||[]).forEach(ent=>{
      (ent.attachments||[]).forEach(a=>{
        if(!a) return;
        items.push({ ...a, kind, kindLabel, refName: nameFn(ent), refId:ent.id, date:(a.addedAt||'').slice(0,10) });
      });
    });
  }
  pushAll(DATA.employees, 'employee', 'موظف', e=>e.name||e.code);
  pushAll(DATA.workers, 'worker', 'عامل', w=>w.name||w.code);
  pushAll(DATA.supervisors, 'supervisor', 'مشرف', s=>s.name||s.code);
  pushAll(DATA.drivers, 'driver', 'سائق', d=>d.name||d.code);
  pushAll(DATA.equipment, 'equipment', 'معدة', eq=>eq.name||eq.code);
  // مستندات مسجّلة (تواريخ انتهاء) كعناصر أرشيف منطقية
  (DATA.personDocuments||[]).forEach(d=>{
    const nm = d.kind==='worker'?workerName(d.personId):d.kind==='driver'?driverName(d.personId):d.kind==='supervisor'?supervisorName(d.personId):employeeName(d.personId);
    items.push({
      id: d.id, name: d.title||'مستند', kind: 'document', kindLabel: 'مستند',
      refName: nm, refId: d.personId, date: d.expiryDate||'', expiryDate: d.expiryDate,
      notes: d.notes||'', isDocumentMeta: true
    });
    (d.attachments||[]).forEach(a=>{
      if(!a) return;
      items.push({ ...a, kind:'document', kindLabel:'مستند مرفق', refName: (nm||'')+' — '+(d.title||''), refId:d.id, date:(a.addedAt||'').slice(0,10) });
    });
  });
  items.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.addedAt||'').localeCompare(a.addedAt||''));
  return items;
}
function driverAttendanceInRange(driverId, from, to){
  return indexedRecords('workerAttendance','ad',a=>attType(a)==='driver'?attPersonId(a):'',driverId).filter(a=>{
    if(attType(a)!=='driver' || attPersonId(a)!==driverId) return false;
    if(from && (a.date||'')<from) return false;
    if(to && (a.date||'')>to) return false;
    return true;
  });
}
function driverDaysWorked(driverId, from, to){
  const sum = driverAttendanceInRange(driverId, from, to).reduce((s,a)=>s+attendanceDaysCredit(a),0);
  return Math.round(sum*100)/100;
}
function driverDueAmount(driverId, from, to){
  const d = getDriver(driverId);
  return toInt(driverAttendanceInRange(driverId, from, to).reduce((s,a)=>s+attendanceNetPay(a,d),0));
}
function driverPaidTotal(driverId, from, to){
  return toInt(indexedRecords('workerPayments','pp',p=>(p.personType||'')+'|'+(p.personId||p.workerId||''),'driver|'+driverId).filter(p=>{
    if(p.personType!=='driver' || p.personId!==driverId) return false;
    if(!isActualPayment(p)) return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
}
function driverPenaltyTotal(driverId, from, to){
  return toInt(indexedRecords('workerPayments','pp',p=>(p.personType||'')+'|'+(p.personId||p.workerId||''),'driver|'+driverId).filter(p=>{
    if(p.personType!=='driver' || p.personId!==driverId) return false;
    if(p.type!=='penalty'&&p.type!=='deduction') return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
}
/** عدد الشهور (تقويمية) اللي بتغطيها الفترة بين تاريخين — شهر واحد لو مفيش فترة */
function monthsInRange(from, to){
  if(!from || !to) return 1;
  const a = parseLocalDate(from), b = parseLocalDate(to);
  if(!a || !b || b < a) return 1;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}
/**
 * مستحق راتب الموظف عن فترة (مصدر واحد لكل الشاشات والكشوف):
 * - لو فيه سجلات رواتب قديمة (DATA.payroll) في الفترة → مجموعها (زي ما كان).
 * - غير كده: الراتب الشهري × عدد الشهور في الفترة (من تاريخ التعيين لحد الاستقالة).
 * - لو الإعدادات "خصم الغياب": بيتخصم (الراتب ÷ أيام العمل شهرياً) × أيام الغياب.
 */
function employeeDueAmount(employeeId, from, to){
  const e = typeof getEmployee==='function' ? getEmployee(employeeId) : (DATA.employees||[]).find(x=>x.id===employeeId);
  if(!e) return 0;
  const legacy = (DATA.payroll||[]).filter(p=>{
    if(p.employeeId !== employeeId) return false;
    if(from || to){
      const ym = (p.year!=null && p.month!=null) ? (String(p.year)+'-'+String(p.month).padStart(2,'0')) : '';
      if(ym){
        if(from && ym < String(from).slice(0,7)) return false;
        if(to && ym > String(to).slice(0,7)) return false;
      }
    }
    return true;
  });
  const legacySum = toInt(legacy.reduce((s,p)=>s+toInt(p.netSalary||p.net||p.paid),0));
  if(legacySum) return legacySum;
  const salary = toInt(e.salary||e.basicSalary);
  if(!salary) return 0;
  let f = from, t = to;
  const hire = String(e.hireDate||'').slice(0,10), res = String(e.resignedAt||'').slice(0,10);
  if(f && t){
    if(hire && hire > f) f = hire;
    if(res && res < t) t = res;
    if(f > t) return 0;                       // الفترة كلها قبل التعيين أو بعد الاستقالة
  }
  let due = salary * monthsInRange(f, t);
  if(String((DATA.settings||{}).employeeSalaryMode||'fixed') === 'deductAbsence'){
    const wdm = Number((DATA.settings||{}).workDaysPerMonth) || 26;
    due = Math.max(0, due - round2(salary / wdm * employeeDaysAbsent(employeeId, f, t)));
  }
  return round2(due);
}
function employeeBalance(employeeId, from, to){
  const e = typeof getEmployee==='function' ? getEmployee(employeeId) : (DATA.employees||[]).find(x=>x.id===employeeId);
  const base = e ? employeeDueAmount(employeeId, from, to) : 0;
  const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('employee', employeeId, from, to) : 0;
  const paid = toInt((DATA.workerPayments||[]).filter(p=>{
    if(p.personType!=='employee'||p.personId!==employeeId) return false;
    if(typeof isActualPayment==='function' && !isActualPayment(p)) return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
  const pen = typeof employeePenaltyTotal==='function' ? employeePenaltyTotal(employeeId, from, to) : 0;
  const exp = typeof personExpensesTotal==='function' ? personExpensesTotal('employee', employeeId, from, to) : 0;
  return toInt(base + extras - paid - pen - exp);
}
function driverBalance(driverId, from, to){
  const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('driver', driverId, from, to) : 0;
  const exp = typeof personExpensesTotal==='function' ? personExpensesTotal('driver', driverId, from, to) : 0;
  return toInt(driverDueAmount(driverId,from,to)+extras-driverPaidTotal(driverId,from,to)-driverPenaltyTotal(driverId,from,to)-exp);
}

/* ---- Deep validation ---- */

/** فحص العمليات الحسابية: يوميات · مستحقات · أرصدة · تكلفة معدات · كشوف مشرفين */
/** فحوصات إضافية للحسابات والأيام: بتعيد حساب المستحق من السجلات الخام بشكل مستقل وتقارنه بالدوال، وبتكشف سجلات حضور/إجازات مشكوك فيها */
function extraCalcChecks(){
  const issues = [];
  const P = {};   // خريطة الأشخاص
  (DATA.workers||[]).forEach(x=>P[x.id]='worker');
  (DATA.drivers||[]).forEach(x=>P[x.id]='driver');
  (DATA.supervisors||[]).forEach(x=>P[x.id]='supervisor');
  const seen = {};
  const mk = (type, id, page, msg, label)=>issues.push({ type, id, page, msg, label: label||'' });
  (DATA.workerAttendance||[]).forEach(a=>{
    if(!a || !a.id) return;
    const pid = attPersonId(a), t = attType(a);
    if(!pid || !P[pid]){ mk('حضور', a.id, 'workerAttendance', 'سجل حضور لشخص غير موجود', a.date||''); return; }
    if(P[pid] !== t) mk('حضور', a.id, 'workerAttendance', 'نوع صاحب السجل ('+t+') مختلف عن نوعه الفعلي ('+P[pid]+')', a.date||'');
    if(!/^\d{4}-\d{2}-\d{2}/.test(String(a.date||''))) mk('حضور', a.id, 'workerAttendance', 'تاريخ غير صالح: '+(a.date||'فاضي'), pid);
    const key = pid + '|' + (a.date||'') + '|' + String(a.status||'');
    if(seen[key]) mk('حضور', a.id, 'workerAttendance', 'سجل مكرر لنفس الشخص ونفس اليوم والحالة (هيتحسب مرتين)', a.date||''); else seen[key] = 1;
    if(isPayableAttendance(a.status) && attendanceDayWage(a) <= 0) mk('حضور', a.id, 'workerAttendance', 'يوم مدفوع ويوميته صفر', a.date||'');
    const ded = toInt(a.deduction), gross = round2(attendanceDayWage(a) * attendanceDaysCredit(a));
    if(ded > gross && gross > 0) mk('حضور', a.id, 'workerAttendance', 'الخصم ('+ded+') أكبر من أجر اليوم ('+gross+')', a.date||'');
  });
  // إعادة حساب مستقلة من السجلات الخام لكل عامل
  (DATA.workers||[]).forEach(w=>{
    let raw = 0;
    (DATA.workerAttendance||[]).forEach(a=>{
      if(!a || (a.workerId || a.personId) !== w.id || (a.personType && a.personType !== 'worker')) return;
      const st = String(a.status||'').toLowerCase();
      if(st === 'absent' || st === 'holiday') return;
      let d = Number(a.days); if(!(d > 0)) d = st === 'half' ? 0.5 : 1; else if(st === 'half' && d >= 1) d = 0.5;
      const rate = (a.dayWage != null && a.dayWage !== '' && Number.isFinite(Number(a.dayWage))) ? Number(a.dayWage) : Number(w.dailyWage)||0;
      let line = Math.round(rate * d * 100) / 100;
      const ded = Number(a.deduction)||0; if(ded > 0) line = Math.max(0, line - ded);
      raw += line;
    });
    raw = Math.round(raw * 100) / 100;
    const calc = workerDueAmount(w.id);
    if(Math.abs(raw - calc) > 0.01) mk('حساب عامل', w.id, 'workerDues', 'المستحق المحسوب ('+calc+') ≠ إعادة الحساب من السجلات ('+raw+')', w.name);
    const sm = workerWageSummary(w.id);
    if(Math.abs(sm.balance - workerBalance(w.id)) > 0.01) mk('حساب عامل', w.id, 'workerDues', 'رصيد كشف الحساب ('+sm.balance+') ≠ رصيد شاشة المستحقات ('+workerBalance(w.id)+')', w.name);
  });
  // إجازات
  const byEmp = {};
  (DATA.leaves||[]).forEach(l=>{
    if(!l || !l.id) return;
    if(!(DATA.employees||[]).some(e=>e.id===l.employeeId)) mk('إجازة', l.id, 'leaves', 'إجازة لموظف غير موجود', l.from||'');
    if(l.from && l.to && l.to < l.from) mk('إجازة', l.id, 'leaves', 'تاريخ النهاية قبل البداية', l.from);
    if(!(Number(l.days) > 0)) mk('إجازة', l.id, 'leaves', 'عدد أيام الإجازة غير محدد', l.from||'');
    if(l.status === 'approved' && l.employeeId) (byEmp[l.employeeId] = byEmp[l.employeeId] || []).push(l);
  });
  Object.keys(byEmp).forEach(eid=>{
    const L = byEmp[eid].slice().sort((a,b)=>String(a.from).localeCompare(String(b.from)));
    for(let i = 1; i < L.length; i++){
      if(L[i].from && L[i-1].to && L[i].from <= L[i-1].to) mk('إجازة', L[i].id, 'leaves', 'إجازة متداخلة مع إجازة تانية معتمدة لنفس الموظف', L[i].from);
    }
    const e = getEmployee(eid);
    if(e && employeeLeaveBalance(eid) < 0) mk('إجازة', eid, 'leaves', 'رصيد الإجازة السنوي سالب ('+employeeLeaveBalance(eid)+')', e.name);
  });
  // دفعات
  (DATA.workerPayments||[]).forEach(p=>{
    if(!p || !p.id) return;
    if(!(toInt(p.amount) > 0)) mk('دفعة', p.id, 'workerDues', 'مبلغ الدفعة صفر أو غير صالح', p.date||'');
    if(p.personId && !P[p.personId] && p.personType !== 'employee') mk('دفعة', p.id, 'workerDues', 'دفعة لشخص غير موجود', p.date||'');
  });
  return issues;
}

function validateCalculations(){
  const issues = [];
  const eps = 0; // أرقام صحيحة — لا تسامح
  (DATA.workerAttendance||[]).forEach(a=>{
    if(!a || !a.id) return;
    const days = Number(a.days);
    if(a.days!=null && (!Number.isFinite(days) || days<0)){
      issues.push({ type:'حساب حضور', id:a.id, page:'workerAttendance', msg:'عدد أيام غير صالح: '+a.days, label:a.date||'' });
    }
    if(a.status==='half' && days && Math.abs(days-0.5)>0.01 && Math.abs(days-1)>0.01){
      // half day status but days not 0.5 - soft warn
    }
    const wage = toInt(a.dayWage != null ? a.dayWage : a.dailyWage);
    if((a.dayWage!=null || a.dailyWage!=null) && wage<0){
      issues.push({ type:'حساب حضور', id:a.id, page:'workerAttendance', msg:'يومية سالبة', label:a.date||'' });
    }
  });
  (DATA.workers||[]).filter(w=>w.status!=='left').forEach(w=>{
    const due = workerDueAmount(w.id);
    const paid = workerPaidTotal(w.id);
    const pen = workerPenaltyTotal(w.id);
    const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('worker', w.id) : 0;
    const bal = workerBalance(w.id);
    const expn = typeof personExpensesTotal==='function' ? personExpensesTotal('worker', w.id) : 0;
    const expect = toInt(due + extras - paid - pen - expn);
    if(bal !== expect){
      issues.push({ type:'حساب عامل', id:w.id, page:'workerDues', msg:'رصيد غير متسق: المحسوب '+bal+' ≠ المتوقع '+expect, label:w.name });
    }
    if(due<0 || paid<0 || pen<0 || extras<0){
      issues.push({ type:'حساب عامل', id:w.id, page:'workerDues', msg:'قيم سالبة في المستحق/المدفوع/الخصم', label:w.name });
    }
  });
  (DATA.drivers||[]).filter(d=>d.status!=='left').forEach(d=>{
    const due = driverDueAmount(d.id);
    const paid = driverPaidTotal(d.id);
    const pen = driverPenaltyTotal(d.id);
    const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('driver', d.id) : 0;
    const expn = typeof personExpensesTotal==='function' ? personExpensesTotal('driver', d.id) : 0;
    const expect = toInt(due + extras - paid - pen - expn);
    if(driverBalance(d.id) !== expect){
      issues.push({ type:'حساب سائق', id:d.id, page:'drivers', msg:'رصيد غير متسق: المحسوب '+driverBalance(d.id)+' ≠ المتوقع '+expect, label:d.name });
    }
    if(due<0 || paid<0 || pen<0 || extras<0){
      issues.push({ type:'حساب سائق', id:d.id, page:'drivers', msg:'قيم سالبة في المستحق/المدفوع/الخصم/الإضافات', label:d.name });
    }
  });
  (DATA.supervisors||[]).filter(s=>s.status!=='left').forEach(s=>{
    try{
      const st = supervisorWageStatement(s.id);
      const expectDue = toInt((st.workersDue||0)+(st.ownDue||0)+(st.equipCost||0));
      if(toInt(st.totalDue) !== expectDue){
        issues.push({ type:'حساب مشرف', id:s.id, page:'supervisors', msg:'إجمالي الكشف غير متسق', label:s.name });
      }
      const expectBal = toInt(st.totalDue - st.totalPaid - toInt(st.totalPenalty||0) - toInt(st.totalExpenses||0));
      if(toInt(st.totalBal) !== expectBal){
        issues.push({ type:'حساب مشرف', id:s.id, page:'supervisors', msg:'متبقي الكشف غير متسق', label:s.name });
      }
      // المتبقي الكلي لازم = متبقي العمال + متبقي المشرف + متبقي المعدات (وإلا فيه مبلغ بيتحسب مرتين أو بيضيع)
      const parts = toInt((st.workersBal||0) + (st.ownBal||0) + (st.equipBal||0));
      if(Math.abs(toInt(st.totalBal) - parts) > 0.01){
        issues.push({ type:'حساب مشرف', id:s.id, page:'supervisors', msg:'المتبقي الكلي ('+toInt(st.totalBal)+') ≠ مجموع متبقي العمال والمشرف والمعدات ('+parts+')', label:s.name });
      }
      const rowsBal = toInt((st.workers||[]).reduce((a,r)=>a+toInt(r.bal),0));
      if(Math.abs(rowsBal - toInt(st.workersBal)) > 0.01){
        issues.push({ type:'حساب مشرف', id:s.id, page:'supervisors', msg:'مجموع أرصدة العمال في الكشف ≠ متبقي العمال', label:s.name });
      }
      (st.equipLogs||[]).forEach(r=>{
        const again = equipmentDailyCost(r.d, r.eq);
        if(toInt(r.cost) !== toInt(again)){
          issues.push({ type:'حساب معدة', id:r.d&&r.d.id, page:'equipment', msg:'تكلفة يومية غير متسقة', label:r.name });
        }
      });
    }catch(e){
      issues.push({ type:'حساب مشرف', id:s.id, page:'supervisors', msg:'تعذر حساب الكشف: '+(e.message||e), label:s.name });
    }
  });
  (DATA.equipmentDaily||[]).forEach(d=>{
    const eq = getEquipment(d.equipmentId);
    const c = equipmentDailyCost(d, eq);
    if(c<0) issues.push({ type:'حساب معدة', id:d.id, page:'equipment', msg:'تكلفة يومية سالبة', label:eq&&eq.name });
    const days = Number(d.days)||0;
    const hours = Number(d.hours)||0;
    if(days<0 || hours<0) issues.push({ type:'حساب معدة', id:d.id, page:'equipment', msg:'أيام أو ساعات سالبة', label:eq&&eq.name });
  });
  (DATA.workerPayments||[]).forEach(p=>{
    if(toInt(p.amount)<0) issues.push({ type:'دفعة', id:p.id, page:'workerDues', msg:'مبلغ دفعة سالب', label:p.date||'' });
    if(!p.personId && !p.workerId) issues.push({ type:'دفعة', id:p.id, page:'workerDues', msg:'دفعة بدون شخص مرتبط', label:p.date||'' });
  });
  (DATA.payroll||[]).forEach(p=>{
    if(!p) return;
    const expected = Number(p.basicSalary||0)+Number(p.allowances||0)-Number(p.deductions||0);
    if(Math.abs(Number(p.netSalary||0)-expected)>0.05){
      issues.push({ type:'حساب راتب', id:p.id, page:'payroll', msg:'صافي الراتب غير مطابق (الأساسي + البدلات − الخصومات)', label:(typeof employeeName==='function'?employeeName(p.employeeId):'')||p.id });
    }
  });
  (DATA.supervisorExpenses||[]).forEach(e=>{
    if(toInt(e.amount)<0) issues.push({ type:'مصروف', id:e.id, page:'expenses', msg:'مبلغ مصروف سالب', label:e.date||'' });
    if(!e.supervisorId) issues.push({ type:'مصروف', id:e.id, page:'expenses', msg:'مصروف بدون مشرف', label:e.date||'' });
  });
  try{
    const PAGE_OF = { workers:'workers', employees:'employees', supervisors:'supervisors', drivers:'drivers', equipment:'equipment', projects:'projects', departments:'departments', expenses:'expenses', costs:'costs', workerAttendance:'workerAttendance', workerPayments:'workerDues' };
    findCorruptedTexts(120).filter(c=>!(c.store==='projects' && c.field==='name')).forEach(c=>issues.push({ type:'نص تالف', id:c.id, recId:c.id, store:c.store, field:c.field, value:c.value, page:PAGE_OF[c.store]||'', msg:'الحقل «'+c.field+'» فيه رموز تالفة (�): «'+String(c.value).slice(0,60)+'» — عدّله يدوياً', label:c.name||c.store }));
    (DATA.projects||[]).filter(p=>p && textHasCorruption(p.name)).forEach(p=>issues.push({ type:'مشروع تالف', id:p.id, recId:p.id, store:'projects', field:'name', value:p.name, page:'projects', msg:'اسم المشروع فيه رموز تالفة (�): «'+p.name+'» — غيّره للاسم الصح أو احذفه بعد نقل سجلاته', label:p.name }));
  }catch(e){}
  try{ extraCalcChecks().forEach(i=>issues.push(i)); }catch(e){ issues.push({ type:'فحص', id:'', page:'', msg:'تعذر تشغيل الفحوصات الإضافية: '+e.message, label:'' }); }
  return issues;
}

/** فحص البيانات = فحص الحسابات فقط (لا يعدّل ولا يحذف أي شيء) */


/** خانة تاريخ الاستقالة — تظهر عند اختيار حالة مستقيل */
function resignedDateFieldHtml(prefix, person){
  const st = person && person.status || '';
  const show = (typeof isResignedStatus==='function' && isResignedStatus(st));
  const val = (person && (person.resignedAt||person.resignDate)) || '';
  return `<label id="${prefix}ResignDateWrap" style="${show?'':'display:none;'}">تاريخ الاستقالة *
    <input class="input" id="${prefix}ResignDate" type="date" value="${escapeHtml(val)}">
  </label>`;
}
function bindResignedStatusToggle(statusSelectId, prefix){
  const sel = document.getElementById(statusSelectId);
  const wrap = document.getElementById(prefix+'ResignDateWrap');
  const inp = document.getElementById(prefix+'ResignDate');
  if(!sel || !wrap) return;
  const apply = ()=>{
    const on = typeof isResignedStatus==='function' && isResignedStatus(sel.value);
    wrap.style.display = on ? '' : 'none';
    if(on && inp && !inp.value && typeof todayISO==='function') inp.value = todayISO();
  };
  sel.addEventListener('change', apply);
  apply();
}
function readResignedDateFromForm(prefix, status){
  if(typeof isResignedStatus==='function' && !isResignedStatus(status)) return '';
  const el = document.getElementById(prefix+'ResignDate');
  return el ? (el.value||'').trim() : '';
}

/** هل الحالة تعني مستقيل / غادر / منتهي */
function isResignedStatus(st){
  const s = String(st||'').toLowerCase();
  return s==='resigned' || s==='left' || s==='terminated' || s==='retired';
}
function isRetiredStatus(st){ return String(st||'').toLowerCase()==='retired'; }
function isRetiredDeptId(id){ return !!(id && String(id).indexOf('__retired_')===0); }
function retiredDeptIdForKind(kind){
  const k = ({employee:'employee',employees:'employee',worker:'worker',workers:'worker',supervisor:'supervisor',supervisors:'supervisor',driver:'driver',drivers:'driver'})[kind] || (kind||'person');
  return '__retired_'+k+'__';
}
function ensureRetiredDepartment(kind){
  if(!Array.isArray(DATA.departments)) DATA.departments = [];
  const id = retiredDeptIdForKind(kind);
  const kindKey = ({employee:'employees',employees:'employees',worker:'workers',workers:'workers',supervisor:'supervisors',supervisors:'supervisors',driver:'drivers',drivers:'drivers'})[kind] || kind || 'employees';
  let d = DATA.departments.find(x=>x && x.id===id);
  if(!d){ d = { id, name:'المعاشات', kind:kindKey, system:true, locked:true }; DATA.departments.push(d); }
  else { d.name = 'المعاشات'; d.kind = kindKey; d.system = true; d.locked = true; }
  return d;
}

/** معرّف قسم المستقيلين حسب نوع الصفحة */
function resignedDeptIdForKind(kind){
  const map = {
    employee:'__resigned_employee__', employees:'__resigned_employee__',
    worker:'__resigned_worker__', workers:'__resigned_worker__',
    supervisor:'__resigned_supervisor__', supervisors:'__resigned_supervisor__',
    driver:'__resigned_driver__', drivers:'__resigned_driver__',
    equipment:'__resigned_equipment__'
  };
  return map[kind] || ('__resigned_'+(kind||'person')+'__');
}

/** التأكد من وجود قسم «المستقيلين» لكل نوع */
function ensureResignedDepartment(kind){
  if(!Array.isArray(DATA.departments)) DATA.departments = [];
  const id = resignedDeptIdForKind(kind);
  const kindKey = ({
    employee:'employees', employees:'employees',
    worker:'workers', workers:'workers',
    supervisor:'supervisors', supervisors:'supervisors',
    driver:'drivers', drivers:'drivers',
    equipment:'equipment'
  })[kind] || kind || 'employees';
  let d = DATA.departments.find(x=>x && x.id===id);
  if(!d){
    d = { id, name:'المستقيلين', kind: kindKey, system:true, locked:true };
    DATA.departments.push(d);
  } else {
    d.name = 'المستقيلين';
    d.kind = kindKey;
    d.system = true;
    d.locked = true;
  }
  return d;
}

/** الأقسام الثابتة الأساسية — لا تُضاف ولا تُعدَّل ولا تُحذف */
const CORE_DEPTS = {
  employees: [{ id:'__core_employees__', name:'الموظفين' }],
  workers: [{ id:'__core_workers_perm__', name:'عمال الشركة', dailies:'يوميات عمالة الشركة' }, { id:'__core_workers_temp__', name:'عمالة مؤقتة', dailies:'يوميات عمالة مؤقتة' }],
  supervisors: [{ id:'__core_supervisors__', name:'المشرفين' }],
  drivers: [{ id:'__core_drivers__', name:'سائقين الشركة' }, { id:'__core_drivers_ext__', name:'سائقون من خارج الشركة' }],
  equipment: [{ id:'__core_eq_machinery__', name:'المعدات' }, { id:'__core_eq_private__', name:'السيارات الملاكى' }, { id:'__core_eq_trucks__', name:'سيارات النقل' }, { id:'__core_eq_external__', name:'سيارات خارجية' }]
};
function ensureCoreDepartments(){
  if(!Array.isArray(DATA.departments)) DATA.departments = [];
  Object.keys(CORE_DEPTS).forEach(kind=>{
    CORE_DEPTS[kind].forEach(c=>{
      let d = DATA.departments.find(x=>x && x.id===c.id);
      if(!d){ d = { id:c.id }; DATA.departments.push(d); }
      d.name = c.name; d.kind = kind; d.system = true; d.locked = true; d.core = true;
      if(c.dailies) d.dailiesName = c.dailies;
    });
  });
}
/** قسم الموظف من وظيفته: مهندس → المهندسين، محاسب → المحاسبين … */
function jobDeptName(job){
  job = String(job||'').replace(/\s+/g,' ').trim();
  if(!job) return '';
  if(/\s/.test(job)) return job.indexOf('ال')===0 ? job : 'ال'+job;
  let w = job.replace(/^ال/,'');
  if(/ة$/.test(w)) w = w.slice(0,-1)+'ات'; else w = w+'ين';
  return 'ال'+w;
}
function jobDeptIdFor(job){
  const n = String(job||'').replace(/\s+/g,' ').trim();
  let h = 0; for(let i=0;i<n.length;i++){ h = (h*31 + n.charCodeAt(i))>>>0; }
  return '__job_'+h.toString(36)+'__';
}
function ensureJobDepartment(job){
  const name = jobDeptName(job); if(!name) return '';
  const id = jobDeptIdFor(job);
  if(!Array.isArray(DATA.departments)) DATA.departments = [];
  let d = DATA.departments.find(x=>x && x.id===id);
  if(!d){ d = { id }; DATA.departments.push(d); }
  d.name = name; d.kind = 'employees'; d.system = true; d.locked = true; d.jobDept = true;
  return id;
}
const _CORE_LISTS = { employees:'employees', workers:'workers', supervisors:'supervisors', drivers:'drivers', equipment:'equipment' };
function coreDeptIdFor(kind, p){
  if(kind==='employees') return '__core_employees__';
  if(kind==='supervisors') return '__core_supervisors__';
  if(kind==='drivers') return (p && p.external) ? '__core_drivers_ext__' : '__core_drivers__';
  if(kind==='workers') return (typeof isWorkerTemporary==='function' && isWorkerTemporary(p)) ? '__core_workers_temp__' : '__core_workers_perm__';
  if(kind==='equipment'){
    const cur = String((p.departmentId||p.categoryId)||'');
    if(CORE_DEPTS.equipment.some(c=>c.id===cur)) return cur;
    const dn = (typeof departmentName==='function' ? departmentName(cur) : '') || p.typeLabel || p.typeName || '';
    const blob = (dn+' '+(p.carType||'')+' '+(p.type||'')).toLowerCase();
    if(/ملاك|ملاكي|private|car\b/.test(blob)) return '__core_eq_private__';
    if(/نقل|truck|transport/.test(blob)) return '__core_eq_trucks__';
    if(/خارج|external|rent/.test(blob) || p.ownership==='rented') return '__core_eq_external__';
    if(/معدة|معدات|حفار|لودر|ونش|رافعة|مولد|خلاط|machin|equip|loader|excavator/.test(blob)) return '__core_eq_machinery__';
    return '';
  }
  return '';
}
/** نقل كل الأشخاص والمعدات النشطة إلى الأقسام الأساسية (المستقيلين والمعاشات يبقون كما هم) */
/** القسم يُقرأ من الوظيفة/النوع تلقائياً — لا يُختار يدوياً في النماذج */
function personDeptOnSave(kind, existing, payload){
  const cur = String((existing && (existing.departmentId||existing.categoryId)) || '');
  let id = cur;
  if(!(cur && (isResignedDeptId(cur) || (typeof isRetiredDeptId==='function' && isRetiredDeptId(cur))))){
    const want = coreDeptIdFor(kind, Object.assign({}, existing||{}, payload||{}));
    if(want) id = want;
  }
  if(id){ payload.departmentId = id; payload.categoryId = id; }
  return payload;
}
function assignCoreDepartments(){
  let changed = false;
  try{
    Object.keys(_CORE_LISTS).forEach(kind=>{
      (DATA[_CORE_LISTS[kind]]||[]).forEach(p=>{
        if(!p) return;
        const cur = String((p.departmentId||p.categoryId)||'');
        if(cur && isResignedDeptId(cur)) return;
        const want = coreDeptIdFor(kind, p);
        if(!want || cur===want) return;
        if(cur && !p.legacyDepartmentId) p.legacyDepartmentId = cur;
        p.departmentId = want; p.categoryId = want; changed = true;
      });
    });
    // أقسام الوظائف لم تعد مستخدمة: احذفها
    const before = (DATA.departments||[]).length;
    DATA.departments = (DATA.departments||[]).filter(d=>!(d && d.jobDept));
    if(DATA.departments.length!==before) changed = true;
  }catch(e){ console.warn('assignCoreDepartments', e); }
  return changed;
}

/** تهيئة أقسام المستقيلين لكل الأنواع */
function ensureAllResignedDepartments(){
  ['employees','workers','supervisors','drivers'].forEach(k=>{
    try{ ensureResignedDepartment(k); }catch(_e){}
    try{ ensureRetiredDepartment(k); }catch(_e){}
  });
  try{ ensureCoreDepartments(); }catch(_e){}
  try{ assignCoreDepartments(); }catch(_e){}
}

/** نقل الشخص لقسم المستقيلين فقط — بدون حذف أو مسح أي بيانات أعمدة */
function movePersonToResignedArchive(kind, person){
  if(!person || !person.id) return;
  try{
    const retired = isRetiredStatus(person.status);
    const dept = retired ? ensureRetiredDepartment(kind) : ensureResignedDepartment(kind);
    // احفظ القسم السابق للرجوع عند إعادة التفعيل (مرة واحدة فقط)
    if(!person.previousDepartmentId){
      const cur = person.departmentId || person.categoryId || '';
      if(cur && !isResignedDeptId(cur)) person.previousDepartmentId = cur;
    }
    // لا نلمس: هاتف، بطاقة، رخصة، تأمين، مرفقات، راتب، يومية، عنوان، ملاحظات، ...
    // نغيّر فقط: القسم + علامات الأرشفة
    if(!isResignedStatus(person.status)){
      // لو الحالة لسه مش مستقيل اضبطها (الحفظ من الفورم غالباً بيضبطها قبل الاستدعاء)
      // لا نفرض overwrite لو الفورم حط resigned/left/terminated
    }
    const _today = (typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10));
    if(retired){
      person.archiveGroup = 'retired';
      person.retiredAt = person.retiredAt || person.resignedAt || _today;
      person.resignedAt = '';
    } else {
      person.archiveGroup = 'resigned';
      person.resignedAt = person.resignedAt || _today;
    }
    person.departmentId = dept.id;
    person.categoryId = dept.id;
    // فهرس مرجعي للمستقيلين — نسخة للقراءة فقط، السجل الحي يبقى في DATA
    if(!Array.isArray(DATA.resignedArchive)) DATA.resignedArchive = [];
    const existing = DATA.resignedArchive.findIndex(x=>x.kind===kind && x.personId===person.id);
    const snap = {};
    try{ Object.keys(person).forEach(k=>{ snap[k] = person[k]; }); }catch(_e){ Object.assign(snap, person); }
    const entry = {
      id: existing>=0 ? DATA.resignedArchive[existing].id : (typeof uid==='function'?uid():('rs_'+Date.now())),
      kind, personId: person.id,
      name: person.name||'', code: person.code||'',
      sectionName: retired ? 'المعاشات' : 'المستقيلين',
      archiveGroup: retired ? 'retired' : 'resigned',
      // لا ننقل المرفقات بعيداً عن الشخص — تفضل على السجل الحي
      attachments: Array.isArray(person.attachments) ? person.attachments.slice() : [],
      entity: snap,
      previousDepartmentId: person.previousDepartmentId||'',
      resignedAt: person.resignedAt, retiredAt: person.retiredAt||'',
      movedAt: new Date().toISOString()
    };
    if(existing>=0) DATA.resignedArchive[existing] = entry;
    else DATA.resignedArchive.push(entry);
    if(typeof addAudit==='function') addAudit(retired?'نقل للمعاشات':'نقل للمستقيلين', (person.name||person.code||person.id)+' ('+kind+')');
  }catch(e){ console.warn('movePersonToResignedArchive', e); }
}

function isResignedDeptId(id){
  return !!(id && (String(id).indexOf('__resigned_')===0 || String(id).indexOf('__retired_')===0));
}

/** إعادة الشخص للنشط — يرجع من مجلد المستقيلين للأرشيف العادي وقسمه السابق */
function restorePersonFromResignedArchive(kind, person){
  if(!person || !person.id) return;
  try{
    const prev = person.previousDepartmentId || '';
    // لا ترجع لقسم المستقيلين
    const restoreDept = (prev && !isResignedDeptId(prev)) ? prev : '';
    person.departmentId = restoreDept;
    person.categoryId = restoreDept;
    person.archiveGroup = '';
    person.resignedAt = '';
    person.retiredAt = '';
    person.previousDepartmentId = '';
    if(Array.isArray(DATA.resignedArchive)){
      DATA.resignedArchive = DATA.resignedArchive.filter(x=>!(x.kind===kind && x.personId===person.id));
    }
    if(typeof addAudit==='function') addAudit('إعادة تفعيل من المستقيلين', (person.name||person.code||person.id)+' ('+kind+')');
  }catch(e){ console.warn('restorePersonFromResignedArchive', e); }
}

/** مزامنة حالة الشخص مع قسم المستقيلين — السجل يبقى كاملاً في قائمته */
function syncPersonResignedState(kind, person){
  if(!person || !person.id) return;
  if(isResignedStatus(person.status)){
    movePersonToResignedArchive(kind, person);
    // تأكيد: الشخص ما زال في المصفوفة الرئيسية بكل حقوله
    const listKey = ({ employee:'employees', worker:'workers', supervisor:'supervisors', driver:'drivers' })[kind];
    if(listKey && Array.isArray(DATA[listKey])){
      const idx = DATA[listKey].findIndex(x=>x && x.id===person.id);
      if(idx>=0){
        // ادمج علامات الاستقالة فقط فوق السجل الموجود — لا تستبدل الكائن
        const live = DATA[listKey][idx];
        live.status = person.status || live.status;
        live.departmentId = person.departmentId;
        live.categoryId = person.categoryId;
        live.archiveGroup = person.archiveGroup;
        live.resignedAt = person.resignedAt; live.retiredAt = person.retiredAt || '';
        live.previousDepartmentId = person.previousDepartmentId || live.previousDepartmentId || '';
      }
    }
  } else if(person.archiveGroup==='resigned' || person.archiveGroup==='retired' || isResignedDeptId(person.departmentId) || isResignedDeptId(person.categoryId)){
    restorePersonFromResignedArchive(kind, person);
  }
}

/** جمع كل مسارات الملفات المحمية (لا تُحذف عند التنظيف) */
function collectReferencedAttachmentPaths(){
  const paths = [];
  const push = (p)=>{ if(p && typeof p==='string') paths.push(p); };
  const pushAtts = (list)=>{
    (list||[]).forEach(a=>{
      if(!a) return;
      push(a.path); push(a.storedPath); push(a.filePath); push(a.storedName); push(a.name);
    });
  };
  const entityLists = [
    DATA.employees, DATA.workers, DATA.supervisors, DATA.drivers, DATA.equipment
  ];
  entityLists.forEach(arr=>{
    (arr||[]).forEach(e=>{ if(e) pushAtts(e.attachments); });
  });
  (DATA.personDocuments||[]).forEach(d=>{
    if(!d) return;
    push(d.path); push(d.filePath);
    pushAtts(d.attachments);
  });
  (DATA.archiveTrash||[]).forEach(t=>{
    if(!t) return;
    push(t.path);
    pushAtts(t.attachments);
    if(Array.isArray(t.items)) t.items.forEach(it=>pushAtts(it&&it.attachments));
    if(t.entity) pushAtts(t.entity.attachments);
  });
  (DATA.resignedArchive||[]).forEach(t=>{
    if(!t) return;
    pushAtts(t.attachments);
    if(t.entity) pushAtts(t.entity.attachments);
  });
  (DATA.expenses||[]).forEach(e=>pushAtts(e&&e.attachments));
  (DATA.workerPayments||[]).forEach(p=>pushAtts(p&&p.attachments));
  (DATA.payroll||[]).forEach(p=>pushAtts(p&&p.attachments));
  // لوجو الشركة وإعدادات
  try{
    const s = DATA.settings||{};
    push(s.logoPath); push(s.logo); push(s.companyLogo);
    if(s.logoDataUrl && s.logoDataUrl.indexOf('file:')===0) push(s.logoDataUrl);
  }catch(_e){}
  // أي مجلدات أرشيف مجمّعة
  try{
    if(typeof collectArchiveFolders==='function'){
      collectArchiveFolders().forEach(f=>pushAtts(f&&f.attachments));
    }
  }catch(_e){}
  // شبكة أمان: مسح عميق لكل البيانات — أي مرفق مسجّل في أي جدول (حتى لو مش في القوائم اللي فوق) يتحمي من الحذف
  try{
    const PATH_KEYS = { path:1, storedPath:1, filePath:1, storedName:1, localPath:1, file:1, src:1, url:1 };
    const FILE_RE = /\.(jpe?g|png|gif|webp|bmp|jfif|tiff?|pdf|docx?|xlsx?|txt)$/i;
    const seen = new Set();
    const walk = (node, depth)=>{
      if(!node || depth>8) return;
      if(Array.isArray(node)){ for(let i=0;i<node.length;i++) walk(node[i], depth+1); return; }
      if(typeof node!=='object' || seen.has(node)) return;
      seen.add(node);
      for(const k in node){
        const v = node[k];
        if(typeof v==='string'){
          if(v.length>4 && v.length<600 && v.indexOf('data:')!==0 && (PATH_KEYS[k] || FILE_RE.test(v))) push(v);
        } else if(v && typeof v==='object') walk(v, depth+1);
      }
    };
    walk(DATA, 0);
  }catch(_e){}
  return paths.filter(Boolean);
}

function cleanupUiDrafts(){
  let n = 0;
  try{
    if(window.__formDrafts && typeof window.__formDrafts==='object'){
      Object.keys(window.__formDrafts).forEach(k=>{
        const d = window.__formDrafts[k];
        if(!d || !(d.attachments&&d.attachments.length)){ delete window.__formDrafts[k]; n++; }
      });
    }
    if(window.__docDrafts && typeof window.__docDrafts==='object'){
      Object.keys(window.__docDrafts).forEach(k=>{
        const d = window.__docDrafts[k];
        if(!d || !(d.attachments&&d.attachments.length)){ delete window.__docDrafts[k]; n++; }
      });
    }
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && /^(hr-tmp-|draft-|__tmp)/i.test(k)) keys.push(k);
    }
    keys.forEach(k=>{ try{ localStorage.removeItem(k); n++; }catch(_e){} });
  }catch(_e){}
  return n;
}

/**
 * تنظيف سجلات يتيمة بأمان:
 * - يحذف حضور/إجازات/يوميات معدات لأشخاص أو معدات محذوفة بالكامل
 * - لا يحذف أي مدفوعات (type=pay) أو سجلات محاسبية تاريخية
 * - يمكن حذف مكافآت مستحقة غير مدفوعة لأشخاص محذوفين فقط (ليست صرفاً)
 */
function cleanupOrphanDataRecords(){
  let removed = 0;
  const personExists = (pt, pid)=>{
    if(!pid) return false;
    if(pt==='worker') return !!(typeof getWorker==='function' && getWorker(pid));
    if(pt==='driver') return !!(typeof getDriver==='function' && getDriver(pid));
    if(pt==='supervisor') return !!(typeof getSupervisor==='function' && getSupervisor(pid));
    if(pt==='employee') return !!(typeof getEmployee==='function' && getEmployee(pid));
    if(pt==='equipment') return !!(typeof getEquipment==='function' && getEquipment(pid));
    return false;
  };

  const beforeW = (DATA.workerAttendance||[]).length;
  DATA.workerAttendance = (DATA.workerAttendance||[]).filter(a=>{
    if(!a) return false;
    const pt = a.personType || (a.workerId ? 'worker' : '');
    const pid = a.personId || a.workerId || '';
    if(pt==='worker' || (!a.personType && a.workerId)) return personExists('worker', pid||a.workerId);
    if(pt==='driver') return personExists('driver', pid);
    if(pt==='supervisor') return personExists('supervisor', pid);
    if(pt==='equipment') return personExists('equipment', pid);
    return !!(a.workerId && personExists('worker', a.workerId));
  });
  removed += beforeW - (DATA.workerAttendance||[]).length;

  const beforeA = (DATA.attendance||[]).length;
  DATA.attendance = (DATA.attendance||[]).filter(a=>a && a.employeeId && personExists('employee', a.employeeId));
  removed += beforeA - (DATA.attendance||[]).length;

  // تكاليف لأشخاص اتمسحوا
  const beforeC = (DATA.costs||[]).length;
  DATA.costs = (DATA.costs||[]).filter(c=>c && personExists(c.personKind, c.personId));
  removed += beforeC - (DATA.costs||[]).length;

  const beforeL = (DATA.leaves||[]).length;
  // DEC-0127 د-4: الإجازة بتتمسح بس لو صاحبها (بنوعه) مش موجود — قبل كده كانت بتمسح إجازات العمال والمشرفين والسواقين (employeeId فاضي)
  DATA.leaves = (DATA.leaves||[]).filter(l=>l && (l.personId||l.employeeId) && personExists(l.personKind||l.kind||'employee', l.personId||l.employeeId));
  removed += beforeL - (DATA.leaves||[]).length;

  const beforeE = (DATA.equipmentDaily||[]).length;
  DATA.equipmentDaily = (DATA.equipmentDaily||[]).filter(d=>d && d.equipmentId && personExists('equipment', d.equipmentId));
  removed += beforeE - (DATA.equipmentDaily||[]).length;

  // مدفوعات: لا نحذف type=pay أبداً (سجل محاسبي)
  // نحذف فقط مكافآت مستحقة غير مدفوعة (bonus/allowance) أو خصومات لأشخاص محذوفين
  const beforeP = (DATA.workerPayments||[]).length;
  DATA.workerPayments = (DATA.workerPayments||[]).filter(p=>{
    if(!p) return false;
    const t = String(p.type||'pay');
    // احتفظ بكل صرف فعلي تاريخي
    if(t==='pay' || (typeof isActualPayment==='function' && isActualPayment(p))) return true;
    // احتفظ بأي سجل له مبلغ مدفوع محسوب
    if(p.status==='paid' && t!=='bonus' && t!=='allowance') return true;
    const pt = p.personType || (p.workerId ? 'worker' : '');
    const pid = p.personId || p.workerId || '';
    if(!pid) return true; // لا نمسح سجلات بدون معرف
    if(pt==='worker' || (!p.personType && p.workerId)) return personExists('worker', pid||p.workerId);
    if(pt==='driver') return personExists('driver', pid);
    if(pt==='supervisor') return personExists('supervisor', pid);
    if(pt==='employee') return personExists('employee', pid);
    if(pt==='equipment') return personExists('equipment', pid);
    return true;
  });
  removed += beforeP - (DATA.workerPayments||[]).length;

  if(removed>0 && typeof saveData==='function') saveData(true);
  if(removed>0 && typeof rebuildIndexes==='function') try{ rebuildIndexes(); }catch(_e){}
  return removed;
}

/* ===================== الذهاب لمكان الخطأ بالظبط (من نتائج فحص البيانات) =====================
 * الضغط على أي بند: يفتح الصفحة ← يفتح نافذة تعديل السجل ← يحدد الحقل اللي فيه المشكلة (تظليل + تحديد النص التالف). */
const ISSUE_TARGETS = {
  workers:    { page:'workers',     open:(id)=>openWorkerModal(id) },
  employees:  { page:'employees',   open:(id)=>openEmployeeModal(id) },
  supervisors:{ page:'supervisors', open:(id)=>openSupervisorModal(id) },
  drivers:    { page:'drivers',     open:(id)=>openDriverModal(id) },
  equipment:  { page:'equipment',   open:(id)=>openEquipmentModal(id) },
  projects:   { page:'projects',    open:(id)=>openProjectModal(id) },
  costs:      { page:'costs',       open:(id)=>openCostModal(id) },
  expenses:   { page:'expenses',    open:(id)=>openExpenseModal(id) },
  leaves:     { page:'leaves',      open:(id)=>openLeaveModal(id) },
  attendance: { page:'attendance',  open:(id)=>openAttendanceModal(id) },
  workerAttendance: { page:'workerAttendance', open:(id,rec)=>openWorkerAttModal(rec.workerId||rec.personId, id) },
  equipmentDaily:   { page:'equipment', open:(id,rec)=>openEquipmentDailyModal(rec.equipmentId, id) },
  departments:{ page:'departments', open:null },
  workerPayments:{ page:'workerDues', open:null }
};
const ISSUE_TYPE_STORES = {
  'حضور':['workerAttendance','attendance'], 'إجازة':['leaves','employees'], 'دفعة':['workerPayments'],
  'حساب عامل':['workers'], 'حساب مشرف':['supervisors'], 'مصروف':['expenses','supervisorExpenses'],
  'مشروع تالف':['projects'], 'نص تالف':[]
};
function inferIssueStore(iss){
  if(iss.store) return iss.store;
  const id = iss.recId || iss.id;
  const cands = (ISSUE_TYPE_STORES[iss.type] || []).concat(Object.keys(ISSUE_TARGETS));
  for(const s of cands){ if(id && (DATA[s]||[]).some(r=>r && r.id===id)) return s; }
  return '';
}
function highlightIssueField(iss, rec){
  const scope = document.getElementById('appModal') || document;
  const fields = Array.from(scope.querySelectorAll('input, textarea, select'));
  const bad = (el)=>{
    if(el.tagName === 'SELECT') return Array.from(el.options||[]).some(o=>textHasCorruption(o.text) || textHasCorruption(o.value));
    return textHasCorruption(el.value);
  };
  let el = fields.find(bad);
  if(!el && iss.field && rec){                       // ما لقيناش النص التالف حرفياً: نجرّب الحقل بالاسم/القيمة
    const v = String(rec[iss.field] == null ? '' : rec[iss.field]);
    el = fields.find(f=>f.value === v && v);
  }
  if(!el){
    const derived = (iss.store==='equipment' && iss.field==='name')
      ? 'اسم المعدة بيتكوّن تلقائياً من (النوع + الماركة + رقم اللوحة) — صحّح النوع/الماركة وهيتصلّح الاسم. القيمة الحالية: '
      : 'الحقل «'+(iss.field||'')+'» مش ظاهر في نافذة التعديل — القيمة: ';
    try{ showToast(derived+String(rec && rec[iss.field] || '').slice(0,80), 12000); }catch(e){}
    return false;
  }
  try{
    el.scrollIntoView({ block:'center', behavior:'smooth' });
    el.focus();
    if(typeof el.setSelectionRange === 'function' && typeof el.value === 'string'){
      const i = el.value.indexOf('\uFFFD'); if(i >= 0){ let j = i; while(el.value[j] === '\uFFFD') j++; el.setSelectionRange(i, Math.max(j, i+1)); }
      else el.select();
    }
    el.classList.add('issue-flash');
    setTimeout(()=>el.classList.remove('issue-flash'), 6000);
  }catch(e){}
  return true;
}
function goToIssue(iss){
  try{ closeModal(); }catch(e){}
  const store = inferIssueStore(iss);
  const id = iss.recId || iss.id;
  const rec = store ? (DATA[store]||[]).find(r=>r && r.id===id) : null;
  const tgt = store ? ISSUE_TARGETS[store] : null;
  const page = (tgt && tgt.page) || iss.page || '';
  if(page){ if(typeof goToPage==='function') goToPage(page); else { currentPage = page; render(); } }
  if(!(tgt && tgt.open && rec)){
    if(iss.field){ try{ showToast('المكان: '+(page||store||'')+' — الحقل «'+iss.field+'»: '+String(iss.value||'').slice(0,80), 9000); }catch(e){} }
    return;
  }
  setTimeout(()=>{
    try{ tgt.open(rec.id, rec); }catch(e){ console.error('goToIssue open', e); return; }
    setTimeout(()=>{ if(iss.field || /تالف/.test(iss.type||'')) highlightIssueField(iss, rec); }, 400);
  }, 350);
}

async function runDataHealthCheck(){
  let clean = { removedFiles:0, removedDirs:0, tempRemoved:0, freedBytes:0, scanned:0, removedNames:[], drafts:0, orphanRecords:0 };
  try{ clean.orphanRecords = cleanupOrphanDataRecords(); }catch(_e){}
  try{ clean.drafts = cleanupUiDrafts(); }catch(_e){}
  try{
    if(window.desktopApi && window.desktopApi.cleanupOrphans){
      const referencedPaths = collectReferencedAttachmentPaths();
      const res = await window.desktopApi.cleanupOrphans({ referencedPaths });
      if(res && res.ok){
        clean = Object.assign({}, res, { orphanRecords: clean.orphanRecords, drafts: clean.drafts });
      }
    }
  }catch(e){ console.warn('cleanup files', e); }

  const issues = [];
  try{ (validateCalculations()||[]).forEach(x=>issues.push(x)); }
  catch(e){ issues.push({ type:'فحص', msg:'خطأ أثناء فحص الحسابات: '+(e.message||e), page:'dashboard' }); }
  // بعد التنظيف: تنبيه فقط عن مدفوعات تاريخية لأشخاص محذوفين (لا تُمسح)
  try{
    (DATA.workerPayments||[]).forEach(p=>{
      if(!p) return;
      const t = String(p.type||'pay');
      if(t!=='pay' && !(typeof isActualPayment==='function' && isActualPayment(p))) return;
      const pt = p.personType || (p.workerId ? 'worker' : '');
      const pid = p.personId || p.workerId || '';
      if(!pid) return;
      let ok = true;
      if(pt==='worker' || (!p.personType && p.workerId)) ok = !!(typeof getWorker==='function' && getWorker(pid||p.workerId));
      else if(pt==='driver') ok = !!(typeof getDriver==='function' && getDriver(pid));
      else if(pt==='supervisor') ok = !!(typeof getSupervisor==='function' && getSupervisor(pid));
      else if(pt==='employee') ok = !!(typeof getEmployee==='function' && getEmployee(pid));
      else if(pt==='equipment') ok = !!(typeof getEquipment==='function' && getEquipment(pid));
      if(!ok){
        issues.push({
          type:'سجل محاسبي محفوظ',
          id:p.id,
          page:'workerDues',
          msg:'دفعة تاريخية لشخص محذوف — محفوظة عمداً (لم تُمسح)',
          label:(p.date||'')+' · '+fmtMoney(p.amount||0)
        });
      }
    });
  }catch(_e){}

  showValidationResults(issues, clean);
  return { issues, clean };
}

function validateAllDataDeep(){
  const issues = [];
  try{ (validateCalculations()||[]).forEach(x=>issues.push(x)); }
  catch(e){ issues.push({ type:'فحص', msg:'خطأ أثناء فحص الحسابات: '+(e.message||e), page:'dashboard' }); }
  return issues;
}

function showValidationResults(issues, cleanInfo){
  issues = issues || [];
  cleanInfo = cleanInfo || {};
  const freed = cleanInfo.freedBytes ? (cleanInfo.freedBytes > 1048576
    ? ((cleanInfo.freedBytes/1048576).toFixed(1)+' م.ب')
    : (Math.round(cleanInfo.freedBytes/1024)+' ك.ب')) : '0';
  const cleanLines = [];
  if(cleanInfo.scanned!=null) cleanLines.push('ملفات مفحوصة على القرص: '+(cleanInfo.scanned||0));
  if(cleanInfo.removedFiles) cleanLines.push('ملفات غير مستخدمة حُذفت: '+cleanInfo.removedFiles);
  if(cleanInfo.removedDirs) cleanLines.push('مجلدات فارغة حُذفت: '+cleanInfo.removedDirs);
  if(cleanInfo.tempRemoved) cleanLines.push('ملفات مؤقتة حُذفت: '+cleanInfo.tempRemoved);
  if(cleanInfo.orphanRecords) cleanLines.push('سجلات يتيمة حُذفت (حضور/إجازات فقط — المدفوعات محفوظة): '+cleanInfo.orphanRecords);
  if(cleanInfo.drafts) cleanLines.push('مسودات واجهة نُظّفت: '+cleanInfo.drafts);
  if(cleanInfo.freedBytes) cleanLines.push('مساحة حُرّرت تقريباً: '+freed);
  if(!cleanLines.length) cleanLines.push('لا مخلفات تحتاج تنظيفاً');
  const cleanHtml = `<div class="validation-clean" style="background:#E8F0EA;border:1px solid #c5d9cb;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-weight:800;color:#1B4332;margin-bottom:6px;">تنظيف الملفات والمخلفات</div>
      <ul style="margin:0;padding-right:18px;line-height:1.7;">${cleanLines.map(l=>'<li>'+escapeHtml(l)+'</li>').join('')}</ul>
    </div>`;
  if(!issues.length){
    openModal(`
      <div class="modal-header"><h3>فحص البيانات</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        ${cleanHtml}
        <div style="padding:12px;border-radius:10px;background:#f0faf2;color:#1B4332;font-weight:700;">✓ العمليات الحسابية سليمة — والتنظيف تم بأمان</div>
      </div>
      <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">حسناً</button></div>
    `);
    return;
  }
  openModal(`
    <div class="modal-header"><h3>نتائج الفحص (${issues.length})</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body validation-list">
      ${cleanHtml}
      <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px;">اضغط على أي بند وهيفتحلك السجل ويحدد المكان بالظبط.</div>
      ${issues.map((iss,i)=>`
        <div class="validation-item" data-vidx="${i}" data-vpage="${escapeHtml(iss.page||'')}" data-vid="${escapeHtml(iss.id||'')}" title="اضغط للذهاب لمكان المشكلة">
          <strong>${escapeHtml(iss.type||'')}</strong> — ${escapeHtml(iss.msg||'')}
          <span style="color:var(--ink-soft);"> (${escapeHtml(iss.label||iss.id||'')})</span>
          <span style="float:left;color:var(--ledger-green);font-weight:700;">← اذهب</span>
        </div>`).join('')}
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>
  `);
  document.querySelectorAll('.validation-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      const iss = issues[Number(el.getAttribute('data-vidx'))];
      if(iss) goToIssue(iss);
    });
  });
}


/* ---- Print templates ---- */

/** اسم ملف وصفي للتصدير والكشوف: الاسم + الفترة */
function buildExportFileTitle(base, personName, from, to){
  const parts = [];
  if(base) parts.push(String(base).trim());
  if(personName) parts.push(String(personName).trim());
  if(from || to){
    const a = from ? (typeof fmtDate==='function' ? fmtDate(from) : from) : '…';
    const b = to ? (typeof fmtDate==='function' ? fmtDate(to) : to) : '…';
    parts.push('من '+a+' إلى '+b);
  }
  return parts.filter(Boolean).join(' — ');
}
function sanitizeFileName(name){
  return String(name||'مستند').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim().slice(0,180);
}

/** يجعل صف الإجمالي (tfoot) يظهر مرة واحدة في آخر الجدول، ويضع «يتبع ▼» أسفل كل صفحة يمتد الجدول بعدها */
function paginateTotalsAtEnd(area){
  /* التقسيم اليدوي بالقياس كان بيعمل صفحات فاضية ومساحات كبيرة — المتصفح بيقسّم الجداول لوحده (العناوين بتتكرر والإجمالي مرة في الآخر بالـCSS) */
  return;
  try{
    const mm = 96/25.4, PAGE_H = (297-24)*mm - 28, W = (210-24)*mm;
    area.classList.add('pg-measure'); area.style.width = W+'px';
    const top0 = ()=> area.getBoundingClientRect().top;
    let pageTop = 0;
    const tables = Array.from(area.querySelectorAll('table')).filter(t=>t.tFoot && t.tBodies[0] && t.tBodies[0].rows.length>1);
    tables.forEach(t=>{
      const rows = Array.from(t.tBodies[0].rows);
      const y = t.getBoundingClientRect().top - top0();
      if(y >= pageTop + PAGE_H) pageTop += Math.floor((y-pageTop)/PAGE_H)*PAGE_H;
      const head = t.tHead ? t.tHead.getBoundingClientRect().height : 0;
      const foot = t.tFoot.getBoundingClientRect().height;
      const rh = rows.map(r=>r.getBoundingClientRect().height);
      const total = head + rh.reduce((a,b)=>a+b,0) + foot;
      const room0 = pageTop + PAGE_H - y;
      if(total <= room0){ return; }
      const CONT = 34;
      const chunks = []; let cur = []; let used = head; let room = room0;
      rows.forEach((r,i)=>{
        const lastRow = i === rows.length-1;
        const need = rh[i] + (lastRow ? foot : CONT);
        if(used + need > room && cur.length){ chunks.push(cur); cur = []; used = head; room = PAGE_H; }
        cur.push(r); used += rh[i];
      });
      if(cur.length) chunks.push(cur);
      if(chunks.length > 1 && chunks[chunks.length-1].length === 0) chunks.pop();
      const parent = t.parentNode, frag = document.createDocumentFragment();
      chunks.forEach((ch,ci)=>{
        const nt = t.cloneNode(false); nt.classList.add('pg-chunk');
        if(t.tHead) nt.appendChild(t.tHead.cloneNode(true));
        const tb = document.createElement('tbody'); ch.forEach(r=>tb.appendChild(r)); nt.appendChild(tb);
        const last = ci === chunks.length-1;
        if(last) nt.appendChild(t.tFoot); 
        if(ci>0){ nt.style.pageBreakBefore = 'always'; nt.style.breakBefore = 'page'; }
        frag.appendChild(nt);
        if(!last){ const c = document.createElement('div'); c.className='stmt-cont'; c.style.cssText='text-align:center;font-weight:800;font-size:12px;line-height:1.1;margin-top:6px;'; c.innerHTML='يتبع<div style="font-size:9px;">▼</div>'; frag.appendChild(c); }
      });
      parent.replaceChild(frag, t);
      try{ const lc = parent.querySelectorAll('table.pg-chunk'); pageTop = lc[lc.length-1].getBoundingClientRect().top - top0(); }catch(_e){}
    });
    area.classList.remove('pg-measure'); area.style.width = '';
  }catch(e){ console.warn('paginateTotalsAtEnd', e); try{ area.classList.remove('pg-measure'); area.style.width=''; }catch(_e){} }
}
function printHtml(html, title, opts){
  opts = opts || {};
  const area = document.getElementById('printArea');
  if(!area){
    showToast('منطقة الطباعة غير موجودة');
    return;
  }
  // أغلق النوافذ المنبثقة حتى لا تغطي المحتوى
  try{
    document.querySelectorAll('.modal-overlay').forEach(m=>{ if(m.id!=='printArea') m.style.visibility='hidden'; });
  }catch(e){}

  let bodyHtml = html || '';
  // ترويسة + توقيع تلقائياً لكل الكشوف
  try{
    const brand = typeof shouldBrandStatement==='function' && shouldBrandStatement(title, opts);
    if(brand && typeof statementHeaderHtml==='function'){
      const hasHead = bodyHtml.indexOf('stmt-head') >= 0;
      const hasFoot = bodyHtml.indexOf('stmt-foot') >= 0;
      const head = hasHead ? '' : statementHeaderHtml(opts.headerTitle || title || '', opts.periodLine || '');
      const foot = (hasFoot || typeof statementFooterHtml!=='function') ? '' : statementFooterHtml();
      if(head || foot){
        if(bodyHtml.indexOf('print-sheet') >= 0){
          if(head) bodyHtml = bodyHtml.replace(/(<div[^>]*print-sheet[^>]*>)/i, '$1'+head);
          if(foot){
            // أدخل قبل إغلاق print-sheet الأخير بشكل آمن
            const marker = '</div>';
            let depth = 0, insertAt = -1;
            // بحث بسيط: آخر </div> قبل نهاية القالب
            insertAt = bodyHtml.lastIndexOf(marker);
            if(insertAt > 0) bodyHtml = bodyHtml.slice(0, insertAt) + foot + bodyHtml.slice(insertAt);
            else bodyHtml = bodyHtml + foot;
          }
        } else {
          bodyHtml = '<div class="print-sheet">'+(head||'')+bodyHtml+(foot||'')+'</div>';
        }
      }
    }
  }catch(_e){ console.warn('brand statement', _e); }

  area.innerHTML = '<div class="print-root" style="direction:rtl;background:#fff;color:#222;font-family:Tahoma,Arial,sans-serif;">'+bodyHtml+'</div>';
  area.style.display = 'block';
  area.style.visibility = 'visible';
  if(opts.totalAtEnd){
    document.body.classList.add('pdf-exporting');
    paginateTotalsAtEnd(area);
    document.body.classList.remove('pdf-exporting');
    area.classList.add('tfoot-once');
  }

  const prevTitle = document.title;
  if(title) document.title = title;

  const doCleanup = ()=>{
    document.body.classList.remove('pdf-exporting');
    if(area){ area.style.display = 'none'; area.innerHTML = ''; area.classList.remove('tfoot-once'); }
    document.title = prevTitle;
    try{
      document.querySelectorAll('.modal-overlay').forEach(m=>{ m.style.visibility=''; });
    }catch(e){}
  };

  const trySavePdf = async ()=>{
    if(!(window.desktopApi && window.desktopApi.savePdf)) return false;
    try{
      document.body.classList.add('pdf-exporting');
      area.style.display = 'block';
      // انتظار رسم المحتوى والصور
      await new Promise(r=>setTimeout(r, 500));
      // انتظر تحميل الصور إن وُجدت
      const imgs = Array.from(area.querySelectorAll('img'));
      if(imgs.length){
        await Promise.race([
          Promise.all(imgs.map(img=> img.complete ? Promise.resolve() : new Promise(res=>{
            img.onload = img.onerror = ()=>res();
          }))),
          new Promise(r=>setTimeout(r, 2000))
        ]);
      }
      await new Promise(r=>setTimeout(r, 200));
      const safeName = sanitizeFileName((opts && opts.filename) || title || 'مستند') + '.pdf';
      const res = await window.desktopApi.savePdf({ filename: safeName });
      if(res && res.ok){ showToast('تم حفظ ملف الطباعة'); return true; }
      if(res && res.canceled){ return true; }
      if(res && res.error){ console.warn(res.error); showToast('تعذر الحفظ — سيتم فتح نافذة الطباعة'); }
    }catch(e){
      console.warn(e);
      showToast('خطأ أثناء التصدير — جاري فتح الطباعة');
    }
    return false;
  };

  setTimeout(async ()=>{
    try{
      if(opts.forcePrint){
        document.body.classList.add('pdf-exporting');
        window.print();
        window.onafterprint = ()=>{ doCleanup(); window.onafterprint = null; };
        setTimeout(doCleanup, 1500);
        return;
      }
      const saved = await trySavePdf();
      if(!saved){
        document.body.classList.add('pdf-exporting');
        window.print();
        window.onafterprint = ()=>{ doCleanup(); window.onafterprint = null; };
        setTimeout(doCleanup, 1500);
      } else {
        setTimeout(doCleanup, 600);
      }
    }catch(e){
      console.error(e);
      doCleanup();
      showToast('تعذر التصدير');
    }
  }, 80);
}

/** كشف حساب لعامل: أيامه ومستحقاته */



/** تصدير مجلد شخص/معدة إلى الجهاز: مجلد باسم الشخص، وداخله مجلد لكل مرفق */
async function exportArchiveFolder(kind, personId, personName){
  const { person, atts } = collectPersonAttachments(kind, personId);
  if(!person){ showToast('السجل غير موجود'); return; }
  if(!atts.length){ showToast('لا مرفقات للتصدير'); return; }
  if(!window.desktopApi || !window.desktopApi.exportArchive){
    showToast('التصدير متاح في نسخة سطح المكتب فقط'); return;
  }
  const safePerson = String(personName || person.name || person.code || 'شخص')
    .replace(/[\\/:*?"<>|]+/g,'_').trim() || 'شخص';
  const items = [];
  atts.forEach((a, i)=>{
    if(!a || !a.path) return;
    const attName = String(a.name || a.storedName || ('مرفق_'+(i+1)))
      .replace(/[\\/:*?"<>|]+/g,'_').trim() || ('مرفق_'+(i+1));
    const ext = (a.path && a.path.includes('.')) ? a.path.slice(a.path.lastIndexOf('.')) : '';
    const fileName = (a.storedName || a.name || ('file'+ext)).replace(/[\\/:*?"<>|]+/g,'_');
    items.push({
      path: a.path,
      relative: safePerson + '/' + attName + '/' + fileName
    });
  });
  if(!items.length){ showToast('لا ملفات بمسارات صالحة'); return; }
  showToast('جاري تصدير المجلد...');
  try{
    const res = await window.desktopApi.exportArchive(items);
    if(res && res.ok){
      showToast('تم تصدير '+(res.copied||0)+' ملف'+(res.skipped?(' · تخطي '+res.skipped):''));
    } else if(res && res.canceled){
      showToast('تم الإلغاء');
    } else {
      showToast('فشل التصدير: '+(res && res.error || ''));
    }
  }catch(e){
    console.error(e);
    showToast('فشل التصدير');
  }
}

function collectPersonAttachments(kind, personId){
  const person = kind==='employee'?getEmployee(personId)
    : kind==='worker'?getWorker(personId)
    : kind==='supervisor'?getSupervisor(personId)
    : kind==='driver'?(typeof getDriver==='function'?getDriver(personId):(DATA.drivers||[]).find(d=>d.id===personId))
    : kind==='equipment'?getEquipment(personId)
    : null;
  if(!person) return { person:null, atts:[] };
  const atts = [];
  const seen = new Set();
  const pushAtt = (a, fromDoc)=>{
    if(!a) return;
    const key = (a.path||a.filePath||'') + '|' + (a.name||a.storedName||'');
    if(seen.has(key)) return;
    seen.add(key);
    atts.push(Object.assign({}, a, fromDoc ? { fromDoc } : null));
  };
  (person.attachments||[]).forEach(a=> pushAtt(a, 'مرفق مباشر'));
  (DATA.personDocuments||[]).forEach(d=>{
    if(!d) return;
    if(d.personId!==personId) return;
    if(d.kind && d.kind!==kind) return;
    (d.attachments||[]).forEach(a=> pushAtt(a, d.title || d.type || 'مستند'));
  });
  // مرفقات الأرشيف إن وُجدت بشكل منفصل
  if(Array.isArray(DATA.archiveAttachments)){
    DATA.archiveAttachments.forEach(a=>{
      if(a && a.personId===personId && (!a.kind || a.kind===kind)) pushAtt(a, a.title||'أرشيف');
    });
  }
  return { person, atts };
}

async function attachmentToDataUrl(att){
  if(!att) return null;
  if(att.dataUrl && String(att.dataUrl).startsWith('data:')) return att.dataUrl;
  if(att.base64){
    const mime = att.mime || 'image/jpeg';
    const b64 = String(att.base64).replace(/^data:[^;]+;base64,/,'');
    return 'data:'+mime+';base64,'+b64;
  }
  const p = String(att.path || att.filePath || '').trim();
  if(!p) return null;
  try{
    if(window.desktopApi && window.desktopApi.readAttachmentDataUrl){
      const res = await window.desktopApi.readAttachmentDataUrl(p);
      if(res && res.ok && res.dataUrl) return res.dataUrl;
      if(res && res.error) console.warn('readAttachmentDataUrl:', res.error, p);
    }
  }catch(e){ console.warn('read att', e, p); }
  // fallback file URL (نافذة التصدير webSecurity:false)
  try{
    let fp = p.replace(/\\/g,'/');
    if(!/^file:/i.test(fp)){
      if(/^[a-zA-Z]:/.test(fp)) fp = 'file:///' + fp;
      else if(fp.startsWith('/')) fp = 'file://' + fp;
    }
    return fp;
  }catch(_e){}
  return null;
}

function isImageAtt(a){
  if(!a) return false;
  const m = String(a.mime||a.type||'').toLowerCase();
  if(m.startsWith('image/')) return true;
  const n = String(a.name||'').toLowerCase();
  const p = String(a.path||a.filePath||a.storedName||'').toLowerCase();
  const t = String(a.type||'').toLowerCase();
  if(/\.(png|jpg|jpeg|gif|webp|bmp|jfif|heic|tiff?)$/i.test(n)) return true;
  if(/\.(png|jpg|jpeg|gif|webp|bmp|jfif|heic|tiff?)$/i.test(p)) return true;
  if(/^(png|jpg|jpeg|gif|webp|bmp)$/i.test(t)) return true;
  // أسماء شائعة بدون امتداد
  const base = (a.name||a.storedName||'').toLowerCase();
  if(/id_?card|بطاقة|صورة|photo|personal|شهادة|ميلاد|مؤهل|رخصة|passport|صورة شخصية/.test(base) && !/\.pdf$/i.test(p)) return true;
  return false;
}
function isPdfAtt(a){
  if(!a) return false;
  const m = String(a.mime||a.type||'').toLowerCase();
  if(m.includes('pdf')) return true;
  const n = String(a.name||a.path||a.storedName||'').toLowerCase();
  return /\.pdf$/i.test(n) || String(a.type||'').toLowerCase()==='pdf';
}

/** بناء مستند HTML كامل لملف الشخص مع كل المرفقات المضمّنة */
async function buildPersonFileHtml(kind, personId, opts){
  opts = opts || {};
  const labels = { employee:'موظف', worker:'عامل', supervisor:'مشرف', driver:'سائق', equipment:'معدة / مركبة' };
  const kindLabel = labels[kind] || kind;
  const { person, atts } = collectPersonAttachments(kind, personId);
  if(!person) return null;
  const co = (DATA.settings||{});
  const company = co.companyName || brandName();

  const fileRows = atts.map((a,i)=>{
    let cls = 'ملف';
    if(isImageAtt(a)) cls = 'صورة';
    else if(isPdfAtt(a)) cls = 'PDF';
    return `<tr>
      <td style="text-align:center;">${i+1}</td>
      <td>${escapeHtml(a.name||a.storedName||'ملف')}</td>
      <td>${escapeHtml(a.fromDoc||a.docType||'مرفق مباشر')}</td>
      <td>${cls}</td>
      <td>${fmtDate(a.addedAt||a.date||'')}</td>
    </tr>`;
  }).join('');

  const mediaParts = [];
  for(let i=0;i<atts.length;i++){
    const a = atts[i];
    const title = escapeHtml(a.name||a.storedName||('مرفق '+(i+1)));
    const srcLabel = escapeHtml(a.fromDoc||a.docType||'مرفق مباشر');
    const dataUrl = await attachmentToDataUrl(a);
    try{
      // لو البيانات صورة — اعرضها مهما كان الاسم
      if(dataUrl && String(dataUrl).startsWith('data:image')){
        mediaParts.push(`
          <div class="att-block" style="margin:16px 0;page-break-before:always;page-break-inside:avoid;border:1px solid #bbb;border-radius:8px;padding:12px;background:#fafafa;">
            <div style="font-size:14px;font-weight:800;margin-bottom:10px;color:#1B4332;border-bottom:1px solid #ddd;padding-bottom:6px;">
              ${i+1}. ${title}
              <span style="font-weight:500;color:#666;font-size:12px;"> — ${srcLabel}</span>
            </div>
            <img src="${dataUrl}" style="max-width:100%;max-height:520px;display:block;margin:0 auto;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.08);" />
          </div>`);
        continue;
      }
      // PDF مضمّن كـ object إن أمكن (قد لا يُطبع كاملاً)
      if(dataUrl && String(dataUrl).startsWith('data:application/pdf')){
        mediaParts.push(`
          <div class="att-block" style="margin:14px 0;page-break-before:always;page-break-inside:avoid;border:1px solid #1B4332;border-radius:8px;padding:12px;background:#f0f7f3;">
            <div style="font-size:14px;font-weight:800;color:#1B4332;margin-bottom:6px;">${i+1}. ${title} (PDF)</div>
            <div style="font-size:12px;color:#444;">مستند PDF مرفق — ${srcLabel}</div>
            <div style="font-size:11px;color:#666;margin-top:4px;">يُفضَّل فتحه من الأرشيف لعرض كل الصفحات. تم إدراج اسمه في القائمة أعلاه.</div>
          </div>`);
        continue;
      }
      // محاولة عرض كصورة حتى لو الامتداد غير معروف (بعض المرفقات بدون امتداد)
      if(dataUrl && String(dataUrl).startsWith('data:') && !isPdfAtt(a)){
        // قد يكون binary صورة بـ mime خاطئ
        mediaParts.push(`
          <div class="att-block" style="margin:16px 0;page-break-before:always;page-break-inside:avoid;border:1px solid #bbb;border-radius:8px;padding:12px;">
            <div style="font-size:14px;font-weight:800;margin-bottom:10px;color:#1B4332;">${i+1}. ${title}</div>
            <img src="${dataUrl}" style="max-width:100%;max-height:520px;display:block;margin:0 auto;" onerror="this.parentNode.innerHTML='<div style=font-size:12px;color:#a00>تعذر عرض الملف</div>'" />
          </div>`);
        continue;
      }
      // لا يوجد محتوى قابل للتضمين
      const pathHint = (a.path||a.filePath) ? '' : ' — مسار الملف غير محفوظ';
      mediaParts.push(`
        <div class="att-block" style="margin:10px 0;padding:12px;border:1px dashed #999;border-radius:8px;page-break-before:always;page-break-inside:avoid;">
          <strong>${i+1}. ${title}</strong>
          <div style="font-size:12px;color:#666;margin-top:4px;">${srcLabel}${pathHint}</div>
          <div style="font-size:12px;color:#a00;margin-top:4px;">تعذر تضمين محتوى الملف في الـ PDF. تأكد أن الملف موجود على الجهاز.</div>
        </div>`);
    }catch(e){
      mediaParts.push(`<div style="margin:8px 0;color:#a00;">${i+1}. ${title} — خطأ: ${escapeHtml(String(e.message||e))}</div>`);
    }
  }

  const body = `
    <div class="person-file" style="direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#222;max-width:820px;margin:0 auto;">
      <div style="text-align:center;border-bottom:3px solid #1B4332;padding-bottom:12px;margin-bottom:16px;">
        <div style="font-size:20px;font-weight:900;color:#1B4332;">${escapeHtml(company)}</div>
        <div style="font-size:16px;font-weight:800;margin-top:8px;">ملف ${escapeHtml(kindLabel)}: ${escapeHtml(person.name||'')}</div>
        <div style="font-size:12px;color:#555;margin-top:6px;">الكود: ${escapeHtml(person.code||'—')} · عدد المرفقات: ${atts.length} · ${fmtDateTime(new Date())}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;">
        <tr><th style="text-align:right;background:#e8f0eb;padding:8px;border:1px solid #ccc;width:28%;">الاسم</th><td style="padding:8px;border:1px solid #ccc;">${escapeHtml(person.name||'—')}</td></tr>
        <tr><th style="text-align:right;background:#e8f0eb;padding:8px;border:1px solid #ccc;">الكود</th><td style="padding:8px;border:1px solid #ccc;">${escapeHtml(person.code||'—')}</td></tr>
        <tr><th style="text-align:right;background:#e8f0eb;padding:8px;border:1px solid #ccc;">النوع</th><td style="padding:8px;border:1px solid #ccc;">${escapeHtml(kindLabel)}</td></tr>
        <tr><th style="text-align:right;background:#e8f0eb;padding:8px;border:1px solid #ccc;">الرقم القومي</th><td style="padding:8px;border:1px solid #ccc;">${escapeHtml(person.nationalId||person.nid||'—')}</td></tr>
        <tr><th style="text-align:right;background:#e8f0eb;padding:8px;border:1px solid #ccc;">الهاتف</th><td style="padding:8px;border:1px solid #ccc;">${escapeHtml(person.phone||'—')}</td></tr>
        <tr><th style="text-align:right;background:#e8f0eb;padding:8px;border:1px solid #ccc;">القسم / المشروع</th><td style="padding:8px;border:1px solid #ccc;">${escapeHtml(person.department||person.project||'—')}</td></tr>
      </table>
      <h3 style="margin:16px 0 8px;color:#1B4332;font-size:15px;">قائمة المرفقات والمستندات (${atts.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="background:#1B4332;color:#fff;">
            <th style="padding:7px;border:1px solid #1B4332;">#</th>
            <th style="padding:7px;border:1px solid #1B4332;">اسم الملف</th>
            <th style="padding:7px;border:1px solid #1B4332;">المصدر / النوع</th>
            <th style="padding:7px;border:1px solid #1B4332;">التصنيف</th>
            <th style="padding:7px;border:1px solid #1B4332;">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${fileRows || '<tr><td colspan="5" style="text-align:center;padding:12px;border:1px solid #ccc;">لا توجد مرفقات</td></tr>'}
        </tbody>
      </table>
      ${mediaParts.length ? `<h3 style="margin:20px 0 8px;color:#1B4332;font-size:15px;page-break-before:auto;">محتوى المرفقات</h3>${mediaParts.join('')}` : '<p style="color:#a00;">لا يمكن عرض محتوى المرفقات — تحقق من وجود الملفات.</p>'}
      <div style="margin-top:24px;font-size:11px;color:#888;text-align:center;border-top:1px solid #ddd;padding-top:8px;">
        تم التصدير من ${escapeHtml(brandName())} · ${escapeHtml(company)}
      </div>
    </div>`;

  if(opts.fullDocument === false) return body;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>ملف ${escapeHtml(kindLabel)} - ${escapeHtml(person.name||'')}</title>
<style>
  *{ box-sizing:border-box; }
  body{ margin:12px; background:#fff; color:#222; font-family:Tahoma,Arial,sans-serif; }
  table td, table th{ vertical-align:top; }
  img{ max-width:100%; height:auto; }
  @page{ margin:10mm; }
  .att-block{ page-break-before: always; }
  .att-block:first-of-type{ page-break-before: auto; }
</style>
</head>
<body>${body}</body>
</html>`;
}

/** تصدير المستندات PDF — كل مرفقات الشخص في ملف واحد */
async function printPersonFilePdf(kind, personId){
  const labels = { employee:'موظف', worker:'عامل', supervisor:'مشرف', driver:'سائق', equipment:'معدة', project:'مشروع' };
  const { person, atts } = collectPersonAttachments(kind, personId);
  if(!person){ showToast('السجل غير موجود'); return; }
  showToast('جاري تجهيز ملف PDF ('+atts.length+' مرفق)...');
  try{
    const html = await buildPersonFileHtml(kind, personId, { fullDocument:true });
    if(!html){ showToast('تعذر بناء الملف'); return; }
    const safeName = ('ملف-'+(labels[kind]||'')+'-'+(person.name||person.code||'شخص'))
      .replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'-') + '.pdf';

    // الطريقة الموثوقة: نافذة مخفية + HTML كامل
    if(window.desktopApi && window.desktopApi.savePdfHtml){
      const res = await window.desktopApi.savePdfHtml({ html, filename: safeName });
      if(res && res.ok){ showToast('تم حفظ ملف الشخص PDF'); return; }
      if(res && res.canceled){ showToast('تم الإلغاء'); return; }
      if(res && res.error) console.warn(res.error);
    }
    // احتياطي: طباعة عبر منطقة الطباعة
    if(typeof printHtml==='function'){
      const bodyOnly = await buildPersonFileHtml(kind, personId, { fullDocument:false });
      printHtml(bodyOnly, safeName.replace(/\.pdf$/i,''));
    } else {
      showToast('تعذر تصدير الملف');
    }
  }catch(e){
    console.error(e);
    showToast('تعذر تصدير الملف: '+(e.message||e));
  }
}

/** تصدير الأرشيف PDF — كل شخص في قسم منفصل بملفاته لوحده */
async function printArchiveAllPdf(kindFilter){
  let folders = typeof collectArchiveFolders==='function' ? collectArchiveFolders() : [];
  if(kindFilter) folders = folders.filter(f=>f.kind===kindFilter);
  folders = folders.slice().sort((a,b)=>(b.count||0)-(a.count||0) || String(a.name||'').localeCompare(String(b.name||''),'ar'));
  if(!folders.length){ showToast('لا مجلدات للتصدير'); return; }
  showToast('جاري تجهيز الأرشيف ('+folders.length+' ملف)...');
  const co = DATA.settings||{};
  const parts = [];
  for(let i=0;i<folders.length;i++){
    const f = folders[i];
    try{
      const body = await buildPersonFileHtml(f.kind, f.id, { fullDocument:false });
      if(body){
        const breakStyle = i>0 ? 'page-break-before:always;' : '';
        parts.push(`<div style="${breakStyle}">${body}</div>`);
      }
    }catch(e){ console.warn(e); }
  }
  const cover = `
    <div style="text-align:center;padding:40px 20px;page-break-after:always;">
      <h1 style="margin:0;color:#1B4332;">${escapeHtml(co.companyName||brandName())}</h1>
      <h2 style="margin:16px 0 8px;">أرشيف المرفقات</h2>
      <p>${kindFilter ? ('تبويب: '+escapeHtml(String(kindFilter))) : 'كل الأنواع'} · ${folders.length} ملف شخص/معدة</p>
      <p style="font-size:13px;color:#555;">كل شخص في قسم مستقل بملفاته — ${fmtDateTime(new Date())}</p>
    </div>`;
  const full = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>أرشيف المرفقات</title>
    <style>body{margin:16px;font-family:Tahoma,Arial,sans-serif;direction:rtl;} img{max-width:100%;} @page{margin:12mm;}</style>
    </head><body>${cover}${parts.join('')}</body></html>`;
  if(window.desktopApi && window.desktopApi.savePdfHtml){
    const res = await window.desktopApi.savePdfHtml({ html: full, filename: 'أرشيف-المرفقات.pdf' });
    if(res && res.ok){ showToast('تم حفظ أرشيف PDF'); return; }
    if(res && res.canceled) return;
  }
  if(typeof printHtml==='function') printHtml(cover + parts.join(''), 'أرشيف المرفقات');
}



/** رأس كشف: اللوجو على الشمال + اسم الشركة والعنوان على اليمين */
function statementHeaderHtml(title, periodLine){
  const co = DATA.settings || {};
  const logoSrc = (co.logoDataUrl || co.logoPath || 'assets/company-logo.png');
  const company = escapeHtml(co.companyName || brandName());
  const phone = escapeHtml(co.companyPhone || '');
  const addr = escapeHtml(co.companyAddress || '');
  return `
  <div class="stmt-head" style="display:flex;flex-direction:row;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:2px solid #1B4332;padding-bottom:12px;margin-bottom:16px;direction:ltr;">
    <div style="flex-shrink:0;width:100px;text-align:left;">
      <img src="${escapeHtml(logoSrc)}" alt="شعار" style="max-width:96px;max-height:96px;object-fit:contain;" onerror="this.style.display='none'"/>
    </div>
    <div style="flex:1;text-align:right;direction:rtl;">
      <div style="font-size:18px;font-weight:900;color:#1B4332;">${company}</div>
      ${addr?`<div style="font-size:12px;color:#555;margin-top:2px;">${addr}</div>`:''}
      ${phone?`<div style="font-size:12px;color:#555;">هاتف: ${phone}</div>`:''}
      <h3 style="margin:10px 0 0;font-size:16px;font-weight:800;">${escapeHtml(title||'كشف حساب')}</h3>
      ${periodLine?`<div style="font-size:12px;color:#555;margin-top:4px;">${periodLine}</div>`:''}
    </div>
  </div>`;
}

/** تذييل كشف: اسم المدير فقط + سطر توقيع حي — بمحاذاة اللوجو (الشمال) أسفل الصفحة */
function statementFooterHtml(){
  const co = DATA.settings || {};
  const manager = escapeHtml(co.companyManager || '');
  return `
  <div class="stmt-foot" style="margin-top:56px;page-break-inside:avoid;">
    <div style="display:flex;flex-direction:row;justify-content:flex-start;direction:ltr;">
      <div style="width:180px;text-align:center;">
        ${manager?`<div style="font-size:13px;font-weight:700;margin-bottom:36px;direction:rtl;line-height:1.4;">${manager}</div>`:`<div style="height:36px;margin-bottom:36px;"></div>`}
        <div style="border-bottom:1.5px solid #222;width:150px;margin:0 auto 6px;"></div>
        <div style="font-size:11px;color:#555;direction:rtl;">التوقيع</div>
      </div>
    </div>
    <div style="margin-top:16px;font-size:10px;color:#999;text-align:center;direction:rtl;">طُبع: ${fmtDateTime(new Date())}</div>
  </div>`;
}

/** هل العنوان يخص كشف/بيان يحتاج ترويسة وتوقيع؟ */
function shouldBrandStatement(title, opts){
  opts = opts || {};
  if(opts.brand === false || opts.statement === false) return false;
  if(opts.brand === true || opts.statement === true) return true;
  const t = String(title||'');
  return /كشف|بطاقة|بيان|مستحق|يومية|أيام|راتب|إجازة/.test(t);
}


/** إجمالي مصاريف شخص/معدة من صفحة المصاريف */
function personExpensesTotal(kind, personId, from, to){
  const list = typeof personExpensesList==='function' ? personExpensesList(kind, personId, from, to) : [];
  return toInt(list.reduce((s,e)=>{
    if(Array.isArray(e.lines) && e.lines.length)
      return s + e.lines.reduce((a,l)=>a+toInt(l.amount),0);
    if(e.amounts && typeof e.amounts==='object')
      return s + Object.keys(e.amounts).reduce((a,k)=>a+toInt(e.amounts[k]),0);
    return s + toInt(e.amount||e.total||0);
  },0));
}
/** إجمالي الإضافات والمكافآت من سجل الدفع */
/* ===================== التكاليف =====================
 * تكلفة بيدفعها شخص (عامل/مشرف/سائق/موظف) من جيبه للشغل = فلوس ليه علينا.
 * بتتجمع مع مستحقاته (جنب البدلات والمكافآت) في كل الأرصدة والكشوف. */
function costKindLabel(k){ return ({worker:'عامل',supervisor:'مشرف',driver:'سائق',employee:'موظف',equipment:'معدة / مركبة'})[k] || k || ''; }
function costPersonName(c){
  if(!c) return '';
  const id = c.personId;
  if(c.personKind==='worker' && typeof workerName==='function') return workerName(id);
  if(c.personKind==='supervisor' && typeof supervisorName==='function') return supervisorName(id);
  if(c.personKind==='driver' && typeof driverName==='function') return driverName(id);
  if(c.personKind==='employee' && typeof employeeName==='function') return employeeName(id);
  if(c.personKind==='equipment'){
    if(typeof equipmentName==='function') return equipmentName(id);
    const eq = (DATA.equipment||[]).find(x=>x && x.id===id);
    return eq ? (eq.name||eq.code||id) : (id||'');
  }
  return id || '';
}
function costsInRange(kind, personId, from, to){
  return indexedRecords('costs','ck',c=>c.personKind+'|'+c.personId,kind+'|'+personId).filter(c=>{
    if(!c || c.personKind!==kind || c.personId!==personId) return false;
    if(from && (c.date||'')<from) return false;
    if(to && (c.date||'')>to) return false;
    return true;
  }).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
}
function personCostsTotal(kind, personId, from, to){
  return toInt(costsInRange(kind, personId, from, to).reduce((s,c)=>s+toInt(c.amount),0));
}
/** جدول التكاليف داخل كشوف الحساب (فاضي لو مفيش تكاليف) */
function costsTableHtml(rows, opts){
  opts = opts || {};
  if(!rows || !rows.length) return '';
  const total = toInt(rows.reduce((s,r)=>s+toInt(r.amount),0));
  const showWho = !!opts.showPerson;
  return '<h4 style="margin-top:18px;">'+escapeHtml(opts.title||'التكاليف (مستحقة للشخص)')+'</h4>'
    +'<table class="stmt-dues-table"><thead><tr><th>التاريخ</th>'+(showWho?'<th>الاسم</th>':'')+'<th>البند</th><th>المشروع</th><th>ملاحظات</th><th>المبلغ</th></tr></thead><tbody>'
    +rows.map(r=>'<tr><td>'+fmtDate(r.date)+'</td>'+(showWho?'<td>'+escapeHtml(r.name||'')+'</td>':'')+'<td>'+escapeHtml(r.item||'تكلفة')+'</td><td>'+escapeHtml(r.project||'—')+'</td><td>'+escapeHtml(r.notes||'')+'</td><td>'+fmtMoney(r.amount)+'</td></tr>').join('')
    +'</tbody><tfoot><tr style="background:#f0f5f1;font-weight:800;"><th colspan="'+(showWho?5:4)+'" style="text-align:right;">إجمالي التكاليف</th><th>'+fmtMoney(total)+'</th></tr></tfoot></table>';
}
function costsStatementBlock(kind, personId, from, to){
  if(!kind || kind==='equipment') return '';
  const rows = costsInRange(kind, personId, from, to).map(c=>({ date:c.date, item:costItemText(c), project:c.project, notes:c.notes, amount:c.amount }));
  return costsTableHtml(rows);
}
function personExtrasTotal(kind, personId, from, to){
  // بدلات ومكافآت مستحقة (type=bonus) + التكاليف (مستحقة للشخص) — مش صرف مدفوع
  const costs = personCostsTotal(kind, personId, from, to);
  const _cand = kind==='worker'
    ? indexedRecords('workerPayments','pw',p=>[p.workerId, p.personType==='worker'?p.personId:''],personId)
    : indexedRecords('workerPayments','pp',p=>(p.personType||'')+'|'+(p.personId||p.workerId||''),kind+'|'+personId);
  return toInt(costs + _cand.filter(p=>{
    if(!isBonusEntitlement(p)) return false;
    const pt = p.personType || (p.workerId ? 'worker' : '');
    const pid = p.personId || p.workerId || '';
    if(kind==='worker'){
      if(!(pt==='worker' || (!p.personType && p.workerId))) return false;
      if(pid!==personId && p.workerId!==personId) return false;
    } else {
      if(pt!==kind || pid!==personId) return false;
    }
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount||p.extrasAmount),0));
}
/** شارة تم الدفع */
function duesPaidBadge(due, paid, bal){
  const d=toInt(due), p=toInt(paid), b=toInt(bal);
  if(p>0 && b<=0) return '<span class="dues-paid-badge" title="تم سداد المستحقات">✓ تم الدفع</span>';
  if(d>0 && b<=0 && p>=d) return '<span class="dues-paid-badge" title="تم سداد المستحقات">✓ تم الدفع</span>';
  return '';
}

/** مصاريف شخص / معدة */
function personExpensesList(kind, personId, from, to){
  return indexedRecords('expenses','ex',e=>[e.personId||e.equipmentId, e.equipmentId],personId).filter(e=>{
    if(!e) return false;
    const pid = e.personId || e.equipmentId || '';
    const matchPerson = pid===personId || e.equipmentId===personId;
    if(!matchPerson) return false;
    if(kind){
      const ek = e.personKind || (e.equipmentId ? 'equipment' : '');
      if(ek && ek!==kind) return false;
    }
    if(from && (e.date||'') < from) return false;
    if(to && (e.date||'') > to) return false;
    return true;
  }).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function expenseLinesOf(e){
  if(!e) return [];
  if(Array.isArray(e.lines) && e.lines.length)
    return e.lines.map(l=>({ item: l.item||l.label||l.name||'بند', amount: toInt(l.amount) }));
  if(e.amounts && typeof e.amounts==='object'){
    const out = [];
    Object.keys(e.amounts).forEach(k=>{
      const v = toInt(e.amounts[k]);
      if(!v) return;
      let lab = k;
      try{
        if(typeof LICENSE_EXPENSE_FIELDS!=='undefined'){
          const f = (LICENSE_EXPENSE_FIELDS||[]).find(x=>x.key===k);
          if(f) lab = f.label;
        }
      }catch(_e){}
      out.push({ item: lab, amount: v });
    });
    (e.customFields||[]).forEach(c=>{
      const v = toInt(c.value||c.amount);
      if(v) out.push({ item: c.label||c.name||'مخصص', amount: v });
    });
    if(out.length) return out;
  }
  return [{ item: (typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type)||'مصروف', amount: toInt(e.amount) }];
}
function expensesTableHtml(list, opts){
  opts = opts||{};
  const total = (list||[]).reduce((s,e)=>s+toInt(e.amount),0);
  if(!(list||[]).length)
    return opts.empty===false ? '' : '<p style="color:var(--ink-soft);font-size:13px;">لا مصاريف مسجّلة</p>';
  // موحد مع صفحة المصاريف: التاريخ · بند المصروف · المبلغ · القسم · المشروع · البيان
  const showPerson = !!opts.showPerson;
  const rows = list.map(e=>{
    const lines = expenseLinesOf(e);
    const typeLab = (typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type)||'';
    const items = (lines && lines.length) ? lines : [{item: typeLab||'مصروف', amount: toInt(e.amount)}];
    const personCell = showPerson
      ? `<td>${escapeHtml(typeof expensePersonName==='function'?expensePersonName(e.personKind,e.personId):(e.personId||'—'))}</td>`
      : '';
    return items.map((l,i)=>{
      const band = escapeHtml(l.item || typeLab || '—');
      return `<tr>
      <td>${i===0?fmtDate(e.date):''}</td>
      ${i===0?personCell:(showPerson?'<td></td>':'')}
      <td>${band}</td>
      <td><strong>${fmtMoney(l.amount)}</strong></td>
      <td>${i===0?escapeHtml(e.section||'—'):''}</td>
      <td>${i===0?escapeHtml(e.project||'—'):''}</td>
      <td>${i===0?escapeHtml(e.notes||''):''}</td>
    </tr>`;
    }).join('');
  }).join('');
  const personHead = showPerson ? '<th>الاسم</th>' : '';
  const colSpanLeft = showPerson ? 3 : 2;
  const colSpanRight = 3;
  return `<table class="${opts.print?'':'data-table'}">
    <thead><tr>
      <th>التاريخ</th>${personHead}<th>بند المصروف</th><th>المبلغ</th>
      <th>القسم</th><th>المشروع</th><th>البيان</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><th colspan="${colSpanLeft}">الإجمالي</th><th>${fmtMoney(total)}</th><th colspan="${colSpanRight}"></th></tr></tfoot>
  </table>`;
}
function expensesStatementBlock(kind, personId, from, to){
  // المصاريف تظهر داخل جدول المستحقات والمصاريف — لا جدول منفصل
  return '';
}

function printExpenseRecord(id){
  const e = (DATA.expenses||[]).find(x=>x.id===id);
  if(!e){ showToast('المصروف غير موجود'); return; }
  const lines = expenseLinesOf(e);
  const kindLab = {employee:'موظف',supervisor:'مشرف',worker:'عامل',driver:'سائق',equipment:'معدة / مركبة'}[e.personKind]||'';
  let personName = '';
  try{
    if(e.personKind==='worker') personName = workerName(e.personId);
    else if(e.personKind==='driver') personName = typeof driverName==='function'?driverName(e.personId):'';
    else if(e.personKind==='supervisor') personName = supervisorName(e.personId);
    else if(e.personKind==='employee') personName = employeeName(e.personId);
    else if(e.personKind==='equipment'){
      const eq = getEquipment(e.personId||e.equipmentId);
      personName = eq?(eq.name||eq.code):'';
    }
  }catch(_e){}
  const rows = lines.map(l=>`<tr><td>${escapeHtml(l.item)}</td><td>${fmtMoney(l.amount)}</td></tr>`).join('');
  const periodLine = e.date ? ('التاريخ: '+fmtDate(e.date)) : '';
  printHtml(`
    <div class="print-sheet">
      ${typeof statementHeaderHtml==='function'?statementHeaderHtml('مصروف — '+(e.type||''), periodLine):'<h2>مصروف</h2>'}
      <table>
        <tr><th>النوع</th><td>${escapeHtml(typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type||'')}</td>
            <th>المبلغ الإجمالي</th><td><strong>${fmtMoney(e.amount)}</strong></td></tr>
        <tr><th>${kindLab||'الجهة'}</th><td>${escapeHtml(personName||'—')}</td>
            <th>القسم</th><td>${escapeHtml(e.section||'—')}</td></tr>
        <tr><th>المشروع</th><td>${escapeHtml(e.project||'—')}</td>
            <th>ملاحظات</th><td>${escapeHtml(e.notes||'—')}</td></tr>
      </table>
      <h4 style="margin-top:16px;">تفصيل البنود</h4>
      <table>
        <thead><tr><th>البند</th><th>المبلغ</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="2">—</td></tr>'}</tbody>
        <tfoot><tr><th>الإجمالي</th><th>${fmtMoney(e.amount)}</th></tr></tfoot>
      </table>
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, 'مصروف', { statement:true, brand:false });
}
function exportExpenseExcel(id){
  const e = (DATA.expenses||[]).find(x=>x.id===id);
  if(!e){ showToast('المصروف غير موجود'); return; }
  const lines = expenseLinesOf(e);
  const typeLab = (typeof expenseTypeLabel==='function'?expenseTypeLabel(e.type):e.type)||'';
  const headers = ['التاريخ','النوع','البند','المبلغ','القسم','المشروع','ملاحظات'];
  const rows = (lines.length?lines:[{item:typeLab, amount:toInt(e.amount)}]).map(l=>[
    e.date||'', typeLab, l.item||'', toInt(l.amount), e.section||'', e.project||'', e.notes||''
  ]);
  // صف إجمالي
  rows.push(['', '', 'الإجمالي', toInt(e.amount), '', '', '']);
  const who = (typeof expensePersonName==='function'?expensePersonName(e.personKind,e.personId):'')||'';
  const fname = sanitizeFileName((typeof buildExportFileTitle==='function'?buildExportFileTitle('مصروف', who, e.date, e.date):('مصروف_'+who+'_'+(e.date||id))));
  if(typeof downloadXlsx==='function') downloadXlsx(fname+'.xlsx', headers, rows, 'مصروف');
  else if(typeof downloadCsv==='function') downloadCsv(fname+'.csv', headers, rows);
  else showToast('التصدير غير متاح');
}

function printEquipmentAccountStatement(equipmentId, from, to){
  const eq = typeof getEquipment==='function' ? getEquipment(equipmentId) : (DATA.equipment||[]).find(x=>x.id===equipmentId);
  if(!eq){ showToast('المعدة غير موجودة'); return; }
  const dailies = (DATA.equipmentDaily||[]).filter(d=>{
    if(d.equipmentId!==equipmentId) return false;
    if(from && (d.date||'')<from) return false;
    if(to && (d.date||'')>to) return false;
    return true;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const fuels = (DATA.fuelLogs||[]).filter(f=>{
    if(f.equipmentId!==equipmentId) return false;
    if(from && (f.date||'')<from) return false;
    if(to && (f.date||'')>to) return false;
    return true;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const expList = personExpensesList('equipment', equipmentId, from, to);
  let totalH=0, totalF=0, totalC=0;
  const dRows = dailies.map(d=>{
    const h = Number(d.hours)||0, f = Number(d.fuel)||Number(d.liters)||0;
    const c = typeof equipmentDailyCost==='function' ? equipmentDailyCost(d,eq) : toInt(d.cost);
    totalH+=h; totalF+=f; totalC+=c;
    return `<tr>
      <td>${fmtDate(d.date)}</td><td>${escapeHtml(d.project||'')}</td>
      <td>${fmtNum(h)}</td><td>${fmtNum(f)}</td><td>${fmtMoney(c)}</td>
      <td>${escapeHtml(d.notes||'')}</td>
    </tr>`;
  }).join('');
  totalC = toInt(totalC);
  const fuelTotal = fuels.reduce((s,f)=>s+toInt(f.cost||f.amount||0),0);
  const fuelLiters = fuels.reduce((s,f)=>s+(Number(f.liters)||0),0);
  const fRows = fuels.map(f=>`<tr>
    <td>${fmtDate(f.date)}</td><td>${fmtNum(f.liters)}</td><td>${fmtMoney(f.cost||f.amount)}</td>
    <td>${escapeHtml(f.project||'')}</td><td>${escapeHtml(f.notes||'')}</td>
  </tr>`).join('');
  const expTotal = expList.reduce((s,e)=>s+toInt(e.amount),0);
  const periodLine = `الفترة: ${from?fmtDate(from):'الكل'} → ${to?fmtDate(to):'الكل'}`;
  const grand = toInt(totalC + fuelTotal + expTotal);
  printHtml(`
    <div class="print-sheet">
      ${typeof statementHeaderHtml==='function'?statementHeaderHtml('كشف حساب معدة / مركبة', periodLine):''}
      <table>
        <tr><th>الاسم</th><td>${escapeHtml(eq.name||'')}</td><th>الكود</th><td>${escapeHtml(eq.code||'')}</td></tr>
        <tr><th>النوع</th><td>${escapeHtml(eq.typeLabel||eq.type||'')}</td><th>اللوحة</th><td>${escapeHtml(eq.plate||eq.vehicleNumber||'—')}</td></tr>
        <tr><th>المشروع</th><td>${escapeHtml(eq.project||'—')}</td><th>الحالة</th><td>${escapeHtml(typeof labelOf==='function'?labelOf(typeof EQUIPMENT_STATUS!=='undefined'?EQUIPMENT_STATUS:[], eq.status):eq.status||'')}</td></tr>
        <tr><th>ساعات التشغيل</th><td>${fmtNum(Math.round(totalH*10)/10)}</td><th>وقود (يوميات)</th><td>${fmtNum(totalF)} لتر</td></tr>
        <tr><th>تكلفة التشغيل</th><td>${fmtMoney(totalC)}</td><th>تكلفة الوقود المنفصل</th><td>${fmtMoney(fuelTotal)}</td></tr>
        <tr><th>المصاريف</th><td>${fmtMoney(expTotal)}</td><th>الإجمالي الكلي</th><td><strong>${fmtMoney(grand)}</strong></td></tr>
      </table>
      <h4 style="margin-top:18px;">يوميات التشغيل (${dailies.length})</h4>
      <table>
        <thead><tr><th>التاريخ</th><th>المشروع</th><th>ساعات</th><th>وقود</th><th>التكلفة</th><th>ملاحظات</th></tr></thead>
        <tbody>${dRows||'<tr><td colspan="6" style="text-align:center;">لا يوميات</td></tr>'}</tbody>
        <tfoot><tr><th colspan="2">الإجمالي</th><th>${fmtNum(Math.round(totalH*10)/10)}</th><th>${fmtNum(totalF)}</th><th>${fmtMoney(totalC)}</th><th></th></tr></tfoot>
      </table>
      ${fuels.length?`<h4 style="margin-top:18px;">صرف وقود (${fuels.length}) — ${fmtNum(fuelLiters)} لتر · ${fmtMoney(fuelTotal)}</h4>
      <table>
        <thead><tr><th>التاريخ</th><th>لتر</th><th>التكلفة</th><th>المشروع</th><th>ملاحظات</th></tr></thead>
        <tbody>${fRows}</tbody>
      </table>`:''}
      ${typeof paymentsStatementBlock==='function'?paymentsStatementBlock('equipment', equipmentId, from, to):expensesStatementBlock('equipment', equipmentId, from, to)}
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, buildExportFileTitle('كشف حساب معدة', eq.name||eq.code, from, to), { statement:true, brand:false, periodLine: (from||to)?('الفترة: '+(from?fmtDate(from):'الكل')+' → '+(to?fmtDate(to):'الكل')):'' });
}


/** جدول الصرف والخصومات في كشف الحساب */
function paymentsStatementBlock(kind, personId, from, to){
  const rows = [];
  const seenPayIds = new Set();
  let paidSalary = 0;
  let paidExtras = 0;
  let paidOther = 0;

  let registeredSalary = 0;
  try{
    if(typeof getPersonConfiguredSalary==='function')
      registeredSalary = toInt(getPersonConfiguredSalary(kind, personId));
  }catch(_e){}
  // للعامل/السائق/المشرف: أجر الفترة من اليوميات يظهر كأساسي مرة واحدة
  let periodWageDue = 0;
  try{
    if(kind==='worker' && typeof workerDueAmount==='function') periodWageDue = toInt(workerDueAmount(personId, from, to));
    else if(kind==='driver' && typeof driverDueAmount==='function') periodWageDue = toInt(driverDueAmount(personId, from, to));
    else if(kind==='supervisor' && typeof supervisorWageStatement==='function'){
      const st = supervisorWageStatement(personId, from, to);
      periodWageDue = toInt(st && st.ownDue);
    } else if(kind==='equipment'){
      const eq = typeof getEquipment==='function' ? getEquipment(personId) : (DATA.equipment||[]).find(x=>x.id===personId);
      (DATA.equipmentDaily||[]).forEach(d=>{
        if(!d || d.equipmentId!==personId) return;
        if(from && (d.date||'')<from) return;
        if(to && (d.date||'')>to) return;
        periodWageDue += typeof equipmentDailyCost==='function' ? toInt(equipmentDailyCost(d, eq)) : toInt(d.cost);
      });
    }
  }catch(_e){}
  let equipFuelCost = 0;
  if(kind==='equipment'){
    try{
      (DATA.fuelLogs||[]).forEach(f=>{
        if(!f || f.equipmentId!==personId) return;
        if(from && (f.date||'')<from) return;
        if(to && (f.date||'')>to) return;
        equipFuelCost += toInt(f.cost||f.amount||0);
      });
    }catch(_e){}
  }

  if(kind==='employee'){
    (DATA.payroll||[]).forEach(p=>{
      if(!p || p.employeeId!==personId) return;
      const ym = (p.year&&p.month) ? (String(p.year)+'-'+String(p.month).padStart(2,'0')) : '';
      if(from && ym && ym < String(from).slice(0,7)) return;
      if(to && ym && ym > String(to).slice(0,7)) return;
      const basic = toInt(p.basicSalary||p.basic||0);
      const allow = toInt(p.allowances||0);
      const ded = toInt(p.deductions||0);
      if(!basic && !allow && !ded) return;
      rows.push({
        date: ym ? (ym+'-01') : (p.date||''),
        typeLabel: 'راتب',
        item: (p.month&&p.year)?('شهر '+p.month+'/'+p.year):'راتب',
        basic: basic, allowances: allow, penalty: ded, expenses: 0,
        notes: ''
      });
    });
  }

  (DATA.workerPayments||[]).forEach(p=>{
    if(!p || !p.id) return;
    if(seenPayIds.has(p.id)) return;
    const match =
      (kind==='worker' && (typeof paymentBelongsToWorker==='function'?paymentBelongsToWorker(p, personId):(p.workerId===personId||p.personId===personId))) ||
      (kind==='supervisor' && p.personType==='supervisor' && p.personId===personId) ||
      (kind==='driver' && p.personType==='driver' && p.personId===personId) ||
      (kind==='employee' && p.personType==='employee' && p.personId===personId) ||
      (kind==='equipment' && p.personType==='equipment' && p.personId===personId);
    if(!match) return;
    if(from && (p.date||'')<from) return;
    if(to && (p.date||'')>to) return;
    seenPayIds.add(p.id);

    const isPen = p.type==='penalty' || p.type==='deduction';
    const isBonus = (typeof isBonusEntitlement==='function' && isBonusEntitlement(p)) || p.type==='bonus' || p.type==='allowance';
    const isPay = (typeof isActualPayment==='function') ? isActualPayment(p) : (p.type==='pay' || (!p.type && !isBonus && !isPen));

    if(isBonus && !isPay){
      const amt = toInt(p.amount||p.extrasAmount);
      if(!amt) return;
      rows.push({
        date: p.date||'', typeLabel: 'بدلات ومكافآت',
        item: p.payCategory||p.reason||'بدل / مكافأة',
        basic:0, allowances: amt, penalty:0, expenses:0,
        notes: ''
      });
      return;
    }
    if(isPen){
      rows.push({
        date: p.date||'', typeLabel: 'خصم / جزاء',
        item: p.payCategory||p.reason||'خصم',
        basic:0, allowances:0, penalty: toInt(p.amount), expenses:0,
        notes: ''
      });
      return;
    }
    if(isPay){
      const amt = toInt(p.amount);
      const pk = String(p.payKind||'');
      const cat = String(p.payCategory||'');
      // تصنيف المدفوع: راتب / بدلات / أخرى
      if(pk==='extras' || pk==='bonus' || cat.indexOf('مكاف')>=0 || cat.indexOf('بدل')>=0){
        paidExtras += amt;
      } else if(pk==='salary' || pk==='salary_bonus' || cat==='راتب' || cat.indexOf('راتب')>=0 || pk==='daily'){
        // salary_bonus: جزء راتب + جزء بدل إن وُجد
        const salPart = toInt(p.salaryAmount);
        const extPart = toInt(p.extrasAmount);
        if(salPart || extPart){
          paidSalary += salPart || (pk==='salary'?amt:0);
          paidExtras += extPart;
          if(pk==='salary_bonus' && !salPart && !extPart) paidSalary += amt;
        } else if(pk==='daily'){
          paidOther += amt;
        } else {
          paidSalary += amt;
        }
      } else {
        paidOther += amt;
      }
      const what = cat || (pk==='salary'?'راتب':pk==='extras'?'بدلات ومكافآت':pk==='daily'?'يومية':'مستحق');
      rows.push({
        date: p.date||'', typeLabel: 'صرف',
        item: what,
        basic:0, allowances:0, penalty:0, expenses:0,
        notes: 'تم الدفع — '+what,
        isPayRow: true,
        paidAmt: amt
      });
    }
  });

  if(kind==='employee'){
    (DATA.employeePenalties||[]).forEach(p=>{
      if(!p || p.employeeId!==personId) return;
      if(from && (p.date||'')<from) return;
      if(to && (p.date||'')>to) return;
      rows.push({
        date:p.date||'', typeLabel:'خصم / جزاء', item:p.reason||'خصم',
        basic:0, allowances:0, penalty:toInt(p.amount), expenses:0, notes:''
      });
    });
  }

  const seenExpIds = new Set();
  (DATA.expenses||[]).forEach(e=>{
    if(!e) return;
    if(e.id && seenExpIds.has(e.id)) return;
    const pid = e.personId || e.equipmentId || '';
    if(pid!==personId && e.equipmentId!==personId) return;
    const ek = e.personKind || (e.equipmentId || e.isVehicleExpense ? 'equipment' : '');
    if(ek && ek!==kind) return;
    if(from && (e.date||'')<from) return;
    if(to && (e.date||'')>to) return;
    if(e.id) seenExpIds.add(e.id);
    let lines = [];
    try{ lines = typeof expenseLinesOf==='function' ? expenseLinesOf(e) : []; }catch(_e){}
    if(lines && lines.length){
      lines.forEach(l=>{
        const amt = toInt(l.amount);
        if(!amt) return;
        rows.push({
          date:e.date||'', typeLabel:'مصروف',
          item: l.item || e.type || e.section || 'مصروف',
          basic:0, allowances:0, penalty:0, expenses:amt,
          notes: e.project ? ('مشروع: '+e.project) : ''
        });
      });
    } else {
      const amt = e.amounts ? Object.keys(e.amounts).reduce((s,k)=>s+toInt(e.amounts[k]),0) : toInt(e.amount||e.total||0);
      if(!amt) return;
      rows.push({
        date:e.date||'', typeLabel:'مصروف', item:e.type||e.item||e.section||'مصروف',
        basic:0, allowances:0, penalty:0, expenses:amt, notes: e.project||''
      });
    }
  });

  if(periodWageDue>0 && !rows.some(r=>toInt(r.basic)>0)){
    const basicLabel = kind==='employee' ? 'راتب' : (kind==='equipment' ? 'تشغيل' : 'أجر أيام');
    const basicItem = kind==='employee' ? 'الراتب الأساسي' : (kind==='equipment' ? 'تكلفة التشغيل' : 'أجر أيام العمل');
    rows.unshift({
      date: from||'', typeLabel: basicLabel,
      item: basicItem,
      basic: periodWageDue, allowances:0, penalty:0, expenses:0,
      notes: ''
    });
  } else if(registeredSalary>0 && !rows.some(r=>toInt(r.basic)>0) && (kind==='employee')){
    rows.unshift({
      date: from||'', typeLabel: 'راتب',
      item: 'الراتب الأساسي',
      basic: registeredSalary, allowances:0, penalty:0, expenses:0,
      notes: ''
    });
  }
  // وقود المعدات — بند منفصل
  if(kind==='equipment' && equipFuelCost>0){
    rows.push({
      date: from||'', typeLabel: 'وقود',
      item: 'صرف وقود',
      basic:0, allowances:0, penalty:0, expenses: equipFuelCost,
      notes: ''
    });
  }

  // التكاليف: صف إجمالي واحد (التفصيل في جدول التكاليف) عشان تدخل في المستحق من غير تكرار
  if(kind!=='equipment'){
    const costsTot = personCostsTotal(kind, personId, from, to);
    if(costsTot>0) rows.push({
      date: from||'', typeLabel:'تكاليف', item:'إجمالي التكاليف (التفصيل في جدول التكاليف)',
      basic:0, allowances: costsTot, penalty:0, expenses:0, notes:''
    });
  }
  rows.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const paidTotal = toInt(paidSalary + paidExtras + paidOther);
  // لو مفيش صفوف استحقاق ولا مدفوع — رجّع جدول ملخص فارغ للأساسي فقط لو فيه راتب مسجّل
  // (لا نرجع '' عشان يظهر الإجمالي والمدفوع زي كشف الموظف)

  const sumBasic = rows.reduce((s,r)=>s+toInt(r.basic),0);
  const sumAllow = rows.reduce((s,r)=>s+toInt(r.allowances),0);
  const sumPen = rows.reduce((s,r)=>s+toInt(r.penalty),0);
  const sumExp = rows.reduce((s,r)=>s+toInt(r.expenses),0);
  const netDue = toInt(sumBasic + sumAllow - sumPen - sumExp);
  const remaining = toInt(netDue - paidTotal);

  // —— جدول المعدات/المركبات (أعمدة مناسبة) ——
  if(kind==='equipment'){
    const bodyEq = rows.map(r=>{
      return '<tr>'
        +'<td>'+fmtDate(r.date)+'</td>'
        +'<td>'+escapeHtml(r.typeLabel)+'</td>'
        +'<td>'+escapeHtml(r.item)+'</td>'
        +'<td>'+(r.basic?fmtMoney(r.basic):'—')+'</td>'
        +'<td>'+(r.expenses?fmtMoney(r.expenses):'—')+'</td>'
        +'<td>'+(r.penalty?fmtMoney(r.penalty):'—')+'</td>'
        +'<td>'+escapeHtml(r.notes||'')+'</td>'
        +'</tr>';
    }).join('');
    const netEq = toInt(sumBasic + sumExp - sumPen); // تشغيل + مصاريف − خصم
    const remainEq = toInt(netEq - paidTotal);
    let paidEq = '';
    if(paidTotal>0){
      paidEq += '<tr style="background:#eef6fb;"><th colspan="6" style="text-align:right;">المدفوع</th>'
        +'<th style="text-align:right;">'+fmtMoney(paidTotal)+'</th></tr>';
    } else {
      paidEq += '<tr style="background:#eef6fb;"><th colspan="6" style="text-align:right;">المدفوع</th>'
        +'<th style="text-align:right;">'+fmtMoney(0)+'</th></tr>';
    }
    return '<h4 style="margin-top:18px;">المستحقات والمصاريف</h4>'
      +'<table class="stmt-dues-table">'
      +'<thead><tr>'
      +'<th>التاريخ</th><th>النوع</th><th>البند</th>'
      +'<th>تكلفة التشغيل</th><th>مصاريف</th><th>خصم</th><th>ملاحظات</th>'
      +'</tr></thead>'
      +'<tbody>'+(bodyEq||'<tr><td colspan="7" style="text-align:center;">لا سجلات</td></tr>')+'</tbody>'
      +'<tfoot>'
      +'<tr style="background:#f0f5f1;font-weight:800;">'
      +'<th colspan="3">الإجمالي</th>'
      +'<th>'+fmtMoney(sumBasic)+'</th>'
      +'<th>'+fmtMoney(sumExp)+'</th>'
      +'<th>'+fmtMoney(sumPen)+'</th>'
      +'<th style="text-align:right;">'+fmtMoney(netEq)+'</th>'
      +'</tr>'
      + paidEq
      +'<tr style="background:'+(remainEq>0?'#fff3f0':'#f0faf2')+';font-weight:800;">'
      +'<th colspan="6" style="text-align:right;">المتبقي</th>'
      +'<th style="text-align:right;">'+fmtMoney(remainEq)+'</th>'
      +'</tr>'
      +'</tfoot></table>';
  }

  const body = rows.map(r=>{
    return '<tr>'
      +'<td>'+fmtDate(r.date)+'</td>'
      +'<td>'+escapeHtml(r.typeLabel)+'</td>'
      +'<td>'+escapeHtml(r.item)+'</td>'
      +'<td>'+(r.basic?fmtMoney(r.basic):'—')+'</td>'
      +'<td>'+(r.allowances?fmtMoney(r.allowances):'—')+'</td>'
      +'<td>'+(r.penalty?fmtMoney(r.penalty):'—')+'</td>'
      +'<td>'+(r.expenses?fmtMoney(r.expenses):'—')+'</td>'
      +'<td>'+escapeHtml(r.notes||'')+'</td>'
      +'</tr>';
  }).join('');

  // صفوف المدفوع مفصّلة: راتب / بدلات / أخرى
  let paidRows = '';
  if(paidSalary>0){
    paidRows += '<tr style="background:#eef6fb;">'
      +'<th colspan="7" style="text-align:right;">المدفوع — راتب</th>'
      +'<th style="text-align:right;">'+fmtMoney(paidSalary)+'</th></tr>';
  }
  if(paidExtras>0){
    paidRows += '<tr style="background:#eef6fb;">'
      +'<th colspan="7" style="text-align:right;">المدفوع — بدلات ومكافآت</th>'
      +'<th style="text-align:right;">'+fmtMoney(paidExtras)+'</th></tr>';
  }
  if(paidOther>0){
    paidRows += '<tr style="background:#eef6fb;">'
      +'<th colspan="7" style="text-align:right;">المدفوع — أخرى</th>'
      +'<th style="text-align:right;">'+fmtMoney(paidOther)+'</th></tr>';
  }
  if(paidTotal>0){
    paidRows += '<tr style="background:#e8f0ea;font-weight:800;">'
      +'<th colspan="7" style="text-align:right;">إجمالي المدفوع</th>'
      +'<th style="text-align:right;">'+fmtMoney(paidTotal)+'</th></tr>';
  } else {
    paidRows += '<tr style="background:#eef6fb;">'
      +'<th colspan="7" style="text-align:right;">المدفوع</th>'
      +'<th style="text-align:right;">'+fmtMoney(0)+'</th></tr>';
  }

  return '<h4 style="margin-top:18px;">المستحقات والمصاريف</h4>'
    +'<table class="stmt-dues-table">'
    +'<thead><tr>'
    +'<th>التاريخ</th><th>النوع</th><th>البند</th>'
    +'<th>الأساسي</th><th>بدلات ومكافآت</th><th>خصم / جزاء</th><th>مصاريف</th><th>ملاحظات</th>'
    +'</tr></thead>'
    +'<tbody>'+body+'</tbody>'
    +'<tfoot>'
    +'<tr style="background:#f0f5f1;font-weight:800;">'
    +'<th colspan="3">الإجمالي</th>'
    +'<th>'+fmtMoney(sumBasic)+'</th>'
    +'<th>'+fmtMoney(sumAllow)+'</th>'
    +'<th>'+fmtMoney(sumPen)+'</th>'
    +'<th>'+fmtMoney(sumExp)+'</th>'
    +'<th style="text-align:right;">'+fmtMoney(netDue)+'</th>'
    +'</tr>'
    + paidRows
    +'<tr style="background:'+(remaining>0?'#fff3f0':'#f0faf2')+';font-weight:800;">'
    +'<th colspan="7" style="text-align:right;">المتبقي</th>'
    +'<th style="text-align:right;">'+fmtMoney(remaining)+'</th>'
    +'</tr>'
    +'</tfoot></table>';
}

function isTempWorkerRec(w){
  if(!w) return false;
  if(typeof isTemporaryWorker==='function'){ try{ return !!isTemporaryWorker(w); }catch(e){} }
  return /temporary|temp|daily|مؤقت|يومية|يوميه/.test(String(w.workerType||w.type||'').toLowerCase());
}
function printWorkerStatement(workerId, from, to){
  const w = getWorker(workerId);
  if(!w){ showToast('العامل غير موجود'); return; }
  if(isTempWorkerRec(w) && typeof printDaysStatement==='function') return printDaysStatement('worker', workerId, from, to);   // العامل المؤقت: كشف أيام
  const days = workerDaysWorked(workerId, from||undefined, to||undefined);
  const absent = toInt(workerDaysAbsent(workerId, from||undefined, to||undefined));
  const baseDue = workerDueAmount(workerId, from||undefined, to||undefined);
  const atts = workerAttendanceInRange(workerId, from||undefined, to||undefined)
    .slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const rows = atts.map(a=>{
    const wage = attendanceDayWage(a, w);
    const amt = attendanceNetPay(a, w);
    const ded = toInt(a.deduction);
    return `<tr>
      <td>${fmtDate(a.date)}</td>
      <td>${escapeHtml(labelOf(ATTENDANCE_STATUS,a.status))}</td>
      <td>${fmtAttendanceDays(a)}</td>
      <td>${fmtMoney(wage)}${ded?(' − خصم '+fmtNum(ded)):''}</td>
      <td>${fmtMoney(amt)}</td>
      <td>${escapeHtml(a.project||'')}</td>
    </tr>`;
  }).join('');
  const periodLine = `الفترة: ${from?fmtDate(from):'الكل'} → ${to?fmtDate(to):'الكل'}`;
  printHtml(`
    <div class="print-sheet">
      ${statementHeaderHtml(buildExportFileTitle('كشف حساب عامل', w.name, from, to), periodLine)}
      <table>
        <tr><th>الاسم</th><td>${escapeHtml(w.name||'')}</td><th>الكود</th><td>${escapeHtml(w.code||'')}</td></tr>
        <tr><th>المشرف</th><td>${escapeHtml(supervisorName(w.supervisorId))}</td><th>اليومية</th><td>${fmtMoney(w.dailyWage)}</td></tr>
        <tr><th>المهارة</th><td>${escapeHtml(w.skill||'—')}</td><th>المشروع</th><td>${escapeHtml(w.project||'—')}</td></tr>
        <tr><th>أيام العمل</th><td>${fmtDays(days)}</td><th>أيام الغياب</th><td>${fmtNum(absent)}</td></tr>
      </table>
      ${costsStatementBlock('worker', workerId, from, to)}${typeof paymentsStatementBlock==='function'?paymentsStatementBlock('worker', workerId, from, to):''}
      <h4 style="margin-top:18px;">تفصيل الأيام</h4>
      <table>
        <thead><tr><th>التاريخ</th><th>الحالة</th><th>الأيام</th><th>اليومية</th><th>المستحق</th><th>المشروع</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;">لا سجلات</td></tr>'}</tbody>
        <tfoot><tr><th colspan="2">الإجمالي</th><th>${fmtDays(days)}</th><th></th><th>${fmtMoney(baseDue)}</th><th></th></tr></tfoot>
      </table>
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, buildExportFileTitle('كشف حساب عامل', w.name, from, to), { statement:true, brand:false, periodLine: (from||to)?('الفترة: '+(from?fmtDate(from):'الكل')+' → '+(to?fmtDate(to):'الكل')):'', headerTitle: buildExportFileTitle('كشف حساب عامل', w.name, from, to) });
}





/** كشف أيام عمل — عامل / مشرف / سائق */

function printDriverStatement(driverId, from, to){
  const d = typeof getDriver==='function' ? getDriver(driverId) : (DATA.drivers||[]).find(x=>x.id===driverId);
  if(!d){ showToast('السائق غير موجود'); return; }
  const days = typeof driverDaysWorked==='function' ? driverDaysWorked(driverId, from||undefined, to||undefined) : 0;
  const baseDue = typeof driverDueAmount==='function' ? driverDueAmount(driverId, from||undefined, to||undefined) : 0;
  const logs = (DATA.workerAttendance||[]).filter(a=>{
    if(attType(a)!=='driver' || attPersonId(a)!==driverId) return false;
    if(from && (a.date||'')<from) return false;
    if(to && (a.date||'')>to) return false;
    return true;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const rows = logs.map(a=>{
    const wage = attendanceDayWage(a, d);
    const amt = attendanceNetPay(a, d);
    return `<tr>
      <td>${fmtDate(a.date)}</td>
      <td>${escapeHtml(labelOf(ATTENDANCE_STATUS,a.status))}</td>
      <td>${fmtAttendanceDays(a)}</td>
      <td>${fmtMoney(wage)}</td>
      <td>${fmtMoney(amt)}</td>
      <td>${escapeHtml(a.project||'')}</td>
    </tr>`;
  }).join('');
  const periodLine = `الفترة: ${from?fmtDate(from):'الكل'} → ${to?fmtDate(to):'الكل'}`;
  printHtml(`
    <div class="print-sheet">
      ${statementHeaderHtml('كشف حساب سائق', periodLine)}
      <table>
        <tr><th>الاسم</th><td>${escapeHtml(d.name||'')}</td><th>الكود</th><td>${escapeHtml(d.code||'')}</td></tr>
        <tr><th>اليومية</th><td>${fmtMoney(d.dailyWage)}</td><th>درجة الرخصة</th><td>${escapeHtml(d.licenseGrade||'—')}</td></tr>
        <tr><th>أيام العمل</th><td>${fmtDays(days)}</td><th>المشروع</th><td>${escapeHtml(d.project||'—')}</td></tr>
      </table>
      ${costsStatementBlock('driver', driverId, from, to)}${typeof paymentsStatementBlock==='function'?paymentsStatementBlock('driver', driverId, from, to):''}
      <h4 style="margin-top:18px;">تفصيل الأيام</h4>
      <table>
        <thead><tr><th>التاريخ</th><th>الحالة</th><th>الأيام</th><th>اليومية</th><th>المستحق</th><th>المشروع</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;">لا سجلات</td></tr>'}</tbody>
        <tfoot><tr><th colspan="2">الإجمالي</th><th>${fmtDays(days)}</th><th></th><th>${fmtMoney(baseDue)}</th><th></th></tr></tfoot>
      </table>
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, buildExportFileTitle('كشف حساب سائق', d.name, from, to), { statement:true, brand:false, periodLine: (from||to)?('الفترة: '+(from?fmtDate(from):'الكل')+' → '+(to?fmtDate(to):'الكل')):'' });
}


/** أيام سُجّل فيها الشخص في أكثر من موقع/سجل في نفس اليوم */
function attendanceMultiSiteDays(kind, personId, from, to){
  const byDate = {};
  (DATA.workerAttendance||[]).forEach(a=>{
    if(!a || !a.date) return;
    if(from && a.date<from) return;
    if(to && a.date>to) return;
    if(!isPayableAttendance(a.status)) return;
    const pt = a.personType || 'worker';
    const ok = kind==='worker' ? (pt==='worker' && (a.workerId===personId || a.personId===personId))
             : (pt===kind && a.personId===personId);
    if(!ok) return;
    (byDate[a.date] = byDate[a.date] || []).push(a);
  });
  return Object.keys(byDate).sort().filter(d=>byDate[d].length>1).map(d=>({
    date:d,
    sites: byDate[d].map(a=>String(a.project||a.site||'').trim()||'غير محدد'),
    days: Math.round(byDate[d].reduce((s,a)=>s+attendanceDaysCredit(a),0)*100)/100
  }));
}
/** تنبيه كشف المشرف: عمال/المشرف المسجلون في أكثر من موقع في نفس اليوم */
function supervisorMultiSiteNoticeHtml(supId, from, to, print){
  const items = [];
  const s = getSupervisor(supId);
  if(s) attendanceMultiSiteDays('supervisor', supId, from, to).forEach(x=>items.push({ who:(s.name||'')+' (المشرف)', ...x }));
  workersOfSupervisor(supId).forEach(w=> attendanceMultiSiteDays('worker', w.id, from, to).forEach(x=>items.push({ who:w.name||'', ...x })));
  if(!items.length) return '';
  items.sort((a,b)=>a.date.localeCompare(b.date)||a.who.localeCompare(b.who,'ar'));
  const T = print ? '<table>' : '<table class="data-table">';
  const body = items.map(x=>`<tr><td>${fmtDate(x.date)}</td><td><strong>${escapeHtml(x.who)}</strong></td><td>${x.sites.map(escapeHtml).join(' + ')}</td><td>${x.sites.length}</td><td>${fmtDays(x.days)}</td></tr>`).join('');
  const head = print ? '<h4>⚑ تنبيه: تواجد في أكثر من موقع في نفس اليوم</h4>' : '<div class="section-title" style="margin-top:18px;">⚑ تنبيه: تواجد في أكثر من موقع في نفس اليوم</div>';
  const tbl = T+`<thead><tr><th>اليوم</th><th>الاسم</th><th>المواقع</th><th>عدد المواقع</th><th>الأيام المحسوبة</th></tr></thead><tbody>${body}</tbody></table>`;
  return head + (print ? tbl : '<div class="table-wrap">'+tbl+'</div>');
}
/* ===== كروت إحصائية مستقلة لكل قسم — تُحسب من الصفوف المعروضة (القسم الحالي) ===== */
function statCardsHtml(cards){
  return `<div class="sc-row">${cards.filter(Boolean).map(c=>`
    <div class="sc-card ${c.tone||''}">
      <span class="sc-ico">${c.ico||'📊'}</span>
      <div class="sc-body">${c.parts?`<div class="sc-parts">${c.parts.map(p=>`<span class="sc-part ${p.tone||''}"><b>${p.n}</b><i>${escapeHtml(p.l)}</i></span>`).join('')}</div>`:`<div class="sc-num">${c.value}</div>`}<div class="sc-lbl">${escapeHtml(c.label)}</div>${c.sub?`<div class="sc-sub">${escapeHtml(c.sub)}</div>`:''}</div>
    </div>`).join('')}</div>`;
}
function entityStatCardsHtml(kind, rows){
  try{
    const _k1 = ({employees:'employee',employee:'employee',workers:'worker',worker:'worker',supervisors:'supervisor',supervisor:'supervisor',drivers:'driver',driver:'driver'})[kind];
    const _sec = (_k1 && typeof __sectionOfKind==='function') ? __sectionOfKind(_k1) : '';
    if(_sec && typeof sectionStatCardsHtml==='function') return sectionStatCardsHtml(_k1, rows||[], _sec);
  }catch(_e){}
  const _bk = ({employees:'employee',employee:'employee',workers:'worker',worker:'worker',supervisors:'supervisor',supervisor:'supervisor',drivers:'driver',driver:'driver'})[kind];
  const _banner = (_bk && typeof retirementBannerHtml==='function') ? retirementBannerHtml(_bk) : '';
  return _banner + _entityStatCardsBase(kind, rows, _builtinExtraCards(kind, rows||[]), customCardsFor(kind, rows||[]));
}
function _personPayOf(x){
  const sal = Number(x.salary||x.basicSalary)||0;
  if(sal) return sal;
  return (Number(x.dailyWage)||0) * (Number((DATA.settings||{}).workDaysPerMonth)||26);
}
function _payTotalCard(rows){ return {ico:'💰',label:'إجمالي الرواتب',value:fmtMoney(toInt(rows.reduce((s,x)=>s+_personPayOf(x),0)))}; }
function _dailySumCard(rows){ return {ico:'💰',label:'إجمالي اليوميات',value:fmtMoney(toInt(rows.reduce((s,x)=>s+(Number(x.dailyWage)||0),0)))}; }
function _contractStatusCard(rows){
  const b = {active:0,expired:0,suspended:0};
  rows.forEach(x=>{
    const v = String(x.contractStatus||'').trim();
    if(v==='active'||v==='ساري'||v==='سارية') b.active++;
    else if(v==='expired'||v==='منتهي'||v==='منتهية') b.expired++;
    else if(v==='suspended'||v==='موقوف'||v==='موقوفة') b.suspended++;
  });
  return {ico:'📑',label:'حالة العقد',tone:b.expired?'warn':'',parts:[{n:fmtNum(b.active),l:'ساري',tone:'ok'},{n:fmtNum(b.expired),l:'منتهي',tone:b.expired?'warn':''},{n:fmtNum(b.suspended),l:'موقوف'}]};
}
function _cardStatusCard(rows){
  const cardExp = x=> (x.idCardExpiry ? (typeof statusFromExpiry==='function' && statusFromExpiry(x.idCardExpiry)==='expired') : (x.idCardStatus==='expired'||x.idCardStatus==='منتهية'));
  const ce = rows.filter(cardExp).length;
  return {ico:'🪪',label:'حالة البطاقة',tone:ce?'warn':'',parts:[{n:fmtNum(rows.filter(x=>!cardExp(x)&&(x.idCardExpiry||x.idCardStatus==='valid'||x.idCardStatus==='سارية')).length),l:'سارية',tone:'ok'},{n:fmtNum(ce),l:'منتهية',tone:ce?'warn':''}]};
}
function _entityStatCardsBase(kind, rows, extra, custom){
  rows = rows || [];
  const n = rows.length;
  const act = x=> !x.status || x.status==='active' || x.status==='working';
  const avg = (arr,k)=> arr.length ? fmtMoney(Math.round(arr.reduce((s,x)=>s+(Number(x[k])||0),0)/arr.length)) : fmtMoney(0);
  const expired = x=> ['idCardExpiry','licenseExpiry','vehicleLicenseExpiry','driverLicenseExpiry','insuranceExpiry','contractEnd'].some(k=> x[k] && typeof statusFromExpiry==='function' && statusFromExpiry(x[k])==='expired');
  const _pk = {employees:'employee',employee:'employee',workers:'worker',worker:'worker',supervisors:'supervisor',supervisor:'supervisor',drivers:'driver',driver:'driver'}[kind];
  if(_pk==='employee' || _pk==='worker'){
    // نفس الكروت للموظفين والعمال — نشطون ← الإجازات · وثائق منتهية ← حالة البطاقة
    return statCardsHtml([
      {ico:_pk==='worker'?'🧑‍🔧':'👔',label:_pk==='worker'?'عدد العمال':'عدد الموظفين',value:fmtNum(n)},
      _activeLeaveCard(_pk, rows, act)].concat(extra, custom, [_contractStatusCard(rows), _cardStatusCard(rows),
        (_pk==='worker' && typeof workerFilters!=='undefined' && String(workerFilters.departmentId||workerFilters.categoryId||'')==='__core_workers_temp__') ? _dailySumCard(rows) : _payTotalCard(rows)]));
  }
  if(kind==='supervisors'||kind==='supervisor') return statCardsHtml([
    {ico:'👷',label:'عدد المشرفين',value:fmtNum(n)},
    _activeLeaveCard('supervisor', rows, act),
    {ico:'🧑‍🔧',label:'عمال تابعون',value:fmtNum(rows.reduce((s,x)=>s+(typeof workersOfSupervisor==='function'?workersOfSupervisor(x.id).length:0),0))},
    ].concat(extra,custom,[_contractStatusCard(rows), _cardStatusCard(rows), _dailySumCard(rows)]));
  if(kind==='drivers'||kind==='driver') return statCardsHtml([
    {ico:'🧑‍🚒',label:'عدد السائقين',value:fmtNum(n)},
    _activeLeaveCard('driver', rows, act),
    {ico:'🪪',label:'رخص منتهية',value:fmtNum(rows.filter(expired).length),tone:rows.some(expired)?'warn':''},
    ].concat(extra,custom,[_contractStatusCard(rows), (typeof driverFilters!=='undefined' && String(driverFilters.departmentId||driverFilters.categoryId||'')==='__core_drivers_ext__') ? _dailySumCard(rows) : _payTotalCard(rows)]));
  if(kind==='equipment'){
    const ms = todayISO().slice(0,8)+'01';
    const ids = new Set(rows.map(x=>x.id));
    const monthCost = toInt((DATA.equipmentDaily||[]).filter(d=>ids.has(d.equipmentId) && (d.date||'')>=ms).reduce((s,d)=>s+equipmentDailyCost(d, getEquipment(d.equipmentId)),0));
    const maint = rows.filter(e=>e.status==='maintenance'||e.status==='stopped').length;
    return statCardsHtml([
      {ico:'🚜',label:'إجمالي القسم',value:fmtNum(n)},
      {ico:'🛠️',label:'صيانة / عاطلة',value:fmtNum(maint),tone:maint?'warn':''}].concat(extra, custom, [
      {ico:'💰',label:'تكلفة تشغيل الشهر',value:fmtMoney(monthCost)}]));
  }
  return '';
}

/* ===== كروت حالة التأمين وحالة الرخصة (للأشخاص والمعدات) ===== */
function _insuranceBucket(x){
  const v = String(x.insuranceStatus||'').trim();
  if(v==='insured'||v==='مؤمَّن'||v==='مؤمن') return 'insured';
  if(v==='pending'||v==='قيد التسجيل') return 'pending';
  return 'none';
}
function _licenseExpiryOf(x){
  const k = ['vehicleLicenseExpiry','licenseExpiry','driverLicenseExpiry'].find(k=>x[k]);
  return k ? x[k] : '';
}
function _builtinExtraCards(kind, rows){
  const k = String(kind||'').replace(/s$/,'');
  if(!['employee','worker','supervisor','driver','equipment'].includes(k) && kind!=='equipment') return [];
  const unit = k==='equipment' ? 'معدة' : 'شخص';
  const c = {insured:0,none:0,pending:0}; rows.forEach(x=>{ c[_insuranceBucket(x)]++; });
  let lv = 0, le = 0;
  rows.forEach(x=>{ const e=_licenseExpiryOf(x); if(!e||typeof statusFromExpiry!=='function') return; if(statusFromExpiry(e)==='expired') le++; else lv++; });
  if(k==='equipment' && typeof equipmentFilters!=='undefined' && String(equipmentFilters.departmentId||equipmentFilters.categoryId||'')==='__core_eq_external__'){
    const av = rows.filter(x=>x.status==='working'||x.status==='available').length, un = rows.length - av;
    return [
      {ico:'🚗',label:'توافر السيارات',tone:un?'warn':'ok',parts:[{n:fmtNum(av),l:'متاحة',tone:'ok'},{n:fmtNum(un),l:'غير متاحة',tone:un?'warn':''}]},
      {ico:'🪪',label:'حالة الرخصة',tone:le?'warn':'',parts:[{n:fmtNum(lv),l:'سارية',tone:'ok'},{n:fmtNum(le),l:'منتهية',tone:le?'warn':''}]}
    ];
  }
  return [
    {ico:'🛡️',label:'حالة التأمين',tone:c.none?'warn':'ok',parts:[{n:fmtNum(c.insured),l:'مؤمَّن',tone:'ok'},{n:fmtNum(c.none),l:'غير مؤمن',tone:c.none?'warn':''},{n:fmtNum(c.pending),l:'قيد التسجيل'}]},
    {ico:'🪪',label:'حالة الرخصة',tone:le?'warn':'',parts:[{n:fmtNum(lv),l:'سارية',tone:'ok'},{n:fmtNum(le),l:'منتهية',tone:le?'warn':''}]}
  ];
}

/* ===== كروت مخصصة: يربطها المستخدم بأي عمود (من الإعدادات ← تعديلات مخصصة) ===== */
const CUSTOM_CARD_ENTITIES = { employees:'موظفون', workers:'عمال', supervisors:'مشرفون', drivers:'سائقون', equipment:'معدات' };
const CUSTOM_CARD_MODES = [ {code:'breakdown',label:'تحليل وتقسيم القيم (تلقائي)'}, {code:'count',label:'عدد السجلات التي فيها قيمة'}, {code:'equals',label:'عدد السجلات التي قيمتها = …'}, {code:'sum',label:'مجموع'}, {code:'avg',label:'متوسط'}, {code:'expired',label:'عدد التواريخ المنتهية'}, {code:'valid',label:'عدد التواريخ السارية'} ];
function _cardCellValue(x, key, label){
  if(x[key]!=null && x[key]!=='') return x[key];
  const ef = (x.extraFields||[]).find(f=>f && f.label===label); if(ef) return ef.value;
  if(x.custom && label && x.custom[label]!=null) return x.custom[label];
  return '';
}

function _activeLeaveCard(kind, rows, act){
  const actN = rows.filter(act).length;
  const onL = rows.filter(x=>activeLeaveOf(kind, x.id)).length;
  return {ico:'✅',label:'نشطون',tone:'ok',parts:[{n:fmtNum(actN-Math.min(onL,actN)),l:'على رأس العمل',tone:'ok'},{n:fmtNum(onL),l:'في إجازة',tone:onL?'warn':''}]};
}
const _CARD_CODE_LABELS = {valid:'سارية',expired:'منتهية',insured:'مؤمَّن',none:'غير مؤمن',pending:'قيد التسجيل',active:'نشط',inactive:'غير نشط',working:'يعمل',maintenance:'صيانة',stopped:'متوقف',left:'مستقيل',resigned:'مستقيل',owned:'ملك',rented:'إيجار'};
function _cardBreakdown(vals, rows, key){
  const isDate = v=> /^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
  const nonEmpty = vals.filter(v=>String(v==null?'':v).trim()!=='');
  const lbl = v=> _CARD_CODE_LABELS[String(v).trim()] || ((typeof arabicLabelForCode==='function' && arabicLabelForCode(v)) || String(v).trim());
  // أعمدة التأمين
  if(/insurance.*status/i.test(key||'')){
    const c={insured:0,none:0,pending:0}; rows.forEach(x=>{ c[_insuranceBucket(x)]++; });
    return [{n:fmtNum(c.insured),l:'مؤمَّن',tone:'ok'},{n:fmtNum(c.none),l:'غير مؤمن',tone:c.none?'warn':''},{n:fmtNum(c.pending),l:'قيد التسجيل'}];
  }
  // عمود حالة مشتق من تاريخ انتهاء (بطاقة/رخصة…)
  const expKey = /Status$/.test(key||'') ? key.replace(/Status$/,'Expiry') : '';
  let derived = null;
  if(expKey && rows.some(x=>x[expKey])) derived = rows.map(x=>x[expKey] ? (typeof statusFromExpiry==='function'?statusFromExpiry(x[expKey]):'') : (x[key]||''));
  const arr = derived || vals;
  if(derived || (nonEmpty.length && nonEmpty.filter(isDate).length >= nonEmpty.length/2)){
    let ex=0, va=0, no=0;
    arr.forEach(v=>{ const st = isDate(v) ? statusFromExpiry(v) : String(v||''); if(st==='expired'||st==='منتهية') ex++; else if(st==='valid'||st==='سارية') va++; else no++; });
    const out = [{n:fmtNum(va),l:'سارية',tone:'ok'},{n:fmtNum(ex),l:'منتهية',tone:ex?'warn':''}];
    if(no) out.push({n:fmtNum(no),l:'بدون تاريخ'});
    return out;
  }
  const nums = nonEmpty.map(v=>Number(String(v).replace(/,/g,''))); 
  if(nonEmpty.length && nums.every(v=>isFinite(v))){
    const t = nums.reduce((a,b)=>a+b,0);
    return [{n:fmtNum(Math.round(t*100)/100),l:'المجموع'},{n:fmtNum(Math.round(t/nums.length*100)/100),l:'المتوسط'},{n:fmtNum(nums.length),l:'عدد'}];
  }
  const g = {}; arr.forEach(v=>{ const k = String(v==null?'':v).trim()===''?'غير محدد':lbl(v); g[k]=(g[k]||0)+1; });
  const ks = Object.keys(g).sort((a,b)=>g[b]-g[a]);
  const top = ks.slice(0,4).map(k=>({n:fmtNum(g[k]),l:k}));
  const rest = ks.slice(4).reduce((s,k)=>s+g[k],0);
  if(rest) top.push({n:fmtNum(rest),l:'أخرى'});
  return top.length ? top : [{n:fmtNum(0),l:'لا بيانات'}];
}
function customCardsFor(kind, rows){
  const ent = kind==='employee'?'employees':kind==='worker'?'workers':kind==='supervisor'?'supervisors':kind==='driver'?'drivers':kind;
  const cards = (DATA.customCards||[]).filter(c=>c && c.entity===ent && c.show!==false);
  return cards.map(c=>{
    const vals = rows.map(x=>_cardCellValue(x, c.column, c.columnLabel));
    const labelOf = v=> (typeof arabicLabelForCode==='function' && arabicLabelForCode(v)) || v;
    if(!c.mode || c.mode==='breakdown'){
      return {ico:c.icon||'📌', label:c.label||c.columnLabel||'كرت', tone:c.tone||'', parts:_cardBreakdown(vals, rows, c.column)};
    }
    let n = 0, out;
    if(c.mode==='sum'||c.mode==='avg'){
      const nums = vals.map(v=>Number(String(v).replace(/[^\d.-]/g,''))).filter(v=>isFinite(v) && v!==0);
      const t = nums.reduce((a,b)=>a+b,0);
      out = fmtNum(Math.round((c.mode==='avg'?(nums.length?t/nums.length:0):t)*100)/100);
    } else {
      if(c.mode==='expired'||c.mode==='valid') n = vals.filter(v=>v && typeof statusFromExpiry==='function' && statusFromExpiry(v)===(c.mode==='expired'?'expired':'valid')).length;
      else if(c.mode==='equals') n = vals.filter(v=>String(v).trim()===String(c.value||'').trim() || String(labelOf(v)).trim()===String(c.value||'').trim()).length;
      else n = vals.filter(v=>String(v==null?'':v).trim()!=='').length;
      out = fmtNum(n);
    }
    return {ico:c.icon||'📌', label:c.label||c.columnLabel||'كرت', value:out, tone:c.tone||''};
  });
}
/* ===== منتقي شهر/سنة بشكل تقويم بألوان البرنامج ===== */
const MP_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function monthPickerHtml(id, year, month){
  return `<div class="mp" id="${id}" data-year="${year}" data-month="${month}">
    <button type="button" class="mp-btn" aria-haspopup="true"><span class="mp-label">${MP_MONTHS[month-1]} ${year}</span><span class="mp-caret">🗓️</span></button>
    <div class="mp-pop" hidden></div>
    <input type="hidden" id="${id}Year" value="${year}"><input type="hidden" id="${id}Month" value="${month}">
  </div>`;
}
function bindMonthPicker(id, onChange){
  const root = document.getElementById(id); if(!root) return;
  const pop = root.querySelector('.mp-pop'), btn = root.querySelector('.mp-btn');
  let vy = Number(root.dataset.year), mode = 'months', yBase = vy - (vy % 12);
  const cy = Number(root.dataset.year), cm = Number(root.dataset.month);
  const now = new Date();
  function draw(){
    if(mode==='months'){
      pop.innerHTML = `<div class="mp-head"><button type="button" class="mp-nav" data-d="-1" title="السنة السابقة">▲</button><button type="button" class="mp-title" data-mode="years">${vy} ▾</button><button type="button" class="mp-nav" data-d="1" title="السنة التالية">▼</button></div>
        <div class="mp-grid">${MP_MONTHS.map((n,i)=>`<button type="button" class="mp-cell${(vy===cy&&i+1===cm)?' is-sel':''}${(vy===now.getFullYear()&&i===now.getMonth())?' is-now':''}" data-m="${i+1}">${n}</button>`).join('')}</div>
        <div class="mp-foot"><button type="button" class="mp-link" data-act="today">هذا الشهر</button></div>`;
    } else {
      pop.innerHTML = `<div class="mp-head"><button type="button" class="mp-nav" data-yd="-12" title="سنوات سابقة">▲</button><span class="mp-title static">${yBase} – ${yBase+11}</span><button type="button" class="mp-nav" data-yd="12" title="سنوات لاحقة">▼</button></div>
        <div class="mp-grid">${Array.from({length:12},(_,i)=>yBase+i).map(yy=>`<button type="button" class="mp-cell${yy===cy?' is-sel':''}${yy===now.getFullYear()?' is-now':''}" data-y="${yy}">${yy}</button>`).join('')}</div>`;
    }
  }
  function open(){ vy = cy; mode='months'; draw(); pop.hidden = false; root.classList.add('is-open'); }
  function close(){ pop.hidden = true; root.classList.remove('is-open'); }
  function pick(y,m){ close(); if(typeof onChange==='function') onChange(y,m); }
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); pop.hidden ? open() : close(); });
  pop.addEventListener('click', (e)=>{
    e.stopPropagation();
    const t = e.target.closest('button'); if(!t) return;
    if(t.dataset.d){ vy += Number(t.dataset.d); draw(); }
    else if(t.dataset.mode==='years'){ mode='years'; yBase = vy - (vy % 12); draw(); }
    else if(t.dataset.yd){ yBase += Number(t.dataset.yd); draw(); }
    else if(t.dataset.y){ vy = Number(t.dataset.y); mode='months'; draw(); }
    else if(t.dataset.m){ pick(vy, Number(t.dataset.m)); }
    else if(t.dataset.act==='today'){ pick(now.getFullYear(), now.getMonth()+1); }
  });
  const away = (e)=>{ if(!document.body.contains(root)){ document.removeEventListener('click', away); return; } if(!root.contains(e.target)) close(); };
  document.addEventListener('click', away);
}
function printDaysStatement(kind, personId, from, to){
  let person = null, title = '', code = '', wage = 0;
  let logs = [];
  if(kind==='worker'){
    person = getWorker(personId);
    if(!person){ showToast('العامل غير موجود'); return; }
    title = 'كشف أيام عامل';
    logs = (typeof workerAttendanceInRange==='function' ? workerAttendanceInRange(personId, from||undefined, to||undefined) : [])
      .slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  } else if(kind==='supervisor'){
    person = getSupervisor(personId);
    if(!person){ showToast('المشرف غير موجود'); return; }
    title = 'كشف أيام مشرف';
    logs = supervisorOwnAttendance(personId, from||undefined, to||undefined)
      .slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  } else if(kind==='driver'){
    person = typeof getDriver==='function' ? getDriver(personId) : (DATA.drivers||[]).find(d=>d.id===personId);
    if(!person){ showToast('السائق غير موجود'); return; }
    title = 'كشف أيام سائق';
    logs = (DATA.workerAttendance||[]).filter(a=>{
      if(attType(a)!=='driver' || attPersonId(a)!==personId) return false;
      if(from && (a.date||'')<from) return false;
      if(to && (a.date||'')>to) return false;
      return true;
    }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  } else {
    showToast('نوع غير مدعوم'); return;
  }
  code = person.code||'';
  wage = toInt(person.dailyWage);
  let totalDays = 0, totalNet = 0;
  const WD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const byProj = {};
  const rows = logs.map((a, i)=>{
    const days = typeof attendanceDaysCredit==='function' ? attendanceDaysCredit(a) : (Number(a.days)|| (a.status==='half'?0.5:a.status==='absent'?0:1));
    const dayWage = typeof attendanceDayWage==='function' ? attendanceDayWage(a, person) : toInt(a.dailyWage!=null?a.dailyWage:wage);
    const net = typeof attendanceNetPay==='function' ? attendanceNetPay(a, person) : toInt(Math.round(days*dayWage)-toInt(a.deduction));
    totalDays += Number(days)||0;
    totalNet += net;
    const site = String(a.project||a.site||a.location||'').trim() || 'غير محدد';
    const bp = byProj[site] = byProj[site] || { days:0, net:0, n:0 };
    bp.days += Number(days)||0; bp.net += net; bp.n++;
    let wd = ''; try{ const dt = parseLocalDate(a.date); if(dt) wd = WD[dt.getDay()]; }catch(e){}
    const multi = logs.filter(x=>x.date===a.date).length>1;
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${fmtDate(a.date)}</strong></td>
      <td>${wd}</td>
      <td><strong>${escapeHtml(site)}</strong></td>
      <td>${escapeHtml(labelOf(typeof ATTENDANCE_STATUS!=='undefined'?ATTENDANCE_STATUS:[], a.status)||a.status||'—')}${multi?' <b>⚑ أكثر من موقع</b>':''}</td>
      <td>${fmtDays(days)}</td>
      <td>${fmtMoney(dayWage)}</td>
      <td>${fmtMoney(toInt(a.deduction))}</td>
      <td>${fmtMoney(net)}</td>
    </tr>`;
  }).join('');
  totalDays = Math.round(totalDays*100)/100;
  totalNet = toInt(totalNet);
  const first = logs.length ? logs[0].date : '', lastD = logs.length ? logs[logs.length-1].date : '';
  const projRows = Object.keys(byProj).map(k=>`<tr><td>${escapeHtml(k)}</td><td>${byProj[k].n}</td><td>${fmtDays(Math.round(byProj[k].days*100)/100)}</td><td>${fmtMoney(toInt(byProj[k].net))}</td></tr>`).join('');
  const periodLine = `الفترة: ${from?fmtDate(from):(first?fmtDate(first):'الكل')} → ${to?fmtDate(to):(lastD?fmtDate(lastD):'الكل')}`;
  const wType = (kind==='worker' && typeof isTempWorkerRec==='function' && isTempWorkerRec(person)) ? 'عامل مؤقت' : (kind==='worker'?'عامل':kind==='supervisor'?'مشرف':'سائق');
  printHtml(`
    <div class="print-sheet">
      ${typeof statementHeaderHtml==='function'?statementHeaderHtml(title, periodLine):''}
      <table>
        <tr><th>الاسم</th><td>${escapeHtml(person.name||'')}</td><th>الكود</th><td>${escapeHtml(code)}</td></tr>
        <tr><th>النوع</th><td>${wType}</td><th>اليومية</th><td>${fmtMoney(wage)}</td></tr>
        <tr><th>أول يوم</th><td>${first?fmtDate(first):'—'}</td><th>آخر يوم</th><td>${lastD?fmtDate(lastD):'—'}</td></tr>
        <tr><th>عدد الأيام</th><td>${fmtDays(totalDays)}</td><th>إجمالي المستحق</th><td><strong>${fmtMoney(totalNet)}</strong></td></tr>
      </table>
      <h4 style="margin-top:18px;">تفصيل الأيام (التاريخ والموقع / المشروع)</h4>
      <table>
        <thead><tr><th>م</th><th>التاريخ</th><th>اليوم</th><th>الموقع / المشروع</th><th>الحالة</th><th>الأيام</th><th>اليومية</th><th>خصم</th><th>المستحق</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" style="text-align:center;">لا سجلات في الفترة</td></tr>'}</tbody>
        <tfoot>
          <tr><th colspan="5">الإجمالي</th><th>${fmtDays(totalDays)}</th><th></th><th></th><th>${fmtMoney(totalNet)}</th></tr>
        </tfoot>
      </table>
      ${projRows ? `<h4 style="margin-top:18px;">ملخص حسب الموقع / المشروع</h4><table><thead><tr><th>الموقع / المشروع</th><th>عدد السجلات</th><th>الأيام</th><th>المستحق</th></tr></thead><tbody>${projRows}</tbody></table>` : ''}
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, title, { statement:true, brand:false });
}


function printEmployeeStatement(employeeId, from, to){
  const e = typeof getEmployee==='function' ? getEmployee(employeeId) : (DATA.employees||[]).find(x=>x.id===employeeId);
  if(!e){ showToast('الموظف غير موجود'); return; }
  const atts = (DATA.attendance||[]).filter(a=>{
    if(a.employeeId!==employeeId) return false;
    if(from && (a.date||'')<from) return false;
    if(to && (a.date||'')>to) return false;
    return true;
  }).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  let workDays = 0;
  const absentDates = new Set();
  const attRows = atts.map(a=>{
    const st = String(a.status||'').toLowerCase();
    const days = typeof attendanceDaysCredit==='function' ? attendanceDaysCredit(a) : (st==='half'?0.5: (st==='absent'||st==='holiday'?0:1));
    if(st==='absent') absentDates.add(a.date||'');
    else workDays += Number(days)||0;
    return `<tr>
      <td>${fmtDate(a.date)}</td>
      <td>${escapeHtml(labelOf(typeof ATTENDANCE_STATUS!=='undefined'?ATTENDANCE_STATUS:[], a.status)||a.status||'—')}</td>
      <td>${fmtDays(days)}</td>
      <td>${escapeHtml(a.notes||'')}</td>
    </tr>`;
  }).join('');
  const pays = (DATA.payroll||[]).filter(p=>{
    if(p.employeeId!==employeeId) return false;
    if(from || to){
      const ym = (p.year!=null && p.month!=null) ? (String(p.year)+'-'+String(p.month).padStart(2,'0')) : '';
      if(ym){
        if(from && ym < String(from).slice(0,7)) return false;
        if(to && ym > String(to).slice(0,7)) return false;
      }
    }
    return true;
  });
  const payRows = pays.map(p=>`<tr>
    <td>${escapeHtml(String(p.month||''))}/${escapeHtml(String(p.year||''))}</td>
    <td>${fmtMoney(p.basicSalary)}</td>
    <td>${fmtMoney(p.allowances)}</td>
    <td>${fmtMoney(p.deductions)}</td>
    <td><strong>${fmtMoney(p.netSalary)}</strong></td>
  </tr>`).join('');
  const pens = (DATA.employeePenalties||[]).filter(p=>{
    if(p.employeeId!==employeeId) return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  });
  const penalty = pens.reduce((s,p)=>s+toInt(p.amount),0);
  const leaves = (DATA.leaves||[]).filter(l=>{
    if(l.employeeId!==employeeId) return false;
    // الإجازة تظهر لو بتتقاطع مع الفترة
    if(from && (l.to||l.from||'') < from) return false;
    if(to && (l.from||'') > to) return false;
    return true;
  });
  const leaveRows = leaves.map(l=>`<tr>
    <td>${escapeHtml(labelOf(typeof LEAVE_TYPES!=='undefined'?LEAVE_TYPES:[], l.type)||l.type||'')}</td>
    <td>${fmtDate(l.from)}</td>
    <td>${fmtDate(l.to)}</td>
    <td>${fmtNum(l.days)}</td>
    <td>${escapeHtml(labelOf(typeof LEAVE_STATUS!=='undefined'?LEAVE_STATUS:[], l.status)||l.status||'')}</td>
  </tr>`).join('');
  const absent = absentDates.size;
  const basePay = employeeDueAmount(employeeId, from||undefined, to||undefined);
  const extras = typeof personExtrasTotal==='function' ? personExtrasTotal('employee', employeeId, from||undefined, to||undefined) : 0;
  const paid = toInt((DATA.workerPayments||[]).filter(p=>{
    if(p.personType!=='employee' || p.personId!==employeeId) return false;
    if(typeof isActualPayment==='function' ? !isActualPayment(p) : (p.type==='penalty'||p.type==='deduction'||p.type==='bonus'||p.type==='allowance')) return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
  const penExtra = toInt((DATA.workerPayments||[]).filter(p=>{
    if(p.personType!=='employee' || p.personId!==employeeId) return false;
    if(p.type!=='penalty'&&p.type!=='deduction') return false;
    if(from && (p.date||'')<from) return false;
    if(to && (p.date||'')>to) return false;
    return true;
  }).reduce((s,p)=>s+toInt(p.amount),0));
  const penaltyAll = toInt(penalty + penExtra);
  const due = toInt(basePay + extras); // المستحق = راتب + إضافات
  const bal = toInt(due - paid - penaltyAll - (typeof personExpensesTotal==='function'?personExpensesTotal('employee', employeeId, from||undefined, to||undefined):0));
  const periodLine = `الفترة: ${from?fmtDate(from):'الكل'} → ${to?fmtDate(to):'الكل'}`;
  printHtml(`
    <div class="print-sheet">
      ${statementHeaderHtml(buildExportFileTitle('كشف حساب موظف', e.name, from, to), periodLine)}
      <table>
        <tr><th>الاسم</th><td>${escapeHtml(e.name||'')}</td><th>الكود</th><td>${escapeHtml(e.code||'')}</td></tr>
        <tr><th>القسم</th><td>${escapeHtml(typeof departmentName==='function'?departmentName(e.departmentId):'')}</td><th>الوظيفة</th><td>${escapeHtml(e.position||'—')}</td></tr>
        <tr><th>الراتب</th><td>${fmtMoney(basePay)}</td><th>أيام العمل</th><td>${fmtDays(workDays)}</td></tr>
        <tr><th>الغياب</th><td>${fmtNum(absent)}</td><th>بدلات ومكافآت</th><td>${fmtMoney(extras)}</td></tr>
        <tr><th>المستحق</th><td><strong>${fmtMoney(due)}</strong></td><th>خصم / جزاء</th><td>${fmtMoney(penaltyAll)}</td></tr>
        <tr><th>المدفوع</th><td>${fmtMoney(paid)}</td><th>المتبقي</th><td><strong>${fmtMoney(bal)}</strong></td></tr>
      </table>
      ${costsStatementBlock('employee', employeeId, from, to)}${typeof paymentsStatementBlock==='function'?paymentsStatementBlock('employee', employeeId, from, to):''}
      <h4 style="margin-top:16px;">الحضور</h4>
      <table>
        <thead><tr><th>التاريخ</th><th>الحالة</th><th>الأيام</th><th>ملاحظات</th></tr></thead>
        <tbody>${attRows || '<tr><td colspan="4" style="text-align:center;">لا سجلات</td></tr>'}</tbody>
      </table>
      <h4 style="margin-top:16px;">الإجازات</h4>
      <table>
        <thead><tr><th>النوع</th><th>من</th><th>إلى</th><th>أيام</th><th>الحالة</th></tr></thead>
        <tbody>${leaveRows || '<tr><td colspan="5" style="text-align:center;">لا إجازات</td></tr>'}</tbody>
      </table>
      ${statementFooterHtml()}
    </div>
  `, buildExportFileTitle('كشف حساب موظف', e.name, from, to), { statement:true, brand:false, periodLine: (from||to)?('الفترة: '+(from?fmtDate(from):'الكل')+' → '+(to?fmtDate(to):'الكل')):'' });
}

function printPayslip(payrollId){
  const p = (DATA.payroll||[]).find(x=>x.id===payrollId);
  if(!p){ showToast('السجل غير موجود'); return; }
  const e = getEmployee(p.employeeId);
  const co = DATA.settings||{};
  printHtml(`
    <div class="print-sheet">
      ${typeof statementHeaderHtml==='function'?statementHeaderHtml('كشف راتب', (p.month||'')+' / '+(p.year||'')):''}
      <table>
        <tr><th>الموظف</th><td>${escapeHtml(e?e.name:'—')}</td><th>الكود</th><td>${escapeHtml(e?e.code:'')}</td></tr>
        <tr><th>القسم</th><td>${escapeHtml(e?departmentName(e.departmentId):'')}</td><th>الوظيفة</th><td>${escapeHtml(e?e.position:'')}</td></tr>
        <tr><th>الشهر</th><td>${p.month}</td><th>السنة</th><td>${p.year}</td></tr>
        <tr><th>الأساسي</th><td>${fmtMoney(p.basicSalary)}</td><th>البدلات</th><td>${fmtMoney(p.allowances)}</td></tr>
        <tr><th>الخصومات</th><td>${fmtMoney(p.deductions)}</td><th>الصافي</th><td><strong>${fmtMoney(p.netSalary)}</strong></td></tr>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#666;">ملاحظات: ${escapeHtml(p.notes||'—')}</p>
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, 'كشف راتب', { statement:true, brand:false });
}

function printLeaveForm(leaveId){
  const l = (DATA.leaves||[]).find(x=>x.id===leaveId);
  if(!l){ showToast('السجل غير موجود'); return; }
  const kind = l.personKind || l.kind || 'employee';
  const pid = l.personId || l.employeeId || '';
  let name = '—', dept = '', job = '';
  try{
    if(kind==='worker'){ const w=typeof getWorker==='function'?getWorker(pid):null; name=w?w.name:'—'; job=w?(w.skill||w.position||w.jobTitle||w.job||''):''; dept=w&&typeof departmentName==='function'?departmentName(w.departmentId||w.categoryId):''; }
    else if(kind==='supervisor'){ const s=typeof getSupervisor==='function'?getSupervisor(pid):null; name=s?s.name:'—'; job=s?(s.skill||s.position||s.jobTitle||s.job||''):''; }
    else if(kind==='driver'){ const d=typeof getDriver==='function'?getDriver(pid):(DATA.drivers||[]).find(x=>x.id===pid); name=d?d.name:'—'; job=d?(d.position||d.jobTitle||d.job||''):''; }
    else { const e=typeof getEmployee==='function'?getEmployee(pid||l.employeeId):null; name=e?e.name:'—'; job=e?(e.position||e.jobTitle||e.job||''):''; dept=e&&typeof departmentName==='function'?departmentName(e.departmentId):''; }
  }catch(_e){}
  const kindLab = ({employee:'موظف',worker:'عامل',supervisor:'مشرف',driver:'سائق'})[kind]||'موظف';
  const stKey = l.status||'pending';
  const stLab = labelOf(LEAVE_STATUS,stKey);
  const stCol = stKey==='approved'?'#1B4332':stKey==='rejected'?'#c1121f':'#b07d00';
  const no = 'LV-' + String(l.id||'').replace(/[^A-Za-z0-9]/g,'').slice(-6).toUpperCase();
  const cell=(k,v)=>`<div class="lvp-cell"><span class="lvp-k">${k}</span><span class="lvp-v">${v}</span></div>`;
  const sign=t=>`<div class="lvp-sign"><div class="lvp-line"></div><div>${t}</div></div>`;
  printHtml(`
    <style>
      .lvp{border:2px solid #1B4332;border-radius:10px;padding:10px 14px;font-family:inherit;}
      .lvp-top{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1B4332;padding-bottom:6px;margin-bottom:8px;}
      .lvp-title{font-size:20px;font-weight:800;color:#1B4332;}
      .lvp-meta{text-align:left;font-size:11.5px;line-height:1.6;}
      .lvp-badge{display:inline-block;padding:2px 14px;border:2px solid ${stCol};color:${stCol};border-radius:20px;font-weight:800;}
      .lvp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin-bottom:8px;}
      .lvp-cell{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dotted #999;padding:3px 2px;font-size:12.5px;}
      .lvp-k{color:#555;font-weight:700;flex:0 0 auto;}.lvp-v{font-weight:800;min-width:0;overflow-wrap:anywhere;word-break:break-word;text-align:left;white-space:normal;}.lvp-cell{min-width:0;}.lvp{overflow:hidden;}
      .lvp-wide{grid-column:1 / -1;}
      .lvp-period{display:flex;align-items:center;justify-content:space-around;background:#eef5f0;border-radius:8px;padding:7px;margin-bottom:8px;text-align:center;}
      .lvp-period b{display:block;font-size:14px;color:#1B4332;}.lvp-period small{color:#555;}
      .lvp-days{font-size:22px;font-weight:800;color:#1B4332;}
      .lvp-signs{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:18px;text-align:center;font-size:13px;}
      .lvp-line{border-top:1px solid #333;margin-bottom:6px;height:22px;}
      .lvp-note{margin-top:14px;font-size:11.5px;color:#666;text-align:center;}
    </style>
    <div class="print-sheet" style="max-width:560px;margin:0 auto;">
      ${typeof statementHeaderHtml==='function'?statementHeaderHtml('إذن إجازة', ''):''}
      <div class="lvp">
        <div class="lvp-top">
          <div class="lvp-title">إذن إجازة</div>
          <div class="lvp-meta">رقم الإذن: <b>${escapeHtml(no)}</b><br>تاريخ الطلب: ${fmtDate(l.createdAt||l.requestDate||l.from)}<br>الحالة: <span class="lvp-badge">${escapeHtml(stLab)}</span></div>
        </div>
        <div class="lvp-grid">
          ${cell('مقدم الطلب',escapeHtml(name))}${cell('الوظيفة',escapeHtml(job||kindLab))}
          ${cell('القسم',escapeHtml(dept||'—'))}${cell('الفئة',escapeHtml(kindLab))}
          ${cell('نوع الإجازة',escapeHtml(labelOf(LEAVE_TYPES,l.type)||'—'))}
          <div class="lvp-cell lvp-wide"><span class="lvp-k">السبب</span><span class="lvp-v">${escapeHtml(l.reason||'—')}</span></div>
        </div>
        <div class="lvp-period">
          <div><small>من تاريخ</small><b>${fmtDate(l.from)}</b></div>
          <div><span class="lvp-days">${Number(l.days)||0}</span><br><small>يوم</small></div>
          <div><small>إلى تاريخ</small><b>${fmtDate(l.to)}</b></div>
        </div>
        <div class="lvp-signs">${sign('توقيع الموظف / المستلم')}${sign('المدير المباشر')}${sign('الموارد البشرية / الاعتماد')}</div>
        <div class="lvp-note">يُعتبر هذا الإذن سارياً بعد اعتماده من الجهات المختصة.</div>
      </div>
      ${typeof statementFooterHtml==='function'?statementFooterHtml():''}
    </div>
  `, 'إذن إجازة', { statement:true, brand:false });
}
/* ---- Auto codes (unique) ---- */
function nextCode(prefix, list, field){
  field = field || 'code';
  const used = new Set();
  let max = 0;
  const pre = String(prefix).toUpperCase();
  (list||[]).forEach(item=>{
    const c = String(item[field]||'').trim().toUpperCase();
    if(!c) return;
    used.add(c);
    if(c.startsWith(pre)){
      const rest = c.slice(pre.length).replace(/^[-_\s]+/, '');
      const num = parseInt(rest, 10);
      if(Number.isFinite(num) && num > max) max = num;
    } else {
      // also track pure numbers
      const num = parseInt(c.replace(/\D/g,''), 10);
      if(Number.isFinite(num) && num > max) max = num;
    }
  });
  let n = max + 1;
  let code;
  do {
    code = pre + String(n).padStart(3, '0');
    n++;
  } while(used.has(code));
  return code;
}
function nextEmployeeCode(){ return nextCode('EMP-', DATA.employees||[]); }
function nextWorkerCode(){ return nextCode('WRK-', DATA.workers||[]); }

/* ---- يومية المعدات ---- */
function getEquipmentDailyLogs(equipmentId, from, to){
  return (DATA.equipmentDaily||[]).filter(d=>{
    if(equipmentId && d.equipmentId !== equipmentId) return false;
    if(from && (d.date||'') < from) return false;
    if(to && (d.date||'') > to) return false;
    return true;
  }).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
/** تكلفة يومية معدة: (أيام × سعر اليومية) + (ساعات × تكلفة الساعة) + وقود + إضافي */
/** DEC-0140 (8.7.6): تكلفة يومية المعدة بالحساب الجديد — نفس newCost في السيرفر (server/src/equipment/equipment-rules.ts).
 *  التوقف بنسبة settings.equipmentIdlePercent (افتراضي 50%)، والنقل بتكلفته (moveCost)، والتكلفة الإضافية محسوبة. بيشتغل بس مع settings.newDayPay. */
function equipmentIdlePercent(){ try{ const v = DATA && DATA.settings && DATA.settings.equipmentIdlePercent; return v !== undefined && Number(v) >= 0 ? Number(v) : 50; }catch(_e){ return 50; } }
function equipmentDailyCostNew(log, eq){
  if(!log) return 0;
  eq = eq || (typeof getEquipment==='function' ? getEquipment(log.equipmentId) : null);
  const r2 = (x) => Number((Math.round(Number(x) * 1e6) / 1e6).toFixed(6)); // نفس Money.round() في السيرفر (6 خانات)
  const kind = String(log.kind || 'work');
  let days = Number(log.days); if(!Number.isFinite(days) || days < 0) days = 0;
  let hours = Number(log.hours); if(!Number.isFinite(hours) || hours < 0) hours = 0;
  const recorded = (log.cost != null && log.cost !== '' && Number.isFinite(Number(log.cost))) ? Number(log.cost) : null;
  const dailyRate = toInt(log.dailyCost != null ? log.dailyCost : (eq && eq.dailyCost));
  const hourRate = toInt(log.hourlyCost != null ? log.hourlyCost : (eq && (eq.hourlyCost||eq.hourRate)));
  let base = 0;
  if(kind === 'move') base = Number(log.moveCost) > 0 ? Number(log.moveCost) : (recorded != null ? recorded : 0);
  else {
    if(recorded != null) base = recorded;
    else if(days > 0 && dailyRate > 0) base = days * dailyRate;
    else if(hours > 0 && hourRate > 0) base = hours * hourRate;
    else if(days > 0 && hourRate > 0) base = days * 8 * hourRate;
    else if(hours > 0 && dailyRate > 0) base = hours * dailyRate / 8;
    if(kind === 'idle') base = base * equipmentIdlePercent() / 100;
  }
  let total = r2(base);
  const fuel = Number(log.fuelLiters)||0;
  const fuelPrice = toInt(log.fuelPrice != null && log.fuelPrice !== '' ? log.fuelPrice : (eq && (eq.fuelPrice != null && eq.fuelPrice !== '' ? eq.fuelPrice : eq.fuelPricePerLiter)));
  if(!(recorded != null && kind !== 'move') && fuel > 0 && fuelPrice > 0) total = r2(total + r2(fuel * fuelPrice));
  return r2(total + toInt(log.extraCost));
}
function equipmentDailyCost(log, eq){
  if(!log) return 0;
  if(newDayPayOn()) return equipmentDailyCostNew(log, eq);
  eq = eq || (typeof getEquipment==='function' ? getEquipment(log.equipmentId) : null);
  let days = Number(log.days);
  if(!Number.isFinite(days) || days < 0) days = 0;
  let hours = Number(log.hours);
  if(!Number.isFinite(hours) || hours < 0) hours = 0;
  // أولوية: تكلفة مسجّلة على السجل
  if(log.cost != null && log.cost !== '' && Number.isFinite(Number(log.cost)))
    return toInt(log.cost);
  const dailyRate = toInt(log.dailyCost != null ? log.dailyCost : (eq && eq.dailyCost));
  const hourRate = toInt(log.hourlyCost != null ? log.hourlyCost : (eq && (eq.hourlyCost||eq.hourRate)));
  let total = 0;
  if(days > 0 && dailyRate > 0) total += round2(days * dailyRate);
  else if(hours > 0 && hourRate > 0) total += round2(hours * hourRate);
  else if(days > 0 && hourRate > 0) total += round2(days * 8 * hourRate); // تقدير 8 ساعات/يوم
  else if(hours > 0 && dailyRate > 0) total += round2((hours/8) * dailyRate);
  // وقود إن وُجدت تكلفة لتر (من اليومية، وإلا من سعر اللتر المسجل على المعدة)
  const fuel = Number(log.fuelLiters)||0;
  const fuelPrice = toInt(log.fuelPrice != null && log.fuelPrice !== '' ? log.fuelPrice : (eq && (eq.fuelPrice != null && eq.fuelPrice !== '' ? eq.fuelPrice : eq.fuelPricePerLiter)));
  if(fuel > 0 && fuelPrice > 0) total += round2(fuel * fuelPrice);
  return toInt(total);
}
function equipmentTotalHours(equipmentId, from, to){
  return getEquipmentDailyLogs(equipmentId, from, to).reduce((s,d)=>s+(Number(d.hours)||0),0);
}
function equipmentTotalCost(equipmentId, from, to){
  const eq = getEquipment(equipmentId);
  return toInt(getEquipmentDailyLogs(equipmentId, from, to).reduce((s,d)=>s+equipmentDailyCost(d, eq),0));
}
function equipmentTotalFuel(equipmentId, from, to){
  return getEquipmentDailyLogs(equipmentId, from, to).reduce((s,d)=>s+(Number(d.fuelLiters)||0),0);
}
/* ---- تكاليف المشروع والموارد ---- */
function getProjectByName(name){
  name = String(name||'').trim();
  return (DATA.projects||[]).find(p=>String(p.name||'').trim()===name) || null;
}
function projectCostSummary(projectName, from, to){
  const name = String(projectName||'').trim();
  let labor = 0, equip = 0, fuel = 0, advances = 0, maint = 0;
  // عمال: من حضور مرتبط بالمشروع أو يومية مشروع
  (DATA.workerAttendance||[]).forEach(a=>{
    if(String(a.project||'').trim()!==name) return;
    if(from && (a.date||'')<from) return;
    if(to && (a.date||'')>to) return;
    labor += attendanceNetPay(a);
  });
  // يومية معدات
  (DATA.equipmentDaily||[]).forEach(d=>{
    if(String(d.project||'').trim()!==name) return;
    if(from && (d.date||'')<from) return;
    if(to && (d.date||'')>to) return;
    equip += equipmentDailyCost(d, getEquipment(d.equipmentId));
  });
  // وقود مستقل
  (DATA.fuelLogs||[]).forEach(f=>{
    if(String(f.project||'').trim()!==name) return;
    if(from && (f.date||'')<from) return;
    if(to && (f.date||'')>to) return;
    fuel += toInt(f.cost);
  });
  // سلف/خصومات عمال على المشروع تقريبياً عبر ملاحظات أو نتخطى
  // صيانة معدات على المشروع
  (DATA.equipmentLogs||[]).forEach(l=>{
    if(String(l.project||'').trim()!==name) return;
    if(from && (l.date||'')<from) return;
    if(to && (l.date||'')>to) return;
    maint += toInt(l.cost);
  });
  // يومية مشروع ذكية إن وُجدت
  (DATA.projectDaily||[]).forEach(pd=>{
    if(String(pd.project||'').trim()!==name) return;
    if(from && (pd.date||'')<from) return;
    if(to && (pd.date||'')>to) return;
    labor += toInt(pd.laborCost);
    equip += toInt(pd.equipCost);
    fuel += toInt(pd.fuelCost);
  });
  // مصروفات وتكاليف مربوطة بالمشروع
  let expenses = 0, costsAmt = 0;
  // DEC-0142 (8.8.6): بمفتاح الحساب الجديد، المصروف بكل سطوره (تصليح F-10) — نفس expenseAmount في السيرفر
  const newCost = newDayPayOn();
  (DATA.expenses||[]).forEach(e=>{
    if(!e || String(e.project||'').trim()!==name) return;
    if(from && (e.date||'')<from) return;
    if(to && (e.date||'')>to) return;
    expenses += (newCost && Array.isArray(e.lines) && e.lines.length) ? e.lines.reduce((s,l)=>s+toInt(l && l.amount),0) : toInt(e.amount);
  });
  (DATA.costs||[]).forEach(c=>{
    if(!c || String(c.project||'').trim()!==name) return;
    if(from && (c.date||'')<from) return;
    if(to && (c.date||'')>to) return;
    costsAmt += toInt(c.amount);
  });
  labor = toInt(labor); equip = toInt(equip); fuel = toInt(fuel); maint = toInt(maint); expenses = toInt(expenses); costsAmt = toInt(costsAmt);
  // موردين + صرف مخازن (من محرك واحد: projectSupplyCostLines) — مفيش حساب مزدوج
  let suppliers = 0, warehouse = 0;
  try{ projectSupplyCostLines(name, from, to).forEach(function(l){ if(l.source === 'supplier') suppliers += l.amount; else warehouse += l.amount; }); }catch(_e){}
  suppliers = toInt(suppliers); warehouse = toInt(warehouse);
  const total = toInt(labor + equip + fuel + maint + advances + expenses + costsAmt + suppliers + warehouse);
  const proj = getProjectByName(name);
  const budget = toInt(proj && proj.budget);
  let budgetStatus = 'none';
  if(budget > 0){
    const ratio = total / budget;
    if(ratio < 0.85) budgetStatus = 'ok';
    else if(ratio <= 1) budgetStatus = 'warn';
    else budgetStatus = 'over';
  }
  return { labor, equip, fuel, maint, advances, expenses, costs: costsAmt, suppliers, warehouse, total, budget, budgetStatus };
}

/** بنود تكلفة التوريد على مشروع (مصدر واحد للأرقام والعرض):
 *  - فاتورة مورد مربوطة بالمشروع وغير مربوطة بإضافة مخزن → تُحسب وقت الفاتورة (الإجمالي بعد المرتجعات، شامل المستقطع).
 *  - فاتورة مورد داخلة المخزن (حركة وارد بـ supplierInvoiceId) → لا تُحسب عند الفاتورة، والتكلفة تتحمّل وقت الصرف للمشروع.
 *  - صرف من المخزن لمشروع → كمية × تكلفة الصرف (unitCost المسجّلة وقت الصرف، وإلا متوسط التكلفة الحالي).
 *  - دفعات الموردين تسوية مش تكلفة. */
function projectSupplyCostLines(projectName, from, to){
  const name = String(projectName||'').trim();
  const out = [];
  if(!name) return out;
  const inRange = d => !((from && (d||'') < from) || (to && (d||'') > to));
  const L = DATA.ledger || {};
  const wh = (DATA.warehouses && DATA.warehouses.movements) || [];
  const stocked = {};
  wh.forEach(m => { if(m && (m.type==='in'||m.type==='adjust_in') && m.supplierInvoiceId) stocked[m.supplierInvoiceId] = true; });
  (L.invoices||[]).forEach(inv => {
    if(!inv || inv.cancelled || String(inv.project||'').trim() !== name || stocked[inv.id] || !inRange(inv.date)) return;
    // DEC-0142 (8.8.6): بمفتاح الحساب الجديد، الفاتورة بالصافي بعد الخصم (تصليح F-11)، والقديمة من غير صافي بإجماليها
    const useNet = newDayPayOn() && inv.netInvoice != null && inv.netInvoice !== '' && Number.isFinite(Number(inv.netInvoice));
    const amt = (inv.isReturn ? -1 : 1) * (useNet ? Number(inv.netInvoice) : Number(inv.totalInvoice||0));
    const sup = (L.suppliers||[]).find(s => s.id === inv.supplierId);
    out.push({ source:'supplier', date: inv.date||'', ref: inv.invoiceNo||inv.id, party: sup?sup.name:'', desc: inv.isReturn?'مرتجع مورد':'فاتورة مورد', amount: amt, recordId: inv.id });
  });
  const items = (DATA.warehouses && DATA.warehouses.items) || [];
  wh.forEach(m => {
    if(!m || m.type !== 'out' || String(m.project||'').trim() !== name || !inRange(m.date)) return;
    const it = items.find(x => x.id === m.itemId) || {};
    const unit = (m.unitCost != null && m.unitCost !== '') ? Number(m.unitCost) : (Number(it.avgCost) || Number(it.lastCost) || 0);
    out.push({ source:'warehouse', date: m.date||'', ref: m.id, party: it.name||'', desc: 'صرف مخزني', qty: Number(m.qty)||0, unit: unit, amount: Math.round((Number(m.qty)||0) * unit * 100) / 100, recordId: m.id });
  });
  return out;
}
function resourcesOnProject(projectName){
  const name = String(projectName||'').trim();
  if(!name) return { workers:[], equipment:[], drivers:[], employees:[], supervisors:[] };
  const match = (p)=> String(p||'').trim()===name;
  const workers = (DATA.workers||[]).filter(w=>(w.status!=='inactive') && match(w.project));
  const equipment = (DATA.equipment||[]).filter(eq=>{
    if((eq.status||'')==='retired') return false;
    return match(eq.project);
  });
  const drivers = (DATA.drivers||[]).filter(d=>(d.status!=='inactive') && match(d.project));
  const employees = (DATA.employees||[]).filter(e=>(e.status!=='inactive') && match(e.project));
  const supervisors = (DATA.supervisors||[]).filter(s=>(s.status!=='inactive') && match(s.project));
  // مشرفون مرتبطون بعمال على المشروع (حتى لو حقل المشروع فارغ عند المشرف)
  const supIdsFromWorkers = new Set(workers.map(w=>w.supervisorId).filter(Boolean));
  (DATA.supervisors||[]).forEach(s=>{
    if(s.status==='inactive') return;
    if(supIdsFromWorkers.has(s.id) && !supervisors.some(x=>x.id===s.id))
      supervisors.push(s);
  });
  return { workers, equipment, drivers, employees, supervisors };
}
function activeWorkersCount(){ return (DATA.workers||[]).filter(w=>w.status==='active').length; }
function nextDriverCode(){ return nextCode('DRV-', DATA.drivers||[]); }
function getDriver(id){ return (DATA.drivers||[]).find(d=>d.id===id); }
function driverName(id){ const d=getDriver(id); return d?d.name:''; }
function driverOptions(selected){
  return selectOptions(sortByNameAr(DATA.drivers||[],d=>d.name).map(d=>({id:d.id,name:d.name+(d.code?' ('+d.code+')':'')})), selected, '— اختر سائق —');
}


function nextEquipmentCode(){ return nextCode('EQ-', DATA.equipment||[]); }
function nextProjectCode(){ return nextCode('PRJ-', DATA.projects||[]); }

/* ========== منع التكرار — أشخاص ومعدات ========== */
function normalizeNid(v){
  return String(v||'').replace(/\D/g,'');
}
function normalizePhoneNum(v){
  let s = String(v||'').replace(/\D/g,'');
  if(s.startsWith('002')) s = s.slice(3);
  if(s.startsWith('20') && s.length>=11) s = s.slice(2);
  if(s.startsWith('0') && s.length===11) return s;
  if(s.length===10) return '0'+s;
  return s;
}
function normalizePlateNo(v){
  return String(v||'').replace(/[\s\-_.]/g,'').toUpperCase();
}
function entityListForKind(kind){
  if(kind==='employee' || kind==='employees') return DATA.employees||[];
  if(kind==='worker' || kind==='workers') return DATA.workers||[];
  if(kind==='supervisor' || kind==='supervisors') return DATA.supervisors||[];
  if(kind==='driver' || kind==='drivers') return DATA.drivers||[];
  if(kind==='equipment') return DATA.equipment||[];
  return [];
}
/**
 * يبحث عن سجلات مكررة.
 * يرجع مصفوفة: { id, name, code, strength:'hard'|'soft', reasons:[], kind }
 */
function findEntityDuplicates(kind, data, excludeId){
  data = data||{};
  const list = entityListForKind(kind);
  const out = [];
  const nid = normalizeNid(data.nationalId || data.idNumber || data.nid);
  const phone = normalizePhoneNum(data.phone || data.mobile);
  const name = normalizePersonName(data.name);
  const plate = normalizePlateNo(data.vehicleNumber || data.plate || data.plateNumber);
  const chassis = normalizePlateNo(data.chassisNumber || data.chassis || data.serialNumber);
  const code = String(data.code||'').trim().toUpperCase();

  list.forEach(rec=>{
    if(!rec || (excludeId && rec.id===excludeId)) return;
    const reasons = [];
    let strength = null;

    if(kind==='equipment'){
      const rPlate = normalizePlateNo(rec.vehicleNumber || rec.plate || rec.plateNumber);
      const rChassis = normalizePlateNo(rec.chassisNumber || rec.chassis || rec.serialNumber);
      const rName = normalizePersonName(rec.name || rec.typeLabel || '');
      const rCode = String(rec.code||'').trim().toUpperCase();
      if(plate && rPlate && plate===rPlate){ reasons.push('رقم اللوحة متطابق'); strength = 'hard'; }
      if(chassis && rChassis && chassis===rChassis){ reasons.push('رقم الشاسيه متطابق'); strength = 'hard'; }
      if(code && rCode && code===rCode){ reasons.push('الكود متطابق'); strength = 'hard'; }
      if(name && rName && name===rName){
        reasons.push('الاسم/الوصف متطابق');
        if(!strength) strength = 'soft';
      }
    } else {
      const rNid = normalizeNid(rec.nationalId || rec.idNumber || rec.nid);
      const rPhone = normalizePhoneNum(rec.phone || rec.mobile);
      const rName = normalizePersonName(rec.name);
      const rCode = String(rec.code||'').trim().toUpperCase();
      if(nid && rNid && nid===rNid){ reasons.push('الرقم القومي متطابق'); strength = 'hard'; }
      if(code && rCode && code===rCode){ reasons.push('الكود متطابق'); strength = 'hard'; }
      if(name && rName && name===rName && phone && rPhone && phone===rPhone){
        reasons.push('الاسم ورقم الهاتف متطابقان');
        strength = 'hard';
      } else if(name && rName && name===rName){
        reasons.push('الاسم متطابق');
        if(!strength) strength = 'soft';
      } else if(phone && rPhone && phone===rPhone && phone.length>=10){
        reasons.push('رقم الهاتف متطابق');
        if(!strength) strength = 'soft';
      }
    }
    if(strength && reasons.length){
      out.push({
        id: rec.id,
        name: rec.name || rec.code || rec.vehicleNumber || rec.plate || '—',
        code: rec.code || '',
        strength,
        reasons,
        kind
      });
    }
  });

  // فحص الرقم القومي عبر الأنواع الأخرى (تحذير ناعم فقط)
  if(kind!=='equipment' && nid && nid.length>=10){
    const crossKinds = ['employee','worker','supervisor','driver'].filter(k=>k!==kind && k!==kind+'s');
    const map = {employee:'موظفين',worker:'عمال',supervisor:'مشرفين',driver:'سائقين'};
    crossKinds.forEach(k=>{
      (entityListForKind(k)||[]).forEach(rec=>{
        if(!rec || (excludeId && rec.id===excludeId)) return;
        if(normalizeNid(rec.nationalId||rec.idNumber)===nid){
          out.push({
            id: rec.id, name: rec.name||rec.code||'—', code: rec.code||'',
            strength: 'soft',
            reasons: ['نفس الرقم القومي مسجّل في '+ (map[k]||k)],
            kind: k
          });
        }
      });
    });
  }

  // ترتيب: hard أولاً
  out.sort((a,b)=> (a.strength===b.strength?0:(a.strength==='hard'?-1:1)));
  return out;
}

/**
 * يمنع الحفظ عند التكرار الصارم، ويسأل عند التشابه الناعم.
 * يرجع Promise<boolean> — true = يُسمح بالحفظ
 */
function guardEntityDuplicates(kind, data, excludeId){
  return new Promise((resolve)=>{
    let matches = [];
    try{ matches = findEntityDuplicates(kind, data, excludeId)||[]; }catch(e){ console.error(e); resolve(true); return; }
    if(!matches.length){ resolve(true); return; }
    const hard = matches.filter(m=>m.strength==='hard');
    const soft = matches.filter(m=>m.strength==='soft');
    const kindLab = {employee:'موظف',worker:'عامل',supervisor:'مشرف',driver:'سائق',equipment:'معدة/مركبة'};
    const rows = matches.map(m=>`
      <tr>
        <td>${escapeHtml(m.code||'—')}</td>
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td>${escapeHtml((kindLab[m.kind]||m.kind||'')+'')}</td>
        <td>${escapeHtml((m.reasons||[]).join(' · '))}</td>
        <td><span class="badge badge-${m.strength==='hard'?'err':'warn'}">${m.strength==='hard'?'تكرار مؤكد':'تشابه'}</span></td>
        <td><button type="button" class="btn btn-outline btn-sm btn-dup-open" data-kind="${escapeHtml(m.kind)}" data-id="${escapeHtml(m.id)}">عرض</button></td>
      </tr>`).join('');

    const title = hard.length
      ? '⚠️ لا يمكن الإضافة — يوجد سجل مطابق'
      : '⚠️ يوجد سجلات متشابهة';
    const msg = hard.length
      ? 'تم العثور على سجل بنفس البيانات الأساسية. عدّل السجل الحالي بدل إضافة مكرر.'
      : 'يوجد تشابه مع سجلات موجودة. راجعها قبل الحفظ أو أكّد الحفظ إذا كنت متأكداً أنها مختلفة.';

    const footer = hard.length
      ? `<button type="button" class="btn btn-outline" id="btnDupCancel">إغلاق</button>`
      : `<button type="button" class="btn btn-outline" id="btnDupCancel">إلغاء</button>
         <button type="button" class="btn btn-primary" id="btnDupForce">حفظ على أي حال</button>`;

    // استخدم sub-modal لو فيه مودال مفتوح
    const openFn = (typeof openSubModal==='function' && document.getElementById('appModal')) ? openSubModal : openModal;
    openFn(`
      <div class="modal-header"><h3>${title}</h3>
        <button type="button" class="modal-close" id="btnDupX">×</button>
      </div>
      <div class="modal-body">
        <p style="margin:0 0 12px;color:var(--ink-soft);">${msg}</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>الكود</th><th>الاسم</th><th>النوع</th><th>سبب التطابق</th><th>القوة</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">${footer}</div>
    `);

    const root = document.getElementById('appSubModal') || document.getElementById('appModal');
    const done = (ok)=>{
      if(document.getElementById('appSubModal') && typeof closeSubModal==='function') closeSubModal();
      else if(!document.getElementById('appSubModal') && typeof closeModal==='function'){ /* لا تغلق مودال الإضافة عند soft cancel فقط */ }
      if(hard.length || !ok){
        // hard دائماً يغلق تنبيه التكرار فقط
        if(document.getElementById('appSubModal') && typeof closeSubModal==='function') closeSubModal();
      } else if(ok && document.getElementById('appSubModal') && typeof closeSubModal==='function'){
        closeSubModal();
      }
      resolve(!!ok && !hard.length);
    };

    root?.querySelector('#btnDupCancel')?.addEventListener('click', ()=>{
      if(document.getElementById('appSubModal') && typeof closeSubModal==='function') closeSubModal();
      resolve(false);
    });
    root?.querySelector('#btnDupX')?.addEventListener('click', ()=>{
      if(document.getElementById('appSubModal') && typeof closeSubModal==='function') closeSubModal();
      resolve(false);
    });
    root?.querySelector('#btnDupForce')?.addEventListener('click', ()=>{
      if(document.getElementById('appSubModal') && typeof closeSubModal==='function') closeSubModal();
      resolve(true);
    });
    root?.querySelectorAll('.btn-dup-open').forEach(b=>{
      b.addEventListener('click', ()=>{
        const k = b.getAttribute('data-kind');
        const id = b.getAttribute('data-id');
        if(typeof openPersonDetailPage==='function' && k!=='equipment'){
          if(document.getElementById('appSubModal') && typeof closeSubModal==='function') closeSubModal();
          if(typeof closeModal==='function') closeModal();
          openPersonDetailPage(k, id);
        } else if(k==='equipment' && typeof openEquipmentModal==='function'){
          if(document.getElementById('appSubModal') && typeof closeSubModal==='function') closeSubModal();
          if(typeof closeModal==='function') closeModal();
          openEquipmentModal(id);
        } else {
          showToast('السجل: '+(id||''));
        }
        resolve(false);
      });
    });
  });
}

/** Ensure code unique; if empty or duplicate generate next. excludeId = record being edited */
function ensureUniqueCode(code, list, prefix, excludeId){
  code = String(code||'').trim();
  const used = new Set(
    (list||[]).filter(x=>x.id!==excludeId).map(x=>String(x.code||'').trim().toUpperCase()).filter(Boolean)
  );
  if(code && !used.has(code.toUpperCase())) return code;
  return nextCode(prefix, (list||[]).filter(x=>x.id!==excludeId));
}
/** Fill empty codes on existing data (once) */
function backfillMissingCodes(){
  let changed = false;
  (DATA.employees||[]).forEach(e=>{
    if(!String(e.code||'').trim()){
      e.code = nextEmployeeCode();
      // temporarily push so next calls see it
      changed = true;
    }
  });
  // re-unique employees that might share codes
  const empSeen = new Set();
  (DATA.employees||[]).forEach(e=>{
    const c = String(e.code||'').trim().toUpperCase();
    if(!c || empSeen.has(c)){
      e.code = nextCode('EMP-', (DATA.employees||[]).filter(x=>x.id!==e.id));
      changed = true;
    }
    empSeen.add(String(e.code||'').trim().toUpperCase());
  });
  const wrkSeen = new Set();
  (DATA.workers||[]).forEach(w=>{
    const c = String(w.code||'').trim().toUpperCase();
    if(!c || wrkSeen.has(c)){
      w.code = nextCode('WRK-', (DATA.workers||[]).filter(x=>x.id!==w.id));
      changed = true;
    }
    wrkSeen.add(String(w.code||'').trim().toUpperCase());
  });
  const eqSeen = new Set();
  (DATA.equipment||[]).forEach(eq=>{
    const c = String(eq.code||'').trim().toUpperCase();
    if(!c || eqSeen.has(c)){
      eq.code = nextCode('EQ-', (DATA.equipment||[]).filter(x=>x.id!==eq.id));
      changed = true;
    }
    eqSeen.add(String(eq.code||'').trim().toUpperCase());
  });
  return changed;
}

/** تنبيهات شاملة مربوطة بكل أجزاء البرنامج — للوحة المتابعة فقط */

/** الأوراق الناقصة لشخص — نفس منطق التنبيهات بالظبط (قائمة الإعدادات + ملف فعلي مرفوع) */
function missingRequiredDocs(kind, personId){
  let person = null;
  if(kind==='worker') person = getWorker(personId);
  else if(kind==='employee') person = getEmployee(personId);
  else if(kind==='supervisor') person = getSupervisor(personId);
  else if(kind==='driver') person = typeof getDriver==='function' ? getDriver(personId) : (DATA.drivers||[]).find(x=>x.id===personId);
  else if(kind==='equipment') person = typeof getEquipment==='function' ? getEquipment(personId) : (DATA.equipment||[]).find(x=>x.id===personId);
  if(!person) return [];
  if(kind==='worker' && typeof isTemporaryWorker==='function' && isTemporaryWorker(person)) return [];
  const dismissed = new Set((person.dismissedNotes||[]).map(x=>String(x).trim()));
  return personRequiredDocsList(kind).filter(doc=>{
    const has = kind==='equipment' ? equipmentHasDocHint(person, doc) : personHasDocHint(person, doc);
    return !has && !dismissed.has('ناقص: '+doc.label);
  });
}
function personMissingBasicData(person){
  if(!person) return ['السجل'];
  const miss = [];
  if(!(person.nationalId||'').trim()) miss.push('الرقم القومي');
  if(!(person.phone||'').trim()) miss.push('الهاتف');
  if(!(person.address||'').trim()) miss.push('العنوان');
  return miss;
}
/** شارة ⚠️ بجانب الاسم عند نقص بيانات أو أوراق */
/* إجازة سارية اليوم؟ (تُرفع العلامة تلقائياً بعد تاريخ نهاية الإجازة) */
function activeLeaveOf(kind, id, today){
  today = today || (typeof todayISO==='function' ? todayISO() : new Date().toISOString().slice(0,10));
  return (DATA.leaves||[]).find(l=> l && l.status==='approved'
    && (l.personKind||l.kind||'employee')===kind && (l.personId||l.employeeId)===id
    && (l.from||'')<=today && (!l.to || l.to>=today)) || null;
}
function leaveBadge(kind, person){
  if(!person) return '';
  const l = activeLeaveOf(kind, person.id); if(!l) return '';
  return ` <span class="leave-badge" title="في إجازة حتى ${escapeHtml(l.to||'—')}">🏖️ في إجازة${l.to?' حتى '+escapeHtml(fmtDate(l.to)):''}</span>`;
}
/** خلية الحالة: شارة + «حتى تاريخ» تحتها أثناء الإجازة */
function personStatusCellHtml(kind, p){
  const st = p.status || 'active';
  let label = labelOf(EMPLOYEE_STATUS, st);
  const cls = (st==='active'||st==='temporary') ? 'ok' : (st==='on_leave' ? 'warn' : 'err');
  return '<td><span class="badge badge-'+cls+'">'+escapeHtml(label)+'</span>'+leaveUntilHtml(kind, p)+'</td>';
}
/** «حتى تاريخ» أسفل حالة الشخص أثناء الإجازة */
function leaveUntilHtml(kind, person){
  if(!person) return '';
  const l = activeLeaveOf(kind, person.id); if(!l) return '';
  return '<div class="leave-until">🏖️ حتى '+(l.to?escapeHtml(fmtDate(l.to)):'—')+'</div>';
}
function personWarningBadge(kind, person){
  if(!person) return '';
  return _personWarningBadgeBase(kind, person);
}
function _personWarningBadgeBase(kind, person){
  if(!person) return '';
  const missData = personMissingBasicData(person);
  const missDocs = missingRequiredDocs(kind, person.id);
  if(!missData.length && !missDocs.length) return '';
  const tips = [];
  if(missData.length) tips.push('بيانات ناقصة: '+missData.join('، '));
  if(missDocs.length) tips.push('أوراق ناقصة: '+missDocs.map(d=>d.label).join('، '));
  const title = tips.join(' | ');
  return `<span class="doc-warn" title="${escapeHtml(title)}" style="cursor:help;font-size:14px;margin-inline-end:4px;" aria-label="ناقص">⚠️</span>`;
}
function countPeopleWithMissingDocs(){
  let n = 0;
  (DATA.workers||[]).forEach(w=>{ if(w.status!=='left' && (personMissingBasicData(w).length || missingRequiredDocs('worker',w.id).length)) n++; });
  (DATA.employees||[]).forEach(e=>{ if(e.status!=='left' && (personMissingBasicData(e).length || missingRequiredDocs('employee',e.id).length)) n++; });
  (DATA.supervisors||[]).forEach(s=>{ if(s.status!=='left' && (personMissingBasicData(s).length || missingRequiredDocs('supervisor',s.id).length)) n++; });
  (DATA.drivers||[]).forEach(d=>{ if(d.status!=='inactive' && (personMissingBasicData(d).length || missingRequiredDocs('driver',d.id).length)) n++; });
  (DATA.equipment||[]).forEach(eq=>{
    if(!eq || eq.status==='sold' || eq.status==='scrapped') return;
    const iss = typeof equipmentNotesIssues==='function' ? equipmentNotesIssues(eq) : [];
    if(iss.length) n++;
  });
  return n;
}


/** سلف مسجّلة ولم تُخصم بالكامل بعد */
function getOutstandingAdvances(){
  const list = [];
  const isAdvanceText = (s)=> /سلف/.test(String(s||''));
  const given = {}; // key personKind|personId -> {name, given, deducted, items}
  const bump = (kind, id, name, amount, meta)=>{
    const key = kind+'|'+id;
    if(!given[key]) given[key] = { kind, id, name: name||id, given:0, deducted:0, items:[] };
    given[key].given += toInt(amount);
    if(meta) given[key].items.push(meta);
  };
  const deduct = (kind, id, name, amount)=>{
    const key = kind+'|'+id;
    if(!given[key]) given[key] = { kind, id, name: name||id, given:0, deducted:0, items:[] };
    given[key].deducted += toInt(amount);
  };
  const personName = (kind, id)=>{
    try{
      if(kind==='employee' && typeof employeeName==='function') return employeeName(id);
      if(kind==='worker' && typeof workerName==='function') return workerName(id);
      if(kind==='supervisor' && typeof supervisorName==='function') return supervisorName(id);
      if(kind==='driver' && typeof driverName==='function') return driverName(id);
    }catch(_e){}
    return id;
  };
  (DATA.workerPayments||[]).forEach(p=>{
    const kind = p.personKind || p.kind || 'worker';
    const id = p.personId || p.workerId || p.employeeId || '';
    if(!id) return;
    const blob = [p.type, p.item, p.payCategory, p.category, p.notes, p.reason].join(' ');
    if(!isAdvanceText(blob)) return;
    const nm = personName(kind, id);
    if(/خصم/.test(blob) || p.type==='penalty' || p.type==='deduction'){
      deduct(kind, id, nm, p.amount);
    } else {
      bump(kind, id, nm, p.amount, { date:p.date, amount:toInt(p.amount), note:p.item||p.payCategory||p.notes||'سلفة' });
    }
  });
  (DATA.employeePenalties||[]).forEach(p=>{
    const kind = p.personKind || 'employee';
    const id = p.personId || p.employeeId || '';
    if(!id) return;
    const blob = [p.reason, p.type, p.notes, p.item].join(' ');
    if(!isAdvanceText(blob)) return;
    deduct(kind, id, personName(kind, id), p.amount);
  });
  Object.keys(given).forEach(k=>{
    const g = given[k];
    const rem = toInt(g.given - g.deducted);
    if(rem > 0){
      list.push({
        personKind: g.kind,
        personId: g.id,
        name: g.name,
        given: toInt(g.given),
        deducted: toInt(g.deducted),
        remaining: rem,
        items: g.items
      });
    }
  });
  list.sort((a,b)=> b.remaining - a.remaining);
  return list;
}


function collectSystemAlerts(){
  const alerts = [];
  const today = todayISO();
  const y = new Date().getFullYear(), m = new Date().getMonth()+1;
  const from = y+'-'+String(m).padStart(2,'0')+'-01';
  const lastDay = new Date(y, m, 0).getDate();
  const to = y+'-'+String(m).padStart(2,'0')+'-'+String(lastDay).padStart(2,'0');

  // ——— تنبيهات نظامية عامة (ليست مرتبطة بشخص واحد) ———
  const pending = (DATA.leaves||[]).filter(l=>l.status==='pending').length;
  if(pending) alerts.push({
    page:'leaves', icon:'⚠️', level:'warn', severity:'med', kind:'system', kindLabel:'نظام',
    msg: pending+' طلب إجازة بانتظار الموافقة',
    issues: [pending+' طلب بانتظار الموافقة']
  });

  // سلف لم تُخصم بعد
  try{
    const adv = typeof getOutstandingAdvances==='function' ? getOutstandingAdvances() : [];
    if(adv.length){
      const totalRem = toInt(adv.reduce((s,x)=>s+toInt(x.remaining),0));
      alerts.push({
        page:'workerDues', icon:'💳', level:'warn', severity:'high', kind:'system', kindLabel:'سلف',
        msg: adv.length+' سلفة لم تُخصم بالكامل — المتبقي '+fmtMoney(totalRem),
        issues: adv.slice(0,8).map(a=>(a.name||'')+': متبقي '+fmtMoney(a.remaining))
      });
    }
  }catch(_e){}

  let wBal=0;
  try{
    (DATA.workers||[]).forEach(w=>{ wBal += workerDueAmount(w.id,from,to)-workerPaidTotal(w.id,from,to)-(typeof workerPenaltyTotal==='function'?workerPenaltyTotal(w.id,from,to):0); });
    (DATA.drivers||[]).forEach(d=>{ if(typeof driverBalance==='function') wBal += driverBalance(d.id,from,to); });
  }catch(_e){}
  wBal = toInt(wBal);
  if(wBal>0) alerts.push({
    page:'workerDues', icon:'💰', level:'info', severity:'med', kind:'system', kindLabel:'نظام',
    msg: 'متبقي مستحقات عمال/سائقين هذا الشهر: '+fmtMoney(wBal),
    issues: ['صافي مستحقات الشهر: '+fmtMoney(wBal)]
  });

  // مصاريف الشهر
  try{
    let expM = 0;
    (DATA.expenses||[]).forEach(e=>{ if((e.date||'')>=from && (e.date||'')<=to) expM += toInt(e.amount); });
    (DATA.supervisorExpenses||[]).forEach(e=>{ if((e.date||'')>=from && (e.date||'')<=to) expM += toInt(e.amount); });
    expM = toInt(expM);
    if(expM>0) alerts.push({
      page:'expenses', icon:'🧾', level:'info', severity:'low', kind:'system', kindLabel:'مصاريف',
      msg: 'مصاريف هذا الشهر: '+fmtMoney(expM),
      issues: ['إجمالي المصاريف المسجّلة في الشهر']
    });
  }catch(_e){}

  // معدات تحتاج صيانة (موعد فات)
  try{
    const todayD = today;
    (DATA.equipment||[]).forEach(eq=>{
      const next = eq.nextMaintenance || eq.nextServiceDate;
      if(next && String(next) < todayD){
        // يُغطى عادة عبر equipmentNotesIssues في كروت الأفراد
      }
    });
  }catch(_e){}


  try{
    (DATA.projects||[]).forEach(p=>{
      if(typeof projectCostSummary!=='function') return;
      const c = projectCostSummary(p.name);
      if(c.budgetStatus==='over') alerts.push({
        page:'projects', icon:'🔴', level:'danger', severity:'high', kind:'system', kindLabel:'مشاريع',
        msg: 'تجاوز ميزانية: '+(p.name||''),
        issues: ['إجمالي '+fmtMoney(c.total)+' من ميزانية '+fmtMoney(c.budget)]
      });
      else if(c.budgetStatus==='warn') alerts.push({
        page:'projects', icon:'🟡', level:'warn', severity:'med', kind:'system', kindLabel:'مشاريع',
        msg: 'قرب نفاد ميزانية: '+(p.name||''),
        issues: ['إجمالي '+fmtMoney(c.total)+' من ميزانية '+fmtMoney(c.budget)]
      });
    });
  }catch(_e){}

  try{
    (DATA.projectPlans||[]).forEach(pl=>{
      if(typeof resourcesOnProject!=='function') return;
      const res = resourcesOnProject(pl.project);
      const need = toInt(pl.workersNeeded);
      if(need>0 && res.workers.length < need)
        alerts.push({
          page:'projects', icon:'🔴', level:'danger', severity:'high', kind:'system', kindLabel:'مشاريع',
          msg: 'عجز عمالة في خطة «'+(pl.project||'')+'»',
          issues: ['مطلوب '+need+' · متاح '+res.workers.length]
        });
    });
  }catch(_e){}

  const activeW = (DATA.workers||[]).filter(w=>w.status==='active').length;
  const wattToday = (DATA.workerAttendance||[]).filter(a=>a.date===today).length;
  if(activeW>0 && wattToday===0){
    const day = new Date().getDay();
    if(day!==5 && day!==6)
      alerts.push({
        page:'workerAttendance', icon:'📅', level:'info', severity:'med', kind:'system', kindLabel:'نظام',
        msg: 'لا حضور عمال/سائقين مسجّل اليوم',
        issues: ['لم يُسجَّل أي يومية اليوم']
      });
  }

  const perfMonth = (DATA.performanceReviews||[]).filter(r=>(r.date||'').startsWith(from.slice(0,7))).length;
  if(activeW>=5 && perfMonth===0)
    alerts.push({
      page:'performance', icon:'📊', level:'info', severity:'med', kind:'system', kindLabel:'نظام',
      msg: 'لا تقييمات أداء مسجّلة هذا الشهر',
      issues: ['يُفضَّل تسجيل تقييمات الأداء']
    });

  // استهلاك وقود شاذ لكل معدة
  const byEq = {};
  (DATA.fuelLogs||[]).forEach(f=>{
    if(!f.equipmentId) return;
    if(!byEq[f.equipmentId]) byEq[f.equipmentId]=[];
    byEq[f.equipmentId].push(f);
  });
  const fuelHighByEq = {};
  Object.keys(byEq).forEach(eid=>{
    const rates = byEq[eid].map(f=>{
      const hh=Number(f.hours)||0, l=Number(f.liters)||0;
      return hh>0?l/hh:null;
    }).filter(x=>x!=null);
    if(rates.length<2) return;
    const avg = rates.reduce((a,b)=>a+b,0)/rates.length;
    const last = rates[rates.length-1];
    if(last>avg*1.5 && last>0) fuelHighByEq[eid] = Math.round(last*10)/10;
  });

  // ——— كرت واحد لكل شخص / معدة بكل تنبيهاته (أوراق + يومية + رخصة + قسم …) ———
  let miss = [];
  try{ miss = (typeof collectMissingDocsAlerts==='function' ? collectMissingDocsAlerts() : []).slice(); }catch(_e){}
  miss.forEach(a=>{
    if(a.kind==='equipment' && a.personId && fuelHighByEq[a.personId]){
      const t = 'استهلاك وقود مرتفع ('+fuelHighByEq[a.personId]+' لتر/س)';
      if(!Array.isArray(a.issues)) a.issues = [];
      if(!a.issues.includes(t)) a.issues.push(t);
      a.detail = (a.issues||[]).slice(0,6).join(' · ');
      a.severity = 'high'; a.icon = '🔴';
      delete fuelHighByEq[a.personId];
    }
    if(!a.kindLabel) a.kindLabel = typeof pageLabelAr==='function' ? pageLabelAr(a.page) : a.page;
    if(!a.severity) a.severity = a.level==='danger'?'high':(a.level==='warn'?'med':'med');
    alerts.push(a);
  });
  Object.keys(fuelHighByEq).forEach(eid=>{
    const eq = typeof getEquipment==='function' ? getEquipment(eid) : (DATA.equipment||[]).find(x=>x.id===eid);
    if(!eq) return;
    alerts.push({
      icon:'⛽', page:'equipment', msg: eq.name||eq.code||'معدة',
      detail: 'استهلاك وقود مرتفع',
      issues: ['استهلاك وقود مرتفع ('+fuelHighByEq[eid]+' لتر/س)'],
      personId: eq.id, kind:'equipment', kindLabel:'معدة / مركبة',
      severity:'med', code: eq.code||''
    });
  });

  // ترتيب: high ثم med
  const order = {high:0, med:1, low:2};
  alerts.sort((a,b)=>(order[a.severity]||9)-(order[b.severity]||9));
  return alerts;
}


/** رأس صفحة موحّد لكل الأقسام — عنوان + وصف + أزرار */
function unifiedPageHeader(title, subtitle, actionsHtml){
  return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">' +
    '<div>' +
      '<h2 class="page-title" style="margin:0;">' + escapeHtml(title || '') + '</h2>' +
      (subtitle ? '<p class="page-sub" style="margin:4px 0 0;">' + subtitle + '</p>' : '') +
    '</div>' +
    (actionsHtml ? '<div class="btn-row page-header-actions">' + actionsHtml + '</div>' : '') +
  '</div>';
}

/** بطاقات إحصاء موحّدة */
function unifiedStatsRow(items){
  // items: [{num, lbl}, ...]
  if(!items || !items.length) return '';
  return '<div class="stats-row" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">' +
    items.map(function(it){
      return '<div class="stat-card"><div class="num">' + (it.num != null ? it.num : '—') + '</div><div class="lbl">' + escapeHtml(String(it.lbl || '')) + '</div></div>';
    }).join('') +
  '</div>';
}

function cfEntityTabsHtml(activeKey){
  return FORM_GROUPS.map(g=>{
    const items = FORM_REGISTRY.filter(r=>(r.group||'sys')===g[0]);
    if(!items.length) return '';
    return '<div class="cf-grp"><div class="cf-grp-h">'+g[1]+'</div>'+items.map(r=>'<button type="button" class="cf-ent-tab'+(r.key===(activeKey||'employees')?' active':'')+'" data-val="'+r.key+'">'+r.label+'</button>').join('')+'</div>';
  }).join('');
}
