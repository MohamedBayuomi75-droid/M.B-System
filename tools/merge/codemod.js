/* =====================================================================
   codemod.js — نقل كود دفتر الموردين للبرنامج الموحّد (مرة واحدة)
   ---------------------------------------------------------------------
   التشغيل:   node --expose-internals tools/merge/codemod.js <config.json> [--report]

   بيعمل (بتحليل AST مش بالنص):
   1) يحذف التعريفات اللي هتتوفّر من البرنامج الموحّد (toHr) أو اللي مش محتاجينها (drop)
   2) يعيد تسمية أي اسم عام معرّف في الدفتر ومعرّف كمان في HR بإضافة بادئة (lg...) — في كل مكان
      بيتستخدم فيه (دوال، متغيرات، معاملات، خصائص مختصرة، window.x) — فسلوك الدفتر ما يتغيرش
   3) يحوّل DATA.<مفتاح بيانات الدفتر> إلى DATA.ledger.<مفتاح> (البيانات في قسم ledger بالملف الواحد)
   4) يضيف بادئة ledger. لمفاتيح الصلاحيات في hasPagePermission('invoices', ..)
   --report: بيطبع تقرير فقط من غير كتابة ملفات.
   ===================================================================== */
const path = require('path');
const { parse, topLevelDecls, variableIdentifiers, freeVariables, walk, fs } = require('./jsast');

const cfgPath = process.argv[2];
const REPORT = process.argv.includes('--report');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const base = path.dirname(path.resolve(cfgPath));
const R = (p) => path.resolve(base, p);

const jsFiles = (d) => fs.readdirSync(d).filter(f => f.endsWith('.js')).sort();


/** بداية التعليقات المتصلة مباشرة فوق موضع معيّن (بتقف عند أول سطر فاضي أو كود) */
function commentStart(code, pos) {
  let s = pos;
  for (;;) {
    let i = s;
    while (i > 0 && (code[i - 1] === ' ' || code[i - 1] === '\t')) i--;
    if (i === 0 || code[i - 1] !== '\n') break;
    const j = i - 1;                                   // موضع \n
    let k = j;
    while (k > 0 && code[k - 1] !== '\n') k--;
    const line = code.slice(k, j).trim();
    if (line.startsWith('//')) { s = k; continue; }
    if (line.endsWith('*/')) {
      const st = code.lastIndexOf('/*', j);
      if (st >= 0) {
        const body = code.slice(st, j);
        if (body.indexOf('*/') === body.lastIndexOf('*/') && body.trimEnd().endsWith('*/')) { s = st; continue; }
      }
    }
    break;
  }
  return s;
}

/* ---------- أسماء HR العامة ---------- */
const hrNames = new Set();
for (const d of cfg.hrDirs) for (const f of jsFiles(R(d))) topLevelDecls(parse(fs.readFileSync(path.join(R(d), f), 'utf8'), f)).forEach(x => hrNames.add(x.name));

