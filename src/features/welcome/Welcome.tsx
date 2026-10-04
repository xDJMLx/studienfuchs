import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EASE, SPRING } from '../../components/ui/motion'
import { Mascot, type Mood } from '../../components/mascot/Mascot'
import { Confetti } from '../../components/ui/Confetti'
import { Back, Right } from '../../components/ui/Icons'
import { Wordmark } from '../../components/ui/Layout'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { HELP_SUBJECTS } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'

type Step = 'hero' | 'subjects' | 'goal' | 'ready'
const FLOW: Exclude<Step, 'hero'>[] = ['subjects', 'goal', 'ready']
const ORDER: Step[] = ['hero', ...FLOW]

const GOALS = [
  { xp: 10, label: 'Locker', time: '5 Min. am Tag', bars: 1 },
  { xp: 20, label: 'Normal', time: '10 Min. am Tag', bars: 2 },
  { xp: 30, label: 'Ernsthaft', time: '15 Min. am Tag', bars: 3 },
  { xp: 50, label: 'Intensiv', time: '20+ Min. am Tag', bars: 4 },
]

const SPEECH: Record<Exclude<Step, 'hero'>, string> = {
  subjects: 'Welche Fächer hast du? Du kannst später jederzeit mehr hinzufügen.',
  goal: 'Wie viel möchtest du täglich üben?',
  ready: 'Super! Dann leg los mit deinen ersten Karteikarten.',
}
const MOOD: Record<Exclude<Step, 'hero'>, Mood> = { subjects: 'think', goal: 'happy', ready: 'cheer' }

const HOW = [
  { n: '1', title: 'Karteikarten erstellen', text: 'Schreib, was du für ein Fach brauchst, oder lass die KI die Karten machen. Auch aus einem Foto von deinem Heft.' },
  { n: '2', title: 'Jeden Tag kurz üben', text: 'Die App sagt dir, was heute dran ist: genau dann, kurz bevor du es vergessen würdest.' },
  { n: '3', title: 'Arbeiten eintragen', text: 'Mit Datum verteilt die App die Karten auf die Tage, damit du rechtzeitig alles kannst.' },
]

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE } },
  exit: (d: number) => ({ opacity: 0, x: d * -16, transition: { duration: 0.1 } }),
}

/** Einführung: ein Bildschirm pro Schritt, ohne Scrollen, wie bei einer richtigen App. */
export function Welcome() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { dailyGoal, setDailyGoal, setOnboarded, importData, mySubjects, toggleSubject } = useStore(useShallow((s) => ({ dailyGoal: s.dailyGoal, setDailyGoal: s.setDailyGoal, setOnboarded: s.setOnboarded, importData: s.importData, mySubjects: s.mySubjects ?? [], toggleSubject: s.toggleSubject })))
  const hasProgress = useStore((s) => s.xp > 0 || Object.keys(s.lessons).length > 0 || s.sets.length > 0)
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

  const idx = FLOW.indexOf(step as Exclude<Step, 'hero'>)
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

            <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...SPRING.snappy, delay: 0.2 }}
                className="relative mb-5 max-w-[19rem] rounded-3xl border-2 border-line bg-surface px-5 py-3.5 text-[17px] font-semibold leading-snug"
              >
                Hallo! Ich bin Fenni. Ich helfe dir, dass hängen bleibt, was du in der Schule lernst.
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
                Dein Übungsplan
                <br />
                für jedes Fach.
              </motion.h1>
              <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.36, delay: 0.3 }} className="mt-2 text-[16px] font-bold text-muted">
                Karteikarten, Wiederholung nach Plan und KI-Hilfe. Kostenlos und ohne Konto.
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
                  <Mascot mood={MOOD[step as Exclude<Step, 'hero'>]} size={92} blink />
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
                    {SPEECH[step as Exclude<Step, 'hero'>]}
                    <span aria-hidden className="absolute -left-[9px] top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-surface" />
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
                  {step === 'subjects' && (
                    <ul className="grid grid-cols-2 gap-2.5" role="group" aria-label="Meine Fächer">
                      {HELP_SUBJECTS.map((s) => {
                        const on = mySubjects.includes(s.id)
                        return (
                          <li key={s.id} className="min-w-0">
                            <button type="button" aria-pressed={on} onClick={() => toggleSubject(s.id)} className={`press relative flex w-full items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: s.c }}>
                                <HelpSubjectIcon id={s.id} ink={s.c} size={24} />
                              </span>
                              <span className={`min-w-0 flex-1 truncate text-[15px] font-extrabold ${on ? 'text-brand-dark' : ''}`}>{s.name}</span>
                              {on && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] text-on-brand">✓</span>}
                            </button>
                          </li>
                        )
                      })}
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
                      <ol className="grid gap-3">
                        {HOW.map((h) => (
                          <li key={h.n} className="card flex items-start gap-3.5 p-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-strong text-[16px] font-black text-on-brand">{h.n}</span>
                            <span className="min-w-0">
                              <span className="block font-extrabold">{h.title}</span>
                              <span className="block text-sm leading-snug text-muted">{h.text}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-3 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">Für Französisch gibt es fertige Karteikarten zum Wortschatz aus dem Unterricht (Klasse 7 bis 10), mit Beispielsätzen und Aufnahmen.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            <footer className="border-t border-line bg-bg" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
              <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-1 px-5 py-4 sm:flex-row-reverse sm:items-center">
                {step === 'ready' ? (
                  <>
                    <button className="btn btn-primary btn-shine press w-full !py-4 text-base sm:w-72" onClick={() => finish('/stapel/neu')} autoFocus>
                      Erste Karteikarten erstellen
                    </button>
                    <button type="button" className="press min-h-11 rounded-xl px-3 text-sm font-extrabold uppercase tracking-wide text-sky-dark sm:mr-auto" onClick={() => finish()}>
                      Erst umschauen
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary press w-full !py-4 text-base sm:ml-auto sm:w-64" onClick={next} autoFocus>
                    Weiter
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
