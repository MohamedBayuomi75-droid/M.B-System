import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { COLLECTIONS_MAP } from '../data/collections-map.generated';
import { canRead, hiddenFields, inProjectScope } from '../data/policy';
import { HistoryRepository } from './history.repository';

/**
 * تاريخ أي سجل (المرحلة 5 — 5.4): مين غيّر إيه وإمتى، بالقيمة قبل وبعد (changes.diff.before من المرحلة 2).
 * نفس صلاحية قراءة البيانات + نطاق المشروع، والحقول المخفية عن المستخدم (زي الأجور) بتتشال من القيم.
 */
@Injectable()
export class HistoryService {
  constructor(private readonly repo: HistoryRepository) {}

  async recordHistory(user: AuthUser, collection: string, id: string, limit = 200) {
    if (COLLECTIONS_MAP[collection] !== 'collection') throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المجموعة غير موجودة' });
    if (!canRead(user, collection)) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية على هذه البيانات' });
    const rec = await this.repo.record(collection, id);
    if (!rec || !inProjectScope(user, collection, rec.data)) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'السجل غير موجود' });
    const hidden = new Set(hiddenFields(user, collection));
    const strip = (o: unknown) => {
      if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
      return Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([k]) => !hidden.has(k)));
    };
    const rows = await this.repo.changes(collection, id, Math.min(Math.max(limit, 1), 500));
    return {
      collection, id, deleted: !!rec.deleted_at,
      changes: rows.map((c) => {
        const d = (c.diff ?? {}) as Record<string, unknown>;
        return {
          seq: String(c.seq), op: c.op, rev: c.rev, at: c.at, user: c.username, userId: c.user_id,
          fields: (c.fields ?? []).filter((f) => !hidden.has(f)),
          set: strip(d.set), before: strip(d.before), unset: Array.isArray(d.unset) ? (d.unset as string[]).filter((f) => !hidden.has(f)) : undefined,
          overwrote: d.overwrote,
        };
      }),
    };
  }
}
