
/* استيراد إكسيل / CSV مع مطابقة أعمدة الناس بالعربية */
const EI_FIELDS = {
  employees: [
    { key:'name', label:'الاسم *', required:true },
    { key:'position', label:'الوظيفة' },
    { key:'nationalId', label:'الرقم القومي' },
    { key:'idCardExpiry', label:'انتهاء البطاقة' },
    { key:'licenseExpiry', label:'انتهاء الرخصة' },
    { key:'hireDate', label:'تاريخ التعيين' },
    { key:'contractType', label:'نوع العقد' },
    { key:'contractStatus', label:'حالة العقد' },
    { key:'salary', label:'الراتب الأساسي' },
    { key:'insuranceNumber', label:'الرقم التأميني' },
    { key:'phone', label:'رقم التليفون' },
    { key:'address', label:'العنوان' },
    { key:'department', label:'القسم' },
    { key:'status', label:'الحالة' }
  ],
  workers: [
    { key:'name', label:'الاسم *', required:true },
    { key:'position', label:'الوظيفة' },
    { key:'nationalId', label:'الرقم القومي' },
    { key:'idCardExpiry', label:'انتهاء البطاقة' },
    { key:'licenseExpiry', label:'انتهاء الرخصة' },
    { key:'hireDate', label:'تاريخ التعيين' },
    { key:'contractType', label:'نوع العقد' },
    { key:'contractStatus', label:'حالة العقد' },
    { key:'dailyWage', label:'اليومية' },
    { key:'insuranceNumber', label:'الرقم التأميني' },
    { key:'phone', label:'رقم التليفون' },
    { key:'address', label:'العنوان' },
    { key:'department', label:'القسم' },
    { key:'project', label:'المشروع' },
    { key:'status', label:'الحالة' }
  ],
  supervisors: [
    { key:'name', label:'الاسم *', required:true },
    { key:'position', label:'الوظيفة' },
    { key:'nationalId', label:'الرقم القومي' },
    { key:'idCardExpiry', label:'انتهاء البطاقة' },
    { key:'licenseExpiry', label:'انتهاء الرخصة' },
    { key:'hireDate', label:'تاريخ التعيين' },
    { key:'contractType', label:'نوع العقد' },
    { key:'contractStatus', label:'حالة العقد' },
    { key:'dailyWage', label:'اليومية' },
    { key:'insuranceNumber', label:'الرقم التأميني' },
    { key:'phone', label:'رقم التليفون' },
    { key:'address', label:'العنوان' },
    { key:'department', label:'القسم' },
    { key:'project', label:'المشروع' },
    { key:'status', label:'الحالة' }
  ],
  drivers: [
    { key:'name', label:'الاسم *', required:true },
    { key:'position', label:'الوظيفة' },
    { key:'nationalId', label:'الرقم القومي' },
    { key:'idCardExpiry', label:'انتهاء البطاقة' },
    { key:'licenseExpiry', label:'انتهاء الرخصة' },
    { key:'licenseGrade', label:'درجة الرخصة' },
    { key:'hireDate', label:'تاريخ التعيين' },
    { key:'contractType', label:'نوع العقد' },
    { key:'contractStatus', label:'حالة العقد' },
    { key:'dailyWage', label:'اليومية' },
    { key:'insuranceNumber', label:'الرقم التأميني' },
    { key:'phone', label:'رقم التليفون' },
    { key:'address', label:'العنوان' },
    { key:'department', label:'القسم' },
    { key:'project', label:'المشروع' },
    { key:'status', label:'الحالة' }
  ],
  equipment: [
    { key:'name', label:'نوع السيارة *', required:true },
    { key:'vehicleNumber', label:'رقم اللوحة' },
    { key:'color', label:'اللون' },
    { key:'motorNumber', label:'رقم الماتور' },
    { key:'chassisNumber', label:'رقم الشاسيه' },
    { key:'insuranceNumber', label:'الرقم التأميني' },
    { key:'insuranceStatus', label:'حالة التأمين' },
    { key:'model', label:'الموديل' },
    { key:'inspectionDate', label:'تاريخ الفحص' },
    { key:'licenseIssueDate', label:'تاريخ الإصدار' },
    { key:'vehicleLicenseExpiry', label:'انتهاء رخصة السيارة' },
    { key:'licenseCategory', label:'نوع الترخيص' },
    { key:'driverName', label:'اسم السائق' },
    { key:'driverLicenseExpiry', label:'انتهاء رخصة السائق' },
    { key:'department', label:'القسم' },
    { key:'status', label:'الحالة' },
    { key:'ownership', label:'الملكية' }
  ]
  ,
  expenses: [
    { key:'date', label:'التاريخ *', required:true },
    { key:'personName', label:'اسم الشخص / المعدة *', required:true },
    { key:'personKind', label:'الفئة (موظف/مشرف/عامل/سائق/معدة)' },
    { key:'type', label:'نوع المصروف *', required:true },
    { key:'amount', label:'المبلغ *', required:true },
    { key:'section', label:'القسم' },
    { key:'project', label:'المشروع' },
    { key:'notes', label:'البيان' }
  ],
  projects: [
    { key:'name', label:'اسم المشروع *', required:true },
    { key:'code', label:'الكود' },
    { key:'location', label:'الموقع' },
    { key:'status', label:'الحالة' },
    { key:'startDate', label:'تاريخ البداية' },
    { key:'endDate', label:'تاريخ النهاية' },
    { key:'budget', label:'الميزانية' },
    { key:'notes', label:'ملاحظات' }
  ],
  payments: [
    { key:'date', label:'التاريخ *', required:true },
    { key:'personName', label:'اسم الشخص *', required:true },
    { key:'personKind', label:'الفئة (موظف/مشرف/عامل/سائق)' },
    { key:'amount', label:'المبلغ *', required:true },
    { key:'method', label:'طريقة الدفع' },
    { key:'notes', label:'ملاحظات' }
  ],
  attendance: [
    { key:'date', label:'التاريخ *', required:true },
    { key:'personName', label:'اسم الموظف *', required:true },
    { key:'status', label:'الحالة' },
    { key:'checkIn', label:'وقت الحضور' },
    { key:'checkOut', label:'وقت الانصراف' },
    { key:'notes', label:'ملاحظات' }
  ],
  workerAttendance: [
    { key:'date', label:'التاريخ *', required:true },
    { key:'personName', label:'اسم العامل/المشرف/السائق *', required:true },
    { key:'personKind', label:'النوع (عامل/مشرف/سائق/معدة)' },
    { key:'days', label:'عدد الأيام' },
    { key:'status', label:'الحالة' },
    { key:'project', label:'المشروع' },
    { key:'notes', label:'ملاحظات' }
  ],
  leaves: [
    { key:'personName', label:'اسم الموظف *', required:true },
    { key:'type', label:'نوع الإجازة' },
    { key:'from', label:'من تاريخ *', required:true },
    { key:'to', label:'إلى تاريخ *', required:true },
    { key:'status', label:'الحالة' },
    { key:'notes', label:'ملاحظات' }
  ]
};





