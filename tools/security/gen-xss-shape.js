// يولّد tools/security/xss-shape.json: **أسماء الحقول وأنواعها فقط** لكل مجموعة (من غير أي قيمة من البيانات)،
// عشان فحص XSS المُركّب يبني سجلات بنفس شكل البيانات الحقيقية.
//   DATA_JSON=/path/data.json node tools/security/gen-xss-shape.js
// القيم الوحيدة اللي بتتنسخ: قيم «تعداد» قصيرة بحروف لاتينية لحقول زي status/type (رموز برمجية مش بيانات أشخاص).
const fs = require('fs');
const path = require('path');
const ENUM_KEYS = /^(status|type|kind|role|method|direction|mode|personKind|personType|gender|currency|period|frequency|priority)$/;
const d = JSON.parse(fs.readFileSync(process.env.DATA_JSON, 'utf8'));
const shape = {};
const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
const add = (coll, arr) => {
  if (!Array.isArray(arr) || !arr.length || typeof arr[0] !== 'object') return;
  const fields = {};
  for (const r of arr) for (const [k, v] of Object.entries(r || {})) {
    const f = (fields[k] = fields[k] || { types: {}, enums: {} });
    const t = typeOf(v);
    f.types[t] = (f.types[t] || 0) + 1;
    if (t === 'string' && ENUM_KEYS.test(k) && /^[A-Za-z_-]{1,20}$/.test(v)) f.enums[v] = (f.enums[v] || 0) + 1;
  }
  shape[coll] = Object.fromEntries(Object.entries(fields).map(([k, f]) => {
    const type = Object.entries(f.types).sort((a, b) => b[1] - a[1])[0][0];
    const en = Object.entries(f.enums).sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 4);
    return [k, en.length ? { type, enums: en } : { type }];
  }));
};
const SKIP = new Set(['users', 'auditLog']);
for (const [k, v] of Object.entries(d)) {
  if (SKIP.has(k)) continue;
  if (Array.isArray(v)) add(k, v);
  else if (['ledger', 'clients', 'warehouses'].includes(k) && v) for (const [k2, v2] of Object.entries(v)) add(k + '.' + k2, v2);
}
const out = path.join(__dirname, 'xss-shape.json');
fs.writeFileSync(out, JSON.stringify(shape, null, 1) + '\n');
console.log('wrote', out, Object.keys(shape).length, 'collections');
