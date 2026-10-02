export interface StreakState {
  count: number
  lastDay: string | null // YYYY-MM-DD
  freezes: number
  freezeWeek: string | null // Woche, in der zuletzt ein Freeze gutgeschrieben wurde
}

export const initialStreak: StreakState = { count: 0, lastDay: null, freezes: 1, freezeWeek: null }
export const MAX_FREEZES = 2

export function dayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** Montag der Woche als Schlüssel. */
export function weekKey(d = new Date()): string {
  const copy = new Date(d)
  const shift = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - shift)
  return dayKey(copy)
}

/** Gratis-Freeze: jede neue Woche +1 (max. 2). Es gibt keine Strafen – nur Schutz. */
export function grantWeeklyFreeze(s: StreakState, today: Date): StreakState {
  const wk = weekKey(today)
  if (s.freezeWeek === wk) return s
  return { ...s, freezeWeek: wk, freezes: Math.min(MAX_FREEZES, s.freezes + (s.freezeWeek ? 1 : 0)) }
}

export function registerActivity(prev: StreakState, today: Date): StreakState {
  const s = grantWeeklyFreeze(prev, today)
  const key = dayKey(today)
  if (s.lastDay === key) return s
  if (!s.lastDay) return { ...s, count: 1, lastDay: key }
  const gap = dayNumber(key) - dayNumber(s.lastDay)
  if (gap === 1) return { ...s, count: s.count + 1, lastDay: key }
  // Ein verpasster Tag wird durch einen Freeze überbrückt
  if (gap === 2 && s.freezes > 0) return { ...s, count: s.count + 1, lastDay: key, freezes: s.freezes - 1 }
  return { ...s, count: 1, lastDay: key }
}

/** Anzeige: Serie ist "gerissen", wenn mehr als ein Tag ohne Freeze-Reserve vergangen ist. */
export function currentStreak(s: StreakState, today: Date): number {
  if (!s.lastDay) return 0
  const gap = dayNumber(dayKey(today)) - dayNumber(s.lastDay)
  if (gap <= 1) return s.count
  if (gap === 2 && s.freezes > 0) return s.count
  return 0
}
