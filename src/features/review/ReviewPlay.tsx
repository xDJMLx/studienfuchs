import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { allItems } from '../../content'
import { PracticeFlow } from '../lesson/PracticeFlow'
import { useLearned } from './ReviewPage'

const SESSION_ITEMS = 8

export function ReviewPlay() {
  const [params] = useSearchParams()
  const free = params.get('free') === '1'
  const { learned, due } = useLearned()

  // Beim Start einfrieren, damit sich die Auswahl während der Session nicht verschiebt.
  const picked = useMemo(() => {
    const source = free || due.length === 0 ? [...learned].sort((a, b) => a.card.stability - b.card.stability) : due
    return source.slice(0, SESSION_ITEMS).map((l) => l.item)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pool = useMemo(() => [...learned.map((l) => l.item), ...allItems].slice(0, 400), [learned])

  if (!picked.length) return <Navigate to="/review" replace />
  return <PracticeFlow title="Wiederholung" items={picked} pool={pool} exitTo="/review" noPassMark />
}
