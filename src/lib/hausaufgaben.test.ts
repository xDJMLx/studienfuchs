import { describe, expect, it } from 'vitest'
import { dueChoices, dueNowCount, dueText, groupHomework, groupOf } from './hausaufgaben'
import type { Hausaufgabe } from './types'

const h = (id: string, due: string, subject = 'mathe', done = false): Hausaufgabe => ({ id, subject, text: `Aufgabe ${id}`, due, ...(done ? { done } : {}) })
const TODAY = '2026-10-08' // Donnerstag

describe('Hausaufgaben', () => {
  it('ordnet nach Fälligkeit in Gruppen', () => {
    expect(groupOf('2026-10-07', TODAY)).toBe('ueberfaellig')
    expect(groupOf('2026-10-08', TODAY)).toBe('heute')
    expect(groupOf('2026-10-09', TODAY)).toBe('morgen')
    expect(groupOf('2026-10-15', TODAY)).toBe('woche')
    expect(groupOf('2026-10-16', TODAY)).toBe('spaeter')
  })

  it('zeigt nur offene, sortiert nach Tag und Fach, ohne leere Gruppen', () => {
    const list = [h('a', '2026-10-20'), h('b', '2026-10-08', 'mathe'), h('c', '2026-10-08', 'deutsch'), h('d', '2026-10-01'), h('e', '2026-10-09', 'mathe', true)]
    const g = groupHomework(list, TODAY)
    expect(g.map((x) => x.id)).toEqual(['ueberfaellig', 'heute', 'spaeter'])
    expect(g[1].items.map((x) => x.id)).toEqual(['c', 'b'])
  })

  it('zählt, was heute oder früher fällig und offen ist', () => {
    expect(dueNowCount([h('a', '2026-10-08'), h('b', '2026-10-01'), h('c', '2026-10-09'), h('d', '2026-10-08', 'mathe', true)], TODAY)).toBe(2)
  })

  it('Text für die Fälligkeit', () => {
    expect(dueText('2026-10-08', TODAY)).toBe('heute')
    expect(dueText('2026-10-09', TODAY)).toBe('morgen')
    expect(dueText('2026-10-07', TODAY)).toBe('seit gestern')
    expect(dueText('2026-10-05', TODAY)).toBe('seit 3 Tagen')
    expect(dueText('2026-10-12', TODAY)).toMatch(/Montag/)
    expect(dueText('2026-10-30', TODAY)).toMatch(/30\./)
  })

  it('schnelle Termine', () => {
    const c = dueChoices(new Date(2026, 9, 8))
    expect(c.map((x) => x.key)).toEqual(['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-15'])
  })
})
