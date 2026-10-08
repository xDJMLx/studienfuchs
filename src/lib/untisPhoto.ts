import { callAi } from './aiCards'
import { extractJson } from './ai'
import { addDays, dateKey, fromMinutes, toMinutes } from './calendar'
import { cleanPeriods, type Period } from './school'
import { subjectFromName, UntisError, type UntisImport, type UntisLesson } from './untis'

/**
 * Stundenplan per Foto oder Screenshot: Die KI schreibt nur ab, was in jeder Zelle steht (alle Zeilen, ohne zu deuten).
 * Welche Zeile das Fach ist (und welche Lehrer, Raum oder Klasse), entscheidet die App mit ihrer Kürzelliste.
 * Aus dem Wochenplan macht sie die Stunden der nächsten Wochen und das Stundenraster.
 */
export const TIMETABLE_PROMPT = [
  'Du liest einen Stundenplan aus einem Foto oder Screenshot (Schule in Deutschland, z. B. WebUntis).',
  'Antworte NUR mit JSON, ohne Text davor oder danach, in diesem Format:',
  '{"lessons": [{"day": 0, "start": "08:00", "end": "08:45", "cell": ["MÜL", "MA", "R204", "7a"]}]}',
  'Regeln:',
  '- Jede belegte Zelle des Plans ist ein Eintrag. "day" ist der Wochentag der Spalte: 0 = Montag, 1 = Dienstag, 2 = Mittwoch, 3 = Donnerstag, 4 = Freitag.',
  '- "start" und "end" sind die Uhrzeiten der Zeile (HH:MM, 24 Stunden), meist in der Spalte links. Steht dort nur die Stundennummer, nimm die Zeiten aus der Zeitleiste.',
  '- "cell" enthält JEDE Textzeile der Zelle von oben nach unten, genau so geschrieben wie im Bild (Großbuchstaben, Unterstriche und Zahlen beibehalten, z. B. "BI_4", "PH_W1", "SPO-2"). In einer Zelle stehen durcheinander Lehrerkürzel, Fach, Raum und manchmal die Klasse. Du musst NICHT entscheiden, was was ist. Lass nichts weg und erfinde nichts.',
  '- Zeigt das Bild nur einen Teil des Plans (z. B. nur die oberen Stunden oder nur einige Tage), gib nur die sichtbaren Zellen an. Erfinde keine Stunden für Teile, die nicht zu sehen sind.',
  '- Pausen, Mittagspause und leere Felder kommen nicht vor. Entfallener oder ausgefallener Unterricht (durchgestrichen oder als „entfällt“ markiert) kommt nicht vor.',
  '- Zeilen, die zwei Stunden hoch sind (Doppelstunde), sind zwei Einträge, wenn der Plan zwei Stunden zeigt, sonst einer mit der gezeigten Zeit.',
].join('\n')

export interface WeeklyLesson {
  day: number
  start: string
  end: string
  /** Das Fach, wie es im Plan steht (zum Beispiel „BI_4“) */
  name: string
  room?: string
}

const clean = (t: unknown): string | null => {
  const m = /(\d{1,2})\s*[:.h]\s*(\d{2})/.exec(String(t ?? ''))
  if (!m) return null
  const min = toMinutes(`${Number(m[1])}:${m[2]}`)
  return min === null ? null : fromMinutes(min)
}

const isClass = (l: string) => /^\d{1,2}\s?[a-zA-Z]{1,2}\d?$/.test(l) || /^(klasse|kl\.?)\s?\d/i.test(l)
const isRoom = (l: string) => !isClass(l) && (/^(raum|r)\.?\s?[\w.-]{1,6}$/i.test(l) || /^[A-Za-z]{0,2}[.\s-]?\d{1,3}([.\-/]\d{1,3})?[a-z]?$/.test(l))

/**
 * Aus allen Zeilen einer Zelle das Fach finden (erste Zeile, die zu einem bekannten Kürzel oder Namen passt) und den Raum.
 * Lehrerkürzel, Klasse und Raum werden übergangen. Unbekanntes Fach: eine kurze Großbuchstaben-Zeile, die nicht nach Raum oder Klasse aussieht.
 */
export function readCell(lines: string[]): { name: string; room?: string } | null {
  const rows = lines.map((l) => String(l ?? '').trim()).filter(Boolean)
  if (rows.length === 0) return null
  const known = rows.find((l) => l.length <= 24 && !isClass(l) && !isRoom(l) && subjectFromName(l))
  const guess = rows.find((l) => /^[A-ZÄÖÜ]{1,5}([_\-\s]?[A-Z0-9]{1,3})?$/.test(l) && !isClass(l) && !isRoom(l))
  const name = known ?? guess ?? rows.find((l) => !isClass(l) && !isRoom(l)) ?? rows[0]
  const room = rows.find((l) => l !== name && isRoom(l))
  return { name: name.slice(0, 40), ...(room ? { room: room.slice(0, 12) } : {}) }
}

