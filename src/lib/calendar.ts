import type { Arbeit, ArbeitKind } from './types'

export const KINDS: { id: ArbeitKind; label: string; short: string }[] = [
  { id: 'klassenarbeit', label: 'Klassenarbeit', short: 'Arbeit' },
  { id: 'test', label: 'Test', short: 'Test' },
  { id: 'vokabeltest', label: 'Vokabeltest', short: 'Vokabeln' },
  { id: 'klausur', label: 'Klausur', short: 'Klausur' },
  { id: 'praesentation', label: 'Präsentation', short: 'Referat' },
  { id: 'sonstiges', label: 'Sonstiges', short: 'Termin' },
]

export const kindLabel = (k: ArbeitKind | undefined): string => KINDS.find((x) => x.id === (k ?? 'klassenarbeit'))?.label ?? 'Arbeit'

/** YYYY-MM-DD in der Ortszeit. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export const monthName = (month: number): string => MONTHS[month]

/** "Mittwoch, 5. November" */
export function longDay(key: string): string {
  const d = parseKey(key)
  return `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`
}

/** "5. Nov." für Listen */
export function shortDay(key: string): string {
  const d = parseKey(key)
  return `${d.getDate()}. ${MONTHS[d.getMonth()].slice(0, 3)}.`
}

/**
 * Die Felder eines Monats für das Kalender-Raster: Wochen von Montag bis Sonntag, mit Tagen der Nachbarmonate als Füllung.
 * Gibt immer volle Wochen zurück (4 bis 6 Zeilen).
 */
export function monthGrid(year: number, month: number): { key: string; day: number; inMonth: boolean }[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { key: string; day: number; inMonth: boolean }[] = []
  for (let i = -offset; ; i++) {
    const d = new Date(year, month, 1 + i)
    cells.push({ key: dateKey(d), day: d.getDate(), inMonth: d.getMonth() === month })
    if (i >= daysInMonth - 1 && cells.length % 7 === 0) break
  }
  return cells
}

/** Arbeiten nach Tag. */
export function byDay(arbeiten: Arbeit[]): Record<string, Arbeit[]> {
  const out: Record<string, Arbeit[]> = {}
  for (const a of arbeiten) (out[a.date] ??= []).push(a)
  return out
}

/** Vorbei, aber noch nicht abgehakt: Dazu fragt die App "Wie lief's?". */
export const needsFollowUp = (a: Arbeit, todayKey: string): boolean => !a.done && a.date < todayKey

/** Schnellwahl für den Termin. */
export function quickDates(now = new Date()): { label: string; key: string }[] {
  return [
    { label: 'Morgen', key: dateKey(addDays(now, 1)) },
    { label: 'In einer Woche', key: dateKey(addDays(now, 7)) },
    { label: 'In zwei Wochen', key: dateKey(addDays(now, 14)) },
  ]
}
