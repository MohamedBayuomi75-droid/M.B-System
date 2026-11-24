import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import type { RecordChangeDto } from '../data/data.dto';
import { DataService } from '../data/data.service';
import { canRead } from '../data/policy';
import { cairoTodayIso } from '../parties/parties.service';
import type { J } from '../workers/worker-rules';
import {
  calcLeaveDays, cards, filterLeaves, KIND_COLL, KINDS, kindLabel, kindOf, labelOf, LEAVE_STATUS, LEAVE_TYPES, leaveBalance, LeaveKind, leavePayload, People, personName, pidOf, syncStatuses,
} from './leave-rules';
import { ListLeavesQuery, SaveLeaveDto, UpdateLeaveDto } from './leaves.dto';
import { LeavesRepository, Row } from './leaves.repository';

type QueryRunner = Parameters<NonNullable<NonNullable<Parameters<DataService['sync']>[2]>['before']>>[0];
type Em = QueryRunner['manager'];
const uid = () => `id_${Date.now().toString(36)}${randomBytes(4).toString('hex').slice(0, 7)}`;
const COLL = 'leaves';
const NAMES = [...LEAVE_TYPES].sort((a, b) => a.label.localeCompare(b.label, 'ar', { sensitivity: 'base' }));

/**
 * الإجازات (8.4.4، DEC-0127) — طبقة الأعمال. القواعد في leave-rules.ts، والمقارنة بالواجهة القديمة في tests-merge/phase80.js.
 *  - القايمة بفلاترها، والكروت، والإضافة («قيد الانتظار»)، والتعديل (الحالة بتفضل)، والموافقة والرفض (للمعلّق بس — د-1)، والحذف.
 *  - **حالة الأشخاص (د-2):** بعد أي تغيير في الإجازات، في نفس المعاملة، syncLeaveStatuses بنفس القاعدة لكل الأنواع (تغييرات «نظام»
 *    مش محتاجة صلاحية على صفحات الأشخاص — زي ما القديمة بتعملها عند الفتح لأي مستخدم). ومرة كل يوم مع أول قراية لصفحة أشخاص أو إجازات (ensureToday).
 *  - **الرصيد (د-3):** employeeLeaveBalance للموظفين.
 *  - الطباعة والتقارير ولوحة المتابعة والتصدير: من الشاشة الكاملة (د-5).
 */
@Injectable()
export class LeavesService {
  constructor(private readonly data: DataService, private readonly repo: LeavesRepository) {}
  private lastSyncDay = '';

