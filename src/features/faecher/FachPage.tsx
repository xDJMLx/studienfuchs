import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Segmented } from '../../components/ui/controls'
import { Back, Check, Plus, Right, Sparkle } from '../../components/ui/Icons'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { activeDecks, allCourseDecks, daysUntil, FRENCH, ownDeck, planToday, readiness } from '../../lib/decks'
import { masteryOf } from '../../lib/srs'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { GrammarPage } from '../grammar/GrammarPage'
import { WordsPage } from '../words/WordsPage'
import { ArbeitSheet } from './ArbeitSheet'

const when = (days: number) => (days < 0 ? 'vorbei' : days === 0 ? 'Heute' : days === 1 ? 'Morgen' : `in ${days} Tagen`)

/** Ein Fach: Stapel, Arbeiten und KI-Hilfe. Bei Französisch dazu die fertigen Stapel aus dem Kurs und Nachschlagen. */
export function FachPage() {
  const { subjectId = '' } = useParams()
  const subject = helpSubject(subjectId)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const arbeiten = useStore((s) => s.arbeiten)
  const cards = useStore((s) => s.cards)
  const toggleUnit = useStore((s) => s.toggleUnit)
  const [sheet, setSheet] = useState<{ arbeit?: Arbeit } | null>(null)

  const isFrench = subjectId === FRENCH
  const tab = params.get('tab') === 'nachschlagen' && isFrench ? 'nachschlagen' : 'stapel'
  const own = useMemo(() => sets.map(ownDeck).filter((d) => d.subject === subjectId), [sets, subjectId])
  const allActive = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const plan = useMemo(() => planToday(allActive.filter((d) => d.subject === subjectId), arbeiten ?? [], cards), [allActive, subjectId, arbeiten, cards])
  const mine = useMemo(() => (arbeiten ?? []).filter((a) => a.subject === subjectId).map((a) => ({ a, days: daysUntil(a), r: readiness(a, allActive, cards) })).sort((x, y) => x.days - y.days), [arbeiten, subjectId, allActive, cards])
  if (!subject) return <Navigate to="/faecher" replace />

  const course = isFrench ? allCourseDecks() : []
  const grades = [...new Set(course.map((d) => d.sub?.split(' ')[1]))].filter(Boolean) as string[]
  const strength = (items: { id: string }[]) => {
    const solid = items.filter((i) => masteryOf(cards[i.id]) === 2).length
    return items.length ? Math.round((solid / items.length) * 100) : 0
  }

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-5 lg:py-8" stagger={0.06}>
      <Item>
        <Link to="/faecher" className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
          <Back size={18} /> Fächer
        </Link>
        <div className="mb-4 flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: subject.c, boxShadow: `0 4px 0 ${subject.s}` }} aria-hidden>
            <HelpSubjectIcon id={subject.id} ink={subject.c} size={34} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="page-title">{subject.name}</h1>
            <p className="text-sm text-muted">{subject.blurb}</p>
          </div>
        </div>
      </Item>

      {isFrench && (
        <Item>
          <Segmented
            label="Bereich"
            className="mb-5 w-full [&>button]:flex-1 [&>button]:py-2"
            value={tab}
            onChange={(v) => setParams(v === 'stapel' ? {} : { tab: v }, { replace: true })}
            options={[
              { value: 'stapel', label: 'Stapel' },
              { value: 'nachschlagen', label: 'Nachschlagen' },
            ]}
          />
        </Item>
      )}

      {tab === 'nachschlagen' ? (
        <NachschlagenTab />
      ) : (
        <>
          {plan.due.length + plan.fresh.length > 0 && (
            <Item>
              <button type="button" className="press mb-5 flex w-full items-center gap-3 rounded-2xl bg-sky px-4 py-3 text-left text-white" style={{ boxShadow: '0 4px 0 var(--shade-sky)' }} onClick={() => navigate(`/ueben/los?fach=${subjectId}`)}>
                <span className="min-w-0 flex-1 font-extrabold">
                  {subject.name} üben
                  <span className="block text-sm font-bold opacity-90">
                    {plan.due.length > 0 && `${plan.due.length} fällig`}
                    {plan.due.length > 0 && plan.fresh.length > 0 && ' · '}
                    {plan.fresh.length > 0 && `${plan.fresh.length} neu`}
                  </span>
                </span>
                <Right size={16} />
              </button>
            </Item>
          )}

          <Item>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Stapel</h2>
              <Link to={`/stapel/neu?fach=${subjectId}`} className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft">
                <Plus size={16} /> Neuer Stapel
              </Link>
            </div>
            {own.length === 0 ? (
              <Link to={`/stapel/neu?fach=${subjectId}`} className="card press mb-5 flex items-center gap-4 border-dashed p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"><Sparkle size={24} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">Erstelle deinen ersten Stapel</span>
                  <span className="block text-sm text-muted">Schreib, was du brauchst. Die KI macht die Karten, oder du schreibst sie selbst.</span>
                </span>
                <Right size={16} className="text-muted" />
              </Link>
            ) : (
              <StaggerList className="mb-5 grid gap-2.5" stagger={0.04}>
                {own.map((d) => {
                  const due = d.items.filter((i) => cards[i.id] && new Date(cards[i.id].due) <= new Date()).length
                  const fresh = d.items.filter((i) => !cards[i.id]?.reps).length
                  const pct = strength(d.items)
                  return (
                    <ItemLi key={d.id}>
                      <Link to={`/stapel/${d.id}`} className="card press flex items-center gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-extrabold leading-tight">{d.title}</p>
                          <p className="text-sm text-muted">{d.items.length} Karten{due > 0 ? ` · ${due} fällig` : ''}{fresh > 0 ? ` · ${fresh} neu` : ''}</p>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} /></div>
                        </div>
                        <Right size={16} className="shrink-0 text-muted" />
                      </Link>
                    </ItemLi>
                  )
                })}
              </StaggerList>
            )}
          </Item>

          {isFrench && (
            <Item>
              <h2 className="mb-1 text-lg font-extrabold">Fertige Stapel aus dem Kurs</h2>
              <p className="mb-3 text-sm text-muted">Wortschatz nach Themen für Klasse 7 bis 10, mit Beispielsätzen und Aufnahmen. Füge hinzu, was ihr im Unterricht durchnehmt: Die Karten kommen dann Tag für Tag nach Plan dran.</p>
              {grades.map((g) => (
                <div key={g} className="mb-4">
                  <p className="eyebrow mb-1.5">Klasse {g}</p>
                  <ul className="card divide-y divide-line overflow-hidden">
                    {course.filter((d) => d.sub?.split(' ')[1] === g).map((d) => {
                      const on = (addedUnits ?? []).includes(d.id.slice(5))
                      return (
                        <li key={d.id} className="flex items-center gap-2 pr-2">
                          <Link to={`/stapel/${d.id}`} className="press flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-bold">{d.title}</span>
                              <span className="block text-xs text-muted">{d.items.length} Karten{d.sub?.includes('Zusatz') ? ' · Zusatz' : ''}</span>
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleUnit(d.id.slice(5))}
                            aria-pressed={on}
                            aria-label={on ? `${d.title} entfernen` : `${d.title} hinzufügen`}
                            className={`press flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-extrabold ${on ? 'bg-good-soft text-good-dark' : 'bg-snow text-sky-dark hover:bg-sky-soft'}`}
                          >
                            {on ? <><Check size={14} /> Dabei</> : <><Plus size={14} /> Hinzufügen</>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </Item>
          )}

          <Item>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Arbeiten</h2>
              <button type="button" className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft" onClick={() => setSheet({})}>
                <Plus size={16} /> Arbeit eintragen
              </button>
            </div>
            {mine.length === 0 ? (
              <p className="mb-5 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">Noch keine Arbeit eingetragen. Mit Datum verteilt die App die Karten auf die Tage bis zur Arbeit.</p>
            ) : (
              <ul className="mb-5 grid gap-2.5">
                {mine.map(({ a, days, r }) => (
                  <li key={a.id}>
                    <button type="button" className="card press flex w-full items-center gap-3 p-3.5 text-left" onClick={() => setSheet({ arbeit: a })}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold leading-tight">{a.title}</p>
                        <p className={`text-sm font-bold ${days >= 0 && days <= 2 ? 'text-bad-dark' : 'text-muted'}`}>{when(days)} · {r.solid} von {r.total} Karten sitzen</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-good" style={{ width: `${r.pct}%` }} /></div>
                      </div>
                      <Right size={16} className="shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Item>

          <Item>
            <Link to={`/faecher/${subjectId}/ki`} className="card lift group flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-soft text-violet-dark"><Sparkle size={22} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">KI-Hilfe in {subject.name}</span>
                <span className="block text-sm text-muted">{isFrench ? 'Fragen stellen, Buchseiten hochladen, Vokabeltests bauen lassen.' : 'Stoff erklären lassen, abgefragt werden, Arbeit vorbereiten.'}</span>
              </span>
              <Right size={16} className="shrink-0 text-muted" />
            </Link>
          </Item>
        </>
      )}

      <ArbeitSheet open={!!sheet} onClose={() => setSheet(null)} subjectId={subjectId} arbeit={sheet?.arbeit} />
    </Stagger>
  )
}

/** Französisch nachschlagen: Wörterbuch und Grammatik, dazu Klassenarbeiten von der KI. */
function NachschlagenTab() {
  const [part, setPart] = useState<'woerter' | 'grammatik'>('woerter')
  return (
    <Item>
      <Segmented
        label="Nachschlagen"
        className="mb-4 w-full [&>button]:flex-1 [&>button]:py-2"
        value={part}
        onChange={setPart}
        options={[
          { value: 'woerter' as const, label: 'Wörter' },
          { value: 'grammatik' as const, label: 'Grammatik' },
        ]}
      />
      {part === 'woerter' ? <WordsPage embedded /> : <GrammarPage embedded />}
      <Link to="/exam/new" className="card lift mt-5 flex items-center gap-4 p-4">
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Test oder Klassenarbeit von der KI</span>
          <span className="block text-sm text-muted">Kurztest aus deinen Karten oder eine ganze Arbeit mit Hören, Wortschatz, Grammatik und Text.</span>
        </span>
        <Right size={16} className="shrink-0 text-muted" />
      </Link>
    </Item>
  )
}
