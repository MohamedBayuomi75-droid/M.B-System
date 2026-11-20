// مصفوفة قدرات Electron (خطة v1.4.5 — المرحلة 3، البند 3.8؛ 03 §8). قراءة بس.
// المصادر: docs/web/desktop-api-inventory.json (الدوال المعرّفة في preload.js ومراجعها في renderer/ والبديل المقترح)
//          + web/web-api.js (البديل الفعلي في نسخة الويب) + src/main/*.js (قنوات IPC والتكامل مع الويندوز)
// المخرج: docs/discovery/ELECTRON_CAPABILITIES.md   التشغيل: node tools/discovery/build-electron-capabilities.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const inv = JSON.parse(read('docs/web/desktop-api-inventory.json'));
const webApi = read('web/web-api.js');
const reg = JSON.parse(read('docs/discovery/requirements-registry.json'));
const idOf = (key) => (reg.entries.find((e) => e.key === key) || {}).id || '—';

// جسم كل دالة في web-api.js (لحد الدالة اللي بعدها)
const apiBlock = webApi.slice(webApi.indexOf('var api = {'));
const members = [...apiBlock.matchAll(/^\s{4}([a-zA-Z]+)\s*:/gm)].map((m) => ({ name: m[1], at: m.index }));
const inline = [...apiBlock.matchAll(/(?:^|,\s*)([a-zA-Z]+)\s*:\s*na\b/gm)].map((m) => m[1]);
const bodyOf = (name) => {
  if (inline.includes(name)) return 'na';
  const i = members.findIndex((m) => m.name === name);
  if (i < 0) { const m = apiBlock.match(new RegExp(`[,{\\s]${name}\\s*:\\s*(function[^}]*\\})`)); return m ? m[1] : null; }
  return apiBlock.slice(members[i].at, i + 1 < members.length ? members[i + 1].at : undefined);
};
const STATUS = {
  implemented: '✅ متنفّذ', partial: '🟡 جزئي', deferred: '⏳ مؤجّل (موديول المرفقات)', server: '🔁 السيرفر بيعملها', na: '➖ مالهاش لازمة في الويب', missing: '❌ مش موجود في الويب',
};
function webStatus(name) {
  const b = bodyOf(name);
  if (b === null) return ['missing', ''];
  if (b === 'na' || /not-available-on-web|\bna\b,?\s*$/.test(b)) return ['na', 'بترجع «مش متاحة في نسخة الويب»'];
  if (/LATER_ATTACH/.test(b)) return ['deferred', 'بترجع «المرفقات هتتفعّل قريبًا»'];
  if (/server-backups|بيتعمل تلقائيًا على السيرفر/.test(b)) return ['server', 'النسخ الاحتياطي على السيرفر (المرحلة 2)'];
  if (/window\.print|printHtml/.test(b)) return ['partial', 'نافذة الطباعة ← «حفظ كـ PDF» (مش PDF عربي على السيرفر)'];
  if (/WebSync|fetch\(|XLSX|window\.open|download\(|pickFile/.test(b)) return ['implemented', ''];
  if (/salt: ''|Promise\.resolve\(false\)|resolve\(''\)|resolve\(\{\}\)|running: false/.test(b)) return ['na', 'السيرفر هو المرجع (رد ثابت)'];
  return ['implemented', ''];
}

const exposed = inv.exposed || [];
const usage = inv.usage || {};
const webInfo = inv.web || {};
const rows = [...exposed.map((e) => e.name), ...(inv.missing || []).map((m) => (typeof m === 'string' ? m : m.name))]
  .filter((v, i, a) => a.indexOf(v) === i).sort();
const refsOf = (n) => (usage[n] && usage[n].count) || 0;

// قنوات IPC في الـ main process
const mainDir = path.join(ROOT, 'src/main');
const mainFiles = fs.readdirSync(mainDir).filter((f) => f.endsWith('.js')).sort();
const ipc = mainFiles.map((f) => { const s = fs.readFileSync(path.join(mainDir, f), 'utf8'); return { f, handlers: (s.match(/ipcMain\.(handle|on)\(/g) || []).length, shell: /shell\.openPath|shell\.openExternal/.test(s), dialog: /dialog\.show/.test(s), print: /printToPDF|webContents\.print/.test(s), wia: /WIA|wia/i.test(s), updater: /autoUpdater|installer|update/i.test(s) && f === 'updater.js' }; }).filter((x) => x.handlers || x.shell || x.dialog || x.print || x.wia);

const counts = {};
const table = rows.map((n) => {
  const [st, note] = webStatus(n);
  counts[st] = (counts[st] || 0) + 1;
  const [wcat, wrep] = webInfo[n] || ['—', '—'];
  const ex = exposed.find((e) => e.name === n);
  return `| ${idOf(`electron:${n}`)} | \`${n}\` | ${ex ? `\`${ex.channel}\`` : '**مش معرّفة في preload**'} | ${refsOf(n)} | ${esc(wcat)} | ${esc(wrep)} | ${STATUS[st]} | ${esc(note)} |`;
});

let md = `# مصفوفة قدرات Electron (خطة v1.4.5 — المرحلة 3)

> **مولَّد** بـ \`node tools/discovery/build-electron-capabilities.js\`. ماتعدّلش الملف باليد.
> **المصادر:** \`docs/web/desktop-api-inventory.json\` (الدوال في \`preload.js\` ومراجعها والبديل المقترح)، و\`web/web-api.js\` (البديل **الفعلي** في نسخة الويب)، و\`src/main/*.js\`.
> **القاعدة** (\`03\` §8): أي قدرة ديسكتوب ليها بديل مُثبت في الويب أو قرار صريح إنها مالهاش لازمة. الحالة هنا محسوبة من الكود، ومش من التوثيق.

## 1. الملخص
| الحالة | العدد |
|---|---|
${Object.entries(STATUS).map(([k, v]) => `| ${v} | ${counts[k] || 0} |`).join('\n')}
| **الإجمالي** | **${rows.length}** |

## 2. الدوال (\`window.desktopApi\`)
| ID | الدالة | قناة IPC | مراجع في الواجهة | الفئة | البديل المقترح | الحالة في الويب | ملاحظة |
|---|---|---|---|---|---|---|---|
${table.join('\n')}

## 3. التكامل مع نظام التشغيل في الـ main process
| الملف | معالجات IPC | فتح ملفات (\`shell\`) | حوارات ملفات | طباعة/PDF | ماسح WIA |
|---|---|---|---|---|---|
${ipc.map((x) => `| \`src/main/${x.f}\` | ${x.handlers} | ${x.shell ? 'أيوه' : '—'} | ${x.dialog ? 'أيوه' : '—'} | ${x.print ? 'أيوه' : '—'} | ${x.wia ? 'أيوه' : '—'} |`).join('\n')}

## 4. الفجوات المهمة (مقترحات للمراحل الجاية)
| القدرة | الوضع | المقترح | القرار/المرحلة |
|---|---|---|---|
| المرفقات (اختيار، فتح، حذف، معاينة، حفظ من الماسح) | مؤجّلة في الواجهة القديمة على الويب. السيرفر عنده \`/api/attachments\` بالفحص والإصدارات، والواجهة الجديدة فيها لوحة مرفقات | ربط الواجهة القديمة بـ \`/api/attachments\` أو نقل الشاشات. **ملفات PDF المشفّرة: B-78 (أ)** | المرحلة 5/7 + B-78 |
| PDF عربي | الويب بيستخدم نافذة طباعة المتصفح | PDF على السيرفر بنفس شكل الطباعة الحالية | مرحلة التقارير (11) |
| تصدير الأرشيف (ZIP) | مؤجّل | تصدير ZIP من السيرفر | مع المرفقات |
| الماسح الضوئي (WIA) | ويندوز بس، **مالوش بديل في المتصفح** | المستخدم بيصوّر بتطبيق الماسح وبيرفع الملف، وأداة على الجهاز بس لو طلع مش كفاية | ✅ **DEC-0084** |
| مجلد البيانات، المحدّث، القفل، وضع الشبكة القديم | مالهمش لازمة في الويب (السيرفر هو المرجع) | يفضلوا في نسخة الديسكتوب لحد إيقافها (المرحلة 14) | — |
`;

const file = path.join(ROOT, 'docs/discovery/ELECTRON_CAPABILITIES.md');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== md) { console.error('stale: docs/discovery/ELECTRON_CAPABILITIES.md'); process.exit(1); }
  console.log('electron capabilities up to date');
} else {
  fs.writeFileSync(file, md);
  console.log(`electron capabilities: ${rows.length} desktopApi functions — ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
