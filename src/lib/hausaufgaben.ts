import { addDays, dateKey, parseKey, shortDay } from './calendar'
import type { Hausaufgabe } from './types'

export type HaGroup = 'ueberfaellig' | 'heute' | 'morgen' | 'woche' | 'spaeter'

export const GROUP_LABEL: Record<HaGroup, string> = {
  ueberfaellig: 'Überfällig',
  heute: 'Heute',
  morgen: 'Morgen',
  woche: 'Diese Woche',
  spaeter: 'Später',
}

/** Tage von `today` bis `due` (negativ = vorbei), ohne Zeitzonenärger. */
export function daysTo(due: string, today: string): number {
  return Math.round((parseKey(due).getTime() - parseKey(today).getTime()) / 86_400_000)
}

export function groupOf(due: string, today: string): HaGroup {
  const d = daysTo(due, today)
  if (d < 0) return 'ueberfaellig'
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  if (d <= 7) return 'woche'
  return 'spaeter'
}

/** Die offenen Hausaufgaben nach Fälligkeit in Gruppen (leere Gruppen fehlen), innerhalb nach Tag und Fach. */
export function groupHomework(list: Hausaufgabe[], today: string): { id: HaGroup; label: string; items: Hausaufgabe[] }[] {
  const order: HaGroup[] = ['ueberfaellig', 'heute', 'morgen', 'woche', 'spaeter']
  const open = list.filter((h) => !h.done).sort((a, b) => a.due.localeCompare(b.due) || a.subject.localeCompare(b.subject) || a.text.localeCompare(b.text))
  return order.map((id) => ({ id, label: GROUP_LABEL[id], items: open.filter((h) => groupOf(h.due, today) === id) })).filter((g) => g.items.length > 0)
}

/** Wie viele offene Hausaufgaben heute oder früher fällig sind (für die Zahl am Tab). */
export const dueNowCount = (list: Hausaufgabe[], today: string): number => list.filter((h) => !h.done && h.due <= today).length

/** "heute", "morgen", "Mittwoch", "14. Okt.", "vor 2 Tagen" für die Zeile unter einer Hausaufgabe. */
export function dueText(due: string, today: string): string {
  const d = daysTo(due, today)
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  if (d === -1) return 'seit gestern'
  if (d < 0) return `seit ${-d} Tagen`
  if (d <= 6) return parseKey(due).toLocaleDateString('de-DE', { weekday: 'long' })
  return shortDay(due)
}

/** Schnelle Termine für das Eintragen: heute, morgen, übermorgen, in einer Woche. */
export function dueChoices(now = new Date()): { label: string; key: string }[] {
  return [
    { label: 'Heute', key: dateKey(now) },
    { label: 'Morgen', key: dateKey(addDays(now, 1)) },
    { label: 'Übermorgen', key: dateKey(addDays(now, 2)) },
    { label: 'In einer Woche', key: dateKey(addDays(now, 7)) },
  ]
}
