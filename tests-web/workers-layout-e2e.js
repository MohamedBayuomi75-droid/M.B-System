// تخطيط أعمدة جدول العمال المحفوظ (DEC-0122): /app/workers بيطبّق formLayouts زي الواجهة القديمة بالظبط.
// نفس السيرفر ونفس البيانات: القديمة بتتفتح الأول (بتكمّل التخطيط من النافذة الحقيقية — syncAutoFields — وبتحفظه، زي البيانات
// الحقيقية اللي اتستخدمت قبل كده)، وبعدين نقارن العناوين الظاهرة وخلايا كل صف في الأشكال التلاتة (مؤقت، وشركة، ومختلط).
// التشغيل: node tests-web/workers-layout-e2e.js   (محتاج build للسيرفر والواجهة الجديدة + PostgreSQL للاختبار)
'use strict';
const path = require('path');
const { openWebApp } = require(path.join(__dirname, '../tests-merge/harness'));
const { baseUser, eq, ok, summary } = require(path.join(__dirname, '../tests-merge/lib'));

const W = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
const seed = {
  users: [baseUser], schemaVersion: 9,
  supervisors: [{ id: 'sv1', code: 'SUP-1', name: 'سامي المشرف', status: 'active' }],
  projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
  workers: [
    W('w1', { code: 'WRK-001', name: 'محمد علي', workerType: 'temporary', type: 'temporary', status: 'active', dailyWage: 300, supervisorId: 'sv1', nationalId: '29001011234567', phone: '0100', address: 'الجيزة' }),
    W('w2', { code: 'WRK-002', name: 'أحمد محمود', workerType: 'company', type: 'company', status: 'active', salary: 6000, position: 'نجار', skill: 'نجار', nationalId: '28501011234567', phone: '0111', address: 'القاهرة',
      idCardExpiry: '2028-01-01', hireDate: '2024-01-01', contractType: 'permanent', contractStatus: 'active', insuranceStatus: 'insured', insuranceNumber: '123', supervisorId: 'sv1', project: 'مشروع الشروق',
      extraFields: [{ label: 'المقاس', value: 'XL' }] }),
    W('w3', { code: 'WRK-003', name: 'خالد حسن', workerType: 'company', type: 'company', status: 'active', salary: 5000, position: 'حداد', skill: 'حداد', dailyWage: 150 }),
  ],
  // تخطيط محفوظ: ترتيب مختلف، وأعمدة مخفية، واسم عمود متغيّر، وخانة إضافية
  formLayouts: {
    workersTemp: [
      { key: 'code', label: 'الكود', type: 'builtin', showInTable: true }, { key: 'name', label: 'الاسم', type: 'builtin' }, { key: 'supervisor', label: 'المشرف', type: 'builtin' },
      { key: 'phone', label: 'موبايل', _defLabel: 'الهاتف', type: 'builtin' }, { key: 'nationalId', label: 'الرقم القومي', type: 'builtin' }, { key: 'status', label: 'الحالة', type: 'builtin' },
      { key: 'job', label: 'الوظيفة', type: 'builtin' }, { key: 'department', label: 'القسم', type: 'builtin' }, { key: 'dailyWage', label: 'اليومية', type: 'builtin' },
      { key: 'address', label: 'العنوان', type: 'builtin', showInTable: false, _userHidTable: true }, { key: 'notes', label: 'الملاحظات', type: 'builtin' },
    ],
    workers: [
      { key: 'code', label: 'الكود', type: 'builtin' }, { key: 'name', label: 'الاسم', type: 'builtin' }, { key: 'status', label: 'الحالة', type: 'builtin' },
      { key: 'phone', label: 'الهاتف', type: 'builtin' }, { key: 'nationalId', label: 'الرقم القومي', type: 'builtin' }, { key: 'department', label: 'القسم', type: 'builtin' },
      { key: 'job', label: 'الوظيفة', type: 'builtin' }, { key: 'salary', label: 'الراتب', type: 'builtin' }, { key: 'supervisor', label: 'المشرف', type: 'builtin' },
      { key: 'project', label: 'المشروع', type: 'builtin', showInTable: false, _userHidTable: true }, { key: 'address', label: 'العنوان', type: 'builtin' },
      { key: 'birthDate', label: 'تاريخ الميلاد', type: 'builtin' }, { key: 'cf1', id: 'cf1', label: 'المقاس', type: 'custom', showInTable: true }, { key: 'notes', label: 'الملاحظات', type: 'builtin' },
    ],
  },
  customFieldDefs: { workers: [{ id: 'cf1', label: 'المقاس', showInTable: true }] },
  // خانات تلقائية (زي M2 على البيانات الحقيقية): «اليومية» في جدول الشركة (مالوش عمود أصلي)، و«كود العامل» في المؤقت
  autoFields: { workers: [{ key: 'f_wrkWageTemp', label: 'اليومية', selector: '#wrkWageTemp' }], workersTemp: [{ key: 'f_wrkCodeX', label: 'كود العامل', selector: '#wrkCodeX' }] },
};

