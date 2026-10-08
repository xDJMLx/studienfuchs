import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export interface TabDef {
  key: string
  label: string
  icon: ReactNode
  badge?: ReactNode
  /** Farbe des aktiven Tabs (Balken und Symbol) und seine Schriftfarbe */
  color?: string
  textColor?: string
}

/**
 * Untere Leiste (Handy): durchgehend, flach, oben eine feine Linie. Der aktive Tab ist ein farbiger Block mit harter Unterkante (wie die Fach-Blöcke), die anderen sind graue Symbole.
 * Keine schwebende Kapsel, keine Spielereien: Man soll sofort sehen, wo man ist.
 * `extra` erscheint oben in derselben Fläche (z. B. das Eingabefeld des Lern-Coachs).
 */
export function TabBar({ tabs, activeIndex, onSelect, extra }: { tabs: TabDef[]; activeIndex: number; onSelect: (index: number) => void; extra?: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <nav aria-label="Hauptnavigation" className="tabbar fixed inset-x-0 bottom-0 z-40 flex flex-col lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <AnimatePresence initial={false}>
        {extra && (
          <motion.div
            key="extra"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, y: 10, height: 0, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-1.5 pt-2">{extra}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-stretch">
        {tabs.map((t, i) => {
          const on = i === activeIndex
          const c = t.color ?? 'var(--brand)'
          return (
            <button
              key={t.key}
              type="button"
              aria-current={on ? 'page' : undefined}
              aria-label={t.label}
              onClick={() => onSelect(i)}
              className={`press relative flex min-h-[3.7rem] flex-1 flex-col items-center justify-center gap-1 pb-0.5 pt-1.5 text-[11px] font-extrabold ${on ? 'text-ink' : 'text-muted'}`}
            >
              {/* Aktiv: ein farbiger Block mit harter Unterkante wie die Fach-Blöcke; sonst nur das graue Symbol */}
              <span
                className="relative flex h-8 w-12 items-center justify-center rounded-[10px] transition-[background-color,box-shadow,transform] duration-150"
                style={on ? { background: c, color: '#fff', boxShadow: `0 3px 0 color-mix(in srgb, ${c} 55%, black)`, transform: 'translateY(-1px)' } : undefined}
              >
                {t.icon}
                {t.badge}
              </span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
