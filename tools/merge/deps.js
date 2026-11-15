/* deps.js — مين بيعتمد على مين: لكل ملف في الدفتر، الأسماء اللي بيقراها من برا ملفه */
const path = require('path');
const { parse, topLevelDecls, freeVariables, fs } = require('./jsast');
const LEDGER = process.argv[2]; const HR_DIRS = process.argv.slice(3);
const files = d => fs.readdirSync(d).filter(f => f.endsWith('.js')).map(f => path.join(d, f));
const defsLg = {}, defsHr = {}, freeByFile = {};
for (const f of files(LEDGER)) {
  const ast = parse(fs.readFileSync(f, 'utf8'), f);
  topLevelDecls(ast).forEach(d => (defsLg[d.name] = defsLg[d.name] || []).push(path.basename(f)));
  freeByFile[path.basename(f)] = freeVariables(ast);
}
for (const d of HR_DIRS) for (const f of files(d)) topLevelDecls(parse(fs.readFileSync(f, 'utf8'), f)).forEach(x => (defsHr[x.name] = defsHr[x.name] || []).push(path.basename(f)));
const BUILTIN = new Set(Object.getOwnPropertyNames(globalThis).concat('window document navigator localStorage sessionStorage location history console alert confirm prompt setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame fetch FileReader Blob URL Event CustomEvent MutationObserver ResizeObserver HTMLElement Node NodeList DOMParser FormData TextEncoder TextDecoder crypto performance getComputedStyle matchMedia Image atob btoa File KeyboardEvent MouseEvent Element Document XLSX Uint8Array arguments undefined'.split(' ')));
const result = {};
for (const [file, free] of Object.entries(freeByFile)) {
  for (const [n, c] of free) {
    const r = (result[n] = result[n] || { uses: {}, ledger: defsLg[n] || [], hr: defsHr[n] || [], builtin: BUILTIN.has(n) });
    r.uses[file] = (r.uses[file] || 0) + c;
  }
}
fs.writeFileSync(process.env.OUT || '/tmp/deps.json', JSON.stringify(result));
const rows = Object.entries(result);
const cat = { builtin: 0, ledgerOnly: 0, both: 0, hrOnly: 0, nowhere: 0 };
const nowhere = [];
rows.forEach(([n, r]) => {
  if (r.builtin && !r.ledger.length) cat.builtin++;
  else if (r.ledger.length && r.hr.length) cat.both++;
  else if (r.ledger.length) cat.ledgerOnly++;
  else if (r.hr.length) cat.hrOnly++;
  else { cat.nowhere++; nowhere.push(n); }
});
console.log(cat);
console.log('NOWHERE:', nowhere.join(' '));
