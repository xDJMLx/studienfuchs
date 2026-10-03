import { describe, expect, it } from 'vitest'
import { grades, isRegular, units } from '../content'
import { backlog, backlogByUnit, catchUpStatus, nextUnitId, unitsUpTo } from './catchup'
import { isDue, masteryOf, seedKnownCard } from './srs'

const lastGrade = grades[grades.length - 1]
const firstUnitOfLast = units.find((u) => u.grade === lastGrade)!

describe('Aufholen über mehrere Klassen', () => {
  it('zählt mit allGrades alle früheren Klassen komplett dazu', () => {
    const only = unitsUpTo(firstUnitOfLast.id)
    const all = unitsUpTo(firstUnitOfLast.id, true)
    expect(only.map((u) => u.id)).toEqual([firstUnitOfLast.id])
    const earlier = units.filter((u) => u.grade < lastGrade && !u.extra)
    expect(all).toHaveLength(earlier.length + 1)
    expect(all[0].grade).toBe(grades[0])
  })

  it('der Rückstand wächst um die offenen Lektionen früherer Klassen', () => {
    const own = backlog(firstUnitOfLast.id, {}).length
    const everything = backlog(firstUnitOfLast.id, {}, true).length
    const earlierLessons = units.filter((u) => u.grade < lastGrade && !u.extra).flatMap((u) => u.lessons.filter(isRegular)).length
    expect(everything).toBe(own + earlierLessons)
  })

  it('Status und Gruppen passen zusammen', () => {
    const now = new Date(2026, 9, 1)
    const s = catchUpStatus(firstUnitOfLast.id, '2026-10-30', {}, now, true)
    const groups = backlogByUnit(firstUnitOfLast.id, {}, true)
    expect(groups.reduce((n, g) => n + g.lessons.length, 0)).toBe(s.remaining)
    expect(s.perDay).toBe(Math.ceil(s.remaining / s.daysLeft))
  })
})

describe('Plan abgelaufen', () => {
  const u = units[0]
  it('merkt, wenn der Termin vorbei ist', () => {
    const now = new Date(2026, 9, 10)
    expect(catchUpStatus(u.id, '2026-10-05', {}, now).expired).toBe(true)
    expect(catchUpStatus(u.id, '2026-10-10', {}, now).expired).toBe(false)
    expect(catchUpStatus(u.id, '2026-10-20', {}, now).expired).toBe(false)
  })
})

describe('Nächste Einheit', () => {
  it('geht in der Reihenfolge weiter und endet beim letzten', () => {
    expect(nextUnitId(units[0].id)).toBe(units[1].id)
    expect(nextUnitId(units[units.length - 1].id)).toBeNull()
  })
})

describe('Schon bekannte Wörter', () => {
  it('bekommen einen Termin in 3 bis 14 Tagen und gelten als gelernt', () => {
    const now = new Date(2026, 9, 1)
    for (let i = 0; i < 20; i++) {
      const c = seedKnownCard(now)
      const days = (new Date(c.due).getTime() - now.getTime()) / 86_400_000
      expect(days).toBeGreaterThanOrEqual(3)
      expect(days).toBeLessThanOrEqual(15)
      expect(isDue(c, now)).toBe(false)
      expect(masteryOf(c)).toBeGreaterThanOrEqual(1)
    }
  })
})
