import { unitSchema } from './schema'
import type { Item, Lesson, Unit } from '../lib/types'

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const files = import.meta.glob('./*/*/*.json', { eager: true, import: 'default' }) as Record<string, unknown>

function fileNumber(path: string): number {
  const m = /unit-(\d+)\.json$/.exec(path)
  return m ? Number(m[1]) * 10 : 999
}

function load(): Unit[] {
  const units: Unit[] = []
  const parsedAll = Object.keys(files).map((path) => {
    const parsed = unitSchema.parse(files[path]) // bricht beim Start laut ab, wenn Inhalte kaputt sind
    return { parsed, order: parsed.order ?? fileNumber(path) }
  })
  parsedAll.sort((a, b) => a.parsed.grade - b.parsed.grade || a.order - b.order)
  for (const { parsed } of parsedAll) {
    const lessons = parsed.lessons.map((l): Lesson => ({
      id: l.id,
      title: l.title,
      explanation: l.explanation,
      // Stabile IDs aus dem Wort: Reihenfolge ändern setzt keinen Lernfortschritt zurück.
      items: l.items.map((it, i): Item => ({ ...it, id: `${l.id}:${slug(it.front) || i}` })),
      fills: l.fills?.map((f, i) => ({ ...f, id: `${l.id}:fill-${i}` })),
    }))
    // Am Ende jeder Einheit: Wiederholungs-Lektion mit gemischtem Stoff der ganzen Einheit
    if (lessons.length >= 2) {
      lessons.push({
        id: `${parsed.id}-review`,
        title: 'Einheit wiederholen',
        items: lessons.flatMap((l) => l.items),
        fills: lessons.flatMap((l) => l.fills ?? []),
        review: true,
      })
    }
    // Danach der Einheitentest (gemischte Fragen ohne Hilfen, bestanden ab 70 %)
    if (lessons.length >= 3) {
      lessons.push({
        id: `${parsed.id}-test`,
        title: 'Einheitentest',
        items: lessons.filter((l) => !l.review).flatMap((l) => l.items),
        test: true,
      })
    }
    units.push({ ...parsed, lessons })
  }
  return units
}

export const units: Unit[] = load()
export const grades: number[] = [...new Set(units.map((u) => u.grade))].sort((a, b) => a - b)
export const allLessons: Lesson[] = units.flatMap((u) => u.lessons)
export const allItems: Item[] = allLessons.filter((l) => !l.review && !l.test).flatMap((l) => l.items)

/** Normale Lektion (also keine Wiederholung und kein Einheitentest). */
export const isRegular = (l: Lesson): boolean => !l.review && !l.test

/** Eine einzige Quelle für alle Zahlen zum Kurs, damit Startseite, Wiederholen, Profil und Willkommen dasselbe sagen. */
export function gradeStats(grade: number): { units: number; lessons: number; words: number } {
  const us = units.filter((u) => u.grade === grade)
  const regular = us.flatMap((u) => u.lessons).filter(isRegular)
  const core = us.filter((u) => !u.extra)
  return { units: core.length, lessons: core.flatMap((u) => u.lessons).filter(isRegular).length, words: new Set(regular.flatMap((l) => l.items.map((i) => i.id))).size }
}
export const COURSE_STATS = {
  grades: grades.length,
  lessons: units.filter((u) => !u.extra).flatMap((u) => u.lessons).filter(isRegular).length,
  words: new Set(allItems.map((i) => i.id)).size,
}

/** Zu jedem Wort: aus welcher Lektion und Einheit es stammt (für Wörterbuch und Verlinkung). */
export const itemMeta: Map<string, { lesson: Lesson; unit: Unit }> = new Map(
  units.flatMap((u) => u.lessons.filter((l) => !l.review && !l.test).flatMap((l) => l.items.map((i) => [i.id, { lesson: l, unit: u }] as const))),
)

export function findLesson(id: string): { lesson: Lesson; unit: Unit } | undefined {
  for (const unit of units) {
    const lesson = unit.lessons.find((l) => l.id === id)
    if (lesson) return { lesson, unit }
  }
}

