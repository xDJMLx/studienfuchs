import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Segmented } from '../../components/ui/controls'
import { Coin, Plus, Right } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { byDay, dateKey, kindLabel, longDay, monthGrid, monthName, needsFollowUp, parseKey, shortDay } from '../../lib/calendar'
import { activeDecks, daysUntil, readiness } from '../../lib/decks'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'
import { ARBEIT_COINS, useStore } from '../../store/useStore'
import { ArbeitSheet } from '../faecher/ArbeitSheet'
import { WeekPlanner } from './WeekPlanner'

const when = (days: number) => (days === 0 ? 'Heute' : days === 1 ? 'Morgen' : days > 1 ? `in ${days} Tagen` : days === -1 ? 'gestern' : `vor ${-days} Tagen`)

/** "Wie lief die Arbeit?": nach dem Termin eine Note eintragen (oder überspringen). Es gibt Münzen fürs Eintragen, egal welche Note. */
export function ArbeitFollowUp({ arbeit }: { arbeit: Arbeit }) {
  const finishArbeit = useStore((s) => s.finishArbeit)
  const [coins, setCoins] = useState<number | null>(null)
  const s = helpSubject(arbeit.subject)
  if (coins !== null)
    return (
      <p className="mb-3 flex items-center gap-2 rounded-2xl bg-gold/15 px-4 py-3 font-extrabold text-gold-dark" role="status">
        <Coin size={20} /> +{coins} Münzen. Gut, dass du dranbleibst!
      </p>
    )
  return (
    <section className="card mb-3 p-4" aria-label={`Wie lief ${arbeit.title}?`}>
      <div className="mb-2.5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: s?.c }}>
          <HelpSubjectIcon id={arbeit.subject} ink={s?.c ?? '#888'} size={22} />
        </span>
        <div className="min-w-0">
          <p className="font-extrabold leading-tight">Wie lief „{arbeit.title}“?</p>
          <p className="text-sm text-muted">Trag deine Note ein, dann bekommst du {ARBEIT_COINS} Münzen.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Note">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} type="button" className="btn btn-ghost press !min-h-11 !min-w-11 !px-0 text-lg" onClick={() => setCoins(finishArbeit(arbeit.id, n))}>
            {n}
          </button>
        ))}
        <button type="button" className="press rounded-xl px-3 text-sm font-extrabold text-muted hover:bg-snow" onClick={() => setCoins(finishArbeit(arbeit.id))}>
          Überspringen
        </button>
      </div>
    </section>
  )
}

const VIEW_KEY = 'studienfuchs-kalender-ansicht'
type View = 'monat' | 'woche'
const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'woche' ? 'woche' : 'monat'
  } catch {
    return 'monat'
  }
}

const WEEKDAY_HEAD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Tage zwischen zwei Datums-Schlüsseln (ohne Zeitzonenärger). */
function daysBetweenKeys(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86_400_000)
}

/**
 * Kalender: Arbeiten, Tests und andere Termine im Monat oder in der Woche.
 * Ein Tipp auf einen Tag zeigt, was da ansteht, und lässt dort etwas eintragen; das runde Plus oben trägt immer ein.
 */
