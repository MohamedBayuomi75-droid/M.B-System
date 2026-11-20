import { Injectable, NotFoundException } from '@nestjs/common';
import { COLLECTIONS_MAP } from '../data/collections-map.generated';
import { ReferenceRepository } from './reference.repository';

/** مفاتيح القوايم المرجعية من كتالوج البيانات المولَّد (النوع lookup) — مفيش قايمة مكتوبة باليد */
export const REFERENCE_KEYS: readonly string[] = Object.keys(COLLECTIONS_MAP).filter((k) => COLLECTIONS_MAP[k] === 'lookup').sort();

const count = (data: unknown) => (Array.isArray(data) ? data.length : data && typeof data === 'object' ? Object.keys(data).length : 0);

/**
 * البيانات المرجعية المشتركة (خطة v1.4.5 — المرحلة 5، البند 5.3): قراءة بس للموديولات الجديدة.
 * الصلاحية زي القديمة بالظبط (DOC_ACCESS: القراءة لأي مستخدم مسجّل). الكتابة لسه من الواجهة القديمة (/api/sync)
 * لحد ما الموديول اللي بيملك القايمة يتنقل.
 */
@Injectable()
export class ReferenceService {
  constructor(private readonly repo: ReferenceRepository) {}
  async list() {
    const rows = new Map((await this.repo.many([...REFERENCE_KEYS])).map((r) => [r.key, r]));
    return { items: REFERENCE_KEYS.map((key) => ({ key, count: count(rows.get(key)?.data), rev: rows.get(key)?.rev ?? 0 })) };
  }
  async get(key: string) {
    if (!REFERENCE_KEYS.includes(key)) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'قايمة مرجعية غير معروفة' });
    const [r] = await this.repo.many([key]);
    const items = r?.data ?? [];
    return { key, rev: r?.rev ?? 0, count: count(items), items };
  }
}
