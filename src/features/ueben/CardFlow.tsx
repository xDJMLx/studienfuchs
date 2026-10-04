import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { approxGrade } from '../../lib/exam'
import { shuffle } from '../../lib/generateExercises'
import { activeDecks, allCourseDecks, cardRefs, ownDeck, pickRound, planToday, SESSION_SIZE, type CardRef, type Deck } from '../../lib/decks'
import { bonusCoins, diffProgress, snapshot, type ProgressDiff } from '../../lib/progress'
import { recognitionAvailable } from '../../lib/recognition'
import { comboBonus } from '../../lib/rewards'
import { generateRound, type RoundMode } from '../../lib/roundExercises'
import { playDone } from '../../lib/sound'
import { hasFrenchVoice, loadAudioIndex, prefetchRecordings } from '../../lib/speech'
import { masteryOf } from '../../lib/srs'
import { goalInfo, levelFromXp, lessonXp } from '../../lib/xp'
import { useStore, xpToday } from '../../store/useStore'
import { ResultScreen } from '../lesson/PracticeFlow'
import { Session, type SessionResult } from '../lesson/Session'
import { ProgressSummary } from './ProgressSummary'

interface Outcome {
  result: SessionResult
  xp: number
  coins: number
  leveledUp: boolean
  goalReached: boolean
  bonusTier: number
  comboXp: number
  streakUp: boolean
  diff: ProgressDiff
  /** Münzen für Meilensteine (Level, Sterne, Marken einer Arbeit) */
  bonus: number
  decks: Deck[]
  solidBySubject: Record<string, number>
}

/** Ein Durchgang Karten: Aufgaben, Ergebnis, Belohnung, und was sich beim Lernstand getan hat. */
function CardRound({ title, refs, pool, mode, exitTo, onMore }: { title: string; refs: CardRef[]; pool: CardRef[]; mode: RoundMode; exitTo: string; onMore?: () => void }) {
  const probe = mode === 'probe'
  const navigate = useNavigate()
  const finishSession = useStore((s) => s.finishSession)
  const [setup] = useState(() => {
    const st = useStore.getState()
    const decks = activeDecks({ sets: st.sets, addedUnits: st.addedUnits ?? [] })
    const exercises = generateRound({
      refs,
      pool,
      mastery: (id) => masteryOf(st.cards[id]),
      mode,
      allowListen: hasFrenchVoice(),
      allowSpeak: recognitionAvailable && st.speakingOn,
    })
    return { exercises, decks, before: snapshot(decks, st.arbeiten ?? [], st.cards), xpBefore: st.xp, todayBefore: xpToday(st.xpByDay), goal: st.dailyGoal }
  })
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const finished = useRef(false)
  const gradedIds = useMemo(() => new Set(refs.map((r) => r.item.id)), [refs])
  const items = useMemo(() => refs.map((r) => r.item), [refs])
  const subjects = useMemo(() => [...new Set(refs.map((r) => r.deck.subject))], [refs])

  // Aufnahmen der französischen Karten schon im Hintergrund holen
  useEffect(() => {
    prefetchRecordings(refs.filter((r) => r.deck.lang === 'fr').map((r) => r.item.front))
  }, [refs])

  const onComplete = useCallback(
    (result: SessionResult) => {
      if (finished.current) return
      finished.current = true
      const comboXp = comboBonus(result.bestCombo)
      const xp = lessonXp(result.firstTry, result.total) + comboXp
      const lastDayBefore = useStore.getState().streak.lastDay
      const coins = finishSession({ xp, grades: result.grades, accuracy: result.accuracy, answered: result.total, subjects })
      const st = useStore.getState()
      const streakUp = st.streak.lastDay !== lastDayBefore
      const bonusTier = goalInfo(setup.goal, setup.todayBefore + xp).tier
      const goalReached = bonusTier > goalInfo(setup.goal, setup.todayBefore).tier
      const after = snapshot(setup.decks, st.arbeiten ?? [], st.cards)
      const diff = diffProgress(setup.before, after)
      const bonus = bonusCoins(diff)
      if (bonus > 0) useStore.getState().addCoins(bonus)
      setOutcome({
        result,
        xp,
        coins,
        leveledUp: levelFromXp(setup.xpBefore + xp).level > levelFromXp(setup.xpBefore).level,
        goalReached,
        bonusTier,
        comboXp,
        streakUp,
        diff,
        bonus,
        decks: setup.decks,
        solidBySubject: after.solidBySubject,
      })
      playDone()
    },
    [finishSession, setup, subjects],
  )

  if (outcome) {
    const arbeiten = useStore.getState().arbeiten ?? []
    return (
      <ResultScreen
        cards
        title={title}
        outcome={outcome}
        items={items}
        test={false}
        free
        mark={0}
        extra={
          <>
            {probe && <ProbeNote percent={Math.round(outcome.result.accuracy * 100)} />}
            <ProgressSummary diff={outcome.diff} bonus={outcome.bonus} decks={outcome.decks} arbeiten={arbeiten} solidBySubject={outcome.solidBySubject} subjects={subjects} />
          </>
        }
        onMore={onMore}
        onRetry={() => onMore?.()}
        onDone={() => navigate(exitTo)}
        onNext={() => undefined}
      />
    )
  }
  // Probearbeit: Fehler kommen nicht wieder (wie in der echten Arbeit)
  return <Session exercises={setup.exercises} gradedItemIds={gradedIds} onExit={() => navigate(exitTo)} onComplete={onComplete} noRetry={probe} />
}