/* ---------- مرحلة 1: قراءة الملفات وتحديد المحذوف ---------- */
const toHr = new Set(cfg.toHr || []);
const srcFiles = jsFiles(R(cfg.srcDir));
const units = {};          // file -> { code, ast, decls, deleted:[{start,end,names}], keptNames:Set }
for (const f of srcFiles) {
  const fc = cfg.files[f];
  if (fc === 'drop') continue;                      // الملف كله ما بيتنقلش
  if (!fc) throw new Error('ملف غير مصنّف في الـ config: ' + f);
  let code = fs.readFileSync(path.join(R(cfg.srcDir), f), 'utf8');
  for (const p of (fc.textPatches || [])) {                // استبدال نصي دقيق (لازم يطابق مرة واحدة بالظبط)
    const cnt = code.split(p.find).length - 1;
    if (cnt < 1 || (cnt !== 1 && !p.all)) throw new Error(f + ': textPatch لازم يطابق مرة واحدة (' + cnt + '): ' + p.find.slice(0, 70));
    code = code.split(p.find).join(p.replace);
  }
  const ast = parse(code, f);
  const decls = topLevelDecls(ast);
  const keepOnly = fc.keep ? new Set(fc.keep) : null;
  const dropSet = new Set([...(fc.drop || [])]);
  const deleted = [];
  const keptNames = new Set();
  const stmtNames = new Map();                       // statement node -> names declared
  for (const d of decls) { if (!stmtNames.has(d.node)) stmtNames.set(d.node, []); stmtNames.get(d.node).push(d.name); }
  for (const [node, names] of stmtNames) {
    const dropIt = names.every(n => toHr.has(n) || dropSet.has(n) || (keepOnly && !keepOnly.has(n)));
    if (dropIt) deleted.push({ start: node.start, end: node.end, names });
    else names.forEach(n => { if (!toHr.has(n) && !dropSet.has(n) && !(keepOnly && !keepOnly.has(n))) keptNames.add(n); });
  }
  // عبارات عليا مش تعريفات: نحذف اللي يطابق patterns
  const pats = (fc.dropStatements || []).map(s => new RegExp(s));
  // if(currentPage==='backup'){...} على مستوى بلوك: نحذفه كله
  const pageSet = new Set(fc.dropIfPageEquals || []);
  if (pageSet.size) walk.full(ast, (n) => {
    if (n.type === 'IfStatement' && n.test.type === 'BinaryExpression' && ['==', '==='].includes(n.test.operator)) {
      const l = n.test.left, r = n.test.right;
      const ok = (l.type === 'Identifier' && l.name === 'currentPage' && r.type === 'Literal' && pageSet.has(r.value));
      if (ok) deleted.push({ start: n.start, end: n.end, names: ['<if ' + r.value + '>'], ifBlock: true });
    }
  });
  const loose = [];
  for (const n of ast.body) {
    if (['FunctionDeclaration', 'ClassDeclaration', 'VariableDeclaration'].includes(n.type)) continue;
    const text = code.slice(n.start, n.end);
    if (pats.some(p => p.test(text))) deleted.push({ start: n.start, end: n.end, names: ['<stmt>'] });
    else loose.push(text.split('\n')[0].slice(0, 90));
  }
  units[f] = { code, ast, deleted, keptNames, loose, fc };
}

/* ---------- مرحلة 2: خريطة إعادة التسمية ---------- */
const prefix = cfg.prefix || 'lg';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function newName(n) {
  if (cfg.rename && cfg.rename[n]) return cfg.rename[n];
  if (/^[A-Z0-9_]+$/.test(n)) return prefix.toUpperCase() + '_' + n;
  if (n.startsWith('__')) return '__' + prefix + cap(n.slice(2));
  return prefix + cap(n);
}
const renameMap = {};
const allKept = new Set();
for (const u of Object.values(units)) u.keptNames.forEach(n => allKept.add(n));
for (const n of allKept) if (hrNames.has(n) || (cfg.forceRename || []).includes(n)) renameMap[n] = newName(n);
// إعادة تسمية مراجع فقط (حتى لو التعريف محذوف): مثل render → lgRender
for (const [k, v] of Object.entries(cfg.extraRename || {})) renameMap[k] = v;
// فحص التصادم: الاسم الجديد ما يكونش موجود في الدفتر ولا HR
const used = new Set();
for (const u of Object.values(units)) variableIdentifiers(u.ast).forEach(v => used.add(v.name));
const clash = Object.entries(renameMap).filter(([k, nn]) => !(cfg.extraRename && cfg.extraRename[k]) && (used.has(nn) || hrNames.has(nn) || Object.values(renameMap).filter(x => x === nn).length > 1)).map(e => e[1]);
if (clash.length) { console.error('تصادم في الأسماء الجديدة:', clash); process.exit(1); }

