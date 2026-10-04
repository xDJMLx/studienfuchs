import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { debouncedStorage } from '../lib/storage'
import { STORAGE } from '../lib/migrate'
import { booksSnapshot, useBooks } from './useBooks'
import { examsSnapshot, useExams } from './useExams'
import { masteryOf, reviewCard, seedKnownCard, type Grade, type SrsCard } from '../lib/srs'
import { achievements as computeAchievements, type AchievementInput } from '../lib/achievements'
import { deckAchievementStats } from '../lib/progress'
import { addProgress, chestReady, emptyDaily, rollChest, UNIT_CHEST_COINS, type ChestReward, type DailyState } from '../lib/rewards'
import { goalInfo } from '../lib/xp'
import { useRewardEvents } from './useRewardEvents'
import { allUnits, findLesson, isLessonDone, isRegular, itemMeta, mathItems, MATH_COURSE, units, type Subject } from '../content'
import { buy, coinsForSession, itemById, toggleEquip, type Outfit } from '../lib/shop'
import { MAX_FREEZES, currentStreak, dayKey, initialStreak, registerActivity, type StreakState } from '../lib/streak'
import type { Arbeit, DeckLang, Item, VocabSet } from '../lib/types'

/** Münzen dafür, eine Arbeit nach dem Termin abzuhaken. */
export const ARBEIT_COINS = 15

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
  /** Aktuelles Fach: Französisch oder Mathe */
  subject: Subject
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
  /** Aufholen: auch alle früheren Klassen komplett nachholen */
  catchUpAll: boolean
  /** Zusatzwortschatz (Berliner Lehrwerke) zählt im Aufholplan mit */
  catchUpExtras: boolean
  /** Der Unterricht läuft weiter: im Aufholplan werden die neuen Lektionen der Klasse eingerechnet */
  catchUpOngoing: boolean
  /** Welches Lehrbuch die Klasse benutzt (für die Auswahl der Einheit beim Aufholen) */
  classBook: 'aplus' | 'decouvertes'
  /** Gewählte Einheit des Lehrbuchs, z. B. "d2-u3" (nur zur Anzeige der Auswahl) */
  classRef: string | null
  /** Münzen: gibt es fürs Lernen, ausgegeben werden sie im Fuchs-Laden (siehe shop.ts) */
  coins: number
  /** Gekaufte Zubehörteile */
  owned: string[]
  /** Angelegtes Zubehör, ein Teil je Platz */
  outfit: Outfit
  /** Längste Serie in Tagen (die aktuelle Serie allein reicht für Belohnungen nicht, sie bricht ab) */
  bestStreak: number
  /** Tagesaufgaben, Zähler und Truhe von heute (siehe rewards.ts) */
  daily: DailyState | null
  /** Bester Punktestand der Blitzrunde */
  blitzBest: number
  /** Wie viele Truhen schon geöffnet wurden (für den Zufall der nächsten) */
  chestsOpened: number
  /** Einheiten, deren Truhe am Ende des Pfads schon geöffnet wurde */
  unitChests: string[]
  /** Klassenarbeiten und Tests mit Termin */
  arbeiten: Arbeit[]
  /** Wie viele Übungsrunden bisher geschafft wurden (für Erfolge) */
  rounds: number
  /** Die Fächer des Schülers (Kennungen aus subjects.ts). Leer = noch nicht gewählt: dann gelten die Fächer mit Stapeln. */
  mySubjects: string[]
  /** Einheiten des Französisch-Kurses, die zum Üben hinzugefügt wurden (Reihenfolge = Reihenfolge des Lernens) */
  addedUnits: string[]
}

/** Angaben zu einem neuen Stapel */
export interface DeckMeta {
  book?: string
  subject?: string
  lang?: DeckLang
  both?: boolean
}

