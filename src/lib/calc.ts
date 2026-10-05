/**
 * Rechenkern: Die KI darf Rechenaufgaben formulieren, aber nicht ausrechnen (sie verrechnet sich zu oft).
 * Stattdessen schreibt sie die Rechnung als Term ("3/4 + 2/5") oder Gleichung ("2x + 3 = 11"), und die App berechnet das
 * Ergebnis selbst, exakt mit Brüchen. Was sich nicht berechnen lässt, wird verworfen.
 *
 * Erlaubt: Zahlen (auch mit Komma), + − * / : × · ÷, Potenzen ^, Klammern, sqrt(…), abs(…), Prozent (25%), eine Unbekannte x.
 */

export class CalcError extends Error {}

// ---------- Brüche ----------

export interface Rat {
  n: bigint
  d: bigint
}

const big = (v: number | bigint): bigint => BigInt(v)
const babs = (a: bigint): bigint => (a < 0n ? -a : a)
function bgcd(a: bigint, b: bigint): bigint {
  a = babs(a)
  b = babs(b)
  while (b) [a, b] = [b, a % b]
  return a || 1n
}
export function rat(n: bigint | number, d: bigint | number = 1n): Rat {
  let nn = big(n)
  let dd = big(d)
  if (dd === 0n) throw new CalcError('Division durch null')
  if (dd < 0n) {
    nn = -nn
    dd = -dd
  }
  const g = bgcd(nn, dd)
  return { n: nn / g, d: dd / g }
}
const add = (a: Rat, b: Rat) => rat(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a: Rat, b: Rat) => rat(a.n * b.d - b.n * a.d, a.d * b.d)
const mul = (a: Rat, b: Rat) => rat(a.n * b.n, a.d * b.d)
const div = (a: Rat, b: Rat) => {
  if (b.n === 0n) throw new CalcError('Division durch null')
  return rat(a.n * b.d, a.d * b.n)
}
const isZero = (a: Rat) => a.n === 0n
const ZERO = rat(0)
const ONE = rat(1)
const toNumber = (a: Rat): number => Number(a.n) / Number(a.d)

function isqrt(n: bigint): bigint {
  if (n < 2n) return n
  let x = BigInt(Math.floor(Math.sqrt(Number(n))))
  while (x * x > n) x--
  while ((x + 1n) * (x + 1n) <= n) x++
  return x
}

/** Wurzel, wenn das Ergebnis ein Bruch ist, sonst null. */
function sqrtRat(a: Rat): Rat | null {
  if (a.n < 0n) throw new CalcError('Wurzel aus einer negativen Zahl')
  const n = isqrt(a.n)
  const d = isqrt(a.d)
  return n * n === a.n && d * d === a.d ? rat(n, d) : null
}

// ---------- Polynome bis Grad 2 (für Gleichungen) ----------

/** Koeffizienten [a0, a1, a2] von a0 + a1·x + a2·x². `approx` = ein Anteil ist ein Näherungswert (z. B. sqrt(2)). */
interface Poly {
  c: [Rat, Rat, Rat]
  approx?: number
}

const cst = (r: Rat): Poly => ({ c: [r, ZERO, ZERO] })
const isConst = (p: Poly) => isZero(p.c[1]) && isZero(p.c[2])

function padd(a: Poly, b: Poly): Poly {
  return { c: [add(a.c[0], b.c[0]), add(a.c[1], b.c[1]), add(a.c[2], b.c[2])], approx: a.approx ?? b.approx }
}
function pneg(a: Poly): Poly {
  return { c: [rat(-a.c[0].n, a.c[0].d), rat(-a.c[1].n, a.c[1].d), rat(-a.c[2].n, a.c[2].d)], approx: a.approx }
}
function pmul(a: Poly, b: Poly): Poly {
  const out: [Rat, Rat, Rat] = [ZERO, ZERO, ZERO]
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const p = mul(a.c[i], b.c[j])
      if (isZero(p)) continue
      if (i + j > 2) throw new CalcError('Nur Gleichungen bis zum zweiten Grad')
      out[i + j] = add(out[i + j], p)
    }
  return { c: out, approx: a.approx ?? b.approx }
}
function pdiv(a: Poly, b: Poly): Poly {
  if (!isConst(b)) throw new CalcError('Teilen durch die Unbekannte ist nicht erlaubt')
  const k = b.c[0]
  return { c: [div(a.c[0], k), div(a.c[1], k), div(a.c[2], k)], approx: a.approx }
}
function ppow(a: Poly, e: number): Poly {
  if (!Number.isInteger(e) || Math.abs(e) > 60) throw new CalcError('Hochzahl nicht erlaubt')
  // Negative Hochzahlen nur bei Zahlen: 2^-1 = 1/2
  if (e < 0) return pdiv(cst(ONE), ppow(a, -e))
  let out = cst(ONE)
  for (let i = 0; i < e; i++) out = pmul(out, a)
  return out
}

