import type { INestApplication } from '@nestjs/common';
import express from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * الواجهة الجديدة (Angular — المرحلة 4) على /app/ من نفس الأصل (نفس الكوكي والجلسة، ومفيش CORS).
 *  - ملفات بأسماء فيها بصمة (main-XXXX.js ...) ← كاش طويل؛ index.html و ngsw ← من غير كاش (التحديثات توصل فورًا).
 *  - أي مسار تحت /app/ مش ملف ← index.html (توجيه Angular).
 * المصدر: FRONTEND_DIST (افتراضي frontend/dist/frontend/browser). لو مش مبني: مفيش /app/ (والواجهة الحالية شغالة عادي).
 */
export function mountAngularApp(app: INestApplication): string | null {
  const root = process.env.FRONTEND_DIST || path.resolve(__dirname, '../../frontend/dist/frontend/browser');
  const index = path.join(root, 'index.html');
  if (!fs.existsSync(index)) return null;
  const http = app.getHttpAdapter().getInstance() as express.Express;
  const noCache = /(^|\/)(index\.html|ngsw\.json|ngsw-worker\.js|safety-worker\.js|worker-basic\.min\.js|manifest\.webmanifest)$/;
  http.get('/app', (req, res, next) => (req.originalUrl.split('?')[0] === '/app' ? res.redirect(302, '/app/') : next()));
  http.use('/app', express.static(root, {
    index: false, fallthrough: true,
    setHeaders: (res, file) => res.setHeader('Cache-Control', noCache.test(file) ? 'no-cache' : 'public, max-age=31536000, immutable'),
  }));
  http.get(/^\/app\/.*/, (req, res, next) => {
    if (/\.[a-z0-9]{2,8}$/i.test(req.path)) return next(); // ملف مش موجود = 404 عادي، مش index.html
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
  return root;
}
