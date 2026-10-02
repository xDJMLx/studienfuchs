import { describe, expect, it, vi } from 'vitest'
import { blockingLesson, isLessonDone, isUnlocked, LESSON_PASS, TEST_PASS, units } from '../content'
import { describePuterError, extractJson, getAiConfig, normalizeAiVocab, puterText, setAiConfig } from './ai'
import { generateLesson, NEW_BATCH } from './generateExercises'
import { parsePageRange } from './pageRange'
import { itemsForScope } from './scope'
import { newCard } from './srs'

const unit = units[0]
const regular = unit.lessons.filter((l) => !l.review && !l.test)

describe('Freischaltung der Lektionen', () => {
  it('nur die erste Lektion der ersten Einheit ist am Anfang offen', () => {
    expect(isUnlocked(regular[0].id, {})).toBe(true)
    expect(isUnlocked(regular[1].id, {})).toBe(false)
    expect(blockingLesson(regular[1].id, {})?.id).toBe(regular[0].id)
  })

  it('Raten mit schlechtem Ergebnis schaltet nichts frei, ausreichend gute Genauigkeit schon', () => {
    expect(isUnlocked(regular[1].id, { [regular[0].id]: { bestAccuracy: 0.1 } })).toBe(false)
    expect(isUnlocked(regular[1].id, { [regular[0].id]: { bestAccuracy: LESSON_PASS } })).toBe(true)
  })

  it('Wiederholung und Test öffnen erst, wenn alle normalen Lektionen geschafft sind', () => {
    const review = unit.lessons.find((l) => l.review)!
    const test = unit.lessons.find((l) => l.test)!
    const some = Object.fromEntries(regular.slice(0, -1).map((l) => [l.id, { bestAccuracy: 1 }]))
    expect(isUnlocked(review.id, some)).toBe(false)
    expect(isUnlocked(test.id, some)).toBe(false)
    const all = Object.fromEntries(regular.map((l) => [l.id, { bestAccuracy: 1 }]))
    expect(isUnlocked(review.id, all)).toBe(true)
    expect(isUnlocked(test.id, all)).toBe(true)
  })

  it('die nächste Einheit öffnet erst nach allen Lektionen der vorigen', () => {
    const next = units[1]
    const first = next.lessons[0]
    expect(isUnlocked(first.id, {})).toBe(false)
    const done = Object.fromEntries(regular.map((l) => [l.id, { bestAccuracy: 1 }]))
    expect(isUnlocked(first.id, done)).toBe(true)
  })

  it('Einheitentest braucht mindestens 80 %', () => {
    const test = unit.lessons.find((l) => l.test)!
    expect(isLessonDone(test, { bestAccuracy: TEST_PASS - 0.01 })).toBe(false)
    expect(isLessonDone(test, { bestAccuracy: TEST_PASS })).toBe(true)
  })
})

describe('Lernschritte', () => {
  it('neue Wörter werden nur zu zweit gezeigt und sofort abgefragt', () => {
    const items = regular[0].items
    const ex = generateLesson({ items, pool: items, mastery: () => 0, allowListen: false })
    const teachIdx = ex.map((e, i) => (e.kind === 'teach' ? i : -1)).filter((i) => i >= 0)
    expect(teachIdx.length).toBe(Math.ceil(items.length / NEW_BATCH))
    for (const i of teachIdx) {
      const t = ex[i]
      if (t.kind !== 'teach') continue
      expect(t.items.length).toBeLessThanOrEqual(NEW_BATCH)
      // direkt danach kommt eine Frage zu einem der gerade gezeigten Wörter
      expect(t.items.map((x) => x.id)).toContain(ex[i + 1].itemId)
    }
    // jedes Wort wird später auch aus dem Gedächtnis abgefragt
    for (const it of items) expect(ex.some((e) => e.kind === 'type' && e.itemId === it.id)).toBe(true)
  })

  it('bereits gelernte Wörter bekommen keine Erklärkarte', () => {
    const items = regular[0].items
    const ex = generateLesson({ items, pool: items, mastery: () => 1, allowListen: false })
    expect(ex.some((e) => e.kind === 'teach')).toBe(false)
  })
})

