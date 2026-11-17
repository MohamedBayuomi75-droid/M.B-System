import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { Money } from '../common/money';
import { canRead, inProjectScope } from '../data/policy';
import { ProjectDto, ProjectListDto } from './projects.dto';
import { ProjectRow, ProjectsRepository } from './projects.repository';

/**
 * طبقة الأعمال: الصلاحيات ونطاق المشروع وتحويل القيم (المبالغ ← Money نص بأربع خانات). مفيش SQL هنا.
 * نفس قواعد صلاحيات الطبقة الانتقالية (canRead/inProjectScope) — السيرفر هو المرجع.
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  private assertCanRead(user: AuthUser) {
    if (!canRead(user, 'projects')) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية على المشروعات' });
  }

  private toDto(r: ProjectRow): ProjectDto {
    const d = r.data;
    const str = (v: unknown) => (v == null || v === '' ? null : String(v));
    let budget: string | null = null;
    const b = d.budget;
    if (typeof b === 'number' && Number.isFinite(b)) budget = Money.fromNumberUnsafe(b).round().toFixed();
    else if (typeof b === 'string' && b.trim()) { try { budget = Money.of(b.replace(/,/g, '')).round().toFixed(); } catch { budget = null; } }
    return {
      id: r.id, code: str(d.code), name: String(d.name ?? ''), status: str(d.status), stage: str(d.stageKey ?? d.stage),
      budget, supervisorId: str(d.supervisorId), customerId: str(d.customerId), rev: r.rev, updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
    };
  }

  async list(user: AuthUser, q: { q?: string; status?: string; sort?: 'name' | 'code'; limit?: number; offset?: number }): Promise<ProjectListDto> {
    this.assertCanRead(user);
    const needle = (q.q ?? '').trim().toLowerCase();
    let items = (await this.repo.findAll())
      .filter((r) => inProjectScope(user, 'projects', { ...r.data, id: r.id }))
      .map((r) => this.toDto(r))
      .filter((p) => (!q.status || p.status === q.status) && (!needle || p.name.toLowerCase().includes(needle) || (p.code ?? '').toLowerCase().includes(needle)));
    const key = q.sort ?? 'name';
    items = items.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'ar'));
    const total = items.length;
    const off = q.offset ?? 0;
    return { items: items.slice(off, off + (q.limit ?? 100)), total, source: 'legacy-records' };
  }

  async get(user: AuthUser, id: string): Promise<ProjectDto> {
    this.assertCanRead(user);
    const r = await this.repo.findById(id);
    // خارج النطاق = 404 (مانكشفش إن المشروع موجود)
    if (!r || !inProjectScope(user, 'projects', { ...r.data, id: r.id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المشروع غير موجود' });
    return this.toDto(r);
  }
}
