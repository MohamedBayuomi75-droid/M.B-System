let pass = 0, fail = 0; const failures = [];
function ok(cond, name, extra) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; failures.push(name); console.log('  ✗', name, extra !== undefined ? '→ ' + JSON.stringify(extra) : ''); } }
function eq(a, b, name) { const A = JSON.stringify(a), B = JSON.stringify(b); ok(A === B, name, { got: a, want: b }); }
function summary(errors) { if (errors && errors.length) { console.log('JS ERRORS:', errors.slice(0, 8)); fail += 1; failures.push('js errors'); } console.log(`\n${fail ? '✗ FAILED' : '✓ ALL PASSED'}: ${pass} passed, ${fail} failed`); if (failures.length) console.log(failures); process.exit(fail ? 1 : 0); }
const baseUser = { id: 'u1', username: 'admin', name: 'المدير', role: 'admin', active: true, salt: 's', hash: 'h', mustChangePassword: false };
module.exports = { ok, eq, summary, baseUser };
