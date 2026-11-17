import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { AuthErrorCode, AuthUser } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { effectivePermissions } from '../authz/effective-permissions';
import { roleTemplates, RoleKey, isRoleKey, ROLES_REQUIRING_PROJECT_SCOPE } from '../authz/roles';
import { UserEntity, UserPermissionEntity } from '../entities';
import { DomainEvents } from '../events/domain-events';
import { SessionsService } from './sessions.service';
import { CreateUserDto, PageOverrideDto, ResetPasswordDto, UpdateUserDto, UserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly events: DomainEvents,
  ) {}

  private get users() { return this.ds.getRepository(UserEntity); }
  private get overrides() { return this.ds.getRepository(UserPermissionEntity); }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.users.createQueryBuilder('u').where('lower(u.username) = lower(:n)', { n: String(username ?? '') }).getOne();
  }

  /** المستخدم الموثّق بكل صلاحياته — null لو مش موجود أو متعطل */
  async loadAuthUser(id: string): Promise<AuthUser | null> {
    const u = await this.users.findOneBy({ id });
    if (!u || !u.active) return null;
    const ov = await this.overrides.findBy({ userId: id });
    return {
      id: u.id, username: u.username, name: u.name, role: u.role,
      mustChangePassword: u.mustChangePassword, tokenVersion: u.tokenVersion, projectScope: u.projectScope,
      permissions: effectivePermissions(u, ov),
      twoFactorEnabled: u.totpEnabled,
      twoFactorSetupRequired: !u.totpEnabled && requires2fa(u.role),
    };
  }

  async list(): Promise<UserDto[]> {
    const all = await this.users.find({ order: { createdAt: 'ASC' } });
    const ov = await this.overrides.find();
    return all.map((u) => this.toDto(u, ov.filter((o) => o.userId === u.id)));
  }

  async get(id: string): Promise<UserDto> {
    const u = await this.users.findOneBy({ id });
    if (!u) throw new NotFoundException('المستخدم مش موجود');
    return this.toDto(u, await this.overrides.findBy({ userId: id }));
  }

  async create(dto: CreateUserDto, actor: AuthUser): Promise<UserDto> {
    const role = (dto.role ?? 'viewer') as RoleKey;
    this.assertCanAssign(actor, role, dto.manageUsers);
    this.assertProjectScope(role, dto.projectScope ?? null);
    const err = this.passwords.policyError(dto.password);
    if (err) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.WEAK_PASSWORD, message: err });
    if (await this.findByUsername(dto.username)) throw new ConflictException('اسم المستخدم موجود قبل كده');
    const tpl = roleTemplates()[role];
    const pw = await this.passwords.hash(dto.password);
    try {
      return await this.ds.transaction(async (em) => {
        const u = await em.getRepository(UserEntity).save({
          username: dto.username.trim(),
          name: dto.name?.trim() ?? '',
          role,
          active: dto.active ?? true,
          passwordAlgo: pw.algo, passwordHash: pw.hash, passwordSalt: null,
          mustChangePassword: dto.mustChangePassword ?? false,
          passwordChangedAt: new Date(),
          canEditData: dto.editData ?? tpl.editData,
          canDeleteData: dto.deleteData ?? tpl.deleteData,
          canManageUsers: dto.manageUsers ?? tpl.manageUsers,
          projectScope: dto.projectScope ?? null,
        });
        if (dto.pages) await this.replaceOverrides(em, u.id, dto.pages);
        return this.toDto(u, await em.getRepository(UserPermissionEntity).findBy({ userId: u.id }));
      });
    } catch (e) {
      if (e instanceof QueryFailedError && /uq_users_username_lower/.test(e.message)) throw new ConflictException('اسم المستخدم موجود قبل كده');
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser): Promise<{ user: UserDto; changed: string[] }> {
    const res = await this.ds.transaction(async (em) => {
      const repo = em.getRepository(UserEntity);
      const u = await repo.createQueryBuilder('u').setLock('pessimistic_write').where('u.id = :id', { id }).getOne();
      if (!u) throw new NotFoundException('المستخدم مش موجود');
      if (u.role === 'admin' && actor.role !== 'admin') throw new ForbiddenException({ statusCode: 403, code: AuthErrorCode.FORBIDDEN, message: 'تعديل حساب أدمن للأدمن بس' });
      const newRole = (dto.role ?? u.role) as RoleKey;
      this.assertCanAssign(actor, newRole, dto.manageUsers);

      const losingAdmin = u.role === 'admin' && u.active && (newRole !== 'admin' || dto.active === false);
      if (id === actor.id && (losingAdmin || dto.active === false || (dto.role && dto.role !== u.role))) {
        throw new BadRequestException('مينفعش تعطّل حسابك أو تغيّر دورك بنفسك');
      }
      if (losingAdmin) await this.assertAnotherActiveAdmin(em, id);
      this.assertProjectScope(newRole, dto.projectScope !== undefined ? dto.projectScope : u.projectScope);

      const changed: string[] = [];
      const set = <K extends keyof UserEntity>(k: K, v: UserEntity[K] | undefined) => {
        if (v !== undefined && JSON.stringify(u[k]) !== JSON.stringify(v)) { u[k] = v; changed.push(String(k)); }
      };
      set('name', dto.name?.trim());
      if (dto.role && dto.role !== u.role) {
        // تغيير الدور: الأعلام بتتاخد من القالب الجديد إلا لو اتبعتت صراحةً
        const tpl = roleTemplates()[newRole];
        set('role', newRole);
        set('canEditData', dto.editData ?? tpl.editData);
        set('canDeleteData', dto.deleteData ?? tpl.deleteData);
        set('canManageUsers', dto.manageUsers ?? tpl.manageUsers);
      } else {
        set('canEditData', dto.editData);
        set('canDeleteData', dto.deleteData);
        set('canManageUsers', dto.manageUsers);
      }
      set('active', dto.active);
      if (dto.projectScope !== undefined) set('projectScope', dto.projectScope);
      if (changed.length) await repo.save(u);
      if (dto.pages) { await this.replaceOverrides(em, id, dto.pages); changed.push('pages'); }
      if (dto.active === false && changed.includes('active')) await this.sessions.revokeAll(id, true, em);
      return { user: this.toDto(u, await em.getRepository(UserPermissionEntity).findBy({ userId: id })), changed };
    });
    if (res.changed.length) this.events.emit('user.changed', id);
    return res;
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actor: AuthUser): Promise<void> {
    const u = await this.users.findOneBy({ id });
    if (!u) throw new NotFoundException('المستخدم مش موجود');
    if (u.role === 'admin' && actor.role !== 'admin') throw new ForbiddenException({ statusCode: 403, code: AuthErrorCode.FORBIDDEN, message: 'تعديل حساب أدمن للأدمن بس' });
    await this.setPassword(id, dto.newPassword, dto.mustChangePassword ?? true);
  }

  /** يغيّر كلمة المرور (بعد التحقق من السياسة) ويلغي كل الجلسات والـ access tokens */
  async setPassword(id: string, newPassword: string, mustChange: boolean): Promise<void> {
    const err = this.passwords.policyError(newPassword);
    if (err) throw new BadRequestException({ statusCode: 400, code: AuthErrorCode.WEAK_PASSWORD, message: err });
    const pw = await this.passwords.hash(newPassword);
    await this.ds.transaction(async (em) => {
      await em.getRepository(UserEntity).update({ id }, {
        passwordAlgo: pw.algo, passwordHash: pw.hash, passwordSalt: null,
        mustChangePassword: mustChange, passwordChangedAt: new Date(), failedAttempts: 0, lockedUntil: null,
      });
      await this.sessions.revokeAll(id, true, em);
    });
    this.events.emit('user.changed', id);
  }

  countUsers(): Promise<number> { return this.users.count(); }

  // ---- داخلي ----

  /** منع تصعيد الصلاحيات: دور admin أو منح manageUsers = للأدمن بس */
  private assertCanAssign(actor: AuthUser, role: string, manageUsers?: boolean) {
    if (!isRoleKey(role)) throw new BadRequestException('دور غير معروف');
    const grantsAdmin = role === 'admin' || manageUsers === true || (manageUsers === undefined && roleTemplates()[role].manageUsers);
    if (grantsAdmin && actor.role !== 'admin') throw new ForbiddenException({ statusCode: 403, code: AuthErrorCode.FORBIDDEN, message: 'منح صلاحيات الأدمن أو إدارة المستخدمين للأدمن بس' });
  }

  private assertProjectScope(role: string, scope: string[] | null) {
    if ((ROLES_REQUIRING_PROJECT_SCOPE as readonly string[]).includes(role) && !(scope && scope.length)) {
      throw new BadRequestException('الدور ده لازم يتحدد له مشروع واحد على الأقل (projectScope)');
    }
  }

  private async assertAnotherActiveAdmin(em: EntityManager, exceptId: string) {
    const n = await em.getRepository(UserEntity).createQueryBuilder('u').where(`u.role = 'admin' AND u.active AND u.id <> :id`, { id: exceptId }).getCount();
    if (n === 0) throw new BadRequestException('لازم يفضل أدمن واحد نشط على الأقل');
  }

  private async replaceOverrides(em: EntityManager, userId: string, pages: PageOverrideDto[]) {
    const repo = em.getRepository(UserPermissionEntity);
    await repo.delete({ userId });
    const uniq = new Map(pages.map((p) => [p.page, p]));
    if (uniq.size) await repo.insert([...uniq.values()].map((p) => ({ userId, page: p.page, canView: p.view, canAdd: p.add, canEdit: p.edit, canDelete: p.delete })));
  }

  toDto(u: UserEntity, ov: UserPermissionEntity[]): UserDto {
    return {
      id: u.id, username: u.username, name: u.name, role: u.role, active: u.active, mustChangePassword: u.mustChangePassword,
      editData: u.canEditData, deleteData: u.canDeleteData, manageUsers: u.canManageUsers, projectScope: u.projectScope,
      pages: ov.map((o) => ({ page: o.page, view: o.canView, add: o.canAdd, edit: o.canEdit, delete: o.canDelete })),
      lockedUntil: u.lockedUntil && u.lockedUntil.getTime() > Date.now() ? u.lockedUntil : null,
      lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
    };
  }
}

/** REQUIRE_2FA_ROLES=admin,ledgerAccountant → الأدوار دي لازم تفعّل 2FA (المرحلة 2 — S-8) */
export function requires2fa(role: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.REQUIRE_2FA_ROLES || '').split(',').map((r) => r.trim()).filter(Boolean).includes(role);
}
