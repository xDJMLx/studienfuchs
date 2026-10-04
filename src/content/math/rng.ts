/** Kleiner, stabiler Zufallsgenerator (gleiche Startzahl, gleiche Folge) für die Aufgaben-Generatoren. */
export interface Rng {
  /** Zufallszahl 0 bis unter 1 */
  (): number
  /** ganze Zahl von a bis b (beides eingeschlossen) */
  int(a: number, b: number): number
  /** ganze Zahl von a bis b, aber nie 0 */
  nz(a: number, b: number): number
  pick<T>(list: readonly T[]): T
  chance(p: number): boolean
  shuffle<T>(list: readonly T[]): T[]
  /** Vorzeichen: 1 oder −1 */
  sign(): 1 | -1
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const r = next as Rng
  r.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1))
  r.nz = (lo, hi) => {
    for (let i = 0; i < 50; i++) {
      const v = r.int(lo, hi)
      if (v !== 0) return v
    }
    return lo === 0 ? 1 : lo
  }
  r.pick = (list) => list[Math.floor(next() * list.length)]
  r.chance = (p) => next() < p
  r.shuffle = (list) => {
    const x = [...list]
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[x[i], x[j]] = [x[j], x[i]]
    }
    return x
  }
  r.sign = () => (next() < 0.5 ? -1 : 1)
  return r
}

/** Frischer Zufall für eine neue Aufgabe. */
export const freshSeed = () => (Math.random() * 4294967296) >>> 0
