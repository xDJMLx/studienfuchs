import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { mathItems, mathUnits } from '../../content'
import { skillsOfUnit, unitFormulas } from '../../content/math'
import { MathText } from '../../components/math/MathText'
import { Segmented } from '../../components/ui/controls'
import { Right } from '../../components/ui/Icons'
import { Item as FadeItem, Stagger } from '../../components/ui/motion'
import { shuffle } from '../../lib/generateExercises'
import { isDue } from '../../lib/srs'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { PracticeFlow } from '../lesson/PracticeFlow'
import { dueLabel, useDue } from '../review/ReviewPage'
import { WORLDS } from '../path/LearnPage'
import { BlitzCard } from './BlitzCard'

/** Üben in Mathe: Wiederholung, Blitzrunde, freies Training, Themenübersicht und Formelsammlung. */
export function MathPracticePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'topics' ? 'topics' : params.get('tab') === 'formulas' ? 'formulas' : 'practice'
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <h1 className="page-title">Üben</h1>
      <Segmented
        label="Bereich"
        className="mb-5 mt-3 w-full [&>button]:flex-1 [&>button]:py-2"
        value={tab}
        onChange={(v) => setParams(v === 'practice' ? {} : { tab: v }, { replace: true })}
        options={[
          { value: 'practice', label: 'Üben' },
          { value: 'topics', label: 'Themen' },
          { value: 'formulas', label: 'Formeln' },
        ]}
      />
      {tab === 'topics' ? <TopicsTab /> : tab === 'formulas' ? <FormulasTab /> : <PracticeTab />}
    </div>
  )
}

function Strength({ stability }: { stability: number }) {
  const level = stability >= 7 ? 3 : stability >= 2 ? 2 : 1
  return (
    <span className="flex items-end gap-0.5" role="img" aria-label={['schwach', 'mittel', 'stark'][level - 1]}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`w-1.5 rounded-sm ${n <= level ? (level === 3 ? 'bg-good' : level === 2 ? 'bg-gold' : 'bg-bad') : 'bg-snow'}`} style={{ height: 6 + n * 4 }} />
      ))}
    </span>
  )
}

type Scope = 'learned' | 'weak' | `unit:${string}`

