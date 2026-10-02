/** Level n beginnt bei 50·(n-1)·n XP: 0, 100, 300, 600, 1000 … */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level
}

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  const start = xpForLevel(level)
  return { level, into: xp - start, needed: xpForLevel(level + 1) - start }
}

export function lessonXp(correctFirstTry: number, total: number): number {
  return 10 + correctFirstTry + (correctFirstTry === total ? 5 : 0)
}

/** Schrittweite der Bonusziele: Mindestziel 20 → danach 30 → 40 … (nur für den heutigen Tag). */
export const BONUS_STEP = 10

export interface GoalInfo {
  /** Das Ziel, auf das heute gerade hingearbeitet wird (Mindestziel oder Bonusziel). */
  goal: number
  /** Startpunkt dieser Stufe (für den Fortschrittsring) */
  from: number
  /** 0 = Mindestziel noch offen, 1 = Mindestziel geschafft (Bonus läuft), 2 = erstes Bonusziel geschafft … */
  tier: number
  /** Fortschritt innerhalb der aktuellen Stufe, 0..1 */
  pct: number
  /** Mindestziel schon erreicht? */
  baseReached: boolean
}

/**
 * Das eingestellte Tagesziel ist das MINIMUM. Wer es erreicht, bekommt heute ein höheres Bonusziel (je +10 XP).
 * Am nächsten Tag zählt wieder das Mindestziel, weil nur die heutigen XP verwendet werden.
 */
export function goalInfo(base: number, today: number): GoalInfo {
  if (today < base) return { goal: base, from: 0, tier: 0, pct: base ? today / base : 0, baseReached: false }
  const tier = Math.floor((today - base) / BONUS_STEP) + 1
  const from = base + (tier - 1) * BONUS_STEP
  return { goal: from + BONUS_STEP, from, tier, pct: (today - from) / BONUS_STEP, baseReached: true }
}
