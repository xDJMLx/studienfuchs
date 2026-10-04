import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CountUp, EASE, SPRING } from '../../components/ui/motion'
import { gradeStats, gradesOf, isRegular, unitsOf, type Subject } from '../../content'
import { FrenchFlag, MathBadge } from '../../components/ui/CoursePicker'
import { Mascot, type Mood } from '../../components/mascot/Mascot'
import { Confetti } from '../../components/ui/Confetti'
import { Back, Right } from '../../components/ui/Icons'
import { Wordmark } from '../../components/ui/Layout'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'

type Step = 'hero' | 'subject' | 'grade' | 'goal' | 'ready'
const ORDER: Step[] = ['hero', 'subject', 'grade', 'goal', 'ready']
type FlowStep = Exclude<Step, 'hero'>

const GOALS = [
  { xp: 10, label: 'Locker', time: '5 Min. am Tag', bars: 1 },
  { xp: 20, label: 'Normal', time: '10 Min. am Tag', bars: 2 },
  { xp: 30, label: 'Ernsthaft', time: '15 Min. am Tag', bars: 3 },
  { xp: 50, label: 'Intensiv', time: '20+ Min. am Tag', bars: 4 },
]

// Mathe gibt es nur für Klasse 7: Dort entfällt die Klassenwahl
const flowFor = (subject: Subject): FlowStep[] => (subject === 'math' ? ['subject', 'goal', 'ready'] : ['subject', 'grade', 'goal', 'ready'])

const SPEECH: Record<FlowStep, string> = {
  subject: 'Was möchtest du lernen?',
  grade: 'In welche Klasse gehst du?',
  goal: 'Wie viel möchtest du täglich lernen?',
  ready: 'Super! Dein Lernpfad ist fertig. Los geht’s!',
}
const MOOD: Record<FlowStep, Mood> = { subject: 'happy', grade: 'think', goal: 'happy', ready: 'cheer' }

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE } },
  exit: (d: number) => ({ opacity: 0, x: d * -16, transition: { duration: 0.1 } }),
}

