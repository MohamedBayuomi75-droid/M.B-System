import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { AuditService, clientIp } from '../audit/audit.service';
import { UserEntity } from '../entities';
import { SessionsService } from '../users/sessions.service';
import { UsersService } from '../users/users.service';
import { DomainEvents } from '../events/domain-events';
import { AuthConfig } from './auth.config';
import { AccessTokenPayload, AuthErrorCode, AuthUser } from './auth.types';
import { ARGON2_OPTIONS, PasswordService } from './password.service';
import { TwoFactorService } from './two-factor.service';

const INVALID = () => new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.INVALID_CREDENTIALS, message: 'اسم المستخدم أو كلمة المرور غلط' });

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);
  /** hash وهمي للمقارنة لما المستخدم مش موجود (نفس زمن الرد = مايتعرفش مين موجود) */
  private dummyHash: Promise<string>;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly cfg: AuthConfig,
    private readonly audit: AuditService,
    private readonly events: DomainEvents,
    private readonly twoFactor: TwoFactorService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    this.dummyHash = require('argon2').hash('dummy-password-for-timing', ARGON2_OPTIONS);
  }

  private meta(req: Request) {
    return { ip: clientIp(req), userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500) || null };
  }

  /** التحقق من اسم المستخدم وكلمة المرور + القفل المؤقت + ترقية الهاش القديم */
  async validateCredentials(username: string, password: string, req: Request): Promise<UserEntity> {
    const u = await this.users.findByUsername(username);
    if (!u) {
      await this.passwords.verify(password, { algo: 'argon2id', hash: await this.dummyHash });
      await this.audit.record({ action: 'auth.login_failed', username: String(username).slice(0, 64), details: { reason: 'unknown_user' }, req });
      throw INVALID();
    }
    if (u.lockedUntil && u.lockedUntil.getTime() > Date.now()) {
      const retryAfterSec = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 1000);
      await this.audit.record({ action: 'auth.login_failed', userId: u.id, username: u.username, details: { reason: 'locked' }, req });
      throw new HttpException({ statusCode: HttpStatus.LOCKED, code: AuthErrorCode.ACCOUNT_LOCKED, message: `الحساب مقفول مؤقتًا بسبب محاولات فاشلة كتير. حاول بعد ${Math.ceil(retryAfterSec / 60)} دقيقة`, retryAfterSec }, HttpStatus.LOCKED);
    }
    const res = await this.passwords.verify(password, { algo: u.passwordAlgo, hash: u.passwordHash, salt: u.passwordSalt });
    if (!res.ok || !u.active) {
      if (!res.ok) await this.registerFailure(u, req);
      else await this.audit.record({ action: 'auth.login_failed', userId: u.id, username: u.username, details: { reason: 'inactive' }, req });
      throw INVALID();
    }
    // 2FA (المرحلة 2): بعد كلمة مرور صحيحة وقبل أي تحديث — الكود الغلط بيتعد ضمن المحاولات الفاشلة (نفس القفل)
    await this.twoFactor.checkLogin(u, (req.body as { otp?: string } | undefined)?.otp, req, () => this.registerFailure(u, req));
    const patch: Partial<UserEntity> = { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() };
    if (res.needsRehash) {
      // أول دخول ناجح بهاش scrypt القديم (أو argon2 بإعدادات أضعف) → argon2id (D-005)
      const pw = await this.passwords.hash(password);
      Object.assign(patch, { passwordAlgo: pw.algo, passwordHash: pw.hash, passwordSalt: null });
      await this.audit.record({ action: 'auth.password_rehashed', userId: u.id, username: u.username, details: { from: u.passwordAlgo, to: pw.algo }, req });
    }
    await this.ds.getRepository(UserEntity).update({ id: u.id }, patch);
    return Object.assign(u, patch);
  }

  private async registerFailure(u: UserEntity, req: Request) {
    // ملاحظة: ds.query لـ UPDATE ... RETURNING بيرجّع [rows, affected] في TypeORM/postgres
    const [rows] = (await this.ds.query(
      `UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = $1 RETURNING failed_attempts`, [u.id],
    )) as [{ failed_attempts: number }[], number];
    const n = rows[0]?.failed_attempts ?? 0;
    if (n >= this.cfg.maxFailures) {
      await this.ds.query(`UPDATE users SET failed_attempts = 0, locked_until = now() + ($2 || ' minutes')::interval WHERE id = $1`, [u.id, String(this.cfg.lockMinutes)]);
      await this.audit.record({ action: 'auth.account_locked', userId: u.id, username: u.username, details: { failures: n, minutes: this.cfg.lockMinutes }, req });
    } else {
      await this.audit.record({ action: 'auth.login_failed', userId: u.id, username: u.username, details: { reason: 'bad_password', failures: n }, req });
    }
  }

  /** يفتح جلسة جديدة ويرجّع access token + refresh token (للكوكي) */
  async login(u: UserEntity, req: Request) {
    const { token, session } = await this.sessions.create(u.id, this.cfg.refreshTtlDays, this.meta(req));
    await this.audit.record({ action: 'auth.login', userId: u.id, username: u.username, details: { sessionId: session.id }, req });
    return this.issue(u.id, session.id, token);
  }

  async refresh(token: string | undefined, req: Request) {
    if (!token) throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.REFRESH_INVALID, message: 'الجلسة انتهت — سجّل دخول تاني' });
    const r = await this.sessions.rotate(token, this.cfg.refreshTtlDays, this.meta(req));
    if (r.kind === 'race') throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.REFRESH_RACE, message: 'التوكن اتجدد من تاب تاني — أعد المحاولة' });
    if (r.kind === 'reuse') {
      await this.audit.record({ action: 'auth.refresh_reuse_detected', userId: r.userId, details: { revokedAllSessions: true }, req });
      this.log.warn(`refresh token reuse detected for user ${r.userId} — all sessions revoked`);
      this.events.emit('user.changed', r.userId);
    }
    if (r.kind !== 'ok') throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.REFRESH_INVALID, message: 'الجلسة انتهت — سجّل دخول تاني' });
    return this.issue(r.userId, r.session.id, r.token);
  }

  private async issue(userId: string, sessionId: string, refreshToken: string) {
    const user = await this.users.loadAuthUser(userId);
    if (!user) throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.UNAUTHENTICATED, message: 'الحساب غير متاح' });
    const payload: AccessTokenPayload = { sub: user.id, tv: user.tokenVersion, sid: sessionId };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, refreshToken, user, expiresIn: this.cfg.accessTtlSec };
  }

  async logout(refreshToken: string | undefined, actor: AuthUser | undefined, req: Request) {
    let userId: string | null = null;
    if (refreshToken) userId = await this.sessions.revokeByToken(refreshToken);
    if (actor?.sessionId) { await this.sessions.revoke(actor.sessionId); userId = actor.id; }
    if (userId) await this.audit.record({ action: 'auth.logout', userId, username: actor?.username ?? null, req });
  }

  async logoutAll(actor: AuthUser, req: Request) {
    await this.sessions.revokeAll(actor.id, true);
    this.events.emit('user.changed', actor.id);
    await this.audit.record({ action: 'auth.logout_all', userId: actor.id, username: actor.username, req });
  }

  /** تغيير كلمة المرور بنفسه. الإجباري (mustChangePassword) مايحتاجش القديمة (زي الديسكتوب) */
  async changePassword(actor: AuthUser, currentPassword: string | undefined, newPassword: string, req: Request) {
    const u = await this.ds.getRepository(UserEntity).findOneByOrFail({ id: actor.id });
    if (!u.mustChangePassword) {
      const ok = currentPassword ? (await this.passwords.verify(currentPassword, { algo: u.passwordAlgo, hash: u.passwordHash, salt: u.passwordSalt })).ok : false;
      if (!ok) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.CURRENT_PASSWORD_WRONG, message: 'كلمة المرور الحالية غلط' });
    }
    const same = (await this.passwords.verify(newPassword, { algo: u.passwordAlgo, hash: u.passwordHash, salt: u.passwordSalt })).ok;
    if (same) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.WEAK_PASSWORD, message: 'كلمة المرور الجديدة لازم تختلف عن الحالية' });
    await this.users.setPassword(u.id, newPassword, false);
    await this.audit.record({ action: 'auth.password_changed', userId: u.id, username: u.username, details: { forced: u.mustChangePassword }, req });
    // كل الجلسات اتلغت (بما فيها الحالية) → جلسة جديدة للجهاز ده
    return this.login(await this.ds.getRepository(UserEntity).findOneByOrFail({ id: u.id }), req);
  }
}
