import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Variants } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

/** Gemeinsame Bewegungssprache: schnell anlaufen, weich ausklingen (ease-out-quint). */
export const EASE = [0.22, 1, 0.36, 1] as const

export const SPRING = {
  snappy: { type: 'spring', stiffness: 520, damping: 34 },
  soft: { type: 'spring', stiffness: 260, damping: 26 },
  bouncy: { type: 'spring', stiffness: 420, damping: 16 },
} as const

const container = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

interface StaggerProps {
  children: ReactNode
  className?: string
  /** Abstand zwischen den Kindern in Sekunden */
  stagger?: number
  delay?: number
}

/** Kinder (Item / ItemLi) erscheinen nacheinander. Bei "Bewegung reduzieren" sofort. */
export function Stagger({ children, className, stagger = 0.07, delay = 0 }: StaggerProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} variants={container(stagger, delay)} initial={reduce ? false : 'hidden'} animate="show">
      {children}
    </motion.div>
  )
}

export function StaggerList({ children, className, stagger = 0.05, delay = 0 }: StaggerProps) {
  const reduce = useReducedMotion()
  return (
    <motion.ul className={className} variants={container(stagger, delay)} initial={reduce ? false : 'hidden'} animate="show">
      {children}
    </motion.ul>
  )
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}

export function ItemLi({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li className={className} variants={item}>
      {children}
    </motion.li>
  )
}

/** Blendet beim Laden der Seite weich ein. Bewusst nicht erst beim Hineinscrollen: Bei schnellem Wischen blieben sonst Bereiche leer. */
export function Reveal({ children, className, delay = 0, y = 18 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Zahl, die hochzählt. */
export function CountUp({ to, prefix = '', suffix = '', duration = 0.9, delay = 0 }: { to: number; prefix?: string; suffix?: string; duration?: number; delay?: number }) {
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
