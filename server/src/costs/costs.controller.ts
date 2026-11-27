import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { CostItemDto, CostSectionDto, CostTableQuery, ProjectCostOneQuery, ProjectCostQuery, SaveCostDto, UpdateCostDto } from './costs.dto';
import { CostsService } from './costs.service';

/** التكاليف (8.8.3، DEC-0142): الصفحة بلوحاتها وأقسامها وجدولها، والحفظ بالسطور، والأقسام والبنود. التصدير من الشاشة الكاملة */
@ApiTags('v1 costs')
@ApiBearerAuth()
@Controller('v1/costs')
export class CostsController {
  constructor(private readonly svc: CostsService) {}
  @Get('boards') @ApiOperation({ summary: 'لوحات الفئات (العدد والإجمالي) وإجمالي التكلفة الشاملة بالحسابين' }) boards(@CurrentUser() u: AuthUser) { return this.svc.boards(u); }
  @Get('table') @ApiOperation({ summary: 'لوحات أقسام الفئة والجدول بنفس فلاتر الصفحة القديمة' }) table(@CurrentUser() u: AuthUser, @Query() q: CostTableQuery) { return this.svc.table(u, q); }
  @Get('form-options') @ApiOperation({ summary: 'خيارات نافذة التكلفة (الأشخاص، والأقسام، والبنود المقترحة، والمشاريع)' }) formOptions(@CurrentUser() u: AuthUser) { return this.svc.formOptions(u); }
  @Post('sections') @ApiOperation({ summary: 'إضافة قسم، أو تغيير اسمه (بيغيّر التكاليف)، أو حذفه (بيفضّي قسم التكاليف)' }) section(@CurrentUser() u: AuthUser, @Body() dto: CostSectionDto) { return this.svc.section(u, dto); }
  @Post('items') @ApiOperation({ summary: 'إدارة بنود التكاليف: إضافة، وتغيير اسم (بيغيّر التكاليف)، وحذف من القايمة' }) item(@CurrentUser() u: AuthUser, @Body() dto: CostItemDto) { return this.svc.item(u, dto); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة تكلفة بالسطور (Idempotency-Key إلزامي)' }) create(@CurrentUser() u: AuthUser, @Body() dto: SaveCostDto) { return this.svc.create(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل تكلفة (rev إلزامي)' }) update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateCostDto) { return this.svc.update(u, id, dto); }
  @Delete(':id') remove(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('rev') rev: string) { return this.svc.remove(u, id, Number(rev)); }
}

/** تكلفة المشروع (8.8.3، DEC-0142): الحساب القديم بالظبط والجديد (TR-10) جنبه */
@ApiTags('v1 project-cost')
@ApiBearerAuth()
@Controller('v1/project-cost')
export class ProjectCostController {
  constructor(private readonly svc: CostsService) {}
  @Get() @ApiOperation({ summary: 'تكلفة المشاريع الشاملة بالحسابين (الأعمدة التسعة، والمحصّل، والأسماء الغير مسجّلة)' }) comprehensive(@CurrentUser() u: AuthUser, @Query() q: ProjectCostQuery) { return this.svc.comprehensive(u, q); }
  @Get('by-project') @ApiOperation({ summary: 'التكلفة وحالة الميزانية لكل مشروع مسجّل (عمود صفحة المشاريع)' }) byProject(@CurrentUser() u: AuthUser) { return this.svc.byProject(u); }
  @Get('one') @ApiOperation({ summary: 'تكلفة مشروع واحد بالحسابين وبنود الموردين والمخازن' }) one(@CurrentUser() u: AuthUser, @Query() q: ProjectCostOneQuery) { return this.svc.one(u, q); }
}
