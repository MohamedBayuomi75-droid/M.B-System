import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface Row { id: string; data: Record<string, any>; rev: number } // eslint-disable-line @typescript-eslint/no-explicit-any

/** طبقة الوصول للبيانات (8.1.4): كل القراية من legacy_records (قبل نقل العمال وبعده بنفس الشكل) والمستندات من docs */
@Injectable()
export class WorkersRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  rows(collection: string, em: EntityManager = this.ds.manager): Promise<Row[]> {
    return em.query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [collection]);
  }
  async doc(key: string, em: EntityManager = this.ds.manager): Promise<Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const [r] = await em.query(`SELECT data FROM docs WHERE key = $1`, [key]);
    return r?.data && typeof r.data === 'object' ? r.data : {};
  }
  /** قيمة مفتاح doc/meta-flag زي ما هي (العلامات قيمتها boolean) */
  async docValue(key: string, em: EntityManager = this.ds.manager): Promise<unknown> {
    const [r] = await em.query(`SELECT data FROM docs WHERE key = $1`, [key]);
    return r ? r.data : undefined;
  }
  events(id: string, em: EntityManager = this.ds.manager): Promise<{ type: string; key: string }[]> {
    return em.query(`SELECT event_type AS type, idempotency_key AS key FROM integration_events WHERE aggregate_type = 'worker' AND aggregate_id = $1 ORDER BY seq`, [id]);
  }
  /** حدث worker.saved (مرة لكل حفظ — المفتاح بعدد الأحداث السابقة للعامل). من غير الأجور: بتتقرا من السجل بصلاحيتها */
  async addSavedEvent(em: EntityManager, id: string, payload: Record<string, unknown>, by: string): Promise<void> {
    const [{ n }] = await em.query(`SELECT count(*)::int AS n FROM integration_events WHERE aggregate_type = 'worker' AND aggregate_id = $1`, [id]);
    await em.query(`INSERT INTO integration_events (event_type, aggregate_type, aggregate_id, idempotency_key, payload, created_by) VALUES ('worker.saved', 'worker', $1, $2, $3::jsonb, $4)
      ON CONFLICT (idempotency_key) DO NOTHING`, [id, `worker.saved:${id}:${n + 1}`, JSON.stringify(payload), by]);
  }
  async source(em: EntityManager = this.ds.manager): Promise<'legacy-records' | 'relational'> {
    return (await em.query(`SELECT 1 FROM module_cutover WHERE collection = 'workers'`)).length ? 'relational' : 'legacy-records';
  }
}
