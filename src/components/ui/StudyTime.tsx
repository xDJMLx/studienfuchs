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
    <Link to={`/ueben/los?arbeit=${st.arbeit.id}`} className="panel press mb-5 flex items-center gap-3 p-3" aria-label="Lernzeit heute">
      <ProgressRing pct={st.pct} size={44} stroke={5} color={st.reached ? 'var(--good)' : 'var(--sky)'} track="var(--line)">
        {st.reached ? <Check size={20} className="text-good" /> : <span className="text-[13px] font-black tabular-nums">{Math.floor(st.minutes)}</span>}
      </ProgressRing>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight">{st.reached ? 'Heute geschafft' : `${st.target} Minuten für ${st.arbeit.title}`}</span>
        <span className="block text-[13px] text-muted">
          {st.reached ? `${minutesText(st.minutes)} geübt · Arbeit ${dayWord(st.days)}` : `${minutesText(st.minutes)} von ${st.target}${st.minutes > 0 ? `, noch ${minutesText(left)}` : ''} · Arbeit ${dayWord(st.days)}`}
        </span>
      </span>
    </Link>
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
