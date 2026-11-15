import { ApiProperty } from '@nestjs/swagger';

export class DbHealthDto {
  @ApiProperty({ example: true, description: 'الاتصال بالداتابيز شغال' }) up: boolean;
  @ApiProperty({ example: 3, description: 'زمن استعلام SELECT 1 بالمللي ثانية', nullable: true, type: Number }) latencyMs: number | null;
  @ApiProperty({ example: '16.4', nullable: true, type: String }) version: string | null;
}

export class MigrationsHealthDto {
  @ApiProperty({ example: 1 }) applied: number;
  @ApiProperty({ example: 0, description: 'لازم تبقى 0 — غير كده السيرفر شغال على schema قديم' }) pending: number;
  @ApiProperty({ example: 'InitLayer11763200000000', nullable: true, type: String }) latest: string | null;
}

export class HealthDto {
  @ApiProperty({ enum: ['ok', 'degraded', 'error'], example: 'ok' }) status: 'ok' | 'degraded' | 'error';
  @ApiProperty({ example: '0.1.0', description: 'نسخة السيرفر' }) version: string;
  @ApiProperty({ example: 9, description: 'آخر SCHEMA_VERSION لبيانات الديسكتوب المدعوم', nullable: true, type: Number }) legacySchemaVersion: number | null;
  @ApiProperty({ example: 120 }) uptimeSec: number;
  @ApiProperty({ example: '2026-11-15T22:00:00.000Z' }) time: string;
  @ApiProperty({ type: DbHealthDto }) db: DbHealthDto;
  @ApiProperty({ type: MigrationsHealthDto, nullable: true }) migrations: MigrationsHealthDto | null;
}
