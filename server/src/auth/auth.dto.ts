import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MeDto } from '../users/users.dto';

export class LoginDto {
  @ApiProperty({ example: 'admin' }) @IsString() @MinLength(1) @MaxLength(64) username: string;
  @ApiProperty({ example: '••••••••••' }) @IsString() @MinLength(1) @MaxLength(256) password: string;
  @ApiPropertyOptional({ example: '123456', description: 'كود التحقق بخطوتين (6 أرقام) أو كود استرداد — مطلوب لو 2FA مفعّل (401 OTP_REQUIRED)' })
  @IsOptional() @IsString() @MaxLength(16) otp?: string;
}

export class TwoFactorPasswordDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(256) password: string;
}
export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' }) @IsString() @MinLength(6) @MaxLength(16) otp: string;
}
export class TwoFactorDisableDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(256) password: string;
  @ApiProperty({ example: '123456' }) @IsString() @MinLength(6) @MaxLength(16) otp: string;
}
export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'السر (base32) للإدخال اليدوي في تطبيق المصادقة' }) secret: string;
  @ApiProperty({ description: 'رابط otpauth:// (لـ QR)' }) otpauthUrl: string;
}
export class TwoFactorEnabledResponseDto {
  @ApiProperty({ type: [String], description: 'أكواد استرداد — بتظهر مرة واحدة بس، كل كود يستخدم مرة' }) recoveryCodes: string[];
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'مطلوبة إلا لو التغيير إجباري (mustChangePassword) بعد دخول لسه حالًا' })
  @IsOptional() @IsString() @MaxLength(256) currentPassword?: string;
  @ApiProperty({ minLength: 10, maxLength: 128 }) @IsString() @MaxLength(256) newPassword: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT قصير العمر — يتبعت في Authorization: Bearer. الـ refresh token في cookie HttpOnly اسمها rt' }) accessToken: string;
  @ApiProperty({ example: 'Bearer' }) tokenType: 'Bearer';
  @ApiProperty({ example: 900, description: 'بالثواني' }) expiresIn: number;
  @ApiProperty({ type: MeDto }) user: MeDto;
}

export class ErrorDto {
  @ApiProperty({ example: 401 }) statusCode: number;
  @ApiProperty({ example: 'INVALID_CREDENTIALS', required: false }) code?: string;
  @ApiProperty({ example: 'اسم المستخدم أو كلمة المرور غلط' }) message: string | string[];
  @ApiProperty({ example: 900, required: false, description: 'ثواني لحد فك القفل (ACCOUNT_LOCKED)' }) retryAfterSec?: number;
}
