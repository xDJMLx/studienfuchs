/**
 * Der Mund des Fuchses ist keine Sammlung fester Bilder, sondern wird aus Zahlen gezeichnet.
 * Wechselt die Stimmung, gleiten die Zahlen weich auf den neuen Wert (wie bei einer Zeichentrick-Figur),
 * statt dass die Form springt. Alles hier ist reine Rechnung und lässt sich testen.
 */
export type MouthName = 'smile' | 'grin' | 'open' | 'talk' | 'sad' | 'o' | 'flat' | 'laugh' | 'yawn'

export interface MouthParams {
  /** halbe Breite */
  w: number
  /** Höhe der Mundwinkel */
  cornerY: number
  /** Höhe in der Mitte (dort, wo die Nase ansetzt) */
  centerY: number
  /** Ausbuchtung der Oberlippe: positiv = Katzenmund "ω", negativ = Bogen nach oben */
  bump: number
  /** wie weit der Mund offen ist */
  open: number
  /** wie viel Zunge zu sehen ist (0 bis 1) */
  tongue: number
}

export const MOUTHS: Record<MouthName, MouthParams> = {
  smile: { w: 15, cornerY: 129, centerY: 129, bump: 9, open: 0, tongue: 0 },
  grin: { w: 19, cornerY: 126, centerY: 127, bump: 2, open: 25, tongue: 1 },
  laugh: { w: 21, cornerY: 124, centerY: 126, bump: 1, open: 32, tongue: 1 },
  open: { w: 12, cornerY: 128, centerY: 128, bump: 2, open: 20, tongue: 0.5 },
  talk: { w: 9, cornerY: 133, centerY: 130, bump: -2, open: 15, tongue: 0.2 },
  sad: { w: 14, cornerY: 142, centerY: 133, bump: -4, open: 0, tongue: 0 },
  o: { w: 7, cornerY: 138, centerY: 128, bump: -7, open: 19, tongue: 0 },
  flat: { w: 10, cornerY: 134, centerY: 134, bump: 1.5, open: 0, tongue: 0 },
  yawn: { w: 12, cornerY: 130, centerY: 127, bump: -8, open: 34, tongue: 0.9 },
}

const r = (n: number) => Math.round(n * 100) / 100

/** Umriss des geöffneten Mundes (zum Füllen); bei geschlossenem Mund eine flache Linie. */
export function mouthPath(p: MouthParams): string {
  const lx = 100 - p.w
  const rx = 100 + p.w
  const midY = (p.cornerY + p.centerY) / 2
  // Oberkante: von links über die Mitte nach rechts, bei bump > 0 mit zwei Dellen wie beim Katzenmund
  const upper = `M${r(lx)} ${r(p.cornerY)} Q${r(100 - p.w / 2)} ${r(midY + p.bump)} 100 ${r(p.centerY)} Q${r(100 + p.w / 2)} ${r(midY + p.bump)} ${r(rx)} ${r(p.cornerY)}`
  // Unterkante: zurück nach links, die Tiefe wächst mit dem Öffnen
  const depth = p.open * 1.55
  const lower = ` Q100 ${r(Math.max(p.cornerY, p.centerY) + depth)} ${r(lx)} ${r(p.cornerY)} Z`
  return upper + lower
}

/** Nur die Oberkante als Linie (für die Konturlinie und den geschlossenen Mund). */
export function mouthLine(p: MouthParams): string {
  const lx = 100 - p.w
  const rx = 100 + p.w
  const midY = (p.cornerY + p.centerY) / 2
  return `M${r(lx)} ${r(p.cornerY)} Q${r(100 - p.w / 2)} ${r(midY + p.bump)} 100 ${r(p.centerY)} Q${r(100 + p.w / 2)} ${r(midY + p.bump)} ${r(rx)} ${r(p.cornerY)}`
}

/** Zungenellipse: sitzt am Boden des Mundes und ist nur bei offenem Mund zu sehen. */
export function tonguePos(p: MouthParams): { cy: number; rx: number; ry: number } {
  const bottom = Math.max(p.cornerY, p.centerY) + p.open * 0.78
  const k = Math.max(0, p.tongue)
  return { cy: bottom + 2, rx: Math.max(0, p.w * 0.62) * k, ry: 9 * k }
}

const KEYS: (keyof MouthParams)[] = ['w', 'cornerY', 'centerY', 'bump', 'open', 'tongue']

