import type { ReactNode } from 'react'
import type { Answer, Evaluation } from '../../lib/evaluate'
import type { Exercise } from '../../lib/types'
import { speak } from '../../lib/speech'
import { useStore } from '../../store/useStore'
import { Mascot } from '../mascot/Mascot'
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
    // Der Fuchs "sagt" die Aufgabe in einer Sprechblase, wie die Figur bei SideMe
    <div className="mb-6 flex items-center gap-1">
      <Mascot size={78} alive listen className="-ml-2" />
      <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface p-3.5">
        <span aria-hidden className="absolute -left-[7px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-surface" />
        <div className="flex items-center gap-3.5">
          {text && <SpeakButton text={text} />}
          <span lang={lang} className="min-w-0 text-2xl font-bold leading-snug">{children}</span>
        </div>
      </div>
    </div>
  )
}
