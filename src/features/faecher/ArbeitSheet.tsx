import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { allCourseDecks, FRENCH, ownDeck, type Deck } from '../../lib/decks'
import { HELP_SUBJECTS } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'
import { useStore } from '../../store/useStore'

const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 font-semibold outline-none transition-colors focus:border-sky'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Arbeit eintragen oder ändern: Fach, Titel, Termin und die Stapel, die dafür gelernt werden. */
export function ArbeitSheet({ open, onClose, subjectId, arbeit, presetDeckId }: { open: boolean; onClose: () => void; subjectId?: string; arbeit?: Arbeit; presetDeckId?: string }) {
  const { sets, addedUnits, addArbeit, updateArbeit, removeArbeit } = useStore()
  const [subject, setSubject] = useState(subjectId ?? arbeit?.subject ?? HELP_SUBJECTS[0].id)
  const [title, setTitle] = useState(arbeit?.title ?? '')
  const [date, setDate] = useState(arbeit?.date ?? '')
  const [deckIds, setDeckIds] = useState<string[]>(arbeit?.deckIds ?? (presetDeckId ? [presetDeckId] : []))

  // Beim Öffnen frisch starten (oder die gewählte Arbeit laden)
  useEffect(() => {
    if (!open) return
    setSubject(subjectId ?? arbeit?.subject ?? HELP_SUBJECTS[0].id)
    setTitle(arbeit?.title ?? '')
    setDate(arbeit?.date ?? '')
    setDeckIds(arbeit?.deckIds ?? (presetDeckId ? [presetDeckId] : []))
  }, [open, subjectId, arbeit, presetDeckId])

  // Wählbar: eigene Stapel des Fachs; bei Französisch auch Kurs-Einheiten
  const choices: Deck[] = useMemo(() => {
    const own = sets.map(ownDeck).filter((d) => d.subject === subject)
    const course = subject === FRENCH ? allCourseDecks().filter((d) => (addedUnits ?? []).includes(d.id.slice(5))) : []
    return [...own, ...course]
  }, [sets, addedUnits, subject])

  const subjectName = HELP_SUBJECTS.find((s) => s.id === subject)?.name ?? ''
  const valid = date !== '' && deckIds.length > 0
  const toggle = (id: string) => setDeckIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))

  const save = () => {
    const data = { subject, title: title.trim() || `${subjectName}-Arbeit`, date, deckIds }
    if (arbeit) updateArbeit(arbeit.id, data)
    else addArbeit(data)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={arbeit ? 'Arbeit bearbeiten' : 'Arbeit eintragen'}>
      <div className="grid gap-4">
        {!subjectId && !arbeit && (
          <label className="grid gap-1.5 text-sm font-bold text-muted">
            Fach
            <select
              className={field}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                setDeckIds([])
              }}
            >
              {HELP_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1.5 text-sm font-bold text-muted">
          Name (optional)
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${subjectName}-Arbeit`} maxLength={60} />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-muted">
          Wann ist die Arbeit?
          <input type="date" className={field} value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">Welche Stapel gehören dazu?</p>
          {choices.length === 0 ? (
            <p className="rounded-xl bg-snow p-3 text-sm text-muted">In {subjectName} gibt es noch keine Stapel. Erstelle zuerst einen Stapel, dann kannst du ihn hier auswählen.</p>
          ) : (
            <ul className="grid gap-2">
              {choices.map((d) => {
                const on = deckIds.includes(d.id)
                return (
                  <li key={d.id}>
                    <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(d.id)} className={`tile w-full ${on ? 'tile-selected' : ''}`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-current text-[13px] ${on ? 'bg-sky text-white' : ''}`}>{on ? '✓' : ''}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{d.title}</span>
                        <span className="block text-xs font-medium opacity-70">{d.items.length} Karten</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <p className="rounded-xl bg-snow p-3 text-sm text-muted">Die App verteilt die Karten so auf die Tage, dass du alles rechtzeitig gesehen hast. Der letzte Tag bleibt zum Wiederholen frei.</p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" className="btn btn-primary press w-full sm:w-56" disabled={!valid} onClick={save}>
            Speichern
          </button>
          {arbeit && (
            <button
              type="button"
              className="btn btn-ghost press w-full !text-bad-dark sm:w-44"
              onClick={() => {
                removeArbeit(arbeit.id)
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
