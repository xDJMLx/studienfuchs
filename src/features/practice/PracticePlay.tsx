import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { allItems } from '../../content'
import { shuffle } from '../../lib/generateExercises'
import { itemsForScope, scopeLabel, type Scope } from '../../lib/scope'
import { masteryOf } from '../../lib/srs'
import { useStore } from '../../store/useStore'
import { PracticeFlow } from '../lesson/PracticeFlow'

const SESSION_ITEMS = 10
const TEST_ITEMS = 20

/** Freies Üben: gewählte Wörter im gewählten Modus (Mix, Schreiben, Hören). */
export function PracticePlay() {
  const [params] = useSearchParams()
  const scope = (params.get('scope') ?? 'due') as Scope
  const mode = (params.get('mode') ?? 'mix') as 'mix' | 'write' | 'listen'

  // Test = Wörter direkt abfragen, ohne sie vorher zu erklären (Listen von der KI, oder wenn noch nichts gesehen wurde)
  const { picked, test } = useMemo(() => {
    const { cards, favorites, sets } = useStore.getState()
    const items = itemsForScope(scope, { cards, favorites, sets })
    const isList = scope.startsWith('set:')
    // Schreiben und Hören üben zuerst schon gesehene Wörter; gibt es keine, wird direkt getestet
    const seen = items.filter((i) => masteryOf(cards[i.id]) > 0)
    const useSeen = !isList && mode !== 'mix' && seen.length > 0
    const source = useSeen ? seen : items
    return { picked: shuffle(source).slice(0, isList ? TEST_ITEMS : SESSION_ITEMS), test: isList || (mode !== 'mix' && !useSeen) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pool = useMemo(() => {
    const { sets } = useStore.getState()
    return [...picked, ...allItems, ...sets.flatMap((s) => s.items)].slice(0, 400)
  }, [picked])

  if (!picked.length) return <Navigate to="/practice" replace />
  const label = scope.startsWith('set:') ? (useStore.getState().sets.find((s) => s.id === scope.slice(4))?.title ?? scopeLabel(scope)) : scopeLabel(scope)
  const names = test ? { mix: 'Vokabeltest', write: 'Schreibtest', listen: 'Hörtest' } : { mix: 'Quiz', write: 'Schreibtraining', listen: 'Hörtraining' }
  const title = `${names[mode]} · ${label}`
  return <PracticeFlow title={title} items={picked} pool={pool} exitTo={scope.startsWith('set:') ? `/sets/${scope.slice(4)}` : '/practice'} mode={test ? 'test' : 'learn'} maxExercises={test ? picked.length : undefined} noPassMark focus={mode} />
}
