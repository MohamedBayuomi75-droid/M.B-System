import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** 8.4.4 (DEC-0127): فلاتر صفحة الإجازات القديمة (leaveFilters) */
export class ListLeavesQuery {
  @ApiPropertyOptional({ enum: ['', 'employee', 'worker', 'supervisor', 'driver'] }) @IsOptional() @IsIn(['', 'employee', 'worker', 'supervisor', 'driver']) personKind?: string;
  @ApiPropertyOptional({ description: 'الشخص' }) @IsOptional() @IsString() @MaxLength(80) employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
}
/** نافذة طلب الإجازة: نفس الخانات كنصوص، والسيرفر بيحسب زي زرار الحفظ القديم */
export class SaveLeaveDto {
  @ApiProperty({ enum: ['employee', 'worker', 'supervisor', 'driver'] }) @IsIn(['employee', 'worker', 'supervisor', 'driver']) personKind: string;
  @ApiProperty() @IsString() @MaxLength(80) personId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) to?: string;
  @ApiPropertyOptional({ description: 'عدد الأيام (فاضي أو صفر ← من التاريخين)' }) @IsOptional() @IsString() @MaxLength(20) days?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}
export class UpdateLeaveDto extends SaveLeaveDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}
export class LeaveRevDto {
  @ApiProperty() @IsInt() @Min(1) rev: number;
}
