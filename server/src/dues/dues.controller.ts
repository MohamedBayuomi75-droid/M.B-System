import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { DuesQuery, ItemsDto, PayDto } from './dues.dto';
import { DuesService } from './dues.service';

/** المستحقات والصرف (8.6.3، DEC-0137). مستحقات المعدات في 8.7، وكشوف الحساب للطباعة والتصدير من الشاشة الكاملة */
@ApiTags('v1 dues')
@ApiBearerAuth()
@Controller('v1/dues')
export class DuesController {
  constructor(private readonly svc: DuesService) {}
  @Get('boards') @ApiOperation({ summary: 'لوحات الأنواع والأقسام' }) boards(@CurrentUser() u: AuthUser) { return this.svc.boards(u); }
  @Get('table') @ApiOperation({ summary: 'جدول المستحقات لنوع (المستحق والمتبقي بالحساب الجديد DEC-0129، ومعاهم القديم)، والكروت، وسجل الصرف والخصومات' })
  table(@CurrentUser() u: AuthUser, @Query() q: DuesQuery) { return this.svc.table(u, q); }
  @Get('pay-options') @ApiOperation({ summary: 'خيارات نافذة الصرف: الأشخاص، والإضافات المستحقة، والراتب المسجّل، والمتبقي، والبنود' })
  payOptions(@CurrentUser() u: AuthUser, @Query('kind') kind: string, @Query('id') id: string) { return this.svc.payOptions(u, kind, id || ''); }
  @Post('pay') @Idempotent() @ApiOperation({ summary: 'دفع مستحق، أو بدلات ومكافآت (مستحق)، أو خصم — بنفس سجلات النافذة القديمة؛ فوق المتبقي = سلفة بس (DEC-0132) — Idempotency-Key إلزامي' })
  pay(@CurrentUser() u: AuthUser, @Body() dto: PayDto) { return this.svc.pay(u, dto); }
  @Delete(':src/:id') @ApiOperation({ summary: 'حذف من السجل (src = pay أو empPen، وrev في الـ query)' })
  remove(@CurrentUser() u: AuthUser, @Param('src') src: string, @Param('id') id: string, @Query('rev') rev: string) { return this.svc.remove(u, src, id, Number(rev)); }
  @Put('items') @ApiOperation({ summary: 'إدارة بنود الصرف والخصم' }) items(@CurrentUser() u: AuthUser, @Body() dto: ItemsDto) { return this.svc.items(u, dto); }
}
