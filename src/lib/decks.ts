import { units } from '../content'
import { isDue, isSolid, type SrsCard } from './srs'
import type { Arbeit, DeckLang, Item, VocabSet } from './types'

/** Kennung des Fachs Französisch (Sets ohne Fachangabe gehören dazu). */
export const FRENCH = 'franzoesisch'

/** Ein Stapel Karten: entweder ein eigenes Set oder eine Einheit des Französisch-Kurses. */
export interface Deck {
  id: string
  title: string
  subject: string
  lang?: DeckLang
  both: boolean
  items: Item[]
  kind: 'own' | 'course'
  /** Zusatz unter dem Titel, z. B. "Klasse 7" */
  sub?: string
}

export const unitDeckId = (unitId: string): string => `unit:${unitId}`

export function ownDeck(s: VocabSet): Deck {
  const legacy = s.subject === undefined
  return {
    id: s.id,
    title: s.title,
    subject: s.subject ?? FRENCH,
    lang: s.lang ?? (legacy ? 'fr' : undefined),
    both: s.both ?? legacy,
    items: s.items,
    kind: 'own',
    sub: s.book,
  }
}

/** Alle Stapel aus Kurs-Einheiten (Französisch), ob hinzugefügt oder nicht. */
export const courseDecks = (): Deck[] =>
  units.map((u) => ({
    id: unitDeckId(u.id),
    title: u.title,
    subject: FRENCH,
    lang: 'fr' as const,
    both: true,
    items: u.lessons.filter((l) => !l.review && !l.test).flatMap((l) => l.items),
    kind: 'course' as const,
    sub: `Klasse ${u.grade}${u.extra ? ' · Zusatz' : ''}`,
  }))

let courseCache: Deck[] | null = null
export const allCourseDecks = (): Deck[] => (courseCache ??= courseDecks())

export interface DeckSource {
  sets: VocabSet[]
  /** Kurs-Einheiten, die zum Üben hinzugefügt wurden */
  addedUnits: string[]
}

/** Alle Stapel, die geübt werden: eigene Sets plus hinzugefügte Kurs-Einheiten. */
export function activeDecks(src: DeckSource): Deck[] {
  const added = new Set(src.addedUnits)
  return [...src.sets.map(ownDeck), ...allCourseDecks().filter((d) => added.has(d.id.slice(5)))]
}

/** Jede Karte kennt ihren Stapel (Fach, Sprache, Richtung). */
export interface CardRef {
  item: Item
  deck: Deck
}

export function cardRefs(decks: Deck[]): CardRef[] {
  const seen = new Set<string>()
  const out: CardRef[] = []
  for (const deck of decks)
    for (const item of deck.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push({ item, deck })
    }
  return out
}

export const refsOfSubject = (refs: CardRef[], subject: string): CardRef[] => refs.filter((r) => r.deck.subject === subject)

// ---------- Arbeiten ----------

const dayDiff = (from: Date, toKey: string): number => {
  const [y, m, d] = toKey.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86_400_000)
}

/** Tage bis zur Arbeit (0 = heute, negativ = vorbei). */
export const daysUntil = (arbeit: Arbeit, now = new Date()): number => dayDiff(now, arbeit.date)

/** Wie gut sitzt der Stoff einer Arbeit? "sitzt" = gefestigt oder mindestens gesehen und stabil. */
export function readiness(arbeit: Arbeit, decks: Deck[], cards: Record<string, SrsCard>): { total: number; seen: number; solid: number; pct: number } {
  const refs = cardRefs(decks.filter((d) => arbeit.deckIds.includes(d.id)))
  const seen = refs.filter((r) => cards[r.item.id]?.reps).length
  const solid = refs.filter((r) => isSolid(cards[r.item.id])).length
  return { total: refs.length, seen, solid, pct: refs.length ? Math.round((solid / refs.length) * 100) : 0 }
}

// ---------- Heute ----------

/** Wie viele neue Karten pro Tag, wenn keine Arbeit ansteht. */
export const NEW_PER_DAY = 8
/** Obergrenze neuer Karten pro Tag, auch bei knappem Termin. */
export const NEW_PER_DAY_MAX = 30
/** Karten pro Durchgang. */
export const SESSION_SIZE = 15

