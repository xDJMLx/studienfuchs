import { allItems, units } from '../content'
import { isDue, type SrsCard } from './srs'
import type { Item, VocabSet } from './types'

/** Welche Wörter sollen geübt werden? */
export type Scope = 'learned' | 'due' | 'weak' | 'favorites' | `unit:${string}` | `set:${string}`

export interface ScopeContext {
  cards: Record<string, SrsCard>
  favorites: string[]
  sets: VocabSet[]
}

const unitItems = (id: string): Item[] => units.find((u) => u.id === id)?.lessons.filter((l) => !l.review && !l.test).flatMap((l) => l.items) ?? []

export function itemsForScope(scope: Scope, ctx: ScopeContext): Item[] {
  const index = new Map<string, Item>()
  for (const i of allItems) index.set(i.id, i)
  for (const s of ctx.sets) for (const i of s.items) index.set(i.id, i)
  const learned = Object.keys(ctx.cards).flatMap((id) => (index.has(id) ? [index.get(id) as Item] : []))

  if (scope === 'learned') return learned
  if (scope === 'due') return learned.filter((i) => isDue(ctx.cards[i.id]))
  if (scope === 'weak') return learned.filter((i) => ctx.cards[i.id].stability < 2 || ctx.cards[i.id].lapses > 0)
  if (scope === 'favorites') return ctx.favorites.flatMap((id) => (index.has(id) ? [index.get(id) as Item] : []))
  if (scope.startsWith('unit:')) return unitItems(scope.slice(5))
  if (scope.startsWith('set:')) return ctx.sets.find((s) => s.id === scope.slice(4))?.items ?? []
  return []
}

export const SCOPE_LABELS: Record<string, string> = {
  learned: 'Alle gelernten Wörter',
  due: 'Fällige Wörter',
  weak: 'Schwierige Wörter',
  favorites: 'Merkliste',
}

export function scopeLabel(scope: Scope): string {
  if (scope.startsWith('unit:')) return units.find((u) => u.id === scope.slice(5))?.title ?? 'Einheit'
  if (scope.startsWith('set:')) return 'Eigenes Set'
  return SCOPE_LABELS[scope] ?? scope
}
