import { createEmptyCard, fsrs, Rating, State, type Card } from 'ts-fsrs'
import type { Mastery } from './types'

/** Karten werden als JSON im Store gespeichert (Datumsfelder als ISO-Strings). */
export type SrsCard = Card | (Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string | null })

const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 })

export type Grade = 'again' | 'hard' | 'good' | 'easy'
const RATING = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const

export function newCard(now = new Date()): Card {
  return createEmptyCard(now)
}

export function reviewCard(card: SrsCard | undefined, grade: Grade, now = new Date()): Card {
  const base = card ?? newCard(now)
  return scheduler.next(base as Card, now, RATING[grade]).card
}

/**
 * Karte für ein Wort, das jemand schon kann (z. B. nach dem Einstufungstest): Der erste Termin liegt je nach Zufall
 * 3 bis 14 Tage in der Zukunft, damit nicht alles auf einmal fällig wird.
 */
export function seedKnownCard(now = new Date(), rng: () => number = Math.random): Card {
  const card = scheduler.next(newCard(now), now, Rating.Easy).card
  card.due = new Date(now.getTime() + (3 + Math.floor(rng() * 12)) * 86_400_000)
  return card
}

export function isDue(card: SrsCard | undefined, now = new Date()): boolean {
  if (!card) return false
  return new Date(card.due).getTime() <= now.getTime()
}

/** "Sitzt": gefestigt, oder mindestens einmal geübt und schon über mehrere Tage stabil. Grundlage für Sterne, Level und Arbeits-Fortschritt. */
export function isSolid(card: SrsCard | undefined): boolean {
  if (!card || !card.reps) return false
  return masteryOf(card) === 2 || card.stability >= 3
}

/** neu → lernend → gefestigt; steuert, wie schwer die Übungen werden. */
export function masteryOf(card: SrsCard | undefined): Mastery {
  if (!card || card.reps === 0) return 0
  if (card.state === State.Learning || card.state === State.Relearning) return 1
  return card.stability >= 7 ? 2 : 1
}
