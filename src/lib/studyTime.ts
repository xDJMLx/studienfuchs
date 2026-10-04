import { dateKey } from './calendar'
import { cardRefs, daysUntil, type Deck } from './decks'
import type { Arbeit } from './types'

/** Standard: so viele Minuten am Tag, wenn eine Arbeit ansteht. */
export const DEFAULT_DAILY_MINUTES = 10
export const MINUTE_CHOICES = [5, 10, 15, 20] as const

/**
 * Wie lange eine Runde gedauert hat, in Minuten (auf 0,1 gerundet). Höchstens 12: Wer das Handy liegen lässt,
 * soll dafür keine Lernzeit bekommen.
 */
export function minutesSince(startMs: number, now = Date.now()): number {
  const m = Math.max(0, (now - startMs) / 60_000)
  return Math.round(Math.min(12, m) * 10) / 10
}

export interface StudyToday {
  /** Die nächste Arbeit, für die gerade geübt wird (mit Karteikarten dabei) */
  arbeit: Arbeit
  days: number
  /** Minuten heute, Ziel und Anteil (0 bis 1) */
  minutes: number
  target: number
  pct: number
  reached: boolean
}

/**
 * Lernzeit für heute: Nur wenn eine Arbeit mit Karteikarten ansteht, gibt es ein Tagesziel in Minuten.
 * Ohne Arbeit gibt es keins: Dann übt man, wann man will.
 */
export function studyToday(p: { arbeiten: Arbeit[]; decks: Deck[]; minutesByDay: Record<string, number>; dailyMinutes: number; now?: Date }): StudyToday | null {
  const now = p.now ?? new Date()
  const open = p.arbeiten
    .filter((a) => !a.done && daysUntil(a, now) >= 0 && cardRefs(p.decks.filter((d) => a.deckIds.includes(d.id))).length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  const arbeit = open[0]
  if (!arbeit) return null
  const target = Math.max(1, p.dailyMinutes)
  const minutes = Math.round((p.minutesByDay[dateKey(now)] ?? 0) * 10) / 10
  return { arbeit, days: daysUntil(arbeit, now), minutes, target, pct: Math.min(1, minutes / target), reached: minutes >= target }
}

/** Minuten als Text: "4 Min." oder "4,5 Min.". */
export const minutesText = (m: number): string => `${Number.isInteger(m) ? m : String(m).replace('.', ',')} Min.`

/** Für die Wochenübersicht und den Kalender: Waren die Minuten an diesem Tag erreicht? */
export const dayReached = (minutesByDay: Record<string, number>, key: string, dailyMinutes: number): boolean => (minutesByDay[key] ?? 0) >= dailyMinutes
