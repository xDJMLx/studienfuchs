import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Back, Coin, Plus } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { dateKey, kindLabel, needsFollowUp, shortDay } from '../../lib/calendar'
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

/** Wochenplan: Arbeiten, Tests und andere Termine auf einen Blick, wie in einer Stundenplan-App. */
export function KalenderPage() {
  const arbeiten = useStore((s) => s.arbeiten) ?? []
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const cards = useStore((s) => s.cards)
  const today = dateKey(new Date())
  const [sheet, setSheet] = useState<{ arbeit?: Arbeit; date?: string } | null>(null)

  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const followUps = arbeiten.filter((a) => needsFollowUp(a, today))
  const upcoming = useMemo(() => arbeiten.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [arbeiten, today])
  const past = useMemo(() => arbeiten.filter((a) => a.date < today && a.done).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [arbeiten, today])

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
              {kindLabel(a.kind)} · {shortDay(a.date)} · {when(d)}
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
          <h1 className="page-title">Wochenplan</h1>
          <button type="button" className="btn btn-primary press !min-h-10 !px-4 !text-sm" onClick={() => setSheet({ date: today })}>
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
        <div className="mb-5">
          <WeekPlanner arbeiten={arbeiten} weeks={5} onAdd={(date) => setSheet({ date })} onOpen={(a) => setSheet({ arbeit: a })} />
        </div>
      </Item>

      {upcoming.length > 0 && (
        <Item>
          <h2 className="mb-2 text-lg font-extrabold">Demnächst</h2>
          <ul className="mb-5 grid gap-2.5">{upcoming.slice(0, 8).map(row)}</ul>
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

      <ArbeitSheet open={!!sheet} onClose={() => setSheet(null)} arbeit={sheet?.arbeit} date={sheet?.date} />
    </Stagger>
  )
}
