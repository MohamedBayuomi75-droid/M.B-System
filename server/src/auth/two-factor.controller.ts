import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AllowPendingPasswordChange, CurrentUser, RequirePerms } from '../authz/decorators';
import { TwoFactorCodeDto, TwoFactorDisableDto, TwoFactorEnabledResponseDto, TwoFactorPasswordDto, TwoFactorSetupResponseDto } from './auth.dto';
import type { AuthUser } from './auth.types';
import { TwoFactorService } from './two-factor.service';

@ApiTags('auth')
@ApiBearerAuth()
@Controller()
export class TwoFactorController {
  constructor(private readonly svc: TwoFactorService) {}

  @Post('auth/2fa/setup')
  @HttpCode(200)
  @AllowPendingPasswordChange()
  @ApiOperation({ summary: 'بدء تفعيل التحقق بخطوتين', description: 'بيطلب كلمة المرور، وبيرجّع السر ورابط otpauth لتطبيق المصادقة (Google/Microsoft Authenticator).' })
  @ApiOkResponse({ type: TwoFactorSetupResponseDto })
  setup(@CurrentUser() u: AuthUser, @Body() dto: TwoFactorPasswordDto, @Req() req: Request): Promise<TwoFactorSetupResponseDto> {
    return this.svc.setup(u, dto.password, req);
  }

  @Post('auth/2fa/enable')
  @HttpCode(200)
  @AllowPendingPasswordChange()
  @ApiOperation({ summary: 'تأكيد التفعيل بأول كود', description: 'بيرجّع 10 أكواد استرداد — بتظهر مرة واحدة بس.' })
  @ApiOkResponse({ type: TwoFactorEnabledResponseDto })
  enable(@CurrentUser() u: AuthUser, @Body() dto: TwoFactorCodeDto, @Req() req: Request): Promise<TwoFactorEnabledResponseDto> {
    return this.svc.enable(u, dto.otp, req);
  }

  @Post('auth/2fa/disable')
  @HttpCode(204)
  @ApiOperation({ summary: 'إلغاء التحقق بخطوتين', description: 'كلمة المرور + كود حالي (أو كود استرداد).' })
  @ApiNoContentResponse()
  async disable(@CurrentUser() u: AuthUser, @Body() dto: TwoFactorDisableDto, @Req() req: Request): Promise<void> {
    await this.svc.disable(u, dto.password, dto.otp, req);
  }

  @Post('users/:id/2fa/reset')
  @HttpCode(204)
  @RequirePerms({ flag: 'manageUsers' })
  @ApiOperation({ summary: 'تصفير التحقق بخطوتين لمستخدم (فقد جهازه)', description: 'بيقفل كل جلساته. بيتسجل في سجل التدقيق.' })
  @ApiNoContentResponse()
  async reset(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    await this.svc.adminReset(u, id, req);
  }
}
