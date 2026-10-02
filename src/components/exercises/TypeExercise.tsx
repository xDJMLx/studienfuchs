import { useEffect, useRef } from 'react'
import { makeHint } from '../../lib/hint'
import { speak } from '../../lib/speech'
import { Instruction, PromptBubble, type ExerciseProps } from './common'

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ']

/** Eingabefeld mit Sonderzeichen-Leiste – auf Handys oft die schnellste Art, Akzente zu tippen. */
export function AnswerInput({
  value,
  onChange,
  locked,
  placeholder,
  lang = 'fr',
}: {
  value: string
  onChange: (v: string) => void
  locked: boolean
  placeholder: string
  lang?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!locked) ref.current?.focus()
  }, [locked])

  const insert = (ch: string) => {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    onChange(value.slice(0, start) + ch + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + ch.length, start + ch.length)
    })
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} // Enter prüft über die Session
        lang={lang}
        rows={2}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label="Deine Antwort"
        className="w-full resize-none rounded-2xl border-2 border-line bg-snow p-4 text-xl font-bold text-ink outline-none transition-colors placeholder:text-muted focus:border-brand disabled:opacity-70"
      />
      {lang === 'fr' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={locked}
              onClick={() => insert(c)}
              className="h-10 w-10 rounded-xl border-2 border-line bg-surface text-lg font-bold text-ink hover:bg-snow active:translate-y-px disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TypeExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'type'>) {
  useEffect(() => {
    if (ex.speak) speak(ex.speak)
  }, [ex.speak])
  return (
    <div>
      <Instruction>Schreibe das auf Französisch</Instruction>
      <PromptBubble speak={ex.speak} lang={ex.promptLang}>{ex.prompt}</PromptBubble>
      {ex.hint && (
        <p className="mb-4 inline-block rounded-xl bg-snow px-4 py-2.5 font-mono text-lg tracking-[0.18em] text-muted">
          <span className="sr-only">Stütze: </span>
          {makeHint(ex.answer)}
        </p>
      )}
      <AnswerInput
        value={typeof answer === 'string' ? answer : ''}
        onChange={(v) => onChange(v.trim() ? v : null)}
        locked={result !== null}
        placeholder="Auf Französisch schreiben"
      />
    </div>
  )
}
