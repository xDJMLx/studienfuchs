import { goalInfo } from './xp'

/**
 * Fuchs-Laden: Münzen gibt es nur durchs Lernen, Zubehör gibt es nur für Münzen.
 * Gezeichnet werden die Teile in Mascot.tsx (pro Platz höchstens ein Teil).
 */
export type Slot = 'kopf' | 'gesicht' | 'hals' | 'hintergrund'

export interface ShopItem {
  id: string
  slot: Slot
  label: string
  price: number
}

export const SLOTS: { id: Slot; label: string }[] = [
  { id: 'kopf', label: 'Kopf' },
  { id: 'gesicht', label: 'Gesicht' },
  { id: 'hals', label: 'Hals' },
  { id: 'hintergrund', label: 'Hintergrund' },
]

export const ITEMS: ShopItem[] = [
  { id: 'brille', slot: 'gesicht', label: 'Lernbrille', price: 40 },
  { id: 'sonnenbrille', slot: 'gesicht', label: 'Sonnenbrille', price: 110 },
  { id: 'schnurrbart', slot: 'gesicht', label: 'Schnurrbart', price: 90 },
  { id: 'muetze', slot: 'kopf', label: 'Mütze', price: 60 },
  { id: 'kappe', slot: 'kopf', label: 'Kappe', price: 90 },
  { id: 'zylinder', slot: 'kopf', label: 'Zylinder', price: 180 },
  { id: 'krone', slot: 'kopf', label: 'Krone', price: 450 },
  { id: 'schal', slot: 'hals', label: 'Schal', price: 55 },
  { id: 'fliege', slot: 'hals', label: 'Fliege', price: 85 },
  { id: 'medaille', slot: 'hals', label: 'Goldmedaille', price: 260 },
  { id: 'sonne', slot: 'hintergrund', label: 'Sonne', price: 120 },
  { id: 'nacht', slot: 'hintergrund', label: 'Sternennacht', price: 200 },
  { id: 'aura', slot: 'hintergrund', label: 'Goldaura', price: 380 },
]

export type Outfit = Partial<Record<Slot, string>>

export const itemById = (id: string): ShopItem | undefined => ITEMS.find((i) => i.id === id)

/** Münzen für eine Übungseinheit: 1 Münze je 2 XP, dazu Prämien für Tagesziel, Bonusziele und Serien. */
export function coinsForSession(p: { xp: number; dailyGoal: number; todayBefore: number; streakBefore: number; streakAfter: number }): { total: number; base: number; goal: number; streak: number } {
  const base = Math.floor(p.xp / 2)
  const before = goalInfo(p.dailyGoal, p.todayBefore).tier
  const after = goalInfo(p.dailyGoal, p.todayBefore + p.xp).tier
  let goal = 0
  if (after > before) {
    // Mindestziel: 10, jedes Bonusziel danach 5
    for (let t = before + 1; t <= after; t++) goal += t === 1 ? 10 : 5
  }
  // Keine Serien-Prämie: Geübt wird für Arbeiten, nicht für eine Strähne
  const streak = 0
  return { total: base + goal + streak, base, goal, streak }
}

/** Kauf: gibt den neuen Stand zurück oder null, wenn es nicht geht. */
export function buy(state: { coins: number; owned: string[] }, id: string): { coins: number; owned: string[] } | null {
  const item = itemById(id)
  if (!item || state.owned.includes(id) || state.coins < item.price) return null
  return { coins: state.coins - item.price, owned: [...state.owned, id] }
}

/** Anlegen: ein Teil je Platz. Dasselbe Teil nochmal antippen nimmt es ab. */
export function toggleEquip(outfit: Outfit, owned: string[], id: string): Outfit {
  const item = itemById(id)
  if (!item || !owned.includes(id)) return outfit
  const next = { ...outfit }
  if (next[item.slot] === id) delete next[item.slot]
  else next[item.slot] = id
  return next
}
