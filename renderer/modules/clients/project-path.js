/* =========================================================
   project-path.js — واجهة مسار المشروع التفاعلي (ProjectPathTrack)
   المرحلة 3. المنطق في project-workflow.js
   ========================================================= */

const __pwViewStage = {};          // projectId → مرحلة معروضة (مش بالضرورة الحالية)

function pwStatusBadge(st){
  const s = PW_STATUS[st] || PW_STATUS.pending;
  return '<span class="badge ' + s.badge + '" style="white-space:nowrap;">' + s.label + '</span>';
}
function pwStatusIcon(st){
  return ({ done: '✓', in_progress: '●', late: '!', rejected: '✕', skipped: '↷', pending: '' })[st] || '';
}
function pwFmt(d){ return d ? (typeof fmtDate === 'function' ? fmtDate(d) : d) : '—'; }

/** لوحة مسار المشروع (تفاعلية). opts: { compact:true } للعرض المصغّر (شارات فقط) */
function renderProjectPathTrack(project, opts){
  opts = opts || {};
  if(!project) return '';
  const p = project;
  // العرض لا يعدّل البيانات: نقرأ حالة مشتقة فقط (التهيئة الفعلية بتحصل عند أول إجراء)
  const cur = pwCurrent(p);
  const wf = cur.wf;
  const pct = pwProgress(p);
  const rejected = p.tenderStance === 'rejected';

  if(opts.compact) return pwTrackHtml(p, cur, pct, rejected, { compact: true });

  const viewKey = (__pwViewStage[p.id] && wf.some(function(x){ return x.key === __pwViewStage[p.id]; })) ? __pwViewStage[p.id] : cur.stage.key;
  const viewStage = wf.find(function(x){ return x.key === viewKey; }) || cur.stage;
  const ro = (typeof readOnlyMode !== 'undefined' && readOnlyMode);
  const late = pwLateSteps(p).length;

  const stages = wf.map(function(s){
    const st = pwStageStatus(p, s);
    const isCur = s.key === cur.stage.key;
    return '<button type="button" class="ppt2-stage st-' + st + (isCur ? ' is-current' : '') + (s.key === viewKey ? ' is-view' : '') + '" data-stage="' + escapeHtml(s.key) + '" title="' + escapeHtml(s.label) + '">' +
      '<span class="ppt2-node">' + (pwStatusIcon(st) || s.id) + '</span>' +
      '<span class="ppt2-slabel">' + escapeHtml(s.short || s.label) + '</span></button>';
  }).join('<span class="ppt2-sep"></span>');

  const steps = viewStage.steps.map(function(sp, idx){
    const st = pwStepStatus(p, sp.key);
    const m = pwMeta(p, sp.key);
    const files = pwFiles(p, sp.key).length;
    const cmN = pwComments(p, sp.key).length;
    const isCur = cur.stepKey === sp.key;
    let acts = '';
    if(!ro){
      if(st === 'done' || st === 'skipped' || st === 'rejected'){
        acts += '<button type="button" class="btn btn-outline btn-sm" data-act="reopen" data-step="' + sp.key + '">↶ إعادة فتح</button>';
      } else if(sp.stance){
        acts += '<button type="button" class="btn btn-primary btn-sm" data-act="accept" data-step="' + sp.key + '">✓ قبول</button>' +
                '<button type="button" class="btn btn-outline btn-sm" data-act="reject" data-step="' + sp.key + '">✕ رفض</button>';
      } else {
        if(st === 'pending' && idx === 0) acts += '<button type="button" class="btn btn-outline btn-sm" data-act="start" data-step="' + sp.key + '">▶ بدء</button>';
        acts += '<button type="button" class="btn btn-primary btn-sm" data-act="complete" data-step="' + sp.key + '">✓ إتمام</button>' +
                '<button type="button" class="btn btn-outline btn-sm" data-act="skip" data-step="' + sp.key + '">↷ تخطي</button>';
      }
    }
    acts += '<button type="button" class="btn btn-outline btn-sm" data-act="detail" data-step="' + sp.key + '">تفاصيل</button>';
    const reason = st === 'skipped' ? ('سبب التخطي: ' + (m.skipReason || '—')) : (st === 'rejected' ? ('سبب الرفض: ' + (m.rejectReason || p.rejectReason || '—')) : '');
    const cms = pwComments(p, sp.key);
    const legacy = String(m.notes || '').trim();
    const lastNote = cms.length ? cms[cms.length - 1].text : legacy;
    return '<div class="ppt2-step st-' + st + (isCur ? ' is-current' : '') + '" data-step="' + escapeHtml(sp.key) + '">' +
      '<div class="ppt2-step-main">' +
        '<span class="ppt2-dot">' + (pwStatusIcon(st) || (idx + 1)) + '</span>' +
        '<div class="ppt2-step-title"><strong>' + escapeHtml(sp.label) + '</strong>' +
          '<div class="ppt2-step-tags">' + pwStatusBadge(st) +
          (sp.optional ? ' <span class="badge badge-muted">اختيارية</span>' : '') +
          (isCur ? ' <span class="badge badge-info">الخطوة الحالية</span>' : '') + '</div></div>' +
      '</div>' +
      '<div class="ppt2-chips">' +
        '<span class="ppt2-chip">📅 <small>بداية</small> ' + escapeHtml(pwFmt(m.startDate)) + '</span>' +
        '<span class="ppt2-chip">🏁 <small>نهاية</small> ' + escapeHtml(pwFmt(m.endDate || m.date)) + '</span>' +
        '<span class="ppt2-chip">👤 ' + escapeHtml(m.responsible || '—') + '</span>' +
        '<span class="ppt2-chip' + (files ? ' on' : '') + '">📎 ' + files + '</span>' +
        '<span class="ppt2-chip' + (cmN ? ' on' : '') + '">💬 ' + cmN + '</span>' +
      '</div>' +
      (reason ? '<div class="ppt2-reason">' + escapeHtml(reason) + '</div>' : '') +
      (lastNote ? '<div class="ppt2-note">📝 ' + escapeHtml(lastNote) + '</div>' : '') +
      '<div class="ppt2-step-actions">' + acts + '</div>' +
    '</div>';
  }).join('');

  return '<div class="ppt2" data-pid="' + escapeHtml(p.id) + '">' +
    pwTrackHtml(p, cur, pct, rejected, { late: late, ro: ro, viewKey: viewKey }) +
    '<div class="ppt2-detail">' +
      '<div class="ppt2-stage-bar"><div class="ppt2-stage-name">📂 ' + escapeHtml(viewStage.label) + (viewStage.exclusive ? ' <span class="badge badge-warn">قرار قبول/رفض</span>' : '') +
        ' <span class="ppt2-stage-count">' + viewStage.steps.filter(function(x){ return pwStepStatus(p, x.key) === 'done'; }).length + ' / ' + viewStage.steps.length + ' خطوات منتهية</span></div>' +
        (!ro && !viewStage.exclusive && !viewStage.steps.some(function(x){ return x.stance; }) && viewStage.steps.some(function(x){ var q = pwStepStatus(p, x.key); return q !== 'done' && q !== 'skipped'; }) ? '<button type="button" class="btn btn-outline btn-sm" data-act="skipstage" data-stage="' + escapeHtml(viewStage.key) + '">↷ تخطي المرحلة</button>' : '') +
      '</div>' +
      '<div class="ppt2-steps">' + steps + '</div></div>' +
  '</div>';
}

