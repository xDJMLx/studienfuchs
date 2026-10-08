import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Coin, Plus, Right } from '../../components/ui/Icons'
import { Sheet } from '../../components/ui/Sheet'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { byDay, dateKey, KINDS, kindLabel, longDay, monthGrid, monthName, needsFollowUp, parseKey, shortDay } from '../../lib/calendar'
import { parseQuickArbeit } from '../../lib/hausaufgaben'
import { ownDeck } from '../../lib/decks'
import { whenText } from '../../lib/school'
import { activeDecks, daysUntil, readiness } from '../../lib/decks'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit, Hausaufgabe } from '../../lib/types'
import { ARBEIT_COINS, useStore } from '../../store/useStore'
import { ArbeitSheet } from '../faecher/ArbeitSheet'
import { HausaufgabeSheet } from '../hausaufgaben/HausaufgabeSheet'
import { HomeworkRow } from '../hausaufgaben/HausaufgabenPage'

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

const WEEKDAY_HEAD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Tage zwischen zwei Datums-Schlüsseln (ohne Zeitzonenärger). */
function daysBetweenKeys(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86_400_000)
}

/**
 * Arbeit in einem Satz eintragen: „Bio Test Zelle 15.10.“ + Enter. Fach, Art, Tag und Thema werden erkannt; die einzige Karteikarten-Sammlung des Fachs
 * ist gleich dabei. Fehlt der Tag, öffnet sich das Blatt zum Ergänzen. Darunter steht, was verstanden wurde; „Ändern“ öffnet das Blatt.
 */
function QuickArbeit({ onEdit, onOpenSheet }: { onEdit: (a: Arbeit) => void; onOpenSheet: () => void }) {
  const mySubjects = useStore((s) => s.mySubjects) ?? []
  const sets = useStore((s) => s.sets)
  const addArbeit = useStore((s) => s.addArbeit)
  const arbeiten = useStore((s) => s.arbeiten) ?? []
  const [text, setText] = useState('')
  const [added, setAdded] = useState<Arbeit | null>(null)
  const fallback = arbeiten.length ? arbeiten[arbeiten.length - 1].subject : (mySubjects[0] ?? 'mathe')
  const allowed = mySubjects.length ? [...mySubjects, 'sonstiges'] : undefined
  const q = parseQuickArbeit(text, { fallbackSubject: fallback, allowed })
  const kind = q.kind ?? 'klassenarbeit'
  const sub = helpSubject(q.subject)

  useEffect(() => {
    if (!added) return
    const id = window.setTimeout(() => setAdded(null), 6000)
    return () => clearTimeout(id)
  }, [added])

  const submit = () => {
    if (!text.trim()) return
    if (!q.date) return onOpenSheet()
    const own = sets.map(ownDeck).filter((d) => d.subject === q.subject)
    const data = {
      subject: q.subject,
      kind,
      title: q.title || `${sub?.name ?? ''}-${KINDS.find((k) => k.id === kind)?.label ?? 'Arbeit'}`.replace(/^-/, ''),
      date: q.date,
      deckIds: own.length === 1 ? [own[0].id] : [],
    }
    const id = addArbeit(data)
    setAdded({ ...data, id })
    setText('')
  }

  const addedSub = added ? helpSubject(added.subject) : null
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 rounded-[20px] bg-surface py-1.5 pl-4 pr-1.5">
        <label htmlFor="arbeit-schnell" className="sr-only">
          Arbeit in einem Satz eintragen
        </label>
        <input
          id="arbeit-schnell"
          className="min-w-0 flex-1 bg-transparent py-2 text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-muted"
          placeholder="Neue Arbeit, z. B. Bio Test Zelle 15.10."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={80}
          enterKeyHint="done"
          autoComplete="off"
        />
        <button type="button" aria-label="Arbeit eintragen" disabled={!text.trim()} onClick={submit} className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-strong text-on-brand transition-opacity disabled:opacity-30">
          <Right size={16} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>
      {text.trim() ? (
        <p className="mt-1.5 px-2 text-[13px] font-semibold text-muted" aria-live="polite">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: sub?.c ?? '#868a95' }} aria-hidden />
          {sub?.name ?? 'Anderes Fach'} · {kindLabel(kind)} · {q.date ? shortDay(q.date) : 'Tag fehlt noch'}
          {q.title ? ` · ${q.title}` : ''}
        </p>
      ) : added ? (
        <p className="mt-1.5 flex items-center gap-2 px-2 text-[13px] font-semibold text-good-dark" role="status">
          Eingetragen: {addedSub?.name ?? 'Anderes Fach'} · {kindLabel(added.kind)} · {shortDay(added.date)}
          <button type="button" className="press min-h-8 rounded-lg px-1.5 font-extrabold text-sky-dark" onClick={() => onEdit(added)}>
            Ändern
          </button>
        </p>
      ) : null}
    </div>
  )
}

type Adding = { kind: 'arbeit' | 'hausaufgabe'; date?: string; arbeit?: Arbeit; hausaufgabe?: Hausaufgabe }

