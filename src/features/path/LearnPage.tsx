import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { blockingLesson, grades, isLessonDone, isUnlocked, passMark, units } from '../../content'
import { SpeakButton } from '../../components/exercises/common'
import { FrenchFlag } from '../../components/ui/CoursePicker'
import { InstallBanner } from '../../components/ui/InstallApp'
import { Bolt, Book, Check, Flame, Lock, Repeat, Right, Target, Trophy } from '../../components/ui/Icons'
import { EASE } from '../../components/ui/motion'
import { Sheet } from '../../components/ui/Sheet'
import { ProgressBar, ProgressRing } from '../../components/ui/widgets'
import { catchUpStatus } from '../../lib/catchup'
import { dayKey } from '../../lib/streak'
import type { Lesson, Unit } from '../../lib/types'
import { goalInfo } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { useDue } from '../review/ReviewPage'

const greeting = () => {
  const h = new Date().getHours()
  return h < 5 ? 'Noch wach?' : h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : h < 22 ? 'Guten Abend' : 'Gute Nacht'
}

/** Sternenpunkte am Himmel (feste Positionen, damit nichts flackert). */
const STARS = [
  [8, 14, 2], [22, 8, 1.5], [37, 20, 1.5], [52, 9, 2], [66, 17, 1.5], [80, 7, 2], [91, 22, 1.5],
  [14, 34, 1.5], [44, 36, 1], [74, 33, 1.5], [30, 46, 1], [58, 48, 1.5],
] as const

/**
 * Der Himmel des Tages: Mit jedem gesammelten XP wird aus Nacht ein Sonnenaufgang.
 * Beim Tagesziel steht die Sonne am Himmel, danach gibt es Bonusziele.
 */
function SkyCard({ current, doneCount, onStart }: { current?: Lesson; doneCount: number; onStart: () => void }) {
  const reduce = useReducedMotion()
  const { xpByDay, dailyGoal, streak } = useStore()
  const today = xpToday(xpByDay)
  const g = goalInfo(dailyGoal, today)
  const p = g.baseReached ? 1 : g.pct
  const days = streakNow(streak)
  const pct = Math.round(p * 100)
  const mix = (a: string, b: string) => `color-mix(in oklab, ${b} ${pct}%, ${a})`
  const sky = `linear-gradient(180deg, ${mix('#0a0b22', '#4b3aa8')} 0%, ${mix('#17154a', '#c9547f')} 58%, ${mix('#221a58', '#ff9444')} 100%)`
  return (
    <section aria-label="Heute" className="overflow-hidden rounded-[32px] text-white shadow-[0_24px_50px_-26px_rgba(80,60,200,0.7)]" style={{ background: sky }}>
      <div className="relative px-5 pb-20 pt-5">
        {/* Sterne */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: 1 - p * 0.9, transition: 'opacity 0.8s' }}>
          {STARS.map(([x, y, r], i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, opacity: 0.35 + (i % 3) * 0.2 }} />
          ))}
        </div>
        {/* Sonne: steigt mit den XP */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-5 h-[104px] w-[104px] rounded-full"
          style={{ background: 'radial-gradient(circle at 40% 35%, #fff1c2, #ffc24d 45%, #ff7a2f 100%)', boxShadow: '0 0 80px 26px rgba(255,150,70,0.5)' }}
          initial={reduce ? false : { y: 120 }}
          animate={{ y: 118 - p * 102 }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.2 }}
        />
        {/* Hügel */}
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full" viewBox="0 0 400 56" preserveAspectRatio="none">
          <path d="M0 34 C60 14 120 44 200 30 C280 14 330 42 400 26 L400 56 L0 56 Z" fill="#0d0b25" opacity="0.4" />
          <path d="M0 46 C70 34 130 52 210 42 C290 32 340 50 400 40 L400 56 L0 56 Z" fill="#0d0b25" opacity="0.7" />
        </svg>

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-medium text-white/80">{greeting()}</p>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-md" title="Serie">
              <Flame size={16} /> <span className="display">{days}</span> {days === 1 ? 'Tag' : 'Tage'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="display text-[64px] font-extrabold leading-none tabular-nums">{today}</span>
            <span className="text-lg font-medium text-white/75">/ {g.goal} XP</span>
          </div>
          <p className="mt-1.5 max-w-[58%] text-[15px] leading-snug text-white/85">
            {!g.baseReached
              ? `Noch ${g.goal - today} XP, dann geht deine Sonne auf.`
              : g.tier === 1
                ? `Tagesziel geschafft. Nächstes Bonusziel: ${g.goal} XP.`
                : `Bonusziel geschafft. Weiter geht es bei ${g.goal} XP.`}
          </p>
        </div>
      </div>
      <div className="relative bg-[#0d0b25]/70 p-4 backdrop-blur-md">
        {current ? (
          <button className="btn btn-primary press w-full justify-between" onClick={onStart}>
            <span className="min-w-0 text-left leading-tight">
              <span className="block">{doneCount === 0 ? 'Jetzt starten' : 'Weiterlernen'}</span>
              <span className="block truncate text-[13px] font-medium opacity-75">{current.title}</span>
            </span>
            <Right size={20} />
          </button>
        ) : (
          <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold">Alle Lektionen dieser Klasse sind geschafft. Wiederhole sie im Tab „Üben“.</p>
        )}
      </div>
    </section>
  )
}