/** المسار الأفقي بنفس شكل برنامج العملاء الأصلي (ppt-*) */
function pwTrackHtml(p, cur, pct, rejected, o){
  o = o || {};
  const compact = !!o.compact;
  const wf = cur.wf;
  const dis = compact ? ' disabled' : '';
  let html = '<div class="ppt-wrap' + (compact ? ' compact' : ' interactive') + '"' + (compact ? ' data-pid="' + escapeHtml(p.id) + '"' : '') + '>' +
    '<div class="ppt-head"><div class="ppt-head-main">' +
      '<span class="ppt-head-title">مسار المشروع:</span>' +
      '<span class="ppt-head-now">' + escapeHtml(cur.stage.label) + '</span>' +
      (cur.step ? '<span class="ppt-head-step">' + escapeHtml(cur.step.label) + '</span>' : '') +
      (rejected ? '<span class="ppt-head-bad">مرفوض</span>' : '') +
      (o.late ? '<span class="ppt-head-bad">' + o.late + ' متأخرة</span>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
      (compact || o.ro ? '' : '<button type="button" class="btn btn-primary btn-sm" id="pwAdvance">إتمام الخطوة الحالية ◀</button>') +
      (compact ? '' : '<button type="button" class="btn btn-outline btn-sm" id="pwHistory">🕘 السجل</button>') +
      '<div class="ppt-head-pct" title="نسبة تقدّم المسار"><div class="ppt-pct-bar"><i style="width:' + pct + '%"></i></div><span>' + pct + '%</span></div>' +
    '</div></div>' +
    '<div class="ppt-scroll" style="position:relative">';
  if(o.stagesOnly){
    html += '<div class="pp3-track" role="list">';
    wf.forEach(function(stage, i){
      const st = pwStageStatus(p, stage);
      const isCur = stage.key === cur.stage.key;
      const cls = st === 'done' ? 'done' : (st === 'skipped' ? 'skipped' : (isCur ? 'active' : 'pending'));
      const total = stage.steps.length;
      const doneN = stage.steps.filter(function(x){ return pwStepStatus(p, x.key) === 'done'; }).length;
      html += '<div class="pp3-item ' + cls + (stage.key === o.viewKey ? ' is-view' : '') + '" role="listitem">' +
        '<button type="button" class="ppt-node ppt-node-stage pp3-node" data-stage="' + escapeHtml(stage.key) + '" title="' + escapeHtml(stage.label) + '">' +
          (cls === 'done' ? '✓' : (cls === 'skipped' ? '!' : escapeHtml(stage.id))) + '</button>' +
        '<div class="pp3-label">' + escapeHtml(stage.short || stage.label) + '</div>' +
        '<div class="pp3-sub">' + (cls === 'skipped' ? 'متخطّاة' : doneN + '/' + total) + '</div></div>';
    });
    return html + '</div></div></div>';
  }
  html += '<div class="ppt-track" role="list"><div class="ppt-rail" style="--pp:' + pct + '%"></div>';
  wf.forEach(function(stage){
    const st = pwStageStatus(p, stage);
    const isCur = stage.key === cur.stage.key;
    const sCls = st === 'done' ? 'done' : (st === 'skipped' ? 'skipped' : (isCur ? 'active' : 'pending'));
    html += '<div class="ppt-item ppt-stage ' + sCls + '" role="listitem">' +
      '<button type="button" class="ppt-node ppt-node-stage" data-stage="' + escapeHtml(stage.key) + '" title="' + escapeHtml(stage.label) + '"' + dis + '>' +
        (sCls === 'done' ? '<span class="ppt-check">✓</span>' : (sCls === 'skipped' ? '<span class="ppt-mini-skip">!</span>' : '<span class="ppt-num">' + escapeHtml(stage.id) + '</span>')) +
      '</button><div class="ppt-label ppt-label-stage">' + escapeHtml(stage.label) + (sCls === 'skipped' ? ' · متخطّى' : '') + '</div></div>';
    stage.steps.forEach(function(sp){
      const ss = pwStepStatus(p, sp.key);
      const m = pwMeta(p, sp.key);
      const dt = m.endDate || m.date || '';
      const dtTxt = dt ? pwFmt(dt) : '';
      const nFiles = pwFiles(p, sp.key).length;
      const active = cur.stepKey === sp.key && isCur;
      if(sp.stance){
        const acc = p.tenderStance === 'accepted', rej = p.tenderStance === 'rejected';
        const cls = rej ? 'rejected' : (ss === 'skipped' ? 'skipped' : (acc ? 'done' : (active ? 'active' : 'pending')));
        html += '<div class="ppt-item ppt-step has-date ppt-stance ' + cls + '" role="listitem">' +
          '<div class="ppt-step-date' + (dtTxt ? ' filled' : '') + '">' + (dtTxt || '—') + '</div>' +
          '<button type="button" class="ppt-node ppt-node-step' + (rej ? ' ppt-node-reject' : '') + (acc ? ' ppt-node-accept' : '') + '" data-step="' + escapeHtml(sp.key) + '" data-label="' + escapeHtml(sp.label) + '" title="موقف المشروع"' + dis + '>' +
            (rej ? '<span class="ppt-mini-reject">✕</span>' : (acc ? '<span class="ppt-mini-check">✓</span>' : (ss === 'skipped' ? '<span class="ppt-mini-skip">!</span>' : '<span class="ppt-dot"></span>'))) +
          '</button><div class="ppt-label ppt-label-step">موقف المشروع' + (acc ? ' · مقبول' : rej ? ' · مرفوض' : ss === 'skipped' ? ' · متخطّى' : '') + '</div></div>';
        return;
      }
      const cls = ss === 'skipped' ? 'skipped' : (ss === 'done' ? 'done' : (ss === 'rejected' ? 'rejected' : (active ? 'active' : 'pending')));
      html += '<div class="ppt-item ppt-step has-date ' + cls + (sp.terminal ? ' terminal' : '') + '" role="listitem">' +
        '<div class="ppt-step-date' + (dtTxt ? ' filled' : '') + '">' + (dtTxt || '—') + (nFiles ? ' · 📎' + nFiles : '') + '</div>' +
        '<button type="button" class="ppt-node ppt-node-step" data-step="' + escapeHtml(sp.key) + '" data-label="' + escapeHtml(sp.label) + '" title="' + escapeHtml(sp.label) + '"' + dis + '>' +
          (ss === 'skipped' ? '<span class="ppt-mini-skip">!</span>' : (ss === 'done' ? '<span class="ppt-mini-check">✓</span>' : '<span class="ppt-dot"></span>')) +
        '</button><div class="ppt-label ppt-label-step">' + escapeHtml(sp.label) + (ss === 'skipped' ? ' · متخطّى' : '') + '</div></div>';
    });
  });
  return html + '</div></div></div>';
}

/* ---------------- الأحداث ---------------- */

function pwCommit(p, msg){
  saveData(true);
  if(msg) showToast(msg);
  rerenderCurrentPage();
}

function pwHandleResult(p, r, okMsg){
  if(!r.ok){ showToast('⚠️ ' + r.msg, 4500); return false; }
  pwCommit(p, okMsg);
  return true;
}

function initProjectPathEvents(proj){
  const root = document.querySelector('.ppt2[data-pid="' + (proj && proj.id) + '"]');
  if(!root) return;
  const p = proj;
  const ro = (typeof readOnlyMode !== 'undefined' && readOnlyMode);

  root.querySelectorAll('.ppt-node-stage').forEach(function(b){
    b.addEventListener('click', function(){ __pwViewStage[p.id] = b.getAttribute('data-stage'); rerenderCurrentPage(); });
  });
  root.querySelectorAll('.ppt-node-step').forEach(function(b){
    b.addEventListener('click', function(){
      root.querySelectorAll('.ppt-mini-pop').forEach(function(x){ x.remove(); });
      const key = b.getAttribute('data-step'), st = pwStepStatus(p, key);
      const sc = root.querySelector('.ppt-scroll'), r = b.getBoundingClientRect(), sr = sc.getBoundingClientRect();
      const pop = document.createElement('div');
      pop.className = 'ppt-mini-pop ppt-mini-pop-anchor';
      pop.style.cssText = 'position:absolute;z-index:30;left:' + Math.max(8, r.left - sr.left + sc.scrollLeft - 70) + 'px;top:' + Math.max(2, r.top - sr.top - 36) + 'px;';
      const canBack = !ro && (st === 'done' || st === 'skipped' || st === 'rejected');
      pop.innerHTML = '<span class="ppt-mini-pop-name">' + escapeHtml(b.getAttribute('data-label') || '') + '</span>' +
        '<button type="button" class="ppt-mini-pop-go" data-pop="detail">تفاصيل</button>' +
        (canBack ? '<button type="button" class="ppt-mini-pop-go" data-pop="back">رجوع</button>' : '') +
        '<button type="button" class="ppt-mini-pop-x" data-pop="x">×</button>';
      sc.appendChild(pop);
      pop.addEventListener('click', function(e){
        const t = e.target.getAttribute && e.target.getAttribute('data-pop'); if(!t) return;
        pop.remove();
        if(t === 'detail') openStepModal(p, key);
        if(t === 'back') confirmApp('إعادة فتح هذه الخطوة؟ الخطوات التالية ترجع «لم تبدأ» (بياناتها ومرفقاتها تفضل محفوظة).', { title: 'إعادة فتح خطوة', okLabel: 'إعادة فتح' }).then(function(ok){
          if(!ok) return;
          if(pwHandleResult(p, pwReopen(p, key, ''), 'تم الرجوع للخطوة')) __pwViewStage[p.id] = pwCurrent(p).stageKey;
        });
      });
    });
  });
  document.getElementById('pwHistory')?.addEventListener('click', function(){ openPathHistoryModal(p); });
  document.getElementById('pwAdvance')?.addEventListener('click', function(){
    if(ro) return;
    const cur = pwCurrent(p);
    if(cur.step.stance){ openStepModal(p, cur.stepKey); return; }
    const can = pwCanComplete(p, cur.stepKey);
    if(!can.ok){ showToast('⚠️ ' + can.msg, 4500); openStepModal(p, cur.stepKey); return; }
    const r = pwAdvance(p);
    if(pwHandleResult(p, r, 'تم إتمام الخطوة')) { __pwViewStage[p.id] = pwCurrent(p).stageKey; }
  });
  root.querySelectorAll('[data-act]').forEach(function(b){
    b.addEventListener('click', function(){
      const act = b.getAttribute('data-act'), key = b.getAttribute('data-step');
      if(act === 'detail'){ openStepModal(p, key); return; }
      if(ro){ showToast('🔒 وضع القراءة فقط'); return; }
      if(act === 'start'){ pwHandleResult(p, pwStart(p, key), 'تم بدء الخطوة'); return; }
      if(act === 'complete'){
        const can = pwCanComplete(p, key);
        if(!can.ok){ showToast('⚠️ ' + can.msg, 4500); openStepModal(p, key); return; }
        if(pwHandleResult(p, pwComplete(p, key, {}), 'تم إتمام الخطوة')) __pwViewStage[p.id] = pwCurrent(p).stageKey;
        return;
      }
      if(act === 'accept'){ if(pwHandleResult(p, pwAccept(p, key, ''), 'تم قبول العرض')) __pwViewStage[p.id] = pwCurrent(p).stageKey; return; }
      if(act === 'skipstage'){
        const sk = b.getAttribute('data-stage');
        openReasonModal('تخطي المرحلة', 'سبب تخطي المرحلة', function(reason){ return pwSkipStage(p, sk, reason); }, p, 'تم تخطي المرحلة');
        return;
      }
      if(act === 'skip'){
        openReasonModal('تخطي الخطوة', 'سبب التخطي', function(reason){ return pwSkip(p, key, reason); }, p, 'تم تخطي الخطوة');
        return;
      }
      if(act === 'reject'){ openStepModal(p, key, act); return; }
      if(act === 'reopen'){
        confirmApp('إعادة فتح هذه الخطوة؟ الخطوات التالية ترجع «لم تبدأ» (بياناتها ومرفقاتها تفضل محفوظة).', { title: 'إعادة فتح خطوة', okLabel: 'إعادة فتح' }).then(function(ok){
          if(!ok) return;
          if(pwHandleResult(p, pwReopen(p, key, ''), 'تم الرجوع للخطوة')) __pwViewStage[p.id] = pwCurrent(p).stageKey;
        });
      }
    });
  });
}

/** نافذة تفاصيل الخطوة (تواريخ/مسؤول/ملاحظات/مرفقات + تخطي/رفض بسبب) */
/** نافذة صغيرة بسبب التخطي — بتظهر بس وقت التخطي */
function openReasonModal(title, label, run, p, okMsg){
  openModal(`
    <div class="modal-header"><h3>${escapeHtml(title)}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><label>${escapeHtml(label)} (إلزامي)
      <textarea class="input" id="pwReasonOnly" rows="3" placeholder="اكتب السبب..."></textarea></label></div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" id="pwReasonOk">↷ تأكيد التخطي</button></div>`);
  setTimeout(function(){ document.getElementById('pwReasonOnly')?.focus(); }, 60);
  document.getElementById('pwReasonOk')?.addEventListener('click', function(){
    const t = document.getElementById('pwReasonOnly');
    const reason = t ? t.value.trim() : '';
    if(!reason){ showToast('⚠️ اكتب السبب أولاً'); if(t){ t.focus(); t.style.outline = '2px solid var(--danger, #c0392b)'; } return; }
    const r = run(reason);
    if(!r.ok){ showToast('⚠️ ' + r.msg, 4500); return; }
    closeModal(); __pwViewStage[p.id] = pwCurrent(p).stageKey; pwCommit(p, okMsg);
  });
}

function pwActionIcon(a){
  a = String(a || '');
  if(/إتمام|قبول/.test(a)) return '✓'; if(/تخطي/.test(a)) return '↷'; if(/رفض/.test(a)) return '✕';
  if(/تعليق/.test(a)) return '💬'; if(/مستند/.test(a)) return '📎'; if(/رجوع|فتح/.test(a)) return '↶'; if(/بدء/.test(a)) return '▶';
  return '✎';
}
function pwCommentsHtml(p, stepKey, ro){
  const list = pwComments(p, stepKey).slice().reverse();
  const legacy = String(pwMeta(p, stepKey).notes || '').trim();
  if(legacy) list.push({ id: '', at: '', user: 'ملاحظة سابقة', text: legacy });
  if(!list.length) return '<div class="pw-cm-empty">لا توجد تعليقات بعد</div>';
  return list.map(function(c){
    return '<div class="pw-cm-item"><div class="pw-cm-meta"><span>👤 ' + escapeHtml(c.user || '—') + '</span><span>' + escapeHtml((c.at || '').slice(0, 16).replace('T', ' ')) + '</span>' +
      ((ro || !c.id) ? '' : '<button type="button" class="pw-cm-del" data-cm-del="' + escapeHtml(c.id) + '" title="حذف التعليق">🗑</button>') + '</div>' +
      '<div class="pw-cm-text">' + escapeHtml(c.text) + '</div></div>';
  }).join('');
}

function openStepModal(p, stepKey, focusAct){
  pwEnsure(p);
  const f = pwFindStep(pwWorkflowOf(p), stepKey);
  if(!f) return;
  const m = pwMeta(p, stepKey);
  const st = pwStepStatus(p, stepKey);
  const ro = (typeof readOnlyMode !== 'undefined' && readOnlyMode);
  const respSel = (listEntitiesForKind('respPerson').find(function(x){ return x.name === (m.responsible || ''); }) || {}).id || '';
  const hist = (p.pathHistory || []).filter(function(h){ return h.stepKey === stepKey; }).slice(-8).reverse();

  openModal(`
    <div class="modal-header"><h3>قائمة تفاصيل الخطوة — ${escapeHtml(f.step.label)} ${pwStatusBadge(st)}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid form-grid-2">
        <label>تاريخ البداية<input class="input" type="date" id="pwStart" value="${escapeHtml(m.startDate || '')}" ${ro ? 'disabled' : ''}></label>
        <label>تاريخ النهاية<input class="input" type="date" id="pwEnd" value="${escapeHtml(m.endDate || m.date || '')}" ${ro ? 'disabled' : ''}></label>
        <label style="grid-column:1/-1;">المسؤول عن التنفيذ
          ${ro ? '<input class="input" value="' + escapeHtml(m.responsible || '') + '" disabled>' : entityComboHtml('pwRespId', 'respPerson', respSel, 'اختر مشرفاً أو مهندساً...')}</label>
        <label style="grid-column:1/-1;display:none;" id="pwReasonWrap">سبب التخطي / الرفض (إلزامي عند التخطي أو الرفض)
          <textarea class="input" id="pwReason" rows="2" placeholder="اكتب السبب..." ${ro ? 'disabled' : ''}>${escapeHtml(st === 'skipped' ? (m.skipReason || '') : (st === 'rejected' ? (m.rejectReason || '') : ''))}</textarea></label>
      </div>
      <div class="pw-cm" style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;"><strong>💬 ملاحظة / تعليق</strong>
          ${ro ? '' : '<button type="button" class="btn btn-primary btn-sm" id="pwCmAdd">➕ إضافة تعليق</button>'}</div>
        ${ro ? '' : '<textarea class="input" id="pwCmText" rows="3" placeholder="اكتب ملاحظة أو تعليقاً على هذه الخطوة..."></textarea>'}
        <div id="pwCmList">${pwCommentsHtml(p, stepKey, ro)}</div>
      </div>
      <div style="margin-top:12px;">
        <div class="section-title" style="margin-top:8px;">المرفقات والمستندات</div>
        <div id="pwAttList">${clAttachmentListHtml(pwFiles(p, stepKey), { readOnly: ro })}</div>
        <div class="att-toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;"><button type="button" class="btn btn-primary btn-sm" id="pwAttach" ${ro ? 'disabled' : ''}>📎 إرفاق مستند</button></div>
        ${f.step.needsAttach ? '<div style="font-size:12px;color:var(--ink-soft);">المرفق إلزامي لإتمام هذه الخطوة.</div>' : ''}
      </div>
      ${hist.length ? '<div class="pw-hist"><div class="section-title" style="margin-top:12px;">🕘 آخر التغييرات على الخطوة</div>' + hist.map(function(h){
        return '<div class="pw-hist-item"><span class="pw-hist-dot">' + pwActionIcon(h.action) + '</span><div class="pw-hist-body"><div class="pw-hist-top"><b>' + escapeHtml(h.action || '') + '</b><span>' + escapeHtml((h.at || '').slice(0, 16).replace('T', ' ')) + '</span></div>' +
          '<div class="pw-hist-sub">👤 ' + escapeHtml(h.user || '—') + (h.note ? ' · ' + escapeHtml(h.note) : '') + '</div></div></div>';
      }).join('') + '</div>' : ''}
    </div>
    <div class="modal-footer" style="flex-wrap:wrap;gap:8px;">
      <button class="btn btn-outline" onclick="closeModal()">إغلاق</button>
      ${ro ? '' : `
        <button class="btn btn-outline" id="pwSave">💾 حفظ البيانات</button>
        ${f.step.stance ? '<button class="btn btn-primary" id="pwAccept">✓ قبول</button><button class="btn btn-outline" id="pwReject">✕ رفض</button>' : `
          <button class="btn btn-outline" id="pwSkip">↷ تخطي</button>
          <button class="btn btn-primary" id="pwDone">✓ إتمام</button>`}
        ${(st === 'done' || st === 'skipped' || st === 'rejected') ? '<button class="btn btn-outline" id="pwReopen">↶ إعادة فتح</button>' : ''}`}
    </div>`);

  if(typeof bindEntityCombos === 'function') bindEntityCombos(document.getElementById('appModal'));
  const val = function(id){ const e = document.getElementById(id); return e ? e.value : ''; };
  const respName = function(){
    const hid = val('pwRespId');
    const ent = hid ? listEntitiesForKind('respPerson').find(function(x){ return x.id === hid; }) : null;
    if(ent) return ent.name || '';
    const t = val('pwRespId_text').trim();
    return t === '' ? '' : (t === (m.responsible || '') ? t : '');
  };
  const saveData_ = function(){
    const ct = document.getElementById('pwCmText');
    if(ct && ct.value.trim()){ pwAddComment(p, stepKey, ct.value); ct.value = ''; }
    return pwSetStepData(p, stepKey, { startDate: val('pwStart'), endDate: val('pwEnd'), responsible: respName() });
  };
  const revealReason = function(kind){
    const w = document.getElementById('pwReasonWrap');
    if(!w || w.style.display !== 'none') return false;
    w.style.display = '';
    const l = w.firstChild; if(l && l.nodeType === 3) l.textContent = kind === 'reject' ? 'سبب الرفض (إلزامي)' : 'سبب التخطي (إلزامي)';
    document.getElementById('pwReason')?.focus();
    showToast('اكتب السبب ثم اضغط الزر مرة أخرى للتأكيد');
    return true;
  };
  const reasonOrWarn = function(){
    const r = val('pwReason').trim();
    if(!r){ showToast('⚠️ اكتب السبب أولاً'); const e = document.getElementById('pwReason'); if(e){ e.focus(); e.style.outline = '2px solid var(--danger, #c0392b)'; } }
    return r;
  };
  const finish = function(r, msg){
    if(!r.ok){ showToast('⚠️ ' + r.msg, 4500); return; }
    closeModal(); __pwViewStage[p.id] = pwCurrent(p).stageKey; pwCommit(p, msg);
  };

  document.getElementById('pwSave')?.addEventListener('click', function(){ const r = saveData_(); if(!r.ok){ showToast('⚠️ ' + r.msg); return; } closeModal(); pwCommit(p, 'تم حفظ بيانات الخطوة'); });
  document.getElementById('pwDone')?.addEventListener('click', function(){ const s = saveData_(); if(!s.ok){ showToast('⚠️ ' + s.msg); return; } finish(pwComplete(p, stepKey, {}), 'تم إتمام الخطوة'); });
  document.getElementById('pwSkip')?.addEventListener('click', function(){ const s = saveData_(); if(!s.ok){ showToast('⚠️ ' + s.msg); return; } if(revealReason('skip')) return; const r = reasonOrWarn(); if(!r) return; finish(pwSkip(p, stepKey, r), 'تم تخطي الخطوة'); });
  document.getElementById('pwAccept')?.addEventListener('click', function(){ const s = saveData_(); if(!s.ok){ showToast('⚠️ ' + s.msg); return; } finish(pwAccept(p, stepKey, null), 'تم قبول العرض'); });
  document.getElementById('pwReject')?.addEventListener('click', function(){ const s = saveData_(); if(!s.ok){ showToast('⚠️ ' + s.msg); return; } if(revealReason('reject')) return; const r = reasonOrWarn(); if(!r) return; finish(pwReject(p, stepKey, r), 'تم تسجيل الرفض'); });
  document.getElementById('pwReopen')?.addEventListener('click', function(){ finish(pwReopen(p, stepKey, ''), 'تم الرجوع للخطوة'); });

  const bindComments = function(){
    const box = document.getElementById('pwCmList');
    if(!box) return;
    box.querySelectorAll('[data-cm-del]').forEach(function(b){
      b.addEventListener('click', function(){
        const r = pwDeleteComment(p, stepKey, b.getAttribute('data-cm-del'));
        if(!r.ok){ showToast('⚠️ ' + r.msg); return; }
        saveData(true); box.innerHTML = pwCommentsHtml(p, stepKey, ro); bindComments();
      });
    });
  };
  bindComments();
  document.getElementById('pwCmAdd')?.addEventListener('click', function(){
    const t = document.getElementById('pwCmText');
    const r = pwAddComment(p, stepKey, t ? t.value : '');
    if(!r.ok){ showToast('⚠️ ' + r.msg); if(t) t.focus(); return; }
    saveData(true);
    if(t) t.value = '';
    const box = document.getElementById('pwCmList');
    if(box){ box.innerHTML = pwCommentsHtml(p, stepKey, ro); bindComments(); }
    rerenderCurrentPage();
    showToast('تمت إضافة التعليق');
  });

  const bindList = function(){
    const box = document.getElementById('pwAttList');
    clBindAttachmentList(box, function(){ return pwFiles(p, stepKey); }, function(d){
      pwRemoveFile(p, stepKey, d.id);
      try{ if(d.path && window.desktopApi && window.desktopApi.deleteAttachment) window.desktopApi.deleteAttachment(d.path); }catch(_e){}
      saveData(true);
      box.innerHTML = clAttachmentListHtml(pwFiles(p, stepKey), { readOnly: ro }); bindList();
    });
  };
  bindList();
  document.getElementById('pwAttach')?.addEventListener('click', async function(){
    const docs = await clPickFiles('project_' + p.id + '_' + stepKey, f.step.label);
    if(!docs.length) return;
    pwAddFiles(p, stepKey, docs);
    saveData(true);
    const box = document.getElementById('pwAttList');
    if(box){ box.innerHTML = clAttachmentListHtml(pwFiles(p, stepKey), { readOnly: ro }); bindList(); }
    showToast('تم إرفاق ' + docs.length + ' ملف');
  });
  if(focusAct === 'reject'){ setTimeout(function(){ document.getElementById('pwReject')?.click(); }, 60); }
}

function openPathHistoryModal(p){
  const rows = (p.pathHistory || []).slice().reverse();
  openModal(`
    <div class="modal-header"><h3>🕘 سجل مسار المشروع — ${escapeHtml(p.name || '')}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      ${rows.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الإجراء</th><th>الخطوة</th><th>ملاحظة</th></tr></thead><tbody>' +
        rows.map(function(h){
          return '<tr><td style="white-space:nowrap;">' + escapeHtml((h.at || '').slice(0, 16).replace('T', ' ')) + '</td><td>' + escapeHtml(h.user || '—') + '</td><td>' + escapeHtml(h.action || '') + '</td><td>' + escapeHtml(h.label || '') + '</td><td>' + escapeHtml(h.note || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div style="color:var(--ink-soft);padding:20px;text-align:center;">لا توجد تغييرات مسجلة بعد</div>'}
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إغلاق</button></div>`);
}
