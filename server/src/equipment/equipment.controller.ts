import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { EquipmentDailyQuery, ListEquipmentQuery, SaveEquipmentDailyDto, SaveEquipmentDto, UpdateEquipmentDailyDto, UpdateEquipmentDto } from './equipment.dto';
import { EquipmentService } from './equipment.service';

/** المعدات ويومياتها (8.7.3، DEC-0139/0140). صفحة المعدة وكشف الأيام والوقود والصيانة والإجراءات الجماعية والتصدير من الشاشة الكاملة */
@ApiTags('v1 equipment')
@ApiBearerAuth()
@Controller('v1/equipment')
export class EquipmentController {
  constructor(private readonly svc: EquipmentService) {}
  @Get() @ApiOperation({ summary: 'المعدات بنفس فلاتر الصفحة القديمة، واللوحات، والكروت (تكلفة الشهر بالحسابين)، والملاحظات' }) list(@CurrentUser() u: AuthUser, @Query() q: ListEquipmentQuery) { return this.svc.list(u, q); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة المعدة واليومية' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions(u); }
  @Get('daily') @ApiOperation({ summary: 'الجدول الشهري ولوحة المعدات في اليوميات وسجلات الفترة (التكلفة القديمة والجديدة DEC-0140)' }) daily(@CurrentUser() u: AuthUser, @Query() q: EquipmentDailyQuery) { return this.svc.dailyGrid(u, q); }
  @Get('daily/:id') getDaily(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.getDaily(u, id); }
  @Post('daily') @Idempotent() @ApiOperation({ summary: 'تسجيل يومية معدة (Idempotency-Key إلزامي) — ويوم «نقل» بتكلفة النقل' }) createDaily(@CurrentUser() u: AuthUser, @Body() dto: SaveEquipmentDailyDto) { return this.svc.createDaily(u, dto); }
  @Patch('daily/:id') updateDaily(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateEquipmentDailyDto) { return this.svc.updateDaily(u, id, dto); }
  @Delete('daily/:id') removeDaily(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('rev') rev: string) { return this.svc.removeDaily(u, id, Number(rev)); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة معدة (Idempotency-Key إلزامي) بنفس زرار الحفظ القديم' }) create(@CurrentUser() u: AuthUser, @Body() dto: SaveEquipmentDto) { return this.svc.create(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل معدة (rev إلزامي)' }) update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) { return this.svc.update(u, id, dto); }
}
