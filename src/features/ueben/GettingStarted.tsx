import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Right } from '../../components/ui/Icons'
import { useStore } from '../../store/useStore'

const KEY = 'studienfuchs-start-aus'
const read = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * „So kommst du in Fahrt“: drei Schritte für den Anfang, mit Haken, wenn etwas schon geschafft ist.
 * Verschwindet von selbst, wenn alles erledigt ist, oder mit „Ausblenden“.
 */
export function GettingStarted() {
  const reduce = useReducedMotion()
  const hasCards = useStore((s) => s.sets.length > 0 || (s.addedUnits ?? []).length > 0)
  const hasArbeit = useStore((s) => (s.arbeiten ?? []).length > 0 || !!s.untis)
  const played = useStore((s) => (s.rounds ?? 0) > 0)
  const [hidden, setHidden] = useState(read)
  const steps = [
    { done: hasCards, title: 'Karteikarten oder Aufgaben erstellen', text: 'Die KI macht sie aus deinem Thema oder Foto.', to: '/stapel/neu' },
    { done: hasArbeit, title: 'Eine Arbeit eintragen', text: 'Dann verteilt die App den Stoff auf die Tage.', to: '/kalender?neu=1' },
    { done: played, title: 'Die erste Runde üben', text: 'Meist nur ein paar Minuten.', to: hasCards ? '/ueben/los' : '/stapel/neu' },
  ]
  const n = steps.filter((x) => x.done).length
  if (hidden || n === steps.length) return null
  const next = steps.findIndex((x) => !x.done)
  return (
    <motion.section initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel mb-5 p-4" aria-label="So kommst du in Fahrt">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-bold">So kommst du in Fahrt</h2>
        <span className="text-xs font-bold tabular-nums text-muted">
          {n} von {steps.length}
        </span>
      </div>
      <ol className="grid gap-1">
        {steps.map((x, i) => (
          <li key={x.title}>
            <Link to={x.to} className={`press flex items-center gap-3 rounded-xl px-1.5 py-2 ${i === next ? 'bg-brand-soft' : ''}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${x.done ? 'bg-good text-white' : i === next ? 'bg-brand-strong text-on-brand' : 'bg-snow text-muted'}`}>{x.done ? <Check size={15} /> : i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] font-semibold leading-tight ${x.done ? 'text-muted line-through' : ''}`}>{x.title}</span>
                {!x.done && <span className="block text-xs text-muted">{x.text}</span>}
              </span>
              {!x.done && <Right size={14} className="shrink-0 text-muted" />}
            </Link>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="press -mb-1 mt-1 min-h-9 rounded-lg px-1.5 text-xs font-semibold text-muted hover:text-ink"
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1')
          } catch {
            /* Speicher nicht verfügbar */
          }
          setHidden(true)
        }}
      >
        Ausblenden
      </button>
    </motion.section>
  )
}
