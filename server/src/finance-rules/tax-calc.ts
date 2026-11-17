import { Money } from '../common/money';

/**
 * حاسبة الضرائب والاستقطاعات (B-21) — دالة صافية من غير قاعدة بيانات، بتشتغل على الإصدارات **المعتمدة** بس.
 * مفيش أي نسبة في الكود: كل الأرقام جاية من الإصدار. الدقة 4 خانات HALF_UP (B-25).
 */
export type TaxBase = 'NET_OF_DISCOUNT' | 'GROSS' | 'NET_PLUS_VAT' | 'TAXABLE_WAGE' | 'CONTRACT_VALUE';
export interface Bracket { upTo: string | null; rate: string }
export interface Conditions { contractDateFrom?: string; contractDateTo?: string; activities?: string[]; counterpartyTypes?: string[] }
export interface Exemption { reason: string; activities?: string[]; counterpartyTypes?: string[]; flags?: string[] }
export interface TaxVersion {
  id: string; code: string; category: string; version: number;
  method: 'PERCENT' | 'FIXED' | 'BRACKETS'; rate: string | null; fixedAmount: string | null; brackets: Bracket[] | null;
  base: TaxBase; baseRatio: string; minBase: string | null; appliesTo: string[];
  conditions: Conditions; exemptions: Exemption[]; allowStacking: boolean;
  effectiveFrom: string; effectiveTo: string | null;
}
export interface ComputeInput {
  documentType: string; date: string; codes: string[];
  bases: Partial<Record<TaxBase, string>>;
  context?: { contractDate?: string; activity?: string; counterpartyType?: string; flags?: string[] };
}
export interface TaxLine { code: string; versionId: string; version: number; category: string; base: TaxBase; baseAmount: string; taxableAmount: string; rate: string | null; amount: string; exemptReason: string | null }
export class TaxCalcError extends Error { constructor(public readonly code: string, message: string, public readonly details?: unknown) { super(message); } }

const inRange = (d: string, from: string, to: string | null) => from <= d && (to == null || d <= to);

function matches(v: TaxVersion, i: ComputeInput): boolean {
  const c = v.conditions ?? {}; const ctx = i.context ?? {};
  if (c.contractDateFrom || c.contractDateTo) {
    if (!ctx.contractDate) return false;
    if (c.contractDateFrom && ctx.contractDate < c.contractDateFrom) return false;
    if (c.contractDateTo && ctx.contractDate > c.contractDateTo) return false;
  }
  if (c.activities?.length && !(ctx.activity && c.activities.includes(ctx.activity))) return false;
  if (c.counterpartyTypes?.length && !(ctx.counterpartyType && c.counterpartyTypes.includes(ctx.counterpartyType))) return false;
  return true;
}

function exemption(v: TaxVersion, i: ComputeInput): string | null {
  const ctx = i.context ?? {};
  for (const e of v.exemptions ?? []) {
    const hit = (e.activities?.length ? !!ctx.activity && e.activities.includes(ctx.activity) : true)
      && (e.counterpartyTypes?.length ? !!ctx.counterpartyType && e.counterpartyTypes.includes(ctx.counterpartyType) : true)
      && (e.flags?.length ? e.flags.every((f) => ctx.flags?.includes(f)) : true)
      && !!(e.activities?.length || e.counterpartyTypes?.length || e.flags?.length);
    if (hit) return e.reason;
  }
  return null;
}

/** ضريبة تصاعدية بالشرائح: كل شريحة بنسبتها على الجزء اللي جواها بس */
export function bracketsTax(taxable: Money, brackets: Bracket[]): Money {
  let prev = Money.zero(); let total = Money.zero();
  for (const b of brackets) {
    const top = b.upTo == null ? null : Money.of(b.upTo);
    if (taxable.cmp(prev) <= 0) break;
    const sliceTop = top == null || taxable.cmp(top) < 0 ? taxable : top;
    total = total.plus(sliceTop.minus(prev).times(b.rate).div('100'));
    if (top == null) break;
    prev = top;
  }
  return total;
}

/** اختيار الإصدار المعتمد الساري للكود في التاريخ والسياق — صفر = NO_APPROVED_RATE، أكتر من واحد = AMBIGUOUS */
export function selectVersion(code: string, approved: TaxVersion[], i: ComputeInput): TaxVersion {
  const found = approved.filter((v) => v.code === code && v.appliesTo.includes(i.documentType) && inRange(i.date, v.effectiveFrom, v.effectiveTo) && matches(v, i));
  if (!found.length) throw new TaxCalcError('NO_APPROVED_RATE', `مفيش نسبة معتمدة سارية للكود ${code} على ${i.documentType} بتاريخ ${i.date}`);
  if (found.length > 1) throw new TaxCalcError('AMBIGUOUS_RATE', `أكتر من إصدار معتمد مطابق للكود ${code} — راجع الشروط`, found.map((v) => v.version));
  return found[0];
}

export function computeTaxes(i: ComputeInput, approved: TaxVersion[]): TaxLine[] {
  if (new Set(i.codes).size !== i.codes.length) throw new TaxCalcError('DOUBLE_APPLICATION', 'نفس الكود متطلب مرتين على نفس المستند');
  const chosen = i.codes.map((c) => selectVersion(c, approved, i));
  // مفيش ضريبة/استقطاع من نفس النوع مرتين على نفس الأساس إلا لو الإصدار بيسمح (بسند قانوني) — B-21 §6
  for (let a = 0; a < chosen.length; a++) for (let b = a + 1; b < chosen.length; b++) {
    const x = chosen[a], y = chosen[b];
    if (x.category === y.category && x.base === y.base && !(x.allowStacking && y.allowStacking))
      throw new TaxCalcError('DOUBLE_APPLICATION', `${x.code} و${y.code} من نفس النوع (${x.category}) على نفس الأساس`);
  }
  return chosen.map((v) => {
    const raw = i.bases[v.base];
    if (raw == null) throw new TaxCalcError('MISSING_BASE', `الأساس ${v.base} مطلوب للكود ${v.code}`);
    const base = Money.of(raw);
    const taxable = base.times(v.baseRatio).div('100').round();
    const line = (amount: Money, reason: string | null): TaxLine => ({
      code: v.code, versionId: v.id, version: v.version, category: v.category, base: v.base, baseAmount: base.round().toFixed(),
      taxableAmount: taxable.toFixed(), rate: v.rate, amount: amount.round().toFixed(), exemptReason: reason });
    const ex = exemption(v, i);
    if (ex) return line(Money.zero(), ex);
    if (v.minBase != null && base.cmp(v.minBase) <= 0) return line(Money.zero(), 'BELOW_MIN_BASE');
    if (v.method === 'FIXED') return line(Money.of(v.fixedAmount!), null);
    if (v.method === 'BRACKETS') return line(bracketsTax(taxable, v.brackets ?? []), null);
    return line(taxable.times(v.rate!).div('100'), null);
  });
}
