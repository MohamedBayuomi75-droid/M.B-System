import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { PAGES, ROLE_KEYS } from '../authz/roles';
import { PermissionsDto } from '../authz/roles.dto';

export const USERNAME_RE = /^[\p{L}\p{N}._@-]+$/u;

export class PageOverrideDto {
  @ApiProperty({ enum: PAGES, example: 'payroll' }) @IsIn(PAGES as unknown as string[]) page: string;
  @ApiProperty() @IsBoolean() view: boolean;
  @ApiProperty() @IsBoolean() add: boolean;
  @ApiProperty() @IsBoolean() edit: boolean;
  @ApiProperty() @IsBoolean() delete: boolean;
}

class UserWritableFields {
  @ApiPropertyOptional({ example: 'أحمد محمد' }) @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional({ enum: ROLE_KEYS }) @IsOptional() @IsIn(ROLE_KEYS as unknown as string[]) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ description: 'لو مش محدد: من قالب الدور' }) @IsOptional() @IsBoolean() editData?: boolean;
  @ApiPropertyOptional({ description: 'لو مش محدد: من قالب الدور' }) @IsOptional() @IsBoolean() deleteData?: boolean;
  @ApiPropertyOptional({ description: 'لو مش محدد: من قالب الدور. منحها للأدمن بس' }) @IsOptional() @IsBoolean() manageUsers?: boolean;
  @ApiPropertyOptional({ type: [String], nullable: true, description: 'null = كل المشاريع' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) @MaxLength(100, { each: true })
  projectScope?: string[] | null;
  @ApiPropertyOptional({ type: [PageOverrideDto], description: 'تخصيص صفحات فوق قالب الدور (بيستبدل كل التخصيصات الحالية)' })
  @IsOptional() @IsArray() @ArrayMaxSize(PAGES.length) @ValidateNested({ each: true }) @Type(() => PageOverrideDto)
  pages?: PageOverrideDto[];
}

export class CreateUserDto extends UserWritableFields {
  @ApiProperty({ example: 'ahmed' }) @IsString() @Length(3, 64) @Matches(USERNAME_RE, { message: 'اسم المستخدم: حروف وأرقام و . _ @ - بس' }) username: string;
  @ApiProperty({ minLength: 10, maxLength: 128 }) @IsString() @MaxLength(256) password: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() mustChangePassword?: boolean;
}

export class UpdateUserDto extends UserWritableFields {}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 10, maxLength: 128 }) @IsString() @MaxLength(256) newPassword: string;
  @ApiPropertyOptional({ default: true, description: 'يجبر المستخدم يغيّرها أول دخول' }) @IsOptional() @IsBoolean() mustChangePassword?: boolean;
}

export class UserDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ROLE_KEYS }) role: string;
  @ApiProperty() active: boolean;
  @ApiProperty() mustChangePassword: boolean;
  @ApiProperty() editData: boolean;
  @ApiProperty() deleteData: boolean;
  @ApiProperty() manageUsers: boolean;
  @ApiProperty({ type: [String], nullable: true }) projectScope: string[] | null;
  @ApiProperty({ type: [PageOverrideDto] }) pages: PageOverrideDto[];
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) lockedUntil: Date | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) lastLoginAt: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
}

export class MeDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ROLE_KEYS }) role: string;
  @ApiProperty({ example: 'مدير النظام' }) roleLabel: string;
  @ApiProperty() mustChangePassword: boolean;
  @ApiProperty({ type: [String], nullable: true }) projectScope: string[] | null;
  @ApiProperty({ type: PermissionsDto }) permissions: PermissionsDto;
  @ApiProperty({ enum: PAGES, isArray: true, description: 'كل مفاتيح الصفحات بالترتيب (بديل HR_PAGES في الواجهة)' }) pages: string[];
}
