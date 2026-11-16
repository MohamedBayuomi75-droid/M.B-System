import { PAGES, PageAction, PagePerm, Permissions, roleTemplates, RoleKey, isRoleKey } from './roles';

export interface PermissionSubject {
  role: string;
  canEditData: boolean;
  canDeleteData: boolean;
  canManageUsers: boolean;
}
export interface PageOverride { page: string; canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }

/**
 * الصلاحيات الفعلية (D-013):
 *  - admin = كل حاجة دايمًا (زي الديسكتوب).
 *  - غير كده: لكل صفحة → تخصيص المستخدم (user_permissions) لو موجود، وإلا قالب الدور، وإلا ممنوع.
 *    (الديسكتوب كان بيسمح بأي صفحة بدون بادئة مش محفوظة — السيرفر بيمنع بالافتراض.)
 *  - الأعلام العامة (editData/deleteData/manageUsers) من أعمدة المستخدم.
 *  - دور مش معروف = viewer.
 */
export function effectivePermissions(user: PermissionSubject, overrides: PageOverride[] = []): Permissions {
  const T = roleTemplates();
  if (user.role === 'admin') return T.admin;
  const tpl = T[(isRoleKey(user.role) ? user.role : 'viewer') as RoleKey];
  const byPage = new Map(overrides.map((o) => [o.page, o]));
  const pages: Record<string, PagePerm> = {};
  for (const p of PAGES) {
    const o = byPage.get(p);
    pages[p] = o ? { view: o.canView, add: o.canAdd, edit: o.canEdit, delete: o.canDelete } : { ...(tpl.pages[p] ?? { view: false, add: false, edit: false, delete: false }) };
  }
  return { editData: user.canEditData, deleteData: user.canDeleteData, manageUsers: user.canManageUsers, pages };
}

export function hasPagePermission(perms: Permissions, page: string, action: PageAction): boolean {
  const p = perms.pages[page];
  return !!p && !!p[action];
}
