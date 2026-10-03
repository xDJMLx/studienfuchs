import { ITEMS } from './shop'

/**
 * Belohnungen, die jeden Tag etwas Neues bieten: Tagesaufgaben, die Überraschungs-Truhe und die Begrüßung des Fuchses.
 * Alles hier ist reine Logik ohne Oberfläche und ohne Zufall, der sich neu würfeln ließe: Was heute gilt, folgt aus dem Datum.
 * Es gibt nie Strafen. Wer einen Tag verpasst, verpasst nur die Extras dieses Tages.
 */

export type QuestMetric = 'newWords' | 'practiced' | 'reviewed' | 'lessons' | 'perfect' | 'blitz'

export interface QuestDef {
  id: string
  metric: QuestMetric
  target: number
  coins: number
  text: string
}

/** Was an einem Tag gezählt wird. */
export type DailyStats = Record<QuestMetric, number>

const ZERO: DailyStats = { newWords: 0, practiced: 0, reviewed: 0, lessons: 0, perfect: 0, blitz: 0 }

export type ChestReward = { kind: 'coins'; amount: number; lucky: boolean } | { kind: 'freeze' } | { kind: 'item'; id: string }

export interface DailyState {
  day: string
  /** Die drei Aufgaben von heute (Kennungen wie "newWords:4") */
  quests: string[]
  stats: DailyStats
  /** Schon bezahlte Aufgaben */
  claimed: string[]
  /** Bonus für alle drei Aufgaben ist ausgezahlt */
  bonusClaimed: boolean
  /** Inhalt der heute geöffneten Truhe */
  chest: ChestReward | null
}

export const QUEST_BONUS = 10
/** Münzen in der Truhe am Ende jeder Einheit (einmal pro Einheit, sobald alle Lektionen geschafft sind). */
export const UNIT_CHEST_COINS = 25

const TEXT: Record<QuestMetric, (n: number) => string> = {
  newWords: (n) => `Lerne ${n} neue Wörter`,
  practiced: (n) => `Übe ${n} Wörter`,
  reviewed: (n) => `Wiederhole ${n} Wörter, die du schon kennst`,
  lessons: (n) => (n === 1 ? 'Schließe eine Lektion ab' : `Schließe ${n} Lektionen ab`),
  perfect: () => 'Schaffe eine Lektion mit mindestens 90 %',
  blitz: () => 'Spiele eine Blitzrunde',
}

/** Mögliche Ziele je Aufgabe, vom leichten zum etwas schwereren. */
const TARGETS: Record<QuestMetric, number[]> = {
  newWords: [4, 8],
  practiced: [10, 20],
  reviewed: [6, 12],
  lessons: [1, 2],
  perfect: [1],
  blitz: [1],
}

export function questDef(id: string): QuestDef | null {
  const [metric, t] = id.split(':')
  const target = Number(t)
  if (!(metric in TARGETS) || !Number.isFinite(target)) return null
  const m = metric as QuestMetric
  const idx = TARGETS[m].indexOf(target)
  if (idx < 0) return null
  return { id, metric: m, target, coins: m === 'perfect' ? 8 : 5 + idx * 3, text: TEXT[m](target) }
}

