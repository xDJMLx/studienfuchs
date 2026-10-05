import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDays, dateKey, fromMinutes, isoWeek, KINDS, monthName, slotOf, startOfWeek, toMinutes } from '../../lib/calendar'
import { breaksOf, periodAt, periodsOf, type Period } from '../../lib/school'
import type { UntisLesson } from '../../lib/untis'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'

/** Kurznamen für die schmalen Spalten (wie im Stundenplan). */
const SHORT: Record<string, string> = {
  franzoesisch: 'Franz',
  mathe: 'Mathe',
  deutsch: 'Deu',
  englisch: 'Engl',
  biologie: 'Bio',
  geschichte: 'Gesch',
  physik: 'Phy',
  chemie: 'Che',
  geografie: 'Geo',
  politik: 'Pol',
  informatik: 'Info',
  kunst: 'Kunst',
  musik: 'Musik',
  sonstiges: 'Sonst',
}
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOUR = 56
const kindShort = (a: Arbeit) => KINDS.find((k) => k.id === (a.kind ?? 'klassenarbeit'))?.short ?? 'Termin'

interface Placed {
  a: Arbeit
  start: number
  end: number
  lane: number
  lanes: number
}

/** Termine eines Tages nebeneinander legen, wenn sie sich zeitlich überlappen. */
function place(list: Arbeit[]): Placed[] {
  const items = list
    .map((a) => ({ a, slot: slotOf(a) }))
    .filter((x): x is { a: Arbeit; slot: { start: number; end: number } } => !!x.slot)
    .sort((x, y) => x.slot.start - y.slot.start || y.slot.end - x.slot.end)
  const out: Placed[] = []
  let group: Placed[] = []
  let groupEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1))
    for (const g of group) g.lanes = lanes
    out.push(...group)
    group = []
  }
  for (const { a, slot } of items) {
    if (group.length && slot.start >= groupEnd) flush()
    const used = new Set(group.filter((g) => g.end > slot.start).map((g) => g.lane))
    let lane = 0
    while (used.has(lane)) lane++
    group.push({ a, start: slot.start, end: slot.end, lane, lanes: 1 })
    groupEnd = Math.max(groupEnd, slot.end)
  }
  flush()
  return out
}

/**
 * Stundenplan-Kalender (wie WebUntis): Tage als Spalten, links die Uhrzeit, Arbeiten und Tests als farbige Blöcke
 * zur passenden Zeit. Ganztägige Termine stehen in der Zeile unter dem Tag. Ein Tipp auf eine freie Stelle trägt dort
 * etwas ein (mit der angetippten Uhrzeit), ein Tipp auf einen Block öffnet ihn. Wischen oder Pfeile wechseln die Woche.
 */
