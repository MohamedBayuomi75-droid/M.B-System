import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

const KINDS = ['worker', 'supervisor', 'driver', 'employee', 'equipment'];
const TABS = ['workers', 'supervisors', 'drivers', 'employees', 'equipment'];
export class CostTableQuery {
  @ApiProperty({ enum: TABS }) @IsIn(TABS) tab: string;
  @ApiPropertyOptional({ description: 'القسم (لوحة)؛ فاضي مع all=1 = «الكل»' }) @IsOptional() @IsString() @MaxLength(100) section?: string;
  @ApiPropertyOptional({ enum: ['', '1'] }) @IsOptional() @IsIn(['', '1']) all?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) item?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) project?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) to?: string;
}
export class CostLineDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) item?: string;
  @ApiPropertyOptional({ description: 'نص زي خانة القديمة (toInt)' }) @IsOptional() @IsString() @MaxLength(30) amount?: string;
}
export class SaveCostDto {
  @ApiProperty({ enum: KINDS }) @IsIn(KINDS) personKind: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) personId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) project?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) section?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @ApiPropertyOptional({ type: [CostLineDto] }) @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => CostLineDto) lines?: CostLineDto[];
}
export class UpdateCostDto extends SaveCostDto {
  @ApiProperty() @IsInt() @Min(0) rev: number;
}
export class CostSectionDto {
  @ApiProperty({ enum: TABS }) @IsIn(TABS) tab: string;
  @ApiProperty({ enum: ['add', 'rename', 'delete'] }) @IsIn(['add', 'rename', 'delete']) op: 'add' | 'rename' | 'delete';
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiPropertyOptional({ description: 'الاسم الجديد (rename)' }) @IsOptional() @IsString() @MaxLength(100) to?: string;
}
export class CostItemDto {
  @ApiProperty({ enum: KINDS }) @IsIn(KINDS) kind: string;
  @ApiProperty({ enum: ['add', 'rename', 'remove'] }) @IsIn(['add', 'rename', 'remove']) op: 'add' | 'rename' | 'remove';
  @ApiProperty() @IsString() @MaxLength(200) label: string;
  @ApiPropertyOptional({ description: 'الاسم الجديد (rename)' }) @IsOptional() @IsString() @MaxLength(200) to?: string;
}
export class ProjectCostQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) to?: string;
}
export class ProjectCostOneQuery extends ProjectCostQuery {
  @ApiProperty() @IsString() @MaxLength(200) name: string;
}
