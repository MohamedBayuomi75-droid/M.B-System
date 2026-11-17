import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCookieAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AllowPendingPasswordChange, CurrentUser, Public } from '../authz/decorators';
import { isRoleKey, PAGES, ROLE_LABELS } from '../authz/roles';
import type { UserEntity } from '../entities';
import { MeDto } from '../users/users.dto';
import { AuthConfig } from './auth.config';
import { ChangePasswordDto, ErrorDto, LoginDto, TokenResponseDto } from './auth.dto';
import { AuthService } from './auth.service';
import { AuthUser, REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './auth.types';
import { LoginBodyGuard } from './login-body.guard';
import { LoginThrottlerGuard } from './login-throttler.guard';

const loginLimit = () => Number(process.env.LOGIN_RATE_LIMIT_PER_MIN || 5);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly cfg: AuthConfig) {}

  private cookieOpts(): CookieOptions {
    return { httpOnly: true, secure: this.cfg.cookieSecure, sameSite: 'lax', path: REFRESH_COOKIE_PATH, maxAge: this.cfg.refreshTtlDays * 86_400_000 };
  }

  private respond(res: Response, r: { accessToken: string; refreshToken: string; user: AuthUser; expiresIn: number }): TokenResponseDto {
    res.cookie(REFRESH_COOKIE, r.refreshToken, this.cookieOpts());
    res.setHeader('Cache-Control', 'no-store');
    return { accessToken: r.accessToken, tokenType: 'Bearer', expiresIn: r.expiresIn, user: toMe(r.user) };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(LoginThrottlerGuard, LoginBodyGuard, AuthGuard('local'))
  @Throttle({ default: { limit: loginLimit(), ttl: 60_000 } })
  @ApiOperation({ summary: 'تسجيل الدخول', description: 'بيرجّع access token (15 د) وبيحط refresh token في cookie HttpOnly (rt). لو user.mustChangePassword = true كل الـ endpoints هترجع 403 PASSWORD_CHANGE_REQUIRED لحد ما تغيّرها.' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiBadRequestResponse({ type: ErrorDto, description: 'body غير صالح (حقول ناقصة أو زيادة)' })
  @ApiUnauthorizedResponse({ type: ErrorDto, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 423, type: ErrorDto, description: 'ACCOUNT_LOCKED — قفل مؤقت بعد محاولات فاشلة متتالية' })
  @ApiTooManyRequestsResponse({ description: 'أكتر من الحد المسموح في الدقيقة لنفس IP + اسم مستخدم' })
  async login(@Req() req: Request & { user: UserEntity }, @Res({ passthrough: true }) res: Response): Promise<TokenResponseDto> {
    return this.respond(res, await this.auth.login(req.user, req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'تجديد الـ access token من الـ refresh cookie (مع تدويرها)', description: 'إعادة استخدام refresh token قديم = اشتباه سرقة → كل جلسات المستخدم بتتلغي.' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorDto, description: 'REFRESH_INVALID / REFRESH_RACE' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<TokenResponseDto> {
    try {
      return this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], req));
    } catch (e) {
      if ((e as { response?: { code?: string } }).response?.code !== 'REFRESH_RACE') res.clearCookie(REFRESH_COOKIE, { ...this.cookieOpts(), maxAge: undefined });
      throw e;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'خروج من الجهاز ده', description: 'بيلغي جلسة الـ refresh cookie (لو موجودة) ويمسح الكوكي. بيشتغل حتى لو الـ access token انتهى.' })
  @ApiNoContentResponse()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE], undefined, req);
    res.clearCookie(REFRESH_COOKIE, { ...this.cookieOpts(), maxAge: undefined });
  }

  @Post('logout-all')
  @HttpCode(204)
  @ApiBearerAuth()
  @AllowPendingPasswordChange()
  @ApiOperation({ summary: 'خروج من كل الأجهزة', description: 'بيلغي كل الجلسات وكل الـ access tokens الحالية فورًا.' })
  @ApiNoContentResponse()
  async logoutAll(@CurrentUser() user: AuthUser, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logoutAll(user, req);
    res.clearCookie(REFRESH_COOKIE, { ...this.cookieOpts(), maxAge: undefined });
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @AllowPendingPasswordChange()
  @ApiOperation({ summary: 'تغيير كلمة المرور', description: 'الحد الأدنى 10 حروف. بيلغي كل الجلسات التانية ويرجّع جلسة جديدة للجهاز ده.' })
  @ApiOkResponse({ type: TokenResponseDto })
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<TokenResponseDto> {
    return this.respond(res, await this.auth.changePassword(user, dto.currentPassword, dto.newPassword, req));
  }
}

export function toMe(u: AuthUser): MeDto {
  return {
    id: u.id, username: u.username, name: u.name, role: u.role,
    roleLabel: isRoleKey(u.role) ? ROLE_LABELS[u.role] : u.role,
    mustChangePassword: u.mustChangePassword, twoFactorEnabled: u.twoFactorEnabled, twoFactorSetupRequired: u.twoFactorSetupRequired,
    projectScope: u.projectScope, permissions: u.permissions, pages: [...PAGES],
  };
}