export function TimeTable({ arbeiten, periods = [], lessons = [], toolbar, onAdd, onOpen }: {
  /** Kleine Bedienung unter der Wochenzeile (z. B. Unterricht ein/aus) */
  toolbar?: ReactNode
  arbeiten: Arbeit[]; /** Schulstunden; leer = normale Uhrzeiten */ periods?: Period[]; /** Unterricht aus WebUntis (leise im Hintergrund) */ lessons?: UntisLesson[]; onAdd: (date: string, time?: string, duration?: number) => void; onOpen: (a: Arbeit) => void }) {
  // Am Wochenende zeigt der Plan gleich die kommende Woche (wie WebUntis)
  const home = [0, 6].includes(new Date().getDay()) ? 1 : 0
  const [offset, setOffset] = useState(home)
  const [dir, setDir] = useState(0)
  const reduce = useReducedMotion()
  const go = (to: number) => {
    setDir(Math.sign(to - offset))
    setOffset(to)
  }
  const [now, setNow] = useState(() => new Date())
  const touch = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const monday = useMemo(() => addDays(startOfWeek(now), offset * 7), [offset, now])
  const all = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i)
        return { key: dateKey(date), day: date.getDate(), weekday: WEEKDAYS[i], date }
      }),
    [monday],
  )
  const byKey = useMemo(() => {
    const m: Record<string, Arbeit[]> = {}
    for (const a of arbeiten) (m[a.date] ??= []).push(a)
    return m
  }, [arbeiten])
  // Mo bis Fr; Sa und So nur, wenn dort etwas steht
  const hasWeekend = all.slice(5).some((d) => (byKey[d.key] ?? []).length > 0 || d.key === dateKey(now))
  const days = hasWeekend ? all : all.slice(0, 5)
  const today = dateKey(now)

  const lessonsBy = useMemo(() => {
    const m: Record<string, UntisLesson[]> = {}
    for (const l of lessons) (m[l.date] ??= []).push(l)
    return m
  }, [lessons])
  const placed = useMemo(() => Object.fromEntries(days.map((d) => [d.key, place(byKey[d.key] ?? [])])), [days, byKey])
  const timed = [
    ...Object.values(placed).flat(),
    ...days.flatMap((d) => (lessonsBy[d.key] ?? []).map((l) => ({ start: toMinutes(l.start)!, end: toMinutes(l.end)! }))),
  ]
  // Mit Schulstunden reicht der Plan von der ersten bis zur letzten Stunde (und weiter, wenn ein Termin außerhalb liegt)
  const grid = periods.map((p) => ({ s: toMinutes(p.start)!, e: toMinutes(p.end)! }))
  const baseStart = grid.length ? grid[0].s : 8 * 60
  const baseEnd = grid.length ? grid[grid.length - 1].e : 15 * 60
  const axisStart = Math.min(baseStart, ...timed.map((p) => Math.floor(p.start / (grid.length ? 5 : 60)) * (grid.length ? 5 : 60)))
  const axisEnd = Math.max(baseEnd, ...timed.map((p) => Math.ceil(p.end / (grid.length ? 5 : 60)) * (grid.length ? 5 : 60)))
  const hours = grid.length ? [] : Array.from({ length: Math.ceil((axisEnd - axisStart) / 60) }, (_, i) => axisStart + i * 60)
  const gaps = grid.length ? breaksOf(periods) : []
  const height = ((axisEnd - axisStart) / 60) * HOUR
  const y = (min: number) => ((min - axisStart) / 60) * HOUR
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const isThisWeek = days.some((d) => d.key === today)
  const cols = `2.6rem repeat(${days.length}, minmax(0, 1fr))`

  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current
    touch.current = null
    const end = e.changedTouches[0]
    if (!t || !end) return
    const dx = end.clientX - t.x
    const dy = end.clientY - t.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) go(offset + (dx < 0 ? 1 : -1))
  }

  return (
    <section aria-label="Stundenplan" onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })} onTouchEnd={onTouchEnd}>
      <div className="mb-3 flex items-end justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 className="truncate text-[22px] font-bold leading-tight tracking-tight">{rangeTitle(monday)}</h2>
          <p className="text-[13px] font-medium text-muted">Kalenderwoche {isoWeek(monday)}</p>
        </div>
        <span className="flex items-center gap-2">
          {offset !== home && (
            <button type="button" onClick={() => go(home)} className="press px-1 text-[15px] font-semibold text-sky-dark">
              Heute
            </button>
          )}
          <span className="flex items-center rounded-full bg-snow">
            <button type="button" aria-label="Vorige Woche" onClick={() => go(offset - 1)} className="press flex h-9 w-10 items-center justify-center rounded-l-full text-xl text-muted">
              ‹
            </button>
            <span className="h-4 w-px bg-ink/10" aria-hidden />
            <button type="button" aria-label="Nächste Woche" onClick={() => go(offset + 1)} className="press flex h-9 w-10 items-center justify-center rounded-r-full text-xl text-muted">
              ›
            </button>
          </span>
        </span>
      </div>
      {toolbar}

      {/* Beim Wechsel der Woche schiebt sich der Plan in Wischrichtung herein */}
      <motion.div
        key={offset}
        className="overflow-hidden rounded-2xl border border-ink/10 bg-surface"
        initial={reduce || dir === 0 ? false : { x: dir * 36, opacity: 0.3 }}
        animate={{ x: 0, opacity: 1, transitionEnd: { transform: 'none' } }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {/* Kopf: Wochentag und Datum */}
        <div className="grid border-b border-ink/10" style={{ gridTemplateColumns: cols }}>
          <span />
          {days.map((d) => {
            const isToday = d.key === today
            return (
              <div key={d.key} className="flex flex-col items-center gap-0.5 py-2">
                <span className={`text-[11px] font-medium ${isToday ? 'text-brand-dark' : 'text-muted'}`}>{d.weekday}</span>
                <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[16px] font-semibold tabular-nums ${isToday ? 'bg-brand-strong text-on-brand' : ''}`}>{d.day}</span>
              </div>
            )
          })}
        </div>

        {/* Ganztägig */}
        <div className="grid border-b border-ink/10" style={{ gridTemplateColumns: cols }}>
          <span className="flex items-center justify-center text-[9px] font-medium leading-tight text-muted">ganz-<br />tägig</span>
          {days.map((d) => {
            const list = (byKey[d.key] ?? []).filter((a) => !slotOf(a))
            return (
              <div key={d.key} className="relative flex min-h-[2.2rem] flex-col gap-0.5 border-l border-ink/[0.07] p-0.5">
                <button type="button" onClick={() => onAdd(d.key)} aria-label={`Am ${d.weekday}, ${d.day}. ganztägig eintragen`} className="absolute inset-0" />
                {list.map((a) => (
                  <Block key={a.id} a={a} periods={periods} onOpen={onOpen} compact />
                ))}
              </div>
            )
          })}
        </div>

        {/* Zeitraster */}
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="relative" style={{ height }}>
            {hours.map((h) => (
              <span key={h} className={`absolute right-1 text-[10px] font-medium tabular-nums text-muted ${h === axisStart ? '' : '-translate-y-1/2'}`} style={{ top: ((h - axisStart) / 60) * HOUR + (h === axisStart ? 3 : 1) }}>
                {fromMinutes(h)}
              </span>
            ))}
            {grid.map((g, i) => (
              <span key={i} className="absolute inset-x-0 flex flex-col items-center justify-center leading-none" style={{ top: y(g.s), height: y(g.e) - y(g.s) }}>
                <span className="text-[14px] font-semibold text-ink/80">{i + 1}</span>
                <span className="mt-0.5 text-[9px] font-medium tabular-nums text-muted">{fromMinutes(g.s)}</span>
              </span>
            ))}
          </div>
          {days.map((d) => {
            const isToday = d.key === today
            return (
              <div key={d.key} className={`relative border-l border-ink/[0.07] ${isToday ? 'bg-brand/[0.045]' : ''}`} style={{ height }}>
                {hours.map((h) => (
                  <span key={h} className="pointer-events-none absolute inset-x-0 border-t border-ink/[0.07]" style={{ top: ((h - axisStart) / 60) * HOUR }} />
                ))}
                {gaps.map((b) => (
                  <span key={b.after} className="pointer-events-none absolute inset-x-0 bg-ink/[0.035]" style={{ top: y(b.start), height: y(b.end) - y(b.start) }} />
                ))}
                {grid.map((g, i) => (
                  <span key={i} className="pointer-events-none absolute inset-x-0 border-t border-ink/[0.07]" style={{ top: y(g.s) }} />
                ))}
                <button
                  type="button"
                  aria-label={`Am ${d.weekday}, ${d.day}. eintragen`}
                  className="absolute inset-0"
                  onClick={(e) => {
                    // Mit Maus oder Finger: Stunde bzw. Uhrzeit der angetippten Stelle (auf 15 Minuten gerundet); per Tastatur ohne Uhrzeit
                    if (e.detail === 0) return onAdd(d.key)
                    const rect = e.currentTarget.getBoundingClientRect()
                    const raw = axisStart + ((e.clientY - rect.top) / HOUR) * 60
                    if (grid.length) {
                      const g = grid[Math.max(0, periodAt(periods, raw))]
                      return onAdd(d.key, fromMinutes(g.s), g.e - g.s)
                    }
                    const snapped = Math.max(axisStart, Math.min(axisEnd - 15, Math.round(raw / 15) * 15))
                    onAdd(d.key, fromMinutes(snapped))
                  }}
                />
                {(lessonsBy[d.key] ?? []).map((l) => (
                  <LessonBlock key={l.id} l={l} top={y(toMinutes(l.start)!)} height={y(toMinutes(l.end)!) - y(toMinutes(l.start)!)} />
                ))}
                {placed[d.key].map((p, bi) => (
                  <div
                    key={p.a.id}
                    className="block-in absolute px-px"
                    style={{ animationDelay: `${bi * 60 + days.findIndex((x) => x.key === d.key) * 40}ms`, top: ((p.start - axisStart) / 60) * HOUR + 1, height: Math.max(30, ((p.end - p.start) / 60) * HOUR - 2), left: `${(p.lane / p.lanes) * 100}%`, width: `${100 / p.lanes}%` }}
                  >
                    <Block a={p.a} periods={periods} onOpen={onOpen} size={((p.end - p.start) / 60) * HOUR} />
                  </div>
                ))}
                {isToday && isThisWeek && nowMin >= axisStart && nowMin <= axisEnd && (
                  <span className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMin - axisStart) / 60) * HOUR }} aria-hidden>
                    <span className="-ml-1 h-2 w-2 rounded-full bg-bad" />
                    <span className="h-px flex-1 bg-bad" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}

/** "5.–11. Oktober 2026" bzw. "28. Sept. – 4. Okt." über die Wochengrenze. */
function rangeTitle(monday: Date): string {
  const sunday = addDays(monday, 6)
  const m = (d: Date) => monthName(d.getMonth())
  return monday.getMonth() === sunday.getMonth() ? `${monday.getDate()}.–${sunday.getDate()}. ${m(sunday)}` : `${monday.getDate()}. ${m(monday).slice(0, 3)}. – ${sunday.getDate()}. ${m(sunday).slice(0, 3)}.`
}

/** Eine Arbeit oder ein Test: flache Fläche in der Fachfarbe, weiße Schrift, keine Rahmen und Schatten. */
function Block({ a, periods, onOpen, compact = false, size = 100 }: { a: Arbeit; periods: Period[]; onOpen: (a: Arbeit) => void; compact?: boolean; /** Höhe des Blocks in px: bestimmt, wie viele Zeilen hineinpassen */ size?: number }) {
  const s = helpSubject(a.subject)
  const slot = slotOf(a)
  const pr = periodsOf(periods, a)
  const when = pr ? (pr.from === pr.to ? `${pr.from + 1}. Std.` : `${pr.from + 1}.–${pr.to + 1}.`) : slot ? fromMinutes(slot.start) : ''
  return (
    <button
      type="button"
      onClick={() => onOpen(a)}
      aria-label={`${a.title}, ${kindShort(a)}${pr ? `, ${pr.from === pr.to ? `${pr.from + 1}. Stunde` : `${pr.from + 1}. bis ${pr.to + 1}. Stunde`}` : slot ? `, ${fromMinutes(slot.start)} Uhr` : ''}`}
      className={`press relative z-[1] flex w-full flex-col items-start justify-start overflow-hidden rounded-lg px-1.5 text-left text-white shadow-[0_1px_2px_rgba(0,0,0,0.14)] ${compact ? 'gap-0 py-1' : 'h-full gap-px py-1.5'}`}
      style={{ background: s?.c ?? '#868a95', opacity: a.done ? 0.5 : 1 }}
    >
      <span className="w-full truncate text-[11px] font-semibold leading-tight">{SHORT[a.subject] ?? s?.name}</span>
      {(size >= 38 || compact) && <span className="w-full truncate text-[10px] font-medium leading-tight opacity-90">{kindShort(a)}</span>}
      {slot && !compact && size >= 64 && <span className="mt-auto w-full truncate text-[9px] font-medium leading-none opacity-85">{when}</span>}
    </button>
  )
}

/** Normaler Unterricht aus WebUntis: ganz zurückhaltend, nur eine zarte Tönung mit dem Fachnamen, damit die Arbeiten auffallen. */
function LessonBlock({ l, top, height }: { l: UntisLesson; top: number; height: number }) {
  const sub = helpSubject(l.subject ?? '')
  const c = sub?.c ?? '#868a95'
  return (
    <div
      className="pointer-events-none absolute inset-x-px flex items-start overflow-hidden rounded-md px-1.5 py-1 leading-tight"
      style={{ top: top + 1, height: Math.max(18, height - 2), background: `color-mix(in srgb, ${c} 11%, var(--surface))`, color: `color-mix(in srgb, ${c} 70%, var(--ink))`, opacity: l.cancelled ? 0.45 : 1 }}
      title={`${l.name}${l.room ? `, Raum ${l.room}` : ''}${l.cancelled ? ' (entfällt)' : ''}`}
    >
      <span className={`block truncate text-[10.5px] font-medium ${l.cancelled ? 'line-through' : ''}`}>{SHORT[l.subject ?? ''] ?? l.name}</span>
    </div>
  )
}
