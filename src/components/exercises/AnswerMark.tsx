import { SubjectShape } from '../ui/SubjectShape'

/** Die vier Antworten haben je eine feste Farbe und Form (Dreieck, Kreis, Quadrat, Raute), wie bei Kahoot: Man merkt sich „die rote Dreieck-Antwort“ und erkennt sie auch ohne Farbensehen. */
const MARKS = [
  { c: '#ff5a5f', shape: 'mathe' }, // Dreieck
  { c: '#3b82ff', shape: 'deutsch' }, // Kreis
  { c: '#f5a800', shape: 'englisch' }, // Quadrat
  { c: '#19b36b', shape: 'franzoesisch' }, // Raute
]

export function AnswerMark({ i }: { i: number }) {
  const m = MARKS[i % MARKS.length]
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: m.c, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)' }} aria-hidden="true">
      <SubjectShape id={m.shape} size={18} />
    </span>
  )
}
