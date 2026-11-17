import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequirePerms } from '../authz/decorators';
import { CreateUserDto, DocActionsDto, ResetPasswordDto, UpdateUserDto, UserDto } from './users.dto';
import { UsersService } from './users.service';

/** إدارة المستخدمين — محتاجة صلاحية manageUsers (على السيرفر، مش في الواجهة بس). */
@ApiTags('users')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'مفيش صلاحية manageUsers' })
@RequirePerms({ flag: 'manageUsers' })
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'كل المستخدمين' })
  @ApiOkResponse({ type: UserDto, isArray: true })
  list(): Promise<UserDto[]> {
    return this.users.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: UserDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    return this.users.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'إضافة مستخدم', description: 'الأعلام (editData/deleteData/manageUsers) الافتراضية من قالب الدور. دور admin أو منح manageUsers = للأدمن بس.' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiConflictResponse({ description: 'اسم المستخدم مستخدم' })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser, @Req() req: Request): Promise<UserDto> {
    const u = await this.users.create(dto, actor);
    await this.audit.record({ action: 'users.create', userId: actor.id, username: actor.username, entity: 'users', entityId: u.id, details: { username: u.username, role: u.role }, req });
    return u;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تعديل مستخدم (اسم، دور، تفعيل/تعطيل، نطاق مشاريع، تخصيص صفحات)', description: 'التعطيل بيلغي كل جلسات المستخدم فورًا. مينفعش تعطيل/تخفيض آخر أدمن نشط.' })
  @ApiOkResponse({ type: UserDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser, @Req() req: Request): Promise<UserDto> {
    const { user, changed } = await this.users.update(id, dto, actor);
    if (changed.length) {
      const action = changed.includes('active') ? (user.active ? 'users.activate' : 'users.deactivate') : 'users.update';
      await this.audit.record({ action, userId: actor.id, username: actor.username, entity: 'users', entityId: id, details: { changed, role: user.role }, req });
    }
    return user;
  }

  @Post(':id/reset-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'إعادة تعيين كلمة مرور مستخدم', description: 'بيلغي كل جلساته، وافتراضيًا بيجبره يغيّرها أول دخول.' })
  @ApiNoContentResponse()
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto, @CurrentUser() actor: AuthUser, @Req() req: Request): Promise<void> {
    await this.users.resetPassword(id, dto, actor);
    await this.audit.record({ action: 'users.reset_password', userId: actor.id, username: actor.username, entity: 'users', entityId: id, req });
  }

  @Get(':id/doc-actions')
  @ApiOperation({ summary: 'أفعال المستندات لمستخدم (المرحلة 5)' })
  getDocActions(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getDocActions(id);
  }

  @Put(':id/doc-actions')
  @ApiOperation({ summary: 'منح/منع أفعال المستندات لمستخدم', description: 'مفيش أي منح افتراضي لأي دور غير مدير النظام. التغيير بيتسجل في التدقيق.' })
  async setDocActions(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DocActionsDto, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    const r = await this.users.setDocActions(id, dto as Record<string, boolean | null>, actor);
    await this.audit.record({ action: 'users.doc_actions', userId: actor.id, username: actor.username, entity: 'users', entityId: id, details: { grants: dto as Record<string, unknown> }, req });
    return r;
  }
}
