import { describe, expect, it } from 'vitest'
import { evaluate } from './evaluate'
import { generateCardSession, isShortAnswer } from './cardSession'
import { activeDecks, cardRefs, daysUntil, FRENCH, freshToday, NEW_PER_DAY, ownDeck, planToday, readiness, type Deck } from './decks'
import { reviewCard } from './srs'
import type { Arbeit, VocabSet } from './types'

const mkSet = (id: string, n: number, extra: Partial<VocabSet> = {}): VocabSet => ({
  id,
  title: id,
  createdAt: '2026-01-01',
  items: Array.from({ length: n }, (_, i) => ({ id: `${id}:${i}`, front: `Frage ${id} ${i}`, back: `Antwort ${id} ${i}` })),
  ...extra,
})

const bio = mkSet('bio', 12, { subject: 'biologie' })
const decks = (sets: VocabSet[]) => activeDecks({ sets, addedUnits: [] })
const mastery0 = () => 0 as const

describe('Stapel', () => {
  it('ältere Sets ohne Fach sind Französisch mit Vorlesen und Rückrichtung', () => {
    const d = ownDeck(mkSet('alt', 2))
    expect(d.subject).toBe(FRENCH)
    expect(d.lang).toBe('fr')
    expect(d.both).toBe(true)
  })

  it('neue Sets haben das gewählte Fach und nur dann Sprache, wenn sie eine haben', () => {
    const d = ownDeck(bio)
    expect(d.subject).toBe('biologie')
    expect(d.lang).toBeUndefined()
    expect(d.both).toBe(false)
  })

  it('jede Karte kommt nur einmal vor, auch wenn Stapel sich überschneiden', () => {
    const a = mkSet('a', 3)
    const b = { ...mkSet('b', 3), items: a.items }
    expect(cardRefs(decks([a, b]))).toHaveLength(3)
  })
})

describe('Karten-Aufgaben', () => {
  const refs = cardRefs(decks([bio]))

  it('neue Karten: erst zeigen (zu zweit), dann Auswahl', () => {
    const ex = generateCardSession({ refs: refs.slice(0, 4), pool: refs, mastery: mastery0 })
    expect(ex.map((e) => e.kind)).toEqual(['teach', 'qchoice', 'qchoice', 'teach', 'qchoice', 'qchoice'])
    for (const e of ex)
      if (e.kind === 'qchoice') {
        expect(e.options).toHaveLength(4)
        expect(e.options).toContain(e.answer)
        expect(new Set(e.options).size).toBe(4)
      }
  })

  it('bekannte Karten mit kurzer Antwort werden getippt, lange als Karteikarte gefragt', () => {
    const long = mkSet('def', 3, { subject: 'biologie' })
    long.items[0].back = 'Die Zelle ist die kleinste lebende Einheit aller Lebewesen und besteht aus Zellkern und Plasma.'
    const r = cardRefs(decks([long, bio]))
    const ex = generateCardSession({ refs: r.slice(0, 3), pool: r, mastery: () => 2, rng: () => 0.9 })
    expect(ex.find((e) => e.itemId === 'def:0')?.kind).toBe('qcard')
    expect(ex.find((e) => e.itemId === 'def:1')?.kind).toBe('qtype')
  })

  it('Vokabelstapel fragen auch rückwärts, mit Sprache für Vorlesen', () => {
    const voc = mkSet('voc', 6, { subject: 'englisch', lang: 'en', both: true })
    const r = cardRefs(decks([voc]))
    let reversed = 0
    for (let i = 0; i < 30; i++) for (const e of generateCardSession({ refs: r.slice(0, 1), pool: r, mastery: () => 2 })) if (e.kind === 'qtype' && e.prompt.startsWith('Antwort')) reversed++
    expect(reversed).toBeGreaterThan(3)
    const q = generateCardSession({ refs: r.slice(0, 1), pool: r, mastery: () => 2 })[0]
    expect(q.kind === 'qtype' && q.lang).toBe('en')
  })

  it('Karteikarten-Selbstbewertung: nicht gewusst = Fehler, schwer = fast richtig', () => {
    const [ex] = generateCardSession({ refs: refs.slice(0, 1), pool: refs, mastery: () => 1, flipOnly: true })
    expect(ex.kind).toBe('qcard')
    expect(evaluate(ex, { selfGrade: 'again' }).status).toBe('wrong')
    expect(evaluate(ex, { selfGrade: 'again' }).mistakeItemIds).toEqual([ex.itemId])
    expect(evaluate(ex, { selfGrade: 'hard' }).status).toBe('almost')
    expect(evaluate(ex, { selfGrade: 'good' }).status).toBe('correct')
  })

  it('getippte Antwort wird locker geprüft (Groß/Klein, Satzzeichen)', () => {
    const ex = generateCardSession({ refs: refs.slice(0, 1), pool: refs, mastery: () => 2, typeOnly: true, rng: () => 0.9 })[0]
    expect(ex.kind).toBe('qtype')
    expect(evaluate(ex, (ex as { answer: string }).answer.toUpperCase() + '.').status).toBe('correct')
    expect(evaluate(ex, 'ganz falsch').status).toBe('wrong')
  })

  it('zu wenige Karten für vier Antworten: Karteikarte statt Auswahl', () => {
    const tiny = cardRefs(decks([mkSet('tiny', 2, { subject: 'biologie' })]))
    const ex = generateCardSession({ refs: tiny, pool: tiny, mastery: mastery0 })
    expect(ex.filter((e) => e.kind === 'qchoice')).toHaveLength(0)
    expect(ex.filter((e) => e.kind === 'qcard')).toHaveLength(2)
  })

  it('kurz oder lang', () => {
    expect(isShortAnswer('le chat')).toBe(true)
    expect(isShortAnswer('a b c d e f g')).toBe(false)
    expect(isShortAnswer('Zeile 1\nZeile 2')).toBe(false)
  })
})

