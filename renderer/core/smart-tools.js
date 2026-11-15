/* =========================================================
   أدوات البحث الذكي + الفلاتر الإضافية + تقارير التنبيهات
   (ملف مضاف — لا يغيّر شكل الصفحات الحالية)
   ========================================================= */

/* ---------- 1) بحث ذكي (عربي) ---------- */

/** توحيد النص العربي: همزات، ياء/ألف مقصورة، تاء مربوطة، تشكيل، أرقام هندية */
function normAr(s){
  if(s==null) return '';
  return String(s).toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

/* ---- بحث "بداية الكلمة": الحرف/الحروف اللي بتكتبها لازم تكون بداية كلمة في الاسم (الأول أو التاني أو التالت...) ----
   مثال: "مح" ← محمد، محمود، محرم، "اسلام محمد" — ومش حامد ولا مرزوق ولا جمعه ولا "سمحان". */

const X_WORD_SPLIT = /[^\p{L}\p{N}]+/u;

/** تقطيع نص لكلمات بعد توحيد الحروف العربية */
function searchWords(s){
  const t = normAr(s);
  return t ? t.split(X_WORD_SPLIT).filter(Boolean) : [];
}

/** هل الكلمة المكتوبة (qt) بداية كلمة في words؟ بترجّع رقم الكلمة أو -1 */
function xWordHit(qt, words, skip){
  for(let i = 0; i < words.length; i++){
    if(skip && skip[i]) continue;
    if(words[i].indexOf(qt) === 0) return i;
  }
  // أرقام (تليفون / قومي / كود): يكفي جزء من الرقم بشرط 3 أرقام فأكتر
  if(/^[0-9]{3,}$/.test(qt)){
    for(let i = 0; i < words.length; i++){
      if(skip && skip[i]) continue;
      if(/[0-9]/.test(words[i]) && words[i].indexOf(qt) >= 0) return i;
    }
  }
  // أسماء مركّبة مكتوبة متصلة: "عبدالر" ← "عبد الرحمن"
  for(let i = 0; i < words.length - 1; i++){
    if(skip && (skip[i] || skip[i + 1])) continue;
    if(qt.length > words[i].length && (words[i] + words[i + 1]).indexOf(qt) === 0) return i;
  }
  return -1;
}

/** كل كلمات البحث لازم تكون بداية كلمات في النص (بأي ترتيب) — للصفحات اللي بتبحث في نص عام */
function smartMatch(blob, q){
  const toks = searchWords(q);
  if(!toks.length) return true;
  const words = searchWords(blob);
  return toks.every(t => xWordHit(t, words) >= 0);
}

/** كل النصوص القابلة للبحث في سجل (شخص أو معدة) */
function smartPersonBlob(p){
  if(!p) return '';
  const parts = [p.name, p.code, p.phone, p.mobile, p.nationalId, p.idNumber, p.position, p.skill, p.jobTitle,
    p.project, p.address, p.insuranceNumber, p.licenseGrade, p.licenseCategory, p.vehicleNumber, p.plate,
    p.serial, p.chassisNumber, p.motorNumber, p.typeLabel, p.model, p.brand, p.location, p.driverName,
    p.color, p.notes];
  try{ if(p.departmentId || p.categoryId){ const d = departmentName(p.departmentId || p.categoryId); if(d && d !== '—') parts.push(d); } }catch(_e){}
  try{ if(p.supervisorId){ const s = supervisorName(p.supervisorId); if(s && s !== '—') parts.push(s); } }catch(_e){}
  return parts.filter(x => x != null && x !== '').join(' ');
}

/** ترتيب النتيجة: 0 = بداية الاسم الأول، 10 = الاسم التاني، 20 = التالت ... ؛ كود/تليفون/قومي = 200+ */
function xScoreRecord(p, toks){
  const nameWords = searchWords([p.name, p.typeLabel, p.model, p.brand].filter(Boolean).join(' '));
  const idWords = searchWords([p.code, p.phone, p.mobile, p.nationalId, p.idNumber, p.vehicleNumber, p.plate, p.serial].filter(Boolean).join(' '));
  const usedN = {}, usedI = {};
  let score = 0, last = -1;
  for(const t of toks){
    const i = xWordHit(t, nameWords, usedN);
    if(i >= 0){
      usedN[i] = true;
      score += i * 10 + (i <= last ? 5 : 0);   // ترتيب الكلمات عكس ترتيب الاسم = أقل أولوية شوية
      last = i;
      continue;
    }
    const j = xWordHit(t, idWords, usedI);
    if(j < 0) return null;
    usedI[j] = true;
    score += 200;
  }
  return score;
}

/** بحث مرتّب ودقيق: الأسماء اللي بتبدأ بالحروف المكتوبة الأول (الاسم الأول ثم التاني ثم التالت)، وبعدين أبجدياً.
 *  لو مفيش ولا اسم/كود/تليفون مطابق، بيدوّر في باقي الحقول (وظيفة، مشروع، قسم، مشرف، عنوان...). */
function smartSearchList(list, q){
  const s = String(q || '').trim();
  const toks = searchWords(s);
  if(!toks.length) return list;
  const byName = (a, b) => String(a.r.name || a.r.typeLabel || '').localeCompare(String(b.r.name || b.r.typeLabel || ''), 'ar');
  const cmp = (a, b) => (a.s - b.s) || byName(a, b);
  const primary = [];
  (list || []).forEach(r => { const sc = xScoreRecord(r, toks); if(sc != null) primary.push({ r, s: sc }); });
  if(primary.length) return primary.sort(cmp).map(x => x.r);
  const fallback = [];
  (list || []).forEach(r => {
    const words = searchWords(smartPersonBlob(r));
    if(toks.every(t => xWordHit(t, words) >= 0)) fallback.push({ r, s: 1000 });
  });
  return fallback.sort(cmp).map(x => x.r);
}

/* ---------- 2) تواريخ الانتهاء ---------- */

function alertSoonDays(){
  const n = Number((DATA.settings || {}).alertSoonDays);
  return n > 0 ? n : 30;
}
function expiryDaysLeft(date){
  if(!date) return null;
  const d = typeof parseLocalDate === 'function' ? parseLocalDate(date) : null;
  if(!d) return null;
  const now = (typeof cairoNow === 'function') ? cairoNow() : new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}
/** none | expired | soon | valid */
function expiryState(date, soonDays){
  if(!date) return 'none';
  const n = expiryDaysLeft(date);
  if(n == null) return 'none';
  if(n < 0) return 'expired';
  if(n <= (soonDays || alertSoonDays())) return 'soon';
  return 'valid';
}

function xInsNorm(v){
  v = String(v || '').toLowerCase().trim();
  if(!v) return 'empty';
  if(v === 'none' || v === 'uninsured' || v.indexOf('غير') >= 0 || v === 'لا يوجد') return 'none';
  if(v === 'pending' || v.indexOf('قيد') >= 0) return 'pending';
  if(v === 'insured' || v.indexOf('مؤم') >= 0) return 'insured';
  return v;
}

function xIsInactive(p, kind){
  const s = String(p.status || '').toLowerCase();
  if(kind === 'equipment') return ['sold', 'scrapped'].indexOf(s) >= 0;
  if(['inactive', 'left', 'resigned', 'terminated'].indexOf(s) >= 0) return true;
  return typeof isResignedStatus === 'function' && s ? !!isResignedStatus(s) : false;
}

/* ---------- 3) الأوراق الناقصة (نسخة سريعة بنفس منطق personHasDocHint) ---------- */

function xBuildDocIndex(){
  return typeof buildPersonDocsIndex === 'function' ? buildPersonDocsIndex() : {};
}
/** نفس منطق التنبيهات الأساسي بالظبط (مصدر واحد للحقيقة) */
function xHasDoc(p, doc, idx){
  return personHasDocHint(p, doc, idx);
}
function xRequiredDocs(kind){
  try{ return typeof personRequiredDocsList === 'function' ? personRequiredDocsList(kind) : []; }catch(_e){ return []; }
}
/** أسماء الأوراق الناقصة لسجل */
function xIsResigned(p, kind){
  return kind !== 'equipment' && typeof isResignedStatus === 'function' && isResignedStatus(p && p.status);
}
function xMissingDocLabels(kind, p, idx){
  if(!p) return [];
  const dismissed = new Set((p.dismissedNotes || []).map(x => String(x).trim()));
  // المستقيل: الأوراق المطلوبة هي أوراق ملف الاستقالة (نفس منطق عمود الملاحظات)
  if(xIsResigned(p, kind)){
    return xRequiredDocs('resigned').filter(doc => !personHasDocHint(p, doc, idx)).map(d => d.label).filter(l => !dismissed.has('ناقص: ' + l));
  }
  let miss;
  if(kind === 'equipment'){
    miss = xRequiredDocs('equipment')
      .filter(doc => !equipmentHasDocHint(p, doc, idx))
      .map(d => d.label);
  } else {
    if(kind === 'worker' && typeof isTemporaryWorker === 'function' && isTemporaryWorker(p)) return [];
    miss = xRequiredDocs(kind).filter(doc => !xHasDoc(p, doc, idx)).map(d => d.label);
  }
  return miss.filter(l => !dismissed.has('ناقص: ' + l));
}
function xMissingBasic(p, temp){
  const miss = [];
  if(!String(p.nationalId || p.idNumber || '').trim()) miss.push('الرقم القومي');
  if(temp) return miss;
  if(!String(p.phone || p.mobile || '').trim()) miss.push('الهاتف');
  if(!String(p.address || '').trim()) miss.push('العنوان');
  return miss;
}
function xHasLicenseAny(p, idx){
  if(p.licenseExpiry) return true;
  return personHasDocHint(p, { code: 'driver_license_img', label: 'صورة الرخصة الشخصية' }, idx);
}

/* ---------- 4) فلاتر إضافية داخل صفحات القوائم (نفس شكل الفلاتر الحالية) ---------- */

const X_FILTER_KEYS = ['xCard', 'xLic', 'xIns', 'xDocs', 'xData'];

function extraFiltersActive(f){
  f = f || {};
  return X_FILTER_KEYS.some(k => !!f[k]);
}

function applyExtraPersonFilters(kind, list, f){
  f = f || {};
  if(!extraFiltersActive(f)) return list;
  let out = list || [];
  if(f.xCard) out = out.filter(p => expiryState(p.idCardExpiry) === f.xCard);
  if(f.xLic){
    const idx = f.xLic === 'nolic' ? xBuildDocIndex() : null;
    if(f.xLic === 'nolic') out = out.filter(p => !xHasLicenseAny(p, idx));
    else out = out.filter(p => expiryState(kind === 'equipment' ? (p.vehicleLicenseExpiry || p.licenseExpiry) : p.licenseExpiry) === f.xLic);
  }
  if(f.xIns) out = out.filter(p => xInsNorm(p.insuranceStatus) === f.xIns);
  if(f.xDocs){
    const idx = xBuildDocIndex();
    out = out.filter(p => {
      const has = xMissingDocLabels(kind, p, idx).length > 0;
      return f.xDocs === 'missing' ? has : !has;
    });
  }
  if(f.xData){
    out = out.filter(p => xMissingBasic(p, kind === 'worker' && typeof isTemporaryWorker === 'function' && isTemporaryWorker(p)).length > 0);
  }
  return out;
}

/** قوائم منسدلة إضافية بنفس class الفلاتر الحالية */
function extraPersonFiltersHtml(kind, f, prefix){
  f = f || {};
  const o = (v, cur, l) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`;
  const dateSel = (id, title, cur, extra) => `<select id="${prefix}${id}" class="input" title="${title}">
      <option value="">${title}: الكل</option>
      ${o('valid', cur, 'سارية')}${o('soon', cur, 'قاربت على الانتهاء')}${o('expired', cur, 'منتهية')}${o('none', cur, 'بدون تاريخ')}${extra || ''}
    </select>`;
  const isEq = kind === 'equipment';
  const parts = [];
  if(!isEq) parts.push(dateSel('XCard', 'البطاقة', f.xCard));
  if(kind !== 'worker'){
    parts.push(dateSel('XLic', isEq ? 'رخصة المركبة' : 'الرخصة', f.xLic, isEq ? '' : o('nolic', f.xLic, 'بدون رخصة (لا تاريخ ولا صورة)')));
  }
  parts.push(`<select id="${prefix}XIns" class="input" title="حالة التأمين">
      <option value="">حالة التأمين: الكل</option>
      ${o('insured', f.xIns, 'مؤمَّن')}${o('none', f.xIns, 'غير مؤمن عليه')}${o('pending', f.xIns, 'قيد التسجيل')}${o('empty', f.xIns, 'بدون تحديد')}
    </select>`);
  parts.push(`<select id="${prefix}XDocs" class="input" title="الأوراق">
      <option value="">الأوراق: الكل</option>
      ${o('missing', f.xDocs, 'أوراق ناقصة')}${o('complete', f.xDocs, 'أوراق مكتملة')}
    </select>`);
  if(!isEq){
    parts.push(`<select id="${prefix}XData" class="input" title="البيانات الأساسية">
      <option value="">البيانات: الكل</option>
      ${o('missing', f.xData, 'بيانات أساسية ناقصة')}
    </select>`);
  }
  if(extraFiltersActive(f) || (f.q || '').trim()){
    parts.push(`<button type="button" class="btn btn-outline btn-sm" id="${prefix}XClear">مسح الفلاتر</button>`);
  }
  return parts.join('\n');
}

function bindExtraPersonFilters(prefix, f, tableKey){
  if(!f) return;
  const map = { XCard: 'xCard', XLic: 'xLic', XIns: 'xIns', XDocs: 'xDocs', XData: 'xData' };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(prefix + id);
    if(!el) return;
    el.addEventListener('change', () => {
      f[map[id]] = el.value || '';
      if(tableKey && typeof resetTablePage === 'function') resetTablePage(tableKey);
      rerenderCurrentPage();
    });
  });
  const clr = document.getElementById(prefix + 'XClear');
  if(clr) clr.addEventListener('click', () => {
    X_FILTER_KEYS.forEach(k => { f[k] = ''; });
    f.q = '';
    if(tableKey && typeof resetTablePage === 'function') resetTablePage(tableKey);
    rerenderCurrentPage();
  });
}

/* ---------- 5) محرك التنبيهات (لتقارير التنبيهات) ---------- */

const X_KIND_LABELS = { employee: 'موظف', worker: 'عامل', supervisor: 'مشرف', driver: 'سائق', equipment: 'معدة / مركبة' };
const X_KIND_LABELS_PL = { employee: 'الموظفين', worker: 'العمال', supervisor: 'المشرفين', driver: 'السائقين', equipment: 'المعدات والمركبات' };
const X_ALERT_CATS = {
  lic: 'الرخص', card: 'البطاقات', ins: 'التأمين', contract: 'العقود', docs: 'الأوراق والمستندات',
  data: 'بيانات ناقصة', assign: 'التوزيع والتنظيم', equip: 'المعدات'
};
const X_PEOPLE = ['employee', 'worker', 'supervisor', 'driver'];
const X_ALERT_TYPES = [
  { code: 'lic_none',        label: 'بدون رخصة قيادة',                cat: 'lic',    sev: 'high', kinds: ['driver'] },
  { code: 'lic_expired',     label: 'رخصة منتهية',                    cat: 'lic',    sev: 'high', kinds: ['driver', 'supervisor', 'employee'] },
  { code: 'lic_soon',        label: 'رخصة قاربت على الانتهاء',        cat: 'lic',    sev: 'med',  kinds: ['driver', 'supervisor', 'employee'] },
  { code: 'veh_lic_none',    label: 'مركبة بدون رخصة',                cat: 'lic',    sev: 'high', kinds: ['equipment'] },
  { code: 'veh_lic_expired', label: 'رخصة مركبة منتهية',              cat: 'lic',    sev: 'high', kinds: ['equipment'] },
  { code: 'veh_lic_soon',    label: 'رخصة مركبة قاربت على الانتهاء',  cat: 'lic',    sev: 'med',  kinds: ['equipment'] },
  { code: 'drv_lic_expired', label: 'رخصة سائق المركبة منتهية',       cat: 'lic',    sev: 'high', kinds: ['equipment'] },
  { code: 'card_none',       label: 'بدون تاريخ بطاقة',               cat: 'card',   sev: 'med',  kinds: X_PEOPLE },
  { code: 'card_expired',    label: 'بطاقة منتهية',                   cat: 'card',   sev: 'high', kinds: X_PEOPLE },
  { code: 'card_soon',       label: 'بطاقة قاربت على الانتهاء',       cat: 'card',   sev: 'med',  kinds: X_PEOPLE },
  { code: 'ins_none',        label: 'غير مؤمن عليه',                  cat: 'ins',    sev: 'high', kinds: X_PEOPLE.concat(['equipment']) },
  { code: 'ins_pending',     label: 'التأمين قيد التسجيل',            cat: 'ins',    sev: 'low',  kinds: X_PEOPLE.concat(['equipment']) },
  { code: 'ins_unset',       label: 'حالة التأمين غير محددة',         cat: 'ins',    sev: 'med',  kinds: X_PEOPLE.concat(['equipment']) },
  { code: 'contract_expired',label: 'عقد منتهي',                      cat: 'contract', sev: 'high', kinds: X_PEOPLE },
  { code: 'docs_missing',    label: 'أوراق ناقصة',                    cat: 'docs',   sev: 'high', kinds: X_PEOPLE.concat(['equipment']) },
  { code: 'pdoc_expired',    label: 'مستند منتهي (أرشيف)',            cat: 'docs',   sev: 'high', kinds: X_PEOPLE.concat(['equipment']) },
  { code: 'pdoc_soon',       label: 'مستند قارب على الانتهاء (أرشيف)', cat: 'docs',  sev: 'med',  kinds: X_PEOPLE.concat(['equipment']) },
  { code: 'data_missing',    label: 'بيانات أساسية ناقصة',            cat: 'data',   sev: 'med',  kinds: X_PEOPLE },
  { code: 'resign_date',     label: 'مستقيل بدون تاريخ استقالة',      cat: 'data',   sev: 'med',  kinds: X_PEOPLE },
  { code: 'no_sup',          label: 'بدون مشرف',                      cat: 'assign', sev: 'med',  kinds: ['worker', 'equipment'] },
  { code: 'no_dept',         label: 'بدون قسم',                       cat: 'assign', sev: 'med',  kinds: X_PEOPLE.concat(['equipment']) },
  { code: 'no_project',      label: 'بدون مشروع',                     cat: 'assign', sev: 'low',  kinds: ['worker', 'supervisor', 'driver', 'equipment'] },
  { code: 'no_wage',         label: 'بدون راتب / يومية محددة',        cat: 'assign', sev: 'med',  kinds: X_PEOPLE },
  { code: 'maint_overdue',   label: 'تجاوز موعد الصيانة',             cat: 'equip',  sev: 'high', kinds: ['equipment'] },
  { code: 'maint_soon',      label: 'صيانة قريبة',                    cat: 'equip',  sev: 'med',  kinds: ['equipment'] },
  { code: 'eq_down',         label: 'معدة متوقفة / في الصيانة / عاطلة', cat: 'equip', sev: 'med', kinds: ['equipment'] },
  { code: 'plate_missing',   label: 'رقم اللوحة ناقص',                cat: 'equip',  sev: 'low',  kinds: ['equipment'] }
];
const X_ALERT_TYPE_MAP = {};
X_ALERT_TYPES.forEach(t => { X_ALERT_TYPE_MAP[t.code] = t; });
const X_SEV_LABELS = { high: 'عالية', med: 'متوسطة', low: 'منخفضة' };

function xFmtDate(d){ return d ? (typeof fmtDate === 'function' ? fmtDate(d) : d) : ''; }
function xDaysText(days){
  if(days == null) return '';
  if(days < 0) return 'منتهي منذ ' + (-days) + ' يوم';
  if(days === 0) return 'ينتهي اليوم';
  return 'بعد ' + days + ' يوم';
}

/** كل التنبيهات كصفوف: صف لكل (سجل + نوع تنبيه) */
function collectAlertRows(opt){
  opt = opt || {};
  const soon = Number(opt.soonDays) > 0 ? Number(opt.soonDays) : alertSoonDays();
  const includeInactive = !!opt.includeInactive;
  const idx = xBuildDocIndex();
  const rows = [];
  const lists = {
    employee: DATA.employees || [], worker: DATA.workers || [], supervisor: DATA.supervisors || [],
    driver: DATA.drivers || [], equipment: DATA.equipment || []
  };
  const byId = {};
  Object.keys(lists).forEach(k => { lists[k].forEach(p => { if(p && p.id) byId[k + '|' + p.id] = p; }); });

  const deptOf = (p) => { try{ const id = p.departmentId || p.categoryId; return id ? departmentName(id) : ''; }catch(_e){ return ''; } };
  const supOf = (p) => { try{ return p.supervisorId ? supervisorName(p.supervisorId) : ''; }catch(_e){ return ''; } };

  const push = (kind, p, code, detail, date, days, extra) => {
    const t = X_ALERT_TYPE_MAP[code];
    rows.push(Object.assign({
      kind, kindLabel: X_KIND_LABELS[kind], id: p.id, rec: p,
      code: p.code || '', name: p.name || p.typeLabel || p.code || '—',
      phone: p.phone || p.mobile || '', nationalId: p.nationalId || '',
      dept: deptOf(p), deptId: p.departmentId || p.categoryId || '', project: p.project || '',
      sup: supOf(p), status: p.status || '',
      type: code, typeLabel: t.label, cat: t.cat, catLabel: X_ALERT_CATS[t.cat], severity: t.sev,
      detail: detail || '', date: date || '', days: days == null ? null : days, missing: null
    }, extra || {}));
  };

  // مساعد: بطاقة / رخصة / رخصة مركبة بتاريخ
  const dateAlerts = (kind, p, date, codes, noun, allowNone) => {
    const st = expiryState(date, soon);
    const dl = expiryDaysLeft(date);
    if(st === 'none'){
      if(allowNone && codes.none) push(kind, p, codes.none, 'لا يوجد تاريخ انتهاء ' + noun);
    } else if(st === 'expired'){
      if(codes.expired) push(kind, p, codes.expired, noun + ' انتهت بتاريخ ' + xFmtDate(date), date, dl);
    } else if(st === 'soon'){
      if(codes.soon) push(kind, p, codes.soon, noun + ' تنتهي بتاريخ ' + xFmtDate(date), date, dl);
    }
  };

  const insAlerts = (kind, p, needIns) => {
    const ins = xInsNorm(p.insuranceStatus);
    if(ins === 'none') push(kind, p, 'ins_none', 'حالة التأمين: غير مؤمن عليه');
    else if(ins === 'pending') push(kind, p, 'ins_pending', 'حالة التأمين: قيد التسجيل');
    else if(ins === 'empty' && needIns) push(kind, p, 'ins_unset', 'لم تُحدَّد حالة التأمين');
  };

  const docsAlert = (kind, p) => {
    const miss = xMissingDocLabels(kind, p, idx);
    if(miss.length) push(kind, p, 'docs_missing', miss.join('، '), '', null, { missing: miss });
  };

  Object.keys(lists).forEach(kind => {
    lists[kind].forEach(p => {
      if(!p) return;
      // المستقيلين: تنبيهات ملف الاستقالة فقط (أوراق الاستقالة + تاريخ الاستقالة) — ومفيش تنبيهات بطاقة/رخصة/تأمين ليهم
      if(xIsResigned(p, kind)){
        const missR = xMissingDocLabels(kind, p, idx);
        if(missR.length) push(kind, p, 'docs_missing', missR.join('، '), '', null, { missing: missR });
        if(!String(p.resignedAt || p.resignDate || '').trim()) push(kind, p, 'resign_date', 'لم يُسجَّل تاريخ الاستقالة');
        return;
      }
      if(!includeInactive && xIsInactive(p, kind)) return;

      if(kind === 'equipment'){
        // رخصة المركبة
        const vExp = p.vehicleLicenseExpiry || p.licenseExpiry || '';
        dateAlerts(kind, p, vExp, { none: 'veh_lic_none', expired: 'veh_lic_expired', soon: 'veh_lic_soon' }, 'رخصة المركبة', true);
        // رخصة سائق المركبة
        if(p.driverLicenseExpiry && expiryState(p.driverLicenseExpiry, soon) === 'expired'){
          push(kind, p, 'drv_lic_expired', 'رخصة السائق' + (p.driverName ? ' (' + p.driverName + ')' : '') + ' انتهت بتاريخ ' + xFmtDate(p.driverLicenseExpiry), p.driverLicenseExpiry, expiryDaysLeft(p.driverLicenseExpiry));
        }
        insAlerts(kind, p, true);
        docsAlert(kind, p);
        // صيانة
        const nm = String(p.nextMaintenance || '').slice(0, 10);
        if(nm){
          const dl = expiryDaysLeft(nm);
          if(dl != null && dl < 0) push(kind, p, 'maint_overdue', 'موعد الصيانة كان ' + xFmtDate(nm), nm, dl);
          else if(dl != null && dl <= soon) push(kind, p, 'maint_soon', 'موعد الصيانة ' + xFmtDate(nm), nm, dl);
        }
        const st = String(p.status || '').toLowerCase();
        if(['maintenance', 'broken', 'stopped', 'stopped_down'].indexOf(st) >= 0){
          const lab = typeof labelOf === 'function' && typeof EQUIPMENT_STATUS !== 'undefined' ? labelOf(EQUIPMENT_STATUS, st) : st;
          push(kind, p, 'eq_down', 'الحالة: ' + (lab || st));
        }
        if(!String(p.vehicleNumber || p.plate || '').trim()) push(kind, p, 'plate_missing', 'لم يُسجَّل رقم لوحة');
        if(!String(p.project || '').trim()) push(kind, p, 'no_project', '');
        if(!p.supervisorId) push(kind, p, 'no_sup', '');
        if(!(p.departmentId || p.categoryId)) push(kind, p, 'no_dept', '');
        return;
      }

      const temp = kind === 'worker' && typeof isTemporaryWorker === 'function' && isTemporaryWorker(p);

      // بطاقة
      dateAlerts(kind, p, p.idCardExpiry, { none: 'card_none', expired: 'card_expired', soon: 'card_soon' }, 'البطاقة', !temp);

      // رخصة القيادة
      if(kind === 'driver'){
        if(!xHasLicenseAny(p, idx)) push(kind, p, 'lic_none', 'لا يوجد تاريخ رخصة ولا صورة رخصة مرفوعة');
        else if(p.licenseExpiry) dateAlerts(kind, p, p.licenseExpiry, { expired: 'lic_expired', soon: 'lic_soon' }, 'الرخصة', false);
      } else if(kind === 'supervisor' || kind === 'employee'){
        if(p.licenseExpiry) dateAlerts(kind, p, p.licenseExpiry, { expired: 'lic_expired', soon: 'lic_soon' }, 'الرخصة', false);
      }

      // تأمين
      const needIns = kind !== 'worker' || (typeof workerNeedsInsurance === 'function' && workerNeedsInsurance(p));
      insAlerts(kind, p, needIns);

      // عقد
      if(!temp){
        const cs = String(p.contractStatus || '').toLowerCase();
        if(cs === 'expired' || cs === 'منتهي' || cs === 'منتهية') push(kind, p, 'contract_expired', 'حالة العقد: منتهي');
      }

      // أوراق
      docsAlert(kind, p);

      // بيانات أساسية
      const mb = xMissingBasic(p, temp);
      if(mb.length) push(kind, p, 'data_missing', mb.join('، '), '', null, { missing: mb });

      // توزيع وتنظيم
      if(kind === 'worker' && !p.supervisorId) push(kind, p, 'no_sup', '');
      if(!(p.departmentId || p.categoryId || p.department)) push(kind, p, 'no_dept', '');
      if(kind !== 'employee' && !String(p.project || '').trim()) push(kind, p, 'no_project', '');
      const wage = kind === 'employee' ? toInt(p.salary || p.basicSalary) : toInt(p.dailyWage);
      if(!wage) push(kind, p, 'no_wage', '');
    });
  });

  // مستندات الأرشيف بتواريخ انتهاء
  (DATA.personDocuments || []).forEach(d => {
    if(!d || !d.expiryDate || !d.personId) return;
    let kind = d.kind, p = kind ? byId[kind + '|' + d.personId] : null;
    if(!p){
      for(const k of Object.keys(lists)){ if(byId[k + '|' + d.personId]){ kind = k; p = byId[k + '|' + d.personId]; break; } }
    }
    if(!p) return;
    if(!includeInactive && xIsInactive(p, kind)) return;
    const st = expiryState(d.expiryDate, soon);
    if(st !== 'expired' && st !== 'soon') return;
    const label = d.title || d.docType || d.type || 'مستند';
    push(kind, p, st === 'expired' ? 'pdoc_expired' : 'pdoc_soon',
      label + ' — ' + (st === 'expired' ? 'انتهى' : 'ينتهي') + ' ' + xFmtDate(d.expiryDate), d.expiryDate, expiryDaysLeft(d.expiryDate));
  });

  return rows;
}

/* ---------- 6) فلاتر وحالة تقارير التنبيهات ---------- */

function xEnsureReportState(){
  if(typeof reportsState === 'undefined' || !reportsState) return {};
  const d = { aKind: '', aType: '', aSev: '', aDept: '', aProject: '', aQ: '', aDays: '30', aMode: 'alert', aInactive: '', aDoc: '',
              mKind: 'worker', mQ: '', mDept: '', mProject: '', mOnly: 'missing', mInactive: '' };
  Object.keys(d).forEach(k => { if(reportsState[k] === undefined) reportsState[k] = d[k]; });
  return reportsState;
}

function filterAlertRows(rows, st){
  let out = rows;
  if(st.aKind) out = out.filter(r => r.kind === st.aKind);
  if(st.aType){
    if(st.aType.indexOf('cat:') === 0){ const c = st.aType.slice(4); out = out.filter(r => r.cat === c); }
    else out = out.filter(r => r.type === st.aType);
  }
  if(st.aSev) out = out.filter(r => r.severity === st.aSev);
  if(st.aDept){
    if(st.aDept === '__none__') out = out.filter(r => !r.deptId);
    else out = out.filter(r => String(r.deptId) === String(st.aDept));
  }
  if(st.aProject){
    if(st.aProject === '__none__') out = out.filter(r => !String(r.project || '').trim());
    else out = out.filter(r => String(r.project) === String(st.aProject));
  }
  if(st.aDoc) out = out.filter(r => r.type === 'docs_missing' && r.missing && r.missing.indexOf(st.aDoc) >= 0);
  if(st.aQ && String(st.aQ).trim()){
    // نفس منطق البحث المرتب: الأول بالاسم/الكود/التليفون/القومي (بداية الكلمة)،
    // ولو مفيش ولا مطابقة بنبحث في نوع التنبيه والتفاصيل والمشروع والقسم والمشرف
    const toks = searchWords(st.aQ);
    const byPerson = out.filter(r => xScoreRecord({ name: r.name, code: r.code, phone: r.phone, nationalId: r.nationalId }, toks) != null);
    out = byPerson.length ? byPerson
      : out.filter(r => smartMatch([r.detail, r.typeLabel, r.catLabel, r.project, r.dept, r.sup, r.kindLabel].join(' '), st.aQ));
  }
  const sevOrd = { high: 0, med: 1, low: 2 };
  return out.slice().sort((a, b) => {
    const s = (sevOrd[a.severity] || 9) - (sevOrd[b.severity] || 9);
    if(s) return s;
    const da = a.days == null ? 99999 : a.days, db = b.days == null ? 99999 : b.days;
    if(da !== db) return da - db;
    return String(a.name).localeCompare(String(b.name), 'ar');
  });
}

/** تجميع لكل شخص/معدة: صف واحد بكل تنبيهاته */
function groupAlertRowsByRecord(rows){
  const map = {}, out = [];
  const sevOrd = { high: 0, med: 1, low: 2 };
  rows.forEach(r => {
    const k = r.kind + '|' + r.id;
    if(!map[k]){
      map[k] = Object.assign({}, r, { types: [], details: [], count: 0, minDays: null });
      out.push(map[k]);
    }
    const g = map[k];
    g.count++;
    if(g.types.indexOf(r.typeLabel) < 0) g.types.push(r.typeLabel);
    const det = r.detail ? r.typeLabel + ': ' + r.detail : r.typeLabel;
    g.details.push(det);
    if((sevOrd[r.severity] || 9) < (sevOrd[g.severity] || 9)) g.severity = r.severity;
    if(r.days != null && (g.minDays == null || r.days < g.minDays)) g.minDays = r.days;
  });
  return out;
}

function xOpt(val, cur, lab){
  return `<option value="${escapeHtml(val)}" ${String(cur) === String(val) ? 'selected' : ''}>${escapeHtml(lab == null ? val : lab)}</option>`;
}
function xUniq(arr){
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'ar'));
}
function xDeptOptions(cur){
  const depts = (DATA.departments || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
  return `${depts.map(d => xOpt(d.id, cur, d.name)).join('')}${xOpt('__none__', cur, 'بدون قسم')}`;
}
function xProjectOptions(cur){
  const all = [].concat(DATA.workers || [], DATA.drivers || [], DATA.supervisors || [], DATA.equipment || []);
  const projects = xUniq(all.map(p => String(p.project || '').trim()));
  return `${projects.map(pr => xOpt(pr, cur, pr)).join('')}${xOpt('__none__', cur, 'بدون مشروع')}`;
}

/* ---------- 7) تبويب: تقارير التنبيهات ---------- */

function xAlertRowsForState(st){
  const all = collectAlertRows({ soonDays: Number(st.aDays) || 30, includeInactive: !!st.aInactive });
  return { all, rows: filterAlertRows(all, st) };
}

function repAlertsTab(){
  const st = xEnsureReportState();
  const { all, rows } = xAlertRowsForState(st);

  // أعداد الأنواع (بدون فلتر النوع) لعرضها كأزرار سريعة
  const base = filterAlertRows(all, Object.assign({}, st, { aType: '', aDoc: '' }));
  const counts = {};
  base.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });

  const people = new Set(rows.map(r => r.kind + '|' + r.id)).size;
  const high = rows.filter(r => r.severity === 'high').length;
  const grouped = st.aMode === 'person';
  const shown = grouped ? groupAlertRowsByRecord(rows) : rows;

  // أوراق مطلوبة (لفلتر ورقة معينة)
  const docLabels = xUniq([].concat.apply([], X_PEOPLE.concat(['equipment', 'resigned']).map(k => xRequiredDocs(k).map(d => d.label))));

  const chips = X_ALERT_TYPES.filter(t => counts[t.code])
    .map(t => `<button type="button" class="btn ${st.aType === t.code ? 'btn-primary' : 'btn-outline'} btn-sm rep-atype" data-atype="${t.code}">${escapeHtml(t.label)} (${counts[t.code]})</button>`).join('');

  const typeSelect = `<select id="repAType" class="input" title="نوع التنبيه">
      <option value="">التنبيه: الكل</option>
      ${Object.keys(X_ALERT_CATS).map(c => `<optgroup label="${escapeHtml(X_ALERT_CATS[c])}">
        ${xOpt('cat:' + c, st.aType, 'كل تنبيهات ' + X_ALERT_CATS[c])}
        ${X_ALERT_TYPES.filter(t => t.cat === c).map(t => xOpt(t.code, st.aType, t.label)).join('')}
      </optgroup>`).join('')}
    </select>`;

  const filterBar = `<div class="filters-bar" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
    <input type="search" id="repAQ" class="input" placeholder="بحث: اسم، كود، هاتف، قومي، نوع التنبيه..." value="${escapeHtml(st.aQ || '')}" style="min-width:220px;">
    <select id="repAKind" class="input" title="الفئة">
      <option value="">الفئة: الكل</option>
      ${Object.keys(X_KIND_LABELS_PL).map(k => xOpt(k, st.aKind, X_KIND_LABELS_PL[k])).join('')}
    </select>
    ${typeSelect}
    <select id="repASev" class="input" title="الخطورة">
      <option value="">الخطورة: الكل</option>
      ${Object.keys(X_SEV_LABELS).map(s => xOpt(s, st.aSev, X_SEV_LABELS[s])).join('')}
    </select>
    <select id="repADept" class="input" title="القسم"><option value="">القسم: الكل</option>${xDeptOptions(st.aDept)}</select>
    <select id="repAProject" class="input" title="المشروع"><option value="">المشروع: الكل</option>${xProjectOptions(st.aProject)}</select>
    <select id="repADoc" class="input" title="ورقة ناقصة بعينها"><option value="">الورقة الناقصة: الكل</option>${docLabels.map(l => xOpt(l, st.aDoc, 'ناقص: ' + l)).join('')}</select>
    <select id="repADays" class="input" title="يُعتبر قارب على الانتهاء خلال">
      ${['15', '30', '45', '60', '90'].map(d => xOpt(d, st.aDays, 'قارب الانتهاء خلال ' + d + ' يوم')).join('')}
    </select>
    <select id="repAMode" class="input" title="طريقة العرض">
      ${xOpt('alert', st.aMode, 'صف لكل تنبيه')}${xOpt('person', st.aMode, 'صف لكل شخص / معدة')}
    </select>
    <select id="repAInactive" class="input" title="الحالة">
      ${xOpt('', st.aInactive, 'النشطين + ملفات المستقيلين')}${xOpt('1', st.aInactive, 'كل السجلات (حتى المتوقفين)')}
    </select>
    <button type="button" class="btn btn-outline btn-sm" id="repAClear">مسح الفلاتر</button>
  </div>`;

  const MAX = 500;
  const body = shown.slice(0, MAX).map(r => {
    const sevCls = r.severity === 'high' ? 'badge-err' : (r.severity === 'med' ? 'badge-warn' : 'badge-ok');
    const dayTxt = grouped ? (r.minDays != null ? xDaysText(r.minDays) : '') : xDaysText(r.days);
    const dayCls = (grouped ? r.minDays : r.days) != null && (grouped ? r.minDays : r.days) < 0 ? 'color:#b00020;font-weight:700;' : '';
    return `<tr>
      <td>${escapeHtml(r.code)}</td>
      <td><strong class="rep-open" data-kind="${r.kind}" data-id="${escapeHtml(r.id)}" style="cursor:pointer;color:var(--ledger-green);">${escapeHtml(r.name)}</strong></td>
      <td>${escapeHtml(r.kindLabel)}</td>
      <td>${grouped ? escapeHtml(r.types.join(' • ')) : escapeHtml(r.typeLabel)}</td>
      <td style="max-width:360px;white-space:normal;">${grouped ? escapeHtml(r.details.join(' | ')) : escapeHtml(r.detail || '—')}</td>
      <td>${grouped ? '—' : (r.date ? xFmtDate(r.date) : '—')}</td>
      <td style="${dayCls}">${dayTxt || '—'}</td>
      <td>${escapeHtml(r.dept || '—')}</td>
      <td>${escapeHtml(r.project || '—')}</td>
      <td>${escapeHtml(r.phone || '—')}</td>
      <td><span class="badge ${sevCls}">${X_SEV_LABELS[r.severity] || ''}${grouped ? ' · ' + r.count : ''}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--ink-soft);">✓ لا توجد تنبيهات بهذه الفلاتر</td></tr>';

  return `<div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-card ${rows.length ? 'debt' : ''}"><div class="num">${rows.length}</div><div class="lbl">عدد التنبيهات</div></div>
      <div class="stat-card"><div class="num">${people}</div><div class="lbl">أشخاص / معدات</div></div>
      <div class="stat-card ${high ? 'debt' : ''}"><div class="num">${high}</div><div class="lbl">خطورة عالية</div></div>
    </div>
    ${filterBar}
    <div class="btn-row" style="flex-wrap:wrap;gap:6px;margin-bottom:12px;">${chips || '<span style="color:var(--ink-soft);font-size:13px;">لا توجد تنبيهات</span>'}</div>
    <div class="table-wrap"><table class="data-table"><thead><tr>
      <th>الكود</th><th>الاسم</th><th>الفئة</th><th>${grouped ? 'التنبيهات' : 'التنبيه'}</th><th>التفاصيل</th>
      <th>تاريخ الانتهاء</th><th>المتبقي</th><th>القسم</th><th>المشروع</th><th>الهاتف</th><th>الخطورة</th>
    </tr></thead><tbody>${body}</tbody></table></div>
    ${shown.length > MAX ? `<p style="font-size:13px;color:var(--ink-soft);margin-top:8px;">يعرض أول ${MAX} من ${shown.length} — التصدير (إكسيل / CSV) يشمل كل النتائج.</p>` : ''}`;
}

