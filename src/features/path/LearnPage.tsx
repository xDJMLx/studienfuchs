import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { blockingLesson, grades, isLessonDone, isUnlocked, passMark, units } from '../../content'
import { SpeakButton } from '../../components/exercises/common'
import { FrenchFlag } from '../../components/ui/CoursePicker'
import { Bolt, Check, Flame, Lock, Repeat, Right, Trophy } from '../../components/ui/Icons'
import { EASE } from '../../components/ui/motion'
import { Sheet } from '../../components/ui/Sheet'
import { ProgressBar, ProgressRing } from '../../components/ui/widgets'
import type { Lesson, Unit } from '../../lib/types'
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
          <motion.path key={i} d={d} fill="none" stroke="var(--brand)" strokeWidth={6} strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.2 }} />
        ) : (
          <path key={i} d={d} fill="none" stroke="var(--muted)" strokeOpacity={0.4} strokeWidth={5} strokeLinecap="round" strokeDasharray="1 13" />
        )
      })}
    </svg>
  )
}

/** Oben auf der Startseite: Tagesziel, Serie und fällige Wiederholungen auf einen Blick. */
function TodayCard() {
  const navigate = useNavigate()
  const { xpByDay, dailyGoal, streak, classUnit, catchUpTarget, lessons } = useStore()
  const { due } = useDue()
  const plan = classUnit && catchUpTarget ? catchUpStatus(classUnit, catchUpTarget, lessons) : null
  const today = xpToday(xpByDay)
  const g = goalInfo(dailyGoal, today)
  const pct = g.pct
  const days = streakNow(streak)
  const done = g.baseReached
  return (
    <section className="card mb-4 p-4" aria-label="Heute">
      <div className="flex items-center gap-4">
        <ProgressRing key={g.goal} pct={pct} size={60} stroke={6} color={done ? 'var(--good)' : 'var(--gold)'}>
          {done ? <Check size={22} className="text-good" /> : <Bolt size={24} />}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{done ? (g.tier === 1 ? 'Tagesziel geschafft, stark!' : 'Bonusziel geschafft, wow!') : `Noch ${g.goal - today} XP bis zum Tagesziel`}</p>
          {done && <p className="text-sm text-muted">Nächstes Bonusziel: {g.goal} XP (noch {g.goal - today})</p>}
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <Flame size={15} /> {days} {days === 1 ? 'Tag' : 'Tage'} Serie{today === 0 && days > 0 ? ' · heute lernen, um sie zu halten' : ''}
          </p>
        </div>
      </div>
      {plan && !plan.finished && (
        <button type="button" className="press mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-brand/30 px-4 py-3 text-left transition-colors hover:bg-brand-soft" onClick={() => navigate('/catchup')}>
          <span className="min-w-0">
            <span className="block font-semibold">Aufholen: {plan.toGoToday > 0 ? `heute noch ${plan.toGoToday} ${plan.toGoToday === 1 ? 'Lektion' : 'Lektionen'}` : 'Tagesziel geschafft'}</span>
            <span className="block text-sm text-muted">Noch {plan.remaining} Lektionen in {plan.daysLeft} {plan.daysLeft === 1 ? 'Tag' : 'Tagen'}</span>
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </button>
      )}
      {due.length > 0 && (
        <button type="button" className="press mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-3 text-left font-semibold text-brand-dark transition-colors hover:brightness-95" onClick={() => navigate('/review/play')}>
          <span className="flex items-center gap-2.5">
            <Repeat size={20} />
            {due.length} {due.length === 1 ? 'Wort' : 'Wörter'} wiederholen
          </span>
          <span className="flex items-center gap-1 text-sm font-medium">Starten <Right size={14} /></span>
        </button>
      )}
    </section>
  )
}
const YEAR = { 7: 'Lernjahr 1', 8: 'Lernjahr 2', 9: 'Lernjahr 3', 10: 'Lernjahr 4' } as Record<number, string>

type NodeState = 'done' | 'current' | 'open' | 'locked'

