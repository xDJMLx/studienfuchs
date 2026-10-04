import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Plus, Repeat, Right } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { activeDecks, cardRefs, daysUntil, planToday, readiness, SESSION_SIZE } from '../../lib/decks'
import { isDue } from '../../lib/srs'
import { helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { ArbeitSheet } from '../faecher/ArbeitSheet'
import { TodayStrip } from '../path/TodayCard'
import { BlitzCard } from '../practice/BlitzCard'
import { dueLabel } from '../review/ReviewPage'

const when = (days: number) => (days === 0 ? 'Heute' : days === 1 ? 'Morgen' : `in ${days} Tagen`)

/** Üben: Hier startet jeder Tag. Alle fälligen Karten aus allen Fächern, dazu neue, und die Arbeiten, die anstehen. */
export function UebenPage() {
  const navigate = useNavigate()
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const arbeiten = useStore((s) => s.arbeiten)
  const cards = useStore((s) => s.cards)
  const [sheet, setSheet] = useState(false)

  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const plan = useMemo(() => planToday(decks, arbeiten ?? [], cards), [decks, arbeiten, cards])
  const refs = useMemo(() => cardRefs(decks), [decks])
  const upcoming = useMemo(
    () =>
      (arbeiten ?? [])
        .map((a) => ({ a, days: daysUntil(a), r: readiness(a, decks, cards) }))
        .filter((x) => x.days >= 0)
        .sort((x, y) => x.days - y.days),
    [arbeiten, decks, cards],
  )

  const roundSize = Math.min(SESSION_SIZE, plan.due.length + plan.fresh.length)
  const total = plan.due.length + plan.fresh.length
  // Wie sich die Runde auf die Fächer verteilt
  const bySubject = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of [...plan.due, ...plan.fresh].slice(0, Math.max(roundSize, 1))) m.set(r.deck.subject, (m.get(r.deck.subject) ?? 0) + 1)
    return [...m.entries()]
  }, [plan, roundSize])
  const nextDue = useMemo(() => {
    const future = refs.map((r) => cards[r.item.id]).filter((c) => c && !isDue(c)).map((c) => new Date(c.due).getTime())
    return future.length ? new Date(Math.min(...future)) : null
  }, [refs, cards])

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-5 lg:py-8" stagger={0.06}>
      <div className="xl:hidden">
        <TodayStrip hideDue />
      </div>

      <Item>
        {decks.length === 0 ? (
          <section className="card mb-5 flex flex-col items-center p-6 text-center">
            <Mascot size={96} mood="happy" alive />
            <h1 className="mt-2 text-[24px] font-black leading-tight">Was willst du üben?</h1>
            <p className="mt-1 max-w-sm text-muted">Erstelle einen Stapel Karteikarten zu einem Fach, zum Beispiel für die nächste Arbeit. Du schreibst, was du brauchst, und die Karten sind in Sekunden da.</p>
            <Link to="/faecher" className="btn btn-primary btn-shine press mt-4 w-full sm:w-64">
              Stapel erstellen
            </Link>
          </section>
        ) : total > 0 ? (
          <section className="mb-5 rounded-[22px] bg-brand-strong p-5 text-on-brand" style={{ boxShadow: '0 5px 0 var(--shade-brand)' }} aria-label="Heute">
            <h1 className="text-[26px] font-black leading-tight">Heute dran</h1>
            <p className="mt-1 text-[15px] font-bold opacity-95">
              {plan.due.length > 0 && <>{plan.due.length} {plan.due.length === 1 ? 'Karte ist' : 'Karten sind'} fällig</>}
              {plan.due.length > 0 && plan.fresh.length > 0 && ', '}
              {plan.fresh.length > 0 && <>{plan.fresh.length} {plan.fresh.length === 1 ? 'neue Karte' : 'neue Karten'}</>}
            </p>
            {bySubject.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Fächer in dieser Runde">
                {bySubject.map(([id, n]) => {
                  const s = helpSubject(id)
                  return (
                    <li key={id} className="flex items-center gap-1.5 rounded-full bg-white/20 py-1 pl-1 pr-3 text-[13px] font-extrabold">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: s?.c ?? '#868a95' }}>
                        <HelpSubjectIcon id={id} ink={s?.c ?? '#868a95'} size={15} />
                      </span>
                      {s?.name ?? id} {n}
                    </li>
                  )
                })}
              </ul>
            )}
            <button type="button" className="btn press mt-4 w-full bg-white text-brand-dark sm:w-64" style={{ '--edge': 'rgba(0,0,0,0.18)' } as React.CSSProperties} onClick={() => navigate('/ueben/los')} autoFocus>
              Los geht’s ({roundSize})
            </button>
            {total > SESSION_SIZE && <p className="mt-2 text-xs font-bold opacity-90">In Runden zu {SESSION_SIZE}: Danach kannst du direkt weitermachen.</p>}
          </section>
        ) : (
          <section className="card mb-5 flex items-center gap-4 p-5">
            <Mascot size={78} mood="cheer" alive />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-black leading-tight">Für heute alles geschafft</h1>
              <p className="mt-0.5 text-sm text-muted">{nextDue ? `Die nächste Karte ist ${dueLabel(nextDue)} dran. ` : ''}Du kannst trotzdem noch üben oder neue Karten erstellen.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost press !min-h-10 !px-4 !text-sm" onClick={() => navigate('/ueben/los')}>
                  Trotzdem üben
                </button>
                <Link to="/faecher" className="btn btn-ghost press !min-h-10 !px-4 !text-sm">
                  Neuer Stapel
                </Link>
              </div>
            </div>
          </section>
        )}
      </Item>

      <Item>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Arbeiten</h2>
          <button type="button" className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft" onClick={() => setSheet(true)}>
            <Plus size={16} /> Arbeit eintragen
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="mb-5 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">Steht eine Arbeit an? Trag sie mit Datum ein: Die App verteilt dann die Karten auf die Tage und zeigt dir, wie gut alles sitzt.</p>
        ) : (
          <ul className="mb-5 grid gap-3">
            {upcoming.slice(0, 4).map(({ a, days, r }) => {
              const s = helpSubject(a.subject)
              return (
                <li key={a.id} className="card flex items-center gap-3 p-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: s?.c, boxShadow: `0 3px 0 ${s?.s}` }}>
                    <HelpSubjectIcon id={a.subject} ink={s?.c ?? '#888'} size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold leading-tight">{a.title}</p>
                    <p className={`text-sm font-bold ${days <= 2 ? 'text-bad-dark' : 'text-muted'}`}>{when(days)}</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.pct} Prozent sitzen`}>
                      <div className="h-full rounded-full bg-good transition-[width] duration-500" style={{ width: `${Math.max(r.pct, r.seen ? 4 : 0)}%` }} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{r.solid} von {r.total} Karten sitzen</p>
                  </div>
                  <button type="button" className="btn btn-primary press !min-h-10 !px-4 !text-sm" onClick={() => navigate(`/ueben/los?arbeit=${a.id}`)} disabled={r.total === 0}>
                    Lernen
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Item>

      {decks.length > 0 && <FreePractice />}

      <Item>
        <BlitzCard />
      </Item>

      <Item>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/review" className="card press flex items-center gap-3 p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-soft text-sky-dark"><Repeat size={22} /></span>
            <span className="min-w-0 font-extrabold leading-tight">Lernstand</span>
            <Right size={14} className="ml-auto text-muted" />
          </Link>
          <Link to="/faecher" className="card press flex items-center gap-3 p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Plus size={22} /></span>
            <span className="min-w-0 font-extrabold leading-tight">Neuer Stapel</span>
            <Right size={14} className="ml-auto text-muted" />
          </Link>
        </div>
      </Item>

      <ArbeitSheet open={sheet} onClose={() => setSheet(false)} />
    </Stagger>
  )
}

/** Frei üben: ein Fach oder einen Stapel wählen, dazu die Aufgabenart. */
function FreePractice() {
  const navigate = useNavigate()
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const subjects = useMemo(() => [...new Set(decks.map((d) => d.subject))], [decks])
  const [scope, setScope] = useState('')
  const [mode, setMode] = useState<'mix' | 'flip' | 'type'>('mix')
  const subjectDecks = scope.startsWith('fach:') ? decks.filter((d) => d.subject === scope.slice(5)) : decks
  const count = cardRefs(scope.startsWith('deck:') ? decks.filter((d) => d.id === scope.slice(5)) : subjectDecks).length

  const go = () => {
    const q = new URLSearchParams()
    if (scope.startsWith('fach:')) q.set('fach', scope.slice(5))
    else if (scope.startsWith('deck:')) q.set('deck', scope.slice(5))
    q.set('modus', mode)
    navigate(`/ueben/los?${q.toString()}`)
  }

  const modes = [
    { id: 'mix' as const, label: 'Gemischt', text: 'Auswahl, Tippen und Karten im Wechsel' },
    { id: 'flip' as const, label: 'Karteikarten', text: 'Umdrehen und selbst bewerten' },
    { id: 'type' as const, label: 'Tippen', text: 'Antworten aus dem Gedächtnis' },
  ]
  return (
    <Item>
      <h2 className="mb-1 text-lg font-extrabold">Frei üben</h2>
      <p className="mb-3 text-sm text-muted">Such dir aus, was du trainieren willst.</p>
      <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Was üben?">
        <button role="radio" aria-checked={scope === ''} onClick={() => setScope('')} className={`chip ${scope === '' ? 'chip-on' : ''}`}>Alles</button>
        {subjects.map((id) => (
          <button key={id} role="radio" aria-checked={scope === `fach:${id}`} onClick={() => setScope(`fach:${id}`)} className={`chip ${scope === `fach:${id}` ? 'chip-on' : ''}`}>
            {helpSubject(id)?.name ?? id}
          </button>
        ))}
        <select
          aria-label="Stapel wählen"
          value={scope.startsWith('deck:') ? scope : ''}
          onChange={(e) => e.target.value && setScope(e.target.value)}
          className={`rounded-xl border px-3 py-2.5 text-sm font-medium outline-none ${scope.startsWith('deck:') ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-surface text-muted'}`}
        >
          <option value="">Ein Stapel …</option>
          {decks.map((d) => (
            <option key={d.id} value={`deck:${d.id}`}>{helpSubject(d.subject)?.name}: {d.title}</option>
          ))}
        </select>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Aufgabenart">
        {modes.map((m) => (
          <button key={m.id} role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={`tile !block !px-3 !py-2.5 text-center ${mode === m.id ? 'tile-selected' : ''}`}>
            <span className="block text-[15px] font-extrabold">{m.label}</span>
            <span className="mt-0.5 block text-[11px] font-medium leading-tight opacity-75">{m.text}</span>
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary press mb-6 w-full sm:w-64" disabled={count === 0} onClick={go}>
        Üben ({count} Karten)
      </button>
    </Item>
  )
}
