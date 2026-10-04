import { useCallback, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { generateCardSession } from '../../lib/cardSession'
import { activeDecks, allCourseDecks, cardRefs, ownDeck, pickRound, planToday, SESSION_SIZE, type CardRef } from '../../lib/decks'
import { comboBonus } from '../../lib/rewards'
import { playDone } from '../../lib/sound'
import { masteryOf } from '../../lib/srs'
import { goalInfo, levelFromXp, lessonXp } from '../../lib/xp'
import { useStore, xpToday } from '../../store/useStore'
import { ResultScreen } from '../lesson/PracticeFlow'
import { Session, type SessionResult } from '../lesson/Session'

type Mode = 'mix' | 'flip' | 'type'

interface Outcome {
  result: SessionResult
  xp: number
  coins: number
  leveledUp: boolean
  goalReached: boolean
  bonusTier: number
  comboXp: number
  streakUp: boolean
}

/** Ein Durchgang Karten: Aufgaben, Ergebnis, Belohnung. */
function CardRound({ title, refs, pool, mode, exitTo, onMore }: { title: string; refs: CardRef[]; pool: CardRef[]; mode: Mode; exitTo: string; onMore?: () => void }) {
  const navigate = useNavigate()
  const finishSession = useStore((s) => s.finishSession)
  const [setup] = useState(() => {
    const st = useStore.getState()
    const exercises = generateCardSession({ refs, pool, mastery: (id) => masteryOf(st.cards[id]), flipOnly: mode === 'flip', typeOnly: mode === 'type' })
    return { exercises, xpBefore: st.xp, todayBefore: xpToday(st.xpByDay), goal: st.dailyGoal }
  })
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const finished = useRef(false)
  const gradedIds = useMemo(() => new Set(refs.map((r) => r.item.id)), [refs])
  const items = useMemo(() => refs.map((r) => r.item), [refs])

  const onComplete = useCallback(
    (result: SessionResult) => {
      if (finished.current) return
      finished.current = true
      const comboXp = comboBonus(result.bestCombo)
      const xp = lessonXp(result.firstTry, result.total) + comboXp
      const lastDayBefore = useStore.getState().streak.lastDay
      const coins = finishSession({ xp, grades: result.grades, accuracy: result.accuracy, answered: result.total })
      const streakUp = useStore.getState().streak.lastDay !== lastDayBefore
      const bonusTier = goalInfo(setup.goal, setup.todayBefore + xp).tier
      const goalReached = bonusTier > goalInfo(setup.goal, setup.todayBefore).tier
      setOutcome({ result, xp, coins, leveledUp: levelFromXp(setup.xpBefore + xp).level > levelFromXp(setup.xpBefore).level, goalReached, bonusTier, comboXp, streakUp })
      playDone()
    },
    [finishSession, setup],
  )

  if (outcome) {
    return <ResultScreen cards title={title} outcome={outcome} items={items} test={false} free mark={0} onMore={onMore} onRetry={() => onMore?.()} onDone={() => navigate(exitTo)} onNext={() => undefined} />
  }
  return <Session exercises={setup.exercises} gradedItemIds={gradedIds} onExit={() => navigate(exitTo)} onComplete={onComplete} />
}

/** Alle Karten, die zu einer Auswahl gehören (auch Kurs-Stapel, die noch nicht hinzugefügt wurden). */
function selectRefs(params: URLSearchParams): { title: string; refs: CardRef[]; pool: CardRef[]; fresh: number } {
  const st = useStore.getState()
  const active = activeDecks({ sets: st.sets, addedUnits: st.addedUnits ?? [] })
  const everything = [...st.sets.map(ownDeck), ...allCourseDecks()]
  const pool = cardRefs(active)
  const arbeitId = params.get('arbeit')
  const deckId = params.get('deck')
  const subject = params.get('fach')

  if (arbeitId) {
    const a = (st.arbeiten ?? []).find((x) => x.id === arbeitId)
    if (!a) return { title: 'Üben', refs: [], pool, fresh: 6 }
    const refs = cardRefs(everything.filter((d) => a.deckIds.includes(d.id)))
    // Vor einer Arbeit lieber mehr Neues pro Runde
    return { title: a.title, refs: pickRound(refs, st.cards, { freshMax: 8 }), pool: [...pool, ...refs], fresh: 8 }
  }
  if (deckId) {
    const d = everything.find((x) => x.id === deckId)
    const refs = cardRefs(d ? [d] : [])
    return { title: d?.title ?? 'Üben', refs: pickRound(refs, st.cards, { freshMax: 6 }), pool: [...pool, ...refs], fresh: 6 }
  }
  if (subject) {
    const refs = cardRefs(active.filter((d) => d.subject === subject))
    return { title: 'Üben', refs: pickRound(refs, st.cards, { freshMax: 6 }), pool, fresh: 6 }
  }
  // Heute: fällige Karten aller Fächer, dann die neuen des Tages
  const plan = planToday(active, st.arbeiten ?? [], st.cards)
  const refs = [...plan.due.slice(0, SESSION_SIZE), ...plan.fresh].slice(0, SESSION_SIZE)
  // Ist heute nichts dran: die schwächsten Karten (freies Üben)
  return { title: 'Heute', refs: refs.length ? refs : pickRound(pool, st.cards, { freshMax: 0 }), pool, fresh: plan.fresh.length }
}

/**
 * Üben: `/ueben/los` (heute), `?arbeit=…`, `?deck=…`, `?fach=…`; `modus=flip|type` begrenzt die Aufgabenart.
 * „Noch eine Runde“ stellt eine neue Auswahl zusammen.
 */
export function UebenPlay() {
  const [params] = useSearchParams()
  const [round, setRound] = useState(0)
  return <Round key={`${params.toString()}#${round}`} params={params} onMore={() => setRound((r) => r + 1)} />
}

function Round({ params, onMore }: { params: URLSearchParams; onMore: () => void }) {
  const [sel] = useState(() => selectRefs(params))
  const mode = (params.get('modus') as Mode | null) ?? 'mix'
  if (!sel.refs.length) return <Navigate to="/" replace />
  return <CardRound title={sel.title} refs={sel.refs} pool={sel.pool} mode={mode} exitTo={params.get('arbeit') || params.get('deck') || params.get('fach') ? '/faecher' : '/'} onMore={onMore} />
}