  private async people(em?: Em): Promise<{ people: People; raw: Record<LeaveKind, Row[]> }> {
    const rows = await Promise.all(KINDS.map((k) => this.repo.rows(KIND_COLL[k], em)));
    const raw = Object.fromEntries(KINDS.map((k, i) => [k, rows[i]])) as Record<LeaveKind, Row[]>;
    const people = Object.fromEntries(KINDS.map((k, i) => [k, rows[i].map((r) => ({ ...r.data, id: r.id }) as J)])) as unknown as People;
    return { people, raw };
  }
  private async settings(em?: Em) { const s = await this.repo.doc('settings', em); return { excludeFridays: !!s.leaveExcludeFridays, defaultDays: Number(s.defaultLeaveDays) || 21 }; }
  private assert(u: AuthUser, action: 'view' | 'add' | 'edit' | 'delete') {
    const ok = action === 'view' ? canRead(u, COLL) : hasPagePermission(u.permissions, COLL, action);
    if (!ok) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: action === 'view' ? 'ليس لديك صلاحية على الإجازات' : '🔒 ماعندكش صلاحية على الإجازات' });
  }
  /** تغييرات حالة الأشخاص (syncLeaveStatuses) على قايمة إجازات معيّنة — تغييرات «نظام» */
  private statusChanges(people: People, raw: Record<LeaveKind, Row[]>, leaves: J[], today: string): RecordChangeDto[] {
    return syncStatuses(people, leaves, today).map(({ kind, rec }) => {
      const r = raw[kind].find((x) => x.id === rec.id)!;
      return { collection: KIND_COLL[kind], id: rec.id, op: 'upsert', baseRev: r.rev, set: { status: rec.status, leaveAuto: rec.leaveAuto } } as RecordChangeDto;
    });
  }

  /** مرة كل يوم (أول طلب بعد نص الليل بتوقيت القاهرة): نفس اللي القديمة بتعمله عند الفتح. آمن لو اتنفّذ أكتر من مرة (نفس النتيجة) */
  async ensureToday(u: AuthUser): Promise<number> {
    const today = cairoTodayIso();
    if (this.lastSyncDay === today) return 0;
    let n = 0;
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const [{ people, raw }, leaves] = await Promise.all([this.people(qr.manager), this.repo.rows(COLL, qr.manager)]);
        const ch = this.statusChanges(people, raw, leaves.map((r) => ({ ...r.data, id: r.id })), today);
        n = ch.length;
        return ch;
      },
    });
    this.lastSyncDay = today;
    return n;
  }

  async list(u: AuthUser, q: ListLeavesQuery) {
    this.assert(u, 'view');
    await this.ensureToday(u);
    const [rows, { people }] = await Promise.all([this.repo.rows(COLL), this.people()]);
    const all = rows.map((r) => ({ ...r.data, id: r.id, _rev: r.rev }));
    const list = filterLeaves(all, q, people);
    return {
      source: await this.repo.source(), cards: cards(list), types: NAMES, statuses: [...LEAVE_STATUS].sort((a, b) => a.label.localeCompare(b.label, 'ar', { sensitivity: 'base' })),
      rows: list.map(({ _rev, ...l }) => ({ ...l, rev: _rev, personName: personName(people, l), kindLabel: kindLabel(kindOf(l)), typeLabel: labelOf(LEAVE_TYPES, l.type) || l.type || '',
        statusLabel: labelOf(LEAVE_STATUS, l.status || 'pending') || l.status || 'pending' })),
    };
  }
  async get(u: AuthUser, id: string) {
    this.assert(u, 'view');
    const r = (await this.repo.rows(COLL)).find((x) => x.id === id);
    if (!r) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الإجازة غير موجودة' });
    return { ...r.data, id, rev: r.rev, events: await this.repo.events(id) };
  }
  /** خيارات النافذة: النهارده، والأنواع (بترتيب selectOptions)، والأقسام لكل فئة (deptOptionsForKind)، والأشخاص لكل فئة (listEntitiesForKind) */
  async formOptions(u: AuthUser) {
    this.assert(u, 'view');
    const [{ people }, deps, s] = await Promise.all([this.people(), this.repo.rows('departments'), this.settings()]);
    const byName = (xs: J[], f: (x: J) => string) => xs.slice().sort((a, b) => String(f(a) || '').localeCompare(String(f(b) || ''), 'ar', { sensitivity: 'base' }));
    const dl: J[] = deps.map((r) => ({ ...r.data, id: r.id }));
    return {
      today: cairoTodayIso(), types: NAMES, excludeFridays: s.excludeFridays,
      departments: Object.fromEntries(KINDS.map((k) => [k, byName(dl.filter((d) => !d.kind || d.kind === KIND_COLL[k] || d.kind === 'all'), (d) => d.name).map((d) => ({ id: d.id, name: d.name }))])),
      people: Object.fromEntries(KINDS.map((k) => [k, byName(people[k].filter((p) => p && p.id), (p) => p.name || p.code || '')
        .map((p) => ({ id: p.id, name: p.name || '', code: p.code || '', departmentId: p.departmentId || p.categoryId || '' }))])),
      layout: await this.layoutDocs(),
    };
  }
  /** تخطيط نافذة الإجازة المحفوظ (applyFormLayout في القديمة — قراية بس، نفس شكل صفحات الأشخاص) (UAT 8.4 V3) */
  private async layoutDocs() {
    const [fl, af, cf, df, rk, f1, f2, f3, al] = await Promise.all(['formLayouts', 'autoFields', 'customFieldDefs', 'deadFields', '_cfRegKeys', '_cfAllHiddenFixed', '_cfAutoFlagsReset', '_cfShowInTableMigrated', '_cfAligned2'].map((k) => this.repo.docValue(k)));
    const pick = (o: unknown) => { const src = o && typeof o === 'object' ? (o as J) : {}; return src[COLL] !== undefined ? { [COLL]: src[COLL] } : {}; };
    return { formLayouts: pick(fl), autoFields: pick(af), customFieldDefs: pick(cf), deadFields: pick(df), cfRegKeys: pick(rk), aligned: pick(al), flags: { allHiddenFixed: !!f1, autoFlagsReset: !!f2, showInTableMigrated: !!f3 } };
  }
  /** رصيد الإجازة السنوية للموظفين (employeeLeaveBalance) — بالسنة الحالية بتوقيت القاهرة */
  async balances(u: AuthUser, ids?: string[]) {
    if (!canRead(u, 'employees') && !canRead(u, COLL)) throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN', message: 'ليس لديك صلاحية' });
    const [{ people }, rows, s] = await Promise.all([this.people(), this.repo.rows(COLL), this.settings()]);
    const leaves = rows.map((r) => ({ ...r.data, id: r.id }));
    const year = Number(cairoTodayIso().slice(0, 4));
    const emps = people.employee.filter((e) => !ids || ids.includes(e.id));
    return { year, balances: Object.fromEntries(emps.map((e) => [e.id, leaveBalance(e, leaves, year, s.defaultDays, s.excludeFridays)])) };
  }

  /** الحفظ والموافقة والرفض والحذف: تغيير الإجازة + مزامنة حالة الأشخاص، في معاملة واحدة */
  private async write(u: AuthUser, id: string, action: 'requested' | 'updated' | 'approved' | 'rejected' | 'deleted', make: (cur: Row | undefined, s: { excludeFridays: boolean }) => J | null, rev?: number) {
    let saved: J | null = null;
    await this.data.sync(u, { changes: [] }, {
      before: async (qr) => {
        const em = qr.manager;
        const [rows, { people, raw }, s] = await Promise.all([this.repo.rows(COLL, em), this.people(em), this.settings(em)]);
        const cur = rows.find((r) => r.id === id);
        if (rev != null) {
          if (!cur) throw new NotFoundException({ statusCode: 404, code: 'NOT_FOUND', message: 'الإجازة غير موجودة' });
          if (cur.rev !== rev) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'الإجازة اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        }
        const next = make(cur, s);
        saved = next ?? (cur ? { ...cur.data, id } : null);
        const own: RecordChangeDto = next === null
          ? ({ collection: COLL, id, op: 'delete', baseRev: cur!.rev } as RecordChangeDto)
          : !cur ? ({ collection: COLL, id, op: 'upsert', baseRev: 0, set: next } as RecordChangeDto)
            : ({ collection: COLL, id, op: 'upsert', baseRev: cur.rev, set: Object.fromEntries(Object.entries(next).filter(([k, v]) => k !== 'id' && JSON.stringify(v) !== JSON.stringify(cur.data[k]))) } as RecordChangeDto);
        const leaves: J[] = rows.filter((r) => r.id !== id).map((r) => ({ ...r.data, id: r.id }));
        if (next) leaves.push(next);
        const today = cairoTodayIso();
        const derived = this.statusChanges(people, raw, leaves, today);
        // تغيير الإجازة بصلاحية المستخدم (اتفحصت فوق)، وحالة الأشخاص «نظام»
        return [own, ...derived];
      },
      after: async (qr, res) => {
        const mine = res.applied.find((a) => a.collection === COLL && a.id === id);
        if (res.conflicts.length || (mine && mine.overwrote?.length)) throw new ConflictException({ statusCode: 409, code: 'CONFLICT', message: 'الإجازة اتعدّلت من مستخدم تاني — حدّث الصفحة' });
        const l = saved as J | null;
        await this.repo.addEvent(qr.manager, action, id, { id, personKind: l ? kindOf(l) : '', personId: l ? pidOf(l) : '', type: l?.type ?? '', from: l?.from ?? '', to: l?.to ?? '', days: l?.days ?? null, status: l?.status ?? '' }, u.id);
      },
    });
    return action === 'deleted' ? { id, deleted: true } : this.get(u, id);
  }
  private form(dto: SaveLeaveDto) {
    if (!String(dto.personId || '').trim()) throw new BadRequestException({ statusCode: 400, code: 'VALIDATION', message: 'اختر الشخص' });
    return dto;
  }
  async create(u: AuthUser, dto: SaveLeaveDto) {
    this.assert(u, 'add'); const f = this.form(dto); const id = uid();
    return this.write(u, id, 'requested', (_c, s) => leavePayload(f, null, id, s.excludeFridays));
  }
  async update(u: AuthUser, id: string, dto: UpdateLeaveDto) {
    this.assert(u, 'edit'); const f = this.form(dto);
    return this.write(u, id, 'updated', (cur, s) => leavePayload(f, { ...cur!.data, id }, id, s.excludeFridays), dto.rev);
  }
  /** ✓ / ✗ — للطلب «قيد الانتظار» بس (الأزرار في القديمة بتظهر له بس) */
  async decide(u: AuthUser, id: string, rev: number, status: 'approved' | 'rejected') {
    this.assert(u, 'edit');
    return this.write(u, id, status, (cur) => {
      if ((cur!.data.status || 'pending') !== 'pending') throw new ConflictException({ statusCode: 409, code: 'NOT_PENDING', message: 'الطلب مش «قيد الانتظار»' });
      return { ...cur!.data, id, status };
    }, rev);
  }
  async remove(u: AuthUser, id: string, rev: number) { this.assert(u, 'delete'); return this.write(u, id, 'deleted', () => null, rev); }
  /** للاختبارات والتشغيل: حساب الأيام بنفس الإعداد */
  async days(from: string, to: string) { const s = await this.settings(); return calcLeaveDays(from, to, s.excludeFridays); }
}
