import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { shuffle } from '../../lib/generateExercises'
import { MathPad, showTyped } from '../math/MathPad'
import { MathText } from '../math/MathText'
import { Instruction, PromptBubble, type ExerciseProps } from './common'

/** Kurze Rechnungen groß, Textaufgaben kleiner. */
const promptSize = (prompt: string): boolean | 'long' => (prompt.replace(/[$|{}]/g, '').length > 34 ? 'long' : true)

/** Rechenaufgabe mit Zahleneingabe und eigener Zahlentastatur. */
export function CalcExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'calc'>) {
  const typed = typeof answer === 'string' ? answer : ''
  const locked = result !== null
  const state = result ? (result.status === 'wrong' ? 'math-field-bad' : 'math-field-ok') : ''
  return (
    <div className="math-exercise">
      <Instruction>{ex.title}</Instruction>
      <PromptBubble compact={promptSize(ex.prompt)}>
        <MathText>{ex.prompt}</MathText>
      </PromptBubble>
      <div className={`math-field mb-4 ${state}`} aria-live="polite" aria-label="Deine Antwort">
        {ex.lead && <MathText className="shrink-0 opacity-80">{ex.lead}</MathText>}
        <span className="min-w-0 flex-1 truncate">
          {typed ? <MathText>{showTyped(typed)}</MathText> : <span className="text-[1.05rem] font-bold text-muted">Deine Antwort</span>}
          {!locked && <span className="math-caret" aria-hidden />}
        </span>
        {ex.unit && <MathText className="shrink-0 opacity-80">{ex.unit}</MathText>}
      </div>
      <MathPad value={typed} onChange={(v) => onChange(v ? v : null)} locked={locked} frac={!!ex.frac} />
    </div>
  )
}

/** Auswahlaufgabe: die Antworten sind Mathe-Text (Zahlen, Brüche, Terme, Zeichen). */
export function MChoiceExercise({ exercise: ex, answer, onChange, result }: ExerciseProps<'mchoice'>) {
  const locked = result !== null
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

  const short = ex.options.every((o) => o.length <= 9)
  return (
    <div>
      <Instruction>{ex.title}</Instruction>
      <PromptBubble compact={promptSize(ex.prompt)}>
        <MathText>{ex.prompt}</MathText>
      </PromptBubble>
      <div className={`grid gap-3 ${short ? 'grid-cols-2' : ''}`} role="radiogroup">
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
              <MathText className="min-w-0 text-[19px]">{opt}</MathText>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Paare zuordnen (Prozent und Bruch, Term und Wert …). */
export function MMatchExercise({ exercise: ex, onChange, result }: ExerciseProps<'mmatch'>) {
  const reduce = useReducedMotion()
  const right = useMemo(() => shuffle(ex.pairs.map((p) => ({ id: p.id, text: p.right }))), [ex.pairs])
  const [selLeft, setSelLeft] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [mistakes, setMistakes] = useState<Set<string>>(new Set())
  const [flashWrong, setFlashWrong] = useState<string | null>(null)

  const pickRight = (id: string) => {
    if (!selLeft || result) return
    if (selLeft === id) {
      const next = new Set(done).add(id)
      setDone(next)
      setSelLeft(null)
      if (next.size === ex.pairs.length) onChange({ matchMistakes: [...mistakes] })
    } else {
      setMistakes(new Set(mistakes).add(selLeft).add(id))
      setFlashWrong(id)
      setTimeout(() => setFlashWrong(null), 450)
    }
  }

  const motionFor = (id: string, wrong: boolean) =>
    reduce ? undefined : done.has(id) ? { scale: [1, 1.1, 0.97, 1], x: 0 } : wrong ? { x: [0, -7, 7, -5, 5, 0], scale: 1 } : { scale: 1, x: 0 }

  return (
    <div>
      <Instruction>{ex.title}</Instruction>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3">
          {ex.pairs.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              disabled={done.has(p.id) || !!result}
              onClick={() => setSelLeft(p.id)}
              animate={motionFor(p.id, false)}
              transition={{ duration: 0.25 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className={`tile justify-center text-[19px] ${done.has(p.id) ? 'tile-correct opacity-40' : selLeft === p.id ? 'tile-selected' : ''}`}
            >
              <MathText>{p.left}</MathText>
            </motion.button>
          ))}
        </div>
        <div className="grid gap-3">
          {right.map((r) => (
            <motion.button
              key={r.id}
              type="button"
              disabled={done.has(r.id) || !!result}
              onClick={() => pickRight(r.id)}
              animate={motionFor(r.id, flashWrong === r.id)}
              transition={{ duration: 0.25 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className={`tile justify-center text-[19px] ${done.has(r.id) ? 'tile-correct opacity-40' : flashWrong === r.id ? 'tile-wrong' : ''}`}
            >
              <MathText>{r.text}</MathText>
            </motion.button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">Tippe links etwas an, dann rechts das, was dazu passt.</p>
    </div>
  )
}
