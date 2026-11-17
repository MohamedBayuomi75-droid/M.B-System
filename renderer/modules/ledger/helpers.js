/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — helpers.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- helpers ---------------- */
function lgUid(prefix){ return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

/** سجل التعديلات الشامل — آخر 500 عملية + حفظ مؤجل */
function logAction(action, details){
  try{
    if(!DATA.auditLog) DATA.auditLog = [];
    const entry = {
      id: lgUid('log'),
      at: new Date().toISOString(),
      action: String(action || ''),
      details: String(details || '')
    };
    // في وضع الشبكة: نسجّل مين اللي عمل العملية عشان الأدمن يقدر يتابع كل مستخدم
    if(typeof isNetworkMode==='function' && isNetworkMode() && typeof currentUser!=='undefined' && currentUser){
      entry.byUsername = currentUser.username;
      entry.byName = currentUser.name || currentUser.username;
      entry.byRole = currentUser.role;
    }
    DATA.auditLog.unshift(entry);
    if(DATA.auditLog.length > 500) DATA.auditLog = DATA.auditLog.slice(0, 500);
    // حفظ خفيف حتى لا يضيع السجل عند الإغلاق المفاجئ
    try{ if(typeof saveData==='function' && !readOnlyMode) saveData(false); }catch(e){}
  }catch(e){}
}

/* ========== التحقق من صحة البيانات ========== */

/** يتحقق من حقول الفاتورة قبل الحفظ — يرجع مصفوفة أخطاء (فارغة = سليم) */
function validateInvoiceFields(fields){
  const errors = [];
  if(!fields.supplierId) errors.push('المورد مطلوب');
  if(!fields.invoiceNo || !String(fields.invoiceNo).trim()) errors.push('رقم الفاتورة مطلوب');
  if(!fields.date) errors.push('تاريخ التعامل مطلوب');
  const base = Number(fields.baseValue) || 0;
  const vat = Number(fields.vat) || 0;
  const stamp = Number(fields.stampDuty) || 0;
  const withheld = Number(fields.withheld) || 0;
  if(base < 0) errors.push('القيمة الإجمالية لا يمكن أن تكون سالبة');
  if(base === 0 && !fields.isReturn) errors.push('القيمة الإجمالية للتعامل يجب أن تكون أكبر من صفر');
  if(vat < 0) errors.push('الضريبة لا يمكن أن تكون سالبة');
  if(stamp < 0) errors.push('الدمغات لا يمكن أن تكون سالبة');
  if(withheld < 0) errors.push('المبلغ المخصوم لا يمكن أن يكون سالباً');
  if(withheld > base + vat + stamp + 0.0001) errors.push('المبلغ المخصوم أكبر من إجمالي الفاتورة');
  if(fields.dueDate && fields.date && fields.dueDate < fields.date) errors.push('تاريخ الاستحقاق لا يمكن أن يكون قبل تاريخ الفاتورة');
  if(fields.discountRate !== '' && fields.discountRate !== undefined && fields.discountRate !== null){
    const dr = Number(fields.discountRate);
    if(isNaN(dr) || dr < 0 || dr > 100) errors.push('نسبة الخصم يجب أن تكون بين 0 و 100');
  }
  return errors;
}

function validateSupplierFields(fields){
  const errors = [];
  if(!fields.name || !String(fields.name).trim()) errors.push('اسم المورد مطلوب');
  if(fields.taxId && String(fields.taxId).trim().length > 0 && String(fields.taxId).trim().length < 5)
    errors.push('الرقم الضريبي قصير جداً (أقل من 5 أرقام)');
  if(fields.email && String(fields.email).trim()){
    const em = String(fields.email).trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errors.push('صيغة البريد الإلكتروني غير صحيحة');
  }
  const ob = Number(fields.openingBalance);
  if(fields.openingBalance !== '' && fields.openingBalance !== undefined && isNaN(ob))
    errors.push('الرصيد الافتتاحي يجب أن يكون رقماً');
  return errors;
}

/** فحص شامل لكل البيانات المخزنة — يرجع قائمة مشاكل */
function validateAllData(){
  const issues = [];
  // موردين
  DATA.ledger.suppliers.forEach(s=>{
    if(!s.name || !String(s.name).trim())
      issues.push({ type:'مورد', ref:s.name||s.id, msg:'مورد بدون اسم', invId:null, supplierId:s.id });
  });
  // فواتير
  DATA.ledger.invoices.forEach(inv=>{
    const ref = inv.invoiceNo || inv.id;
    const supName = (supplierById(inv.supplierId)||{}).name || '—';
    const baseIssue = { type:'فاتورة', ref, supplier:supName, invId:inv.id };
    const errs = validateInvoiceFields(inv);
    errs.forEach(msg => issues.push({ ...baseIssue, msg }));
    if(inv.supplierId && !supplierById(inv.supplierId))
      issues.push({ ...baseIssue, msg:'مربوطة بمورد غير موجود', supplier:'—' });
    const expectedTotal = Number(inv.baseValue||0) + Number(inv.vat||0) + Number(inv.stampDuty||0);
    if(Math.abs(Number(inv.totalInvoice||0) - expectedTotal) > 0.02)
      issues.push({ ...baseIssue, msg:'إجمالي الفاتورة لا يطابق (القيمة+الضريبة+الدمغة)' });
    const expectedNet = expectedTotal - Number(inv.withheld||0);
    if(Math.abs(Number(inv.netInvoice||0) - expectedNet) > 0.02)
      issues.push({ ...baseIssue, msg:'الصافي لا يطابق (الإجمالي−المخصوم)' });
  });
  // دفعات
  DATA.ledger.payments.forEach(p=>{
    if(!p.supplierId || !supplierById(p.supplierId))
      issues.push({ type:'دفعة', ref:p.id, msg:'مربوطة بمورد غير موجود', invId:p.invoiceId||null });
    if((Number(p.amount)||0) <= 0)
      issues.push({ type:'دفعة', ref:p.id, msg:'مبلغ غير صالح (صفر أو سالب)', invId:p.invoiceId||null });
    if(p.invoiceId && !DATA.ledger.invoices.find(i=>i.id===p.invoiceId))
      issues.push({ type:'دفعة', ref:p.id, msg:'مربوطة بفاتورة محذوفة', invId:null });
  });
  return issues;
}

/** إصلاح تلقائي للقيم المحسوبة في الفواتير
 * يعيد حساب: إجمالي الفاتورة = قيمة+ضريبة+دمغة
 * والصافي = الإجمالي − المخصوم
 * لكل الفواتير (حتى لو الفرق صغير)
 */
/** خانات ناقصة في الفاتورة (للتنبيه ⚠️) */
function invoiceMissingFields(inv){
  if(!inv) return ['بيانات الفاتورة'];
  const miss = [];
  const empty = v => v===undefined || v===null || String(v).trim()==='';
  if(empty(inv.invoiceNo)) miss.push('رقم الفاتورة');
  if(empty(inv.date)) miss.push('تاريخ التعامل');
  if(empty(inv.supplierId) || !supplierById(inv.supplierId)) miss.push('المورد');
  if(empty(inv.description)) miss.push('بيان المشتريات');
  if(empty(inv.internalCode)) miss.push('الكود الداخلي');
  if(empty(inv.supplierItemCode)) miss.push('كود المورد');
  if(empty(inv.category)) miss.push('نوع الفاتورة/التصنيف');
  if(empty(inv.project)) miss.push('المشروع');
  if(empty(inv.nature)) miss.push('طبيعة التعامل');
  if(empty(inv.discountType)) miss.push('نوع الخصم');
  if(empty(inv.dueDate)) miss.push('تاريخ الاستحقاق');
  const base = Number(inv.baseValue);
  if(!Number.isFinite(base) || (base===0 && !inv.isReturn)) miss.push('القيمة الإجمالية');
  if(inv.vat===undefined || inv.vat===null || inv.vat==='') miss.push('الضريبة');
  if(inv.stampDuty===undefined || inv.stampDuty===null || inv.stampDuty==='') miss.push('الدمغات');
  if(inv.withheld===undefined || inv.withheld===null || inv.withheld==='') miss.push('المبلغ المخصوم');
  // حسابات غير متطابقة
  const expectedTotal = roundMoney((Number(inv.baseValue)||0) + (Number(inv.vat)||0) + (Number(inv.stampDuty)||0), 6);
  const expectedNet = roundMoney(expectedTotal - (Number(inv.withheld)||0), 6);
  if(Math.abs((Number(inv.totalInvoice)||0) - expectedTotal) > 0.0001) miss.push('إجمالي غير متطابق');
  if(Math.abs((Number(inv.netInvoice)||0) - expectedNet) > 0.0001) miss.push('صافي غير متطابق');
  return miss;
}
function isInvoiceIncomplete(inv){
  return invoiceMissingFields(inv).length > 0;
}

/** معاينة إصلاح الحسابات — بدون تطبيق */
function previewInvoiceCalculationFixes(){
  const list = [];
  DATA.ledger.invoices.forEach(inv=>{
    const base = Number(inv.baseValue)||0;
    const vat = Number(inv.vat)||0;
    const stamp = Number(inv.stampDuty)||0;
    const withheld = Number(inv.withheld)||0;
    const total = roundMoney(base + vat + stamp, 6);
    const net = roundMoney(total - withheld, 6);
    const oldTotal = Number(inv.totalInvoice);
    const oldNet = Number(inv.netInvoice);
    if(!Number.isFinite(oldTotal) || !Number.isFinite(oldNet) ||
       Math.abs(oldTotal - total) > 0.000001 || Math.abs(oldNet - net) > 0.000001){
      const s = supplierById(inv.supplierId);
      list.push({
        id: inv.id,
        invoiceNo: inv.invoiceNo||'-',
        supplier: s?s.name:'—',
        oldTotal, newTotal: total,
        oldNet, newNet: net
      });
    }
  });
  return list;
}

function fixInvoiceCalculations(){
  let fixed = 0;
  DATA.ledger.invoices.forEach(inv=>{
    const base = Number(inv.baseValue)||0;
    const vat = Number(inv.vat)||0;
    const stamp = Number(inv.stampDuty)||0;
    const withheld = Number(inv.withheld)||0;
    const total = roundMoney(base + vat + stamp, 6);
    const net = roundMoney(total - withheld, 6);
    const oldTotal = Number(inv.totalInvoice);
    const oldNet = Number(inv.netInvoice);
    // أصلح لو مختلف أو غير معرّف أو NaN
    if(!Number.isFinite(oldTotal) || !Number.isFinite(oldNet) ||
       Math.abs(oldTotal - total) > 0.000001 || Math.abs(oldNet - net) > 0.000001){
      inv.baseValue = base;
      inv.vat = vat;
      inv.stampDuty = stamp;
      inv.withheld = withheld;
      inv.totalInvoice = total;
      inv.netInvoice = net;
      fixed++;
    }
  });
  return fixed;
}

function parseAmount(v){
  if(v===undefined||v===null||v==='') return 0;
  let s = String(v).trim();
  // أرقام عربية شرقية
  s = s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  s = s.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  s = s.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')   // علامات الاتجاه (بتظهر مع الأرقام السالبة المنسّقة)
       .replace(/\u066C/g, ',').replace(/\u066B/g, '.')   // فاصلة آلاف وعلامة عشرية عربية
       .replace(/\u2212/g, '-');                         // علامة ناقص رياضية
  s = s.replace(/,/g, '').replace(/\s/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function roundMoney(n, digits){
  digits = digits == null ? 6 : digits;
  const f = Math.pow(10, digits);
  return Math.round((Number(n) || 0) * f) / f;
}
/** تاريخ اليوم بصيغة ISO (yyyy-mm-dd) بالتوقيت المحلي للجهاز — بدون المرور بـ UTC
 *  (toISOString() بيحوّل لتوقيت UTC وده ممكن "يسرق" يوم في الساعات الأولى من اليوم
 *  في أي منطقة زمنية متقدمة عن UTC، زي توقيت القاهرة). */
function todayIso(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
/** إضافة عدد أيام لتاريخ ISO (yyyy-mm-dd) والرجوع بتاريخ ISO جديد — حساب محلي بالكامل
 *  (نبني الـ Date بمكوّناته المحلية بدل تمرير النص مباشرة، لتفادي التباس تفسير
 *  السلسلة النصية كـ UTC، ونرجّع النتيجة بمكوّنات محلية أيضًا بدل toISOString()). */
function addDaysToIsoDate(isoDate, days){
  const m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if(isNaN(d)) return null;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
/** تنسيق التاريخ الموحّد للعرض في كل البرنامج: يوم/شهر/سنة (مثال: 30/3/2026) */
function lgFmtDate(value){
  if(!value) return '';
  let d;
  if(value instanceof Date){
    d = value;
  } else {
    const s = String(value).trim();
    if(!s) return '';
    // صيغة ISO المخزّنة (yyyy-mm-dd أو yyyy-mm-ddTHH:mm...) — نحوّلها مباشرة بدون فروقات التوقيت
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
    d = new Date(s);
  }
  if(isNaN(d)) return escapeHtml(String(value)); // S-1: قيمة غير صالحة بتتطبع جوه HTML
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}
/** تاريخ ووقت موحّد للعرض (لسجل التعديلات ونحوه): يوم/شهر/سنة، ساعة:دقيقة */
function lgFmtDateTime(value){
  if(!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if(isNaN(d)) return escapeHtml(String(value));
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${lgFmtDate(d)}، ${hh}:${mm}`;
}
/* =========================================================
   محرك عرض وإدخال المبالغ المالية
   العرض:  ٥,٦٥٧,٤٣٥,٨٦٥.٦٥٥٦٦٨  (أرقام عربية + فاصلة للآلاف + نقطة عشرية)
   الإدخال: الفواصل بتتحط تلقائياً وإنت بتكتب، والأصفار العشرية بتفضل ظاهرة
   ========================================================= */
const NUM_MAX_DECIMALS = 6;               // أقصى دقة محفوظة للمبالغ
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toArDigits(str){ return String(str).replace(/[0-9]/g, d => AR_DIGITS[Number(d)]); }
function toLatinDigits(str){
  return String(str)
    .replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
/** عدد الخانات العشرية المعروضة: رقم ثابت (0–6) أو 'auto' (بدون أصفار زيادة). الافتراضي 6 زي المطلوب */
function moneyDecimals(){
  const v = (typeof DATA !== 'undefined' && DATA && DATA.settings) ? DATA.settings.moneyDecimals : undefined;
  if(v === 'auto') return 'auto';
  const n = Number(v);
  return (v !== undefined && v !== '' && Number.isInteger(n) && n >= 0 && n <= NUM_MAX_DECIMALS) ? n : NUM_MAX_DECIMALS;
}
function groupThousands(intStr){ return String(intStr).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
/** عرض مبلغ: ٥,٦٥٧,٤٣٥,٨٦٥.٦٥٥٦٦٨ */
function fmt(n){
  let num = roundMoney(Number(n) || 0, NUM_MAX_DECIMALS) || 0;      // يمنع ظهور -0
  const mode = moneyDecimals();
  let txt;
  if(mode === 'auto'){
    const raw = Math.abs(num).toFixed(NUM_MAX_DECIMALS).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    const fl = raw.indexOf('.') > -1 ? Math.max(2, raw.split('.')[1].length) : 0;
    txt = Math.abs(num).toFixed(fl);
  } else {
    txt = Math.abs(num).toFixed(mode);
  }
  if(Number(txt) === 0) num = 0;
  const parts = txt.split('.');
  let out = groupThousands(parts[0]) + (parts[1] !== undefined ? '.' + parts[1] : '');
  out = toArDigits(out);
  // السالب: نعزله LTR عشان العلامة تفضل قدام الرقم جوه النص العربي
  return num < 0 ? '\u2066-' + out + '\u2069' : out;
}
/** قيمة تتحط جوه خانة إدخال (نفس شكل العرض). فاضي لو القيمة فاضية */
function fmtInput(n){
  if(n === undefined || n === null || n === '') return '';
  return fmt(n).replace(/[\u2066\u2069]/g, '');
}
/** عرض قيمة نصية محفوظة كسعر وحدة (قد تكون فاضية أو نص غير رقمي) */
function fmtText(v){
  const t = String(v == null ? '' : v).trim();
  if(!t) return '';
  const plain = toLatinDigits(t).replace(/[,\u066C\s]/g, '').replace(/\u066B/g, '.');
  return /^-?\d+(\.\d+)?$/.test(plain) ? fmt(parseFloat(plain)) : t;
}
/** نفس fmtText لكن لقيمة خانة إدخال (من غير علامات اتجاه) */
function fmtInputText(v){ return fmtText(v).replace(/[\u2066\u2069]/g, ''); }
/** نص رقمي بسيط للتخزين: أرقام لاتينية من غير فواصل ("٢,٠٠٠.٥٠" → "2000.50") مع الحفاظ على الأصفار */
function plainMoneyText(v){
  const t = String(v == null ? '' : v).trim();
  if(!t) return '';
  const plain = toLatinDigits(t).replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').replace(/[,\u066C\s]/g, '').replace(/\u066B/g, '.').replace(/\u2212/g, '-');
  return /^-?\d*\.?\d*$/.test(plain) ? plain : t;
}

/** يصغّر خط الأرقام الطويلة (٥,٦٥٧,٤٣٥,٨٦٥.٦٥٥٦٦٨) عشان تتحط في سطر واحد جوه مربعات الإحصائيات */
function fitMoneyBlocks(){
  document.querySelectorAll('.stat-card .num').forEach(lgEl=>{
    lgEl.style.fontSize = '';
    let size = parseFloat(getComputedStyle(lgEl).fontSize) || 16;
    let guard = 0;
    while(lgEl.scrollWidth > lgEl.clientWidth + 1 && size > 9 && guard++ < 40){
      size -= 0.5;
      lgEl.style.fontSize = size + 'px';
    }
  });
}
/** تنسيق نص أثناء الكتابة: يحط فواصل الآلاف تلقائياً ويحافظ على النقطة والأصفار العشرية */
function moneyTypedFormat(raw, allowNeg){
  let s = toLatinDigits(raw).replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').replace(/\u066B/g, '.').replace(/\u2212/g, '-');
  const neg = !!allowNeg && /^\s*-/.test(s);
  const dot = s.indexOf('.');
  let ip = dot > -1 ? s.slice(0, dot) : s;
  let fp = dot > -1 ? s.slice(dot + 1) : '';
  ip = ip.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  fp = fp.replace(/\D/g, '').slice(0, NUM_MAX_DECIMALS);
  if(ip === '' && dot > -1) ip = '0';
  let out = groupThousands(ip) + (dot > -1 ? '.' + fp : '');
  if(neg && (ip !== '' || dot > -1)) out = '-' + out; else if(neg) out = '-';
  return toArDigits(out);
}
/** عند الخروج من الخانة: إكمال الخانات العشرية بأصفار حسب الإعداد (٢,٠٠٠ ← ٢,٠٠٠.٠٠٠٠٠٠) */
function moneyPadDecimals(str){
  const mode = moneyDecimals();
  if(mode === 'auto' || mode === 0 || !str || str === '-') return str;
  const t = toLatinDigits(str);
  const dot = t.indexOf('.');
  const have = dot > -1 ? t.length - dot - 1 : 0;
  if(have >= mode) return str;
  return toArDigits(dot > -1 ? t + '0'.repeat(mode - have) : t + '.' + '0'.repeat(mode));
}
function moneyIsSig(ch){ return /[0-9٠-٩.\u066B\-]/.test(ch); }
function moneyReformatInput(lgEl){
  const allowNeg = lgEl.getAttribute('data-money') === 'neg';
  let raw = lgEl.value;
  let pos = typeof lgEl.selectionStart === 'number' ? lgEl.selectionStart : raw.length;
  const out = moneyTypedFormat(raw, allowNeg);
  if(out === raw) return;
  // نحسب كام خانة مؤثرة (رقم/نقطة/ناقص) باقية على يمين المؤشر، ونرجّع المؤشر بحيث يتبقى نفس العدد.
  // العدّ من اليمين بيخلّي الفواصل والصفر اللي بيتضاف قبل النقطة (٠.) ما يزحزحوش المؤشر.
  let after = 0;
  for(let i = pos; i < raw.length; i++) if(moneyIsSig(raw[i])) after++;
  let total = 0;
  for(let i = 0; i < out.length; i++) if(moneyIsSig(out[i])) total++;
  const want = Math.max(0, total - after);
  lgEl.value = out;
  let np = 0, c = 0;
  if(want > 0){
    for(let i = 0; i < out.length; i++){
      if(moneyIsSig(out[i])){ c++; if(c === want){ np = i + 1; break; } }
    }
  }
  try{ lgEl.setSelectionRange(np, np); }catch(_e){}
}
/** ربط كل خانات الإدخال اللي عليها data-money (حتى اللي بتتضاف ديناميكياً) */
function installMoneyInputs(){
  if(window.__moneyInstalled) return;
  window.__moneyInstalled = true;
  const isMoney = t => t && t.tagName === 'INPUT' && t.hasAttribute && t.hasAttribute('data-money');
  document.addEventListener('focusin', e=>{
    const t = e.target;
    if(!isMoney(t)) return;
    t.setAttribute('dir', 'ltr');
    t.style.textAlign = 'right';
    t.__moneyPrev = t.value;
  }, true);
  document.addEventListener('input', e=>{
    const t = e.target;
    if(!isMoney(t)) return;
    // مسح الفاصلة بالـ Backspace/Delete: نمسح معاها الرقم المجاور بدل ما الفاصلة ترجع وتعلّق المؤشر
    const prev = t.__moneyPrev;
    if(prev != null && (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') && t.value.length === prev.length - 1){
      const p = t.selectionStart;
      if(prev[p] === ',' ){
        const v = t.value;
        if(e.inputType === 'deleteContentBackward' && p > 0){ t.value = v.slice(0, p - 1) + v.slice(p); try{ t.setSelectionRange(p - 1, p - 1); }catch(_e){} }
        else if(e.inputType === 'deleteContentForward' && p < v.length){ t.value = v.slice(0, p) + v.slice(p + 1); try{ t.setSelectionRange(p, p); }catch(_e){} }
      }
    }
    moneyReformatInput(t);
    t.__moneyPrev = t.value;
  }, true);
  document.addEventListener('focusout', e=>{
    const t = e.target;
    if(!isMoney(t)) return;
    if(t.disabled || t.readOnly) return;
    const padded = moneyPadDecimals(moneyTypedFormat(t.value, t.getAttribute('data-money') === 'neg'));
    if(padded !== t.value){ t.value = padded; t.dispatchEvent(new Event('change', { bubbles:true })); }
  }, true);
}
function lgEscapeHtml(str){
  if(str === undefined || str === null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
/** شعار موحّد ثلاثي الأبعاد للبرنامج (شاشة + طباعة) */
function lgBrandLogoHtml(size){
  size = size || 48;
  const w = Math.round(size * 1.2);
  return `<img class="mb-logo-img" src="assets/logo.png" alt="دفتر الموردين" width="${w}" height="${size}" style="width:${w}px;height:${size}px;border-radius:6px;object-fit:contain;background:transparent;box-shadow:none;border:none;" />`;
}
function lgEl(html){ const d=document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
/* حقول إضافية مخصصة (اسم/قيمة) تُستخدم في نماذج الدفعات وغيرها */
/* خانة مخصصة واحدة بسيطة - نفس شكل باقي حقول الفورم (تسمية فوق + خانة واحدة تحتها) */
function lgExtraFieldRowHtml(label, value){
  return `
    <div class="field extra-field-row" style="position:relative;">
      <label>${lgEscapeHtml(label||'خانة')} <span class="ef-remove" title="حذف الخانة" style="cursor:pointer;color:var(--debt);font-weight:900;">✕</span></label>
      <input class="ef-value" data-ef-label="${lgEscapeHtml(label||'خانة')}" value="${lgEscapeHtml(value||'')}" />
    </div>`;
}
/* إضافة خانة مباشرة (تُستخدم لإعادة رسم خانات محفوظة مسبقاً) */
function lgAddExtraFieldRow(wrapId, label, value){
  const wrap = document.getElementById(wrapId); if(!wrap) return;
  lgInitExtraFieldsWrap(wrapId);
  wrap.insertAdjacentHTML('beforeend', lgExtraFieldRowHtml(label, value));
}
/* إضافة خانة جديدة فارغة عن طريق نافذة صغيرة تسأل عن اسمها (window.prompt غير مدعوم في Electron) */
function lgPromptAddExtraField(wrapId){
  const overlay = lgEl(`
    <div class="modal-overlay" id="efPromptOverlay">
      <div class="modal" style="max-width:360px;">
        <h3>اسم الخانة الجديدة</h3>
        <div class="field"><label>اسم الخانة</label><input id="efPromptInput" placeholder="مثال: رقم الشيك" /></div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="efPromptCancel">إلغاء</button>
          <button class="btn btn-primary" id="efPromptOk">إضافة</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  const input = document.getElementById('efPromptInput');
  setTimeout(()=>input.focus(), 30);
  const close = () => overlay.remove();
  document.getElementById('efPromptCancel').addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  const confirmAdd = () => {
    const label = input.value.trim();
    if(!label){ input.focus(); return; }
    close();
    lgAddExtraFieldRow(wrapId, label, '');
    const wrap = document.getElementById(wrapId);
    const lastInput = wrap && wrap.querySelector('.extra-field-row:last-child .ef-value');
    if(lastInput) lastInput.focus();
  };
  document.getElementById('efPromptOk').addEventListener('click', confirmAdd);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); confirmAdd(); } });
}
/* حدث واحد مفوَّض (delegated) للحذف - يشتغل على الصفوف الموجودة مسبقاً والمضافة لاحقاً معاً */
function lgInitExtraFieldsWrap(wrapId){
  const wrap = document.getElementById(wrapId); if(!wrap || wrap.dataset.wired) return;
  wrap.dataset.wired = '1';
  wrap.addEventListener('click', (e)=>{
    const btn = e.target.closest('.ef-remove');
    if(btn){ const row = btn.closest('.extra-field-row'); if(row) row.remove(); }
  });
}
function collectExtraFields(wrapId){
  const wrap = document.getElementById(wrapId); if(!wrap) return [];
  const out = [];
  wrap.querySelectorAll('.extra-field-row').forEach(row=>{
    const valueInput = row.querySelector('.ef-value'); if(!valueInput) return;
    const label = valueInput.getAttribute('data-ef-label') || 'خانة';
    const value = valueInput.value.trim();
    if(value) out.push({ label, value });
  });
  return out;
}
function lgExtraFieldsSummary(fields){
  if(!fields || !fields.length) return '';
  return fields.map(f=>`${f.label}: ${f.value}`).join(' | ');
}
let toastTimer=null;
/** توست موحّد: نفس showToast بتاع البرنامج كله (طبقة واحدة للإشعارات) */
function lgShowToast(msg, ms){ showToast(msg, ms); }

function showAppPrompt(message, defaultValue, opts){
  opts = opts || {};
  return new Promise(resolve=>{
    const title = opts.title || 'إدخال';
    const okText = opts.okText || 'موافق';
    const cancelText = opts.cancelText || 'إلغاء';
    const overlay = lgEl(`
      <div class="modal-overlay app-dialog-overlay" style="z-index:150000;">
        <div class="modal app-dialog" role="dialog" style="max-width:460px;">
          <h3>${lgEscapeHtml(title)}</h3>
          <p class="app-dialog-msg">${lgEscapeHtml(String(message||''))}</p>
          <div class="field" style="margin:12px 0;">
            <input type="text" id="appDlgInput" value="${lgEscapeHtml(String(defaultValue||''))}" style="width:100%;" autocomplete="off" />
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" id="appDlgCancel">${lgEscapeHtml(cancelText)}</button>
            <button class="btn btn-primary" id="appDlgOk">${lgEscapeHtml(okText)}</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(overlay);
    const inp = overlay.querySelector('#appDlgInput');
    const finish = (v)=>{ try{ overlay.remove(); }catch(e){} resolve(v); };
    overlay.querySelector('#appDlgOk').addEventListener('click', ()=> finish(inp.value));
    overlay.querySelector('#appDlgCancel').addEventListener('click', ()=> finish(null));
    overlay.addEventListener('click', e=>{ if(e.target===overlay) finish(null); });
    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); finish(inp.value); }
      if(e.key==='Escape'){ e.preventDefault(); finish(null); }
    });
    setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} }, 30);
  });
}
function showAppConfirm(message, opts){
  opts = opts || {};
  return new Promise(resolve=>{
    const title = opts.title || 'تأكيد';
    const okText = opts.okText || 'موافق';
    const cancelText = opts.cancelText || 'إلغاء';
    const danger = !!opts.danger;
    const overlay = lgEl(`
      <div class="modal-overlay app-dialog-overlay" style="z-index:150000;">
        <div class="modal app-dialog" role="alertdialog" style="max-width:460px;">
          <h3>${lgEscapeHtml(title)}</h3>
          <p class="app-dialog-msg">${lgEscapeHtml(String(message||'')).split('\n').join('<br>')}</p>
          <div class="modal-actions">
            <button class="btn btn-outline" id="appDlgCancel">${lgEscapeHtml(cancelText)}</button>
            <button class="btn ${danger?'btn-danger':'btn-primary'}" id="appDlgOk">${lgEscapeHtml(okText)}</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(overlay);
    const finish = (v)=>{ try{ overlay.remove(); }catch(e){} resolve(!!v); };
    overlay.querySelector('#appDlgOk').addEventListener('click', ()=>finish(true));
    overlay.querySelector('#appDlgCancel').addEventListener('click', ()=>finish(false));
    overlay.addEventListener('click', e=>{ if(e.target===overlay) finish(false); });
    setTimeout(()=>{ try{ overlay.querySelector('#appDlgOk').focus(); }catch(e){} }, 30);
  });
}

function supplierById(id){
  if(!id) return null;
  if(typeof __lgIndexes !== 'undefined' && __lgIndexes.suppliersById)
    return __lgIndexes.suppliersById[id] || null;
  return DATA.ledger.suppliers.find(s=>s.id===id) || null;
}
function supplierInvoices(sid){
  if(typeof __lgIndexes !== 'undefined' && __lgIndexes.invoicesBySupplier)
    return (__lgIndexes.invoicesBySupplier[sid] || []).slice();
  return DATA.ledger.invoices.filter(i=>i.supplierId===sid);
}
function supplierPayments(sid){
  if(typeof __lgIndexes !== 'undefined' && __lgIndexes.paymentsBySupplier)
    return (__lgIndexes.paymentsBySupplier[sid] || []).slice();
  return DATA.ledger.payments.filter(p=>p.supplierId===sid);
}
function supplierBalance(sid){
  const s = supplierById(sid);
  const opening = Number((s && s.openingBalance) || 0);
  // الرصيد = ما علينا للمورد (موجب = نحن مدينون له)
  // فاتورة: +صافي | مرتجع: −صافي
  // دفعة دائن (سداد له): − | دفعة مدين (قيد/تحصيل عليه لنا): − كمان (تقلل ما علينا / تجعله مدين لنا)
  const inv = supplierInvoices(sid).reduce((a,b)=>a+invoiceSignedNet(b),0);
  const pay = supplierPayments(sid).reduce((a,b)=>a+Number(b.amount||0),0);
  return opening + inv - pay;
}
function paymentDirectionLabel(p){
  if(p && p.direction==='collect') return 'مدين — عليه لنا';
  return 'دائن — علينا له';
}
function invoiceRemaining(inv){
  if(!inv || inv.isReturn || inv.cancelled) return 0; // مرتجع أو ملغاة
  // الباقي يُحسب على أساس صافي الفاتورة
  let paid = 0;
  if(typeof __lgIndexes !== 'undefined' && __lgIndexes.paidByInvoice && inv.id)
    paid = Number(__lgIndexes.paidByInvoice[inv.id] || 0);
  else
    paid = DATA.ledger.payments.filter(p=>p.invoiceId===inv.id).reduce((a,b)=>a+Number(b.amount||0),0);
  return Number(inv.netInvoice||0) - paid;
}

/** بناء HTML إشعار خصم ضريبي — نفس الشكل للفردي والمجمع */
/** القيمة الصافية لإشعار الخصم بعد أي مرتجعات جزئية مرتبطة بالفاتورة —
 *  الفرق بين المبلغ المخصوم (والقيمة الأساسية) في الفاتورة الأصلية وما تم
 *  إرجاعه، عشان الحساب يبقى مظبوط في الإشعار وفي التقرير الربع سنوي مع بعض.
 *  فاتورة عادية من غير مرتجعات مرتبطة بترجع قيمها زي ما هي بالظبط. */
function noticeAmountsFor(inv){
  let withheld = Number(inv.withheld||0);
  let baseValue = Number(inv.baseValue||0);
  if(!inv || inv.isReturn) return { withheld, baseValue };
  const rets = DATA.ledger.invoices.filter(i=>i.isReturn && i.linkedInvoiceId===inv.id);
  if(rets.length){
    const retWithheld = rets.reduce((a,b)=>a+Number(b.withheld||0),0);
    const retBase = rets.reduce((a,b)=>a+Number(b.baseValue||0),0);
    withheld = Math.max(0, roundMoney(withheld - retWithheld, 2));
    baseValue = Math.max(0, roundMoney(baseValue - retBase, 2));
  }
  return { withheld, baseValue };
}

function buildDiscountNoticeHtml(inv, pageBreak){
  const s = supplierById(inv.supplierId);
  const company = (DATA.settings && DATA.settings.companyName) || 'اسم الشركة';
  const managerName = (DATA.settings && DATA.settings.companyManager) ? String(DATA.settings.companyManager).trim() : '';
  const todayStr = lgFmtDate(new Date());
  const net = noticeAmountsFor(inv);
  let noticeWithheld = net.withheld;
  let noticeBase = net.baseValue;
  let noticeNote = '';
  if(inv.postReturnWht && !inv.isReturn){
    noticeNote = 'بعد مرتجع جزئي — المخصوم = مخصوم الفاتورة ناقص مخصوم المرتجع';
  }
  return `
    <div class="disc-notice" ${pageBreak ? 'style="page-break-after:always;margin-bottom:24px;"' : ''}>
      <div class="dn-head">
        <div class="dn-brand-row">
          <div class="dn-brand-logo">${lgBrandLogoHtml(42)}</div>
          <div class="co">${lgEscapeHtml(company)}</div>
          <div class="dn-brand-spacer"></div>
        </div>
        <div class="ti">${inv.postReturnWht ? 'إشعار خصم ضريبي (بعد مرتجع)' : 'إشعار خصم ضريبي'}</div>
        <div class="sub">صادر بتاريخ ${lgEscapeHtml(todayStr)}${noticeNote?' — '+lgEscapeHtml(noticeNote):''}</div>
      </div>
      <div class="dn-grid">
        <div>
          <div class="dn-row"><span class="k">اسم المورد</span><span class="v">${lgEscapeHtml(s?s.name:'-')}</span></div>
          <div class="dn-row"><span class="k">الرقم الضريبي</span><span class="v">${lgEscapeHtml(s?s.taxId||'-':'-')}</span></div>
          <div class="dn-row"><span class="k">طبيعة التعامل</span><span class="v">${lgEscapeHtml(codeDescription(NATURE_OPTIONS, inv.nature))}</span></div>
        </div>
        <div>
          <div class="dn-row"><span class="k">رقم الفاتورة</span><span class="v">${lgEscapeHtml(inv.invoiceNo||'-')}</span></div>
          <div class="dn-row"><span class="k">تاريخ الفاتورة</span><span class="v">${lgEscapeHtml(lgFmtDate(inv.date)||'-')}</span></div>
        </div>
      </div>
      <div class="dn-row" style="margin:0 0 14px;border:1px solid var(--line);border-radius:8px;padding:9px 14px;background:var(--paper);">
        <span class="k">بيان التعامل</span><span class="v" style="white-space:pre-line;">${lgEscapeHtml(inv.description||'-')}</span>
      </div>
      <div class="dn-amounts">
        <div class="dn-amt-box">
          <div class="l">القيمة الإجمالية للتعامل${inv.discountRate?` (نسبة الخصم ${lgEscapeHtml(String(inv.discountRate))}%)`:''}</div>
          <div class="v">${fmt(inv.baseValue)} جنيه</div>
          <div class="w">${tafqeet(inv.baseValue)}</div>
        </div>
        <div class="dn-amt-box hi">
          <div class="l">المبلغ المخصوم</div>
          <div class="v">${fmt(noticeWithheld)} جنيه</div>
          <div class="w">${tafqeet(noticeWithheld)}</div>
        </div>
      </div>
      <div class="dn-sign">
        <div class="dn-sign-box">
          <div class="dn-sign-space" aria-hidden="true"></div>
          <div class="ln"></div>
          ${managerName ? `<div class="dn-sign-name">${lgEscapeHtml(managerName)}</div>` : ''}
          <div class="lb">توقيع واعتماد الجهة الخاصمة</div>
        </div>
        <div class="dn-sign-box">
          <div class="dn-sign-space" aria-hidden="true"></div>
          <div class="ln"></div>
          <div class="lb">توقيع واستلام المورد</div>
        </div>
      </div>
      <div style="margin-top:14px;padding:10px 12px;border:1px dashed var(--line);border-radius:8px;background:var(--paper);text-align:center;">
        <div style="font-size:11px;color:var(--ink-soft);margin-bottom:4px;">كود التحقق</div>
        <div style="font-family:monospace;font-size:13px;font-weight:800;letter-spacing:1px;color:var(--ledger-green);direction:ltr;">
          ${lgEscapeHtml([inv.invoiceNo||'', lgFmtDate(inv.date)||'', (s&&s.taxId)||'', noticeWithheld].join('|'))}
        </div>
        <div style="font-size:10.5px;color:var(--ink-soft);margin-top:4px;">رقم الفاتورة | التاريخ | الرقم الضريبي | المبلغ المخصوم</div>
      </div>
      <div class="dn-footer">هذا الإشعار صادر آلياً بواسطة <strong>دفتر الموردين</strong> ولا يُعتد به إلا بختم وتوقيع الجهة المصدرة</div>
    </div>
  `;
}

/** مقارنة فاتورتين بالكامل (كل الأعمدة المهمة) لتحديد التكرار الحقيقي */
function isSameInvoice(a, b){
  if(!a || !b) return false;
  const norm = v => String(v === undefined || v === null ? '' : v).trim().toLowerCase();
  const num  = v => Number(v) || 0;
  return (
    norm(a.supplierId)   === norm(b.supplierId)   &&
    norm(a.invoiceNo)    === norm(b.invoiceNo)    &&
    norm(a.date)         === norm(b.date)         &&
    norm(a.description)  === norm(b.description)  &&
    norm(a.internalCode) === norm(b.internalCode) &&
    norm(a.supplierItemCode) === norm(b.supplierItemCode) &&
    norm(a.category)     === norm(b.category)     &&
    norm(a.project)      === norm(b.project)      &&
    norm(a.nature)       === norm(b.nature)       &&
    norm(a.discountType) === norm(b.discountType) &&
    norm(a.discountRate) === norm(b.discountRate) &&
    !!a.isReturn         === !!b.isReturn         &&
    num(a.baseValue)     === num(b.baseValue)     &&
    num(a.vat)           === num(b.vat)           &&
    num(a.stampDuty)     === num(b.stampDuty)     &&
    num(a.withheld)      === num(b.withheld)
  );
}

/** تاريخ الاستحقاق: لو محدد يُستخدم، وإلا تاريخ الفاتورة + 30 يوم */
function getInvoiceDueDate(inv){
  if(inv.dueDate) return inv.dueDate;
  if(!inv.date) return null;
  return addDaysToIsoDate(inv.date, 30);
}
function isInvoiceOverdue(inv){
  if(!inv || inv.isReturn || inv.cancelled) return false;
  const remaining = invoiceRemaining(inv);
  if(remaining <= 0) return false;
  const due = getInvoiceDueDate(inv);
  if(!due) return false;
  const today = todayIso();
  return due < today;
}
function getOverdueInvoices(){
  return DATA.ledger.invoices
    .filter(isInvoiceOverdue)
    .sort((a,b)=> (getInvoiceDueDate(a)||'').localeCompare(getInvoiceDueDate(b)||''));
}

/** صافي الفاتورة (للتقارير الضريبية) */
function invoiceSignedNet(inv){
  return Number(inv.netInvoice||0) * (inv.isReturn ? -1 : 1);
}
function getQuarter(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr);
  if(isNaN(d)) return null;
  const m = d.getMonth()+1;
  const y = d.getFullYear();
  const q = m<=3?1:(m<=6?2:(m<=9?3:4));
  return { year:y, quarter:q, key: y+'-'+q, label: 'الربع '+q+' - '+y, months: q===1?'يناير-مارس':(q===2?'أبريل-يونيو':(q===3?'يوليو-سبتمبر':'أكتوبر-ديسمبر')) };
}
function allCategories(){
  const hidden = new Set(DATA.ledger.hiddenSuggestions||[]);
  const set = new Set(CATEGORY_SUGGESTIONS.filter(c=>!hidden.has(c)));
  (DATA.ledger.customCategories||[]).forEach(c=>set.add(c));
  DATA.ledger.invoices.forEach(i=>{ if(i.category) set.add(i.category); });
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'ar'));
}
function allProjects(){
  const hidden = new Set(DATA.ledger.hiddenProjects||[]);
  const set = new Set();
  (DATA.ledger.customProjects||[]).forEach(c=>{ if(c && !hidden.has(c)) set.add(c); });
  (DATA.ledger.invoices||[]).forEach(i=>{ if(i.project && !hidden.has(i.project)) set.add(i.project); });
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'ar'));
}
function allInternalCodes(){
  const set = new Set();
  (DATA.ledger.customInternalCodes||[]).forEach(c=>{ if(c && String(c).trim()) set.add(String(c).trim()); });
  (DATA.ledger.invoices||[]).forEach(i=>{
    if(i.internalCode) String(i.internalCode).split('\n').forEach(c=>{ if(c.trim()) set.add(c.trim()); });
  });
  return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
}
function allSupplierItemCodes(){
  const set = new Set();
  (DATA.ledger.customSupplierItemCodes||[]).forEach(c=>{ if(c && String(c).trim()) set.add(String(c).trim()); });
  (DATA.ledger.invoices||[]).forEach(i=>{
    if(i.supplierItemCode) String(i.supplierItemCode).split('\n').forEach(c=>{ if(c.trim()) set.add(c.trim()); });
  });
  return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
}
function allItemNames(){
  const set = new Set();
  (DATA.ledger.customItemNames||[]).forEach(c=>{ if(c && String(c).trim()) set.add(String(c).trim()); });
  (DATA.ledger.invoices||[]).forEach(i=>{
    if(i.description) String(i.description).split('\n').forEach(c=>{ if(c.trim()) set.add(c.trim()); });
  });
  return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
}
function allItemDescriptions(){
  const set = new Set();
  (DATA.ledger.customItemDescriptions||[]).forEach(c=>{ if(c && String(c).trim()) set.add(String(c).trim()); });
  (DATA.ledger.invoices||[]).forEach(i=>{
    if(i.itemDescription) String(i.itemDescription).split('\n').forEach(c=>{ if(c.trim()) set.add(c.trim()); });
  });
  return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
}
/** حفظ كود/اقتراح بدون حد أقصى — كل ما يُضاف يُسجَّل */
function rememberCodeList(listKey, value){
  const v = String(value||'').trim();
  if(!v) return false;
  if(!Array.isArray(DATA.ledger[listKey])) DATA.ledger[listKey] = [];
  if(DATA.ledger[listKey].includes(v)) return false;
  DATA.ledger[listKey].push(v);
  return true;
}
function rememberManyCodes(listKey, textOrLines){
  const lines = Array.isArray(textOrLines) ? textOrLines : String(textOrLines||'').split('\n');
  let added = 0;
  lines.forEach(line=>{ if(rememberCodeList(listKey, line)) added++; });
  return added;
}
/**
 * يبني خرائط الربط بين "الصنف" و"كود المورد" و"الكود الداخلي" من كل صفوف الأصناف
 * في كل الفواتير السابقة (الأحدث تاريخًا له الأولوية)، عشان لما يُختار/يُكتب كود
 * يظهر اسم الصنف المرتبط بيه تلقائيًا والعكس، مع إبقاء الحقول قابلة للتعديل يدويًا.
 */
