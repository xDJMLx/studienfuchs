import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SPRING } from '../ui/motion'
import { Instruction, type ExerciseProps } from './common'

/**
 * Schritte in die richtige Reihenfolge bringen: Unten liegen die Schritte durcheinander, antippen setzt sie der Reihe nach oben ein,
 * ein Tipp auf einen gesetzten Schritt nimmt ihn (und alle danach) wieder heraus. `answer` ist die Liste der gesetzten Schritte.
 */
export function OrderExercise({ exercise: ex, onChange, result }: ExerciseProps<'order'>) {
  const reduce = useReducedMotion()
  const locked = result !== null
  const [chosen, setChosen] = useState<string[]>([])
  // Geprüft werden kann erst, wenn alle Schritte gesetzt sind
  useEffect(() => {
    onChange(chosen.length === ex.steps.length ? chosen : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen])
  const left = ex.shuffled.filter((s) => !chosen.includes(s))
  const t = reduce ? { duration: 0 } : SPRING.snappy

  return (
    <div>
      <Instruction>Bring die Schritte in die richtige Reihenfolge</Instruction>
      <p className="mb-4 rounded-2xl border-2 border-line px-4 py-3 text-[17px] font-bold">{ex.prompt}</p>

      <ol className="mb-4 grid min-h-[5rem] gap-2 border-y-2 border-line py-3" aria-label="Deine Reihenfolge">
        {chosen.map((s, i) => (
          <motion.li key={s} layout layoutId={`o-${ex.id}-${s}`} transition={t}>
            <button type="button" disabled={locked} onClick={() => setChosen(chosen.slice(0, i))} className="tile w-full !py-2.5" aria-label={`Schritt ${i + 1}: ${s}. Antippen nimmt ihn und alle danach heraus`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sm font-black text-sky-dark">{i + 1}</span>
              <span className="min-w-0 flex-1 text-[16px]">{s}</span>
            </button>
          </motion.li>
        ))}
        {chosen.length === 0 && <li className="self-center px-1 text-sm text-muted">Tippe unten den ersten Schritt an, dann den zweiten …</li>}
      </ol>

      <ul className="grid gap-2" aria-label="Schritte">
        {left.map((s) => (
          <motion.li key={s} layout layoutId={`o-${ex.id}-${s}`} transition={t}>
            <button type="button" disabled={locked} onClick={() => setChosen([...chosen, s])} className="tile w-full !py-2.5">
              <span className="min-w-0 flex-1 text-[16px]">{s}</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
