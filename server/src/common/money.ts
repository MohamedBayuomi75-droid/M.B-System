import Decimal from 'decimal.js';

/**
 * Money — الحساب المالي على الخادم (ADR-023، القرارات B-25/B-70/B-28: NUMERIC بأربع خانات و HALF_UP للموجب والسالب).
 *
 * القواعد:
 *  - المصدر دايمًا **نص عشري** (من PostgreSQL NUMERIC أو من الـ API) — JS `number` مرفوض كمدخل إلا من `fromNumberUnsafe`
 *    (للتحويل من البيانات القديمة بس، وبيستخدم أقصر تمثيل للرقم زي ما الإنسان كتبه).
 *  - الحساب الداخلي بدقة 40 رقم معنوي (مفيش فقد قبل التقريب الأخير).
 *  - التقريب للتخزين/الإخراج: 4 خانات، ROUND_HALF_UP (النص بعيد عن الصفر: 2.00005 ← 2.0001، −2.00005 ← −2.0001).
 *  - الإخراج للـ API: نص بأربع خانات ثابتة ("1250.5000") — مطابق لشكل NUMERIC(…,4) في PostgreSQL.
 */
export const MONEY_SCALE = 4;
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -40, toExpPos: 40 });
const DECIMAL_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

export class MoneyError extends Error {
  readonly code = 'INVALID_AMOUNT';
}

export type MoneyInput = Money | string | bigint;

export class Money {
  private constructor(private readonly d: Decimal) {}

  static zero(): Money { return new Money(new D(0)); }

  /** من نص عشري ("1,250.50" مرفوض — الفواصل شغل الواجهة) أو bigint */
  static of(v: MoneyInput): Money {
    if (v instanceof Money) return v;
    if (typeof v === 'bigint') return new Money(new D(v.toString()));
    if (typeof v !== 'string') throw new MoneyError(`amount must be a decimal string, got ${typeof v}`);
    const s = v.trim();
    if (!DECIMAL_RE.test(s)) throw new MoneyError(`invalid decimal: "${v}"`);
    return new Money(new D(s));
  }

  /** للبيانات القديمة بس (أرقام JS مخزّنة في JSON): أقصر تمثيل نصي للرقم — 0.1 ← "0.1" مش 0.1000000000000000055 */
  static fromNumberUnsafe(n: number): Money {
    if (!Number.isFinite(n)) throw new MoneyError('amount is not a finite number');
    return new Money(new D(String(n)));
  }

  /** null/undefined/"" ← null — باقي القيم زي of() */
  static ofNullable(v: MoneyInput | null | undefined): Money | null {
    return v == null || v === '' ? null : Money.of(v);
  }

  static sum(values: Iterable<MoneyInput>): Money {
    let acc = new D(0);
    for (const v of values) acc = acc.plus(Money.of(v).d);
    return new Money(acc);
  }

  plus(o: MoneyInput): Money { return new Money(this.d.plus(Money.of(o).d)); }
  minus(o: MoneyInput): Money { return new Money(this.d.minus(Money.of(o).d)); }
  /** ضرب في كمية/نسبة (نص عشري) — من غير تقريب لحد round() */
  times(o: MoneyInput): Money { return new Money(this.d.times(Money.of(o).d)); }
  /** قسمة — بدقة 40 رقم؛ القسمة على صفر = خطأ صريح */
  div(o: MoneyInput): Money {
    const x = Money.of(o).d;
    if (x.isZero()) throw new MoneyError('division by zero');
    return new Money(this.d.div(x));
  }
  /** نسبة مئوية: this × pct ÷ 100 */
  percent(pct: MoneyInput): Money { return this.times(pct).div('100'); }
  neg(): Money { return new Money(this.d.neg()); }
  abs(): Money { return new Money(this.d.abs()); }
  /** أكبر من صفر أو صفر */
  max0(): Money { return this.d.isNeg() ? Money.zero() : this; }

  /** التقريب المعتمد: 4 خانات HALF_UP (أو عدد خانات تاني للعرض/الكميات) */
  round(scale = MONEY_SCALE): Money { return new Money(this.d.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP)); }

  cmp(o: MoneyInput): -1 | 0 | 1 { return this.d.cmp(Money.of(o).d) as -1 | 0 | 1; }
  eq(o: MoneyInput): boolean { return this.cmp(o) === 0; }
  isZero(): boolean { return this.d.isZero(); }
  isNegative(): boolean { return this.d.isNeg() && !this.d.isZero(); }

  /** نص بأربع خانات ثابتة (بعد التقريب) — شكل التخزين والـ API */
  toFixed(scale = MONEY_SCALE): string { return this.d.toFixed(scale, Decimal.ROUND_HALF_UP); }
  /** نص من غير أصفار زيادة (للمقارنة والعرض المختصر) — من غير تقريب */
  toString(): string { return this.d.toFixed(); }
  toJSON(): string { return this.toFixed(); }
}

/** محوّل عمود TypeORM: NUMERIC (نص من pg) ↔ Money، والكتابة دايمًا بأربع خانات HALF_UP */
export const moneyColumnTransformer = {
  to: (v: Money | string | null | undefined): string | null => (v == null || v === '' ? null : Money.of(v as MoneyInput).toFixed()),
  from: (v: string | null): Money | null => (v == null ? null : Money.of(v)),
};