function ensureCustomLinkedItems(){
  if(!Array.isArray(DATA.ledger.customLinkedItems)) DATA.ledger.customLinkedItems = [];
}
function saveCustomLinkedItem(item){
  ensureCustomLinkedItems();
  const desc = String(item.desc||'').trim();
  const supplierCode = String(item.supplierCode||'').trim();
  const internalCode = String(item.internalCode||'').trim();
  const itemDescription = String(item.itemDescription||'').trim();
  const unitPrice = String(item.unitPrice||'').trim();
  const supplierId = item.supplierId ? String(item.supplierId) : '';
  if(!desc && !supplierCode && !internalCode && !itemDescription) return null;
  if(!supplierId) return null; // لازم مربوط بمورد
  const rec = {
    id: item.id || ('li_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
    desc, supplierCode, internalCode, itemDescription, unitPrice, supplierId
  };
  const idx = DATA.ledger.customLinkedItems.findIndex(x=>x && x.id===rec.id);
  if(idx>=0) DATA.ledger.customLinkedItems[idx] = rec;
  else DATA.ledger.customLinkedItems.push(rec);
  if(desc && typeof rememberCodeList==='function') rememberCodeList('customItemNames', desc);
  if(supplierCode && typeof rememberCodeList==='function') rememberCodeList('customSupplierItemCodes', supplierCode);
  if(internalCode && typeof rememberCodeList==='function') rememberCodeList('customInternalCodes', internalCode);
  if(itemDescription && typeof rememberCodeList==='function') rememberCodeList('customItemDescriptions', itemDescription);
  return rec;
}
function deleteCustomLinkedItem(id){
  ensureCustomLinkedItems();
  DATA.ledger.customLinkedItems = DATA.ledger.customLinkedItems.filter(x=>x && x.id!==id);
}
function linkedItemsForSupplier(supplierId){
  ensureCustomLinkedItems();
  const sid = String(supplierId||'');
  if(!sid) return [];
  return (DATA.ledger.customLinkedItems||[]).filter(x=>x && String(x.supplierId||'')===sid);
}

function buildItemLinkMaps(supplierId){
  const bySupplierCode = new Map();
  const byInternalCode = new Map();
  const byDesc = new Map();
  const byItemDesc = new Map();
  const sid = supplierId ? String(supplierId) : '';
  let invs = (DATA.ledger.invoices||[]).slice();
  if(sid) invs = invs.filter(inv=> String(inv.supplierId||'') === sid);
  invs.sort((a,b)=>{
    const da = String(a.date||'');
    const db = String(b.date||'');
    if(db !== da) return db.localeCompare(da);
    return String(b.id||'').localeCompare(String(a.id||''));
  });
  const score = (o)=>{
    let s = 0;
    if(o.desc) s++;
    if(o.supplierCode) s++;
    if(o.internalCode) s++;
    if(o.itemDescription) s++;
    if(o.unitPrice) s++;
    return s;
  };
  const put = (map, key, info)=>{
    if(!key) return;
    const prev = map.get(key);
    if(!prev || score(info) >= score(prev)) map.set(key, info);
  };
  invs.forEach(inv=>{
    const d = String(inv.description||'').split('\n');
    const sc = String(inv.supplierItemCode||'').split('\n');
    const ic = String(inv.internalCode||'').split('\n');
    const idesc = String(inv.itemDescription||'').split('\n');
    const up = String(inv.unitPrice||'').split('\n');
    const n = Math.max(d.length, sc.length, ic.length, idesc.length, up.length);
    for(let i=0;i<n;i++){
      const desc = (d[i]||'').trim();
      const scode = (sc[i]||'').trim();
      const icode = (ic[i]||'').trim();
      const itemDesc = (idesc[i]||'').trim();
      const unitPrice = (up[i]||'').trim();
      if(!desc && !scode && !icode && !itemDesc) continue;
      const info = { desc, supplierCode: scode, internalCode: icode, itemDescription: itemDesc, unitPrice, supplierId: inv.supplierId||'' };
      put(bySupplierCode, scode, info);
      put(byInternalCode, icode, info);
      put(byDesc, desc, info);
      put(byItemDesc, itemDesc, info);
    }
  });
  // أصناف مربوطة محفوظة للمورد
  (DATA.ledger.customLinkedItems||[]).forEach(li=>{
    if(!li) return;
    if(sid && String(li.supplierId||'') !== sid) return;
    if(!sid && !li.supplierId) return;
    const desc = String(li.desc||'').trim();
    const scode = String(li.supplierCode||'').trim();
    const icode = String(li.internalCode||'').trim();
    const itemDesc = String(li.itemDescription||'').trim();
    const unitPrice = String(li.unitPrice||'').trim();
    if(!desc && !scode && !icode && !itemDesc) return;
    const info = { desc, supplierCode: scode, internalCode: icode, itemDescription: itemDesc, unitPrice, supplierId: li.supplierId||'' };
    put(bySupplierCode, scode, info);
    put(byInternalCode, icode, info);
    put(byDesc, desc, info);
    put(byItemDesc, itemDesc, info);
  });
  return { bySupplierCode, byInternalCode, byDesc, byItemDesc, supplierId: sid };
}

/** تطبيع نص للبحث (عربي/إنجليزي بدون حساسية) */
function normalizeSuggestText(s){
  return String(s||'')
    .toLowerCase()
    .replace(/[أإآ]/g,'ا')
    .replace(/ة/g,'ه')
    .replace(/ى/g,'ي')
    .replace(/\s+/g,' ')
    .trim();
}

/**
 * قائمة اقتراحات ذكية مربوطة بالحقول:
 * - فلترة أثناء الكتابة
 * - عرض تفاصيل مرتبطة (كود + وصف)
 * - عند الاختيار يملأ باقي الحقول بدقة
 */
function attachSmartItemSuggest(input, opts){
  // توحيد مع attachSmartCombo (نفس الألوان والسلوك والكتابة)
  if(!input || input.__smartSuggest) return;
  opts = opts || {};
  if(typeof attachSmartCombo !== 'function'){
    input.__smartSuggest = true;
    return;
  }
  attachSmartCombo(input, {
    getItems: opts.getItems,
    allowFreeText: true,
    resolveOnBlur: false,
    maxItems: 50,
    onSelect: opts.onSelect
  });
  input.__smartSuggest = true;
}

function buildItemSuggestEntries(kind, maps, supplierId){
  const sid = supplierId ? String(supplierId) : '';
  maps = maps || (typeof buildItemLinkMaps==='function' ? buildItemLinkMaps(sid || null) : null);
  const entries = [];
  const seen = new Set();
  const add = (value, info)=>{
    const v = String(value||'').trim();
    if(!v || seen.has(v)) return;
    seen.add(v);
    info = info || {};
    let hint = '';
    if(kind==='desc') hint = [info.supplierCode, info.internalCode].filter(Boolean).join(' · ');
    else if(kind==='supplierCode') hint = [info.desc, info.internalCode].filter(Boolean).join(' · ');
    else if(kind==='internalCode') hint = [info.desc, info.supplierCode].filter(Boolean).join(' · ');
    else if(kind==='itemDescription') hint = [info.desc, info.supplierCode || info.internalCode].filter(Boolean).join(' · ');
    entries.push({
      value: v, label: v, hint,
      info: {
        desc: info.desc||'', supplierCode: info.supplierCode||'',
        internalCode: info.internalCode||'', itemDescription: info.itemDescription||'',
        unitPrice: info.unitPrice||''
      }
    });
  };
  if(sid && maps){
    if(kind==='desc' && maps.byDesc) maps.byDesc.forEach((info,k)=>add(k,info));
    else if(kind==='supplierCode' && maps.bySupplierCode) maps.bySupplierCode.forEach((info,k)=>add(k,info));
    else if(kind==='internalCode' && maps.byInternalCode) maps.byInternalCode.forEach((info,k)=>add(k,info));
    else if(kind==='itemDescription' && maps.byItemDesc) maps.byItemDesc.forEach((info,k)=>add(k,info));
    return entries;
  }
  if(kind==='desc'){
    (typeof allItemNames==='function'?allItemNames():[]).forEach(v=>add(v, maps&&maps.byDesc?maps.byDesc.get(v):null));
    if(maps&&maps.byDesc) maps.byDesc.forEach((info,k)=>add(k,info));
  } else if(kind==='supplierCode'){
    (typeof allSupplierItemCodes==='function'?allSupplierItemCodes():[]).forEach(v=>add(v, maps&&maps.bySupplierCode?maps.bySupplierCode.get(v):null));
    if(maps&&maps.bySupplierCode) maps.bySupplierCode.forEach((info,k)=>add(k,info));
  } else if(kind==='internalCode'){
    (typeof allInternalCodes==='function'?allInternalCodes():[]).forEach(v=>add(v, maps&&maps.byInternalCode?maps.byInternalCode.get(v):null));
    if(maps&&maps.byInternalCode) maps.byInternalCode.forEach((info,k)=>add(k,info));
  } else if(kind==='itemDescription'){
    (typeof allItemDescriptions==='function'?allItemDescriptions():[]).forEach(v=>add(v, maps&&maps.byItemDesc?maps.byItemDesc.get(v):null));
    if(maps&&maps.byItemDesc) maps.byItemDesc.forEach((info,k)=>add(k,info));
  }
  return entries;
}

/**
 * قائمة منسدلة قابلة للكتابة — محرّك موحّد عالي الكفاءة
 * - فلترة فورية مع debounce خفيف + ترتيب ذكي
 * - إعادة استخدام DOM بدل إعادة البناء الكامل كل حرف
 * - تفويض أحداث (event delegation)
 * - بحث متعدد الكلمات ومتسامح مع العربية
 */
function attachSmartCombo(input, opts){
  if(!input || input.__smartCombo) return;
  input.__smartCombo = true;
  opts = opts || {};
  const allowFree = opts.allowFreeText !== false;
  const maxItems = opts.maxItems || 60;
  const minChars = opts.minChars || 0;

  input.removeAttribute('list');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');

  let cell = input.closest('.ss-cell');
  if(!cell){
    cell = document.createElement('div');
    cell.className = 'ss-cell';
    if(input.parentNode){
      input.parentNode.insertBefore(cell, input);
      cell.appendChild(input);
    }
  }

  let box = null;
  let listEl = null;
  let activeIdx = -1;
  let currentItems = [];
  let open = false;
  let debounceT = null;
  let lastQuery = null;
  let itemsCache = null;
  let itemsCacheAt = 0;
  const CACHE_MS = 400;

  const norm = (s)=> typeof normalizeSuggestText==='function'
    ? normalizeSuggestText(s)
    : String(s||'').toLowerCase().trim();

  const close = ()=>{
    if(debounceT){ clearTimeout(debounceT); debounceT = null; }
    if(box){
      box.classList.remove('ss-visible');
      box.setAttribute('hidden', '');
    }
    open = false;
    activeIdx = -1;
    lastQuery = null;
    input.setAttribute('aria-expanded', 'false');
    try{
      cell.classList.remove('ss-open');
      const row = input.closest('[data-item-row]');
      if(row) row.classList.remove('ss-open');
    }catch(e){}
  };

  const getItemsFresh = ()=>{
    const now = Date.now();
    if(itemsCache && (now - itemsCacheAt) < CACHE_MS) return itemsCache;
    let raw = [];
    try{
      raw = typeof opts.getItems === 'function' ? (opts.getItems() || []) : (opts.items || []);
    }catch(e){ raw = []; }
    // جهّز مفاتيح بحث مرة واحدة
    itemsCache = raw.map(it=>{
      if(it.__nq != null && it.__nh != null) return it;
      const label = it.label != null ? it.label : (it.value != null ? it.value : '');
      const hint = it.hint || '';
      const id = it.id != null ? String(it.id) : '';
      it.__nq = norm(label);
      it.__nh = norm(hint);
      it.__nid = norm(id);
      it.__label = label;
      return it;
    });
    itemsCacheAt = now;
    return itemsCache;
  };

  /** نقاط ترتيب: يبدأ بالنص > كلمة كاملة > يحتوي > تلميح */
  const rankItem = (it, tokens)=>{
    if(!tokens.length) return 1;
    const p = it.__nq || '';
    const h = it.__nh || '';
    let score = 0;
    for(let i=0;i<tokens.length;i++){
      const t = tokens[i];
      if(!t) continue;
      if(p.startsWith(t)) score += 100;
      else if(p.includes(' '+t) || p.includes(t)) score += 40;
      else if(h.includes(t) || (it.__nid||'').includes(t)) score += 15;
      else return -1; // لازم كل التوكنات تتطابق
    }
    // أقصر تطابق أدق
    score += Math.max(0, 30 - Math.min(30, p.length));
    return score;
  };

  const filterItems = (q)=>{
    const all = getItemsFresh();
    const nq = norm(q);
    if(nq.length < minChars && minChars > 0) return [];
    if(!nq){
      return all.slice(0, maxItems);
    }
    const tokens = nq.split(' ').filter(Boolean);
    const scored = [];
    for(let i=0;i<all.length;i++){
      const it = all[i];
      const sc = rankItem(it, tokens);
      if(sc >= 0) scored.push({ it, sc });
    }
    scored.sort((a,b)=>{
      if(b.sc !== a.sc) return b.sc - a.sc;
      return String(a.it.__label||'').localeCompare(String(b.it.__label||''), 'ar');
    });
    return scored.slice(0, maxItems).map(x=>x.it);
  };

  const spaceInsideModal = ()=>{
    const modal = input.closest('.modal');
    const ir = input.getBoundingClientRect();
    if(!modal) return { below: window.innerHeight - ir.bottom - 12, above: ir.top - 12 };
    const mr = modal.getBoundingClientRect();
    return {
      below: Math.max(0, mr.bottom - ir.bottom - 10),
      above: Math.max(0, ir.top - mr.top - 10)
    };
  };

  const ensureBox = ()=>{
    if(box) return box;
    box = document.createElement('div');
    box.className = 'smart-suggest-box';
    box.setAttribute('dir', 'rtl');
    box.setAttribute('role', 'listbox');
    box.setAttribute('hidden', '');
    listEl = document.createElement('div');
    listEl.className = 'ss-list';
    box.appendChild(listEl);
    // تفويض أحداث مرة واحدة
    box.addEventListener('mousedown', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const item = e.target.closest('[data-idx]');
      if(!item) return;
      const idx = Number(item.getAttribute('data-idx'));
      if(Number.isFinite(idx)) pick(idx);
    });
    box.addEventListener('mousemove', (e)=>{
      const item = e.target.closest('[data-idx]');
      if(!item) return;
      const idx = Number(item.getAttribute('data-idx'));
      if(Number.isFinite(idx) && idx !== activeIdx) highlight(idx);
    });
    cell.appendChild(box);
    return box;
  };

  const paintList = (list)=>{
    const frag = document.createDocumentFragment();
    if(!list.length){
      const empty = document.createElement('div');
      empty.className = 'ss-empty';
      empty.textContent = allowFree ? 'لا نتائج — يمكنك الكتابة بحرية' : 'لا نتائج مطابقة';
      frag.appendChild(empty);
    } else {
      for(let idx=0; idx<list.length; idx++){
        const it = list[idx];
        const rowEl = document.createElement('div');
        rowEl.className = 'smart-suggest-item';
        rowEl.setAttribute('data-idx', String(idx));
        rowEl.setAttribute('role', 'option');
        const main = document.createElement('div');
        main.className = 'ss-main';
        main.textContent = it.__label != null ? it.__label : (it.label || it.value || '');
        rowEl.appendChild(main);
        if(it.hint){
          const sub = document.createElement('div');
          sub.className = 'ss-hint';
          sub.textContent = it.hint;
          rowEl.appendChild(sub);
        }
        frag.appendChild(rowEl);
      }
    }
    if(!listEl) ensureBox();
    listEl.innerHTML = '';
    listEl.appendChild(frag);
  };

  const positionBox = ()=>{
    if(!box) return;
    const sp = spaceInsideModal();
    const openUp = sp.below < 110 && sp.above > sp.below;
    const maxH = Math.max(96, Math.min(240, openUp ? sp.above : sp.below));
    box.classList.toggle('ss-up', openUp);
    box.style.maxHeight = Math.round(maxH) + 'px';
  };

  const highlight = (idx)=>{
    if(!box || !listEl) return;
    const rows = listEl.querySelectorAll('.smart-suggest-item');
    if(!rows.length){ activeIdx = -1; return; }
    activeIdx = Math.max(0, Math.min(rows.length - 1, idx));
    for(let i=0;i<rows.length;i++){
      rows[i].classList.toggle('ss-active', i===activeIdx);
    }
    const lgEl = rows[activeIdx];
    if(lgEl) lgEl.scrollIntoView({ block:'nearest' });
  };

  const pick = (idx)=>{
    const it = currentItems[idx];
    if(!it) return;
    const label = it.__label != null ? it.__label : (it.label || it.value || '');
    input.value = label;
    if(it.id != null && it.id !== '') input.dataset.comboId = String(it.id);
    else if(it.value != null && opts.valueIsId) input.dataset.comboId = String(it.value);
    else if(!opts.clearIdOnType) { /* keep */ }
    close();
    if(typeof opts.onSelect === 'function'){
      try{ opts.onSelect(it); }catch(e){ console.error(e); }
    }
    input.dispatchEvent(new Event('change', { bubbles:true }));
  };

  const resolveByText = ()=>{
    const v = String(input.value||'').trim();
    if(!v){ input.dataset.comboId = ''; return null; }
    const all = getItemsFresh();
    const nq = norm(v);
    let hit = all.find(it=> (it.__nq||'') === nq);
    if(!hit) hit = all.find(it=> (it.__nq||'').startsWith(nq));
    if(hit){
      input.value = hit.__label != null ? hit.__label : (hit.label || hit.value || '');
      if(hit.id != null) input.dataset.comboId = String(hit.id);
      if(typeof opts.onSelect === 'function'){
        try{ opts.onSelect(hit); }catch(e){}
      }
      return hit;
    }
    if(!allowFree){
      // اترك النص ظاهر للبحث لكن صفّر id
      input.dataset.comboId = '';
    }
    return null;
  };

  const show = (q)=>{
    const query = String(q == null ? input.value : q);
    if(lastQuery === query && open) return;
    lastQuery = query;

    const list = filterItems(query);
    currentItems = list;

    ensureBox();
    paintList(list);
    positionBox();

    try{
      cell.classList.add('ss-open');
      const row = input.closest('[data-item-row]');
      if(row) row.classList.add('ss-open');
    }catch(e){}

    box.removeAttribute('hidden');
    // frame التالي لتشغيل الانتقال
    requestAnimationFrame(()=> box && box.classList.add('ss-visible'));
    open = true;
    input.setAttribute('aria-expanded', 'true');
    highlight(list.length ? 0 : -1);
  };

  const scheduleShow = (q)=>{
    if(debounceT) clearTimeout(debounceT);
    // استجابة سريعة: 0 عند أول فتح، 32ms أثناء الكتابة المتتابعة
    const delay = open ? 32 : 0;
    debounceT = setTimeout(()=>{
      debounceT = null;
      show(q);
    }, delay);
  };

  input.addEventListener('focus', ()=>{
    itemsCache = null; // بيانات أحدث عند التركيز
    scheduleShow('');
  });
  // الضغط بعد الاختيار يعيد فتح القائمة كاملة (مثل قوائم الفلاتر)
  input.addEventListener('click', ()=>{ if(!open){ itemsCache = null; show(''); } });
  input.addEventListener('input', ()=>{
    if(opts.clearIdOnType) input.dataset.comboId = '';
    scheduleShow(input.value);
  });
  input.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowDown'){
      e.preventDefault();
      if(!open){ show(input.value); return; }
      highlight(activeIdx < 0 ? 0 : activeIdx + 1);
    } else if(e.key==='ArrowUp'){
      e.preventDefault();
      if(!open){ show(input.value); return; }
      highlight(activeIdx < 0 ? 0 : activeIdx - 1);
    } else if(e.key==='Enter'){
      if(open && activeIdx >= 0 && currentItems[activeIdx]){
        e.preventDefault();
        pick(activeIdx);
      }
    } else if(e.key==='Tab'){
      if(open && activeIdx >= 0 && currentItems[activeIdx] && !allowFree){
        pick(activeIdx);
      } else {
        close();
      }
    } else if(e.key==='Escape'){
      if(open){ e.preventDefault(); close(); }
    }
  });
  input.addEventListener('blur', ()=>{
    setTimeout(()=>{
      close();
      if(opts.resolveOnBlur !== false) resolveByText();
    }, 140);
  });

  // إبطال الكاش لو البيانات اتغيرت خارجيًا
  input.__comboInvalidate = ()=>{ itemsCache = null; };
  input.__comboGetId = ()=> input.dataset.comboId || '';
  input.__comboSetId = (id, label)=>{
    input.dataset.comboId = id != null ? String(id) : '';
    if(label != null) input.value = label;
  };
  input.__comboClose = close;
  input.__comboOpen = ()=> show(input.value);
}

