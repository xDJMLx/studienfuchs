import { motion, useReducedMotion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { SPRING } from './motion'

/** Ein/Aus-Schalter mit federndem Knopf. */
export function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-brand' : 'bg-line'}`}
    >
      <motion.span
        className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 24 : 0 }}
        whileTap={reduce ? undefined : { scaleX: 1.25 }}
        transition={SPRING.snappy}
      />
    </button>
  )
}

/** Auswahl mit gleitender Markierung (ersetzt harte Umschalter). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={label} className={`relative inline-flex rounded-xl bg-snow p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg bg-surface" style={{ boxShadow: 'var(--shadow)' }} transition={SPRING.snappy} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Symbol in Markenfarbe, ohne Kachel dahinter (feste Größe, damit Zeilen bündig bleiben). */
export function IconChip({ children, tone = 'brand', size = 40 }: { children: ReactNode; tone?: 'brand' | 'good' | 'gold' | 'bad' | 'muted'; size?: number }) {
  const tones = {
    brand: 'text-brand-dark',
    good: 'text-good-dark',
    gold: 'text-gold-dark',
    bad: 'text-bad-dark',
    muted: 'text-muted',
  } as const
  return (
    <span className={`flex shrink-0 items-center justify-center ${tones[tone]}`} style={{ width: size, height: size }}>
      {children}
    </span>
  )
}

/** Abschnittskarte mit Kopf (Symbol, Titel, Beschreibung). */
export function Section({ id, icon, title, description, children }: { id?: string; icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-3 px-1">
        <IconChip>{icon}</IconChip>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="card divide-y divide-line">{children}</div>
    </section>
  )
}

/** Zeile in einer Abschnittskarte: links Text, rechts das Bedienelement. */
export function Row({ title, hint, children, stack = false }: { title: string; hint?: ReactNode; children?: ReactNode; stack?: boolean }) {
  return (
    <div className={`flex gap-3 px-5 py-4 ${stack ? 'flex-col' : 'flex-wrap items-center justify-between'}`}>
      <div className="min-w-[12rem] flex-1">
        <p className="font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/** Waagerecht scrollbare Auswahl aus Chips mit gleitender Markierung (für Filter, die auf schmalen Bildschirmen nicht umbrechen sollen). */
export function ChipTabs<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const id = useId()
  return (
    <div className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] ${className}`} role="tablist" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`press relative shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${on ? 'border-transparent text-brand-dark' : 'border-line text-muted hover:bg-snow hover:text-ink'}`}
          >
            {on && <motion.span layoutId={`chip-${id}`} className="absolute inset-0 rounded-full bg-brand-soft ring-1 ring-brand/40" transition={SPRING.snappy} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
