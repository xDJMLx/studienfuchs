import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

const COLORS = ['var(--brand)', 'var(--gold)', 'var(--good)', '#ffffff', 'var(--flame)']

/** Kleines Konfetti-Feuerwerk für geschaffte Lektionen (aus bei "Bewegung reduzieren"). */
export function Confetti({ count = 28 }: { count?: number }) {
  const reduce = useReducedMotion()
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 340,
        y: -(80 + Math.random() * 180),
        rotate: Math.random() * 540 - 270,
        delay: Math.random() * 0.15,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.5,
      })),
    [count],
  )
  if (reduce) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-24 h-0 w-0" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{ width: p.size, height: p.size * (p.round ? 1 : 1.6), background: p.color, borderRadius: p.round ? '50%' : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], rotate: p.rotate, scale: 1 }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut', times: [0, 0.4, 1] }}
        />
      ))}
    </div>
  )
}