function getNatureComboItems(){
  return (typeof NATURE_OPTIONS !== 'undefined' ? NATURE_OPTIONS : []).map(o=>({
    id: o.code,
    value: o.code,
    label: o.code + ' - ' + o.label,
    hint: o.label
  }));
}
function getDiscountTypeComboItems(){
  return (typeof DISCOUNT_TYPE_OPTIONS !== 'undefined' ? DISCOUNT_TYPE_OPTIONS : []).map(o=>({
    id: o.code,
    value: o.code,
    label: o.code + ' - ' + o.label,
    hint: o.label
  }));
}
function getCategoryComboItems(){
  return (typeof allCategories==='function'?allCategories():[]).map(c=>({ value:c, label:c }));
}
function getProjectComboItems(){
  return (typeof allProjects==='function'?allProjects():[]).map(c=>({ value:c, label:c }));
}

function getSupplierComboItems(){
  return (DATA.ledger.suppliers||[]).slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'))
    .map(s=>({
      id: s.id,
      value: s.name,
      label: s.name,
      hint: [s.taxId, s.commercialReg].filter(Boolean).join(' · ')
    }));
}

function allBusinessNatures(){
  const set = new Set();
  DATA.ledger.suppliers.forEach(s=>{ if(s.businessNature) set.add(s.businessNature); });
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'ar'));
}
function downloadFile(filename, content, mime){
  return window.desktopApi.saveFile(filename, content).then(res=>{
    if(res && res.ok){ lgShowToast('تم الحفظ بنجاح'); }
    else if(res && !res.canceled){ lgShowToast((res.error) || 'تعذر حفظ الملف'); }
    return res;
  }).catch(err=>{ console.error('downloadFile', err); lgShowToast('تعذر حفظ الملف'); return { ok:false }; });
}

