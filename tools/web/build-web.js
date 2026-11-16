// يولّد web/index.html من renderer/index.html (نفس الواجهة بالظبط + سكربتات الويب) — مفيش تعديل في renderer/.
// التشغيل: npm run build:web     | التحقق إنه محدّث: node tools/web/build-web.js --check
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const src = fs.readFileSync(path.join(ROOT, 'renderer/index.html'), 'utf8');

const scripts = [...src.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('مفيش <script> في renderer/index.html');
const first = `<script src="${scripts[0]}"></script>`;
const last = `<script src="${scripts[scripts.length - 1]}"></script>`;

let out = src
  .replace('<head>', '<head>\n<!-- ⚠️ ملف مولَّد من renderer/index.html بـ tools/web/build-web.js — ماتعدّلوش بإيدك -->')
  .replace('</head>', '<link rel="stylesheet" href="web/web.css">\n</head>')
  .replace(first, [
    '<!-- نسخة الويب (A4): الجلسة + المزامنة + desktopApi فوق السيرفر — قبل ملفات الواجهة -->',
    '<script src="vendor/xlsx.full.min.js"></script>',
    '<script src="/api/stream/socket.io.js"></script>',
    '<script src="web/web-session.js"></script>',
    '<script src="web/sync-client.js"></script>',
    '<script src="web/web-api.js"></script>',
    first,
  ].join('\n'))
  .replace(last, `${last}\n<!-- بعد كل ملفات الواجهة وقبل boot() -->\n<script src="web/web-overrides.js"></script>`);

const target = path.join(ROOT, 'web/index.html');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (cur !== out) { console.error('web/index.html مش محدّث — شغّل: npm run build:web'); process.exit(1); }
  console.log('web/index.html up to date');
} else {
  fs.writeFileSync(target, out);
  console.log(`wrote web/index.html (${scripts.length} renderer scripts + 5 web scripts)`);
}
