/**
 * Federn für Bewegungen mit Nachschwingen: Ein Wert wird von einer Feder zum Ziel gezogen und schwingt dabei leicht über.
 * So wirkt eine Bewegung "gespielt" statt linear. Alles reine Rechnung, deshalb testbar.
 */
export interface Spring {
  x: number
  v: number
  /** Steifigkeit: größer = schneller */
  k: number
  /** Dämpfung: kleiner = mehr Nachschwingen */
  c: number
}

export const spring = (x: number, k: number, c: number): Spring => ({ x, v: 0, k, c })

/** Ein Schritt mit festen kleinen Teilschritten, damit es bei jeder Bildrate gleich bleibt. */
export function stepSpring(s: Spring, target: number, dtMs: number): void {
  let t = Math.min(dtMs, 64) / 1000
  const h = 1 / 240
  while (t > 0) {
    const dt = Math.min(h, t)
    const a = s.k * (target - s.x) - s.c * s.v
    s.v += a * dt
    s.x += s.v * dt
    t -= dt
  }
}

/** Ist die Feder praktisch zur Ruhe gekommen? */
export const settled = (s: Spring, target: number, eps = 0.02): boolean => Math.abs(target - s.x) < eps && Math.abs(s.v) < eps

/** Dämpfungsgrad: unter 1 schwingt die Feder über. */
export const dampingRatio = (s: Spring): number => s.c / (2 * Math.sqrt(s.k))

/**
 * Sprung als Flugbahn: Erdanziehung, Abprallen mit Energieverlust und ein Signal beim Aufkommen (für das Zusammenstauchen).
 * y ist negativ nach oben.
 */
export interface Ballistic {
  y: number
  v: number
}

export function stepBallistic(b: Ballistic, dtMs: number, onLand: (impact: number) => void, g = 2600, bounce = 0.28): void {
  let t = Math.min(dtMs, 64) / 1000
  const h = 1 / 240
  while (t > 0) {
    const dt = Math.min(h, t)
    b.v += g * dt
    b.y += b.v * dt
    if (b.y >= 0) {
      const impact = b.v
      b.y = 0
      b.v = impact > 90 ? -impact * bounce : 0
      if (impact > 90) onLand(impact)
    }
    t -= dt
  }
}
