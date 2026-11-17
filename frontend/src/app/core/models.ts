/** أشكال بيانات الـ API (من Swagger السيرفر — /api/docs-json). المبالغ دايمًا نصوص عشرية (ADR-023). */
export type PageAction = 'view' | 'add' | 'edit' | 'delete';
export type PagePerm = Record<PageAction, boolean>;
export interface Permissions { editData: boolean; deleteData: boolean; manageUsers: boolean; pages: Record<string, PagePerm> }
export interface Me {
  id: string; username: string; name: string; role: string; roleLabel: string;
  mustChangePassword: boolean; twoFactorEnabled: boolean; twoFactorSetupRequired: boolean;
  projectScope: string[] | null; permissions: Permissions; pages: string[];
}
export interface TokenResponse { accessToken: string; tokenType: 'Bearer'; expiresIn: number; user: Me }
export interface ApiError { statusCode: number; code?: string; message?: string | string[]; requestId?: string; retryAfterSec?: number }
export interface Project { id: string; code: string | null; name: string; status: string | null; stage: string | null; budget: string | null; supervisorId: string | null; customerId: string | null; rev: number; updatedAt: string | null }
export interface ProjectList { items: Project[]; total: number; source: string }
