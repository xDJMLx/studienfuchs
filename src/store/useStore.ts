import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE } from '../lib/migrate'
import { reviewCard, type Grade, type SrsCard } from '../lib/srs'
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
}

interface Actions {
  finishSession: (r: { xp: number; grades: Record<string, Grade>; lessonId?: string; accuracy: number }) => void
  addSet: (title: string, items: Omit<Item, 'id'>[]) => string
  updateSet: (id: string, patch: { title?: string; items?: Item[] }) => void
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
}

const DATA_KEYS = Object.keys(initial) as (keyof Data)[]

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      finishSession: ({ xp, grades, lessonId, accuracy }) =>
        set((s) => {
          const now = new Date()
          const cards = { ...s.cards }
          for (const [itemId, grade] of Object.entries(grades)) cards[itemId] = reviewCard(cards[itemId], grade, now)
          const today = dayKey(now)
          const lessons = { ...s.lessons }
          if (lessonId) {
            const prev = lessons[lessonId]
            lessons[lessonId] = {
              count: (prev?.count ?? 0) + 1,
              bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
              lastDone: today,
            }
          }
          return {
            cards,
            lessons,
            xp: s.xp + xp,
            xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
            streak: registerActivity(s.streak, now),
          }
        }),

      addSet: (title, items) => {
        const id = `set-${Date.now().toString(36)}`
        const withIds = items.map((it, i) => ({ ...it, id: `${id}:${i}` }))
        set((s) => ({ sets: [{ id, title, createdAt: new Date().toISOString(), items: withIds }, ...s.sets] }))
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
        return JSON.stringify({ app: 'studienfuchs', version: 1, data }, null, 2)
      },

      importData: (json) => {
        const parsed = JSON.parse(json)
        // Sicherungen aus der Zeit als "Lernfuchs" bleiben importierbar
        if ((parsed?.app !== 'studienfuchs' && parsed?.app !== 'lernfuchs') || typeof parsed.data !== 'object') throw new Error('Keine gültige Studienfuchs-Datei.')
        const next: Partial<Data> = {}
        for (const k of DATA_KEYS) if (k in parsed.data) (next as Record<string, unknown>)[k] = parsed.data[k]
        set({ ...initial, ...next })
      },

      resetAll: () => set({ ...initial }),
    }),
    { name: STORAGE.state, version: 1 },
  ),
)

export function xpToday(xpByDay: Record<string, number>): number {
  return xpByDay[dayKey()] ?? 0
}

export function streakNow(streak: StreakState): number {
  return currentStreak(streak, new Date())
}
