import { motion, useReducedMotion } from 'framer-motion'
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

const OFFSETS = [0, 34, 52, 34, 0, -34, -52, -34]
/** Höhe einer Zeile im Pfad: Knoten 64 + Abstand 8 + Beschriftung 32 + Lücke 36. Feste Höhe, damit die Linien exakt treffen. */
const ROW = 140
const NODE_CENTER = 32

/** Verbindungslinien zwischen den Knoten: erledigte Strecken durchgezogen, der Rest gepunktet. */
function PathLines({ states, offsets }: { states: NodeState[]; offsets: number[] }) {
  const reduce = useReducedMotion()
  return (
    <svg aria-hidden className="pointer-events-none absolute left-1/2 top-0 overflow-visible" width="1" height="1">
      {offsets.slice(0, -1).map((x1, i) => {
        const x2 = offsets[i + 1]
        const y1 = NODE_CENTER + i * ROW
        const y2 = NODE_CENTER + (i + 1) * ROW
        const d = `M ${x1} ${y1} C ${x1} ${y1 + ROW * 0.55}, ${x2} ${y2 - ROW * 0.55}, ${x2} ${y2}`
        return states[i] === 'done' ? (
          <motion.path key={i} d={d} fill="none" stroke="var(--brand)" strokeWidth={6} strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 }} />
        ) : (
          <path key={i} d={d} fill="none" stroke="var(--muted)" strokeOpacity={0.4} strokeWidth={5} strokeLinecap="round" strokeDasharray="1 13" />
        )
      })}
    </svg>
  )
}

