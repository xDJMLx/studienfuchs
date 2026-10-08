import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export interface TabDef {
  key: string
  label: string
  icon: ReactNode
  badge?: ReactNode
  /** Farbe des aktiven Tabs (Symbol) und seine Schriftfarbe */
  color?: string
  textColor?: string
}

/**
 * Untere Leiste (Handy) wie die Glasleiste bei Apple: eine schwebende Kapsel aus milchigem Glas (Unschärfe, helle Oberkante, weicher Schatten),
 * darin gleitet eine zweite, hellere Glas-Kapsel unter den aktiven Tab. Die Leiste ist das einzige Glas der App.
 * `extra` erscheint oben in derselben Glasfläche (z. B. das Eingabefeld des Lern-Coachs).
 */
export function TabBar({ tabs, activeIndex, onSelect, extra }: { tabs: TabDef[]; activeIndex: number; onSelect: (index: number) => void; extra?: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <nav aria-label="Hauptnavigation" className="tabbar fixed inset-x-4 z-40 mx-auto flex max-w-md flex-col p-1.5 lg:hidden" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}>
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
            <div className="px-1 pb-1.5 pt-0.5">{extra}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative flex items-stretch">
        {tabs.map((t, i) => {
          const on = i === activeIndex
          return (
            <button
              key={t.key}
              type="button"
              aria-current={on ? 'page' : undefined}
              aria-label={t.label}
              onClick={() => onSelect(i)}
              className={`relative flex min-h-[3.35rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11px] font-bold transition-transform active:scale-95 ${on ? 'text-ink' : 'text-muted'}`}
            >
              {on && (
                <motion.span layoutId="tab-lens" aria-hidden className="tab-lens absolute inset-0 rounded-[22px]" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }} />
              )}
              <span className="relative block" style={on ? { color: t.color ?? 'var(--brand)' } : undefined}>
                {t.icon}
                {t.badge}
              </span>
              <span className="relative">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
