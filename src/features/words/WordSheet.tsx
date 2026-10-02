import { Link } from 'react-router-dom'
import { itemMeta, isUnlocked } from '../../content'
import { Fr, SpeakButton } from '../../components/exercises/common'
import { Sheet } from '../../components/ui/Sheet'
import { Star } from '../../components/ui/Icons'
import { masteryOf } from '../../lib/srs'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'

const STATUS = ['Noch nicht gelernt', 'Wird gelernt', 'Gefestigt']

/** Detailansicht eines Worts: Aussprache, Beispielsatz, Lernstand, Herkunft und Favorit. */
export function WordSheet({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const card = useStore((s) => (item ? s.cards[item.id] : undefined))
  const favorite = useStore((s) => (item ? s.favorites.includes(item.id) : false))
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const lessons = useStore((s) => s.lessons)
  const meta = item ? itemMeta.get(item.id) : undefined
  const mastery = masteryOf(card)

  return (
    <Sheet open={!!item} onClose={onClose}>
      {item && (
        <div>
          <div className="mb-4 flex items-start gap-4">
            <SpeakButton text={item.front} size="lg" />
            <div className="min-w-0 flex-1">
              <Fr className="block text-3xl font-semibold leading-tight">{item.front}</Fr>
              <p className="mt-1 text-lg text-muted">{item.back}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleFavorite(item.id)}
              aria-pressed={favorite}
              aria-label={favorite ? 'Von der Merkliste entfernen' : 'Zur Merkliste hinzufügen'}
              className={`press flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${favorite ? 'border-gold bg-gold/15 text-gold-dark' : 'border-line text-muted hover:bg-snow'}`}
            >
              <Star size={24} />
            </button>
          </div>

          {item.example && (
            <div className="mb-4 rounded-2xl bg-snow p-4">
              <p className="eyebrow mb-1">Beispiel</p>
              <div className="flex items-start gap-3">
                <SpeakButton text={item.example} quiet />
                <div>
                  <Fr className="block font-medium text-brand-dark">{item.example}</Fr>
                  <p className="text-sm text-muted">{item.exampleDe}</p>
                </div>
              </div>
            </div>
          )}
          {item.note && <p className="mb-4 rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">{item.note}</p>}

          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-line p-3">
              <dt className="eyebrow mb-0.5">Lernstand</dt>
              <dd className="font-medium">{STATUS[mastery]}</dd>
            </div>
            <div className="rounded-xl border border-line p-3">
              <dt className="eyebrow mb-0.5">Nächste Wiederholung</dt>
              <dd className="font-medium">{card ? new Date(card.due).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : 'noch nicht geplant'}</dd>
            </div>
          </dl>

          {meta && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <div className="min-w-0">
                <p className="eyebrow mb-0.5">Aus der Einheit</p>
                <p className="truncate font-medium">Klasse {meta.unit.grade}: {meta.unit.title}</p>
                <p className="truncate text-sm text-muted">{meta.lesson.title}</p>
              </div>
              {isUnlocked(meta.lesson.id, lessons) ? (
                <Link to={`/lesson/${meta.lesson.id}`} className="btn btn-ghost shrink-0 !px-4 !py-2 !text-sm">Lektion öffnen</Link>
              ) : (
                <span className="shrink-0 text-sm text-muted">noch gesperrt</span>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