function PracticeTab() {
  const navigate = useNavigate()
  const cards = useStore((s) => s.cards)
  const { due, next, learnedCount } = useDue()
  const learned = useMemo(() => Object.keys(cards).filter((id) => mathItems.has(id)), [cards])
  const weak = useMemo(() => learned.filter((id) => cards[id].stability < 2), [learned, cards])
  const [scope, setScope] = useState<Scope>(() => (learned.length ? 'learned' : `unit:${mathUnits[0].id}`))
  const count = scope === 'learned' ? learned.length : scope === 'weak' ? weak.length : skillsOfUnit(scope.slice(5)).length

  return (
    <Stagger stagger={0.08}>
      <FadeItem>
        <section className={`mb-6 rounded-[20px] p-5 ${due.length > 0 ? 'bg-sky text-white' : 'card'}`} style={due.length > 0 ? { boxShadow: '0 5px 0 var(--shade-sky)' } : undefined} aria-label="Wiederholung">
          {due.length > 0 ? (
            <>
              <h2 className="text-[22px] font-extrabold leading-tight">{due.length} {due.length === 1 ? 'Thema ist' : 'Themen sind'} jetzt fällig</h2>
              <p className="mt-1 text-sm font-bold opacity-90">Kurz wiederholen, bevor du es vergisst. Die Aufgaben sind jedes Mal neu.</p>
            </>
          ) : learnedCount > 0 ? (
            <>
              <h2 className="text-[20px] font-extrabold leading-tight">Alles wiederholt</h2>
              <p className="mt-1 text-sm text-muted">{next ? `Das nächste Thema ist ${dueLabel(next)} dran. ` : ''}Bis dahin kannst du frei üben oder eine neue Lektion lernen.</p>
            </>
          ) : (
            <>
              <h2 className="text-[20px] font-extrabold leading-tight">Noch nichts zu wiederholen</h2>
              <p className="mt-1 text-sm text-muted">Schließe eine Lektion ab. Danach plane ich automatisch, wann du welches Thema wiederholen solltest. Frei üben kannst du schon jetzt.</p>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {due.length > 0 ? (
              <button className="btn press bg-white text-sky-dark" style={{ '--edge': 'rgba(0,0,0,0.18)' } as React.CSSProperties} onClick={() => navigate('/review/play')}>
                Wiederholung starten <Right size={16} />
              </button>
            ) : learnedCount > 0 ? (
              <button className="btn btn-ghost press" onClick={() => navigate('/review/play?free=1')}>Trotzdem wiederholen</button>
            ) : (
              <Link to="/" className="btn btn-primary press">Zum Lernpfad</Link>
            )}
            {learnedCount > 0 && <Link to="/review" className="btn btn-ghost press">Lernstand ansehen</Link>}
          </div>
        </section>
      </FadeItem>

      <FadeItem>
        <BlitzCard />
      </FadeItem>

      <FadeItem>
        <h2 className="mb-1 text-lg font-semibold">Frei üben</h2>
        <p className="mb-3 text-sm text-muted">Neue Aufgaben zu den Themen, die du wählst. Falsche kommen mit einer frischen Rechnung nochmal.</p>
        <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Themen auswählen">
          <button role="radio" aria-checked={scope === 'learned'} onClick={() => setScope('learned')} className={`chip ${scope === 'learned' ? 'chip-on' : ''}`}>
            Alles Gelernte <span className="rounded-md bg-black/15 px-1.5 text-xs">{learned.length}</span>
          </button>
          <button role="radio" aria-checked={scope === 'weak'} onClick={() => setScope('weak')} className={`chip ${scope === 'weak' ? 'chip-on' : ''}`}>
            Schwierig <span className="rounded-md bg-black/15 px-1.5 text-xs">{weak.length}</span>
          </button>
          {mathUnits.map((u) => (
            <button key={u.id} role="radio" aria-checked={scope === `unit:${u.id}`} onClick={() => setScope(`unit:${u.id}`)} className={`chip ${scope === `unit:${u.id}` ? 'chip-on' : ''}`}>
              {u.title}
            </button>
          ))}
        </div>
        <p className="mb-4 text-sm text-muted">{count === 0 ? 'Dazu gibt es noch nichts. Wähle etwas anderes oder lerne erst eine Lektion.' : `${count} ${count === 1 ? 'Thema' : 'Themen'} ausgewählt.`}</p>
        <button type="button" disabled={count === 0} className="btn btn-primary press w-full sm:w-72" onClick={() => navigate(`/math/train?scope=${encodeURIComponent(scope)}`)}>
          Training starten
        </button>
      </FadeItem>
    </Stagger>
  )
}

function TopicsTab() {
  const cards = useStore((s) => s.cards)
  const navigate = useNavigate()
  const now = new Date()
  return (
    <Stagger stagger={0.05}>
      <p className="mb-4 text-sm text-muted">Tippe ein Thema an und übe es gezielt. Die Balken zeigen, wie sicher du schon bist.</p>
      {mathUnits.map((u, ui) => (
        <FadeItem key={u.id}>
          <section className="mb-5">
            <h2 className="mb-2 flex items-center gap-2 text-[17px] font-extrabold">
              <span className="h-3 w-3 rounded-full" style={{ background: WORLDS[ui % WORLDS.length].c }} />
              {u.title}
            </h2>
            <ul className="card divide-y divide-line overflow-hidden">
              {skillsOfUnit(u.id).map((id) => {
                const it = mathItems.get(id) as Item
                const card = cards[id]
                return (
                  <li key={id}>
                    <button type="button" onClick={() => navigate(`/math/train?skill=${id}`)} className="press flex w-full items-center gap-4 px-4 py-3 text-left">
                      {card ? <Strength stability={card.stability} /> : <span className="h-6 w-[22px] rounded-sm bg-snow" aria-label="noch nicht gelernt" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{it.front}</span>
                        <span className="block truncate text-sm text-muted">{it.back}</span>
                      </span>
                      <span className={`shrink-0 text-xs font-medium ${card && isDue(card, now) ? 'text-brand-dark' : 'text-muted'}`}>{card ? dueLabel(new Date(card.due), now) : 'neu'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </FadeItem>
      ))}
    </Stagger>
  )
}

function FormulasTab() {
  return (
    <Stagger stagger={0.05}>
      <p className="mb-4 text-sm text-muted">Das Wichtigste jeder Einheit auf einen Blick, zum Nachschlagen vor der Klassenarbeit.</p>
      {mathUnits.map((u, ui) => (
        <FadeItem key={u.id}>
          <section className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 text-[17px] font-extrabold">
              <span className="h-3 w-3 rounded-full" style={{ background: WORLDS[ui % WORLDS.length].c }} />
              {u.title}
            </h2>
            <div className="grid gap-2.5">
              {unitFormulas(u.id).map((f) => (
                <div key={f.title} className="card border-l-4 p-3.5" style={{ borderLeftColor: WORLDS[ui % WORLDS.length].c }}>
                  <p className="mb-1 text-sm font-extrabold text-muted">{f.title}</p>
                  {f.lines.map((l) => (
                    <p key={l} className="text-[17px] leading-relaxed">
                      <MathText>{l}</MathText>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </FadeItem>
      ))}
    </Stagger>
  )
}

/** Freies Training: frische Aufgaben zu den gewählten Themen, ohne Bestehensgrenze. Pro Auswahl eine eigene Instanz. */
export function MathTrainPage() {
  const [params] = useSearchParams()
  return <MathTrain key={params.toString()} />
}

function MathTrain() {
  const [params] = useSearchParams()
  const skill = params.get('skill')
  const scope = (params.get('scope') ?? 'learned') as Scope

  const { items, title } = useMemo(() => {
    const cards = useStore.getState().cards
    const learned = Object.keys(cards).filter((id) => mathItems.has(id))
    let ids: string[]
    let title: string
    if (skill && mathItems.has(skill)) {
      ids = [skill]
      title = (mathItems.get(skill) as Item).front
    } else if (scope === 'weak') {
      ids = learned.filter((id) => cards[id].stability < 2)
      title = 'Training · Schwierige Themen'
    } else if (scope.startsWith('unit:')) {
      const unit = mathUnits.find((u) => u.id === scope.slice(5))
      ids = unit ? skillsOfUnit(unit.id) : []
      title = `Training · ${unit?.title ?? ''}`
    } else {
      ids = learned
      title = 'Training · Alles Gelernte'
    }
    return { items: shuffle(ids).slice(0, 6).map((id) => mathItems.get(id) as Item), title }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!items.length) return <Navigate to="/practice" replace />
  return <PracticeFlow title={title} items={items} pool={items} exitTo={skill ? '/practice?tab=topics' : '/practice'} noPassMark math maxExercises={items.length === 1 ? 8 : 12} />
}
