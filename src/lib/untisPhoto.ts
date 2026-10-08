import { callAi } from './aiCards'
import { extractJson } from './ai'
import { addDays, dateKey, fromMinutes, toMinutes } from './calendar'
import { cleanPeriods, type Period } from './school'
import { subjectFromName, UntisError, type UntisImport, type UntisLesson } from './untis'

/**
 * Stundenplan per Foto oder Screenshot: Die KI liest nur ab, was abgebildet ist (Tag, Uhrzeit, Fach, Raum). Die App macht daraus
 * die Stunden der nächsten Wochen und das Stundenraster. Gedacht für alle, die keinen WebUntis-Link finden.
 */
export const TIMETABLE_PROMPT = [
  'Du liest einen Stundenplan aus einem Foto oder Screenshot (Schule in Deutschland).',
  'Antworte NUR mit JSON, ohne Text davor oder danach, in diesem Format:',
  '{"lessons": [{"day": 0, "start": "08:00", "end": "08:45", "name": "Bio", "room": "A12"}]}',
  'Regeln:',
  '- "day" ist der Wochentag: 0 = Montag, 1 = Dienstag, 2 = Mittwoch, 3 = Donnerstag, 4 = Freitag.',
  '- "start" und "end" sind Uhrzeiten (HH:MM, 24 Stunden), genau wie im Plan. Stehen nur Stundennummern im Plan, nimm die Zeiten aus der Zeitleiste, falls es eine gibt.',
  '- "name" ist das Fach, wie es im Plan steht (Kürzel sind in Ordnung). "room" ist der Raum, wenn er dabeisteht, sonst weglassen.',
  '- Ein Eintrag je Stunde. Eine Doppelstunde sind zwei Einträge, wenn der Plan zwei Stunden zeigt.',
  '- Pausen, Mittagspause und leere Felder kommen nicht vor. Entfallener oder ausgefallener Unterricht (durchgestrichen) kommt nicht vor.',
  '- Erfinde nichts: Was du nicht lesen kannst, lässt du weg.',
].join('\n')

export interface WeeklyLesson {
  day: number
  start: string
  end: string
  name: string
  room?: string
}

const clean = (t: unknown): string | null => {
  const m = /(\d{1,2})\s*[:.h]\s*(\d{2})/.exec(String(t ?? ''))
  if (!m) return null
  const min = toMinutes(`${Number(m[1])}:${m[2]}`)
  return min === null ? null : fromMinutes(min)
}

/** Die Antwort der KI prüfen: nur sinnvolle Stunden (Wochentag 0 bis 6, Ende nach Beginn, 20 bis 130 Minuten, mit Namen). */
export function normalizeTimetable(raw: unknown): WeeklyLesson[] {
  const list = (raw as { lessons?: unknown })?.lessons
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: WeeklyLesson[] = []
  for (const x of list as Record<string, unknown>[]) {
    const day = Number(x?.day)
    const start = clean(x?.start)
    const end = clean(x?.end)
    const name = String(x?.name ?? '').trim().slice(0, 40)
    if (!Number.isInteger(day) || day < 0 || day > 6 || !start || !end || !name) continue
    const span = (toMinutes(end) as number) - (toMinutes(start) as number)
    if (span < 20 || span > 130) continue
    const key = `${day}-${start}`
    if (seen.has(key)) continue
    seen.add(key)
    const room = String(x?.room ?? '').trim().slice(0, 12)
    out.push({ day, start, end, name, ...(room ? { room } : {}) })
  }
  return out.sort((a, b) => a.day - b.day || (toMinutes(a.start) as number) - (toMinutes(b.start) as number))
}

/** Das Stundenraster aus den Zeiten, die mindestens zweimal pro Woche vorkommen (sonst alle). */
export function periodsOfWeek(week: WeeklyLesson[]): Period[] {
  const count = new Map<string, number>()
  for (const l of week) count.set(`${l.start}-${l.end}`, (count.get(`${l.start}-${l.end}`) ?? 0) + 1)
  const common = [...count.entries()].filter(([, n]) => n >= 2)
  const pick = common.length >= 3 ? common : [...count.entries()]
  return cleanPeriods(pick.map(([k]) => ({ start: k.slice(0, 5), end: k.slice(6) })))
}

/** Aus dem Wochenplan die Stunden der nächsten Wochen machen (ab dem Montag dieser Woche). */
export function lessonsFromWeek(week: WeeklyLesson[], now = new Date(), weeks = 10): UntisLesson[] {
  const monday = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -((now.getDay() + 6) % 7))
  const out: UntisLesson[] = []
  for (let w = 0; w < weeks; w++) {
    for (const l of week) {
      const date = dateKey(addDays(monday, w * 7 + l.day))
      out.push({ id: `foto:${date}:${l.start}`, date, start: l.start, end: l.end, name: l.name, subject: subjectFromName(l.name), ...(l.room ? { room: l.room } : {}) })
    }
  }
  return out
}

export function importFromWeek(week: WeeklyLesson[], now = new Date()): UntisImport {
  if (week.length === 0) throw new UntisError('Auf dem Bild konnte ich keinen Stundenplan lesen. Mach ein Foto von oben, gerade und mit Uhrzeiten, oder nimm einen Screenshot.', 'empty')
  return { lessons: lessonsFromWeek(week, now), exams: [], periods: periodsOfWeek(week) }
}

/** Die KI liest das Bild (Puter-Anmeldung wie bei allen KI-Funktionen, direkt aus einem Klick aufrufen). */
export async function readTimetablePhoto(images: string[], now = new Date(), ask: typeof callAi = callAi): Promise<UntisImport> {
  if (images.length === 0) throw new UntisError('Wähle ein Foto oder einen Screenshot aus.', 'format')
  const text = await ask(TIMETABLE_PROMPT, 'Lies den Stundenplan aus diesem Bild.', images.slice(0, 3), 4000)
  let raw: unknown
  try {
    raw = extractJson<unknown>(text)
  } catch {
    throw new UntisError('Die KI konnte den Stundenplan nicht lesen. Versuch es mit einem schärferen Foto oder einem Screenshot.', 'format')
  }
  return importFromWeek(normalizeTimetable(raw), now)
}
