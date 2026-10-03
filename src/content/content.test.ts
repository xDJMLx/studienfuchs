import { describe, expect, it } from 'vitest'
import { allItems, allLessons, grades, units } from './index'
import { unitSchema } from './schema'

const rawFiles = import.meta.glob('./*/*/*.json', { eager: true, import: 'default' }) as Record<string, unknown>

describe('Kursinhalte', () => {
  it('jede Inhaltsdatei entspricht dem Schema (die App prüft beim Start nicht mehr selbst)', () => {
    const paths = Object.keys(rawFiles)
    expect(paths.length).toBeGreaterThan(30)
    for (const p of paths) {
      const r = unitSchema.safeParse(rawFiles[p])
      expect(r.success, p + ': ' + (r.success ? '' : JSON.stringify(r.error.issues.slice(0, 2)))).toBe(true)
    }
  })
  it('Einheiten sind nach Klassenstufe numerisch sortiert und decken 7–10 ab', () => {
    expect(grades).toEqual([7, 8, 9, 10])
    const order = units.map((u) => u.grade)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
  it('Einheiten-, Lektions- und Item-IDs sind eindeutig', () => {
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length)
    expect(new Set(allLessons.map((l) => l.id)).size).toBe(allLessons.length)
    expect(allLessons.filter((l) => l.review).length).toBe(units.length)
    expect(allLessons.filter((l) => l.test).length).toBe(units.length)
    expect(new Set(allItems.map((i) => i.id)).size).toBe(allItems.length)
  })
  it('jede Lektion hat mindestens 3 Wörter und Wörter sind pro Lektion eindeutig', () => {
    for (const l of allLessons) {
      expect(l.items.length, l.id).toBeGreaterThanOrEqual(3)
      const fronts = l.items.map((i) => i.front.toLowerCase())
      expect(new Set(fronts).size, `${l.id} hat doppelte Wörter`).toBe(fronts.length)
    }
  })
  it('jedes Wort hat einen Beispielsatz mit Übersetzung (kurz genug für Satzbau-Aufgaben)', () => {
    for (const i of allItems) {
      expect(i.example, `${i.id}: Beispielsatz fehlt`).toBeTruthy()
      expect(i.exampleDe, `${i.id}: Übersetzung fehlt`).toBeTruthy()
      expect((i.example as string).split(/\s+/).length, i.id).toBeLessThanOrEqual(12)
    }
  })
  it('Lektions-IDs beginnen mit der Einheit', () => {
    for (const u of units) for (const l of u.lessons) expect(l.id.startsWith(u.id), l.id).toBe(true)
  })
})