// ---------- Parser ----------

type Tok = { t: 'num'; v: Rat } | { t: 'op'; v: string } | { t: 'id'; v: string }

function tokenize(src: string): Tok[] {
  const s = src
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/\s+/g, '')
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/[0-9]/.test(ch) || (ch === ',' || ch === '.') && /[0-9]/.test(s[i + 1] ?? '')) {
      let j = i
      while (j < s.length && /[0-9]/.test(s[j])) j++
      let frac = ''
      if ((s[j] === ',' || s[j] === '.') && /[0-9]/.test(s[j + 1] ?? '')) {
        j++
        const st = j
        while (j < s.length && /[0-9]/.test(s[j])) j++
        frac = s.slice(st, j)
      }
      const whole = s.slice(i, j - (frac ? frac.length + 1 : 0)) || '0'
      out.push({ t: 'num', v: rat(BigInt(whole + frac), 10n ** BigInt(frac.length)) })
      i = j
    } else if (/[a-zA-Z]/.test(ch)) {
      let j = i
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++
      out.push({ t: 'id', v: s.slice(i, j).toLowerCase() })
      i = j
    } else if ('+-*/^()%'.includes(ch)) {
      out.push({ t: 'op', v: ch })
      i++
    } else throw new CalcError(`Unbekanntes Zeichen „${ch}“`)
  }
  return out
}

class Parser {
  private p = 0
  constructor(
    private toks: Tok[],
    private variable: string | null,
  ) {}

  private peek = () => this.toks[this.p]
  private isOp = (v: string) => this.peek()?.t === 'op' && (this.peek() as { v: string }).v === v

  parse(): Poly {
    const v = this.sum()
    if (this.p < this.toks.length) throw new CalcError('Ausdruck nicht vollständig lesbar')
    return v
  }

  private sum(): Poly {
    let v = this.term()
    while (this.isOp('+') || this.isOp('-')) {
      const neg = (this.toks[this.p++] as { v: string }).v === '-'
      const r = this.term()
      v = padd(v, neg ? pneg(r) : r)
    }
    return v
  }

  private term(): Poly {
    let v = this.unary()
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const op = (this.toks[this.p++] as { v: string }).v
        const r = this.unary()
        v = op === '*' ? pmul(v, r) : pdiv(v, r)
      } else if (this.startsFactor()) {
        // Malzeichen weggelassen: 2x, 3(x+1), (x+1)(x-1)
        v = pmul(v, this.unary())
      } else return v
    }
  }

  private startsFactor(): boolean {
    const t = this.peek()
    return !!t && (t.t === 'id' || (t.t === 'op' && t.v === '('))
  }

  private unary(): Poly {
    if (this.isOp('-')) {
      this.p++
      return pneg(this.unary())
    }
    if (this.isOp('+')) {
      this.p++
      return this.unary()
    }
    return this.power()
  }

  private power(): Poly {
    const base = this.postfix()
    if (this.isOp('^')) {
      this.p++
      const e = this.unary()
      if (!isConst(e) || e.c[0].d !== 1n) throw new CalcError('Hochzahl muss eine ganze Zahl sein')
      return ppow(base, Number(e.c[0].n))
    }
    return base
  }

  private postfix(): Poly {
    let v = this.atom()
    while (this.isOp('%')) {
      this.p++
      v = pdiv(v, cst(rat(100)))
    }
    return v
  }

  private atom(): Poly {
    const t = this.toks[this.p++]
    if (!t) throw new CalcError('Ausdruck endet zu früh')
    if (t.t === 'num') return cst(t.v)
    if (t.t === 'op' && t.v === '(') {
      const v = this.sum()
      if (!this.isOp(')')) throw new CalcError('Klammer nicht geschlossen')
      this.p++
      return v
    }
    if (t.t === 'id') {
      if (t.v === 'sqrt' || t.v === 'wurzel' || t.v === 'abs') {
        if (!this.isOp('(')) throw new CalcError(`Nach ${t.v} fehlt eine Klammer`)
        this.p++
        const inner = this.sum()
        if (!this.isOp(')')) throw new CalcError('Klammer nicht geschlossen')
        this.p++
        if (!isConst(inner)) throw new CalcError('Wurzel und Betrag nur von Zahlen')
        if (t.v === 'abs') return cst(rat(babs(inner.c[0].n), inner.c[0].d))
        const r = sqrtRat(inner.c[0])
        if (r) return cst(r)
        // Keine Bruchzahl: als Näherungswert merken (auf 12 Stellen als Bruch)
        const approx = Math.sqrt(toNumber(inner.c[0]))
        return { c: [rat(BigInt(Math.round(approx * 1e12)), 10n ** 12n), ZERO, ZERO], approx }
      }
      if (this.variable && t.v === this.variable) return { c: [ZERO, ONE, ZERO] }
      throw new CalcError(`Unbekannt: „${t.v}“`)
    }
    throw new CalcError('Ausdruck nicht lesbar')
  }
}

