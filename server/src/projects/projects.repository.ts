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

  async findAll(em: EntityManager = this.ds.manager): Promise<ProjectRow[]> {
    return em.query(`SELECT id, data, rev, updated_at FROM records WHERE collection = 'projects' AND deleted_at IS NULL`);
  }

  async findById(id: string, em: EntityManager = this.ds.manager): Promise<ProjectRow | null> {
    const rows: ProjectRow[] = await em.query(`SELECT id, data, rev, updated_at FROM records WHERE collection = 'projects' AND id = $1 AND deleted_at IS NULL`, [id]);
    return rows[0] ?? null;
  }
}