/** Ungefähre Note nach einer Probearbeit (nur zur Orientierung, jede Lehrkraft setzt die Grenzen selbst). */
function ProbeNote({ percent }: { percent: number }) {
  const g = approxGrade(percent)
  return (
    <section className="mt-5 w-full max-w-sm rounded-2xl border-2 border-sky bg-sky-soft px-4 py-3 text-center" aria-label="Ungefähre Note">
      <p className="text-xs font-extrabold uppercase tracking-wide text-sky-dark">Probearbeit</p>
      <p className="text-[28px] font-black leading-tight">Ungefähr eine {g.note}</p>
      <p className="text-sm font-bold text-muted">{g.label}, {percent} % richtig. Nur zur Orientierung: Jede Lehrkraft setzt die Grenzen selbst.</p>
    </section>
  )
}

/** Alle Karten, die zu einer Auswahl gehören (auch Kurs-Stapel, die noch nicht hinzugefügt wurden). */
function selectRefs(params: URLSearchParams): { title: string; refs: CardRef[]; pool: CardRef[] } {
  const st = useStore.getState()
  const active = activeDecks({ sets: st.sets, addedUnits: st.addedUnits ?? [] })
  const everything = [...st.sets.map(ownDeck), ...allCourseDecks()]
  const pool = cardRefs(active)
  const arbeitId = params.get('arbeit')
  const deckId = params.get('deck')
  const subject = params.get('fach')

  if (arbeitId) {
    const a = (st.arbeiten ?? []).find((x) => x.id === arbeitId)
    if (!a) return { title: 'Üben', refs: [], pool }
    const refs = cardRefs(everything.filter((d) => a.deckIds.includes(d.id)))
    // Probearbeit: 15 zufällige Karten aus dem ganzen Stoff, nichts wird gezeigt
    if (params.get('modus') === 'probe') return { title: `Probearbeit: ${a.title}`, refs: shuffle(refs).slice(0, 15), pool: [...pool, ...refs] }
    // Vor einer Arbeit lieber mehr Neues pro Runde
    return { title: a.title, refs: pickRound(refs, st.cards, { freshMax: 8 }), pool: [...pool, ...refs] }
  }
  if (deckId) {
    const d = everything.find((x) => x.id === deckId)
    const refs = cardRefs(d ? [d] : [])
    return { title: d?.title ?? 'Üben', refs: pickRound(refs, st.cards, { freshMax: 6 }), pool: [...pool, ...refs] }
  }
  if (subject) {
    const refs = cardRefs(active.filter((d) => d.subject === subject))
    return { title: 'Üben', refs: pickRound(refs, st.cards, { freshMax: 6 }), pool }
  }
  // Heute: fällige Karten aller Fächer, dann die neuen des Tages
  const plan = planToday(active, st.arbeiten ?? [], st.cards)
  const refs = [...plan.due.slice(0, SESSION_SIZE), ...plan.fresh].slice(0, SESSION_SIZE)
  // Ist heute nichts dran: die schwächsten Karten (freies Üben)
  return { title: 'Heute', refs: refs.length ? refs : pickRound(pool, st.cards, { freshMax: 0 }), pool }
}

/**
 * Üben: `/ueben/los` (heute), `?arbeit=…`, `?deck=…`, `?fach=…`; `modus=flip|type|write|listen` begrenzt die Aufgabenart.
 * „Noch eine Runde“ stellt eine neue Auswahl zusammen.
 */
export function UebenPlay() {
  const [params] = useSearchParams()
  const [round, setRound] = useState(0)
  // Die Liste der Aufnahmen muss da sein, bevor Hör-Aufgaben geplant werden
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    void loadAudioIndex().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])
  if (!ready) return null
  return <Round key={`${params.toString()}#${round}`} params={params} onMore={() => setRound((r) => r + 1)} />
}

function Round({ params, onMore }: { params: URLSearchParams; onMore: () => void }) {
  const [sel] = useState(() => selectRefs(params))
  const mode = (params.get('modus') as RoundMode | null) ?? 'mix'
  if (!sel.refs.length) return <Navigate to="/" replace />
  return <CardRound title={sel.title} refs={sel.refs} pool={sel.pool} mode={mode} exitTo={params.get('arbeit') || params.get('deck') || params.get('fach') ? '/' : '/'} onMore={onMore} />
}
