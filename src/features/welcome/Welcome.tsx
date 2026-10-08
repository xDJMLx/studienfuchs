import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EASE, SPRING } from '../../components/ui/motion'
import { Mascot, type Mood } from '../../components/mascot/Mascot'
import { SPECIES_IDS, skinOf } from '../../components/mascot/species'
import { Tour } from './Tour'
import { QuickCards } from './QuickCards'
import { Back, Chevron, Right } from '../../components/ui/Icons'
import { Wordmark } from '../../components/ui/Layout'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { HELP_SUBJECTS } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'

/**
 * Einrichtung in drei Bildschirmen (Start, Klasse und Fächer, erste Karteikarten): Gefragt wird nur, was die KI für gute Karten braucht.
 * Lerntier, Lernzeit und Schulstunden stehen später in den Einstellungen; die Einführung gibt es auf Wunsch („So funktioniert’s“).
 */
type Step = 'hero' | 'tour' | 'basics' | 'first'
const ORDER: Step[] = ['hero', 'tour', 'basics', 'first']

const SPEECH: Record<'basics' | 'first', string> = {
  basics: 'In welcher Klasse bist du, und welche Fächer hast du? Mehr kannst du später jederzeit dazunehmen.',
  first: 'Jetzt machen wir deine ersten Karteikarten. Dann geht es gleich los.',
}
const MOOD: Record<'basics' | 'first', Mood> = { basics: 'think', first: 'happy' }

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE } },
  exit: (d: number) => ({ opacity: 0, x: d * -16, transition: { duration: 0.1 } }),
}

