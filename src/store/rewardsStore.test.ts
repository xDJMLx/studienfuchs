import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isRegular, units } from '../content'
import { dayKey } from '../lib/streak'
import { useRewardEvents } from './useRewardEvents'
import { useStore } from './useStore'

const unit = units.find((u) => !u.extra)!
const regular = unit.lessons.filter(isRegular)

function finish(lessonIndex: number, accuracy = 1, xp = 12) {
  const lesson = regular[lessonIndex]
  const grades = Object.fromEntries(lesson.items.map((i) => [i.id, 'good' as const]))
  return useStore.getState().finishSession({ xp, grades, lessonId: lesson.id, accuracy })
}

beforeEach(() => {
  vi.useRealTimers()
  useStore.getState().resetAll()
  useRewardEvents.setState({ last: null })
})

describe('Tagesaufgaben im Speicher', () => {
  it('legt für heute drei Aufgaben an und bleibt beim selben Tag stabil', () => {
    useStore.getState().ensureDaily()
    const d = useStore.getState().daily!
    expect(d.day).toBe(dayKey())
    expect(d.quests).toHaveLength(3)
    useStore.getState().ensureDaily()
    expect(useStore.getState().daily).toBe(d)
  })

  it('zählt neue Wörter und Lektionen, zahlt Aufgaben genau einmal aus', () => {
    useStore.getState().ensureDaily()
    // die heutigen Aufgaben auf bekannte Ziele setzen, damit der Test nicht vom Datum abhängt
    useStore.setState((s) => ({ daily: { ...s.daily!, quests: ['newWords:4', 'lessons:1', 'perfect:1'] } }))
    const coinsBefore = useStore.getState().coins
    const sessionCoins = finish(0, 1)
    const ev = useRewardEvents.getState().last!
    expect(ev.quests.map((q) => q.id).sort()).toEqual(['lessons:1', 'newWords:4', 'perfect:1'])
    expect(ev.allQuests).toBe(true)
    expect(ev.bonus).toBe(10)
    expect(ev.questCoins).toBe(5 + 5 + 8 + 10)
    expect(useStore.getState().coins).toBe(coinsBefore + sessionCoins + ev.questCoins)
    // zweite Lektion zahlt nichts mehr aus
    const c2 = useStore.getState().coins
    const s2 = finish(1, 1)
    expect(useRewardEvents.getState().last!.questCoins).toBe(0)
    expect(useStore.getState().coins).toBe(c2 + s2)
  })

  it('wiederholte Wörter zählen als Wiederholung, nicht als neu', () => {
    useStore.getState().ensureDaily()
    useStore.setState((s) => ({ daily: { ...s.daily!, quests: ['newWords:4', 'reviewed:6', 'lessons:2'] } }))
    finish(0)
    const afterFirst = useStore.getState().daily!.stats
    expect(afterFirst.newWords).toBe(regular[0].items.length)
    expect(afterFirst.reviewed).toBe(0)
    finish(0)
    const afterSecond = useStore.getState().daily!.stats
    expect(afterSecond.newWords).toBe(regular[0].items.length)
    expect(afterSecond.reviewed).toBe(regular[0].items.length)
  })

  it('nach Mitternacht beginnt ein neuer Tag mit frischen Zählern', () => {
    useStore.getState().ensureDaily()
    finish(0)
    useStore.setState((s) => ({ daily: { ...s.daily!, day: '2000-01-01' } }))
    useStore.getState().ensureDaily()
    const d = useStore.getState().daily!
    expect(d.day).toBe(dayKey())
    expect(d.stats.lessons).toBe(0)
    expect(d.claimed).toEqual([])
  })
})

describe('Meldungen nach einer Einheit', () => {
  it('meldet neue Erfolge genau einmal', () => {
    finish(0)
    expect(useRewardEvents.getState().last!.achievements.map((a) => a.id)).toContain('first')
    finish(1)
    expect(useRewardEvents.getState().last!.achievements.map((a) => a.id)).not.toContain('first')
  })

  it('meldet eine fertige Einheit erst bei der letzten normalen Lektion', () => {
    for (let i = 0; i < regular.length - 1; i++) {
      finish(i)
      expect(useRewardEvents.getState().last!.unit, `Lektion ${i}`).toBeNull()
    }
    finish(regular.length - 1)
    const done = useRewardEvents.getState().last!.unit
    expect(done?.id).toBe(unit.id)
    expect(done?.description.length).toBeGreaterThan(5)
    finish(regular.length - 1)
    expect(useRewardEvents.getState().last!.unit).toBeNull()
  })

  it('meldet, wann das Tagesziel erreicht wird und die Truhe aufgeht', () => {
    useStore.setState({ dailyGoal: 20 })
    finish(0, 1, 12)
    expect(useRewardEvents.getState().last!.chestUnlocked).toBe(false)
    finish(1, 1, 12)
    expect(useRewardEvents.getState().last!.chestUnlocked).toBe(true)
    finish(2, 1, 12)
    expect(useRewardEvents.getState().last!.chestUnlocked).toBe(false)
  })
})

describe('Truhe', () => {
  it('ist erst nach dem Tagesziel offen, gibt einmal pro Tag etwas und merkt es sich', () => {
    useStore.setState({ dailyGoal: 20 })
    expect(useStore.getState().openChest()).toBeNull()
    finish(0, 1, 25)
    const coinsBefore = useStore.getState().coins
    const owned = useStore.getState().owned.length
    const freezes = useStore.getState().streak.freezes
    const r = useStore.getState().openChest()!
    expect(r).not.toBeNull()
    const s = useStore.getState()
    if (r.kind === 'coins') expect(s.coins).toBe(coinsBefore + r.amount)
    if (r.kind === 'freeze') expect(s.streak.freezes).toBe(freezes + 1)
    if (r.kind === 'item') expect(s.owned.length).toBe(owned + 1)
    expect(s.daily!.chest).toEqual(r)
    expect(s.chestsOpened).toBe(1)
    expect(useStore.getState().openChest()).toBeNull()
  })
})

describe('Blitzrunde', () => {
  it('zahlt XP und Münzen mit Obergrenze, merkt sich den Rekord und zählt als Tagesaufgabe', () => {
    useStore.getState().ensureDaily()
    useStore.setState((s) => ({ daily: { ...s.daily!, quests: ['blitz:1', 'lessons:1', 'newWords:4'] } }))
    const r1 = useStore.getState().finishBlitz({ score: 200, correct: 14 })
    expect(r1).toMatchObject({ xp: 4, coins: 5, record: true, questsDone: 1 })
    expect(useStore.getState().blitzBest).toBe(200)
    const r2 = useStore.getState().finishBlitz({ score: 150, correct: 10 })
    expect(r2.record).toBe(false)
    expect(useStore.getState().blitzBest).toBe(200)
    const big = useStore.getState().finishBlitz({ score: 9999, correct: 999 })
    expect(big.xp).toBe(15)
    expect(big.coins).toBe(20)
    expect(big.record).toBe(true)
    expect(useStore.getState().streak.count).toBe(1)
  })
})