/** Einführung: ein Bildschirm pro Schritt, ohne Scrollen, wie bei einer richtigen App. */
export function Welcome() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { grade, subject, dailyGoal, setGrade, setSubject, setDailyGoal, setOnboarded, importData } = useStore(useShallow((s) => ({ grade: s.grade, subject: s.subject ?? 'fr', dailyGoal: s.dailyGoal, setGrade: s.setGrade, setSubject: s.setSubject, setDailyGoal: s.setDailyGoal, setOnboarded: s.setOnboarded, importData: s.importData })))
  const FLOW = flowFor(subject)
  const grades = gradesOf(subject)
  const math = subject === 'math'
  const units = unitsOf(subject)
  const hasProgress = useStore((s) => s.xp > 0 || Object.keys(s.lessons).length > 0)
  const [step, setStep] = useState<Step>('hero')
  const [dir, setDir] = useState(1)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const go = (to: Step) => {
    setDir(ORDER.indexOf(to) >= ORDER.indexOf(step) ? 1 : -1)
    setStep(to)
  }

  const finish = (to = '/') => {
    setOnboarded(true)
    navigate(to, { replace: true })
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    try {
      importData(await file.text())
      setOnboarded(true)
      navigate('/', { replace: true })
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
    }
  }

  // Erste Lektion der gewählten Klasse (für den Sofort-Start am Ende)
  const firstLesson = units.find((u) => u.grade === (math ? grades[0] : grade) && !u.extra)?.lessons[0]
  const courseStats = math
    ? { lessons: units.flatMap((u) => u.lessons).filter(isRegular).length, topics: new Set(units.flatMap((u) => u.lessons.filter(isRegular).flatMap((l) => l.items.map((i) => i.id)))).size }
    : { lessons: gradeStats(grade).lessons, topics: gradeStats(grade).words }
  const idx = FLOW.indexOf(step as FlowStep)
  const next = () => go(idx >= FLOW.length - 1 ? step : FLOW[idx + 1])
  const back = () => go(idx <= 0 ? 'hero' : FLOW[idx - 1])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'hero' ? (
          <motion.div key="hero" className="flex min-h-0 flex-1 flex-col" exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.14 } }}>
            <header className={`mx-auto flex w-full max-w-md items-center px-6 pt-4 ${hasProgress ? 'justify-between' : 'justify-center'}`}>
              <Wordmark />
              {hasProgress && (
                <button type="button" onClick={() => finish()} className="press flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-extrabold uppercase tracking-wide text-sky-dark">
                  Zur App <Right size={14} />
                </button>
              )}
            </header>

            {/* Fuchs mit Sprechblase */}
            <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...SPRING.snappy, delay: 0.2 }}
                className="relative mb-5 max-w-[19rem] rounded-3xl border-2 border-line bg-surface px-5 py-3.5 text-[17px] font-semibold leading-snug"
              >
                Hallo! Ich bin Fenni. Ich zeige dir, wie Gelerntes hängen bleibt.
                <span aria-hidden className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-surface" />
              </motion.div>
              <motion.div initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING.soft, delay: 0.05 }}>
                <div className="animate-float" style={{ animationDuration: '6s' }}>
                  <Mascot mood="wave" size={220} pose="full" alive className="!h-[min(30dvh,230px)] !w-[min(30dvh,230px)]" />
                </div>
              </motion.div>
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: EASE, delay: 0.22 }}
                className="mt-5 text-[28px] font-black leading-[1.12] tracking-tight sm:text-[34px]"
              >
                Lernen für die Schule,
                <br />
                das hängen bleibt.
              </motion.h1>
              <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.36, delay: 0.3 }} className="mt-2 text-[16px] font-bold text-muted">
                Französisch Klasse 7 bis 10 und Mathe Klasse 7, kostenlos und ohne Konto
              </motion.p>
            </main>

            <footer className="mx-auto w-full max-w-md px-6 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: EASE, delay: 0.36 }} className="grid gap-3">
                <button className="btn btn-primary press w-full !py-4 text-base" onClick={() => go(FLOW[0])} autoFocus>
                  Jetzt starten
                </button>
                <button className="btn btn-ghost press w-full !py-3.5" onClick={() => fileRef.current?.click()}>
                  Ich habe schon Fortschritt
                </button>
                <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} />
                {importMsg && (
                  <p className="text-center text-sm font-semibold text-bad-dark" role="alert">
                    {importMsg}
                  </p>
                )}
              </motion.div>
            </footer>
          </motion.div>
        ) : (
          <motion.div key="flow" className="flex min-h-0 flex-1 flex-col" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25 }}>
            <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-4">
              <button type="button" onClick={back} aria-label="Zurück" className="press -ml-1 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:text-ink">
                <Back size={28} />
              </button>
              <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={FLOW.length} aria-valuenow={idx + 1} aria-label="Einrichtung">
                {FLOW.map((s, i) => (
                  <span key={s} className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span className="absolute inset-0 origin-left rounded-full bg-brand" initial={false} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ duration: 0.45, ease: EASE }} />
                  </span>
                ))}
              </div>
              <span className="w-12 text-right text-xs font-semibold text-muted">{idx + 1} / {FLOW.length}</span>
            </header>

            <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-5 pb-4">
              <div className="mb-5 flex items-center gap-4">
                <motion.div key={step} initial={reduce ? false : { scale: 0.85 }} animate={{ scale: 1 }} transition={SPRING.bouncy} className="shrink-0">
                  <Mascot mood={MOOD[step as FlowStep]} size={92} blink />
                </motion.div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    transition={SPRING.snappy}
                    style={{ transformOrigin: 'left center' }}
                    className="relative rounded-3xl border-2 border-line bg-surface px-5 py-3.5 text-[17px] font-semibold leading-snug"
                  >
                    {SPEECH[step as FlowStep]}
                    <span aria-hidden className="absolute -left-[9px] top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-surface" />
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
                  {step === 'subject' && (
                    <ul className="grid gap-3" role="radiogroup" aria-label="Fach">
                      {([
                        { id: 'fr' as const, name: 'Französisch', text: 'Klasse 7 bis 10 · Wörter, Sätze, Hören', icon: <FrenchFlag size={44} /> },
                        { id: 'math' as const, name: 'Mathe', text: 'Klasse 7 · Rechnen, Gleichungen, Prozente', icon: <MathBadge size={44} /> },
                      ]).map((s) => {
                        const on = subject === s.id
                        return (
                          <li key={s.id} className="min-w-0">
                            <button type="button" role="radio" aria-checked={on} onClick={() => { setSubject(s.id); if (s.id === 'math') setGrade(7) }} className={`press relative flex w-full items-center gap-4 rounded-2xl border-2 p-3.5 text-left transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
                              {s.icon}
                              <span className="min-w-0 flex-1">
                                <span className={`block text-lg font-semibold ${on ? 'text-brand-dark' : ''}`}>{s.name}</span>
                                <span className="block text-sm text-muted">{s.text}</span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                      <li className="min-w-0">
                        <p className="rounded-2xl bg-snow p-3.5 text-sm leading-relaxed text-muted">Du kannst später jederzeit zwischen den Fächern wechseln. Dein Fortschritt bleibt in jedem Fach erhalten.</p>
                      </li>
                    </ul>
                  )}

                  {step === 'grade' && (
                    <ul className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Klasse">
                      {grades.map((g) => {
                        const on = grade === g
                        const gu = units.filter((u) => u.grade === g)
                        const lessonCount = gradeStats(g).lessons
                        return (
                          <li key={g} className="min-w-0">
                            <button type="button" role="radio" aria-checked={on} onClick={() => setGrade(g)} className={`press relative flex w-full items-center gap-4 rounded-2xl border-2 p-3.5 text-left transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
                              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold transition-colors duration-200 ${on ? 'bg-brand text-on-brand' : 'bg-snow text-ink'}`}>{g}</span>
                              <span className="min-w-0 flex-1">
                                <span className={`block text-lg font-semibold ${on ? 'text-brand-dark' : ''}`}>Klasse {g} <span className="text-sm font-medium text-muted">(Lernjahr {g - 6})</span></span>
                                <span className="block truncate text-sm text-muted">{gu.slice(0, 3).map((u) => u.title).join(' · ')}</span>
                              </span>
                              <span className="shrink-0 text-right text-xs font-semibold text-muted">{lessonCount}<br />Lektionen</span>
                            </button>
                          </li>
                        )
                      })}
                      <li className="min-w-0">
                        <p className="rounded-2xl bg-snow p-3.5 text-sm leading-relaxed text-muted">
                          {grade > grades[0] ? `Hast du die früheren Klassen nicht gemacht? Französisch beginnt in Klasse ${grades[0]} bei null. Mit „Aufholen“ kannst du später alles nachholen, auch von früheren Klassen.` : 'Du fängst bei null an. Es geht Schritt für Schritt, ohne Vorwissen.'}
                        </p>
                      </li>
                    </ul>
                  )}

                  {step === 'goal' && (
                    <ul className="grid gap-3" role="radiogroup" aria-label="Tagesziel">
                      {GOALS.map((g) => {
                        const on = dailyGoal === g.xp
                        return (
                          <li key={g.xp} className="min-w-0">
                            <button type="button" role="radio" aria-checked={on} onClick={() => setDailyGoal(g.xp)} className={`press relative flex w-full items-center gap-4 rounded-2xl border-2 p-3.5 text-left transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
                              <span className="flex h-12 w-12 shrink-0 items-end justify-center gap-1 rounded-2xl bg-snow pb-2.5" aria-hidden>
                                {[0, 1, 2, 3].map((b) => (
                                  <span key={b} className={`w-2 rounded-sm transition-colors duration-200 ${b < g.bars ? 'bg-brand' : 'bg-line'}`} style={{ height: 8 + b * 6 }} />
                                ))}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block text-lg font-semibold ${on ? 'text-brand-dark' : ''}`}>{g.label}</span>
                                <span className="block text-sm text-muted">{g.time}</span>
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-muted">{g.xp} XP</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {step === 'ready' && (
                    <div className="relative">
                      <Confetti count={36} />
                      <div className="card overflow-hidden">
                        <div className="p-5 text-center">
                          <p className="mb-1 text-xl font-bold">{math ? 'Mathe' : 'Französisch'} · Klasse {math ? grades[0] : grade}</p>
                          <p className="text-muted">Mindestens {dailyGoal} XP pro Tag · {GOALS.find((g) => g.xp === dailyGoal)?.time}</p>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-line border-t border-line text-center">
                          <div className="px-3 py-4">
                            <div className="text-2xl font-bold text-brand-dark"><CountUp to={courseStats.lessons} /></div>
                            <div className="text-xs font-medium text-muted">Lektionen im Lernpfad</div>
                          </div>
                          <div className="px-3 py-4">
                            <div className="text-2xl font-bold text-brand-dark"><CountUp to={courseStats.topics} /></div>
                            <div className="text-xs font-medium text-muted">{math ? 'Themen zum Üben' : 'neue Wörter'}</div>
                          </div>
                        </div>
                      </div>
                      {!math && (
                        <>
                          <button type="button" className="btn btn-ghost press mt-4 w-full" onClick={() => finish('/catchup')}>
                            Meine Klasse ist schon weiter: Aufholen
                          </button>
                          <p className="mt-3 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">
                            Tipp: Ist der Unterricht schon weiter? Dafür gibt es „Aufholen". In der „KI“ kannst du Fotos deiner Buchseiten hochladen und dir einen Vokabeltest daraus machen lassen.
                          </p>
                        </>
                      )}
                      {math && <p className="mt-4 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">Jede Lektion beginnt mit einer kurzen Erklärung. Die Aufgaben sind immer neu: Du kannst so lange üben, bis es sitzt.</p>}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            <footer className="border-t border-line bg-bg" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
              <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-1 px-5 py-4 sm:flex-row-reverse sm:items-center">
                {step === 'ready' && firstLesson && !hasProgress ? (
                  <>
                    {/* Gleich richtig loslegen: die erste Lektion startet sofort (wie bei Duolingo), umschauen geht trotzdem */}
                    <button className="btn btn-primary btn-shine press w-full !py-4 text-base sm:w-72" onClick={() => finish(`/lesson/${firstLesson.id}`)} autoFocus>
                      Erste Lektion starten
                    </button>
                    <button type="button" className="press min-h-11 rounded-xl px-3 text-sm font-extrabold uppercase tracking-wide text-sky-dark sm:mr-auto" onClick={() => finish()}>
                      Erst umschauen
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary press w-full !py-4 text-base sm:ml-auto sm:w-64" onClick={step === 'ready' ? () => finish() : next} autoFocus>
                    {step === 'ready' ? 'Los geht’s' : 'Weiter'}
                  </button>
                )}
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
