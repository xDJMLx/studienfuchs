import { describe, expect, it } from 'vitest'
import { dueChoices, dueNowCount, dueText, groupHomework, groupOf, parseQuickHomework } from './hausaufgaben'
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

describe('Schnell eintragen', () => {
  const T = '2026-10-08' // Donnerstag
  const p = (s: string, extra = {}) => parseQuickHomework(s, { today: T, fallbackSubject: 'deutsch', ...extra })

  it('erkennt Fach und Tag und lässt den Rest als Text', () => {
    expect(p('Mathe S. 52 Nr. 3 bis morgen')).toMatchObject({ subject: 'mathe', due: '2026-10-09', text: 'S. 52 Nr. 3', found: { subject: true, due: true } })
    expect(p('Englisch Vokabeln Unit 3 übermorgen')).toMatchObject({ subject: 'englisch', due: '2026-10-10', text: 'Vokabeln Unit 3' })
    expect(p('Bio Zelle zeichnen heute')).toMatchObject({ subject: 'biologie', due: '2026-10-08', text: 'Zelle zeichnen' })
  })

  it('Wochentage zählen immer nach vorn, auch derselbe Wochentag', () => {
    expect(p('Gedicht lernen bis Montag').due).toBe('2026-10-12')
    expect(p('Referat am Donnerstag').due).toBe('2026-10-15')
    expect(p('Zeichnung für Freitag').due).toBe('2026-10-09')
  })

  it('Datum mit Punkten, auch ohne Jahr (nächstes Jahr, wenn schon vorbei)', () => {
    expect(p('Aufsatz bis 20.10.').due).toBe('2026-10-20')
    expect(p('Aufsatz 3.10.').due).toBe('2027-10-03')
    expect(p('Aufsatz 05.11.2026').due).toBe('2026-11-05')
    expect(p('Aufsatz 31.2.').found.due).toBe(false)
  })

  it('ohne Angaben: letztes Fach, morgen', () => {
    expect(p('Buch lesen')).toMatchObject({ subject: 'deutsch', due: '2026-10-09', text: 'Buch lesen', found: { subject: false, due: false } })
  })

  it('nur erlaubte Fächer, ganze Wörter, Text bleibt, wenn sonst nichts übrig wäre', () => {
    expect(p('Physik Aufgaben', { allowed: ['mathe'] }).subject).toBe('deutsch')
    expect(p('Biografie lesen').subject).toBe('deutsch')
    expect(p('Mathe')).toMatchObject({ subject: 'mathe', text: 'Mathe' })
    expect(p('morgen')).toMatchObject({ text: 'morgen', due: '2026-10-09' })
  })
})
