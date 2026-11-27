import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface Row { id: string; data: Record<string, any>; rev: number } // eslint-disable-line @typescript-eslint/no-explicit-any

/** طبقة الوصول للبيانات (8.8.3): التكاليف ومدخلات تكلفة المشروع — القراية من legacy_records (قبل النقل وبعده بنفس الشكل) والمستندات من docs */
@Injectable()
export class CostsRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  rows(collection: string, em: EntityManager = this.ds.manager): Promise<Row[]> {
    return em.query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [collection]);
  }
  async doc(key: string, em: EntityManager = this.ds.manager): Promise<{ data: unknown; rev: number } | null> {
    const [r] = await em.query(`SELECT data, rev FROM docs WHERE key = $1`, [key]);
    return r ? { data: r.data, rev: Number(r.rev) } : null;
  }
  /** حدث cost.saved / cost.deleted (مرة لكل حفظ) */
  async addEvent(em: EntityManager, action: 'saved' | 'deleted', id: string, payload: Record<string, unknown>, by: string): Promise<void> {
    const [{ n }] = await em.query(`SELECT count(*)::int AS n FROM integration_events WHERE aggregate_type = 'cost' AND aggregate_id = $1`, [id]);
    await em.query(`INSERT INTO integration_events (event_type, aggregate_type, aggregate_id, idempotency_key, payload, created_by) VALUES ($1, 'cost', $2, $3, $4::jsonb, $5)
      ON CONFLICT (idempotency_key) DO NOTHING`, [`cost.${action}`, id, `cost.${action}:${id}:${n + 1}`, JSON.stringify(payload), by]);
  }
  events(id: string, em: EntityManager = this.ds.manager): Promise<{ type: string; key: string }[]> {
    return em.query(`SELECT event_type AS type, idempotency_key AS key FROM integration_events WHERE aggregate_type = 'cost' AND aggregate_id = $1 ORDER BY seq`, [id]);
  }
}
