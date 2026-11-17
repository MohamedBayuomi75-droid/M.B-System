import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { IsMoneyString } from '../common/money.validators';

/** طبقة الـ API لمحرك الاعتمادات — مفيش أي قيمة افتراضية لمسار أو مستوى أو حد (كله من الإعداد) */
export class CreateDocumentTypeDto {
  @ApiProperty({ example: 'supplier-invoice' }) @Matches(/^[a-z][a-z0-9_.-]{1,60}$/) code: string;
  @ApiProperty({ example: 'فاتورة مورد' }) @IsString() @Length(1, 100) name: string;
  @ApiProperty({ example: 'ledger.invoices', description: 'صفحة الموديول المالك — صلاحية «تعديل» عليها مطلوبة لإرسال مستند للاعتماد' }) @IsString() @Length(1, 60) module: string;
}

export class ApproverDto {
  @ApiProperty({ enum: ['ROLE', 'USER'] }) @IsIn(['ROLE', 'USER']) type: 'ROLE' | 'USER';
  @ApiProperty({ description: 'مفتاح دور موجود (roles) أو معرّف مستخدم موجود' }) @IsString() @Length(1, 64) ref: string;
}

export class LevelDto {
  @ApiProperty({ enum: ['ALL', 'ANY', 'N_OF_M'] }) @IsIn(['ALL', 'ANY', 'N_OF_M']) mode: 'ALL' | 'ANY' | 'N_OF_M';
  @ApiPropertyOptional({ description: 'إلزامي مع N_OF_M بس' }) @IsOptional() @IsInt() @Min(1) requiredCount?: number;
  @ApiProperty({ type: [ApproverDto] }) @ValidateNested({ each: true }) @Type(() => ApproverDto) @ArrayMinSize(1) @ArrayMaxSize(50) approvers: ApproverDto[];
}

export class CreateWorkflowDto {
  @ApiProperty() @IsString() @Length(1, 62) documentType: string;
  @ApiPropertyOptional({ example: '0.0000', description: 'بداية نطاق القيمة (نص عشري) — من غير = مفتوح' }) @IsOptional() @IsMoneyString() amountFrom?: string;
  @ApiPropertyOptional({ example: '50000.0000' }) @IsOptional() @IsMoneyString() amountTo?: string;
  @ApiProperty({ description: 'هل مقدّم الطلب يقدر يعتمد مستنده؟ (B-04) — إلزامي، مفيش افتراض' }) @IsBoolean() allowSelfApproval: boolean;
  @ApiProperty({ description: 'هل نفس الشخص يعتمد في أكتر من مستوى؟ (B-04) — إلزامي، مفيش افتراض' }) @IsBoolean() allowSameApproverAcrossLevels: boolean;
  @ApiProperty({ type: [LevelDto], description: 'المستويات بالترتيب (B-03) — مفيش عدد افتراضي' }) @ValidateNested({ each: true }) @Type(() => LevelDto) @ArrayMinSize(1) @ArrayMaxSize(10) levels: LevelDto[];
}

export class SubmitDto {
  @ApiProperty() @IsString() @Length(1, 62) documentType: string;
  @ApiProperty() @IsString() @Length(1, 200) documentId: string;
  @ApiPropertyOptional({ example: '12500.0000', description: 'قيمة المستند (نص عشري) — بتحدد المسار حسب النطاقات' }) @IsOptional() @IsMoneyString() amount?: string;
  @ApiPropertyOptional({ description: 'بصمة الحقول الجوهرية وقت الإرسال (B-07)' }) @IsOptional() @IsString() @MaxLength(128) materialHash?: string;
}

export class DecisionDto {
  @ApiPropertyOptional({ description: 'إلزامي للرفض والإرجاع والإلغاء' }) @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}
