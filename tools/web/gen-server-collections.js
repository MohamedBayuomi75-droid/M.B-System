// يولّد server/src/data/collections-map.generated.ts من docs/web/collections-map.json
// (السيرفر بيتبني من مجلد server/ بس، فمش بيقدر يقرا docs/ وقت التشغيل).
// التشغيل: node tools/web/gen-server-collections.js   (أو npm run gen:collections)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const src = require(path.join(ROOT, 'docs/web/collections-map.json'));
const entries = Object.keys(src.entries).sort().map((k) => [k, src.entries[k].kind]);
const out = `// ⚠️ ملف مولَّد — ماتعدّلوش بإيدك. المصدر: docs/web/collections-map.json
// إعادة التوليد: npm run gen:collections (من جذر المشروع)
export type CatalogKind = 'collection' | 'lookup' | 'doc' | 'meta-flag' | 'system-table' | 'legacy-ref';

export const LEGACY_SCHEMA_VERSION = ${src.schemaVersion};

export const COLLECTIONS_MAP: Readonly<Record<string, CatalogKind>> = {
${entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`;
fs.writeFileSync(path.join(ROOT, 'server/src/data/collections-map.generated.ts'), out);
console.log(`wrote ${entries.length} entries`);