describe('Seitenbereich', () => {
  it('versteht Bereiche und Listen', () => {
    expect(parsePageRange('12-15', 100).pages).toEqual([12, 13, 14, 15])
    expect(parsePageRange('3, 5, 8-9', 100).pages).toEqual([3, 5, 8, 9])
    expect(parsePageRange('7', 100).pages).toEqual([7])
  })
  it('meldet Fehler verständlich', () => {
    expect(parsePageRange('', 10).error).toBeTruthy()
    expect(parsePageRange('5-2', 10).error).toMatch(/größer/)
    expect(parsePageRange('1-50', 10).error).toMatch(/nur 10 Seiten/)
    expect(parsePageRange('abc', 10).error).toBeTruthy()
    expect(parsePageRange('1-30', 100, 20).error).toMatch(/höchstens 20/)
  })
})

describe('KI-Antworten', () => {
  it('liest JSON auch mit Code-Zaun und Text drumherum', () => {
    const text = 'Hier ist das Ergebnis:\n```json\n{"title":"Unité 1","items":[{"front":"le chat","back":"die Katze"}]}\n```\nViel Erfolg!'
    const v = normalizeAiVocab(extractJson(text))
    expect(v.title).toBe('Unité 1')
    expect(v.items).toEqual([{ front: 'le chat', back: 'die Katze' }])
  })
  it('entfernt Duplikate und Einträge ohne Übersetzung, übernimmt Beispiele nur vollständig', () => {
    const v = normalizeAiVocab({
      items: [
        { front: 'la maison', back: 'das Haus', example: 'La maison est grande.', exampleDe: 'Das Haus ist groß.' },
        { front: 'la maison', back: 'das Haus' },
        { front: 'le livre', back: '' },
        { front: 'le stylo', back: 'der Kuli', example: 'Nur ein Satz ohne Übersetzung' },
      ],
    })
    expect(v.items.map((i) => i.front)).toEqual(['la maison', 'le stylo'])
    expect(v.items[0].example).toBeTruthy()
    expect(v.items[1].example).toBeUndefined()
  })
  it('wirft bei unlesbarer Antwort einen Fehler', () => {
    expect(() => extractJson('Das kann ich leider nicht.')).toThrow()
  })
})

describe('Übungsbereiche', () => {
  it('Einheit liefert alle Wörter, "gelernt" nur Wörter mit Karte', () => {
    const items = regular.flatMap((l) => l.items)
    expect(itemsForScope(`unit:${unit.id}`, { cards: {}, favorites: [], sets: [] }).length).toBe(items.length)
    expect(itemsForScope('learned', { cards: {}, favorites: [], sets: [] })).toEqual([])
    const cards = { [items[0].id]: newCard() }
    expect(itemsForScope('learned', { cards, favorites: [], sets: [] }).map((i) => i.id)).toEqual([items[0].id])
  })
})

describe('KI-Anbieter', () => {
  it('Standard ist Puter, ein gespeicherter Schlüssel schaltet auf Anthropic um', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    expect(getAiConfig().provider).toBe('puter')
    setAiConfig({ provider: 'anthropic', key: '  test-key  ', model: 'claude-haiku-4-5-20251001' })
    expect(getAiConfig()).toMatchObject({ provider: 'anthropic', key: 'test-key', model: 'claude-haiku-4-5-20251001' })
    setAiConfig({ provider: 'anthropic', key: '   ' })
    expect(getAiConfig().provider).toBe('puter')
    setAiConfig({ provider: 'anthropic', key: 'x' })
    setAiConfig(null)
    expect(getAiConfig().provider).toBe('puter')
    vi.unstubAllGlobals()
  })

  it('liest Antworttext aus allen Puter-Antwortformen', () => {
    expect(puterText('hallo')).toBe('hallo')
    expect(puterText({ message: { content: 'a' } })).toBe('a')
    expect(puterText({ message: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } })).toBe('a\nb')
    expect(puterText({ text: 'c' })).toBe('c')
    expect(puterText(null)).toBe('')
  })

  it('übersetzt Puter-Fehler in verständliche Meldungen', () => {
    expect(describePuterError({ error: { message: 'Insufficient credits' } }).kind).toBe('rate')
    expect(describePuterError({ error: { code: 'token_auth_failed', message: 'bad token' } }).kind).toBe('auth')
    expect(describePuterError({ message: 'irgendwas kaputt' }).message).toContain('irgendwas kaputt')
    expect(describePuterError({}).kind).toBe('other')
  })
})
