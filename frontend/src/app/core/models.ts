/** أشكال بيانات الـ API (من Swagger السيرفر — /api/docs-json). المبالغ دايمًا نصوص عشرية (ADR-023). */
export type PageAction = 'view' | 'add' | 'edit' | 'delete';
export type PagePerm = Record<PageAction, boolean>;
export interface Permissions { editData: boolean; deleteData: boolean; manageUsers: boolean; pages: Record<string, PagePerm> }
export interface Me {
  id: string; username: string; name: string; role: string; roleLabel: string;
  mustChangePassword: boolean; twoFactorEnabled: boolean; twoFactorSetupRequired: boolean;
  projectScope: string[] | null; permissions: Permissions; pages: string[];
  /** المرحلة 5: أفعال المستندات والموديولات الظاهرة */
  docActions?: Record<DocAction, boolean>; modules?: string[];
}
export interface TokenResponse { accessToken: string; tokenType: 'Bearer'; expiresIn: number; user: Me }
export interface ApiError { statusCode: number; code?: string; message?: string | string[]; requestId?: string; retryAfterSec?: number }
export type DocAction = 'approve' | 'reject' | 'print' | 'export' | 'pay' | 'cancel' | 'post';
export interface InboxItem { id: string; documentType: string; documentName: string; documentId: string; cycle: number; amount: string | null; status: string; currentLevel: number; submittedAt: string }
export interface AppNotification { id: string; kind: string; title: string; body: string | null; entity: string | null; entityId: string | null; createdAt: string; readAt: string | null }
export interface NotificationList { items: AppNotification[]; unread: number }
export interface Attachment { id: string; filename: string; kind: string; size: number; createdAt: string; version: number; versionOf: string | null; supersededAt: string | null }
