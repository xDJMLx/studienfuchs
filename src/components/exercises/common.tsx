import type { ReactNode } from 'react'
import type { Answer, Evaluation } from '../../lib/evaluate'
import type { Exercise } from '../../lib/types'
import { speak } from '../../lib/speech'
import { useStore } from '../../store/useStore'
import { Speaker } from '../ui/Icons'

export interface ExerciseProps<K extends Exercise['kind']> {
  exercise: Extract<Exercise, { kind: K }>
  answer: Answer | null
  onChange: (a: Answer | null) => void
  /** gesetzt, sobald geprüft wurde → Eingabe sperren und Ergebnis zeigen */
  result: Evaluation | null
}

/** Französischer Text: mit lang="fr", damit Screenreader ihn richtig aussprechen. */
export function Fr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span lang="fr" className={className}>
      {children}
    </span>
  )
}

/**
 * Vorlesen-Knopf. `quiet` ist die leise Variante für Listen (kleiner, ohne Orange), damit nicht jede Zeile schreit.
 */
export function SpeakButton({ text, size = 'md', slow = false, quiet = false }: { text: string; size?: 'md' | 'lg'; slow?: boolean; quiet?: boolean }) {
  const big = size === 'lg'
  const speechOn = useStore((s) => s.speechOn)
  if (!speechOn) return null
  return (
    <button
      type="button"
      onClick={() => speak(text, 'fr-FR', slow ? 0.55 : 1)}
      aria-label={slow ? `Langsam vorlesen: ${text}` : `Vorlesen: ${text}`}
      className={
        quiet
          ? 'press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-snow text-brand-dark transition-colors hover:bg-brand-soft'
          : `btn btn-sky press shrink-0 !p-0 ${big ? 'h-20 w-20 !rounded-3xl' : 'h-10 w-10 !rounded-xl'}`
      }
    >
      <Speaker size={quiet ? 20 : big ? 40 : 22} />
    </button>
  )
}

export function Instruction({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-2xl font-semibold text-ink">{children}</h2>
}

/** Aufgabe als ruhige Karte: optional mit Vorlesen-Knopf, der Text ist das Wichtigste. */
export function PromptBubble({ children, speak: text, lang }: { children: React.ReactNode; speak?: string; lang?: 'fr' | 'de' }) {
  return (
    <div className="card mb-6 flex items-center gap-4 p-4">
      {text && <SpeakButton text={text} />}
      <span lang={lang} className="text-2xl font-semibold leading-snug">{children}</span>
    </div>
  )
}
