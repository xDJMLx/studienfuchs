import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { blockingLesson, grades, isLessonDone, isRegular, isUnlocked, passMark, units } from '../../content'
import { SpeakButton } from '../../components/exercises/common'
import { Check, Chest, Chevron, Coin, Lock, Repeat, Star, Trophy } from '../../components/ui/Icons'
import { Burst } from '../../components/ui/Burst'
import { Confetti } from '../../components/ui/Confetti'
import { mascotBus } from '../../lib/mascotBus'
import { playChest } from '../../lib/sound'
import { useRewardEvents } from '../../store/useRewardEvents'
import { Mascot } from '../../components/mascot/Mascot'
import { SPRING } from '../../components/ui/motion'
import { Sheet } from '../../components/ui/Sheet'
import type { Lesson, Unit } from '../../lib/types'
import { BackupBanner } from '../../components/ui/BackupBanner'
import { InstallBanner } from '../../components/ui/InstallApp'
import { backupDue } from '../../lib/backup'
import { goalInfo } from '../../lib/xp'
import { chestReady, daysBetween, foxGreeting, UNIT_CHEST_COINS } from '../../lib/rewards'
import { dayKey } from '../../lib/streak'
import { streakNow, useStore } from '../../store/useStore'
import { TodayStrip } from './TodayCard'
import { DesignNotice } from './DesignNotice'

/** Jede Einheit ist eine kleine Welt mit eigener Farbe (Fläche und dunklere Unterkante). */
export const WORLDS = [
  { c: '#ff8a1f', s: '#d66a00' },
  { c: '#1e96fa', s: '#1474cc' },
  { c: '#8b5cf6', s: '#6a3ad6' },
  { c: '#ff5c9a', s: '#d43b77' },
  { c: '#14b8a6', s: '#0d8f80' },
  { c: '#58c234', s: '#3e9a1f' },
  { c: '#ff6b5a', s: '#d6493a' },
  { c: '#5b6cff', s: '#3c4bd8' },
]

/** Schlängellinie des Pfads: so weit (px) weicht jeder Knoten von der Mitte ab. */
const OFFSETS = [0, 44, 68, 44, 0, -44, -68, -44]

type NodeState = 'done' | 'current' | 'open' | 'locked'
type UnitStatus = 'done' | 'current' | 'upcoming'

/** Runder Spielstein mit Unterkante; sinkt beim Drücken ein. */
function PathNode({ state, kind, color }: { state: NodeState; kind: 'lesson' | 'review' | 'test'; color: { c: string; s: string } }) {
  const locked = state === 'locked'
  const style = {
    '--node': locked ? 'var(--line)' : color.c,
    '--node-shade': locked ? 'var(--shade-line)' : color.s,
  } as React.CSSProperties
  const icon =
    state === 'done' ? <Check size={34} /> : kind === 'test' ? <Trophy size={34} /> : kind === 'review' ? <Repeat size={32} /> : <Star size={34} />
  return (
    <span className={`path-node ${kind === 'test' ? 'path-node-big' : ''}`} style={style} aria-hidden>
      {state === 'current' && <span className="path-node-halo" />}
      <span className="path-node-edge" />
      <span className={`path-node-face ${locked ? 'text-muted' : 'text-white'}`}>{icon}</span>
    </span>
  )
}

