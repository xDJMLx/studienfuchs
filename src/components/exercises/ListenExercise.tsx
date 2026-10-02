import { useEffect } from 'react'
import { speak } from '../../lib/speech'
import { AnswerInput } from './TypeExercise'
import { Instruction, SpeakButton, type ExerciseProps } from './common'

export function ListenExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'listen'>) {
  useEffect(() => {
    const t = setTimeout(() => speak(ex.speak), 250)
    return () => clearTimeout(t)
  }, [ex.speak])
  return (
    <div>
      <Instruction>Was hörst du?</Instruction>
      <div className="mb-6 flex items-center gap-3">
        <SpeakButton text={ex.speak} size="lg" />
        <SpeakButton text={ex.speak} slow />
      </div>
      <AnswerInput
        value={typeof answer === 'string' ? answer : ''}
        onChange={(v) => onChange(v.trim() ? v : null)}
        locked={result !== null}
        placeholder="Schreibe, was du hörst"
      />
      {result && <p className="mt-3 text-muted">Bedeutung: {ex.translation}</p>}
    </div>
  )
}
