import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Flame, Plus, Repeat, Right, Trophy } from '../../components/ui/Icons'
import { Sheet } from '../../components/ui/Sheet'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { dateKey, kindLabel, needsFollowUp } from '../../lib/calendar'
import { activeDecks, cardRefs, daysUntil, planToday, readiness, SESSION_SIZE } from '../../lib/decks'
import { isDue } from '../../lib/srs'
import { helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { BackupBanner } from '../../components/ui/BackupBanner'
import { InstallBanner } from '../../components/ui/InstallApp'
import { backupDue } from '../../lib/backup'
import { ArbeitFollowUp } from '../kalender/KalenderPage'
import { useStudyToday } from '../../components/ui/StudyTime'
import { dueLabel } from '../review/ReviewPage'

const when = (days: number) => (days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`)

/** Eine Zeile in einer Liste: tippbare Fläche mit farbigem Symbol, Titel, Untertitel und Pfeil. */
function Row({ to, onClick, tint, icon, title, sub, right }: { to?: string; onClick?: () => void; tint: string; icon: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]" style={{ background: tint }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-extrabold leading-tight">{title}</span>
        {sub && <span className="block truncate text-[13px] font-semibold text-muted">{sub}</span>}
      </span>
      {right}
      <Right size={13} className="shrink-0 text-muted" />
    </>
  )
  return to ? (
    <Link to={to} className="row">
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="row">
      {inner}
    </button>
  )
}

/** Üben: Hier startet jeder Tag. Oben eine Sache (die Runde für heute), darunter die nächsten Arbeiten, ganz unten alles weitere. */
export function UebenPage() {
  const navigate = useNavigate()
  const [free, setFree] = useState(false)
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const arbeiten = useStore((s) => s.arbeiten)
  const cards = useStore((s) => s.cards)
  const st = useStudyToday()

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
  // Welche Fächer in der Runde dran sind (für die Zeile unter der Zahl)
  const subjectNames = useMemo(() => {
    const ids = [...new Set([...plan.due, ...plan.fresh].slice(0, Math.max(roundSize, 1)).map((r) => r.deck.subject))]
    return ids.map((id) => helpSubject(id)?.name ?? id)
  }, [plan, roundSize])
  const nextDue = useMemo(() => {
    const future = refs.map((r) => cards[r.item.id]).filter((c) => c && !isDue(c)).map((c) => new Date(c.due).getTime())
    return future.length ? new Date(Math.min(...future)) : null
  }, [refs, cards])
  const dateText = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-3 lg:pt-8">
      {followUps.map((a) => (
        <ArbeitFollowUp key={a.id} arbeit={a} />
      ))}

      {/* Höchstens ein Hinweis gleichzeitig: Sichern geht vor Installieren */}
      {backupDue(decks.length > 0 || Object.keys(cards).length > 0) ? <BackupBanner /> : <InstallBanner />}

      <header className="mb-4 px-1">
        <p className="text-[15px] font-bold text-muted">{dateText}</p>
        <h1 className="large-title">Heute</h1>
      </header>

      {/* Die eine Hauptsache */}
      <section className="card mb-6 p-5" aria-label="Heute">
        {decks.length === 0 ? (
          <div className="flex flex-col items-center text-center">
            <Mascot size={88} mood="happy" alive />
            <h2 className="mt-2 text-[22px] font-black leading-tight">Was willst du üben?</h2>
            <p className="mt-1 max-w-sm text-[15px] text-muted">Schreib der KI, was ihr gerade durchnehmt: Die Karteikarten sind in Sekunden da.</p>
            <Link to="/stapel/neu" className="btn btn-primary press mt-4 w-full">
              Karteikarten erstellen
            </Link>
          </div>
        ) : total > 0 ? (
          <>
            <p className="text-[15px] font-bold text-muted">Heute dran</p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[52px] font-black leading-none tabular-nums">{total}</span>
              <span className="text-[18px] font-extrabold">{total === 1 ? 'Karte' : 'Karten'}</span>
            </p>
            <p className="mt-1 text-[15px] text-muted">
              {[plan.fresh.length > 0 && `${plan.fresh.length} neu`, plan.due.length > 0 && `${plan.due.length} zum Wiederholen`].filter(Boolean).join(' · ')}
              {subjectNames.length > 0 && <span className="block truncate">{subjectNames.join(', ')}</span>}
            </p>
            <button type="button" className="btn btn-primary btn-shine press mt-4 w-full" onClick={() => navigate('/ueben/los')} autoFocus>
              Los geht’s ({roundSize})
            </button>
            {total > SESSION_SIZE && <p className="mt-2 text-center text-xs text-muted">Runden zu {SESSION_SIZE} Karten, danach geht es direkt weiter.</p>}
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Mascot size={72} mood="cheer" alive />
            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-black leading-tight">Für heute alles geschafft</h2>
              <p className="mt-0.5 text-[14px] text-muted">{nextDue ? `Die nächste Karte ist ${dueLabel(nextDue)} dran.` : 'Neue Karteikarten sind schnell gemacht.'}</p>
              <button type="button" className="btn btn-ghost press mt-3 !min-h-10 !px-4 !text-[15px]" onClick={() => navigate('/ueben/los')}>
                Trotzdem üben
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Arbeiten, die anstehen */}
      <section className="mb-6" aria-label="Als Nächstes">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <h2 className="text-[20px] font-black">Als Nächstes</h2>
          {upcoming.length > 0 && (
            <Link to="/kalender" className="press -mr-1 flex min-h-9 items-center gap-0.5 rounded-xl px-2 text-[15px] font-bold text-sky-dark">
              Kalender <Right size={12} />
            </Link>
          )}
        </div>
        <div className="list">
          {upcoming.slice(0, 2).map(({ a, days, r }) => {
            const s = helpSubject(a.subject)
            const timeLeft = st && st.arbeit.id === a.id ? (st.reached ? 'Lernzeit geschafft' : `heute ${Math.floor(st.minutes)} von ${st.target} Min`) : null
            return (
              <Row
                key={a.id}
                to={r.total === 0 ? `/stapel/neu?fach=${a.subject}` : `/ueben/los?arbeit=${a.id}`}
                tint={s?.c ?? '#868a95'}
                icon={<HelpSubjectIcon id={a.subject} ink={s?.c ?? '#888'} size={24} />}
                title={a.title}
                sub={
                  <>
                    <span className={days <= 2 ? 'font-extrabold text-bad-dark' : ''}>
                      {kindLabel(a.kind)} {when(days)}
                    </span>
                    {r.total === 0 ? ' · noch keine Karteikarten' : timeLeft ? ` · ${timeLeft}` : ` · ${r.solid} von ${r.total} sitzen`}
                  </>
                }
              />
            )
          })}
          <Row to="/kalender?neu=1" tint="var(--sky-soft)" icon={<Plus size={20} className="text-sky-dark" />} title={upcoming.length === 0 ? 'Arbeit eintragen' : 'Weitere Arbeit eintragen'} sub={upcoming.length === 0 ? 'Die App verteilt die Karteikarten auf die Tage bis dahin.' : undefined} />
        </div>
      </section>

      {/* Alles Weitere, jeweils eine Zeile */}
      <section aria-label="Mehr">
        <h2 className="mb-1.5 px-1 text-[20px] font-black">Mehr</h2>
        <div className="list">
          {decks.length > 0 && <Row onClick={() => setFree(true)} tint="var(--brand-soft)" icon={<Repeat size={20} className="text-brand-dark" />} title="Frei üben" sub="Fach und Art selbst wählen" />}
          {decks.length > 0 && <Row to="/blitz" tint="var(--violet-soft)" icon={<Flame size={20} className="text-violet-dark" />} title="Blitzrunde" sub="60 Sekunden, so viele wie möglich" />}
          <Row to="/test/neu" tint="var(--sky-soft)" icon={<Trophy size={20} className="text-sky-dark" />} title="Probearbeit" sub="Test mit Punkten und Note" />
          <Row to="/stapel/neu" tint="var(--good-soft)" icon={<Plus size={20} className="text-good-dark" />} title="Neu erstellen" sub="Karteikarten, Quiz, Rechenaufgaben" />
        </div>
      </section>

      <FreePractice open={free} onClose={() => setFree(false)} />
    </div>
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
function FreePractice({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      onClose()
      navigate(`/speak?scope=${encodeURIComponent(scope)}`)
      return
    }
    const q = new URLSearchParams()
    if (chosen) q.set('deck', chosen.id)
    else q.set('fach', subject)
    q.set('modus', mode)
    onClose()
    navigate(`/ueben/los?${q.toString()}`)
  }

  if (subjects.length === 0) return null
  return (
    <Sheet open={open} onClose={onClose} title="Frei üben">
      <section className="-mx-5 overflow-hidden" aria-label="Frei üben">
        <p className="px-5 text-sm text-muted">Tipp ein Fach an, dann geht es los.</p>

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
                  style={{ background: h.c, boxShadow: on ? `0 0 0 3px var(--surface), 0 0 0 5px ${h.c}` : undefined, opacity: on || s.cards > 0 ? 1 : 0.55 }}
                >
                  <HelpSubjectIcon id={s.id} ink={h.c} size={32} />
                  {s.due > 0 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-brand-strong px-1.5 text-[11px] font-black leading-[1.15rem] text-on-brand ring-2 ring-[var(--surface)]">{s.due}</span>}
                </span>
                <span className={`w-full truncate text-[12px] font-extrabold leading-tight ${on ? '' : 'text-muted'}`}>{h.name}</span>
              </button>
            )
          })}
          <Link to="/settings/faecher" className="press flex w-[4.6rem] shrink-0 flex-col items-center gap-1.5 text-center" aria-label="Fach hinzufügen">
            <span className="flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1.1rem] border-2 border-dashed border-line text-muted">
              <Plus size={22} />
            </span>
            <span className="text-[12px] font-extrabold leading-tight text-muted">Fach</span>
          </Link>
        </div>

        {count === 0 ? (
          <div className="border-t-2 border-line bg-snow px-4 py-4">
            <p className="font-extrabold">In {sub?.name} gibt es noch keine Karten.</p>
            <p className="mb-3 text-sm text-muted">{subject === 'franzoesisch' ? 'Füge fertige Karteikarten aus dem Kurs hinzu oder erstelle eigene.' : 'Erstelle die ersten Karteikarten, dann kannst du hier üben.'}</p>
            <Link to={subject === 'franzoesisch' ? '/faecher/franzoesisch' : `/stapel/neu?fach=${subject}`} className="btn btn-primary press !min-h-10 !px-4 !text-sm">
              {subject === 'franzoesisch' ? 'Karteikarten wählen' : 'Karteikarten erstellen'}
            </Link>
          </div>
        ) : (
          <div className="border-t-2 border-line bg-snow/60 px-4 pb-4 pt-3.5">
            {subjectDecks.length > 1 && (
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-extrabold text-muted">Karteikarten</span>
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

            <p className="mb-1 text-xs font-extrabold text-muted">Wie üben?</p>
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
              className="press flex w-full items-center justify-between rounded-[14px] px-5 py-3.5 text-left text-white"
              style={{ background: sub?.c }}
            >
              <span className="text-[17px] font-black">{mode === 'speak' ? 'Sprechen üben' : `${sub?.name} üben`}</span>
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-sm font-extrabold">{count} Karten</span>
            </button>
          </div>
        )}
        {sub && (
          <Link to={`/faecher/${subject}`} className="press flex min-h-12 items-center justify-between border-t-2 border-line px-4 text-sm font-extrabold text-sky-dark hover:bg-snow">
            <span>Karteikarten in {sub.name} ansehen und verwalten</span>
            <Right size={14} />
          </Link>
        )}
      </section>
    </Sheet>
  )
}
