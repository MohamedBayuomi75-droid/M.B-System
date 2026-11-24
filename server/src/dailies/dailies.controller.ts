import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { AttQuery, GridQuery, ReviewDto, SaveAttDto, SaveDailyDto, UpdateAttDto, UpdateDailyDto } from './dailies.dto';
import { DailiesService } from './dailies.service';
import type { DKind } from './dailies-rules';

/** اليوميات (8.5.4، DEC-0135). المستحقات وكشف الحساب والصرف في 8.6، ويوميات المعدات في 8.7، والتصدير من الشاشة الكاملة */
@ApiTags('v1 dailies')
@ApiBearerAuth()
@Controller('v1/dailies')
export class DailiesController {
  constructor(private readonly svc: DailiesService) {}
  @Get('boards') @ApiOperation({ summary: 'لوحات الأنواع والأقسام' }) boards(@CurrentUser() u: AuthUser) { return this.svc.boards(u); }
  @Get('grid') @ApiOperation({ summary: 'الجدول الشهري بنفس فلاتر صفحة اليوميات القديمة، والكروت (المستحق بالحساب الجديد DEC-0129/0130، ومعاه القديم)' })
  grid(@CurrentUser() u: AuthUser, @Query() q: GridQuery) { return this.svc.grid(u, q); }
  @Get('list') @ApiOperation({ summary: 'سجلات الفترة' }) list(@CurrentUser() u: AuthUser, @Query() q: GridQuery) { return this.svc.list(u, q); }
  @Get('day') @ApiOperation({ summary: 'مواقع اليوم الواحد لشخص' })
  day(@CurrentUser() u: AuthUser, @Query('kind') kind: string, @Query('id') id: string, @Query('date') date: string) { return this.svc.day(u, (['worker', 'supervisor', 'driver'].includes(kind) ? kind : 'worker') as DKind, id, date); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة اليومية' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions(u); }
  @Get('review') @ApiOperation({ summary: 'قايمة المراجعة (DEC-0133): المكررة واليتيمة وبأجر صفر وبحالة مش معروفة' }) review(@CurrentUser() u: AuthUser) { return this.svc.review(u); }
  @Get('diff') @ApiOperation({ summary: 'تقرير الفرق (د-2): الحساب القديم مقابل الجديد' }) diff(@CurrentUser() u: AuthUser, @Query() q: GridQuery) { return this.svc.diff(u, q); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'تسجيل يومية (Idempotency-Key إلزامي) بنفس حساب النافذة القديمة + حدث daily.recorded' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SaveDailyDto) { return this.svc.create(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل يومية (rev إلزامي)' }) update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateDailyDto) { return this.svc.update(u, id, dto); }
  @Delete(':id') @ApiOperation({ summary: 'حذف يومية (rev في الـ query)' }) remove(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('rev') rev: string) { return this.svc.remove(u, id, Number(rev)); }
  @Post(':id/review') @HttpCode(200) @Idempotent() @ApiOperation({ summary: 'قرار المراجعة: تتحسب أو تتلغي بسبب (صلاحية «تعديل» على المستحقات)' })
  decide(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ReviewDto) { return this.svc.decide(u, id, dto); }
}

/** حضور الموظفين (8.5.4) */
@ApiTags('v1 attendance')
@ApiBearerAuth()
@Controller('v1/attendance')
export class AttendanceController {
  constructor(private readonly svc: DailiesService) {}
  @Get() @ApiOperation({ summary: 'حضور الموظفين بنفس فلاتر الصفحة القديمة، والكروت' }) list(@CurrentUser() u: AuthUser, @Query() q: AttQuery) { return this.svc.attList(u, q); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.attGet(u, id); }
  @Post() @Idempotent() create(@CurrentUser() u: AuthUser, @Body() dto: SaveAttDto) { return this.svc.attCreate(u, dto); }
  @Patch(':id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateAttDto) { return this.svc.attUpdate(u, id, dto); }
  @Delete(':id') remove(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('rev') rev: string) { return this.svc.attRemove(u, id, Number(rev)); }
}
