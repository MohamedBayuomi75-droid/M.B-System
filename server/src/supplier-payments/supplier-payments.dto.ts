import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { IsMoneyString } from '../common/money.validators';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS = ['نقدي', 'تحويل بنكي', 'شيك', 'أخرى'];

export class AllocationDto {
  @ApiProperty() @IsString() @Length(1, 80) invoiceId: string;
  @ApiProperty({ example: '600.000000' }) @IsMoneyString() amount: string;
}
export class ExtraFieldDto {
  @ApiProperty() @IsString() @MaxLength(100) label: string;
  @ApiProperty() @IsString() @MaxLength(2000) value: string;
}
/**
 * دفعة مورد (7.3.4) — نفس خانات نافذة الدفعة القديمة (modals.js openPaymentModal). المبالغ نصوص عشرية (B-25 بعد DEC-0112: لحد 6 خانات).
 * التوزيع زي القديم (DEC-0113 د-1): سجل لكل فاتورة بنفس batchId، والباقي في سجل «متبقي غير موزع» بالفرق الدقيق (س1).
 */
export class CreatePaymentDto {
  @ApiProperty() @IsString() @Length(1, 80) supplierId: string;
  @ApiProperty({ example: '2026-11-22' }) @Matches(DATE) date: string;
  @ApiProperty({ enum: ['pay', 'collect'], description: 'دائن (سداد للمورد) أو مدين (تحصيل / عليه لنا)' }) @IsIn(['pay', 'collect']) direction: 'pay' | 'collect';
  @ApiPropertyOptional({ enum: METHODS }) @IsOptional() @IsIn(METHODS) method?: string;
  @ApiProperty({ example: '1000.000000' }) @IsMoneyString() amount: string;
  @ApiPropertyOptional({ description: 'دفعة عامة (مقدمة / تحت الحساب) من غير ربط بفاتورة' }) @IsOptional() @IsBoolean() general?: boolean;
  @ApiPropertyOptional({ type: [AllocationDto] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => AllocationDto) allocations?: AllocationDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) transferRef?: string;
  @ApiPropertyOptional({ type: [ExtraFieldDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExtraFieldDto) extraFields?: ExtraFieldDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
/** تعديل سجل واحد زي القديم (س2): مفيش إعادة تقسيم، والربط بفاتورة واحدة أو من غير */
export class UpdatePaymentDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
  @ApiProperty() @IsString() @Length(1, 80) supplierId: string;
  @ApiProperty() @Matches(DATE) date: string;
  @ApiProperty({ enum: ['pay', 'collect'] }) @IsIn(['pay', 'collect']) direction: 'pay' | 'collect';
  @ApiPropertyOptional({ enum: METHODS }) @IsOptional() @IsIn(METHODS) method?: string;
  @ApiProperty() @IsMoneyString() amount: string;
  @ApiPropertyOptional({ description: 'فاضي = دفعة عامة' }) @IsOptional() @IsString() @MaxLength(80) invoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) transferRef?: string;
  @ApiPropertyOptional({ type: [ExtraFieldDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExtraFieldDto) extraFields?: ExtraFieldDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
/** مراجعة الدفعة من غير اتجاه (B-53، DEC-0113 د-3): دفعة واحدة كل مرة */
export class ClassifyPaymentDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
  @ApiProperty({ enum: ['pay', 'collect'] }) @IsIn(['pay', 'collect']) direction: 'pay' | 'collect';
}
export class ListPaymentsQuery {
  @IsOptional() @IsString() @MaxLength(500) q?: string;
  @IsOptional() @Matches(/^\d{4}$/) year?: string;
  @IsOptional() @Matches(/^\d{2}$/) month?: string;
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsIn(['', 'pay', 'collect']) direction?: '' | 'pay' | 'collect';
  @IsOptional() @IsIn(['', 'linked', 'general']) link?: '' | 'linked' | 'general';
  @IsOptional() @IsString() @MaxLength(30) min?: string;
  @IsOptional() @IsString() @MaxLength(30) max?: string;
  @IsOptional() @IsIn(['new', 'old', 'amount_desc', 'amount_asc']) sort?: string;
}
export class StatementQuery {
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
}
