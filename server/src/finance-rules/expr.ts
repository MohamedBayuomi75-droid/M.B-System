import Decimal from 'decimal.js';

/**
 * Formula Expression Engine (B-20 §13.4) — لغة تعبيرات محدودة وآمنة:
 * - **مفيش eval / Function / JavaScript / SQL / أوامر نظام**: محلّل (tokenizer + parser) بقواعد ثابتة بيحوّل النص لشجرة،
 *   والتقييم بيمشي على الشجرة بس.
 * - الأرقام decimal (مش float). القسمة على صفر = خطأ صريح (DIV_ZERO) — والتعبير يقدر يتجنّبها بـ IF(x = 0, NULL, …).
 * - المسموح: أرقام، ونصوص بين '…' (للأكواد والرسائل)، والمتغيرات المعرّفة، و + - * / والأقواس، و = <> < <= > >=، و AND OR NOT،
 *   و NULL، والدوال: ROUND(x, n) (HALF_UP)، MIN، MAX، ABS، IF(شرط، أ، ب)، COALESCE(أ، ب…)، SUM(قائمة، تعبير)، COUNT(قائمة)،
 *   REQUIRE(شرط، 'كود') (رفض الحساب لو الشرط مش متحقق — مثلًا الخصم أكبر من الأساس).
 * - SUM(lines, Quantity * UnitPrice): جوه التعبير، أسماء حقول السطر بتتقري الأول، وبعدين متغيرات المستند.
 * - حدود: طول النص، وعمق الشجرة، وعدد العُقد، وحجم القوائم.
 */
export class FormulaError extends Error { constructor(public readonly code: string, message: string) { super(message); } }

type Tok = { t: 'num' | 'str' | 'id' | 'op' | 'eof'; v: string; p: number };
export type Node =
  | { k: 'num'; v: string } | { k: 'str'; v: string } | { k: 'null' } | { k: 'var'; name: string }
  | { k: 'un'; op: '-' | 'NOT'; a: Node } | { k: 'bin'; op: string; a: Node; b: Node } | { k: 'call'; fn: string; args: Node[] };

export const LIMITS = { maxLength: 2000, maxDepth: 40, maxNodes: 400, maxList: 10000 };
const FUNCS: Record<string, [number, number]> = { ROUND: [2, 2], MIN: [2, 20], MAX: [2, 20], ABS: [1, 1], IF: [3, 3], COALESCE: [2, 10], SUM: [2, 2], COUNT: [1, 1], REQUIRE: [2, 2] };
const KEYWORDS = new Set(['AND', 'OR', 'NOT', 'NULL']);

function tokenize(src: string): Tok[] {
  if (src.length > LIMITS.maxLength) throw new FormulaError('TOO_LONG', `الصيغة أطول من ${LIMITS.maxLength} حرف`);
  const out: Tok[] = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^[0-9]*\.?[0-9]+|^[0-9]+/.exec(src.slice(i))!; out.push({ t: 'num', v: m[0], p: i }); i += m[0].length; continue;
    }
    if (/[A-Za-z_]/.test(c)) { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!; out.push({ t: 'id', v: m[0], p: i }); i += m[0].length; continue; }
    if (c === "'") { const j = src.indexOf("'", i + 1); if (j < 0) throw new FormulaError('SYNTAX', 'نص مش مقفول'); out.push({ t: 'str', v: src.slice(i + 1, j), p: i }); i = j + 1; continue; }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '<>'].includes(two)) { out.push({ t: 'op', v: two, p: i }); i += 2; continue; }
    if ('+-*/(),=<>'.includes(c)) { out.push({ t: 'op', v: c, p: i }); i++; continue; }
    throw new FormulaError('SYNTAX', `رمز غير مسموح «${c}» في الموضع ${i}`);
  }
  out.push({ t: 'eof', v: '', p: src.length });
  return out;
}