describe('Heute', () => {
  const day = (offset: number) => new Date(Date.UTC(2026, 10, 1 + offset, 12))
  const now = day(0)
  const arbeit = (daysAhead: number, deckIds: string[]): Arbeit => ({ id: 'a', subject: 'biologie', title: 'Bio-Arbeit', date: day(daysAhead).toISOString().slice(0, 10), deckIds })

  it('ohne Arbeit: acht neue Karten am Tag, nichts fällig', () => {
    const p = planToday(decks([bio]), [], {}, now)
    expect(p.due).toHaveLength(0)
    expect(p.fresh).toHaveLength(NEW_PER_DAY)
  })

  it('fällige Karten zuerst und am längsten überfällige vorn', () => {
    const cards = {
      'bio:3': reviewCard(undefined, 'good', new Date(now.getTime() - 5 * 86_400_000)),
      'bio:5': reviewCard(undefined, 'good', new Date(now.getTime() - 9 * 86_400_000)),
    }
    const p = planToday(decks([bio]), [], cards, new Date(now.getTime() + 30 * 86_400_000))
    expect(p.due.map((r) => r.item.id)).toEqual(['bio:5', 'bio:3'])
  })

  it('mit Arbeit in 4 Tagen: 60 Karten werden bis zum Vortag verteilt', () => {
    const big = mkSet('big', 60, { subject: 'biologie' })
    const p = planToday(decks([big]), [arbeit(4, ['big'])], {}, now)
    // 60 Karten in 3 Lerntagen (der Tag vor der Arbeit bleibt zum Wiederholen frei): 20 pro Tag
    expect(p.freshQuota).toBe(20)
    expect(p.fresh).toHaveLength(20)
    expect(p.nextArbeit?.days).toBe(4)
  })

  it('schon gelernte neue Karten von heute zählen zum Tagesmaß', () => {
    const cards = { 'bio:0': reviewCard(undefined, 'good', now), 'bio:1': reviewCard(undefined, 'good', now) }
    expect(freshToday(cards, now)).toBe(2)
    const p = planToday(decks([bio]), [], cards, now)
    expect(p.fresh).toHaveLength(NEW_PER_DAY - 2)
    expect(p.fresh.some((r) => r.item.id === 'bio:0')).toBe(false)
  })

  it('Arbeiten, die vorbei sind, zählen nicht', () => {
    expect(daysUntil(arbeit(-2, []), now)).toBe(-2)
    expect(planToday(decks([bio]), [arbeit(-2, ['bio'])], {}, now).nextArbeit).toBeUndefined()
  })

  it('wie gut sitzt der Stoff', () => {
    const d: Deck[] = decks([bio])
    expect(readiness(arbeit(5, ['bio']), d, {}).pct).toBe(0)
    let c = reviewCard(undefined, 'easy', now)
    for (let i = 0; i < 3; i++) c = reviewCard(c, 'easy', new Date(now.getTime() + (i + 1) * 20 * 86_400_000))
    const r = readiness(arbeit(5, ['bio']), d, { 'bio:0': c })
    expect(r.seen).toBe(1)
    expect(r.solid).toBe(1)
    expect(r.total).toBe(12)
  })
})

import { pickRound } from './decks'

describe('Durchgang', () => {
  const now = new Date(Date.UTC(2026, 10, 1, 12))
  const refs = cardRefs(activeDecks({ sets: [mkSet('x', 30, { subject: 'biologie' })], addedUnits: [] }))

  it('Fälliges zuerst, dann neue (begrenzt), dann die schwächsten', () => {
    const cards = {
      'x:0': reviewCard(undefined, 'good', new Date(now.getTime() - 8 * 86_400_000)),
      'x:1': reviewCard(undefined, 'again', now),
      'x:2': reviewCard(undefined, 'easy', now),
    }
    const r = pickRound(refs, cards, { size: 8, freshMax: 3, now: new Date(now.getTime() + 86_400_000) })
    const ids = r.map((c) => c.item.id)
    expect(ids[0]).toBe('x:0')
    // 1 fällig, 3 neue, 2 schon gelernte zum Auffüllen
    expect(ids).toHaveLength(6)
    expect(ids.filter((id) => !cards[id as keyof typeof cards])).toHaveLength(3)
  })

  it('ohne neue Karten wird mit den schwächsten aufgefüllt', () => {
    const cards = Object.fromEntries(refs.slice(0, 10).map((r, i) => [r.item.id, reviewCard(undefined, i < 5 ? 'hard' : 'easy', now)]))
    const r = pickRound(refs.slice(0, 10), cards, { size: 6, now })
    expect(r).toHaveLength(6)
  })
})