const MODES = [['temp', '__core_workers_temp__'], ['company', '__core_workers_perm__'], ['mixed', '']];
const grab = (sel) => {
  const t = document.querySelector(sel); if (!t) return null;
  const vis = (el) => el && getComputedStyle(el).display !== 'none';
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const ths = [...t.querySelectorAll('thead tr > th')];
  const keep = ths.map((th, i) => (vis(th) && !th.querySelector('input') && txt(th) ? i : -1)).filter((i) => i >= 0);
  const rows = {};
  t.querySelectorAll('tbody tr').forEach((tr) => {
    const idEl = tr.querySelector('[data-id]'); const id = (idEl && idEl.getAttribute('data-id')) || tr.getAttribute('data-id');
    if (!id) return;
    const cells = [...tr.children];
    // أزرار الصف (👁/✎/✕) أيقوناتها مختلفة عن قصد — بنقارن مكانها بس
    rows[id] = keep.map((i) => (!cells[i] ? '' : !vis(cells[i]) ? '∅' : cells[i].querySelector('button, a') ? 'أزرار' : txt(cells[i])));
  });
  return { head: keep.map((i) => txt(ths[i])), rows };
};

(async () => {
  const { browser, page, base, errors } = await openWebApp(seed);
  // القديمة: أول فتح بيكمّل التخطيط (syncAutoFields) — نحفظه زي استخدام البرنامج الحقيقي، ونفتح من جديد
  const legacyAt = async (dept) => {
    await page.evaluate((d) => { goToPage('workers'); Object.keys(workerFilters).forEach((k) => { workerFilters[k] = ''; }); workerFilters._boardLevel = 'list'; workerFilters.departmentId = d; rerenderCurrentPage(); }, dept);
    await page.waitForTimeout(600);
    return page.evaluate(grab, '#pageContent table.data-table');
  };
  for (const [, d] of MODES) await legacyAt(d);
  await page.evaluate(async () => { await WebSync.save(DATA); });
  await page.reload(); await page.waitForFunction(() => typeof DATA !== 'undefined' && window.WebSync && WebSync._state.meta && DATA.workers.length === 3, null, { timeout: 30000 });
  const legacy = {};
  for (const [m, d] of MODES) legacy[m] = await legacyAt(d);

  console.log('[1] الجدول بنفس الأعمدة والترتيب والأسماء والقيم في الواجهتين');
  for (const [m, d] of MODES) {
    await page.goto(base + '/app/workers'); await page.waitForSelector('#wkBoards .entity-dept-board');
    const resp = page.waitForResponse((r) => /\/api\/v1\/workers(\?|$)/.test(r.url()) && r.request().method() === 'GET');
    await page.click(`#wkBoards .entity-dept-board[data-dept="${d}"]`); await resp; await page.waitForSelector('#wkTable tbody tr[data-id]');
    await page.waitForTimeout(300);
    const app = await page.evaluate(grab, '#wkTable');
    eq(app.head, legacy[m].head, `${m}: العناوين الظاهرة بنفس الترتيب`);
    for (const id of Object.keys(legacy[m].rows)) legacy[m].rows[id].forEach((v, i) => { const g = (app.rows[id] || [])[i]; if (g !== v) console.log('   ≠', m, id, i, JSON.stringify(g), JSON.stringify(v)); });
    eq(app.rows, legacy[m].rows, `${m}: خلايا كل صف`);
  }
  console.log('[2] التخطيط اتطبّق فعلًا (مش الترتيب الافتراضي)');
  ok(legacy.temp.head.includes('موبايل') && !legacy.temp.head.includes('العنوان'), 'المؤقت: اسم متغيّر وعمود مخفي', legacy.temp.head);
  // الترتيب الافتراضي: «تاريخ الميلاد» بعد «رقم التليفون» — التخطيط المحفوظ (بعد syncAutoFields) غيّره
  ok(legacy.company.head.indexOf('تاريخ الميلاد') < legacy.company.head.indexOf('رقم التليفون'), 'الشركة: الترتيب مش الافتراضي', legacy.company.head);
  ok(legacy.company.head.includes('اليومية') && legacy.temp.head.includes('كود العامل'), 'عمود زيادة من خانة تلقائية (زي M2)', [legacy.company.head, legacy.temp.head]);
  ok(legacy.company.head.includes('المقاس') && !legacy.company.head.includes('المشروع'), 'الشركة: خانة إضافية وعمود مخفي', legacy.company.head);
  eq(errors, [], 'من غير أخطاء');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
