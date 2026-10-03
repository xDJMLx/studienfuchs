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
