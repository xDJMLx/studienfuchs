import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { findLesson, isUnlocked, poolForLesson } from '../../content'
import { masteryOf } from '../../lib/srs'
import { shuffle } from '../../lib/generateExercises'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { PracticeFlow } from './PracticeFlow'

const REVIEW_SIZE = 10
const TEST_SIZE = 15

/** Wiederholungs-Lektion: die schwächsten Wörter der Einheit zuerst, innerhalb gleicher Stärke zufällig. */
function pickReviewItems(items: Item[]): Item[] {
  const cards = useStore.getState().cards
  return shuffle(items)
    .map((item) => ({ item, m: masteryOf(cards[item.id]) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, REVIEW_SIZE)
    .map((x) => x.item)
}

/** Pro Lektion eine eigene Instanz (key), damit beim direkten Wechsel zur nächsten Lektion nichts vom Vorgänger hängen bleibt. */
export function LessonPage() {
  const { lessonId = '' } = useParams()
  return <LessonPageInner key={lessonId} lessonId={lessonId} />
}

function LessonPageInner({ lessonId }: { lessonId: string }) {
  const found = findLesson(lessonId)
  // Auswahl einmal beim Öffnen festlegen, damit sie sich während der Lektion nicht ändert
  const [picked] = useState(() => {
    if (found?.lesson.review) return pickReviewItems(found.lesson.items)
    if (found?.lesson.test) return shuffle(found.lesson.items).slice(0, TEST_SIZE)
    return null
  })
  if (!found) return <Navigate to="/" replace />
  // Gesperrte Lektionen sind nicht direkt über die Adresse erreichbar (Einstufungstest zum Überspringen nutzen)
  if (!isUnlocked(found.lesson.id, useStore.getState().lessons)) return <Navigate to="/" replace />
  const { lesson } = found
  return (
    <PracticeFlow
      key={lesson.id}
      title={lesson.title}
      items={picked ?? lesson.items}
      pool={poolForLesson(lesson.id)}
      fills={lesson.fills}
      explanation={lesson.explanation}
      lessonId={lesson.id}
      exitTo="/"
      mode={lesson.test ? 'test' : 'learn'}
    />
  )
}
