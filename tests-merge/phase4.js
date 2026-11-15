const { openApp } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const seed = { users: [baseUser], schemaVersion: 7, projects: [
      { id: 'pOld', code: 'PRJ-0001', name: 'مشروع قديم', customerId: 'cA', status: 'التنفيذ والمتابعة', stageKey: 'execution', stepKey: 'works_exec' },
      { id: 'pOld2', code: 'PRJ-0002', name: 'مشروع قديم 2', customerId: 'cA', status: 'الدراسة والتخطيط' }
    ], clients: { customers: [{ id: 'cA', name: 'شركة الأمل', code: 'CUS-0001', projects: [], contracts: [], invoices: [], boqs: [], workSurveys: [], collections: [] }] } };
  const { browser, page, errors } = await openApp(seed);
  const confirmYes = async () => { await page.waitForSelector('#appConfirmModal'); await page.click('#appConfirmModal button[data-c="1"]'); await page.waitForTimeout(500); };

  console.log('[1] settings page exposes the editor entry');
  ok(await page.evaluate(() => clRenderSettingsPanel().includes('clWorkflowEditBtn')), 'button in clients settings panel');

  console.log('[2] edit workflow through the UI');
  await page.evaluate(() => openWorkflowEditor()); await page.waitForTimeout(250);
  eq(await page.evaluate(() => document.querySelectorAll('#wfeBody .wfe-stage').length), 10, '10 default stages listed');
  // rename stage 1, tick mandatory attachment on its first step
  await page.evaluate(() => {
    const st = document.querySelectorAll('#wfeBody .wfe-stage')[0];
    st.querySelector('.wfe-s-label').value = 'الدراسة والتخطيط (معدّل)';
    st.querySelector('.wfe-t-att').checked = true;
  });
  // add stage, name it
  await page.click('#wfeAddStage'); await page.waitForTimeout(100);
  await page.evaluate(() => { const st = document.querySelectorAll('#wfeBody .wfe-stage'); const last = st[st.length - 1]; last.querySelector('.wfe-s-label').value = 'مرحلة الجودة'; last.querySelector('.wfe-t-label').value = 'فحص الجودة'; });
  // move the new stage up twice
  for (let i = 0; i < 2; i++) { await page.evaluate(() => { const st = Array.from(document.querySelectorAll('#wfeBody .wfe-stage')).find(e => e.querySelector('.wfe-s-label').value === 'مرحلة الجودة'); st.querySelector('.wfe-s-up').click(); }); await page.waitForTimeout(80); }
  eq(await page.evaluate(() => Array.from(document.querySelectorAll('#wfeBody .wfe-s-label')).map(e => e.value).indexOf('مرحلة الجودة')), 8, 'new stage reordered (▲ moved it up twice)');
  // delete a step (confirm) from stage 2 (3 steps → 2)
  await page.evaluate(() => { document.querySelectorAll('#wfeBody .wfe-stage')[1].querySelectorAll('.wfe-t-del')[2].click(); });
  await confirmYes();
  eq(await page.evaluate(() => document.querySelectorAll('#wfeBody .wfe-stage')[1].querySelectorAll('.wfe-step').length), 2, 'step deleted');
  // validation: blank name refused
  await page.evaluate(() => { document.querySelectorAll('#wfeBody .wfe-stage')[3].querySelector('.wfe-s-label').value = '   '; document.getElementById('wfeSave').click(); });
  await page.waitForTimeout(150);
  eq(await page.evaluate(() => clientsData().settings.projectWorkflow), null, 'invalid workflow not saved (blank stage name)');
  await page.evaluate(() => { document.querySelectorAll('#wfeBody .wfe-stage')[3].querySelector('.wfe-s-label').value = 'التعاقد'; document.getElementById('wfeSave').click(); });
  await page.waitForTimeout(300);

  console.log('[3] existing projects keep their old path; new projects use the new one');
  const r = await page.evaluate(() => {
    const old = DATA.projects.find(p => p.id === 'pOld'), old2 = DATA.projects.find(p => p.id === 'pOld2');
    return {
      saved: clientsData().settings.projectWorkflow.length,
      oldFrozen: !!(old.workflowSnapshot && old.workflowSnapshot.stages.length === 10),
      oldLabel: pwWorkflowOf(old)[0].label, oldStages: pwWorkflowOf(old).length,
      old2Stages: pwWorkflowOf(old2).length,
      oldStepKept: pwCurrent(old).stepKey, oldStatus: old.status,
      newLabel: pwSettingsWorkflow()[0].label, newStages: pwSettingsWorkflow().length,
      listHasNew: PROJECT_STAGES.some(s => s.value === 'مرحلة الجودة'), listLacksOld: !PROJECT_STAGES.some(s => s.value === 'الدراسة والتخطيط'),
      step2: pwSettingsWorkflow()[1].steps.length, attFlag: pwSettingsWorkflow()[0].steps[0].needsAttach, ids: pwSettingsWorkflow().map(s => s.id).join(',')
    };
  });
  eq(r.saved, 11, 'new workflow saved (11 stages)'); ok(r.oldFrozen, 'old project frozen with original 10 stages');
  eq(r.oldLabel, 'الدراسة والتخطيط', 'old project still has old stage name'); eq(r.oldStages, 10, 'old project still 10 stages'); eq(r.old2Stages, 10, 'untouched old project also frozen');
  eq(r.oldStepKept, 'works_exec', 'old project position intact'); eq(r.oldStatus, 'التنفيذ والمتابعة', 'old project status intact');
  eq(r.newLabel, 'الدراسة والتخطيط (معدّل)', 'settings carry new name'); eq(r.step2, 2, 'step deletion applies to new'); eq(r.attFlag, true, 'mandatory-attachment flag saved');
  eq(r.ids, '1,2,3,4,5,6,7,8,9,10,11', 'stage ids renumbered'); ok(r.listHasNew && r.listLacksOld, 'project stage list follows new workflow');

  console.log('[4] a brand-new project uses the new workflow');
  await page.evaluate(() => { goToPage('projects'); openProjectModal(); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => Array.from(document.querySelectorAll('#prStatus option')).map(o => o.value)[0]), 'الدراسة والتخطيط (معدّل)', 'modal stage list = new workflow');
  await page.evaluate(() => { document.getElementById('prName').value = 'مشروع جديد'; document.getElementById('btnSavePr').click(); }); await page.waitForTimeout(250);
  const np = await page.evaluate(() => { const p = DATA.projects.find(x => x.name === 'مشروع جديد'); pwEnsure(p); return { stages: pwWorkflowOf(p).length, first: pwWorkflowOf(p)[0].label, cur: pwCurrent(p).stage.label }; });
  eq(np.stages, 11, 'new project has 11 stages'); eq(np.first, 'الدراسة والتخطيط (معدّل)', 'new project first stage renamed');

  console.log('[5] old project editing is not corrupted when its stage no longer exists in the list');
  await page.evaluate(() => { openProjectModal('pOld2'); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => document.getElementById('prStatus').value), 'الدراسة والتخطيط', 'select keeps the old stage label selected');
  await page.evaluate(() => { document.getElementById('prNotes').value = 'تعديل ملاحظة فقط'; document.getElementById('btnSavePr').click(); }); await page.waitForTimeout(250);
  const o2 = await page.evaluate(() => { const p = DATA.projects.find(x => x.id === 'pOld2'); return { status: p.status, stage: pwCurrent(p).stageKey, notes: p.notes }; });
  eq(o2.status, 'الدراسة والتخطيط', 'status not changed by saving other fields'); eq(o2.stage, 'study', 'path position not moved');

  console.log('[6] reset to default');
  await page.evaluate(() => openWorkflowEditor()); await page.waitForTimeout(200);
  await page.click('#wfeReset'); await confirmYes();
  eq(await page.evaluate(() => document.querySelectorAll('#wfeBody .wfe-stage').length), 10, 'default restored in editor');
  await page.click('#wfeSave'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => pwSettingsWorkflow().map(s => s.label)[0]), 'الدراسة والتخطيط', 'default saved');

  await browser.close(); summary(errors);
})();
