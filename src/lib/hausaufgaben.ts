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

// ---------- Schnell eintragen: aus einem Satz Fach und Tag erkennen ----------

/** Wörter, an denen man ein Fach erkennt (nur eindeutige, ganze Wörter). */
const SUBJECT_WORDS: [string, string[]][] = [
  ['mathe', ['mathe', 'mathematik']],
  ['deutsch', ['deutsch']],
  ['englisch', ['englisch', 'engl']],
  ['franzoesisch', ['französisch', 'franzoesisch', 'franz', 'frz']],
  ['biologie', ['bio', 'biologie']],
  ['geschichte', ['geschichte']],
  ['physik', ['physik']],
  ['chemie', ['chemie']],
  ['geografie', ['geo', 'geografie', 'geographie', 'erdkunde']],
  ['politik', ['politik', 'pb']],
  ['informatik', ['informatik', 'info']],
  ['kunst', ['kunst']],
  ['musik', ['musik']],
]

const WEEKDAYS: Record<string, number> = { sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6 }

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export interface QuickHomework {
  text: string
  subject: string
  due: string
  /** Was erkannt wurde (für die Vorschau: „Fach erkannt“, „Tag erkannt“) */
  found: { subject: boolean; due: boolean }
}

/**
 * „Mathe S. 52 Nr. 3 bis morgen“ → Fach Mathe, fällig morgen, Text „S. 52 Nr. 3“.
 * Ohne Angabe gilt das zuletzt benutzte Fach (sonst das erste eigene) und der nächste Tag.
 */
export function parseQuickHomework(input: string, opts: { today?: string; fallbackSubject: string; allowed?: string[] }): QuickHomework {
  const today = opts.today ?? dateKey(new Date())
  let rest = ` ${input.trim()} `
  let subject = opts.fallbackSubject
  let foundSubject = false
  let due = dateKey(addDays(parseKey(today), 1))
  let foundDue = false

  // Tag: erst ausdrückliche Datumsangaben, dann Wörter
  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(rest)
    if (m) rest = rest.replace(re, ' ')
    return m
  }
  const date = take(/\b(?:bis\s+(?:zum\s+)?|am\s+)?(\d{1,2})\.\s?(\d{1,2})\.(\d{2,4})?(?!\d)/i)
  if (date) {
    const t = parseKey(today)
    let y = date[3] ? Number(date[3]) : t.getFullYear()
    if (y < 100) y += 2000
    let d = new Date(y, Number(date[2]) - 1, Number(date[1]))
    if (!date[3] && d < t) d = new Date(y + 1, d.getMonth(), d.getDate())
    if (!Number.isNaN(d.getTime()) && d.getDate() === Number(date[1])) {
      due = dateKey(d)
      foundDue = true
    }
  }
  if (!foundDue) {
    const rel = take(/(?<![\p{L}])(?:bis\s+|für\s+|fuer\s+)?(übermorgen|uebermorgen|morgen|heute|nächste woche|naechste woche|in einer woche)(?![\p{L}])/iu)
    if (rel) {
      const w = rel[1].toLowerCase()
      const n = w === 'heute' ? 0 : w === 'morgen' ? 1 : w.startsWith('ü') || w.startsWith('ue') ? 2 : 7
      due = dateKey(addDays(parseKey(today), n))
      foundDue = true
    }
  }
  if (!foundDue) {
    const wd = take(/(?<![\p{L}])(?:bis\s+|für\s+|fuer\s+|am\s+|zum\s+)?(sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag)(?![\p{L}])/iu)
    if (wd) {
      const target = WEEKDAYS[wd[1].toLowerCase()]
      const t = parseKey(today)
      due = dateKey(addDays(t, ((target - t.getDay() + 6) % 7) + 1))
      foundDue = true
    }
  }

  // Fach: das erste eindeutige Fachwort, sofern erlaubt
  for (const [id, words] of SUBJECT_WORDS) {
    if (opts.allowed && !opts.allowed.includes(id)) continue
    const m = new RegExp(`(^|[^\\p{L}])(${words.map(esc).join('|')})(?![\\p{L}])`, 'iu').exec(rest)
    if (m) {
      subject = id
      foundSubject = true
      rest = rest.replace(m[0], `${m[1]} `)
      break
    }
  }

  const cleaned = rest.replace(/\s+/g, ' ').replace(/^[\s:,\-–]+|[\s:,\-–]+$/g, '')
  return { text: (cleaned || input.trim()).slice(0, 200), subject, due, found: { subject: foundSubject, due: foundDue } }
}
