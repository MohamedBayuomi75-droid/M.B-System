/* =========================================================
   project-workflow.js — مسار المشروع (منطق فقط، بدون واجهة)
   ---------------------------------------------------------
   المرحلة 3 + 4 من خطة دمج العملاء.
   - تعريف المسار (مراحل + خطوات) محفوظ في DATA.clients.settings.projectWorkflow (null = الافتراضي).
   - حالة المسار محفوظة على المشروع الموحّد نفسه (DATA.projects[]):
       stageKey / stepKey        الموضع الحالي
       stepMeta[stepKey]         { status, startDate, endDate, dueDate, responsible, notes, skipReason, rejectReason, ... }
       completedSteps[]          الخطوات المكتملة (متوافق مع البرنامج الأصلي)
       stepFiles[stepKey]        مرفقات الخطوة
       tenderStance / rejectReason   موقف المناقصة (accepted | rejected)
       pathHistory[]             سجل تاريخي لكل تغيير
       workflowSnapshot          نسخة المسار وقت إنشاء المشروع (التعديل لاحقًا على المسار لا يغيّر المشاريع القائمة)
   - الحقل status (نص المرحلة) يفضل متزامن مع المرحلة الحالية لأن HR والتقارير بتعتمد عليه.
   ========================================================= */

const PW_STATUS = {
  pending:     { label: 'لم تبدأ',      badge: 'badge-muted' },
  in_progress: { label: 'قيد التنفيذ',  badge: 'badge-info' },
  done:        { label: 'مكتملة',       badge: 'badge-ok' },
  late:        { label: 'متأخرة',       badge: 'badge-danger' },
  rejected:    { label: 'مرفوضة',       badge: 'badge-danger' },
  skipped:     { label: 'تم تخطيها',    badge: 'badge-warn' }
};

const PW_DEFAULT_WORKFLOW = [
  { id: 1, key: 'study', label: 'الدراسة والتخطيط', short: 'دراسة', steps: [
    { key: 'survey_works', label: 'حصر الأعمال' },
    { key: 'boq', label: 'المقايسة' },
    { key: 'buy_tender_book', label: 'شراء كراسة الشروط' } ] },
  { id: 2, key: 'docs', label: 'تجهيز المستندات', short: 'مستندات', steps: [
    { key: 'initial_insurance', label: 'التأمين الابتدائي' },
    { key: 'tech_envelopes', label: 'تجهيز المظاريف الفنية' },
    { key: 'fin_envelopes', label: 'تجهيز المظاريف المالية' } ] },
  { id: 3, key: 'tender', label: 'المناقصة وترسية المشروع', short: 'مناقصة', exclusive: true, steps: [
    { key: 'tech_committee', label: 'تقديم اللجنة الفنية' },
    { key: 'fin_committee', label: 'تقديم اللجنة المالية' },
    { key: 'project_stance', label: 'موقف المشروع (قبول / رفض)', stance: true } ] },
  { id: 4, key: 'contracting', label: 'التعاقد', short: 'تعاقد', steps: [
    { key: 'guarantee_letter', label: 'إصدار خطاب ضمان' },
    { key: 'insurance_policy', label: 'إصدار بلايص التأمين' },
    { key: 'refund_initial', label: 'رد التأمين الابتدائي' },
    { key: 'site_handover', label: 'استلام موقع' },
    { key: 'car_check', label: 'إصدار شيك السيارات' },
    { key: 'attach_a_contract', label: 'مرفق أ والعقد' } ] },
  { id: 5, key: 'execution', label: 'التنفيذ والمتابعة', short: 'تنفيذ', steps: [
    { key: 'works_exec', label: 'تنفيذ الأعمال' },
    { key: 'inspect_match', label: 'فحص ومطابقة الأعمال' } ] },
  { id: 6, key: 'invoices', label: 'المستخلصات', short: 'مستخلصات', steps: [
    { key: 'prep_survey_book', label: 'تجهيز دفتر الحصر' },
    { key: 'prep_invoice', label: 'تجهيز المستخلص' },
    { key: 'lab_results', label: 'نتائج الاختبارات المعملية' },
    { key: 'deliver_invoice', label: 'تسليم المستخلص' } ] },
  { id: 7, key: 'fin_review', label: 'المراجعة المالية', short: 'مراجعة', steps: [
    { key: 'labor_cert', label: 'استخراج شهادة القوى العاملة' },
    { key: 'insurance_cert', label: 'استخراج شهادة التأمينات' },
    { key: 'form41', label: 'تجهيز نموذج 41 والإقرارات' } ] },
  { id: 8, key: 'prelim_delivery', label: 'التسليم الابتدائي', short: 'تسليم ابتدائي', steps: [
    { key: 'tech_inspect', label: 'المعاينة الفنية' },
    { key: 'prelim_hand', label: 'تسليم المشروع الابتدائي' } ] },
  { id: 9, key: 'central', label: 'الإدارة المركزية للحسابات', short: 'حسابات مركزية', steps: [
    { key: 'e_invoice', label: 'إصدار الفاتورة الإلكترونية' },
    { key: 'review_invoice', label: 'مراجعة المستخلص' },
    { key: 'pay_inv', label: 'تم صرف المستخلص' },
    { key: 'deductions', label: 'الاستقطاعات' } ] },
  { id: 10, key: 'closure', label: 'الإغلاق والتسليم النهائي', short: 'إغلاق', steps: [
    { key: 'maintenance', label: 'فترة الصيانة (إن وُجدت)', optional: true },
    { key: 'final_hand', label: 'التسليم النهائي' },
    { key: 'release_guarantees', label: 'صرف خطابات الضمان والاحتجازات' } ] }
];

