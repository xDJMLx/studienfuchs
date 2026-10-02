import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { allItems } from '../../content'
import { shuffle } from '../../lib/generateExercises'
import { itemsForScope, scopeLabel, type Scope } from '../../lib/scope'
import { masteryOf } from '../../lib/srs'
import { useStore } from '../../store/useStore'
import { PracticeFlow } from '../lesson/PracticeFlow'

const SESSION_ITEMS = 10

/** Freies Üben: gewählte Wörter im gewählten Modus (Mix, Schreiben, Hören). */
export function PracticePlay() {
  const [params] = useSearchParams()
  const scope = (params.get('scope') ?? 'due') as Scope
  const mode = (params.get('mode') ?? 'mix') as 'mix' | 'write' | 'listen'

  const picked = useMemo(() => {
    const { cards, favorites, sets } = useStore.getState()
    let items = itemsForScope(scope, { cards, favorites, sets })
    // Schreiben und Hören setzen Wörter voraus, die man schon einmal gesehen hat
    if (mode !== 'mix' || scope.startsWith('unit:') || scope.startsWith('set:')) items = items.filter((i) => masteryOf(cards[i.id]) > 0 || mode === 'mix')
    return shuffle(items).slice(0, SESSION_ITEMS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pool = useMemo(() => {
    const { sets } = useStore.getState()
    return [...picked, ...allItems, ...sets.flatMap((s) => s.items)].slice(0, 400)
  }, [picked])

  if (!picked.length) return <Navigate to="/practice" replace />
  const title = `${{ mix: 'Quiz', write: 'Schreibtraining', listen: 'Hörtraining' }[mode]} · ${scopeLabel(scope)}`
  return <PracticeFlow title={title} items={picked} pool={pool} exitTo="/practice" noPassMark focus={mode} />
}
