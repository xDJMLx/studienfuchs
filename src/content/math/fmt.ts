/**
 * Zahlen und Terme so schreiben, wie es in deutschen Schulbüchern steht:
 * Minuszeichen "−", Dezimalkomma, Malpunkt "·", Doppelpunkt zum Teilen, Brüche als {Zähler|Nenner}.
 */

export const MINUS = '−'

/** Euklid. */
export const gcd = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a || 1
}

/** Auf n Nachkommastellen runden, ohne Gleitkomma-Reste (0,1 + 0,2). */
export const round = (x: number, n = 9): number => Math.round(x * 10 ** n) / 10 ** n

/** Zahl für die Anzeige: "−3", "2,5", "1000". Maximal 6 Nachkommastellen, überflüssige Nullen weg. */
export function num(x: number): string {
  const v = round(x, 6)
  if (Object.is(v, -0) || v === 0) return '0'
  const s = String(Math.abs(v))
  // sehr kleine/große Zahlen in Exponentialschreibweise kommen in den Aufgaben nicht vor; zur Sicherheit abfangen
  const plain = /e/.test(s) ? Math.abs(v).toFixed(6).replace(/\.?0+$/, '') : s
  const out = plain.replace('.', ',')
  return v < 0 ? MINUS + out : out
}

/** Zahl als Operand in einer Rechnung: negative Zahlen stehen in Klammern, (−3). */
export const opd = (x: number): string => (x < 0 ? `(${num(x)})` : num(x))

/** Mit Vorzeichen: "+ 3" / "− 3" für Terme nach dem ersten Glied. */
export const signed = (x: number): string => (x < 0 ? `${MINUS} ${num(-x)}` : `+ ${num(x)}`)

/** Bruch als Markup, Zähler und Nenner unverändert: {3|4}. */
export const frac = (n: number, d: number): string => `{${num(n)}|${num(d)}}`

/** Bruch gekürzt (Nenner positiv, Vorzeichen im Zähler). Ganze Zahlen ohne Nenner. */
export function reduced(n: number, d: number): { n: number; d: number } {
  if (d < 0) {
    n = -n
    d = -d
  }
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

/** Bruch als Eingabe-Text für die Lösung: "3/4", ganze Zahl als "2". */
export function fracText(n: number, d: number): string {
  const r = reduced(n, d)
  return r.d === 1 ? num(r.n) : `${num(r.n)}/${r.d}`
}

/** Bruch als Anzeige-Markup (gekürzt): {3|4} oder bei negativen Zahlen −{3|4}. */
export function fracMarkup(n: number, d: number): string {
  const r = reduced(n, d)
  if (r.d === 1) return num(r.n)
  return (r.n < 0 ? MINUS : '') + `{${Math.abs(r.n)}|${r.d}}`
}

/** Dezimalzahl mit genau k Nachkommastellen: 2,50 */
export const fixed = (x: number, k: number): string => (x < 0 ? MINUS : '') + Math.abs(x).toFixed(k).replace('.', ',')

export interface ParsedNumber {
  value: number
  kind: 'int' | 'dec' | 'frac'
  num?: number
  den?: number
}

/**
 * Eingabe der Schüler lesen: "−3", "-3", "2,5", "2.5", "3/4", "−3/4", "25%".
 * Gibt null zurück, wenn es keine Zahl ist.
 */
export function parseNumber(input: string): ParsedNumber | null {
  const s = input
    .trim()
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/%$/, '')
    .replace(',', '.')
  if (!s) return null
  const f = /^(-?\d+)\/(-?\d+)$/.exec(s)
  if (f) {
    const n = Number(f[1])
    const d = Number(f[2])
    if (d === 0) return null
    return { value: n / d, kind: 'frac', num: n, den: d }
  }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) {
    const v = Number(s)
    return { value: v, kind: /\./.test(s) ? 'dec' : 'int' }
  }
  return null
}

export const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
