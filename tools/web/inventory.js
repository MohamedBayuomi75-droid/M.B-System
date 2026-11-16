// A0 — جرد آلي: desktopApi + خريطة الـ collections + مقاييس الكود + (اختياري) أحجام data.json حقيقي.
// التشغيل:  npm run inventory            (يكتب في docs/web/)
//           DATA_JSON=/path/data.json npm run inventory   (يضيف تقرير الأحجام)
// الخريطة الديناميكية بتتولد بفتح الواجهة في Chromium (playwright) ببيانات فاضية وقراءة شكل DATA بعد التهيئة/الترحيلات.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/web');
fs.mkdirSync(OUT, { recursive: true });

function walk(dir, ext, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, acc); else if (p.endsWith(ext)) acc.push(p);
  }
  return acc;
}
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const rendererFiles = walk(path.join(ROOT, 'renderer'), '.js');
const src = Object.fromEntries(rendererFiles.map(f => [rel(f), fs.readFileSync(f, 'utf8')]));

/* ---------- 1) desktopApi ---------- */
const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
const exposed = [];
const reExp = /^\s{2}([a-zA-Z]+):\s*\(([^)]*)\)\s*=>\s*ipcRenderer\.(invoke|sendSync)\('([^']+)'/gm;
let m;
while ((m = reExp.exec(preload))) exposed.push({ name: m[1], args: m[2].trim(), kind: m[3], channel: m[4] });
const usage = {};
for (const [f, s] of Object.entries(src)) {
  const re = /desktopApi\??\.([a-zA-Z]+)/g; let mm;
  while ((mm = re.exec(s))) { const u = (usage[mm[1]] ||= { count: 0, files: {} }); u.count++; u.files[f] = (u.files[f] || 0) + 1; }
}
// تصنيف الويب لكل دالة (مقترح — يتراجع في A4)
const WEB = {
  loadData: ['data', 'GET /api/bootstrap'], saveData: ['data', 'POST /api/sync (diff)'], saveDataSync: ['data', 'fetch keepalive / sendBeacon → /api/sync'],
  snapshotData: ['backup', 'POST /api/backups (أدمن)'], backupNow: ['backup', 'POST /api/backups'], getExtraBackupDir: ['remove', 'لا ينطبق (النسخ على السيرفر)'],
  pickExtraBackupDir: ['remove', 'لا ينطبق'], clearExtraBackupDir: ['remove', 'لا ينطبق'], safetyBackup: ['backup', 'POST /api/backups (سبب)'],
  serverStart: ['remove', 'وضع الشبكة القديم يتلغى'], serverStop: ['remove', 'يتلغى'], serverStatus: ['remove', 'يتلغى'],
  openExternalLink: ['browser', 'window.open'], saveFile: ['browser', 'Blob + download'], openFile: ['browser', '<input type=file>'],
  savePdf: ['pdf', 'POST /api/pdf'], savePdfHtml: ['pdf', 'POST /api/pdf'], exportArchive: ['pdf', 'POST /api/archive (ZIP stream)'],
  getLockInfo: ['remove', 'لا ينطبق (السيرفر هو القفل)'], getDataPath: ['remove', 'لا ينطبق'], getDefaultDataPath: ['remove', 'لا ينطبق'],
  pickDataDir: ['remove', 'لا ينطبق'], setDataDir: ['remove', 'لا ينطبق'], resetDataDir: ['remove', 'لا ينطبق'],
  importExcel: ['browser', 'xlsx في المتصفح'], exportExcel: ['browser', 'xlsx في المتصفح'],
  pickAttachments: ['attach', 'input file + POST /api/attachments'], openAttachment: ['attach', 'GET /api/attachments/:id (signed URL)'],
  readAttachmentDataUrl: ['attach', 'GET /api/attachments/:id'], deleteAttachment: ['attach', 'DELETE /api/attachments/:id'],
  saveAttachmentBuffer: ['attach', 'POST /api/attachments'], cleanupOrphans: ['attach', 'POST /api/admin/attachments/cleanup (dry-run)'],
  scanWindows: ['attach', 'كاميرا / رفع PDF'], openWindowsScanApp: ['remove', 'لا ينطبق'], scanAttachment: ['attach', 'كاميرا / رفع PDF'],
  askPin: ['auth', 'يتراجع: صلاحيات السيرفر بدل PIN'], pickInstaller: ['remove', 'لا updater في الويب'], runInstaller: ['remove', 'لا ينطبق'],
  inspectUpdate: ['remove', 'لا ينطبق'], getAppVersion: ['data', 'GET /api/health (version)'],
  hashPassword: ['auth', 'POST /api/users (السيرفر يشفّر)'], verifyPassword: ['auth', 'POST /api/auth/login'],
};
const allNames = [...new Set([...exposed.map(e => e.name), ...Object.keys(usage)])].sort();
let md = `# جرد desktopApi (مولَّد آليًا — \`npm run inventory\`)\n\n`;
md += `- مُعرَّفة في \`preload.js\`: **${exposed.length}** دالة\n- مستخدمة في \`renderer/\`: **${Object.keys(usage).length}** اسم، **${Object.values(usage).reduce((a, u) => a + u.count, 0)}** مرجع\n`;
const missing = Object.keys(usage).filter(n => !exposed.find(e => e.name === n));
const unused = exposed.filter(e => !usage[e.name]).map(e => e.name);
md += `- ⚠️ مستخدمة ومش مُعرَّفة في preload (بتتجاهَل بصمت بشرط \`if(desktopApi.x)\`): ${missing.map(n => '`' + n + '`').join('، ') || 'لا يوجد'}\n`;
md += `- مُعرَّفة ومش مستخدمة بالاسم المباشر: ${unused.map(n => '`' + n + '`').join('، ') || 'لا يوجد'}\n\n`;
md += `| الدالة | المعاملات | IPC | مراجع | الملفات | فئة الويب | البديل المقترح في الويب |\n|---|---|---|---|---|---|---|\n`;
for (const n of allNames) {
  const e = exposed.find(x => x.name === n); const u = usage[n]; const w = WEB[n] || ['?', 'غير مصنّف'];
  const files = u ? Object.entries(u.files).map(([f, c]) => `${f.replace('renderer/', '')}×${c}`).join('<br>') : '—';
  md += `| \`${n}\` | ${e ? '`' + (e.args || '') + '`' : '—'} | ${e ? '`' + e.channel + '`' + (e.kind === 'sendSync' ? ' (sync)' : '') : '**غير موجودة**'} | ${u ? u.count : 0} | ${files} | ${w[0]} | ${w[1]} |\n`;
}
md += `\n**مفتاح الفئات:** data = طبقة البيانات (A3/A4) · auth = A2 · attach = A5 · pdf/backup = A6 · browser = بديل في المتصفح بدون سيرفر · remove = تتشال من نسخة الويب.\n`;
fs.writeFileSync(path.join(OUT, 'desktop-api-inventory.md'), md);
fs.writeFileSync(path.join(OUT, 'desktop-api-inventory.json'), JSON.stringify({ exposed, usage, missing, unused, web: WEB }, null, 2));

