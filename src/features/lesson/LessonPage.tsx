import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { allItems, findLesson, isUnlocked, mathItems, poolForLesson } from '../../content'
import { isDue, masteryOf } from '../../lib/srs'
import { shuffle, WARMUP_SIZE } from '../../lib/generateExercises'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { PracticeFlow } from './PracticeFlow'

const REVIEW_SIZE = 10
const TEST_SIZE = 15

/** Wiederholungs-Lektion: die schwächsten Wörter der Einheit zuerst, innerhalb gleicher Stärke zufällig. */
function pickReviewItems(items: Item[], max = REVIEW_SIZE): Item[] {
  const cards = useStore.getState().cards
  return shuffle(items)
    .map((item) => ({ item, m: masteryOf(cards[item.id]) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, max)
    .map((x) => x.item)
}

/** Fällige ältere Wörter (am längsten überfällig zuerst), die nicht zu dieser Lektion gehören. In Mathe: fällige Themen. */
function pickWarmup(lessonItems: Item[], math: boolean): Item[] {
  const { cards, sets } = useStore.getState()
  const own = new Set(lessonItems.map((i) => i.id))
  const byId = new Map<string, Item>()
  if (math) for (const [id, i] of mathItems) byId.set(id, i)
  else {
    for (const i of allItems) byId.set(i.id, i)
    for (const s of sets) for (const i of s.items) byId.set(i.id, i)
  }
  const now = new Date()
  return Object.entries(cards)
    .filter(([id, c]) => !own.has(id) && byId.has(id) && isDue(c, now))
    .sort((a, b) => new Date(a[1].due).getTime() - new Date(b[1].due).getTime())
    .slice(0, WARMUP_SIZE)
    .map(([id]) => byId.get(id) as Item)
}

/** Pro Lektion eine eigene Instanz (key), damit beim direkten Wechsel zur nächsten Lektion nichts vom Vorgänger hängen bleibt. */
export function LessonPage() {
  const { lessonId = '' } = useParams()
  return <LessonPageInner key={lessonId} lessonId={lessonId} />
}

function LessonPageInner({ lessonId }: { lessonId: string }) {
  const found = findLesson(lessonId)
  const math = found?.unit.subject === 'math'
  // Auswahl einmal beim Öffnen festlegen, damit sie sich während der Lektion nicht ändert
  const [picked] = useState(() => {
    // Mathe: wenige Themen pro Runde, dafür mehrere Aufgaben je Thema
    if (found?.lesson.review) return pickReviewItems(found.lesson.items, math ? 5 : REVIEW_SIZE)
    if (found?.lesson.test) return shuffle(found.lesson.items).slice(0, math ? 6 : TEST_SIZE)
    return null
  })
  // Normale Lektion: ein paar fällige alte Wörter vorneweg abfragen (einmal beim Öffnen festlegen)
  const [warmup] = useState(() => (found && !found.lesson.review && !found.lesson.test ? pickWarmup(found.lesson.items, math) : []))
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
      warmup={warmup}
      math={math}
    />
  )
}
