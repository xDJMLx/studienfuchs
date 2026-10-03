import { describe, expect, it } from 'vitest'
import { QUEST_BONUS, addProgress, chestReady, comboBonus, daysBetween, emptyDaily, foxGreeting, pickQuests, questDef, questProgress, rollChest } from './rewards'

const days = Array.from({ length: 60 }, (_, i) => `2026-10-${String((i % 28) + 1).padStart(2, '0')}-${i}`)

describe('Tagesaufgaben', () => {
  it('sind pro Tag gleich, drei verschiedene und immer gültig', () => {
    for (const d of days) {
      const a = pickQuests(d, { knownWords: 30 })
      expect(a).toEqual(pickQuests(d, { knownWords: 30 }))
      expect(a).toHaveLength(3)
      expect(new Set(a.map((id) => id.split(':')[0])).size).toBe(3)
      for (const id of a) expect(questDef(id), id).not.toBeNull()
    }
  })

  it('mindestens eine ist immer leicht erreichbar, und Wiederholen gibt es erst mit genug bekannten Wörtern', () => {
    for (const d of days) {
      const metrics = pickQuests(d, { knownWords: 0 }).map((id) => id.split(':')[0])
      expect(metrics.some((m) => ['lessons', 'newWords', 'practiced'].includes(m)), d).toBe(true)
      expect(metrics).not.toContain('reviewed')
    }
    const seen = new Set(days.flatMap((d) => pickQuests(d, { knownWords: 50 }).map((id) => id.split(':')[0])))
    expect(seen.has('reviewed')).toBe(true)
  })

  it('wechseln von Tag zu Tag (nicht jeden Tag dasselbe)', () => {
    expect(new Set(days.map((d) => pickQuests(d, { knownWords: 30 }).join('|'))).size).toBeGreaterThan(10)
  })

  it('zählen mit, zahlen genau einmal aus und geben den Bonus erst für alle drei', () => {
    let d = { ...emptyDaily('2026-10-05', { knownWords: 30 }), quests: ['newWords:4', 'lessons:1', 'blitz:1'] }
    let u = addProgress(d, { newWords: 3 })
    expect(u.completed).toHaveLength(0)
    d = u.daily
    u = addProgress(d, { newWords: 2, lessons: 1 })
    expect(u.completed.map((q) => q.id).sort()).toEqual(['lessons:1', 'newWords:4'])
    expect(u.coins).toBe(10)
    expect(u.allDone).toBe(false)
    d = u.daily
    // weiter zählen zahlt nichts doppelt aus
    u = addProgress(d, { newWords: 5, lessons: 1 })
    expect(u.completed).toHaveLength(0)
    expect(u.coins).toBe(0)
    d = u.daily
    u = addProgress(d, { blitz: 1 })
    expect(u.completed.map((q) => q.id)).toEqual(['blitz:1'])
    expect(u.allDone).toBe(true)
    expect(u.bonus).toBe(QUEST_BONUS)
    // der Bonus kommt nur einmal
    expect(addProgress(u.daily, { blitz: 1 }).bonus).toBe(0)
  })

  it('Fortschrittsanzeige ist nie größer als das Ziel', () => {
    const q = questDef('practiced:10')!
    const d = addProgress(emptyDaily('2026-10-05', { knownWords: 0 }), { practiced: 99 }).daily
    expect(questProgress(q, d)).toBe(10)
  })
})

describe('Überraschungs-Truhe', () => {
  const ctx = { owned: [] as string[], freezes: 0, maxFreezes: 2 }

  it('ist deterministisch: Neuladen würfelt nichts neu', () => {
    for (let i = 0; i < 30; i++) expect(rollChest('2026-10-05', i, ctx)).toEqual(rollChest('2026-10-05', i, ctx))
  })

  it('gibt meist Münzen in sinnvollem Rahmen und gelegentlich Besonderes', () => {
    const kinds: Record<string, number> = {}
    for (let i = 0; i < 400; i++) {
      const r = rollChest(`2026-10-${i}`, i, ctx)
      kinds[r.kind] = (kinds[r.kind] ?? 0) + 1
      if (r.kind === 'coins') {
        expect(r.amount).toBeGreaterThanOrEqual(8)
        expect(r.amount).toBeLessThanOrEqual(40)
        expect(r.lucky ? r.amount >= 25 : r.amount <= 20).toBe(true)
      }
    }
    expect(kinds.coins).toBeGreaterThan(250)
    expect(kinds.freeze).toBeGreaterThan(10)
    expect(kinds.item).toBeGreaterThan(5)
  })

  it('verschenkt keinen Schutz über dem Höchstwert und kein Teil doppelt', () => {
    for (let i = 0; i < 300; i++) {
      expect(rollChest(`d${i}`, i, { owned: [], freezes: 2, maxFreezes: 2 }).kind).not.toBe('freeze')
      const r = rollChest(`d${i}`, i, { owned: ['brille', 'muetze', 'schal', 'kappe', 'schnurrbart'], freezes: 0, maxFreezes: 2 })
      if (r.kind === 'item') expect(['brille', 'muetze', 'schal', 'kappe', 'schnurrbart']).not.toContain(r.id)
    }
  })

  it('wartet erst, wenn das Tagesziel geschafft ist, und nur einmal', () => {
    const d = emptyDaily('2026-10-05', { knownWords: 0 })
    expect(chestReady(false, d)).toBe(false)
    expect(chestReady(true, d)).toBe(true)
    expect(chestReady(true, { ...d, chest: { kind: 'coins', amount: 10, lucky: false } })).toBe(false)
    expect(chestReady(true, null)).toBe(false)
  })
})

describe('Begrüßung und Combo', () => {
  const base = { doneLessons: 5, streakDays: 0, daysAway: 0, chestReady: false, questsLeft: 3, goalLeft: 20, hour: 15 }
  it('wählt den passenden Satz, wichtigstes zuerst', () => {
    expect(foxGreeting({ ...base, doneLessons: 0 })).toMatch(/Bonjour/)
    expect(foxGreeting({ ...base, chestReady: true, streakDays: 9 })).toMatch(/Truhe/)
    expect(foxGreeting({ ...base, daysAway: 5 })).toMatch(/wieder da/)
    expect(foxGreeting({ ...base, questsLeft: 1 })).toMatch(/eine Aufgabe/)
    expect(foxGreeting({ ...base, goalLeft: 6 })).toMatch(/6 XP/)
    expect(foxGreeting({ ...base, streakDays: 4 })).toMatch(/4 Tage/)
    expect(foxGreeting({ ...base, hour: 7 })).toMatch(/Morgen/)
    expect(foxGreeting({ ...base, hour: 21 })).toMatch(/Bonsoir/)
  })
  it('droht nie: kein Satz enthält Schuld oder Verlust', () => {
    for (const daysAway of [0, 1, 3, 10, 40]) expect(foxGreeting({ ...base, daysAway })).not.toMatch(/verpasst|verlor|vermiss|schade|Serie gerissen/i)
  })
  it('Combo-Bonus steigt langsam und ist gedeckelt', () => {
    expect([0, 2, 3, 5, 6, 9, 12, 30].map(comboBonus)).toEqual([0, 0, 2, 2, 4, 6, 6, 6])
  })
  it('Tage zwischen zwei Daten', () => {
    expect(daysBetween('2026-10-01', '2026-10-04')).toBe(3)
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1)
    expect(daysBetween(null, '2026-10-01')).toBeNull()
  })
})