/* ---------- 2) مقاييس الكود ---------- */
const all = Object.values(src).join('\n');
const indexHtml = fs.readFileSync(path.join(ROOT, 'renderer/index.html'), 'utf8');
const metrics = {
  rendererJsFiles: rendererFiles.length,
  rendererJsLines: all.split('\n').length,
  scriptTags: (indexHtml.match(/<script/g) || []).length,
  dataRefs: (all.match(/\bDATA\.[a-zA-Z_]+/g) || []).length,
  saveDataCalls: (all.match(/\bsaveData\(/g) || []).length,
  innerHTMLAssignments: (all.match(/\.innerHTML\s*[+]?=/g) || []).length,
  insertAdjacentHTML: (all.match(/insertAdjacentHTML/g) || []).length,
  localStorageRefs: (all.match(/localStorage/g) || []).length,
  schemaVersion: +((src['renderer/core/data-store.js'] || '').match(/SCHEMA_VERSION\s*=\s*(\d+)/) || [])[1],
  linesByModule: {},
};
for (const [f, s] of Object.entries(src)) { const k = f.split('/').slice(1, f.startsWith('renderer/modules/') ? 3 : 2).join('/'); metrics.linesByModule[k] = (metrics.linesByModule[k] || 0) + s.split('\n').length; }
const lsKeys = {};
for (const s of Object.values(src)) { const re = /localStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g; let mm; while ((mm = re.exec(s))) lsKeys[mm[1]] = (lsKeys[mm[1]] || 0) + 1; }
metrics.localStorageKeys = lsKeys;

/* ---------- 3) مراجع DATA الثابتة (مستويين) ---------- */
const staticPaths = {};
for (const [f, s] of Object.entries(src)) {
  const re = /\bDATA\.([a-zA-Z_]+)(?:\.([a-zA-Z_]+))?/g; let mm;
  while ((mm = re.exec(s))) {
    const p = ['ledger', 'clients', 'warehouses', 'settings', 'customFieldDefs'].includes(mm[1]) && mm[2] ? mm[1] + '.' + mm[2] : mm[1];
    const o = (staticPaths[p] ||= { refs: 0, files: new Set() }); o.refs++; o.files.add(f.replace('renderer/', ''));
  }
}

/* ---------- 4) الشكل الديناميكي لـ DATA ---------- */
async function dynamicShape() {
  let openApp, baseUser;
  try { ({ openApp } = require(path.join(ROOT, 'tests-merge/harness'))); ({ baseUser } = require(path.join(ROOT, 'tests-merge/lib'))); }
  catch (e) { console.warn('playwright غير متاح — الخريطة ستكون ثابتة فقط:', e.message); return null; }
  const { browser, page } = await openApp({ users: [baseUser] });
  try {
    // زيارة كل الصفحات عشان أي ensure*Section كسول يتنفذ
    await page.evaluate(async () => { for (const p of (typeof HR_PAGES !== 'undefined' ? HR_PAGES : [])) { try { goToPage(p); } catch (e) {} await new Promise(r => setTimeout(r, 20)); } });
    return await page.evaluate(() => {
      const SECTIONS = ['ledger', 'clients', 'warehouses'];
      const out = [];
      const t = v => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
      for (const [k, v] of Object.entries(DATA)) {
        if (SECTIONS.includes(k) && v && typeof v === 'object') { for (const [k2, v2] of Object.entries(v)) out.push({ path: k + '.' + k2, type: t(v2) }); }
        else out.push({ path: k, type: t(v) });
      }
      return out;
    });
  } finally { await browser.close(); }
}

/* ---------- 5) أحجام data.json حقيقي (اختياري) ---------- */
function sizes(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = [];
  const visit = (v, p, depth) => {
    if (Array.isArray(v)) rows.push({ path: p, count: v.length, bytes: Buffer.byteLength(JSON.stringify(v)) });
    else if (v && typeof v === 'object' && depth < 2) for (const [k, x] of Object.entries(v)) visit(x, p ? p + '.' + k : k, depth + 1);
    else if (v && typeof v === 'object') rows.push({ path: p, count: Object.keys(v).length, bytes: Buffer.byteLength(JSON.stringify(v)) });
  };
  visit(d, '', 0);
  return { schemaVersion: d.schemaVersion, totalBytes: fs.statSync(file).size, rows: rows.sort((a, b) => b.bytes - a.bytes) };
}

(async () => {
  const dyn = await dynamicShape();
  // نوع المسار: من شكل DATA الفعلي، ولو مش موجود بعد التهيئة → من أنماط الإسناد في الكود
  const sniff = p => {
    const esc = p.replace(/\./g, '\\.');
    const re = new RegExp('DATA\\.' + esc + '\\s*(?:=|\\|\\|=?|\\?\\?=?)\\s*(?:DATA\\.' + esc + '\\s*\\|\\|\\s*)?(\\[|\\{|true|false|\\d|[\'"`])');
    for (const s of Object.values(src)) { const mm = s.match(re); if (mm) return mm[1] === '[' ? 'array' : mm[1] === '{' ? 'object' : 'scalar'; }
    // نمط كسول: DATA.x = (شرط) ? DATA.x : {}  أو []
    const lineRe = new RegExp('DATA\\.' + esc + '\\s*=(?!=)[^;\\n]*');
    for (const s of Object.values(src)) { const mm = s.match(lineRe); if (mm) { if (/:\s*\{\s*\}|\|\|\s*\{\s*\}/.test(mm[0])) return 'object'; if (/:\s*\[\s*\]|\|\|\s*\[\s*\]/.test(mm[0])) return 'array'; } }
    return null;
  };
  const LOOKUP = /(Categories|Types|TypeHidden|Hidden|Pool|Pools|Sections|FieldDefs|Separators|Catalog|FieldLabels)$|^ledger\.(custom|hidden)[A-Z]/;
  const classify = (p, type, fromRuntime) => {
    if (p === 'users' || p === 'auditLog') return 'system-table';
    if (type === 'scalar' || type === 'number' || type === 'boolean' || type === 'string') return 'meta-flag';
    if (type === 'array') return LOOKUP.test(p) ? 'lookup' : 'collection';
    if (type === 'object') return 'doc';
    return fromRuntime ? 'meta-flag' : 'legacy-ref';
  };
  const map = {};
  for (const e of dyn || []) map[e.path] = { kind: classify(e.path, e.type, true), source: 'runtime' };
  for (const [p0, o] of Object.entries(staticPaths)) {
    let p = p0;
    if (['ledger', 'clients', 'warehouses'].includes(p)) continue; // جذور الأقسام نفسها مش collections
    if (p.startsWith('settings.') || p.startsWith('customFieldDefs.')) p = p.split('.')[0]; // حقول داخل doc
    if (!map[p]) { const ty = sniff(p); map[p] = { kind: classify(p, ty, false), source: 'static' + (ty ? '' : ' (no init found)') }; }
    map[p].refs = (map[p].refs || 0) + o.refs; map[p].files = [...new Set([...(map[p].files || []), ...o.files])].sort();
  }
  // مفاتيح موجودة في data.json الحقيقي ومش في الكود/التهيئة
  if (process.env.DATA_JSON) {
    const real = JSON.parse(fs.readFileSync(process.env.DATA_JSON, 'utf8'));
    const t = v => Array.isArray(v) ? 'array' : v && typeof v === 'object' ? 'object' : 'scalar';
    for (const [k, v] of Object.entries(real)) {
      const sub = ['ledger', 'clients', 'warehouses'].includes(k) && v && typeof v === 'object' ? Object.entries(v).map(([k2, v2]) => [k + '.' + k2, v2]) : [[k, v]];
      for (const [p, val] of sub) {
        if (!map[p]) map[p] = { kind: classify(p, t(val), true), source: 'data.json' };
        else if (map[p].kind === 'legacy-ref') { map[p].kind = classify(p, t(val), true); map[p].source += ' + data.json'; }
      }
    }
  }
  // مسارات مولّدة لـ collection/doc
  const ordered = Object.keys(map).sort();
  const by = k => ordered.filter(x => map[x].kind === k);
  const unit = p => p.startsWith('ledger.') ? 'ledger' : p.startsWith('clients.') ? 'clients' : p.startsWith('warehouses.') ? 'warehouses' : ['users', 'auditLog'].includes(p) ? 'system' : ['settings', 'customFieldDefs', 'formLayouts', 'autoFields', 'deadFields', 'tableLayouts', 'formCols', 'customCards'].includes(p) ? 'config' : 'hr';
  const STORAGE = { collection: 'records (صف لكل سجل)', lookup: 'docs (قائمة مرجعية كاملة)', doc: 'docs (كائن كامل)', 'meta-flag': 'docs: meta (أعلام ترحيل/حالة)', 'system-table': 'جدول مخصص (users / audit_log)', 'legacy-ref': '— يتراجع (مقروء بس، مفيش تهيئة/كتابة في الكود)' };
  fs.writeFileSync(path.join(OUT, 'collections-map.json'), JSON.stringify({ generatedFrom: dyn ? 'runtime+static' : 'static', schemaVersion: metrics.schemaVersion, entries: Object.fromEntries(ordered.map(k => [k, { ...map[k], unit: unit(k), storage: STORAGE[map[k].kind] }])) }, null, 2));
  let cm = `# خريطة الـ collections (مولَّدة آليًا — \`npm run inventory\`)\n\n`;
  cm += `المصدر: ${dyn ? 'شكل `DATA` الفعلي بعد تهيئة الواجهة وزيارة كل الصفحات (runtime) + مراجع `DATA.*` وأنماط الإسناد في الكود (static)' : 'static فقط'}. SCHEMA_VERSION=${metrics.schemaVersion}.\n\n`;
  cm += `| النوع | العدد | التخزين المقترح |\n|---|---|---|\n` + Object.entries(STORAGE).map(([k, v]) => `| **${k}** | ${by(k).length} | ${v} |`).join('\n') + '\n\n';
  cm += `قواعد التصنيف: مصفوفة في المستوى الأعلى أو داخل قسم (\`ledger/clients/warehouses\`) = collection، إلا لو اسمها قائمة مرجعية (Categories/Types/Pool/Hidden/custom*...) = lookup. كائن = doc. قيمة بسيطة = meta-flag. **التصنيف مقترح ويتراجع في A3** (مثلًا lookup فيه سجلات بـ id ممكن يترقّى لـ collection).\n\n`;
  const leg = by('legacy-ref');
  if (leg.length) cm += `⚠️ **legacy-ref** — مقروءة في الكود ومفيش كود بيهيّأها${process.env.DATA_JSON ? '، ومش موجودة في data.json الحقيقي (fallback لمفاتيح قديمة — تتشال أو تتوثّق في A7' : ' (تتأكد من data.json الحقيقي'})): ${leg.map(k => '`' + k + '`').join('، ')}\n\n`;
  cm += `| المسار | النوع | الوحدة | مراجع \`DATA.\` | المصدر | ملفات |\n|---|---|---|---|---|---|\n`;
  for (const k of ordered) { const e = map[k]; cm += `| \`${k}\` | ${e.kind} | ${unit(k)} | ${e.refs || 0} | ${e.source} | ${(e.files || []).slice(0, 3).join(', ')}${(e.files || []).length > 3 ? ` +${e.files.length - 3}` : ''} |\n`; }
  cm += `\n> المراجع بتتعد على مستوى المفتاح الأعلى (أو \`قسم.مفتاح\`). المصفوفات الأعمق (مثل \`clients.customers[].projects\`) جزء من سجلها الأب في المسار A، وتتفك لجداول في Promotion (المسار B).\n`;
  fs.writeFileSync(path.join(OUT, 'collections-map.md'), cm);
  const unk = leg;
  const collections = by('collection'), docs = [...by('doc'), ...by('lookup')];

  let mt = `# مقاييس الكود (مولَّدة آليًا)\n\n| المقياس | القيمة |\n|---|---|\n`;
  for (const [k, v] of Object.entries(metrics)) if (typeof v !== 'object') mt += `| ${k} | ${v} |\n`;
  mt += `\n## الأسطر حسب الوحدة\n| الوحدة | أسطر |\n|---|---|\n` + Object.entries(metrics.linesByModule).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  mt += `\n\n## مفاتيح localStorage (تتراجع في A4 — أي مفتاح بيستخدم كمصدر بيانات لازم يتنقل للسيرفر)\n| المفتاح | مراجع |\n|---|---|\n` + Object.entries(lsKeys).map(([k, v]) => `| \`${k}\` | ${v} |`).join('\n') + '\n';
  if (process.env.DATA_JSON) {
    const s = sizes(process.env.DATA_JSON);
    mt += `\n## أحجام data.json الحقيقي\nschemaVersion=${s.schemaVersion}، الحجم الكلي ${(s.totalBytes / 1048576).toFixed(2)} MB\n\n| المسار | عدد | حجم (KB) |\n|---|---|---|\n` + s.rows.map(r => `| \`${r.path}\` | ${r.count} | ${(r.bytes / 1024).toFixed(1)} |`).join('\n') + '\n';
  } else mt += `\n## أحجام data.json الحقيقي\n⏳ لسه — محتاج نسخة \`data.json\` حقيقية. التشغيل: \`DATA_JSON=/path/data.json npm run inventory\`\n`;
  fs.writeFileSync(path.join(OUT, 'code-metrics.md'), mt);
  console.log(`desktopApi: ${exposed.length} exposed, ${Object.keys(usage).length} used, missing=${missing.join(',')}`);
  console.log(`collections=${collections.length} docs=${docs.length} unknown=${unk.length}`);
  console.log(JSON.stringify({ ...metrics, linesByModule: undefined, localStorageKeys: undefined }));
})().catch(e => { console.error(e); process.exit(1); });
