import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PageAction } from './roles';
import type { AuthUser } from '../auth/auth.types';

export const IS_PUBLIC = 'authz:public';
export const ALLOW_PENDING_PASSWORD_CHANGE = 'authz:allowPendingPasswordChange';
export const REQUIRED_PERMS = 'authz:required';

/** endpoint عام (بدون تسجيل دخول) */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** مسموح حتى لو المستخدم لازم يغيّر كلمة مروره (me، change-password، logout) */
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PENDING_PASSWORD_CHANGE, true);

export type GlobalFlag = 'editData' | 'deleteData' | 'manageUsers';
export type RequiredPerm = { flag: GlobalFlag } | { page: string; action: PageAction };

/** كل الشروط لازم تتحقق (AND). مثال: @RequirePerms({ flag: 'manageUsers' }) */
export const RequirePerms = (...perms: RequiredPerm[]) => SetMetadata(REQUIRED_PERMS, perms);

/** req.user */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
