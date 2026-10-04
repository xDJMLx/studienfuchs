import { beforeEach, describe, expect, it } from 'vitest'
import { units } from '../content'
import { activeDecks, ownDeck } from '../lib/decks'
import { useStore } from './useStore'

beforeEach(() => useStore.getState().resetAll())

describe('Stapel im Speicher', () => {
  it('neue Stapel merken Fach, Sprache und Rückrichtung', () => {
    const id = useStore.getState().addSet('Zelle', [{ front: 'Zellkern', back: 'steuert die Zelle' }], { subject: 'biologie', both: false })
    const set = useStore.getState().sets.find((s) => s.id === id)!
    expect(set.subject).toBe('biologie')
    expect(set.both).toBe(false)
    expect(ownDeck(set).lang).toBeUndefined()
    // Alte Schreibweise (nur ein Buchtitel) funktioniert weiter
    const old = useStore.getState().addSet('Liste', [{ front: 'a', back: 'b' }], 'KI-Listen')
    expect(useStore.getState().sets.find((s) => s.id === old)?.book).toBe('KI-Listen')
    expect(ownDeck(useStore.getState().sets.find((s) => s.id === old)!).subject).toBe('franzoesisch')
  })

  it('Arbeiten anlegen, ändern, löschen; ein gelöschter Stapel verschwindet aus den Arbeiten', () => {
    const st = useStore.getState()
    const deck = st.addSet('Zelle', [{ front: 'a', back: 'b' }], { subject: 'biologie' })
    const id = st.addArbeit({ subject: 'biologie', title: 'Bio-Arbeit', date: '2099-01-01', deckIds: [deck, 'unit:x'] })
    expect(useStore.getState().arbeiten).toHaveLength(1)
    useStore.getState().updateArbeit(id, { title: 'Bio 2' })
    expect(useStore.getState().arbeiten[0].title).toBe('Bio 2')
    useStore.getState().deleteSet(deck)
    expect(useStore.getState().arbeiten[0].deckIds).toEqual(['unit:x'])
    useStore.getState().removeArbeit(id)
    expect(useStore.getState().arbeiten).toEqual([])
  })

  it('Kurs-Einheiten lassen sich hinzufügen und entfernen und zählen dann zu den Stapeln', () => {
    const unit = units[0]
    useStore.getState().toggleUnit(unit.id)
    const decks = activeDecks({ sets: useStore.getState().sets, addedUnits: useStore.getState().addedUnits })
    expect(decks.map((d) => d.id)).toEqual([`unit:${unit.id}`])
    expect(decks[0].subject).toBe('franzoesisch')
    expect(decks[0].lang).toBe('fr')
    useStore.getState().toggleUnit(unit.id)
    expect(useStore.getState().addedUnits).toEqual([])
  })

  it('eine Runde zählt: Runden, geübte Karten und Fortschritt der Karten', () => {
    const id = useStore.getState().addSet('Zelle', [{ front: 'a', back: 'b' }, { front: 'c', back: 'd' }], { subject: 'biologie' })
    const items = useStore.getState().sets.find((s) => s.id === id)!.items
    useStore.getState().ensureDaily()
    useStore.setState((s) => ({ daily: { ...s.daily!, quests: ['practiced:10', 'newWords:4', 'blitz:1'] } }))
    useStore.getState().finishSession({ xp: 10, grades: { [items[0].id]: 'good', [items[1].id]: 'again' }, accuracy: 0.5, answered: 10 })
    const st = useStore.getState()
    expect(st.rounds).toBe(1)
    expect(Object.keys(st.cards).sort()).toEqual(items.map((i) => i.id).sort())
    expect(st.daily?.stats.practiced).toBe(10)
    expect(st.daily?.stats.newWords).toBe(2)
  })
})
