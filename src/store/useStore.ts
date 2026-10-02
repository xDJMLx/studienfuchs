import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE } from '../lib/migrate'
import { booksSnapshot, useBooks } from './useBooks'
import { reviewCard, type Grade, type SrsCard } from '../lib/srs'
import { buy, coinsForSession, itemById, toggleEquip, type Outfit } from '../lib/shop'
import { currentStreak, dayKey, initialStreak, registerActivity, type StreakState } from '../lib/streak'
import type { Item, VocabSet } from '../lib/types'

export interface LessonRecord {
  count: number
  bestAccuracy: number
  lastDone: string
}

interface Data {
  xp: number
  xpByDay: Record<string, number>
  dailyGoal: number
  streak: StreakState
  cards: Record<string, SrsCard>
  lessons: Record<string, LessonRecord>
  sets: VocabSet[]
  examDates: Record<string, string> // setId → YYYY-MM-DD
  soundOn: boolean
  grade: number
  speechOn: boolean
  /** Name der gewählten Stimme; leer = automatisch die beste französische Stimme. */
  voiceName: string
  speechRate: number
  /** Sprechübungen mit Mikrofon (optional, braucht Zugriff aufs Mikrofon) */
  speakingOn: boolean
  /** Als schwierig/wichtig markierte Wörter (Sterne im Wörterbuch) */
  favorites: string[]
  theme: 'system' | 'light' | 'dark'
  onboarded: boolean
  /** Einheit, bei der die Klasse gerade im Buch ist (für den Aufhol-Modus) */
  classUnit: string | null
  /** Zieldatum des Aufholplans (YYYY-MM-DD), null = kein Plan */
  catchUpTarget: string | null
  /** Münzen: gibt es fürs Lernen, ausgegeben werden sie im Fuchs-Laden (siehe shop.ts) */
  coins: number
  /** Gekaufte Zubehörteile */
  owned: string[]
  /** Angelegtes Zubehör, ein Teil je Platz */
  outfit: Outfit
  /** Längste Serie in Tagen (die aktuelle Serie allein reicht für Belohnungen nicht, sie bricht ab) */
  bestStreak: number
}

interface Actions {
  /** Gibt zurück, wie viele Münzen es für diese Einheit gab. */
  finishSession: (r: { xp: number; grades: Record<string, Grade>; lessonId?: string; accuracy: number }) => number
  buyItem: (id: string) => boolean
  equipItem: (id: string) => void
  addSet: (title: string, items: Omit<Item, 'id'>[], book?: string) => string
  updateSet: (id: string, patch: { title?: string; items?: Item[]; book?: string }) => void
  deleteSet: (id: string) => void
  toggleFavorite: (itemId: string) => void
  markLessonsDone: (lessonIds: string[]) => void
  setExamDate: (setId: string, date: string | null) => void
  setDailyGoal: (n: number) => void
  setSoundOn: (on: boolean) => void
  setGrade: (g: number) => void
  setTheme: (t: Data['theme']) => void
  setOnboarded: (v: boolean) => void
  setClassUnit: (unitId: string | null) => void
  setCatchUpTarget: (date: string | null) => void
  setSpeech: (patch: Partial<Pick<Data, 'speechOn' | 'voiceName' | 'speechRate' | 'speakingOn'>>) => void
  exportData: () => string
  importData: (json: string) => void
  resetAll: () => void
}

const initial: Data = {
  xp: 0,
  xpByDay: {},
  dailyGoal: 20,
  streak: initialStreak,
  cards: {},
  lessons: {},
  sets: [],
  examDates: {},
  soundOn: true,
  grade: 7,
  speechOn: true,
  voiceName: '',
  speechRate: 0.9,
  speakingOn: false,
  favorites: [],
  theme: 'system',
  onboarded: false,
  classUnit: null,
  catchUpTarget: null,
  coins: 0,
  owned: [],
  outfit: {},
  bestStreak: 0,
}

