import type { ReactNode } from 'react'
import { Camera, Cards, Pencil, Right, Sparkle } from '../../components/ui/Icons'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { templatesFor } from '../../content/templates'
import { helpSubject } from '../../lib/subjects'

/** Die Wege zu neuen Karteikarten. `fertig` gibt es nur, wo das Fach fertige Stapel hat. */
export type CreateWay = 'fertig' | 'foto' | 'schreiben' | 'ki'

const OPTIONS: { id: CreateWay; title: string; sub: string; tint: string; icon: ReactNode }[] = [
  { id: 'fertig', title: 'Fertige Karten', sub: 'Sofort loslegen, nichts tippen', tint: '#1fb866', icon: <Cards size={22} className="text-white" /> },
  { id: 'foto', title: 'Foto vom Heft', sub: 'Der Text wird auf deinem Handy gelesen', tint: '#2f6bff', icon: <Camera size={22} className="text-white" /> },
  { id: 'schreiben', title: 'Selbst schreiben', sub: 'Eine Karte pro Zeile: Frage – Antwort', tint: '#d98a00', icon: <Pencil size={22} className="text-white" /> },
  { id: 'ki', title: 'Von der KI', sub: 'Thema nennen, die KI schreibt die Karten', tint: '#7b4dff', icon: <Sparkle size={22} className="text-white" /> },
]

/** Hat das Fach fertige Karten? Französisch bringt seinen Kurs mit (eigene Seite), die anderen Fächer Vorlagen. */
export const hasReady = (subject: string) => subject === 'franzoesisch' || templatesFor(subject).length > 0

/**
 * Erste Auswahl beim Erstellen: Fach antippen, dann eine von vier klaren Möglichkeiten. Jede führt in genau einen Schritt,
 * nicht in ein Formular mit allem auf einmal. Die Reihenfolge geht vom Leichtesten (nichts tippen) zum Freiesten.
 */
export function CreateChoices({ subjects, subject, onSubject, onPick }: { subjects: string[]; subject: string; onSubject: (id: string) => void; onPick: (way: CreateWay) => void }) {
  const options = OPTIONS.filter((o) => o.id !== 'fertig' || hasReady(subject))
  return (
    <div>
      {subjects.length > 1 && (
        <>
          <p className="mb-2 px-1 text-[15px] font-extrabold">Für welches Fach?</p>
          <div className="-mx-4 mb-4 flex gap-2.5 overflow-x-auto px-4 pb-2 pt-2" role="radiogroup" aria-label="Fach">
            {subjects.map((id) => {
              const s = helpSubject(id)
              if (!s) return null
              const on = id === subject
              return (
                <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onSubject(id)} className="press flex w-[4.6rem] shrink-0 flex-col items-center gap-1.5 text-center">
                  <span
                    className="flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-[1.1rem] transition-[box-shadow,opacity]"
                    style={{ background: s.c, boxShadow: on ? `0 0 0 3px var(--surface), 0 0 0 5px ${s.c}` : undefined, opacity: on ? 1 : 0.6 }}
                  >
                    <HelpSubjectIcon id={id} ink={s.c} size={32} />
                  </span>
                  <span className={`w-full truncate text-[12px] font-extrabold leading-tight ${on ? '' : 'text-muted'}`}>{s.name}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      <p className="mb-2 px-1 text-[15px] font-extrabold">Wie willst du die Karten machen?</p>
      <div className="list">
        {options.map((o) => (
          <button key={o.id} type="button" className="row !min-h-[4.5rem]" onClick={() => onPick(o.id)}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: o.tint }}>
              {o.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-extrabold leading-tight">{o.title}</span>
              <span className="block text-[13px] font-semibold leading-snug text-muted">{o.sub}</span>
            </span>
            <Right size={13} className="shrink-0 text-muted" />
          </button>
        ))}
      </div>
    </div>
  )
}
