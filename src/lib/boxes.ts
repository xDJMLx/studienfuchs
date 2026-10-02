import type { SrsCard } from './srs'

/** Grenzen in Tagen (Stabilität des Gedächtnisses): darunter liegt ein Wort in Fach 1, ab der letzten Grenze in Fach 5. */
export const BOX_LIMITS = [2, 7, 21, 60] as const

export const BOX_NAMES = ['wackelig', 'wird fester', 'sitzt meist', 'fest', 'dauerhaft'] as const

/** Fach 1 bis 5 für ein Wort, das schon geübt wurde (0 bis 4 als Index). */
export function boxOf(card: SrsCard): number {
  const i = BOX_LIMITS.findIndex((limit) => card.stability < limit)
  return i === -1 ? BOX_LIMITS.length : i
}

/** Wie viele geübte Wörter in jedem der fünf Fächer liegen. Wörter ohne Übung zählen nicht mit. */
export function boxCounts(cards: Record<string, SrsCard>, only?: Set<string>): number[] {
  const counts = Array.from({ length: BOX_LIMITS.length + 1 }, () => 0)
  for (const [id, c] of Object.entries(cards)) {
    if (only && !only.has(id)) continue
    if (!c || c.reps === 0) continue
    counts[boxOf(c)]++
  }
  return counts
}
