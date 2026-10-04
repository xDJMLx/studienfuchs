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
import type { Arbeit } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { BackupBanner } from '../../components/ui/BackupBanner'
import { InstallBanner } from '../../components/ui/InstallApp'
import { backupDue } from '../../lib/backup'
import { ArbeitSheet } from '../faecher/ArbeitSheet'
import { ArbeitFollowUp } from '../kalender/KalenderPage'
import { WeekPlanner } from '../kalender/WeekPlanner'
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
  const [sheet, setSheet] = useState<{ arbeit?: Arbeit; date?: string } | null>(null)

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

      {/* Höchstens ein Hinweis gleichzeitig: Sichern geht vor Installieren */}
      {backupDue(decks.length > 0 || Object.keys(cards).length > 0) ? <BackupBanner /> : <InstallBanner />}

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
          <h2 className="text-lg font-extrabold">Meine Woche</h2>
          <span className="flex items-center gap-1">
            <Link to="/kalender" className="press flex min-h-9 items-center rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft">
              Alle Wochen
            </Link>
            <button type="button" className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft" onClick={() => setSheet({ date: today })}>
              <Plus size={16} /> Eintragen
            </button>
          </span>
        </div>
        <div className="card mb-3 p-3">
          <WeekPlanner arbeiten={arbeiten ?? []} weeks={2} pager={false} onAdd={(date) => setSheet({ date })} onOpen={(a) => setSheet({ arbeit: a })} />
        </div>
        {upcoming.length === 0 ? (
          <p className="mb-5 px-1 text-sm text-muted">Steht eine Arbeit an? Tippe auf den Tag und trag sie ein: Die App verteilt die Karten auf die Tage und zeigt, wie gut alles sitzt.</p>
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
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button type="button" className="btn btn-primary press !min-h-10 !px-4 !text-sm" onClick={() => navigate(`/ueben/los?arbeit=${a.id}`)} disabled={r.total === 0}>
                      Lernen
                    </button>
                    <button type="button" className="press rounded-xl px-2 py-1 text-xs font-extrabold text-sky-dark hover:bg-sky-soft disabled:opacity-40" onClick={() => navigate(`/ueben/los?arbeit=${a.id}&modus=probe`)} disabled={r.total < 5} aria-label={`Probearbeit zu ${a.title}`}>
                      Probearbeit
                    </button>
                  </div>
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

      <ArbeitSheet open={!!sheet} onClose={() => setSheet(null)} arbeit={sheet?.arbeit} date={sheet?.date} />
    </Stagger>
  )
}

type Mode = 'mix' | 'flip' | 'type' | 'write' | 'listen' | 'speak'

const MODES: { id: Mode; label: string; text: string; lang?: boolean }[] = [
  { id: 'mix', label: 'Gemischt', text: 'Alles im Wechsel' },
  { id: 'flip', label: 'Karteikarten', text: 'Umdrehen und bewerten' },
  { id: 'type', label: 'Tippen', text: 'Aus dem Gedächtnis' },
  { id: 'write', label: 'Schreiben', text: 'Buchstaben, Sätze', lang: true },
  { id: 'listen', label: 'Hören', text: 'Verstehen', lang: true },
  { id: 'speak', label: 'Sprechen', text: 'Nachsprechen', lang: true },
]