/** نسخة أمان من البيانات الحالية قبل أي عملية خطيرة (استيراد / مسح / استعادة) — بعد ما نكتب آخر تعديلات على الملف */
async function makeSafetyBackupNow(reason){
  try{ if(typeof saveData==='function') await saveData(true); }catch(_e){}
  try{
    if(window.desktopApi && window.desktopApi.safetyBackup){
      const r = await window.desktopApi.safetyBackup(reason);
      return !!(r && r.ok);
    }
  }catch(_e){}
  return false;
}
/* تصدير جدول بيانات كملف إكسيل حقيقي (.xlsx) منظم بدل CSV */
function exportExcelFile(filename, sheetName, headers, rows){
  if(typeof guardReadOnly==='function' && guardReadOnly('تصدير Excel')) return;
  window.desktopApi.exportExcel({ filename, sheetName, headers, rows, decimals: moneyDecimals() }).then(res=>{
    if(res && res.ok){ lgShowToast('تم حفظ ملف الإكسيل بنجاح'); }
    else if(res && !res.canceled){ lgShowToast(res.error || 'تعذر تصدير الملف'); }
  });
}

/* حفظ أي مستند HTML كملف PDF فعلي - بيملأ منطقة الطباعة المخفية في نفس الصفحة
   ثم يطلب من العملية الرئيسية تطبع النافذة الحالية (اللي أنماط الطباعة فيها مُجرَّبة وشغالة) */
