/* analyze.js — جرد كود الدفتر: الإعلانات العامة، والأسماء اللي بيستخدمها من برا ملفاته */
const path = require('path');
const { parse, topLevelDecls, variableIdentifiers, walk, fs } = require('./jsast');

const LEDGER = process.argv[2];
const HR_DIRS = process.argv.slice(3);
function files(d) { return fs.readdirSync(d).filter(f => f.endsWith('.js')).map(f => path.join(d, f)); }

const lg = {};            // name -> [{file, kind}]
const lgFiles = files(LEDGER);
const parsed = {};
for (const f of lgFiles) {
  const code = fs.readFileSync(f, 'utf8');
  const ast = parse(code, f);
  parsed[f] = { ast, code };
  for (const d of topLevelDecls(ast)) (lg[d.name] = lg[d.name] || []).push({ file: path.basename(f), kind: d.kind });
}
const hr = {};
for (const d of HR_DIRS) for (const f of files(d)) {
  const ast = parse(fs.readFileSync(f, 'utf8'), f);
  for (const x of topLevelDecls(ast)) (hr[x.name] = hr[x.name] || []).push({ file: path.basename(f), kind: x.kind });
}
// أسماء المتصفح/اللغة (مش محتاجة تعريف)
const BUILTIN = new Set(Object.getOwnPropertyNames(globalThis).concat(['window','document','navigator','localStorage','sessionStorage','location','history','console','alert','confirm','prompt','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','fetch','FileReader','Blob','URL','Event','CustomEvent','MutationObserver','ResizeObserver','IntersectionObserver','HTMLElement','Node','NodeList','DOMParser','XMLHttpRequest','FormData','AbortController','TextEncoder','TextDecoder','crypto','performance','Intl','getComputedStyle','matchMedia','Image','Audio','atob','btoa','encodeURIComponent','decodeURIComponent','structuredClone','queueMicrotask','screen','innerWidth','innerHeight','arguments','undefined','Infinity','NaN','Storage','File','KeyboardEvent','MouseEvent','Element','Document','XLSX','Uint8Array','ArrayBuffer','DataView','Symbol','Reflect','Proxy','WeakMap','WeakSet','Map','Set','BigInt','escape','unescape']));

// الأسماء المستخدمة (مراجع) في كل ملف
const refs = {};   // file -> Map(name -> count)
for (const f of lgFiles) {
  const m = new Map();
  for (const v of variableIdentifiers(parsed[f].ast)) m.set(v.name, (m.get(v.name) || 0) + 1);
  refs[path.basename(f)] = m;
}
const out = { files: {}, conflicts: [], notDefinedAnywhere: {} };
for (const f of lgFiles) {
  const b = path.basename(f);
  out.files[b] = { lines: parsed[f].code.split('\n').length, decls: Object.keys(lg).filter(n => lg[n].some(x => x.file === b)).length };
}
for (const n of Object.keys(lg)) if (hr[n]) out.conflicts.push({ name: n, ledger: lg[n].map(x => x.file + ':' + x.kind).join(','), hr: hr[n].map(x => x.file + ':' + x.kind).join(',') });
// أسماء بتتستخدم في الدفتر ومش معرّفة في ملفات الدفتر ولا في HR ولا builtin (محتاجة shim أو بتتعرّف محلياً كـ local)
const used = new Map();
for (const [file, m] of Object.entries(refs)) for (const [n, c] of m) { used.set(n, (used.get(n) || 0) + c); }
for (const [n, c] of used) {
  if (lg[n] || hr[n] || BUILTIN.has(n)) continue;
  out.notDefinedAnywhere[n] = c;
}
fs.writeFileSync(process.argv[2].replace(/\/?$/, '') + '/../../../analysis.json', JSON.stringify(out, null, 1));
console.log('ledger files:', lgFiles.length, ' ledger top-level names:', Object.keys(lg).length, ' HR top-level names:', Object.keys(hr).length);
console.log('names in BOTH:', out.conflicts.length);
console.log('used but defined nowhere (locals/params excluded? no — raw):', Object.keys(out.notDefinedAnywhere).length);
