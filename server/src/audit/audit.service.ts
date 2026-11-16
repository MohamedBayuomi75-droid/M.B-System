import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities';

export interface AuditEntry {
  action: string;
  userId?: string | null;
  username?: string | null;
  entity?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  req?: Request;
}

/** سجل المراجعة — إلحاق فقط. فشل الكتابة مايوقفش العملية الأصلية بس بيتسجل كخطأ. */
@Injectable()
export class AuditService {
  private readonly log = new Logger(AuditService.name);
  constructor(@InjectRepository(AuditLogEntity) private readonly repo: Repository<AuditLogEntity>) {}

  async record(e: AuditEntry): Promise<void> {
    try {
      await this.repo.save(this.repo.create({
        action: e.action,
        userId: e.userId ?? null,
        username: e.username ?? null,
        entity: e.entity ?? null,
        entityId: e.entityId ?? null,
        details: e.details ?? null,
        ip: e.req ? clientIp(e.req) : null,
        userAgent: e.req ? String(e.req.headers['user-agent'] ?? '').slice(0, 500) || null : null,
      }));
    } catch (err) {
      this.log.error(`audit write failed for ${e.action}: ${(err as Error).message}`);
    }
  }
}

/** IP العميل (Express بيقرا X-Forwarded-For بس من الـ proxies الموثوقة — trust proxy في setup-app) */
export function clientIp(req: Request): string | null {
  const ip = req.ip || req.socket?.remoteAddress || null;
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
