import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface NotificationInput { userId: string; kind: string; title: string; body?: string | null; entity?: string | null; entityId?: string | null }

/** الإشعارات المخزّنة (المرحلة 5، 5.9) — الإرسال بالبريد في مرحلة النشر (B-67) */
@Injectable()
export class NotificationsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async notify(items: NotificationInput[], em: EntityManager = this.ds.manager): Promise<void> {
    for (const n of items) await em.query(`INSERT INTO notifications (user_id, kind, title, body, entity, entity_id) VALUES ($1, $2, $3, $4, $5, $6)`, [n.userId, n.kind, n.title, n.body ?? null, n.entity ?? null, n.entityId ?? null]);
  }

  async mine(userId: string, unreadOnly = false, limit = 50) {
    const rows = await this.ds.query(`SELECT id, kind, title, body, entity, entity_id AS "entityId", read_at AS "readAt", created_at AS "createdAt" FROM notifications
      WHERE user_id = $1 ${unreadOnly ? 'AND read_at IS NULL' : ''} ORDER BY created_at DESC, id DESC LIMIT $2`, [userId, Math.min(limit, 200)]);
    const [{ unread }] = await this.ds.query(`SELECT count(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL`, [userId]);
    return { items: rows.map((r: { id: string }) => ({ ...r, id: String(r.id) })), unread };
  }

  async markRead(userId: string, id: string | 'all'): Promise<number> {
    const [rows] = id === 'all'
      ? await this.ds.query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL RETURNING id`, [userId])
      : await this.ds.query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND id = $2 AND read_at IS NULL RETURNING id`, [userId, id]);
    return rows.length;
  }
}
