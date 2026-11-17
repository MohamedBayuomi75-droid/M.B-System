import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface ProjectRow { id: string; data: Record<string, unknown>; rev: number; updated_at: Date | null }

/**
 * طبقة الوصول للبيانات: استعلامات موديول المشروعات على **بياناته بس** (TARGET_ARCHITECTURE §4، §5).
 * حاليًا المصدر الطبقة الانتقالية (records/collection='projects') — لما الموديول يتنقل لجداول علائقية (المرحلة 5)
 * التغيير هنا بس؛ الـ Service والـ Controller مش بيعرفوا مكان التخزين. قراءة بس — مفيش كتابة في المرحلة 4.
 */
@Injectable()
export class ProjectsRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** المصدر: legacy (الطبقة الانتقالية — الافتراضي) أو relational (جدول projects — بعد ترحيل معتمد في المرحلة 6 بس) */
  source(): 'legacy-records' | 'relational' { return process.env.PROJECTS_SOURCE === 'relational' ? 'relational' : 'legacy-records'; }

  private static REL = `SELECT id, jsonb_strip_nulls(jsonb_build_object('code', code, 'name', name, 'status', status, 'stageKey', stage, 'budget', budget::text,
    'customerId', customer_id, 'supervisorId', supervisor_id)) AS data, row_version AS rev, updated_at FROM projects`;

  async findAll(em: EntityManager = this.ds.manager): Promise<ProjectRow[]> {
    if (this.source() === 'relational') return em.query(ProjectsRepository.REL);
    return em.query(`SELECT id, data, rev, updated_at FROM records WHERE collection = 'projects' AND deleted_at IS NULL`);
  }

  async findById(id: string, em: EntityManager = this.ds.manager): Promise<ProjectRow | null> {
    const rows: ProjectRow[] = this.source() === 'relational'
      ? await em.query(`${ProjectsRepository.REL} WHERE id = $1`, [id])
      : await em.query(`SELECT id, data, rev, updated_at FROM records WHERE collection = 'projects' AND id = $1 AND deleted_at IS NULL`, [id]);
    return rows[0] ?? null;
  }

  // ---------- خطة الترحيل (قراءة بس — مفيش كتابة)
  legacyProjects(em: EntityManager = this.ds.manager): Promise<ProjectRow[]> {
    return em.query(`SELECT id, data, rev, updated_at FROM records WHERE collection = 'projects' AND deleted_at IS NULL ORDER BY id`);
  }
  /** الربط بالاسم في السجلات (B-34): لكل مجموعة، عدد السجلات اللي فيها اسم مشروع بس من غير معرّف، وتجميع الأسماء */
  nameLinks(em: EntityManager = this.ds.manager): Promise<{ collection: string; name: string; records: number; with_id: number }[]> {
    return em.query(`SELECT collection, btrim(data->>'project') AS name, count(*)::int AS records, count(*) FILTER (WHERE coalesce(data->>'projectId','') <> '')::int AS with_id
      FROM records WHERE deleted_at IS NULL AND coalesce(btrim(data->>'project'), '') <> '' GROUP BY 1, 2 ORDER BY 1, 2`);
  }
  relationalCount(em: EntityManager = this.ds.manager): Promise<number> { return em.query(`SELECT count(*)::int AS n FROM projects`).then((r: { n: number }[]) => r[0].n); }
}
