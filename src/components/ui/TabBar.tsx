import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface TabDef {
  key: string
  label: string
  icon: ReactNode
  badge?: ReactNode
  /** Farbe des Tabs (Fläche der Linse) und Schriftfarbe, wenn er aktiv ist */
  color?: string
  textColor?: string
}

/**
 * Tab-Leiste mit "Linse" wie bei iOS: Finger aufsetzen, die Glas-Linse hebt sich unter dem Finger,
 * folgt ihm von Tab zu Tab, und beim Loslassen öffnet sich der Tab darunter. Ein einfaches Antippen geht genauso.
 * Mit Tastatur oder Screenreader bleiben es ganz normale Knöpfe.
 * `extra` erscheint oben in derselben Glas-Fläche (z. B. das Eingabefeld des Lern-Coachs).
 */
export function TabBar({ tabs, activeIndex, onSelect, extra }: { tabs: TabDef[]; activeIndex: number; onSelect: (index: number) => void; extra?: ReactNode }) {
  const reduce = useReducedMotion()
  const n = tabs.length
  const row = useRef<HTMLDivElement>(null)
  const raw = useMotionValue(Math.max(activeIndex, 0))
  const pos = useSpring(raw, reduce ? { duration: 0.01 } : { stiffness: 560, damping: 40, mass: 0.8 })
  const press = useSpring(0, { stiffness: 500, damping: 30 })
  const [pressed, setPressed] = useState(false)
  const [focusIndex, setFocusIndex] = useState(activeIndex)
  const dragging = useRef(false)

  // Im Ruhezustand liegt die Linse unter dem aktiven Tab
  useEffect(() => {
    if (dragging.current) return
    raw.set(Math.max(activeIndex, 0))
    setFocusIndex(activeIndex)
  }, [activeIndex, raw])

  const fromPointer = (clientX: number) => {
    const rect = row.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.min(n - 1, Math.max(0, (clientX - rect.left) / (rect.width / n) - 0.5))
  }

  const move = (clientX: number) => {
    const v = fromPointer(clientX)
    raw.set(v)
    const idx = Math.round(v)
    setFocusIndex((prev) => {
      if (prev !== idx) navigator.vibrate?.(6)
      return idx
    })
  }

  // Prozent bei translateX beziehen sich auf die Linse selbst (= ein Tab breit): reine GPU-Bewegung, kein Layout
  const lensX = useTransform(pos, (v) => `${v * 100}%`)
  const lensShown = activeIndex >= 0 || pressed

  return (
    <nav
      aria-label="Hauptnavigation"
      className="glass fixed inset-x-3 z-40 flex flex-col rounded-[34px] p-1.5 lg:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)', '--tab-c': tabs[Math.max(0, focusIndex)]?.color ?? 'var(--brand)' } as React.CSSProperties}
    >
      {/* Das Eingabefeld gleitet beim Öffnen hoch und blendet ein (nur Transform und Deckkraft, das ist flüssig).
          Beim Verlassen blendet es aus und die Leiste klappt kurz zusammen. */}
      <AnimatePresence initial={false}>
        {extra && (
          <motion.div
            key="extra"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, y: 10, height: 0, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-1 pb-1.5 pt-0.5">{extra}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        ref={row}
        className="relative flex touch-none items-stretch"
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          dragging.current = true
          try {
            row.current?.setPointerCapture(e.pointerId)
          } catch {
            /* Zeiger nicht mehr aktiv */
          }
          setPressed(true)
          press.set(1)
          move(e.clientX)
        }}
        onPointerMove={(e) => {
          if (dragging.current) move(e.clientX)
        }}
        onPointerUp={(e) => {
          if (!dragging.current) return
          dragging.current = false
          const idx = Math.round(fromPointer(e.clientX))
          setPressed(false)
          press.set(0)
          raw.set(idx)
          onSelect(idx)
        }}
        onPointerCancel={() => {
          dragging.current = false
          setPressed(false)
          press.set(0)
          raw.set(Math.max(activeIndex, 0))
          setFocusIndex(activeIndex)
        }}
      >
        {/* Die Linse */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 rounded-[28px]"
          style={{ left: 0, x: lensX, width: `calc(100% / ${n})`, opacity: lensShown ? 1 : 0 }}
          animate={{ scale: pressed && !reduce ? 1.22 : 1, y: pressed && !reduce ? -4 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        >
          <span
            className="absolute inset-0 rounded-[28px] transition-[background,box-shadow,border-color] duration-200"
            style={
              pressed
                ? {
                    background: 'color-mix(in srgb, var(--tab-c) 15%, var(--surface))',
                    border: '2px solid var(--tab-c)',
                    boxShadow: '0 12px 26px -12px rgba(0,0,0,0.45)',
                  }
                : {
                    background: 'color-mix(in srgb, var(--tab-c) 13%, var(--surface))',
                    border: '2px solid color-mix(in srgb, var(--tab-c) 55%, transparent)',
                  }
            }
          />
        </motion.span>

        {tabs.map((t, i) => (
          <Tab key={t.key} tab={t} index={i} pos={pos} press={press} current={i === focusIndex} onKey={() => onSelect(i)} isActive={i === activeIndex} />
        ))}
      </div>
    </nav>
  )
}

function Tab({ tab, index, pos, press, current, isActive, onKey }: { tab: TabDef; index: number; pos: MotionValue<number>; press: MotionValue<number>; current: boolean; isActive: boolean; onKey: () => void }) {
  // Unter der Linse wächst das Symbol, wenn der Finger drauf ist
  const scale = useTransform([pos, press], ([v, p]: number[]) => 1 + 0.2 * p * Math.max(0, 1 - Math.abs(index - v)))
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      aria-label={tab.label}
      // Mit Maus/Finger regelt die Leiste alles selbst; echte Klicks kommen nur per Tastatur (detail = 0)
      onClick={(e) => {
        if (e.detail === 0) onKey()
      }}
      className={`relative z-10 flex min-h-[3.6rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[28px] text-[11px] font-extrabold outline-offset-[-2px] transition-colors duration-200 ${current ? '' : 'text-muted'}`}
      style={current ? { color: tab.textColor ?? 'var(--brand-text)' } : undefined}
    >
      <motion.span className="relative block" style={{ scale }}>
        {tab.icon}
        {tab.badge}
      </motion.span>
      <span>{tab.label}</span>
    </button>
  )
}
