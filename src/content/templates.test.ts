import { describe, expect, it } from 'vitest'
import { HELP_SUBJECTS } from '../lib/subjects'
import { TEMPLATES, templatesFor } from './templates'

describe('Fertige Stapel', () => {
  it('Kennungen eindeutig, Fächer gibt es, jede Vorlage ist sinnvoll groß', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    for (const t of TEMPLATES) {
      expect(HELP_SUBJECTS.some((s) => s.id === t.subject), t.id).toBe(true)
      expect(t.cards.length, t.id).toBeGreaterThanOrEqual(10)
      expect(t.title.length).toBeGreaterThan(3)
      expect(t.description.length).toBeGreaterThan(10)
    }
  })

  it('keine leeren, doppelten oder abgeschnittenen Karten', () => {
    for (const t of TEMPLATES) {
      const fronts = new Set<string>()
      for (const [front, back] of t.cards) {
        expect(front.trim(), t.id).toBeTruthy()
        expect(back.trim(), t.id).toBeTruthy()
        expect(front, `${t.id}: ${front} und Antwort sind gleich`).not.toBe(back)
        expect(fronts.has(front.toLowerCase()), `${t.id}: doppelt ${front}`).toBe(false)
        fronts.add(front.toLowerCase())
        expect(back.length, `${t.id}: ${front}`).toBeLessThan(140)
      }
    }
  })

  it('jede Karte lässt sich als Auswahl abfragen: genug verschiedene Antworten', () => {
    for (const t of TEMPLATES) expect(new Set(t.cards.map((c) => c[1].toLowerCase())).size, t.id).toBeGreaterThanOrEqual(t.cards.length - 2)
  })

  it('mindestens ein Stapel für die Hauptfächer', () => {
    for (const s of ['mathe', 'biologie', 'physik', 'chemie', 'geografie', 'geschichte', 'englisch', 'deutsch', 'politik', 'informatik', 'musik', 'kunst'])
      expect(templatesFor(s).length, s).toBeGreaterThan(0)
  })
})
