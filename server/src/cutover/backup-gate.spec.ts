import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkBackupGate } from './backup-gate';

/**
 * شرط النسخة قبل نقل موديول أو الرجوع منه. السجل بيتكتب بدالة log_event الحقيقية من docker/backup/lib.sh
 * (نفس اللي backup-full.sh وrestore-test.sh بيستخدموها)، عشان أي اختلاف في أسماء الأنواع بين السكربتات والأمر يبان هنا
 * — زي اللي اتكشف في بروفة المرحلة 6 (السكربت بيكتب "base" والأمر كان بيدوّر على "full").
 */
describe('cutover backup gate (contract with docker/backup scripts)', () => {
  const lib = resolve(__dirname, '../../../docker/backup/lib.sh');
  let dir: string;
  const write = (lines: [kind: string, status: string][], at?: string[]) => {
    // كل سطر بوقت مختلف (الوقت بدقة الثانية): بنثبّت date بدالة بديلة بترجع الأوقات بالترتيب
    const times = at ?? lines.map((_, i) => `2026-11-20T10:00:${String(i).padStart(2, '0')}Z`);
    const script = `. "${lib}"; i=0; ${lines.map(([k, s], i) => `now_utc() { echo "${times[i]}"; }; log_event ${k} ${s} "" "test"`).join('; ')}`;
    execFileSync('sh', ['-c', script], { env: { ...process.env, BACKUP_ROOT: dir, BACKUP_KEY_FILE: '/nonexistent' } });
    return readFileSync(join(dir, 'backup-log.jsonl'), 'utf8');
  };
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'gate-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('accepts the full backup exactly as backup-full.sh logs it ("base"), with a later restore test', () => {
    const log = write([['base', 'ok'], ['dump', 'ok'], ['restore-test', 'ok']]);
    expect(checkBackupGate(log, '2026-11-20T10:00:00Z')).toEqual({ full: '2026-11-20T10:00:00Z', restore: '2026-11-20T10:00:02Z' });
  });
  it('asks for confirmation with the right time when the confirm time is wrong or missing', () => {
    const log = write([['base', 'ok'], ['restore-test', 'ok']]);
    expect(() => checkBackupGate(log, undefined)).toThrow('--confirm-backup 2026-11-20T10:00:00Z');
    expect(() => checkBackupGate(log, '2026-11-20T09:00:00Z')).toThrow('--confirm-backup 2026-11-20T10:00:00Z');
  });
  it('refuses without a successful full backup', () => {
    expect(() => checkBackupGate(write([['base', 'failed'], ['dump', 'ok'], ['restore-test', 'ok']]), 'x')).toThrow('مفيش نسخة كاملة ناجحة');
  });
  it('refuses when the restore test is older than the last full backup', () => {
    const log = write([['base', 'ok'], ['restore-test', 'ok'], ['base', 'ok']]);
    expect(() => checkBackupGate(log, '2026-11-20T10:00:02Z')).toThrow('مفيش اختبار استعادة ناجح بعد آخر نسخة كاملة (2026-11-20T10:00:02Z)');
  });
  it('a failed restore test does not count', () => {
    expect(() => checkBackupGate(write([['base', 'ok'], ['restore-test', 'failed']]), '2026-11-20T10:00:00Z')).toThrow('مفيش اختبار استعادة');
  });
});
