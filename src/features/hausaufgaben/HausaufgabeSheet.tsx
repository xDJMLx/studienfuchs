import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { dateKey, longDay } from '../../lib/calendar'
import { dueChoices } from '../../lib/hausaufgaben'
import { ownDeck } from '../../lib/decks'
import { helpSubject, HELP_SUBJECTS } from '../../lib/subjects'
import type { Hausaufgabe } from '../../lib/types'
import { useStore } from '../../store/useStore'

const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 font-semibold outline-none transition-colors focus:border-sky'

const tomorrow = () => dueChoices()[1].key

/** Hausaufgabe eintragen oder ändern: Fach, was zu tun ist, bis wann. */
export function HausaufgabeSheet({ open, onClose, hausaufgabe, date: presetDate, subjectId }: { open: boolean; onClose: () => void; hausaufgabe?: Hausaufgabe; date?: string; subjectId?: string }) {
  const mySubjects = useStore((s) => s.mySubjects)
  const sets = useStore((s) => s.sets)
  const addHausaufgabe = useStore((s) => s.addHausaufgabe)
  const updateHausaufgabe = useStore((s) => s.updateHausaufgabe)
  const removeHausaufgabe = useStore((s) => s.removeHausaufgabe)

  const firstSubject = subjectId ?? hausaufgabe?.subject ?? mySubjects?.[0] ?? HELP_SUBJECTS[0].id
  const [subject, setSubject] = useState(firstSubject)
  const [text, setText] = useState(hausaufgabe?.text ?? '')
  const [due, setDue] = useState(hausaufgabe?.due ?? presetDate ?? tomorrow())

  // Beim Öffnen frisch starten (oder die gewählte Hausaufgabe laden)
  useEffect(() => {
    if (!open) return
    setSubject(subjectId ?? hausaufgabe?.subject ?? mySubjects?.[0] ?? HELP_SUBJECTS[0].id)
    setText(hausaufgabe?.text ?? '')
    setDue(hausaufgabe?.due ?? presetDate ?? tomorrow())
    // mySubjects bewusst nicht als Abhängigkeit: Das Blatt soll beim Öffnen starten, nicht bei jeder Änderung
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hausaufgabe, presetDate, subjectId])

  const subjects = useMemo(() => {
    const mine = [...new Set([...(mySubjects ?? []), ...sets.map((x) => ownDeck(x).subject), subject])].filter((id) => helpSubject(id))
    if (mine.length === 0) return HELP_SUBJECTS
    const chosen = mine.map((id) => helpSubject(id)!)
    const other = helpSubject('sonstiges')
    return other && !mine.includes('sonstiges') ? [...chosen, other] : chosen
  }, [mySubjects, sets, subject])

  const valid = text.trim().length > 0 && due !== ''
  const save = () => {
    const data = { subject, text: text.trim().slice(0, 200), due }
    if (hausaufgabe) updateHausaufgabe(hausaufgabe.id, data)
    else addHausaufgabe(data)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={hausaufgabe ? 'Hausaufgabe bearbeiten' : 'Hausaufgabe eintragen'}>
      <div className="grid gap-5">
        <label className="grid gap-1.5 text-sm font-bold text-muted">
          Was ist zu tun?
          <input className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Buch Seite 52, Aufgabe 3 und 4" maxLength={200} autoFocus onKeyDown={(e) => e.key === 'Enter' && valid && save()} />
        </label>

        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">In welchem Fach?</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Fach">
            {subjects.map((s) => {
              const on = subject === s.id
              return (
                <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setSubject(s.id)} className={`press flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition-colors ${on ? 'border-sky bg-sky-soft' : 'border-line bg-surface'}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: s.c }}>
                    <HelpSubjectIcon id={s.id} ink={s.c} size={22} />
                  </span>
                  <span className="max-w-full truncate text-[12px] font-extrabold">{s.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">Bis wann?</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {dueChoices().map((q) => (
              <button key={q.key} type="button" onClick={() => setDue(q.key)} className={`chip ${due === q.key ? 'chip-on' : ''}`}>
                {q.label}
              </button>
            ))}
          </div>
          <input type="date" aria-label="Datum" className={field} value={due} min={hausaufgabe ? undefined : dateKey(new Date())} onChange={(e) => setDue(e.target.value)} />
          {due && <p className="mt-1.5 text-sm font-extrabold text-brand-dark">{longDay(due)}</p>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" className="btn btn-primary press w-full sm:w-56" disabled={!valid} onClick={save}>
            {hausaufgabe ? 'Speichern' : 'Eintragen'}
          </button>
          {hausaufgabe && (
            <button
              type="button"
              className="btn btn-ghost press w-full !text-bad-dark sm:w-44"
              onClick={() => {
                removeHausaufgabe(hausaufgabe.id)
                onClose()
              }}
            >
              Löschen
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
