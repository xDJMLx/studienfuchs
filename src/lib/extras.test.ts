import { describe, expect, it } from 'vitest'
import { daysSince, backupDue, lastBackupText } from './backup'
import { boxCounts, boxOf } from './boxes'
import { buildWeeklyReport } from './report'
import { buy, coinsForSession, ITEMS, toggleEquip } from './shop'
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

describe('Fuchs-Laden', () => {
  it('gibt eine Münze je 2 XP', () => {
    expect(coinsForSession({ xp: 17 }).total).toBe(8)
  })

  it('gibt keine Prämie für Tagesziele oder Tage am Stück (geübt wird für Arbeiten)', () => {
    expect(Object.keys(coinsForSession({ xp: 20 })).sort()).toEqual(['base', 'total'])
    expect(coinsForSession({ xp: 20 }).total).toBe(10)
  })

  it('Kauf klappt nur mit genug Münzen und nur einmal', () => {
    const brille = ITEMS.find((i) => i.id === 'brille')!
    expect(buy({ coins: brille.price - 1, owned: [] }, 'brille')).toBeNull()
    expect(buy({ coins: brille.price, owned: [] }, 'brille')).toEqual({ coins: 0, owned: ['brille'] })
    expect(buy({ coins: 999, owned: ['brille'] }, 'brille')).toBeNull()
    expect(buy({ coins: 999, owned: [] }, 'gibtsnicht')).toBeNull()
  })

  it('legt ein Teil je Platz an und nimmt es beim zweiten Tippen wieder ab', () => {
    const owned = ['muetze', 'krone']
    let o = toggleEquip({}, owned, 'muetze')
    expect(o).toEqual({ kopf: 'muetze' })
    o = toggleEquip(o, owned, 'krone')
    expect(o).toEqual({ kopf: 'krone' })
    expect(toggleEquip(o, owned, 'krone')).toEqual({})
    expect(toggleEquip({}, owned, 'schal')).toEqual({})
  })
})

describe('Wochenbericht', () => {
  const now = new Date(2026, 9, 7) // 7. Oktober 2026
  const key = (offset: number) => {
    const d = new Date(now)
    d.setDate(now.getDate() - offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const base = { level: 3, learnedWords: 120, masteredWords: 40, dueNow: 12, now }

  it('fasst die letzten sieben Tage zusammen', () => {
    const r = buildWeeklyReport({
      ...base,
      xpByDay: { [key(0)]: 25, [key(1)]: 10, [key(2)]: 30, [key(9)]: 99 },
      minutesByDay: { [key(0)]: 12, [key(1)]: 8.4, [key(9)]: 50 },
      lessons: { l1: { lastDone: key(0) }, l2: { lastDone: key(3) }, l3: { lastDone: key(20) } },
      nextExam: { title: 'Unité 3', days: 2 },
    })
    expect(r.activeDays).toBe(3)
    expect(r.weekXp).toBe(65)
    expect(r.minutes).toBe(20)
    expect(r.text).toContain('20 Minuten geübt')
    expect(r.text).not.toMatch(/Serie/)
    expect(r.lessonsWeek).toBe(2)
    expect(r.text).toContain('01.10.–07.10.')
    expect(r.text).toContain('Aktiv an 3 von 7 Tagen')
    expect(r.text).toContain('Nächste Klassenarbeit: Unité 3 (in 2 Tagen)')
  })

  it('kommt ohne Aktivität und ohne Klassenarbeit aus und nennt keinen Namen', () => {
    const r = buildWeeklyReport({ ...base, xpByDay: {}, lessons: {}, dueNow: 1 })
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
