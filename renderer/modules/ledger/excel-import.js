/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — excel-import.js — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */
/* ---------------- Excel Import ---------------- */
let excelImportState = null;

function lgOpenExcelImportModal(){
  if(guardReadOnly('استيراد من إكسيل')) return;
  window.desktopApi.importExcel().then(res=>{
    if(!res || res.canceled) return;
    if(!res.ok){ lgShowToast(res.error || 'تعذر قراءة الملف'); return; }
    if(!res.sheetNames || !res.sheetNames.length){ lgShowToast('الملف لا يحتوي على أي شيت بيانات'); return; }
    excelImportState = { sheets: res.sheets, sheetNames: res.sheetNames, activeSheet: res.sheetNames[0], importType: 'invoices', fileName: res.fileName, mapping: null, mappingFor: '' };
    renderExcelImportModal();
  });
}

function renderExcelImportModal(){
  const st = excelImportState; if(!st) return;
  const existing = document.getElementById('excelImportOverlay'); if(existing) existing.remove();

  const rows = st.sheets[st.activeSheet] || [];
  const headers = (rows[0]||[]).map((h,idx)=> (h && String(h).trim()) || ('عمود '+(idx+1)));
  const dataRows = rows.slice(1).filter(r=>r && r.some(c=>String(c===undefined||c===null?'':c).trim()!==''));

  const fieldsInvoices = [
    {key:'supplierName', label:'اسم المورد', required:true},
    {key:'supplierTaxId', label:'الرقم الضريبي للمورد', required:false},
    {key:'invoiceNo', label:'رقم الفاتورة', required:true},
    {key:'date', label:'التاريخ', required:false},
    {key:'description', label:'بيان المشتريات', required:false},
    {key:'internalCode', label:'الكود الداخلي للصنف', required:false},
    {key:'supplierItemCode', label:'كود الصنف لدى المورد', required:false},
    {key:'itemDescription', label:'وصف الصنف', required:false},
    {key:'quantity', label:'الكمية / الوحدة', required:false},
    {key:'baseValue', label:'القيمة الإجمالية للتعامل', required:true},
    {key:'vat', label:'ضريبة القيمة المضافة', required:false},
    {key:'stampDuty', label:'الدمغات', required:false},
    {key:'discountRate', label:'نسبة الخصم %', required:false},
    {key:'withheld', label:'المبلغ المخصوم', required:false},
    {key:'nature', label:'طبيعة التعامل', required:false},
    {key:'discountType', label:'نوع الخصم', required:false},
    {key:'category', label:'التصنيف', required:false},
    {key:'project', label:'المشروع', required:false}
  ];
  const fieldsSuppliers = [
    {key:'name', label:'اسم المورد', required:true},
    {key:'taxId', label:'الرقم الضريبي', required:false},
    {key:'commercialReg', label:'السجل التجاري', required:false},
    {key:'businessNature', label:'طبيعة النشاط', required:false},
    {key:'openingBalance', label:'الرصيد الافتتاحي', required:false},
    {key:'openingBalanceDate', label:'تاريخ الرصيد الافتتاحي', required:false},
    {key:'phone', label:'رقم الهاتف', required:false},
    {key:'email', label:'البريد الإلكتروني', required:false},
    {key:'address', label:'العنوان', required:false},
    {key:'bankAccount', label:'رقم الحساب البنكي', required:false},
    {key:'iban', label:'IBAN', required:false}
  ];
  const fieldsPayments = [
    {key:'supplierName', label:'اسم المورد', required:true},
    {key:'supplierTaxId', label:'الرقم الضريبي للمورد', required:false},
    {key:'date', label:'تاريخ الدفعة', required:true},
    {key:'amount', label:'المبلغ', required:true},
    {key:'method', label:'طريقة الدفع', required:false},
    {key:'invoiceNo', label:'رقم الفاتورة المرتبطة', required:false},
    {key:'transferRef', label:'رقم التحويل', required:false},
    {key:'notes', label:'ملاحظات', required:false}
  ];
  const fields = st.importType==='suppliers' ? fieldsSuppliers : (st.importType==='payments' ? fieldsPayments : fieldsInvoices);

  const mappingKey = st.importType+'|'+st.activeSheet;
  if(!st.mapping || st.mappingFor!==mappingKey){
    const aliases = {
      supplierName: ['اسم المورد','المورد','supplier'],
      supplierTaxId: ['الرقم الضريبي','تسجيل ضريبي','tax'],
      invoiceNo: ['رقم الفاتورة','الفاتورة','invoice'],
      date: ['التاريخ','تاريخ'],
      description: ['بيان','الوصف','المشتريات','description'],
      internalCode: ['الكود الداخلي','كود داخلي','internal'],
      supplierItemCode: ['كود الصنف لدى المورد','كود المورد','كود الصنف','supplier item','item code'],
      itemDescription: ['وصف الصنف','تفاصيل الصنف','item description','description'],
      quantity: ['الكمية','الوحدة','الكمية / الوحدة','quantity','qty','unit'],
      baseValue: ['القيمة','قيمة التعامل','base'],
      vat: ['ضريبة','القيمة المضافة','vat'],
      stampDuty: ['الدمغات','دمغة'],
      discountRate: ['نسبة الخصم','نسبة'],
      withheld: ['المخصوم','المبلغ المخصوم','خصم'],
      nature: ['طبيعة التعامل','طبيعة'],
      discountType: ['نوع الخصم'],
      category: ['التصنيف','نوع الفاتورة'],
      project: ['المشروع'],
      name: ['اسم المورد','الاسم','المورد'],
      taxId: ['الرقم الضريبي','ضريبي'],
      amount: ['المبلغ','amount'],
      method: ['طريقة الدفع','طريقة'],
      transferRef: ['رقم التحويل','تحويل'],
      notes: ['ملاحظات']
    };
    const mapping = {};
    fields.forEach(f=>{
      let guess = -1;
      const keys = (aliases[f.key] || []).concat([f.label, f.label.split(/[\s(]/)[0]]);
      headers.forEach((h,idx)=>{
        if(guess!==-1 || !h) return;
        const hl = String(h).toLowerCase();
        for(const k of keys){
          if(k && hl.indexOf(String(k).toLowerCase())!==-1){ guess = idx; break; }
        }
      });
      mapping[f.key] = guess;
    });
    st.mapping = mapping;
    st.mappingFor = mappingKey;
  }

  const overlay = lgEl(`
    <div class="modal-overlay" id="excelImportOverlay">
      <div class="modal wide">
        <h3>استيراد بيانات من إكسيل</h3>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-top:-8px;">الملف: ${lgEscapeHtml(st.fileName||'')} — أول صف في الشيت يُعتبر عناوين الأعمدة</p>
        <div class="form-grid">
          ${st.sheetNames.length>1?`<div class="field"><label>الشيت</label><select id="ei_sheet">${st.sheetNames.map(n=>`<option value="${lgEscapeHtml(n)}" ${n===st.activeSheet?'selected':''}>${lgEscapeHtml(n)}</option>`).join('')}</select></div>`:''}
          <div class="field"><label>نوع البيانات</label><select id="ei_type">
            <option value="invoices" ${st.importType==='invoices'?'selected':''}>فواتير</option>
            <option value="suppliers" ${st.importType==='suppliers'?'selected':''}>موردين</option>
            <option value="payments" ${st.importType==='payments'?'selected':''}>دفعات</option>
          </select></div>
        </div>
        <div class="section-title" style="margin-top:14px;">مطابقة الأعمدة</div>
        <div class="form-grid" id="ei_mapping">
          ${fields.map(f=>`
            <div class="field"><label>${lgEscapeHtml(f.label)}${f.required?' *':''}</label>
              <select data-map-field="${f.key}">
                <option value="-1">تجاهل</option>
                ${headers.map((h,idx)=>`<option value="${idx}" ${st.mapping[f.key]===idx?'selected':''}>${lgEscapeHtml(h)}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>
        <div class="section-title" style="margin-top:14px;">معاينة (أول 5 صفوف)</div>
        <div class="table-wrap" style="max-height:180px;">
          <table><thead><tr>${headers.map(h=>`<th>${lgEscapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${dataRows.slice(0,5).map(r=>`<tr>${headers.map((h,idx)=>`<td>${lgEscapeHtml(String(r[idx]!==undefined&&r[idx]!==null?r[idx]:''))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length||1}" class="table-empty">لا توجد بيانات</td></tr>`}</tbody></table>
        </div>
        <p style="font-size:11.5px;color:var(--ink-soft);margin:10px 0 0;">عدد الصفوف: ${dataRows.length}. ربط المورد ذكي: يُفضَّل الرقم الضريبي ثم الاسم (حتى لو اختلفت صيغة الاسم). لا يُنشأ مورد مكرر. الفواتير المكررة تُحدَّث بدل إضافتها.</p>
        <div class="modal-actions">
          <button class="btn btn-outline" id="ei_cancel">إلغاء</button>
          <button class="btn btn-primary" id="ei_import">استيراد ${dataRows.length} صف</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  document.getElementById('ei_cancel').addEventListener('click', ()=>{ overlay.remove(); excelImportState=null; });
  overlay.addEventListener('click', e=>{ if(e.target===overlay){ overlay.remove(); excelImportState=null; } });

  const sheetSel = document.getElementById('ei_sheet');
  if(sheetSel) sheetSel.addEventListener('change', ()=>{ st.activeSheet = sheetSel.value; renderExcelImportModal(); });
  document.getElementById('ei_type').addEventListener('change', (e)=>{ st.importType = e.target.value; renderExcelImportModal(); });

  document.querySelectorAll('[data-map-field]').forEach(sel=>{
    sel.addEventListener('change', ()=>{ st.mapping[sel.getAttribute('data-map-field')] = Number(sel.value); });
  });

  document.getElementById('ei_import').addEventListener('click', ()=>{
    document.querySelectorAll('[data-map-field]').forEach(sel=>{ st.mapping[sel.getAttribute('data-map-field')] = Number(sel.value); });
    if(st.importType==='invoices'){
      const preview = previewInvoicesImport(dataRows, st.mapping);
      overlay.remove();
      excelImportState = null;
      openInvoiceImportConfirm(preview);
      return;
    }
    const summary = st.importType==='suppliers' ? runSuppliersImport(dataRows, st.mapping)
      : runPaymentsImport(dataRows, st.mapping);
    overlay.remove();
    excelImportState = null;
    saveData();
    lgRerenderCurrentPage();
    lgShowToast(summary);
  });
}

function cellVal(row, idx){
  if(idx===undefined || idx===null || idx<0) return '';
  const v = row[idx];
  return v===undefined || v===null ? '' : String(v).trim();
}
function parseNum(str){
  if(str===undefined || str===null || str==='') return 0;
  let s = String(str).trim();
  if(!s) return 0;
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  s = s.replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)));
  s = s.replace(/[،,]/g, ''); // إزالة فواصل الآلاف (عربي/إنجليزي)
  s = s.replace(/[^\d.\-]/g, ''); // إزالة أي رموز أخرى (عملة، مسافات..)
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
/**
 * تحويل رقم تسلسلي تاريخ إكسل (Excel serial date) إلى ISO — بنفس الخوارزمية القياسية
 * المستخدمة في SheetJS نفسها، بحساب مباشر بالأيام بدون المرور بتحويل توقيت محلي،
 * عشان نتجنب مشكلة "نقصان يوم" بسبب فروق المنطقة الزمنية.
 */
function excelSerialToIso(serial){
  const utcDays = Math.floor(serial - 25569); // 25569 = عدد الأيام بين 1900-01-01 و1970-01-01 (إبوك يونكس)
  const d = new Date(utcDays * 86400 * 1000);
  const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, day = d.getUTCDate();
  return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
/**
 * تحويل قيمة تاريخ من إكسل (نص منسّق، رقم تسلسلي، أو كائن Date) إلى ISO (yyyy-mm-dd).
 * ملاحظة مهمة: الفرع الاحتياطي (new Date(s)) بيقرأ ويحسب بالتوقيت المحلي وليس UTC —
 * عشان كده منستخدمش toISOString() هنا (بيحوّل لـ UTC وممكن "يسرق" يوم لو الفرق بين
 * توقيت الجهاز و UTC بيخلي منتصف الليل المحلي يقع في اليوم السابق بتوقيت UTC).
 */
function excelDateToIso(v){
  if(v===undefined || v===null || v==='') return '';
  if(v instanceof Date){
    if(isNaN(v)) return '';
    return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  }
  if(typeof v === 'number' && isFinite(v) && v > 59){
    return excelSerialToIso(v);
  }
  const s = String(v).trim();
  if(!s) return '';
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  // رقم تسلسلي إكسل جاء كنص محض (عمود التاريخ في ملف الإكسيل مش متنسّق كـ"تاريخ" أصلاً)
  if(/^\d{4,6}(\.\d+)?$/.test(s)){
    const num = parseFloat(s);
    if(num > 59) return excelSerialToIso(num);
  }
  // أي صيغة نصية تانية (مثلاً "9 مارس 2026" أو "March 9, 2026") — نأخذ التاريخ
  // بتوقيت الجهاز المحلي (getFullYear/getMonth/getDate) وليس UTC، لنفس السبب أعلاه
  const d = new Date(s);
  if(!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return '';
}
/** تطبيع الرقم الضريبي للمقارنة (إزالة مسافات وشرطات) */
function normalizeTaxId(t){
  return String(t || '').replace(/[\s\-_\/\\]/g, '').toLowerCase();
}
/** تطبيع اسم المورد: مسافات زائدة، تشكيل خفيف، حالة الأحرف */
function normalizeSupplierName(n){
  return String(n || '')
    .trim()
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
/** تطابق مرن للأسماء: متطابق أو أحدهما يحتوي الآخر (بعد التطبيع) */
function namesLooselyEqual(a, b){
  const na = normalizeSupplierName(a);
  const nb = normalizeSupplierName(b);
  if(!na || !nb) return false;
  if(na === nb) return true;
  // تجنب المطابقة الفضفاضة لأسماء قصيرة جداً
  if(na.length >= 5 && nb.length >= 5 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}
/**
 * ربط ذكي بالمورد الموجود دون تكرار:
 * 1) الرقم الضريبي أولاً (أقوى معيار) حتى لو اختلفت صيغة الاسم
 * 2) ثم الاسم بعد التطبيع
 * 3) ثم تطابق مرن للاسم بشرط عدم تعارض الرقم الضريبي
 * لو اتطابق: يكمّل الرقم الضريبي الناقص إن وُجد في الاستيراد
 */
function findOrCreateSupplier(name, taxId){
  const rawName = (name || '').trim();
  const rawTax = (taxId || '').trim();
  if(!rawName && !rawTax) return null;

  const taxKey = normalizeTaxId(rawTax);
  let s = null;
  let created = false;

  // 1) الرقم الضريبي أولاً
  if(taxKey){
    s = DATA.ledger.suppliers.find(x => normalizeTaxId(x.taxId) === taxKey) || null;
  }
  // 2) الاسم بعد التطبيع
  if(!s && rawName){
    const nameKey = normalizeSupplierName(rawName);
    s = DATA.ledger.suppliers.find(x => normalizeSupplierName(x.name) === nameKey) || null;
  }
  // 3) تطابق مرن للاسم (صيغ مختلفة) بدون تعارض ضريبي
  if(!s && rawName){
    s = DATA.ledger.suppliers.find(x => {
      if(!namesLooselyEqual(x.name, rawName)) return false;
      const xt = normalizeTaxId(x.taxId);
      if(taxKey && xt && taxKey !== xt) return false;
      return true;
    }) || null;
  }

  if(s){
    // كمّل الرقم الضريبي لو المورد موجود من غير رقم
    if(rawTax && !normalizeTaxId(s.taxId)) s.taxId = rawTax;
    // لو الاسم فاضي عندنا والملف فيه اسم — نحطه
    if(rawName && !(s.name || '').trim()) s.name = rawName;
  } else {
    s = {
      id: lgUid('sup'),
      name: rawName || ('مورد ' + rawTax),
      taxId: rawTax,
      businessNature: '',
      phone: '',
      email: '',
      address: '',
      bankAccount: '',
      iban: '',
      notes: '',
      openingBalance: 0,
      openingBalanceDate: '',
      commercialReg: ''
    };
    DATA.ledger.suppliers.push(s);
    created = true;
    invalidateSupplierMaps();
  }
  s.__justCreated = created;
  return s;
}

/** فهارس سريعة للموردين — O(1) بدل مسح كامل مع كل صف */
let __supplierMaps = null;
function invalidateSupplierMaps(){ __supplierMaps = null; }
function buildSupplierLookupMaps(){
  const byTax = new Map();
  const byName = new Map();
  (DATA.ledger.suppliers || []).forEach(s => {
    if(!s) return;
    const tk = normalizeTaxId(s.taxId);
    if(tk && !byTax.has(tk)) byTax.set(tk, s);
    const nk = normalizeSupplierName(s.name);
    if(nk && !byName.has(nk)) byName.set(nk, s);
  });
  __supplierMaps = { byTax, byName };
  return __supplierMaps;
}
function getSupplierMaps(){
  if(!__supplierMaps) buildSupplierLookupMaps();
  return __supplierMaps;
}

/** بحث عن مورد بدون إنشاء */
function findSupplierMatch(name, taxId){
  const rawName = (name || '').trim();
  const rawTax = (taxId || '').trim();
  if(!rawName && !rawTax) return null;
  const maps = getSupplierMaps();
  const taxKey = normalizeTaxId(rawTax);
  let s = null;
  if(taxKey) s = maps.byTax.get(taxKey) || null;
  if(!s && rawName){
    const nameKey = normalizeSupplierName(rawName);
    if(nameKey) s = maps.byName.get(nameKey) || null;
  }
  if(!s && rawName){
    // تطابق مرن مرة واحدة فقط عند الحاجة (نادر)
    s = DATA.ledger.suppliers.find(x => {
      if(!namesLooselyEqual(x.name, rawName)) return false;
      const xt = normalizeTaxId(x.taxId);
      if(taxKey && xt && taxKey !== xt) return false;
      return true;
    }) || null;
  }
  return s;
}

function runSuppliersImport(rows, map){
  invalidateSupplierMaps();
  let added=0, updated=0;
  rows.forEach(r=>{
    const name = cellVal(r, map.name);
    const taxId = cellVal(r, map.taxId);
    if(!name && !taxId) return;
    const s = findOrCreateSupplier(name, taxId);
    if(!s) return;
    const wasNew = !!s.__justCreated;
    delete s.__justCreated;
    const fields = {
      name: name || s.name,
      taxId: taxId || s.taxId || '',
      commercialReg: cellVal(r, map.commercialReg)||(s.commercialReg||''),
      businessNature: cellVal(r, map.businessNature)||(s.businessNature||''),
      openingBalance: cellVal(r, map.openingBalance)!==''?parseNum(cellVal(r, map.openingBalance)):(s.openingBalance||0),
      openingBalanceDate: excelDateToIso(cellVal(r, map.openingBalanceDate))||(s.openingBalanceDate||''),
      phone: cellVal(r, map.phone)||(s.phone||''),
      email: cellVal(r, map.email)||(s.email||''),
      address: cellVal(r, map.address)||(s.address||''),
      bankAccount: cellVal(r, map.bankAccount)||(s.bankAccount||''),
      iban: cellVal(r, map.iban)||(s.iban||'')
    };
    Object.assign(s, fields);
    if(wasNew) added++; else updated++;
  });
  logAction('استيراد موردين', added+' جديد، '+updated+' محدّث');
  return `تم استيراد الموردين: ${added} جديد، ${updated} مربوط/محدّث (بدون تكرار)`;
}
/** بناء صف فاتورة من صف إكسيل (معاينة — بدون إنشاء مورد) */
function buildInvoiceFieldsFromRow(r, map, autoNoRef){
  let invoiceNo = cellVal(r, map.invoiceNo);
  let supplierName = cellVal(r, map.supplierName);
  const supplierTaxId = cellVal(r, map.supplierTaxId);
  const baseValue = parseNum(cellVal(r, map.baseValue));
  if(!invoiceNo){ invoiceNo = 'مستورد-' + (autoNoRef.n++); }
  if(!supplierName && !supplierTaxId){ supplierName = 'مورد غير معروف'; }
  const matched = findSupplierMatch(supplierName, supplierTaxId);
  const displayName = matched ? matched.name : supplierName;
  const supplierId = matched ? matched.id : null; // يُنشأ لاحقاً عند التطبيق
  let vat = parseNum(cellVal(r, map.vat));
  let stampDuty = parseNum(cellVal(r, map.stampDuty));
  let withheld = parseNum(cellVal(r, map.withheld));
  const discountRate = parseNum(cellVal(r, map.discountRate)) || '';
  // القيمة بالسالب في الاستيراد = مرتجع: نحوّل العلامة إلى isReturn ونخزّن كل القيم موجبة
  let baseValueAbs = baseValue;
  const isReturn = baseValue < 0;
  if(isReturn){
    baseValueAbs = Math.abs(baseValue);
    vat = Math.abs(vat);
    stampDuty = Math.abs(stampDuty);
    withheld = Math.abs(withheld);
  }
  const totalInvoice = baseValueAbs + vat + stampDuty;
  const netInvoice = totalInvoice - withheld;
  const fields = {
    supplierId, invoiceNo, date: excelDateToIso(cellVal(r, map.date)),
    category: cellVal(r, map.category), project: cellVal(r, map.project), description: cellVal(r, map.description),
    internalCode: cellVal(r, map.internalCode),
    supplierItemCode: cellVal(r, map.supplierItemCode),
    itemDescription: cellVal(r, map.itemDescription),
    quantity: cellVal(r, map.quantity),
    baseValue: baseValueAbs, vat, stampDuty, discountRate, withheld, totalInvoice, netInvoice,
    nature: cellVal(r, map.nature), discountType: cellVal(r, map.discountType),
    isReturn,
    _supplierName: supplierName,
    _supplierTaxId: supplierTaxId
  };
  if(fields.internalCode) rememberCodeList('customInternalCodes', fields.internalCode);
  if(fields.supplierItemCode) rememberCodeList('customSupplierItemCodes', fields.supplierItemCode);
  let existing = null;
  if(supplierId){
    existing = DATA.ledger.invoices.find(i =>
      i.supplierId === supplierId &&
      String(i.invoiceNo||'').trim().toLowerCase() === String(invoiceNo||'').trim().toLowerCase() &&
      String(i.date||'').trim() === String(fields.date||'').trim() &&
      !!i.isReturn === !!fields.isReturn
    ) || null;
  }
  return { fields, existing, supplierName: displayName, supplierCreated: !matched };
}

/** معاينة الاستيراد: جديد vs يحتاج تحديث */
function previewInvoicesImport(rows, map){
  invalidateSupplierMaps();
  const autoNoRef = { n: 1 };
  const items = [];
  let suppliersCreated = 0;
  let returnsDetected = 0;
  rows.forEach((r, idx)=>{
    const built = buildInvoiceFieldsFromRow(r, map, autoNoRef);
    if(!built) return;
    if(built.supplierCreated) suppliersCreated++;
    if(built.fields.isReturn) returnsDetected++;
    items.push({
      rowIndex: idx + 1,
      fields: built.fields,
      existing: built.existing,
      supplierName: built.supplierName,
      willUpdate: !!built.existing
    });
  });
  return { items, suppliersCreated, returnsDetected };
}

function openInvoiceImportConfirm(preview){
  const toUpdate = preview.items.filter(x=>x.willUpdate);
  const toAdd = preview.items.filter(x=>!x.willUpdate);
  const overlay = lgEl(`
    <div class="modal-overlay" id="importConfirmOverlay" style="z-index:15000;">
      <div class="modal wide">
        <h3>تأكيد استيراد الفواتير</h3>
        <p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 10px;">
          تم التعرف على <strong>${toAdd.length}</strong> فاتورة جديدة
          و <strong>${toUpdate.length}</strong> فاتورة موجودة مسبقاً (نفس المورد ورقم الفاتورة).
          اختر ماذا تفعل قبل أي تعديل.
          ${preview.returnsDetected?`<br/>تم التعرّف تلقائياً على <strong>${preview.returnsDetected}</strong> فاتورة بقيمة سالبة وتحويلها إلى <strong>مرتجع</strong> (بالقيمة المطلقة).`:''}
        </p>
        ${toUpdate.length?`
        <div class="section-title" style="font-size:14px;">فواتير سيتم تحديثها إن وافقت</div>
        <div class="table-wrap" style="max-height:220px;overflow:auto;margin-bottom:12px;">
          <table>
            <thead><tr><th></th><th>رقم الفاتورة</th><th>المورد</th><th>التاريخ (قديم → جديد)</th><th>الصافي (قديم → جديد)</th></tr></thead>
            <tbody>
              ${toUpdate.map((x,i)=>`
                <tr>
                  <td><input type="checkbox" class="imp-upd-cb" data-idx="${i}" checked /></td>
                  <td>${lgEscapeHtml(x.fields.invoiceNo||'-')}</td>
                  <td>${lgEscapeHtml(x.supplierName||'-')}</td>
                  <td>${lgEscapeHtml(lgFmtDate(x.existing.date)||'-')} → ${lgEscapeHtml(lgFmtDate(x.fields.date)||'-')}</td>
                  <td>${fmt(x.existing.netInvoice)} → ${fmt(x.fields.netInvoice)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`:'<p style="color:var(--ledger-green);font-weight:700;">لا توجد فواتير مكررة للتحديث — كلها جديدة.</p>'}
        <div class="modal-actions" style="flex-wrap:wrap;gap:8px;">
          <button type="button" class="btn btn-outline" id="imp_cancel">إلغاء</button>
          <button type="button" class="btn btn-outline" id="imp_new_only">إضافة الجديد فقط (بدون تحديث)</button>
          ${toUpdate.length?`<button type="button" class="btn btn-primary" id="imp_selected">تحديث المحدد + إضافة الجديد</button>`:''}
          ${toUpdate.length?`<button type="button" class="btn btn-gold" id="imp_all">تحديث الكل + إضافة الجديد</button>`:`<button type="button" class="btn btn-primary" id="imp_all">تأكيد الإضافة</button>`}
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(overlay);
  document.getElementById('imp_cancel').addEventListener('click', ()=>overlay.remove());
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });

  function resolveSupplier(fields){
    if(fields.supplierId) return fields.supplierId;
    const sup = findOrCreateSupplier(fields._supplierName, fields._supplierTaxId);
    if(sup){ delete sup.__justCreated; return sup.id; }
    return null;
  }
  function cleanFields(fields, supplierId){
    const f = Object.assign({}, fields, { supplierId });
    delete f._supplierName;
    delete f._supplierTaxId;
    return f;
  }
  function applyImport(mode){
    invalidateSupplierMaps();
    // mode: 'new_only' | 'selected' | 'all'
    let selectedSet = null;
    if(mode === 'selected'){
      selectedSet = new Set();
      document.querySelectorAll('.imp-upd-cb:checked').forEach(cb=>{
        selectedSet.add(Number(cb.getAttribute('data-idx')));
      });
    }
    let added=0, updated=0, skipped=0, suppliersNew=0;
    toAdd.forEach(x=>{
      const before = DATA.ledger.suppliers.length;
      const sid = resolveSupplier(x.fields);
      if(!sid) return;
      if(DATA.ledger.suppliers.length > before) suppliersNew++;
      const f = cleanFields(x.fields, sid);
      DATA.ledger.invoices.push({ id: lgUid('inv'), ...f });
      added++;
      logAction('استيراد فاتورة جديدة', `${f.invoiceNo||''} — ${x.supplierName||''}`);
    });
    toUpdate.forEach((x,i)=>{
      const doUpdate = mode==='all' || (mode==='selected' && selectedSet && selectedSet.has(i));
      if(!doUpdate){ skipped++; return; }
      const sid = resolveSupplier(x.fields) || x.existing.supplierId;
      const f = cleanFields(x.fields, sid);
      Object.assign(x.existing, f);
      updated++;
      logAction('تحديث فاتورة من الاستيراد', `${f.invoiceNo||''} — ${x.supplierName||''}`);
    });
    saveData(true);
    overlay.remove();
    lgRerenderCurrentPage();
    logAction('استيراد فواتير', added+' جديدة، '+updated+' محدّثة');
    const msg = `الاستيراد: ${added} جديدة، ${updated} محدّثة` + (skipped?`، ${skipped} تم تخطي تحديثها`:'') +
      (suppliersNew?` — موردين جدد: ${suppliersNew}`:'');
    lgShowToast(msg);
  }

  const newOnly = document.getElementById('imp_new_only');
  if(newOnly) newOnly.addEventListener('click', ()=>applyImport('new_only'));
  const selBtn = document.getElementById('imp_selected');
  if(selBtn) selBtn.addEventListener('click', ()=>applyImport('selected'));
  const allBtn = document.getElementById('imp_all');
  if(allBtn) allBtn.addEventListener('click', ()=>applyImport(toUpdate.length?'all':'new_only'));
}

function runPaymentsImport(rows, map){
  let added=0, updated=0;
  rows.forEach(r=>{
    let supplierName = cellVal(r, map.supplierName);
    const supplierTaxId = cellVal(r, map.supplierTaxId);
    if(!supplierName && !supplierTaxId) supplierName = 'مورد غير معروف';
    const sup = findOrCreateSupplier(supplierName, supplierTaxId);
    const amount = parseNum(cellVal(r, map.amount));
    const date = excelDateToIso(cellVal(r, map.date)) || todayIso();
    const method = cellVal(r, map.method) || 'تحويل';
    const invoiceNo = cellVal(r, map.invoiceNo);
    let invoiceId = '';
    if(invoiceNo){
      const inv = DATA.ledger.invoices.find(i=>i.supplierId===sup.id && String(i.invoiceNo||'')===String(invoiceNo));
      if(inv) invoiceId = inv.id;
    }
    const fields = {
      supplierId: sup.id,
      date,
      amount,
      method,
      invoiceId,
      transferRef: cellVal(r, map.transferRef),
      notes: cellVal(r, map.notes),
      extraFields: {}
    };
    // تكرار: نفس المورد + التاريخ + المبلغ + الفاتورة
    const dup = DATA.ledger.payments.find(p=>
      p.supplierId===fields.supplierId &&
      p.date===fields.date &&
      Number(p.amount)===Number(fields.amount) &&
      (p.invoiceId||'')===(fields.invoiceId||'')
    );
    if(dup){ Object.assign(dup, fields); updated++; }
    else { DATA.ledger.payments.push({ id: lgUid('pay'), paymentNo: nextPaymentNo(), ...fields }); added++; }
  });
  return `تم استيراد الدفعات: ${added} جديدة، ${updated} تم تحديثها — لم يتم تجاهل أي صف`;
}
