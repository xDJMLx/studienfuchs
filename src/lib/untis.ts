import { dateKey, fromMinutes } from './calendar'
import { parseIcs, type IcsEvent } from './ics'
import { cleanPeriods, type Period } from './school'
import type { Arbeit, ArbeitKind } from './types'

/** Eine Unterrichtsstunde aus WebUntis (für die Anzeige im Stundenplan). */
export interface UntisLesson {
  id: string
  date: string
  start: string
  end: string
  /** Name, wie er in WebUntis steht (z. B. "Bio") */
  name: string
  /** Zugeordnetes Fach der App, falls erkannt */
  subject?: string
  room?: string
  cancelled?: boolean
}

/** Alles, was mit WebUntis verbunden ist. Liegt nur auf diesem Gerät (und in der Sicherung). */
export interface UntisState {
  /** iCal-Link aus WebUntis (enthält einen geheimen Schlüssel: nicht weitergeben) */
  url: string
  /** Optionales Relais, falls WebUntis den Abruf direkt aus dem Browser nicht erlaubt */
  relay?: string
  lastSync?: string
  lastError?: string
  lessons: UntisLesson[]
  /** Anzahl der übernommenen Klassenarbeiten/Tests beim letzten Abgleich */
  exams: number
  /** Die Schulstunden wurden aus WebUntis abgeleitet (und werden beim Abgleich aktuell gehalten) */
  periodsAuto?: boolean
}

export class UntisError extends Error {
  constructor(
    message: string,
    readonly code: 'url' | 'network' | 'format' | 'empty',
  ) {
    super(message)
  }
}

// ---------- Fächer erkennen ----------

/** Kürzel und Namen, wie sie in WebUntis vorkommen, → Fach der App. Wörter müssen ganz passen (Kürzel) oder am Anfang stehen (Namen). */
const ALIASES: [string, string[]][] = [
  ['mathe', ['m', 'ma', 'mat', 'mathe', 'mathematik']],
  ['deutsch', ['d', 'de', 'deu', 'deutsch']],
  ['englisch', ['e', 'en', 'eng', 'engl', 'englisch']],
  ['franzoesisch', ['f', 'fr', 'frz', 'fra', 'franz', 'französisch', 'franzosisch']],
  ['biologie', ['bio', 'biologie', 'bi']],
  ['geschichte', ['g', 'ge', 'ges', 'gesch', 'geschichte', 'gsch']],
  ['physik', ['ph', 'phy', 'physik']],
  ['chemie', ['ch', 'che', 'chem', 'chemie']],
  ['geografie', ['geo', 'geografie', 'geographie', 'erdkunde', 'ek']],
  ['politik', ['pol', 'pb', 'politik', 'sozialkunde', 'sk', 'gesellschaftswissenschaften', 'gewi', 'wat', 'politische bildung']],
  ['informatik', ['inf', 'info', 'informatik', 'itg']],
  ['kunst', ['ku', 'kunst', 'bk']],
  ['musik', ['mu', 'mus', 'musik']],
  // Fächer, die die App nicht als eigenes Fach kennt (Sport, Klassenrat, Religion …) zählen als „Sonstiges“
  ['sonstiges', ['spo', 'sport', 'tut', 'klassenrat', 'kr', 'ethik', 'reli', 'religion', 'wp', 'wpf', 'lk', 'ag']],
]

