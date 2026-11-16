import type { INestApplication } from '@nestjs/common';
import express from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * الواجهة القديمة على نفس الأصل (UNIFIED-WEB-PLAN §2.5-5): /legacy/* — نفس الكوكي ومفيش CORS.
 *   /legacy/              → web/index.html (نسخة الويب المولّدة من renderer/index.html)
 *   /legacy/web/*         → web/ (web-session.js، sync-client.js، web-api.js، web-overrides.js)
 *   /legacy/vendor/*      → vendor/ (xlsx)
 *   /legacy/*             → renderer/ (نفس الملفات بالظبط — مفيش إعادة كتابة للواجهة)
 * المصدر: LEGACY_UI_ROOT (جذر المشروع). في Caddy (A9) ممكن يتخدم مباشرة من غير Node.
 */
export function mountLegacyUi(app: INestApplication): string | null {
  const root = process.env.LEGACY_UI_ROOT || path.resolve(__dirname, '../..');
  const index = path.join(root, 'web', 'index.html');
  if (!fs.existsSync(index) || !fs.existsSync(path.join(root, 'renderer'))) return null;
  const http = app.getHttpAdapter().getInstance() as express.Express;
  const noStore = (res: express.Response) => res.setHeader('Cache-Control', 'no-cache');
  http.get('/', (_req, res) => res.redirect(302, '/legacy/'));
  // المتصفح بيطلب /favicon.ico تلقائي — أيقونة البرنامج نفسها
  const icon = path.join(root, 'icon.ico');
  http.get('/favicon.ico', (_req, res) => (fs.existsSync(icon) ? res.sendFile(icon) : res.status(204).end()));
  // Express 5 مش strict: '/legacy' و '/legacy/' نفس المسار → نفرّق بـ originalUrl عشان مايبقاش redirect لنفسه
  http.get(['/legacy', '/legacy/index.html'], (req, res) => {
    if (req.originalUrl.split('?')[0] === '/legacy') return res.redirect(302, '/legacy/');
    noStore(res);
    res.sendFile(index);
  });
  const opts = { index: false, fallthrough: true, setHeaders: (res: express.Response) => noStore(res) };
  http.use('/legacy/web', express.static(path.join(root, 'web'), opts));
  http.use('/legacy/vendor', express.static(path.join(root, 'vendor'), opts));
  http.use('/legacy', express.static(path.join(root, 'renderer'), opts));
  return root;
}
