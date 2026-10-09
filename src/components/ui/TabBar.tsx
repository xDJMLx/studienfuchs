import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { buzz } from '../../lib/sound'

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
  const row = useRef<HTMLDivElement>(null)
  /** Tab unter dem Finger, solange gedrückt wird (Wischen und Halten wie bei der Leiste von iOS) */
  const [held, setHeld] = useState<number | null>(null)
  const heldRef = useRef<number | null>(null)
  const lastTap = useRef(0)

  /** Welcher Tab liegt unter x? Die ganze Leiste ist Trefferfläche, auch Rand und Zwischenräume. */
  const indexAt = (e: RPointerEvent): number | null => {
    const el = row.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width > 0) return Math.max(0, Math.min(tabs.length - 1, Math.floor(((e.clientX - r.left) / r.width) * tabs.length)))
    const hit = (e.target as HTMLElement).closest('[data-tab]')
    return hit ? Number(hit.getAttribute('data-tab')) : null
  }
  const setPreview = (i: number | null) => {
    if (heldRef.current === i) return
    heldRef.current = i
    setHeld(i)
    if (i !== null) buzz(6)
  }
  const down = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* ältere Browser */
    }
    setPreview(indexAt(e))
  }
  const move = (e: RPointerEvent) => {
    if (heldRef.current === null) return
    setPreview(indexAt(e))
  }
  const up = (e: RPointerEvent) => {
    const i = heldRef.current === null ? null : (indexAt(e) ?? heldRef.current)
    heldRef.current = null
    setHeld(null)
    if (i === null) return
    lastTap.current = Date.now()
    onSelect(i)
  }
  const cancel = () => {
    heldRef.current = null
    setHeld(null)
  }

  const shown = held ?? activeIndex
  return (
    <nav aria-label="Hauptnavigation" className="tabbar fixed inset-x-4 z-40 mx-auto flex max-w-md flex-col lg:hidden" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}>
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
            <div className="px-2.5 pb-1.5 pt-2">{extra}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        ref={row}
        className="relative flex touch-none items-stretch p-1.5"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        {tabs.map((t, i) => {
          const on = i === shown
          return (
            <button
              key={t.key}
              type="button"
              data-tab={i}
              aria-current={i === activeIndex ? 'page' : undefined}
              aria-label={t.label}
              onClick={() => {
                // Fingertipp und Wischen werden oben in `up` erledigt; hier bleiben Tastatur und Bedienhilfen
                if (Date.now() - lastTap.current > 500) onSelect(i)
              }}
              className={`relative flex min-h-[3.6rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11px] font-bold transition-transform duration-150 ${held === i ? 'scale-105' : ''} ${on ? 'text-ink' : 'text-muted'}`}
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
