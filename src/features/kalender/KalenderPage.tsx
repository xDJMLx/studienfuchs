import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Back, Coin, Plus } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { byDay, dateKey, kindLabel, longDay, monthGrid, monthName, needsFollowUp, shortDay } from '../../lib/calendar'
import { activeDecks, daysUntil, readiness } from '../../lib/decks'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'
import { ARBEIT_COINS, useStore } from '../../store/useStore'
import { ArbeitSheet } from '../faecher/ArbeitSheet'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
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

/** Kalender: Arbeiten, Tests und andere Termine auf einen Blick, Tag antippen zum Eintragen. */
export function KalenderPage() {
  const reduce = useReducedMotion()
  const arbeiten = useStore((s) => s.arbeiten) ?? []
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const cards = useStore((s) => s.cards)
  const today = dateKey(new Date())
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState(today)
  const [sheet, setSheet] = useState<{ arbeit?: Arbeit; date?: string } | null>(null)
  const [dir, setDir] = useState(0)

  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const days = useMemo(() => byDay(arbeiten), [arbeiten])
  const grid = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor])
  const followUps = arbeiten.filter((a) => needsFollowUp(a, today))
  const upcoming = useMemo(() => arbeiten.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [arbeiten, today])
  const past = useMemo(() => arbeiten.filter((a) => a.date < today && a.done).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [arbeiten, today])
  const onDay = days[selected] ?? []

  const move = (delta: number) => {
    setDir(delta)
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }
  const goToday = () => {
    setCursor({ y: now.getFullYear(), m: now.getMonth() })
    setSelected(today)
  }

  const row = (a: Arbeit) => {
    const s = helpSubject(a.subject)
    const r = readiness(a, decks, cards)
    const d = daysUntil(a)
    return (
      <li key={a.id}>
        <button type="button" onClick={() => setSheet({ arbeit: a })} className="card press flex w-full items-center gap-3 p-3 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: s?.c, boxShadow: `0 3px 0 ${s?.s}` }}>
            <HelpSubjectIcon id={a.subject} ink={s?.c ?? '#888'} size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-extrabold leading-tight">{a.title}</span>
            <span className="block text-xs font-bold text-muted">
              {kindLabel(a.kind)} · {when(d)}
              {a.note ? ` · Note ${a.note}` : ''}
            </span>
            {d >= 0 && r.total > 0 && (
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-good" style={{ width: `${r.pct}%` }} />
              </span>
            )}
          </span>
          {d >= 0 && r.total > 0 && <span className="shrink-0 text-sm font-black tabular-nums text-good-dark">{r.pct} %</span>}
        </button>
      </li>
    )
  }

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-5 lg:py-8" stagger={0.06}>
      <Item>
        <Link to="/" className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
          <Back size={18} /> Üben
        </Link>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h1 className="page-title">Kalender</h1>
          <button type="button" className="btn btn-primary press !min-h-10 !px-4 !text-sm" onClick={() => setSheet({ date: selected >= today ? selected : today })}>
            <Plus size={16} /> Eintragen
          </button>
        </div>
      </Item>

      {followUps.map((a) => (
        <Item key={a.id}>
          <ArbeitFollowUp arbeit={a} />
        </Item>
      ))}

      <Item>
        <section className="card mb-5 overflow-hidden p-3" aria-label="Monatskalender">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Vorheriger Monat" onClick={() => move(-1)} className="press flex h-11 w-11 items-center justify-center rounded-xl text-xl font-black text-muted hover:bg-snow">
              ‹
            </button>
            <div className="text-center">
              <p className="text-[19px] font-black leading-tight">
                {monthName(cursor.m)} {cursor.y}
              </p>
              {(cursor.y !== now.getFullYear() || cursor.m !== now.getMonth()) && (
                <button type="button" onClick={goToday} className="text-xs font-extrabold text-sky-dark underline">
                  Zu heute
                </button>
              )}
            </div>
            <button type="button" aria-label="Nächster Monat" onClick={() => move(1)} className="press flex h-11 w-11 items-center justify-center rounded-xl text-xl font-black text-muted hover:bg-snow">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-extrabold uppercase tracking-wide text-muted" aria-hidden>
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">{w}</span>
            ))}
          </div>
          <motion.div key={`${cursor.y}-${cursor.m}`} initial={reduce ? false : { opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="grid grid-cols-7 gap-y-1" role="grid">
            {grid.map((c) => {
              const list = days[c.key] ?? []
              const isToday = c.key === today
              const isSel = c.key === selected
              return (
                <button
                  key={c.key}
                  type="button"
                  role="gridcell"
                  aria-selected={isSel}
                  aria-label={`${longDay(c.key)}${list.length ? `, ${list.length} Termin${list.length > 1 ? 'e' : ''}` : ''}`}
                  onClick={() => setSelected(c.key)}
                  className={`press relative mx-auto flex h-[3.1rem] w-[3.1rem] flex-col items-center justify-center rounded-2xl text-[15px] font-extrabold transition-colors ${
                    isSel ? 'bg-brand-strong text-on-brand' : isToday ? 'border-2 border-brand text-brand-dark' : c.inMonth ? 'hover:bg-snow' : 'text-muted/50 hover:bg-snow'
                  }`}
                >
                  {c.day}
                  {list.length > 0 && (
                    <span className="absolute bottom-1 flex gap-0.5" aria-hidden>
                      {list.slice(0, 3).map((a) => (
                        <span key={a.id} className="h-1.5 w-1.5 rounded-full" style={{ background: isSel ? '#fff' : (helpSubject(a.subject)?.c ?? '#888'), opacity: c.key < today ? 0.5 : 1 }} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </motion.div>
        </section>
      </Item>

      <Item>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">{selected === today ? 'Heute' : longDay(selected)}</h2>
          {selected >= today && (
            <button type="button" className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft" onClick={() => setSheet({ date: selected })}>
              <Plus size={16} /> Hier eintragen
            </button>
          )}
        </div>
        {onDay.length ? (
          <ul className="mb-5 grid gap-2.5">{onDay.map(row)}</ul>
        ) : (
          <p className="mb-5 rounded-2xl bg-snow p-4 text-sm text-muted">{selected < today ? 'An diesem Tag war nichts eingetragen.' : 'Nichts eingetragen. Tippe auf „Hier eintragen“, wenn an diesem Tag etwas ansteht.'}</p>
        )}
      </Item>

      {upcoming.length > 0 && (
        <Item>
          <h2 className="mb-2 text-lg font-extrabold">Demnächst</h2>
          <ul className="mb-5 grid gap-2.5">
            {upcoming.slice(0, 6).map((a) => (
              <li key={a.id} className="contents">
                {row(a)}
              </li>
            ))}
          </ul>
        </Item>
      )}

      {past.length > 0 && (
        <Item>
          <h2 className="mb-2 text-lg font-extrabold">Schon geschrieben</h2>
          <ul className="card mb-5 divide-y divide-line overflow-hidden">
            {past.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{a.title}</span>
                  <span className="block text-xs text-muted">{helpSubject(a.subject)?.name} · {shortDay(a.date)}</span>
                </span>
                {a.note ? <span className="shrink-0 rounded-lg bg-snow px-2.5 py-1 text-sm font-black">Note {a.note}</span> : <span className="shrink-0 text-xs text-muted">ohne Note</span>}
              </li>
            ))}
          </ul>
        </Item>
      )}

      <ArbeitSheet open={!!sheet} onClose={() => setSheet(null)} arbeit={sheet?.arbeit} date={sheet?.date} />
    </Stagger>
  )
}
