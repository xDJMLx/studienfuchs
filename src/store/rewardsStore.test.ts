import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findLesson, isRegular, mathUnits, units } from '../content'
import { useRewardEvents } from './useRewardEvents'
import { useStore } from './useStore'

const unit = units.find((u) => !u.extra)!
const regular = unit.lessons.filter(isRegular)

function finish(lessonIndex: number, accuracy = 1, xp = 12) {
  const lesson = regular[lessonIndex]
  const grades = Object.fromEntries(lesson.items.map((i) => [i.id, 'good' as const]))
  return useStore.getState().finishSession({ xp, grades, lessonId: lesson.id, accuracy })
}

beforeEach(() => {
  vi.useRealTimers()
  useStore.getState().resetAll()
  useRewardEvents.setState({ last: null })
})

describe('Meldungen nach einer Einheit', () => {
  it('meldet neue Erfolge genau einmal', () => {
    finish(0)
    expect(useRewardEvents.getState().last!.achievements.map((a) => a.id)).toContain('first')
    finish(1)
    expect(useRewardEvents.getState().last!.achievements.map((a) => a.id)).not.toContain('first')
  })

  it('meldet eine fertige Einheit erst bei der letzten normalen Lektion', () => {
    for (let i = 0; i < regular.length - 1; i++) {
      finish(i)
      expect(useRewardEvents.getState().last!.unit, `Lektion ${i}`).toBeNull()
    }
    finish(regular.length - 1)
    const done = useRewardEvents.getState().last!.unit
    expect(done?.id).toBe(unit.id)
    expect(done?.description.length).toBeGreaterThan(5)
    finish(regular.length - 1)
    expect(useRewardEvents.getState().last!.unit).toBeNull()
  })
})

describe('Blitzrunde', () => {
  it('zahlt XP und Münzen mit Obergrenze und merkt sich den Rekord', () => {
    const r1 = useStore.getState().finishBlitz({ score: 200, correct: 14 })
    expect(r1).toMatchObject({ xp: 4, coins: 5, record: true })
    expect(useStore.getState().blitzBest).toBe(200)
    const r2 = useStore.getState().finishBlitz({ score: 150, correct: 10 })
    expect(r2.record).toBe(false)
    expect(useStore.getState().blitzBest).toBe(200)
    const big = useStore.getState().finishBlitz({ score: 9999, correct: 999 })
    expect(big.xp).toBe(15)
    expect(big.coins).toBe(20)
    expect(big.record).toBe(true)
    expect(useStore.getState().streak.count).toBe(1)
  })
})

describe('Truhe am Ende einer Einheit', () => {
  it('geht erst auf, wenn alle Lektionen der Einheit geschafft sind, und nur einmal', () => {
    expect(useStore.getState().openUnitChest(unit.id)).toBe(0)
    for (let i = 0; i < regular.length - 1; i++) finish(i)
    expect(useStore.getState().openUnitChest(unit.id)).toBe(0)
    finish(regular.length - 1)
    const before = useStore.getState().coins
    expect(useStore.getState().openUnitChest(unit.id)).toBe(25)
    expect(useStore.getState().coins).toBe(before + 25)
    expect(useStore.getState().unitChests).toContain(unit.id)
    expect(useStore.getState().openUnitChest(unit.id)).toBe(0)
    expect(useStore.getState().openUnitChest('gibt-es-nicht')).toBe(0)
  })
})

describe('Feier auf dem Lernpfad', () => {
  it('merkt sich eine frisch geschaffte Lektion, aber nicht eine, die schon geschafft war', () => {
    finish(0, 1)
    expect(useRewardEvents.getState().pathDone).toBe(regular[0].id)
    finish(0, 1)
    expect(useRewardEvents.getState().pathDone).toBeNull()
  })

  it('eine nicht bestandene Lektion wird nicht gefeiert', () => {
    finish(1, 0.3)
    expect(useRewardEvents.getState().pathDone).toBeNull()
  })
})

describe('Mathe im Speicher', () => {
  const lesson = findLesson('m7-u1-l1')!.lesson

  it('speichert Fortschritt und Lernzeit der Runde', () => {
    useStore.setState({ subject: 'math' as const })
    const grades = Object.fromEntries(lesson.items.map((i) => [i.id, 'good' as const]))
    useStore.getState().finishSession({ xp: 12, grades, lessonId: lesson.id, accuracy: 1, answered: 10, minutes: 4.5 })
    const st = useStore.getState()
    expect(st.lessons[lesson.id].bestAccuracy).toBe(1)
    expect(Object.keys(st.cards).sort()).toEqual(lesson.items.map((i) => i.id).sort())
    expect(Object.values(st.minutesByDay)).toEqual([4.5])
    useStore.getState().finishSession({ xp: 4, grades: {}, accuracy: 1, minutes: 3 })
    expect(Object.values(useStore.getState().minutesByDay)).toEqual([7.5])
  })

  it('das Fach landet in der Sicherung und kommt wieder zurück', () => {
    useStore.getState().setSubject('math')
    const json = useStore.getState().exportData()
    useStore.getState().resetAll()
    expect(useStore.getState().subject).toBe('fr')
    useStore.getState().importData(json)
    expect(useStore.getState().subject).toBe('math')
  })

  it('die Truhe am Ende einer Mathe-Einheit lässt sich öffnen, wenn alle Lektionen geschafft sind', () => {
    const unitDef = mathUnits[0]
    const regularLessons = unitDef.lessons.filter(isRegular)
    expect(useStore.getState().openUnitChest(unitDef.id)).toBe(0)
    useStore.getState().markLessonsDone(regularLessons.map((l) => l.id))
    expect(useStore.getState().openUnitChest(unitDef.id)).toBeGreaterThan(0)
    expect(useStore.getState().openUnitChest(unitDef.id)).toBe(0)
  })
})