export function LearnPage() {
  const reduce = useReducedMotion()
  const lessons = useStore((s) => s.lessons)
  const classUnit = useStore((s) => s.classUnit)
  const storedGrade = useStore((s) => s.grade)
  const grade = grades.includes(storedGrade) ? storedGrade : grades[0]
  const shown = useMemo(() => units.filter((u) => u.grade === grade), [grade])
  // Zusatzeinheiten (Berliner Lehrwerke) sind freiwillig und zählen nicht zum Kursfortschritt
  const all = shown.filter((u) => !u.extra).flatMap((u) => u.lessons)
  const regular = all.filter(isRegular)
  const doneCount = regular.filter((l) => isLessonDone(l, lessons[l.id])).length
  // Nächste Lektion: die erste offene, die noch nicht geschafft ist (erst Neues, Wiederholungen erst danach)
  const open = (l: Lesson) => !isLessonDone(l, lessons[l.id]) && isUnlocked(l.id, lessons) && !l.test
  const current = all.find((l) => open(l) && !l.review) ?? all.find(open)
  const currentUnit = shown.find((u) => u.lessons.some((l) => l.id === current?.id))
  const currentIndex = currentUnit ? shown.indexOf(currentUnit) : -1

  // Der Fuchs neben der aktuellen Lektion begrüßt passend zur Lage
  const greeting = (() => {
    const st = useStore.getState()
    const today = dayKey()
    const d = st.daily?.day === today ? st.daily : null
    const gi = goalInfo(st.dailyGoal, st.xpByDay[today] ?? 0)
    return foxGreeting({
      doneLessons: doneCount,
      streakDays: streakNow(st.streak),
      daysAway: daysBetween(st.streak.lastDay, today) ?? 0,
      chestReady: chestReady(gi.baseReached, d),
      questsLeft: d ? d.quests.length - d.claimed.length : 3,
      goalLeft: gi.baseReached ? 0 : gi.goal - (st.xpByDay[today] ?? 0),
      hour: new Date().getHours(),
    })
  })()

  const [pop, setPop] = useState<string | null>(null)
  const unitChests = useStore((s) => s.unitChests ?? [])
  const [chestReward, setChestReward] = useState<{ unit: Unit; coins: number } | null>(null)
  // Gerade geschaffte Lektion: ihr Stein poppt beim Zurückkommen mit einem kleinen Feuerwerk auf
  const celebrate = useRef(useRewardEvents.getState().pathDone)
  useEffect(() => {
    if (celebrate.current) useRewardEvents.setState({ pathDone: null })
  }, [])
  const currentRef = useRef<HTMLLIElement>(null)

  // Beim Öffnen zur aktuellen Lektion gleiten, falls sie unter der Kante liegt (nach dem Hochscrollen des Layouts)
  useEffect(() => {
    const id = window.setTimeout(() => {
      // Nach einer frisch geschafften Lektion zu ihr (sie wird gefeiert), sonst zur aktuellen
      const fresh = celebrate.current ? document.querySelector<HTMLElement>(`[data-lesson="${celebrate.current}"]`) : null
      const el = fresh ?? currentRef.current
      const main = el?.closest('main')
      if (!el || !main) return
      const r = el.getBoundingClientRect()
      if (!fresh && r.bottom < window.innerHeight - 140) return
      main.scrollTo({ top: main.scrollTop + r.top - window.innerHeight * (fresh ? 0.42 : 0.4), behavior: reduce ? 'auto' : 'smooth' })
    }, 160)
    return () => clearTimeout(id)
    // nur beim Öffnen der Seite
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [lessonSheet, setLessonSheet] = useState<{ lesson: Lesson; unit: Unit } | null>(null)
  const [toggled, setToggled] = useState<Record<string, boolean>>({})

  const stateOf = (l: Lesson): NodeState => {
    if (isLessonDone(l, lessons[l.id])) return 'done'
    if (!isUnlocked(l.id, lessons)) return 'locked'
    return l.id === current?.id ? 'current' : 'open'
  }

  let worldNo = 0
  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-4 lg:pt-6">
      {doneCount > 0 && <DesignNotice />}
      <div className="xl:hidden">
        <TodayStrip />
      </div>

      {doneCount === 0 && (
        <div className="card mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
          <p className="min-w-[10rem] flex-1 text-[15px] font-bold">Schon Französisch gehabt?</p>
          <Link to="/placement" className="btn btn-ghost !min-h-10 !px-3 !py-2 !text-xs">Einstufungstest</Link>
          <Link to="/catchup" className="btn btn-ghost !min-h-10 !px-3 !py-2 !text-xs">Aufholen</Link>
        </div>
      )}
      {/* Höchstens ein Hinweis gleichzeitig: Sichern geht vor Installieren */}
      {backupDue(doneCount > 0) ? <BackupBanner /> : <InstallBanner />}

      <div className="mt-2 grid gap-5">
        {shown.map((unit, ui) => {
          const world = WORLDS[(unit.extra ? ui : worldNo++) % WORLDS.length]
          const number = shown.slice(0, ui + 1).filter((u) => !u.extra).length
          const reg = unit.lessons.filter(isRegular)
          const done = reg.filter((l) => isLessonDone(l, lessons[l.id])).length
          const unitDone = reg.length > 0 && done === reg.length
          const status: UnitStatus = unit === currentUnit ? 'current' : unitDone ? 'done' : 'upcoming'
          // Offen: die aktuelle Einheit und die zwei danach; Geschafftes und Fernes klappt man bei Bedarf auf
          const autoOpen = status === 'current' || (status === 'upcoming' && currentIndex >= 0 && ui > currentIndex && ui <= currentIndex + 2) || (currentIndex < 0 && status !== 'done')
          const expanded = toggled[unit.id] ?? autoOpen
          const locked = !isUnlocked(reg[0]?.id ?? '', lessons)
          const label = unit.extra ? 'Zusatz, freiwillig' : `Klasse ${unit.grade} · Einheit ${number}`
          return (
            <section key={unit.id} aria-labelledby={`h-${unit.id}`}>
              {expanded ? (
                <button
                  type="button"
                  onClick={() => setToggled((t) => ({ ...t, [unit.id]: false }))}
                  aria-expanded
                  className="sticky top-2 z-10 flex w-full items-center gap-3 rounded-[18px] px-4 py-3.5 text-left text-white"
                  style={{ background: world.c, boxShadow: `0 5px 0 ${world.s}` }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em] opacity-90">
                      <span className="truncate">{label}</span>
                      {unit.id === classUnit && <span className="shrink-0 rounded-md bg-white/25 px-1.5 py-px text-[10px]">Eure Klasse</span>}
                    </span>
                    <span id={`h-${unit.id}`} className="block truncate text-[21px] font-extrabold leading-tight" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.12)' }}>
                      {unit.title}
                    </span>
                    {status === 'current' && <span className="mt-0.5 line-clamp-2 block text-[13px] font-bold opacity-90">{unit.description}</span>}
                  </span>
                  <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/20 text-[13px] font-extrabold tabular-nums leading-none">
                    {done === reg.length && reg.length > 0 ? <Check size={22} /> : <>{done}<span className="mt-0.5 text-[10px] opacity-80">von {reg.length}</span></>}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setToggled((t) => ({ ...t, [unit.id]: true }))}
                  aria-expanded={false}
                  className="card press flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: locked ? 'var(--line)' : world.c, boxShadow: `0 3px 0 ${locked ? 'var(--shade-line)' : world.s}` }}>
                    {status === 'done' ? <Check size={20} /> : locked ? <Lock size={17} className="text-muted" /> : <Star size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">{label}</span>
                    <span id={`h-${unit.id}`} className="block truncate text-[17px] font-extrabold leading-tight">{unit.title}</span>
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-muted">{done}/{reg.length}</span>
                  <Chevron size={18} className="text-muted" />
                </button>
              )}

              {expanded && (
                <ol className="relative flex flex-col items-center gap-4 pb-2 pt-9">
                  {unit.lessons.map((lesson, li) => {
                    const state = stateOf(lesson)
                    const rec = lessons[lesson.id]
                    const offset = OFFSETS[(ui * 3 + li) % OFFSETS.length]
                    const kind = lesson.test ? 'test' : lesson.review ? 'review' : 'lesson'
                    const kindLabel = lesson.test ? 'Einheitentest' : lesson.review ? 'Wiederholung' : 'Lektion'
                    const isOpen = pop === lesson.id
                    return (
                      // Bewusst ohne Einblend-Animation beim Scrollen: Bei schnellem Wischen blieben sonst Knoten unsichtbar
                      <li key={lesson.id} data-lesson={lesson.id} ref={state === 'current' ? currentRef : undefined} style={{ transform: `translateX(${offset}px)` }} className={`relative flex flex-col items-center ${isOpen ? 'z-30' : ''}`}>
                        {state === 'current' && (
                          <>
                            <span className="animate-bob absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-[13px] font-extrabold uppercase tracking-wide shadow-[0_3px_0_var(--shade-line)]" style={{ color: world.c }}>
                              {rec ? 'Weiter' : 'Los!'}
                              <span aria-hidden className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-surface" />
                            </span>
                            <Mascot size={74} alive greet={greeting} bubbleSide="above" className={`absolute -top-3 ${offset >= 0 ? 'right-full mr-5' : 'left-full ml-5'}`} />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setPop(isOpen ? null : lesson.id)}
                          aria-expanded={isOpen}
                          aria-label={`${kindLabel}: ${lesson.title}${state === 'done' ? ', geschafft' : state === 'locked' ? ', gesperrt' : state === 'current' ? ', als Nächstes' : ''}`}
                          className="path-btn relative"
                        >
                          {celebrate.current === lesson.id && state === 'done' ? (
                            <motion.span className="block" initial={reduce ? false : { scale: 0.55 }} animate={{ scale: [0.55, 1.18, 1] }} transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}>
                              <PathNode state={state} kind={kind} color={world} />
                            </motion.span>
                          ) : (
                            <PathNode state={state} kind={kind} color={world} />
                          )}
                          {celebrate.current === lesson.id && state === 'done' && <Burst delay={0.6} />}
                        </button>
                        {isOpen && (
                          <LessonPopover
                            lesson={lesson}
                            unit={unit}
                            state={state}
                            color={world}
                            offset={offset}
                            reduce={!!reduce}
                            onWords={() => {
                              setPop(null)
                              setLessonSheet({ lesson, unit })
                            }}
                          />
                        )}
                      </li>
                    )
                  })}
                  {!unit.extra && reg.length > 0 && (() => {
                    const key = `chest:${unit.id}`
                    const ready = done === reg.length
                    const opened = unitChests.includes(unit.id)
                    const offset = OFFSETS[(ui * 3 + unit.lessons.length) % OFFSETS.length]
                    const isOpen = pop === key
                    return (
                      <li key={key} style={{ transform: `translateX(${offset}px)` }} className={`relative flex flex-col items-center pt-1 ${isOpen ? 'z-30' : ''}`}>
                        <button
                          type="button"
                          className="path-btn relative"
                          aria-label={opened ? 'Truhe dieser Einheit, schon geöffnet' : ready ? 'Truhe dieser Einheit öffnen' : 'Truhe dieser Einheit, noch verschlossen'}
                          onClick={() => {
                            if (ready && !opened) {
                              const coins = useStore.getState().openUnitChest(unit.id)
                              if (coins > 0) {
                                playChest()
                                setChestReward({ unit, coins })
                                window.setTimeout(() => mascotBus.emit('cheer'), 300)
                              }
                              return
                            }
                            setPop(isOpen ? null : key)
                          }}
                        >
                          <motion.span
                            className="block drop-shadow-[0_6px_0_rgba(0,0,0,0.12)]"
                            animate={ready && !opened && !reduce ? { rotate: [0, -7, 7, -4, 4, 0], y: [0, -6, 0] } : undefined}
                            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.2 }}
                          >
                            <Chest size={76} open={opened} className={ready || opened ? '' : 'opacity-40 grayscale'} />
                          </motion.span>
                          {ready && !opened && <span aria-hidden className="absolute -right-2 top-0 rounded-full bg-bad px-1.5 text-[11px] font-black text-white">!</span>}
                        </button>
                        {isOpen && (
                          <div className="absolute top-[88px] z-30 w-[min(280px,calc(100vw-2rem))]" style={{ left: '50%', marginLeft: `calc(-1 * min(140px, calc(50vw - 1rem)) - ${offset}px)` }}>
                            <div className="card relative p-4 text-center" style={{ boxShadow: '0 4px 0 var(--shade-line)' }}>
                              <p className="text-[17px] font-extrabold">{opened ? 'Schon geöffnet' : 'Truhe der Einheit'}</p>
                              <p className="mt-1 text-sm text-muted">{opened ? `Die Münzen dieser Einheit hast du dir schon geholt.` : `Schaffe alle Lektionen von „${unit.title}“, dann gibt es hier ${UNIT_CHEST_COINS} Münzen.`}</p>
                              {!opened && <p className="mt-2 text-sm font-extrabold text-gold-dark">Noch {reg.length - done} {reg.length - done === 1 ? 'Lektion' : 'Lektionen'}</p>}
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })()}
                </ol>
              )}
            </section>
          )
        })}
      </div>

      {/* Tippen außerhalb schließt das Lektions-Kärtchen (Klick, nicht schon beim Drücken) */}
      {pop && <button type="button" aria-label="Schließen" className="fixed inset-0 z-20 cursor-default" onClick={() => setPop(null)} />}
      <LessonSheet data={lessonSheet} onClose={() => setLessonSheet(null)} />
      <Sheet open={!!chestReward} onClose={() => setChestReward(null)} title="Truhe geöffnet!">
        {chestReward && (
          <div className="relative flex flex-col items-center pb-2 text-center">
            <Confetti count={44} />
            <div className="mt-8">
              <Mascot mood="cheer" size={110} pose="full" alive listen />
            </div>
            <span className="mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-gold/20"><Coin size={46} /></span>
            <p className="mt-3 text-[26px] font-black text-gold-dark">+{chestReward.coins} Münzen</p>
            <p className="mt-1 max-w-xs text-muted">Für die ganze Einheit „{chestReward.unit.title}“. Stark!</p>
            <button type="button" className="btn btn-primary press mt-5 w-full sm:w-64" onClick={() => setChestReward(null)} autoFocus>
              Super
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

/** Kärtchen unter dem angetippten Knoten: Titel, worum es geht, und der große Start-Knopf. */
function LessonPopover({ lesson, unit, state, color, offset, reduce, onWords }: { lesson: Lesson; unit: Unit; state: NodeState; color: { c: string; s: string }; offset: number; reduce: boolean; onWords: () => void }) {
  const navigate = useNavigate()
  const records = useStore((s) => s.lessons)
  const rec = records[lesson.id]
  const locked = state === 'locked'
  const blocker = locked ? blockingLesson(lesson.id, records) : undefined
  const regular = unit.lessons.filter(isRegular)
  const pos = regular.findIndex((l) => l.id === lesson.id)
  const sub = lesson.test
    ? '15 Fragen ohne Hilfe, bestanden ab 70 %'
    : lesson.review
      ? 'Die Wörter der Einheit, gemischt'
      : `Lektion ${pos + 1} von ${regular.length} · ${lesson.items.length} Wörter`
  const bg = locked ? 'var(--snow)' : color.c
  const box = useRef<HTMLDivElement>(null)
  // Ganz sichtbar machen: nicht hinter der Tab-Leiste verstecken
  useEffect(() => {
    const el = box.current
    const main = el?.closest('main')
    if (!el || !main) return
    const bottomLimit = window.innerHeight - (window.matchMedia('(min-width: 1024px)').matches ? 24 : 112)
    const over = el.getBoundingClientRect().bottom - bottomLimit
    if (over > 0) main.scrollBy({ top: over + 8, behavior: reduce ? 'auto' : 'smooth' })
  }, [reduce])
  return (
    // Das Kärtchen steht mittig in der Spalte, der Pfeil zeigt auf den Knoten
    <div ref={box} className="absolute top-[96px] z-30 w-[min(310px,calc(100vw-2rem))]" style={{ left: '50%', marginLeft: `calc(-1 * min(155px, calc(50vw - 1rem)) - ${offset}px)` }}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING.snappy}
        className={`relative rounded-[20px] p-4 ${locked ? 'border-2 border-line text-ink' : 'text-white'}`}
        style={{ background: bg, boxShadow: locked ? '0 4px 0 var(--shade-line)' : `0 5px 0 ${color.s}`, transformOrigin: `calc(50% + ${offset}px) 0` }}
      >
        <span aria-hidden className={`absolute -top-2 h-4 w-4 rotate-45 ${locked ? 'border-l-2 border-t-2 border-line' : ''}`} style={{ left: `calc(50% + ${offset}px - 8px)`, background: bg }} />
        <p className="text-[19px] font-extrabold leading-tight">{lesson.title}</p>
        <p className={`mt-0.5 text-sm font-bold ${locked ? 'text-muted' : 'opacity-90'}`}>{sub}</p>
        {rec && state !== 'done' && !locked && <p className="mt-1 text-sm font-bold opacity-90">Bisher {Math.round(rec.bestAccuracy * 100)} %, nötig {Math.round(passMark(lesson) * 100)} %</p>}
        {locked ? (
          <>
            <p className="mt-2 text-sm text-muted">Schließe zuerst {blocker ? <b className="text-ink">„{blocker.title}“</b> : 'die Lektionen davor'} ab.</p>
            <button type="button" disabled className="btn mt-3 w-full">Gesperrt</button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/lesson/${lesson.id}`)}
            className="btn mt-3 w-full bg-white"
            style={{ color: color.s, '--edge': 'rgba(0,0,0,0.2)' } as React.CSSProperties}
            autoFocus
          >
            {state === 'done' ? 'Nochmal üben' : rec ? 'Nochmal versuchen' : state === 'current' ? 'Los geht’s' : 'Starten'}
          </button>
        )}
        {!lesson.review && !lesson.test && (
          <button type="button" onClick={onWords} className={`mt-1 w-full rounded-xl py-2 text-sm font-extrabold underline-offset-4 hover:underline ${locked ? 'text-sky-dark' : 'text-white/95'}`}>
            Wörter ansehen
          </button>
        )}
      </motion.div>
    </div>
  )
}

function LessonSheet({ data, onClose }: { data: { lesson: Lesson; unit: Unit } | null; onClose: () => void }) {
  const navigate = useNavigate()
  const records = useStore((s) => s.lessons)
  const lesson = data?.lesson
  const unit = data?.unit
  const locked = !!lesson && !isUnlocked(lesson.id, records)

  return (
    <Sheet open={!!data} onClose={onClose}>
      {lesson && unit && (
        <div>
          <p className="eyebrow mb-1">{unit.title}</p>
          <h2 className="mb-1 text-2xl font-extrabold">{lesson.title}</h2>
          <p className="mb-4 text-sm text-muted">
            {lesson.items.length} neue Wörter{lesson.explanation ? ' · mit kurzer Erklärung' : ''} · ca. {Math.max(3, Math.round(lesson.items.length * 1.2))} Minuten
          </p>
          <ul className="mb-5 grid gap-1.5">
            {lesson.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-snow px-3 py-2">
                <SpeakButton text={it.front} />
                <span className="min-w-0 flex-1">
                  <span lang="fr" className="block truncate font-extrabold">{it.front}</span>
                  <span className="block truncate text-sm text-muted">{it.back}</span>
                </span>
              </li>
            ))}
          </ul>
          {locked ? (
            <p className="flex items-start gap-2 rounded-2xl bg-snow px-4 py-3 text-sm">
              <span className="mt-0.5 text-muted"><Lock size={18} /></span>
              <span>Noch gesperrt. Schließe zuerst die Lektionen davor ab, dann geht es hier weiter.</span>
            </p>
          ) : (
            <button className="btn btn-primary w-full" onClick={() => navigate(`/lesson/${lesson.id}`)} autoFocus>
              Starten
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