/** "Bio", "Mathematik GK", "E 7a" → Fach der App; sonst undefined. */
export function subjectFromName(name: string): string | undefined {
  const words = name
    .toLowerCase()
    .replace(/[^a-zäöüß ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const first = words[0]
  if (!first) return undefined
  for (const [id, list] of ALIASES) if (list.includes(first)) return id
  // Zweiteilige Namen wie "Politische Bildung"
  const two = words.slice(0, 2).join(' ')
  for (const [id, list] of ALIASES) if (list.includes(two)) return id
  return undefined
}

// ---------- Klassenarbeiten erkennen ----------

const EXAM = /\b(klassenarbeit|klausur|schulaufgabe|lernzielkontrolle|lzk|leistungskontrolle|prüfung|pruefung|exam|test|vokabeltest|ka)\b/i

/** Art des Termins aus dem Text; null, wenn es ein normaler Unterricht ist. */
export function examKind(text: string): ArbeitKind | null {
  const t = text.toLowerCase()
  if (!EXAM.test(t)) return null
  if (/vokabel/.test(t)) return 'vokabeltest'
  if (/klausur/.test(t)) return 'klausur'
  if (/\b(test|lzk|lernzielkontrolle|leistungskontrolle)\b/.test(t)) return 'test'
  return 'klassenarbeit'
}

// ---------- Import ----------

export interface UntisImport {
  lessons: UntisLesson[]
  exams: (Omit<Arbeit, 'id'> & { uid: string })[]
  periods: Period[]
}

const MIN_LESSON = 20
const MAX_LESSON = 120

/**
 * Stundenraster aus den Unterrichtsstunden ableiten: Jede Startzeit, die oft vorkommt, ist eine Stunde; als Ende gilt das
 * häufigste kurze Ende dieser Startzeit (Doppelstunden werden so nicht zu einer langen Stunde).
 */
export function derivePeriods(events: { start: number; end: number }[]): Period[] {
  const byStart = new Map<number, Map<number, number>>()
  for (const e of events) {
    const d = e.end - e.start
    if (d < MIN_LESSON || d > MAX_LESSON) continue
    const m = byStart.get(e.start) ?? new Map<number, number>()
    m.set(e.end, (m.get(e.end) ?? 0) + 1)
    byStart.set(e.start, m)
  }
  const counts = [...byStart.values()].map((m) => [...m.values()].reduce((a, b) => a + b, 0))
  const max = Math.max(0, ...counts)
  const rows: Period[] = []
  for (const [start, ends] of byStart) {
    const total = [...ends.values()].reduce((a, b) => a + b, 0)
    if (total < Math.max(2, max * 0.12)) continue
    // kürzestes Ende, das mindestens ein Viertel der Vorkommen hat (Doppelstunden-Ende ignorieren)
    const candidates = [...ends.entries()].filter(([, n]) => n >= total * 0.25).sort((a, b) => a[0] - b[0])
    const end = (candidates[0] ?? [...ends.entries()].sort((a, b) => b[1] - a[1])[0])[0]
    rows.push({ start: fromMinutes(start), end: fromMinutes(end) })
  }
  return cleanPeriods(rows)
}

/** Liest eine iCal-Datei aus WebUntis: Unterricht, Klassenarbeiten/Tests und das Stundenraster. */
export function importUntis(text: string, now = new Date()): UntisImport {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new UntisError('Das ist keine Kalender-Datei (iCal). Prüfe den Link oder lade die .ics-Datei aus WebUntis.', 'format')
  const events = parseIcs(text)
  if (events.length === 0) throw new UntisError('In der Datei stehen keine Termine. Hat WebUntis für diesen Zeitraum nichts exportiert?', 'empty')
  const from = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14))
  const to = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 150))
  const lessons: UntisLesson[] = []
  const exams: UntisImport['exams'] = []
  const timed: { start: number; end: number }[] = []
  for (const ev of events) {
    if (ev.date < from || ev.date > to) continue
    const text2 = `${ev.summary} ${ev.description} ${ev.categories}`
    const kind = examKind(text2)
    if (ev.allDay || ev.start === null || ev.end === null) {
      if (kind) exams.push(examFrom(ev, kind))
      continue
    }
    if (kind) {
      exams.push(examFrom(ev, kind))
      continue
    }
    timed.push({ start: ev.start, end: ev.end })
    lessons.push({
      id: ev.uid,
      date: ev.date,
      start: fromMinutes(ev.start),
      end: fromMinutes(ev.end),
      name: ev.summary || 'Unterricht',
      subject: subjectFromName(ev.summary),
      ...(ev.location ? { room: ev.location } : {}),
      ...(ev.cancelled ? { cancelled: true } : {}),
    })
  }
  return { lessons, exams, periods: derivePeriods(timed) }
}

function examFrom(ev: IcsEvent, kind: ArbeitKind): Omit<Arbeit, 'id'> & { uid: string } {
  // Der Fachname steht meist vorn ("Mathe KA 3"); sonst "sonstiges"
  const subject = subjectFromName(ev.summary) ?? subjectFromName(ev.description) ?? 'sonstiges'
  const hasTime = ev.start !== null && ev.end !== null
  return {
    uid: ev.uid,
    subject,
    kind,
    title: ev.summary || 'Arbeit',
    date: ev.date,
    deckIds: [],
    ...(hasTime ? { time: fromMinutes(ev.start!), duration: Math.max(15, ev.end! - ev.start!) } : {}),
  }
}

/**
 * Importierte Klassenarbeiten mit den vorhandenen Arbeiten zusammenführen. Eigene Eingaben bleiben unberührt;
 * bei früher importierten bleiben Karteikarten und Note erhalten. Was in WebUntis verschwunden ist, verschwindet hier auch,
 * solange noch niemand Karteikarten dazugehängt oder die Arbeit abgehakt hat.
 */
