// حصر آلي لوظائف الواجهة من الكود (قراءة فقط) — مخرجاته: docs/audit/feature-inventory.json
// التشغيل: node tools/audit/feature-inventory.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
function walk(dir, acc = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, acc); else if (p.endsWith('.js')) acc.push(p); } return acc; }
const files = walk(path.join(ROOT, 'renderer'));
const src = Object.fromEntries(files.map((f) => [rel(f), fs.readFileSync(f, 'utf8')]));
const lineOf = (s, idx) => s.slice(0, idx).split('\n').length;

// --- التنقل والصفحات
const ctx = {}; vm.createContext(ctx);
vm.runInContext(src['renderer/core/modules.js'].replace(/^const NAV_SECTIONS/m, 'this.NAV_SECTIONS') , ctx, { timeout: 2000 });
const NAV = ctx.NAV_SECTIONS || [];
const pctx = {}; vm.createContext(pctx);
vm.runInContext(src['renderer/core/permissions.js'] + ';this.HR_PAGES = HR_PAGES;', pctx);
const PERM_PAGES = pctx.HR_PAGES;

// page key → render function (من switch في app.js)
const app = src['renderer/core/app.js'];
const pageFn = {};
for (const m of app.matchAll(/case '([^']+)':(?:\s*case '([^']+)':)?\s*(?:currentPage='([^']+)';\s*)?return (?:typeof (\w+)==='function' \? )?(\w+)\(\)/g)) {
  for (const k of [m[1], m[2]].filter(Boolean)) pageFn[k] = { fn: m[5], alias: m[3] || null };
}
// صفحات دفتر الموردين بتترسم من renderLedgerPage (modules/ledger/glue.js)
const LEDGER_FN = { dashboard: 'renderLedgerPage', suppliers: 'renderSuppliersPage', invoices: 'renderInvoicesPage', returns: 'renderInvoicesPage', payments: 'renderPaymentsPage', categories: 'renderCategoriesPage', quarterly: 'renderQuarterlyPage', reports: 'lgRenderReportsPage', archive: 'lgRenderArchivePage' };
for (const [k, fn] of Object.entries(LEDGER_FN)) pageFn['ledger.' + k] = { fn, alias: k === 'dashboard' ? 'dashboard' : null };
pageFn['general.overview'] = { fn: 'renderDashboardPage', alias: 'dashboard' };
pageFn['clients.dashboard'] = { fn: 'renderDashboardPage', alias: 'dashboard' };
// تعريف كل دالة: ملف + سطر
const fnDef = {};
for (const [f, s] of Object.entries(src)) for (const m of s.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) (fnDef[m[1]] ||= []).push({ file: f, line: lineOf(s, m.index) });

// --- اختبارات
const tests = {};
for (const f of fs.readdirSync(path.join(ROOT, 'tests-merge')).filter((x) => /^(phase\d+|pages-smoke)\.js$/.test(x))) tests[f] = fs.readFileSync(path.join(ROOT, 'tests-merge', f), 'utf8');
const testsMentioning = (needle) => Object.entries(tests).filter(([, s]) => s.includes(needle)).map(([f]) => f).sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 999) - (parseInt(b.replace(/\D/g, '')) || 999));

