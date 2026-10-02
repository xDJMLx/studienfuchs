import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface TabDef {
  key: string
  label: string
  icon: ReactNode
  badge?: ReactNode
}

const PAD = 6 // Innenabstand der Leiste in px (entspricht p-1.5)

/**
 * Tab-Leiste mit "Linse" wie bei iOS: Finger aufsetzen, die Glas-Linse hebt sich unter dem Finger,
 * folgt ihm von Tab zu Tab, und beim Loslassen öffnet sich der Tab darunter. Ein einfaches Antippen geht genauso.
 * Mit Tastatur oder Screenreader bleiben es ganz normale Knöpfe.
 */
export function TabBar({ tabs, activeIndex, onSelect }: { tabs: TabDef[]; activeIndex: number; onSelect: (index: number) => void }) {
  const reduce = useReducedMotion()
  const n = tabs.length
  const nav = useRef<HTMLElement>(null)
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
    const rect = nav.current?.getBoundingClientRect()
    if (!rect) return 0
    const w = (rect.width - PAD * 2) / n
    return Math.min(n - 1, Math.max(0, (clientX - rect.left - PAD) / w - 0.5))
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

  const lensLeft = useTransform(pos, (v) => `calc(${PAD}px + ${v} * (100% - ${PAD * 2}px) / ${n})`)
  const lensShown = activeIndex >= 0 || pressed

  return (
    <nav
      ref={nav}
      aria-label="Hauptnavigation"
      className="glass fixed inset-x-3 z-40 flex touch-none items-stretch rounded-[34px] lg:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)', padding: PAD }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        dragging.current = true
        try {
          nav.current?.setPointerCapture(e.pointerId)
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
        className="pointer-events-none absolute rounded-[28px]"
        style={{ left: lensLeft, top: PAD, bottom: PAD, width: `calc((100% - ${PAD * 2}px) / ${n})`, opacity: lensShown ? 1 : 0 }}
        animate={{ scale: pressed && !reduce ? 1.22 : 1, y: pressed && !reduce ? -4 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        <span
          className="absolute inset-0 rounded-[28px] transition-[background,box-shadow,border-color] duration-200"
          style={
            pressed
              ? {
                  background: 'color-mix(in srgb, var(--brand) 14%, rgba(255,255,255,0.22))',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 14px 30px -10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -8px 16px -8px rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(6px) saturate(190%)',
                }
              : {
                  background: 'color-mix(in srgb, var(--brand) 17%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--brand) 28%, transparent)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
                }
          }
        />
      </motion.span>

      {tabs.map((t, i) => (
        <Tab key={t.key} tab={t} index={i} pos={pos} press={press} current={i === focusIndex} onKey={() => onSelect(i)} isActive={i === activeIndex} />
      ))}
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
      className={`relative z-10 flex min-h-[3.6rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[28px] text-[11px] font-semibold outline-offset-[-2px] transition-colors duration-200 ${current ? 'text-brand-dark' : 'text-muted'}`}
    >
      <motion.span className="relative block" style={{ scale }}>
        {tab.icon}
        {tab.badge}
      </motion.span>
      <span>{tab.label}</span>
    </button>
  )
}
