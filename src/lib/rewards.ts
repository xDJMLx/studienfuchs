/**
 * Belohnungen zum Sammeln: Zubehör für den Fuchs und Farben für die App.
 * Freigeschaltet werden sie durch Level und die längste Serie, nichts davon kostet Geld.
 */
export interface Reward {
  id: string
  kind: 'avatar' | 'accent'
  label: string
  /** Bedingung; ohne Angabe ist es von Anfang an frei */
  need?: { level?: number; streak?: number }
}

export const AVATARS: Reward[] = [
  { id: 'none', kind: 'avatar', label: 'Pur' },
  { id: 'brille', kind: 'avatar', label: 'Lernbrille', need: { level: 2 } },
  { id: 'schal', kind: 'avatar', label: 'Schal', need: { streak: 3 } },
  { id: 'muetze', kind: 'avatar', label: 'Mütze', need: { level: 4 } },
  { id: 'krone', kind: 'avatar', label: 'Krone', need: { level: 8 } },
]

export const ACCENTS: Reward[] = [
  { id: 'orange', kind: 'accent', label: 'Orange' },
  { id: 'blau', kind: 'accent', label: 'Blau', need: { level: 3 } },
  { id: 'tuerkis', kind: 'accent', label: 'Türkis', need: { streak: 7 } },
  { id: 'violett', kind: 'accent', label: 'Violett', need: { level: 6 } },
  { id: 'rosa', kind: 'accent', label: 'Rosa', need: { streak: 14 } },
]

export interface RewardProgress {
  level: number
  /** längste bisher erreichte Serie in Tagen */
  bestStreak: number
}

export const isRewardUnlocked = (r: Reward, p: RewardProgress): boolean => !r.need || ((r.need.level === undefined || p.level >= r.need.level) && (r.need.streak === undefined || p.bestStreak >= r.need.streak))

/** Kurzer Text, was noch fehlt (z. B. "ab Level 4"). */
export function rewardHint(r: Reward): string {
  if (!r.need) return 'frei'
  if (r.need.level !== undefined) return `ab Level ${r.need.level}`
  return `${r.need.streak} Tage Serie`
}

/** Farben der Akzente für die kleine Vorschau (hell) */
export const ACCENT_SWATCH: Record<string, string> = {
  orange: '#f2690f',
  blau: '#2f6fed',
  tuerkis: '#0e8f9b',
  violett: '#7c5cf0',
  rosa: '#e0337f',
}
