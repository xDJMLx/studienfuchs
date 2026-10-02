import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COURSE_STATS, gradeStats, grades, units } from '../../content'
import { Mascot, type Mood } from '../../components/mascot/Mascot'
import { Confetti } from '../../components/ui/Confetti'
import { FrenchFlag } from '../../components/ui/CoursePicker'
import { Back, Bolt, Camera, Check, Flame, Lock, Repeat, Right, Target } from '../../components/ui/Icons'
import { Wordmark } from '../../components/ui/Layout'
import { CountUp, EASE, Reveal, SPRING } from '../../components/ui/motion'
import { useStore } from '../../store/useStore'

type Step = 'hero' | 'course' | 'grade' | 'goal' | 'ready'
const ORDER: Step[] = ['hero', 'course', 'grade', 'goal', 'ready']
type FlowStep = Exclude<Step, 'hero'>
const FLOW: FlowStep[] = ['course', 'grade', 'goal', 'ready']

const GOALS = [
  { xp: 10, label: 'Locker', time: '5 Min. am Tag', bars: 1 },
  { xp: 20, label: 'Normal', time: '10 Min. am Tag', bars: 2 },
  { xp: 30, label: 'Ernsthaft', time: '15 Min. am Tag', bars: 3 },
  { xp: 50, label: 'Intensiv', time: '20+ Min. am Tag', bars: 4 },
]

const COURSES = [
  { id: 'french', name: 'Französisch', ready: true },
  { id: 'english', name: 'Englisch', ready: false },
  { id: 'math', name: 'Mathe', ready: false },
  { id: 'german', name: 'Deutsch', ready: false },
  { id: 'latin', name: 'Latein', ready: false },
  { id: 'bio', name: 'Biologie', ready: false },
]

const FEATURES = [
  { Icon: Target, title: 'Kleine Schritte', text: 'Immer nur zwei neue Wörter, sofort abgefragt. Nichts wird einfach durchgeklickt, und weiter geht es erst, wenn es sitzt.' },
  { Icon: Repeat, title: 'Echte Wiederholung', text: 'Ein Lernplan fragt jedes Wort genau dann ab, wenn du es fast vergessen hättest. So bleibt es im Kopf.' },
  { Icon: Camera, title: 'Dein Schulbuch', text: 'Seiten abfotografieren, die KI macht Lernkarten mit Beispielsätzen daraus. Oder Wörter selbst eintippen, Akzente ergänzt die App. Kostenlos.' },
]


const SPEECH: Record<FlowStep, string> = {
  course: 'Was möchtest du lernen?',
  grade: 'In welche Klasse gehst du?',
  goal: 'Wie viel möchtest du täglich lernen?',
  ready: 'Super! Dein Lernpfad ist fertig. Los geht’s!',
}
const MOOD: Record<FlowStep, Mood> = { course: 'happy', grade: 'think', goal: 'happy', ready: 'cheer' }

/** Weiche Farbflächen im Hintergrund, die langsam atmen. */
function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-blob absolute -left-28 -top-28 h-[440px] w-[440px] rounded-full bg-brand/15 blur-3xl" />
      <div className="animate-blob absolute -bottom-40 -right-28 h-[480px] w-[480px] rounded-full bg-gold/15 blur-3xl" style={{ animationDelay: '-7s' }} />
    </div>
  )
}

/** Schwebender Chip um das Maskottchen. */
function FloatChip({ children, className, delay, tilt }: { children: React.ReactNode; className: string; delay: number; tilt: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={`absolute ${className}`} initial={reduce ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING.bouncy, delay }}>
      <div className="animate-float flex items-center gap-1.5 rounded-2xl bg-surface px-3.5 py-2 text-sm font-semibold shadow-lg ring-1 ring-line" style={{ ['--r' as string]: `${tilt}deg`, animationDelay: `${-delay * 3}s` }}>
        {children}
      </div>
    </motion.div>
  )
}

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 56 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
  exit: (d: number) => ({ opacity: 0, x: d * -56, transition: { duration: 0.18 } }),
}

