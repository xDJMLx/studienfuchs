import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { mathItems, mathUnits } from '../../content'
import { skillsOfUnit, unitFormulas } from '../../content/math'
import { MathText } from '../../components/math/MathText'
import { Segmented } from '../../components/ui/controls'
import { Item as FadeItem, Stagger } from '../../components/ui/motion'
import { shuffle } from '../../lib/generateExercises'
import { isDue } from '../../lib/srs'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { PracticeFlow } from '../lesson/PracticeFlow'
import { dueLabel } from '../review/ReviewPage'

/** Farben der Einheiten (Fläche, Unterkante). */
const WORLDS = [
  { c: '#ff8a1f', s: '#d66a00' },
  { c: '#1e96fa', s: '#1474cc' },
  { c: '#8b5cf6', s: '#6a3ad6' },
  { c: '#ff5c9a', s: '#d43b77' },
  { c: '#14b8a6', s: '#0d8f80' },
  { c: '#58c234', s: '#3e9a1f' },
  { c: '#ff6b5a', s: '#d6493a' },
  { c: '#5b6cff', s: '#3c4bd8' },
]

type Scope = 'learned' | 'weak' | `unit:${string}`

/** Rechentraining in Mathe: Aufgaben, die sich selbst erzeugen (jedes Mal neue Zahlen), nach Themen sortiert, dazu die Formelsammlung. */
export function MathTrainingPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'formeln' ? 'formulas' : 'topics'
  return (
    <div className="mx-auto max-w-2xl px-4 py-5 lg:py-8">
      <Link to="/faecher/mathe" className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
        ‹ Mathe
      </Link>
      <h1 className="page-title">Rechentraining</h1>
      <p className="mb-3 mt-1 text-sm text-muted">Wähle ein Thema: Die Aufgaben sind jedes Mal neu, falsche Rechnungen kommen mit frischen Zahlen wieder und der Rechenweg wird gezeigt.</p>
      <Segmented
        label="Bereich"
        className="mb-5 w-full [&>button]:flex-1 [&>button]:py-2"
        value={tab}
        onChange={(v) => setParams(v === 'topics' ? {} : { tab: 'formeln' }, { replace: true })}
        options={[
          { value: 'topics', label: 'Themen' },
          { value: 'formulas', label: 'Formeln' },
        ]}
      />
      {tab === 'formulas' ? <FormulasTab /> : <TopicsTab />}
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

  if (!items.length) return <Navigate to="/faecher/mathe/training" replace />
  return <PracticeFlow title={title} items={items} pool={items} exitTo="/faecher/mathe/training" noPassMark math maxExercises={items.length === 1 ? 8 : 12} />
}