function alertReportExportData(){
  const st = xEnsureReportState();
  const { rows } = xAlertRowsForState(st);
  const grouped = st.aMode === 'person';
  if(grouped){
    const g = groupAlertRowsByRecord(rows);
    return {
      headers: ['الكود', 'الاسم', 'الفئة', 'التنبيهات', 'التفاصيل', 'القسم', 'المشروع', 'الهاتف', 'الرقم القومي', 'عدد التنبيهات', 'الخطورة'],
      rows: g.map(r => [r.code, r.name, r.kindLabel, r.types.join(' • '), r.details.join(' | '), r.dept, r.project, r.phone, r.nationalId, r.count, X_SEV_LABELS[r.severity] || '']),
      name: 'تقرير-تنبيهات', sheetName: 'تنبيهات'
    };
  }
  return {
    headers: ['الكود', 'الاسم', 'الفئة', 'التنبيه', 'التفاصيل', 'تاريخ الانتهاء', 'المتبقي', 'القسم', 'المشروع', 'المشرف', 'الهاتف', 'الرقم القومي', 'الخطورة'],
    rows: rows.map(r => [r.code, r.name, r.kindLabel, r.typeLabel, r.detail, xFmtDate(r.date), xDaysText(r.days), r.dept, r.project, r.sup, r.phone, r.nationalId, X_SEV_LABELS[r.severity] || '']),
    name: 'تقرير-تنبيهات', sheetName: 'تنبيهات'
  };
}