function printHtmlContent(html, filename){
  if(typeof readOnlyMode !== 'undefined' && readOnlyMode){
    lgShowToast('🔒 وضع القراءة فقط — حفظ PDF/كشف الحساب غير مسموح');
    return;
  }
  const printArea = document.getElementById('printArea');
  if(!printArea){ lgShowToast('تعذر الطباعة'); return; }
  printArea.innerHTML = html;
  window.desktopApi.savePdf({ filename: filename || 'مستند.pdf' }).then(res=>{
    printArea.innerHTML = '';
    if(res && res.ok){
      lgShowToast('تم حفظ الملف وفتحه');
      try{ logAction('حفظ PDF', filename||'مستند.pdf'); }catch(e){}
    }
    else if(res && !res.canceled){ lgShowToast(res.error || 'تعذر إنشاء ملف PDF'); }
  });
}

/* ---------------- Tafqeet: تحويل الأرقام إلى حروف عربية ---------------- */
function convertNumberToWords(numIn){
  let num = Math.round(numIn);
  if(num === 0) return '';
  const units = ['', 'واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة'];
  const teens = ['عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const tens = ['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const hundreds = ['','مائة','مئتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];

  function threeDigits(n){
    let r = '';
    const h = Math.floor(n/100), rem = n%100;
    if(h>0){ r += hundreds[h]; if(rem>0) r += ' و'; }
    if(rem>=20){
      const t = Math.floor(rem/10), u = rem%10;
      if(u>0) r += units[u] + ' و';
      r += tens[t];
    } else if(rem>=10){
      r += teens[rem-10];
    } else if(rem>0){
      r += units[rem];
    }
    return r;
  }

  function groupWords(n, singular, dual, plural, pluralMany){
    if(n===1) return singular;
    if(n===2) return dual;
    if(n>=3 && n<=10) return threeDigits(n) + ' ' + plural;
    return threeDigits(n) + ' ' + pluralMany;
  }

  let parts = [];
  const million = Math.floor(num/1000000);
  num = num % 1000000;
  const thousand = Math.floor(num/1000);
  num = num % 1000;
  const rest = num;

  if(million>0) parts.push(groupWords(million,'مليون','مليونان','ملايين','مليوناً'));
  if(thousand>0) parts.push(groupWords(thousand,'ألف','ألفان','آلاف','ألفاً'));
  if(rest>0) parts.push(threeDigits(rest));

  return parts.join(' و');
}

function tafqeet(amount){
  amount = Math.round((Number(amount)||0) * 100) / 100;
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let strInt = integerPart === 0 ? 'صفر' : convertNumberToWords(integerPart);

  let poundStr;
  if(integerPart===1) poundStr='جنيه';
  else if(integerPart===2) poundStr='جنيهان';
  else if(integerPart>=3 && integerPart<=10) poundStr='جنيهات';
  else poundStr='جنيهاً';

  let strDec = '';
  if(decimalPart>0){
    let qirshStr;
    if(decimalPart===1) qirshStr='قرش';
    else if(decimalPart===2) qirshStr='قرشان';
    else if(decimalPart>=3 && decimalPart<=10) qirshStr='قروش';
    else qirshStr='قرشاً';
    strDec = ' و' + convertNumberToWords(decimalPart) + ' ' + qirshStr;
  }

  return (strInt + ' ' + poundStr + strDec + ' فقط لا غير').trim();
}

/** هاش بسيط لكلمة مرور وضع القراءة فقط */
function lgHashPin(pin){
  const s = String(pin||'');
  let h = 5381;
  for(let i=0;i<s.length;i++) h = ((h<<5)+h) ^ s.charCodeAt(i);
  return 'mb_'+((h>>>0).toString(16));
}
function lgGetStoredRoPin(){
  try{ return localStorage.getItem('mb_ro_pin') || ''; }catch(e){ return ''; }
}
function lgSetStoredRoPin(pin){
  try{ localStorage.setItem('mb_ro_pin', lgHashPin(pin)); }catch(e){}
}
function lgClearStoredRoPin(){
  try{ localStorage.removeItem('mb_ro_pin'); }catch(e){}
}
function lgHasRoPin(){ return !!lgGetStoredRoPin(); }
function lgVerifyRoPin(pin){
  const stored = lgGetStoredRoPin();
  if(!stored) return true; // مفيش رقم سري مضبوط
  return lgHashPin(pin) === stored;
}
function lgChangeRoPin(oldPin, newPin){
  if(lgHasRoPin() && !lgVerifyRoPin(oldPin)) return { ok:false, error:'الرقم السري الحالي غير صحيح' };
  const n = String(newPin||'').trim();
  if(n.length < 4) return { ok:false, error:'الرقم السري الجديد يجب ألا يقل عن 4 خانات' };
  lgSetStoredRoPin(n);
  return { ok:true };
}
function lgPersistReadOnlyFlag(on){
  try{ localStorage.setItem('mb_readonly', on ? '1' : '0'); }catch(e){}
}
function lgLoadReadOnlyFlag(){
  try{ return localStorage.getItem('mb_readonly') === '1'; }catch(e){ return false; }
}

/** حماية وضع القراءة فقط — يرجع true لو مقفول (يمنع أي تعديل) */
/** فك تعليق كل الخانات بقوة — force=true يتجاوز وضع القراءة (بعد مسح البيانات) */
function forceUnlockAllInputs(root, force){
  try{
    if(!force && typeof readOnlyMode !== 'undefined' && readOnlyMode) return;
    if(force || !readOnlyMode) document.body.classList.remove('body-readonly');
    const scope = root || document;
    scope.querySelectorAll('input, select, textarea, button').forEach(lgEl=>{
      try{
        if(lgEl.id==='inv_totalInvoice' || lgEl.id==='inv_netInvoice') return;
        if(lgEl.id==='inv_taxid_display' || lgEl.id==='inv_commreg_display' || lgEl.id==='m_pay_taxid' || lgEl.id==='m_pay_commreg') return;
        if(lgEl.getAttribute('data-keep-disabled')==='1') return;
        if(lgEl.classList && lgEl.classList.contains('m_pay_inv_amt') && lgEl.hasAttribute('data-keep-disabled')) return;
        lgEl.disabled = false;
        try{ lgEl.removeAttribute('disabled'); }catch(e2){}
        lgEl.removeAttribute('data-ro-locked');
        lgEl.style.pointerEvents = 'auto';
        lgEl.style.opacity = '1';
        lgEl.style.userSelect = 'text';
        lgEl.style.webkitUserSelect = 'text';
        lgEl.style.caretColor = 'auto';
      }catch(e){}
    });
  }catch(e){}
}

/** إغلاق أي مودال مفتوح + فك قفل الواجهة بالكامل */

/** مراقبة خفيفة: لو الخانات اتقفلت بالغلط (مش وضع قراءة) نفتحها تلقائياً */
function startInputUnlockWatchdog(){
  if(window.__inputUnlockWatch) return;
  window.__inputUnlockWatch = setInterval(()=>{
    try{
      if(typeof readOnlyMode !== 'undefined' && readOnlyMode) return;
      if(document.body.classList.contains('body-readonly')){
        // وضع القراءة متعمد — متلمّسش
        return;
      }
      // لو في input عليه disabled بدون data-keep-disabled — فكّه
      const stuck = document.querySelectorAll('input[disabled]:not([data-keep-disabled="1"]):not(#inv_totalInvoice):not(#inv_netInvoice):not(#inv_taxid_display):not(#inv_commreg_display):not(#m_pay_taxid):not(#m_pay_commreg), textarea[disabled]:not([data-keep-disabled="1"])');
      if(stuck.length){
        forceUnlockAllInputs(document, true);
      }
    }catch(e){}
  }, 2000);
}

function hardUnlockUi(){
  try{
    readOnlyMode = false;
    if(typeof lgPersistReadOnlyFlag==='function') lgPersistReadOnlyFlag(false);
    document.body.classList.remove('body-readonly');
    document.querySelectorAll('.modal-overlay').forEach(o=>{ try{ o.remove(); }catch(e){} });
    forceUnlockAllInputs(document, true);
  }catch(e){}
}
function applyReadOnlyDomLocks(){
  try{
    // دائمًا: لو مش وضع قراءة — فك أي قفل عالق
    if(!readOnlyMode){
      document.body.classList.remove('body-readonly');
      forceUnlockAllInputs(document);
      return;
    }
    document.body.classList.add('body-readonly');
    // وضع القراءة: لا نعطّل الفلاتر/البحث/التواريخ — فقط خانات الإعدادات الحساسة
    document.querySelectorAll('#pageContent input, #pageContent select, #pageContent textarea').forEach(lgEl=>{
      try{
        const id = lgEl.id || '';
        const cls = String(lgEl.className||'');
        if(cls.includes('search-box')) return;
        if(/filter|Filter|search|Search|Year|Period|From|To|Sel|Supplier|quarterly|report|statement|zoom/i.test(id)) return;
        if(lgEl.type === 'date' || lgEl.type === 'search') return;
        if(lgEl.tagName === 'SELECT') return;
        if(id==='newCategoryInput' || id==='companyNameInput' || id==='pinInput' || id==='pinInput2'){
          lgEl.setAttribute('data-ro-locked','1');
          lgEl.disabled = true;
        }
      }catch(e){}
    });
  }catch(e){}
}
/** تأكد أن خانات أي مودال مفتوحة قابلة للكتابة */
function ensureModalInputsEditable(root){
  try{
    if(typeof readOnlyMode !== 'undefined' && readOnlyMode) return;
    const scope = root || document;
    forceUnlockAllInputs(scope);
    scope.querySelectorAll('.modal-overlay input, .modal-overlay select, .modal-overlay textarea').forEach(lgEl=>{
      if(lgEl.id==='inv_totalInvoice' || lgEl.id==='inv_netInvoice') return;
      if(lgEl.id==='inv_taxid_display' || lgEl.id==='inv_commreg_display' || lgEl.id==='m_pay_taxid' || lgEl.id==='m_pay_commreg') return;
      lgEl.disabled = false;
      lgEl.removeAttribute('disabled');
      lgEl.removeAttribute('data-ro-locked');
      lgEl.style.pointerEvents = 'auto';
      lgEl.style.opacity = '1';
    });
  }catch(e){}
}
function guardReadOnly(actionLabel){
  if(readOnlyMode){
    lgShowToast('🔒 وضع القراءة فقط مفعّل — ألغِ القفل بالرقم السري من الأعلى حتى تقدر ' + (actionLabel || 'تعدّل'));
    return true;
  }
  return false;
}

/** نافذة إدخال رقم سري */

/** نافذة رقم سري آمنة داخل البرنامج (بدون نافذة Electron منفصلة) */
function promptPinDialogAsync(title, message, needConfirm){
  return new Promise((resolve)=>{
    document.querySelectorAll('#pinOverlay').forEach(o=>o.remove());
    const hadRo = document.body.classList.contains('body-readonly');
    document.body.classList.remove('body-readonly');
    const confirmHtml = needConfirm
      ? ('<div class="field" id="pinConfirmWrap"><label for="pinInput2">تأكيد الرقم السري</label>'+
         '<div style="position:relative;">'+
         '<input type="password" id="pinInput2" autocomplete="new-password" spellcheck="false" placeholder="أعد الإدخال" '+
         'style="font-size:18px;letter-spacing:3px;width:100%;direction:ltr;text-align:center;background:#fff!important;pointer-events:auto!important;opacity:1!important;padding-left:44px;" />'+
         '<button type="button" id="pinEye2" title="إظهار/إخفاء" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);border:none;background:transparent;cursor:pointer;font-size:16px;">👁</button></div></div>')
      : '';
    const overlay = lgEl(
      '<div class="modal-overlay" id="pinOverlay" style="z-index:200000;">'+
      '<div class="modal" role="dialog" style="max-width:420px;">'+
      '<h3>'+lgEscapeHtml(title||'الرقم السري')+'</h3>'+
      '<p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 12px;">'+lgEscapeHtml(message||'')+'</p>'+
      '<div class="field"><label for="pinInput">الرقم السري</label>'+
      '<div style="position:relative;">'+
      '<input type="password" id="pinInput" autocomplete="new-password" spellcheck="false" placeholder="أدخل الرقم السري" '+
      'style="font-size:18px;letter-spacing:3px;width:100%;direction:ltr;text-align:center;background:#fff!important;pointer-events:auto!important;opacity:1!important;padding-left:44px;" />'+
      '<button type="button" id="pinEye1" title="إظهار/إخفاء" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);border:none;background:transparent;cursor:pointer;font-size:16px;">👁</button></div></div>'+
      confirmHtml+
      '<p id="pinErr" style="color:var(--debt);font-size:13px;min-height:18px;margin:0;"></p>'+
      '<div class="modal-actions">'+
      '<button type="button" class="btn btn-outline" id="pinCancel">إلغاء</button>'+
      '<button type="button" class="btn btn-primary" id="pinOk">تأكيد</button>'+
      '</div></div></div>'
    );
    document.body.appendChild(overlay);
    const restoreRo = ()=>{ if(hadRo) document.body.classList.add('body-readonly'); };
    const input = document.getElementById('pinInput');
    const input2 = document.getElementById('pinInput2');
    const errEl = document.getElementById('pinErr');
    setTimeout(()=>{ try{ input.focus(); input.select(); }catch(e){} }, 50);
    function bindEye(btnId, inp){
      const b = document.getElementById(btnId);
      if(!b || !inp) return;
      b.addEventListener('click', ()=>{
        if(inp.type==='password'){ inp.type='text'; b.textContent='🙈'; }
        else { inp.type='password'; b.textContent='👁'; }
        inp.focus();
      });
    }
    bindEye('pinEye1', input);
    bindEye('pinEye2', input2);
    function closeDlg(result){
      overlay.remove();
      restoreRo();
      resolve(result);
    }
    document.getElementById('pinCancel').addEventListener('click', ()=>closeDlg({ok:false, canceled:true}));
    overlay.addEventListener('click', e=>{ if(e.target===overlay) closeDlg({ok:false, canceled:true}); });
    function submit(){
      const a = (input.value||'').trim();
      if(!a){ errEl.textContent = 'أدخل الرقم السري'; return; }
      if(needConfirm){
        if(a.length < 4){ errEl.textContent = '4 أحرف/أرقام على الأقل'; return; }
        const b = (input2 && input2.value || '').trim();
        if(a !== b){ errEl.textContent = 'التأكيد غير متطابق'; return; }
      }
      closeDlg({ ok:true, value:a });
    }
    document.getElementById('pinOk').addEventListener('click', submit);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); if(needConfirm && input2) input2.focus(); else submit(); }});
    if(input2) input2.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); submit(); }});
  });
}

