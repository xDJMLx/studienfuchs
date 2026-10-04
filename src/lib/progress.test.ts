import { describe, expect, it } from 'vitest'
import { activeDecks } from './decks'
import { deckStars, diffProgress, levelOfSolid, snapshot, starsOf, subjectStats } from './progress'
import { reviewCard } from './srs'
import type { Arbeit, VocabSet } from './types'

const mk = (id: string, n: number, subject: string): VocabSet => ({ id, title: id, createdAt: '', subject, items: Array.from({ length: n }, (_, i) => ({ id: `${id}:${i}`, front: `F${i}`, back: `B${i}` })) })
const decks = (sets: VocabSet[]) => activeDecks({ sets, addedUnits: [] })
const now = new Date(Date.UTC(2026, 10, 1, 12))
const strong = () => {
  let c = reviewCard(undefined, 'easy', now)
  for (let i = 0; i < 3; i++) c = reviewCard(c, 'easy', new Date(now.getTime() + (i + 1) * 15 * 86_400_000))
  return c
}

describe('Level und Sterne', () => {
  it('Level steigen mit den Karten, die sitzen', () => {
    expect(levelOfSolid(0)).toMatchObject({ level: 1, name: 'Einsteiger', toNext: 5 })
    expect(levelOfSolid(5)).toMatchObject({ level: 2, name: 'Entdecker', toNext: 10 })
    expect(levelOfSolid(34).level).toBe(3)
    expect(levelOfSolid(35).level).toBe(4)
    expect(levelOfSolid(9999)).toMatchObject({ level: 8, toNext: 0, pct: 1 })
  })

  it('Sterne ab 30, 60 und 90 Prozent', () => {
    expect([0, 2, 3, 5, 6, 8, 9, 10].map((s) => starsOf(s, 10))).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
    expect(starsOf(0, 0)).toBe(0)
  })
})

describe('Stand je Fach und Unterschied nach einer Runde', () => {
  const bio = mk('bio', 10, 'biologie')
  const eng = mk('eng', 4, 'englisch')
  const d = decks([bio, eng])
  const arbeit: Arbeit = { id: 'a1', subject: 'biologie', title: 'Bio', date: '2026-12-01', deckIds: ['bio'] }

  it('zählt je Fach gesehen und sitzend', () => {
    const cards = { 'bio:0': strong(), 'bio:1': reviewCard(undefined, 'good', now), 'eng:0': strong() }
    const s = subjectStats(d, cards)
    expect(s.biologie).toMatchObject({ total: 10, seen: 2, solid: 1 })
    expect(s.englisch).toMatchObject({ total: 4, seen: 1, solid: 1 })
    expect(deckStars(d[0], cards)).toBe(0)
  })

  it('Unterschied: neu gelernt, jetzt fest, Sterne, Level und Marke der Arbeit', () => {
    const before = snapshot(d, [arbeit], { 'bio:0': reviewCard(undefined, 'good', now) })
    // In der Runde werden 5 Karten fest und 2 neue gelernt
    const cards: Record<string, ReturnType<typeof strong>> = {}
    for (let i = 0; i < 5; i++) cards[`bio:${i}`] = strong()
    cards['bio:5'] = reviewCard(undefined, 'good', now) as ReturnType<typeof strong>
    cards['bio:6'] = reviewCard(undefined, 'good', now) as ReturnType<typeof strong>
    const after = snapshot(d, [arbeit], cards)
    const diff = diffProgress(before, after)
    expect(diff.learned).toBe(6)
    expect(diff.solidGain).toBe(5)
    expect(diff.levelUps).toEqual([{ subject: 'biologie', from: 1, to: 2, name: 'Entdecker' }])
    expect(diff.newStars).toEqual([{ deckId: 'bio', stars: 2 }].map((x) => ({ ...x, stars: starsOf(5, 10) })))
    expect(diff.arbeit).toEqual([{ id: 'a1', from: 0, to: 50, milestone: 50 }])
  })

  it('ohne Fortschritt gibt es nichts zu feiern', () => {
    const s = snapshot(d, [arbeit], {})
    expect(diffProgress(s, s)).toEqual({ learned: 0, solidGain: 0, levelUps: [], newStars: [], arbeit: [] })
  })
})

import { achievements } from './achievements'
import { BONUS, bonusCoins, deckAchievementStats } from './progress'

describe('Meilenstein-Münzen und Erfolge', () => {
  it('Münzen für Level, Sterne und Arbeits-Marken', () => {
    expect(bonusCoins({ learned: 3, solidGain: 2, levelUps: [], newStars: [], arbeit: [{ id: 'a', from: 10, to: 20 }] })).toBe(0)
    expect(
      bonusCoins({
        learned: 0,
        solidGain: 0,
        levelUps: [{ subject: 'x', from: 1, to: 2, name: 'n' }],
        newStars: [{ deckId: 'd', stars: 2 }],
        arbeit: [{ id: 'a', from: 40, to: 55, milestone: 50 }],
      }),
    ).toBe(BONUS.level + 2 * BONUS.star + BONUS.milestone)
  })

  it('Erfolge für Stapel, Arbeiten, Fächer, Sterne und Level', () => {
    const sets = [mk('a', 6, 'biologie'), mk('b', 5, 'englisch'), mk('c', 5, 'mathe')]
    const cards: Record<string, ReturnType<typeof strong>> = {}
    for (const s of sets) for (const i of s.items) cards[i.id] = strong()
    const stats = deckAchievementStats({ sets, cards, arbeiten: [{ id: '1', subject: 'biologie', title: 't', date: '2030-01-01', deckIds: [] }] })
    expect(stats).toMatchObject({ decks: 3, arbeiten: 1, subjectsPracticed: 3, fullStars: 3 })
    const got = Object.fromEntries(achievements({ lessons: 0, xp: 0, learnedWords: 0, masteredWords: 0, sets: 0, goalDays: 0, ...stats }).map((a) => [a.id, a.value >= a.goal]))
    expect(got).toMatchObject({ set: true, decks5: false, arbeit1: true, subjects3: true, star3: true })
  })
})
