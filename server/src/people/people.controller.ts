import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { ListPeopleQuery, SavePersonDto, UpdatePersonDto } from './people.dto';
import { PeopleService } from './people.service';

/** المشرفين (8.2.4، DEC-0123). كشف الحساب، وصفحة المشرف، والحذف، والإجراءات الجماعية في الواجهة القديمة */
@ApiTags('v1 supervisors')
@ApiBearerAuth()
@Controller('v1/supervisors')
export class SupervisorsController {
  constructor(private readonly svc: PeopleService) {}
  @Get() @ApiOperation({ summary: 'لوحات الأقسام، والقايمة بنفس فلاتر وبحث صفحة المشرفين القديمة، والكروت («عمال تابعون»)، والملاحظات (اليومية محمية — B-48)' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListPeopleQuery) { return this.svc.list('supervisor', u, q); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة المشرف' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions('supervisor', u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get('supervisor', u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة مشرف (Idempotency-Key إلزامي) بنفس حساب النافذة القديمة + حدث supervisor.saved' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SavePersonDto) { return this.svc.create('supervisor', u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل مشرف (rev إلزامي): الدمج، وتاريخ الاستقالة، والقسم، وأرشيف المستقيلين — في معاملة واحدة' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdatePersonDto) { return this.svc.update('supervisor', u, id, dto); }
}

/** السواقين بنوعيهم (8.2.4، DEC-0123). صفحة السائق، والحذف، والإجراءات الجماعية في الواجهة القديمة */
@ApiTags('v1 drivers')
@ApiBearerAuth()
@Controller('v1/drivers')
export class DriversController {
  constructor(private readonly svc: PeopleService) {}
  @Get() @ApiOperation({ summary: 'لوحات الأقسام، والقايمة بنفس فلاتر وبحث صفحة السائقين القديمة (بترتيب خطواتها)، والكروت، والملاحظات (الأجور محمية — B-48)' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListPeopleQuery) { return this.svc.list('driver', u, q); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذتي السائق' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions('driver', u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get('driver', u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة سائق شركة، أو خارجي (external) — بنفس حساب النافذة القديمة + حدث driver.saved' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SavePersonDto) { return this.svc.create('driver', u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل سائق (rev إلزامي): سواق الشركة بالدمج، والخارجي من غير دمج زي القديمة' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdatePersonDto) { return this.svc.update('driver', u, id, dto); }
}

/** الموظفين (8.3.4، DEC-0125). صفحة الموظف، والحضور، والحذف، والإجراءات الجماعية، والتصدير في الواجهة القديمة (د-3) */
@ApiTags('v1 employees')
@ApiBearerAuth()
@Controller('v1/employees')
export class EmployeesController {
  constructor(private readonly svc: PeopleService) {}
  @Get() @ApiOperation({ summary: 'لوحات الأقسام، والقايمة بنفس فلاتر صفحة الموظفين القديمة (ومنها قسم المستقيلين بفلاتره وكروته الخاصة)، والكروت، والملاحظات (الراتب محمي — B-48)' })
  list(@CurrentUser() u: AuthUser, @Query() q: ListPeopleQuery) { return this.svc.list('employee', u, q); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة الموظف (أنواع التوظيف، ورصيد الإجازة الافتراضي)' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions('employee', u); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get('employee', u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة موظف (Idempotency-Key إلزامي) بنفس حساب النافذة القديمة (من غير قسم) + حدث employee.saved' })
  create(@CurrentUser() u: AuthUser, @Body() dto: SavePersonDto) { return this.svc.create('employee', u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل موظف (rev إلزامي): الدمج، والاستقالة (النهارده)، وأرشيف المستقيلين — في معاملة واحدة' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdatePersonDto) { return this.svc.update('employee', u, id, dto); }
}
