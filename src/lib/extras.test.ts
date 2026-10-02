import { describe, expect, it } from 'vitest'
import { daysSince, backupDue, lastBackupText } from './backup'
import { boxCounts, boxOf } from './boxes'
import { buildWeeklyReport } from './report'
import { isRewardUnlocked, rewardHint, AVATARS, ACCENTS } from './rewards'
import type { SrsCard } from './srs'

const card = (stability: number, reps = 2) => ({ stability, reps }) as unknown as SrsCard

describe('Karteikasten', () => {
  it('ordnet Wörter nach Stabilität in fünf Fächer', () => {
    expect(boxOf(card(0.5))).toBe(0)
    expect(boxOf(card(3))).toBe(1)
    expect(boxOf(card(10))).toBe(2)
    expect(boxOf(card(30))).toBe(3)
    expect(boxOf(card(120))).toBe(4)
  })

  it('zählt nur geübte Wörter und kann auf eine Menge begrenzt werden', () => {
    const cards = { a: card(1), b: card(5), c: card(5), d: card(5, 0) }
    expect(boxCounts(cards)).toEqual([1, 2, 0, 0, 0])
    expect(boxCounts(cards, new Set(['b']))).toEqual([0, 1, 0, 0, 0])
  })
})

describe('Belohnungen', () => {
  it('schaltet nach Level und längster Serie frei', () => {
    const brille = AVATARS.find((a) => a.id === 'brille')!
    const schal = AVATARS.find((a) => a.id === 'schal')!
    expect(isRewardUnlocked(brille, { level: 1, bestStreak: 0 })).toBe(false)
    expect(isRewardUnlocked(brille, { level: 2, bestStreak: 0 })).toBe(true)
    expect(isRewardUnlocked(schal, { level: 9, bestStreak: 2 })).toBe(false)
    expect(isRewardUnlocked(schal, { level: 1, bestStreak: 3 })).toBe(true)
    expect(rewardHint(brille)).toBe('ab Level 2')
    expect(rewardHint(schal)).toBe('3 Tage Serie')
  })

  it('Standard-Fuchs und Standard-Farbe sind immer frei', () => {
    expect(isRewardUnlocked(AVATARS[0], { level: 1, bestStreak: 0 })).toBe(true)
    expect(isRewardUnlocked(ACCENTS[0], { level: 1, bestStreak: 0 })).toBe(true)
  })
})

describe('Wochenbericht', () => {
  const now = new Date(2026, 9, 7) // 7. Oktober 2026
  const key = (offset: number) => {
    const d = new Date(now)
    d.setDate(now.getDate() - offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const base = { dailyGoal: 20, streak: 4, bestStreak: 6, level: 3, learnedWords: 120, masteredWords: 40, dueNow: 12, now }

  it('fasst die letzten sieben Tage zusammen', () => {
    const r = buildWeeklyReport({
      ...base,
      xpByDay: { [key(0)]: 25, [key(1)]: 10, [key(2)]: 30, [key(9)]: 99 },
      lessons: { l1: { lastDone: key(0) }, l2: { lastDone: key(3) }, l3: { lastDone: key(20) } },
      nextExam: { title: 'Unité 3', days: 2 },
    })
    expect(r.activeDays).toBe(3)
    expect(r.weekXp).toBe(65)
    expect(r.goalDays).toBe(2)
    expect(r.lessonsWeek).toBe(2)
    expect(r.text).toContain('01.10.–07.10.')
    expect(r.text).toContain('Aktiv an 3 von 7 Tagen')
    expect(r.text).toContain('Nächste Klassenarbeit: Unité 3 (in 2 Tagen)')
  })

  it('kommt ohne Aktivität und ohne Klassenarbeit aus und nennt keinen Namen', () => {
    const r = buildWeeklyReport({ ...base, xpByDay: {}, lessons: {}, streak: 0, bestStreak: 0, dueNow: 1 })
    expect(r.text).toContain('Aktiv an 0 von 7 Tagen')
    expect(r.text).toContain('1 Wort')
    expect(r.text).not.toContain('Klassenarbeit')
  })
})

describe('Sicherungs-Erinnerung', () => {
  it('rechnet Tage und erinnert nur, wenn es etwas zu sichern gibt', () => {
    expect(daysSince(new Date(2026, 0, 1), new Date(2026, 0, 11))).toBe(10)
    expect(backupDue(false)).toBe(false)
    expect(typeof lastBackupText()).toBe('string')
  })
})