function sheetToAoa(sheets, name){
  return (sheets && sheets[name]) || [];
}

/** أرقام عربية → إنجليزية */
function arabicDigitsToEn(s){
  return String(s||'').replace(/[٠-٩]/g, d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}
function cleanImportCell(v){
  if(v==null || v===undefined) return '';
  if(typeof v==='number' && Number.isFinite(v)) return v;
  let s = arabicDigitsToEn(String(v)).trim();
  // إزالة مسافات غير مرئية
  s = s.replace(/[\u200e\u200f\u202a-\u202e]/g,'').replace(/\s+/g,' ').trim();
  if(s==='-' || s==='—' || s==='null' || s==='undefined') return '';
  return s;
}
/**
 * تحويل تاريخ من إكسيل بدقة عالية:
 * - رقم تسلسلي لإكسيل
 * - YYYY-MM-DD / DD/MM/YYYY / DD-MM-YYYY / MM/DD/YYYY
 * - نص عربي شائع
 */
function normalizeImportDate(v){
  if(v==null || v==='') return '';
  // رقم تسلسلي لإكسيل (أيام منذ 1899-12-30)
  if(typeof v==='number' && Number.isFinite(v)){
    if(v > 20000 && v < 80000){
      // Excel epoch
      const utc = Date.UTC(1899, 11, 30) + Math.round(v) * 86400000;
      const d = new Date(utc);
      if(!isNaN(d.getTime())){
        return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      }
    }
    // timestamp ms
    if(v > 1e11){
      const d = new Date(v);
      if(!isNaN(d.getTime()))
        return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
  }
  let s = cleanImportCell(v);
  if(!s) return '';
  // لو رقم كنص تسلسلي
  if(/^\d+(\.\d+)?$/.test(s)){
    const n = Number(s);
    if(n > 20000 && n < 80000) return normalizeImportDate(n);
  }
  // ISO أو شبيه
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if(m){
    return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
  }
  // DD/MM/YYYY أو DD-MM-YYYY (الأشهر العربية غالباً يوم/شهر)
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if(m){
    let d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    if(y < 100) y += 2000;
    // لو اليوم > 12 يبقى DD/MM، لو الشهر > 12 يبقى خطأ ونتبادل
    if(mo > 12 && d <= 12){ const t=d; d=mo; mo=t; }
    if(mo>=1 && mo<=12 && d>=1 && d<=31)
      return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  }
  // محاولة Date.parse
  const dt = new Date(s);
  if(!isNaN(dt.getTime()) && dt.getFullYear()>1950 && dt.getFullYear()<2100){
    return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  }
  return '';
}
function normalizePersonName(n){
  return String(n||'').trim().replace(/\s+/g,' ')
    .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
    .toLowerCase();
}
function normalizeNationalId(n){
  return arabicDigitsToEn(String(n||'')).replace(/[^\d]/g,'');
}
/** مطابقة بالرقم القومي أولاً ثم الاسم · وللمعدات برقم اللوحة */
function findExistingPerson(kind, name, nationalId, extra){
  const listKey = { employees:'employees', workers:'workers', supervisors:'supervisors', drivers:'drivers', equipment:'equipment' }[kind];
  const list = (DATA[listKey]||[]);
  const nid = normalizeNationalId(nationalId);
  if(nid && nid.length >= 5){
    const byNid = list.find(p => normalizeNationalId(p.nationalId) === nid);
    if(byNid) return { rec: byNid, by: 'nationalId' };
  }
  if(kind==='equipment' && extra){
    const plate = cleanImportCell(extra.vehicleNumber || extra.plate || '').toLowerCase();
    if(plate){
      const byPlate = list.find(p => cleanImportCell(p.vehicleNumber||p.plate||'').toLowerCase()===plate);
      if(byPlate) return { rec: byPlate, by: 'plate' };
    }
    const chassis = cleanImportCell(extra.chassisNumber||'').toLowerCase();
    if(chassis){
      const byCh = list.find(p => cleanImportCell(p.chassisNumber||'').toLowerCase()===chassis);
      if(byCh) return { rec: byCh, by: 'chassis' };
    }
  }
  const nm = normalizePersonName(name);
  if(nm){
    const byName = list.find(p => normalizePersonName(p.name) === nm || normalizePersonName(p.typeLabel||'') === nm);
    if(byName) return { rec: byName, by: 'name' };
  }
  return null;
}

async function openExcelImportModal(){
  if(!window.desktopApi || !window.desktopApi.importExcel){
    showToast('الاستيراد من إكسيل أو CSV متاح في نسخة سطح المكتب');
    return;
  }
  let res;
  try{ res = await window.desktopApi.importExcel(); }catch(e){ showToast('تعذر فتح الملف'); return; }
  if(!res || res.canceled || !res.ok){ showToast(res&&res.error?res.error:'تم إلغاء الاختيار'); return; }

  const st = {
    fileName: res.fileName||'',
    sheetNames: res.sheetNames||[],
    sheets: res.sheets||{},
    activeSheet: (res.sheetNames&&res.sheetNames[0])||'',
    importType: 'employees',
    mapping: {},
    matchMode: 'ask'
  };

  function headersOf(){
    const aoa = sheetToAoa(st.sheets, st.activeSheet);
    return (aoa[0]||[]).map(h=>String(h||'').trim());
  }
  function autoMap(){
    const headers = headersOf();
    const fields = EI_FIELDS[st.importType]||[];
    const aliases = {
      name:['الاسم','اسم','اسم الموظف','اسم العامل','اسم المشرف','اسم السائق','الاسم بالكامل','الاسم الرباعي','name','full name','fullname','نوع السيارة','نوع المعدة','المعدة','اسم المشروع','المشروع'],
      typeLabel:['نوع السيارة','نوع المعدة','نوع المركبة','الوصف'],
      code:['الكود','كود','كود الموظف','كود العامل','كود المشرف','كود السائق','كود المعدة','رقم الكود','code','id'],
      phone:['الهاتف','تليفون','رقم التليفون','رقم الهاتف','رقم تليفون','موبايل','جوال','phone','mobile','tel','التليفون'],
      position:['الوظيفة','منصب','المهنة','التخصص','position','job','title'],
      nationalId:['الرقم القومي','رقم قومي','الرقم القومى','قومي','national id','nid','id number'],
      idCardExpiry:['انتهاء البطاقة','تاريخ انتهاء البطاقة','انتهاء بطاقة','صلاحية البطاقة','id expiry'],
      licenseExpiry:['انتهاء الرخصة','تاريخ انتهاء الرخصة','انتهاء رخصة','صلاحية الرخصة','license expiry'],
      licenseGrade:['درجة الرخصة','درجة رخصة','درجة الرخصه','license grade','license class'],
      hireDate:['تاريخ التعيين','تاريخ الالتحاق','التعيين','hire date','joining'],
      contractType:['نوع العقد','عقد','contract type'],
      contractStatus:['حالة العقد','contract status'],
      salary:['الراتب','الراتب الأساسي','راتب اساسي','الأجر','salary','basic'],
      dailyWage:['اليومية','أجر اليوم','الاجر اليومي','daily','wage'],
      insuranceNumber:['الرقم التأميني','رقم تأميني','التأمين','insurance'],
      address:['العنوان','محل الإقامة','address'],
      department:['القسم','الإدارة','department','dept'],
      project:['المشروع','اسم المشروع','project'],
      status:['الحالة','status'],
      vehicleNumber:['رقم اللوحة','اللوحة','لوحة','رقم السيارة','plate','plate number'],
      color:['اللون','color'],
      motorNumber:['رقم الماتور','الماتور','رقم المحرك','المحرك','serial','engine'],
      chassisNumber:['رقم الشاسيه','الشاسيه','شاسيه','chassis'],
      model:['الموديل','موديل','model','سنة الصنع'],
      brand:['الماركة','ماركة','brand','make'],
      inspectionDate:['تاريخ الفحص','الفحص','inspection'],
      licenseIssueDate:['تاريخ الإصدار','الإصدار','تاريخ اصدار','issue date'],
      vehicleLicenseExpiry:['انتهاء رخصة السيارة','انتهاء رخصة المركبة','صلاحية رخصة السيارة'],
      licenseCategory:['نوع الترخيص','الترخيص','ملكي','نقل'],
      driverName:['اسم السائق','السائق','driver'],
      driverLicenseExpiry:['انتهاء رخصة السائق','رخصة السائق'],
      location:['الموقع','المكان','location'],
      budget:['الميزانية','budget'],
      startDate:['تاريخ البداية','البداية','start'],
      endDate:['تاريخ النهاية','النهاية','end'],
      notes:['ملاحظات','بيان','notes','remark']
    };
    function scoreHeader(header, keys){
      const h = normalizePersonName(header).replace(/[^\u0600-\u06FFa-z0-9\s]/gi,'');
      if(!h) return 0;
      let best = 0;
      keys.forEach(a=>{
        const al = normalizePersonName(a).replace(/[^\u0600-\u06FFa-z0-9\s]/gi,'');
        if(!al) return;
        if(h===al) best = Math.max(best, 100);
        else if(h.includes(al) || al.includes(h)) best = Math.max(best, 70);
        else {
          // تقاطع كلمات
          const hw = h.split(/\s+/), aw = al.split(/\s+/);
          const inter = hw.filter(w=>aw.includes(w)&&w.length>1);
          if(inter.length) best = Math.max(best, 40+inter.length*10);
        }
      });
      return best;
    }
    st.mapping = {};
    const used = new Set();
    fields.forEach(f=>{
      const keys = aliases[f.key] || [f.label, f.key];
      let bestIdx = -1, bestScore = 0;
      headers.forEach((h,i)=>{
        if(used.has(i)) return;
        const sc = scoreHeader(h, keys.concat([f.label||'']));
        if(sc > bestScore){ bestScore = sc; bestIdx = i; }
      });
      if(bestIdx>=0 && bestScore>=40){
        st.mapping[f.key] = bestIdx;
        used.add(bestIdx);
      } else st.mapping[f.key] = -1;
    });
  }

  function refreshPreview(){
    const box = document.getElementById('ei_preview');
    if(!box) return;
    const aoa = sheetToAoa(st.sheets, st.activeSheet);
    const fields = EI_FIELDS[st.importType]||[];
    const lines = [];
    for(let i=1;i<Math.min(aoa.length, 6);i++){
      const row = aoa[i]||[];
      if(!row.length || row.every(c=>c===''||c==null)) continue;
      const parts = [];
      fields.forEach(f=>{
        const idx = st.mapping[f.key];
        if(idx==null || idx<0) return;
        let val = cleanImportCell(row[idx]);
        if(/date|expir|hire|issue|inspection|start|end/i.test(f.key) || /تاريخ|انتهاء/.test(f.label||''))
          val = normalizeImportDate(val) || val;
        if(val!=='') parts.push(f.label.replace(' *','')+': '+val);
      });
      if(parts.length) lines.push((i)+') '+parts.slice(0,6).join(' · '));
    }
    box.innerHTML = lines.length ? lines.map(l=>'<div style="margin:3px 0;">'+escapeHtml(l)+'</div>').join('') : '<span style="color:var(--ink-soft)">طابق الأعمدة لترى المعاينة</span>';
  }
  function renderMappingUI(){
    const headers = headersOf();
    const fields = EI_FIELDS[st.importType]||[];
    const opts = headers.map((h,i)=>`<option value="${i}">${escapeHtml(h||('عمود '+(i+1)))}</option>`).join('');
    return fields.map(f=>`
      <label>${escapeHtml(f.label)}
        <select class="input ei-map" data-key="${f.key}">
          <option value="-1">— تجاهل —</option>
          ${headers.map((h,i)=>`<option value="${i}" ${Number(st.mapping[f.key])===i?'selected':''}>${escapeHtml(h||('عمود '+(i+1)))}</option>`).join('')}
        </select>
      </label>`).join('');
  }

  function bindMapSelects(){
    document.querySelectorAll('.ei-map').forEach(sel=>{
      if(sel.dataset.boundMap==='1') return;
      sel.dataset.boundMap = '1';
      sel.addEventListener('change', ()=>{
        const k = sel.getAttribute('data-key');
        const raw = sel.value;
        st.mapping[k] = (raw===''||raw==null||raw==='-1'||Number.isNaN(Number(raw))) ? -1 : Number(raw);
        refreshPreview();
      });
    });
  }
  function showUI(){
    openModal(`
      <div class="modal-header"><h3>استيراد من إكسيل</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;color:var(--ink-soft);">الملف: ${escapeHtml(st.fileName)} — طابق الأعمدة يدوياً إن لزم</p>
        <div class="form-grid">
          ${st.sheetNames.length>1?`<label>الشيت<select class="input" id="ei_sheet">${st.sheetNames.map(n=>`<option value="${escapeHtml(n)}" ${n===st.activeSheet?'selected':''}>${escapeHtml(n)}</option>`).join('')}</select></label>`:''}
          <label>نوع البيانات
            <select class="input" id="ei_type">
              <option value="employees" ${st.importType==='employees'?'selected':''}>موظفين</option>
              <option value="workers" ${st.importType==='workers'?'selected':''}>عمال</option>
              <option value="supervisors" ${st.importType==='supervisors'?'selected':''}>مشرفين</option>
              <option value="drivers" ${st.importType==='drivers'?'selected':''}>سائقين</option>
              <option value="equipment" ${st.importType==='equipment'?'selected':''}>معدات ومركبات</option>
              <option value="projects" ${st.importType==='projects'?'selected':''}>مشاريع</option>
            </select>
          </label>
        </div>
        <p style="font-size:12px;color:var(--ink-soft);margin:6px 0 0;">عند وجود اسم أو رقم قومي مطابق سيسألك البرنامج دائماً قبل الإضافة.</p>
        <div class="section-title">تخطيط الأعمدة</div>
        <div class="form-grid" id="ei_maps">${renderMappingUI()}</div>
        <div class="section-title" style="margin-top:12px;">معاينة أول صفوف (بعد التخطيط)</div>
        <div id="ei_preview" style="font-size:12px;max-height:140px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px;"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="ei_run">استيراد</button>
      </div>
    `);
    const sheetSel = document.getElementById('ei_sheet');
    if(sheetSel) sheetSel.addEventListener('change',()=>{
      st.activeSheet=sheetSel.value;
      autoMap();
      const box = document.getElementById('ei_maps');
      if(box){
        // إعادة ربط بدون إعادة فتح المودال (يمنع الوميض)
        document.querySelectorAll('.ei-map').forEach(s=>{ s.dataset.boundMap=''; });
        box.innerHTML = renderMappingUI();
        bindMapSelects();
        refreshPreview();
      } else showUI();
    });
    document.getElementById('ei_type').addEventListener('change',(e)=>{
      st.importType=e.target.value;
      autoMap();
      const box = document.getElementById('ei_maps');
      if(box){
        document.querySelectorAll('.ei-map').forEach(s=>{ s.dataset.boundMap=''; });
        box.innerHTML = renderMappingUI();
        bindMapSelects();
        refreshPreview();
      } else showUI();
    });
    bindMapSelects();
    setTimeout(refreshPreview, 30);
    const runBtn = document.getElementById('ei_run');
    if(runBtn){
      runBtn.onclick = (ev)=>{
        ev.preventDefault();
        try{ runImport(); }catch(err){
          console.error(err);
          showToast('خطأ: '+(err&&err.message?err.message:String(err)));
        }
      };
    }
  }

  function runImport(){
    const ALLOWED_IMPORT = ['employees','workers','supervisors','drivers','equipment','projects'];

    // مزامنة التخطيط من الواجهة قبل الاستيراد (مهم بعد اختيار يدوي)
    document.querySelectorAll('.ei-map').forEach(sel=>{
      sel.addEventListener('change', ()=>{ const k=sel.getAttribute('data-key'); st.mapping[k]=Number(sel.value); if(Number.isNaN(st.mapping[k])) st.mapping[k]=-1; refreshPreview(); });
      const k = sel.getAttribute('data-key');
      if(!k) return;
      const raw = sel.value;
      st.mapping[k] = (raw===''||raw==null||raw==='-1'||Number.isNaN(Number(raw))) ? -1 : Number(raw);
    });
    const typeEl = document.getElementById('ei_type');
    if(typeEl) st.importType = typeEl.value || st.importType;
    if(!ALLOWED_IMPORT.includes(st.importType)){
      showToast('الاستيراد متاح فقط للموظفين والعمال والمشرفين والسائقين ومعدات ومركبات والمشاريع');
      return;
    }
    st.matchMode = 'ask'; // دائماً اسأل عند وجود تطابق
    const sheetEl = document.getElementById('ei_sheet');
    if(sheetEl && sheetEl.value) st.activeSheet = sheetEl.value;

    const needName = !['expenses','payments','attendance','workerAttendance','leaves'].includes(st.importType);
    const nameMapped = (st.mapping.name!=null && st.mapping.name>=0) || (st.mapping.personName!=null && st.mapping.personName>=0);
    if(needName && !nameMapped){
      showToast('حدّد عمود الاسم أولاً في التخطيط');
      return;
    }
    if(!needName && !nameMapped){
      showToast('حدّد عمود اسم الشخص في التخطيط');
      return;
    }

    const aoa = sheetToAoa(st.sheets, st.activeSheet);
    if(!aoa || aoa.length<2){ showToast('لا بيانات في الورقة'); return; }

    const rowsParsed = [];
    for(let i=1;i<aoa.length;i++){
      const row = aoa[i]||[];
      if(!row || !row.length || row.every(c=>c===''||c==null)) continue;
      // get مربوط بالقيم الحالية للتخطيط (نسخة ثابتة لكل صف)
      const mapSnap = Object.assign({}, st.mapping);
      const get = (key)=>{
        const idx = mapSnap[key];
        if(idx==null || idx<0 || Number.isNaN(idx)) return '';
        return cleanImportCell(row[idx]);
      };
      const name = get('name') || get('personName') || get('typeLabel') || get('vehicleNumber') || '';
      const dateVal = get('date') || get('from') || '';
      // للناس والمعدات: الاسم مطلوب · للمصاريف/الدفعات/الحضور: اسم + تاريخ
      const peopleTypes = ['employees','workers','supervisors','drivers','equipment','projects'];
      if(peopleTypes.includes(st.importType)){
        if(!name) continue;
      } else {
        if(!name && !dateVal) continue;
        if(!name) continue;
      }
      const nationalId = get('nationalId');
      let match = null;
      try{
        if(['employees','workers','supervisors','drivers'].includes(st.importType))
          match = findExistingPerson(st.importType, name, nationalId);
        else if(st.importType==='equipment')
          match = findExistingPerson('equipment', name, '', { vehicleNumber: get('vehicleNumber'), chassisNumber: get('chassisNumber') });
        else if(st.importType==='projects'){
          const nm = normalizePersonName(name);
          const found = (DATA.projects||[]).find(p=>normalizePersonName(p.name)===nm || (p.code && String(p.code).trim()===String(get('code')||'').trim()));
          if(found) match = { rec: found, by: 'name' };
        }
      }catch(err){ match = null; }
      rowsParsed.push({ get, name, nationalId, match, rowIndex: i+1, dateVal });
    }
    if(!rowsParsed.length){
      showToast('لا صفوف صالحة — راجع عمود الاسم (أو اسم الشخص) في التخطيط');
      return;
    }

    const matched = rowsParsed.filter(r=>r.match);
    const fresh = rowsParsed.filter(r=>!r.match);

    function applyImport(mode){
      DATA.employees = DATA.employees || [];
      DATA.workers = DATA.workers || [];
      DATA.supervisors = DATA.supervisors || [];
      DATA.drivers = DATA.drivers || [];
      DATA.equipment = DATA.equipment || [];
      DATA.projects = DATA.projects || [];

      let added = 0, updated = 0, skipped = 0;
      try{
      function mapIns(v){
        v = String(v||'').trim();
        if(!v) return 'none';
        if(/غير\s*مؤمن|لا يوجد|none|uninsured/i.test(v)) return 'none';
        if(/مؤم/i.test(v) || /insured/i.test(v)) return 'insured';
        if(/قيد/i.test(v)) return 'pending';
        return 'none';
      }
      function cleanPhone(v){
        v = String(v||'').trim();
        return v.replace(/[^\d+]/g,'');
      }
      function mapDept(name){
        name = String(name||'').trim();
        if(!name) return '';
        return typeof ensureDepartmentSaved==='function' ? ensureDepartmentSaved(name, st.importType==='employees'?'employees':st.importType==='workers'?'workers':st.importType==='supervisors'?'supervisors':st.importType==='drivers'?'drivers':'') : '';
      }
      function hrFromGet(get){
        const idCardExpiry = normalizeImportDate(get('idCardExpiry'));
        const licenseExpiry = normalizeImportDate(get('licenseExpiry'));
        return {
          nationalId: get('nationalId'),
          idCardExpiry,
          idCardStatus: typeof statusFromExpiry==='function'?statusFromExpiry(idCardExpiry):'valid',
          licenseExpiry,
          licenseStatus: typeof statusFromExpiry==='function'?statusFromExpiry(licenseExpiry):'valid',
          licenseGrade: (get('licenseGrade')||'').trim(),
          hireDate: normalizeImportDate(get('hireDate'))||todayISO(),
          contractType: get('contractType')||'',
          insuranceStatus: mapIns(get('insuranceStatus')),
          insuranceNumber: get('insuranceNumber'),
          phone: cleanPhone(get('phone')),
          departmentId: mapDept(get('department')),
          position: get('position'),
          address: get('address')||'',
          contractStatus: get('contractStatus')||'',
          project: get('project')||''
        };
      }
      function buildNew(get, name){
        const hr = hrFromGet(get);
        if(st.importType==='employees'){
          return Object.assign({
            id:uid(), name,
            code:(typeof nextEmployeeCode==='function'?nextEmployeeCode():('EMP-'+String((DATA.employees||[]).length+1).padStart(3,'0'))),
            salary:Number(get('salary'))||0, email:get('email'), status:'active', employmentType:'full',
            leaveBalance:(DATA.settings&&DATA.settings.defaultLeaveDays)||21, attachments:[], notes:''
          }, hr);
        }
        if(st.importType==='workers'){
          return Object.assign({
            id:uid(), name,
            code:(typeof nextWorkerCode==='function'?nextWorkerCode():('WRK-'+String((DATA.workers||[]).length+1).padStart(3,'0'))),
            skill:get('skill')||hr.position||'', dailyWage:Number(get('dailyWage'))||0,
            status:'active', type:'daily', attachments:[], notes:''
          }, hr);
        }
        if(st.importType==='supervisors'){
          return Object.assign({
            id:uid(), name,
            code:(typeof nextSupervisorCode==='function'?nextSupervisorCode():('SUP-'+String((DATA.supervisors||[]).length+1).padStart(3,'0'))),
            dailyWage:Number(get('dailyWage'))||0, status:'active', attachments:[], notes:'',
            skill: hr.position||''
          }, hr);
        }
        if(st.importType==='drivers'){
          return Object.assign({
            id:uid(), name,
            code:(typeof nextDriverCode==='function'?nextDriverCode():('DRV-'+String((DATA.drivers||[]).length+1).padStart(3,'0'))),
            dailyWage:Number(get('dailyWage'))||0, status:'active', attachments:[], notes:''
          }, hr);
        }
        if(st.importType==='projects'){
          return {
            id: uid(), name,
            code: get('code')||'', location: get('location')||'',
            status: get('status')||'active',
            startDate: normalizeImportDate(get('startDate'))||'',
            endDate: normalizeImportDate(get('endDate'))||'',
            budget: toInt(get('budget')), notes: get('notes')||''
          };
        }
        // معدات ومركبات
        const vExp = normalizeImportDate(get('vehicleLicenseExpiry'));
        const dExp = normalizeImportDate(get('driverLicenseExpiry'));
        const code = (typeof nextEquipmentCode==='function'?nextEquipmentCode():('EQ-'+String(((DATA.equipment||[]).length)+1).padStart(3,'0')));
        return {
          id: uid(),
          name: name,
          code: code,
          typeLabel: name,
          type: 'other',
          status: 'working',
          vehicleNumber: get('vehicleNumber')||get('plate')||'',
          plate: get('vehicleNumber')||get('plate')||'',
          color: get('color')||'',
          motorNumber: get('motorNumber')||get('serial')||'',
          serial: get('motorNumber')||get('serial')||'',
          chassisNumber: get('chassisNumber')||'',
          insuranceNumber: (get('insuranceNumber')||'').trim(),
          insuranceStatus: mapIns(get('insuranceStatus')),
          model: get('model')||'',
          brand: get('brand')||'',
          inspectionDate: normalizeImportDate(get('inspectionDate'))||'',
          licenseIssueDate: normalizeImportDate(get('licenseIssueDate'))||'',
          vehicleLicenseExpiry: vExp||'',
          vehicleLicenseStatus: (vExp && typeof statusFromExpiry==='function') ? statusFromExpiry(vExp) : '',
          licenseCategory: get('licenseCategory')||'',
          ownership: get('licenseCategory')||'',
          driverName: get('driverName')||'',
          driverLicenseExpiry: dExp||'',
          driverLicenseStatus: (dExp && typeof statusFromExpiry==='function') ? statusFromExpiry(dExp) : '',
          project: get('project')||'',
          notes: get('notes')||'',
          categoryId: '',
          departmentId: '',
          attachments: [],
          dailyCost: 0,
          hourlyCost: 0
        };
      }
      function mergeUpdate(existing, get, name){
        const hr = hrFromGet(get);
        // لا تمس الكود والمرفقات والمعرّف
        const patch = Object.assign({}, hr, { name: name || existing.name });
        if(st.importType==='employees'){
          if(get('salary')!=='') patch.salary = Number(get('salary'))||existing.salary||0;
          if(get('email')) patch.email = get('email');
        }
        if(st.importType==='workers' || st.importType==='supervisors' || st.importType==='drivers'){
          if(get('dailyWage')!=='') patch.dailyWage = Number(get('dailyWage'))||existing.dailyWage||0;
          if(get('skill')) patch.skill = get('skill');
          if(get('project')) patch.project = get('project');
        }
        if(st.importType==='projects'){
          if(get('code')) patch.code = get('code');
          if(get('location')) patch.location = get('location');
          if(get('status')) patch.status = get('status');
          if(get('budget')!=='') patch.budget = toInt(get('budget'));
          if(get('startDate')) patch.startDate = normalizeImportDate(get('startDate'));
          if(get('endDate')) patch.endDate = normalizeImportDate(get('endDate'));
          if(get('notes')) patch.notes = get('notes');
        }
        if(st.importType==='equipment'){
          if(get('brand')) patch.brand = get('brand');
          if(get('model')) patch.model = get('model');
          if(get('vehicleNumber')){ patch.vehicleNumber = get('vehicleNumber'); patch.plate = get('vehicleNumber'); }
          if(get('motorNumber')){ patch.motorNumber = get('motorNumber'); patch.serial = get('motorNumber'); }
          if(get('chassisNumber')) patch.chassisNumber = get('chassisNumber');
          if(get('insuranceNumber')) patch.insuranceNumber = get('insuranceNumber');
          if(get('insuranceStatus')) patch.insuranceStatus = mapIns(get('insuranceStatus'));
          if(get('color')) patch.color = get('color');
          if(get('driverName')) patch.driverName = get('driverName');
          if(get('licenseCategory')) patch.licenseCategory = get('licenseCategory');
          if(get('project')) patch.project = get('project');
          if(get('inspectionDate')) patch.inspectionDate = normalizeImportDate(get('inspectionDate'));
          if(get('licenseIssueDate')) patch.licenseIssueDate = normalizeImportDate(get('licenseIssueDate'));
          if(get('vehicleLicenseExpiry')){
            patch.vehicleLicenseExpiry = normalizeImportDate(get('vehicleLicenseExpiry'));
            if(typeof statusFromExpiry==='function') patch.vehicleLicenseStatus = statusFromExpiry(patch.vehicleLicenseExpiry);
          }
          if(get('driverLicenseExpiry')){
            patch.driverLicenseExpiry = normalizeImportDate(get('driverLicenseExpiry'));
            if(typeof statusFromExpiry==='function') patch.driverLicenseStatus = statusFromExpiry(patch.driverLicenseExpiry);
          }
          patch.typeLabel = name || existing.typeLabel || existing.name;
        }
        // تجاهل الحقول الفارغة حتى لا تمسح بيانات موجودة
        Object.keys(patch).forEach(k=>{
          if(patch[k]==='' || patch[k]==null) delete patch[k];
        });
        Object.assign(existing, patch);
        if(typeof syncDocStatusesFromDates==='function') syncDocStatusesFromDates(existing);
      }
      const listKey = { employees:'employees', workers:'workers', supervisors:'supervisors', drivers:'drivers', equipment:'equipment', projects:'projects' }[st.importType];

      function resolvePersonId(kind, personName){
        const nm = normalizePersonName(personName);
        if(!nm) return '';
        const lists = {
          employee: DATA.employees, worker: DATA.workers, supervisor: DATA.supervisors,
          driver: DATA.drivers, equipment: DATA.equipment
        };
        const arr = lists[kind] || [];
        const found = arr.find(p => normalizePersonName(p.name)===nm || normalizePersonName(p.code)===nm);
        return found ? found.id : '';
      }
      function mapPersonKind(v){
        v = String(v||'').trim();
        if(/موظف|employee/i.test(v)) return 'employee';
        if(/مشرف|supervisor/i.test(v)) return 'supervisor';
        if(/سائق|driver/i.test(v)) return 'driver';
        if(/معدة|معدة|equipment|مركبة/i.test(v)) return 'equipment';
        if(/عامل|worker/i.test(v)) return 'worker';
        return 'worker';
      }
      function buildExtra(r){
        const get = r.get;
        if(st.importType==='projects'){
          return {
            id: uid(), name: r.name,
            code: get('code')||'', location: get('location')||'',
            status: get('status')||'active',
            startDate: normalizeImportDate(get('startDate'))||'',
            endDate: normalizeImportDate(get('endDate'))||'',
            budget: toInt(get('budget')), notes: get('notes')||''
          };
        }
        if(st.importType==='expenses'){
          const pk = mapPersonKind(get('personKind'));
          const pid = resolvePersonId(pk, r.name);
          return {
            id: uid(), personKind: pk, personId: pid,
            date: normalizeImportDate(get('date'))||todayISO(),
            type: get('type')||'مصروف', amount: toInt(get('amount')),
            section: get('section')||'', project: get('project')||'', notes: get('notes')||''
          };
        }
        if(st.importType==='payments'){
          const pk = mapPersonKind(get('personKind')||'worker');
          const pid = resolvePersonId(pk, r.name);
          return {
            id: uid(), personKind: pk, personId: pid, employeeId: pk==='employee'?pid:'',
            workerId: pk==='worker'?pid:'', supervisorId: pk==='supervisor'?pid:'', driverId: pk==='driver'?pid:'',
            date: normalizeImportDate(get('date'))||todayISO(),
            amount: toInt(get('amount')), method: get('method')||'cash', notes: get('notes')||''
          };
        }
        if(st.importType==='attendance'){
          const pid = resolvePersonId('employee', r.name);
          return {
            id: uid(), employeeId: pid,
            date: normalizeImportDate(get('date'))||todayISO(),
            status: get('status')||'present',
            checkIn: get('checkIn')||'', checkOut: get('checkOut')||'', notes: get('notes')||''
          };
        }
        if(st.importType==='workerAttendance'){
          const pk = mapPersonKind(get('personKind')||'worker');
          const pid = resolvePersonId(pk, r.name);
          return {
            id: uid(), personKind: pk, personType: pk, personId: pid,
            workerId: pk==='worker'?pid: '', supervisorId: pk==='supervisor'?pid:'',
            driverId: pk==='driver'?pid:'', equipmentId: pk==='equipment'?pid:'',
            date: normalizeImportDate(get('date'))||todayISO(),
            days: Number(get('days'))||1, status: get('status')||'present',
            project: get('project')||'', notes: get('notes')||''
          };
        }
        if(st.importType==='leaves'){
          const pid = resolvePersonId('employee', r.name);
          return {
            id: uid(), employeeId: pid,
            type: get('type')||'annual',
            from: normalizeImportDate(get('from'))||'', to: normalizeImportDate(get('to'))||'',
            days: Number(get('days')) || (typeof calcLeaveDays==='function' ? calcLeaveDays(normalizeImportDate(get('from'))||'', normalizeImportDate(get('to'))||'') : 1),
            status: get('status')||'approved', notes: get('notes')||''
          };
        }
        return buildNew(r.get, r.name);
      }
      const extraListKey = {
        employees:'employees', workers:'workers', supervisors:'supervisors', drivers:'drivers',
        equipment:'equipment', projects:'projects', expenses:'expenses', payments:'payments',
        attendance:'attendance', workerAttendance:'workerAttendance', leaves:'leaves'
      }[st.importType];
      const targetKey = extraListKey || listKey;
      // مفاتيح بديلة في DATA
      if(st.importType==='payments'){
        // الدفعات قد تكون في workerPayments أو payments
      }
      rowsParsed.forEach(r=>{
        try{
          if(r.match && ['employees','workers','supervisors','drivers','equipment','projects'].includes(st.importType)){
            if(mode==='update'){
              mergeUpdate(r.match.rec, r.get, r.name);
              updated++;
            } else if(mode==='add_new'){
              (DATA[targetKey]=DATA[targetKey]||[]).push(buildExtra(r));
              added++;
            } else if(mode==='skip_matched'){
              skipped++;
            }
          } else {
            const rec = buildExtra(r);
            if(st.importType==='payments'){
              DATA.workerPayments = DATA.workerPayments || [];
              DATA.workerPayments.push(rec);
              DATA.payments = DATA.payments || [];
              DATA.payments.push(rec);
            } else if(st.importType==='workerAttendance'){
              DATA.workerAttendance = DATA.workerAttendance || [];
              DATA.workerAttendance.push(rec);
            } else {
              if(!DATA[targetKey]) DATA[targetKey] = [];
              DATA[targetKey].push(rec);
            }
            // مزامنة مصاريف المشرفين
            if(st.importType==='expenses' && rec.personKind==='supervisor'){
              DATA.supervisorExpenses = DATA.supervisorExpenses || [];
              DATA.supervisorExpenses.push({
                id: rec.id, supervisorId: rec.personId, date: rec.date,
                type: rec.type, amount: rec.amount, project: rec.project, notes: rec.notes
              });
            }
            added++;
          }
        }catch(rowErr){
          console.error('import row', r.rowIndex, rowErr);
        }
      });

      }catch(err){
        console.error(err);
        showToast('خطأ أثناء الاستيراد: '+(err&&err.message?err.message:String(err)));
        return;
      }
      closeModal();
      if(added || updated){
        addAudit('استيراد إكسيل', st.importType+' — إضافة '+added+' · تحديث '+updated+(skipped?' · تخطي '+skipped:''));
        if(typeof rebuildIndexes==='function') try{ rebuildIndexes(); }catch(_e){}
        saveData(true);
        // مسح فلاتر الصفحة المستهدفة حتى تظهر السجلات الجديدة
        try{
          if(st.importType==='equipment' && typeof equipmentFilters==='object'){
            equipmentFilters.q=''; equipmentFilters.status=''; equipmentFilters.ownership='';
            equipmentFilters.project=''; equipmentFilters.categoryId=''; equipmentFilters.departmentId='';
            equipmentFilters.detailId=''; equipmentFilters.dailyView=false;
          }
          if(st.importType==='workers' && typeof workerFilters==='object'){ workerFilters.q=''; workerFilters.categoryId=''; workerFilters.departmentId=''; }
          if(st.importType==='employees' && typeof employeeFilters==='object'){ employeeFilters.q=''; employeeFilters.departmentId=''; }
          if(st.importType==='supervisors' && typeof supervisorFilters==='object'){ supervisorFilters.q=''; supervisorFilters.departmentId=''; }
          if(st.importType==='drivers' && typeof driverFilters==='object'){ driverFilters.q=''; driverFilters.departmentId=''; }
        }catch(_e){}
        showToast('إضافة: '+added+(updated?' · تحديث: '+updated:'')+(skipped?' · تخطي: '+skipped:''));
        // الانتقال لصفحة النوع المستورد
        const pageMap = { employees:'employees', workers:'workers', supervisors:'supervisors', drivers:'drivers', equipment:'equipment', projects:'projects' };
        const go = pageMap[st.importType];
        if(go){
          currentPage = go;
          if(typeof render==='function') render();
          else if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
        } else if(typeof rerenderCurrentPage==='function') rerenderCurrentPage();
      } else {
        showToast(skipped ? ('تم تخطي '+skipped+' سجل مطابق — لا جديد') : 'لم يُستورد شيء — تأكد من عمود الاسم والتخطيط');
      }
    }

    let mode = st.matchMode || 'ask';
    if(mode==='ask'){
      if(!matched.length){
        applyImport('add_new'); // لا تطابق
        return;
      }
      // نافذة قرار
      const sample = matched.slice(0,8).map(r=>{
        const by = r.match.by==='nationalId'?'رقم قومي':'اسم';
        return `<tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.nationalId||'—')}</td>
          <td>${escapeHtml(r.match.rec.code||'')}</td>
          <td>${escapeHtml(by)}</td>
        </tr>`;
      }).join('');
      openModal(`
        <div class="modal-header"><h3>تطابق عند الاستيراد</h3><button class="modal-close" onclick="closeModal()">×</button></div>
        <div class="modal-body">
          <p style="margin:0 0 10px;line-height:1.6;">
            <strong>${matched.length}</strong> سجل موجود مسبقاً (بالاسم أو الرقم القومي)<br>
            <strong>${fresh.length}</strong> سجل جديد تماماً
          </p>
          <div class="table-wrap" style="max-height:220px;overflow:auto;margin-bottom:12px;">
            <table class="data-table">
              <thead><tr><th>الاسم في الملف</th><th>الرقم القومي</th><th>كود موجود</th><th>نوع التطابق</th></tr></thead>
              <tbody>${sample}${matched.length>8?`<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);">… و ${matched.length-8} آخرين</td></tr>`:''}</tbody>
            </table>
          </div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin:0;">اختر ماذا تفعل بالمطابقين (الجدد يُضافون دائماً):</p>
        </div>
        <div class="modal-footer" style="flex-wrap:wrap;gap:8px;">
          <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
          <button class="btn btn-primary" id="ei_do_update">حدّث الموجود</button>
          <button class="btn btn-outline" id="ei_do_add">أضف الكل كجديد</button>
          <button class="btn btn-outline" id="ei_do_skip">تخطَّ المطابقين</button>
        </div>
      `);
      document.getElementById('ei_do_update')?.addEventListener('click', ()=> applyImport('update'));
      document.getElementById('ei_do_add')?.addEventListener('click', ()=> applyImport('add_new'));
      document.getElementById('ei_do_skip')?.addEventListener('click', ()=> applyImport('skip_matched'));
      return;
    }
    applyImport(mode);
  }

  showUI();
}
