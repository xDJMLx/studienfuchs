import { describe, expect, it } from 'vitest'
import { BLITZ_MIN_WORDS, makeQuestion, multiplier, pointsFor } from './blitz'
import type { Item } from './types'

const pool: Item[] = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, front: `mot${i}`, back: `Wort ${i}` }))

describe('Blitzrunde', () => {
  it('Faktor wächst mit der Reihe und ist bei ×4 gedeckelt', () => {
    expect([0, 3, 4, 7, 8, 11, 12, 40].map(multiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
    expect(pointsFor(0)).toBe(10)
    expect(pointsFor(12)).toBe(40)
  })

  it('jede Frage hat genau vier verschiedene Antworten und die richtige ist dabei', () => {
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(pool, rnd)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4)
      expect(q.options).toContain(q.answer)
      expect(q.answer).toBe(q.toFrench ? q.item.front : q.item.back)
      expect(q.prompt).toBe(q.toFrench ? q.item.back : q.item.front)
    }
  })

  it('nimmt keinen Ablenker, der für dasselbe Wort ebenfalls richtig wäre', () => {
    const dup: Item[] = [
      { id: 'a', front: 'moi', back: 'ich (betont)' },
      { id: 'b', front: 'moi', back: 'ich / mich / mir' },
      { id: 'c', front: 'je', back: 'ich' },
      { id: 'd', front: 'ich', back: 'ich (betont)' },
      ...Array.from({ length: 8 }, (_, i) => ({ id: `x${i}`, front: `mot${i}`, back: `Wort ${i}` })),
    ]
    for (let i = 0; i < 400; i++) {
      const q = makeQuestion(dup)
      if (q.item.id === 'a' && !q.toFrench) {
        expect(q.options).not.toContain('ich / mich / mir')
      }
      if (q.item.id === 'a' && q.toFrench) {
        expect(q.options.filter((o) => o === 'moi')).toHaveLength(1)
      }
      expect(new Set(q.options).size).toBe(4)
    }
  })

  it('wiederholt nie dasselbe Wort direkt hintereinander', () => {
    let last: string | undefined
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(pool, Math.random, last)
      expect(q.item.id).not.toBe(last)
      last = q.item.id
    }
  })

  it('beide Richtungen kommen vor, Französisch → Deutsch häufiger', () => {
    let toFr = 0
    for (let i = 0; i < 400; i++) if (makeQuestion(pool).toFrench) toFr++
    expect(toFr).toBeGreaterThan(50)
    expect(toFr).toBeLessThan(200)
  })

  it('braucht genug Wörter für vier Antworten', () => {
    expect(BLITZ_MIN_WORDS).toBeGreaterThanOrEqual(4)
  })
})