const DATA_KEYS = Object.keys(initial) as (keyof Data)[]

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      finishSession: ({ xp, grades, lessonId, accuracy }) => {
        const s = get()
        const now = new Date()
        const cards = { ...s.cards }
        for (const [itemId, grade] of Object.entries(grades)) cards[itemId] = reviewCard(cards[itemId], grade, now)
        const today = dayKey(now)
        const nextStreak = registerActivity(s.streak, now)
        const lessons = { ...s.lessons }
        if (lessonId) {
          const prev = lessons[lessonId]
          lessons[lessonId] = {
            count: (prev?.count ?? 0) + 1,
            bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
            lastDone: today,
          }
        }
        const gain = coinsForSession({ xp, dailyGoal: s.dailyGoal, todayBefore: s.xpByDay[today] ?? 0, streakBefore: s.streak.count, streakAfter: nextStreak.count }).total
        set({
          cards,
          lessons,
          xp: s.xp + xp,
          xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
          streak: nextStreak,
          bestStreak: Math.max(s.bestStreak ?? 0, nextStreak.count),
          coins: (s.coins ?? 0) + gain,
        })
        return gain
      },

      buyItem: (id) => {
        const s = get()
        const next = buy({ coins: s.coins ?? 0, owned: s.owned ?? [] }, id)
        if (!next) return false
        // Frisch gekauft heißt: gleich anlegen
        set({ ...next, outfit: toggleEquip(s.outfit ?? {}, next.owned, id) })
        return true
      },

      equipItem: (id) => set((s) => ({ outfit: toggleEquip(s.outfit ?? {}, s.owned ?? [], id) })),

      addSet: (title, items, book) => {
        const id = `set-${Date.now().toString(36)}`
        const withIds = items.map((it, i) => ({ ...it, id: `${id}:${i}` }))
        set((s) => ({ sets: [{ id, title, createdAt: new Date().toISOString(), items: withIds, ...(book?.trim() ? { book: book.trim() } : {}) }, ...s.sets] }))
        return id
      },

      updateSet: (id, patch) =>
        set((s) => ({ sets: s.sets.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

      deleteSet: (id) =>
        set((s) => {
          const cards = { ...s.cards }
          for (const key of Object.keys(cards)) if (key.startsWith(`${id}:`)) delete cards[key]
          const examDates = { ...s.examDates }
          delete examDates[id]
          return { sets: s.sets.filter((x) => x.id !== id), cards, examDates }
        }),

      toggleFavorite: (itemId) =>
        set((s) => ({ favorites: s.favorites.includes(itemId) ? s.favorites.filter((x) => x !== itemId) : [...s.favorites, itemId] })),

      markLessonsDone: (lessonIds) =>
        set((s) => {
          const today = dayKey(new Date())
          const lessons = { ...s.lessons }
          for (const id of lessonIds) if (!lessons[id]) lessons[id] = { count: 1, bestAccuracy: 1, lastDone: today }
          return { lessons }
        }),

      setExamDate: (setId, date) =>
        set((s) => {
          const examDates = { ...s.examDates }
          if (date) examDates[setId] = date
          else delete examDates[setId]
          return { examDates }
        }),

      setDailyGoal: (n) => set({ dailyGoal: n }),
      setSoundOn: (on) => set({ soundOn: on }),
      setGrade: (g) => set({ grade: g }),
      setSpeech: (patch) => set(patch),
      setTheme: (t) => set({ theme: t }),
      setOnboarded: (v) => set({ onboarded: v }),
      setClassUnit: (unitId) => set(unitId ? { classUnit: unitId } : { classUnit: null, catchUpTarget: null }),
      setCatchUpTarget: (date) => set({ catchUpTarget: date }),

      exportData: () => {
        const s = get()
        const data = Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]]))
        return JSON.stringify({ app: 'studienfuchs', version: 1, data, books: booksSnapshot() }, null, 2)
      },

      importData: (json) => {
        const parsed = JSON.parse(json)
        // Sicherungen aus der Zeit als "Lernfuchs" bleiben importierbar
        if ((parsed?.app !== 'studienfuchs' && parsed?.app !== 'lernfuchs') || typeof parsed.data !== 'object') throw new Error('Keine gültige Studienfuchs-Datei.')
        const next: Partial<Data> = {}
        for (const k of DATA_KEYS) if (k in parsed.data) (next as Record<string, unknown>)[k] = parsed.data[k]
        set({ ...initial, ...next })
        // Bücher (nur in neueren Sicherungen); ältere Sicherungen lassen die vorhandenen Bücher in Ruhe
        if (parsed.books && typeof parsed.books === 'object') useBooks.getState().replaceAll(parsed.books)
      },

      resetAll: () => {
        set({ ...initial })
        useBooks.getState().replaceAll({ books: [], exams: [] })
      },
    }),
    {
      name: STORAGE.state,
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>
        const merged = { ...current, ...p } as Data & Actions
        if (p.coins === undefined) {
          // Stand aus der Zeit vor dem Fuchs-Laden: bisher gesammelte XP zählen rückwirkend als Münzen
          merged.coins = Math.floor(((p.xp as number) ?? 0) / 2)
          const old = typeof p.avatar === 'string' && p.avatar !== 'none' ? (p.avatar as string) : null
          const item = old ? itemById(old) : undefined
          merged.owned = item ? [item.id] : []
          merged.outfit = item ? { [item.slot]: item.id } : {}
        }
        return merged
      },
    },
  ),
)

export function xpToday(xpByDay: Record<string, number>): number {
  return xpByDay[dayKey()] ?? 0
}

export function streakNow(streak: StreakState): number {
  return currentStreak(streak, new Date())
}
