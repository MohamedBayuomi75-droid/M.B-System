import { scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * توافق مع نسخة الديسكتوب (src/main/password.js) — ممنوع تغيير أي تفصيلة هنا:
 *   hash = scrypt(String(p).slice(0, 256), salt, 64).hex   (N=16384, r=8, p=1 الافتراضيات)
 * الـ salt بيتمرّر كنص (hex string) زي ما هو، مش bytes.
 */
export const LEGACY_MAX_PASSWORD_LENGTH = 256;

export function legacyNormalize(password: unknown): string {
  return String(password == null ? '' : password).slice(0, LEGACY_MAX_PASSWORD_LENGTH);
}

export function legacyScryptHash(password: string, salt: string): string {
  return scryptSync(legacyNormalize(password), salt, 64).toString('hex');
}

export function verifyLegacyScrypt(password: unknown, salt: string | null | undefined, hash: string | null | undefined): boolean {
  try {
    if (!salt || !hash) return false;
    const check = Buffer.from(legacyScryptHash(legacyNormalize(password), String(salt)), 'hex');
    const stored = Buffer.from(String(hash), 'hex');
    if (stored.length !== check.length) return false;
    return timingSafeEqual(check, stored);
  } catch {
    return false;
  }
}
