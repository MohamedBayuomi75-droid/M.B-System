import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import { RolesService } from '../authz/roles.service';
import { UserEntity } from '../entities';
import { PasswordService } from './password.service';

/**
 * أول إقلاع بداتابيز فاضية: ينشئ حساب admin وتغيير كلمة مروره إجباري أول دخول (الخطة A2).
 * كلمة المرور من ADMIN_INITIAL_PASSWORD، ولو مش موجودة بتتولّد عشوائي وتتكتب في السجل مرة واحدة.
 * (لما نستورد بيانات الديسكتوب في A7 المستخدمين الحقيقيين هيتنقلوا بنفس كلمات مرورهم.)
 */
@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  private readonly log = new Logger('BootstrapAdmin');
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly roles: RolesService, private readonly passwords: PasswordService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.roles.sync(); // الـ FK محتاج الأدوار موجودة
    const repo = this.ds.getRepository(UserEntity);
    if ((await repo.count()) > 0) return;
    const fromEnv = process.env.ADMIN_INITIAL_PASSWORD;
    const password = fromEnv || randomBytes(12).toString('base64url');
    const pw = await this.passwords.hash(password);
    await repo.createQueryBuilder().insert().values({
      username: 'admin', name: 'مدير النظام', role: 'admin', active: true,
      passwordAlgo: pw.algo, passwordHash: pw.hash, passwordSalt: null, mustChangePassword: true,
      canEditData: true, canDeleteData: true, canManageUsers: true,
    }).orIgnore().execute();
    if (fromEnv) this.log.warn('اتعمل حساب admin بكلمة المرور من ADMIN_INITIAL_PASSWORD — لازم تتغير أول دخول');
    else this.log.warn(`اتعمل حساب admin — كلمة المرور المؤقتة: ${password}  (لازم تتغير أول دخول، ومش هتظهر تاني)`);
  }
}
