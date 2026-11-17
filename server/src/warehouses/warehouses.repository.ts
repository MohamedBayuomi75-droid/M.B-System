import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface Rec { id: string; data: Record<string, unknown>; rev: number }

/** طبقة الوصول لبيانات المخازن (6.2-ب) — القراءة من legacy_records (records قبل النقل والجداول بعده). الكتابة عن طريق DataService.sync */
@Injectable()
export class WarehousesRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  all(collection: string): Promise<Rec[]> {
    return this.ds.query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [collection]);
  }
  async one(collection: string, id: string): Promise<Rec | null> {
    return (await this.ds.query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND id = $2 AND deleted_at IS NULL`, [collection, id]))[0] ?? null;
  }
  movements(itemId: string | null, limit: number): Promise<Rec[]> {
    return this.ds.query(`SELECT id, data, rev FROM legacy_records WHERE collection = 'warehouses.movements' AND deleted_at IS NULL AND ($1::text IS NULL OR data->>'itemId' = $1)
      ORDER BY created_at DESC, id DESC LIMIT $2`, [itemId, limit]);
  }
  /** الأرصدة (صنف × مخزن) بنفس دالة B-50 في قاعدة البيانات — المحجوز والمتاح كمان */
  balances(): Promise<{ item_id: string; location_id: string; balance: string; reserved: string }[]> {
    return this.ds.query(`WITH pairs AS (
        SELECT DISTINCT data->>'itemId' AS item_id, coalesce(data->>'locationId', '') AS location_id FROM legacy_records WHERE collection = 'warehouses.movements' AND deleted_at IS NULL
        UNION SELECT DISTINCT data->>'itemId', data->>'toLocationId' FROM legacy_records WHERE collection = 'warehouses.movements' AND deleted_at IS NULL AND data->>'type' = 'transfer')
      SELECT item_id, location_id, wh_balance(item_id, location_id)::text AS balance, wh_reserved(item_id, location_id)::text AS reserved FROM pairs`);
  }
  async settings(): Promise<Record<string, unknown>> {
    const [r] = await this.ds.query(`SELECT data FROM docs WHERE key = 'warehouses.settings'`);
    return r?.data && typeof r.data === 'object' ? r.data : {};
  }
}
