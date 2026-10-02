import { isDue, type SrsCard } from './srs'
import type { Item } from './types'

export interface TodayPlan {
  items: Item[]
  dueCount: number
  newCount: number
  /** Wie viele neue Wörter pro Tag nötig sind, um bis zur Klassenarbeit alles gesehen zu haben. */
  perDay: number
  daysLeft: number | null
}

const DEFAULT_NEW_PER_SESSION = 6
const MAX_ITEMS = 10

function daysBetween(from: Date, toKey: string): number {
  const [y, m, d] = toKey.split('-').map(Number)
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(y, m - 1, d)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Tagesplan für ein Set: fällige Wörter zuerst, dann neue. Mit Prüfungsdatum werden die neuen Wörter
 * gleichmäßig verteilt – der letzte Tag vor der Arbeit bleibt zum reinen Wiederholen frei.
 */
export function planToday(items: Item[], cards: Record<string, SrsCard>, examDate: string | null | undefined, now = new Date()): TodayPlan {
  const unseen = items.filter((i) => !cards[i.id])
  const due = items.filter((i) => isDue(cards[i.id], now))

  let daysLeft: number | null = null
  let perDay = DEFAULT_NEW_PER_SESSION
  if (examDate) {
    daysLeft = Math.max(0, daysBetween(now, examDate))
    const learningDays = Math.max(1, daysLeft - 1)
    perDay = Math.max(1, Math.ceil(unseen.length / learningDays))
  }

  const dueTake = due.slice(0, MAX_ITEMS - Math.min(perDay, MAX_ITEMS - 2))
  const newTake = unseen.slice(0, Math.max(0, Math.min(perDay, MAX_ITEMS - dueTake.length)))
  return { items: [...dueTake, ...newTake], dueCount: due.length, newCount: newTake.length, perDay, daysLeft }
}
