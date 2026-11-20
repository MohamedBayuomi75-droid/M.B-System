import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

const QTY = /^\d{1,13}(\.\d{1,5})?$/; // B-26: 5 خانات
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** بيانات الصنف الأساسية بس — حقول التكلفة (avgCost/lastCost) مش قابلة للكتابة من هنا لحد اعتماد معادلتها (B-20) */
export class CreateItemDto {
  @ApiProperty() @IsString() @Length(1, 200) name: string;
  @ApiPropertyOptional({ description: 'فاضي = بيتولّد بنفس صيغة الواجهة الحالية (بادئة الإعدادات أو ITM- + 4 أرقام)' }) @IsOptional() @IsString() @MaxLength(50) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional({ description: 'حد إعادة الطلب (5 خانات)' }) @IsOptional() @Matches(QTY) minQty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class UpdateItemDto extends CreateItemDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) declare name: string;
}
export class CreateLocationDto {
  @ApiProperty() @IsString() @Length(1, 200) name: string;
  @ApiPropertyOptional({ description: 'كود المخزن (= المعرّف). فاضي = LOC-NN بنفس صيغة الواجهة القديمة (pages-home.js openWhLocationModal)' }) @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{1,40}$/) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
/** تعديل المخزن: الاسم والملاحظات بس. الكود (المعرّف) مابيتغيّرش، زي الواجهة القديمة (readonly) */
export class UpdateLocationDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
/** التحويل بين المخازن (مالوش أثر على التكلفة). الاستلام والصرف بتكلفتهم من الشاشة الكاملة لحد اعتماد معادلة المتوسط (B-20) */
export class TransferDto {
  @ApiProperty() @IsString() @Length(1, 200) itemId: string;
  @ApiProperty() @IsString() @Length(1, 200) fromLocationId: string;
  @ApiProperty() @IsString() @Length(1, 200) toLocationId: string;
  @ApiProperty({ example: '2.5' }) @Matches(QTY) qty: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
