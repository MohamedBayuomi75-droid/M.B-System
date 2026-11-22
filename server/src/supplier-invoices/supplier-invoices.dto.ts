import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { IsMoneyString } from '../common/money.validators';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * فاتورة أو مرتجع مورد (7.2.4). نفس خانات نافذة الواجهة القديمة (modals.js openAddEditInvoiceModal).
 * المبالغ نصوص عشرية (B-25 بعد DEC-0112: لحد 6 خانات). **الإجمالي والصافي مش مدخلات**: السيرفر بيحسبهم بالمعادلة الانتقالية (DEC-0107).
 * «المبلغ المخصوم» مدخل زي القديم (النسبة اقتراح في الشاشة بس).
 */
export class SaveInvoiceDto {
  @ApiProperty() @IsString() @Length(1, 80) supplierId: string;
  @ApiProperty({ description: 'رقم فاتورة المورد (B-31: فريد لكل مورد في الجديد)' }) @IsString() @Length(1, 100) invoiceNo: string;
  @ApiProperty({ example: '2026-11-21' }) @Matches(DATE) date: string;
  @ApiPropertyOptional({ description: 'فاضي = التاريخ + 30 يوم (عرض). مالوش معنى للمرتجع' }) @IsOptional() @Matches(/^(\d{4}-\d{2}-\d{2})?$/) dueDate?: string;
  @ApiProperty({ description: 'مرتجع؟' }) @IsBoolean() isReturn: boolean;
  @ApiPropertyOptional({ description: 'المرتجع: الفاتورة الأصلية (فاضي = مرتجع مطلق)' }) @IsOptional() @IsString() @MaxLength(80) linkedInvoiceId?: string;
  @ApiProperty({ example: '1000.0000' }) @IsMoneyString() baseValue: string;
  @ApiPropertyOptional() @IsOptional() @IsMoneyString() vat?: string;
  @ApiPropertyOptional() @IsOptional() @IsMoneyString() stampDuty?: string;
  @ApiPropertyOptional({ description: 'نسبة الخصم % (نص، 0–100) — زي القديم' }) @IsOptional() @IsString() @MaxLength(20) discountRate?: string;
  @ApiPropertyOptional({ description: 'المبلغ المخصوم (مدخل)' }) @IsOptional() @IsMoneyString() withheld?: string;
  @ApiPropertyOptional({ enum: ['unpaid', 'paid'] }) @IsOptional() @IsIn(['unpaid', 'paid']) withheldStatus?: 'unpaid' | 'paid';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) project?: string;
  @ApiPropertyOptional({ description: 'الأصناف (سطر لكل صنف، زي القديم)' }) @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) internalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) supplierItemCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) itemDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) quantity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) unitPrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) nature?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) discountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) invoiceLink?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) notes?: string;
}
export class UpdateInvoiceDto extends SaveInvoiceDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}

export class ListInvoicesQuery {
  @IsOptional() @IsIn(['invoices', 'returns', '']) mode?: 'invoices' | 'returns' | '';
  @IsOptional() @IsString() @MaxLength(500) q?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() project?: string;
  @IsOptional() @Matches(/^\d{4}$/) year?: string;
  @IsOptional() @Matches(/^\d{2}$/) month?: string;
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
  @IsOptional() @IsIn(['1', 'true']) overdueOnly?: string;
  @IsOptional() @IsIn(['', 'invoice', 'return']) kind?: '' | 'invoice' | 'return';
  @IsOptional() @IsIn(['', 'paid', 'partial', 'unpaid', 'overdue', 'return']) status?: string;
  @IsOptional() @IsIn(['', 'yes', 'no']) withheld?: '' | 'yes' | 'no';
  @IsOptional() @IsString() @MaxLength(30) min?: string;
  @IsOptional() @IsString() @MaxLength(30) max?: string;
  @IsOptional() @IsIn(['new', 'old', 'amount_desc', 'amount_asc', 'supplier', 'no']) sort?: string;
}
