import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export const KINDS = ['increase', 'deficit', 'damage', 'correction', 'stocktake', 'transfer'] as const;
const QTY = /^\d{1,13}(\.\d{1,5})?$/; // B-26: 5 خانات

export class CreateAdjustmentDto {
  @ApiProperty({ enum: KINDS, description: 'زيادة / عجز / تلف أو إعدام / تصحيح خطأ تسجيل / نتيجة جرد / تحويل مخزني' }) @IsIn(KINDS) kind: (typeof KINDS)[number];
  @ApiPropertyOptional({ enum: ['in', 'out'], description: 'إلزامي للتصحيح ونتيجة الجرد بس' }) @IsOptional() @IsIn(['in', 'out']) direction?: 'in' | 'out';
  @ApiProperty() @IsString() @Length(1, 200) itemId: string;
  @ApiProperty() @IsString() @Length(1, 200) locationId: string;
  @ApiPropertyOptional({ description: 'للتحويل بس' }) @IsOptional() @IsString() @Length(1, 200) toLocationId?: string;
  @ApiProperty({ example: '12.5', description: 'نص عشري موجب حتى 5 خانات (B-26)' }) @Matches(QTY) qty: string;
  @ApiProperty() @IsString() @Length(3, 2000) reason: string;
}
export class UpdateAdjustmentDto {
  @ApiProperty() @IsInt() @Min(1) rowVersion: number;
  @ApiPropertyOptional() @IsOptional() @Matches(QTY) qty?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 2000) reason?: string;
}
export class ReasonDto { @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 2000) reason?: string }
