import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/** مستقبِل تقارير CSP (Report-Only): بيعدّ المخالفات حسب (التوجيه + المصدر) ويسجّلها بحد أقصى — مفيش تخزين في القاعدة. */
const log = new Logger('CSP');
const counts = new Map<string, number>();
let loggedThisMinute = 0;
let minute = 0;
const MAX_KEYS = 500;

export function cspReportHandler(req: Request, res: Response) {
  const body = req.body as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  const reports = Array.isArray(body) ? body.map((r) => (r.body ?? r) as Record<string, unknown>) : body ? [((body as Record<string, unknown>)['csp-report'] ?? body) as Record<string, unknown>] : [];
  for (const r of reports.slice(0, 20)) {
    const directive = String(r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive'] ?? '?').slice(0, 60);
    const blocked = String(r['blocked-uri'] ?? r.blockedURL ?? '?').slice(0, 120);
    const key = `${directive} ${blocked}`;
    if (counts.has(key) || counts.size < MAX_KEYS) counts.set(key, (counts.get(key) ?? 0) + 1);
    const m = Math.floor(Date.now() / 60000);
    if (m !== minute) { minute = m; loggedThisMinute = 0; }
    if (loggedThisMinute++ < 20) log.warn(`csp violation (report-only): ${key}`);
  }
  res.status(204).end();
}

export function cspReportCounts(): Record<string, number> { return Object.fromEntries(counts); }
export function resetCspReportCounts(): void { counts.clear(); }