/* ---------- مرحلة 3: تقرير الاعتماديات ---------- */
const keptSet = new Set(allKept);
const lgDeclaredAnywhere = new Set();       // كل اللي اتعرّف في ملفات الدفتر الأصلية (حتى المحذوف)
for (const f of srcFiles) { const code = fs.readFileSync(path.join(R(cfg.srcDir), f), 'utf8'); topLevelDecls(parse(code, f)).forEach(d => lgDeclaredAnywhere.add(d.name)); }
const unsatisfied = {};
const BUILTIN = new Set(Object.getOwnPropertyNames(globalThis).concat((cfg.extraGlobals || [])).concat('window document navigator localStorage sessionStorage location history console alert confirm prompt setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame fetch FileReader Blob URL Event CustomEvent MutationObserver ResizeObserver HTMLElement Node NodeList DOMParser FormData TextEncoder TextDecoder crypto performance getComputedStyle matchMedia Image atob btoa File KeyboardEvent MouseEvent Element Document XLSX Uint8Array arguments undefined'.split(' ')));
for (const [f, u] of Object.entries(units)) {
  const deletedRanges = u.deleted;
  const free = freeVariables(u.ast);                // (بيشمل الأسماء المحذوفة؛ هنخصم المراجع الموجودة جوه نطاقات محذوفة تقريباً بالتحليل أدناه)
  // مراجع داخل الأجزاء المحذوفة ما تهمّناش: نعيد الحساب على الكود بعد الحذف
  let code = u.code;
  const sorted = deletedRanges.slice().sort((a, b) => b.start - a.start);
  for (const d of sorted) code = code.slice(0, d.start) + ' '.repeat(0) + code.slice(d.end);
  let ast2; try { ast2 = parse(code, f + ' (after delete)'); } catch (e) { console.error('parse after delete failed for', f, e.message); process.exit(1); }
  const free2 = freeVariables(ast2);
  for (const [n, c] of free2) {
    if (keptSet.has(n) || BUILTIN.has(n)) continue;            // معرّف في الدفتر (باقي) أو builtin
    if (hrNames.has(n)) continue;                               // HR بيوفّره
    (unsatisfied[n] = unsatisfied[n] || {})[f] = c;
  }
}
const droppedButHr = {};
for (const [f, u] of Object.entries(units)) {
  let code = u.code; const sorted = u.deleted.slice().sort((a, b) => b.start - a.start);
  for (const d of sorted) code = code.slice(0, d.start) + code.slice(d.end);
  for (const [n, c] of freeVariables(parse(code, f + ' (after delete)'))) {
    if (!keptSet.has(n) && !BUILTIN.has(n) && hrNames.has(n) && lgDeclaredAnywhere.has(n) && !renameMap[n]) (droppedButHr[n] = droppedButHr[n] || []).push(f + ':' + c);
  }
}
console.log('DROPPED-in-ledger but defined by HR (kept code now uses HR\'s version):');
console.log('  ' + Object.entries(droppedButHr).map(([n, v]) => n + '(' + v.join(',') + ')').join('  '));
console.log('kept declarations:', allKept.size, ' renamed:', Object.keys(renameMap).length, ' toHr:', toHr.size);
console.log('UNSATISFIED (used by kept code, not provided by kept code / HR / builtin):');
Object.entries(unsatisfied).forEach(([n, fs_]) => console.log('  ', n, JSON.stringify(fs_), lgDeclaredAnywhere.has(n) ? '[ledger-dropped]' : '[unknown]'));
console.log('LOOSE top-level statements kept:');
for (const [f, u] of Object.entries(units)) u.loose.forEach(l => console.log('  ', f + ':', l));
if (REPORT) { fs.writeFileSync(R(cfg.reportFile || 'rename-map.json'), JSON.stringify(renameMap, null, 1)); process.exit(0); }