/** Frei üben: ein Fach antippen, optional einen Stapel und die Art wählen, los. Es wird immer genau ein Fach geübt. */
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
  const modes = MODES.filter((m) => !m.lang || sub?.lang === 'fr')

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
      <section className="card mb-6 overflow-hidden" aria-label="Frei üben">
        <div className="px-4 pb-1 pt-4">
          <h2 className="text-lg font-extrabold leading-tight">Frei üben</h2>
          <p className="text-sm text-muted">Tipp ein Fach an, dann geht es los.</p>
        </div>

        {/* Fächer als Kacheln */}
        <div className="flex gap-2.5 overflow-x-auto px-4 py-3" role="radiogroup" aria-label="Fach">
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
                className="press flex w-[4.6rem] shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <span
                  className="relative flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1.1rem] transition-transform"
                  style={{ background: h.c, boxShadow: on ? `0 0 0 3px var(--surface), 0 0 0 5.5px ${h.c}, 0 4px 0 5.5px ${h.s}` : `0 4px 0 ${h.s}`, transform: on ? 'translateY(-1px)' : undefined, opacity: on || s.cards > 0 ? 1 : 0.55 }}
                >
                  <HelpSubjectIcon id={s.id} ink={h.c} size={32} />
                  {s.due > 0 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-brand-strong px-1.5 text-[11px] font-black leading-[1.15rem] text-on-brand ring-2 ring-[var(--surface)]">{s.due}</span>}
                </span>
                <span className={`w-full truncate text-[12px] font-extrabold leading-tight ${on ? '' : 'text-muted'}`}>{h.name}</span>
              </button>
            )
          })}
          <Link to="/faecher" className="press flex w-[4.6rem] shrink-0 flex-col items-center gap-1.5 text-center" aria-label="Fach hinzufügen">
            <span className="flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1.1rem] border-2 border-dashed border-line text-muted">
              <Plus size={22} />
            </span>
            <span className="text-[12px] font-extrabold leading-tight text-muted">Fach</span>
          </Link>
        </div>

        {count === 0 ? (
          <div className="border-t-2 border-line bg-snow px-4 py-4">
            <p className="font-extrabold">In {sub?.name} gibt es noch keine Karten.</p>
            <p className="mb-3 text-sm text-muted">{subject === 'franzoesisch' ? 'Füge einen fertigen Stapel aus dem Kurs hinzu oder erstelle einen eigenen.' : 'Erstelle den ersten Stapel, dann kannst du hier üben.'}</p>
            <Link to={subject === 'franzoesisch' ? '/faecher/franzoesisch' : `/stapel/neu?fach=${subject}`} className="btn btn-primary press !min-h-10 !px-4 !text-sm">
              {subject === 'franzoesisch' ? 'Stapel wählen' : 'Stapel erstellen'}
            </Link>
          </div>
        ) : (
          <div className="border-t-2 border-line bg-snow/60 px-4 pb-4 pt-3.5">
            {subjectDecks.length > 1 && (
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-muted">Stapel</span>
                <select value={deck} onChange={(e) => setDeck(e.target.value)} className="w-full rounded-xl border-2 border-line bg-surface px-3 py-2.5 text-[15px] font-bold outline-none focus:border-sky">
                  <option value="">Ganzes Fach ({cardRefs(subjectDecks).length} Karten)</option>
                  {subjectDecks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.items.length})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-muted">Wie üben?</p>
            <div className={`mb-4 grid gap-1.5 rounded-2xl bg-line/60 p-1 ${modes.length > 3 ? 'grid-cols-3' : 'grid-cols-3'}`} role="radiogroup" aria-label="Aufgabenart">
              {modes.map((m) => {
                const on = mode === m.id
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.id)} className={`rounded-xl px-1.5 py-2 text-center transition-colors ${on ? 'bg-surface shadow-sm' : 'hover:bg-surface/60'}`}>
                    <span className={`block text-[13px] font-extrabold leading-tight ${on ? 'text-ink' : 'text-muted'}`}>{m.label}</span>
                    <span className="mt-0.5 block text-[10.5px] font-medium leading-tight text-muted">{m.text}</span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={go}
              className="press flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-left text-white"
              style={{ background: sub?.c, boxShadow: `0 5px 0 ${sub?.s}` }}
            >
              <span className="text-[17px] font-black">{mode === 'speak' ? 'Sprechen üben' : `${sub?.name} üben`}</span>
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-sm font-extrabold">{count} Karten</span>
            </button>
          </div>
        )}
      </section>
    </Item>
  )
}
