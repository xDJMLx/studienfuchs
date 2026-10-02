import { findLesson, isLessonDone, isRegular, LESSON_PASS, units, type LessonRecordLike } from '../content'
import type { Lesson, Unit } from './types'

/**
 * Stand der Klasse im Buch: alle normalen Lektionen bis einschließlich dieser Einheit sollten sitzen.
 * Mit `allGrades` zählen auch alle früheren Klassen komplett dazu (für alle, die früher kaum aufgepasst haben oder neu einsteigen).
 */
export function unitsUpTo(unitId: string, allGrades = false): Unit[] {
  const target = units.find((u) => u.id === unitId)
  if (!target) return []
  const sameGrade = units.filter((u) => u.grade === target.grade)
  const current = sameGrade.slice(0, sameGrade.findIndex((u) => u.id === unitId) + 1)
  return allGrades ? [...units.filter((u) => u.grade < target.grade), ...current] : current
}

/** Lektionen, die bis zum Stand der Klasse noch nicht (gut genug) geschafft sind. */
export function backlog(unitId: string, records: Record<string, LessonRecordLike | undefined>, allGrades = false): Lesson[] {
  return unitsUpTo(unitId, allGrades)
    .flatMap((u) => u.lessons)
    .filter((l) => isRegular(l) && !isLessonDone(l, records[l.id]))
}

export interface CatchUpStatus {
  /** alle normalen Lektionen bis zum Stand der Klasse */
  total: number
  remaining: number
  /** Wörter in den noch offenen Lektionen */
  remainingWords: number
  /** heute geschaffte Lektionen, die zum Rückstand gehörten */
  doneToday: number
  daysLeft: number
  /** Lektionen pro Tag, damit der Plan aufgeht (Tagesbeginn gerechnet) */
  perDay: number
  /** Lektionen, die heute noch fehlen */
  toGoToday: number
  finished: boolean
  /** Der Zieltermin des Plans liegt schon in der Vergangenheit */
  expired: boolean
}

export const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Verbleibende Tage inklusive heute (mindestens 1). */
export function daysUntil(targetDate: string, now: Date): number {
  const [y, m, d] = targetDate.split('-').map(Number)
  const end = new Date(y, m - 1, d)
  return Math.max(1, Math.round((end.getTime() - dayStart(now).getTime()) / 86_400_000) + 1)
}

export function catchUpStatus(
  unitId: string,
  targetDate: string,
  records: Record<string, (LessonRecordLike & { lastDone?: string }) | undefined>,
  now = new Date(),
  allGrades = false,
): CatchUpStatus {
  const upTo = unitsUpTo(unitId, allGrades)
  const all = upTo.flatMap((u) => u.lessons).filter(isRegular)
  const open = all.filter((l) => !isLessonDone(l, records[l.id]))
  const today = iso(now)
  // Heute geschaffte Lektionen zählen zum Tagesziel des Plans, auch wenn sie jetzt "erledigt" sind
  const doneToday = all.filter((l) => isLessonDone(l, records[l.id]) && records[l.id]?.lastDone === today).length
  const left = daysUntil(targetDate, now)
  const startOfDay = open.length + doneToday
  const perDay = Math.ceil(startOfDay / left)
  const remainingWords = new Set(open.flatMap((l) => l.items.map((i) => i.id))).size
  return {
    total: all.length,
    remaining: open.length,
    remainingWords,
    doneToday,
    daysLeft: left,
    perDay,
    toGoToday: Math.max(0, perDay - doneToday),
    finished: open.length === 0,
    expired: dayStart(now).getTime() > new Date(targetDate.replace(/-/g, '/')).getTime(),
  }
}

/** Die nächste Einheit nach dieser (gleiche Klasse, sonst die erste der nächsten Klasse), für "Meine Klasse ist weiter". */
export function nextUnitId(unitId: string): string | null {
  const i = units.findIndex((u) => u.id === unitId)
  return i >= 0 && i + 1 < units.length ? units[i + 1].id : null
}

/** Offene Lektionen, gruppiert nach Einheit (für die Liste "Das fehlt dir noch"). */
export function backlogByUnit(unitId: string, records: Record<string, LessonRecordLike | undefined>, allGrades = false): { unit: Unit; lessons: Lesson[]; total: number }[] {
  return unitsUpTo(unitId, allGrades)
    .map((unit) => {
      const regular = unit.lessons.filter(isRegular)
      return { unit, total: regular.length, lessons: regular.filter((l) => !isLessonDone(l, records[l.id])) }
    })
    .filter((g) => g.lessons.length > 0)
}

/** Datum in n Tagen als YYYY-MM-DD (für Schnellauswahl im Aufhol-Plan). */
export function inDays(n: number, now = new Date()): string {
  const d = dayStart(now)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export const unitLabel = (unitId: string): string => {
  const f = findLesson(`${unitId}-l1`)
  return f ? `${f.unit.book ?? `Klasse ${f.unit.grade}`} · ${f.unit.title}` : unitId
}

export { LESSON_PASS }
