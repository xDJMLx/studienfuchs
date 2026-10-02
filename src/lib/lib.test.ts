import { describe, expect, it } from 'vitest'
import { checkAnswer, expandAnswers } from './answerCheck'
import { generateExercises } from './generateExercises'
import { parseVocab } from './parseVocab'
import { planToday } from './plan'
import { isDue, masteryOf, newCard, reviewCard } from './srs'
import { currentStreak, initialStreak, registerActivity } from './streak'
import { levelFromXp, lessonXp } from './xp'
import type { Item } from './types'

describe('answerCheck', () => {
  it('akzeptiert exakte Antwort, Groß-/Kleinschreibung und Satzzeichen egal', () => {
    expect(checkAnswer('  Bonjour! ', 'bonjour').status).toBe('correct')
    expect(checkAnswer("j’habite", "j'habite").status).toBe('correct')
  })
  it('fehlende Akzente → almost', () => {
    expect(checkAnswer('ecole', 'école').status).toBe('almost')
  })
  it('fehlender Artikel → almost, falsches Wort → wrong', () => {
    expect(checkAnswer('chat', 'le chat').status).toBe('almost')
    expect(checkAnswer('chien', 'le chat').status).toBe('wrong')
  })
  it('ein Tippfehler bei längerem Wort → almost', () => {
    expect(checkAnswer('maisson', 'maison').status).toBe('almost')
    expect(checkAnswer('lit', 'lot').status).toBe('wrong') // kurzes Wort: kein Toleranzbonus
  })
  it('Auslassungspunkte und Gedankenstrich sind beim Tippen optional', () => {
    expect(checkAnswer("d'un côté de l'autre", "d'un côté … de l'autre").status).toBe('correct')
    expect(checkAnswer('avoir - eu', 'avoir – eu').status).toBe('correct')
    expect(checkAnswer('à peine que', 'à peine … que').status).toBe('correct')
  })
  it('Klammern und Alternativen', () => {
    expect(expandAnswers('(sich) freuen; sich freuen')).toContain('freuen')
    expect(checkAnswer('freuen', '(sich) freuen').status).toBe('correct')
    expect(checkAnswer('die Schule', 'Schule / die Schule').status).toBe('correct')
  })
})

describe('srs', () => {
  it('neue Karte ist level 0, nach Good-Reviews steigt Mastery', () => {
    expect(masteryOf(undefined)).toBe(0)
    let card = reviewCard(undefined, 'good', new Date('2026-01-01'))
    expect(masteryOf(card)).toBeGreaterThanOrEqual(1)
    for (let i = 1; i < 6; i++) card = reviewCard(card, 'good', new Date(card.due))
    expect(masteryOf(card)).toBe(2)
  })
  it('Again plant früher als Good', () => {
    const now = new Date('2026-01-01T10:00:00Z')
    const base = reviewCard(newCard(now), 'good', now)
    const later = new Date(base.due)
    const again = reviewCard(base, 'again', later)
    const good = reviewCard(base, 'good', later)
    expect(new Date(again.due).getTime()).toBeLessThan(new Date(good.due).getTime())
    expect(isDue(good, new Date(good.due))).toBe(true)
  })
})

describe('streak', () => {
  const d = (s: string) => new Date(`${s}T12:00:00`)
  it('zählt aufeinanderfolgende Tage', () => {
    let s = registerActivity(initialStreak, d('2026-03-02'))
    s = registerActivity(s, d('2026-03-03'))
    s = registerActivity(s, d('2026-03-03'))
    expect(s.count).toBe(2)
  })
  it('Freeze überbrückt genau einen verpassten Tag', () => {
    let s = registerActivity(initialStreak, d('2026-03-02'))
    s = registerActivity(s, d('2026-03-04'))
    expect(s.count).toBe(2)
    expect(s.freezes).toBe(0)
    expect(currentStreak(s, d('2026-03-10'))).toBe(0)
  })
})

describe('xp', () => {
  it('Level-Schwellen', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(299).level).toBe(2)
    expect(levelFromXp(300).level).toBe(3)
    expect(lessonXp(10, 10)).toBe(25)
  })
})