/** parse: نص ← شجرة (precedence climbing). أي حاجة برا القواعد = خطأ */
export function parse(src: string): Node {
  const toks = tokenize(src); let pos = 0; let nodes = 0;
  const peek = () => toks[pos]; const next = () => toks[pos++];
  const node = <T extends Node>(n: T, depth: number): T => { if (++nodes > LIMITS.maxNodes) throw new FormulaError('TOO_COMPLEX', 'الصيغة معقدة زيادة'); if (depth > LIMITS.maxDepth) throw new FormulaError('TOO_DEEP', 'الصيغة متداخلة زيادة'); return n; };
  const expect = (v: string) => { const t = next(); if (t.v.toUpperCase() !== v) throw new FormulaError('SYNTAX', `متوقع «${v}» في الموضع ${t.p}`); };
  const PREC: Record<string, number> = { OR: 1, AND: 2, '=': 3, '<>': 3, '<': 3, '<=': 3, '>': 3, '>=': 3, '+': 4, '-': 4, '*': 5, '/': 5 };
  const binOp = (t: Tok) => (t.t === 'op' && PREC[t.v] ? t.v : t.t === 'id' && ['AND', 'OR'].includes(t.v.toUpperCase()) ? t.v.toUpperCase() : null);
  function expr(minPrec: number, d: number): Node {
    let left = unary(d);
    for (;;) {
      const op = binOp(peek()); if (!op || PREC[op] < minPrec) break;
      next(); const right = expr(PREC[op] + 1, d + 1);
      left = node({ k: 'bin', op, a: left, b: right }, d);
    }
    return left;
  }
  function unary(d: number): Node {
    const t = peek();
    if (t.t === 'op' && t.v === '-') { next(); return node({ k: 'un', op: '-', a: unary(d + 1) }, d); }
    if (t.t === 'id' && t.v.toUpperCase() === 'NOT') { next(); return node({ k: 'un', op: 'NOT', a: unary(d + 1) }, d); }
    return primary(d);
  }
  function primary(d: number): Node {
    const t = next();
    if (t.t === 'num') return node({ k: 'num', v: t.v }, d);
    if (t.t === 'str') return node({ k: 'str', v: t.v }, d);
    if (t.t === 'op' && t.v === '(') { const e = expr(1, d + 1); expect(')'); return e; }
    if (t.t === 'id') {
      const up = t.v.toUpperCase();
      if (up === 'NULL') return node({ k: 'null' }, d);
      if (peek().v === '(') {
        // أسماء الدوال بالحروف الكبيرة بالظبط (require ≠ REQUIRE) — أي اسم تاني = دالة غير معروفة
        if (!FUNCS[t.v]) throw new FormulaError('UNKNOWN_FUNCTION', `دالة غير مسموحة «${t.v}»`);
        next(); const args: Node[] = [];
        if (peek().v !== ')') { do { args.push(expr(1, d + 1)); } while (peek().v === ',' && next()); }
        expect(')');
        const [mn, mx] = FUNCS[up];
        if (args.length < mn || args.length > mx) throw new FormulaError('ARITY', `${up}: عدد المعاملات غير صحيح`);
        if (up === 'SUM' || up === 'COUNT') { if (args[0].k !== 'var') throw new FormulaError('SYNTAX', `${up}: أول معامل لازم يكون اسم قائمة`); }
        return node({ k: 'call', fn: up, args }, d);
      }
      if (KEYWORDS.has(up)) throw new FormulaError('SYNTAX', `«${t.v}» في مكان غلط`);
      return node({ k: 'var', name: t.v }, d);
    }
    throw new FormulaError('SYNTAX', `تعبير غير متوقع في الموضع ${t.p}`);
  }
  const tree = expr(1, 0);
  if (peek().t !== 'eof') throw new FormulaError('SYNTAX', `زيادة بعد نهاية الصيغة في الموضع ${peek().p}`);
  return tree;
}

