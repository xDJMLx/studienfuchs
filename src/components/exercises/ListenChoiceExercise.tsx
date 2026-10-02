import { useEffect } from 'react'
import { speak } from '../../lib/speech'
import { Instruction, SpeakButton, type ExerciseProps } from './common'

/** Hörverstehen: Wort hören, die richtige deutsche Bedeutung wählen. */
export function ListenChoiceExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'listenChoice'>) {
  const locked = result !== null

  useEffect(() => {
    const t = setTimeout(() => speak(ex.speak), 250)
    return () => clearTimeout(t)
  }, [ex.speak])

  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= ex.options.length) onChange(ex.options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ex.options, locked, onChange])

  return (
    <div>
      <Instruction>Was hörst du?</Instruction>
      <div className="mb-6 flex items-center gap-3">
        <SpeakButton text={ex.speak} size="lg" />
        <SpeakButton text={ex.speak} slow />
      </div>
      <div className="grid gap-3" role="radiogroup">
        {ex.options.map((opt, i) => {
          const selected = answer === opt
          let cls = selected ? 'tile-selected' : ''
          if (locked) {
            if (opt === ex.answer) cls = 'tile-correct'
            else if (selected) cls = 'tile-wrong'
          }
          return (
            <button key={opt} type="button" role="radio" aria-checked={selected} disabled={locked} onClick={() => onChange(opt)} className={`tile ${cls}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current text-sm opacity-70">{i + 1}</span>
              {opt}
            </button>
          )
        })}
      </div>
      {locked && <p className="mt-4 text-sm text-muted">Das war: <b className="text-ink">{ex.speak}</b></p>}
    </div>
  )
}
