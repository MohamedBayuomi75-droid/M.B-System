/* eslint-disable no-console */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { CreateTaxCodeDto, CreateTaxVersionDto } from '../finance-rules/taxes.dto';
import { TaxesService } from '../finance-rules/taxes.service';
import { UsersService } from '../users/users.service';

/**
 * إدخال جدول النسب **كمسودات بس** (B-21 — البند 4). مابيبعتش للاعتماد ولا بيعتمد ولا بيفعّل أي نسبة.
 *   npm run taxes:drafts -- <file.json>                          ← فحص بس (افتراضي): بيطبع اللي هيتعمل وأسباب التخطّي
 *   npm run taxes:drafts -- <file.json> --execute --by <username> ← إنشاء المسودات (المستخدم لازم يكون مدير)
 * السطر اللي «verified=false» أو ناقصه قيمة إلزامية بيتخطّى ومابيتدخلش.
 * الإرسال للاعتماد والاعتماد نفسه من الشاشة بس، بعد المرجع القانوني الرسمي ومن شخص غير اللي أعدّ.
 */
interface Row { code: string; name: string; category: string; verified: boolean; version: Record<string, unknown> }
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--') && a !== arg('by'));
  if (!file) throw new Error('الاستخدام: taxes:drafts <file.json> [--execute --by <username>]');
  const rows: Row[] = JSON.parse(readFileSync(file, 'utf8')).rows;
  const execute = process.argv.includes('--execute');
  const plan: { code: string; action: string; reason?: string; version?: CreateTaxVersionDto }[] = [];
  for (const r of rows) {
    if (!r.verified) { plan.push({ code: r.code, action: 'skip', reason: 'verified=false — محتاج مراجعة المستشار من النص الرسمي' }); continue; }
    const codeDto = plainToInstance(CreateTaxCodeDto, { code: r.code, name: r.name, category: r.category });
    const ver = plainToInstance(CreateTaxVersionDto, r.version);
    const errs = [...await validate(codeDto), ...await validate(ver, { whitelist: true, forbidNonWhitelisted: true })];
    if (errs.length) { plan.push({ code: r.code, action: 'skip', reason: errs.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join('، ')}`).join(' | ') }); continue; }
    plan.push({ code: r.code, action: 'draft', version: ver });
  }
  for (const p of plan) console.log(p.action === 'draft' ? `✓ ${p.code}: مسودة` : `– ${p.code}: تخطّي (${p.reason})`);
  if (!execute) { console.log('\nفحص بس — مفيش حاجة اتكتبت. للتنفيذ: --execute --by <username>'); return; }
  const by = arg('by'); if (!by) throw new Error('--by مطلوب');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const [u] = await app.get(DataSource).query(`SELECT id FROM users WHERE lower(username) = lower($1) AND active`, [by]);
    const user = u && await app.get(UsersService).loadAuthUser(u.id);
    if (!user?.permissions.manageUsers) throw new Error('المستخدم لازم يكون مدير نشط');
    const svc = app.get(TaxesService);
    for (const p of plan.filter((x) => x.action === 'draft')) {
      const r = rows.find((x) => x.code === p.code)!;
      const existing = (await svc.list(user)).find((c: { code: string }) => c.code === r.code);
      if (!existing) await svc.createCode(user, plainToInstance(CreateTaxCodeDto, { code: r.code, name: r.name, category: r.category }), undefined as never);
      const v = await svc.createVersion(user, r.code, p.version!, undefined as never);
      console.log(`  ${r.code} v${v.version}: ${v.status}`);
    }
  } finally { await app.close(); }
}
main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
