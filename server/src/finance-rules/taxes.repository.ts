import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type { TaxVersion } from './tax-calc';

export interface VersionRow {
  id: string; code: string; version: number; status: string; method: TaxVersion['method']; rate: string | null; template_rate: string | null; fixed_amount: string | null; brackets: TaxVersion['brackets'];
  base: TaxVersion['base']; base_ratio: string; min_base: string | null; applies_to: string[]; bearer: string; collector: string; conditions: TaxVersion['conditions'];
  exemptions: TaxVersion['exemptions']; allow_stacking: boolean; effective_from: string; effective_to: string | null; legal_ref: string | null; notes_cfo: string | null; notes_advisor: string | null;
  change_reason: string; created_by: string; created_at: Date; submitted_by: string | null; submitted_at: Date | null; approved_by: string | null; approved_at: Date | null; decision_note: string | null; category: string;
}
const COLS = `v.*, to_char(v.effective_from, 'YYYY-MM-DD') AS effective_from, to_char(v.effective_to, 'YYYY-MM-DD') AS effective_to, c.category`;

/** طبقة الوصول لمحرك القواعد المالية — عائلة الضرائب (SQL بس) */
@Injectable()
export class TaxesRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  private m(em?: EntityManager) { return em ?? this.ds.manager; }

  codes() { return this.ds.query(`SELECT code, name, category, is_tax, status, created_at FROM tax_codes ORDER BY code`); }
  async code(code: string, em?: EntityManager) { return (await this.m(em).query(`SELECT * FROM tax_codes WHERE code = $1`, [code]))[0] ?? null; }
  insertCode(c: { code: string; name: string; category: string; by: string }, em?: EntityManager) {
    return this.m(em).query(`INSERT INTO tax_codes (code, name, category, is_tax, created_by) VALUES ($1, $2, $3, $4, $5)`, [c.code, c.name, c.category, c.category !== 'CONTRACTUAL', c.by]);
  }
  versions(code?: string): Promise<VersionRow[]> {
    return this.ds.query(`SELECT ${COLS} FROM tax_code_versions v JOIN tax_codes c USING (code) WHERE ($1::text IS NULL OR v.code = $1) ORDER BY v.code, v.version`, [code ?? null]);
  }
  async version(id: string, em?: EntityManager, lock = false): Promise<VersionRow | null> {
    return (await this.m(em).query(`SELECT ${COLS} FROM tax_code_versions v JOIN tax_codes c USING (code) WHERE v.id::text = $1 ${lock ? 'FOR UPDATE OF v' : ''}`, [id]))[0] ?? null;
  }
  async nextVersion(code: string, em: EntityManager): Promise<number> {
    await em.query(`SELECT 1 FROM tax_codes WHERE code = $1 FOR UPDATE`, [code]);
    return Number((await em.query(`SELECT coalesce(max(version), 0) + 1 AS n FROM tax_code_versions WHERE code = $1`, [code]))[0].n);
  }
  async insertVersion(v: Record<string, unknown>, em: EntityManager): Promise<string> {
    const keys = Object.keys(v);
    const [r] = await em.query(`INSERT INTO tax_code_versions (${keys.join(', ')}) VALUES (${keys.map((k, i) => (k === 'brackets' || k === 'conditions' || k === 'exemptions' ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(', ')}) RETURNING id`,
      keys.map((k) => (k === 'brackets' || k === 'conditions' || k === 'exemptions' ? (v[k] == null ? null : JSON.stringify(v[k])) : v[k])));
    return r.id;
  }
  setStatus(id: string, set: Record<string, unknown>, em: EntityManager) {
    const keys = Object.keys(set);
    return em.query(`UPDATE tax_code_versions SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} WHERE id = $1`, [id, ...keys.map((k) => set[k])]);
  }
  deleteDraft(id: string, em: EntityManager) { return em.query(`DELETE FROM tax_code_versions WHERE id = $1 AND status = 'draft'`, [id]); }
  /** الإصدارات المعتمدة السارية في تاريخ معيّن (للحساب) */
  approvedAt(codes: string[], date: string, em?: EntityManager): Promise<VersionRow[]> {
    return this.m(em).query(`SELECT ${COLS} FROM tax_code_versions v JOIN tax_codes c USING (code)
      WHERE v.status = 'approved' AND c.status = 'active' AND v.code = ANY($1) AND v.effective_from <= $2::date AND (v.effective_to IS NULL OR v.effective_to >= $2::date)`, [codes, date]);
  }
  /** إصدارات معتمدة لنفس الكود بنفس الشروط ونطاق سريان متداخل */
  overlapping(v: VersionRow, em: EntityManager): Promise<VersionRow[]> {
    return em.query(`SELECT ${COLS} FROM tax_code_versions v JOIN tax_codes c USING (code) WHERE v.code = $1 AND v.status = 'approved' AND v.id <> $2 AND v.conditions = $3::jsonb
      AND daterange(v.effective_from, v.effective_to, '[]') && daterange($4::date, $5::date, '[]') FOR UPDATE OF v`, [v.code, v.id, JSON.stringify(v.conditions), v.effective_from, v.effective_to]);
  }
  insertTaxLines(docType: string, docId: string, lines: { code: string; versionId: string; baseAmount: string; taxableAmount: string; rate: string | null; amount: string; exemptReason: string | null }[], by: string | null, em: EntityManager) {
    return Promise.all(lines.map((l, i) => em.query(`INSERT INTO document_tax_lines (document_type, document_id, line_no, code, version_id, base_amount, taxable_amount, rate, amount, exempt_reason, computed_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [docType, docId, i + 1, l.code, l.versionId, l.baseAmount, l.taxableAmount, l.rate, l.amount, l.exemptReason, by])));
  }
  documentLines(docType: string, docId: string) {
    return this.ds.query(`SELECT d.*, v.version FROM document_tax_lines d JOIN tax_code_versions v ON v.id = d.version_id WHERE document_type = $1 AND document_id = $2 ORDER BY line_no`, [docType, docId]);
  }
}