export function LearnPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const lessons = useStore((s) => s.lessons)
  const classUnit = useStore((s) => s.classUnit)
  const storedGrade = useStore((s) => s.grade)
  const grade = grades.includes(storedGrade) ? storedGrade : grades[0]
  const shown = useMemo(() => units.filter((u) => u.grade === grade), [grade])
  const all = shown.flatMap((u) => u.lessons)
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
      <TodayCard />
      <InstallBanner />

      {/* Kurs-Kopf */}
      <section className="card mb-8 p-5">
        <div className="mb-4 flex items-center gap-3">
          <FrenchFlag size={44} />
          <div className="min-w-0">
            <p className="eyebrow">{YEAR[grade] ?? 'Kurs'}</p>
            <h1 className="truncate text-xl font-bold">Französisch · Klasse {grade}</h1>
          </div>
        </div>
        <ProgressBar pct={regular.length ? doneCount / regular.length : 0} />
        <p className="mt-2 text-sm text-muted">{doneCount} von {regular.length} Lektionen geschafft</p>
        {current ? (
          <button className="btn btn-primary press mt-4 w-full justify-between" onClick={() => navigate(`/lesson/${current.id}`)}>
            <span className="truncate">{doneCount === 0 ? 'Jetzt starten' : 'Weiterlernen'}: {current.title}</span>
            <Right size={18} />
          </button>
        ) : (
          <p className="mt-4 rounded-xl bg-good-soft px-4 py-3 text-sm font-medium text-good-dark">Alle Lektionen dieser Klasse sind geschafft. Wiederhole sie im Tab „Üben“.</p>
        )}
        {doneCount > 0 || (
          <Link to="/catchup" className="mt-1 block rounded-lg py-2.5 text-center text-sm font-medium text-brand-dark hover:underline">
            Der Unterricht ist schon weiter? Aufholen
          </Link>
        )}
        {doneCount === 0 && (
          <Link to="/placement" className="mt-1 block rounded-lg py-2.5 text-center text-sm font-medium text-brand-dark hover:underline">
            Schon Vorwissen? Einstufungstest machen
          </Link>
        )}
      </section>

      {shown.map((unit, ui) => {
        const regularInUnit = unit.lessons.filter((l) => !l.review && !l.test)
        const done = regularInUnit.filter((l) => isLessonDone(l, lessons[l.id])).length
        const pct = regularInUnit.length ? done / regularInUnit.length : 0
        const unitLocked = !isUnlocked(regularInUnit[0].id, lessons)
        const states = unit.lessons.map(stateOf)
        const offsets = unit.lessons.map((_, li) => OFFSETS[(ui * 3 + li) % OFFSETS.length])
        return (
          <section key={unit.id} className="mb-10" aria-labelledby={`h-${unit.id}`}>
            <button type="button" onClick={() => setUnitSheet(unit)} className={`card lift sticky top-2 z-10 flex w-full items-center gap-4 p-4 text-left ${unitLocked ? 'opacity-70' : ''}`}>
              <ProgressRing pct={pct} size={52} stroke={5}>
                {unitLocked ? <Lock size={18} /> : <span className="text-sm font-bold">{ui + 1}</span>}
              </ProgressRing>
              <div className="min-w-0 flex-1">
                {(unit.book || unit.id === classUnit) && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <span className="truncate">{unit.book}</span>
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
                    <motion.li
                      key={lesson.id}
                      style={{ x: offset }}
                      initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: reduce ? 0 : (li % 4) * 0.04 }}
                      className="relative flex h-[104px] flex-col items-center"
                    >
                      {state === 'current' && unit.id === currentUnit?.id && (
                        <motion.span
                          animate={reduce ? undefined : { y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                          className="absolute -top-8 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-surface"
                        >
                          Weiter hier
                          <span aria-hidden className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink" />
                        </motion.span>
                      )}
                      <span className="relative">
                        {state === 'current' && !reduce && <span aria-hidden className="animate-halo absolute inset-0 rounded-full bg-brand" />}
                        <motion.button
                          type="button"
                          onClick={() => setLessonSheet({ lesson, unit })}
                          whileTap={{ scale: 0.9 }}
                          whileHover={reduce ? undefined : { scale: 1.08, y: -2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                          aria-label={`${kind}: ${lesson.title}${state === 'done' ? ' – geschafft' : state === 'locked' ? ' – gesperrt' : state === 'current' ? ' – als Nächstes' : ''}`}
                          className={`${base} ${tone}`}
                          style={state === 'done' || state === 'current' ? { boxShadow: '0 4px 0 var(--shade-brand)' } : undefined}
                        >
                          {icon}
                          {attempted && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-[10px] font-bold text-ink">{Math.round(rec.bestAccuracy * 100)}%</span>}
                        </motion.button>
                      </span>
                      <p className="mt-2 line-clamp-2 h-8 w-36 text-center text-xs font-medium leading-4 text-muted">
                        <span className="box-decoration-clone rounded bg-page px-1.5 py-px">{lesson.title}</span>
                      </p>
                    </motion.li>
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
              ? '15 gemischte Fragen ohne Hilfe. Bestanden ab 80 % beim ersten Versuch.'
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