/**
 * Kalender für Arbeiten, Tests und Hausaufgaben: ein ruhiger Monat, darunter der gewählte Tag und was als Nächstes ansteht.
 * Ein Tipp auf einen Tag zeigt, was da fällig ist; das runde Plus fragt, ob es eine Arbeit oder eine Hausaufgabe ist.
 */
export function KalenderPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const arbeiten = useStore((s) => s.arbeiten) ?? []
  const hausaufgaben = useStore((s) => s.hausaufgaben) ?? []
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const cards = useStore((s) => s.cards)
  const periods = useStore((s) => s.schoolPeriods) ?? []
  const today = dateKey(new Date())
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }))
  const [choose, setChoose] = useState<string | null>(null)
  const [adding, setAdding] = useState<Adding | null>(null)
  // Von anderen Seiten mit ?neu=1 (Arbeit) oder ?neu=hausaufgabe gleich das Eintragen öffnen
  const wantsNew = params.get('neu')
  useEffect(() => {
    if (!wantsNew) return
    // Erst öffnen, wenn die Seite hereingeglitten ist: Zwei Bewegungen gleichzeitig wirken unruhig
    const id = window.setTimeout(() => setAdding({ kind: wantsNew === 'hausaufgabe' ? 'hausaufgabe' : 'arbeit', date: dateKey(new Date()) }), 300)
    return () => clearTimeout(id)
  }, [wantsNew])
  const closeAdding = () => {
    setAdding(null)
    if (params.get('neu')) setParams({}, { replace: true })
  }

  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const days = useMemo(() => byDay(arbeiten), [arbeiten])
  const homeworkDays = useMemo(() => {
    const m: Record<string, Hausaufgabe[]> = {}
    for (const h of hausaufgaben) (m[h.due] ??= []).push(h)
    return m
  }, [hausaufgaben])
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
    const sub = [kindLabel(a.kind), whenText(periods, a), opts.showDay ? `${shortDay(a.date)} · ${when(d)}` : '', d >= 0 ? (r.total > 0 ? `${r.pct} % sitzen` : 'noch keine Karteikarten') : ''].filter(Boolean).join(' · ')
    return (
      <li key={a.id} className="row !pr-3">
        <button type="button" onClick={() => setAdding({ kind: 'arbeit', arbeit: a })} className="press flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${a.title} bearbeiten`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]" style={{ background: s?.c }}>
            <HelpSubjectIcon id={a.subject} ink={s?.c ?? '#888'} size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-extrabold leading-tight">{a.title}</span>
            <span className={`block truncate text-[13px] font-semibold ${d >= 0 && d <= 2 ? 'text-bad-dark' : 'text-muted'}`}>{sub}</span>
          </span>
        </button>
        {d >= 0 && r.total > 0 && (
          <button type="button" className="pill-soft press shrink-0" onClick={() => navigate(`/ueben/los?arbeit=${a.id}`)}>
            Lernen
          </button>
        )}
      </li>
    )
  }

  const dayEvents = days[selected] ?? []
  const dayHomework = homeworkDays[selected] ?? []
  const next = upcoming.filter((a) => a.date !== selected).slice(0, 6)

  const dayLabel = (key: string, list: Arbeit[], hw: Hausaufgabe[]) => {
    const parts = [list.length ? `${list.length} ${list.length === 1 ? 'Arbeit' : 'Arbeiten'}` : '', hw.length ? `${hw.length} ${hw.length === 1 ? 'Hausaufgabe' : 'Hausaufgaben'}` : ''].filter(Boolean)
    return `${longDay(key)}${parts.length ? `, ${parts.join(', ')}` : ''}`
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-3 lg:pt-8">
      <header className="mb-4 flex items-end justify-between gap-3 px-1">
        <h1 className="large-title">Kalender</h1>
        <button type="button" aria-label="Eintragen" className="press mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark" onClick={() => setChoose(selected)}>
          <Plus size={22} />
        </button>
      </header>

      <QuickArbeit onEdit={(a) => setAdding({ kind: 'arbeit', arbeit: a })} onOpenSheet={() => setAdding({ kind: 'arbeit', date: selected })} />

      {followUps.map((a) => (
        <ArbeitFollowUp key={a.id} arbeit={a} />
      ))}

      <section className="panel mb-6 px-3 pb-2 pt-3.5" aria-label={`${monthName(cursor.m)} ${cursor.y}`}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="px-1 text-[20px] font-black leading-tight tracking-tight">
            {monthName(cursor.m)} <span className="font-bold text-muted">{cursor.y}</span>
          </h2>
          <span className="flex items-center gap-1">
            {!thisMonth && (
              <button type="button" onClick={goToday} className="press mr-1 px-1 text-[15px] font-semibold text-sky-dark">
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
        <div className="grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label="Tage">
          {WEEKDAY_HEAD.map((w) => (
            <span key={w} className="pb-1 text-[12px] font-bold text-muted" role="columnheader">
              {w}
            </span>
          ))}
          {grid.map((c) => {
            const list = days[c.key] ?? []
            const hw = (homeworkDays[c.key] ?? []).filter((h) => !h.done)
            const isToday = c.key === today
            const on = c.key === selected
            // Tage der Nachbarmonate sind nur Füllung: leer, ohne Taste (wer sie braucht, blättert)
            if (!c.inMonth) return <div key={c.key} role="gridcell" aria-hidden className="h-[3.2rem]" />
            return (
              <div key={c.key} role="gridcell" className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setSelected(c.key)}
                  aria-pressed={on}
                  aria-label={dayLabel(c.key, list, hw)}
                  className={`press flex h-[3.2rem] w-full max-w-[3.2rem] flex-col items-center justify-start gap-0.5 pt-1 ${c.inMonth ? '' : 'opacity-30'}`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-bold leading-none transition-colors ${isToday ? 'bg-brand-strong font-black text-on-brand' : on ? 'bg-snow font-black ring-2 ring-brand' : c.key < today ? 'text-muted' : ''}`}
                  >
                    {c.day}
                  </span>
                  <span className="flex h-1.5 items-center gap-[3px]" aria-hidden>
                    {/* Arbeiten: ausgefüllter Punkt in der Fachfarbe, Hausaufgaben: Ring */}
                    {list.slice(0, 2).map((a) => (
                      <span key={a.id} className="block h-1.5 w-1.5 rounded-full" style={{ background: helpSubject(a.subject)?.c ?? '#868a95' }} />
                    ))}
                    {hw.slice(0, 2).map((h) => (
                      <span key={h.id} className="block h-1.5 w-1.5 rounded-full border-[1.5px]" style={{ borderColor: helpSubject(h.subject)?.c ?? '#868a95' }} />
                    ))}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-[17px] font-black">{selected === today ? 'Heute' : longDay(selected)}</h2>
        <span className="text-sm font-bold text-muted">{selected === today ? longDay(selected) : when(daysBetweenKeys(today, selected))}</span>
      </div>
      {dayEvents.length > 0 && <ul className="list mb-3">{dayEvents.map((a) => row(a))}</ul>}
      {dayHomework.length > 0 && (
        <ul className="list mb-3" style={{ '--inset': '3.4rem' } as React.CSSProperties}>
          {dayHomework.map((h) => (
            <HomeworkRow key={h.id} h={h} today={today} onOpen={(x) => setAdding({ kind: 'hausaufgabe', hausaufgabe: x })} />
          ))}
        </ul>
      )}
      {dayEvents.length === 0 && dayHomework.length === 0 && (
        <button type="button" onClick={() => setChoose(selected)} className="press mb-3 flex w-full items-center gap-3 rounded-[20px] bg-surface px-4 py-4 text-left text-muted">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            <Plus size={20} />
          </span>
          <span>
            <span className="block font-extrabold text-ink">Nichts geplant</span>
            <span className="block text-sm">Tippe, um etwas einzutragen.</span>
          </span>
        </button>
      )}
      <div className="mb-5" />

      {next.length > 0 && (
        <section aria-label="Als Nächstes">
          <h2 className="mb-1.5 px-1 text-[17px] font-black">Als Nächstes</h2>
          <ul className="list mb-5">{next.map((a) => row(a, { showDay: true }))}</ul>
        </section>
      )}

      {upcoming.length === 0 && <p className="mb-5 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">Steht eine Arbeit oder ein Test an? Trag ihn ein: Die App verteilt deine Karteikarten auf die Tage bis dahin und zeigt dir, wie gut alles sitzt.</p>}

      {past.length > 0 && (
        <section aria-label="Schon geschrieben">
          <h2 className="mb-1.5 px-1 text-[17px] font-black">Schon geschrieben</h2>
          <ul className="list mb-5" style={{ '--inset': '1rem' } as React.CSSProperties}>
            {past.map((a) => (
              <li key={a.id} className="row !min-h-12">
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
        </section>
      )}

      {/* Was soll eingetragen werden? */}
      <Sheet open={choose !== null} onClose={() => setChoose(null)} title="Was möchtest du eintragen?">
        <div className="list mb-1">
          <button
            type="button"
            className="row press"
            onClick={() => {
              setAdding({ kind: 'arbeit', date: choose ?? selected })
              setChoose(null)
            }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-sky-soft text-sky-dark">
              <Plus size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-extrabold leading-tight">Arbeit oder Test</span>
              <span className="block text-[13px] text-muted">Mit Karteikarten zum Lernen</span>
            </span>
            <Right size={13} className="text-muted" />
          </button>
          <button
            type="button"
            className="row press"
            onClick={() => {
              setAdding({ kind: 'hausaufgabe', date: choose ?? selected })
              setChoose(null)
            }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-brand-soft text-brand-dark">
              <Plus size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-extrabold leading-tight">Hausaufgabe</span>
              <span className="block text-[13px] text-muted">Was bis wann zu tun ist</span>
            </span>
            <Right size={13} className="text-muted" />
          </button>
        </div>
      </Sheet>

      <ArbeitSheet open={adding?.kind === 'arbeit'} onClose={closeAdding} arbeit={adding?.arbeit} date={adding?.date} />
      <HausaufgabeSheet open={adding?.kind === 'hausaufgabe'} onClose={closeAdding} hausaufgabe={adding?.hausaufgabe} date={adding?.date} />
    </div>
  )
}
