import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { IsMoneyString } from '../common/money.validators';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RATE = /^\d{1,3}(\.\d{1,6})?$/;
export const CATEGORIES = ['VAT', 'SCHEDULE', 'WHT', 'STAMP', 'PAYROLL_TAX', 'SOCIAL_INSURANCE', 'CONTRACTUAL'] as const;
export const BASES = ['NET_OF_DISCOUNT', 'GROSS', 'NET_PLUS_VAT', 'TAXABLE_WAGE', 'CONTRACT_VALUE'] as const;

export class CreateTaxCodeDto {
  @ApiProperty({ example: 'VAT-STD' }) @Matches(/^[A-Z][A-Z0-9_-]{1,40}$/) code: string;
  @ApiProperty() @IsString() @Length(1, 200) name: string;
  @ApiProperty({ enum: CATEGORIES, description: 'CONTRACTUAL = استقطاع تعاقدي (ضمان أعمال/محتجزات/غرامات) — مش ضريبة' }) @IsIn(CATEGORIES) category: (typeof CATEGORIES)[number];
}
export class BracketDto {
  @ApiPropertyOptional({ nullable: true, description: 'نهاية الشريحة (null = مفتوحة)' }) @IsOptional() @IsMoneyString() upTo: string | null;
  @ApiProperty({ example: '10' }) @Matches(RATE) rate: string;
}
export class CreateTaxVersionDto {
  @ApiProperty({ enum: ['PERCENT', 'FIXED', 'BRACKETS'] }) @IsIn(['PERCENT', 'FIXED', 'BRACKETS']) method: 'PERCENT' | 'FIXED' | 'BRACKETS';
  @ApiPropertyOptional({ example: '14', description: 'نسبة مئوية (حتى 6 خانات)' }) @IsOptional() @Matches(RATE) rate?: string;
  @ApiPropertyOptional() @IsOptional() @IsMoneyString() fixedAmount?: string;
  @ApiPropertyOptional({ type: [BracketDto] }) @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => BracketDto) brackets?: BracketDto[];
  @ApiProperty({ enum: BASES }) @IsIn(BASES) base: (typeof BASES)[number];
  @ApiPropertyOptional({ example: '100', description: 'نسبة الجزء الخاضع من الأساس (مثلًا معاملة انتقالية)' }) @IsOptional() @Matches(RATE) baseRatio?: string;
  @ApiPropertyOptional({ description: 'حد أدنى للأساس — المساوي أو الأقل مايتحسبش عليه' }) @IsOptional() @IsMoneyString() minBase?: string;
  @ApiProperty({ example: ['supplier-invoice'] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @IsString({ each: true }) appliesTo: string[];
  @ApiProperty({ enum: ['COMPANY', 'COUNTERPARTY', 'EMPLOYEE', 'EMPLOYER'] }) @IsIn(['COMPANY', 'COUNTERPARTY', 'EMPLOYEE', 'EMPLOYER']) bearer: string;
  @ApiProperty({ enum: ['COMPANY_WITHHOLDS', 'COUNTERPARTY_CHARGES', 'COMPANY_CHARGES', 'PAID_DIRECTLY'] }) @IsIn(['COMPANY_WITHHOLDS', 'COUNTERPARTY_CHARGES', 'COMPANY_CHARGES', 'PAID_DIRECTLY']) collector: string;
  @ApiPropertyOptional({ description: '{ contractDateFrom, contractDateTo, activities[], counterpartyTypes[] }' }) @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @ApiPropertyOptional({ description: '[{ reason, activities[], counterpartyTypes[], flags[] }]' }) @IsOptional() @IsArray() @ArrayMaxSize(30) exemptions?: Record<string, unknown>[];
  @ApiPropertyOptional({ description: 'تطبيق مع ضريبة من نفس النوع على نفس الأساس — بسند قانوني بس' }) @IsOptional() @IsBoolean() allowStacking?: boolean;
  @ApiProperty({ example: '2026-01-01' }) @Matches(DATE) effectiveFrom: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) effectiveTo?: string;
  @ApiPropertyOptional({ description: 'المرجع القانوني (رقم القانون/القرار) — إلزامي قبل الإرسال للاعتماد' }) @IsOptional() @IsString() @MaxLength(1000) legalRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notesCfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notesAdvisor?: string;
  @ApiProperty({ description: 'سبب الإصدار/التعديل' }) @IsString() @Length(3, 1000) changeReason: string;
}
export class DecisionNoteDto { @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) note?: string }
export class ComputeTaxesDto {
  @ApiProperty() @IsString() @Length(1, 62) documentType: string;
  @ApiProperty() @Matches(DATE) date: string;
  @ApiProperty() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @Matches(/^[A-Z][A-Z0-9_-]{1,40}$/, { each: true }) codes: string[];
  @ApiProperty({ description: '{ NET_OF_DISCOUNT: "1000.0000", ... } — نصوص عشرية' }) @IsObject() bases: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsObject() context?: { contractDate?: string; activity?: string; counterpartyType?: string; flags?: string[] };
}
