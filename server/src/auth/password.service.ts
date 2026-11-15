import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { verifyLegacyScrypt } from './legacy-password';

export type PasswordAlgo = 'argon2id' | 'scrypt';

export interface StoredPassword {
  algo: PasswordAlgo;
  hash: string;
  /** للـ scrypt القديم بس */
  salt?: string | null;
}

export interface VerifyResult {
  ok: boolean;
  /** true لو الدخول نجح بالهاش القديم أو بإعدادات argon2 أضعف → لازم نعيد التشفير ونحفظ */
  needsRehash: boolean;
}

/** إعدادات argon2id (OWASP 2024: m=19MiB, t=2, p=1 كحد أدنى — بنستخدم أعلى شوية) */
export const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 } as const;
/** حد أقصى للطول (حماية من DoS) — نفس حد الديسكتوب عشان سلوك القطع يفضل متطابق */
export const MAX_PASSWORD_LENGTH = 256;
export const MIN_PASSWORD_LENGTH = 10;
export const FORBIDDEN_PASSWORDS = ['admin123', '123456'];

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<StoredPassword> {
    const hash = await argon2.hash(String(password).slice(0, MAX_PASSWORD_LENGTH), ARGON2_OPTIONS);
    return { algo: 'argon2id', hash, salt: null };
  }

  async verify(password: string, stored: StoredPassword): Promise<VerifyResult> {
    const p = String(password ?? '').slice(0, MAX_PASSWORD_LENGTH);
    if (stored.algo === 'scrypt') {
      const ok = verifyLegacyScrypt(p, stored.salt, stored.hash);
      return { ok, needsRehash: ok };
    }
    if (stored.algo === 'argon2id') {
      try {
        const ok = await argon2.verify(stored.hash, p);
        return { ok, needsRehash: ok && argon2.needsRehash(stored.hash, ARGON2_OPTIONS) };
      } catch {
        return { ok: false, needsRehash: false };
      }
    }
    return { ok: false, needsRehash: false };
  }

  /** سياسة كلمات المرور الجديدة/المتغيّرة فقط (الحسابات القديمة تدخل بكلمتها الحالية — D-005). يرجّع رسالة الخطأ أو '' */
  policyError(password: string): string {
    const p = String(password ?? '');
    if (p.length < MIN_PASSWORD_LENGTH) return `كلمة المرور لازم ${MIN_PASSWORD_LENGTH} أحرف على الأقل`;
    if (p.length > 128) return 'كلمة المرور طويلة جداً';
    if (FORBIDDEN_PASSWORDS.includes(p.toLowerCase())) return 'كلمة المرور دي معروفة (افتراضية) — اختار كلمة مختلفة';
    return '';
  }
}
