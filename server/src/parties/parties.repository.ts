import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface PartyRow { id: string; data: Record<string, unknown>; rev: number; created_at: Date; updated_at: Date | null }
export const SUPPLIERS = 'ledger.suppliers';
export const CUSTOMERS = 'clients.customers';

/**
 * طبقة الوصول لبيانات الموردين والعملاء (المرحلة 6.1). القراءة من الطبقة الانتقالية (records) — نفس المصدر
 * اللي الواجهة القديمة بتكتب فيه. الكتابة مش هنا: بتمر بـ DataService.sync عشان تفضل نسخة واحدة قابلة للكتابة
 * (بنفس الصلاحيات والتعارض والبث اللحظي والتدقيق). الجداول العلائقية (suppliers/customers) بتتملى بالترحيل بس.
 */
@Injectable()
export class PartiesRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  all(collection: string): Promise<PartyRow[]> {
    return this.ds.query(`SELECT id, data, rev, created_at, updated_at FROM records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [collection]);
  }
  async one(collection: string, id: string): Promise<PartyRow | null> {
    return (await this.ds.query(`SELECT id, data, rev, created_at, updated_at FROM records WHERE collection = $1 AND id = $2 AND deleted_at IS NULL`, [collection, id]))[0] ?? null;
  }
  /** عدد الفواتير/المرتجعات والدفعات لكل مورد (للعرض والتحقق — الأرصدة نفسها في 6.3/6.4) */
  async supplierDocCounts(): Promise<Map<string, { invoices: number; payments: number }>> {
    const rows: { sid: string; c: string; n: number }[] = await this.ds.query(
      `SELECT data->>'supplierId' AS sid, collection AS c, count(*)::int AS n FROM records
       WHERE collection IN ('ledger.invoices', 'ledger.payments') AND deleted_at IS NULL GROUP BY 1, 2`);
    const m = new Map<string, { invoices: number; payments: number }>();
    for (const r of rows) {
      const e = m.get(r.sid) ?? { invoices: 0, payments: 0 };
      if (r.c === 'ledger.invoices') e.invoices = r.n; else e.payments = r.n;
      m.set(r.sid, e);
    }
    return m;
  }
  async clientsSettings(): Promise<Record<string, unknown>> {
    const [r] = await this.ds.query(`SELECT data FROM docs WHERE key = 'clients.settings'`);
    return (r?.data && typeof r.data === 'object') ? r.data : {};
  }
  relationalCounts(): Promise<{ suppliers: number; customers: number }> {
    return this.ds.query(`SELECT (SELECT count(*)::int FROM suppliers) AS suppliers, (SELECT count(*)::int FROM customers) AS customers`).then((r) => r[0]);
  }
}
