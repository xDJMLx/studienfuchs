import { fromMinutes, slotOf, toMinutes } from './calendar'
import type { Arbeit } from './types'

/** Eine Schulstunde: Beginn und Ende als Uhrzeit (HH:MM). Die Lücken dazwischen sind die Pausen. */
export interface Period {
  start: string
  end: string
}

/** Beispiel für den Start (45-Minuten-Stunden); jede Schule hat eigene Zeiten, deshalb trägt man sie beim Einrichten ein. */
export const EXAMPLE_PERIODS: Period[] = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '11:50', end: '12:35' },
  { start: '12:45', end: '13:30' },
  { start: '13:40', end: '14:25' },
]

/**
 * Reihenfolge, gültige Zeiten, Ende nach Beginn, keine Überschneidung: sonst fliegt die Zeile raus.
 * Stunden sind danach 1, 2, 3 … in zeitlicher Reihenfolge.
 */
export function cleanPeriods(list: Period[]): Period[] {
  const ok = list
    .map((p) => ({ s: toMinutes(p.start), e: toMinutes(p.end) }))
    .filter((p): p is { s: number; e: number } => p.s !== null && p.e !== null && p.e > p.s)
    .sort((a, b) => a.s - b.s)
  const out: { s: number; e: number }[] = []
  for (const p of ok) if (!out.length || p.s >= out[out.length - 1].e) out.push(p)
  return out.map((p) => ({ start: fromMinutes(p.s), end: fromMinutes(p.e) }))
}

/** Die Pausen zwischen den Stunden: nach Stunde i (0-basiert) dauert die Pause so viele Minuten. */
export function breaksOf(periods: Period[]): { after: number; start: number; end: number; minutes: number }[] {
  const out: { after: number; start: number; end: number; minutes: number }[] = []
  for (let i = 0; i < periods.length - 1; i++) {
    const end = toMinutes(periods[i].end)!
    const next = toMinutes(periods[i + 1].start)!
    if (next > end) out.push({ after: i, start: end, end: next, minutes: next - end })
  }
  return out
}

/** Index (0-basiert) der Stunde, in die eine Uhrzeit fällt; liegt sie in einer Pause, die nächste Stunde; danach die letzte. */
export function periodAt(periods: Period[], minutes: number): number {
  if (!periods.length) return -1
  const i = periods.findIndex((p) => minutes < toMinutes(p.end)!)
  return i === -1 ? periods.length - 1 : i
}

/**
 * Von welcher bis welcher Stunde (0-basiert) ein Termin reicht. Beginn und Ende müssen zum Raster passen (5 Minuten Spielraum);
 * sonst ist es eine freie Uhrzeit und die Funktion gibt null zurück, genauso bei ganztägigen Terminen.
 */
export function periodsOf(periods: Period[], a: Arbeit): { from: number; to: number } | null {
  const slot = slotOf(a)
  if (!slot || !periods.length) return null
  const near = (x: number, y: number) => Math.abs(x - y) <= 5
  const from = periods.findIndex((p) => near(toMinutes(p.start)!, slot.start))
  if (from === -1) return null
  let to = -1
  for (let i = from; i < periods.length; i++) if (near(toMinutes(periods[i].end)!, slot.end)) to = i
  return to === -1 ? null : { from, to }
}

/** Beginn und Dauer für die Stunden von bis (0-basiert, beide eingeschlossen). */
export function slotForPeriods(periods: Period[], from: number, to: number): { time: string; duration: number } {
  const a = Math.max(0, Math.min(from, periods.length - 1))
  const b = Math.max(a, Math.min(to, periods.length - 1))
  const start = toMinutes(periods[a].start)!
  return { time: periods[a].start, duration: toMinutes(periods[b].end)! - start }
}

/** "3. Std." oder "3.–4. Std."; null, wenn kein Raster da ist oder der Termin nicht dazu passt. */
export function stundenText(periods: Period[], a: Arbeit): string | null {
  const r = periodsOf(periods, a)
  if (!r) return null
  return r.from === r.to ? `${r.from + 1}. Std.` : `${r.from + 1}.–${r.to + 1}. Std.`
}

/** Für Listen: "3. Std." wenn das Raster passt, sonst die Uhrzeit "09:00–09:45", sonst null (ganztägig). */
export function whenText(periods: Period[], a: Arbeit): string | null {
  const s = stundenText(periods, a)
  if (s) return s
  const slot = slotOf(a)
  return slot ? `${fromMinutes(slot.start)}–${fromMinutes(slot.end)}` : null
}