/** مرادفات أسماء المراحل/الحالات القديمة (من HR ومن البرنامج الأصلي) → مفتاح مرحلة */
const PW_STATUS_ALIASES = {
  'التسليم النهائي': { stage: 'closure', step: 'final_hand' },
  'معاينة': { stage: 'study', step: 'survey_works' }, 'تخطيط': { stage: 'study', step: 'survey_works' },
  'جديدة': { stage: 'study', step: 'survey_works' }, 'حصر': { stage: 'study', step: 'survey_works' },
  'عرض سعر': { stage: 'tender', step: 'project_stance' }, 'تفاوض': { stage: 'tender', step: 'project_stance' },
  'تعاقد': { stage: 'contracting', step: 'guarantee_letter' }, 'ساري': { stage: 'contracting', step: 'guarantee_letter' },
  'شهادة قوى عاملة': { stage: 'fin_review', step: 'labor_cert' },
  'جاري التنفيذ': { stage: 'execution', step: 'works_exec' }, 'تنفيذ': { stage: 'execution', step: 'works_exec' },
  'مستخلصات': { stage: 'invoices', step: 'prep_invoice' },
  'تسليم جزئي': { stage: 'central', step: 'pay_inv' },
  'استلام ابتدائي': { stage: 'prelim_delivery', step: 'prelim_hand' },
  'استلام نهائي': { stage: 'closure', step: 'final_hand' },
  'مغلق': { stage: 'closure', step: 'release_guarantees' }, 'منتهي': { stage: 'closure', step: 'release_guarantees' },
  'running_inv': { stage: 'invoices', step: 'prep_survey_book' }
};

const PW_TERMINAL = ['مكتمل', 'متوقف', 'ملغي'];

