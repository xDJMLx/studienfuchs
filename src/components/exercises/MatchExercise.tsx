import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { shuffle } from '../../lib/generateExercises'
import { speak } from '../../lib/speech'
import { Instruction, type ExerciseProps } from './common'

/** Paare zuordnen: links Französisch, rechts Deutsch. Fertig, sobald alle Paare gefunden sind. */
export function MatchExercise({ exercise: ex, onChange, result }: ExerciseProps<'match'>) {
  const reduce = useReducedMotion()
  const right = useMemo(() => shuffle(ex.pairs.map((p) => ({ id: p.id, text: p.right }))), [ex.pairs])
  const [selLeft, setSelLeft] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [mistakes, setMistakes] = useState<Set<string>>(new Set())
  const [flashWrong, setFlashWrong] = useState<string | null>(null)

  const pickRight = (id: string) => {
    if (!selLeft || result) return
    if (selLeft === id) {
      const next = new Set(done).add(id)
      setDone(next)
      setSelLeft(null)
      if (next.size === ex.pairs.length) onChange({ matchMistakes: [...mistakes] })
    } else {
      setMistakes(new Set(mistakes).add(selLeft).add(id))
      setFlashWrong(id)
      setTimeout(() => setFlashWrong(null), 450)
    }
  }

  /** Richtig gefundene Paare federn kurz und werden ruhiger; ein falscher Versuch wackelt. */
  const motionFor = (id: string, wrong: boolean) =>
    reduce
      ? undefined
      : done.has(id)
        ? { scale: [1, 1.1, 0.97, 1], x: 0 }
        : wrong
          ? { x: [0, -7, 7, -5, 5, 0], scale: 1 }
          : { scale: 1, x: 0 }

  return (
    <div>
      <Instruction>Finde die Paare</Instruction>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3">
          {ex.pairs.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              disabled={done.has(p.id) || !!result}
              onClick={() => {
                setSelLeft(p.id)
                speak(p.left)
              }}
              animate={motionFor(p.id, false)}
              transition={{ duration: 0.25 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              lang="fr"
              className={`tile justify-center ${done.has(p.id) ? 'tile-correct opacity-40' : selLeft === p.id ? 'tile-selected' : ''}`}
            >
              {p.left}
            </motion.button>
          ))}
        </div>
        <div className="grid gap-3">
          {right.map((r) => (
            <motion.button
              key={r.id}
              type="button"
              disabled={done.has(r.id) || !!result}
              onClick={() => pickRight(r.id)}
              animate={motionFor(r.id, flashWrong === r.id)}
              transition={{ duration: 0.25 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className={`tile justify-center ${done.has(r.id) ? 'tile-correct opacity-40' : flashWrong === r.id ? 'tile-wrong' : ''}`}
            >
              {r.text}
            </motion.button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">Tippe links ein französisches Wort, dann rechts die Übersetzung.</p>
    </div>
  )
}
