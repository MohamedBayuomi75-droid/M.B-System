import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { IsMoneyString } from '../common/money.validators';

const DATE_OR_EMPTY = /^(\d{4}-\d{2}-\d{2})?$/;

export class ExtraFieldDto {
  @ApiProperty() @IsString() @MaxLength(100) label: string;
  @ApiProperty() @IsString() @MaxLength(1000) value: string;
}
export class ContactDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) email?: string;
}

/** حقول المورد القابلة للكتابة — نفس حقول نافذة «إضافة مورد» وتبويب «البيانات» (renderer/modules/ledger/app.js:685) */
class SupplierFields {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) commercialReg?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) businessNature?: string;
  @ApiPropertyOptional({ example: '-1250.5', description: 'نص عشري (حتى 4 خانات، يقبل السالب)' }) @IsOptional() @IsMoneyString({ allowNegative: true }) openingBalance?: string;
  @ApiPropertyOptional({ example: '2026-01-01' }) @IsOptional() @Matches(DATE_OR_EMPTY) openingBalanceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) bankAccount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) iban?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @ApiPropertyOptional({ type: [ExtraFieldDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExtraFieldDto) extraFields?: ExtraFieldDto[];
}
export class CreateSupplierDto extends SupplierFields { @ApiProperty() @IsString() @MaxLength(200) declare name: string; }
export class UpdateSupplierDto extends SupplierFields { @ApiProperty({ description: 'آخر rev شفته (للتعارض)' }) @IsInt() @Min(1) rev: number; }

/** حقول العميل — نفس نافذة العميل (renderer/modules/clients/pages-customers.js:395) */
class CustomerFields {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional({ description: 'فاضي = بيتولّد بنفس صيغة الواجهة الحالية (البادئة + 4 أرقام)' }) @IsOptional() @IsString() @MaxLength(50) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) department?: string;
  @ApiPropertyOptional({ description: 'مؤقتًا خانتين بس — توافق مع الواجهة الحالية (toInt → round2)' }) @IsOptional() @IsMoneyString({ allowNegative: true }) openingBalance?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @ApiPropertyOptional({ type: [ContactDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ContactDto) contacts?: ContactDto[];
  @ApiPropertyOptional({ type: [ExtraFieldDto] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ExtraFieldDto) extraFields?: ExtraFieldDto[];
}
export class CreateCustomerDto extends CustomerFields { @ApiProperty() @IsString() @MaxLength(200) declare name: string; }
export class UpdateCustomerDto extends CustomerFields { @ApiProperty() @IsInt() @Min(1) rev: number; }

export class ListPartiesQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) q?: string;
}
