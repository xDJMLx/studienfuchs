import { activeDecks, cardRefs, readiness, type Deck } from './decks'
import { isSolid, type SrsCard } from './srs'
import type { Arbeit, VocabSet } from './types'

/** Fach-Level: Je mehr Karten eines Fachs sitzen, desto höher. */
export const LEVELS = [
  { at: 0, name: 'Einsteiger' },
  { at: 5, name: 'Entdecker' },
  { at: 15, name: 'Lerner' },
  { at: 35, name: 'Fortgeschrittener' },
  { at: 70, name: 'Profi' },
  { at: 120, name: 'Experte' },
  { at: 200, name: 'Meister' },
  { at: 320, name: 'Legende' },
] as const

export interface LevelInfo {
  /** 1 bis 8 */
  level: number
  name: string
  /** Karten, die für das nächste Level fehlen (0 beim höchsten) */
  toNext: number
  /** Fortschritt innerhalb des Levels, 0 bis 1 */
  pct: number
  next?: string
}

export function levelOfSolid(solid: number): LevelInfo {
  let i = 0
  while (i + 1 < LEVELS.length && solid >= LEVELS[i + 1].at) i++
  const next = LEVELS[i + 1]
  return {
    level: i + 1,
    name: LEVELS[i].name,
    toNext: next ? next.at - solid : 0,
    pct: next ? (solid - LEVELS[i].at) / (next.at - LEVELS[i].at) : 1,
    next: next?.name,
  }
}

/** Sterne eines Stapels: 1 ab 30 %, 2 ab 60 %, 3 ab 90 % der Karten sitzen. */
export function starsOf(solid: number, total: number): 0 | 1 | 2 | 3 {
  if (!total) return 0
  const p = solid / total
  return p >= 0.9 ? 3 : p >= 0.6 ? 2 : p >= 0.3 ? 1 : 0
}

export const deckStars = (deck: Deck, cards: Record<string, SrsCard>): 0 | 1 | 2 | 3 => starsOf(deck.items.filter((i) => isSolid(cards[i.id])).length, deck.items.length)

export interface SubjectStat {
  total: number
  seen: number
  solid: number
  level: LevelInfo
}

/** Stand je Fach über alle Stapel des Fachs. */
export function subjectStats(decks: Deck[], cards: Record<string, SrsCard>): Record<string, SubjectStat> {
  const out: Record<string, SubjectStat> = {}
  for (const r of cardRefs(decks)) {
    const s = (out[r.deck.subject] ??= { total: 0, seen: 0, solid: 0, level: levelOfSolid(0) })
    s.total++
    if (cards[r.item.id]?.reps) s.seen++
    if (isSolid(cards[r.item.id])) s.solid++
  }
  for (const s of Object.values(out)) s.level = levelOfSolid(s.solid)
  return out
}

/** Momentaufnahme vor und nach einer Runde: daraus entstehen die Glückwünsche. */
export interface Snapshot {
  solidBySubject: Record<string, number>
  seenBySubject: Record<string, number>
  stars: Record<string, number>
  arbeit: Record<string, number>
  solidCards: Set<string>
  seenCards: Set<string>
}

export function snapshot(decks: Deck[], arbeiten: Arbeit[], cards: Record<string, SrsCard>): Snapshot {
  const stats = subjectStats(decks, cards)
  const refs = cardRefs(decks)
  return {
    solidBySubject: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.solid])),
    seenBySubject: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.seen])),
    stars: Object.fromEntries(decks.map((d) => [d.id, deckStars(d, cards)])),
    arbeit: Object.fromEntries(arbeiten.map((a) => [a.id, readiness(a, decks, cards).pct])),
    solidCards: new Set(refs.filter((r) => isSolid(cards[r.item.id])).map((r) => r.item.id)),
    seenCards: new Set(refs.filter((r) => cards[r.item.id]?.reps).map((r) => r.item.id)),
  }
}

export const ARBEIT_MILESTONES = [25, 50, 75, 100] as const

export interface ProgressDiff {
  /** Karten, die in dieser Runde zum ersten Mal geübt wurden */
  learned: number
  /** Karten, die jetzt sitzen und vorher nicht saßen */
  solidGain: number
  levelUps: { subject: string; from: number; to: number; name: string }[]
  newStars: { deckId: string; stars: number }[]
  /** Fortschritt einer Arbeit, mit der erreichten Marke (25/50/75/100), falls eine überschritten wurde */
  arbeit: { id: string; from: number; to: number; milestone?: number }[]
}

export function diffProgress(before: Snapshot, after: Snapshot): ProgressDiff {
  const levelUps = Object.keys(after.solidBySubject).flatMap((subject) => {
    const from = levelOfSolid(before.solidBySubject[subject] ?? 0)
    const to = levelOfSolid(after.solidBySubject[subject])
    return to.level > from.level ? [{ subject, from: from.level, to: to.level, name: to.name }] : []
  })
  const newStars = Object.entries(after.stars)
    .filter(([id, s]) => s > (before.stars[id] ?? 0))
    .map(([deckId, stars]) => ({ deckId, stars }))
  const arbeit = Object.entries(after.arbeit)
    .filter(([id, to]) => to > (before.arbeit[id] ?? 0))
    .map(([id, to]) => {
      const from = before.arbeit[id] ?? 0
      return { id, from, to, milestone: [...ARBEIT_MILESTONES].reverse().find((m) => from < m && to >= m) }
    })
  return {
    learned: [...after.seenCards].filter((id) => !before.seenCards.has(id)).length,
    solidGain: [...after.solidCards].filter((id) => !before.solidCards.has(id)).length,
    levelUps,
    newStars,
    arbeit,
  }
}

/** Zahlen rund um Stapel, Fächer und Arbeiten für die Erfolge. */
export function deckAchievementStats(state: { sets: VocabSet[]; addedUnits?: string[]; arbeiten?: Arbeit[]; cards: Record<string, SrsCard> }): { decks: number; arbeiten: number; subjectsPracticed: number; fullStars: number; maxLevel: number } {
  const decks = activeDecks({ sets: state.sets, addedUnits: state.addedUnits ?? [] })
  const stats = Object.values(subjectStats(decks, state.cards))
  return {
    decks: state.sets.length,
    arbeiten: (state.arbeiten ?? []).length,
    subjectsPracticed: stats.filter((s) => s.seen > 0).length,
    fullStars: decks.filter((d) => d.items.length >= 5 && deckStars(d, state.cards) === 3).length,
    maxLevel: stats.reduce((m, s) => Math.max(m, s.level.level), 1),
  }
}

/** Münzen für Meilensteine einer Runde: Level, Sterne und Marken einer Arbeit. */
export const BONUS = { level: 20, star: 5, milestone: 8 } as const

export function bonusCoins(diff: ProgressDiff): number {
  return (
    diff.levelUps.length * BONUS.level +
    diff.newStars.reduce((n, s) => n + s.stars * BONUS.star, 0) +
    diff.arbeit.filter((a) => a.milestone).length * BONUS.milestone
  )
}
