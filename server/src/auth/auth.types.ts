import { Permissions } from '../authz/roles';

/** المستخدم الموثّق المرفق بكل request (req.user) — بيتبني من الداتابيز في كل طلب. */
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  tokenVersion: number;
  projectScope: string[] | null;
  permissions: Permissions;
  /** id جلسة الـ refresh اللي الـ access token اتولد منها */
  sessionId?: string;
}

export interface AccessTokenPayload {
  sub: string;
  tv: number;
  sid: string;
}

export const REFRESH_COOKIE = 'rt';
export const REFRESH_COOKIE_PATH = '/api/auth';

/** أكواد الأخطاء الثابتة اللي الواجهة بتعتمد عليها */
export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  REFRESH_INVALID: 'REFRESH_INVALID',
  REFRESH_RACE: 'REFRESH_RACE',
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  CURRENT_PASSWORD_WRONG: 'CURRENT_PASSWORD_WRONG',
} as const;
