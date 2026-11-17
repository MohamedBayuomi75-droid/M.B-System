import { InitLayer11763200000000 } from './1763200000000-InitLayer1';
import { RolesFk1763300000000 } from './1763300000000-RolesFk';
import { ChangesRealtime1763400000000 } from './1763400000000-ChangesRealtime';
import { AuditProtection1763500000000 } from './1763500000000-AuditProtection';
import { AttachmentsInDb1763600000000 } from './1763600000000-AttachmentsInDb';
import { TwoFactor1763700000000 } from './1763700000000-TwoFactor';
import { Foundation1763800000000 } from './1763800000000-Foundation';

/**
 * كل الـ migrations بالترتيب. ممنوع تعديل migration اتطبقت — أي تغيير = ملف جديد بـ timestamp أحدث
 * ويتضاف هنا (الاستيراد الصريح بدل glob عشان يشتغل نفس الشيء في ts-jest و dist).
 */
import { ApprovalPolicy1763900000000 } from './1763900000000-ApprovalPolicy';

import { Parties1764000000000 } from './1764000000000-Parties';

import { PartiesCutover1764100000000 } from './1764100000000-PartiesCutover';

import { TaxEngine1764200000000 } from './1764200000000-TaxEngine';

import { ContractualTerms1764300000000 } from './1764300000000-ContractualTerms';

import { StockGuard1764400000000 } from './1764400000000-StockGuard';

import { StockAdjustments1764500000000 } from './1764500000000-StockAdjustments';

export const MIGRATIONS: Function[] = [InitLayer11763200000000, RolesFk1763300000000, ChangesRealtime1763400000000, AuditProtection1763500000000, AttachmentsInDb1763600000000, TwoFactor1763700000000, Foundation1763800000000, ApprovalPolicy1763900000000, Parties1764000000000, PartiesCutover1764100000000, TaxEngine1764200000000, ContractualTerms1764300000000, StockGuard1764400000000, StockAdjustments1764500000000];
