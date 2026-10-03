import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { blockingLesson, grades, isLessonDone, isUnlocked, passMark, units } from '../../content'
import { SpeakButton } from '../../components/exercises/common'
import { Bolt, Check, Flame, Lock, Repeat, Right, Sparkle, Target, Trophy } from '../../components/ui/Icons'
import { Mascot } from '../../components/mascot/Mascot'
import { EASE, SPRING } from '../../components/ui/motion'
import { Sheet } from '../../components/ui/Sheet'
import { ProgressRing } from '../../components/ui/widgets'
import type { Lesson, Unit } from '../../lib/types'
import { BackupBanner } from '../../components/ui/BackupBanner'
import { InstallBanner } from '../../components/ui/InstallApp'
import { catchUpStatus } from '../../lib/catchup'
import { goalInfo } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { useDue } from '../review/ReviewPage'
import { useShallow } from 'zustand/react/shallow'

const OFFSETS = [0, 46, 70, 46, 0, -46, -70, -46]

/** Sechseck-Knoten mit Unterkante, wie die Lektions-Symbole bei SideMe, nur in Orange. */
function HexNode({ state, test, children }: { state: NodeState; test: boolean; children: React.ReactNode }) {
  const locked = state === 'locked'
  const main = locked ? 'var(--snow)' : test ? 'var(--gold)' : 'var(--brand)'
  const shade = locked ? 'var(--shade-line)' : test ? 'var(--shade-gold)' : 'var(--shade-brand)'
  const d = 'M32 5 L58 20 L58 50 L32 65 L6 50 L6 20 Z'
  return (
    <span className="relative block h-[80px] w-[72px]" aria-hidden>
      <svg viewBox="0 0 64 72" width="72" height="80" className="absolute inset-0 overflow-visible">
        <path d={d} transform="translate(0 6)" fill={shade} stroke={shade} strokeWidth="8" strokeLinejoin="round" />
        <path d={d} fill={main} stroke={main} strokeWidth="8" strokeLinejoin="round" />
        {!locked && <path d={d} transform="translate(32 35) scale(0.7) translate(-32 -35)" fill="#ffffff" fillOpacity="0.22" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="6" strokeLinejoin="round" />}
      </svg>
      <span className={`absolute inset-x-0 top-0 flex h-[70px] items-center justify-center ${locked ? 'text-muted' : 'text-on-brand'}`}>{children}</span>
    </span>
  )
}