/* ---------- 8) تبويب: ملخص التنبيهات (مصفوفة الفئة × نوع التنبيه) ---------- */

function repAlertsSummaryTab(){
  const st = xEnsureReportState();
  const all = collectAlertRows({ soonDays: Number(st.aDays) || 30, includeInactive: !!st.aInactive });
  const kinds = Object.keys(X_KIND_LABELS_PL);
  const cnt = {};
  all.forEach(r => {
    cnt[r.type] = cnt[r.type] || {};
    cnt[r.type][r.kind] = (cnt[r.type][r.kind] || 0) + 1;
  });
  const types = X_ALERT_TYPES.filter(t => cnt[t.code]);
  const totalsByKind = {};
  kinds.forEach(k => { totalsByKind[k] = new Set(all.filter(r => r.kind === k).map(r => r.id)).size; });
  const head = `<tr><th>التنبيه</th>${kinds.map(k => `<th>${escapeHtml(X_KIND_LABELS_PL[k])}</th>`).join('')}<th>الإجمالي</th></tr>`;
  const body = Object.keys(X_ALERT_CATS).map(c => {
    const ts = types.filter(t => t.cat === c);
    if(!ts.length) return '';
    return `<tr><td colspan="${kinds.length + 3}" style="background:var(--paper-2,#f3efe2);font-weight:700;">${escapeHtml(X_ALERT_CATS[c])}</td></tr>` +
      ts.map(t => {
        const total = kinds.reduce((s, k) => s + (cnt[t.code][k] || 0), 0);
        return `<tr><td>${escapeHtml(t.label)}</td>${kinds.map(k => {
          const n = cnt[t.code][k] || 0;
          return n ? `<td><button type="button" class="btn btn-outline btn-sm rep-sum-cell" data-kind="${k}" data-type="${t.code}">${n}</button></td>` : '<td style="color:var(--ink-soft);">—</td>';
        }).join('')}<td><strong>${total}</strong></td>
        <td><button type="button" class="btn btn-outline btn-sm rep-sum-cell" data-kind="" data-type="${t.code}">عرض</button></td></tr>`;
      }).join('');
  }).join('') || `<tr><td colspan="${kinds.length + 2}" style="text-align:center;padding:20px;">✓ لا توجد تنبيهات</td></tr>`;

  return `<div class="stats-row" style="margin-bottom:12px;">
      ${kinds.map(k => `<div class="stat-card ${totalsByKind[k] ? 'debt' : ''}"><div class="num">${totalsByKind[k]}</div><div class="lbl">${escapeHtml(X_KIND_LABELS_PL[k])} عندهم تنبيهات</div></div>`).join('')}
    </div>
    <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">اضغط أي رقم لفتح تقرير التنبيه بالتفصيل. (النشطين فقط${st.aInactive ? ' — مفعّل عرض الكل' : ''})</p>
    <div class="table-wrap"><table class="data-table"><thead>${head.replace('</tr>', '<th></th></tr>')}</thead><tbody>${body}</tbody></table></div>`;
}