function lgPromptPinDialog(title, message, onOk){
  document.querySelectorAll('#pinOverlay').forEach(o=>o.remove());
  // فك قفل CSS مؤقتاً عشان الكتابة تشتغل داخل خانة الرقم السري
  const hadRo = document.body.classList.contains('body-readonly');
  document.body.classList.remove('body-readonly');
  const overlay = lgEl(
    '<div class="modal-overlay" id="pinOverlay" style="z-index:200000;">'+
    '<div class="modal" role="dialog" style="max-width:420px;">'+
    '<h3>'+lgEscapeHtml(title||'الرقم السري')+'</h3>'+
    '<p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 12px;">'+lgEscapeHtml(message||'')+'</p>'+
    '<div class="field"><label for="pinInput">الرقم السري</label>'+
    '<input type="text" id="pinInput" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="أدخل الرقم السري" style="font-size:18px;letter-spacing:3px;width:100%;direction:ltr;text-align:center;background:#fff !important;pointer-events:auto !important;opacity:1 !important;" /></div>'+
    '<div class="field" id="pinConfirmWrap" style="display:none;">'+
    '<label for="pinInput2">تأكيد الرقم السري</label>'+
    '<input type="text" id="pinInput2" inputmode="text" autocomplete="off" spellcheck="false" placeholder="أعد الإدخال" style="font-size:18px;letter-spacing:3px;width:100%;direction:ltr;text-align:center;background:#fff !important;pointer-events:auto !important;" /></div>'+
    '<p id="pinErr" style="color:var(--debt);font-size:13px;min-height:18px;margin:0;"></p>'+
    '<div class="modal-actions">'+
    '<button type="button" class="btn btn-outline" id="pinCancel">إلغاء</button>'+
    '<button type="button" class="btn btn-primary" id="pinOk">تأكيد</button>'+
    '</div></div></div>'
  );
  document.body.appendChild(overlay);
  const restoreRo = ()=>{ if(hadRo) document.body.classList.add('body-readonly'); };
  const modalBox = overlay.querySelector('.modal');
  if(modalBox){
    modalBox.addEventListener('mousedown', e=> e.stopPropagation());
    modalBox.addEventListener('keydown', e=> e.stopPropagation());
  }
  const input = document.getElementById('pinInput');
  setTimeout(()=>{ try{ input.focus(); input.click(); }catch(e){} }, 40);
  function closeDlg(){ overlay.remove(); restoreRo(); }
  document.getElementById('pinCancel').addEventListener('click', closeDlg);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) closeDlg(); });
  function submit(){
    const v = (input.value||'').trim();
    const wrap = document.getElementById('pinConfirmWrap');
    const v2 = document.getElementById('pinInput2') ? (document.getElementById('pinInput2').value||'').trim() : '';
    const err = document.getElementById('pinErr');
    if(wrap && wrap.style.display !== 'none'){
      if(!v || v.length < 4){ err.textContent = 'الرقم السري 4 أحرف/أرقام على الأقل'; return; }
      if(v !== v2){ err.textContent = 'التأكيد غير متطابق'; return; }
    } else {
      if(!v){ err.textContent = 'أدخل الرقم السري'; return; }
    }
    overlay.remove();
    // لا نعيد body-readonly هنا — onOk قد يغيّر الحالة ثم render
    onOk(v);
  }
  document.getElementById('pinOk').addEventListener('click', submit);
  input.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); submit(); } });
  const input2 = document.getElementById('pinInput2');
  if(input2) input2.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); submit(); } });
  return {
    requireConfirm(){
      const wrap = document.getElementById('pinConfirmWrap');
      if(wrap) wrap.style.display = '';
    }
  };
}

async function lgToggleReadOnlyMode(){
  if(!readOnlyMode){
    // تفعيل بدون باسورد
    readOnlyMode = true;
    lgPersistReadOnlyFlag(true);
    lgRender();
    applyReadOnlyDomLocks();
    lgShowToast('🔒 تم تفعيل وضع القراءة فقط — التصفح والبحث مسموحان');
    return;
  }
  // إلغاء — نافذة آمنة داخل البرنامج (بدون nodeIntegration)
  const hasPin = !!lgGetStoredRoPin();
  const res = await promptPinDialogAsync(
    hasPin ? 'إلغاء وضع القراءة فقط' : 'ضبط رقم سري',
    hasPin
      ? 'أدخل الرقم السري لإلغاء القفل والسماح بالتعديلات.'
      : 'لا يوجد رقم سري بعد. عيّن رقماً سرياً (4 أحرف على الأقل) — سيُطلب عند كل إلغاء لاحق.',
    !hasPin
  );
  if(!res || !res.ok) return;
  const pin = res.value || '';
  if(!hasPin){
    if(pin.length < 4){ lgShowToast('الرقم السري 4 أحرف على الأقل'); return; }
    lgSetStoredRoPin(pin);
  } else if(lgHashPin(pin) !== lgGetStoredRoPin()){
    lgShowToast('الرقم السري غير صحيح — القفل مستمر');
    return;
  }
  readOnlyMode = false;
  lgPersistReadOnlyFlag(false);
  document.body.classList.remove('body-readonly');
  lgRender();
  applyReadOnlyDomLocks();
  forceUnlockAllInputs(document, true);
  setTimeout(()=> forceUnlockAllInputs(document, true), 50);
  lgShowToast('تم إلغاء وضع القراءة فقط — التعديل مسموح');
}

/** حفظ واستعادة موضع التمرير بعد إعادة الرسم */

/** رأس وأعمدة موحّدة لجداول الفواتير (نفس صفحة كل الفواتير) */

/** اختصار نص متعدد الأسطر لعرض الجدول — يظهر سطرين كحد أقصى مع إشارة للباقي */
function truncateMultilineForTable(text, maxLines){
  maxLines = maxLines == null ? 2 : maxLines;
  const raw = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if(!raw) return '-';
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  if(lines.length <= maxLines) return lgEscapeHtml(lines.join('\n'));
  const shown = lines.slice(0, maxLines).join('\n');
  const more = lines.length - maxLines;
  return lgEscapeHtml(shown) + '\n<span class="table-more-lines" style="color:var(--ink-soft);font-size:11px;font-weight:600;">… +' + more + ' أصناف</span>';
}