export function Welcome() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { grade, setGrade, setOnboarded, importData, mySubjects, toggleSubject, mascot, setMascot } = useStore(
    useShallow((s) => ({ grade: s.grade, setGrade: s.setGrade, setOnboarded: s.setOnboarded, importData: s.importData, mySubjects: s.mySubjects ?? [], toggleSubject: s.toggleSubject, mascot: s.mascot, setMascot: s.setMascot })),
  )
  const hasProgress = useStore((s) => s.xp > 0 || Object.keys(s.lessons).length > 0 || s.sets.length > 0)
  // Mit ?schritt=fach oder ?schritt=karten lässt sich ein Schritt direkt öffnen (zum Ansehen und Testen)
  const [params] = useSearchParams()
  const [step, setStep] = useState<Step>(() => ({ tour: 'tour', fach: 'basics', karten: 'first' } as Record<string, Step>)[params.get('schritt') ?? ''] ?? 'hero')
  const [dir, setDir] = useState(1)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const skin = skinOf(mascot)

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

  /** Das Lerntier wechseln, gleich auf dem Startbildschirm (ohne eigenen Schritt). */
  const cycle = (d: number) => {
    const i = SPECIES_IDS.indexOf(skin.id)
    setMascot(SPECIES_IDS[(i + d + SPECIES_IDS.length) % SPECIES_IDS.length])
  }

  const idx = step === 'basics' ? 0 : 1

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'hero' ? (
          <motion.div key="hero" className="flex min-h-0 flex-1 flex-col" exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.14 } }}>
            <header className={`mx-auto flex w-full max-w-md items-center px-6 pt-4 ${hasProgress ? 'justify-between' : 'justify-center'}`}>
              <Wordmark />
              {hasProgress && (
                <button type="button" onClick={() => finish()} className="press flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-extrabold text-sky-dark">
                  Zur App <Right size={14} />
                </button>
              )}
            </header>

            <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
              <motion.div
                key={skin.id}
                initial={reduce ? false : { opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...SPRING.snappy, delay: 0.1 }}
                className="relative mb-5 max-w-[19rem] rounded-3xl border border-line bg-surface px-5 py-3.5 text-[17px] font-semibold leading-snug"
              >
                Hallo! Ich bin {skin.name}. Ich helfe dir, dass hängen bleibt, was du in der Schule lernst.
                <span aria-hidden className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-line bg-surface" />
              </motion.div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Vorheriges Tier" onClick={() => cycle(-1)} className="press flex h-11 w-11 items-center justify-center rounded-full text-muted">
                  <Chevron size={22} style={{ transform: 'rotate(90deg)' }} />
                </button>
                <motion.div initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING.soft, delay: 0.05 }}>
                  <div className="animate-float" style={{ animationDuration: '6s' }}>
                    <Mascot mood="wave" size={220} pose="full" alive className="!h-[min(28dvh,220px)] !w-[min(28dvh,220px)]" />
                  </div>
                </motion.div>
                <button type="button" aria-label="Nächstes Tier" onClick={() => cycle(1)} className="press flex h-11 w-11 items-center justify-center rounded-full text-muted">
                  <Chevron size={22} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: EASE, delay: 0.22 }}
                className="mt-4 text-[28px] font-black leading-[1.12] tracking-tight sm:text-[34px]"
              >
                Dein Übungsplan
                <br />
                für jedes Fach.
              </motion.h1>
              <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.36, delay: 0.3 }} className="mt-2 text-[16px] font-bold text-muted">
                Karteikarten per KI, Wiederholung nach Plan, Arbeiten und Hausaufgaben. Kostenlos und ohne Konto.
              </motion.p>
            </main>

            <footer className="mx-auto w-full max-w-md px-6 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: EASE, delay: 0.36 }} className="grid gap-1">
                <button className="btn btn-primary press w-full !py-4 text-base" onClick={() => go('basics')} autoFocus>
                  Jetzt starten
                </button>
                <div className="flex items-center justify-center gap-2">
                  <button type="button" className="press min-h-11 rounded-xl px-3 text-sm font-extrabold text-sky-dark" onClick={() => go('tour')}>
                    So funktioniert’s
                  </button>
                  <span className="text-muted" aria-hidden>
                    ·
                  </span>
                  <button type="button" className="press min-h-11 rounded-xl px-3 text-sm font-extrabold text-sky-dark" onClick={() => fileRef.current?.click()}>
                    Ich habe schon Fortschritt
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="application/json" className="sr-only" aria-label="Sicherung laden" onChange={(e) => doImport(e.target.files?.[0])} />
                {importMsg && (
                  <p className="text-center text-sm font-semibold text-bad-dark" role="alert">
                    {importMsg}
                  </p>
                )}
              </motion.div>
            </footer>
          </motion.div>
        ) : step === 'tour' ? (
          <motion.div key="tour" className="flex min-h-0 flex-1 flex-col" initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ type: 'spring', stiffness: 460, damping: 36 }}>
            <Tour onBack={() => go('hero')} onDone={() => go('basics')} doneLabel="Los geht’s" />
          </motion.div>
        ) : (
          <motion.div key="flow" className="flex min-h-0 flex-1 flex-col" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25 }}>
            <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-4">
              <button type="button" onClick={() => go(step === 'first' ? 'basics' : 'hero')} aria-label="Zurück" className="press -ml-1 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:text-ink">
                <Back size={28} />
              </button>
              <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={2} aria-valuenow={idx + 1} aria-label="Einrichtung">
                {[0, 1].map((i) => (
                  <span key={i} className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span className="absolute inset-0 origin-left rounded-full bg-brand" initial={false} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ duration: 0.45, ease: EASE }} />
                  </span>
                ))}
              </div>
              <span className="w-12 text-right text-xs font-semibold text-muted">
                {idx + 1} / 2
              </span>
            </header>

            <main className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto px-5 pb-4">
              <div className="mb-5 flex items-center gap-4">
                <motion.div key={step} initial={reduce ? false : { scale: 0.85 }} animate={{ scale: 1 }} transition={SPRING.bouncy} className="shrink-0">
                  <Mascot mood={MOOD[step as 'basics' | 'first']} size={84} blink />
                </motion.div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    transition={SPRING.snappy}
                    style={{ transformOrigin: 'left center' }}
                    className="relative rounded-3xl border border-line bg-surface px-5 py-3.5 text-[16px] font-semibold leading-snug"
                  >
                    {SPEECH[step as 'basics' | 'first']}
                    <span aria-hidden className="absolute -left-[9px] top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-line bg-surface" />
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
                  {step === 'basics' && (
                    <>
                      <p className="mb-2 text-sm font-bold text-muted">Klasse</p>
                      <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Klasse">
                        {[5, 6, 7, 8, 9, 10, 11, 12, 13].map((g) => (
                          <button key={g} type="button" role="radio" aria-checked={grade === g} onClick={() => setGrade(g)} className={`chip !min-w-11 justify-center ${grade === g ? 'chip-on' : ''}`}>
                            {g}
                          </button>
                        ))}
                      </div>
                      <p className="mb-2 text-sm font-bold text-muted">Meine Fächer</p>
                      <ul className="grid grid-cols-2 gap-2.5" role="group" aria-label="Meine Fächer">
                        {HELP_SUBJECTS.filter((s) => s.id !== 'sonstiges').map((s) => {
                          const on = mySubjects.includes(s.id)
                          return (
                            <li key={s.id} className="min-w-0">
                              <button type="button" aria-pressed={on} onClick={() => toggleSubject(s.id)} className={`press relative flex w-full items-center gap-2.5 rounded-2xl border-[1.5px] p-2.5 text-left transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
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
                    </>
                  )}

                  {step === 'first' && <QuickCards subjects={mySubjects} grade={grade} onStart={(id) => finish(`/ueben/los?deck=${id}`)} onSkip={() => finish()} skipLabel="Später, erst umschauen" />}
                </motion.div>
              </AnimatePresence>
            </main>

            {step === 'basics' && (
              <footer className="border-t border-line bg-bg" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
                <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-1 px-5 py-4 sm:flex-row-reverse sm:items-center">
                  <button className="btn btn-primary press w-full !py-4 text-base sm:ml-auto sm:w-64" disabled={mySubjects.length === 0} onClick={() => go('first')} autoFocus>
                    Weiter
                  </button>
                  {mySubjects.length === 0 && <p className="text-center text-xs text-muted sm:mr-auto">Tipp mindestens ein Fach an.</p>}
                </div>
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