/** Heute: Tagesziel, fällige Wörter und Aufholplan als eine ruhige Liste. */
function TodayCard() {
  const navigate = useNavigate()
  const { xpByDay, dailyGoal, streak, classUnit, catchUpTarget, catchUpAll, catchUpExtras, catchUpOngoing, lessons } = useStore()
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
/** KI direkt auf der Startseite: Ein Tipp auf eine Frage öffnet die KI mit der Frage schon im Eingabefeld. */
const COACH_QUESTIONS = [
  { label: 'Klassenarbeit planen', q: 'Hilf mir, mich auf meine nächste Klassenarbeit vorzubereiten.' },
  { label: 'Wörter abfragen', q: 'Frag mich Vokabeln ab, bei denen es bei mir hakt.' },
  { label: 'Grammatik erklären', q: 'Erkläre mir den Unterschied zwischen passé composé und imparfait.' },
]
function CoachCard() {
  return (
    <section className="card mb-4 p-4" aria-label="KI">
      <Link to="/coach" className="press group flex items-center gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center text-brand-dark">
          <Sparkle size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-tight">Frag die KI</span>
          <span className="block text-sm text-muted">Für Klassenarbeiten, Grammatik und schwierige Wörter</span>
        </span>
        <Right size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
      <div className="-mx-4 mt-3.5 flex gap-2 overflow-x-auto px-4 pb-0.5" role="list" aria-label="Fragen an die KI">
        {COACH_QUESTIONS.map((c) => (
          <Link key={c.label} role="listitem" to={`/coach?q=${encodeURIComponent(c.q)}`} className="press shrink-0 rounded-full border border-line bg-snow px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand/40 hover:bg-brand-soft">
            {c.label}
          </Link>
        ))}
      </div>
    </section>
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
  const current = all.find((l) => !isLessonDone(l, lessons[l.id]) && isUnlocked(l.id, lessons) && !l.test)
  const currentUnit = shown.find((u) => u.lessons.some((l) => l.id === current?.id))

  const [lessonSheet, setLessonSheet] = useState<{ lesson: Lesson; unit: Unit } | null>(null)
  const [unitSheet, setUnitSheet] = useState<Unit | null>(null)

  const stateOf = (l: Lesson): NodeState => {
    if (isLessonDone(l, lessons[l.id])) return 'done'
    if (!isUnlocked(l.id, lessons)) return 'locked'
    return l.id === current?.id ? 'current' : 'open'
  }

  return (
    <div className="mx-auto max-w-[620px] px-4 pb-10 pt-4 lg:pt-6">
      {/* Weiterlernen: der eine große Block der Startseite, mit dem Fuchs */}
      <section className="relative mb-5 overflow-hidden rounded-[28px] bg-brand-strong p-5 pr-28 text-on-brand" aria-label="Weiterlernen">
        <p className="text-sm font-medium opacity-85">
          Französisch, Klasse {grade}
        </p>
        {current ? (
          <>
            <h1 className="mt-1 text-[26px] font-bold leading-tight">{doneCount === 0 ? 'Fang hier an' : 'Weiter geht’s'}</h1>
            <p className="mt-0.5 text-[17px] font-medium leading-snug opacity-95">{current.title}</p>
          </>
        ) : (
          <h1 className="mt-1 text-[22px] font-bold leading-tight">Alle Lektionen dieser Klasse sind geschafft</h1>
        )}
        <div className="mt-4 h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-white/30" role="progressbar" aria-valuemin={0} aria-valuemax={regular.length} aria-valuenow={doneCount} aria-label="Fortschritt in dieser Klasse">
          <div className="h-full rounded-full bg-white" style={{ width: `${regular.length ? Math.max(3, (doneCount / regular.length) * 100) : 0}%` }} />
        </div>
        <p className="mt-1.5 text-sm opacity-85">
          {doneCount} von {regular.length} Lektionen geschafft
        </p>
        {current ? (
          <button className="press mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 text-[15px] font-bold text-brand-dark" onClick={() => navigate(`/lesson/${current.id}`)}>
            {doneCount === 0 ? 'Los geht’s' : 'Weitermachen'} <Right size={18} />
          </button>
        ) : (
          <p className="mt-3 text-sm opacity-90">Wiederhole sie im Tab „Üben“.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          <Link to="/catchup" className="underline decoration-white/50 underline-offset-4">
            Unterricht schon weiter? Aufholen
          </Link>
          {doneCount === 0 && (
            <Link to="/placement" className="underline decoration-white/50 underline-offset-4">
              Vorwissen? Einstufungstest
            </Link>
          )}
        </div>
        <Mascot mood="cheer" size={112} className="pointer-events-none absolute -bottom-3 -right-3 rotate-[-6deg]" blink />
      </section>

      <TodayCard />

      {doneCount > 0 && <CoachCard />}
      <InstallBanner />
      <BackupBanner />

      {shown.map((unit, ui) => {
        const regularInUnit = unit.lessons.filter((l) => !l.review && !l.test)
        const done = regularInUnit.filter((l) => isLessonDone(l, lessons[l.id])).length
        const pct = regularInUnit.length ? done / regularInUnit.length : 0
        const unitLocked = !isUnlocked(regularInUnit[0].id, lessons)
        const states = unit.lessons.map(stateOf)
        const offsets = unit.lessons.map((_, li) => OFFSETS[(ui * 3 + li) % OFFSETS.length])
        return (
          <section
            key={unit.id}
            className="mb-10"
            aria-labelledby={`h-${unit.id}`}
            // Weit entfernte Einheiten werden erst beim Heranscrollen gezeichnet: spart viel Arbeit auf dem Handy
            style={ui > 0 ? { contentVisibility: 'auto', containIntrinsicSize: `auto ${unit.lessons.length * 140 + 120}px` } : undefined}
          >
            <button type="button" onClick={() => setUnitSheet(unit)} className={`card lift sticky top-2 z-10 flex w-full items-center gap-4 p-4 text-left ${unitLocked ? 'opacity-70' : ''}`}>
              <ProgressRing pct={pct} size={52} stroke={5}>
                {unitLocked ? <Lock size={18} /> : <span className="text-sm font-bold">{unit.extra ? '+' : shown.slice(0, ui + 1).filter((u) => !u.extra).length}</span>}
              </ProgressRing>
              <div className="min-w-0 flex-1">
                {(unit.book || unit.extra || unit.id === classUnit) && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                    <span className="truncate">{unit.extra ? 'Zusatzwortschatz, freiwillig' : unit.book}</span>
                    {unit.id === classUnit && <span className="shrink-0 rounded bg-brand-strong px-1.5 py-px text-[10px] text-on-brand">Eure Klasse</span>}
                  </p>
                )}
                <h2 id={`h-${unit.id}`} className="truncate font-semibold leading-tight">{unit.title}</h2>
                <p className="truncate text-sm text-muted">{unit.description}</p>
              </div>
              <span className="shrink-0 text-sm font-medium text-muted">{done}/{regularInUnit.length}</span>
            </button>

            <div className="relative mt-8">
              <PathLines states={states} offsets={offsets} />
              <ol className="relative flex flex-col items-center gap-9">
                {unit.lessons.map((lesson, li) => {
                  const state = states[li]
                  const rec = lessons[lesson.id]
                  const attempted = !!rec && state !== 'done'
                  const offset = offsets[li]
                  const kind = lesson.test ? 'Einheitentest' : lesson.review ? 'Wiederholung' : 'Lektion'
                  const base = 'relative flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold'
                  const tone =
                    state === 'done'
                      ? 'bg-brand text-white'
                      : state === 'current'
                        ? 'bg-brand text-white ring-4 ring-brand/25'
                        : state === 'locked'
                          ? 'border border-line bg-snow text-muted'
                          : lesson.review || lesson.test
                            ? 'border-2 border-dashed border-brand/60 bg-surface text-brand-dark hover:bg-brand-soft'
                            : 'border-2 border-brand bg-surface text-brand-dark hover:bg-brand-soft'
                  const icon =
                    state === 'done' ? <Check size={26} /> : lesson.test ? <Trophy size={24} /> : lesson.review ? <Repeat size={24} /> : state === 'locked' ? <Lock size={22} /> : li + 1
                  return (
                    // Bewusst ohne Einblend-Animation beim Scrollen: Bei schnellem Wischen blieben sonst Knoten unsichtbar
                    <li key={lesson.id} style={{ transform: `translateX(${offset}px)` }} className="relative flex h-[104px] flex-col items-center">
                      {state === 'current' && unit.id === currentUnit?.id && (
                        <motion.span
                          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ ...SPRING.snappy, delay: 0.3 }}
                          className="absolute -top-8 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-surface"
                        >
                          Weiter hier
                          <span aria-hidden className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink" />
                        </motion.span>
                      )}
                      <span className="relative">
                        {state === 'current' && !reduce && <span aria-hidden className="animate-halo absolute inset-0 rounded-full bg-brand" />}
                        <button
                          type="button"
                          onClick={() => setLessonSheet({ lesson, unit })}
                          aria-label={`${kind}: ${lesson.title}${state === 'done' ? ' – geschafft' : state === 'locked' ? ' – gesperrt' : state === 'current' ? ' – als Nächstes' : ''}`}
                          className={`${base} ${tone} transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.06] active:scale-90`}
                          style={state === 'done' || state === 'current' ? { boxShadow: '0 4px 0 var(--shade-brand)' } : undefined}
                        >
                          {icon}
                          {attempted && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-[10px] font-bold text-ink">{Math.round(rec.bestAccuracy * 100)}%</span>}
                        </button>
                      </span>
                      <p className="mt-2 line-clamp-2 h-8 w-36 text-center text-xs font-medium leading-4 text-muted">
                        <span className="box-decoration-clone rounded bg-page px-1.5 py-px">{lesson.title}</span>
                      </p>
                    </li>
                  )
                })}
              </ol>
            </div>
          </section>
        )
      })}

      <LessonSheet data={lessonSheet} onClose={() => setLessonSheet(null)} />
      <UnitSheet unit={unitSheet} onClose={() => setUnitSheet(null)} onPick={(lesson, unit) => { setUnitSheet(null); setLessonSheet({ lesson, unit }) }} />
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

function UnitSheet({ unit, onClose, onPick }: { unit: Unit | null; onClose: () => void; onPick: (lesson: Lesson, unit: Unit) => void }) {
  const records = useStore((s) => s.lessons)
  return (
    <Sheet open={!!unit} onClose={onClose} wide>
      {unit && (
        <div>
          <p className="eyebrow mb-1">Klasse {unit.grade}</p>
          <h2 className="mb-1 text-2xl font-semibold">{unit.title}</h2>
          <p className="mb-4 text-muted">{unit.description}</p>
          <ul className="grid gap-2">
            {unit.lessons.map((l) => {
              const done = isLessonDone(l, records[l.id])
              const locked = !isUnlocked(l.id, records)
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => onPick(l, unit)} className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:bg-snow">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-brand text-white' : locked ? 'bg-snow text-muted' : 'border-2 border-brand text-brand-dark'}`}>
                      {done ? <Check size={16} /> : locked ? <Lock size={14} /> : l.test ? <Trophy size={16} /> : l.review ? <Repeat size={16} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.title}</span>
                      <span className="block text-xs text-muted">{l.test ? 'Test' : l.review ? 'Wiederholung' : `${l.items.length} Wörter`}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Sheet>
  )
}
