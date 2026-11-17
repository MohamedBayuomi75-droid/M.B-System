import { InitLayer11763200000000 } from './1763200000000-InitLayer1';
import { RolesFk1763300000000 } from './1763300000000-RolesFk';
import { ChangesRealtime1763400000000 } from './1763400000000-ChangesRealtime';
import { AuditProtection1763500000000 } from './1763500000000-AuditProtection';
import { AttachmentsInDb1763600000000 } from './1763600000000-AttachmentsInDb';
import { TwoFactor1763700000000 } from './1763700000000-TwoFactor';

/**
 * كل الـ migrations بالترتيب. ممنوع تعديل migration اتطبقت — أي تغيير = ملف جديد بـ timestamp أحدث
 * ويتضاف هنا (الاستيراد الصريح بدل glob عشان يشتغل نفس الشيء في ts-jest و dist).
 */
export const MIGRATIONS: Function[] = [InitLayer11763200000000, RolesFk1763300000000, ChangesRealtime1763400000000, AuditProtection1763500000000, AttachmentsInDb1763600000000, TwoFactor1763700000000];
