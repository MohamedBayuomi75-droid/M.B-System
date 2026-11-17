// حساب عشري دقيق (BigInt بمقياس ثابت) للحساب المرجعي — المرحلة 3.
// الهدف: نعيد حساب معادلات النظام القديم من غير أخطاء الكسور العشرية بتاعة JavaScript (0.1+0.2)،
// ونطبّق نفس نقاط التقريب المكتوبة في الكود بالظبط — عشان أي اختلاف يبان وسببه يبقى واضح.
'use strict';
const SCALE = 12n;
const F = 10n ** SCALE;

class Dec {
  constructor(units) { this.u = units; } // القيمة = u / 10^12
  static zero() { return new Dec(0n); }
  /** من رقم JS أو نص رقمي عادي (بنستخدم أقصر تمثيل للرقم — نفس اللي الإنسان كتبه) */
  static of(x) {
    if (x instanceof Dec) return x;
    if (typeof x === 'bigint') return new Dec(x * F);
    // نص عشري صريح: يتقري زي ما هو (من غير المرور بـ JS Number اللي بيفقد الدقة بعد ~15 رقم)
    if (typeof x === 'string' && /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/.test(x)) return Dec.parse(x.trim());
    let n = typeof x === 'number' ? x : Number(x);
    if (!Number.isFinite(n)) return Dec.zero();
    return Dec.parse(String(n));
  }
  static parse(s) {
    s = String(s).trim();
    let m = s.match(/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
    if (!m) throw new Error('bad decimal ' + s);
    const neg = m[1] === '-';
    let int = m[2] || '0', frac = m[3] || '';
    let exp = Number(m[4] || 0);
    let digits = int + frac, point = int.length + exp;
    if (point <= 0) { digits = '0'.repeat(1 - point) + digits; point = 1; }
    if (point > digits.length) digits = digits + '0'.repeat(point - digits.length);
    int = digits.slice(0, point); frac = digits.slice(point);
    const fracS = (frac + '0'.repeat(Number(SCALE))).slice(0, Number(SCALE)); // أكتر من 12 خانة بيتقطع (مش بيحصل في البيانات)
    const u = BigInt(int || '0') * F + BigInt(fracS || '0');
    return new Dec(neg ? -u : u);
  }
  add(b) { return new Dec(this.u + Dec.of(b).u); }
  sub(b) { return new Dec(this.u - Dec.of(b).u); }
  neg() { return new Dec(-this.u); }
  mul(b) { // الضرب بيدّي 24 خانة → نرجّعها 12 (مقطوع — الدقة كافية جدًا للمبالغ)
    const p = this.u * Dec.of(b).u;
    return new Dec(p / F);
  }
  div(b) { const d = Dec.of(b).u; if (d === 0n) return Dec.zero(); return new Dec((this.u * F) / d); }
  cmp(b) { const x = Dec.of(b).u; return this.u < x ? -1 : this.u > x ? 1 : 0; }
  isZero() { return this.u === 0n; }
  gt0() { return this.u > 0n; }
  max0() { return this.u < 0n ? Dec.zero() : this; }
  /**
   * تقريب لعدد خانات بطريقة محددة:
   *  'halfAwayFromZero' — زي round2 في الواجهة (Math.round مع EPSILON): 2.005→2.01، −2.005→−2.01 (= HALF_UP المعياري)
   *  'halfCeiling'      — زي Math.round(x*10^d)/10^d: النص بيطلع لفوق دايمًا: 2.5→3، −2.5→−2
   */
  round(digits, mode = 'halfAwayFromZero') {
    const q = 10n ** (SCALE - BigInt(digits));
    const neg = this.u < 0n;
    const a = neg ? -this.u : this.u;
    let whole = a / q; const rem = a % q; const twice = rem * 2n;
    if (mode === 'halfAwayFromZero') { if (twice >= q) whole += 1n; }
    else if (mode === 'halfCeiling') { if (neg ? twice > q : twice >= q) whole += 1n; }
    else throw new Error('mode ' + mode);
    return new Dec((neg ? -whole : whole) * q);
  }
  toString() {
    const neg = this.u < 0n; const a = neg ? -this.u : this.u;
    const i = a / F; let f = (a % F).toString().padStart(Number(SCALE), '0').replace(/0+$/, '');
    return (neg && (i || f) ? '-' : '') + i.toString() + (f ? '.' + f : '');
  }
  toNumber() { return Number(this.toString()); }
}
const D = (x) => Dec.of(x);
const sum = (arr, fn) => arr.reduce((s, x) => s.add(fn(x)), Dec.zero());
module.exports = { Dec, D, sum };
