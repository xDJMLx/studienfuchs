import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { allItems } from '../../content'
import { planToday } from '../../lib/plan'
import { useStore } from '../../store/useStore'
import { PracticeFlow } from '../lesson/PracticeFlow'

export function SetPlay() {
  const { setId = '' } = useParams()
  const set = useStore((s) => s.sets.find((x) => x.id === setId))

  // Beim Start einfrieren, damit sich die Auswahl während der Session nicht verschiebt.
  const items = useMemo(() => {
    if (!set) return []
    const { cards, examDates } = useStore.getState()
    return planToday(set.items, cards, examDates[set.id]).items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId])

  const pool = useMemo(() => (set && set.items.length >= 4 ? set.items : [...(set?.items ?? []), ...allItems]), [set])

  if (!set || !items.length) return <Navigate to={`/sets/${setId}`} replace />
  return <PracticeFlow title={set.title} items={items} pool={pool} exitTo={`/sets/${set.id}`} noPassMark />
}
