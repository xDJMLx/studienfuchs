import type { Item } from './types'

/** Blitzrunde: 60 Sekunden, so viele Wörter wie möglich. Die Reihe richtiger Antworten erhöht den Faktor. */
export const BLITZ_SECONDS = 60
/** Eine falsche Antwort kostet drei Sekunden (damit Raten sich nicht lohnt) und beendet die Reihe. */
export const BLITZ_PENALTY = 3
export const BLITZ_MIN_WORDS = 8

export interface BlitzQuestion {
  item: Item
  /** frz → dt (Standard) oder dt → frz */
  toFrench: boolean
  prompt: string
  options: string[]
  answer: string
}

/** Faktor je Reihe: 1 bis 3 richtig ×1, ab 4 ×2, ab 8 ×3, ab 12 ×4. */
export const multiplier = (combo: number): number => Math.min(4, 1 + Math.floor(combo / 4))

export const pointsFor = (combo: number): number => 10 * multiplier(combo)

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

/** Nächste Frage: nie zweimal dasselbe Wort hintereinander, drei Ablenker mit anderer Lösung. */
export function makeQuestion(pool: Item[], rnd: () => number = Math.random, lastId?: string): BlitzQuestion {
  const candidates = pool.length > 1 ? pool.filter((i) => i.id !== lastId) : pool
  const item = candidates[Math.floor(rnd() * candidates.length)]
  const toFrench = rnd() < 0.3
  const answer = toFrench ? item.front : item.back
  const seen = new Set([answer.toLowerCase()])
  const others: string[] = []
  for (const o of shuffle(pool, rnd)) {
    const text = toFrench ? o.front : o.back
    // Dasselbe Wort kommt in manchen Lektionen mit anderer Übersetzung vor: solche Einträge wären als Ablenker ebenfalls richtig
    if (o.id === item.id || same(o.front, item.front) || same(o.back, item.back) || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    others.push(text)
    if (others.length === 3) break
  }
  // Notfalls (sehr kleiner Wortschatz) auch Einträge nehmen, die nur anders heißen, damit es immer vier Antworten gibt
  for (const o of shuffle(pool, rnd)) {
    if (others.length >= 3) break
    const text = toFrench ? o.front : o.back
    if (o.id === item.id || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    others.push(text)
  }
  return { item, toFrench, prompt: toFrench ? item.back : item.front, options: shuffle([answer, ...others], rnd), answer }
}
