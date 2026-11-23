/* eslint-disable no-console */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import ds from '../database/data-source';
import { LINK_SOURCES, unmatchedReport } from '../projects/project-rules';

/**
 * 7.4 (DEC-0117 د-5، P7.4-J) — الأسماء المكتوبة في سجلات ومالهاش مشروع مسجّل (projUnmatchedReport). **قراءة بس.**
 *   npm run project-names                    → أعداد بس (ينفع تتحط في المستودع)
 *   npm run project-names -- --out <ملف>     → + الأسماء وعدد سجلات كل اسم في ملف محلي. **برا المستودع** (فيها أسماء مشاريع)
 */
function arg(name: string): string | undefined { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; }

async function main() {
  await ds.initialize();
  try {
    const q = (c: string) => ds.query(`SELECT id, data FROM legacy_records WHERE collection = $1 AND deleted_at IS NULL ORDER BY created_at, id`, [c]);
    const colls = [...new Set(LINK_SOURCES.map(([c]) => c))];
    const [projects, ...lists] = await Promise.all([q('projects'), ...colls.map(q)]);
    const flat = (xs: { id: string; data: Record<string, unknown> }[]) => xs.map((x) => ({ ...x.data, id: x.id }));
    const src = Object.fromEntries(colls.map((c, i) => [c, flat(lists[i])]));
    const rep = unmatchedReport(flat(projects), src);
    const withName = colls.reduce((n, c) => n + (src[c] as Record<string, unknown>[]).filter((r) => String(r.project ?? r.fromProject ?? '').trim()).length, 0);
    console.log(JSON.stringify({ at: new Date().toISOString(), projects: projects.length, recordsWithProjectName: withName,
      unmatched: { distinctNames: Object.keys(rep.names).length, records: Object.values(rep.names).reduce((a, b) => a + b, 0), byCollection: rep.byCollection } }, null, 2));
    const out = arg('out');
    if (out) { writeFileSync(out, JSON.stringify(rep.names, null, 2)); console.log('✓ الأسماء التفصيلية اتكتبت في ملف محلي — ماتتحطش في المستودع'); }
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
