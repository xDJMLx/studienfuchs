import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { mascotBus } from '../../lib/mascotBus'
import { BuildExercise } from '../../components/exercises/BuildExercise'
import { ChoiceExercise } from '../../components/exercises/ChoiceExercise'
import { FillExercise } from '../../components/exercises/FillExercise'
import { ListenChoiceExercise } from '../../components/exercises/ListenChoiceExercise'
import { ListenExercise } from '../../components/exercises/ListenExercise'
import { MatchExercise } from '../../components/exercises/MatchExercise'
import { SpeakExercise } from '../../components/exercises/SpeakExercise'
import { SpellExercise } from '../../components/exercises/SpellExercise'
import { TeachExercise } from '../../components/exercises/TeachExercise'
import { TypeExercise } from '../../components/exercises/TypeExercise'
import { Bulb, Check, Close, Flame } from '../../components/ui/Icons'
import { EASE, SPRING } from '../../components/ui/motion'
import { evaluate, type Answer, type Evaluation } from '../../lib/evaluate'
import { fillSentence } from '../../lib/fillSentence'
import { makeHint } from '../../lib/hint'
import { playCorrect, playWrong } from '../../lib/sound'
import { speak } from '../../lib/speech'
import type { Grade } from '../../lib/srs'
import type { Exercise } from '../../lib/types'

export interface SessionResult {
  /** Anzahl der bewerteten Aufgaben (ohne Erklärkarten und Wiederholungen) */
  total: number
  firstTry: number
  accuracy: number
  grades: Record<string, Grade>
  mistakeItemIds: string[]
  /** Wie oft eine Aufgabe wiederholt werden musste, bis sie saß */
  retries: number
  /** Längste Reihe richtiger Antworten auf Anhieb */
  bestCombo: number
}

interface Props {
  exercises: Exercise[]
  /** Nur für diese Item-IDs wird die Wiederholungsplanung (FSRS) aktualisiert. */
  gradedItemIds: Set<string>
  onExit: () => void
  onComplete: (r: SessionResult) => void
  /** Tests: falsche Aufgaben werden nicht wiederholt. */
  noRetry?: boolean
}

/** Eine falsch beantwortete Aufgabe kommt nach ein paar anderen wieder – so lange, bis sie richtig ist. */
const RETRY_GAP = 3

