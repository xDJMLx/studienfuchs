import { describe, expect, it } from 'vitest'
import { isLessonDone, isRegular, isUnlocked, units } from '../content'
import { BERLIN_LEVEL, DECOUVERTES, expectedUnit, schoolYearProgress, unitAtProgress } from './berlin'
import { backlog, catchUpStatus, classPacePerWeek, recommendedDays, unitsUpTo } from './catchup'

describe('Berliner Schuljahr', () => {
  it('beginnt Ende August bei 0, wächst mit der Zeit und ist am Ende (Sommerferien) bei 1', () => {
    expect(schoolYearProgress(new Date(2026, 7, 24))).toBeCloseTo(0, 1)
    const sept = schoolYearProgress(new Date(2026, 8, 30))
    const dec = schoolYearProgress(new Date(2026, 11, 1))
    const mar = schoolYearProgress(new Date(2027, 2, 1))
    const jun = schoolYearProgress(new Date(2027, 5, 15))
    expect(sept).toBeGreaterThan(0)
    expect(dec).toBeGreaterThan(sept)
    expect(mar).toBeGreaterThan(dec)
    expect(jun).toBeGreaterThan(mar)
    expect(jun).toBeLessThanOrEqual(1)
    expect(schoolYearProgress(new Date(2027, 7, 1))).toBe(1)
  })

  it('Ferien zählen nicht als Unterrichtszeit', () => {
    const before = schoolYearProgress(new Date(2026, 9, 16))
    const after = schoolYearProgress(new Date(2026, 10, 2))
    // dazwischen liegen zwei Wochen Herbstferien: nur gut ein paar Schultage dazwischen
    expect(after - before).toBeLessThan(2 / 34)
  })

  it('nennt für jede Klasse eine Einheit, die mit dem Schuljahr nach hinten wandert', () => {
    for (const g of [7, 8, 9, 10]) {
      const early = expectedUnit(g, new Date(2026, 8, 20))
      const late = expectedUnit(g, new Date(2027, 4, 20))
      expect(early).toBeTruthy()
      expect(late).toBeTruthy()
      const order = units.filter((u) => u.grade === g).map((u) => u.id)
      expect(order.indexOf(late!)).toBeGreaterThan(order.indexOf(early!))
    }
  })

  it('hat ein Niveau pro Jahrgang und Découvertes-Einheiten, die aufsteigend enden', () => {
    expect(BERLIN_LEVEL[8].ger).toBe('A2')
    expect(BERLIN_LEVEL[9].ger).toBe('B1')
    for (const g of [7, 8, 9, 10]) {
      const ends = DECOUVERTES[g].map((b) => b.end)
      expect([...ends].sort((a, b) => a - b)).toEqual(ends)
      expect(ends[ends.length - 1]).toBe(1)
      // jede Einheit des Lehrbuchs führt zu einer Kerneinheit der App
      for (const b of DECOUVERTES[g]) {
        const id = unitAtProgress(g, b.end)
        const u = units.find((x) => x.id === id)
        expect(u?.grade).toBe(g)
        expect(u?.extra).toBeFalsy()
      }
    }
  })
})

describe('Zusatzwortschatz bremst nicht', () => {
  const extraUnit = units.find((u) => u.extra && u.grade === 8)!
  it('es gibt Zusatzeinheiten in allen Klassen', () => {
    for (const g of [7, 8, 9, 10]) expect(units.some((u) => u.extra && u.grade === g)).toBe(true)
  })

  it('die nächste Kerneinheit öffnet, auch wenn die Zusatzeinheit davor nicht gemacht ist', () => {
    const grade = units.filter((u) => u.grade === extraUnit.grade)
    const i = grade.indexOf(extraUnit)
    const nextCore = grade.slice(i + 1).find((u) => !u.extra)!
    // alle Kerneinheiten vor der Zusatzeinheit sind geschafft, die Zusatzeinheit selbst nicht
    const records: Record<string, { bestAccuracy: number }> = {}
    for (const u of grade.slice(0, i).filter((x) => !x.extra)) for (const l of u.lessons) records[l.id] = { bestAccuracy: 1 }
    const first = nextCore.lessons.find(isRegular)!
    expect(isUnlocked(first.id, records)).toBe(true)
    // und die Zusatzeinheit selbst ist ebenfalls offen
    expect(isUnlocked(extraUnit.lessons.find(isRegular)!.id, records)).toBe(true)
  })

  it('im Aufholplan zählt Zusatz nur auf Wunsch', () => {
    const target = units.filter((u) => u.grade === extraUnit.grade && !u.extra).pop()!
    const core = backlog(target.id, {}).length
    const withExtras = backlog(target.id, {}, false, true).length
    expect(withExtras).toBeGreaterThan(core)
    expect(unitsUpTo(target.id).some((u) => u.extra)).toBe(false)
    expect(unitsUpTo(target.id, false, true).some((u) => u.extra)).toBe(true)
  })

  it('geschaffte Zusatzlektionen zählen nicht, wenn Zusatz aus ist', () => {
    const target = units.filter((u) => u.grade === extraUnit.grade && !u.extra).pop()!
    const rec: Record<string, { bestAccuracy: number }> = {}
    for (const l of extraUnit.lessons) rec[l.id] = { bestAccuracy: 1 }
    expect(backlog(target.id, rec).length).toBe(backlog(target.id, {}).length)
    expect(backlog(target.id, rec, false, true).every((l) => !isLessonDone(l, rec[l.id]))).toBe(true)
  })
})

describe('Machbarer Aufholplan', () => {
  it('empfiehlt volle Wochen bei höchstens 30 Minuten am Tag', () => {
    expect(recommendedDays(3, 8)).toBe(7)
    const d = recommendedDays(100, 8)
    expect(d % 7).toBe(0)
    // höchstens 3 Lektionen pro Tag (24 Minuten)
    expect(Math.ceil(100 / d)).toBeLessThanOrEqual(3)
    expect(recommendedDays(5000, 8)).toBe(180)
  })

  it('rechnet auf Wunsch den weiterlaufenden Unterricht ein', () => {
    const u = units.find((x) => x.grade === 8 && !x.extra)!
    const now = new Date(2026, 9, 1)
    const without = catchUpStatus(u.id, '2026-10-29', {}, now, false, false, false)
    const withClass = catchUpStatus(u.id, '2026-10-29', {}, now, false, false, true)
    expect(without.ahead).toBe(0)
    expect(withClass.ahead).toBeGreaterThan(0)
    expect(withClass.perDay).toBeGreaterThanOrEqual(without.perDay)
    expect(classPacePerWeek(8)).toBeGreaterThan(1)
  })
})
