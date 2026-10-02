import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LESSON_PASS, nextLessonAfter, TEST_PASS } from '../../content'
import { SpeakButton } from '../../components/exercises/common'
import { Mascot } from '../../components/mascot/Mascot'
import { Confetti } from '../../components/ui/Confetti'
import { Bolt, Bulb, Close, Flame, Right, Sparkle, Star, Target } from '../../components/ui/Icons'
import { CountUp, EASE, Item as FadeItem, ItemLi, SPRING, Stagger, StaggerList } from '../../components/ui/motion'
import { generateLesson, generateTest } from '../../lib/generateExercises'
import { recognitionAvailable } from '../../lib/recognition'
import { playDone } from '../../lib/sound'
import { hasFrenchVoice, loadAudioIndex } from '../../lib/speech'
import { masteryOf } from '../../lib/srs'
import type { Explanation, FillTask, Item } from '../../lib/types'
import { goalInfo, levelFromXp, lessonXp } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { Session, type SessionResult } from './Session'

interface Props {
  title: string
  items: Item[]
  pool: Item[]
  fills?: FillTask[]
  explanation?: Explanation
  lessonId?: string
  exitTo: string
  maxExercises?: number
  /** 'test' = Einheitentest: keine Erklärung, keine Wiederholung falscher Aufgaben, bestanden ab 80 % */
  mode?: 'learn' | 'test'
  /** Ohne Bestehensgrenze (Wiederholung, eigene Sets): Ergebnis zählt immer als geschafft. */
  noPassMark?: boolean
  /** Schwerpunkt beim freien Üben */
  focus?: 'mix' | 'write' | 'listen'
}

type Stage = 'explain' | 'practice' | 'done'

/** Wartet kurz auf die Liste der Sprachaufnahmen, damit Hörübungen von Anfang an eingeplant werden können. */
export function PracticeFlow(props: Props) {
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    void loadAudioIndex().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])
  return ready ? <PracticeFlowInner key={attempt} {...props} onRetry={() => setAttempt((a) => a + 1)} attempt={attempt} /> : null
}

function PracticeFlowInner({ title, items, pool, fills, explanation, lessonId, exitTo, maxExercises, mode = 'learn', noPassMark = false, focus = 'mix', onRetry, attempt }: Props & { onRetry: () => void; attempt: number }) {
  const isTest = mode === 'test'
  const navigate = useNavigate()
  const finishSession = useStore((s) => s.finishSession)

  // Einmal beim Start festlegen, welche Übungen kommen (neue Wörter erst zu zweit zeigen, dann abfragen).
  const [setup] = useState(() => {
    const cards = useStore.getState().cards
    const mastery = (id: string) => masteryOf(cards[id])
    const allowListen = hasFrenchVoice()
    const exercises = isTest
      ? generateTest({ items, pool, allowListen })
      : generateLesson({ items, pool, mastery, fills, maxExercises, allowListen, allowSpeak: recognitionAvailable && useStore.getState().speakingOn, focus })
    const st = useStore.getState()
    return { exercises, xpBefore: st.xp, todayBefore: xpToday(st.xpByDay), goal: st.dailyGoal }
  })

  // Erklärung nur beim ersten Versuch zeigen
  const [stage, setStage] = useState<Stage>(!isTest && explanation && attempt === 0 ? 'explain' : 'practice')
  const [outcome, setOutcome] = useState<{ result: SessionResult; xp: number; leveledUp: boolean; goalReached: boolean; bonusTier: number } | null>(null)
  const gradedIds = useMemo(() => new Set(items.map((i) => i.id)), [items])
  const finished = useRef(false)

  const onComplete = useCallback(
    (result: SessionResult) => {
      if (finished.current) return
      finished.current = true
      const xp = lessonXp(result.firstTry, result.total)
      finishSession({ xp, grades: result.grades, lessonId, accuracy: result.accuracy })
      const xpBefore = setup.xpBefore
      // Neue Stufe erreicht? (Mindestziel oder ein Bonusziel)
      const bonusTier = goalInfo(setup.goal, setup.todayBefore + xp).tier
      const goalReached = bonusTier > goalInfo(setup.goal, setup.todayBefore).tier
      setOutcome({ result, xp, leveledUp: levelFromXp(xpBefore + xp).level > levelFromXp(xpBefore).level, goalReached, bonusTier })
      playDone()
      setStage('done')
    },
    [finishSession, lessonId, setup.xpBefore, setup.todayBefore, setup.goal],
  )

  if (stage === 'explain' && explanation) {
    return (
      <Screen onExit={() => navigate(exitTo)} footer={<button className="btn btn-primary btn-shine press w-full justify-between sm:w-64" onClick={() => setStage('practice')} autoFocus>Verstanden <Right size={18} /></button>}>
        <Stagger stagger={0.09}>
          <FadeItem>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-dark">
              <Bulb size={14} /> Kurz erklärt
            </span>
            <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight">{explanation.title}</h1>
          </FadeItem>
          <FadeItem>
            <div className="grid gap-3">
              {explanation.paragraphs.map((p, i) => (
                <p key={p} className={i === 0 ? 'text-xl leading-9' : 'text-[17px] leading-8 text-ink/90'}>{p}</p>
              ))}
            </div>
          </FadeItem>
          {explanation.examples && (
            <FadeItem>
              <StaggerList className="mt-5 grid gap-2.5" stagger={0.06} delay={0.1}>
                {explanation.examples.map((e) => (
                  <ItemLi key={e.fr} className="card flex items-center gap-4 border-l-4 !border-l-brand p-3.5 pr-4">
                    <SpeakButton text={e.fr} />
                    <div className="min-w-0">
                      <div className="text-lg font-semibold leading-snug text-brand-dark">{e.fr}</div>
                      <div className="text-muted">{e.de}</div>
                    </div>
                  </ItemLi>
                ))}
              </StaggerList>
            </FadeItem>
          )}
          {explanation.tip && (
            <FadeItem>
              <div className="mt-5 flex gap-4 rounded-2xl bg-gold/15 p-4 ring-1 ring-gold/30">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/30 text-gold-dark"><Bulb size={22} /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">Merke</p>
                  <p className="leading-relaxed">{explanation.tip}</p>
                </div>
              </div>
            </FadeItem>
          )}
        </Stagger>
      </Screen>
    )
  }

  if (stage === 'done' && outcome) {
    const mark = noPassMark ? 0 : isTest ? TEST_PASS : LESSON_PASS
    return <ResultScreen title={title} outcome={outcome} items={items} test={isTest} mark={mark} lessonId={lessonId} onRetry={onRetry} onDone={() => navigate(exitTo)} onNext={(id) => navigate(`/lesson/${id}`, { replace: true })} />
  }

  return <Session exercises={setup.exercises} gradedItemIds={gradedIds} onExit={() => navigate(exitTo)} onComplete={onComplete} noRetry={isTest} />
}