// --- لكل ملف: نوافذ/أزرار/تصدير/حسابات/مرفقات
const perFile = {};
for (const [f, s] of Object.entries(src)) {
  const fns = [...s.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => ({ name: m[1], line: lineOf(s, m.index) }));
  const buttons = [...s.matchAll(/<button[^>]*\bid="([^"${}]+)"[^>]*>([^<]{0,70})/g)].map((m) => ({ id: m[1], label: m[2].replace(/\s+/g, ' ').trim() }));
  const uniqBtn = [...new Map(buttons.map((b) => [b.id, b])).values()];
  const count = (re) => (s.match(re) || []).length;
  perFile[f] = {
    lines: s.split('\n').length,
    functions: fns.length,
    pages: fns.filter((x) => /^render\w*Page$/.test(x.name)).map((x) => x.name),
    modals: fns.filter((x) => /^open\w*Modal$|^show\w*Modal$/.test(x.name)).map((x) => `${x.name}:${x.line}`),
    saves: fns.filter((x) => /^(save|add|create|update|delete|remove|del|approve|reject|cancel|pay|post)[A-Z]/.test(x.name)).map((x) => x.name),
    calcs: fns.filter((x) => /(calc|compute|total|balance|summary|statement|netOf|dueOf|Due[A-Z]|Paid|Remaining|Cost[A-Z]|Payroll|Wage|Vat|Tax|Withh)/i.test(x.name) && !/^render|^open|^init/.test(x.name)).map((x) => `${x.name}:${x.line}`),
    exportsFns: fns.filter((x) => /^(export|print|download)[A-Z]/.test(x.name)).map((x) => x.name),
    buttons: uniqBtn,
    calls: {
      exportExcel: count(/desktopApi\.exportExcel/g), importExcel: count(/desktopApi\.importExcel/g), savePdf: count(/desktopApi\.savePdf\b/g), savePdfHtml: count(/desktopApi\.savePdfHtml/g),
      saveFile: count(/desktopApi\.saveFile/g), exportArchive: count(/desktopApi\.exportArchive/g), windowPrint: count(/window\.print\(/g),
      pickAttachments: count(/desktopApi\.pickAttachments/g), openAttachment: count(/desktopApi\.openAttachment/g), deleteAttachment: count(/desktopApi\.deleteAttachment/g),
      saveData: count(/\bsaveData\(/g), addAudit: count(/\b(addAudit|lgAudit|logAudit)\(/g), confirmDelete: count(/confirmDelete\(/g), hasPagePermission: count(/hasPagePermission\(/g),
    },
  };
}

// --- الصفحات
const navPages = NAV.flatMap((s) => s.pages.map(([key, label]) => ({ section: s.id, sectionLabel: s.label, key, label })));
const allKeys = [...new Set([...navPages.map((p) => p.key), ...Object.keys(pageFn), ...PERM_PAGES])];
const pages = allKeys.map((key) => {
  const nav = navPages.find((p) => p.key === key);
  const pf = pageFn[key];
  const def = pf && fnDef[pf.fn] ? fnDef[pf.fn][0] : null;
  return {
    key, label: nav ? nav.label : null, section: nav ? nav.sectionLabel : null, inNavigation: !!nav, inPermissionMatrix: PERM_PAGES.includes(key),
    renderFn: pf ? pf.fn : null, aliasOf: pf ? pf.alias : null, definedAt: def ? `${def.file}:${def.line}` : null,
    tests: testsMentioning(`'${key}'`).concat(pf ? testsMentioning(pf.fn) : []).filter((v, i, a) => a.indexOf(v) === i),
  };
});

const out = { generatedFrom: 'renderer/ (static scan)', sections: NAV.map((s) => ({ id: s.id, label: s.label, pages: s.pages.map((p) => p[0]) })), pages, perFile,
  totals: { files: files.length, lines: Object.values(perFile).reduce((a, x) => a + x.lines, 0), functions: Object.values(perFile).reduce((a, x) => a + x.functions, 0),
    modals: Object.values(perFile).reduce((a, x) => a + x.modals.length, 0), buttonsWithId: Object.values(perFile).reduce((a, x) => a + x.buttons.length, 0),
    calcFns: Object.values(perFile).reduce((a, x) => a + x.calcs.length, 0), pages: pages.length, navPages: navPages.length, testFiles: Object.keys(tests).length } };
fs.mkdirSync(path.join(ROOT, 'docs/audit'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/audit/feature-inventory.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.totals));
console.log('pages without render fn:', pages.filter((p) => !p.renderFn).map((p) => p.key).join(', '));
console.log('pages without tests:', pages.filter((p) => !p.tests.length).map((p) => p.key).join(', '));