export function mergeExams(existing: Arbeit[], imported: UntisImport['exams']): Arbeit[] {
  const byUid = new Map(existing.filter((a) => a.id.startsWith('untis:')).map((a) => [a.id, a]))
  const seen = new Set<string>()
  const next: Arbeit[] = []
  for (const im of imported) {
    const id = `untis:${im.uid}`
    if (seen.has(id)) continue
    seen.add(id)
    const old = byUid.get(id)
    const { uid, ...rest } = im
    void uid
    next.push(old ? { ...rest, id, deckIds: old.deckIds, ...(old.done ? { done: true } : {}), ...(old.note ? { note: old.note } : {}) } : { ...rest, id })
  }
  const kept = existing.filter((a) => !a.id.startsWith('untis:') || (!seen.has(a.id) && (a.deckIds.length > 0 || a.done)))
  return [...kept.filter((a) => !seen.has(a.id)), ...next]
}

// ---------- Abrufen ----------

/** "webcal://…" → "https://…"; nur https-Adressen, sonst Fehler. */
export function normalizeUntisUrl(input: string): string {
  const t = input.trim().replace(/^webcals?:\/\//i, 'https://')
  let u: URL
  try {
    u = new URL(t)
  } catch {
    throw new UntisError('Das ist kein gültiger Link. Kopiere den iCal-Link aus WebUntis noch einmal.', 'url')
  }
  if (u.protocol !== 'https:') throw new UntisError('Der Link muss mit https:// oder webcal:// beginnen.', 'url')
  return u.toString()
}

/** Sieht der Text nach einem WebUntis-Kalenderlink aus (webcal:// oder https:// mit „untis“ im Namen)? */
export function looksLikeUntisLink(text: string): boolean {
  const t = text.trim()
  return /^(webcals?|https):\/\/\S+$/i.test(t) && /untis/i.test(t)
}

/** Ersatzweg, wenn der Browser den Abruf blockiert (CORS): Puter holt die Adresse über eine eigene Verbindung. Null, wenn das nicht geht. */
async function fetchViaPuter(url: string): Promise<string | null> {
  try {
    const mod = await import('@heyputer/puter.js')
    const net = (mod.puter as unknown as { net?: { fetch?: typeof fetch } }).net
    if (!net?.fetch) return null
    const res = await Promise.race([net.fetch(url, { headers: { Accept: 'text/calendar, text/plain, */*' } }), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))])
    if (!res.ok) return null
    const text = await res.text()
    return /BEGIN:VCALENDAR/i.test(text) ? text : null
  } catch {
    return null
  }
}

/** Ruft den iCal-Text ab: über das Relais, wenn eines eingetragen ist, sonst direkt. */
export async function fetchIcs(url: string, relay?: string, doFetch: typeof fetch = fetch): Promise<string> {
  const target = relay ? `${relay.replace(/\/+$/, '')}/?url=${encodeURIComponent(url)}` : url
  let res: Response
  try {
    res = await doFetch(target, { headers: { Accept: 'text/calendar, text/plain, */*' } })
  } catch {
    // Der Browser blockiert den Abruf oft (CORS): ohne eigenes Relais den Weg über Puter versuchen (nicht, wenn eine Abruffunktion vorgegeben ist, z. B. im Test)
    if (!relay && doFetch === fetch) {
      const viaPuter = await fetchViaPuter(url)
      if (viaPuter) return viaPuter
    }
    throw new UntisError(
      relay
        ? 'WebUntis oder das Relais ist gerade nicht erreichbar. Versuch es später nochmal oder lade die .ics-Datei.'
        : 'Dein Browser darf den Stundenplan nicht direkt von WebUntis holen. Lade stattdessen die .ics-Datei aus WebUntis (unter „Klappt nicht?“).',
      'network',
    )
  }
  if (!res.ok) throw new UntisError(res.status === 401 || res.status === 403 ? 'WebUntis lehnt den Link ab. Er ist abgelaufen oder falsch kopiert: Hol dir in WebUntis einen neuen.' : `WebUntis hat mit Fehler ${res.status} geantwortet.`, 'network')
  return res.text()
}

/** Klartext für die Anzeige: "vor 2 Std." usw. */
export function agoText(iso: string | undefined, now = new Date()): string {
  if (!iso) return 'noch nie'
  const min = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000))
  if (min < 2) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  if (min < 24 * 60) return `vor ${Math.round(min / 60)} Std.`
  return `vor ${Math.round(min / 1440)} Tagen`
}

/** Hat sich seit dem letzten Abgleich genug Zeit vergangen, dass die App im Hintergrund neu abgleichen soll? */
export const syncDue = (s: UntisState | null | undefined, now = new Date(), hours = 6): boolean => !!s?.url && (!s.lastSync || now.getTime() - new Date(s.lastSync).getTime() > hours * 3_600_000)

