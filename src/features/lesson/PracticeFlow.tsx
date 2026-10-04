import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LESSON_PASS, nextLessonAfter, TEST_PASS } from '../../content'
import { generateMathSession } from '../../content/math'
import type { Level } from '../../content/math/core'
import { MathText } from '../../components/math/MathText'
import { SpeakButton } from '../../components/exercises/common'
import { Mascot } from '../../components/mascot/Mascot'
import { Confetti } from '../../components/ui/Confetti'
import { Bulb, Check, Chest, Close, Coin, Flame, Right, Sparkle, Star, Target, Trophy, Xp } from '../../components/ui/Icons'
import { ChestSheet } from '../../components/ui/ChestSheet'
import { WeekStrip } from '../../components/ui/widgets'
import { CountUp, EASE, Item as FadeItem, ItemLi, SPRING, Stagger, StaggerList } from '../../components/ui/motion'
import { mascotBus } from '../../lib/mascotBus'
import { generateLesson, generateTest, generateWarmup } from '../../lib/generateExercises'
import { recognitionAvailable } from '../../lib/recognition'
import { playDone } from '../../lib/sound'
import { hasFrenchVoice, loadAudioIndex, prefetchRecordings } from '../../lib/speech'
import { masteryOf } from '../../lib/srs'
import type { Explanation, FillTask, Item } from '../../lib/types'
import { goalInfo, levelFromXp, lessonXp } from '../../lib/xp'
import { comboBonus } from '../../lib/rewards'
import { useRewardEvents } from '../../store/useRewardEvents'
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
  /** 'test' = Einheitentest: keine Erklärung, keine Wiederholung falscher Aufgaben, bestanden ab 70 % */
  mode?: 'learn' | 'test'
  /** Ohne Bestehensgrenze (Wiederholung, eigene Sets): Ergebnis zählt immer als geschafft. */
  noPassMark?: boolean
  /** Schwerpunkt beim freien Üben */
  focus?: 'mix' | 'write' | 'listen'
  /** Ältere, fällige Wörter, die vor dem neuen Stoff kurz abgefragt werden (zählt nicht fürs Bestehen). */
  warmup?: Item[]
  /** Mathe: Die Items sind Themen, die Aufgaben werden frisch erzeugt (kein Wortschatz, keine Audio-Dateien). */
  math?: boolean
}

type Stage = 'explain' | 'practice' | 'done'

/** Wartet kurz auf die Liste der Sprachaufnahmen, damit Hörübungen von Anfang an eingeplant werden können. */
export function PracticeFlow(props: Props) {
  const [ready, setReady] = useState(!!props.math)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (props.math) return
    let alive = true
    void loadAudioIndex().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [props.math])
  return ready ? <PracticeFlowInner key={attempt} {...props} onRetry={() => setAttempt((a) => a + 1)} attempt={attempt} /> : null
}