/** Kleiner, stabiler Zufall aus einem Text (gleiche Eingabe, gleiche Folge). */
function rng(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Drei verschiedene Aufgaben für diesen Tag. Wiederholen gibt es nur, wenn schon genug Wörter bekannt sind;
 * mindestens eine ist immer leicht erreichbar (Lektion, neue Wörter oder Üben).
 */
export function pickQuests(day: string, ctx: { knownWords: number }): string[] {
  const r = rng('quests:' + day)
  const metrics: QuestMetric[] = ['newWords', 'practiced', 'lessons', 'perfect', 'blitz']
  if (ctx.knownWords >= 8) metrics.push('reviewed')
  const order = metrics.map((m) => ({ m, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.m)
  const easy: QuestMetric[] = ['lessons', 'newWords', 'practiced']
  const chosen = order.slice(0, 3)
  if (!chosen.some((m) => easy.includes(m))) chosen[2] = order.find((m) => easy.includes(m)) ?? 'lessons'
  return chosen.map((m) => {
    const t = TARGETS[m]
    // Meist das leichte Ziel, manchmal das etwas höhere
    const idx = t.length > 1 && r() < 0.35 ? 1 : 0
    return `${m}:${t[idx]}`
  })
}

export function emptyDaily(day: string, ctx: { knownWords: number }): DailyState {
  return { day, quests: pickQuests(day, ctx), stats: { ...ZERO }, claimed: [], bonusClaimed: false, chest: null }
}

export const questProgress = (q: QuestDef, d: DailyState): number => Math.min(q.target, d.stats[q.metric] ?? 0)

export interface QuestUpdate {
  daily: DailyState
  /** Heute neu geschaffte Aufgaben */
  completed: QuestDef[]
  /** Münzen für diese Aufgaben (ohne Bonus) */
  coins: number
  /** Alle drei sind jetzt geschafft und der Bonus wurde gerade ausgezahlt */
  allDone: boolean
  bonus: number
}

/** Zählt dazu und bezahlt Aufgaben, die dadurch fertig werden. */
export function addProgress(d: DailyState, add: Partial<DailyStats>): QuestUpdate {
  const stats = { ...d.stats }
  for (const k of Object.keys(add) as QuestMetric[]) stats[k] = (stats[k] ?? 0) + (add[k] ?? 0)
  let next: DailyState = { ...d, stats }
  const completed: QuestDef[] = []
  for (const id of d.quests) {
    if (next.claimed.includes(id)) continue
    const q = questDef(id)
    if (q && stats[q.metric] >= q.target) {
      completed.push(q)
      next = { ...next, claimed: [...next.claimed, id] }
    }
  }
  const coins = completed.reduce((n, q) => n + q.coins, 0)
  const allDone = !next.bonusClaimed && d.quests.length > 0 && d.quests.every((id) => next.claimed.includes(id))
  if (allDone) next = { ...next, bonusClaimed: true }
  return { daily: next, completed, coins, allDone, bonus: allDone ? QUEST_BONUS : 0 }
}

// ---- Überraschungs-Truhe ----

/** Die Truhe wartet, sobald das Tagesziel geschafft ist, und lässt sich einmal pro Tag öffnen. */
export const chestReady = (goalReached: boolean, d: DailyState | null): boolean => goalReached && !!d && d.chest === null

/**
 * Inhalt der Truhe: meist ein paar Münzen, manchmal ein Glückstreffer, selten ein Streak-Schutz oder ein Geschenk aus dem Laden.
 * Der Zufall hängt an Tag und Anzahl bisher geöffneter Truhen, ein Neuladen würfelt also nichts neu.
 */
export function rollChest(day: string, opened: number, ctx: { owned: string[]; freezes: number; maxFreezes: number }): ChestReward {
  const r = rng(`chest:${day}:${opened}`)
  const roll = r()
  if (roll < 0.1 && ctx.freezes < ctx.maxFreezes) return { kind: 'freeze' }
  if (roll < 0.17) {
    const gift = ITEMS.filter((i) => !ctx.owned.includes(i.id) && i.price <= 150).sort((a, b) => a.price - b.price)[0]
    if (gift) return { kind: 'item', id: gift.id }
  }
  if (roll < 0.4) return { kind: 'coins', amount: 25 + Math.floor(r() * 16), lucky: true }
  return { kind: 'coins', amount: 8 + Math.floor(r() * 13), lucky: false }
}

// ---- Begrüßung ----

export interface GreetingInput {
  doneLessons: number
  streakDays: number
  /** Tage seit dem letzten Lernen (0 = heute) */
  daysAway: number
  chestReady: boolean
  questsLeft: number
  goalLeft: number
  hour: number
}

/** Ein Satz vom Fuchs, der zur Lage passt (kein Druck, nur Freude oder ein Hinweis auf etwas Schönes). */
export function foxGreeting(g: GreetingInput): string {
  if (g.doneLessons === 0) return 'Bonjour ! Fangen wir an.'
  if (g.chestReady) return 'Deine Truhe wartet auf dich!'
  if (g.daysAway >= 3) return 'Schön, dass du wieder da bist!'
  if (g.questsLeft === 1) return 'Nur noch eine Aufgabe für heute!'
  if (g.goalLeft > 0 && g.goalLeft <= 10) return `Nur noch ${g.goalLeft} XP bis zur Truhe!`
  if (g.streakDays >= 7) return `${g.streakDays} Tage am Stück. Stark!`
  if (g.streakDays >= 3) return `${g.streakDays} Tage Serie, weiter so!`
  if (g.hour < 10) return 'Bonjour ! Guten Morgen.'
  if (g.hour >= 20) return 'Bonsoir ! Noch eine kleine Runde?'
  return 'Salut ! Weiter geht’s.'
}

/** Combo-Bonus: Wer viele Aufgaben in Folge auf Anhieb schafft, bekommt ein paar XP extra (höchstens 6). */
export function comboBonus(bestCombo: number): number {
  return Math.min(6, Math.floor(bestCombo / 3) * 2)
}

/** Wie viele Tage seit dem letzten Lernen vergangen sind (0 = heute, null = noch nie). */
export function daysBetween(fromKey: string | null, toKey: string): number | null {
  if (!fromKey) return null
  const n = (k: string) => {
    const [y, m, d] = k.split('-').map(Number)
    return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
  }
  return n(toKey) - n(fromKey)
}
