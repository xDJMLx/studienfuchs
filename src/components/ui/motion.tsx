import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

/** Gemeinsame Bewegungssprache: schnell anlaufen, weich ausklingen (ease-out-quint). */
export const EASE = [0.22, 1, 0.36, 1] as const

/** Dauern: alles, was der Nutzer antippt, antwortet in unter 0,3 Sekunden. */
export const DUR = { fast: 0.16, base: 0.28, slow: 0.4 } as const

export const SPRING = {
  snappy: { type: 'spring', stiffness: 520, damping: 34 },
  soft: { type: 'spring', stiffness: 260, damping: 26 },
  bouncy: { type: 'spring', stiffness: 420, damping: 16 },
} as const

/**
 * Früher blendeten Seiten ihre Inhalte nacheinander ein. Das war zusätzlich zum Seitenwechsel zu viel Bewegung und wirkte wie ein Überblenden:
 * Die Seite kommt jetzt als Ganzes herein (siehe Layout), ihre Inhalte stehen sofort da. Die Bausteine bleiben, damit alte Aufrufe weiter passen.
 */
interface StaggerProps {
  children: ReactNode
  className?: string
  /** Wird nicht mehr gebraucht, bleibt für alte Aufrufe */
  stagger?: number
  delay?: number
}

export function Stagger({ children, className }: StaggerProps) {
  return <div className={className}>{children}</div>
}

export function StaggerList({ children, className }: StaggerProps) {
  return <ul className={className}>{children}</ul>
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

export function ItemLi({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={className}>{children}</li>
}

/** Bleibt als Hülle ohne Einblenden (siehe oben). */
export function Reveal({ children, className }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return <div className={className}>{children}</div>
}

/** Zahl, die hochzählt. */
export function CountUp({ to, prefix = '', suffix = '', duration = 0.7, delay = 0 }: { to: number; prefix?: string; suffix?: string; duration?: number; delay?: number }) {
  const reduce = useReducedMotion()
  const v = useMotionValue(reduce ? to : 0)
  const text = useTransform(v, (n) => `${prefix}${Math.round(n).toLocaleString('de-DE')}${suffix}`)
  useEffect(() => {
    if (reduce) {
      v.set(to)
      return
    }
    const c = animate(v, to, { duration, delay, ease: EASE })
    return () => c.stop()
  }, [to, v, reduce, duration, delay])
  return <motion.span>{text}</motion.span>
}