export function Session({ exercises, gradedItemIds, onExit, onComplete, noRetry = false }: Props) {
  const reduce = useReducedMotion()
  const [queue, setQueue] = useState<Exercise[]>(exercises)
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [result, setResult] = useState<Evaluation | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  // Richtige Antworten in Folge (nur beim ersten Versuch)
  const [combo, setCombo] = useState(0)
  // Für welche Aufgabe wurde der Tipp geöffnet? (zählt dann nicht als "auf Anhieb richtig")
  const [hintFor, setHintFor] = useState<string | null>(null)

  const total = exercises.filter((e) => e.kind !== 'teach' && !e.warm).length
  const firstTry = useRef(0)
  // Beim ersten Versuch "fast richtig" (z. B. Akzent vergessen, mit Tipp): zählt halb für die Genauigkeit
  const almostFirst = useRef(0)
  const retries = useRef(0)
  const retryNo = useRef<Record<string, number>>({})
  const wrongCount = useRef<Record<string, number>>({})
  const almostCount = useRef<Record<string, number>>({})

  const ex = queue[idx]
  const isTeach = ex?.kind === 'teach'
  const isRetry = !!ex && ex.id.includes(':retry')
  const isMatch = ex?.kind === 'match'
  const baseId = ex ? ex.id.replace(/:retry\d+$/, '') : ''

  // Vier richtige Antworten in Folge: der Fuchs freut sich mit
  const bestCombo = useRef(0)
  useEffect(() => {
    bestCombo.current = Math.max(bestCombo.current, combo)
    if (combo > 0 && combo % 4 === 0) mascotBus.emit('cheer')
  }, [combo])

  const check = useCallback(
    (given: Answer | null) => {
      if (!ex || ex.kind === 'teach' || result) return
      let ev = evaluate(ex, given ?? '')
      if (hintFor === ex.id && ev.status === 'correct') ev = { ...ev, status: 'almost', feedback: 'Richtig, aber mit Tipp. Das üben wir gleich nochmal.' }
      setResult(ev)
      mascotBus.emit(ev.status === 'wrong' ? 'wrong' : ev.status === 'almost' ? 'almost' : 'correct')
      // Fertigen französischen Satz nach der Antwort vorlesen (Hörverstehen und Aussprache zum Mitsprechen)
      if (ex.kind === 'fill') speak(fillSentence(ex.sentence, ex.answer))
      else if (ex.kind === 'build' || ex.kind === 'spell') speak(ex.kind === 'build' ? ex.answer : ex.speak)
      for (const id of ev.mistakeItemIds) wrongCount.current[id] = (wrongCount.current[id] ?? 0) + 1
      if (ev.status === 'almost' && ex.kind !== 'match') almostCount.current[ex.itemId] = (almostCount.current[ex.itemId] ?? 0) + 1
      if (ev.status === 'wrong') {
        playWrong()
        setCombo(0)
        if (!noRetry) {
          // Gleiche Aufgabe wiederholen, bis sie sitzt (nach ein paar anderen, damit es kein Auswendig-Klicken wird)
          const n = (retryNo.current[baseId] = (retryNo.current[baseId] ?? 0) + 1)
          retries.current += 1
          setQueue((q) => {
            const copy = [...q]
            copy.splice(Math.min(idx + 1 + RETRY_GAP, copy.length), 0, { ...ex, id: `${baseId}:retry${n}`, ...(ex.kind === 'type' ? { hint: true } : {}) })
            return copy
          })
        }
      } else {
        playCorrect(!isRetry && !ex.warm && ev.status === 'correct' ? combo + 1 : 0)
        if (!isRetry && !ex.warm && ev.status === 'correct') {
          firstTry.current += 1
          setCombo((c) => c + 1)
        } else if (!isRetry && !ex.warm && ev.status === 'almost') almostFirst.current += 1
      }
    },
    [ex, result, isRetry, noRetry, baseId, idx, hintFor, combo],
  )

  // Zuordnen prüft sich selbst: sobald alle Paare gefunden sind, kommt das Ergebnis.
  const onChange = useCallback(
    (a: Answer | null) => {
      setAnswer(a)
      if (a && typeof a === 'object' && !Array.isArray(a) && 'matchMistakes' in a) check(a)
    },
    [check],
  )

  const next = useCallback(() => {
    if (idx + 1 >= queue.length) {
      const grades: Record<string, Grade> = {}
      const ids = new Set([...Object.keys(wrongCount.current), ...Object.keys(almostCount.current), ...exercises.map((e) => e.itemId)])
      for (const id of ids) {
        if (!gradedItemIds.has(id)) continue
        grades[id] = wrongCount.current[id] ? 'again' : almostCount.current[id] ? 'hard' : 'good'
      }
      // Zuordnen und Erklärkarten nennen mehrere Items – auch die einbeziehen
      for (const e of exercises) {
        if (e.kind === 'match') for (const p of e.pairs) if (gradedItemIds.has(p.id) && !grades[p.id]) grades[p.id] = 'good'
        if (e.kind === 'teach') for (const it of e.items) if (gradedItemIds.has(it.id) && !grades[it.id]) grades[it.id] = 'good'
      }
      const mistakeItemIds = Object.keys(wrongCount.current).filter((id) => gradedItemIds.has(id))
      onComplete({
        total,
        firstTry: firstTry.current,
        accuracy: total ? Math.min(1, (firstTry.current + 0.5 * almostFirst.current) / total) : 1,
        grades,
        mistakeItemIds,
        retries: retries.current,
        bestCombo: Math.max(bestCombo.current, combo),
      })
      return
    }
    setIdx(idx + 1)
    setAnswer(null)
    setResult(null)
  }, [idx, queue.length, exercises, gradedItemIds, onComplete, total, combo])

  // Enter = Prüfen bzw. Weiter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || confirmExit) return
      e.preventDefault()
      if (isTeach || result) next()
      else if (answer !== null && !isMatch) check(answer)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, result, isMatch, isTeach, check, next, confirmExit])

  if (!ex) return null

  const progress = queue.length ? (idx + (result || isTeach ? 0 : 0)) / queue.length : 0
  const common = { answer, onChange, result }
  const body =
    ex.kind === 'teach' ? (
      <TeachExercise exercise={ex} />
    ) : ex.kind === 'choice' ? (
      <ChoiceExercise exercise={ex} {...common} />
    ) : ex.kind === 'type' ? (
      <TypeExercise exercise={ex} {...common} />
    ) : ex.kind === 'listen' ? (
      <ListenExercise exercise={ex} {...common} />
    ) : ex.kind === 'listenChoice' ? (
      <ListenChoiceExercise exercise={ex} {...common} />
    ) : ex.kind === 'spell' ? (
      <SpellExercise exercise={ex} {...common} />
    ) : ex.kind === 'speak' ? (
      <SpeakExercise exercise={ex} {...common} />
    ) : ex.kind === 'build' ? (
      <BuildExercise exercise={ex} {...common} />
    ) : ex.kind === 'match' ? (
      <MatchExercise exercise={ex} {...common} />
    ) : (
      <FillExercise exercise={ex} {...common} />
    )

  const bad = result?.status === 'wrong'

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-4">
        <button type="button" onClick={() => setConfirmExit(true)} aria-label="Lektion beenden" className="text-muted transition-colors hover:text-ink">
          <Close size={28} />
        </button>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-snow"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <motion.div
            className="relative h-full overflow-hidden rounded-full bg-brand"
            initial={false}
            animate={{ width: `${Math.max(progress * 100, 3)}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 30 }}
          >
            <div className="mx-2 mt-1 h-1 rounded-full bg-white/35" />
          </motion.div>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {ex?.warm && !isRetry && (
            <motion.span key="warm" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="rounded-lg bg-gold/20 px-2 py-1 text-xs font-semibold text-gold-dark">
              Aufwärmen
            </motion.span>
          )}
          {isRetry && (
            <motion.span key="retry" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="rounded-lg bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-dark">
              Nochmal
            </motion.span>
          )}
          {combo >= 3 && (
            <motion.span
              key={`combo${combo}`}
              initial={reduce ? false : { opacity: 0, scale: 0.4, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={SPRING.bouncy}
              className="flex items-center gap-1 rounded-lg bg-fox/15 px-2 py-1 text-sm font-bold text-fox-dark"
              title={`${combo} richtige Antworten in Folge`}
            >
              <Flame size={16} /> {combo}
            </motion.span>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={ex.id + idx}
            className="exercise-in"
            initial={reduce ? false : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: bad && !reduce ? [0, -8, 8, -5, 5, 0] : 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -20, transition: { duration: 0.1, ease: 'easeIn' } }}
            transition={{ duration: bad ? 0.36 : 0.26, ease: EASE }}
          >
            {body}
            {!result && ((ex.kind === 'type' && !ex.hint) || ex.kind === 'listen') && (
              <div className="mt-4 min-h-11">
                {hintFor === ex.id ? (
                  <motion.p initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className="inline-block rounded-xl bg-snow px-4 py-2.5 font-mono text-lg tracking-[0.18em] text-muted" aria-live="polite">
                    <span className="sr-only">Tipp: </span>
                    {makeHint(ex.answer)}
                  </motion.p>
                ) : (
                  <button type="button" onClick={() => setHintFor(ex.id)} className="press inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-soft">
                    <Bulb size={16} /> Tipp anzeigen
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className={`safe-bottom relative overflow-hidden border-t transition-colors duration-300 ${result ? 'border-transparent' : 'border-line'}`}>
        <AnimatePresence initial={false}>
          {result && (
            <motion.div
              key={ex.id + idx}
              aria-hidden
              className={`absolute inset-0 ${bad ? 'bg-bad-soft' : 'bg-good-soft'}`}
              initial={reduce ? false : { y: '100%' }}
              animate={{ y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 330, damping: 32 }}
            />
          )}
        </AnimatePresence>
        <div className={`relative mx-auto flex w-full max-w-2xl gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4 ${!result && !isTeach ? 'flex-row items-center' : 'flex-col'}`}>
          {isTeach ? (
            <p className="hidden text-sm text-muted sm:block">Prägt euch die Wörter kurz ein. Gleich kommt die erste Frage dazu.</p>
          ) : result ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex min-w-0 items-start gap-3 ${bad ? 'text-bad-dark' : 'text-good-dark'}`}
              role="status"
              aria-live="polite"
            >
              <span className="relative mt-0.5 shrink-0">
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className={`absolute inset-0 rounded-full ${bad ? 'bg-bad' : 'bg-good'}`}
                    initial={{ scale: 1, opacity: 0.45 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                )}
                <motion.span
                  initial={reduce ? false : { scale: 0.3, rotate: bad ? 0 : -25 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 15 }}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-surface ${bad ? 'text-bad' : 'text-good'}`}
                >
                  {bad ? <Close size={28} /> : <Check size={28} />}
                </motion.span>
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-semibold">
                  {bad ? 'Leider falsch' : result.status === 'almost' ? (ex.kind === 'match' ? 'Geschafft!' : hintFor === ex.id ? 'Mit Tipp geschafft' : 'Fast richtig!') :['Super!', 'Richtig!', 'Stark!', 'Genau!'][idx % 4]}
                </p>
                {bad && result.correctAnswer && (
                  <p className="font-semibold">
                    <span className="font-semibold">Richtige Lösung: </span>
                    {result.correctAnswer}
                  </p>
                )}
                {bad && !noRetry && <p className="text-sm">Die Aufgabe kommt gleich nochmal.</p>}
                {!bad && result.feedback && <p className="font-semibold">{result.feedback}</p>}
                {ex.kind === 'fill' && <p className="mt-1 text-sm font-semibold">{ex.why}</p>}
              </div>
            </motion.div>
          ) : (
            !isMatch && (
              <button type="button" className="btn btn-ghost shrink-0 !px-4 !text-xs !text-muted sm:w-44 sm:!text-[14px]" onClick={() => check(answer ?? '')}>
                Weiß ich nicht
              </button>
            )
          )}

          {isTeach ? (
            <button type="button" onClick={next} className="btn btn-primary w-full sm:ml-auto sm:w-44" autoFocus>
              Weiter
            </button>
          ) : result ? (
            <button type="button" onClick={next} className={`btn ${bad ? 'btn-bad' : 'btn-good'} w-full sm:ml-auto sm:w-44`} autoFocus>
              Weiter
            </button>
          ) : (
            !isMatch && (
              <button type="button" disabled={answer === null} onClick={() => check(answer)} className="btn btn-primary min-w-0 flex-1 sm:ml-auto sm:w-44 sm:flex-none">
                Prüfen
              </button>
            )
          )}
        </div>
      </footer>

      <AnimatePresence>
        {confirmExit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Lektion beenden?"
          >
            <motion.div
              initial={reduce ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="card w-full max-w-sm p-6 text-center"
            >
              <p className="mb-1 text-xl font-semibold">Wirklich aufhören?</p>
              <p className="mb-5 text-muted">Dein Fortschritt aus dieser Runde geht verloren.</p>
              <button type="button" className="btn btn-primary mb-3 w-full" onClick={() => setConfirmExit(false)}>
                Weiterlernen
              </button>
              <button type="button" className="btn btn-ghost w-full !text-bad-dark" onClick={onExit}>
                Beenden
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
