import { FIELD_RE, ID_RE } from './data.dto';

describe('record id / field name validation (S-1)', () => {
  it('accepts legacy desktop ids, including Arabic letters', () => {
    for (const id of ['emp_lx2k9a', 'CON-0001', 'id_m3k2x9a1b2c', 'inv:2026.1', 'مشروع_الجامعة']) expect(ID_RE.test(id)).toBe(true);
  });
  it('rejects ids that could break out of an HTML attribute or inline handler', () => {
    for (const id of ['a"b', "a'b", 'a<b', 'a>b', 'a`b', 'a&b', 'a\\b', '"><img/src=x/onerror=alert(1)>', 'a b', '', 'x'.repeat(201)]) expect(ID_RE.test(id)).toBe(false);
  });
  it('field names: identifiers ok, prototype keys and HTML specials rejected', () => {
    expect(FIELD_RE.test('netInvoice')).toBe(true);
    expect(FIELD_RE.test('cf_ملاحظات')).toBe(true);
    for (const f of ['__proto__', 'constructor', 'prototype', 'a"b', '<x>', 'a&b']) expect(FIELD_RE.test(f)).toBe(false);
  });
});
