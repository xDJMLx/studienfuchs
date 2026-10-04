import { useMemo, useState } from 'react'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { addDays, byDay, dateKey, isoWeek, KINDS, startOfWeek, weekDays, weekRange } from '../../lib/calendar'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'

const shortKind = (a: Arbeit): string => KINDS.find((k) => k.id === (a.kind ?? 'klassenarbeit'))?.short ?? 'Termin'

/**
 * Wochenplan wie in einer Stundenplan-App: je Woche eine Zeile mit sieben Spalten (Mo bis So).
 * Termine stehen als farbige Kacheln im Tag (Fach-Symbol und Art), ein Tipp auf einen leeren Tag trägt dort etwas ein.
 */
export function WeekPlanner({ arbeiten, weeks = 2, onAdd, onOpen, pager = true }: { arbeiten: Arbeit[]; weeks?: number; onAdd: (dateKey: string) => void; onOpen: (a: Arbeit) => void; pager?: boolean }) {
  const today = dateKey(new Date())
  const [offset, setOffset] = useState(0)
  const first = useMemo(() => addDays(startOfWeek(new Date()), offset * 7), [offset])
  const days = useMemo(() => byDay(arbeiten), [arbeiten])
  const rows = Array.from({ length: weeks }, (_, i) => addDays(first, i * 7))

  return (
    <section aria-label="Wochenplan">
      {pager && (
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Frühere Wochen" onClick={() => setOffset((o) => o - 1)} className="press flex h-10 w-10 items-center justify-center rounded-xl text-xl font-black text-muted hover:bg-snow">
            ‹
          </button>
          {offset !== 0 ? (
            <button type="button" onClick={() => setOffset(0)} className="text-xs font-extrabold text-sky-dark underline">
              Zu dieser Woche
            </button>
          ) : (
            <span className="text-xs font-extrabold text-muted">Tippe einen Tag, um etwas einzutragen</span>
          )}
          <button type="button" aria-label="Spätere Wochen" onClick={() => setOffset((o) => o + 1)} className="press flex h-10 w-10 items-center justify-center rounded-xl text-xl font-black text-muted hover:bg-snow">
            ›
          </button>
        </div>
      )}

      <div className="grid gap-4">
        {rows.map((monday) => {
          const isThis = dateKey(startOfWeek(new Date())) === dateKey(monday)
          return (
            <div key={dateKey(monday)}>
              <p className="mb-1.5 flex items-baseline gap-2 px-0.5 text-[12px] font-extrabold text-muted">
                <span className={isThis ? 'text-brand-dark' : ''}>{isThis ? 'Diese Woche' : `KW ${isoWeek(monday)}`}</span>
                <span className="font-bold opacity-80">{weekRange(monday)}</span>
              </p>
              <div className="grid grid-cols-7 gap-1.5" role="row">
                {weekDays(monday).map((d, i) => {
                  const list = days[d.key] ?? []
                  const isToday = d.key === today
                  const past = d.key < today
                  const weekend = i >= 5
                  return (
                    <div key={d.key} role="gridcell" className="min-w-0">
                      <div className={`mb-1 flex flex-col items-center leading-none ${isToday ? 'text-brand-dark' : 'text-muted'}`}>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide">{d.weekday}</span>
                        <span className={`mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] font-black ${isToday ? 'bg-brand-strong text-on-brand' : ''}`}>{d.day}</span>
                      </div>
                      <div
                        className={`relative flex min-h-[5.4rem] flex-col gap-1 rounded-xl p-1 ${isToday ? 'bg-brand-soft ring-2 ring-brand' : weekend ? 'bg-snow/60' : 'bg-snow'} ${past ? 'opacity-70' : ''}`}
                      >
                        {/* Leerer Tag oder Platz unter den Terminen: ein Tipp trägt hier ein */}
                        <button
                          type="button"
                          onClick={() => onAdd(d.key)}
                          aria-label={`Am ${d.day}. ${d.weekday} eintragen`}
                          className="absolute inset-0 rounded-xl text-lg font-black text-muted/0 transition-colors hover:bg-black/5 hover:text-muted/60 focus-visible:text-muted/70"
                        >
                          <span className="pointer-events-none flex h-full items-end justify-center pb-1">+</span>
                        </button>
                        {list.map((a) => {
                          const s = helpSubject(a.subject)
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => onOpen(a)}
                              aria-label={`${a.title}, ${shortKind(a)}`}
                              className="press relative z-10 flex w-full flex-col items-center gap-0.5 overflow-hidden rounded-lg px-0 py-1.5 text-white"
                              style={{ background: s?.c ?? '#868a95', boxShadow: `0 2px 0 ${s?.s ?? '#5f636d'}`, opacity: a.done ? 0.55 : 1 }}
                            >
                              <HelpSubjectIcon id={a.subject} ink={s?.c ?? '#868a95'} size={18} />
                              <span className="w-full text-center text-[9px] font-extrabold leading-none tracking-tight">{shortKind(a)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
