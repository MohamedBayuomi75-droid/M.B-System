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
    return { items: items.slice(off, off + (q.limit ?? 100)), total, source: this.repo.source() };
  }

  async get(user: AuthUser, id: string): Promise<ProjectDto> {
    this.assertCanRead(user);
    const r = await this.repo.findById(id);
    // خارج النطاق = 404 (مانكشفش إن المشروع موجود)
    if (!r || !inProjectScope(user, 'projects', { ...r.data, id: r.id })) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'المشروع غير موجود' });
    return this.toDto(r);
  }

  /**
   * خطة ترحيل المشروعات للجدول العلائقي (B-34، B-28) — **قراءة بس، مفيش أي كتابة**. التنفيذ في المرحلة 6 بموافقة منفصلة
   * وبعد نسخة احتياطية واستعادة ناجحة. بتطلّع: السجلات اللي هتتنقل، وفروق تقريب الميزانية (4 خانات HALF_UP) لكل سجل،
   * والتعارضات اللي هتمنع الترحيل (اسم فاضي، اسم/كود مكرر)، وربط السجلات بالاسم (مطابق لمشروع / مش مطابق).
   */
  async migrationPlan() {
    const rows = await this.repo.legacyProjects();
    const items = rows.map((r) => {
      const d = r.data;
      const name = String(d.name ?? '').trim();
      const b = d.budget;
      let original: string | null = null, migrated: string | null = null, invalidBudget = false;
      if (typeof b === 'number' && Number.isFinite(b)) { original = Money.fromNumberUnsafe(b).toString(); migrated = Money.fromNumberUnsafe(b).round().toFixed(); }
      else if (typeof b === 'string' && b.trim()) { try { original = Money.of(b.replace(/,/g, '')).toString(); migrated = Money.of(original).round().toFixed(); } catch { invalidBudget = true; original = b; } }
      const negative = migrated != null && Money.of(migrated).isNegative();
      return { id: r.id, name, code: d.code == null || d.code === '' ? null : String(d.code), budget: { original, migrated, diff: original != null && migrated != null ? Money.of(migrated).minus(original).toString() : null, invalid: invalidBudget, negative } };
    });
    const dup = (key: (x: (typeof items)[number]) => string | null) => {
      const m = new Map<string, string[]>();
      for (const it of items) { const k = key(it); if (k) m.set(k, [...(m.get(k) ?? []), it.id]); }
      return [...m.entries()].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({ value, ids }));
    };
    const names = new Set(items.map((i) => i.name));
    const links = await this.repo.nameLinks();
    const blockers = { emptyName: items.filter((i) => !i.name).map((i) => i.id), duplicateNames: dup((i) => i.name || null), duplicateCodes: dup((i) => (i.code ? i.code.toLowerCase() : null)), invalidBudget: items.filter((i) => i.budget.invalid).map((i) => i.id), negativeBudget: items.filter((i) => i.budget.negative).map((i) => i.id) };
    return {
      dryRun: true, executed: false, relationalRowsNow: await this.repo.relationalCount(),
      projects: { count: items.length, roundingChanges: items.filter((i) => i.budget.diff && i.budget.diff !== '0').map((i) => ({ id: i.id, ...i.budget })), items },
      blockers, ready: Object.values(blockers).every((x) => x.length === 0),
      nameLinks: {
        byCollection: Object.values(links.reduce((acc: Record<string, { collection: string; records: number; nameOnly: number; matched: number; unmatchedNames: string[] }>, l) => {
          const a = (acc[l.collection] ??= { collection: l.collection, records: 0, nameOnly: 0, matched: 0, unmatchedNames: [] });
          a.records += l.records; a.nameOnly += l.records - l.with_id;
          if (names.has(l.name)) a.matched += l.records; else a.unmatchedNames.push(l.name);
          return acc;
        }, {})),
      },
    };
  }
}
