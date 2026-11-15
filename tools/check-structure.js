#!/usr/bin/env node
/* =====================================================================
   check-structure.js — فحص سلامة هيكل المشروع (من غير أي مكتبات)
   التشغيل:  npm run check
   ---------------------------------------------------------------------
   بيتأكد من:
     1) كل ملف <script> في index.html موجود، ومفيش تكرار
     2) كل ملف JS جوه renderer/core و renderer/modules متسجّل في index.html
     3) ترتيب التحميل: config.js الأول، modules.js قبل app.js، و app.js الأخير
     4) صحة الـ syntax لكل ملفات JS (renderer + العملية الرئيسية)
     5) اتساق الاسم: package.json = config.js = <title> = brand.js
     6) سجل الوحدات: مفاتيح الصفحات فريدة، وبادئة كل وحدة صحيحة
     7) كل require('./...') في العملية الرئيسية بيشاور على ملف موجود
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const R = (...p) => path.join(ROOT, ...p);
const read = (p) => fs.readFileSync(p, 'utf8');

let failures = 0;
let passes = 0;
function ok(msg) { passes++; console.log('  \u2713 ' + msg); }
function bad(msg) { failures++; console.log('  \u2717 ' + msg); }
function check(cond, okMsg, badMsg) { cond ? ok(okMsg) : bad(badMsg || okMsg); }
function section(t) { console.log('\n' + t); }

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/* ---------- 1 + 2 + 3: index.html ---------- */
section('[1] index.html scripts');
const html = read(R('renderer', 'index.html'));
const srcs = [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)].map(m => m[1]);
check(srcs.length > 0, srcs.length + ' script tags found', 'no script tags found');

const seen = new Set();
let dup = false;
for (const s of srcs) { if (seen.has(s)) { dup = true; bad('duplicate script: ' + s); } seen.add(s); }
if (!dup) ok('no duplicate scripts');

let missing = 0;
for (const s of srcs) {
  if (!fs.existsSync(R('renderer', s))) { missing++; bad('missing file: renderer/' + s); }
}
if (!missing) ok('all referenced script files exist');

section('[2] every renderer JS file is registered');
const allRendererJs = walk(R('renderer', 'core')).concat(walk(R('renderer', 'modules')))
  .filter(f => f.endsWith('.js')).map(f => path.relative(R('renderer'), f).split(path.sep).join('/'));
const unregistered = allRendererJs.filter(f => !seen.has(f));
check(unregistered.length === 0, allRendererJs.length + ' renderer JS files, all registered',
  'not registered in index.html: ' + unregistered.join(', '));

