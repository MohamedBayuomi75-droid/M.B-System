import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

/** سر التطوير العشوائي بيتولّد مرة واحدة لكل process (أي نسخة من AuthConfig لازم تشوف نفس السر) */
let devSecret: string | null = null;

/** إعدادات المصادقة المحسوبة مرة واحدة من env (validateEnv اتأكد منها عند الإقلاع). */
@Injectable()
export class AuthConfig {
  private readonly log = new Logger('AuthConfig');
  readonly jwtSecret: string;
  readonly accessTtlSec = Number(process.env.JWT_ACCESS_TTL_SEC || 900);
  readonly refreshTtlDays = Number(process.env.REFRESH_TTL_DAYS || 14);
  readonly cookieSecure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : true;
  readonly maxFailures = Number(process.env.LOGIN_MAX_FAILURES || 10);
  readonly lockMinutes = Number(process.env.LOGIN_LOCK_MINUTES || 15);
  readonly loginRatePerMin = Number(process.env.LOGIN_RATE_LIMIT_PER_MIN || 5);

  constructor() {
    if (process.env.JWT_SECRET) this.jwtSecret = process.env.JWT_SECRET;
    else {
      // الإنتاج بيرفض يقوم من غير JWT_SECRET (validateEnv). هنا تطوير/اختبار بس.
      if (!devSecret) {
        devSecret = randomBytes(48).toString('base64url');
        this.log.warn('JWT_SECRET مش محدد — اتولّد سر عشوائي (كل الجلسات هتتلغي مع إعادة التشغيل)');
      }
      this.jwtSecret = devSecret;
    }
  }
}
