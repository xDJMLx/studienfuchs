import { useEffect, useRef } from 'react'
import { useCoachComposer } from '../../lib/coachComposer'
import { Right } from './Icons'

/** Eingabefeld für den Lern-Coach: in der Tab-Leiste (Handy) und unten auf der Seite (Computer). */
export function CoachComposer({ className = '' }: { className?: string }) {
  const { input, busy, submit, setInput } = useCoachComposer()
  const box = useRef<HTMLTextAreaElement>(null)
  const can = !busy && !!input.trim() && !!submit

  // Höhe an den Text anpassen (bis zu fünf Zeilen)
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  return (
    <form
      className={`flex items-end gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (can) submit?.()
      }}
    >
      <label htmlFor="coach-input" className="sr-only">
        Nachricht an den Lern-Coach
      </label>
      <textarea
        id="coach-input"
        ref={box}
        value={input}
        rows={1}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (can) submit?.()
          }
        }}
        placeholder="Frag deinen Coach …"
        enterKeyHint="send"
        className="max-h-[120px] min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border border-black/5 bg-white/55 px-4 py-2.5 text-ink outline-none placeholder:text-muted focus:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:focus:bg-white/15"
      />
      <button
        type="submit"
        disabled={!can}
        aria-label="Senden"
        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-strong text-on-brand shadow-[0_6px_16px_-6px_var(--brand)] transition-opacity disabled:opacity-40 disabled:shadow-none"
      >
        <Right size={20} />
      </button>
    </form>
  )
}