describe('parseVocab', () => {
  it('erkennt Trennzeichen und Nummerierung', () => {
    const r = parseVocab('1. le chat – die Katze\n2. la maison - das Haus\nl\'école = die Schule')
    expect(r).toEqual([
      { front: 'le chat', back: 'die Katze' },
      { front: 'la maison', back: 'das Haus' },
      { front: "l'école", back: 'die Schule' },
    ])
  })
  it('dreht Spalten, wenn Deutsch links steht', () => {
    const r = parseVocab('die Katze – le chat\ndas Haus – la maison\ndie Schule – l\'école')
    expect(r[0]).toEqual({ front: 'le chat', back: 'die Katze' })
  })
  it('korrigiert einzelne verdrehte Zeilen und erkennt zwei Leerzeichen als Trenner', () => {
    const r = parseVocab("la boulangerie - die Bäckerei\nle marché - der Markt\ndie Schule - l'école\nacheter  kaufen")
    expect(r.map((x) => x.front)).toEqual(['la boulangerie', 'le marché', "l'école", 'acheter'])
  })
  it('trennt zweispaltigen OCR-Text ohne Trennzeichen am deutschen Artikel', () => {
    const r = parseVocab('la maison das Haus\nle livre das Buch')
    expect(r[1]).toEqual({ front: 'le livre', back: 'das Buch' })
  })
})

describe('generateExercises', () => {
  const mk = (n: number): Item[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `i${i}`,
      front: `fr${i}`,
      back: `de${i}`,
      example: i === 0 ? 'Je suis très content' : undefined,
      exampleDe: i === 0 ? 'Ich bin sehr froh' : undefined,
    }))
  const items = mk(8)
  const run = (mastery: 0 | 1 | 2, max?: number) =>
    generateExercises({ items, pool: items, mastery: () => mastery, maxExercises: max })

  it('neue Items: Erkennen vor Produzieren, Match bei ≥4 neuen', () => {
    const ex = run(0)
    expect(ex.some((e) => e.kind === 'match')).toBe(true)
    const firstType = ex.findIndex((e) => e.kind === 'type')
    const lastChoice = ex.map((e) => e.kind).lastIndexOf('choice')
    expect(lastChoice).toBeLessThan(firstType)
  })
  it('respektiert die Obergrenze', () => {
    expect(run(0, 10).length).toBeLessThanOrEqual(10)
  })
  it('jedes neue Item wird erkannt und produziert (auch bei 10 Items)', () => {
    const ten = mk(10)
    const ex = generateExercises({ items: ten, pool: ten, mastery: () => 0 })
    for (const it of ten) {
      expect(ex.some((e) => e.kind === 'choice' && e.itemId === it.id)).toBe(true)
      expect(ex.some((e) => e.kind === 'type' && e.itemId === it.id)).toBe(true)
    }
  })
  it('gefestigte Items bekommen kein Multiple Choice', () => {
    expect(run(2).some((e) => e.kind === 'choice')).toBe(false)
  })
  it('Multiple Choice enthält die richtige Antwort ohne Duplikate', () => {
    for (const e of run(0)) {
      if (e.kind !== 'choice') continue
      expect(e.options).toContain(e.answer)
      expect(new Set(e.options).size).toBe(e.options.length)
    }
  })
})

describe('planToday', () => {
  const items: Item[] = Array.from({ length: 20 }, (_, i) => ({ id: `s:${i}`, front: `f${i}`, back: `b${i}` }))
  const now = new Date('2026-03-01T10:00:00')
  it('ohne Datum: begrenzte Zahl neuer Wörter pro Session', () => {
    const p = planToday(items, {}, null, now)
    expect(p.newCount).toBe(6)
    expect(p.items).toHaveLength(6)
  })
  it('mit Prüfungsdatum: verteilt neue Wörter und lässt den letzten Tag zum Wiederholen frei', () => {
    const p = planToday(items, {}, '2026-03-06', now) // 5 Tage → 4 Lerntage → 5 pro Tag
    expect(p.perDay).toBe(5)
    expect(p.daysLeft).toBe(5)
  })
  it('fällige Wörter kommen vor neuen', () => {
    const cards = { 's:0': reviewCard(undefined, 'again', new Date('2026-02-01')) }
    const p = planToday(items, cards, null, now)
    expect(p.dueCount).toBe(1)
    expect(p.items[0].id).toBe('s:0')
  })
})
