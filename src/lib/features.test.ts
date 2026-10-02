import { describe, expect, it } from 'vitest'
import { COURSE_STATS, gradeStats, grades, isRegular, nextLessonAfter, units } from '../content'
import { makeHint } from './hint'
import { migrateLegacyStorage, STORAGE } from './migrate'

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

describe('Umbenennung Lernfuchs → Studienfuchs', () => {
  it('übernimmt alten Fortschritt und die KI-Einstellung unter den neuen Namen', () => {
    const s = fakeStorage({ 'lernfuchs-v1': '{"state":{"xp":120}}', 'lernfuchs-ai': '{"provider":"anthropic"}' })
    const moved = migrateLegacyStorage(s)
    expect(moved.sort()).toEqual([STORAGE.ai, STORAGE.state].sort())
    expect(s.map.get(STORAGE.state)).toBe('{"state":{"xp":120}}')
    expect(s.map.has('lernfuchs-v1')).toBe(false)
    expect(s.map.has('lernfuchs-ai')).toBe(false)
  })

  it('überschreibt neuere Daten nie und ist beim zweiten Start ein No-op', () => {
    const s = fakeStorage({ 'lernfuchs-v1': 'alt', [STORAGE.state]: 'neu' })
    migrateLegacyStorage(s)
    expect(s.map.get(STORAGE.state)).toBe('neu')
    expect(s.map.has('lernfuchs-v1')).toBe(false)
    expect(migrateLegacyStorage(s)).toEqual([])
  })

  it('funktioniert auch bei leerem oder kaputtem Speicher', () => {
    expect(migrateLegacyStorage(fakeStorage())).toEqual([])
    const broken = { getItem: () => { throw new Error('gesperrt') }, setItem: () => undefined, removeItem: () => undefined }
    expect(() => migrateLegacyStorage(broken)).not.toThrow()
  })
})

describe('Zahlen zum Kurs', () => {
  it('zählt Wiederholungen und Einheitentests nicht als Lektionen oder Wörter', () => {
    for (const g of grades) {
      const manual = units.filter((u) => u.grade === g).flatMap((u) => u.lessons).filter(isRegular)
      const s = gradeStats(g)
      expect(s.lessons).toBe(manual.length)
      expect(s.words).toBe(new Set(manual.flatMap((l) => l.items.map((i) => i.id))).size)
    }
  })

  it('Gesamtzahlen stimmen mit der Summe der Klassen überein', () => {
    expect(COURSE_STATS.lessons).toBe(grades.reduce((n, g) => n + gradeStats(g).lessons, 0))
    expect(COURSE_STATS.words).toBeGreaterThanOrEqual(Math.max(...grades.map((g) => gradeStats(g).words)))
  })
})

describe('Nächste Lektion nach dem Ergebnis', () => {
  const first = units[0].lessons.filter(isRegular)

  it('führt nach einer geschafften Lektion zur nächsten offenen', () => {
    const records = { [first[0].id]: { bestAccuracy: 1 } }
    expect(nextLessonAfter(first[0].id, records)?.id).toBe(first[1].id)
  })

  it('bietet nichts an, solange die nächste Lektion gesperrt ist', () => {
    // Erste Lektion nicht geschafft: die zweite bleibt gesperrt
    expect(nextLessonAfter(first[0].id, {})).toBeUndefined()
  })

  it('springt über bereits geschaffte Lektionen hinweg', () => {
    const records = { [first[0].id]: { bestAccuracy: 1 }, [first[1].id]: { bestAccuracy: 1 } }
    expect(nextLessonAfter(first[0].id, records)?.id).toBe(first[2].id)
  })

  it('unbekannte Lektion liefert nichts', () => {
    expect(nextLessonAfter('gibt-es-nicht', {})).toBeUndefined()
  })
})

describe('Tipp bei Tippaufgaben', () => {
  it('zeigt erste Buchstaben und Länge, Satzzeichen bleiben', () => {
    expect(makeHint('le chat')).toBe('l_   c___')
    expect(makeHint("l'école")).toBe("l'_____")
    expect(makeHint('beau, belle')).toBe('b___,   b____')
  })
  it('verrät nicht mehr als den ersten Buchstaben', () => {
    const answer = 'bonjour madame'
    const hint = makeHint(answer)
    expect(hint.replace(/[_\s]/g, '')).toBe('bm')
  })
})

