import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { ListWorkersQuery, SaveWorkerDto, UpdateWorkerDto } from './workers.dto';
import { WorkersService } from './workers.service';

/** العمال (8.1.4، DEC-0121). الحذف، وصفحة العامل وكشف مستحقاته، والإحالة للمعاش، والإجراءات الجماعية في الواجهة القديمة */
@ApiTags('v1 workers')
@ApiBearerAuth()
@Controller('v1/workers')
export class WorkersController {
  constructor(private readonly svc: WorkersService) {}
  @Get() @ApiOperation({ summary: 'لوحات الأقسام، والقايمة بنفس فلاتر وبحث صفحة العمال القديمة، والكروت، والملاحظات (الأجور محمية — B-48)' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListWorkersQuery) { return this.svc.list(u, q); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة العامل' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions(u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة عامل (Idempotency-Key إلزامي) بنفس حساب النافذة القديمة + حدث worker.saved' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SaveWorkerDto) { return this.svc.create(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل عامل (rev إلزامي): الدمج، والقسم، وأرشيف المستقيلين — في معاملة واحدة' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateWorkerDto) { return this.svc.update(u, id, dto); }
}
