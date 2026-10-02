import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Close, Plus, Right, Target } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { ProgressBar } from '../../components/ui/widgets'
import { catchUpStatus, unitLabel } from '../../lib/catchup'
import { daysTo } from '../../lib/coach'
import { dayKey } from '../../lib/streak'
import { useStore } from '../../store/useStore'

const dayText = (days: number) => (days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`)

/**
 * Plan: wo steht die Klasse im Buch (Aufholen), welche Klassenarbeiten stehen an, und alle eigenen Listen an einem Ort.
 * Alles hier gab es schon, war aber über die App verstreut.
 */
export function PlanPage() {
  const { classUnit, catchUpTarget, lessons, sets, examDates, setExamDate } = useStore()
  const status = classUnit && catchUpTarget ? catchUpStatus(classUnit, catchUpTarget, lessons) : null
  const now = new Date()

  const exams = useMemo(
    () =>
      Object.entries(examDates)
        .map(([id, date]) => ({ set: sets.find((s) => s.id === id), date, days: daysTo(date, new Date()) }))
        .filter((e): e is { set: NonNullable<typeof e.set>; date: string; days: number } => !!e.set && e.days >= 0)
        .sort((a, b) => a.days - b.days),
    [examDates, sets],
  )

  const [pickSet, setPickSet] = useState('')
  const [pickDate, setPickDate] = useState('')
  const [adding, setAdding] = useState(false)
  const addExam = () => {
    if (!pickSet || !pickDate) return
    setExamDate(pickSet, pickDate)
    setPickSet('')
    setPickDate('')
    setAdding(false)
  }

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8" stagger={0.07}>
      <Item>
        <h1 className="page-title">Plan</h1>
        <p className="mb-6 mt-1 text-muted">Klassenstand, Klassenarbeiten und deine Listen auf einen Blick.</p>
      </Item>

      {/* Klassenstand / Aufholen */}
      <Item>
        <h2 className="mb-2 text-lg font-semibold">Klassenstand</h2>
        <Link to="/catchup" className="card lift flex items-center gap-4 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
            <Target size={24} />
          </span>
          <span className="min-w-0 flex-1">
            {classUnit ? (
              <>
                <span className="block truncate font-semibold">{unitLabel(classUnit)}</span>
                {status && !status.finished ? (
                  <>
                    <span className="block text-sm text-muted">
                      Noch {status.remaining} Lektionen bis {new Date(catchUpTarget!).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}, heute {status.toGoToday}.
                    </span>
                    <ProgressBar pct={status.total ? (status.total - status.remaining) / status.total : 1} className="mt-2" />
                  </>
                ) : (
                  <span className="block text-sm text-muted">{status?.finished ? 'Du bist auf dem Stand deiner Klasse.' : 'Aufholplan anlegen oder Stand ändern.'}</span>
                )}
              </>
            ) : (
              <>
                <span className="block font-semibold">Wo ist deine Klasse im Buch?</span>
                <span className="block text-sm text-muted">Sag es der App, und sie macht dir einen Tagesplan zum Aufholen.</span>
              </>
            )}
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </Link>
      </Item>

      {/* Klassenarbeiten */}
      <Item className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Klassenarbeiten</h2>
          {sets.length > 0 && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="press flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold">
              <Plus size={16} /> Termin
            </button>
          )}
        </div>

        {adding && (
          <div className="card mb-3 grid gap-3 p-4">
            <label className="grid gap-1 text-sm font-medium">
              Welche Liste kommt dran?
              <select value={pickSet} onChange={(e) => setPickSet(e.target.value)} className="rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none focus:border-brand">
                <option value="">Liste wählen …</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Wann ist die Arbeit?
              <input type="date" min={dayKey(now)} value={pickDate} onChange={(e) => setPickDate(e.target.value)} className="rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none focus:border-brand" />
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost press" onClick={() => setAdding(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary press flex-1" disabled={!pickSet || !pickDate} onClick={addExam}>
                Eintragen
              </button>
            </div>
          </div>
        )}

        {exams.length === 0 ? (
          <p className="rounded-2xl bg-snow p-4 text-sm text-muted">
            {sets.length === 0 ? (
              <>
                Noch keine Termine. Lass dir in der KI einen Vokabeltest aus deinen Buchseiten bauen, dann kannst du hier das Datum der Klassenarbeit eintragen und die App verteilt die Wörter auf die Tage.{' '}
                <Link to="/coach" className="font-semibold text-brand-dark underline">
                  Zur KI
                </Link>
              </>
            ) : (
              'Noch keine Termine. Mit „Termin“ trägst du eine Klassenarbeit ein, und die App verteilt die Wörter der Liste auf die Tage davor.'
            )}
          </p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {exams.map((e) => (
              <li key={e.set.id} className="flex items-center gap-2 pr-2">
                <Link to={`/sets/${e.set.id}`} className="press flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <span className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-center leading-none ${e.days <= 2 ? 'bg-bad-soft text-bad-dark' : 'bg-brand-soft text-brand-dark'}`}>
                    <span className="text-lg font-bold">{e.days}</span>
                    <span className="text-[10px] font-semibold">{e.days === 1 ? 'Tag' : 'Tage'}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.set.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {dayText(e.days)} · {new Date(e.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })} · {e.set.items.length} Wörter
                    </span>
                  </span>
                </Link>
                <button type="button" aria-label={`Termin für ${e.set.title} löschen`} onClick={() => setExamDate(e.set.id, null)} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-bad">
                  <Close size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Item>

      {/* Eigene Listen */}
      <Item className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Listen</h2>
          <Link to="/sets/new" className="press flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold">
            <Plus size={16} /> Neue Liste
          </Link>
        </div>
        {sets.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl bg-snow p-4">
            <Mascot size={56} mood="think" blink />
            <p className="text-sm text-muted">
              Hier liegen die Vokabeltests, die die KI aus deinen Buchseiten baut, und Listen, die du selbst tippst.{' '}
              <Link to="/coach" className="font-semibold text-brand-dark underline">
                Seiten in die KI laden
              </Link>
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {sets.map((st) => (
              <li key={st.id}>
                <Link to={`/sets/${st.id}`} className="press flex items-center gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-bold text-brand-dark">{st.title.trim().charAt(0).toUpperCase() || '?'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{st.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {st.items.length} Wörter{st.book ? ` · ${st.book}` : ''}
                      {examDates[st.id] ? ` · Arbeit am ${new Date(examDates[st.id]).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}.` : ''}
                    </span>
                  </span>
                  <Right size={16} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Item>
    </Stagger>
  )
}
