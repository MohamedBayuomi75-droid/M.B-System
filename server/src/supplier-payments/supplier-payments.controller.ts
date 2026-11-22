import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../authz/decorators';
import { Idempotent } from '../common/idempotency';
import { ClassifyPaymentDto, CreatePaymentDto, ListPaymentsQuery, StatementQuery, UpdatePaymentDto } from './supplier-payments.dto';
import { SupplierPaymentsService } from './supplier-payments.service';

/** دفعات الموردين والتخصيص والرصيد (7.3.4، DEC-0113). الحذف والطباعة والتصدير في الواجهة القديمة */
@ApiTags('v1 supplier-payments')
@ApiBearerAuth()
@Controller('v1/supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly svc: SupplierPaymentsService) {}
  @Get() @ApiOperation({ summary: 'القايمة بنفس فلاتر وبحث وترتيب صفحة الدفعات القديمة + الكارتين' }) list(@CurrentUser() u: AuthUser, @Query() q: ListPaymentsQuery) { return this.svc.list(u, q); }
  @Get('unclassified') @ApiOperation({ summary: 'الدفعات من غير اتجاه (B-53) — قايمة مراجعة' }) unclassified(@CurrentUser() u: AuthUser) { return this.svc.unclassified(u); }
  @Get('balances') @ApiOperation({ summary: 'الرصيد لكل مورد: F-05 + الطريقة الحالية + الفرق وأسبابه (DEC-0105)' }) balances(@CurrentUser() u: AuthUser) { return this.svc.balances(u); }
  @Get('open-invoices') @ApiOperation({ summary: 'فواتير المورد اللي ليها باقي (للتوزيع)' })
  openInvoices(@CurrentUser() u: AuthUser, @Query('supplierId') supplierId: string, @Query('keep') keep?: string) { return this.svc.openInvoices(u, supplierId, keep); }
  @Get('statement/:supplierId') @ApiOperation({ summary: 'كشف الحساب بقاعدة F-05 (نفس حركات الرصيد) + علامة الفرق عن الطريقة الحالية' })
  statement(@CurrentUser() u: AuthUser, @Param('supplierId') supplierId: string, @Query() q: StatementQuery) { return this.svc.statement(u, supplierId, q); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.get(u, id); }
  @Post() @Idempotent() @ApiOperation({ summary: 'إضافة دفعة (Idempotency-Key إلزامي): عامة أو موزّعة، ورقم PV- + paymentNo، وحدث' })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreatePaymentDto) { return this.svc.create(u, dto); }
  @Patch(':id') @ApiOperation({ summary: 'تعديل سجل واحد زي القديم (rev إلزامي)' }) update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdatePaymentDto) { return this.svc.update(u, id, dto); }
  @Patch(':id/direction') @ApiOperation({ summary: 'تحديد اتجاه دفعة غير مصنّفة (دفعة واحدة كل مرة، B-53)' })
  classify(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ClassifyPaymentDto) { return this.svc.classify(u, id, dto); }
}
