import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListEquipmentQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) ownership?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) project?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) type?: string;
  @ApiPropertyOptional({ description: 'القسم (لوحة)، و«__none__» = بدون قسم أو نوع ترخيص' }) @IsOptional() @IsString() @MaxLength(80) departmentId?: string;
  @ApiPropertyOptional({ enum: ['', 'valid', 'soon', 'expired', 'none'] }) @IsOptional() @IsIn(['', 'valid', 'soon', 'expired', 'none']) xLic?: string;
  @ApiPropertyOptional({ enum: ['', 'insured', 'none', 'pending', 'empty'] }) @IsOptional() @IsIn(['', 'insured', 'none', 'pending', 'empty']) xIns?: string;
  @ApiPropertyOptional({ enum: ['', 'missing', 'complete'] }) @IsOptional() @IsIn(['', 'missing', 'complete']) xDocs?: string;
}
export class SaveEquipmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) code?: string;
  @ApiPropertyOptional({ description: 'نوع الترخيص: معرّف قسم من أقسام المعدات أو اسم جديد' }) @IsOptional() @IsString() @MaxLength(120) type?: string;
  @ApiPropertyOptional({ description: 'نوع السيارة' }) @IsOptional() @IsString() @MaxLength(120) carType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) ownership?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) vehicleNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) motorNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) chassisNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) insuranceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) insuranceStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) purchasePrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) inspectionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) licenseIssueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) vehicleLicenseExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) lastMaintenance?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) nextMaintenance?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } }) @IsOptional() @IsArray() extraFields?: Record<string, unknown>[];
  @ApiPropertyOptional({ description: 'تأكيد الحفظ رغم التشابه' }) @IsOptional() @IsBoolean() confirmDuplicates?: boolean;
}
export class UpdateEquipmentDto extends SaveEquipmentDto { @ApiProperty() @IsInt() @Min(0) rev: number }
export class EquipmentDailyQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) project?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) dept?: string;
}
export class SaveEquipmentDailyDto {
  @ApiProperty() @IsString() @MaxLength(80) equipmentId: string;
  @ApiProperty() @IsString() @MaxLength(10) date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) project?: string;
  @ApiPropertyOptional({ enum: ['work', 'idle', 'move'] }) @IsOptional() @IsIn(['work', 'idle', 'move']) kind?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) days?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) dailyCost?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) hours?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) fuelLiters?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) hourlyCost?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) fuelPrice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) extraCost?: string;
  @ApiPropertyOptional({ description: 'تكلفة النقل (DEC-0140) — إلزامية ليوم «نقل»' }) @IsOptional() @IsString() @MaxLength(30) moveCost?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) productivity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}
export class UpdateEquipmentDailyDto extends SaveEquipmentDailyDto { @ApiProperty() @IsInt() @Min(0) rev: number }
