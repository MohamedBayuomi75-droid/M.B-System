import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface ProjectRow { id: string; data: Record<string, unknown>; rev: number; updated_at: Date | null }

/**
 * طبقة الوصول للبيانات: استعلامات موديول المشروعات (TARGET_ARCHITECTURE §4، §5).
 * المصدر `legacy_records` (7.4.3، DEC-0117): قبل النقل بيقرا من records، وبعد `cutover projects execute` من جدول `projects`
 * بنفس الشكل القديم بالظبط — فالـ Service مابيعرفش مكان التخزين (اتشال مسار PROJECTS_SOURCE بتاع المرحلة 5).
 */
@Injectable()
export class ProjectsRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async source(em: EntityManager = this.ds.manager): Promise<'legacy-records' | 'relational'> {
    const r = await em.query(`SELECT 1 FROM module_cutover WHERE collection = 'projects'`);
    return r.length ? 'relational' : 'legacy-records';
  }

  findAll(em: EntityManager = this.ds.manager): Promise<ProjectRow[]> {
    return em.query(`SELECT id, data, rev, updated_at FROM legacy_records WHERE collection = 'projects' AND deleted_at IS NULL ORDER BY created_at, id`);
  }

  async findById(id: string, em: EntityManager = this.ds.manager): Promise<ProjectRow | null> {
    const rows: ProjectRow[] = await em.query(`SELECT id, data, rev, updated_at FROM legacy_records WHERE collection = 'projects' AND id = $1 AND deleted_at IS NULL`, [id]);
    return rows[0] ?? null;
  }

  /** سجلات أي مجموعة بالشكل القديم (legacy_records) — القواعد بتقرا منها المشروعات والسجلات المربوطة (نشر الاسم، والموارد) */
  rows(collection: string, em: EntityManager = this.ds.manager): Promise<{ id: string; data: Record<string, any>; rev: number }[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return em.query(`SELECT id, data, rev FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [collection]);
  }
  /** مسار المشروع المعتمد من إعدادات العملاء (clients.settings.projectWorkflow) — null = الافتراضي */
  async settingsWorkflow(em: EntityManager = this.ds.manager): Promise<unknown> {
    const [r] = await em.query(`SELECT data FROM docs WHERE key = 'clients.settings'`);
    return r?.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>).projectWorkflow : null;
  }
  events(id: string, em: EntityManager = this.ds.manager): Promise<{ type: string; key: string }[]> {
    return em.query(`SELECT event_type AS type, idempotency_key AS key FROM integration_events WHERE aggregate_type = 'project' AND aggregate_id = $1 ORDER BY seq`, [id]);
  }
  /** حدث project.saved في صندوق integration_events (مرة لكل حفظ — المفتاح بعدد الأحداث السابقة للمشروع) */
  async addSavedEvent(em: EntityManager, id: string, payload: Record<string, unknown>, by: string): Promise<void> {
    const [{ n }] = await em.query(`SELECT count(*)::int AS n FROM integration_events WHERE aggregate_type = 'project' AND aggregate_id = $1`, [id]);
    await em.query(`INSERT INTO integration_events (event_type, aggregate_type, aggregate_id, idempotency_key, payload, created_by) VALUES ('project.saved', 'project', $1, $2, $3::jsonb, $4)
      ON CONFLICT (idempotency_key) DO NOTHING`, [id, `project.saved:${id}:${n + 1}`, JSON.stringify(payload), by]);
  }

  // ---------- خطة الترحيل (قراءة بس — مفيش كتابة)
  legacyProjects(em: EntityManager = this.ds.manager): Promise<ProjectRow[]> {
    return em.query(`SELECT id, data, rev, updated_at FROM legacy_records WHERE collection = 'projects' AND deleted_at IS NULL ORDER BY id`);
  }
  /** الربط بالاسم في السجلات (B-34): لكل مجموعة، عدد السجلات اللي فيها اسم مشروع، ومنهم المربوط بمعرّف، وتجميع الأسماء */
  nameLinks(em: EntityManager = this.ds.manager): Promise<{ collection: string; name: string; records: number; with_id: number }[]> {
    return em.query(`SELECT collection, btrim(data->>'project') AS name, count(*)::int AS records, count(*) FILTER (WHERE coalesce(data->>'projectId','') <> '')::int AS with_id
      FROM legacy_records WHERE deleted_at IS NULL AND coalesce(btrim(data->>'project'), '') <> '' GROUP BY 1, 2 ORDER BY 1, 2`);
  }
  relationalCount(em: EntityManager = this.ds.manager): Promise<number> { return em.query(`SELECT count(*)::int AS n FROM projects WHERE deleted_at IS NULL`).then((r: { n: number }[]) => r[0].n); }
}