export interface TodayPlan {
  /** Fällige Karten, die am längsten überfälligen zuerst */
  due: CardRef[]
  /** Neue Karten, die heute dran sind (Arbeiten zuerst, nach Termin) */
  fresh: CardRef[]
  /** Wie viele neue Karten heute insgesamt vorgesehen sind (auch die schon gelernten) */
  freshQuota: number
  freshToday: number
  /** Nächste Arbeit, falls eine ansteht */
  nextArbeit?: { arbeit: Arbeit; days: number }
}

const sameDay = (iso: string | Date | null | undefined, now: Date): boolean => {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/** Wie viele Karten heute zum ersten Mal geübt wurden. */
export const freshToday = (cards: Record<string, SrsCard>, now = new Date()): number =>
  Object.values(cards).filter((c) => c.reps === 1 && sameDay(c.last_review, now)).length

/**
 * Was heute zu tun ist: erst alles Fällige (kurz bevor man es vergisst), dann neue Karten.
 * Steht eine Arbeit an, werden ihre neuen Karten gleichmäßig auf die Tage verteilt (der letzte Tag bleibt zum Wiederholen frei).
 */
export function planToday(decks: Deck[], arbeiten: Arbeit[], cards: Record<string, SrsCard>, now = new Date()): TodayPlan {
  const refs = cardRefs(decks)
  const due = refs
    .filter((r) => isDue(cards[r.item.id], now))
    .sort((a, b) => new Date(cards[a.item.id].due).getTime() - new Date(cards[b.item.id].due).getTime())

  const upcoming = arbeiten
    .map((a) => ({ arbeit: a, days: daysUntil(a, now) }))
    .filter((a) => a.days >= 0)
    .sort((a, b) => a.days - b.days)

  const fresh: CardRef[] = []
  const taken = new Set<string>()
  let quota = NEW_PER_DAY
  const take = (list: CardRef[], max: number) => {
    for (const r of list) {
      if (fresh.length >= max) break
      if (taken.has(r.item.id) || cards[r.item.id]?.reps) continue
      taken.add(r.item.id)
      fresh.push(r)
    }
  }

  // Arbeiten: unbekannte Karten dieser Stapel, so verteilt, dass bis zum Vortag alles einmal gesehen wurde
  let arbeitQuota = 0
  const perArbeit: { list: CardRef[]; perDay: number }[] = []
  for (const { arbeit, days } of upcoming) {
    const list = cardRefs(decks.filter((d) => arbeit.deckIds.includes(d.id))).filter((r) => !cards[r.item.id]?.reps)
    const perDay = days <= 1 ? list.length : Math.ceil(list.length / Math.max(1, days - 1))
    perArbeit.push({ list, perDay })
    arbeitQuota += perDay
  }
  quota = Math.min(NEW_PER_DAY_MAX, Math.max(NEW_PER_DAY, arbeitQuota))
  const already = freshToday(cards, now)
  const open = Math.max(0, quota - already)
  for (const p of perArbeit) take(p.list, Math.min(open, fresh.length + p.perDay))
  // Rest des Tagesmaßes: eigene Stapel (neueste zuerst), dann Kurs-Einheiten in der Reihenfolge, in der sie hinzugefügt wurden
  take(refs.filter((r) => r.deck.kind === 'own'), open)
  take(refs.filter((r) => r.deck.kind === 'course'), open)

  return { due, fresh, freshQuota: quota, freshToday: already, nextArbeit: upcoming[0] }
}

/**
 * Ein Durchgang aus einer beliebigen Kartenauswahl (Stapel, Fach, Arbeit): erst Fälliges, dann bis zu `freshMax` neue Karten,
 * danach die am schwächsten sitzenden, bis der Durchgang voll ist.
 */
export function pickRound(refs: CardRef[], cards: Record<string, SrsCard>, opts: { size?: number; freshMax?: number; now?: Date } = {}): CardRef[] {
  const size = opts.size ?? SESSION_SIZE
  const now = opts.now ?? new Date()
  const due = refs.filter((r) => isDue(cards[r.item.id], now)).sort((a, b) => new Date(cards[a.item.id].due).getTime() - new Date(cards[b.item.id].due).getTime())
  const fresh = refs.filter((r) => !cards[r.item.id]?.reps)
  const rest = refs.filter((r) => cards[r.item.id]?.reps && !isDue(cards[r.item.id], now)).sort((a, b) => cards[a.item.id].stability - cards[b.item.id].stability)
  const out = due.slice(0, size)
  out.push(...fresh.slice(0, Math.min(opts.freshMax ?? 6, size - out.length)))
  out.push(...rest.slice(0, size - out.length))
  return out
}
