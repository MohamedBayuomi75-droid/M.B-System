import { InitLayer11763200000000 } from './1763200000000-InitLayer1';
import { RolesFk1763300000000 } from './1763300000000-RolesFk';
import { ChangesRealtime1763400000000 } from './1763400000000-ChangesRealtime';

/**
 * كل الـ migrations بالترتيب. ممنوع تعديل migration اتطبقت — أي تغيير = ملف جديد بـ timestamp أحدث
 * ويتضاف هنا (الاستيراد الصريح بدل glob عشان يشتغل نفس الشيء في ts-jest و dist).
 */
export const MIGRATIONS: Function[] = [InitLayer11763200000000, RolesFk1763300000000, ChangesRealtime1763400000000];