function invoiceTableTheadHtml(){
  return `<tr>
    <th>رقم الفاتورة</th><th>التاريخ</th><th>المورد</th><th>البيان</th>
    <th>كود داخلي</th><th>كود المورد</th><th>نوع الفاتورة</th><th>المشروع</th>
    <th>طبيعة التعامل</th><th>نوع الخصم</th>
    <th>القيمة الإجمالية</th><th>الضريبة</th><th>الدمغات</th><th>إجمالي الفاتورة</th>
    <th>المخصوم</th><th>الصافي</th><th></th>
  </tr>`;
}
function invoiceTableColspan(){ return 17; }
function invoiceTableRowHtml(r, opts){
  opts = opts || {};
  const s = supplierById(r.supplierId);
  // archiveOnlyView / archiveOnlyNotice: أزرار مختصرة للأرشيف
  const archiveOnlyView = !!opts.archiveOnlyView;
  const archiveOnlyNotice = !!opts.archiveOnlyNotice;
  const showDel = !archiveOnlyView && !archiveOnlyNotice && opts.showDelete !== false && (typeof hasPagePermission!=='function' || hasPagePermission("ledger.invoices",'delete'));
  const showEdit = !archiveOnlyView && !archiveOnlyNotice && opts.showEdit !== false && (typeof hasPagePermission!=='function' || hasPagePermission("ledger.invoices",'edit'));
  const showNotice = archiveOnlyNotice || (!archiveOnlyView && opts.showNotice !== false);
  const showView = !archiveOnlyNotice && opts.showView !== false;
  const natureTxt = codeDescription(NATURE_OPTIONS, r.nature);
  const discTxt = codeDescription(DISCOUNT_TYPE_OPTIONS, r.discountType);
  return `<tr class="${invoiceRowClass(r)}" data-viewinv="${r.id}" style="cursor:pointer;" title="اضغط لعرض التفاصيل">
    <td>${isInvoiceIncomplete(r)?`<span class="warn-badge" title="بيانات ناقصة: ${lgEscapeHtml(invoiceMissingFields(r).join('، '))}" >⚠️</span> `:''}${lgEscapeHtml(r.invoiceNo||'-')}${r.isReturn?' <span class="pill" style="background:var(--debt);color:#fff;">مرتجع</span>':''}${r.cancelled?' <span class="pill" style="background:#6b7280;color:#fff;">فاتورة ملغاة</span>':''}${(!r.isReturn && r.postReturnWht)?' <span class="pill" style="background:#b45309;color:#fff;">إشعار بعد مرتجع</span>':''}</td>
    <td>${lgEscapeHtml(lgFmtDate(r.date)||'-')}</td>
    <td>${lgEscapeHtml(s?s.name:'—')}</td>
    <td style="white-space:pre-line;max-width:220px;vertical-align:top;">${truncateMultilineForTable(r.description,2)}</td>
    <td style="white-space:pre-line;max-width:120px;vertical-align:top;">${truncateMultilineForTable(r.internalCode,2)}</td>
    <td style="white-space:pre-line;max-width:120px;vertical-align:top;">${truncateMultilineForTable(r.supplierItemCode,2)}</td>
    <td>${r.category?`<span class="pill">${lgEscapeHtml(r.category)}</span>`:'-'}</td>
    <td>${r.project?`<span class="pill">${lgEscapeHtml(r.project)}</span>`:'-'}</td>
    <td title="${lgEscapeHtml(natureTxt)}">${lgEscapeHtml(natureTxt==='-'?'-':natureTxt)}</td>
    <td title="${lgEscapeHtml(discTxt)}">${lgEscapeHtml(discTxt==='-'?'-':discTxt)}</td>
    <td>${fmt(r.baseValue)}</td>
    <td>${r.vat?fmt(r.vat):'-'}</td>
    <td>${r.stampDuty?fmt(r.stampDuty):'-'}</td>
    <td class="amount-cell invoice">${fmt(r.totalInvoice)}</td>
    <td>${r.withheld?fmt(r.withheld):'-'}${r.withheld && r.withheldStatus==='paid'?' <span class="pill" style="font-size:10px;background:#059669;color:#fff;">ضرائب✓</span>':(r.withheld && !r.isReturn?' <span class="pill" style="font-size:10px;background:#b45309;color:#fff;">ضرائب…</span>':'')}</td>
    <td class="amount-cell ${r.isReturn?'payment':'invoice'}">${r.isReturn?'-':''}${fmt(r.netInvoice)}</td>
    <td><div class="row-actions">
      ${showView?`<button class="row-btn" data-viewinv-btn="${r.id}" title="عرض">👁</button>`:''}
      ${showNotice && r.withheld>0 && !r.isReturn && !r.cancelled?`<button class="row-btn" data-notice="${r.id}" title="${r.postReturnWht?'إشعار خصم بعد مرتجع':'إشعار خصم'}">🧾</button>`:''}
      ${showEdit?`<button class="row-btn" data-editinv="${r.id}" title="تعديل">✎</button>`:''}
      ${showDel?`<button class="row-btn del" data-delinv="${r.id}" title="حذف">✕</button>`:''}
    </div></td>
  </tr>`;
}