export function KalenderPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const arbeiten = useStore((s) => s.arbeiten) ?? []
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const cards = useStore((s) => s.cards)
  const today = dateKey(new Date())
  const [view, setViewState] = useState<View>(readView)
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }))
  const [sheet, setSheet] = useState<{ arbeit?: Arbeit; date?: string } | null>(null)
  // Von anderen Seiten ("Steht eine Arbeit an?") mit ?neu=1 gleich das Eintragen öffnen
  const wantsNew = params.get('neu')
  useEffect(() => {
    if (wantsNew) setSheet({ date: dateKey(new Date()) })
  }, [wantsNew])

  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* Speicher nicht verfügbar */
    }
  }
  const closeSheet = () => {
    setSheet(null)
    if (params.get('neu')) setParams({}, { replace: true })
  }

  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const days = useMemo(() => byDay(arbeiten), [arbeiten])
  const followUps = arbeiten.filter((a) => needsFollowUp(a, today))
  const upcoming = useMemo(() => arbeiten.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [arbeiten, today])
  const past = useMemo(() => arbeiten.filter((a) => a.date < today && a.done).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [arbeiten, today])
  const grid = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor])
  const thisMonth = cursor.y === new Date().getFullYear() && cursor.m === new Date().getMonth()
  const step = (n: number) => setCursor((c) => ({ y: c.m + n < 0 ? c.y - 1 : c.m + n > 11 ? c.y + 1 : c.y, m: (c.m + n + 12) % 12 }))
  const goToday = () => {
    setCursor({ y: new Date().getFullYear(), m: new Date().getMonth() })
    setSelected(today)
  }

  const row = (a: Arbeit, opts: { showDay?: boolean } = {}) => {
    const s = helpSubject(a.subject)
    const r = readiness(a, decks, cards)
    const d = daysUntil(a)
    return (
      <li key={a.id}>
        <div className="card flex items-center gap-3 p-3" style={{ borderLeft: `5px solid ${s?.c ?? 'var(--line)'}` }}>
          <button type="button" onClick={() => setSheet({ arbeit: a })} className="press flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${a.title} bearbeiten`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: s?.c, boxShadow: `0 3px 0 ${s?.s}` }}>
              <HelpSubjectIcon id={a.subject} ink={s?.c ?? '#888'} size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold leading-tight">{a.title}</span>
              <span className="block text-xs font-bold text-muted">
                {kindLabel(a.kind)}
                {opts.showDay ? ` · ${shortDay(a.date)} · ${when(d)}` : ''}
              </span>
              {d >= 0 && r.total > 0 && (
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-good" style={{ width: `${Math.max(r.pct, r.seen ? 4 : 0)}%` }} />
                  </span>
                  <span className="text-xs font-black tabular-nums text-good-dark">{r.pct} %</span>
                </span>
              )}
              {d >= 0 && r.total === 0 && <span className="block text-xs text-muted">Noch keine Karteikarten dabei</span>}
            </span>
          </button>
          {d >= 0 && r.total > 0 && (
            <button type="button" className="btn btn-primary press !min-h-10 !px-4 !text-sm" onClick={() => navigate(`/ueben/los?arbeit=${a.id}`)}>
              Lernen
            </button>
          )}
        </div>
      </li>
    )
  }

  const dayEvents = days[selected] ?? []
  const next = upcoming.filter((a) => a.date !== selected || view === 'woche').slice(0, 6)

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-5 lg:py-8" stagger={0.06}>
      <Item>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="page-title">Kalender</h1>
          <button
            type="button"
            aria-label="Arbeit eintragen"
            className="press flex h-12 w-12 items-center justify-center rounded-full bg-sky text-white"
            style={{ boxShadow: '0 4px 0 var(--shade-sky)' }}
            onClick={() => setSheet({ date: view === 'monat' ? selected : today })}
          >
            <Plus size={24} />
          </button>
        </div>
        <Segmented<View>
          label="Ansicht"
          className="mb-4 w-full [&>button]:flex-1"
          value={view}
          onChange={setView}
          options={[
            { value: 'monat', label: 'Monat' },
            { value: 'woche', label: 'Woche' },
          ]}
        />
      </Item>

      {followUps.map((a) => (
        <Item key={a.id}>
          <ArbeitFollowUp arbeit={a} />
        </Item>
      ))}

      {view === 'monat' ? (
        <Item>
          <section className="card mb-5 p-3.5" aria-label={`${monthName(cursor.m)} ${cursor.y}`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="px-1 text-[20px] font-black leading-tight">
                {monthName(cursor.m)} <span className="font-bold text-muted">{cursor.y}</span>
              </h2>
              <span className="flex items-center gap-1">
                {!thisMonth && (
                  <button type="button" onClick={goToday} className="press mr-1 rounded-full bg-sky-soft px-3 py-1.5 text-xs font-extrabold text-sky-dark">
                    Heute
                  </button>
                )}
                <button type="button" aria-label="Voriger Monat" onClick={() => step(-1)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-snow text-muted">
                  <Right size={16} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button type="button" aria-label="Nächster Monat" onClick={() => step(1)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-snow text-muted">
                  <Right size={16} />
                </button>
              </span>
            </div>
            <div className="grid grid-cols-7 text-center" role="grid" aria-label="Tage">
              {WEEKDAY_HEAD.map((w) => (
                <span key={w} className="pb-1 text-[11px] font-extrabold uppercase tracking-wide text-muted" role="columnheader">
                  {w}
                </span>
              ))}
              {grid.map((c) => {
                const list = days[c.key] ?? []
                const isToday = c.key === today
                const on = c.key === selected
                const dots = list.slice(0, 3)
                return (
                  <div key={c.key} role="gridcell" className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setSelected(c.key)}
                      aria-pressed={on}
                      aria-label={`${longDay(c.key)}${list.length ? `, ${list.length} ${list.length === 1 ? 'Termin' : 'Termine'}` : ''}`}
                      className={`press flex h-[3.1rem] w-full max-w-[3.4rem] flex-col items-center justify-start gap-1 rounded-2xl pt-1.5 transition-colors ${on ? 'bg-sky-soft ring-2 ring-sky' : ''} ${c.inMonth ? '' : 'opacity-35'} ${c.key < today && !on ? 'opacity-70' : ''}`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-extrabold leading-none ${isToday ? 'bg-brand-strong text-on-brand' : ''}`}>{c.day}</span>
                      <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                        {dots.map((a) => (
                          <span key={a.id} className="block h-1.5 w-1.5 rounded-full" style={{ background: helpSubject(a.subject)?.c ?? '#868a95' }} />
                        ))}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-lg font-extrabold">{selected === today ? 'Heute' : longDay(selected)}</h2>
            <span className="text-sm font-bold text-muted">{selected === today ? longDay(selected) : when(daysBetweenKeys(today, selected))}</span>
          </div>
          {dayEvents.length > 0 ? (
            <ul className="mb-5 grid gap-2.5">{dayEvents.map((a) => row(a))}</ul>
          ) : (
            <button type="button" onClick={() => setSheet({ date: selected })} className="press mb-5 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-4 text-left text-muted hover:bg-snow">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-soft text-sky-dark">
                <Plus size={20} />
              </span>
              <span>
                <span className="block font-extrabold text-ink">Nichts geplant</span>
                <span className="block text-sm">Tippe hier, um für diesen Tag etwas einzutragen.</span>
              </span>
            </button>
          )}
        </Item>
      ) : (
        <Item>
          <div className="card mb-5 p-3">
            <WeekPlanner arbeiten={arbeiten} weeks={1} onAdd={(date) => setSheet({ date })} onOpen={(a) => setSheet({ arbeit: a })} />
          </div>
        </Item>
      )}

      {next.length > 0 && (
        <Item>
          <h2 className="mb-2 px-1 text-lg font-extrabold">Als Nächstes</h2>
          <ul className="mb-5 grid gap-2.5">{next.map((a) => row(a, { showDay: true }))}</ul>
        </Item>
      )}

      {upcoming.length === 0 && (
        <Item>
          <p className="mb-5 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">Steht eine Arbeit oder ein Test an? Trag ihn ein: Die App verteilt deine Karteikarten auf die Tage bis dahin und zeigt dir, wie gut alles sitzt.</p>
        </Item>
      )}

      {past.length > 0 && (
        <Item>
          <h2 className="mb-2 px-1 text-lg font-extrabold">Schon geschrieben</h2>
          <ul className="card mb-5 divide-y divide-line overflow-hidden">
            {past.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{a.title}</span>
                  <span className="block text-xs text-muted">
                    {helpSubject(a.subject)?.name} · {shortDay(a.date)}
                  </span>
                </span>
                {a.note ? <span className="shrink-0 rounded-lg bg-snow px-2.5 py-1 text-sm font-black">Note {a.note}</span> : <span className="shrink-0 text-xs text-muted">ohne Note</span>}
              </li>
            ))}
          </ul>
        </Item>
      )}

      <ArbeitSheet open={!!sheet} onClose={closeSheet} arbeit={sheet?.arbeit} date={sheet?.date} />
    </Stagger>
  )
}