/** Die Antwort der KI prüfen: nur sinnvolle Stunden (Wochentag 0 bis 6, Ende nach Beginn, 20 bis 130 Minuten, mit Fach). */
export function normalizeTimetable(raw: unknown): WeeklyLesson[] {
  const list = (raw as { lessons?: unknown })?.lessons
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: WeeklyLesson[] = []
  for (const x of list as Record<string, unknown>[]) {
    const day = Number(x?.day)
    const start = clean(x?.start)
    const end = clean(x?.end)
    if (!Number.isInteger(day) || day < 0 || day > 6 || !start || !end) continue
    const span = (toMinutes(end) as number) - (toMinutes(start) as number)
    if (span < 20 || span > 130) continue
    // neues Format: alle Zeilen der Zelle; altes Format: schon gedeutet
    const cell = Array.isArray(x?.cell) ? readCell((x.cell as unknown[]).map(String)) : null
    const name = cell?.name ?? String(x?.name ?? '').trim().slice(0, 40)
    if (!name) continue
    const room = cell?.room ?? (String(x?.room ?? '').trim().slice(0, 12) || undefined)
    const key = `${day}-${start}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ day, start, end, name, ...(room ? { room } : {}) })
  }
  return out.sort((a, b) => a.day - b.day || (toMinutes(a.start) as number) - (toMinutes(b.start) as number))
}

/** Mehrere Teilbilder zu einem Plan zusammenfügen: Gleiche Stunde (Tag und Beginn) zählt nur einmal. */
export function mergeWeeks(parts: WeeklyLesson[][]): WeeklyLesson[] {
  const byKey = new Map<string, WeeklyLesson>()
  for (const p of parts) for (const l of p) if (!byKey.has(`${l.day}-${l.start}`)) byKey.set(`${l.day}-${l.start}`, l)
  return [...byKey.values()].sort((a, b) => a.day - b.day || (toMinutes(a.start) as number) - (toMinutes(b.start) as number))
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
  if (week.length === 0) throw new UntisError('Auf dem Bild konnte ich keinen Stundenplan lesen. Nimm einen Screenshot (oder ein Foto von oben, gerade und mit Uhrzeiten). Passt der Plan nicht auf ein Bild, mach mehrere und wähle sie zusammen aus.', 'empty')
  return { lessons: lessonsFromWeek(week, now), exams: [], periods: periodsOfWeek(week) }
}

/**
 * Die KI liest jedes Bild für sich (so klappt es auch, wenn der Plan auf mehrere Screenshots verteilt ist), die App fügt sie zusammen.
 * Puter-Anmeldung wie bei allen KI-Funktionen: direkt aus einem Klick aufrufen.
 */
export async function readTimetablePhotos(images: string[], ask: typeof callAi = callAi): Promise<WeeklyLesson[]> {
  if (images.length === 0) throw new UntisError('Wähle ein Foto oder einen Screenshot aus.', 'format')
  const read = async (img: string): Promise<WeeklyLesson[] | Error> => {
    try {
      const text = await ask(TIMETABLE_PROMPT, 'Lies den Stundenplan aus diesem Bild.', [img], 4000)
      return normalizeTimetable(extractJson<unknown>(text))
    } catch (e) {
      return e instanceof Error ? e : new Error('Unlesbar')
    }
  }
  // Erst das erste Bild (dabei klappt die Anmeldung), dann der Rest gleichzeitig
  const first = await read(images[0])
  const rest = await Promise.all(images.slice(1, 4).map(read))
  const results = [first, ...rest]
  const parts = results.filter((r): r is WeeklyLesson[] => Array.isArray(r))
  if (parts.length === 0 || parts.every((p) => p.length === 0)) {
    const err = results.find((r): r is Error => r instanceof Error)
    // Anmeldung, Netz und Limits kommen unverändert zum Nutzer; sonst die Hilfe zum Foto
    const kind = (err as { kind?: string } | undefined)?.kind
    if (err && kind && ['auth', 'network', 'rate', 'no-key'].includes(kind)) throw err
    throw new UntisError('Die KI konnte den Stundenplan nicht lesen. Ein Screenshot aus WebUntis klappt am besten. Passt der Plan nicht auf ein Bild, wähle mehrere zusammen aus.', 'format')
  }
  return mergeWeeks(parts)
}