/** Ein Schritt in Richtung Ziel: weiches Ausklingen, unabhängig von der Bildrate. Gibt zurück, ob noch etwas zu tun ist. */
export function stepMouth(cur: MouthParams, target: MouthParams, dtMs: number, speed = 0.018): boolean {
  const k = 1 - Math.exp(-dtMs * speed)
  let moving = false
  for (const key of KEYS) {
    const d = target[key] - cur[key]
    if (Math.abs(d) < 0.02) {
      cur[key] = target[key]
    } else {
      cur[key] += d * k
      moving = true
    }
  }
  return moving
}

/** Unterkante des Mundes als eigene Linie (sichtbar, sobald der Mund aufgeht). */
export function mouthLower(p: MouthParams): string {
  const lx = 100 - p.w
  const rx = 100 + p.w
  return `M${r(rx)} ${r(p.cornerY)} Q100 ${r(Math.max(p.cornerY, p.centerY) + p.open * 1.55)} ${r(lx)} ${r(p.cornerY)}`
}

/** Höhe der Oberkante des Mundes bei der Stelle x (die Linie besteht aus zwei Kurven; x wird per Halbieren gesucht). */
export function upperY(p: MouthParams, x: number): number {
  const lx = 100 - p.w
  const rx = 100 + p.w
  const midY = (p.cornerY + p.centerY) / 2
  const left = x <= 100
  const x0 = left ? lx : 100
  const x1 = left ? 100 : rx
  const y0 = left ? p.cornerY : p.centerY
  const y1 = left ? p.centerY : p.cornerY
  const cx = left ? 100 - p.w / 2 : 100 + p.w / 2
  const cy = midY + p.bump
  let a = 0
  let b = 1
  for (let i = 0; i < 18; i++) {
    const t = (a + b) / 2
    const xt = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1
    if (xt < x) a = t
    else b = t
  }
  const t = (a + b) / 2
  return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1
}

/** Höhe der Unterkante des geöffneten Mundes bei x. */
export function lowerY(p: MouthParams, x: number): number {
  const lx = 100 - p.w
  const rx = 100 + p.w
  const base = Math.max(p.cornerY, p.centerY)
  const cy = base + p.open * 1.55
  let a = 0
  let b = 1
  for (let i = 0; i < 18; i++) {
    const t = (a + b) / 2
    const xt = (1 - t) * (1 - t) * rx + 2 * (1 - t) * t * 100 + t * t * lx
    if (xt > x) a = t
    else b = t
  }
  const t = (a + b) / 2
  return (1 - t) * (1 - t) * p.cornerY + 2 * (1 - t) * t * cy + t * t * p.cornerY
}

const TEETH_UP: [number, number, number][] = [
  [-0.86, 3.4, 7],
  [-0.6, 2.7, 4.6],
  [-0.34, 2.7, 4.6],
  [-0.1, 2.5, 4],
  [0.1, 2.5, 4],
  [0.34, 2.7, 4.6],
  [0.6, 2.7, 4.6],
  [0.86, 3.4, 7],
]
const TEETH_LOW: [number, number, number][] = [
  [-0.72, 2.6, 4.4],
  [-0.4, 2.4, 3.6],
  [0.4, 2.4, 3.6],
  [0.72, 2.6, 4.4],
]

/** Zähne des Oberkiefers: Dreiecke, die von der Mundlinie hängen (Krokodil). */
export function teethUpper(p: MouthParams, k = 1): string {
  return TEETH_UP.map(([u, hw0, h0]) => {
    const hw = hw0 * k
    const h = h0 * k
    const x = 100 + u * p.w
    const y = upperY(p, x) - 0.6
    return `M${r(x - hw)} ${r(upperY(p, x - hw) - 0.6)} L${r(x + hw)} ${r(upperY(p, x + hw) - 0.6)} L${r(x)} ${r(y + h)} Z`
  }).join(' ')
}

/** Zähne des Unterkiefers: kleine Dreiecke nach oben, nur bei offenem Mund zu sehen. */
export function teethLower(p: MouthParams, k = 1): string {
  return TEETH_LOW.map(([u, hw0, h0]) => {
    const hw = hw0 * k
    const h = h0 * k
    const x = 100 + u * p.w
    const y = lowerY(p, x) + 0.6
    return `M${r(x - hw)} ${r(lowerY(p, x - hw) + 0.6)} L${r(x + hw)} ${r(lowerY(p, x + hw) + 0.6)} L${r(x)} ${r(y - h)} Z`
  }).join(' ')
}
