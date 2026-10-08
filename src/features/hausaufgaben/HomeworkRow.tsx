import { motion, useReducedMotion } from 'framer-motion'
import { Check } from '../../components/ui/Icons'
import { dueText } from '../../lib/hausaufgaben'
import { helpSubject } from '../../lib/subjects'
import type { Hausaufgabe } from '../../lib/types'
import { useStore } from '../../store/useStore'

/**
 * Eine Zeile wie bei „Erinnerungen“: links ein Kreis zum Abhaken, daneben die Aufgabe, darunter ein Punkt in der Fachfarbe mit Fach und Fälligkeit.
 * Ein Tipp auf den Text öffnet die Bearbeitung.
 */
export function HomeworkRow({ h, today, onOpen }: { h: Hausaufgabe; today: string; onOpen: (h: Hausaufgabe) => void }) {
  const toggle = useStore((s) => s.toggleHausaufgabe)
  const reduce = useReducedMotion()
  const s = helpSubject(h.subject)
  const late = !h.done && h.due < today
  return (
    <motion.li
      layout={!reduce ? 'position' : false}
      initial={false}
      exit={reduce ? undefined : { opacity: 0, x: 40, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
      className="row !min-h-[3.6rem] !gap-1 !py-1.5 !pl-1.5"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={!!h.done}
        aria-label={`${h.text}: ${h.done ? 'wieder offen' : 'erledigt'}`}
        onClick={() => toggle(h.id)}
        className="press flex h-12 w-12 shrink-0 items-center justify-center"
      >
        <motion.span
          animate={h.done && !reduce ? { scale: [1, 1.22, 1] } : { scale: 1 }}
          transition={{ duration: 0.28 }}
          className={`flex h-[26px] w-[26px] items-center justify-center rounded-full transition-colors ${h.done ? 'bg-good text-white' : `border-[1.5px] ${late ? 'border-bad' : 'border-muted/60'}`}`}
        >
          {h.done && <Check size={15} />}
        </motion.span>
      </button>
      <button type="button" onClick={() => onOpen(h)} className="press min-w-0 flex-1 py-1 pr-3 text-left" aria-label={`${h.text} bearbeiten`}>
        <span className={`block truncate text-[16px] font-bold leading-tight ${h.done ? 'text-muted line-through decoration-1' : ''}`}>{h.text}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s?.c ?? '#868a95' }} aria-hidden />
          <span className="truncate">
            {s?.name ?? 'Anderes Fach'}
            {' · '}
            <span className={late ? 'font-extrabold text-bad-dark' : ''}>{h.done ? 'erledigt' : dueText(h.due, today)}</span>
          </span>
        </span>
      </button>
    </motion.li>
  )
}
