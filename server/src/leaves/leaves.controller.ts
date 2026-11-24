import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { LeaveRevDto, ListLeavesQuery, SaveLeaveDto, UpdateLeaveDto } from './leaves.dto';
import { LeavesService } from './leaves.service';

/** الإجازات (8.4.4، DEC-0127). الطباعة والتقارير ولوحة المتابعة والتصدير في الواجهة القديمة (د-5) */
@ApiTags('v1 leaves')
@ApiBearerAuth()
@Controller('v1/leaves')
export class LeavesController {
  constructor(private readonly svc: LeavesService) {}
  @Get() @ApiOperation({ summary: 'القايمة بنفس فلاتر صفحة الإجازات القديمة، والكروت الأربعة (ومزامنة حالة الأشخاص مرة كل يوم — د-2)' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListLeavesQuery) { return this.svc.list(u, q); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة الإجازة: الأنواع، والأقسام والأشخاص لكل فئة' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions(u); }
  @Get('balances') @ApiOperation({ summary: 'رصيد الإجازة السنوية للموظفين (employeeLeaveBalance — د-3)' })
  balances(@CurrentUser() u: AuthUser, @Query('ids') ids?: string) { return this.svc.balances(u, ids ? ids.split(',').filter(Boolean) : undefined); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'طلب إجازة («قيد الانتظار»، Idempotency-Key إلزامي) + حدث leave.requested' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SaveLeaveDto) { return this.svc.create(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل إجازة (rev إلزامي): الحالة بتفضل زي ما هي، والأيام من التاريخين لو فاضية، ومزامنة حالة الأشخاص' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateLeaveDto) { return this.svc.update(u, id, dto); }
  @Post(':id/approve') @HttpCode(200) @Idempotent() @ApiOperation({ summary: 'موافقة ✓ (للطلب المعلّق بس — د-1) + مزامنة حالة الأشخاص' })
  approve(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: LeaveRevDto) { return this.svc.decide(u, id, dto.rev, 'approved'); }
  @Post(':id/reject') @HttpCode(200) @Idempotent() @ApiOperation({ summary: 'رفض ✗ (للطلب المعلّق بس)' })
  reject(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: LeaveRevDto) { return this.svc.decide(u, id, dto.rev, 'rejected'); }
  @Delete(':id') @ApiOperation({ summary: 'حذف إجازة (rev إلزامي في الـ query) + مزامنة حالة الأشخاص' })
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('rev') rev: string) { return this.svc.remove(u, id, Number(rev)); }
}