function alertsSummaryExportData(){
  const st = xEnsureReportState();
  const all = collectAlertRows({ soonDays: Number(st.aDays) || 30, includeInactive: !!st.aInactive });
  const kinds = Object.keys(X_KIND_LABELS_PL);
  const rows = X_ALERT_TYPES.map(t => {
    const per = kinds.map(k => all.filter(r => r.type === t.code && r.kind === k).length);
    const total = per.reduce((a, b) => a + b, 0);
    return total ? [X_ALERT_CATS[t.cat], t.label].concat(per, [total]) : null;
  }).filter(Boolean);
  return { headers: ['القسم', 'التنبيه'].concat(kinds.map(k => X_KIND_LABELS_PL[k]), ['الإجمالي']), rows, name: 'ملخص-التنبيهات', sheetName: 'ملخص التنبيهات' };
}

/* ---------- 9) تبويب: مصفوفة الأوراق ---------- */

function xMatrixData(){
  const st = xEnsureReportState();
  const kind = st.mKind || 'worker';
  const lists = { employee: DATA.employees, worker: DATA.workers, supervisor: DATA.supervisors, driver: DATA.drivers, equipment: DATA.equipment };
  const idx = xBuildDocIndex();
  const docs = xRequiredDocs(kind);
  let list = (lists[kind] || []).filter(p => p && !xIsResigned(p, kind) && (st.mInactive || !xIsInactive(p, kind)));
  if(st.mDept){
    if(st.mDept === '__none__') list = list.filter(p => !(p.departmentId || p.categoryId));
    else list = list.filter(p => String(p.departmentId || p.categoryId || '') === String(st.mDept));
  }
  if(st.mProject){
    if(st.mProject === '__none__') list = list.filter(p => !String(p.project || '').trim());
    else list = list.filter(p => String(p.project || '') === String(st.mProject));
  }
  if(st.mQ && String(st.mQ).trim()) list = smartSearchList(list, st.mQ);
  const rows = list.map(p => {
    const miss = xMissingDocLabels(kind, p, idx);
    const temp = kind === 'worker' && typeof isTemporaryWorker === 'function' && isTemporaryWorker(p);
    return { p, miss, temp, has: docs.map(d => !miss.some(m => m === d.label)) };
  });
  const filtered = st.mOnly === 'missing' ? rows.filter(r => r.miss.length) : (st.mOnly === 'complete' ? rows.filter(r => !r.miss.length) : rows);
  filtered.sort((a, b) => b.miss.length - a.miss.length || String(a.p.name || '').localeCompare(String(b.p.name || ''), 'ar'));
  return { kind, docs, all: rows, rows: filtered };
}

