import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Plus } from '../../components/ui/Icons'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { ProgressBar } from '../../components/ui/widgets'
import { isDue, masteryOf } from '../../lib/srs'
import { useStore } from '../../store/useStore'

const COVERS = [
  'from-orange-400 to-amber-500',
  'from-rose-400 to-orange-500',
  'from-amber-500 to-yellow-500',
  'from-orange-500 to-red-500',
]

export function SetsPage() {
  const sets = useStore((s) => s.sets)
  const cards = useStore((s) => s.cards)
  const examDates = useStore((s) => s.examDates)

  return (
    <Stagger className="mx-auto max-w-3xl px-4 py-6 lg:py-8" stagger={0.08}>
      <Item className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Meine Sets</h1>
          <p className="mt-1 text-muted">Vokabeln aus deinem eigenen Schulbuch, automatisch als Quiz.</p>
        </div>
        <Link to="/sets/new" className="btn btn-primary press"><Plus size={18} /> Neues Set</Link>
      </Item>

      {sets.length === 0 ? (
        <Item>
        <Link
          to="/sets/new"
          className="lift flex flex-col items-center rounded-2xl border-2 border-dashed border-line bg-surface px-6 py-14 text-center"
        >
          <span className="animate-float mb-4"><Mascot size={84} mood="happy" blink /></span>
          <p className="text-lg font-semibold">Erste Buchseite hochladen</p>
          <p className="mt-1 max-w-sm text-muted">Foto machen, Text prüfen, lernen. Die App fragt dich so ab, dass du dir alles dauerhaft merkst.</p>
          <span className="btn btn-primary btn-shine mt-5">Seite hochladen</span>
        </Link>
        </Item>
      ) : (
        <StaggerList className="grid gap-4 sm:grid-cols-2" stagger={0.07}>
          {sets.map((s, i) => {
            const known = s.items.filter((it) => masteryOf(cards[it.id]) === 2).length
            const started = s.items.filter((it) => cards[it.id]).length
            const dueNow = s.items.filter((it) => isDue(cards[it.id])).length
            return (
              <ItemLi key={s.id}>
                <Link to={`/sets/${s.id}`} className="card lift block overflow-hidden">
                  <div className={`flex h-24 items-end justify-between bg-gradient-to-br p-4 text-white ${COVERS[i % COVERS.length]}`}>
                    <span className="text-4xl font-bold leading-none opacity-90">{s.title.trim().charAt(0).toUpperCase() || '?'}</span>
                    {dueNow > 0 && <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-dark">{dueNow} fällig</span>}
                  </div>
                  <div className="p-4">
                    <h2 className="truncate font-semibold">{s.title}</h2>
                    <p className="mb-3 text-sm text-muted">
                      {s.items.length} Wörter{examDates[s.id] ? ` · Test am ${new Date(examDates[s.id]).toLocaleDateString('de-DE')}` : ''}
                    </p>
                    <ProgressBar pct={s.items.length ? known / s.items.length : 0} color="bg-good" />
                    <p className="mt-2 text-xs text-muted">{started} begonnen · {known} gefestigt</p>
                  </div>
                </Link>
              </ItemLi>
            )
          })}
        </StaggerList>
      )}
    </Stagger>
  )
}
