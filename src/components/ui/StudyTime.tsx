import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { activeDecks } from '../../lib/decks'
import { minutesText, studyToday } from '../../lib/studyTime'
import { useStore } from '../../store/useStore'
import { Check } from './Icons'
import { ProgressRing } from './widgets'

const dayWord = (n: number) => (n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen`)

function useStudyToday() {
  const arbeiten = useStore((s) => s.arbeiten)
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const minutesByDay = useStore((s) => s.minutesByDay)
  const dailyMinutes = useStore((s) => s.dailyMinutes)
  return useMemo(
    () => studyToday({ arbeiten: arbeiten ?? [], decks: activeDecks({ sets, addedUnits: addedUnits ?? [] }), minutesByDay: minutesByDay ?? {}, dailyMinutes: dailyMinutes ?? 10 }),
    [arbeiten, sets, addedUnits, minutesByDay, dailyMinutes],
  )
}

/**
 * Lernzeit für heute: Steht eine Arbeit an, sind es jeden Tag ein paar Minuten (Standard zehn).
 * Ohne Arbeit gibt es kein Tagesziel, die Karte erscheint dann gar nicht.
 */
export function StudyTimeCard() {
  const st = useStudyToday()
  if (!st) return null
  const left = Math.max(0, Math.round((st.target - st.minutes) * 10) / 10)
  return (
    <section className="card mb-5 flex items-center gap-4 p-4" aria-label="Lernzeit heute">
      <ProgressRing pct={st.pct} size={64} stroke={7} color={st.reached ? 'var(--good)' : 'var(--sky)'} track="var(--line)">
        {st.reached ? <Check size={26} className="text-good" /> : <span className="text-[15px] font-black tabular-nums">{Math.floor(st.minutes)}</span>}
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-extrabold leading-tight">{st.reached ? 'Heute geschafft' : `${st.target} Minuten für ${st.arbeit.title}`}</p>
        <p className="mt-0.5 text-sm text-muted">
          {st.reached
            ? `${minutesText(st.minutes)} geübt. Die Arbeit ist ${dayWord(st.days)}: Mehr geht immer.`
            : `${minutesText(st.minutes)} von ${st.target}${st.minutes > 0 ? `, noch ${minutesText(left)}` : ''}. Die Arbeit ist ${dayWord(st.days)}.`}
        </p>
        {!st.reached && (
          <Link to={`/ueben/los?arbeit=${st.arbeit.id}`} className="btn btn-primary press mt-2 !min-h-10 !px-4 !text-sm">
            Jetzt lernen
          </Link>
        )}
      </div>
    </section>
  )
}

/** Kurze Zeile auf dem Ergebnis: wie weit die Lernzeit von heute ist. Nur wenn eine Arbeit ansteht. */
export function StudyTimeNote() {
  const st = useStudyToday()
  if (!st) return null
  return (
    <p className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2 font-semibold ${st.reached ? 'bg-good-soft text-good-dark' : 'bg-sky-soft text-sky-dark'}`} role="status">
      {st.reached ? <Check size={18} /> : null}
      {st.reached ? `Lernzeit für heute geschafft (${minutesText(st.minutes)})` : `Lernzeit heute: ${minutesText(st.minutes)} von ${st.target}`}
    </p>
  )
}
