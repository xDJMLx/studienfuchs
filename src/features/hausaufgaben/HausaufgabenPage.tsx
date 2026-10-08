import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Mascot } from '../../components/mascot/Mascot'
import { Check, Plus } from '../../components/ui/Icons'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { dateKey } from '../../lib/calendar'
import { dueText, groupHomework } from '../../lib/hausaufgaben'
import { helpSubject } from '../../lib/subjects'
import type { Hausaufgabe } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { HausaufgabeSheet } from './HausaufgabeSheet'

/** Eine Zeile: links der Kreis zum Abhaken, rechts Text, Fach und Fälligkeit; ein Tipp auf den Text öffnet die Bearbeitung. */
export function HomeworkRow({ h, today, onOpen }: { h: Hausaufgabe; today: string; onOpen: (h: Hausaufgabe) => void }) {
  const toggle = useStore((s) => s.toggleHausaufgabe)
  const reduce = useReducedMotion()
  const s = helpSubject(h.subject)
  const late = !h.done && h.due < today
  return (
    <motion.li
      layout={!reduce}
      initial={false}
      exit={reduce ? undefined : { opacity: 0, x: 48, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className="row !min-h-[3.75rem] !gap-3"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={!!h.done}
        aria-label={`${h.text}: ${h.done ? 'wieder offen' : 'erledigt'}`}
        onClick={() => toggle(h.id)}
        className="press -ml-1 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <motion.span
          animate={h.done && !reduce ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${h.done ? 'border-good bg-good text-white' : late ? 'border-bad' : 'border-line'}`}
        >
          {h.done && <Check size={16} />}
        </motion.span>
      </button>
      <button type="button" onClick={() => onOpen(h)} className="press flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${h.text} bearbeiten`}>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[16px] font-extrabold leading-tight ${h.done ? 'text-muted line-through' : ''}`}>{h.text}</span>
          <span className="block truncate text-[13px] font-semibold text-muted">
            {s?.name ?? 'Anderes Fach'} · <span className={late ? 'font-extrabold text-bad-dark' : ''}>{h.done ? 'erledigt' : `fällig ${dueText(h.due, today)}`}</span>
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: s?.c ?? '#868a95' }}>
          <HelpSubjectIcon id={h.subject} ink={s?.c ?? '#888'} size={20} />
        </span>
      </button>
    </motion.li>
  )
}

/** Hausaufgaben: offene nach Fälligkeit geordnet (überfällig, heute, morgen, diese Woche, später), erledigte unten eingeklappt. */
export function HausaufgabenPage() {
  const list = useStore((s) => s.hausaufgaben) ?? []
  const remove = useStore((s) => s.removeHausaufgabe)
  const [sheet, setSheet] = useState<{ h?: Hausaufgabe } | null>(null)
  const today = dateKey(new Date())
  const groups = useMemo(() => groupHomework(list, today), [list, today])
  const done = useMemo(() => list.filter((h) => h.done).sort((a, b) => b.due.localeCompare(a.due)), [list])
  const openCount = list.length - done.length

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-3 lg:pt-8">
      <header className="mb-4 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[15px] font-bold text-muted">{openCount === 0 ? 'Alles erledigt' : `${openCount} ${openCount === 1 ? 'offen' : 'offen'}`}</p>
          <h1 className="large-title">Hausaufgaben</h1>
        </div>
        <button type="button" aria-label="Neue Hausaufgabe" onClick={() => setSheet({})} className="press mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-strong text-on-brand">
          <Plus size={22} />
        </button>
      </header>

      {list.length === 0 && (
        <section className="card flex flex-col items-center p-6 text-center">
          <Mascot size={88} mood="happy" alive />
          <h2 className="mt-2 text-[20px] font-black leading-tight">Keine Hausaufgaben eingetragen</h2>
          <p className="mt-1 max-w-sm text-[15px] text-muted">Schreib auf, was du bis wann machen musst. Die App erinnert dich und hakt es mit dir ab.</p>
          <button type="button" className="btn btn-primary press mt-4 w-full sm:w-64" onClick={() => setSheet({})}>
            Hausaufgabe eintragen
          </button>
        </section>
      )}

      {list.length > 0 && openCount === 0 && (
        <section className="card mb-5 flex items-center gap-4 p-5">
          <Mascot size={64} mood="cheer" alive />
          <div>
            <h2 className="text-[19px] font-black leading-tight">Alle Hausaufgaben erledigt</h2>
            <p className="text-sm text-muted">Gut gemacht. Neue trägst du mit dem Plus oben ein.</p>
          </div>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.id} className="mb-5" aria-label={g.label}>
          <h2 className={`mb-1.5 px-1 text-[17px] font-black ${g.id === 'ueberfaellig' ? 'text-bad-dark' : ''}`}>{g.label}</h2>
          <ul className="list">
            <AnimatePresence initial={false}>
              {g.items.map((h) => (
                <HomeworkRow key={h.id} h={h} today={today} onOpen={(x) => setSheet({ h: x })} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}

      {done.length > 0 && (
        <details className="mb-5">
          <summary className="press mb-1.5 flex min-h-11 cursor-pointer list-none items-center justify-between px-1 text-[17px] font-black">
            <span>
              Erledigt <span className="text-[15px] font-bold text-muted">({done.length})</span>
            </span>
          </summary>
          <ul className="list">
            {done.slice(0, 20).map((h) => (
              <HomeworkRow key={h.id} h={h} today={today} onOpen={(x) => setSheet({ h: x })} />
            ))}
          </ul>
          <button type="button" className="press mt-2 min-h-11 rounded-xl px-2 text-sm font-extrabold text-muted" onClick={() => done.forEach((h) => remove(h.id))}>
            Erledigte löschen
          </button>
        </details>
      )}

      <HausaufgabeSheet open={!!sheet} onClose={() => setSheet(null)} hausaufgabe={sheet?.h} />
    </div>
  )
}
