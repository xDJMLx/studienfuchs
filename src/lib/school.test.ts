import { describe, expect, it } from 'vitest'
import { breaksOf, cleanPeriods, EXAMPLE_PERIODS, periodAt, periodsOf, slotForPeriods, stundenText, whenText } from './school'
import type { Arbeit } from './types'

const a = (over: Partial<Arbeit>): Arbeit => ({ id: 'x', subject: 'mathe', title: 'T', date: '2026-10-07', deckIds: [], ...over })

describe('Schulstunden', () => {
  it('ordnet Zeilen, wirft ungültige und überlappende raus', () => {
    const list = cleanPeriods([
      { start: '10:00', end: '10:45' },
      { start: '08:00', end: '08:45' },
      { start: '09:00', end: '08:50' },
      { start: '10:30', end: '11:15' },
      { start: 'abc', end: '12:00' },
      { start: '08:55', end: '09:40' },
    ])
    expect(list).toEqual([
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
      { start: '10:00', end: '10:45' },
    ])
  })

  it('berechnet die Pausen zwischen den Stunden', () => {
    expect(breaksOf(EXAMPLE_PERIODS).map((b) => b.minutes)).toEqual([10, 20, 10, 10, 10, 10])
    expect(breaksOf([{ start: '08:00', end: '08:45' }, { start: '08:45', end: '09:30' }])).toEqual([])
  })

  it('findet die Stunde zu einer Uhrzeit (Pause → nächste Stunde, danach → letzte)', () => {
    expect(periodAt(EXAMPLE_PERIODS, 8 * 60 + 10)).toBe(0)
    expect(periodAt(EXAMPLE_PERIODS, 8 * 60 + 47)).toBe(1)
    expect(periodAt(EXAMPLE_PERIODS, 20 * 60)).toBe(6)
    expect(periodAt([], 500)).toBe(-1)
  })

  it('Stunden von bis ↔ Beginn und Dauer', () => {
    expect(slotForPeriods(EXAMPLE_PERIODS, 2, 3)).toEqual({ time: '10:00', duration: 100 })
    expect(slotForPeriods(EXAMPLE_PERIODS, 0, 0)).toEqual({ time: '08:00', duration: 45 })
    expect(slotForPeriods(EXAMPLE_PERIODS, 5, 99)).toEqual({ time: '12:45', duration: 100 })
  })

  it('Termine werden als Stunden erkannt oder bleiben freie Uhrzeit', () => {
    const t = (time: string | undefined, duration?: number) => a({ time, duration, kind: 'test' })
    expect(periodsOf(EXAMPLE_PERIODS, t('10:00', 45))).toEqual({ from: 2, to: 2 })
    expect(stundenText(EXAMPLE_PERIODS, t('10:00', 100))).toBe('3.–4. Std.')
    expect(stundenText(EXAMPLE_PERIODS, t('10:00', 45))).toBe('3. Std.')
    expect(stundenText(EXAMPLE_PERIODS, t('10:20', 30))).toBeNull()
    expect(stundenText(EXAMPLE_PERIODS, t(undefined))).toBeNull()
    expect(whenText(EXAMPLE_PERIODS, t('10:20', 30))).toBe('10:20–10:50')
    expect(whenText(EXAMPLE_PERIODS, t('08:00', 45))).toBe('1. Std.')
    expect(whenText([], t('08:00', 45))).toBe('08:00–08:45')
    expect(whenText(EXAMPLE_PERIODS, t(undefined))).toBeNull()
  })
})