/* ---------- مرحلة 4: التطبيق ---------- */
const domainKeys = new Set(cfg.domainKeys || []);
const permPrefix = cfg.permPrefix || '';
const permFns = new Set(cfg.permFunctions || ['hasPagePermission']);
fs.mkdirSync(R(cfg.outDir), { recursive: true });
const notes = [];
for (const [f, u] of Object.entries(units)) {
  const edits = [];                                    // {start,end,text}
  const insideDeleted = (pos) => u.deleted.some(d => pos >= d.start && pos < d.end);
  // حذف + التعليقات اللي فوقها مباشرة
  for (const d of u.deleted) {
    const s = commentStart(u.code, d.start);          // التعليقات المتصلة قبل التعريف (من غير سطر فاضي بينهم)
    d.start2 = s;
    edits.push({ start: s, end: d.end, text: '' });
  }
  const inDel = (pos) => u.deleted.some(d => pos >= d.start2 && pos < d.end);
  // إعادة تسمية المتغيرات
  for (const v of variableIdentifiers(u.ast)) {
    const nn = renameMap[v.name];
    if (!nn || inDel(v.node.start)) continue;
    if (v.prop) {                                      // خاصية مختصرة {x} / {x = 1}
      const p = v.prop;
      if (p.value.type === 'AssignmentPattern') edits.push({ start: p.value.left.start, end: p.value.left.end, text: v.name + ': ' + nn });
      else edits.push({ start: p.start, end: p.end, text: v.name + ': ' + nn });
    } else edits.push({ start: v.node.start, end: v.node.end, text: nn });
  }
  // window.x و window['x']
  walk.full(u.ast, (n) => {
    if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'window' && !inDel(n.start)) {
      if (!n.computed && renameMap[n.property.name]) edits.push({ start: n.property.start, end: n.property.end, text: renameMap[n.property.name] });
      else if (n.computed && n.property.type === 'Literal' && typeof n.property.value === 'string' && renameMap[n.property.value]) edits.push({ start: n.property.start, end: n.property.end, text: JSON.stringify(renameMap[n.property.value]) });
    }
    // DATA.<key> -> DATA.ledger.<key>
    if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'DATA' && !inDel(n.start)) {
      if (!n.computed && domainKeys.has(n.property.name)) edits.push({ start: n.object.end, end: n.object.end, text: '.ledger' });
      else if (n.computed) notes.push(f + ': DATA[...] computed access @' + u.code.slice(0, n.start).split('\n').length + ' → ' + u.code.slice(n.start, n.end).slice(0, 60));
    }
    // صلاحيات الصفحات
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && permFns.has(n.callee.name) && permPrefix && !inDel(n.start)) {
      const a = n.arguments[0];
      if (a && a.type === 'Literal' && typeof a.value === 'string') edits.push({ start: a.start, end: a.end, text: JSON.stringify(permPrefix + a.value) });
      else notes.push(f + ': ' + n.callee.name + '(non-literal) @' + u.code.slice(0, n.start).split('\n').length);
    }
  });
  // استخدامات DATA كاسم لوحده (مش DATA.x)
  const memberObjs = new Set();
  walk.full(u.ast, (n) => { if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'DATA') memberObjs.add(n.object); });
  for (const v of variableIdentifiers(u.ast)) if (v.name === 'DATA' && !memberObjs.has(v.node) && !inDel(v.node.start)) notes.push(f + ': bare DATA @' + u.code.slice(0, v.node.start).split('\n').length + ' → ' + u.code.slice(Math.max(0, v.node.start - 25), v.node.end + 25).replace(/\n/g, ' '));
  // تطبيق التعديلات من الآخر للأول (مع تجاهل المتداخل)
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = u.code, lastStart = Infinity;
  for (const e of edits) {
    if (e.end > lastStart) continue;                   // داخل تعديل أكبر
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    lastStart = e.start;
  }
  out = out.replace(/\n{3,}/g, '\n\n');
  const header = '/* (الموحّد) مولَّد بالـ codemod من دفتر الموردين — ' + f + ' — الملف ده بقى مصدر الحقيقة، عدّل فيه مباشرة */\n';
  fs.writeFileSync(path.join(R(cfg.outDir), (cfg.files[f].out || f)), header + out);
}
fs.writeFileSync(R(cfg.reportFile || 'rename-map.json'), JSON.stringify(renameMap, null, 1));
console.log('\nNOTES (needs a look):'); notes.forEach(n => console.log('  ', n));
console.log('written to', cfg.outDir);