function repDocsMatrixTab(){
  const st = xEnsureReportState();
  const m = xMatrixData();
  const totalMissing = m.all.filter(r => r.miss.length).length;
  const perDoc = m.docs.map((d, i) => m.all.filter(r => !r.has[i] && !r.temp).length);
  const bar = `<div class="filters-bar" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
    <input type="search" id="repMQ" class="input" placeholder="بحث: اسم، كود، هاتف، قومي..." value="${escapeHtml(st.mQ || '')}" style="min-width:220px;">
    <select id="repMKind" class="input" title="الفئة">${Object.keys(X_KIND_LABELS_PL).map(k => xOpt(k, st.mKind, X_KIND_LABELS_PL[k])).join('')}</select>
    <select id="repMOnly" class="input" title="العرض">
      ${xOpt('missing', st.mOnly, 'اللي نقصهم أوراق فقط')}${xOpt('', st.mOnly, 'الكل')}${xOpt('complete', st.mOnly, 'المكتملين فقط')}
    </select>
    <select id="repMDept" class="input" title="القسم"><option value="">القسم: الكل</option>${xDeptOptions(st.mDept)}</select>
    <select id="repMProject" class="input" title="المشروع"><option value="">المشروع: الكل</option>${xProjectOptions(st.mProject)}</select>
    <select id="repMInactive" class="input" title="الحالة">${xOpt('', st.mInactive, 'النشطين فقط')}${xOpt('1', st.mInactive, 'كل السجلات')}</select>
    <button type="button" class="btn btn-outline btn-sm" id="repMClear">مسح الفلاتر</button>
  </div>`;
  const MAX = 500;
  const head = `<tr><th>الكود</th><th>الاسم</th><th>القسم</th><th>المشروع</th>${m.docs.map((d, i) => `<th title="${escapeHtml(d.label)}">${escapeHtml(d.label)}<br><span style="font-weight:400;font-size:11px;">ناقص: ${perDoc[i]}</span></th>`).join('')}<th>عدد الناقص</th></tr>`;
  const body = m.rows.slice(0, MAX).map(r => `<tr>
      <td>${escapeHtml(r.p.code || '')}</td>
      <td><strong class="rep-open" data-kind="${m.kind}" data-id="${escapeHtml(r.p.id)}" style="cursor:pointer;color:var(--ledger-green);">${escapeHtml(r.p.name || r.p.typeLabel || '')}</strong></td>
      <td>${escapeHtml((typeof departmentName === 'function' && (r.p.departmentId || r.p.categoryId)) ? departmentName(r.p.departmentId || r.p.categoryId) : '—')}</td>
      <td>${escapeHtml(r.p.project || '—')}</td>
      ${r.has.map(h => `<td style="text-align:center;">${r.temp ? '—' : (h ? '<span class="badge badge-ok">✓</span>' : '<span class="badge badge-err">✗</span>')}</td>`).join('')}
      <td><strong>${r.miss.length}</strong></td>
    </tr>`).join('') || `<tr><td colspan="${m.docs.length + 5}" style="text-align:center;padding:20px;color:var(--ink-soft);">لا نتائج</td></tr>`;
  return `<div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-card"><div class="num">${m.all.length}</div><div class="lbl">إجمالي ${escapeHtml(X_KIND_LABELS_PL[m.kind])}</div></div>
      <div class="stat-card ${totalMissing ? 'debt' : ''}"><div class="num">${totalMissing}</div><div class="lbl">نقصهم أوراق</div></div>
      <div class="stat-card"><div class="num">${m.all.length - totalMissing}</div><div class="lbl">أوراقهم مكتملة</div></div>
    </div>${bar}
    <div class="table-wrap"><table class="data-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>
    ${m.rows.length > MAX ? `<p style="font-size:13px;color:var(--ink-soft);margin-top:8px;">يعرض أول ${MAX} من ${m.rows.length} — التصدير يشمل الكل.</p>` : ''}`;
}

