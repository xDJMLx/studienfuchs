import { motion, useReducedMotion } from 'framer-motion'
import { dayKey } from '../../lib/streak'
import { useStore } from '../../store/useStore'
import { Check, Flame } from './Icons'
import { EASE, SPRING } from './motion'

/** Balken, der beim Erscheinen von links einläuft und bei Änderungen sanft nachzieht. */
export function ProgressBar({ pct, color = 'bg-brand', className = '', delay = 0 }: { pct: number; color?: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  const w = Math.min(100, Math.max(0, pct * 100))
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-snow ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(w)}>
      <motion.div
        className={`relative h-full overflow-hidden rounded-full ${color}`}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay }}
      >
        {w > 6 && !reduce && <span className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/35 to-transparent" style={{ animation: 'shimmer 2.8s ease-in-out 1.2s infinite' }} />}
      </motion.div>
    </div>
  )
}

/** Mehrfarbiger Balken, z. B. neu / lernend / gefestigt. */
export function SegmentedBar({ parts, height = 'h-3' }: { parts: { value: number; color: string; label: string }[]; height?: string }) {
  const reduce = useReducedMotion()
  const total = parts.reduce((n, p) => n + p.value, 0) || 1
  return (
    <div className={`flex gap-0.5 overflow-hidden rounded-full bg-snow ${height}`} role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
      {parts.map((p, i) => (
        <motion.div
          key={p.label}
          className={p.color}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${(p.value / total) * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay: i * 0.12 }}
        />
      ))}
    </div>
  )
}

export function ProgressRing({
  pct,
  size = 72,
  stroke = 7,
  color = 'var(--brand)',
  track = 'var(--snow)',
  children,
}: {
  pct: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(1, Math.max(0, pct)))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: 0.1 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Wochenübersicht: an welchen Tagen wurde gelernt? */
export function WeekStrip({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion()
  const xpByDay = useStore((s) => s.xpByDay)
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const todayKey = dayKey(today)

  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="Diese Woche">
      {DAYS.map((label, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const key = dayKey(d)
        const learned = (xpByDay[key] ?? 0) > 0
        const isToday = key === todayKey
        return (
          <li key={label} className="flex flex-col items-center gap-1.5">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-brand-dark' : 'text-muted'}`}>{label}</span>
            <motion.span
              initial={reduce ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...SPRING.bouncy, delay: 0.15 + i * 0.05 }}
              className={`flex items-center justify-center rounded-full ${compact ? 'h-8 w-8' : 'h-9 w-9'} ${
                learned ? 'bg-brand text-on-brand' : isToday ? 'border-2 border-brand text-brand-dark' : 'bg-snow text-muted'
              }`}
              title={`${xpByDay[key] ?? 0} XP`}
            >
              {learned ? <Check size={16} /> : isToday ? <Flame size={16} /> : null}
            </motion.span>
          </li>
        )
      })}
    </ol>
  )
}
