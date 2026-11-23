import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface Row { id: string; data: Record<string, any>; rev: number } // eslint-disable-line @typescript-eslint/no-explicit-any

/** طبقة الوصول للبيانات (8.2.4): المشرفين والسواقين — القراية من legacy_records (قبل النقل وبعده بنفس الشكل) والمستندات من docs */
@Injectable()
export class PeopleRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  rows(collection: string, em: EntityManager = this.ds.manager): Promise<Row[]> {
    return em.query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [collection]);
  }
  async doc(key: string, em: EntityManager = this.ds.manager): Promise<Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const [r] = await em.query(`SELECT data FROM docs WHERE key = $1`, [key]);
    return r?.data && typeof r.data === 'object' ? r.data : {};
  }
  async docValue(key: string, em: EntityManager = this.ds.manager): Promise<unknown> {
    const [r] = await em.query(`SELECT data FROM docs WHERE key = $1`, [key]);
    return r ? r.data : undefined;
  }
  events(kind: string, id: string, em: EntityManager = this.ds.manager): Promise<{ type: string; key: string }[]> {
    return em.query(`SELECT event_type AS type, idempotency_key AS key FROM integration_events WHERE aggregate_type = $1 AND aggregate_id = $2 ORDER BY seq`, [kind, id]);
  }
  /** حدث supervisor.saved / driver.saved (مرة لكل حفظ). من غير الأجور */
  async addSavedEvent(em: EntityManager, kind: string, id: string, payload: Record<string, unknown>, by: string): Promise<void> {
    const [{ n }] = await em.query(`SELECT count(*)::int AS n FROM integration_events WHERE aggregate_type = $1 AND aggregate_id = $2`, [kind, id]);
    await em.query(`INSERT INTO integration_events (event_type, aggregate_type, aggregate_id, idempotency_key, payload, created_by) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      ON CONFLICT (idempotency_key) DO NOTHING`, [`${kind}.saved`, kind, id, `${kind}.saved:${id}:${n + 1}`, JSON.stringify(payload), by]);
  }
  async source(collection: string, em: EntityManager = this.ds.manager): Promise<'legacy-records' | 'relational'> {
    return (await em.query(`SELECT 1 FROM module_cutover WHERE collection = $1`, [collection])).length ? 'relational' : 'legacy-records';
  }
}
