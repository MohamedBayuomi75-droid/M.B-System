import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, RequirePerms } from '../authz/decorators';
import { ListProjectsQuery, ProjectDto, ProjectListDto } from './projects.dto';
import { ProjectsService } from './projects.service';

/** طبقة الـ API (Resource API لـ Angular — TARGET_ARCHITECTURE §6.1): استقبال الطلب والتحقق من شكله واستدعاء الـ Service بس */
@ApiTags('v1 projects (pilot)')
@ApiBearerAuth()
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'المشروعات (قراءة) — موديول تجريبي للبنية الجديدة', description: 'نفس الصلاحيات ونطاق المشروع. المبالغ نصوص بست خانات.' })
  @ApiOkResponse({ type: ProjectListDto })
  list(@CurrentUser() user: AuthUser, @Query() q: ListProjectsQuery): Promise<ProjectListDto> {
    return this.svc.list(user, q);
  }

  @Get('migration-plan')
  @RequirePerms({ flag: 'manageUsers' })
  @ApiOperation({ summary: 'خطة ترحيل المشروعات للجدول العلائقي — قراءة بس (dry-run)', description: 'مفيش أي كتابة. التنفيذ في المرحلة 6 بموافقة منفصلة ونسخة احتياطية مختبرة.' })
  migrationPlan() { return this.svc.migrationPlan(); }

  @Get(':id')
  @ApiOkResponse({ type: ProjectDto })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ProjectDto> {
    return this.svc.get(user, id);
  }
}