function PracticeFlowInner({ title, items, pool, fills, explanation, lessonId, exitTo, maxExercises, mode = 'learn', noPassMark = false, focus = 'mix', warmup, math = false, onRetry, attempt }: Props & { onRetry: () => void; attempt: number }) {
  const isTest = mode === 'test'
  const navigate = useNavigate()
  const finishSession = useStore((s) => s.finishSession)

  // Einmal beim Start festlegen, welche Übungen kommen (neue Wörter erst zu zweit zeigen, dann abfragen).
  const [setup] = useState(() => {
    const cards = useStore.getState().cards
    const mastery = (id: string) => masteryOf(cards[id])
    const allowListen = !math && hasFrenchVoice()
    const warm = !math && !isTest && warmup?.length ? generateWarmup(warmup, pool, Math.random, mastery) : []
    const exercises = math
      ? generateMathSession({
          skillIds: items.map((i) => i.id),
          count: maxExercises ?? (isTest ? 12 : noPassMark ? 10 : 10),
          // Im Test und beim freien Üben gleich anspruchsvoller; in der Lektion von leicht nach schwer
          from: (isTest ? 2 : 1) as Level,
          to: 3,
          warm: isTest ? [] : (warmup ?? []).map((i) => i.id),
          startLevelOf: (id) => (mastery(id) >= 1 ? 2 : 1),
        })
      : isTest
      ? generateTest({ items, pool, allowListen, focus, count: maxExercises, mastery })
      : [...warm, ...generateLesson({ items, pool, mastery, fills, maxExercises, allowListen, allowSpeak: recognitionAvailable && useStore.getState().speakingOn, focus })]
    const st = useStore.getState()
    return { exercises, xpBefore: st.xp, todayBefore: xpToday(st.xpByDay), goal: st.dailyGoal }
  })

  // Aufnahmen der Wörter dieser Übung schon im Hintergrund holen
  useEffect(() => {
    if (!math) prefetchRecordings(items.map((i) => i.front))
  }, [items, math])

  // Erklärung nur beim ersten Versuch zeigen
  const [stage, setStage] = useState<Stage>(!isTest && explanation && attempt === 0 ? 'explain' : 'practice')
  const [outcome, setOutcome] = useState<{ result: SessionResult; xp: number; coins: number; leveledUp: boolean; goalReached: boolean; bonusTier: number; comboXp: number; streakUp: boolean } | null>(null)
  const gradedIds = useMemo(() => new Set([...items, ...(warmup ?? [])].map((i) => i.id)), [items, warmup])
  const finished = useRef(false)

  const onComplete = useCallback(
    (result: SessionResult) => {
      if (finished.current) return
      finished.current = true
      const comboXp = comboBonus(result.bestCombo)
      const xp = lessonXp(result.firstTry, result.total) + comboXp
      const lastDayBefore = useStore.getState().streak.lastDay
      const coins = finishSession({ xp, grades: result.grades, lessonId, accuracy: result.accuracy, ...(math ? { answered: result.total } : {}) })
      // Erstes Lernen heute: die Serie ist gerade um einen Tag gewachsen
      const streakUp = useStore.getState().streak.lastDay !== lastDayBefore
      const xpBefore = setup.xpBefore
      // Neue Stufe erreicht? (Mindestziel oder ein Bonusziel)
      const bonusTier = goalInfo(setup.goal, setup.todayBefore + xp).tier
      const goalReached = bonusTier > goalInfo(setup.goal, setup.todayBefore).tier
      setOutcome({ result, xp, coins, leveledUp: levelFromXp(xpBefore + xp).level > levelFromXp(xpBefore).level, goalReached, bonusTier, comboXp, streakUp })
      playDone()
      setStage('done')
    },
    [finishSession, lessonId, math, setup.xpBefore, setup.todayBefore, setup.goal],
  )

  if (stage === 'explain' && explanation) {
    return (
      <Screen onExit={() => navigate(exitTo)} footer={<button className="btn btn-primary btn-shine press w-full justify-between sm:w-64" onClick={() => setStage('practice')} autoFocus>Verstanden <Right size={18} /></button>}>
        <Stagger stagger={0.09}>
          <FadeItem>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
              <Bulb size={14} /> Kurz erklärt
            </span>
            <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight">{explanation.title}</h1>
          </FadeItem>
          <FadeItem>
            <div className="grid gap-3">
              {explanation.paragraphs.map((p, i) => (
                <p key={p} className={i === 0 ? 'text-xl leading-9' : 'text-[17px] leading-8 text-ink/90'}>{explanation.math ? <MathText>{p}</MathText> : p}</p>
              ))}
            </div>
          </FadeItem>
          {explanation.examples && (
            <FadeItem>
              <StaggerList className="mt-5 grid gap-2.5" stagger={0.06} delay={0.1}>
                {explanation.examples.map((e) => (
                  <ItemLi key={e.fr} className="card flex items-center gap-4 border-l-4 !border-l-brand p-3.5 pr-4">
                    {explanation.math ? null : <SpeakButton text={e.fr} />}
                    <div className="min-w-0">
                      <div className="text-lg font-semibold leading-snug text-brand-dark">{explanation.math ? <MathText className="text-[20px]">{e.fr}</MathText> : e.fr}</div>
                      <div className="text-muted">{explanation.math ? <MathText>{e.de}</MathText> : e.de}</div>
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
                  <p className="text-xs font-semibold text-gold-dark">Merke</p>
                  <p className="leading-relaxed">{explanation.math ? <MathText>{explanation.tip}</MathText> : explanation.tip}</p>
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
    return <ResultScreen math={math} title={title} outcome={outcome} items={items} test={isTest} free={noPassMark} mark={mark} lessonId={lessonId} onRetry={onRetry} onDone={() => navigate(exitTo)} onNext={(id) => navigate(`/lesson/${id}`, { replace: true })} />
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

export function ResultScreen({
  title,
  outcome,
  items,
  test,
  free,
  mark,
  lessonId,
  math = false,
  cards = false,
  extra,
  onMore,
  onRetry,
  onDone,
  onNext,
}: {
  math?: boolean
  /** Karten-Durchgang (statt Lektion): andere Überschriften und "Noch eine Runde" */
  cards?: boolean
  /** Zusätzlicher Inhalt unter den Zahlen (z. B. "Das hat sich getan") */
  extra?: React.ReactNode
  onMore?: () => void
  title: string
  outcome: { result: SessionResult; xp: number; coins: number; leveledUp: boolean; goalReached: boolean; bonusTier: number; comboXp: number; streakUp?: boolean }
  items: Item[]
  test: boolean
  free: boolean
  mark: number
  lessonId?: string
  onRetry: () => void
  onDone: () => void
  onNext: (lessonId: string) => void
}) {
  const reduce = useReducedMotion()
  const streak = streakNow(useStore.getState().streak)
  const { result, xp, coins, leveledUp, goalReached, bonusTier, comboXp, streakUp } = outcome
  // Was in dieser Einheit Neues passiert ist (Tagesaufgaben, Erfolge, Einheit, Truhe); wird beim Verlassen gelöscht
  const [events] = useState(() => useRewardEvents.getState().last)
  useEffect(() => () => useRewardEvents.setState({ last: null }), [])
  const [chestOpen, setChestOpen] = useState(false)
  const outfit = useStore.getState().outfit
  const pct = Math.round(result.accuracy * 100)
  const missed = items.filter((i) => result.mistakeItemIds.includes(i.id))
  const passed = result.accuracy >= mark
  // Direkt weiterlernen: die nächste offene Lektion (nach dem Speichern des Ergebnisses berechnet)
  const next = passed && lessonId ? nextLessonAfter(lessonId, useStore.getState().lessons) : undefined
  const stars = !passed ? 0 : pct >= 90 ? 3 : pct >= 75 ? 2 : 1
  // Der Fuchs freut sich mit, wenn eine neue Stufe erreicht ist
  useEffect(() => {
    if (!leveledUp) return
    const id = window.setTimeout(() => mascotBus.emit('levelup'), 900)
    return () => clearTimeout(id)
  }, [leveledUp])
  const freeHeadline = pct >= 90 ? 'Sehr gut!' : pct >= 70 ? 'Gut gemacht!' : 'Ein guter Anfang'
  const headline = cards ? (pct >= 90 ? 'Stark!' : pct >= 60 ? 'Runde geschafft!' : 'Guter Anfang!') : free && test ? freeHeadline : test ? (passed ? 'Test bestanden!' : 'Noch nicht bestanden') : passed ? (pct >= 90 ? 'Perfekt!' : 'Lektion geschafft!') : 'Fast geschafft'
  const sub = cards
    ? result.retries > 0
      ? `${result.retries === 1 ? 'Eine Karte' : result.retries + ' Karten'} musstest du wiederholen. Genau so bleibt es hängen.`
      : pct === 100
        ? 'Alles auf Anhieb gewusst.'
        : 'Die Karten, die nicht saßen, kommen bald wieder.'
    : free && test
    ? `${pct} % auf Anhieb richtig. ${missed.length ? (math ? 'Die Themen, die noch nicht saßen, siehst du unten.' : 'Die Wörter, die noch nicht saßen, siehst du unten.') : 'Kein einziger Fehler.'}`
    : !passed
    ? `Du brauchst mindestens ${Math.round(mark * 100)} % beim ersten Versuch, bevor es weitergeht. Das hier waren ${pct} %.${test ? '' : math ? ' Mach die Lektion einfach nochmal, du bekommst neue Aufgaben.' : ' Mach die Lektion einfach nochmal, die schwierigen Wörter sitzen dann besser.'}`
    : test
      ? 'Stark, diese Einheit sitzt.'
      : result.retries > 0
        ? `${result.retries === 1 ? 'Eine Aufgabe' : result.retries + ' Aufgaben'} musstest du wiederholen. Genau so bleibt es hängen.`
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
          {cards && onMore && (
            <button className="btn btn-primary btn-shine press w-full sm:w-64" onClick={onMore} autoFocus>
              Noch eine Runde
            </button>
          )}
          {next && (
            <button className="btn btn-primary btn-shine press w-full justify-between sm:w-72" onClick={() => onNext(next.id)} autoFocus>
              <span className="truncate">Nächste: {next.title}</span>
              <Right size={18} />
            </button>
          )}
          <button className={`btn ${passed && !next && !(cards && onMore) ? 'btn-primary' : 'btn-ghost'} press w-full sm:w-56`} onClick={onDone} autoFocus={passed && !next && !(cards && onMore)}>
            {cards ? 'Fertig' : passed ? (next ? 'Zum Lernpfad' : 'Weiter') : 'Später'}
          </button>
        </div>
      }
    >
      {passed && <Confetti count={stars === 3 ? 64 : 36} />}
      <div className="flex flex-col items-center pt-2 text-center">
        <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <Mascot mood={passed ? 'cheer' : 'think'} size={150} pose="full" alive listen outfit={outfit} />
        </motion.div>
        {passed && (
          <div className="mt-3 flex gap-2" role="img" aria-label={`${stars} von 3 Sternen`}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={reduce ? false : { scale: 0, rotate: -70, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ ...SPRING.bouncy, delay: 0.25 + i * 0.12 }}
                className={i < stars ? 'text-gold drop-shadow-[0_2px_6px_rgba(245,184,46,0.55)]' : 'text-line'}
              >
                <Star size={i === 1 ? 52 : 40} />
              </motion.span>
            ))}
          </div>
        )}
        <motion.h1 initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE, delay: 0.15 }} className={`mt-3 text-[32px] font-black leading-tight ${passed ? 'text-brand-strong' : 'text-ink'}`}>{headline}</motion.h1>
        <motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE, delay: 0.22 }} className="mt-1 max-w-sm text-sm text-muted">{sub}</motion.p>
        <p className="mt-1 text-sm font-medium text-muted">{title}</p>
        <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3">
          <Stat tone="gold" icon={<Xp size={22} />} label="XP" delay={0.3}><CountUp to={xp} prefix="+" delay={0.4} /></Stat>
          <Stat tone="good" label="Richtig" delay={0.38}><CountUp to={pct} suffix=" %" delay={0.48} /></Stat>
          <Stat tone="fox" icon={<Flame size={22} />} label="Serie" delay={0.46}><CountUp to={streak} delay={0.56} /></Stat>
        </div>
        {extra}
        {streakUp && streak > 0 && (
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.85, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 0.55 }}
            className="mt-5 w-full max-w-sm rounded-[20px] border-2 border-fox bg-brand-soft px-4 pb-4 pt-3 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <motion.span animate={reduce ? undefined : { scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] }} transition={{ duration: 0.9, delay: 0.9 }}>
                <Flame size={44} />
              </motion.span>
              <span className="text-[38px] font-black leading-none text-fox-dark tabular-nums">{streak}</span>
            </div>
            <p className="mt-1 text-[18px] font-extrabold text-fox-dark">{streak === 1 ? 'Deine Serie startet!' : 'Serie verlängert!'}</p>
            <p className="mb-3 text-sm text-muted">Lern morgen wieder, dann sind es {streak + 1} Tage.</p>
            <WeekStrip compact />
          </motion.div>
        )}
        {coins > 0 && (
          <motion.p
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 0.6 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-gold/20 px-4 py-2 font-semibold text-gold-dark"
          >
            <Coin size={20} /> +{coins} {coins === 1 ? 'Münze' : 'Münzen'}
          </motion.p>
        )}
        {goalReached && (
          <motion.p
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 0.68 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-good-soft px-4 py-2 font-semibold text-good-dark"
          >
            <Target size={18} /> {bonusTier <= 1 ? 'Tagesziel geschafft!' : `Bonusziel ${bonusTier - 1} geschafft!`}
          </motion.p>
        )}
        {leveledUp && (
          <motion.p
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 0.76 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-gold/20 px-4 py-2 font-semibold text-gold-dark"
          >
            <Sparkle size={18} /> Level aufgestiegen!
          </motion.p>
        )}
        {result.bestCombo >= 3 && (
          <motion.p
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 0.84 }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-fox/15 px-4 py-2 font-semibold text-fox-dark"
          >
            <Flame size={18} /> {result.bestCombo} richtige in Folge{comboXp > 0 ? `, +${comboXp} XP Combo-Bonus` : ''}
          </motion.p>
        )}
        {events && events.quests.length > 0 && (
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 0.92 }}
            className="mt-3 w-full max-w-sm rounded-2xl border border-good bg-good-soft px-4 py-3 text-left"
          >
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-good-dark">
              {events.quests.length === 1 ? 'Tagesaufgabe geschafft' : 'Tagesaufgaben geschafft'}
            </span>
            <ul className="grid gap-1.5">
              {events.quests.map((q) => (
                <li key={q.id} className="flex items-center gap-2 font-semibold text-good-dark">
                  <Check size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1 leading-snug">{q.text}</span>
                  <span className="flex shrink-0 items-center gap-1"><Coin size={14} /> +{q.coins}</span>
                </li>
              ))}
              {events.allQuests && (
                <li className="mt-1 flex items-center gap-2 border-t border-good/30 pt-2 font-extrabold text-gold-dark">
                  <Star size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1">Alle drei geschafft: Bonus!</span>
                  <span className="flex shrink-0 items-center gap-1"><Coin size={14} /> +{events.bonus}</span>
                </li>
              )}
            </ul>
          </motion.div>
        )}
        {events?.achievements.map((a, i) => (
          <motion.div
            key={a.id}
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 1.3 + i * 0.12 }}
            className="mt-3 flex w-full max-w-sm items-center gap-3 rounded-2xl border-2 border-gold bg-gold/10 px-4 py-3 text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold-dark"><Trophy size={24} /></span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wide text-gold-dark">Neuer Erfolg</span>
              <span className="block font-bold">{a.title}</span>
              <span className="block text-sm text-muted">{a.description}</span>
            </span>
          </motion.div>
        ))}
        {events?.unit && (
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.8, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 1.45 }}
            className="mt-3 w-full max-w-sm rounded-2xl bg-brand-strong px-4 py-3.5 text-left text-on-brand"
          >
            <span className="block text-xs font-extrabold uppercase tracking-[0.12em] opacity-80">Einheit geschafft</span>
            <span className="block text-xl font-extrabold leading-tight">{events.unit.title}</span>
            <span className="mt-1 block text-sm opacity-95"><b>Das kannst du jetzt:</b> {events.unit.description}</span>
          </motion.div>
        )}
        {events?.chestUnlocked && (
          <motion.button
            type="button"
            onClick={() => setChestOpen(true)}
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING.bouncy, delay: 1.0 }}
            className="press mt-4 flex w-full max-w-sm items-center gap-3 rounded-2xl border-2 border-gold bg-gold/15 px-4 py-3 text-left"
          >
            <Chest size={40} />
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Deine Truhe wartet!</span>
              <span className="block text-sm text-muted">Tagesziel geschafft. Tippe zum Öffnen.</span>
            </span>
            <Right size={16} className="text-muted" />
          </motion.button>
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
      <ChestSheet open={chestOpen} onClose={() => setChestOpen(false)} />
    </Screen>
  )
}

