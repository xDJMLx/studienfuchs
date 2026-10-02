import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { speak } from '../../lib/speech'
import type { Exercise } from '../../lib/types'
import { Fr, SpeakButton } from './common'

/** Neue Wörter: höchstens zwei auf einmal, mit Aussprache und Beispielsatz. Direkt danach werden sie abgefragt. */
export function TeachExercise({ exercise: ex }: { exercise: Extract<Exercise, { kind: 'teach' }> }) {
  const reduce = useReducedMotion()

  useEffect(() => {
    const t = setTimeout(() => speak(ex.items[0].front), 350)
    return () => clearTimeout(t)
  }, [ex.items])

  return (
    <div>
      <p className="eyebrow mb-1">Neu</p>
      <h2 className="mb-5 text-2xl font-semibold">{ex.items.length === 1 ? 'Ein neues Wort' : 'Zwei neue Wörter'}</h2>
      <ul className="grid gap-4">
        {ex.items.map((it, i) => (
          <motion.li
            key={it.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.08 * i, type: 'spring', stiffness: 260, damping: 24 }}
            className="card p-5"
          >
            <div className="flex items-start gap-4">
              <SpeakButton text={it.front} />
              <div className="min-w-0 flex-1">
                <Fr className="block text-3xl font-semibold leading-tight">{it.front}</Fr>
                <p className="mt-1 text-lg text-muted">{it.back}</p>
              </div>
            </div>
            {it.example && (
              <button
                type="button"
                onClick={() => speak(it.example as string)}
                className="mt-4 w-full rounded-xl bg-snow px-4 py-3 text-left transition-colors hover:bg-line/60"
                aria-label="Beispielsatz vorlesen"
              >
                <Fr className="block font-medium text-brand-dark">{it.example}</Fr>
                <span className="block text-sm text-muted">{it.exampleDe}</span>
              </button>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
