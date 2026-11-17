import type { NextFunction, Request, Response } from 'express';

/**
 * ترويسات الأمان وCSP (المرحلة 2 — S-2). من غير مكتبة إضافية.
 *
 * CSP المُنفَّذة: كل حاجة من نفس الأصل بس، لا plugins، لا تضمين في إطار، لا base/form لأصل تاني.
 *   script-src فيها 'unsafe-inline' لأن الواجهة القديمة فيها ~161 معالج onclick="..." نصي — إزالتها
 *   محتاجة إعادة كتابة كل موديول (المرحلة 6). الحماية من XSS لحد ساعتها = الترميز (S-1) + قفل المعرّفات على السيرفر.
 *   مفيش 'unsafe-eval' (eval اتشال من الواجهة).
 * CSP الصارمة (Report-Only): نفس السياسة من غير 'unsafe-inline' للسكربت — بتقيس المتبقي قبل الإنفاذ،
 *   والتقارير بتروح لـ /api/security/csp-report (عدّاد + لوج، من غير بيانات مستخدم).
 *
 * المتغيرات: CSP_ENFORCE=false يقفل ترويسة الإنفاذ (طوارئ)، CSP_REPORT_ONLY=false يقفل التقارير.
 */
export const CSP_REPORT_PATH = '/api/security/csp-report';

const base = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'", // style="" في كل الواجهة
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob:", // معاينة/طباعة PDF
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];
export const CSP_ENFORCED = [...base, "script-src 'self' 'unsafe-inline'", "script-src-attr 'unsafe-inline'"].join('; ');
/** الواجهة الجديدة (/app/ — Angular AOT): سكربت من نفس الأصل بس، من غير أي inline ولا eval. الـ style inline لأن Angular بيحقن أنماط المكونات. */
export const CSP_APP = [...base, "script-src 'self'", "script-src-attr 'none'", "manifest-src 'self'"].join('; ');
export const CSP_STRICT_REPORT_ONLY = [...base, "script-src 'self'", "script-src-attr 'none'", `report-uri ${CSP_REPORT_PATH}`].join('; ');

export function securityHeaders(env: NodeJS.ProcessEnv = process.env) {
  const enforce = env.CSP_ENFORCE !== 'false';
  const reportOnly = env.CSP_REPORT_ONLY !== 'false';
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    const isApp = req.path === '/app' || req.path.startsWith('/app/');
    if (enforce) res.setHeader('Content-Security-Policy', isApp ? CSP_APP : CSP_ENFORCED);
    if (reportOnly && !isApp) res.setHeader('Content-Security-Policy-Report-Only', CSP_STRICT_REPORT_ONLY);
    // HSTS بس على HTTPS (خلف Nginx: X-Forwarded-Proto + trust proxy). Nginx بيحطها كمان.
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // ردود الـ API مش بتتخزن في كاش المتصفح/الوسطاء (فيها بيانات مالية وشخصية)
    if (req.path.startsWith('/api/') && !res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store');
    next();
  };
}
