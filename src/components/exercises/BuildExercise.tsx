import { motion, useReducedMotion } from 'framer-motion'
import { SPRING } from '../ui/motion'
import { Instruction, type ExerciseProps } from './common'

/**
 * Satz aus Wortbausteinen zusammensetzen. `answer` ist die Liste der gewählten Wörter.
 * Jeder Baustein hat eine feste Identität (Wort + wievieltes Vorkommen), damit er beim Antippen
 * von unten nach oben fliegt statt hart zu springen.
 */
export function BuildExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'build'>) {
  const reduce = useReducedMotion()
  const locked = result !== null
  const chosen = Array.isArray(answer) ? answer : []

  // Wie oft wurde jedes Wort schon gewählt?
  const chosenCount = new Map<string, number>()
  const chosenItems = chosen.map((w, index) => {
    const k = chosenCount.get(w) ?? 0
    chosenCount.set(w, k + 1)
    return { w, index, id: `${w}#${k}` }
  })

  const seen = new Map<string, number>()
  const remaining = ex.words.flatMap((w) => {
    const k = seen.get(w) ?? 0
    seen.set(w, k + 1)
    return k < (chosenCount.get(w) ?? 0) ? [] : [{ w, id: `${w}#${k}` }]
  })

  const add = (w: string) => onChange([...chosen, w])
  const remove = (idx: number) => {
    const next = chosen.filter((_, i) => i !== idx)
    onChange(next.length ? next : null)
  }

  const t = reduce ? { duration: 0 } : SPRING.snappy

  return (
    <div>
      <Instruction>Übersetze den Satz</Instruction>
      <div className="mb-5 rounded-2xl border-2 border-line px-4 py-3 text-xl font-bold">{ex.prompt}</div>

      <div className="mb-4 flex min-h-[7.5rem] flex-wrap content-start gap-2 border-y-2 border-line py-3" aria-label="Dein Satz">
        {chosenItems.map(({ w, index, id }) => (
          <motion.button key={id} layout layoutId={id} transition={t} type="button" disabled={locked} onClick={() => remove(index)} className="tile !py-2" lang="fr">
            {w}
          </motion.button>
        ))}
        {chosenItems.length === 0 && <span className="self-center px-1 text-sm text-muted">Tippe unten die Wörter in der richtigen Reihenfolge an.</span>}
      </div>

      <div className="flex flex-wrap justify-center gap-2" aria-label="Wortbausteine">
        {remaining.map(({ w, id }) => (
          <motion.button key={id} layout layoutId={id} transition={t} type="button" disabled={locked} onClick={() => add(w)} className="tile !py-2" lang="fr">
            {w}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
