import { describe, expect, it } from 'vitest'
import { dateKey } from './calendar'
import type { Deck } from './decks'
import { minutesSince, minutesText, studyToday } from './studyTime'
import type { Arbeit } from './types'

const now = new Date(2026, 9, 5, 15, 0)
const deck: Deck = { id: 'd1', title: 'Zelle', subject: 'biologie', both: false, kind: 'own', items: [{ id: 'a', front: 'f', back: 'b' }] }
const arbeit = (over: Partial<Arbeit> = {}): Arbeit => ({ id: 'x', subject: 'biologie', title: 'Bio-Test', date: dateKey(new Date(2026, 9, 8)), deckIds: ['d1'], ...over })

describe('Lernzeit für Arbeiten', () => {
  it('ohne Arbeit gibt es kein Tagesziel', () => {
    expect(studyToday({ arbeiten: [], decks: [deck], minutesByDay: {}, dailyMinutes: 10, now })).toBeNull()
  })

  it('eine Arbeit ohne Karteikarten, eine vergangene oder eine abgehakte zählt nicht', () => {
    for (const a of [arbeit({ deckIds: [] }), arbeit({ date: dateKey(new Date(2026, 9, 1)) }), arbeit({ done: true })]) {
      expect(studyToday({ arbeiten: [a], decks: [deck], minutesByDay: {}, dailyMinutes: 10, now })).toBeNull()
    }
  })

  it('zählt die Minuten von heute gegen das Ziel, die nächste Arbeit zuerst', () => {
    const far = arbeit({ id: 'far', title: 'Später', date: dateKey(new Date(2026, 9, 20)) })
    const st = studyToday({ arbeiten: [far, arbeit()], decks: [deck], minutesByDay: { [dateKey(now)]: 4, '2026-10-04': 30 }, dailyMinutes: 10, now })!
    expect(st.arbeit.id).toBe('x')
    expect(st).toMatchObject({ minutes: 4, target: 10, pct: 0.4, reached: false, days: 3 })
    const done = studyToday({ arbeiten: [arbeit()], decks: [deck], minutesByDay: { [dateKey(now)]: 12.5 }, dailyMinutes: 10, now })!
    expect(done).toMatchObject({ pct: 1, reached: true })
  })

  it('Minuten einer Runde: gerundet, höchstens 12', () => {
    expect(minutesSince(0, 90_000)).toBe(1.5)
    expect(minutesSince(0, 60 * 60_000)).toBe(12)
    expect(minutesSince(5000, 1000)).toBe(0)
    expect(minutesText(4)).toBe('4 Min.')
    expect(minutesText(4.5)).toBe('4,5 Min.')
  })
})