function docsMatrixExportData(){
  const m = xMatrixData();
  return {
    headers: ['الكود', 'الاسم', 'القسم', 'المشروع'].concat(m.docs.map(d => d.label), ['الأوراق الناقصة', 'عدد الناقص']),
    rows: m.rows.map(r => [r.p.code || '', r.p.name || r.p.typeLabel || '',
      (r.p.departmentId || r.p.categoryId) ? departmentName(r.p.departmentId || r.p.categoryId) : '', r.p.project || '']
      .concat(r.has.map(h => r.temp ? '—' : (h ? 'موجود' : 'ناقص')), [r.miss.join('، '), r.miss.length])),
    name: 'مصفوفة-الأوراق-' + m.kind, sheetName: 'مصفوفة الأوراق'
  };
}

/* ---------- 10) ربط أحداث التقارير الجديدة ---------- */

function bindSmartReportFilters(){
  const st = xEnsureReportState();
  if(!st) return;
  const map = {
    repAQ: 'aQ', repAKind: 'aKind', repAType: 'aType', repASev: 'aSev', repADept: 'aDept', repAProject: 'aProject',
    repADoc: 'aDoc', repADays: 'aDays', repAMode: 'aMode', repAInactive: 'aInactive',
    repMQ: 'mQ', repMKind: 'mKind', repMOnly: 'mOnly', repMDept: 'mDept', repMProject: 'mProject', repMInactive: 'mInactive'
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if(!el || el.dataset.boundSmart === '1') return;
    el.dataset.boundSmart = '1';
    const evt = (el.tagName === 'INPUT' && (el.type === 'search' || el.type === 'text')) ? 'input' : 'change';
    el.addEventListener(evt, () => {
      st[map[id]] = el.value || '';
      if(id === 'repMKind'){ st.mDept = ''; st.mProject = ''; }
      rerenderCurrentPage();
    });
  });
  const clearA = document.getElementById('repAClear');
  if(clearA) clearA.addEventListener('click', () => {
    Object.assign(st, { aKind: '', aType: '', aSev: '', aDept: '', aProject: '', aQ: '', aDoc: '', aDays: '30', aMode: 'alert', aInactive: '' });
    rerenderCurrentPage();
  });
  const clearM = document.getElementById('repMClear');
  if(clearM) clearM.addEventListener('click', () => {
    Object.assign(st, { mQ: '', mDept: '', mProject: '', mOnly: 'missing', mInactive: '' });
    rerenderCurrentPage();
  });
  document.querySelectorAll('.rep-atype').forEach(b => b.addEventListener('click', () => {
    const t = b.getAttribute('data-atype') || '';
    st.aType = st.aType === t ? '' : t;
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.rep-sum-cell').forEach(b => b.addEventListener('click', () => {
    st.aKind = b.getAttribute('data-kind') || '';
    st.aType = b.getAttribute('data-type') || '';
    st.aSev = ''; st.aDoc = ''; st.aQ = '';
    reportsState.tab = 'alerts';
    rerenderCurrentPage();
  }));
  document.querySelectorAll('.rep-open').forEach(b => b.addEventListener('click', () => {
    const kind = b.getAttribute('data-kind'), id = b.getAttribute('data-id');
    if(kind === 'equipment'){
      try{ if(typeof equipmentFilters !== 'undefined') equipmentFilters.detailId = id; }catch(_e){}
      if(typeof goToPage === 'function') goToPage('equipment');
    } else if(typeof openPersonDetailPage === 'function'){
      openPersonDetailPage(kind, id);
    } else if(typeof openPersonDetailModal === 'function'){
      openPersonDetailModal(kind, id);
    }
  }));
}
