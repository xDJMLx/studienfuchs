import { motion, useReducedMotion } from 'framer-motion'
import { Star } from './Icons'

/** Kleines Feuerwerk aus Sternen um einen Punkt herum (für geschaffte Lektionen und geöffnete Truhen). */
export function Burst({ count = 10, radius = 70, color = 'var(--gold)', delay = 0 }: { count?: number; radius?: number; color?: string; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3
        const r = radius * (i % 2 ? 0.75 : 1)
        return (
          <motion.span
            key={i}
            className="absolute -ml-2 -mt-2 block"
            style={{ color }}
            initial={{ x: 0, y: 0, scale: 0.3, opacity: 0, rotate: 0 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, scale: [0.3, 1.1, 0.6], opacity: [0, 1, 0], rotate: 140 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: delay + (i % 3) * 0.04 }}
          >
            <Star size={i % 2 ? 12 : 16} />
          </motion.span>
        )
      })}
    </span>
  )
}