const parsePoly = (src: string, variable: string | null): Poly => new Parser(tokenize(src), variable).parse()

// ---------- Ergebnis ----------

export interface CalcResult {
  /** Wert als Zahl */
  value: number
  /** Exakter Bruch (null bei Näherungswerten wie Wurzeln aus 2) */
  exact: Rat | null
  isInteger: boolean
}

function result(r: Rat, approx?: number): CalcResult {
  return { value: approx !== undefined ? approx : toNumber(r), exact: approx !== undefined ? null : r, isInteger: approx === undefined && r.d === 1n }
}

/** Rechnet einen Term ohne Unbekannte aus. Wirft CalcError bei allem, was nicht klar berechenbar ist. */
export function calc(expr: string): CalcResult {
  const p = parsePoly(expr, null)
  return result(p.c[0], p.approx)
}

/** Löst eine Gleichung nach x (Grad 1 oder 2). Gibt die Lösungen aufsteigend zurück; leer, wenn es keine reelle gibt. */
export function solve(equation: string, variable = 'x'): CalcResult[] {
  const parts = equation.split('=')
  if (parts.length !== 2) throw new CalcError('Eine Gleichung hat genau ein Gleichheitszeichen')
  const v = variable.toLowerCase()
  const diff = padd(parsePoly(parts[0], v), pneg(parsePoly(parts[1], v)))
  const [c, b, a] = diff.c
  if (isZero(a) && isZero(b)) throw new CalcError(isZero(c) ? 'Die Gleichung stimmt für jedes x' : 'Die Gleichung hat keine Lösung')
  if (isZero(a)) return [result(div(rat(-c.n, c.d), b), diff.approx !== undefined ? -toNumber(c) / toNumber(b) : undefined)]
  // a x² + b x + c = 0
  const disc = sub(mul(b, b), mul(rat(4), mul(a, c)))
  if (disc.n < 0n) return []
  const root = sqrtRat(disc)
  const two = mul(rat(2), a)
  if (root) {
    const x1 = div(sub(rat(-b.n, b.d), root), two)
    const x2 = div(add(rat(-b.n, b.d), root), two)
    const sorted = [x1, x2].sort((p, q) => toNumber(p) - toNumber(q))
    return isZero(sub(x1, x2)) ? [result(sorted[0])] : sorted.map((r) => result(r))
  }
  const s = Math.sqrt(toNumber(disc))
  const xs = [(-toNumber(b) - s) / toNumber(two), (-toNumber(b) + s) / toNumber(two)].sort((p, q) => p - q)
  return xs.map((x) => ({ value: x, exact: null, isInteger: false }))
}

// ---------- Anzeige ----------

/** Zahl für die Anzeige im deutschen Format: 3,5 · −2 · 1000 (höchstens `digits` Nachkommastellen, ohne überflüssige Nullen). */
export function formatNumber(x: number, digits = 6): string {
  const r = Math.round(x * 10 ** digits) / 10 ** digits
  if (Object.is(r, -0) || r === 0) return '0'
  const s = Math.abs(r).toFixed(digits).replace(/\.?0+$/, '').replace('.', ',')
  return r < 0 ? `−${s}` : s
}

/** Bruch als Text "3/4" (ganze Zahlen ohne Nenner). */
export function formatFraction(r: Rat): string {
  return r.d === 1n ? formatNumber(Number(r.n)) : `${r.n < 0n ? '−' : ''}${babs(r.n)}/${r.d}`
}

/** Auf n Nachkommastellen gerundeter Wert. */
export const roundTo = (x: number, n: number): number => Math.round(x * 10 ** n) / 10 ** n

/** Hat der Bruch eine endliche Dezimaldarstellung? (Nenner nur Faktoren 2 und 5) */
export function terminates(r: Rat): boolean {
  let d = r.d
  while (d % 2n === 0n) d /= 2n
  while (d % 5n === 0n) d /= 5n
  return d === 1n
}