/** Das Lektions-Item selbst plus Nachbarn aus derselben Einheit als Ablenker. */
export function poolForLesson(lessonId: string): Item[] {
  const found = findLesson(lessonId)
  if (!found) return allItems
  const unitItems = found.unit.lessons.flatMap((l) => l.items)
  return unitItems.length >= 8 ? unitItems : allItems
}

/** Ab diesem Anteil richtiger Antworten (beim ersten Versuch) gilt ein Einheitentest als bestanden. */
export const TEST_PASS = 0.7
/** Eine Lektion zählt erst als geschafft, wenn mindestens so viele Aufgaben auf Anhieb richtig waren – sonst wird sie wiederholt. */
export const LESSON_PASS = 0.6

export type LessonRecordLike = { bestAccuracy: number }

export function passMark(lesson: Lesson): number {
  return lesson.test ? TEST_PASS : LESSON_PASS
}

/** Erledigt = mit ausreichender Genauigkeit abgeschlossen (Raten und alles falsch machen reicht nicht). */
export function isLessonDone(lesson: Lesson, record: LessonRecordLike | undefined): boolean {
  return !!record && record.bestAccuracy >= passMark(lesson)
}

/**
 * Freischaltung: Lektionen einer Einheit der Reihe nach. Wiederholung und Einheitentest öffnen,
 * sobald alle normalen Lektionen der Einheit geschafft sind. Die nächste Einheit öffnet, wenn alle normalen Lektionen der vorigen geschafft sind.
 */
/** Die Einheit davor, die den Lernpfad tatsächlich sperrt (Zusatzeinheiten zählen nicht). */
export function previousCoreUnit(unit: Unit): Unit | undefined {
  const sameGrade = units.filter((u) => u.grade === unit.grade)
  const i = sameGrade.findIndex((u) => u.id === unit.id)
  return sameGrade.slice(0, Math.max(0, i)).filter((u) => !u.extra).pop()
}

export function isUnlocked(lessonId: string, records: Record<string, LessonRecordLike | undefined>): boolean {
  const found = findLesson(lessonId)
  if (!found) return false
  const { unit, lesson } = found
  const regular = unit.lessons.filter((l) => !l.review && !l.test)
  const done = (l: Lesson) => isLessonDone(l, records[l.id])

  if (lesson.review || lesson.test) return regular.every(done)

  const idx = regular.findIndex((l) => l.id === lesson.id)
  if (idx > 0) return done(regular[idx - 1])

  // erste Lektion der Einheit: vorherige Einheit derselben Klasse muss geschafft sein (Zusatzeinheiten sperren nicht)
  const prev = previousCoreUnit(unit)
  if (!prev) return true
  return prev.lessons.filter((l) => !l.review && !l.test).every(done)
}

/** Die nächste Lektion der Klasse nach dieser, die schon offen und noch nicht geschafft ist (für "Nächste Lektion" im Ergebnis). */
export function nextLessonAfter(lessonId: string, records: Record<string, LessonRecordLike | undefined>): Lesson | undefined {
  const found = findLesson(lessonId)
  if (!found) return undefined
  const seq = units.filter((u) => u.grade === found.unit.grade).flatMap((u) => u.lessons)
  const i = seq.findIndex((l) => l.id === lessonId)
  return seq.slice(i + 1).find((l) => isUnlocked(l.id, records) && !isLessonDone(l, records[l.id]))
}

/** Welche Lektion muss zuerst geschafft werden, damit diese hier aufgeht? (undefined, wenn schon offen) */
export function blockingLesson(lessonId: string, records: Record<string, LessonRecordLike | undefined>): Lesson | undefined {
  if (isUnlocked(lessonId, records)) return undefined
  const found = findLesson(lessonId)
  if (!found) return undefined
  const { unit, lesson } = found
  const regular = unit.lessons.filter((l) => !l.review && !l.test)
  const done = (l: Lesson) => isLessonDone(l, records[l.id])
  if (lesson.review || lesson.test) return regular.find((l) => !done(l))
  const idx = regular.findIndex((l) => l.id === lesson.id)
  if (idx > 0) return regular[idx - 1]
  const prev = previousCoreUnit(unit)
  return prev?.lessons.filter((l) => !l.review && !l.test).find((l) => !done(l))
}
