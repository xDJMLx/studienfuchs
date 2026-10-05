import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/ui/Sheet'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { dateKey, defaultMinutes, KINDS, longDay, quickDates, toMinutes } from '../../lib/calendar'
import { allCourseDecks, cardRefs, FRENCH, ownDeck, type Deck } from '../../lib/decks'
import { periodsOf, slotForPeriods } from '../../lib/school'
import { helpSubject, HELP_SUBJECTS } from '../../lib/subjects'
import type { Arbeit, ArbeitKind } from '../../lib/types'
import { useStore } from '../../store/useStore'

const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 font-semibold outline-none transition-colors focus:border-sky'

/**
 * Arbeit, Test oder anderen Termin eintragen oder ändern: Fach, Art, Tag, Karteikarten.
 * Unten steht gleich, was das für die Tage bis dahin bedeutet.
 */
export function ArbeitSheet({ open, onClose, subjectId, arbeit, presetDeckId, date: presetDate, time: presetTime, duration: presetDuration }: { open: boolean; onClose: () => void; subjectId?: string; arbeit?: Arbeit; presetDeckId?: string; date?: string; time?: string; duration?: number }) {
  const { sets, addedUnits, mySubjects, cards, addArbeit, updateArbeit, removeArbeit } = useStore()
  const firstSubject = subjectId ?? arbeit?.subject ?? mySubjects?.[0] ?? HELP_SUBJECTS[0].id
  const [kind, setKind] = useState<ArbeitKind>(arbeit?.kind ?? 'klassenarbeit')
  const [subject, setSubject] = useState(firstSubject)
  const [title, setTitle] = useState(arbeit?.title ?? '')
  const [date, setDate] = useState(arbeit?.date ?? presetDate ?? '')
  const [time, setTime] = useState(arbeit?.time ?? presetTime ?? '')
  const [duration, setDuration] = useState<number | null>(arbeit?.duration ?? presetDuration ?? null)
  const periods = useStore((s) => s.schoolPeriods) ?? []
  // "Andere Uhrzeit": freie Eingabe statt Schulstunden (auch, wenn der Termin nicht zum Raster passt)
  const [freeTime, setFreeTime] = useState(false)
  // Gibt es im Fach genau einen Satz Karteikarten, ist er gleich dabei
  const onlyDeck = (subj: string): string[] => {
    const own = sets.map(ownDeck).filter((d) => d.subject === subj)
    return own.length === 1 ? [own[0].id] : []
  }
  const [deckIds, setDeckIds] = useState<string[]>(arbeit?.deckIds ?? (presetDeckId ? [presetDeckId] : onlyDeck(firstSubject)))

  // Beim Öffnen frisch starten (oder die gewählte Arbeit laden)
  useEffect(() => {
    if (!open) return
    setKind(arbeit?.kind ?? 'klassenarbeit')
    setSubject(subjectId ?? arbeit?.subject ?? mySubjects?.[0] ?? HELP_SUBJECTS[0].id)
    setTitle(arbeit?.title ?? '')
    setDate(arbeit?.date ?? presetDate ?? '')
    setTime(arbeit?.time ?? presetTime ?? '')
    setDuration(arbeit?.duration ?? presetDuration ?? null)
    setFreeTime(false)
    setDeckIds(arbeit?.deckIds ?? (presetDeckId ? [presetDeckId] : onlyDeck(subjectId ?? mySubjects?.[0] ?? HELP_SUBJECTS[0].id)))
    // mySubjects bewusst nicht als Abhängigkeit: Das Blatt soll beim Öffnen starten, nicht bei jeder Änderung
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subjectId, arbeit, presetDeckId, presetDate, presetTime, presetDuration])

  // Wählbar: eigene Stapel des Fachs; bei Französisch auch hinzugefügte Kurs-Einheiten
  const choices: Deck[] = useMemo(() => {
    const own = sets.map(ownDeck).filter((d) => d.subject === subject)
    const course = subject === FRENCH ? allCourseDecks().filter((d) => (addedUnits ?? []).includes(d.id.slice(5))) : []
    return [...own, ...course]
  }, [sets, addedUnits, subject])

  const sub = helpSubject(subject)
  const today = dateKey(new Date())
  // Ein Termin geht auch ohne Karteikarten (dann steht er nur im Kalender)
  const valid = date !== ''
  const toggle = (id: string) => setDeckIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const subjects = useMemo(() => {
    // Nur die eigenen Fächer (die pflegt man in den Einstellungen) plus „Anderes Fach“; ohne Auswahl alle
    const mine = [...new Set([...(mySubjects ?? []), ...sets.map((x) => ownDeck(x).subject), subject])].filter((id) => helpSubject(id))
    if (mine.length === 0) return HELP_SUBJECTS
    const chosen = mine.map((id) => helpSubject(id)!)
    const other = helpSubject('sonstiges')
    return other && !mine.includes('sonstiges') ? [...chosen, other] : chosen
  }, [mySubjects, sets, subject])

  // Was bedeutet das für die Tage bis dahin?
  const plan = useMemo(() => {
    if (!date || deckIds.length === 0) return null
    const refs = cardRefs(choices.filter((d) => deckIds.includes(d.id)))
    const unseen = refs.filter((r) => !cards[r.item.id]?.reps).length
    const days = Math.round((new Date(date + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86_400_000)
    return { total: refs.length, unseen, days, perDay: days <= 1 ? unseen : Math.ceil(unseen / Math.max(1, days - 1)) }
  }, [date, deckIds, choices, cards, today])

  const save = () => {
    const kindName = KINDS.find((k) => k.id === kind)?.label ?? 'Arbeit'
    const hasTime = toMinutes(time) !== null
    const data = {
      subject,
      kind,
      title: title.trim() || `${sub?.name ?? ''}-${kindName}`.replace(/^-/, ''),
      date,
      deckIds,
      ...(hasTime ? { time, duration: duration ?? defaultMinutes(kind) } : { time: undefined, duration: undefined }),
    }
    if (arbeit) updateArbeit(arbeit.id, data)
    else addArbeit(data)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={arbeit ? 'Termin bearbeiten' : 'Arbeit eintragen'}>
      <div className="grid gap-5">
        {!subjectId && !arbeit?.subject && (
          <div>
            <p className="mb-1.5 text-sm font-bold text-muted">In welchem Fach?</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Fach">
              {subjects.map((s) => {
                const on = subject === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setSubject(s.id)
                      setDeckIds(onlyDeck(s.id))
                    }}
                    className={`press flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition-colors ${on ? 'border-sky bg-sky-soft' : 'border-line bg-surface'}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: s.c }}>
                      <HelpSubjectIcon id={s.id} ink={s.c} size={22} />
                    </span>
                    <span className="max-w-full truncate text-[12px] font-extrabold">{s.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">Was steht an?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Art des Termins">
            {KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)} className={`chip ${kind === k.id ? 'chip-on' : ''}`}>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">Wann?</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {quickDates().map((q) => (
              <button key={q.key} type="button" onClick={() => setDate(q.key)} className={`chip ${date === q.key ? 'chip-on' : ''}`}>
                {q.label}
              </button>
            ))}
          </div>
          <input type="date" aria-label="Datum" className={field} value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          {date && <p className="mt-1.5 text-sm font-extrabold text-brand-dark">{longDay(date)}</p>}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">{periods.length > 0 && !freeTime ? 'Welche Stunde? (optional)' : 'Uhrzeit (optional)'}</p>
          {periods.length > 0 && !freeTime ? (
            <PeriodPicker
              periods={periods}
              time={time}
              duration={duration ?? defaultMinutes(kind)}
              onPick={(from, to) => {
                if (from === null) return setTime('')
                const sl = slotForPeriods(periods, from, to ?? from)
                setTime(sl.time)
                setDuration(sl.duration)
              }}
              onFree={() => setFreeTime(true)}
              kind={kind}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" role="radio" aria-checked={toMinutes(time) === null} onClick={() => setTime('')} className={`chip ${toMinutes(time) === null ? 'chip-on' : ''}`}>
                Ganztägig
              </button>
              <input type="time" aria-label="Uhrzeit" step={300} className={`${field} !w-32`} value={time} onChange={(e) => setTime(e.target.value)} />
              {toMinutes(time) !== null &&
                [20, 45, 90].map((m) => {
                  const on = (duration ?? defaultMinutes(kind)) === m
                  return (
                    <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setDuration(m)} className={`chip ${on ? 'chip-on' : ''}`}>
                      {m} Min.
                    </button>
                  )
                })}
              {periods.length > 0 && (
                <button type="button" className="chip" onClick={() => setFreeTime(false)}>
                  Schulstunden
                </button>
              )}
            </div>
          )}
        </div>

        <label className="grid gap-1.5 text-sm font-bold text-muted">
          Name (optional)
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Genetik" maxLength={60} />
        </label>

        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">Welche Karteikarten gehören dazu?</p>
          {choices.length === 0 ? (
            <p className="rounded-xl bg-snow p-3 text-sm text-muted">
              In {sub?.name} gibt es noch keine Karteikarten.{' '}
              <Link to={`/stapel/neu?fach=${subject}`} onClick={onClose} className="font-extrabold text-sky-dark underline">
                Karteikarten erstellen
              </Link>
            </p>
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

        {plan && (
          <p className="rounded-xl bg-good-soft p-3 text-sm font-semibold text-good-dark" role="status">
            {plan.days <= 0
              ? `Das ist heute: ${plan.total} Karten, ${plan.unseen} davon noch neu. Heute zählt Wiederholen.`
              : plan.unseen === 0
                ? `Alle ${plan.total} Karten hast du schon gesehen. Die App wiederholt sie rechtzeitig vor dem Termin.`
                : `Noch ${plan.unseen} neue Karten in ${plan.days} ${plan.days === 1 ? 'Tag' : 'Tagen'}: ca. ${plan.perDay} neue pro Tag. Der letzte Tag bleibt zum Wiederholen.`}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" className="btn btn-primary press w-full sm:w-56" disabled={!valid} onClick={save}>
            {arbeit ? 'Speichern' : 'Eintragen'}
          </button>
          {arbeit && (
            <Link to={`/test/neu?arbeit=${arbeit.id}`} onClick={onClose} className="btn btn-ghost press w-full sm:w-auto">
              Probearbeit erstellen
            </Link>
          )}
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
        {!valid ? <p className="-mt-2 text-center text-xs text-muted">Wähle einen Tag.</p> : deckIds.length === 0 && choices.length > 0 ? <p className="-mt-2 text-center text-xs text-muted">Ohne Karteikarten steht der Termin nur im Kalender.</p> : null}
      </div>
    </Sheet>
  )
}

/** Stunden wählen: "Ganztägig", dann die erste Stunde, dann (wenn mehr als eine) bis zu welcher. Passt der Termin nicht zum Raster, bleibt die freie Uhrzeit. */
function PeriodPicker({
  periods,
  time,
  duration,
  kind,
  onPick,
  onFree,
}: {
  periods: { start: string; end: string }[]
  time: string
  duration: number
  kind: ArbeitKind
  onPick: (from: number | null, to?: number) => void
  onFree: () => void
}) {
  const sel = toMinutes(time) === null ? null : periodsOf(periods, { id: '', subject: '', title: '', date: '', deckIds: [], kind, time, duration })
  const hasTime = toMinutes(time) !== null
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Von Stunde">
        <button type="button" role="radio" aria-checked={!hasTime} onClick={() => onPick(null)} className={`chip ${!hasTime ? 'chip-on' : ''}`}>
          Ganztägig
        </button>
        {periods.map((p, i) => {
          const on = sel ? i === sel.from : false
          return (
            <button key={i} type="button" role="radio" aria-checked={on} aria-label={`${i + 1}. Stunde, ${p.start} bis ${p.end}`} onClick={() => onPick(i, sel && sel.to >= i ? sel.to : i)} className={`chip !min-w-11 justify-center ${on ? 'chip-on' : ''}`}>
              {i + 1}.
            </button>
          )
        })}
      </div>
      {sel && sel.from < periods.length - 1 && (
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Bis Stunde">
          <span className="text-sm font-bold text-muted">bis</span>
          {periods.slice(sel.from).map((_, k) => {
            const i = sel.from + k
            const on = i === sel.to
            return (
              <button key={i} type="button" role="radio" aria-checked={on} aria-label={`bis ${i + 1}. Stunde`} onClick={() => onPick(sel.from, i)} className={`chip !min-w-11 justify-center ${on ? 'chip-on' : ''}`}>
                {i + 1}.
              </button>
            )
          })}
        </div>
      )}
      {sel && (
        <p className="text-sm font-extrabold text-brand-dark">
          {sel.from === sel.to ? `${sel.from + 1}. Stunde` : `${sel.from + 1}. bis ${sel.to + 1}. Stunde`}, {periods[sel.from].start} bis {periods[sel.to].end} Uhr
        </p>
      )}
      {hasTime && !sel && <p className="text-sm text-muted">Diese Uhrzeit passt zu keiner Stunde.</p>}
      <button type="button" onClick={onFree} className="press -ml-1 w-fit rounded-xl px-1 py-1 text-sm font-extrabold text-sky-dark">
        Andere Uhrzeit eingeben
      </button>
    </div>
  )
}
