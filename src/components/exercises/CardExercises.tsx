import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { makeHint } from '../../lib/hint'
import { speak } from '../../lib/speech'
import type { DeckLang } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { Speaker } from '../ui/Icons'
import { AnswerInput } from './TypeExercise'
import { Instruction, PromptBubble, type ExerciseProps } from './common'

/** Sprachcode für das Vorlesen. */
export const speechLang = (lang: DeckLang | undefined): string => (lang === 'en' ? 'en-GB' : 'fr-FR')

/** Kurze Frage groß, lange (Definitionen, Sätze) kleiner. */
const sizeOf = (text: string): boolean | 'long' => (text.length > 60 ? 'long' : text.length > 28 ? 'long' : true)

/** Kleiner Vorlesen-Knopf für Karten in einer Sprache. */
export function ReadAloud({ text, lang }: { text: string; lang?: DeckLang }) {
  const on = useStore((s) => s.speechOn)
  if (!lang || !on) return null
  return (
    <button type="button" onClick={() => speak(text, speechLang(lang))} aria-label={`Vorlesen: ${text}`} className="btn btn-sky press h-10 w-10 shrink-0 !rounded-xl !p-0">
      <Speaker size={22} />
    </button>
  )
}

/** Wenn die Frage selbst in der Kartensprache steht, wird sie beim Erscheinen vorgelesen. */
function useReadPrompt(prompt: string, speakText: string | undefined, lang: DeckLang | undefined) {
  useEffect(() => {
    if (!lang || !speakText || speakText !== prompt) return
    const t = setTimeout(() => speak(speakText, speechLang(lang)), 300)
    return () => clearTimeout(t)
  }, [prompt, speakText, lang])
}

/** Frage mit vier Antworten. */
export function QChoiceExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'qchoice'>) {
  const locked = result !== null
  useReadPrompt(ex.prompt, ex.speak, ex.lang)

  // Tasten 1–4 wählen eine Antwort
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
      <Instruction>{ex.title}</Instruction>
      <PromptBubble compact={sizeOf(ex.prompt)} speak={ex.speak === ex.prompt && ex.lang ? ex.prompt : undefined}>
        <span className="whitespace-pre-wrap">{ex.prompt}</span>
      </PromptBubble>
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
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current text-sm opacity-70">{i + 1}</span>
              <span className="min-w-0 whitespace-pre-wrap text-[17px]">{opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Frage, die man selbst eintippt. Bei Sprachkarten gibt es die Sonderzeichen-Leiste. */
export function QTypeExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'qtype'>) {
  useReadPrompt(ex.prompt, ex.speak, ex.lang)
  return (
    <div>
      <Instruction>{ex.title}</Instruction>
      <PromptBubble compact={sizeOf(ex.prompt)} speak={ex.speak === ex.prompt && ex.lang ? ex.prompt : undefined}>
        <span className="whitespace-pre-wrap">{ex.prompt}</span>
      </PromptBubble>
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
        placeholder="Deine Antwort"
        lang={ex.lang === 'fr' ? 'fr' : 'de'}
      />
    </div>
  )
}

/** Karteikarte: Frage lesen, überlegen, umdrehen, sich selbst bewerten. */
export function QCardExercise({ exercise: ex, onChange, result }: ExerciseProps<'qcard'>) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(false)
  const done = result !== null
  useReadPrompt(ex.front, ex.speak, ex.lang)

  // Leertaste/Enter dreht um, 1 bis 3 bewerten
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setShown(true)
      } else if (shown && ['1', '2', '3'].includes(e.key)) onChange({ selfGrade: (['again', 'hard', 'good'] as const)[Number(e.key) - 1] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown, done, onChange])

  const reveal = shown || done
  const grades = [
    { g: 'again' as const, label: 'Nicht gewusst', cls: 'btn-bad' },
    { g: 'hard' as const, label: 'Schwer', cls: 'btn-ghost' },
    { g: 'good' as const, label: 'Gewusst', cls: 'btn-good' },
  ]
  return (
    <div>
      <Instruction>Weißt du es?</Instruction>
      <div className="card mb-4 p-5" style={{ boxShadow: '0 4px 0 var(--shade-line)' }}>
        <div className="flex items-start gap-3">
          <ReadAloud text={ex.speak ?? ex.front} lang={ex.lang} />
          <p className="min-w-0 flex-1 whitespace-pre-wrap text-[23px] font-extrabold leading-snug">{ex.front}</p>
        </div>
        {reveal && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mt-4 border-t-2 border-dashed border-line pt-4">
            <p className="whitespace-pre-wrap text-[20px] font-bold leading-snug text-brand-dark">{ex.back}</p>
            {ex.example && (
              <p className="mt-3 rounded-xl bg-snow px-4 py-3 text-[15px]">
                <span className="block font-medium">{ex.example}</span>
                {ex.exampleDe && <span className="block text-sm text-muted">{ex.exampleDe}</span>}
              </p>
            )}
          </motion.div>
        )}
      </div>
      {!reveal ? (
        <button type="button" className="btn btn-primary btn-shine press w-full" onClick={() => setShown(true)} autoFocus>
          Antwort zeigen
        </button>
      ) : (
        !done && (
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Wie gut wusstest du es?">
            {grades.map((x, i) => (
              <button key={x.g} type="button" className={`btn ${x.cls} press !px-2 !text-[13px]`} onClick={() => onChange({ selfGrade: x.g })}>
                <span className="opacity-70">{i + 1}</span> {x.label}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
