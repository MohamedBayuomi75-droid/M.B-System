import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { UserEntity } from '../entities';
import { DomainEvents } from '../events/domain-events';
import { SessionsService } from '../users/sessions.service';
import { AuthConfig } from './auth.config';
import { AuthErrorCode, AuthUser } from './auth.types';
import { PasswordService } from './password.service';
import { decryptSecret, encryptSecret, generateRecoveryCodes, generateSecret, hashRecoveryCode, looksLikeRecoveryCode, otpauthUrl, totpKey, verifyTotp } from './totp';

/** التحقق بخطوتين (TOTP) — المرحلة 2، S-8. */
@Injectable()
export class TwoFactorService {
  private readonly key: Buffer;
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly events: DomainEvents,
    private readonly sessions: SessionsService,
    cfg: AuthConfig,
  ) {
    this.key = totpKey({ ...process.env, JWT_SECRET: cfg.jwtSecret });
  }

  private repo() { return this.ds.getRepository(UserEntity); }
  private async load(id: string) {
    const u = await this.repo().findOneBy({ id });
    if (!u) throw new NotFoundException('المستخدم مش موجود');
    return u;
  }
  private async checkPassword(u: UserEntity, password: string) {
    const r = await this.passwords.verify(password, { algo: u.passwordAlgo, hash: u.passwordHash, salt: u.passwordSalt });
    if (!r.ok) throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.CURRENT_PASSWORD_WRONG, message: 'كلمة المرور غلط' });
  }

  /** يقبل كود TOTP (مرة واحدة لكل خطوة) أو كود استرداد (بيتحرق) — true لو صحيح */
  private async consumeCode(u: UserEntity, code: string): Promise<'totp' | 'recovery' | null> {
    const c = String(code || '').trim();
    if (/^\d{6}$/.test(c) && u.totpSecret) {
      const step = verifyTotp(decryptSecret(u.totpSecret, this.key), c, u.totpLastStep === null ? null : Number(u.totpLastStep));
      if (step === null) return null;
      // ذري: لو طلبين بنفس الكود في نفس اللحظة، واحد بس يعدّي
      const [rows] = await this.ds.query(`UPDATE users SET totp_last_step = $2 WHERE id = $1 AND (totp_last_step IS NULL OR totp_last_step < $2) RETURNING id`, [u.id, step]);
      return rows.length ? 'totp' : null;
    }
    if (looksLikeRecoveryCode(c) && u.totpRecovery?.length) {
      const h = hashRecoveryCode(c, this.key);
      const [rows] = await this.ds.query(`UPDATE users SET totp_recovery = array_remove(totp_recovery, $2) WHERE id = $1 AND $2 = ANY(totp_recovery) RETURNING id`, [u.id, h]);
      return rows.length ? 'recovery' : null;
    }
    return null;
  }

  /** في الدخول (بعد كلمة مرور صحيحة) — onFailure بيعدّ المحاولة الفاشلة (نفس قفل كلمة المرور) */
  async checkLogin(u: UserEntity, otp: string | undefined, req: Request, onFailure: () => Promise<void>): Promise<void> {
    if (!u.totpEnabled) return;
    if (!otp) {
      await this.audit.record({ action: 'auth.otp_required', userId: u.id, username: u.username, req });
      throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.OTP_REQUIRED, message: 'أدخل كود التحقق من تطبيق المصادقة' });
    }
    const used = await this.consumeCode(u, otp);
    if (!used) {
      await onFailure();
      throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.OTP_INVALID, message: 'كود التحقق غلط أو مستخدم قبل كده' });
    }
    if (used === 'recovery') await this.audit.record({ action: 'auth.recovery_code_used', userId: u.id, username: u.username, details: { remaining: (u.totpRecovery?.length ?? 1) - 1 }, req });
  }

  async setup(actor: AuthUser, password: string, req: Request) {
    const u = await this.load(actor.id);
    if (u.totpEnabled) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.TWO_FACTOR_STATE, message: 'التحقق بخطوتين مفعّل بالفعل' });
    await this.checkPassword(u, password);
    const secret = generateSecret();
    await this.repo().update({ id: u.id }, { totpPending: encryptSecret(secret, this.key) });
    await this.audit.record({ action: 'auth.2fa_setup_started', userId: u.id, username: u.username, req });
    return { secret, otpauthUrl: otpauthUrl(secret, u.username) };
  }

  async enable(actor: AuthUser, otp: string, req: Request) {
    const u = await this.load(actor.id);
    if (u.totpEnabled || !u.totpPending) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.TWO_FACTOR_STATE, message: 'ابدأ التفعيل الأول (setup)' });
    const secret = decryptSecret(u.totpPending, this.key);
    const step = verifyTotp(secret, String(otp).trim(), null);
    if (step === null) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.OTP_INVALID, message: 'الكود غلط — تأكد من ساعة الجهاز وأعد المحاولة' });
    const codes = generateRecoveryCodes();
    await this.repo().update({ id: u.id }, {
      totpSecret: encryptSecret(secret, this.key), totpPending: null, totpEnabled: true, totpLastStep: String(step),
      totpRecovery: codes.map((c) => hashRecoveryCode(c, this.key)),
    });
    await this.audit.record({ action: 'auth.2fa_enabled', userId: u.id, username: u.username, req });
    this.events.emit('user.changed', u.id);
    return { recoveryCodes: codes };
  }

  async disable(actor: AuthUser, password: string, otp: string, req: Request) {
    const u = await this.load(actor.id);
    if (!u.totpEnabled) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.TWO_FACTOR_STATE, message: 'التحقق بخطوتين مش مفعّل' });
    await this.checkPassword(u, password);
    if (!(await this.consumeCode(u, otp))) throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.OTP_INVALID, message: 'كود التحقق غلط' });
    await this.clear(u.id);
    await this.audit.record({ action: 'auth.2fa_disabled', userId: u.id, username: u.username, req });
    this.events.emit('user.changed', u.id);
  }

  /** مدير المستخدمين يصفّر 2FA لمستخدم فقد جهازه (بيتسجل) — ومايقدرش يصفّر نفسه بالطريقة دي */
  async adminReset(actor: AuthUser, userId: string, req: Request) {
    if (actor.id === userId) throw new ForbiddenException({ statusCode: 403, code: AuthErrorCode.FORBIDDEN, message: 'استخدم «إلغاء التحقق بخطوتين» لحسابك' });
    const u = await this.load(userId);
    await this.clear(u.id);
    // كل جلساته تتقفل: الدخول الجاي بكلمة المرور + تسجيل 2FA من جديد لو دوره بيطلبه
    await this.sessions.revokeAll(u.id, true);
    await this.audit.record({ action: 'auth.2fa_reset_by_admin', userId: actor.id, username: actor.username, entity: 'user', entityId: u.id, details: { target: u.username }, req });
    this.events.emit('user.changed', u.id);
  }

  private clear(id: string) {
    return this.repo().update({ id }, { totpEnabled: false, totpSecret: null, totpPending: null, totpRecovery: null, totpLastStep: null });
  }
}
