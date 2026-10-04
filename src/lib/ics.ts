/** Ein Termin aus einer iCal-Datei (.ics), mit Datum und Uhrzeit in der Ortszeit des Geräts. */
export interface IcsEvent {
  uid: string
  summary: string
  description: string
  location: string
  categories: string
  /** YYYY-MM-DD (Ortszeit) */
  date: string
  /** Minuten seit Mitternacht; null bei ganztägigen Terminen */
  start: number | null
  end: number | null
  allDay: boolean
  cancelled: boolean
}

/** Zeilen, die mit Leerzeichen oder Tab weitergehen, gehören zur Zeile davor (RFC 5545, 3.1). */
export function unfold(text: string): string[] {
  const out: string[] = []
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && out.length) out[out.length - 1] += raw.slice(1)
    else out.push(raw)
  }
  return out
}

const unescapeText = (v: string): string => v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')

interface Prop {
  name: string
  params: Record<string, string>
  value: string
}

function parseProp(line: string): Prop | null {
  const colon = line.indexOf(':')
  if (colon < 1) return null
  const head = line.slice(0, colon).split(';')
  const params: Record<string, string> = {}
  for (const p of head.slice(1)) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1)
  }
  return { name: head[0].toUpperCase(), params, value: line.slice(colon + 1) }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "20261005T080000Z", "20261005T080000" oder "20261005" → Datum und Minuten in Ortszeit. */
function parseWhen(p: Prop): { date: string; minutes: number | null } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(p.value.trim())
  if (!m) return null
  const [, y, mo, d, h, mi, , z] = m
  if (h === undefined || p.params.VALUE === 'DATE') return { date: `${y}-${mo}-${d}`, minutes: null }
  if (z) {
    // UTC → Ortszeit des Geräts
    const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)))
    return { date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, minutes: dt.getHours() * 60 + dt.getMinutes() }
  }
  // Mit Zeitzonenangabe (TZID) oder ohne: Die Uhrzeit gilt als Wanduhrzeit der Schule, so wie sie im Stundenplan steht
  return { date: `${y}-${mo}-${d}`, minutes: Number(h) * 60 + Number(mi) }
}

/** Liest alle Termine (VEVENT) aus einer iCal-Datei. Wiederholungen werden nicht aufgelöst: Stundenplan-Exporte listen jede Stunde einzeln. */
export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = []
  let cur: Record<string, Prop> | null = null
  for (const line of unfold(text)) {
    const t = line.trim()
    if (t === 'BEGIN:VEVENT') {
      cur = {}
      continue
    }
    if (t === 'END:VEVENT') {
      if (cur) {
        const s = cur.DTSTART ? parseWhen(cur.DTSTART) : null
        if (s) {
          const e = cur.DTEND ? parseWhen(cur.DTEND) : null
          const allDay = s.minutes === null
          // Endet ein Termin nach Mitternacht, zählt er bis 24 Uhr
          const end = allDay ? null : e && e.date === s.date && e.minutes !== null ? e.minutes : e && e.date > s.date ? 24 * 60 : s.minutes! + 45
          events.push({
            uid: cur.UID?.value.trim() || `${s.date}-${s.minutes}-${cur.SUMMARY?.value ?? ''}`,
            summary: unescapeText(cur.SUMMARY?.value ?? '').trim(),
            description: unescapeText(cur.DESCRIPTION?.value ?? '').trim(),
            location: unescapeText(cur.LOCATION?.value ?? '').trim(),
            categories: unescapeText(cur.CATEGORIES?.value ?? '').trim(),
            date: s.date,
            start: s.minutes,
            end,
            allDay,
            cancelled: /^CANCELLED$/i.test(cur.STATUS?.value.trim() ?? ''),
          })
        }
      }
      cur = null
      continue
    }
    if (!cur) continue
    const prop = parseProp(line)
    if (prop && !(prop.name in cur)) cur[prop.name] = prop
  }
  return events
}