/** Heute: Tagesziel, fällige Wörter und Aufholplan als eine ruhige Liste. */
function TodayCard() {
  const navigate = useNavigate()
  const { xpByDay, dailyGoal, streak, classUnit, catchUpTarget, catchUpAll, catchUpExtras, catchUpOngoing, lessons } = useStore(useShallow((s) => ({ xpByDay: s.xpByDay, dailyGoal: s.dailyGoal, streak: s.streak, classUnit: s.classUnit, catchUpTarget: s.catchUpTarget, catchUpAll: s.catchUpAll, catchUpExtras: s.catchUpExtras, catchUpOngoing: s.catchUpOngoing, lessons: s.lessons })))
  const { due } = useDue()
  const plan = classUnit && catchUpTarget ? catchUpStatus(classUnit, catchUpTarget, lessons, new Date(), catchUpAll, catchUpExtras, catchUpOngoing) : null
  const today = xpToday(xpByDay)
  const g = goalInfo(dailyGoal, today)
  const days = streakNow(streak)
  const done = g.baseReached
  const row = 'press flex w-full items-center gap-3.5 px-4 py-3.5 text-left'
  return (
    <section className="card mb-5 divide-y divide-line overflow-hidden" aria-label="Heute">
      <div className="flex items-center gap-4 px-4 py-4">
        <ProgressRing key={g.goal} pct={g.pct} size={52} stroke={5} color={done ? 'var(--good)' : 'var(--gold)'}>
          {done ? <Check size={20} className="text-good" /> : <Bolt size={22} />}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{done ? (g.tier === 1 ? 'Tagesziel geschafft' : 'Bonusziel geschafft') : `Noch ${g.goal - today} XP bis zum Tagesziel`}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <Flame size={15} /> {days} {days === 1 ? 'Tag' : 'Tage'} Serie
            {done ? `, nächstes Bonusziel bei ${g.goal} XP` : today === 0 && days > 0 ? ', heute lernen hält sie' : ''}
          </p>
        </div>
      </div>
      {due.length > 0 && (
        <button type="button" className={row} onClick={() => navigate('/review/play')}>
          <Repeat size={22} className="shrink-0 text-brand-dark" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {due.length} {due.length === 1 ? 'Wort' : 'Wörter'} wiederholen
            </span>
            <span className="block text-sm text-muted">{due.length >= 20 ? 'Erst das, dann Neues: So bleibt es länger hängen.' : 'Kurz bevor du sie vergessen würdest'}</span>
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </button>
      )}
      {plan && !plan.finished && (
        <button type="button" className={row} onClick={() => navigate('/catchup')}>
          <Target size={22} className="shrink-0 text-brand-dark" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Aufholen: {plan.toGoToday > 0 ? `heute noch ${plan.toGoToday} ${plan.toGoToday === 1 ? 'Lektion' : 'Lektionen'}` : 'Tagesziel geschafft'}</span>
            <span className="block text-sm text-muted">
              Noch {plan.remaining} Lektionen in {plan.daysLeft} {plan.daysLeft === 1 ? 'Tag' : 'Tagen'}
            </span>
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </button>
      )}
    </section>
  )
}
/** KI auf der Startseite: eine ruhige Zeile, die Beispielfragen stehen im KI-Tab. */
function CoachCard() {
  return (
    <Link to="/coach" className="card press group mb-4 flex items-center gap-3.5 p-4" aria-label="KI öffnen">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center text-brand-dark">
        <Sparkle size={26} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight">Frag die KI</span>
        <span className="block text-sm text-muted">Für Klassenarbeiten, Grammatik und schwierige Wörter</span>
      </span>
      <Right size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

type NodeState = 'done' | 'current' | 'open' | 'locked'

export function LearnPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const lessons = useStore((s) => s.lessons)
  const classUnit = useStore((s) => s.classUnit)
  const storedGrade = useStore((s) => s.grade)
  const grade = grades.includes(storedGrade) ? storedGrade : grades[0]
  const shown = useMemo(() => units.filter((u) => u.grade === grade), [grade])
  // Zusatzeinheiten (Berliner Lehrwerke) sind freiwillig und zählen nicht zum Kursfortschritt
  const all = shown.filter((u) => !u.extra).flatMap((u) => u.lessons)
  const regular = all.filter((l) => !l.review && !l.test)
  const doneCount = regular.filter((l) => isLessonDone(l, lessons[l.id])).length
  // Nächste Lektion: die erste offene, die noch nicht geschafft ist
  const open = (l: Lesson) => !isLessonDone(l, lessons[l.id]) && isUnlocked(l.id, lessons) && !l.test
  // Erst die nächste normale Lektion, Wiederholungen der Einheit erst, wenn nichts Neues mehr offen ist
  const current = all.find((l) => open(l) && !l.review) ?? all.find(open)
  const currentUnit = shown.find((u) => u.lessons.some((l) => l.id === current?.id))

  // Der Fuchs begrüßt dich passend zum Tag
  const streakDays = streakNow(useStore.getState().streak)
  const greeting = doneCount === 0 ? 'Bonjour ! Fangen wir an.' : streakDays >= 3 ? `${streakDays} Tage Serie, weiter so!` : 'Salut ! Weiter geht’s.'

  const [lessonSheet, setLessonSheet] = useState<{ lesson: Lesson; unit: Unit } | null>(null)
  /** Nur die Einheit, in der man gerade lernt, ist offen. Alles andere klappt man bei Bedarf auf. */
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({})
  const isOpen = (u: Unit) => openUnits[u.id] ?? u.id === currentUnit?.id
  const toggle = (u: Unit) => setOpenUnits((o) => ({ ...o, [u.id]: !isOpen(u) }))

  const stateOf = (l: Lesson): NodeState => {
    if (isLessonDone(l, lessons[l.id])) return 'done'
    if (!isUnlocked(l.id, lessons)) return 'locked'
    return l.id === current?.id ? 'current' : 'open'
  }

  return (
    <div className="mx-auto max-w-[620px] px-4 pb-10 pt-4 lg:pt-6">
      {/* Weiterlernen: der eine große Block der Startseite, mit dem Fuchs */}
      <section className="relative mb-5 overflow-hidden rounded-[28px] bg-brand-strong p-5 pr-28 text-on-brand" aria-label="Weiterlernen">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] opacity-80">Französisch, Klasse {grade}</p>
        {current ? (
          <>
            <h1 className="mt-1 text-[28px] font-extrabold leading-tight">{doneCount === 0 ? 'Fang hier an' : 'Weiter geht’s'}</h1>
            <p className="mt-0.5 text-[17px] font-medium leading-snug opacity-95">{current.title}</p>
          </>
        ) : (
          <h1 className="mt-1 text-[22px] font-bold leading-tight">Alle Lektionen dieser Klasse sind geschafft</h1>
        )}
        <div className="mt-4 h-2.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-black/20" role="progressbar" aria-valuemin={0} aria-valuemax={regular.length} aria-valuenow={doneCount} aria-label="Fortschritt in dieser Klasse">
          <div className="h-full rounded-full bg-on-brand" style={{ width: `${regular.length ? Math.max(4, (doneCount / regular.length) * 100) : 0}%` }} />
        </div>
        <p className="mt-1.5 text-sm opacity-85">
          {doneCount} von {regular.length} Lektionen geschafft
        </p>
        {current ? (
          <button className="press mt-4 mb-1 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#0e1b28] px-5 text-[14px] font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_4px_0_rgba(0,0,0,0.35)]" onClick={() => navigate(`/lesson/${current.id}`)}>
            {doneCount === 0 ? 'Los geht’s' : 'Weitermachen'} <Right size={18} />
          </button>
        ) : (
          <p className="mt-3 text-sm opacity-90">Wiederhole sie im Tab „Üben“.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          <Link to="/catchup" className="underline decoration-current/50 underline-offset-4">
            Unterricht schon weiter? Aufholen
          </Link>
          {doneCount === 0 && (
            <Link to="/placement" className="underline decoration-current/50 underline-offset-4">
              Vorwissen? Einstufungstest
            </Link>
          )}
        </div>
        <Mascot size={128} alive greet={greeting} bubbleSide="right" className="absolute -bottom-4 -right-3" />
      </section>

      <TodayCard />

      {doneCount > 0 && <CoachCard />}
      <InstallBanner />
      <BackupBanner />

      <div className="grid gap-5">
        {shown.map((unit, ui) => {
          const regularInUnit = unit.lessons.filter((l) => !l.review && !l.test)
          const done = regularInUnit.filter((l) => isLessonDone(l, lessons[l.id])).length
          const pct = regularInUnit.length ? done / regularInUnit.length : 0
          const unitDone = regularInUnit.length > 0 && done === regularInUnit.length
          const unitLocked = !isUnlocked(regularInUnit[0].id, lessons)
          const expanded = isOpen(unit)
          const number = shown.slice(0, ui + 1).filter((u) => !u.extra).length
          const states = unit.lessons.map(stateOf)
          const offsets = unit.lessons.map((_, li) => OFFSETS[(ui * 3 + li) % OFFSETS.length])
          return (
            <section key={unit.id} aria-labelledby={`h-${unit.id}`}>
              {/* Kapitel-Banner wie bei SideMe: die offene Einheit in Orange, alle anderen ruhig */}
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggle(unit)}
                className={`press sticky top-2 z-10 flex w-full items-center gap-3.5 rounded-[20px] p-4 text-left ${expanded ? 'bg-brand-strong text-on-brand shadow-[0_4px_0_var(--shade-brand)]' : 'card'} ${unitLocked && !expanded ? 'opacity-70' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] ${expanded ? 'opacity-80' : 'text-muted'}`}>
                    <span className="truncate">{unit.extra ? 'Zusatz, freiwillig' : `Klasse ${unit.grade}, Einheit ${number}`}</span>
                    {unit.id === classUnit && <span className={`shrink-0 rounded px-1.5 py-px text-[10px] ${expanded ? 'bg-on-brand text-brand-strong' : 'bg-brand-strong text-on-brand'}`}>Eure Klasse</span>}
                  </span>
                  <span id={`h-${unit.id}`} className="block truncate text-[19px] font-extrabold leading-tight">{unit.title}</span>
                  {expanded && <span className="mt-0.5 block text-sm font-medium opacity-80">{unit.description}</span>}
                </span>
                <ProgressRing pct={pct} size={46} stroke={5} color={expanded ? 'var(--on-brand)' : unitDone ? 'var(--good)' : 'var(--brand)'} track={expanded ? 'rgba(0,0,0,0.2)' : undefined}>
                  {unitDone ? <Check size={18} /> : unitLocked ? <Lock size={16} /> : <span className="text-[12px] font-extrabold tabular-nums">{done}/{regularInUnit.length}</span>}
                </ProgressRing>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="nodes"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <ol className="relative flex flex-col items-center gap-3 pb-4 pt-8">
                      {unit.lessons.map((lesson, li) => {
                        const state = states[li]
                        const rec = lessons[lesson.id]
                        const attempted = !!rec && state !== 'done'
                        const offset = offsets[li]
                        const kind = lesson.test ? 'Einheitentest' : lesson.review ? 'Wiederholung' : 'Lektion'
                        return (
                          // Bewusst ohne Einblend-Animation beim Scrollen: Bei schnellem Wischen blieben sonst Knoten unsichtbar
                          <li key={lesson.id} style={{ transform: `translateX(${offset}px)` }} className="relative flex flex-col items-center">
                            {state === 'current' && (
                              <>
                                <motion.span
                                  initial={reduce ? false : { opacity: 0, y: 6, scale: 0.9 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ ...SPRING.snappy, delay: 0.3 }}
                                  className="absolute -top-7 z-10 whitespace-nowrap rounded-xl bg-ink px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-surface"
                                >
                                  Start
                                  <span aria-hidden className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink" />
                                </motion.span>
                                <Mascot size={68} alive className={`pointer-events-none absolute top-0 ${offset >= 0 ? 'right-full mr-2' : 'left-full ml-2'}`} />
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setLessonSheet({ lesson, unit })}
                              aria-label={`${kind}: ${lesson.title}${state === 'done' ? ', geschafft' : state === 'locked' ? ', gesperrt' : state === 'current' ? ', als Nächstes' : ''}`}
                              className="press relative"
                            >
                              {state === 'current' && !reduce && <span aria-hidden className="animate-halo absolute inset-1 rounded-full bg-brand" />}
                              <HexNode state={state} test={!!lesson.test}>
                                {state === 'done' ? <Check size={26} /> : lesson.test ? <Trophy size={26} /> : lesson.review ? <Repeat size={26} /> : state === 'locked' ? <Lock size={22} /> : <span className="text-xl font-extrabold">{li + 1}</span>}
                              </HexNode>
                              {attempted && <span className="absolute -right-2 -top-1 rounded-full bg-gold px-1.5 text-[10px] font-extrabold text-on-brand">{Math.round(rec.bestAccuracy * 100)}%</span>}
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )
        })}
      </div>

      <LessonSheet data={lessonSheet} onClose={() => setLessonSheet(null)} />
    </div>
  )
}

function LessonSheet({ data, onClose }: { data: { lesson: Lesson; unit: Unit } | null; onClose: () => void }) {
  const navigate = useNavigate()
  const records = useStore((s) => s.lessons)
  const lesson = data?.lesson
  const unit = data?.unit
  const rec = lesson ? records[lesson.id] : undefined
  const done = lesson ? isLessonDone(lesson, rec) : false
  const blocker = lesson ? blockingLesson(lesson.id, records) : undefined
  const locked = !!lesson && !isUnlocked(lesson.id, records)

  return (
    <Sheet open={!!data} onClose={onClose}>
      {lesson && unit && (
        <div>
          <p className="eyebrow mb-1">{unit.title}</p>
          <h2 className="mb-1 text-2xl font-semibold">{lesson.title}</h2>
          <p className="mb-4 text-sm text-muted">
            {lesson.test
              ? '15 gemischte Fragen ohne Hilfe. Bestanden ab 70 % richtig.'
              : lesson.review
                ? 'Die schwächsten Wörter dieser Einheit, gemischt abgefragt.'
                : `${lesson.items.length} neue Wörter${lesson.explanation ? ' · mit kurzer Erklärung' : ''} · ca. ${Math.max(3, Math.round(lesson.items.length * 1.2))} Minuten`}
          </p>

          {!lesson.review && !lesson.test && (
            <ul className="mb-5 grid gap-1.5">
              {lesson.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 rounded-xl bg-snow px-3 py-2">
                  <SpeakButton text={it.front} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{it.front}</span>
                    <span className="block truncate text-sm text-muted">{it.back}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {rec && !done && (
            <p className="mb-4 rounded-xl bg-gold/15 px-4 py-3 text-sm text-gold-dark">
              Letzter Versuch: {Math.round(rec.bestAccuracy * 100)} % beim ersten Mal. Du brauchst {Math.round(passMark(lesson) * 100)} %, damit es weitergeht.
            </p>
          )}

          {locked ? (
            <div>
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-snow px-4 py-3 text-sm">
                <span className="mt-0.5 text-muted"><Lock size={18} /></span>
                <span>Gesperrt. Schließe zuerst {blocker ? <b>„{blocker.title}“</b> : 'die vorherigen Lektionen'} ab. So bleibt alles im Kopf, statt dass du Lücken mitschleppst.</span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {blocker && isUnlocked(blocker.id, records) && (
                  <button className="btn btn-primary" onClick={() => navigate(`/lesson/${blocker.id}`)}>Zu „{blocker.title}“</button>
                )}
                <Link to="/placement" className="btn btn-ghost">Einstufungstest machen</Link>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary w-full" onClick={() => navigate(`/lesson/${lesson.id}`)} autoFocus>
              {done ? 'Nochmal üben' : rec ? 'Nochmal versuchen' : 'Start'}
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
