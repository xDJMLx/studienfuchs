import { describe, expect, it } from 'vitest'
import { buildCardsPrompt } from './aiCards'
import { parseCards } from './parseCards'

describe('Karten aus Text', () => {
  it('erkennt die gängigen Trennzeichen', () => {
    const { cards, incomplete } = parseCards(['Zellkern – Steuert die Zelle', 'Mitochondrium - Kraftwerk der Zelle', 'Ribosom;Eiweißherstellung', 'Vakuole | Speicher', 'DNA = Erbinformation', 'Chloroplast: Photosynthese', 'a\tb'].join('\n'))
    expect(incomplete).toBe(0)
    expect(cards).toEqual([
      { front: 'Zellkern', back: 'Steuert die Zelle' },
      { front: 'Mitochondrium', back: 'Kraftwerk der Zelle' },
      { front: 'Ribosom', back: 'Eiweißherstellung' },
      { front: 'Vakuole', back: 'Speicher' },
      { front: 'DNA', back: 'Erbinformation' },
      { front: 'Chloroplast', back: 'Photosynthese' },
      { front: 'a', back: 'b' },
    ])
  })

  it('Bindestriche in Wörtern trennen nicht, Aufzählungszeichen und leere Zeilen werden ignoriert', () => {
    const { cards } = parseCards('- Anglo-Amerikaner - Amerikaner mit englischen Wurzeln\n\n2) l’école – die Schule\n')
    expect(cards).toEqual([
      { front: 'Anglo-Amerikaner', back: 'Amerikaner mit englischen Wurzeln' },
      { front: 'l’école', back: 'die Schule' },
    ])
  })

  it('Zeilen ohne Trennzeichen kommen ohne Antwort zurück und werden gezählt', () => {
    const { cards, incomplete } = parseCards('Hauptstadt von Frankreich\nParis – Hauptstadt')
    expect(incomplete).toBe(1)
    expect(cards[0]).toEqual({ front: 'Hauptstadt von Frankreich', back: '' })
  })

  it('Doppelpunkt in der Antwort bleibt erhalten, nur der erste trennt', () => {
    expect(parseCards('Uhrzeit: um 8: Uhr').cards[0]).toEqual({ front: 'Uhrzeit', back: 'um 8: Uhr' })
  })
})

describe('Karten-Prompt der KI', () => {
  it('Sprachfächer: Vorderseite in der Fremdsprache, mit Beispielsatz', () => {
    const p = buildCardsPrompt('englisch', 20)
    expect(p).toContain('Englisch')
    expect(p).toContain('"example"')
    expect(p).toContain('höchstens 20 Karten')
  })
  it('andere Fächer: ohne Beispielsätze; Rechnen wird nachgerechnet', () => {
    expect(buildCardsPrompt('biologie', 10)).toContain('lässt du weg')
    expect(buildCardsPrompt('mathe', 10)).toContain('Rechne jede Aufgabe selbst nach')
  })
})