describe('Kursinhalt', () => {
  it('jedes Kurswort hat eine eindeutige ID (sonst erscheinen Wörter doppelt in Listen und Zählern)', async () => {
    const { allItems } = await import('../content')
    expect(new Set(allItems.map((i) => i.id)).size).toBe(allItems.length)
  })
})

describe('Tagesziel mit Bonusstufen', () => {
  it('Mindestziel zuerst, danach +10 XP je Stufe', async () => {
    const { goalInfo } = await import('./xp')
    expect(goalInfo(20, 0)).toMatchObject({ goal: 20, tier: 0, baseReached: false })
    expect(goalInfo(20, 19).goal).toBe(20)
    expect(goalInfo(20, 20)).toMatchObject({ goal: 30, tier: 1, baseReached: true, pct: 0 })
    expect(goalInfo(20, 29).goal).toBe(30)
    expect(goalInfo(20, 30)).toMatchObject({ goal: 40, tier: 2 })
    expect(goalInfo(20, 45)).toMatchObject({ goal: 50, tier: 3 })
  })
  it('ein neuer Tag beginnt wieder beim Mindestziel', async () => {
    const { goalInfo } = await import('./xp')
    // heute 45 XP gesammelt, morgen 0 XP: das Ziel ist wieder das eingestellte Minimum
    expect(goalInfo(20, 45).goal).toBe(50)
    expect(goalInfo(20, 0).goal).toBe(20)
  })
})

describe('Aufhol-Modus', () => {
  it('Rückstand umfasst alle normalen Lektionen bis zur Klassen-Einheit', async () => {
    const { backlog, unitsUpTo } = await import('./catchup')
    const { units, isRegular } = await import('../content')
    const second = units.filter((u) => u.grade === units[0].grade)[1]
    const up = unitsUpTo(second.id)
    expect(up.map((u) => u.id)).toEqual([units[0].id, second.id])
    const expected = up.flatMap((u) => u.lessons).filter(isRegular).length
    expect(backlog(second.id, {}).length).toBe(expected)
  })

  it('geschaffte Lektionen verschwinden aus dem Rückstand, nicht bestandene bleiben', async () => {
    const { backlog } = await import('./catchup')
    const { units, isRegular } = await import('../content')
    const u = units[0]
    const [a, b] = u.lessons.filter(isRegular)
    const open = backlog(u.id, { [a.id]: { bestAccuracy: 1 }, [b.id]: { bestAccuracy: 0.2 } })
    expect(open.map((l) => l.id)).not.toContain(a.id)
    expect(open.map((l) => l.id)).toContain(b.id)
  })

  it('Tagesplan: verteilt den Rückstand auf die Tage bis zum Zieldatum', async () => {
    const { catchUpStatus } = await import('./catchup')
    const { units, isRegular } = await import('../content')
    const u = units[0]
    const total = u.lessons.filter(isRegular).length
    const now = new Date(2026, 9, 1)
    const s = catchUpStatus(u.id, '2026-10-10', {}, now) // 10 Tage inklusive heute
    expect(s.total).toBe(total)
    expect(s.daysLeft).toBe(10)
    expect(s.perDay).toBe(Math.ceil(total / 10))
    expect(s.toGoToday).toBe(s.perDay)
    // heute eine Lektion geschafft: Tagesziel sinkt um eins, der Plan bleibt stabil
    const first = u.lessons.filter(isRegular)[0]
    const after = catchUpStatus(u.id, '2026-10-10', { [first.id]: { bestAccuracy: 1, lastDone: '2026-10-01' } }, now)
    expect(after.doneToday).toBe(1)
    expect(after.perDay).toBe(s.perDay)
    expect(after.toGoToday).toBe(Math.max(0, s.perDay - 1))
  })

  it('Zieldatum heute zählt als ein Tag, vergangene Zieldaten brechen nichts', async () => {
    const { daysUntil } = await import('./catchup')
    const now = new Date(2026, 9, 1, 15, 30)
    expect(daysUntil('2026-10-01', now)).toBe(1)
    expect(daysUntil('2026-09-20', now)).toBe(1)
  })
});
