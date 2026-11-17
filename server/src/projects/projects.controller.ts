import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { ListProjectsQuery, ProjectDto, ProjectListDto } from './projects.dto';
import { ProjectsService } from './projects.service';

/** طبقة الـ API (Resource API لـ Angular — TARGET_ARCHITECTURE §6.1): استقبال الطلب والتحقق من شكله واستدعاء الـ Service بس */
@ApiTags('v1 projects (pilot)')
@ApiBearerAuth()
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'المشروعات (قراءة) — موديول تجريبي للبنية الجديدة', description: 'نفس الصلاحيات ونطاق المشروع. المبالغ نصوص بأربع خانات.' })
  @ApiOkResponse({ type: ProjectListDto })
  list(@CurrentUser() user: AuthUser, @Query() q: ListProjectsQuery): Promise<ProjectListDto> {
    return this.svc.list(user, q);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProjectDto })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ProjectDto> {
    return this.svc.get(user, id);
  }
}
