import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface FormulaVersionRow {
  id: string; code: string; version: number; status: string; change_kind: string; definition: { variables: Record<string, string>; lists: Record<string, string[]>; steps: { name: string; expr: string; kind?: string }[] };
  test_cases: unknown[]; test_results: unknown; tests_passed: boolean; tested_at: Date | null; conditions: Record<string, unknown>; effective_from: string; effective_to: string | null;
  change_reason: string; created_by: string; created_at: Date; submitted_by: string | null; submitted_at: Date | null; approved_by: string | null; approved_at: Date | null; decision_note: string | null;
  name: string; module: string; description: string | null;
}
const COLS = `v.*, to_char(v.effective_from, 'YYYY-MM-DD') AS effective_from, to_char(v.effective_to, 'YYYY-MM-DD') AS effective_to, f.name, f.module, f.description`;

/** طبقة الوصول لمحرك المعادلات (B-20) — SQL بس */
@Injectable()
export class FormulasRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  private m(em?: EntityManager) { return em ?? this.ds.manager; }
  formulas() { return this.ds.query(`SELECT code, name, module, description, created_at FROM financial_formulas ORDER BY module, code`); }
  async formula(code: string, em?: EntityManager) { return (await this.m(em).query(`SELECT * FROM financial_formulas WHERE code = $1`, [code]))[0] ?? null; }
  insertFormula(f: { code: string; name: string; module: string; description?: string; by: string }, em?: EntityManager) {
    return this.m(em).query(`INSERT INTO financial_formulas (code, name, module, description, created_by) VALUES ($1,$2,$3,$4,$5)`, [f.code, f.name, f.module, f.description ?? null, f.by]);
  }
  versions(code?: string): Promise<FormulaVersionRow[]> {
    return this.ds.query(`SELECT ${COLS} FROM financial_formula_versions v JOIN financial_formulas f USING (code) WHERE ($1::text IS NULL OR v.code = $1) ORDER BY v.code, v.version`, [code ?? null]);
  }
  async version(id: string, em?: EntityManager, lock = false): Promise<FormulaVersionRow | null> {
    return (await this.m(em).query(`SELECT ${COLS} FROM financial_formula_versions v JOIN financial_formulas f USING (code) WHERE v.id::text = $1 ${lock ? 'FOR UPDATE OF v' : ''}`, [id]))[0] ?? null;
  }
  async nextVersion(code: string, em: EntityManager): Promise<number> {
    await em.query(`SELECT 1 FROM financial_formulas WHERE code = $1 FOR UPDATE`, [code]);
    return Number((await em.query(`SELECT coalesce(max(version), 0) + 1 AS n FROM financial_formula_versions WHERE code = $1`, [code]))[0].n);
  }
  async insertVersion(v: Record<string, unknown>, em: EntityManager): Promise<string> {
    const k = Object.keys(v); const json = new Set(['definition', 'test_cases', 'test_results', 'conditions']);
    const [r] = await em.query(`INSERT INTO financial_formula_versions (${k.join(', ')}) VALUES (${k.map((x, i) => (json.has(x) ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(', ')}) RETURNING id`,
      k.map((x) => (json.has(x) ? JSON.stringify(v[x]) : v[x])));
    return r.id;
  }
  update(id: string, set: Record<string, unknown>, em: EntityManager) {
    const k = Object.keys(set);
    return em.query(`UPDATE financial_formula_versions SET ${k.map((x, i) => (x === 'test_results' ? `${x} = $${i + 2}::jsonb` : `${x} = $${i + 2}`)).join(', ')} WHERE id = $1`, [id, ...k.map((x) => (x === 'test_results' ? JSON.stringify(set[x]) : set[x]))]);
  }
  deleteDraft(id: string, em: EntityManager) { return em.query(`DELETE FROM financial_formula_versions WHERE id = $1 AND status = 'draft'`, [id]); }
  approvedAt(code: string, date: string, em?: EntityManager): Promise<FormulaVersionRow[]> {
    return this.m(em).query(`SELECT ${COLS} FROM financial_formula_versions v JOIN financial_formulas f USING (code)
      WHERE v.code = $1 AND v.status = 'approved' AND v.effective_from <= $2::date AND (v.effective_to IS NULL OR v.effective_to >= $2::date)`, [code, date]);
  }
  overlapping(v: FormulaVersionRow, em: EntityManager): Promise<FormulaVersionRow[]> {
    return em.query(`SELECT ${COLS} FROM financial_formula_versions v JOIN financial_formulas f USING (code) WHERE v.code = $1 AND v.status = 'approved' AND v.id <> $2 AND v.conditions = $3::jsonb
      AND daterange(v.effective_from, v.effective_to, '[]') && daterange($4::date, $5::date, '[]') FOR UPDATE OF v`, [v.code, v.id, JSON.stringify(v.conditions), v.effective_from, v.effective_to]);
  }
  async snapshot(docType: string, docId: string, code: string, em?: EntityManager) {
    return (await this.m(em).query(`SELECT s.*, v.version FROM document_formula_snapshots s JOIN financial_formula_versions v ON v.id = s.version_id WHERE document_type = $1 AND document_id = $2 AND formula_code = $3`, [docType, docId, code]))[0] ?? null;
  }
  insertSnapshot(s: { docType: string; docId: string; code: string; versionId: string; inputs: unknown; outputs: unknown; by: string | null }, em: EntityManager) {
    return em.query(`INSERT INTO document_formula_snapshots (document_type, document_id, formula_code, version_id, inputs, outputs, computed_by) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
      [s.docType, s.docId, s.code, s.versionId, JSON.stringify(s.inputs), JSON.stringify(s.outputs), s.by]);
  }
}