interface Actions {
  /** Stellt sicher, dass es für heute Tagesaufgaben gibt. */
  ensureDaily: () => void
  /** Öffnet die Truhe von heute (null, wenn sie nicht bereit ist). */
  openChest: () => ChestReward | null
  /** Öffnet die Truhe am Ende einer Einheit; gibt die Münzen zurück (0, wenn es noch nicht geht oder schon offen ist). */
  openUnitChest: (unitId: string) => number
  /** Blitzrunde ist zu Ende: zahlt XP und Münzen aus, merkt sich den Rekord. */
  finishBlitz: (r: { score: number; correct: number }) => { xp: number; coins: number; record: boolean; questCoins: number; questsDone: number; allQuests: boolean }
  /** Gibt zurück, wie viele Münzen es für diese Einheit gab. */
  finishSession: (r: { xp: number; grades: Record<string, Grade>; lessonId?: string; accuracy: number; /** Zahl der gelösten Aufgaben */ answered?: number; /** Fächer dieser Runde (für die Tagesaufgabe "Übe in mehreren Fächern") */ subjects?: string[] }) => number
  buyItem: (id: string) => boolean
  equipItem: (id: string) => void
  addSet: (title: string, items: Omit<Item, 'id'>[], meta?: string | DeckMeta) => string
  updateSet: (id: string, patch: { title?: string; items?: Item[]; book?: string; subject?: string; lang?: DeckLang | null; both?: boolean }) => void
  addArbeit: (a: Omit<Arbeit, 'id'>) => string
  updateArbeit: (id: string, patch: Partial<Omit<Arbeit, 'id'>>) => void
  removeArbeit: (id: string) => void
  /** Kurs-Einheit zum Üben hinzufügen oder wieder entfernen */
  toggleUnit: (unitId: string) => void
  toggleSubject: (id: string) => void
  /** Münzen gutschreiben (Meilensteine: Level, Sterne, Arbeits-Marken) */
  addCoins: (n: number) => void
  /** Arbeit nach dem Termin abhaken, optional mit Note. Gibt die Münzen dafür zurück (nur einmal). */
  finishArbeit: (id: string, note?: number) => number
  deleteSet: (id: string) => void
  toggleFavorite: (itemId: string) => void
  markLessonsDone: (lessonIds: string[]) => void
  setExamDate: (setId: string, date: string | null) => void
  setDailyGoal: (n: number) => void
  setSoundOn: (on: boolean) => void
  setGrade: (g: number) => void
  setSubject: (s: Subject) => void
  setTheme: (t: Data['theme']) => void
  setOnboarded: (v: boolean) => void
  setClassUnit: (unitId: string | null) => void
  setCatchUpTarget: (date: string | null) => void
  setCatchUpAll: (v: boolean) => void
  setCatchUpExtras: (v: boolean) => void
  setCatchUpOngoing: (v: boolean) => void
  setClassBook: (b: Data['classBook']) => void
  setClassRef: (ref: string | null) => void
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
  subject: 'fr',
  speechOn: true,
  voiceName: '',
  speechRate: 0.9,
  speakingOn: false,
  favorites: [],
  theme: 'system',
  onboarded: false,
  classUnit: null,
  catchUpTarget: null,
  catchUpAll: false,
  catchUpExtras: false,
  catchUpOngoing: true,
  classBook: 'aplus',
  classRef: null,
  coins: 0,
  owned: [],
  outfit: {},
  bestStreak: 0,
  daily: null,
  blitzBest: 0,
  chestsOpened: 0,
  unitChests: [],
  arbeiten: [],
  addedUnits: [],
  rounds: 0,
  mySubjects: [],
}

const DATA_KEYS = Object.keys(initial) as (keyof Data)[]

/** Die Zahlen, aus denen die Erfolge berechnet werden (wie auf der Profilseite). */
function achievementInput(s: Pick<Data, 'cards' | 'sets' | 'lessons' | 'xp' | 'xpByDay' | 'dailyGoal'> & { rounds?: number; addedUnits?: string[]; arbeiten?: Arbeit[] }, streakDays: number): AchievementInput {
  const setIds = new Set(s.sets.flatMap((x) => x.items.map((i) => i.id)))
  const known = Object.keys(s.cards).filter((id) => itemMeta.has(id) || mathItems.has(id) || setIds.has(id))
  return {
    // Runden und (früher) abgeschlossene Lektionen zählen zusammen
    lessons: (s.rounds ?? 0) + Object.keys(s.lessons).length,
    streak: streakDays,
    xp: s.xp,
    learnedWords: known.length,
    masteredWords: known.filter((id) => masteryOf(s.cards[id]) === 2).length,
    sets: s.sets.length,
    goalDays: Object.values(s.xpByDay).filter((v) => v >= s.dailyGoal).length,
    ...deckAchievementStats(s),
  }
}

