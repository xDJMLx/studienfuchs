import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Segmented } from '../../components/ui/controls'
import { Back, Check, Plus, Right, Sparkle, Star } from '../../components/ui/Icons'
import { BackLink } from '../../components/ui/BackLink'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { activeDecks, allCourseDecks, daysUntil, FRENCH, ownDeck, planToday, readiness } from '../../lib/decks'
import { deckStars, subjectStats } from '../../lib/progress'
import { masteryOf } from '../../lib/srs'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'
import { skillsOf } from '../../content/formulas'
import { taskCount, testKindLabel } from '../../lib/tests'
import { useStore } from '../../store/useStore'
import { GrammarPage } from '../grammar/GrammarPage'
import { WordsPage } from '../words/WordsPage'
import { ArbeitSheet } from './ArbeitSheet'
import { TemplateList } from './TemplateList'
import { templatesFor } from '../../content/templates'

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
  const tests = useStore((s) => s.tests) ?? []
  const testResults = useStore((s) => s.testResults) ?? []
  const subjectTests = tests.filter((t) => t.subject === subjectId)
  const toggleUnit = useStore((s) => s.toggleUnit)
  const mySubjects = useStore((s) => s.mySubjects)
  const toggleSubject = useStore((s) => s.toggleSubject)
  const [sheet, setSheet] = useState<{ arbeit?: Arbeit } | null>(null)

  const isFrench = subjectId === FRENCH
  const rawTab = params.get('tab')
  const tab: 'karten' | 'tests' | 'mehr' | 'nachschlagen' = rawTab === 'nachschlagen' && isFrench ? 'nachschlagen' : rawTab === 'tests' || rawTab === 'mehr' ? rawTab : 'karten'
  const setTab = (v: string) => setParams(v === 'karten' ? {} : { tab: v }, { replace: true })
  const own = useMemo(() => sets.map(ownDeck).filter((d) => d.subject === subjectId), [sets, subjectId])
  const allActive = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])
  const plan = useMemo(() => planToday(allActive.filter((d) => d.subject === subjectId), arbeiten ?? [], cards), [allActive, subjectId, arbeiten, cards])
  const mine = useMemo(() => (arbeiten ?? []).filter((a) => a.subject === subjectId).map((a) => ({ a, days: daysUntil(a), r: readiness(a, allActive, cards) })).sort((x, y) => x.days - y.days), [arbeiten, subjectId, allActive, cards])
  if (!subject) return <Navigate to="/" replace />
  const stat = subjectStats(allActive, cards)[subjectId]
  const isMine = (mySubjects ?? []).includes(subjectId)

  const course = isFrench ? allCourseDecks() : []
  const grades = [...new Set(course.map((d) => d.sub?.split(' ')[1]))].filter(Boolean) as string[]
  const strength = (items: { id: string }[]) => {
    const solid = items.filter((i) => masteryOf(cards[i.id]) === 2).length
    return items.length ? Math.round((solid / items.length) * 100) : 0
  }

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-5 lg:py-8" stagger={0.06}>
      <Item>
        <BackLink to="/" label="Üben" size={18} />
        <div className="mb-5 flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: subject.c }} aria-hidden>
            <HelpSubjectIcon id={subject.id} ink={subject.c} size={34} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="page-title">{subject.name}</h1>
            <p className="text-sm text-muted">{stat && stat.total > 0 ? `${stat.solid} von ${stat.total} Karten sitzen` : subject.blurb}</p>
          </div>
        </div>
      </Item>

      {tab !== 'nachschlagen' && (
        <Item>
          <Segmented
            label="Bereich"
            className="mb-5 w-full [&>button]:flex-1 [&>button]:py-2"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'karten', label: 'Karteikarten' },
              { value: 'tests', label: 'Tests' },
              { value: 'mehr', label: 'Mehr' },
            ]}
          />
        </Item>
      )}

      {tab === 'nachschlagen' ? (
        <NachschlagenTab />
      ) : (
        <>
          {tab === 'karten' && (
            <>
          {plan.due.length + plan.fresh.length > 0 && (
            <Item>
              <button type="button" className="press mb-5 flex w-full items-center gap-3 rounded-[14px] bg-brand-strong px-4 py-3 text-left text-on-brand" onClick={() => navigate(`/ueben/los?fach=${subjectId}`)}>
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
              <h2 className="text-lg font-extrabold">Karteikarten</h2>
              <Link to={`/stapel/neu?fach=${subjectId}`} className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft">
                <Plus size={16} /> Neue Karteikarten
              </Link>
            </div>
            {own.length === 0 ? (
              <Link to={`/stapel/neu?fach=${subjectId}`} className="card press mb-5 flex items-center gap-4 border-dashed p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"><Sparkle size={24} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">Erstelle deine ersten Karteikarten</span>
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
                  const stars = deckStars(d, cards)
                  return (
                    <ItemLi key={d.id}>
                      <Link to={`/stapel/${d.id}`} className="card press flex items-center gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-extrabold leading-tight">
                            <span className="truncate">{d.title}</span>
                            <span className="flex shrink-0 text-gold" aria-label={`${stars} von 3 Sternen`}>
                              {[0, 1, 2].map((i) => (
                                <Star key={i} size={14} className={i < stars ? '' : 'opacity-25'} />
                              ))}
                            </span>
                          </p>
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

          {!isFrench && templatesFor(subjectId).length > 0 && (
            <Item>
              <details className="group mb-5 rounded-2xl border border-ink/10">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-bold">
                  <span>
                    Fertige Karteikarten
                    <span className="block text-sm font-normal text-muted">{templatesFor(subjectId).length} Sätze Grundwissen zum Hinzufügen</span>
                  </span>
                  <span className="text-muted transition-transform group-open:rotate-180" aria-hidden>⌄</span>
                </summary>
                <div className="px-3 pb-3">
                  <TemplateList subject={subjectId} />
                </div>
              </details>
            </Item>
          )}

          {isFrench && (
            <Item>
              <h2 className="mb-1 text-lg font-extrabold">Fertige Karteikarten aus dem Kurs</h2>
              <p className="mb-3 text-sm text-muted">Wortschatz nach Themen, mit Beispielsätzen und Aufnahmen. Füge hinzu, was ihr im Unterricht durchnehmt.</p>
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

            </>
          )}

          {tab === 'tests' && (
            <>
          <Item>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Anstehende Arbeiten</h2>
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">Tests zum Üben</h2>
              <Link to={`/test/neu?fach=${subjectId}`} className="press flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-sky-dark hover:bg-sky-soft">
                <Plus size={16} /> Neu
              </Link>
            </div>
            {subjectTests.length === 0 ? (
              <Link to={`/test/neu?fach=${subjectId}`} className="card press mb-5 flex items-center gap-3 p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">Test, Klassenarbeit oder Vokabeltest</span>
                  <span className="block text-sm text-muted">Die KI erstellt ihn aus deinem Thema oder deinen Karteikarten, mit Punkten und ungefährer Note.</span>
                </span>
                <Right size={16} className="shrink-0 text-muted" />
              </Link>
            ) : (
              <ul className="mb-5 grid gap-2.5">
                {subjectTests.slice(0, 6).map((t) => {
                  const rs = testResults.filter((r) => r.testId === t.id)
                  const best = rs.length ? Math.max(...rs.map((r) => r.percent)) : null
                  return (
                    <li key={t.id}>
                      <Link to={`/test/${t.id}`} className="card press flex items-center gap-3 p-3.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-extrabold">{t.title}</span>
                          <span className="block text-sm text-muted">
                            {testKindLabel(t.kind)} · {taskCount(t)} Aufgaben · {t.minutes} Min.{best !== null ? ` · beste ${best} %` : ''}
                          </span>
                        </span>
                        <Right size={16} className="shrink-0 text-muted" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Item>

            </>
          )}

          {tab === 'mehr' && (
            <>
          {skillsOf(subjectId).length > 0 && subjectId !== 'mathe' && (
            <Item>
              <h2 className="mb-2 text-lg font-extrabold">Rechentraining</h2>
              <Link to={`/faecher/${subjectId}/rechnen`} className="card press mb-5 flex items-center gap-3 p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{skillsOf(subjectId).length} Themen mit Formeln, immer neue Aufgaben</span>
                  <span className="block text-sm text-muted">Ohne KI: Die App rechnet selbst und zeigt bei Fehlern den Rechenweg.</span>
                </span>
                <Right size={16} className="shrink-0 text-muted" />
              </Link>
            </Item>
          )}

          {subjectId === 'mathe' && (
            <Item>
              <h2 className="mb-2 text-lg font-extrabold">Rechentraining</h2>
              <Link to="/faecher/mathe/rechnen" className="card press mb-3 flex items-center gap-3 p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">Prozent und Dreisatz</span>
                  <span className="block text-sm text-muted">Alltagsrechnen mit immer neuen Aufgaben.</span>
                </span>
                <Right size={16} className="shrink-0 text-muted" />
              </Link>
              <Link to="/faecher/mathe/training" className="card press mb-5 flex items-center gap-3 p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">43 Themen, immer neue Aufgaben</span>
                  <span className="block text-sm text-muted">Brüche, Prozent, Gleichungen, Geometrie und mehr: mit Rechenweg bei Fehlern und Formelsammlung.</span>
                </span>
                <Right size={16} className="shrink-0 text-muted" />
              </Link>
            </Item>
          )}

          {isFrench && (
            <Item>
              <h2 className="mb-2 text-lg font-extrabold">Mehr für Französisch</h2>
              <div className="mb-5 grid gap-2.5">
                {[
                  { to: '/faecher/franzoesisch?tab=nachschlagen', title: 'Wörter und Grammatik nachschlagen', text: 'Wörterbuch und Grammatik zum Nachlesen.' },
                  { to: '/speak?scope=learned', title: 'Sprechtraining', text: 'Wörter nachsprechen, mit Lautschule.' },
                  { to: '/exam/new', title: 'Klassenarbeit mit Hörverstehen', text: 'Vorgelesene Texte, Wortschatz und Schreiben, von der KI erstellt.' },
                  { to: '/books', title: 'Bücher und Buchseiten', text: 'Seiten aus deinem Schulbuch ablegen, die KI kennt sie dann.' },
                ].map((x) => (
                  <Link key={x.to} to={x.to} className="card press flex items-center gap-3 p-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{x.title}</span>
                      <span className="block text-sm text-muted">{x.text}</span>
                    </span>
                    <Right size={16} className="shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            </Item>
          )}

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
        {isMine && own.length === 0 && !isFrench && (
          <Item>
            <button type="button" className="press mt-6 rounded-xl px-2 py-2 text-sm font-semibold text-muted hover:text-bad-dark" onClick={() => toggleSubject(subjectId)}>
              Fach aus meiner Liste entfernen
            </button>
          </Item>
        )}
            </>
          )}
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
      <Link to="/faecher/franzoesisch?tab=mehr" replace className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
        <Back size={18} /> Mehr
      </Link>
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
    </Item>
  )
}
