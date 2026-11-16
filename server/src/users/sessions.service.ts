import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { SessionEntity, UserEntity } from '../entities';

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export type RotateResult =
  | { kind: 'ok'; userId: string; session: SessionEntity; token: string }
  | { kind: 'invalid' }
  | { kind: 'race'; userId: string }
  | { kind: 'reuse'; userId: string };

/** فترة السماح لو تابين عملوا refresh في نفس اللحظة بنفس الكوكي (مش سرقة) */
const RACE_GRACE_MS = 30_000;

/** جلسات refresh token: بنخزن sha256 بس، التوكن نفسه بيروح للعميل في cookie HttpOnly. */
@Injectable()
export class SessionsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async create(userId: string, ttlDays: number, meta: { ip: string | null; userAgent: string | null }, em: EntityManager = this.ds.manager) {
    const token = randomBytes(32).toString('base64url');
    const session = await em.getRepository(SessionEntity).save({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
      userAgent: meta.userAgent,
      ip: meta.ip,
      revokedAt: null,
      replacedBy: null,
    });
    return { token, session };
  }

  /** تدوير: التوكن القديم يتلغى ويتولد جديد. إعادة استخدام توكن ملغي (بعد فترة السماح) = سرقة → إلغاء كل جلسات المستخدم. */
  async rotate(token: string, ttlDays: number, meta: { ip: string | null; userAgent: string | null }): Promise<RotateResult> {
    return this.ds.transaction(async (em) => {
      const s = await em.getRepository(SessionEntity).createQueryBuilder('s').setLock('pessimistic_write').where('s.token_hash = :h', { h: hashToken(token) }).getOne();
      if (!s) return { kind: 'invalid' };
      if (s.revokedAt) {
        if (s.replacedBy && Date.now() - s.revokedAt.getTime() < RACE_GRACE_MS) return { kind: 'race', userId: s.userId };
        if (s.replacedBy) {
          await this.revokeAll(s.userId, true, em);
          return { kind: 'reuse', userId: s.userId };
        }
        return { kind: 'invalid' };
      }
      if (s.expiresAt.getTime() <= Date.now()) return { kind: 'invalid' };
      const user = await em.getRepository(UserEntity).findOneBy({ id: s.userId });
      if (!user || !user.active) return { kind: 'invalid' };
      const next = await this.create(s.userId, ttlDays, meta, em);
      await em.getRepository(SessionEntity).update({ id: s.id }, { revokedAt: new Date(), replacedBy: next.session.id });
      return { kind: 'ok', userId: s.userId, session: next.session, token: next.token };
    });
  }

  async revoke(sessionId: string, em: EntityManager = this.ds.manager): Promise<void> {
    await em.getRepository(SessionEntity).createQueryBuilder().update().set({ revokedAt: () => 'now()' }).where('id = :id AND revoked_at IS NULL', { id: sessionId }).execute();
  }

  async revokeByToken(token: string): Promise<string | null> {
    const s = await this.ds.getRepository(SessionEntity).findOneBy({ tokenHash: hashToken(token) });
    if (!s) return null;
    await this.revoke(s.id);
    return s.userId;
  }

  /** إلغاء كل الجلسات. bumpTokenVersion = كمان كل access tokens الحالية تبقى مرفوضة فورًا */
  async revokeAll(userId: string, bumpTokenVersion: boolean, em: EntityManager = this.ds.manager): Promise<void> {
    await em.getRepository(SessionEntity).createQueryBuilder().update().set({ revokedAt: () => 'now()' }).where('user_id = :u AND revoked_at IS NULL', { u: userId }).execute();
    if (bumpTokenVersion) await em.getRepository(UserEntity).increment({ id: userId }, 'tokenVersion', 1);
  }

  async isActive(sessionId: string): Promise<boolean> {
    const s = await this.ds.getRepository(SessionEntity).findOneBy({ id: sessionId });
    return !!s && !s.revokedAt && s.expiresAt.getTime() > Date.now();
  }
}