const unitOf = (lessonId?: string) => (lessonId ? findLesson(lessonId)?.unit : undefined)

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      ensureDaily: () => {
        const s = get()
        const today = dayKey(new Date())
        if (s.daily?.day === today) return
        set({ daily: emptyDaily(today, { knownWords: Object.keys(s.cards).length, subjects: (s.mySubjects ?? []).length }) })
      },

      openChest: () => {
        const s = get()
        const today = dayKey(new Date())
        const daily = s.daily?.day === today ? s.daily : emptyDaily(today, { knownWords: Object.keys(s.cards).length, subjects: (s.mySubjects ?? []).length })
        if (!chestReady(goalInfo(s.dailyGoal, s.xpByDay[today] ?? 0).baseReached, daily)) return null
        const reward = rollChest(today, s.chestsOpened ?? 0, { owned: s.owned ?? [], freezes: s.streak.freezes, maxFreezes: MAX_FREEZES })
        set({
          daily: { ...daily, chest: reward },
          chestsOpened: (s.chestsOpened ?? 0) + 1,
          coins: (s.coins ?? 0) + (reward.kind === 'coins' ? reward.amount : 0),
          streak: reward.kind === 'freeze' ? { ...s.streak, freezes: Math.min(MAX_FREEZES, s.streak.freezes + 1) } : s.streak,
          owned: reward.kind === 'item' ? [...(s.owned ?? []), reward.id] : s.owned,
        })
        return reward
      },

      openUnitChest: (unitId) => {
        const s = get()
        if ((s.unitChests ?? []).includes(unitId)) return 0
        const unit = allUnits.find((u) => u.id === unitId)
        const regular = unit?.lessons.filter(isRegular) ?? []
        if (!regular.length || !regular.every((l) => isLessonDone(l, s.lessons[l.id]))) return 0
        set({ unitChests: [...(s.unitChests ?? []), unitId], coins: (s.coins ?? 0) + UNIT_CHEST_COINS })
        return UNIT_CHEST_COINS
      },

      finishBlitz: ({ score, correct }) => {
        const s = get()
        const now = new Date()
        const today = dayKey(now)
        const xp = Math.min(15, Math.floor(correct / 3))
        const coins = Math.min(20, Math.floor(score / 40))
        const daily = s.daily?.day === today ? s.daily : emptyDaily(today, { knownWords: Object.keys(s.cards).length, subjects: (s.mySubjects ?? []).length })
        const upd = addProgress(daily, { blitz: 1 })
        const streak = registerActivity(s.streak, now)
        const record = score > (s.blitzBest ?? 0)
        const questCoins = upd.coins + upd.bonus
        set({
          daily: upd.daily,
          blitzBest: Math.max(s.blitzBest ?? 0, score),
          xp: s.xp + xp,
          xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
          streak,
          bestStreak: Math.max(s.bestStreak ?? 0, streak.count),
          coins: (s.coins ?? 0) + coins + questCoins,
        })
        return { xp, coins, record, questCoins, questsDone: upd.completed.length, allQuests: upd.allDone }
      },

      finishSession: ({ xp, grades, lessonId, accuracy, answered, subjects: roundSubjects }) => {
        const s = get()
        const now = new Date()
        const cards = { ...s.cards }
        const ids = Object.keys(grades)
        const newWords = ids.filter((id) => !s.cards[id]).length
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
        const todayBefore = s.xpByDay[today] ?? 0
        const gain = coinsForSession({ xp, dailyGoal: s.dailyGoal, todayBefore, streakBefore: s.streak.count, streakAfter: nextStreak.count }).total

        // Tagesaufgaben zählen und auszahlen
        const dailyBase = s.daily?.day === today ? s.daily : emptyDaily(today, { knownWords: Object.keys(s.cards).length, subjects: (s.mySubjects ?? []).length })
        const subject = lessonId ? (findLesson(lessonId)?.unit.subject === 'math' ? 'math' : 'fr') : s.subject ?? 'fr'
        const upd = addProgress(
          dailyBase,
          {
            newWords,
            reviewed: ids.length - newWords,
            practiced: answered ?? ids.length,
            lessons: lessonId && accuracy >= 0.7 ? 1 : 0,
            perfect: lessonId && accuracy >= 0.9 ? 1 : 0,
            variety: (roundSubjects ?? []).filter((x) => !(dailyBase.subjects ?? []).includes(x)).length,
          },
          subject,
        )
        const questCoins = upd.coins + upd.bonus

        // Was ist neu? Erfolge, abgeschlossene Einheit, Truhe
        const before = computeAchievements(achievementInput(s, currentStreak(s.streak, now))).filter((x) => x.value >= x.goal).map((x) => x.id)
        const after = computeAchievements(achievementInput({ ...s, cards, lessons, rounds: (s.rounds ?? 0) + 1, xp: s.xp + xp, xpByDay: { ...s.xpByDay, [today]: todayBefore + xp } }, nextStreak.count))
        const unit = unitOf(lessonId)
        const regular = unit?.lessons.filter(isRegular) ?? []
        const unitNow = !!unit && regular.length > 0 && regular.every((l) => isLessonDone(l, lessons[l.id])) && !regular.every((l) => isLessonDone(l, s.lessons[l.id]))
        const found = lessonId ? findLesson(lessonId) : undefined
        const becameDone = !!found && isLessonDone(found.lesson, lessons[found.lesson.id]) && !isLessonDone(found.lesson, s.lessons[found.lesson.id])
        useRewardEvents.setState({
          pathDone: becameDone ? found!.lesson.id : null,
          last: {
            quests: upd.completed,
            questCoins,
            allQuests: upd.allDone,
            bonus: upd.bonus,
            achievements: after.filter((x) => x.value >= x.goal && !before.includes(x.id)),
            unit: unitNow && unit ? { id: unit.id, title: unit.title, description: unit.description } : null,
            chestUnlocked: !goalInfo(s.dailyGoal, todayBefore).baseReached && goalInfo(s.dailyGoal, todayBefore + xp).baseReached,
          },
        })

        set({
          cards,
          lessons,
          rounds: (s.rounds ?? 0) + 1,
          daily: { ...upd.daily, subjects: [...new Set([...(dailyBase.subjects ?? []), ...(roundSubjects ?? [])])] },
          xp: s.xp + xp,
          xpByDay: { ...s.xpByDay, [today]: todayBefore + xp },
          streak: nextStreak,
          bestStreak: Math.max(s.bestStreak ?? 0, nextStreak.count),
          coins: (s.coins ?? 0) + gain + questCoins,
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

      addSet: (title, items, metaIn) => {
        const meta: DeckMeta = typeof metaIn === 'string' ? { book: metaIn } : (metaIn ?? {})
        const book = meta.book
        const id = `set-${Date.now().toString(36)}`
        const withIds = items.map((it, i) => ({ ...it, id: `${id}:${i}` }))
        set((s) => ({ sets: [{ id, title, createdAt: new Date().toISOString(), items: withIds, ...(book?.trim() ? { book: book.trim() } : {}), ...(meta.subject ? { subject: meta.subject } : {}), ...(meta.lang ? { lang: meta.lang } : {}), ...(meta.both !== undefined ? { both: meta.both } : {}) }, ...s.sets] }))
        return id
      },

      updateSet: (id, patch) =>
        set((s) => ({
          sets: s.sets.map((x) => {
            if (x.id !== id) return x
            const { lang, ...rest } = patch
            const next = { ...x, ...rest }
            if (lang === null) delete next.lang
            else if (lang) next.lang = lang
            return next
          }),
        })),

      addArbeit: (a) => {
        const id = `arbeit-${Date.now().toString(36)}`
        set((s) => ({ arbeiten: [...(s.arbeiten ?? []), { ...a, id }] }))
        return id
      },
      updateArbeit: (id, patch) => set((s) => ({ arbeiten: (s.arbeiten ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeArbeit: (id) => set((s) => ({ arbeiten: (s.arbeiten ?? []).filter((x) => x.id !== id) })),
      addCoins: (n) => set((s) => ({ coins: (s.coins ?? 0) + Math.max(0, Math.round(n)) })),
      toggleSubject: (id) => set((s) => ({ mySubjects: (s.mySubjects ?? []).includes(id) ? s.mySubjects.filter((x) => x !== id) : [...(s.mySubjects ?? []), id] })),
      finishArbeit: (id, note) => {
        const s = get()
        const a = (s.arbeiten ?? []).find((x) => x.id === id)
        if (!a) return 0
        // Münzen fürs Eintragen, egal wie die Note ist (keine Belohnung für gute, keine Strafe für schlechte Noten)
        const coins = a.done ? 0 : ARBEIT_COINS
        set({
          arbeiten: s.arbeiten.map((x) => (x.id === id ? { ...x, done: true, ...(note ? { note } : {}) } : x)),
          coins: (s.coins ?? 0) + coins,
        })
        return coins
      },
      toggleUnit: (unitId) => set((s) => ({ addedUnits: (s.addedUnits ?? []).includes(unitId) ? s.addedUnits.filter((u) => u !== unitId) : [...(s.addedUnits ?? []), unitId] })),

      deleteSet: (id) =>
        set((s) => {
          const cards = { ...s.cards }
          for (const key of Object.keys(cards)) if (key.startsWith(`${id}:`)) delete cards[key]
          const examDates = { ...s.examDates }
          delete examDates[id]
          // Gelöschte Stapel verschwinden auch aus den Arbeiten
          const arbeiten = (s.arbeiten ?? []).map((a) => ({ ...a, deckIds: a.deckIds.filter((d) => d !== id) }))
          return { sets: s.sets.filter((x) => x.id !== id), cards, examDates, arbeiten }
        }),

      toggleFavorite: (itemId) =>
        set((s) => ({ favorites: s.favorites.includes(itemId) ? s.favorites.filter((x) => x !== itemId) : [...s.favorites, itemId] })),

      // Übersprungene Lektionen (Einstufungstest): Die Wörter bekommen einen ersten Wiederholungstermin in 3 bis 14 Tagen,
      // damit sie nicht für immer unbeachtet bleiben, aber auch nicht alle auf einmal fällig werden.
      markLessonsDone: (lessonIds) =>
        set((s) => {
          const today = dayKey(new Date())
          const lessons = { ...s.lessons }
          const cards = { ...s.cards }
          const now = new Date()
          for (const id of lessonIds) {
            if (!lessons[id]) lessons[id] = { count: 1, bestAccuracy: 1, lastDone: today }
            const found = findLesson(id)
            if (found && !found.lesson.review && !found.lesson.test) for (const it of found.lesson.items) if (!cards[it.id]) cards[it.id] = seedKnownCard(now)
          }
          return { lessons, cards }
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
      setSubject: (subject) => set({ subject }),
      setSpeech: (patch) => set(patch),
      setTheme: (t) => set({ theme: t }),
      setOnboarded: (v) => set({ onboarded: v }),
      setClassUnit: (unitId) => set(unitId ? { classUnit: unitId } : { classUnit: null, catchUpTarget: null }),
      setCatchUpTarget: (date) => set({ catchUpTarget: date }),
      setCatchUpAll: (v) => set({ catchUpAll: v }),
      setCatchUpExtras: (v) => set({ catchUpExtras: v }),
      setCatchUpOngoing: (v) => set({ catchUpOngoing: v }),
      setClassBook: (b) => set({ classBook: b, classRef: null }),
      setClassRef: (ref) => set({ classRef: ref }),

      exportData: () => {
        const s = get()
        const data = Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]]))
        return JSON.stringify({ app: 'studienfuchs', version: 1, data, books: booksSnapshot(), exams: examsSnapshot() }, null, 2)
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
        if (parsed.exams && typeof parsed.exams === 'object') useExams.getState().replaceAll(parsed.exams)
      },

      resetAll: () => {
        set({ ...initial })
        useBooks.getState().replaceAll({ books: [], exams: [] })
        useExams.getState().replaceAll({ exams: [], results: {} })
      },
    }),
    {
      name: STORAGE.state,
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>
        const merged = { ...current, ...p } as Data & Actions
        // Der Mathe-Kurs ist ausgeblendet: wer ihn gewählt hatte, landet wieder in Französisch (Fortschritt bleibt erhalten)
        if (!MATH_COURSE && merged.subject === 'math') merged.subject = 'fr'
        // Stand aus der Zeit mit Lernpfad: Einheiten, aus denen schon Wörter gelernt wurden, bleiben im Üben (sonst würden ihre Wiederholungen verschwinden)
        if (!Array.isArray((p as { addedUnits?: unknown }).addedUnits)) {
          const learned = new Set(Object.keys(merged.cards ?? {}))
          merged.addedUnits = units.filter((u) => u.lessons.some((l) => !l.review && !l.test && l.items.some((i) => learned.has(i.id)))).map((u) => u.id)
        }
        if (!Array.isArray(merged.arbeiten)) merged.arbeiten = []
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