/** أسماء المتغيرات اللي الصيغة بتستخدمها (للتحقق من التعريف) — المتغيرات جوه SUM بتترجع منفصلة كحقول قايمة */
export function references(n: Node, out = { vars: new Set<string>(), lists: new Map<string, Set<string>>() }, list?: string) {
  switch (n.k) {
    case 'var': if (list) out.lists.get(list)!.add(n.name); else out.vars.add(n.name); break;
    case 'un': references(n.a, out, list); break;
    case 'bin': references(n.a, out, list); references(n.b, out, list); break;
    case 'call':
      if (n.fn === 'SUM' || n.fn === 'COUNT') {
        const ln = (n.args[0] as { name: string }).name; out.vars.add(ln);
        if (!out.lists.has(ln)) out.lists.set(ln, new Set());
        if (n.args[1]) references(n.args[1], out, ln);
      } else n.args.forEach((a) => references(a, out, list));
  }
  return out;
}

export type Value = Decimal | string | boolean | null;
export type Scope = Record<string, unknown>;
const D = (v: unknown, name: string): Decimal => {
  if (v instanceof Decimal) return v;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return new Decimal(v.trim());
  if (typeof v === 'number' && Number.isFinite(v)) return new Decimal(String(v));
  throw new FormulaError('BAD_INPUT', `القيمة «${name}» لازم تكون رقم عشري`);
};
const num = (v: Value, what: string): Decimal => { if (v === null) throw new FormulaError('NULL_VALUE', `${what}: قيمة فاضية (NULL)`); if (!(v instanceof Decimal)) throw new FormulaError('TYPE', `${what}: متوقع رقم`); return v; };
const truthy = (v: Value): boolean => { if (typeof v === 'boolean') return v; if (v === null) return false; throw new FormulaError('TYPE', 'متوقع شرط (صح/غلط)'); };