section('[2b] merged ledger module (codemod output + glue)');
const ledgerDir = R('renderer', 'modules', 'ledger');
const ledgerJs = fs.readdirSync(ledgerDir).filter(f => f.endsWith('.js'));
check(ledgerJs.includes('glue.js') && ledgerJs.length >= 10, ledgerJs.length + ' ledger JS files incl. glue.js', 'ledger module files missing');
const idxLedger = srcs.map((s, i) => [s, i]).filter(([s]) => s.startsWith('modules/ledger/')).map(([, i]) => i);
const idxMod = srcs.indexOf('core/modules.js');
const lastHr = Math.max(...srcs.map((s, i) => s.startsWith('modules/hr/') ? i : -1));
check(idxLedger.length && Math.min(...idxLedger) > lastHr && Math.max(...idxLedger) < idxMod, 'ledger scripts load after HR scripts and before modules.js', 'ledger scripts must load between the HR scripts and core/modules.js');
check(srcs[Math.max(...idxLedger)] === 'modules/ledger/glue.js', 'glue.js is the last ledger script', 'glue.js must load after all generated ledger files');
check(/modules\/ledger\/ledger\.css/.test(html), 'ledger.css is linked from index.html', 'index.html must link modules/ledger/ledger.css');
// بيانات الدفتر كلها لازم تتقرا من DATA.ledger — مفيش وصول مباشر لمفاتيح الدفتر من DATA
const domainKeys = (read(path.join(ledgerDir, 'glue.js')).match(/LEDGER_DOMAIN_KEYS\s*=\s*\[([\s\S]*?)\]/) || [, ''])[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
const directAccess = [];
for (const f of ledgerJs) {
  const code = read(path.join(ledgerDir, f)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const re = new RegExp('\\bDATA\\.(' + domainKeys.join('|') + ')\\b', 'g');
  if (re.test(code)) directAccess.push(f);
}
check(directAccess.length === 0, 'ledger code never reads its keys straight from DATA (all via DATA.ledger)', 'direct DATA.<ledger key> access in: ' + directAccess.join(', '));
// تصادم أسماء عامة بين الدفتر وباقي البرنامج
const declRe = /^(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)|^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
const declsOf = (files) => { const m = new Map(); for (const f of files) { const c = read(f); let x; declRe.lastIndex = 0; while ((x = declRe.exec(c))) { const n = x[1] || x[2]; (m.get(n) || m.set(n, []).get(n)).push(rel(f)); } } return m; };
const hrDecl = declsOf(walk(R('renderer', 'core')).concat(walk(R('renderer', 'modules', 'hr'))).filter(f => f.endsWith('.js')));
const lgDecl = declsOf(ledgerJs.map(f => path.join(ledgerDir, f)));
const clashes = [...lgDecl.keys()].filter(n => hrDecl.has(n));
check(clashes.length === 0, 'no global name is declared in both the ledger and the rest of the program (' + lgDecl.size + ' ledger names)', 'global name clashes: ' + clashes.slice(0, 12).join(', '));
check(fs.existsSync(R('tools', 'merge', 'ledger-merge.config.json')) && fs.existsSync(R('tools', 'merge', 'rename-map.json')), 'codemod config + rename map are kept for reference', 'tools/merge config/rename map missing');

section('[3] load order');
check(srcs[0] === 'core/config.js', 'config.js loads first', 'config.js must be the first script');
check(srcs[srcs.length - 1] === 'core/app.js', 'app.js loads last', 'app.js must be the last script');
const iMod = srcs.indexOf('core/modules.js'), iApp = srcs.indexOf('core/app.js');
check(iMod >= 0 && iMod < iApp, 'modules.js loads before app.js', 'modules.js must load before app.js');
const iState = srcs.indexOf('core/state.js');
check(iState >= 0 && iState < srcs.indexOf('core/data-store.js'), 'state.js loads before data-store.js', 'state.js must load before data-store.js');

/* ---------- 4: syntax ---------- */
section('[4] syntax (all JS files)');
const jsFiles = walk(R('renderer')).filter(f => f.endsWith('.js'))
  .concat(['main.js', 'preload.js'].map(f => R(f)))
  .concat(walk(R('src')).filter(f => f.endsWith('.js')))
  .concat(walk(R('tools')).filter(f => f.endsWith('.js')));
let syntaxBad = 0;
for (const f of jsFiles) {
  try { new vm.Script(read(f), { filename: f }); }
  catch (e) { syntaxBad++; bad('syntax error in ' + rel(f) + ': ' + e.message); }
}
if (!syntaxBad) ok(jsFiles.length + ' files parsed without syntax errors');

/* ---------- 5: brand ---------- */
section('[5] brand consistency');
const pkg = JSON.parse(read(R('package.json')));
const cfg = read(R('renderer', 'core', 'config.js'));
const cfgName = (cfg.match(/name:\s*'([^']+)'/) || [])[1];
const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
check(pkg.productName === cfgName, 'package.json productName == config.js name ("' + cfgName + '")',
  'productName "' + pkg.productName + '" != config.js name "' + cfgName + '"');
check(pkg.build && pkg.build.productName === pkg.productName, 'build.productName matches productName',
  'build.productName differs from productName');
check(title === cfgName, '<title> matches config.js name', '<title> "' + title + '" != config.js name "' + cfgName + '"');
const brandJs = read(R('src', 'main', 'brand.js'));
const pkgNameInBrand = (brandJs.match(/PACKAGE_NAME\s*=\s*'([^']+)'/) || [])[1];
check(pkg.name === pkgNameInBrand, 'package.json name == brand.js PACKAGE_NAME ("' + pkg.name + '") — needed by the updater guard',
  'package.json name "' + pkg.name + '" != brand.js PACKAGE_NAME "' + pkgNameInBrand + '"');
check(pkg.build.extraMetadata && pkg.build.extraMetadata.name === pkg.name, 'build.extraMetadata.name matches package name',
  'build.extraMetadata.name differs from package name');

/* ---------- 6: module registry ---------- */
section('[6] navigation design (sections + pages)');
try {
  const sandbox = { escapeHtml: (s) => s, navBtn: () => '', goToPage: () => {}, currentPage: 'dashboard' };
  vm.createContext(sandbox);
  vm.runInContext(read(R('renderer', 'core', 'modules.js')) + '\n;this.__S = NAV_SECTIONS; this.__PH = PLACEHOLDER_PAGES; this.__HID = HR_HIDDEN_PAGES; this.__sec = sectionOfPage; this.__mod = moduleOfPage; this.__isPh = isPlaceholderPage;', sandbox);
  const S = sandbox.__S, PH = sandbox.__PH;
  const expectedIds = ['general', 'tasks', 'hr', 'clients', 'suppliers', 'warehouses', 'movements', 'accounts', 'reports', 'archive', 'settings'];
  check(JSON.stringify(S.map(s => s.id)) === JSON.stringify(expectedIds), S.length + ' sections in the designed order', 'sections differ from the design: ' + S.map(s => s.id).join(','));

  const keys = new Map(); let problems = 0;
  for (const s of S) for (const p of s.pages) {
    if (keys.has(p[0])) { problems++; bad('page key "' + p[0] + '" is in two sections (' + keys.get(p[0]) + ' / ' + s.id + ')'); }
    keys.set(p[0], s.id);
  }
  if (!problems) ok(keys.size + ' page keys, each in exactly one section');

  const appSrc = read(R('renderer', 'core', 'app.js'));
  const hrOriginal = ['dashboard', 'employees', 'supervisors', 'workers', 'drivers', 'equipment', 'projects', 'departments', 'attendance', 'workerAttendance', 'workerDues', 'expenses', 'costs', 'leaves', 'performance', 'transfers', 'reports', 'archive', 'users', 'backup'];
  const missingHr = hrOriginal.filter(k => !keys.has(k) && k !== 'departments' /* اتلغت: بقت لوحات الموارد البشرية */);
  check(missingHr.length === 0, 'all 20 original HR pages are reachable from the navigation', 'HR pages missing from the navigation: ' + missingHr.join(', '));
  const undotted = [...keys.keys()].filter(k => !k.includes('.'));
  const notHr = undotted.filter(k => !hrOriginal.includes(k) && k !== 'hrHome');
  check(notHr.length === 0, 'unprefixed keys are only original HR pages', 'unprefixed non-HR keys: ' + notHr.join(', '));
  const prefixes = new Set(['general', 'tasks', 'ledger', 'clients', 'warehouses', 'accounts']);
  const badPrefix = [...keys.keys()].filter(k => k.includes('.') && !prefixes.has(k.split('.')[0]));
  check(badPrefix.length === 0, 'every prefixed key uses a known source prefix', 'unknown prefix: ' + badPrefix.join(', '));

  // كل صفحة مركّبة: إما ليها كود حقيقي أو في قائمة قيد الدمج (ومش الاتنين)
  const glueSrc = read(R('renderer', 'modules', 'ledger', 'glue.js'));
  const gp = (glueSrc.match(/LEDGER_PAGES\s*=\s*\[([\s\S]*?)\]/) || [, ''])[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
  const ledgerKeys = [...keys.keys()].filter(k => k.startsWith('ledger.')).map(k => k.slice(7)).sort();
  check(JSON.stringify(ledgerKeys) === JSON.stringify(gp.filter(k => k !== 'dashboard').sort()), 'glue.js LEDGER_PAGES == the ledger pages in the navigation', 'LEDGER_PAGES (' + gp + ') != navigation (' + ledgerKeys + ')');
  // صفحات منفّذة فعلياً: نظرة عامة + دفتر + أي صفحة ليها case في app.js
  const appCases = new Set([...(appSrc.matchAll(/case\s+'([^']+)'/g) || [])].map(m => m[1]));
  const realDotted = new Set([
    'general.overview',
    ...[...keys.keys()].filter(k => k.startsWith('ledger.')),
    ...[...keys.keys()].filter(k => k.includes('.') && appCases.has(k))
  ]);
  const unresolved = [...keys.keys()].filter(k => k.includes('.') && !realDotted.has(k) && !PH[k]);
  check(unresolved.length === 0, 'every prefixed page is either implemented or a "قيد الدمج" placeholder', 'neither implemented nor placeholder: ' + unresolved.join(', '));
  const both = Object.keys(PH).filter(k => realDotted.has(k));
  check(both.length === 0, 'no page is both implemented and a placeholder', 'implemented AND placeholder: ' + both.join(', '));
  const orphanPh = Object.keys(PH).filter(k => !keys.has(k));
  check(orphanPh.length === 0, 'every placeholder is in the navigation', 'placeholder not in navigation: ' + orphanPh.join(', '));
  check(/case 'general\.overview'|currentPage\s*===\s*'general\.overview'/.test(appSrc), 'general.overview has a renderer in app.js', 'app.js must route general.overview');

  const permsSrc = read(R('renderer', 'core', 'permissions.js'));
  const usersSrc = read(R('renderer', 'core', 'pages-users.js'));
  const noPerm = [...keys.keys()].filter(k => k !== 'hrHome' && !permsSrc.includes("'" + k + "'"));
  check(noPerm.length === 0, 'every navigation page is in the permission matrix', 'missing from HR_PAGES: ' + noPerm.join(', '));
  const noLabel = [...keys.keys()].filter(k => k.includes('.') && !usersSrc.includes("'" + k + "'"));
  check(noLabel.length === 0, 'every prefixed page has a label in the users matrix', 'missing label in pages-users.js: ' + noLabel.join(', '));
  check(sandbox.__sec('employeeDetail').id === 'hr' && sandbox.__mod('ledger.invoices').id === 'ledger' && sandbox.__mod('employees').id === 'hr', 'sectionOfPage / moduleOfPage resolve correctly', 'section/module resolution is wrong');
} catch (e) {
  bad('navigation registry failed to load: ' + e.message);
}

/* ---------- 7: main-process requires ---------- */
section('[7] main-process requires');
const mainFiles = ['main.js', 'preload.js'].map(f => R(f)).concat(walk(R('src')).filter(f => f.endsWith('.js')));
let reqBad = 0, reqCount = 0;
for (const f of mainFiles) {
  const code = read(f);
  for (const m of code.matchAll(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
    reqCount++;
    const target = path.resolve(path.dirname(f), m[1]);
    const exists = fs.existsSync(target) || fs.existsSync(target + '.js') || fs.existsSync(target + '.json');
    if (!exists) { reqBad++; bad(rel(f) + ' requires missing file: ' + m[1]); }
  }
}
if (!reqBad) ok(reqCount + ' relative requires all resolve');


/* ---------- 8: security & data-layout invariants ---------- */
section('[8] security + data layout');
const rendererJs = walk(R('renderer')).filter(f => f.endsWith('.js'));
const plainDefaults = rendererJs.filter(f => /password\s*:\s*['"](admin123|123456)['"]/.test(read(f)));
check(plainDefaults.length === 0, 'no plaintext default password in renderer code',
  'plaintext default password found in: ' + plainDefaults.map(rel).join(', '));
const preloadSrc = read(R('preload.js'));
check(/hashPassword/.test(preloadSrc) && /verifyPassword/.test(preloadSrc), 'preload exposes hashPassword/verifyPassword', 'preload.js must expose hashPassword + verifyPassword');
check(/require\('\.\/src\/main\/auth'\)/.test(read(R('main.js'))), 'main.js loads the auth IPC handlers', 'main.js must require ./src/main/auth');
const ds = read(R('renderer', 'core', 'data-store.js'));
const schemaV = Number((ds.match(/const SCHEMA_VERSION\s*=\s*(\d+)/) || [])[1]);
const migKeys = [...ds.matchAll(/^\s{2}(\d+):\s*function/gm)].map(m => Number(m[1]));
check(schemaV && schemaV === Math.max(...migKeys), 'SCHEMA_VERSION (' + schemaV + ') equals the latest migration', 'SCHEMA_VERSION ' + schemaV + ' != latest migration ' + Math.max(...migKeys));
const stateSrc = read(R('renderer', 'core', 'state.js'));
check(/ledger:\s*\{\}/.test(stateSrc) && /clients:\s*\{\}/.test(stateSrc), 'DATA has ledger + clients sections', 'state.js DATA must define ledger and clients sections');
const hasWh = /warehouses:\s*\{\}/.test(stateSrc) || /ensureWarehousesSection/.test(ds);
check(hasWh, 'DATA has warehouses section (state or ensureWarehousesSection)', 'warehouses section missing');

/* ---------- summary ---------- */
console.log('\n' + (failures ? '\u2717 FAILED' : '\u2713 ALL CHECKS PASSED') + '  (' + passes + ' passed, ' + failures + ' failed)');
process.exit(failures ? 1 : 0);
