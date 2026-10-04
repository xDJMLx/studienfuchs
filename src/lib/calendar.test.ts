import { describe, expect, it } from 'vitest'
import { addDays, byDay, dateKey, longDay, monthGrid, needsFollowUp, parseKey, quickDates, shortDay } from './calendar'

describe('Kalender', () => {
  it('Datum hin und zurück ohne Zeitzonen-Sprünge', () => {
    expect(dateKey(new Date(2026, 10, 5))).toBe('2026-11-05')
    expect(dateKey(parseKey('2026-03-29'))).toBe('2026-03-29')
    expect(dateKey(addDays(parseKey('2026-10-25'), 7))).toBe('2026-11-01')
  })

  it('Monatsraster: Montag zuerst, volle Wochen, Nachbartage zur Füllung', () => {
    // November 2026 beginnt an einem Sonntag
    const g = monthGrid(2026, 10)
    expect(g.length % 7).toBe(0)
    expect(g[0]).toEqual({ key: '2026-10-26', day: 26, inMonth: false })
    expect(g[6]).toEqual({ key: '2026-11-01', day: 1, inMonth: true })
    expect(g.filter((c) => c.inMonth)).toHaveLength(30)
    expect(g[g.length - 1].key >= '2026-11-30').toBe(true)
  })

  it('Monat, der am Montag beginnt, hat keine Füllung davor', () => {
    // Juni 2026 beginnt an einem Montag
    const g = monthGrid(2026, 5)
    expect(g[0]).toEqual({ key: '2026-06-01', day: 1, inMonth: true })
    expect(g).toHaveLength(35)
  })

  it('Februar im Schaltjahr', () => {
    expect(monthGrid(2028, 1).filter((c) => c.inMonth)).toHaveLength(29)
  })

  it('Tage schön ausgeschrieben', () => {
    expect(longDay('2026-11-05')).toBe('Donnerstag, 5. November')
    expect(shortDay('2026-11-05')).toBe('5. Nov.')
  })

  it('Arbeiten nach Tag und Nachfragen nach dem Termin', () => {
    const a = { id: '1', subject: 'x', title: 't', date: '2026-11-05', deckIds: [] }
    const b = { ...a, id: '2' }
    expect(byDay([a, b])['2026-11-05']).toHaveLength(2)
    expect(needsFollowUp(a, '2026-11-06')).toBe(true)
    expect(needsFollowUp(a, '2026-11-05')).toBe(false)
    expect(needsFollowUp({ ...a, done: true }, '2026-12-01')).toBe(false)
  })

  it('Schnellwahl liefert drei künftige Tage', () => {
    const q = quickDates(new Date(2026, 10, 5))
    expect(q.map((x) => x.key)).toEqual(['2026-11-06', '2026-11-12', '2026-11-19'])
  })
})

import { isoWeek, startOfWeek, weekDays, weekRange } from './calendar'

describe('Wochenplan', () => {
  it('Woche beginnt am Montag, auch wenn der Tag ein Sonntag ist', () => {
    expect(dateKey(startOfWeek(new Date(2026, 10, 4)))).toBe('2026-11-02')
    expect(dateKey(startOfWeek(new Date(2026, 10, 1)))).toBe('2026-10-26')
    expect(dateKey(startOfWeek(new Date(2026, 10, 2)))).toBe('2026-11-02')
  })

  it('Kalenderwochen nach ISO', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
    expect(isoWeek(new Date(2026, 10, 4))).toBe(45)
    expect(isoWeek(new Date(2026, 11, 31))).toBe(53)
    expect(isoWeek(new Date(2027, 0, 3))).toBe(53)
  })

  it('Wochenbereich und Tage', () => {
    expect(weekRange(new Date(2026, 10, 2))).toBe('2.–8. Nov.')
    expect(weekRange(new Date(2026, 10, 30))).toBe('30. Nov.–6. Dez.')
    const d = weekDays(new Date(2026, 10, 2))
    expect(d.map((x) => x.weekday).join('')).toBe('MoDiMiDoFrSaSo')
    expect(d[6].key).toBe('2026-11-08')
  })
})
