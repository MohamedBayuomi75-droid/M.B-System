import type { NextFunction, Request, Response } from 'express';

/**
 * فحص الأصل (المرحلة 2 — S-4): أي طلب بيغيّر حاجة (POST/PUT/PATCH/DELETE) على /api لازم ييجي من نفس الأصل.
 * ليه: كوكي الـ refresh (SameSite=Lax) بتتبعت تلقائي — ده خط دفاع تاني ضد CSRF على /api/auth/refresh و/logout
 * وأي مسار مستقبلي بيعتمد على الكوكي.
 *  - Sec-Fetch-Site = cross-site → رفض.
 *  - Origin موجود ومختلف عن Host (أو ALLOWED_ORIGINS) → رفض.
 *  - طلب من غير Origin ولا Sec-Fetch-Site (أدوات سطر الأوامر/سكربتات) → مسموح؛ دول مش متصفح ومش بيبعتوا كوكي تلقائي.
 */
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function originCheck(env: NodeJS.ProcessEnv = process.env) {
  const allowed = new Set((env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  return (req: Request, res: Response, next: NextFunction) => {
    if (!UNSAFE.has(req.method) || !req.path.startsWith('/api/')) return next();
    const site = String(req.headers['sec-fetch-site'] || '');
    const origin = String(req.headers.origin || '').toLowerCase();
    const reject = (why: string) => res.status(403).json({ statusCode: 403, code: 'BAD_ORIGIN', message: 'طلب من أصل غير مسموح', reason: why });
    if (site === 'cross-site') return reject('sec-fetch-site');
    if (!origin) return next();
    if (origin === 'null') return reject('null-origin');
    if (allowed.has(origin)) return next();
    let host: string;
    try { host = new URL(origin).host; } catch { return reject('bad-origin'); }
    // Express 5: req.host = Host (بالبورت)، أو X-Forwarded-Host لو الطلب جاي من بروكسي موثوق (trust proxy)
    const reqHost = String(req.host || req.headers.host || '');
    if (host.toLowerCase() === reqHost.toLowerCase()) return next();
    return reject('cross-origin');
  };
}
