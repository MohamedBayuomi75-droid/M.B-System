import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequirePerms } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { ListProjectsQuery, SaveProjectDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

/** المشروعات (7.4.4، DEC-0117). الحذف ومسار المشروع التفاعلي وكشف المشروع والتكلفة في الواجهة القديمة */
@ApiTags('v1 projects')
@ApiBearerAuth()
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get() @ApiOperation({ summary: 'القايمة بنفس بحث وفلاتر وكروت صفحة المشروعات القديمة، والموارد والملاحظات (من غير التكلفة — F-12)', description: 'نفس الصلاحيات ونطاق المشروع.' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListProjectsQuery) { return this.svc.list(u, q); }

  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة المشروع: العملاء، والمشرفين، والمراحل، والكود الجاي' })
  formOptions(@CurrentUser() u: AuthUser, @Query('id') id?: string) { return this.svc.formOptions(u, id); }

  @Get('migration-plan') @RequirePerms({ flag: 'manageUsers' })
  @ApiOperation({ summary: 'خطة ترحيل المشروعات — قراءة بس (dry-run)', description: 'مفيش أي كتابة. النقل نفسه بـ cutover projects.' })
  migrationPlan() { return this.svc.migrationPlan(); }

  @Get('unmatched-names') @RequirePerms({ flag: 'manageUsers' })
  @ApiOperation({ summary: 'الأسماء المكتوبة في سجلات ومالهاش مشروع (B-34، DEC-0117 د-5) — قراءة بس' })
  unmatched() { return this.svc.unmatched(); }

  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }

  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة مشروع (Idempotency-Key إلزامي) بنفس تحقق النافذة القديمة + حدث project.saved' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SaveProjectDto) { return this.svc.create(u, dto); }

  @Patch(':id') @ApiOperation({ summary: 'تعديل مشروع (rev إلزامي): نشر تغيير الاسم وتحريك المسار زي القديم، في معاملة واحدة' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateProjectDto) { return this.svc.update(u, id, dto); }
}
