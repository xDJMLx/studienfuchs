import { Instruction, type ExerciseProps } from './common'

export function FillExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'fill'>) {
  const locked = result !== null
  const [before, after] = ex.sentence.split('___')
  const shown = typeof answer === 'string' ? answer : ''

  return (
    <div>
      <Instruction>Fülle die Lücke</Instruction>
      <p className="mb-2 text-2xl font-bold leading-relaxed">
        {before}
        <span
          className={`mx-1 inline-block min-w-16 border-b-4 px-2 text-center ${
            locked ? (result.status === 'wrong' ? 'border-bad text-bad' : 'border-good text-good-dark') : 'border-sky text-sky'
          }`}
        >
          {shown || ' '}
        </span>
        {after}
      </p>
      {ex.translation && <p className="mb-6 text-muted">{ex.translation}</p>}
      <div className="flex flex-wrap gap-3">
        {ex.options.map((opt) => {
          const selected = answer === opt
          let cls = selected ? 'tile-selected' : ''
          if (locked) {
            if (opt === ex.answer) cls = 'tile-correct'
            else if (selected) cls = 'tile-wrong'
          }
          return (
            <button key={opt} type="button" disabled={locked} onClick={() => onChange(opt)} className={`tile ${cls}`}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
