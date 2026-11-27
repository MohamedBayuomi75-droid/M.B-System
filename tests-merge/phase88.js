// المرحلة 8 (الحزمة 8.7.6 — DEC-0140): مفتاح الحساب الجديد في الواجهة القديمة (settings.newDayPay) لتكلفة يوميات المعدات = السيرفر.
//  [1] equipmentDailyCost بالمفتاح: التوقف بالنسبة (equipmentIdlePercent، افتراضي 50%)، والنقل بتكلفته (moveCost، وإلا التكلفة المسجّلة)،
//      والتكلفة الإضافية محسوبة، والوقود، والتقديرات (أيام × 8 × ساعة، وساعات ÷ 8 × يومية)
//  [2] كل يومية: القديمة بالمفتاح = cost في /api/v1/equipment/daily، ومستحق كل معدة = baseDue في /api/v1/dues (تبويب المعدات)
//  [3] من غير المفتاح: نفس الحساب القديم بالظبط (phase86)
// بيشتغل في WEB_MODE=1 (وفوق الجداول). في وضع الملف: [1] و[3] على القديمة بس.
const { openApp, WEB } = require('./harness');
const { ok, eq, summary, baseUser } = require('./lib');
(async () => {
  const P = (id, o) => Object.assign({ id, extraFields: [], attachments: [] }, o);
  const E = (id, o) => P(id, Object.assign({ type: 'other', status: 'working', ownership: 'owned' }, o));
  const D = (id, o) => Object.assign({ id, kind: 'work', days: 1, hours: 0, fuelLiters: 0, notes: '', project: 'مشروع الشروق' }, o);
  const seed = {
    users: [baseUser], schemaVersion: 9, settings: { newDayPay: true, defaultFuelPrice: 12 },
    projects: [{ id: 'pA', code: 'PRJ-001', name: 'مشروع الشروق', status: 'active' }],
    equipment: [
      E('q1', { code: 'EQ-001', name: 'لودر', dailyCost: 1000, hourlyCost: 150, fuelPrice: 10 }),
      E('q2', { code: 'EQ-002', name: 'قلاب', hourlyCost: 200 }),
      E('q3', { code: 'EQ-003', name: 'ملاكي', dailyCost: 300 }),
    ],
    equipmentDaily: [
      D('ed1', { equipmentId: 'q1', date: '2026-03-02', hours: 8, fuelLiters: 20 }),
      D('ed2', { equipmentId: 'q1', date: '2026-03-03', kind: 'idle', days: 2 }),
      D('ed3', { equipmentId: 'q2', date: '2026-03-02', days: 0, hours: 5 }),
      D('ed4', { equipmentId: 'q2', date: '2026-03-04', kind: 'move', cost: 777 }),
      D('ed5', { equipmentId: 'q2', date: '2026-03-06', kind: 'move', moveCost: 450, fuelLiters: 10, fuelPrice: 12 }),
      D('ed6', { equipmentId: 'q3', date: '2026-03-05', extraCost: 50, dailyCost: 250 }),
      D('ed7', { equipmentId: 'q3', date: '2026-03-07', kind: 'idle', days: 0, hours: 3 }),
      D('ed8', { equipmentId: 'q1', date: '2026-03-08', days: 0.5, dailyCost: 333.33 }),
      D('ed9', { equipmentId: 'q2', date: '2026-03-09', days: 1, fuelLiters: 7.5 }),
    ],
    workerPayments: [{ id: 'p1', personType: 'equipment', personId: 'q1', workerId: '', type: 'pay', date: '2026-03-10', amount: 500, scope: 'self', notes: '' }],
  };
  const { browser, page, errors } = await openApp(seed);
  const costs = () => page.evaluate(() => DATA.equipmentDaily.map((d) => [d.id, equipmentDailyCost(d, getEquipment(d.equipmentId))]));
  console.log('[1] equipmentDailyCost بالمفتاح');
  const on = await costs();
  eq(on, [['ed1', 1200], ['ed2', 1000], ['ed3', 1000], ['ed4', 777], ['ed5', 570], ['ed6', 300], ['ed7', 56.25], ['ed8', 166.665], ['ed9', 1600]],
    'التشغيل والوقود، والتوقف 50%، والنقل بالتكلفة المسجّلة وبتكلفة النقل، والتكلفة الإضافية، والتقديرات، ونص يوم (6 خانات زي السيرفر)');
  const pct = await page.evaluate(() => { DATA.settings.equipmentIdlePercent = 25; const r = equipmentDailyCost(DATA.equipmentDaily[1]); delete DATA.settings.equipmentIdlePercent; return r; });
  eq(pct, 500, 'نسبة التوقف من الإعدادات');
  console.log('[3] من غير المفتاح');
  const off = await page.evaluate(() => { DATA.settings.newDayPay = false; const r = DATA.equipmentDaily.map((d) => [d.id, equipmentDailyCost(d, getEquipment(d.equipmentId))]); DATA.settings.newDayPay = true; return r; });
  eq(off.filter(([id]) => ['ed2', 'ed4', 'ed5', 'ed6', 'ed7'].includes(id)), [['ed2', 2000], ['ed4', 777], ['ed5', 1720], ['ed6', 250], ['ed7', 112.5]], 'الحساب القديم زي ما هو (التوقف والنقل بالتكلفة الكاملة، والإضافية مش محسوبة)');
  if (WEB) {
    const api = (u) => page.evaluate(async (u) => (await fetch(u, { headers: { Authorization: 'Bearer ' + WebSession.token() } })).json(), u);
    console.log('[2] السيرفر');
    const g = await api('/api/v1/equipment/daily?from=2000-01-01&to=2099-12-31');
    const byId = Object.fromEntries(on);
    eq(g.list.map((d) => [d.id, Number(d.cost)]).sort(), g.list.map((d) => [d.id, byId[d.id]]).sort(), 'كل يومية: القديمة بالمفتاح = السيرفر');
    const rows = (await api('/api/v1/dues/table?tab=equipment')).rows;
    const legacyDue = await page.evaluate(() => Object.fromEntries(DATA.equipment.map((e) => [e.id, toInt(DATA.equipmentDaily.filter((d) => d.equipmentId === e.id).reduce((s, d) => s + equipmentDailyCost(d, e), 0))])));
    eq(Object.fromEntries(rows.map((r) => [r.id, Math.round(Number(r.baseDue) * 100) / 100]).sort()), Object.fromEntries(Object.entries(legacyDue).sort()), 'مستحق كل معدة: القديمة بالمفتاح = المستحقات في السيرفر');
  } else ok(true, 'وضع الملف: مقارنة السيرفر بتتعمل في WEB_MODE=1');
  eq(errors, [], 'no JS errors');
  await browser.close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