/** Tagesaufgaben: drei kleine Ziele, die zusammen den Tag ausmachen. */
function Quests({ current }: { current?: Lesson }) {
  const navigate = useNavigate()
  const { xpByDay, dailyGoal, lessons, classUnit, catchUpTarget } = useStore()
  const { due } = useDue()
  const today = xpToday(xpByDay)
  const g = goalInfo(dailyGoal, today)
  const key = dayKey()
  const doneToday = Object.values(lessons).filter((r) => r.lastDone === key).length
  const plan = classUnit && catchUpTarget ? catchUpStatus(classUnit, catchUpTarget, lessons) : null
  const rows: { id: string; icon: React.ReactNode; title: string; hint: string; pct: number; done: boolean; go?: () => void }[] = [
    {
      id: 'xp',
      icon: <Bolt size={20} />,
      title: g.baseReached ? `Bonus: ${g.goal} XP` : `${g.goal} XP sammeln`,
      hint: g.baseReached ? 'Tagesziel schon geschafft' : `Noch ${g.goal - today} XP`,
      pct: g.pct,
      done: false,
      go: current ? () => navigate(`/lesson/${current.id}`) : undefined,
    },
    {
      id: 'review',
      icon: <Repeat size={20} />,
      title: due.length > 0 ? `${due.length} ${due.length === 1 ? 'Wort' : 'Wörter'} wiederholen` : 'Wiederholung erledigt',
      hint: due.length > 0 ? 'Kurz vor dem Vergessen abfragen' : 'Nichts fällig',
      pct: due.length > 0 ? 0 : 1,
      done: due.length === 0,
      go: due.length > 0 ? () => navigate('/review/play') : undefined,
    },
    {
      id: 'lesson',
      icon: <Book size={20} />,
      title: doneToday > 0 ? `${doneToday} ${doneToday === 1 ? 'Lektion' : 'Lektionen'} heute` : 'Eine Lektion lernen',
      hint: doneToday > 0 ? 'Stark!' : current ? current.title : 'Alles geschafft',
      pct: Math.min(1, doneToday),
      done: doneToday > 0,
      go: current ? () => navigate(`/lesson/${current.id}`) : undefined,
    },
  ]
  if (plan && !plan.finished) {
    rows.push({
      id: 'catchup',
      icon: <Target size={20} />,
      title: plan.toGoToday > 0 ? `Aufholen: noch ${plan.toGoToday} ${plan.toGoToday === 1 ? 'Lektion' : 'Lektionen'}` : 'Aufholen: Tagesziel geschafft',
      hint: `Noch ${plan.remaining} Lektionen in ${plan.daysLeft} ${plan.daysLeft === 1 ? 'Tag' : 'Tagen'}`,
      pct: plan.toGoToday > 0 ? 0 : 1,
      done: plan.toGoToday === 0,
      go: () => navigate('/catchup'),
    })
  }
  return (
    <section className="mt-4" aria-label="Aufgaben für heute">
      <h2 className="mb-2 px-1 text-lg font-bold">Heute</h2>
      <ul className="card divide-y divide-line overflow-hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" disabled={!r.go} onClick={r.go} className="press flex w-full items-center gap-3.5 px-4 py-3.5 text-left disabled:opacity-100">
              <ProgressRing pct={r.pct} size={44} stroke={4} color={r.done ? 'var(--good)' : 'var(--brand)'}>
                <span className={r.done ? 'text-good' : 'text-brand-dark'}>{r.done ? <Check size={18} /> : r.icon}</span>
              </ProgressRing>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.title}</span>
                <span className="block truncate text-sm text-muted">{r.hint}</span>
              </span>
              {r.go && <Right size={16} className="shrink-0 text-muted" />}
            </button>
          </li>
        ))}
      </ul>
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

  const [lessonSheet, setLessonSheet] = useState<{ lesson: Lesson; unit: Unit } | null>(null)
  const [unitSheet, setUnitSheet] = useState<Unit | null>(null)

  const stateOf = (l: Lesson): NodeState => {
    if (isLessonDone(l, lessons[l.id])) return 'done'
    if (!isUnlocked(l.id, lessons)) return 'locked'
    return l.id === current?.id ? 'current' : 'open'
  }

  return (
    <div className="mx-auto max-w-[620px] px-4 pb-10 pt-4 lg:pt-6">
      <SkyCard current={current} doneCount={doneCount} onStart={() => current && navigate(`/lesson/${current.id}`)} />
      <Quests current={current} />
      <InstallBanner />

      {/* Kurs */}
      <section className="mt-8" aria-label="Kurs">
        <div className="mb-3 flex items-center gap-3 px-1">
          <FrenchFlag size={40} />
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-[22px] font-bold leading-tight">Französisch · Klasse {grade}</h1>
            <p className="text-sm text-muted">{YEAR[grade] ?? 'Kurs'} · {doneCount} von {regular.length} Lektionen</p>
          </div>
        </div>
        <ProgressBar pct={regular.length ? doneCount / regular.length : 0} className="mx-1" />
        <div className="mt-3 flex flex-wrap gap-2 px-1">
          <Link to="/catchup" className="press rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink">Unterricht ist weiter? Aufholen</Link>
          {doneCount === 0 && <Link to="/placement" className="press rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink">Schon Vorwissen? Einstufungstest</Link>}
        </div>
      </section>

      {shown.map((unit, ui) => {
        const regularInUnit = unit.lessons.filter((l) => !l.review && !l.test)
        const done = regularInUnit.filter((l) => isLessonDone(l, lessons[l.id])).length
        const pct = regularInUnit.length ? done / regularInUnit.length : 0
        const unitLocked = !isUnlocked(regularInUnit[0].id, lessons)
        return (
          <section key={unit.id} className="mt-6" aria-labelledby={`h-${unit.id}`}>
            <button type="button" onClick={() => setUnitSheet(unit)} className={`press mb-3 flex w-full items-center gap-3.5 px-1 text-left ${unitLocked ? 'opacity-70' : ''}`}>
              <ProgressRing pct={pct} size={48} stroke={5}>
                {unitLocked ? <Lock size={16} /> : <span className="display text-[15px] font-bold">{ui + 1}</span>}
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] text-muted">
                  <span className="truncate">{unit.book ?? `Einheit ${ui + 1}`}</span>
                  {unit.id === classUnit && <span className="shrink-0 rounded-full bg-brand px-2 py-px text-[11px] font-semibold text-on-brand">Eure Klasse</span>}
                </p>
                <h2 id={`h-${unit.id}`} className="display truncate text-[19px] font-bold leading-tight">{unit.title}</h2>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-muted">{done}/{regularInUnit.length}</span>
            </button>

            <ol className="grid grid-cols-3 gap-2.5">
              {unit.lessons.map((lesson, li) => {
                const state = stateOf(lesson)
                const rec = lessons[lesson.id]
                const attempted = !!rec && state !== 'done'
                const kind = lesson.test ? 'Einheitentest' : lesson.review ? 'Wiederholung' : 'Lektion'
                const special = lesson.test || lesson.review
                const tone =
                  state === 'done'
                    ? 'border-transparent bg-brand-soft'
                    : state === 'current'
                      ? 'border-brand bg-surface shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_20%,transparent),0_14px_28px_-14px_color-mix(in_srgb,var(--brand)_70%,transparent)]'
                      : state === 'locked'
                        ? 'border-line bg-snow opacity-60'
                        : 'border-line bg-surface'
                const badge =
                  state === 'done' ? <Check size={16} /> : lesson.test ? <Trophy size={16} /> : lesson.review ? <Repeat size={16} /> : state === 'locked' ? <Lock size={14} /> : li + 1
                return (
                  <motion.li
                    key={lesson.id}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -30px 0px' }}
                    transition={{ duration: 0.35, ease: EASE, delay: reduce ? 0 : (li % 3) * 0.04 }}
                  >
                    <button
                      type="button"
                      onClick={() => setLessonSheet({ lesson, unit })}
                      aria-label={`${kind}: ${lesson.title}${state === 'done' ? ' – geschafft' : state === 'locked' ? ' – gesperrt' : state === 'current' ? ' – als Nächstes' : ''}`}
                      className={`press relative flex h-[104px] w-full flex-col justify-between rounded-[20px] border-[1.5px] p-3 text-left transition-colors ${tone} ${special && state !== 'done' && state !== 'locked' ? 'border-dashed' : ''}`}
                    >
                      <span className="flex items-start justify-between">
                        <span
                          className={`display flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-bold ${
                            state === 'done' || state === 'current' ? 'bg-brand text-on-brand' : 'bg-snow text-muted'
                          }`}
                        >
                          {badge}
                        </span>
                        {attempted && <span className="rounded-full bg-gold/20 px-1.5 py-px text-[11px] font-bold text-gold-dark">{Math.round(rec.bestAccuracy * 100)}%</span>}
                        {state === 'current' && !attempted && <span className="rounded-full bg-brand px-2 py-px text-[11px] font-semibold text-on-brand">Weiter</span>}
                      </span>
                      <span className="line-clamp-2 text-[13px] font-semibold leading-[1.2]">{lesson.title}</span>
                    </button>
                  </motion.li>
                )
              })}
            </ol>
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
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-brand text-on-brand' : locked ? 'bg-snow text-muted' : 'border-2 border-brand text-brand-dark'}`}>
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