export function Welcome() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { grade, dailyGoal, setGrade, setDailyGoal, setOnboarded, importData } = useStore()
  const hasProgress = useStore((s) => s.xp > 0 || Object.keys(s.lessons).length > 0)
  const [step, setStep] = useState<Step>('hero')
  const [dir, setDir] = useState(1)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [shake, setShake] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const go = (to: Step) => {
    setDir(ORDER.indexOf(to) >= ORDER.indexOf(step) ? 1 : -1)
    setStep(to)
  }

  const finish = () => {
    setOnboarded(true)
    navigate('/', { replace: true })
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

  const idx = FLOW.indexOf(step as FlowStep)
  const next = () => go(idx >= FLOW.length - 1 ? step : FLOW[idx + 1])
  const back = () => go(idx <= 0 ? 'hero' : FLOW[idx - 1])

  return (
    <div className="relative isolate flex min-h-full flex-col overflow-x-hidden bg-bg">
      <Ambient />
      <AnimatePresence mode="wait">
        {step === 'hero' ? (
          <motion.div key="hero" className="flex flex-1 flex-col" initial={false} exit={reduce ? undefined : { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}>
            <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
              <Wordmark />
              {hasProgress && (
                <button type="button" onClick={finish} className="press flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-soft">
                  Zur App <Right size={14} />
                </button>
              )}
            </header>

            <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-5 pb-10 pt-2 md:grid-cols-2 md:gap-12">
              {/* Maskottchen-Bühne */}
              <motion.div initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING.soft, delay: 0.05 }} className="relative order-1 mx-auto flex h-[260px] w-[300px] items-center justify-center md:order-2 md:h-[420px] md:w-[460px]">
                <span aria-hidden className="absolute inset-4 rounded-full bg-gradient-to-br from-brand-soft to-transparent ring-1 ring-brand/15" />
                <span aria-hidden className="absolute inset-12 rounded-full bg-gradient-to-br from-brand/10 to-transparent ring-1 ring-brand/10" />
                <div className="animate-float relative" style={{ animationDuration: '7s' }}>
                  <Mascot mood="cheer" size={230} blink className="drop-shadow-xl md:!h-[330px] md:!w-[330px]" />
                </div>
                <FloatChip className="left-0 top-6 md:left-2 md:top-14" delay={0.5} tilt={-6}><span className="text-brand-dark">Bonjour !</span></FloatChip>
                <FloatChip className="right-0 top-12 md:right-0 md:top-24" delay={0.7} tilt={5}><Bolt size={16} /> +15 XP</FloatChip>
                <FloatChip className="bottom-8 left-2 md:bottom-16 md:left-0" delay={0.9} tilt={4}><Flame size={16} /> 7 Tage Serie</FloatChip>
                <FloatChip className="bottom-2 right-4 md:bottom-10 md:right-6" delay={1.1} tilt={-4}><span className="text-good-dark">la maison</span><Check size={14} className="text-good" /></FloatChip>
              </motion.div>

              <div className="order-2 text-center md:order-1 md:text-left">
                <motion.span initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mb-4 inline-block rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-dark">
                  Kostenlos · ohne Konto · ohne Herzen
                </motion.span>
                <h1 className="mb-4 text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl" aria-label="Lernen, das hängen bleibt.">
                  {['Lernen,', 'das', 'hängen', 'bleibt.'].map((w, i) => (
                    <motion.span
                      key={w}
                      aria-hidden
                      className={`mr-[0.28em] inline-block ${i >= 2 ? 'text-brand' : ''}`}
                      initial={reduce ? false : { opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.09 }}
                    >
                      {w}
                    </motion.span>
                  ))}
                </h1>
                <motion.p initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.55 }} className="mx-auto mb-7 max-w-md text-lg leading-relaxed text-muted md:mx-0">
                  Kurze Lektionen, echte Wiederholung und dein Schulbuch als Quiz. Für Französisch in Klasse 7 bis 10, weitere Fächer folgen.
                </motion.p>
                <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.7 }} className="mx-auto grid max-w-sm gap-3 md:mx-0">
                  <button className="btn btn-primary btn-shine press w-full justify-between !py-4 text-base" onClick={() => go('course')} autoFocus>
                    Jetzt starten <Right size={18} />
                  </button>
                  <button className="btn btn-ghost press w-full" onClick={() => fileRef.current?.click()}>
                    Ich habe schon Fortschritt
                  </button>
                  <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} />
                  {importMsg && <p className="text-sm font-semibold text-bad-dark" role="alert">{importMsg}</p>}
                </motion.div>
                <p className="mt-5 text-sm text-muted">Dein Fortschritt bleibt auf deinem Gerät. Keine Werbung, kein Tracking.</p>
              </div>
            </main>

            {/* Was die App anders macht */}
            <section className="mx-auto w-full max-w-6xl px-5 pb-16">
              <Reveal className="mb-6 text-center">
                <p className="eyebrow mb-2">Was anders ist</p>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Lernen nach dem, was die Forschung sagt</h2>
              </Reveal>
              <div className="grid gap-4 md:grid-cols-3">
                {FEATURES.map(({ Icon, title, text }, i) => (
                  <Reveal key={title} delay={i * 0.1}>
                    <div className="card lift h-full p-6">
                      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"><Icon size={26} /></span>
                      <h3 className="mb-1.5 text-lg font-semibold">{title}</h3>
                      <p className="leading-relaxed text-muted">{text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal className="mt-8 grid grid-cols-3 gap-3 text-center">
                {[
                  { n: COURSE_STATS.grades, label: 'Klassenstufen' },
                  { n: COURSE_STATS.lessons, label: 'Lektionen' },
                  { n: COURSE_STATS.words, label: 'Wörter und Wendungen' },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-snow px-2 py-5">
                    <div className="text-3xl font-bold text-brand-dark md:text-4xl"><CountUp to={s.n} duration={1.4} /></div>
                    <div className="mt-1 text-xs font-medium text-muted md:text-sm">{s.label}</div>
                  </div>
                ))}
              </Reveal>
            </section>
          </motion.div>
        ) : (
          <motion.div key="flow" className="flex flex-1 flex-col" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.4, ease: EASE }}>
            <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-4">
              <button type="button" onClick={back} aria-label="Zurück" className="press -ml-1 rounded-xl p-1 text-muted transition-colors hover:text-ink">
                <Back size={28} />
              </button>
              <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={FLOW.length} aria-valuenow={idx + 1} aria-label="Einrichtung">
                {FLOW.map((s, i) => (
                  <span key={s} className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span className="absolute inset-0 origin-left rounded-full bg-brand" initial={false} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ duration: 0.55, ease: EASE }} />
                  </span>
                ))}
              </div>
              <span className="w-12 text-right text-xs font-semibold text-muted">{idx + 1} / {FLOW.length}</span>
            </header>

            <main className="relative mx-auto w-full max-w-3xl flex-1 px-5 pb-6">
              <div className="mb-6 flex items-center gap-4">
                <motion.div key={step} initial={reduce ? false : { rotate: -8, scale: 0.85 }} animate={{ rotate: 0, scale: 1 }} transition={SPRING.bouncy} className="shrink-0">
                  <Mascot mood={MOOD[step as FlowStep]} size={104} blink />
                </motion.div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={reduce ? false : { opacity: 0, scale: 0.92, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={SPRING.snappy}
                    style={{ transformOrigin: 'left center' }}
                    className="relative rounded-3xl border-2 border-line bg-surface px-5 py-4 text-lg font-semibold"
                  >
                    {SPEECH[step as FlowStep]}
                    <span aria-hidden className="absolute -left-[9px] top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-surface" />
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
                  {step === 'course' && (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {COURSES.map((c, i) => (
                        <motion.li key={c.id} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.05 + i * 0.05 }}>
                          <motion.button
                            type="button"
                            onClick={() => (c.ready ? next() : setShake(c.id))}
                            animate={shake === c.id && !reduce ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
                            onAnimationComplete={() => shake === c.id && setShake(null)}
                            whileTap={{ scale: 0.97 }}
                            className={`tile relative h-full w-full flex-col justify-center !px-3 !py-6 text-center ${c.ready ? 'tile-selected' : 'opacity-60'}`}
                            aria-label={c.ready ? c.name : `${c.name}, kommt bald`}
                          >
                            {c.ready ? <FrenchFlag size={56} /> : <Lock size={40} className="text-muted" />}
                            <span className="text-lg">{c.name}</span>
                            {!c.ready && <span className="text-xs font-semibold uppercase tracking-wide">{shake === c.id ? 'kommt bald!' : 'bald'}</span>}
                            {c.ready && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"><Check size={13} /></span>}
                          </motion.button>
                        </motion.li>
                      ))}
                    </ul>
                  )}

                  {step === 'grade' && (
                    <ul className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Klasse">
                      {grades.map((g, i) => {
                        const on = grade === g
                        const gu = units.filter((u) => u.grade === g)
                        const lessonCount = gradeStats(g).lessons
                        return (
                          <motion.li key={g} className="min-w-0" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.05 + i * 0.06 }}>
                            <button type="button" role="radio" aria-checked={on} onClick={() => setGrade(g)} className="press relative flex w-full items-center gap-4 rounded-2xl border-2 border-line bg-surface p-4 text-left transition-colors hover:bg-snow">
                              {on && <motion.span layoutId="grade-ring" className="absolute -inset-0.5 rounded-2xl border-2 border-brand bg-brand-soft" transition={SPRING.snappy} />}
                              <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold transition-colors duration-300 ${on ? 'bg-brand text-white' : 'bg-snow text-ink'}`}>{g}</span>
                              <span className="relative min-w-0 flex-1">
                                <span className={`block text-lg font-semibold ${on ? 'text-brand-dark' : ''}`}>Klasse {g} <span className="text-sm font-medium text-muted">· Lernjahr {g - 6}</span></span>
                                <span className="block truncate text-sm text-muted">{gu.slice(0, 3).map((u) => u.title).join(' · ')}</span>
                              </span>
                              <span className="relative shrink-0 text-right text-xs font-semibold text-muted">{lessonCount}<br />Lektionen</span>
                            </button>
                          </motion.li>
                        )
                      })}
                    </ul>
                  )}

                  {step === 'goal' && (
                    <ul className="grid gap-3" role="radiogroup" aria-label="Tagesziel">
                      {GOALS.map((g, i) => {
                        const on = dailyGoal === g.xp
                        return (
                          <motion.li key={g.xp} className="min-w-0" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.05 + i * 0.06 }}>
                            <button type="button" role="radio" aria-checked={on} onClick={() => setDailyGoal(g.xp)} className="press relative flex w-full items-center gap-4 rounded-2xl border-2 border-line bg-surface p-4 text-left transition-colors hover:bg-snow">
                              {on && <motion.span layoutId="goal-ring" className="absolute -inset-0.5 rounded-2xl border-2 border-brand bg-brand-soft" transition={SPRING.snappy} />}
                              <span className="relative flex h-14 w-14 shrink-0 items-end justify-center gap-1 rounded-2xl bg-snow pb-3" aria-hidden>
                                {[0, 1, 2, 3].map((b) => (
                                  <span key={b} className={`w-2 rounded-sm transition-colors duration-300 ${b < g.bars ? 'bg-brand' : 'bg-line'}`} style={{ height: 8 + b * 6 }} />
                                ))}
                              </span>
                              <span className="relative min-w-0 flex-1">
                                <span className={`block text-lg font-semibold ${on ? 'text-brand-dark' : ''}`}>{g.label}</span>
                                <span className="block text-sm text-muted">{g.time}</span>
                              </span>
                              <span className="relative shrink-0 text-sm font-semibold text-muted">{g.xp} XP</span>
                            </button>
                          </motion.li>
                        )
                      })}
                    </ul>
                  )}

                  {step === 'ready' && (
                    <div className="relative">
                      <Confetti count={44} />
                      <div className="card overflow-hidden">
                        <div className="bg-gradient-to-br from-brand-soft to-surface p-6 text-center">
                          <p className="mb-1 text-xl font-bold">Französisch · Klasse {grade}</p>
                          <p className="text-muted">Mindestens {dailyGoal} XP pro Tag · {GOALS.find((g) => g.xp === dailyGoal)?.time}</p>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-line border-t border-line text-center">
                          <div className="px-3 py-4">
                            <div className="text-2xl font-bold text-brand-dark"><CountUp to={gradeStats(grade).lessons} /></div>
                            <div className="text-xs font-medium text-muted">Lektionen im Lernpfad</div>
                          </div>
                          <div className="px-3 py-4">
                            <div className="text-2xl font-bold text-brand-dark"><CountUp to={gradeStats(grade).words} /></div>
                            <div className="text-xs font-medium text-muted">neue Wörter</div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">
                        Tipp: Ist der Unterricht schon weiter? Unter „Mehr → Aufholen“ holst du den Stoff mit Tagesplan nach. Mit „Meine Sets“ machst du aus Fotos deiner Buchseiten Lernkarten.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            <footer className="sticky bottom-0 border-t border-line bg-bg/90 backdrop-blur">
              <div className="mx-auto flex w-full max-w-3xl justify-end px-5 py-4">
                <button className={`btn btn-primary press w-full sm:w-64 ${step === 'ready' ? 'btn-shine !py-4 text-base' : ''}`} onClick={step === 'ready' ? finish : next} autoFocus>
                  {step === 'ready' ? 'Los geht’s' : 'Weiter'}
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
