import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Plus, Repeat, Right } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { dateKey, kindLabel, needsFollowUp } from '../../lib/calendar'
import { activeDecks, cardRefs, daysUntil, planToday, readiness, SESSION_SIZE } from '../../lib/decks'
import { isDue } from '../../lib/srs'
import { helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { ArbeitSheet } from '../faecher/ArbeitSheet'
import { ArbeitFollowUp } from '../kalender/KalenderPage'
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
  const today = dateKey(new Date())
  const followUps = useMemo(() => (arbeiten ?? []).filter((a) => needsFollowUp(a, today)).slice(0, 1), [arbeiten, today])
  const upcoming = useMemo(
    () =>
      (arbeiten ?? [])
        .map((a) => ({ a, days: daysUntil(a), r: readiness(a, decks, cards) }))
        .filter((x) => x.days >= 0)
        .sort((x, y) => x.days - y.days),
    [arbeiten, decks, cards],
  )

  const total = plan.due.length + plan.fresh.length
  const roundSize = Math.min(SESSION_SIZE, total)
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

      {followUps.map((a) => (
        <Item key={a.id}>
          <ArbeitFollowUp arbeit={a} />
        </Item>
      ))}

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
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Arbeiten</h2>
          <span className="flex items-center gap-1">
            <Link to="/kalender" className="press flex min-h-9 items-center rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft">
              Kalender
            </Link>
            <button type="button" className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft" onClick={() => setSheet(true)}>
              <Plus size={16} /> Eintragen
            </button>
          </span>
        </div>
        {upcoming.length === 0 ? (
          <button type="button" onClick={() => setSheet(true)} className="card press mb-5 flex w-full items-center gap-3 border-dashed p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-soft text-sky-dark"><Plus size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Steht eine Arbeit an?</span>
              <span className="block text-sm text-muted">Trag sie mit Datum ein: Die App verteilt die Karten auf die Tage und zeigt, wie gut alles sitzt.</span>
            </span>
          </button>
        ) : (
          <ul className="mb-5 grid gap-3">
            {upcoming.slice(0, 3).map(({ a, days, r }) => {
              const s = helpSubject(a.subject)
              return (
                <li key={a.id} className="card flex items-center gap-3 p-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: s?.c, boxShadow: `0 3px 0 ${s?.s}` }}>
                    <HelpSubjectIcon id={a.subject} ink={s?.c ?? '#888'} size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold leading-tight">{a.title}</p>
                    <p className={`text-sm font-bold ${days <= 2 ? 'text-bad-dark' : 'text-muted'}`}>
                      {kindLabel(a.kind)} · {when(days)}
                    </p>
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

type Mode = 'mix' | 'flip' | 'type' | 'write' | 'listen' | 'speak'

const MODES: { id: Mode; label: string; text: string; lang?: boolean }[] = [
  { id: 'mix', label: 'Gemischt', text: 'Alles im Wechsel' },
  { id: 'flip', label: 'Karteikarten', text: 'Umdrehen, selbst bewerten' },
  { id: 'type', label: 'Tippen', text: 'Aus dem Gedächtnis' },
  { id: 'write', label: 'Schreiben', text: 'Buchstaben und Sätze', lang: true },
  { id: 'listen', label: 'Hören', text: 'Verstehen und aufschreiben', lang: true },
  { id: 'speak', label: 'Sprechen', text: 'Nachsprechen', lang: true },
]

/** Frei üben: erst das Fach, dann (wenn man will) ein Stapel, dann die Art. Es wird immer genau ein Fach geübt. */
function FreePractice() {
  const navigate = useNavigate()
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const mySubjects = useStore((s) => s.mySubjects)
  const cards = useStore((s) => s.cards)
  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])

  // Meine Fächer: die gewählten plus alle, in denen schon Stapel liegen (so sieht man auf jedem Gerät dasselbe)
  const subjects = useMemo(() => {
    const ids = [...new Set([...(mySubjects ?? []), ...decks.map((d) => d.subject)])].filter((id) => helpSubject(id))
    const now = new Date()
    return ids
      .map((id) => {
        const refs = cardRefs(decks.filter((d) => d.subject === id))
        return { id, cards: refs.length, due: refs.filter((r) => isDue(cards[r.item.id], now)).length }
      })
      .sort((a, b) => b.due - a.due || b.cards - a.cards)
  }, [mySubjects, decks, cards])

  const [subject, setSubject] = useState(() => subjects.find((s) => s.cards > 0)?.id ?? subjects[0]?.id ?? '')
  const [deck, setDeck] = useState('')
  const [mode, setMode] = useState<Mode>('mix')
  const sub = helpSubject(subject)
  const subjectDecks = decks.filter((d) => d.subject === subject)
  const chosen = subjectDecks.find((d) => d.id === deck)
  const count = cardRefs(chosen ? [chosen] : subjectDecks).length
  const languageSubject = sub?.lang === 'fr'
  const modes = MODES.filter((m) => !m.lang || languageSubject)

  const go = () => {
    if (mode === 'speak') {
      const scope = chosen ? (chosen.kind === 'course' ? `unit:${chosen.id.slice(5)}` : `set:${chosen.id}`) : 'learned'
      navigate(`/speak?scope=${encodeURIComponent(scope)}`)
      return
    }
    const q = new URLSearchParams()
    if (chosen) q.set('deck', chosen.id)
    else q.set('fach', subject)
    q.set('modus', mode)
    navigate(`/ueben/los?${q.toString()}`)
  }

  if (subjects.length === 0) return null
  return (
    <Item>
      <h2 className="mb-1 text-lg font-extrabold">Frei üben</h2>
      <p className="mb-3 text-sm text-muted">Wähle ein Fach, dann geht es los.</p>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Fach">
        {subjects.map((s) => {
          const h = helpSubject(s.id)!
          const on = s.id === subject
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setSubject(s.id)
                setDeck('')
                setMode('mix')
              }}
              className={`press relative flex shrink-0 items-center gap-2 rounded-2xl border-2 py-1.5 pl-1.5 pr-3.5 transition-colors ${on ? 'border-sky bg-sky-soft' : 'border-line bg-surface'}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: h.c }}>
                <HelpSubjectIcon id={s.id} ink={h.c} size={22} />
              </span>
              <span className="text-left">
                <span className="block text-[14px] font-extrabold leading-tight">{h.name}</span>
                <span className="block text-[11px] font-bold text-muted">{s.cards > 0 ? `${s.cards} Karten${s.due ? ` · ${s.due} fällig` : ''}` : 'noch leer'}</span>
              </span>
            </button>
          )
        })}
        <Link to="/faecher" className="press flex shrink-0 items-center gap-1 rounded-2xl border-2 border-dashed border-line px-3.5 text-sm font-extrabold text-muted hover:bg-snow">
          <Plus size={16} /> Fach
        </Link>
      </div>

      {count === 0 ? (
        <div className="card mb-6 flex items-center gap-4 p-4">
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">In {sub?.name} gibt es noch keine Karten.</span>
            <span className="block text-sm text-muted">{subject === 'franzoesisch' ? 'Füge einen fertigen Stapel aus dem Kurs hinzu oder erstelle einen eigenen.' : 'Erstelle den ersten Stapel, dann kannst du hier üben.'}</span>
          </span>
          <Link to={subject === 'franzoesisch' ? '/faecher/franzoesisch' : `/stapel/neu?fach=${subject}`} className="btn btn-primary press !min-h-10 !px-4 !text-sm">
            {subject === 'franzoesisch' ? 'Stapel wählen' : 'Stapel erstellen'}
          </Link>
        </div>
      ) : (
        <>
          {subjectDecks.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Stapel">
              <button type="button" role="radio" aria-checked={deck === ''} onClick={() => setDeck('')} className={`chip ${deck === '' ? 'chip-on' : ''}`}>
                Ganzes Fach
              </button>
              {subjectDecks.slice(0, 12).map((d) => (
                <button key={d.id} type="button" role="radio" aria-checked={deck === d.id} onClick={() => setDeck(d.id)} className={`chip ${deck === d.id ? 'chip-on' : ''}`}>
                  {d.title}
                </button>
              ))}
            </div>
          )}
          <div className="mb-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Aufgabenart">
            {modes.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={`tile !block !px-2.5 !py-2.5 text-center ${mode === m.id ? 'tile-selected' : ''}`}>
                <span className="block text-[14px] font-extrabold">{m.label}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-tight opacity-75">{m.text}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary press mb-6 w-full sm:w-72" onClick={go}>
            {mode === 'speak' ? 'Sprechen üben' : `${sub?.name} üben (${count} Karten)`}
          </button>
        </>
      )}
    </Item>
  )
}
