import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface AdjustmentRow {
  id: string; kind: string; direction: 'in' | 'out' | 'transfer'; item_id: string; location_id: string; to_location_id: string | null; qty: string; reason: string;
  status: string; approval_request_id: string | null; movement_id: string | null; post_error: string | null; created_by: string; created_at: Date;
  submitted_at: Date | null; approved_at: Date | null; posted_by: string | null; posted_at: Date | null; cancel_reason: string | null; row_version: number;
}

/** طبقة الوصول للتسويات المخزنية (B-51) — SQL بس */
@Injectable()
export class StockRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  private m(em?: EntityManager) { return em ?? this.ds.manager; }
  list(): Promise<AdjustmentRow[]> { return this.ds.query(`SELECT * FROM stock_adjustments ORDER BY created_at DESC LIMIT 500`); }
  async get(id: string, em?: EntityManager, lock = false): Promise<AdjustmentRow | null> {
    return (await this.m(em).query(`SELECT * FROM stock_adjustments WHERE id::text = $1 ${lock ? 'FOR UPDATE' : ''}`, [id]))[0] ?? null;
  }
  async insert(a: { kind: string; direction: string; item: string; location: string; to: string | null; qty: string; reason: string; by: string }): Promise<string> {
    const [r] = await this.ds.query(`INSERT INTO stock_adjustments (kind, direction, item_id, location_id, to_location_id, qty, reason, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [a.kind, a.direction, a.item, a.location, a.to, a.qty, a.reason, a.by]);
    return r.id;
  }
  update(id: string, set: Record<string, unknown>, em?: EntityManager) {
    const k = Object.keys(set);
    return this.m(em).query(`UPDATE stock_adjustments SET ${k.map((x, i) => `${x} = $${i + 2}`).join(', ')}, row_version = row_version + 1 WHERE id = $1`, [id, ...k.map((x) => set[x])]);
  }
  /** الصنف والمخزن لازم يكونوا موجودين في بيانات المخازن */
  async exists(collection: 'warehouses.items' | 'warehouses.locations', id: string): Promise<boolean> {
    return (await this.ds.query(`SELECT 1 FROM legacy_records WHERE collection = $1 AND id = $2 AND deleted_at IS NULL`, [collection, id])).length > 0;
  }
}
