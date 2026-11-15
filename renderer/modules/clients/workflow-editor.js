/* =========================================================
   workflow-editor.js — محرر مسار العمل (ProjectWorkflowEditor) — المرحلة 4
   يُفتح من الإعدادات ← العملاء ← «مسار المشروع». المنطق في project-workflow.js
   - إضافة/تعديل/حذف/ترتيب المراحل والخطوات (أزرار ▲▼)
   - خطوة إلزامية/اختيارية، مرفق إلزامي، وشرط الانتقال بين المراحل
   - الحفظ بيثبّت النسخة القديمة على كل المشاريع القائمة أولاً، فمراحلها ما تتغيرش بأثر رجعي
   ========================================================= */

function wfNewKey(prefix){
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function wfProjectsUsing(stageKey, stepKey){
  let n = 0;
  (DATA.projects || []).forEach(function(p){
    if(!p) return;
    const cur = pwCurrent(p);
    if(stepKey ? cur.stepKey === stepKey : cur.stageKey === stageKey) n++;
  });
  return n;
}

function openWorkflowEditor(){
  if(typeof readOnlyMode !== 'undefined' && readOnlyMode){ showToast('🔒 وضع القراءة فقط'); return; }
  let ed = pwSettingsWorkflow();

  function stageHtml(s, si){
    return '<div class="wfe-stage card" data-si="' + si + '" style="padding:10px;margin-bottom:10px;border:1px solid var(--line);">' +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
        '<strong style="min-width:22px;">' + (si + 1) + '</strong>' +
        '<input class="input wfe-s-label" style="flex:1;min-width:180px;" value="' + escapeHtml(s.label) + '" placeholder="اسم المرحلة">' +
        '<input class="input wfe-s-short" style="width:130px;" value="' + escapeHtml(s.short || '') + '" placeholder="اسم مختصر">' +
        '<select class="input wfe-s-gate" style="width:210px;" title="شرط الانتقال للمرحلة التالية">' +
          '<option value="required"' + (s.gate !== 'none' ? ' selected' : '') + '>الانتقال: بعد إتمام/تخطي الإلزامي</option>' +
          '<option value="none"' + (s.gate === 'none' ? ' selected' : '') + '>الانتقال: حر</option></select>' +
        '<button type="button" class="btn btn-outline btn-sm wfe-s-up" title="أعلى">▲</button>' +
        '<button type="button" class="btn btn-outline btn-sm wfe-s-down" title="أسفل">▼</button>' +
        '<button type="button" class="btn btn-outline btn-sm wfe-s-del" title="حذف المرحلة">🗑️</button>' +
      '</div>' +
      '<div style="margin:8px 0 4px;">' + s.steps.map(function(st, ti){
        return '<div class="wfe-step" data-ti="' + ti + '" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;border-top:1px dashed var(--line);">' +
          '<span style="width:34px;color:var(--ink-soft);font-size:12px;">' + (si + 1) + '.' + (ti + 1) + '</span>' +
          '<input class="input wfe-t-label" style="flex:1;min-width:200px;" value="' + escapeHtml(st.label) + '" placeholder="اسم الخطوة">' +
          '<label style="font-size:12px;white-space:nowrap;"><input type="checkbox" class="wfe-t-opt"' + (st.optional ? ' checked' : '') + '> اختيارية</label>' +
          '<label style="font-size:12px;white-space:nowrap;"><input type="checkbox" class="wfe-t-att"' + (st.needsAttach ? ' checked' : '') + '> مرفق إلزامي</label>' +
          '<label style="font-size:12px;white-space:nowrap;"><input type="checkbox" class="wfe-t-stance"' + (st.stance ? ' checked' : '') + '> قبول/رفض</label>' +
          '<button type="button" class="btn btn-outline btn-sm wfe-t-up">▲</button>' +
          '<button type="button" class="btn btn-outline btn-sm wfe-t-down">▼</button>' +
          '<button type="button" class="btn btn-outline btn-sm wfe-t-del">🗑️</button>' +
        '</div>';
      }).join('') + '</div>' +
      '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">' +
        '<button type="button" class="btn btn-outline btn-sm wfe-t-add">+ خطوة</button>' +
        '<label style="font-size:12px;"><input type="checkbox" class="wfe-s-excl"' + (s.exclusive ? ' checked' : '') + '> مرحلة قرار (مناقصة: قبول أو رفض يوقف ما بعدها)</label>' +
      '</div></div>';
  }

  function draw(){
    const box = document.getElementById('wfeBody');
    if(!box) return;
    box.innerHTML = ed.map(stageHtml).join('') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="btn btn-outline" id="wfeAddStage">+ مرحلة جديدة</button>' +
      '<button type="button" class="btn btn-outline" id="wfeReset">↺ استعادة المسار الافتراضي</button></div>';
    bind();
  }

  /** يقرأ القيم من الحقول للنسخة الشغالة قبل أي تغيير هيكلي */
  function read(){
    document.querySelectorAll('#wfeBody .wfe-stage').forEach(function(el){
      const s = ed[Number(el.getAttribute('data-si'))];
      if(!s) return;
      s.label = el.querySelector('.wfe-s-label').value.trim();
      s.short = el.querySelector('.wfe-s-short').value.trim();
      s.gate = el.querySelector('.wfe-s-gate').value;
      s.exclusive = el.querySelector('.wfe-s-excl').checked;
      el.querySelectorAll('.wfe-step').forEach(function(se){
        const t = s.steps[Number(se.getAttribute('data-ti'))];
        if(!t) return;
        t.label = se.querySelector('.wfe-t-label').value.trim();
        t.optional = se.querySelector('.wfe-t-opt').checked;
        t.needsAttach = se.querySelector('.wfe-t-att').checked;
        t.stance = se.querySelector('.wfe-t-stance').checked;
      });
    });
  }
  function move(arr, i, d){ const j = i + d; if(j < 0 || j >= arr.length) return; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }

  function bind(){
    document.querySelectorAll('#wfeBody .wfe-stage').forEach(function(el){
      const si = Number(el.getAttribute('data-si'));
      el.querySelector('.wfe-s-up').onclick = function(){ read(); move(ed, si, -1); draw(); };
      el.querySelector('.wfe-s-down').onclick = function(){ read(); move(ed, si, 1); draw(); };
      el.querySelector('.wfe-s-del').onclick = function(){
        read();
        const used = wfProjectsUsing(ed[si].key);
        const msg = 'حذف المرحلة «' + ed[si].label + '» بكل خطواتها من المسار الافتراضي؟' +
          (used ? ' (' + used + ' مشروع حالي عليها — مساراتهم الحالية ما بتتغيرش، الحذف يخص المشاريع الجديدة فقط)' : '');
        confirmDelete(msg).then(function(ok){ if(!ok) return; ed.splice(si, 1); draw(); });
      };
      el.querySelector('.wfe-t-add').onclick = function(){ read(); ed[si].steps.push({ key: wfNewKey('c_'), label: 'خطوة جديدة', optional: false, needsAttach: false, needsDate: true }); draw(); };
      el.querySelectorAll('.wfe-step').forEach(function(se){
        const ti = Number(se.getAttribute('data-ti'));
        se.querySelector('.wfe-t-up').onclick = function(){ read(); move(ed[si].steps, ti, -1); draw(); };
        se.querySelector('.wfe-t-down').onclick = function(){ read(); move(ed[si].steps, ti, 1); draw(); };
        se.querySelector('.wfe-t-del').onclick = function(){
          read();
          if(ed[si].steps.length <= 1){ showToast('المرحلة لازم يبقى فيها خطوة واحدة على الأقل — احذف المرحلة كلها لو مش محتاجها'); return; }
          const used = wfProjectsUsing('', ed[si].steps[ti].key);
          confirmDelete('حذف الخطوة «' + ed[si].steps[ti].label + '»؟' + (used ? ' (' + used + ' مشروع واقف عندها — مساراتهم الحالية ما بتتغيرش)' : '')).then(function(ok){ if(!ok) return; ed[si].steps.splice(ti, 1); draw(); });
        };
      });
    });
    document.getElementById('wfeAddStage').onclick = function(){
      read();
      ed.push({ id: ed.length + 1, key: wfNewKey('s_'), label: 'مرحلة جديدة', short: '', exclusive: false, gate: 'required',
        steps: [{ key: wfNewKey('c_'), label: 'خطوة جديدة', optional: false, needsAttach: false, needsDate: true }] });
      draw();
    };
    document.getElementById('wfeReset').onclick = function(){
      confirmApp('استعادة المسار الافتراضي (10 مراحل)؟ التعديلات غير المحفوظة هتتلغي.', { title: 'استعادة الافتراضي', okLabel: 'استعادة' }).then(function(ok){
        if(ok){ ed = pwCloneWorkflow(PW_DEFAULT_WORKFLOW); draw(); }
      });
    };
  }

  openModal(`
    <div class="modal-header"><h3>⚙️ مسار المشروع — المراحل والخطوات</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body" style="max-height:68vh;overflow:auto;">
      <p style="font-size:13px;color:var(--ink-soft);margin:0 0 10px;">التعديل هنا يطبّق على <strong>المشاريع الجديدة</strong> فقط. المشاريع القائمة بتفضل بمسارها الحالي (بنحفظ لها نسخة قبل الحفظ) فلا تتغير مراحلها ولا بياناتها.</p>
      <div id="wfeBody"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" id="wfeSave">💾 حفظ مسار العمل</button></div>`);
  draw();

  document.getElementById('wfeSave').onclick = function(){
    read();
    ed.forEach(function(s, i){ s.id = i + 1; s.steps.forEach(function(t){ if(t.stance && t.optional) t.optional = false; }); });
    const err = pwValidateWorkflow(ed);
    if(err){ showToast('⚠️ ' + err, 4500); return; }
    const frozen = pwFreezeAllExistingProjects();           // 1) ثبّت المسار القديم على المشاريع القائمة
    const cl = clientsData();
    cl.settings.projectWorkflow = pwNormalizeWorkflow(ed);   // 2) اعتمد المسار الجديد للمشاريع الجديدة
    pwApplyStagesToProjectList();
    try{ if(typeof addAudit === 'function') addAudit('تعديل مسار العمل', ed.length + ' مرحلة'); }catch(_e){}
    saveData(true);
    closeModal();
    showToast('تم حفظ مسار العمل' + (frozen ? ' — ثُبّت المسار القديم على ' + frozen + ' مشروع قائم' : ''));
    if(typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
  };
}
