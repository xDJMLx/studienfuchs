import { z } from 'zod'
import { persist, createJSONStorage } from 'zustand/middleware'
import { STORAGE } from '../lib/migrate'
import { safeStorage } from '../lib/storage'
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

const importedDataSchema = z.object({
  xp: z.number().default(0),
  xpByDay: z.record(z.number()).default({}),
  dailyGoal: z.number().default(20),
  streak: z.any().default(initial.streak),
  cards: z.record(z.any()).default({}),
  lessons: z.record(
    z.object({
      count: z.number().default(0),
      bestAccuracy: z.number().default(0),
      lastDone: z.string().default(''),
    }),
  ).default({}),
  sets: z.array(z.any()).default([]),
  examDates: z.record(z.string()).default({}),
  soundOn: z.boolean().default(true),
  grade: z.number().default(7),
  speechOn: z.boolean().default(true),
  voiceName: z.string().default(''),
  speechRate: z.number().default(0.9),
  speakingOn: z.boolean().default(false),
  favorites: z.array(z.string()).default([]),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  onboarded: z.boolean().default(false),
  classUnit: z.string().nullable().default(null),
  catchUpTarget: z.string().nullable().default(null),
})

const sanitizeTitle = (input: string): string => input.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Neues Set'

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
        const cleanTitle = sanitizeTitle(title)
        const withIds = items.map((it, i) => ({ ...it, id: `${id}:${i}` }))
        set((s) => ({ sets: [{ id, title: cleanTitle, createdAt: new Date().toISOString(), items: withIds }, ...s.sets] }))
        return id
      },

      updateSet: (id, patch) =>
        set((s) => ({
          sets: s.sets.map((x) => (x.id === id ? { ...x, ...patch, title: patch.title ? sanitizeTitle(patch.title) : x.title } : x)),
        })),

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
        if ((parsed?.app !== 'studienfuchs' && parsed?.app !== 'lernfuchs') || typeof parsed?.data !== 'object' || parsed.data === null) {
          throw new Error('Keine gültige Studienfuchs-Datei.')
        }

        const valid = importedDataSchema.safeParse(parsed.data)
        if (!valid.success) {
          throw new Error(`Importdaten sind ungültig: ${valid.error.issues[0]?.message ?? 'Fehlerhafte Struktur'}`)
        }

        const next: Partial<Data> = valid.data
        set({ ...initial, ...next })
      },

      resetAll: () => set({ ...initial }),
    }),
    {
      name: STORAGE.state,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
    },
  ),
)

export function xpToday(xpByDay: Record<string, number>): number {
  return xpByDay[dayKey()] ?? 0
}

export function streakNow(streak: StreakState): number {
  return currentStreak(streak, new Date())
}