/** توست مع زر استعادة لمدة 5 ثواني */
function lgShowUndoToast(message, onUndo){
  const existing = document.getElementById('undoToast');
  if(existing) existing.remove();
  if(window.__undoTimer){ clearTimeout(window.__undoTimer); window.__undoTimer = null; }
  window.__undoAction = onUndo;
  const elToast = document.createElement('div');
  elToast.id = 'undoToast';
  elToast.className = 'undo-toast';
  elToast.innerHTML = `
    <span>${lgEscapeHtml(message)}</span>
    <button type="button" id="undoToastBtn">استعادة</button>
    <span class="undo-timer" id="undoTimerLabel">5</span>
  `;
  document.body.appendChild(elToast);
  let left = 5;
  const btn = document.getElementById('undoToastBtn');
  btn.addEventListener('click', ()=>{
    if(window.__undoAction) window.__undoAction();
    window.__undoAction = null;
    if(window.__undoTimer) clearInterval(window.__undoTimer);
    elToast.remove();
    lgShowToast('تم الاستعادة');
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

function recalcLinkedOriginal(origId){
  const orig = DATA.ledger.invoices.find(i=>i.id===origId);
  if(!orig || orig.isReturn) return;
  const rets = DATA.ledger.invoices.filter(i=>i.isReturn && i.linkedInvoiceId===orig.id);
  const allRetNet = rets.reduce((a,b)=>a+Number(b.netInvoice||0),0);
  const oNet = Number(orig.netInvoice||0);
  orig.linkedReturnIds = rets.map(r=>r.id);
  if(rets.length && oNet>0 && allRetNet >= oNet - 0.02){
    orig.cancelled = true; orig.postReturnWht = false;
  } else if(rets.length && Number(orig.withheld||0)>0){
    orig.cancelled = false; orig.postReturnWht = true;
  } else {
    orig.cancelled = false; orig.postReturnWht = false;
  }
}
async function confirmAndSoftDeleteInvoice(id){
  if(guardReadOnly('حذف فاتورة')) return;
  if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.invoices",'delete')){ lgShowToast('🔒 ماعندكش صلاحية حذف الفواتير'); return; }
  const inv = DATA.ledger.invoices.find(i=>i.id===id);
  if(!inv) return;
  const label = inv.invoiceNo || id;
  const linkedOrig = inv.isReturn ? inv.linkedInvoiceId : null;
  if(!(await showAppConfirm('هل أنت متأكد من حذف الفاتورة رقم «'+label+'»؟\nيمكنك استعادتها خلال 5 ثوانٍ بعد الحذف.', { title:'حذف فاتورة', okText:'حذف', cancelText:'إلغاء', danger:true }))) return;
  const snapshot = JSON.parse(JSON.stringify(inv));
  DATA.ledger.invoices = DATA.ledger.invoices.filter(i=>i.id!==id);
  if(linkedOrig) recalcLinkedOriginal(linkedOrig);
  logAction('حذف فاتورة', 'رقم '+label);
  saveData();
  lgRerenderCurrentPage();
  lgShowUndoToast('تم حذف الفاتورة «'+label+'»', ()=>{
    if(!DATA.ledger.invoices.find(i=>i.id===snapshot.id)){
      DATA.ledger.invoices.push(snapshot);
      if(snapshot.isReturn && snapshot.linkedInvoiceId) recalcLinkedOriginal(snapshot.linkedInvoiceId);
      logAction('استعادة فاتورة', 'رقم '+label);
      saveData();
      lgRerenderCurrentPage();
    }
  });
}

async function confirmAndSoftDeletePayment(id){
  if(guardReadOnly('حذف دفعة')) return;
  if(typeof hasPagePermission==='function' && !hasPagePermission("ledger.payments",'delete')){ lgShowToast('🔒 ماعندكش صلاحية حذف الدفعات'); return; }
  const pay = DATA.ledger.payments.find(p=>p.id===id);
  if(!pay) return;
  const s = supplierById(pay.supplierId);
  const label = (s?s.name+' — ':'') + fmt(pay.amount);
  if(!(await showAppConfirm('هل أنت متأكد من حذف الدفعة («'+label+'»)?\nيمكنك استعادتها خلال 5 ثوانٍ بعد الحذف.', { title:'حذف دفعة', okText:'حذف', cancelText:'إلغاء', danger:true }))) return;
  const snapshot = JSON.parse(JSON.stringify(pay));
  DATA.ledger.payments = DATA.ledger.payments.filter(p=>p.id!==id);
  logAction('حذف دفعة', label);
  try{ if(typeof lgRebuildIndexes==='function') lgRebuildIndexes(); }catch(e){}
  saveData(true);
  try{ if(typeof lgRender==='function') lgRender(); else lgRerenderCurrentPage(); }catch(e){ lgRerenderCurrentPage(); }
  try{ if(typeof refreshOpenStatements==='function') refreshOpenStatements(); }catch(e){}
  lgShowUndoToast('تم حذف الدفعة', ()=>{
    if(!DATA.ledger.payments.find(p=>p.id===snapshot.id)){
      DATA.ledger.payments.push(snapshot);
      logAction('استعادة دفعة', label);
      try{ if(typeof lgRebuildIndexes==='function') lgRebuildIndexes(); }catch(e){}
      saveData(true);
      try{ if(typeof lgRender==='function') lgRender(); else lgRerenderCurrentPage(); }catch(e){ lgRerenderCurrentPage(); }
      try{ if(typeof refreshOpenStatements==='function') refreshOpenStatements(); }catch(e){}
    }
  });
}

function captureScrollState(){
  const pc = document.getElementById('pageContent');
  const wraps = Array.from(document.querySelectorAll('.table-wrap, .page, #mainPanel, #supplierListWrap'));
  const state = {
    pageY: window.scrollY || document.documentElement.scrollTop || 0,
    pcY: pc ? pc.scrollTop : 0,
    wraps: wraps.map(lgEl => ({ top: lgEl.scrollTop, left: lgEl.scrollLeft }))
  };
  window.__scrollRestore = state;
  return state;
}
function restoreScrollState(){
  const state = window.__scrollRestore;
  if(!state) return;
  requestAnimationFrame(()=>{
    window.scrollTo(0, state.pageY || 0);
    const pc = document.getElementById('pageContent');
    if(pc) pc.scrollTop = state.pcY || 0;
    const wraps = Array.from(document.querySelectorAll('.table-wrap, .page, #mainPanel, #supplierListWrap'));
    wraps.forEach((lgEl, i)=>{
      if(state.wraps && state.wraps[i]){
        lgEl.scrollTop = state.wraps[i].top || 0;
        lgEl.scrollLeft = state.wraps[i].left || 0;
      }
    });
  });
}

function invoiceRowClass(inv){
  const parts = [];
  if(inv && inv.isReturn) parts.push('row-return');
  if(inv && typeof isInvoiceOverdue === 'function' && isInvoiceOverdue(inv)) parts.push('row-overdue');
  if(inv && typeof isInvoiceIncomplete === 'function' && isInvoiceIncomplete(inv)) parts.push('row-incomplete');
  return parts.join(' ');
}

/** تنبيه المتأخرات عند فتح البرنامج */
function maybeShowOverdueAlert(){
  // كل مرة يفتح البرنامج (مش مرة واحدة في اليوم) — طالما فيه فواتير متأخرة
  if(overdueAlertShown) return; // منع التكرار في نفس الجلسة فقط
  const list = typeof getOverdueInvoices === 'function' ? getOverdueInvoices() : [];
  if(!list.length) return;
  overdueAlertShown = true;
  try { localStorage.removeItem('mb_overdue_alert_date'); } catch(e){}
  const total = list.reduce((a,b)=>a + invoiceRemaining(b), 0);
  const overlay = lgEl(`
    <div class="modal-overlay" id="overdueAlertOverlay">
      <div class="modal">
        <h3 style="color:var(--debt);">⚠️ تنبيه: فواتير متأخرة</h3>
        <p style="font-size:14px;color:var(--ink-soft);line-height:1.7;">
          يوجد <strong style="color:var(--debt);">${list.length}</strong> فاتورة متأخرة
          بإجمالي باقي <strong style="color:var(--debt);">${fmt(total)}</strong>
        </p>
        <div class="modal-actions">
          <button class="btn btn-outline" id="overdueAlertClose">لاحقاً</button>
          <button class="btn btn-primary" id="overdueAlertGo">عرض الفواتير المتأخرة</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  document.getElementById('overdueAlertClose').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('overdueAlertGo').addEventListener('click', ()=>{
    overlay.remove();
    invoiceFilters = { supplierId: '', category: '', project: '', from: '', to: '', q: '', overdueOnly: true };
    lgCurrentPage = 'invoices';
    lgRender();
  });
}

/* =========================================================
   محرك البحث والفلاتر الموحّد (يستخدمه كل صفحات البرنامج)
   ========================================================= */
const SEARCH_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

/** توحيد النص للبحث: يتجاهل التشكيل والهمزات (أ إ آ = ا) و(ى = ي) و(ة = ه) والأرقام العربية/الهندية */
function searchNorm(v){
  return String(v==null?'':v).toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
    .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g,' ').trim();
}
/** كلمات البحث (كلها مطلوبة). الأرقام بفواصل آلاف (1,145) بتتحوّل لرقم عادي */
function searchTokens(q){
  const n = searchNorm(q).replace(/(\d)[,٬،](?=\d{3}\b)/g,'$1');
  return n ? n.split(' ') : [];
}
function searchHas(textNorm, tokens){ return tokens.every(t=>textNorm.indexOf(t)>-1); }
function searchDateText(d){
  const s = String(d||'').slice(0,10);
  if(!s) return '';
  return s + ' ' + (typeof lgFmtDate==='function' ? lgFmtDate(s) : '');
}
function searchAttNames(list){
  return (list||[]).filter(Boolean).map(a=>(a.name||'')+' '+(a.docTypeLabel||'')+' '+(a.subject||'')).join(' ');
}
const SEARCH_SKIP_KEYS = /(^id$|Id$|^_|^attachments$|^createdAt$|^updatedAt$|^cancelled$|^isReturn$|^linked)/;
/** يفرد كل القيم النصية/الرقمية للكائن (بما فيها صفوف الأصناف والحقول الإضافية) في نص واحد للبحث */
function searchFlatten(o, depth){
  if(o==null) return '';
  const t = typeof o;
  if(t==='string' || t==='number') return String(o);
  if(t!=='object' || depth>2) return '';
  if(Array.isArray(o)) return o.map(x=>searchFlatten(x, depth+1)).join(' ');
  return Object.keys(o).filter(k=>!SEARCH_SKIP_KEYS.test(k)).map(k=>searchFlatten(o[k], depth+1)).join(' ');
}
function searchSupplierText(s){
  if(!s) return '';
  return searchNorm([s.name,s.taxId,s.commercialReg,s.phone,s.email,s.address,s.businessNature,s.bankAccount,s.iban,s.notes,searchFlatten(s.extraFields,1),searchFlatten(s.customFields,1)].join(' '));
}
function searchInvoiceText(inv){
  if(!inv) return '';
  const s = typeof supplierById==='function' ? supplierById(inv.supplierId) : null;
  return searchNorm([
    searchSupplierText(s),
    searchFlatten(inv,0),
    inv.isReturn ? 'مرتجع' : 'فاتورة',
    searchDateText(inv.date), searchDateText(inv.dueDate),
    searchAttNames(inv.attachments)
  ].join(' '));
}
function searchPaymentText(p){
  if(!p) return '';
  const s = typeof supplierById==='function' ? supplierById(p.supplierId) : null;
  const inv = p.invoiceId ? (DATA.ledger.invoices||[]).find(i=>i.id===p.invoiceId) : null;
  return searchNorm([
    s ? (s.name+' '+(s.taxId||'')) : '',
    'دفعة', searchFlatten(p,0),
    inv ? inv.invoiceNo : 'عامه',
    p.direction==='collect' ? 'مدين تحصيل' : 'دائن سداد',
    searchDateText(p.date), searchAttNames(p.attachments)
  ].join(' '));
}
/** حالة الفاتورة: return | paid | partial | unpaid */
function invoiceStatusKey(inv){
  if(!inv) return '';
  if(inv.isReturn) return 'return';
  const rem = invoiceRemaining(inv), net = Number(inv.netInvoice||0);
  if(rem <= 0.005) return 'paid';
  if(Math.abs(rem - net) < 0.005) return 'unpaid';
  return 'partial';
}
/** هل التاريخ يطابق (سنة / شهر / من / إلى)؟ الحقول الغايبة بتتجاهل */
function searchDateOk(d, f){
  const s = String(d||'').slice(0,10);
  if(f.year && s.slice(0,4)!==String(f.year)) return false;
  if(f.month && s.slice(5,7)!==f.month) return false;
  if(f.from && (!s || s < f.from)) return false;
  if(f.to && (!s || s > f.to)) return false;
  return true;
}
function searchAmountOk(v, f){
  const n = Math.abs(Number(v)||0);
  if(f.min!=='' && f.min!=null && n < parseAmount(f.min)) return false;
  if(f.max!=='' && f.max!=null && n > parseAmount(f.max)) return false;
  return true;
}
function searchYears(dates){
  return [...new Set((dates||[]).map(d=>String(d||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort().reverse();
}

/** فلترة + ترتيب الفواتير بفلاتر مشتركة (الصفحات: كل الفواتير / التقارير / إشعارات الخصم / تبويبات المورد) */
function filterInvoicesBy(rows, f, defaultSort){
  const tokens = searchTokens(f.q);
  let out = rows;
  if(f.supplierId) out = out.filter(i=>i.supplierId===f.supplierId);
  if(f.category) out = out.filter(i=>i.category===f.category);
  if(f.project) out = out.filter(i=>i.project===f.project);
  if(f.month) out = out.filter(i=>String(i.date||'').slice(5,7)===f.month);
  if(f.kind==='invoice') out = out.filter(i=>!i.isReturn);
  else if(f.kind==='return') out = out.filter(i=>!!i.isReturn);
  if(f.status==='overdue') out = out.filter(i=>typeof isInvoiceOverdue==='function' && isInvoiceOverdue(i));
  else if(f.status) out = out.filter(i=>invoiceStatusKey(i)===f.status);
  if(f.withheld==='yes') out = out.filter(i=>Number(i.withheld)>0);
  else if(f.withheld==='no') out = out.filter(i=>!(Number(i.withheld)>0));
  if((f.min!==''&&f.min!=null) || (f.max!==''&&f.max!=null)) out = out.filter(i=>searchAmountOk(i.netInvoice, f));
  if(tokens.length) out = out.filter(i=>searchHas(searchInvoiceText(i), tokens));
  const mode = f.sort || defaultSort || 'new';
  const dt = i=>String(i.date||'');
  const arr = out.slice();
  if(mode==='old') arr.sort((a,b)=>dt(a).localeCompare(dt(b)));
  else if(mode==='amount_desc') arr.sort((a,b)=>Number(b.netInvoice||0)-Number(a.netInvoice||0));
  else if(mode==='amount_asc') arr.sort((a,b)=>Number(a.netInvoice||0)-Number(b.netInvoice||0));
  else if(mode==='supplier') arr.sort((a,b)=>{
    const sa = supplierById(a.supplierId), sb = supplierById(b.supplierId);
    return String((sa&&sa.name)||'').localeCompare(String((sb&&sb.name)||''),'ar') || dt(b).localeCompare(dt(a));
  });
  else if(mode==='no') arr.sort((a,b)=>String(a.invoiceNo||'').localeCompare(String(b.invoiceNo||''),undefined,{numeric:true}));
  else arr.sort((a,b)=>dt(b).localeCompare(dt(a)));
  return arr;
}

/* ---------- حالة الفلاتر المشتركة لكل الصفحات ---------- */
const PF_DEFAULTS = {
  invoices:  { supplierId:'', category:'', project:'', from:'', to:'', q:'', overdueOnly:false, year:'', month:'', kind:'', status:'', withheld:'', min:'', max:'', sort:'new' },
  payments:  { from:'', to:'', year:'', q:'', month:'', supplierId:'', method:'', direction:'', link:'', min:'', max:'', sort:'new' },
  quarterly: { from:'', to:'', q:'', month:'', supplierId:'', category:'', project:'', min:'', max:'', sort:'old' },
  reports:   { q:'', month:'', supplierId:'', category:'', project:'', kind:'', status:'', withheld:'', min:'', max:'', sort:'new' },
  supTab:    { q:'', year:'', month:'', status:'', method:'', sort:'new' }
};
let reportsFilters = Object.assign({}, PF_DEFAULTS.reports);
let supplierTabFilters = Object.assign({}, PF_DEFAULTS.supTab);
function pfTarget(scope){
  switch(scope){
    case 'invoices': return invoiceFilters;
    case 'payments': return paymentsFilters;
    case 'quarterly': return quarterlyFilters;
    case 'reports': return reportsFilters;
    case 'supTab': return supplierTabFilters;
  }
  return null;
}
/** عدد الفلاتر المفعّلة (بدون الترتيب) */
function pfActiveCount(scope){
  const f = pfTarget(scope), d = PF_DEFAULTS[scope];
  if(!f || !d) return 0;
  let n = 0;
  Object.keys(d).forEach(k=>{
    if(k==='sort') return;
    if(String(f[k]===undefined?'':f[k]) !== String(d[k])) n++;
  });
  if(scope==='reports'){ if(reportsFrom) n++; if(reportsTo) n++; }
  return n;
}
function pfReset(scope){
  const f = pfTarget(scope), d = PF_DEFAULTS[scope];
  if(!f || !d) return;
  Object.keys(d).forEach(k=>{ f[k] = d[k]; });
  if(scope==='reports'){ reportsFrom = ''; reportsTo = ''; }
}
function pfPageKey(scope){
  return ({ invoices:'invoices', payments:'payments', quarterly:'quarterly', reports:'reports', supTab:null })[scope] || null;
}

/* ---------- عناصر واجهة الفلاتر ---------- */
function pfSelect(scope, key, label, options, value){
  return `<div class="field"><label>${lgEscapeHtml(label)}</label>
    <select data-pf="${scope}:${key}">
      ${options.map(o=>`<option value="${lgEscapeHtml(o[0])}" ${String(value==null?'':value)===String(o[0])?'selected':''}>${lgEscapeHtml(o[1])}</option>`).join('')}
    </select></div>`;
}
function pfMonthSelect(scope, value){
  return pfSelect(scope,'month','الشهر',[['','كل الشهور']].concat(SEARCH_MONTHS.map((m,i)=>[String(i+1).padStart(2,'0'),m])), value);
}
function pfAmountFields(scope, f, label){
  return `<div class="field"><label>${lgEscapeHtml(label||'القيمة من')}</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" style="text-align:right;" data-pf="${scope}:min" value="${lgEscapeHtml(f.min==null?'':f.min)}" placeholder="٠" autocomplete="off"></div>
    <div class="field"><label>إلى</label><input type="text" inputmode="decimal" data-money="pos" dir="ltr" style="text-align:right;" data-pf="${scope}:max" value="${lgEscapeHtml(f.max==null?'':f.max)}" placeholder="∞" autocomplete="off"></div>`;
}
function pfTextField(scope, key, label, placeholder, value){
  return `<div class="field field-search"><label>${lgEscapeHtml(label)}</label>
    <input type="search" class="search-box" id="pf_${scope}_${key}" data-pf="${scope}:${key}" placeholder="${lgEscapeHtml(placeholder)}" value="${lgEscapeHtml(value||'')}" autocomplete="off"></div>`;
}
/** اختيار مورد بنفس الكومبو الذكي المستخدم في كل البرنامج */
function pfSupplierCombo(scope, f){
  const s = f.supplierId && typeof supplierById==='function' ? supplierById(f.supplierId) : null;
  return `<div class="field" style="min-width:180px;"><label>المورد</label>
    <div class="ss-cell"><input type="text" data-pf-sup="${scope}" id="pfsup_${scope}" placeholder="كل الموردين — ابحث..." autocomplete="off"
      value="${lgEscapeHtml(s?s.name:'')}" data-combo-id="${lgEscapeHtml(f.supplierId||'')}"></div></div>`;
}
/** قائمة منسدلة بالقيم الموجودة فعلاً في الفواتير (تصنيف / مشروع) */
function pfDistinctSelect(scope, key, label, allLabel, values, value){
  const list = [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  return pfSelect(scope, key, label, [['',allLabel]].concat(list.map(v=>[v,v])), value);
}
function pfResetBtn(scope){
  const n = pfActiveCount(scope);
  return n ? `<button type="button" class="btn btn-outline btn-sm" data-pf-reset="${scope}" style="align-self:flex-end;">✕ مسح الفلاتر (${n})</button>` : '';
}
function pfSummaryHtml(inner){
  return `<p style="margin:0 0 12px;font-size:13px;color:var(--ink-soft);">${inner}</p>`;
}
const PF_SORT_INVOICES = [['new','الأحدث أولاً'],['old','الأقدم أولاً'],['amount_desc','الأعلى قيمة'],['amount_asc','الأقل قيمة'],['supplier','المورد'],['no','رقم الفاتورة']];
const PF_SORT_PAYMENTS = [['new','الأحدث أولاً'],['old','الأقدم أولاً'],['amount_desc','الأعلى مبلغاً'],['amount_asc','الأقل مبلغاً']];
const PF_STATUS_INVOICES = [['','كل الحالات'],['paid','مسددة'],['partial','مسددة جزئياً'],['unpaid','غير مسددة'],['overdue','متأخرة'],['return','مرتجعات']];
/** وصف الفلاتر المفعّلة (للتصدير) */
function pfLabelBits(scope){
  const f = pfTarget(scope); if(!f) return [];
  const bits = [];
  const opt = (arr,v)=>{ const o = arr.find(x=>x[0]===v); return o ? o[1] : v; };
  if(f.month) bits.push('شهر: '+opt(SEARCH_MONTHS.map((m,i)=>[String(i+1).padStart(2,'0'),m]), f.month));
  if(f.kind) bits.push('النوع: '+(f.kind==='return'?'مرتجعات':'فواتير'));
  if(f.status) bits.push('الحالة: '+opt(PF_STATUS_INVOICES, f.status));
  if(f.withheld) bits.push(f.withheld==='yes'?'عليها خصم':'بدون خصم');
  if(f.method) bits.push('الطريقة: '+f.method);
  if(f.direction) bits.push(f.direction==='collect'?'مدين':'دائن');
  if(f.link) bits.push(f.link==='general'?'دفعات عامة':'مرتبطة بفاتورة');
  if(f.min!==''&&f.min!=null) bits.push('من قيمة: '+f.min);
  if(f.max!==''&&f.max!=null) bits.push('إلى قيمة: '+f.max);
  return bits;
}

/** ربط عناصر الفلاتر ([data-pf] و[data-pf-reset]) — يُستدعى بعد كل رسم للصفحة */
function attachPageFilterControls(){
  const root = document.getElementById('pageContent') || document;
  const rerender = (scope)=>{
    const pk = pfPageKey(scope);
    if(pk && typeof lgSetTablePage==='function') lgSetTablePage(pk, 1);
    if(scope==='supTab' && typeof lgSetTablePage==='function'){ lgSetTablePage('supplierInvoices',1); lgSetTablePage('supplierPayments',1); }
    if(typeof lgRerenderCurrentPage==='function') lgRerenderCurrentPage(); else lgRender();
  };
  const keepFocus = (lgEl)=>{
    const key = lgEl.getAttribute('data-pf');
    const pos = typeof lgEl.selectionStart==='number' ? lgEl.selectionStart : null;
    return ()=>{
      const n = document.querySelector('[data-pf="'+key+'"]');
      if(!n) return;
      n.focus();
      try{ if(pos!=null) n.setSelectionRange(pos,pos); }catch(_e){}
    };
  };
  root.querySelectorAll('[data-pf]').forEach(lgEl=>{
    if(lgEl.__pfBound) return;
    lgEl.__pfBound = true;
    const [scope, key] = lgEl.getAttribute('data-pf').split(':');
    const set = ()=>{ const f = pfTarget(scope); if(f) f[key] = lgEl.value || ''; };
    const isText = lgEl.tagName==='INPUT' && (lgEl.type==='search' || lgEl.type==='text' || lgEl.type==='number');
    if(!isText){
      lgEl.addEventListener('change', ()=>{ set(); rerender(scope); });
      return;
    }
    let composing = false, t = null;
    const run = ()=>{ set(); const restore = keepFocus(lgEl); rerender(scope); restore(); };
    lgEl.addEventListener('compositionstart', ()=>{ composing = true; });
    lgEl.addEventListener('compositionend', ()=>{ composing = false; clearTimeout(t); t = setTimeout(run, 150); });
    lgEl.addEventListener('input', ()=>{ if(composing) return; set(); clearTimeout(t); t = setTimeout(run, lgEl.hasAttribute('data-money') ? 450 : 280); });
    lgEl.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); clearTimeout(t); run(); } });
  });
  root.querySelectorAll('[data-pf-sup]').forEach(inp=>{
    if(inp.__pfBound) return;
    inp.__pfBound = true;
    const scope = inp.getAttribute('data-pf-sup');
    const apply = (id)=>{ const f = pfTarget(scope); if(f) f.supplierId = id || ''; rerender(scope); };
    if(typeof attachSmartCombo==='function'){
      attachSmartCombo(inp, {
        getItems: ()=> [{ id:'', value:'', label:'كل الموردين' }].concat(typeof getSupplierComboItems==='function' ? getSupplierComboItems() : []),
        allowFreeText: false, clearIdOnType: true, resolveOnBlur: true, maxItems: 80,
        onSelect: (it)=>{ inp.dataset.comboId = it.id || ''; apply(it.id || ''); }
      });
    }
    inp.addEventListener('change', ()=>{
      const id = inp.dataset.comboId || '';
      const f = pfTarget(scope);
      if(f && (f.supplierId||'') !== id) apply(id);
    });
  });
  root.querySelectorAll('[data-pf-reset]').forEach(b=>{
    if(b.__pfBound) return;
    b.__pfBound = true;
    b.addEventListener('click', ()=>{ const scope = b.getAttribute('data-pf-reset'); pfReset(scope); rerender(scope); });
  });
}
