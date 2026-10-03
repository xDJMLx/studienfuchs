import { useEffect, useState } from 'react'
import { speak } from '../../lib/speech'
import { Instruction, PromptBubble, type ExerciseProps } from './common'

/**
 * Wort aus Buchstaben legen: die erste Stufe zum Schreiben. Man hört das Wort und tippt die Buchstaben der Reihe nach an,
 * es gibt keine Tastatur und keine Akzent-Leiste. Geprüft werden kann erst, wenn alle Felder gefüllt sind.
 * Ein Tipp auf einen gelegten Buchstaben nimmt ihn wieder weg.
 */
export function SpellExercise({ exercise: ex, onChange, result }: ExerciseProps<'spell'>) {
  const locked = result !== null
  // Gewählte Bausteine als Positionen in ex.letters (so lassen sich doppelte Buchstaben unterscheiden)
  const [picked, setPicked] = useState<number[]>([])
  const total = Array.from(ex.answer.replace(/\s+/g, '')).length

  useEffect(() => {
    const t = setTimeout(() => speak(ex.speak), 300)
    return () => clearTimeout(t)
  }, [ex.speak])

  const update = (next: number[]) => {
    setPicked(next)
    onChange(next.length === total ? next.map((i) => ex.letters[i]) : null)
  }

  // Felder der Lösung: Buchstaben als Kästchen, Leerzeichen als Lücke
  let slot = -1
  const cells = Array.from(ex.answer).map((ch, i) => {
    if (/\s/.test(ch)) return <span key={`sp${i}`} className="w-3" aria-hidden />
    slot += 1
    const at = slot
    const idx = picked[at]
    const letter = idx === undefined ? '' : ex.letters[idx]
    return (
      <button
        key={`s${i}`}
        type="button"
        disabled={locked || idx === undefined}
        onClick={() => update(picked.filter((_, k) => k !== at))}
        aria-label={letter ? `Buchstabe ${letter} entfernen` : 'leeres Feld'}
        className={`flex h-12 w-10 items-center justify-center rounded-xl border-2 text-2xl font-bold ${letter ? 'border-sky bg-sky-soft text-sky-dark' : 'border-line bg-snow'}`}
        lang="fr"
      >
        {letter}
      </button>
    )
  })

  return (
    <div>
      <Instruction>Schreibe das Wort</Instruction>
      <PromptBubble speak={ex.speak} lang="de">{ex.prompt}</PromptBubble>
      <div className="mb-6 flex min-h-[4rem] flex-wrap items-center justify-center gap-1.5" aria-label="Dein Wort">
        {cells}
      </div>
      <div className="flex flex-wrap justify-center gap-2" aria-label="Buchstaben">
        {ex.letters.map((l, i) => (
          <button
            key={i}
            type="button"
            disabled={locked || picked.includes(i) || picked.length >= total}
            onClick={() => update([...picked, i])}
            className={`tile !h-12 !w-12 !justify-center !px-0 !py-0 text-2xl font-bold ${picked.includes(i) ? 'opacity-25' : ''}`}
            lang="fr"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