function pwToday(){
  if(typeof todayISO === 'function') return todayISO();
  const d = new Date(), p = function(n){ return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* ---------------- تعريف المسار ---------------- */

function pwCloneWorkflow(wf){
  return JSON.parse(JSON.stringify(wf || []));
}

function pwNormalizeWorkflow(raw){
  if(!Array.isArray(raw) || !raw.length) return pwCloneWorkflow(PW_DEFAULT_WORKFLOW);
  const usedStage = {};
  const out = [];
  raw.forEach(function(s, i){
    if(!s || !s.key || usedStage[s.key]) return;
    usedStage[s.key] = true;
    const usedStep = {};
    const steps = (Array.isArray(s.steps) ? s.steps : []).filter(function(st){
      if(!st || !st.key || !String(st.label || '').trim() || usedStep[st.key]) return false;
      usedStep[st.key] = true; return true;
    }).map(function(st){
      return {
        key: String(st.key), label: String(st.label).trim(),
        optional: !!st.optional, stance: !!st.stance,
        needsDate: st.needsDate !== false, needsAttach: !!st.needsAttach, needsReason: !!st.needsReason,
        dueDays: st.dueDays > 0 ? Number(st.dueDays) : 0
      };
    });
    if(!steps.length) return;
    out.push({
      id: s.id != null ? s.id : (i + 1), key: String(s.key),
      label: String(s.label || s.key).trim() || String(s.key),
      short: String(s.short || '').trim(),
      exclusive: !!s.exclusive,
      gate: s.gate === 'none' ? 'none' : 'required',    // required = لازم كل الخطوات الإلزامية تكتمل/تتخطى (بسبب) قبل المرحلة التالية
      steps: steps
    });
  });
  return out.length ? out : pwCloneWorkflow(PW_DEFAULT_WORKFLOW);
}

/** المسار الحالي المعتمد من الإعدادات */
function pwSettingsWorkflow(){
  let raw = null;
  try{ raw = clSettings().projectWorkflow; }catch(_e){}
  return pwNormalizeWorkflow(raw);
}

/** مسار مشروع بعينه: النسخة المحفوظة على المشروع لو موجودة، وإلا مسار الإعدادات الحالي */
function pwWorkflowOf(p){
  if(p && p.workflowSnapshot && Array.isArray(p.workflowSnapshot.stages) && p.workflowSnapshot.stages.length){
    return pwNormalizeWorkflow(p.workflowSnapshot.stages);
  }
  return pwSettingsWorkflow();
}

/** يثبّت نسخة المسار الحالية على المشروع (لو مش متثبتة) */
function pwFreezeWorkflow(p){
  if(!p) return;
  if(!p.workflowSnapshot || !Array.isArray(p.workflowSnapshot.stages)){
    p.workflowSnapshot = { at: new Date().toISOString(), stages: pwSettingsWorkflow() };
  }
}

/** يزامن قائمة المراحل في صفحة المشاريع (PROJECT_STAGES) مع المسار + الحالات الخاصة */
function pwApplyStagesToProjectList(){
  if(typeof PROJECT_STAGES === 'undefined' || !Array.isArray(PROJECT_STAGES)) return;
  const wf = pwSettingsWorkflow();
  PROJECT_STAGES.length = 0;
  wf.forEach(function(s){ PROJECT_STAGES.push({ value: s.label, short: s.short || s.label }); });
  PROJECT_STAGES.push({ value: 'مكتمل', short: 'مكتمل' }, { value: 'متوقف', short: 'متوقف' }, { value: 'ملغي', short: 'ملغي' });
}

/** اسم أول مرحلة في المسار المعتمد (الحالة الافتراضية للمشروع الجديد) */
function pwFirstStageLabel(){
  return pwSettingsWorkflow()[0].label;
}

/** اسم المرحلة المعتمد (يحوّل المرادفات القديمة مثل «التسليم النهائي») */
function pwCanonicalStatus(s){
  s = String(s || '').trim();
  if(!s) return s;
  const wf = pwSettingsWorkflow();
  if(wf.some(function(x){ return x.label === s; }) || PW_TERMINAL.indexOf(s) >= 0) return s;
  const byKey = wf.find(function(x){ return x.key === s; });
  if(byKey) return byKey.label;
  const al = PW_STATUS_ALIASES[s];
  if(al){ const st = wf.find(function(x){ return x.key === al.stage; }); if(st) return st.label; }
  return s;
}

/* ---------------- موضع المشروع على المسار ---------------- */

function pwFindStep(wf, stepKey){
  for(let si = 0; si < wf.length; si++){
    const ti = wf[si].steps.findIndex(function(x){ return x.key === stepKey; });
    if(ti >= 0) return { si: si, ti: ti, stage: wf[si], step: wf[si].steps[ti] };
  }
  return null;
}

function pwFlatSteps(wf){
  const out = [];
  wf.forEach(function(st, si){ st.steps.forEach(function(sp, ti){ out.push({ si: si, ti: ti, stage: st, step: sp }); }); });
  return out;
}

/** الموضع الحالي (مرحلة + خطوة) — يستنتج من stageKey/stepKey أو من status القديم */
function pwCurrent(p){
  const wf = pwWorkflowOf(p);
  let stageKey = p && p.stageKey || '', stepKey = p && p.stepKey || '';
  if(!stageKey && p && p.status){
    const s = String(p.status).trim();
    const byLabel = wf.find(function(x){ return x.label === s || x.key === s; });
    if(byLabel) stageKey = byLabel.key;
    else if(PW_STATUS_ALIASES[s]){ stageKey = PW_STATUS_ALIASES[s].stage; stepKey = stepKey || PW_STATUS_ALIASES[s].step; }
    else if(s === 'active') stageKey = 'execution';
    else if(s === 'completed' || s === 'مكتمل') stageKey = wf[wf.length - 1].key;
  }
  let stage = wf.find(function(x){ return x.key === stageKey; }) || wf[0];
  if(!stepKey || !stage.steps.some(function(x){ return x.key === stepKey; })) stepKey = stage.steps[0].key;
  const si = wf.indexOf(stage);
  const ti = stage.steps.findIndex(function(x){ return x.key === stepKey; });
  return { wf: wf, stage: stage, step: stage.steps[ti], si: si, ti: ti, stageKey: stage.key, stepKey: stepKey };
}

function pwMeta(p, stepKey){
  return (p && p.stepMeta && p.stepMeta[stepKey]) || {};
}

function pwFiles(p, stepKey){
  return (p && p.stepFiles && Array.isArray(p.stepFiles[stepKey])) ? p.stepFiles[stepKey] : [];
}

/** الحالة المشتقة للخطوة (لم تبدأ / قيد التنفيذ / مكتملة / متأخرة / مرفوضة / تم تخطيها) */
function pwStepStatus(p, stepKey){
  const m = pwMeta(p, stepKey);
  if(m.status === 'rejected') return 'rejected';
  if(m.status === 'skipped' || (m.skipped && !m.status)) return 'skipped';
  if(m.status === 'done' || (!m.status && Array.isArray(p.completedSteps) && p.completedSteps.indexOf(stepKey) >= 0)) return 'done';
  const cur = pwCurrent(p);
  const isCur = cur.stepKey === stepKey;
  const started = m.status === 'in_progress' || isCur;
  const due = m.dueDate || '';
  if(due && due < pwToday()) return 'late';
  return started ? 'in_progress' : 'pending';
}

function pwStageStatus(p, stage){
  const sts = stage.steps.map(function(s){ return pwStepStatus(p, s.key); });
  if(sts.some(function(x){ return x === 'rejected'; })) return 'rejected';
  if(sts.every(function(x){ return x === 'done' || x === 'skipped'; })) return sts.every(function(x){ return x === 'skipped'; }) ? 'skipped' : 'done';
  if(sts.some(function(x){ return x === 'late'; })) return 'late';
  const cur = pwCurrent(p);
  if(cur.stage.key === stage.key) return 'in_progress';
  if(sts.some(function(x){ return x === 'done' || x === 'skipped' || x === 'in_progress'; })) return 'in_progress';
  return 'pending';
}

/** نسبة تقدّم المسار (٪) */
function pwProgress(p){
  const wf = pwWorkflowOf(p);
  let total = 0, got = 0;
  wf.forEach(function(st){
    st.steps.forEach(function(sp){
      total++;
      const s = pwStepStatus(p, sp.key);
      if(s === 'done') got += 1;
      else if(s === 'skipped') got += 1;
      else if(s === 'in_progress' || s === 'late') got += 0.5 * (sp.key === pwCurrent(p).stepKey ? 1 : 0);
    });
  });
  return total ? Math.round((got / total) * 100) : 0;
}

/** عدد الخطوات المتأخرة (للوحة المتابعة والتنبيهات) */
function pwLateSteps(p){
  const out = [];
  pwWorkflowOf(p).forEach(function(st){ st.steps.forEach(function(sp){
    if(pwStepStatus(p, sp.key) === 'late') out.push({ stage: st, step: sp, meta: pwMeta(p, sp.key) });
  }); });
  return out;
}

/* ---------------- تسجيل التاريخ ---------------- */

function pwUserName(){
  try{ if(typeof currentUser !== 'undefined' && currentUser) return currentUser.name || currentUser.username || ''; }catch(_e){}
  try{ const s = (typeof getLocalSession === 'function') ? getLocalSession() : null; if(s) return s.name || s.username || ''; }catch(_e){}
  return '';
}

function pwLog(p, action, stepKey, extra){
  if(!p) return;
  if(!Array.isArray(p.pathHistory)) p.pathHistory = [];
  const wf = pwWorkflowOf(p);
  const f = stepKey ? pwFindStep(wf, stepKey) : null;
  p.pathHistory.push(Object.assign({
    id: (typeof uid === 'function') ? uid() : String(Date.now()),
    at: new Date().toISOString(), user: pwUserName(),
    action: action, stageKey: f ? f.stage.key : '', stepKey: stepKey || '',
    label: f ? (f.stage.label + ' · ' + f.step.label) : ''
  }, extra || {}));
  if(p.pathHistory.length > 500) p.pathHistory = p.pathHistory.slice(-500);
  try{ if(typeof addAudit === 'function') addAudit('مسار مشروع: ' + action, (p.name || '') + (f ? ' — ' + f.step.label : '') + (extra && extra.note ? ' (' + extra.note + ')' : '')); }catch(_e){}
}

/* ---------------- تهيئة وحالة ---------------- */

/** يضمن وجود حقول المسار على المشروع (ويثبّت نسخة المسار) — آمن للتكرار */
function pwEnsure(p){
  if(!p) return p;
  if(!p.stepMeta || typeof p.stepMeta !== 'object' || Array.isArray(p.stepMeta)) p.stepMeta = {};
  if(!Array.isArray(p.completedSteps)) p.completedSteps = [];
  if(!p.stepFiles || typeof p.stepFiles !== 'object' || Array.isArray(p.stepFiles)) p.stepFiles = {};
  if(!Array.isArray(p.pathHistory)) p.pathHistory = [];
  pwFreezeWorkflow(p);
  const cur = pwCurrent(p);
  p.stageKey = cur.stageKey; p.stepKey = cur.stepKey;
  // ترحيل بيانات المسار القديمة (من البرنامج الأصلي): تواريخ/تخطي/إتمام
  Object.keys(p.stepMeta).forEach(function(k){
    const m = p.stepMeta[k]; if(!m) return;
    if(m.skipped && !m.status) m.status = 'skipped';
    if(m.date && !m.endDate) m.endDate = m.date;
  });
  p.completedSteps.forEach(function(k){
    if(!p.stepMeta[k]) p.stepMeta[k] = {};
    if(!p.stepMeta[k].status) p.stepMeta[k].status = 'done';
  });
  if(p.stepDates && typeof p.stepDates === 'object'){
    Object.keys(p.stepDates).forEach(function(k){
      if(!p.stepMeta[k]) p.stepMeta[k] = {};
      if(!p.stepMeta[k].endDate && p.stepDates[k]) p.stepMeta[k].endDate = p.stepDates[k];
    });
  }
  return p;
}

function pwMetaFor(p, stepKey){
  if(!p.stepMeta) p.stepMeta = {};
  if(!p.stepMeta[stepKey]) p.stepMeta[stepKey] = {};
  return p.stepMeta[stepKey];
}

/** يزامن حقل status (نص المرحلة) مع الموضع الحالي، ويتعامل مع الحالات الخاصة (مرفوض/متوقف/مكتمل) */
function pwSyncStatus(p){
  const cur = pwCurrent(p);
  if(p.tenderStance === 'rejected'){
    if(p.status !== 'ملغي'){ p.statusBeforeReject = cur.stage.label; p.status = 'ملغي'; }
    return;
  }
  if(p.status === 'ملغي' && p.statusBeforeReject){ p.status = p.statusBeforeReject; p.statusBeforeReject = ''; }
  if(p.status === 'متوقف') return;                         // الإيقاف قرار يدوي — المسار ما يلغيهوش
  const last = cur.wf[cur.wf.length - 1];
  const lastStep = last.steps[last.steps.length - 1];
  const finished = last.steps.every(function(sp){
    const x = pwStepStatus(p, sp.key);
    return x === 'done' || x === 'skipped' || (sp.optional && x === 'pending');
  }) && pwStepStatus(p, lastStep.key) === 'done';
  p.status = finished ? 'مكتمل' : cur.stage.label;
}

/** لما المرحلة (status) تتغيّر من خارج المسار (نموذج المشروع، عقد جديد...) نحرّك موضع المسار معاها */
function pwOnStatusChanged(p, label){
  if(!p) return;
  label = pwCanonicalStatus(label);
  if(PW_TERMINAL.indexOf(label) >= 0) return;
  const wf = pwWorkflowOf(p);
  const stage = wf.find(function(x){ return x.label === label; });
  if(!stage) return;
  const cur = pwCurrent(p);
  if(cur.stage.key === stage.key) return;
  let step = stage.steps.find(function(sp){ const x = pwStepStatus(p, sp.key); return x !== 'done' && x !== 'skipped'; }) || stage.steps[0];
  if(!p.stepMeta) p.stepMeta = {};
  pwSetPosition(p, stage.key, step.key);
  pwLog(p, 'تغيير المرحلة', step.key, { from: cur.stageKey, to: stage.key });
}

/* ---------------- العمليات ---------------- */

function pwResult(ok, msg, extra){ return Object.assign({ ok: !!ok, msg: msg || '' }, extra || {}); }

function pwSetPosition(p, stageKey, stepKey){
  p.stageKey = stageKey; p.stepKey = stepKey;
  const m = pwMetaFor(p, stepKey);
  if(!m.status || m.status === 'pending') m.status = 'in_progress';
  if(!m.startDate) m.startDate = pwToday();
  m.updatedAt = new Date().toISOString();
}

/** متطلبات إتمام الخطوة: التاريخ (يتعبّى تلقائيًا بتاريخ اليوم) + المرفق لو الخطوة بتطلبه */
function pwCanComplete(p, stepKey){
  const f = pwFindStep(pwWorkflowOf(p), stepKey);
  if(!f) return pwResult(false, 'خطوة غير موجودة');
  const missing = [];
  if(f.step.needsAttach && !pwFiles(p, stepKey).length) missing.push('مرفق');
  if(f.step.needsReason && !String(pwMeta(p, stepKey).notes || '').trim() && !pwComments(p, stepKey).length) missing.push('ملاحظة');
  if(f.step.stance && p.tenderStance !== 'accepted') missing.push('قبول العرض (موقف المشروع)');
  return missing.length ? pwResult(false, 'مطلوب قبل الإتمام: ' + missing.join('، '), { missing: missing }) : pwResult(true);
}

/** المرحلة التالية متاحة؟ (شرط الانتقال بين المراحل) */
function pwCanEnterStage(p, stageKey){
  const wf = pwWorkflowOf(p);
  const idx = wf.findIndex(function(x){ return x.key === stageKey; });
  if(idx < 0) return pwResult(false, 'مرحلة غير موجودة');
  if(p.tenderStance === 'rejected' && idx > wf.findIndex(function(x){ return x.exclusive; })){
    return pwResult(false, 'تم رفض العرض/المناقصة — أعد فتح موقف المشروع أولاً');
  }
  for(let i = 0; i < idx; i++){
    const st = wf[i];
    if(st.gate === 'none') continue;
    const pend = st.steps.filter(function(sp){
      if(sp.optional) return false;
      const x = pwStepStatus(p, sp.key);
      return x !== 'done' && x !== 'skipped';
    });
    if(pend.length) return pwResult(false, 'لازم تكمل أو تتخطى (بسبب) خطوات «' + st.label + '» الإلزامية: ' + pend.map(function(x){ return x.label; }).join('، '), { pending: pend.map(function(x){ return x.key; }) });
  }
  return pwResult(true);
}

function pwStart(p, stepKey){
  pwEnsure(p);
  const f = pwFindStep(pwWorkflowOf(p), stepKey);
  if(!f) return pwResult(false, 'خطوة غير موجودة');
  const gate = pwCanEnterStage(p, f.stage.key);
  if(!gate.ok) return gate;
  const prev = pwCurrent(p);
  pwSetPosition(p, f.stage.key, stepKey);
  pwLog(p, 'بدء خطوة', stepKey, { from: prev.stepKey, to: stepKey });
  pwSyncStatus(p);
  return pwResult(true);
}

function pwComplete(p, stepKey, opts){
  opts = opts || {};
  pwEnsure(p);
  const wf = pwWorkflowOf(p);
  const f = pwFindStep(wf, stepKey);
  if(!f) return pwResult(false, 'خطوة غير موجودة');
  const gate = pwCanEnterStage(p, f.stage.key);
  if(!gate.ok) return gate;
  const can = pwCanComplete(p, stepKey);
  if(!can.ok) return can;
  const m = pwMetaFor(p, stepKey);
  m.status = 'done';
  m.skipReason = '';
  if(!m.startDate) m.startDate = pwToday();
  m.endDate = opts.date || m.endDate || pwToday();
  m.completedAt = new Date().toISOString();
  m.completedBy = pwUserName();
  m.updatedAt = m.completedAt;
  if(opts.notes != null) m.notes = opts.notes;
  if(p.completedSteps.indexOf(stepKey) < 0) p.completedSteps.push(stepKey);
  pwLog(p, 'إتمام خطوة', stepKey, { note: m.notes || '' });
  // ننقل الموضع للخطوة التالية تلقائيًا لو الموضع الحالي هو الخطوة اللي اتمّت
  const cur = pwCurrent(p);
  if(cur.stepKey === stepKey && opts.advance !== false){
    const flat = pwFlatSteps(wf);
    const i = flat.findIndex(function(x){ return x.step.key === stepKey; });
    let nxt = null;
    for(let j = i + 1; j < flat.length; j++){
      const sx = pwStepStatus(p, flat[j].step.key);
      if(sx !== 'done' && sx !== 'skipped'){ nxt = flat[j]; break; }
    }
    if(nxt){
      // الانتقال لمرحلة جديدة بيحتاج تتحقق شروط المرحلة السابقة؛ لو مش متحققة نفضل في مكاننا
      if(nxt.stage.key !== cur.stageKey && !pwCanEnterStage(p, nxt.stage.key).ok){ /* باقي في المرحلة */ }
      else pwSetPosition(p, nxt.stage.key, nxt.step.key);
    }
  }
  pwSyncStatus(p);
  return pwResult(true);
}

/** «التالي»: يكمّل الخطوة الحالية وينتقل للي بعدها */
function pwAdvance(p){
  pwEnsure(p);
  const cur = pwCurrent(p);
  return pwComplete(p, cur.stepKey, {});
}

function pwSkip(p, stepKey, reason){
  pwEnsure(p);
  reason = String(reason || '').trim();
  if(!reason) return pwResult(false, 'سبب التخطي مطلوب');
  const wf = pwWorkflowOf(p);
  const f = pwFindStep(wf, stepKey);
  if(!f) return pwResult(false, 'خطوة غير موجودة');
  if(f.step.stance) return pwResult(false, 'موقف المشروع يتحدد بقبول أو رفض — مش بالتخطي');
  const m = pwMetaFor(p, stepKey);
  m.status = 'skipped'; m.skipReason = reason; m.skippedAt = pwToday(); m.updatedAt = new Date().toISOString();
  p.completedSteps = p.completedSteps.filter(function(k){ return k !== stepKey; });
  pwLog(p, 'تخطي خطوة', stepKey, { note: reason });
  const cur = pwCurrent(p);
  if(cur.stepKey === stepKey){
    const flat = pwFlatSteps(wf);
    const i = flat.findIndex(function(x){ return x.step.key === stepKey; });
    for(let j = i + 1; j < flat.length; j++){
      const sx = pwStepStatus(p, flat[j].step.key);
      if(sx !== 'done' && sx !== 'skipped'){
        if(flat[j].stage.key === cur.stageKey || pwCanEnterStage(p, flat[j].stage.key).ok) pwSetPosition(p, flat[j].stage.key, flat[j].step.key);
        break;
      }
    }
  }
  pwSyncStatus(p);
  return pwResult(true);
}

/** تخطي مرحلة كاملة بسبب: كل خطوات المرحلة غير المنجزة تتخطى (موقف المشروع مستثنى) */
function pwSkipStage(p, stageKey, reason){
  pwEnsure(p);
  reason = String(reason || '').trim();
  if(!reason) return pwResult(false, 'سبب التخطي مطلوب');
  const wf = pwWorkflowOf(p);
  const st = wf.find(function(x){ return x.key === stageKey; });
  if(!st) return pwResult(false, 'مرحلة غير موجودة');
  if(st.exclusive || st.steps.some(function(x){ return x.stance; })) return pwResult(false, 'مرحلة قرار القبول/الرفض لا يمكن تخطيها');
  let n = 0;
  st.steps.forEach(function(sp){
    const x = pwStepStatus(p, sp.key);
    if(x === 'done' || x === 'skipped') return;
    const r = pwSkip(p, sp.key, reason);
    if(r.ok) n++;
  });
  if(!n) return pwResult(false, 'كل خطوات المرحلة منتهية بالفعل');
  pwLog(p, 'تخطي مرحلة', st.steps[0].key, { note: reason });
  return pwResult(true);
}

/** قبول العرض/المناقصة (خطوة موقف المشروع) */
function pwAccept(p, stepKey, note){
  pwEnsure(p);
  const f = pwFindStep(pwWorkflowOf(p), stepKey);
  if(!f || !f.step.stance) return pwResult(false, 'الخطوة دي مش خطوة موقف المشروع');
  p.tenderStance = 'accepted'; p.rejectReason = '';
  const m = pwMetaFor(p, stepKey);
  if(note != null) m.notes = note;
  if(m.status === 'rejected') m.status = 'in_progress';
  const r = pwComplete(p, stepKey, { notes: m.notes });
  if(r.ok) pwLog(p, 'قبول العرض', stepKey, { note: note || '' });
  return r;
}

/** رفض العرض/المناقصة مع سبب إلزامي */
function pwReject(p, stepKey, reason){
  pwEnsure(p);
  reason = String(reason || '').trim();
  if(!reason) return pwResult(false, 'سبب الرفض مطلوب');
  const f = pwFindStep(pwWorkflowOf(p), stepKey);
  if(!f || !f.step.stance) return pwResult(false, 'الرفض متاح على خطوة موقف المشروع فقط');
  const m = pwMetaFor(p, stepKey);
  m.status = 'rejected'; m.rejectReason = reason; m.endDate = m.endDate || pwToday(); m.updatedAt = new Date().toISOString();
  p.completedSteps = p.completedSteps.filter(function(k){ return k !== stepKey; });
  p.tenderStance = 'rejected'; p.rejectReason = reason;
  pwSetPositionOnly(p, f.stage.key, stepKey);
  pwLog(p, 'رفض العرض', stepKey, { note: reason });
  pwSyncStatus(p);
  return pwResult(true);
}

function pwSetPositionOnly(p, stageKey, stepKey){ p.stageKey = stageKey; p.stepKey = stepKey; }

/** إعادة فتح خطوة (رجوع): الخطوة وما بعدها ترجع «لم تبدأ» — بياناتها (تواريخ/ملفات/ملاحظات) تفضل محفوظة، والتاريخ بيسجّل الرجوع */
function pwReopen(p, stepKey, note){
  pwEnsure(p);
  const wf = pwWorkflowOf(p);
  const flat = pwFlatSteps(wf);
  const i = flat.findIndex(function(x){ return x.step.key === stepKey; });
  if(i < 0) return pwResult(false, 'خطوة غير موجودة');
  const cur = pwCurrent(p);
  const curIdx = flat.findIndex(function(x){ return x.step.key === cur.stepKey; });
  for(let j = i; j < flat.length; j++){
    const k = flat[j].step.key;
    const m = p.stepMeta[k];
    if(m && (m.status === 'done' || m.status === 'skipped' || m.status === 'rejected')){
      m.status = 'pending'; m.skipReason = ''; m.rejectReason = ''; m.completedAt = ''; m.endDate = j === i ? '' : m.endDate;
    }
    p.completedSteps = p.completedSteps.filter(function(x){ return x !== k; });
    if(flat[j].step.stance){ p.tenderStance = ''; p.rejectReason = ''; }
  }
  const f = flat[i];
  pwSetPosition(p, f.stage.key, f.step.key);
  pwLog(p, curIdx > i ? 'رجوع لخطوة' : 'إعادة فتح خطوة', stepKey, { from: cur.stepKey, to: stepKey, note: note || '' });
  pwSyncStatus(p);
  return pwResult(true);
}

/** حفظ بيانات خطوة (تواريخ/مسؤول/ملاحظات/استحقاق) */
function pwSetStepData(p, stepKey, data){
  pwEnsure(p);
  if(!pwFindStep(pwWorkflowOf(p), stepKey)) return pwResult(false, 'خطوة غير موجودة');
  data = data || {};
  const m = pwMetaFor(p, stepKey);
  const before = JSON.stringify([m.startDate, m.endDate, m.dueDate, m.responsible, m.notes]);
  ['startDate', 'endDate', 'dueDate', 'responsible', 'notes'].forEach(function(k){
    if(data[k] !== undefined) m[k] = String(data[k] || '').trim();
  });
  if(m.startDate && m.endDate && m.endDate < m.startDate) return pwResult(false, 'تاريخ النهاية قبل تاريخ البداية');
  m.updatedAt = new Date().toISOString();
  if(before !== JSON.stringify([m.startDate, m.endDate, m.dueDate, m.responsible, m.notes])){
    pwLog(p, 'تعديل بيانات خطوة', stepKey, {});
  }
  return pwResult(true);
}

/** تعليقات الخطوة: سلسلة تعليقات مستقلة (نص + كاتب + وقت) */
function pwComments(p, stepKey){
  const m = pwMeta(p, stepKey);
  return Array.isArray(m.comments) ? m.comments : [];
}
function pwAddComment(p, stepKey, text){
  pwEnsure(p);
  if(!pwFindStep(pwWorkflowOf(p), stepKey)) return pwResult(false, 'خطوة غير موجودة');
  const t = String(text || '').trim();
  if(!t) return pwResult(false, 'اكتب التعليق أولاً');
  const m = pwMetaFor(p, stepKey);
  if(!Array.isArray(m.comments)) m.comments = [];
  m.comments.push({ id: 'cm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), user: pwUserName(), text: t });
  m.updatedAt = new Date().toISOString();
  pwLog(p, 'تعليق على خطوة', stepKey, { note: t });
  return pwResult(true);
}
function pwDeleteComment(p, stepKey, id){
  pwEnsure(p);
  const m = pwMetaFor(p, stepKey);
  if(!Array.isArray(m.comments)) return pwResult(false, 'لا توجد تعليقات');
  const i = m.comments.findIndex(function(c){ return c.id === id; });
  if(i < 0) return pwResult(false, 'التعليق غير موجود');
  const c = m.comments.splice(i, 1)[0];
  pwLog(p, 'حذف تعليق', stepKey, { note: c.text });
  return pwResult(true);
}

function pwAddFiles(p, stepKey, docs){
  pwEnsure(p);
  if(!Array.isArray(p.stepFiles[stepKey])) p.stepFiles[stepKey] = [];
  (docs || []).forEach(function(d){ p.stepFiles[stepKey].push(d); });
  // مرفقات الخطوة تظهر كمان في أرشيف المشروع
  if(!Array.isArray(p.docs)) p.docs = [];
  (docs || []).forEach(function(d){ p.docs.push(Object.assign({}, d, { stepKey: stepKey })); });
  if(docs && docs.length) pwLog(p, 'إرفاق مستند', stepKey, { note: docs.map(function(d){ return d.name; }).join('، ') });
}

function pwRemoveFile(p, stepKey, docId){
  const list = pwFiles(p, stepKey);
  const d = list.find(function(x){ return x.id === docId; });
  if(!d) return null;
  p.stepFiles[stepKey] = list.filter(function(x){ return x.id !== docId; });
  p.docs = (p.docs || []).filter(function(x){ return !(x.id === docId && x.stepKey === stepKey); });
  pwLog(p, 'حذف مستند', stepKey, { note: d.name || '' });
  return d;
}

/* ---------------- تطبيق تعديل المسار على المشاريع (المرحلة 4) ---------------- */

/** قبل حفظ مسار جديد: ثبّت المسار القديم على كل مشروع قائم ملوش نسخة محفوظة، عشان مراحلها ما تتغيرش بأثر رجعي */
function pwFreezeAllExistingProjects(){
  let n = 0;
  (DATA.projects || []).forEach(function(p){
    if(p && !(p.workflowSnapshot && Array.isArray(p.workflowSnapshot.stages))){ pwFreezeWorkflow(p); n++; }
  });
  return n;
}

/** تحقق من مسار قبل الحفظ */
function pwValidateWorkflow(stages){
  if(!Array.isArray(stages) || !stages.length) return 'لازم يكون فيه مرحلة واحدة على الأقل';
  const seen = {};
  for(let i = 0; i < stages.length; i++){
    const s = stages[i];
    if(!String(s.label || '').trim()) return 'مرحلة بدون اسم (رقم ' + (i + 1) + ')';
    if(!Array.isArray(s.steps) || !s.steps.length) return 'المرحلة «' + s.label + '» لازم يكون فيها خطوة واحدة على الأقل';
    for(let j = 0; j < s.steps.length; j++){
      const st = s.steps[j];
      if(!String(st.label || '').trim()) return 'خطوة بدون اسم في المرحلة «' + s.label + '»';
      if(seen[st.key]) return 'مفتاح خطوة مكرر: ' + st.key;
      seen[st.key] = true;
    }
  }
  const labels = {};
  for(let i = 0; i < stages.length; i++){
    const l = clNormName(stages[i].label);
    if(labels[l]) return 'اسم مرحلة مكرر: ' + stages[i].label;
    labels[l] = true;
  }
  return '';
}