/** evaluate: شجرة + قيم ← نتيجة. scope: متغيرات المستند (أرقام كنصوص عشرية، وقوائم كمصفوفات كائنات) */
export function evaluate(n: Node, scope: Scope, item?: Scope): Value {
  switch (n.k) {
    case 'num': return new Decimal(n.v);
    case 'str': return n.v;
    case 'null': return null;
    case 'var': {
      const has = (o?: Scope) => !!o && Object.prototype.hasOwnProperty.call(o, n.name);
      const raw = has(item) ? item![n.name] : has(scope) ? scope[n.name] : undefined;
      if (raw === undefined) throw new FormulaError('UNKNOWN_VARIABLE', `المتغير «${n.name}» مش موجود في المدخلات`);
      if (raw === null || raw instanceof Decimal || typeof raw === 'boolean') return raw as Value;
      if (Array.isArray(raw)) throw new FormulaError('TYPE', `«${n.name}» قائمة — استخدم SUM/COUNT`);
      return D(raw, n.name);
    }
    case 'un': { const a = evaluate(n.a, scope, item); return n.op === '-' ? num(a, '-').neg() : !truthy(a); }
    case 'bin': {
      if (n.op === 'AND') return truthy(evaluate(n.a, scope, item)) && truthy(evaluate(n.b, scope, item));
      if (n.op === 'OR') return truthy(evaluate(n.a, scope, item)) || truthy(evaluate(n.b, scope, item));
      const a = evaluate(n.a, scope, item), b = evaluate(n.b, scope, item);
      if (['=', '<>'].includes(n.op)) {
        const eq = a instanceof Decimal && b instanceof Decimal ? a.eq(b) : a === b;
        return n.op === '=' ? eq : !eq;
      }
      const x = num(a, n.op), y = num(b, n.op);
      switch (n.op) {
        case '+': return x.plus(y);
        case '-': return x.minus(y);
        case '*': return x.times(y);
        case '/': if (y.isZero()) throw new FormulaError('DIV_ZERO', 'قسمة على صفر'); return x.div(y);
        case '<': return x.lt(y); case '<=': return x.lte(y); case '>': return x.gt(y); case '>=': return x.gte(y);
      }
      throw new FormulaError('SYNTAX', `عملية غير معروفة ${n.op}`);
    }
    case 'call': {
      const a = n.args;
      switch (n.fn) {
        case 'IF': return truthy(evaluate(a[0], scope, item)) ? evaluate(a[1], scope, item) : evaluate(a[2], scope, item);
        case 'COALESCE': { for (const x of a) { const v = evaluate(x, scope, item); if (v !== null) return v; } return null; }
        case 'ROUND': {
          const places = num(evaluate(a[1], scope, item), 'ROUND');
          if (!places.isInteger() || places.lt(0) || places.gt(10)) throw new FormulaError('BAD_INPUT', 'ROUND: عدد الخانات من 0 لـ 10');
          return num(evaluate(a[0], scope, item), 'ROUND').toDecimalPlaces(places.toNumber(), Decimal.ROUND_HALF_UP);
        }
        case 'ABS': return num(evaluate(a[0], scope, item), 'ABS').abs();
        case 'MIN': case 'MAX': {
          const vs = a.map((x) => num(evaluate(x, scope, item), n.fn));
          return vs.reduce((m, v) => (n.fn === 'MIN' ? (v.lt(m) ? v : m) : (v.gt(m) ? v : m)));
        }
        case 'REQUIRE': {
          if (!truthy(evaluate(a[0], scope, item))) { const code = evaluate(a[1], scope, item); throw new FormulaError('RULE_VIOLATION', String(code)); }
          return true;
        }
        case 'SUM': case 'COUNT': {
          const name = (a[0] as { name: string }).name;
          const list = scope[name];
          if (!Array.isArray(list)) throw new FormulaError('TYPE', `«${name}» لازم تكون قائمة`);
          if (list.length > LIMITS.maxList) throw new FormulaError('TOO_LARGE', `«${name}» أكبر من ${LIMITS.maxList} سطر`);
          if (n.fn === 'COUNT') return new Decimal(list.length);
          let acc = new Decimal(0);
          for (const row of list) acc = acc.plus(num(evaluate(a[1], scope, row as Scope), 'SUM'));
          return acc;
        }
      }
      throw new FormulaError('UNKNOWN_FUNCTION', n.fn);
    }
  }
}

/**
 * صيغة متعددة الخطوات: كل خطوة اسم + تعبير، والخطوات اللاحقة بتشوف نتائج اللي قبلها.
 * التقريب افتراضيًا: مبلغ 4 خانات HALF_UP (B-25)، كمية/سعر وحدة 5 (B-26)، نسبة 6، أو من غير تقريب (raw)، أو شرط (check).
 */
export type StepKind = 'money' | 'qty' | 'rate' | 'raw' | 'check';
export interface Step { name: string; expr: string; kind?: StepKind }
const PLACES: Partial<Record<StepKind, number>> = { money: 4, qty: 5, rate: 6 };

export function runSteps(steps: Step[], inputs: Scope): Record<string, string | boolean | null> {
  const scope: Scope = { ...inputs }; const out: Record<string, string | boolean | null> = {};
  for (const s of steps) {
    if (Object.prototype.hasOwnProperty.call(inputs, s.name)) throw new FormulaError('NAME_CLASH', `الخطوة «${s.name}» بنفس اسم مدخل`);
    let v = evaluate(parse(s.expr), scope);
    const kind = s.kind ?? 'money';
    if (kind === 'check') { out[s.name] = v === true; scope[s.name] = v; continue; }
    if (v instanceof Decimal && PLACES[kind] !== undefined) v = v.toDecimalPlaces(PLACES[kind]!, Decimal.ROUND_HALF_UP);
    scope[s.name] = v;
    out[s.name] = v instanceof Decimal ? v.toFixed(PLACES[kind] ?? Math.max(0, v.decimalPlaces())) : (v as string | boolean | null);
  }
  return out;
}
