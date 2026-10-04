import { describe, expect, it } from 'vitest'
import { cardsFromNotes } from './notesToCards'

describe('Karten aus Notizen (ohne KI)', () => {
  it('Merksätze werden zu Fragen', () => {
    const { cards } = cardsFromNotes('Die Zelle ist die kleinste lebende Einheit.\nMitochondrien sind die Kraftwerke der Zelle.')
    expect(cards).toEqual([
      { front: 'Was ist die Zelle?', back: 'Die kleinste lebende Einheit', how: 'definition' },
      { front: 'Was sind Mitochondrien?', back: 'Die Kraftwerke der Zelle', how: 'definition' },
    ])
  })

  it('Jahreszahlen und Bereiche', () => {
    const { cards } = cardsFromNotes('1789 Beginn der Französischen Revolution\n1618–1648: Dreißigjähriger Krieg')
    expect(cards.map((c) => c.front)).toEqual(['Was geschah 1789?', 'Was geschah 1618–1648?'])
    expect(cards[1].back).toBe('Dreißigjähriger Krieg')
  })

  it('Paare mit Trennzeichen bleiben Paare', () => {
    const { cards } = cardsFromNotes('Ribosom – baut Eiweiße\nVakuole: Speicher')
    expect(cards).toEqual([
      { front: 'Ribosom', back: 'baut Eiweiße', how: 'paar' },
      { front: 'Vakuole', back: 'Speicher', how: 'paar' },
    ])
  })

  it('"nennt man": Frage nach dem Namen', () => {
    const { cards } = cardsFromNotes('Pflanzen, die Samen bilden, nennt man Samenpflanzen.')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ front: 'Wie nennt man Pflanzen, die Samen bilden?', how: 'definition' })
    expect(cards[0].back).toBe('Samenpflanzen')
  })

  it('mehrere Sätze in einer Zeile, Duplikate, Pronomen und Unbrauchbares', () => {
    const { cards, skipped } = cardsFromNotes('Ein Gen ist ein Abschnitt der DNA. Ein Allel ist eine Variante eines Gens.\nEs ist wichtig zu lernen.\nSeite 12 bis 14\nEin Gen ist ein Abschnitt der DNA.')
    expect(cards.map((c) => c.front)).toEqual(['Was ist ein Gen?', 'Was ist ein Allel?'])
    expect(skipped).toBeGreaterThanOrEqual(2)
  })

  it('leerer Text ergibt nichts', () => {
    expect(cardsFromNotes('   \n\n')).toEqual({ cards: [], skipped: 0 })
  })
})
