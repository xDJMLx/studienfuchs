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

import { cardRefs, allCourseDecks } from '../lib/decks'
import { generateRound } from '../lib/roundExercises'
import { ARBEIT_COINS } from './useStore'
import { masteryOf } from '../lib/srs'

describe('Fächer, Arbeiten abhaken, Tagesaufgabe Abwechslung', () => {
  it('Fächer lassen sich an- und abwählen', () => {
    useStore.getState().toggleSubject('biologie')
    useStore.getState().toggleSubject('mathe')
    expect(useStore.getState().mySubjects).toEqual(['biologie', 'mathe'])
    useStore.getState().toggleSubject('biologie')
    expect(useStore.getState().mySubjects).toEqual(['mathe'])
  })

  it('eine Arbeit abhaken gibt einmal Münzen, mit oder ohne Note', () => {
    const id = useStore.getState().addArbeit({ subject: 'biologie', title: 'Bio', date: '2020-01-01', deckIds: [] })
    const before = useStore.getState().coins
    expect(useStore.getState().finishArbeit(id, 4)).toBe(ARBEIT_COINS)
    expect(useStore.getState().coins).toBe(before + ARBEIT_COINS)
    expect(useStore.getState().arbeiten[0]).toMatchObject({ done: true, note: 4 })
    expect(useStore.getState().finishArbeit(id, 1)).toBe(0)
  })

  it('Meilenstein-Münzen werden gutgeschrieben, nie negativ', () => {
    useStore.getState().addCoins(25)
    useStore.getState().addCoins(-10)
    expect(useStore.getState().coins).toBe(25)
  })

  it('Üben in mehreren Fächern zählt je neues Fach einmal', () => {
    const st = useStore.getState()
    st.toggleSubject('biologie')
    st.toggleSubject('mathe')
    st.ensureDaily()
    useStore.setState((s) => ({ daily: { ...s.daily!, quests: ['variety:2', 'practiced:10', 'blitz:1'] } }))
    const a = st.addSet('A', [{ front: 'a', back: 'b' }], { subject: 'biologie' })
    const m = st.addSet('M', [{ front: 'c', back: 'd' }], { subject: 'mathe' })
    const ia = useStore.getState().sets.find((x) => x.id === a)!.items[0].id
    const im = useStore.getState().sets.find((x) => x.id === m)!.items[0].id
    useStore.getState().finishSession({ xp: 5, grades: { [ia]: 'good' }, accuracy: 1, answered: 3, subjects: ['biologie'] })
    expect(useStore.getState().daily?.stats.variety).toBe(1)
    useStore.getState().finishSession({ xp: 5, grades: { [ia]: 'good' }, accuracy: 1, answered: 3, subjects: ['biologie'] })
    expect(useStore.getState().daily?.stats.variety).toBe(1)
    useStore.getState().finishSession({ xp: 5, grades: { [im]: 'good' }, accuracy: 1, answered: 3, subjects: ['mathe'] })
    expect(useStore.getState().daily?.stats.variety).toBe(2)
    expect(useStore.getState().daily?.claimed).toContain('variety:2')
  })
})

describe('Runde mit Französisch-Karten nutzt die volle Übungsfolge', () => {
  it('Kurs-Stapel: Erkennen, Zeigen, Tippen … mit Karten aus dem Stapel', () => {
    const deck = allCourseDecks()[0]
    const refs = cardRefs([deck]).slice(0, 8)
    const ex = generateRound({ refs, pool: cardRefs([deck]), mastery: () => 0, allowListen: false })
    const kinds = new Set(ex.map((e) => e.kind))
    expect(kinds.has('teach')).toBe(true)
    expect(ex.length).toBeGreaterThan(8)
    // Nichts aus dem Nichts: Jede Aufgabe gehört zu einer Karte der Auswahl
    const ids = new Set(refs.map((r) => r.item.id))
    for (const e of ex) if (e.kind !== 'match') expect(ids.has(e.itemId), e.id).toBe(true)
    expect(masteryOf(undefined)).toBe(0)
  })

  it('Mischung aus Französisch und Biologie: beide Arten kommen vor, Sprach-Aufgaben nur bei Französisch', () => {
    const deck = allCourseDecks()[0]
    const bio = cardRefs([{ id: 'b', title: 'b', subject: 'biologie', both: false, kind: 'own', items: Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, front: `F${i}`, back: `B${i}` })) }])
    const fr = cardRefs([deck]).slice(0, 4)
    const ex = generateRound({ refs: [...fr, ...bio.slice(0, 4)], pool: [...cardRefs([deck]), ...bio], mastery: () => 0 })
    expect(ex.some((e) => e.kind === 'qchoice')).toBe(true)
    expect(ex.some((e) => e.kind === 'choice' || e.kind === 'teach')).toBe(true)
    for (const e of ex) if (e.kind === 'listenChoice' || e.kind === 'listen') expect(String(e.itemId).startsWith('b')).toBe(false)
  })
})
