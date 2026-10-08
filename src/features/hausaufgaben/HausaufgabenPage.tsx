import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Mascot } from '../../components/mascot/Mascot'
import { Check, Plus } from '../../components/ui/Icons'
import { dateKey } from '../../lib/calendar'
import { dueText, groupHomework } from '../../lib/hausaufgaben'
import { helpSubject } from '../../lib/subjects'
import type { Hausaufgabe } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { HausaufgabeSheet } from './HausaufgabeSheet'

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

/** Hausaufgaben: oben das Wichtigste für heute, darunter die offenen nach Fälligkeit, erledigte unten eingeklappt. */
export function HausaufgabenPage() {
  const list = useStore((s) => s.hausaufgaben) ?? []
  const remove = useStore((s) => s.removeHausaufgabe)
  const [sheet, setSheet] = useState<{ h?: Hausaufgabe } | null>(null)
  const today = dateKey(new Date())
  const groups = useMemo(() => groupHomework(list, today), [list, today])
  const done = useMemo(() => list.filter((h) => h.done).sort((a, b) => b.due.localeCompare(a.due)), [list])
  const openCount = list.length - done.length
  // Heute: Wie viel von dem, was heute (oder früher) dran ist, ist schon geschafft?
  const todays = list.filter((h) => h.due <= today && (!h.done || h.due === today))
  const todaysDone = todays.filter((h) => h.done).length
  const dateText = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-3 lg:pt-8">
      <header className="mb-4 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-muted">{dateText}</p>
          <h1 className="large-title">Hausaufgaben</h1>
        </div>
        <button type="button" aria-label="Neue Hausaufgabe" onClick={() => setSheet({})} className="press mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <Plus size={22} />
        </button>
      </header>

      {list.length === 0 && (
        <section className="flex flex-col items-center rounded-[20px] bg-surface p-6 text-center">
          <Mascot size={88} mood="happy" alive />
          <h2 className="mt-2 text-[20px] font-black leading-tight">Keine Hausaufgaben eingetragen</h2>
          <p className="mt-1 max-w-sm text-[15px] text-muted">Schreib auf, was du bis wann machen musst. Die App zeigt dir, was dran ist, und du hakst es ab.</p>
          <button type="button" className="btn btn-primary press mt-4 w-full sm:w-64" onClick={() => setSheet({})}>
            Hausaufgabe eintragen
          </button>
        </section>
      )}

      {/* Heute auf einen Blick */}
      {todays.length > 0 && openCount > 0 && (
        <section className="mb-5 rounded-[20px] bg-surface p-4" aria-label="Heute">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] font-bold text-muted">Für heute</p>
            <p className="text-[15px] font-extrabold tabular-nums">
              {todaysDone} von {todays.length} geschafft
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-snow" role="progressbar" aria-valuemin={0} aria-valuemax={todays.length} aria-valuenow={todaysDone} aria-label="Heute geschafft">
            <motion.div className="h-full rounded-full bg-good" initial={false} animate={{ width: `${(todaysDone / todays.length) * 100}%` }} transition={{ type: 'spring', stiffness: 220, damping: 30 }} />
          </div>
        </section>
      )}

      {list.length > 0 && openCount === 0 && (
        <section className="mb-5 flex items-center gap-4 rounded-[20px] bg-surface p-5">
          <Mascot size={64} mood="cheer" alive />
          <div>
            <h2 className="text-[19px] font-black leading-tight">Alles erledigt</h2>
            <p className="text-sm text-muted">Gut gemacht. Neue trägst du mit dem Plus oben ein.</p>
          </div>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.id} className="mb-5" aria-label={g.label}>
          <h2 className={`mb-1.5 flex items-baseline gap-2 px-1 text-[17px] font-black ${g.id === 'ueberfaellig' ? 'text-bad-dark' : ''}`}>
            {g.label}
            <span className="text-[14px] font-bold text-muted">{g.items.length}</span>
          </h2>
          <ul className="list" style={{ '--inset': '3.4rem' } as React.CSSProperties}>
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
          <summary className="press mb-1 flex min-h-11 cursor-pointer list-none items-center px-1 text-[15px] font-extrabold text-muted">
            Erledigt ({done.length})
          </summary>
          <ul className="list" style={{ '--inset': '3.4rem' } as React.CSSProperties}>
            {done.slice(0, 20).map((h) => (
              <HomeworkRow key={h.id} h={h} today={today} onOpen={(x) => setSheet({ h: x })} />
            ))}
          </ul>
          <button type="button" className="press mt-1 min-h-11 rounded-xl px-2 text-sm font-extrabold text-muted" onClick={() => done.forEach((h) => remove(h.id))}>
            Erledigte löschen
          </button>
        </details>
      )}

      <HausaufgabeSheet open={!!sheet} onClose={() => setSheet(null)} hausaufgabe={sheet?.h} />
    </div>
  )
}
