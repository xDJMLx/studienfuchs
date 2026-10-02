import { useEffect } from 'react'
import { speak } from '../../lib/speech'
import { Instruction, PromptBubble, type ExerciseProps } from './common'

export function ChoiceExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'choice'>) {
  const locked = result !== null

  useEffect(() => {
    if (ex.speak) speak(ex.speak)
  }, [ex.speak])

  // Tasten 1–4 wählen eine Option
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
      <Instruction>{ex.promptLang === 'fr' ? 'Was bedeutet das?' : 'Wie sagt man das auf Französisch?'}</Instruction>
      <PromptBubble speak={ex.speak} lang={ex.promptLang}>{ex.prompt}</PromptBubble>
      <div className="grid gap-3" role="radiogroup">
        {ex.options.map((opt, i) => {
          const selected = answer === opt
          let cls = selected ? 'tile-selected' : ''
          if (locked) {
            if (opt === ex.answer) cls = 'tile-correct'
            else if (selected) cls = 'tile-wrong'
          }
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              onClick={() => onChange(opt)}
              className={`tile ${cls}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current text-sm opacity-70">{i + 1}</span>
              <span lang={ex.promptLang === 'de' ? 'fr' : 'de'}>{opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
