import type { AuthUser } from '../auth/auth.types';
import { hasPagePermission } from '../authz/effective-permissions';
import type { PageAction } from '../authz/roles';
import { accessFor, CollectionAccess } from './collection-pages';
import { FIELD_GUARDS } from './field-guards';

export type WriteAction = Exclude<PageAction, 'view'>;
type PolicyUser = Pick<AuthUser, 'permissions' | 'projectScope' | 'role'>;

const anyPage = (u: PolicyUser, pages: readonly string[], action: PageAction) => pages.some((p) => hasPagePermission(u.permissions, p, action));

/** أي محرّر: editData + تعديل على صفحة واحدة على الأقل */
export function isAnyEditor(u: PolicyUser): boolean {
  return !!u.permissions.editData && Object.values(u.permissions.pages).some((p) => p.edit || p.add);
}

export function canReadAccess(u: PolicyUser, a: CollectionAccess): boolean {
  return a.read === 'any' ? true : anyPage(u, a.read, 'view');
}

export function canRead(u: PolicyUser, path: string): boolean {
  const a = accessFor(path);
  return !!a && canReadAccess(u, a);
}

/** صلاحية الكتابة = فعل الصفحة + العلم العام (editData لـ add/edit، deleteData لـ delete) */
export function canWrite(u: PolicyUser, path: string, action: WriteAction): boolean {
  const a = accessFor(path);
  if (!a || a.write === 'none') return false;
  const flag = action === 'delete' ? u.permissions.deleteData : u.permissions.editData;
  if (!flag) return false;
  if (a.write === 'anyEditor') return isAnyEditor(u);
  return anyPage(u, a.write, action);
}

/** معرّفات المشاريع اللي السجل مربوط بيها (حسب collection-pages.project) */
export function projectIdsOf(path: string, data: Record<string, unknown> | null | undefined): string[] {
  const fields = accessFor(path)?.project;
  if (!fields || !data) return [];
  const out: string[] = [];
  for (const f of fields) {
    const v = data[f];
    if (typeof v === 'string' && v.trim()) out.push(v.trim());
  }
  return out;
}

/** نطاق المشاريع: مستخدم بـ projectScope يشوف/يكتب بس السجلات المربوطة بمشروع من مشاريعه (في الـ collections المربوطة بمشاريع) */
export function inProjectScope(u: PolicyUser, path: string, data: Record<string, unknown> | null | undefined): boolean {
  if (u.role === 'admin' || !u.projectScope) return true;
  if (!accessFor(path)?.project) return true; // collection مش مربوطة بمشاريع
  const ids = projectIdsOf(path, data);
  return ids.length > 0 && ids.some((id) => u.projectScope!.includes(id));
}

/** الحقول المحمية اللي المستخدم ممنوع منها في collection معيّنة */
export function hiddenFields(u: PolicyUser, path: string): string[] {
  const guards = FIELD_GUARDS[path];
  if (!guards) return [];
  const out: string[] = [];
  for (const g of guards) if (!anyPage(u, g.pages, 'view')) out.push(...g.fields);
  return out;
}

export function stripHidden<T extends Record<string, unknown>>(data: T, hidden: readonly string[]): T {
  if (!hidden.length) return data;
  const copy: Record<string, unknown> = { ...data };
  for (const f of hidden) delete copy[f];
  return copy as T;
}

/** توقيع الصلاحيات (للكاش في البث اللحظي: نفس التوقيع = نفس الفلترة) */
export function permissionSignature(u: PolicyUser): string {
  return JSON.stringify([u.role === 'admin', u.permissions, u.projectScope]);
}
