// المرحلة 8 (الحزمة 8.3 — الموظفين): اختبارات قبول للواجهة القديمة (DEC-0086، DEC-0125).
// القيم المتوقعة = السلوك الحالي (LEGACY-PRESERVE) — ناتج الواجهة القديمة نفسها (phase77.expect.json، اتراجع؛ يتولّد تاني بـ PROBE=1):
//  [1] القسم الأساسي عند التحميل (assignCoreDepartments): «الموظفين»
//  [2] لوحات الأقسام بالأعداد
//  [3] القايمة (filteredEmployees): الحالة، ونوع التوظيف، والوظيفة، والبحث، والفلاتر الإضافية (ومنها الرخصة)، و«بدون قسم أو وظيفة»،
//      وقسم المستقيلين بفلاتره الخاصة (التأمين، وسنة الاستقالة)
//  [4] الملاحظات (personNotesIssues('employee'))
//  [5] الكروت (العادية، وكروت قسم المستقيلين الخاصة)، والجدولين (العادي — وعمود «القسم» بيعرض الوظيفة — وجدول المستقيلين)
//  [6] نافذة الموظف — إضافة: EMP- التلقائي، ونوع التوظيف «full» افتراضي، ورصيد الإجازة الافتراضي، والبريد، والراتب.
//      **مفيش قسم بيتحفظ** (personDeptOnSave مش بيتنادى) — والقسم الأساسي بيتحط عند التحميل الجاي
//  [7] التعديل بالدمج  [8] الاستقالة (مفيش خانة تاريخ في النافذة ← النهارده) والأرشيف وإعادة التفعيل  [9] منع التكرار
// بيشتغل في وضع الملف والويب (WEB_MODE=1) وفوق الجداول.
const { openApp } = require('./harness');
const lib = require('./lib');
const { ok, summary, baseUser } = lib;
const probed = {};
const eq = (a, b, name) => { if (typeof b === 'string' && b.startsWith('__probe_')) { probed[b.slice(8)] = a; return; } lib.eq(a, b, name); };
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9,
    settings: { defaultLeaveDays: 21 },
    leaves: [{ id: 'l1', personKind: 'employee', personId: 'e2', status: 'approved', from: '2020-01-01', to: '2099-01-01' }],
    employees: [
      P('e1', { code: 'EMP-001', name: 'أحمد المحاسب', status: 'active', employmentType: 'full', position: 'محاسب', nationalId: '28501011234567', phone: '01001234567', address: 'القاهرة', email: 'a@x.com',
        salary: 8000, hireDate: '2022-01-01', idCardExpiry: '2099-01-01', insuranceStatus: 'insured', insuranceNumber: '111', contractType: 'permanent', contractStatus: 'active', leaveBalance: 21 }),
      P('e2', { code: 'EMP-002', name: 'منى السكرتيرة', status: 'active', employmentType: 'part', position: 'سكرتارية', salary: 4000, licenseExpiry: '2020-01-01' }),
      P('e3', { code: 'EMP-003', name: 'حسن مستقيل', status: 'resigned', resignedAt: '2025-06-01', hireDate: '2020-06-01', position: 'مهندس', insuranceStatus: 'insured',
        departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', archiveGroup: 'resigned', previousDepartmentId: '__core_employees__' }),
      P('e5', { code: 'EMP-005', name: 'رامي مستقيل قديم', status: 'resigned', resignedAt: '2024-02-10', hireDate: '2023-01-01', position: 'فني', insuranceStatus: 'none', phone: '0122',
        departmentId: '__resigned_employee__', categoryId: '__resigned_employee__', archiveGroup: 'resigned', previousDepartmentId: '__core_employees__' }),
      P('e4', { code: 'EMP-004', name: 'سيد بلا وظيفة', status: 'active', employmentType: 'full' }),
    ],
  };
  const EXPECT = process.env.PROBE ? new Proxy({}, { get: (_, k) => '__probe_' + String(k) }) : require('./phase77.expect.json');
  const { browser, page, errors } = await openApp(seed);
  const settleModal = async () => { await page.waitForSelector('#appModal:not(.modal-overlay-out) #btnSaveEmp'); await page.waitForTimeout(250); };
  const closeAll = async () => { await page.evaluate(() => { try { closeSubModal(); } catch (e) { /* */ } try { closeModal(); } catch (e) { /* */ } }); await page.waitForTimeout(250); };
  const savedRec = async (name) => { await page.waitForFunction((nm) => (DATA.employees || []).some((x) => x.name === nm), name, { timeout: 15000 }); await page.waitForTimeout(300); };
  const saveClick = async () => { const n = await page.evaluate(() => window.__saveCount); await page.click('#btnSaveEmp'); await page.waitForFunction((x) => window.__saveCount > x, n, { timeout: 15000 }); await page.waitForTimeout(200); };
  const ids = (f) => page.evaluate((f) => { Object.keys(employeeFilters).forEach((k) => { if (k !== '_boardLevel') employeeFilters[k] = ''; }); Object.assign(employeeFilters, f); return filteredEmployees().map((e) => e.id); }, f);
  const view = async (f) => {
    await page.evaluate((f) => { goToPage('employees'); Object.keys(employeeFilters).forEach((k) => { employeeFilters[k] = ''; }); employeeFilters._boardLevel = 'list'; Object.assign(employeeFilters, f); rerenderCurrentPage(); }, f);
    await page.waitForTimeout(250);
    return page.evaluate(() => ({
      cards: [...document.querySelectorAll('#app .sc-row .sc-card, #app .stats-row .stat-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
      head: [...document.querySelectorAll('#app table.data-table thead th')].map((th) => th.innerText.trim()).filter(Boolean),
      rows: [...document.querySelectorAll('#app table.data-table tbody tr')].map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim())),
      filters: [...document.querySelectorAll('#app .filters-bar select, #app .filters-bar input')].map((x) => x.id),
    }));
  };

  console.log('[1] القسم الأساسي عند التحميل');
  eq(await page.evaluate(() => DATA.employees.map((e) => [e.id, e.departmentId || ''])), EXPECT.depts, 'assignCoreDepartments للموظفين');

  console.log('[2] لوحات الأقسام');
  await page.evaluate(() => { goToPage('employees'); employeeFilters._boardLevel = 'boards'; rerenderCurrentPage(); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [...document.querySelectorAll('#app .entity-dept-board')].map((b) => [b.getAttribute('data-dept'), b.querySelector('.lbl').innerText.trim(), b.querySelector('.num').innerText.trim()])), EXPECT.boards, 'اللوحات بالترتيب والأعداد');

  console.log('[3] القايمة');
  const F = [{}, { status: 'active' }, { status: 'on_leave' }, { employmentType: 'part' }, { position: 'محاسب' }, { q: 'أحمد' }, { q: '2850' }, { departmentId: '__none__' }, { xCard: 'none' },
    { xLic: 'expired' }, { xLic: 'nolic' }, { xIns: 'insured' }, { xDocs: 'missing' }, { xData: 'missing' },
    { departmentId: '__resigned_employee__' }, { departmentId: '__resigned_employee__', insuranceStatus: 'insured' }, { departmentId: '__resigned_employee__', resignYear: '2024' }, { departmentId: '__resigned_employee__', q: 'رامي' }];
  const lists = []; for (const f of F) lists.push(await ids(f));
  eq(lists, EXPECT.lists, 'filteredEmployees لكل حالة');
  ok(lists[2].includes('e2'), 'الإجازة المعتمدة السارية ← «في إجازة»', lists[2]);

  console.log('[4] الملاحظات');
  eq(await page.evaluate(() => Object.fromEntries(DATA.employees.map((e) => [e.id, personNotesIssues('employee', e)]))), EXPECT.notes, 'personNotesIssues للموظفين');

  console.log('[5] الكروت والجداول');
  const vAll = await view({}); const vRes = await view({ departmentId: '__resigned_employee__' });
  eq({ all: vAll, res: vRes }, EXPECT.views, 'الكروت والفلاتر والجدولين (العادي وقسم المستقيلين)');

  console.log('[6] نافذة الموظف — إضافة');
  await closeAll(); await page.evaluate(() => { goToPage('employees'); openEmployeeModal(); }); await settleModal();
  eq([await page.inputValue('#empCode'), await page.inputValue('#empType'), await page.inputValue('#empLeaveBal'), !!(await page.$('#empResignDate'))], EXPECT.addDefaults, 'الافتراضي: الكود، ونوع التوظيف، والرصيد، ومفيش خانة تاريخ استقالة');
  await page.fill('#empName', 'موظف جديد'); await page.fill('#empEmail', ' n@x.com '); await page.fill('#empSalary', '6500.5'); await page.fill('#empLeaveBal', '15'); await page.fill('#empPos', 'مشتريات');
  await page.click('#btnSaveEmp'); await savedRec('موظف جديد');
  const n1 = await page.evaluate(() => { const e = DATA.employees.find((x) => x.name === 'موظف جديد'); return { code: e.code, employmentType: e.employmentType, status: e.status, email: e.email, salary: e.salary, leaveBalance: e.leaveBalance, position: e.position, departmentId: e.departmentId === undefined ? 'undefined' : e.departmentId, resignedAt: e.resignedAt }; });
  eq(n1, EXPECT.added, 'الموظف الجديد بنفس قيم النافذة (ومن غير قسم)');

  console.log('[7] التعديل بالدمج');
  await closeAll(); await page.evaluate(() => openEmployeeModal('e1')); await settleModal();
  await page.fill('#empPhone', ''); await page.fill('#empAddress', 'الجيزة'); await saveClick();
  eq(await page.evaluate(() => { const e = DATA.employees.find((x) => x.id === 'e1'); return [e.phone, e.address]; }), ['01001234567', 'الجيزة'], 'الهاتف الفاضي مامسحش، والعنوان اتغيّر');

  console.log('[8] الاستقالة وإعادة التفعيل');
  const today = await page.evaluate(() => todayISO());
  await closeAll(); await page.evaluate(() => openEmployeeModal('e4')); await settleModal();
  await page.selectOption('#empStatus', 'resigned'); await saveClick();
  const rs = await page.evaluate(() => { const e = DATA.employees.find((x) => x.id === 'e4'); return { status: e.status, resignedAt: e.resignedAt, departmentId: e.departmentId, archive: (DATA.resignedArchive || []).filter((a) => a.personId === 'e4').map((a) => [a.kind, a.archiveGroup, a.resignedAt]) }; });
  eq(rs, { status: 'resigned', resignedAt: today, departmentId: '__resigned_employee__', archive: [['employee', 'resigned', today]] }, 'الاستقالة: النهارده (مفيش خانة)، وقسم المستقيلين، والأرشيف');
  await closeAll(); await page.evaluate(() => openEmployeeModal('e4')); await settleModal();
  await page.selectOption('#empStatus', 'active'); await saveClick();
  eq(await page.evaluate(() => { const e = DATA.employees.find((x) => x.id === 'e4'); return [e.status, e.departmentId, e.resignedAt, (DATA.resignedArchive || []).filter((a) => a.personId === 'e4').length]; }), EXPECT.reactivate, 'إعادة التفعيل');

  console.log('[9] منع التكرار');
  eq(await page.evaluate(() => findEntityDuplicates('employee', { name: 'أي اسم', nationalId: '28501011234567' }, null).map((m) => [m.id, m.strength])), [['e1', 'hard']], 'رقم قومي موجود: مؤكد');

  eq(errors, [], 'no JS errors');
  await browser.close();
  if (process.env.PROBE) require('fs').writeFileSync(require('path').join(__dirname, 'phase77.expect.json'), JSON.stringify(probed, null, 1) + '\n');
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
