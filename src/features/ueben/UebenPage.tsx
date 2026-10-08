import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Check, Flame, Plus, Repeat, Right, Trophy } from '../../components/ui/Icons'
import { Sheet } from '../../components/ui/Sheet'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { SubjectShape } from '../../components/ui/SubjectShape'
import { dateKey, kindLabel, needsFollowUp } from '../../lib/calendar'
import { activeDecks, cardRefs, daysUntil, planToday, readiness, SESSION_SIZE } from '../../lib/decks'
import { isDue } from '../../lib/srs'
import { helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { BackupBanner } from '../../components/ui/BackupBanner'
import { InstallBanner } from '../../components/ui/InstallApp'
import { IconNotice } from '../../components/ui/IconNotice'
import { backupDue } from '../../lib/backup'
import { ArbeitFollowUp } from '../kalender/KalenderPage'
import { useStudyToday } from '../../components/ui/StudyTime'
import { dueLabel } from '../review/ReviewPage'
import { QuickCards } from '../welcome/QuickCards'

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
  const [create, setCreate] = useState(false)
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const arbeiten = useStore((s) => s.arbeiten)
  const cards = useStore((s) => s.cards)
  const st = useStudyToday()
  const hausaufgaben = useStore((s) => s.hausaufgaben)
  const grade = useStore((s) => s.grade)
  const mySubjects = useStore((s) => s.mySubjects)
  // Für die ersten Karteikarten: die eigenen Fächer, sonst die üblichen
  const startSubjects = (mySubjects ?? []).length > 0 ? mySubjects : ['mathe', 'deutsch', 'englisch', 'biologie']

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
  // Hausaufgaben, die heute oder schon früher fällig und noch offen sind
  const hwNow = useMemo(() => (hausaufgaben ?? []).filter((h) => !h.done && h.due <= today).sort((a, b) => a.due.localeCompare(b.due)), [hausaufgaben, today])
  const dateText = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  // Wie viele Karten heute je Fach dran sind (für die farbigen Blöcke)
  const blocks = useMemo(() => {
    const n: Record<string, number> = {}
    for (const r of [...plan.due, ...plan.fresh]) n[r.deck.subject] = (n[r.deck.subject] ?? 0) + 1
    const ids = [...new Set([...(mySubjects ?? []), ...decks.map((d) => d.subject)])].filter((id) => helpSubject(id) && decks.some((d) => d.subject === id))
    return ids.map((id) => ({ id, n: n[id] ?? 0 })).sort((x, y) => y.n - x.n).slice(0, 6)
  }, [plan, decks, mySubjects])
  // Die Schlagzeile: Was ist das Wichtigste? Eine Arbeit in den nächsten Tagen, sonst die Karten für heute
  const soon = upcoming.find((x) => x.days <= 7)
  const headline = soon
    ? [soon.days === 0 ? 'Heute' : soon.days === 1 ? 'Morgen' : `In ${soon.days} Tagen`, `${helpSubject(soon.a.subject)?.name ?? ''}-${kindLabel(soon.a.kind)}.`.replace(/^-/, '')]
    : total > 0
      ? ['Heute', `${total} ${total === 1 ? 'Karte' : 'Karten'}.`]
      : ['Heute ist', 'frei.']

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-3 lg:pt-8">
      {followUps.map((a) => (
        <ArbeitFollowUp key={a.id} arbeit={a} />
      ))}

      {/* Höchstens ein Hinweis gleichzeitig: Sichern geht vor Installieren */}
      {backupDue(decks.length > 0 || Object.keys(cards).length > 0) ? <BackupBanner /> : (
        <>
          <InstallBanner />
          <IconNotice />
        </>
      )}

      <header className="mb-2 px-1">
        <p className="text-[15px] font-bold text-muted">{dateText}</p>
        <h1 className="hero-title mt-1.5">
          {headline[0]}
          <br />
          {headline[1]}
        </h1>
      </header>

      {/* Die eine Hauptsache: das Tier schwebt über einer Glasfläche mit der Runde für heute */}
      <section className="mb-7" aria-label="Heute">
        {decks.length === 0 ? (
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <Mascot size={64} mood="happy" alive />
              <div className="min-w-0">
                <h2 className="text-[21px] font-black leading-tight">Deine ersten Karteikarten</h2>
                <p className="text-[14px] text-muted">Tipp ein Thema an, die KI schreibt sie dir.</p>
              </div>
            </div>
            <QuickCards subjects={startSubjects} grade={grade} onStart={(id) => navigate(`/ueben/los?deck=${id}`)} />
          </div>
        ) : (
          <>
            <div className="card p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="-my-1 shrink-0">
                  <Mascot size={78} mood={total > 0 ? 'happy' : 'cheer'} alive />
                </div>
                <div className="min-w-0 flex-1">
                  {total > 0 ? (
                    <>
                      <p className="text-[15px] font-bold text-muted">Heute dran</p>
                      <p className="text-[26px] font-black leading-tight tracking-[-0.02em]">
                        {total} {total === 1 ? 'Karte' : 'Karten'}
                      </p>
                      <p className="text-[14px] text-muted">
                        {[plan.fresh.length > 0 && `${plan.fresh.length} neu`, plan.due.length > 0 && `${plan.due.length} zum Wiederholen`].filter(Boolean).join(' · ')}
                        {subjectNames.length > 0 && <span className="block truncate">{subjectNames.join(', ')}</span>}
                      </p>
                    </>
                  ) : (
                    <p className="text-[22px] font-black leading-tight tracking-[-0.02em]">Für heute alles geschafft</p>
                  )}
                </div>
              </div>
              {total > 0 ? (
                <>
                  <button type="button" className="btn btn-primary press w-full !min-h-14 !justify-between !px-5 !text-[19px]" onClick={() => navigate("/ueben/los")}>
                    <span>Los geht’s</span>
                    <span className="text-[16px] font-bold opacity-85">{roundSize} Karten</span>
                  </button>
                  {total > SESSION_SIZE && <p className="mt-2 text-center text-xs text-muted">Runden zu {SESSION_SIZE} Karten, danach geht es direkt weiter.</p>}
                </>
              ) : (
                <div className="px-1 py-1">
                  <p className="text-[14px] text-muted">{nextDue ? `Die nächste Karte ist ${dueLabel(nextDue)} dran.` : 'Neue Karteikarten sind schnell gemacht.'}</p>
                  <button type="button" className="btn btn-ghost press mt-3 !min-h-10 !px-4 !text-[15px]" onClick={() => navigate('/ueben/los')}>
                    Trotzdem üben
                  </button>
                </div>
              )}

              {blocks.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Fächer">
                  {blocks.map(({ id, n }) => {
                    const sub = helpSubject(id)!
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate(`/ueben/los?fach=${id}`)}
                        aria-label={n > 0 ? `${sub.name}, ${n} ${n === 1 ? 'Karte' : 'Karten'} heute` : `${sub.name}, heute nichts dran`}
                        className={`shape-block press ${n > 0 ? '' : 'shape-block-quiet !min-h-[88px]'}`}
                        style={n > 0 ? ({ '--block': sub.c, '--block-edge': `color-mix(in srgb, ${sub.c} 55%, black)` } as React.CSSProperties) : undefined}
                      >
                        <SubjectShape id={id} size={24} className={n > 0 ? 'text-white/95' : 'text-muted'} />
                        <span>
                          {n > 0 ? <span className="block text-[40px] font-black leading-none tabular-nums">{n}</span> : <span aria-hidden className="block text-[22px] font-black leading-none">✓</span>}
                          <span className="mt-0.5 block truncate text-[15px] font-extrabold">{sub.name}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Was ansteht: offene Hausaufgaben und die nächsten Arbeiten (eintragen geht im Kalender) */}
      {(hwNow.length > 0 || upcoming.length > 0) && (
        <section className="mb-6" aria-label="Als Nächstes">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <h2 className="text-[20px] font-black">Als Nächstes</h2>
            <Link to="/kalender" className="press -mr-1 flex min-h-9 items-center gap-0.5 rounded-xl px-2 text-[15px] font-bold text-sky-dark">
              Kalender <Right size={12} />
            </Link>
          </div>
          <div className="list">
            {hwNow.length > 0 && (
              <Row
                to="/kalender"
                tint="var(--good-soft)"
                icon={<Check size={20} className="text-good-dark" />}
                title={`${hwNow.length} ${hwNow.length === 1 ? 'Hausaufgabe' : 'Hausaufgaben'} offen`}
                sub={hwNow.some((h) => h.due < today) ? 'Auch Überfälliges dabei' : hwNow.slice(0, 2).map((h) => helpSubject(h.subject)?.name ?? h.text).join(', ')}
              />
            )}
            {upcoming.slice(0, 2).map(({ a, days, r }) => {
              const s = helpSubject(a.subject)
              const timeLeft = st && st.arbeit.id === a.id ? (st.reached ? 'Lernzeit geschafft' : `heute ${Math.floor(st.minutes)} von ${st.target} Min`) : null
              return (
                <Row
                  key={a.id}
                  to={r.total === 0 ? `/stapel/neu?fach=${a.subject}` : `/ueben/los?arbeit=${a.id}`}
                  tint={s?.c ?? '#868a95'}
                  icon={<HelpSubjectIcon id={a.subject} ink={s?.c ?? '#888'} size={30} />}
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
          </div>
        </section>
      )}

      {/* Alles Weitere: vier Kacheln statt einer langen Liste */}
      <section aria-label="Mehr">
        <div className="grid grid-cols-2 gap-3">
          {decks.length > 0 && (
            <button type="button" onClick={() => setFree(true)} className="tile press flex-col !items-start !gap-2 !py-3.5">
              <Repeat size={22} className="text-brand-dark" />
              <span className="text-[16px] font-extrabold leading-tight">Frei üben</span>
            </button>
          )}
          {decks.length > 0 && (
            <Link to="/blitz" className="tile press flex-col !items-start !gap-2 !py-3.5">
              <Flame size={22} className="text-sky-dark" />
              <span className="text-[16px] font-extrabold leading-tight">Blitzrunde</span>
            </Link>
          )}
          <Link to="/test/neu?art=test" className="tile press flex-col !items-start !gap-2 !py-3.5">
            <Trophy size={22} className="text-good-dark" />
            <span className="text-[16px] font-extrabold leading-tight">Probetest</span>
          </Link>
          <button type="button" onClick={() => setCreate(true)} className="tile press flex-col !items-start !gap-2 !py-3.5">
            <Plus size={22} className="text-bad-dark" />
            <span className="text-[16px] font-extrabold leading-tight">Neu erstellen</span>
          </button>
        </div>
      </section>

      {/* Neue Karteikarten: Thema antippen, die KI macht sie, Runde starten. Alles andere (selbst schreiben, Aufgaben, Rechnen) steht auf der großen Seite. */}
      <Sheet open={create} onClose={() => setCreate(false)} title="Neue Karteikarten">
        <QuickCards
          subjects={startSubjects}
          grade={grade}
          onStart={(id) => {
            setCreate(false)
            navigate(`/ueben/los?deck=${id}`)
          }}
        />
        <Link to="/stapel/neu" onClick={() => setCreate(false)} className="press mt-1 flex min-h-11 items-center justify-center rounded-xl text-sm font-extrabold text-sky-dark">
          Selbst schreiben, Aufgaben, Rechnen oder Tests
        </Link>
      </Sheet>

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