/** Farbe des Kopfes, dunkle Schrift darauf (weiß wäre auf Gold und Grün kaum lesbar), und lesbare Zahlenfarbe */
const TONES = {
  gold: { bg: 'var(--gold)', head: '#3d2c00', num: 'var(--gold-text)' },
  good: { bg: 'var(--good)', head: '#0b3d1c', num: 'var(--good-text)' },
  fox: { bg: 'var(--flame)', head: '#3a1800', num: 'var(--brand-text)' },
} as const

function Stat({ tone, label, icon, children, delay = 0 }: { tone: keyof typeof TONES; label: string; icon?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  const t = TONES[tone]
  // Wertkarte mit farbigem Kopf: oben die Bezeichnung, darunter groß die Zahl
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING.soft, delay }}
      className="overflow-hidden rounded-2xl border-2 text-center"
      style={{ borderColor: t.bg, background: t.bg }}
    >
      <div className="truncate px-1.5 py-1 text-[11px] font-extrabold uppercase leading-tight tracking-[0.06em]" style={{ color: t.head }}>{label}</div>
      <div className="flex items-center justify-center gap-1 rounded-[13px] bg-surface py-3 text-[24px] font-extrabold" style={{ color: t.num }}>
        {icon}
        {children}
      </div>
    </motion.div>
  )
}
