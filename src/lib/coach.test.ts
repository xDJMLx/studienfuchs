import { describe, expect, it } from 'vitest'
import { allItems } from '../content'
import { buildCoachPrompt, daysTo, weakWords } from './coach'
import type { SrsCard } from './srs'
import type { VocabSet } from './types'

const card = (over: Partial<SrsCard>): SrsCard => ({ due: '2026-01-01T00:00:00.000Z', stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 0, reps: 2, lapses: 0, state: 2, last_review: null, ...over }) as SrsCard

describe('Lern-Coach', () => {
  const set: VocabSet = { id: 's1', title: 'Unité 3', createdAt: '2026-01-01', items: [{ id: 'x1', front: 'la chambre', back: 'das Zimmer' }] }
  const now = new Date(2026, 9, 2)

  it('rechnet Tage bis zur Klassenarbeit', () => {
    expect(daysTo('2026-10-02', now)).toBe(0)
    expect(daysTo('2026-10-09', now)).toBe(7)
  })

  it('findet schwache Wörter (oft falsch zuerst) und ignoriert unbekannte', () => {
    const a = allItems[0]
    const b = allItems[1]
    const weak = weakWords({ [a.id]: card({ lapses: 3 }), [b.id]: card({ stability: 50 }), nope: card({ lapses: 9 }), x1: card({ lapses: 1 }) }, [set])
    expect(weak[0].front).toBe(a.front)
    expect(weak.map((w) => w.front)).toContain('la chambre')
    expect(weak.map((w) => w.front)).not.toContain(b.front)
  })

  it('nennt Termine, Sets und schwache Wörter, aber keinen Namen', () => {
    const p = buildCoachPrompt({ grade: 7, examDates: { s1: '2026-10-09', gone: '2026-10-05' }, sets: [set], cards: { x1: card({ lapses: 2 }) }, lessonsDone: 12, lessonsTotal: 340, streak: 3, now })
    expect(p).toContain('Unité 3')
    expect(p).toContain('in 7 Tagen')
    expect(p).toContain('la chambre = das Zimmer')
    expect(p).toContain('12 von 340')
    expect(p).not.toContain('gone')
  })
})