function Screen({ children, footer, onExit }: { children: React.ReactNode; footer: React.ReactNode; onExit: () => void }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-2xl items-center px-4 py-4">
        <button type="button" onClick={onExit} aria-label="Schließen" className="press -ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-snow hover:text-ink">
          <Close size={26} />
        </button>
      </header>
      <main className="relative mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-6">{children}</main>
      <footer className="safe-bottom border-t border-line">
        <div className="mx-auto flex w-full max-w-2xl justify-end px-4 py-4">{footer}</div>
      </footer>
    </div>
  )
}

function ResultScreen({
  title,
  outcome,
  items,
  test,
  mark,
  lessonId,
  onRetry,
  onDone,
  onNext,
}: {
  title: string
  outcome: { result: SessionResult; xp: number; leveledUp: boolean; goalReached: boolean; bonusTier: number }
  items: Item[]
  test: boolean
  mark: number
  lessonId?: string
  onRetry: () => void
  onDone: () => void
  onNext: (lessonId: string) => void
}) {
  const reduce = useReducedMotion()
  const streak = streakNow(useStore.getState().streak)
  const { result, xp, leveledUp, goalReached, bonusTier } = outcome
  const pct = Math.round(result.accuracy * 100)
  const missed = items.filter((i) => result.mistakeItemIds.includes(i.id))
  const passed = result.accuracy >= mark
  // Direkt weiterlernen: die nächste offene Lektion (nach dem Speichern des Ergebnisses berechnet)
  const next = passed && lessonId ? nextLessonAfter(lessonId, useStore.getState().lessons) : undefined
  const stars = !passed ? 0 : pct >= 90 ? 3 : pct >= 75 ? 2 : 1
  const headline = test ? (passed ? 'Test bestanden!' : 'Noch nicht bestanden') : passed ? (pct >= 90 ? 'Perfekt!' : 'Lektion geschafft!') : 'Fast geschafft'
  const sub = !passed
    ? `Du brauchst mindestens ${Math.round(mark * 100)} % beim ersten Versuch, bevor es weitergeht. Das hier waren ${pct} %.${test ? '' : ' Mach die Lektion einfach nochmal, die schwierigen Wörter sitzen dann besser.'}`
    : test
      ? 'Stark, diese Einheit sitzt.'
      : result.retries > 0
        ? `${result.retries} Aufgaben musstest du wiederholen. Genau so bleibt es hängen.`
        : pct === 100
          ? 'Alles auf Anhieb richtig.'
          : 'Fast alles auf Anhieb richtig. Ein Tipp oder kleiner Tippfehler kostet nur ein paar Prozent.'

  return (
    <Screen
      onExit={onDone}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          {!passed && (
            <button className="btn btn-primary press w-full sm:w-56" onClick={onRetry} autoFocus>
              Nochmal versuchen
            </button>
          )}
          {next && (
            <button className="btn btn-primary btn-shine press w-full justify-between sm:w-72" onClick={() => onNext(next.id)} autoFocus>
              <span className="truncate">Nächste: {next.title}</span>
              <Right size={18} />
            </button>
          )}
          <button className={`btn ${passed && !next ? 'btn-primary' : 'btn-ghost'} press w-full sm:w-56`} onClick={onDone} autoFocus={passed && !next}>
            {passed ? (next ? 'Zum Lernpfad' : 'Weiter') : 'Später'}
          </button>
        </div>
      }
    >
      {passed && <Confetti count={stars === 3 ? 64 : 36} />}
      <div className="flex flex-col items-center pt-2 text-center">
        <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <Mascot mood={passed ? 'cheer' : 'think'} size={120} />
        </motion.div>
        {passed && (
          <div className="mt-3 flex gap-2" role="img" aria-label={`${stars} von 3 Sternen`}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={reduce ? false : { scale: 0, rotate: -70, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ ...SPRING.bouncy, delay: 0.5 + i * 0.2 }}
                className={i < stars ? 'text-gold drop-shadow-[0_2px_6px_rgba(245,184,46,0.55)]' : 'text-line'}
              >
                <Star size={i === 1 ? 52 : 40} />
              </motion.span>
            ))}
          </div>
        )}
        <motion.h1 initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.35 }} className="mt-3 text-3xl font-semibold">{headline}</motion.h1>
        <motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.45 }} className="mt-1 max-w-sm text-sm text-muted">{sub}</motion.p>
        <p className="mt-1 text-sm font-medium text-muted">{title}</p>
        <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3">
          <Stat tone="gold" icon={<Bolt size={22} />} label="XP" delay={0.7}><CountUp to={xp} prefix="+" delay={0.8} /></Stat>
          <Stat tone="good" label="Beim 1. Mal richtig" delay={0.85}><CountUp to={pct} suffix=" %" delay={0.95} /></Stat>
          <Stat tone="fox" icon={<Flame size={22} />} label="Serie" delay={1}><CountUp to={streak} delay={1.1} /></Stat>
        </div>
        {goalReached && (
          <motion.p
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 1.2 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-good-soft px-4 py-2 font-semibold text-good-dark"
          >
            <Target size={18} /> {bonusTier <= 1 ? 'Tagesziel geschafft!' : `Bonusziel ${bonusTier - 1} geschafft!`}
          </motion.p>
        )}
        {leveledUp && (
          <motion.p
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 1.3 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-gold/20 px-4 py-2 font-semibold text-gold-dark"
          >
            <Sparkle size={18} /> Level aufgestiegen!
          </motion.p>
        )}
      </div>
      {missed.length > 0 && (
        <div className="mx-auto mt-8 max-w-sm">
          <h2 className="mb-2 font-semibold">Das üben wir bald wieder</h2>
          <ul className="grid gap-2">
            {missed.map((m) => (
              <li key={m.id} className="card flex items-center justify-between gap-3 px-4 py-2">
                <span className="font-medium">{m.front}</span>
                <span className="text-right text-sm text-muted">{m.back}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Screen>
  )
}

const TONES = {
  gold: { box: 'border-gold', text: 'text-gold-dark' },
  good: { box: 'border-good', text: 'text-good-dark' },
  fox: { box: 'border-fox', text: 'text-fox-dark' },
} as const

function Stat({ tone, label, icon, children, delay = 0 }: { tone: keyof typeof TONES; label: string; icon?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  const t = TONES[tone]
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING.soft, delay }}
      className={`overflow-hidden rounded-2xl border bg-surface px-2 py-3 text-center ${t.box}`}
    >
      <div className={`flex items-center justify-center gap-1 text-2xl font-bold ${t.text}`}>
        {icon}
        {children}
      </div>
      <div className="mt-0.5 text-[11px] font-medium leading-tight text-muted">{label}</div>
    </motion.div>
  )
}
