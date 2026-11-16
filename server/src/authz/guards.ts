import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthErrorCode, AuthUser } from '../auth/auth.types';
import { ALLOW_PENDING_PASSWORD_CHANGE, IS_PUBLIC, REQUIRED_PERMS, RequiredPerm } from './decorators';
import { hasPagePermission } from './effective-permissions';

/** Guard عام #1: كل endpoint محتاج JWT صالح إلا اللي عليه @Public() */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }
  canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    return super.canActivate(ctx);
  }
  handleRequest<T>(err: unknown, user: T): T {
    if (err || !user) throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.UNAUTHENTICATED, message: 'لازم تسجّل دخول' });
    return user;
  }
}

/** Guard عام #2: تغيير كلمة المرور الإجباري + الصلاحيات المطلوبة (@RequirePerms). الواجهة للعرض بس — ده المرجع. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user) throw new UnauthorizedException({ statusCode: 401, code: AuthErrorCode.UNAUTHENTICATED, message: 'لازم تسجّل دخول' });
    if (user.mustChangePassword && !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_CHANGE, targets)) {
      throw new ForbiddenException({ statusCode: 403, code: AuthErrorCode.PASSWORD_CHANGE_REQUIRED, message: 'لازم تغيّر كلمة المرور الأول' });
    }
    const required = this.reflector.getAllAndMerge<RequiredPerm[]>(REQUIRED_PERMS, targets) ?? [];
    for (const r of required) {
      const ok = 'flag' in r ? !!user.permissions[r.flag] : hasPagePermission(user.permissions, r.page, r.action);
      if (!ok) throw new ForbiddenException({ statusCode: 403, code: AuthErrorCode.FORBIDDEN, message: 'مالكش صلاحية للعملية دي' });
    }
    return true;
  }
}
