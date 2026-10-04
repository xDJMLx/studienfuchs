import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { breaksOf, cleanPeriods, EXAMPLE_PERIODS, type Period } from '../../lib/school'
import { Plus } from './Icons'

const time = 'rounded-xl border-2 border-line bg-snow px-2.5 py-2 text-[15px] font-bold tabular-nums outline-none focus:border-sky'

/**
 * Schulstunden mit Beginn und Ende eintragen. Die Lücken dazwischen sind die Pausen und werden dazwischen gezeigt.
 * Wird beim Einrichten und in den Einstellungen benutzt; der Kalender zeigt danach "3. Stunde" statt einer Uhrzeit.
 */
export function PeriodsEditor({ value, onChange }: { value: Period[]; onChange: (p: Period[]) => void }) {
  const reduce = useReducedMotion()
  const id = useId()
  const set = (i: number, patch: Partial<Period>) => onChange(value.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  // Beim Tippen bleibt die Reihenfolge, wie sie ist: erst "Fertig" (Verlassen des Feldes) sortiert und prüft
  const tidy = () => {
    const cleaned = cleanPeriods(value)
    if (cleaned.length !== value.length || cleaned.some((p, i) => p.start !== value[i].start || p.end !== value[i].end)) onChange(cleaned)
  }
  const gaps = new Map(breaksOf(cleanPeriods(value)).map((b) => [b.after, b.minutes]))
  const addRow = () => {
    const last = value[value.length - 1]
    const [h, m] = (last?.end ?? '07:55').split(':').map(Number)
    const start = h * 60 + m + (last ? 10 : 5)
    const f = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
    onChange([...value, { start: f(start), end: f(start + 45) }])
  }

  return (
    <div>
      <ol className="grid gap-1" aria-label="Schulstunden">
        {value.map((p, i) => (
          <li key={i} className="grid gap-1">
            <motion.div initial={reduce ? false : { opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }} className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-soft text-[15px] font-black text-sky-dark" aria-hidden>
                {i + 1}
              </span>
              <label className="sr-only" htmlFor={`${id}-s${i}`}>{`Stunde ${i + 1} von`}</label>
              <input id={`${id}-s${i}`} type="time" className={`${time} min-w-0 flex-1`} value={p.start} onChange={(e) => set(i, { start: e.target.value })} onBlur={tidy} />
              <span className="text-muted" aria-hidden>–</span>
              <label className="sr-only" htmlFor={`${id}-e${i}`}>{`Stunde ${i + 1} bis`}</label>
              <input id={`${id}-e${i}`} type="time" className={`${time} min-w-0 flex-1`} value={p.end} onChange={(e) => set(i, { end: e.target.value })} onBlur={tidy} />
              <button type="button" aria-label={`Stunde ${i + 1} entfernen`} onClick={() => onChange(value.filter((_, k) => k !== i))} className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black text-muted hover:bg-snow">
                ×
              </button>
            </motion.div>
            {gaps.has(i) && (
              <p className="ml-11 flex items-center gap-2 text-xs font-bold text-muted">
                <span className="h-px w-5 bg-line" /> Pause {gaps.get(i)} Min.
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={addRow} className="chip">
          <Plus size={14} /> Stunde hinzufügen
        </button>
        {value.length === 0 && (
          <button type="button" onClick={() => onChange(EXAMPLE_PERIODS)} className="chip">
            Beispiel einfüllen
          </button>
        )}
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="chip">
            Alle löschen
          </button>
        )}
      </div>
      {value.length === 0 && <p className="mt-3 text-sm text-muted">Ohne Schulzeiten zeigt der Kalender normale Uhrzeiten. Du kannst sie jederzeit in den Einstellungen nachtragen.</p>}
    </div>
  )
}
