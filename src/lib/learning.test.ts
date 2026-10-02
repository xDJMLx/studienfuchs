import { describe, expect, it, vi } from 'vitest'
import { blockingLesson, isLessonDone, isUnlocked, LESSON_PASS, TEST_PASS, units } from '../content'
import { describePuterError, extractJson, getAiConfig, normalizeAiVocab, puterText, setAiConfig } from './ai'
import { generateLesson, generateTest, generateWarmup, NEW_BATCH, WARMUP_SIZE } from './generateExercises'
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

  it('Einheitentest braucht mindestens 70 %', () => {
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
    for (const it of items) expect(ex.some((e) => (e.kind === 'type' || e.kind === 'spell') && e.itemId === it.id)).toBe(true)
  })

  it('Einsteiger-Leiter: in der ersten Lektion kein freies Schreiben und kein Diktat, stattdessen Buchstaben legen', () => {
    const items = regular[0].items
    const ex = generateLesson({ items, pool: items, mastery: () => 0, allowListen: true })
    expect(ex.some((e) => e.kind === 'listen')).toBe(false)
    expect(ex.every((e) => e.kind !== 'type' || e.hint === true)).toBe(true)
    const spells = ex.filter((e) => e.kind === 'spell')
    expect(spells.length).toBeGreaterThan(0)
    for (const s of spells) {
      if (s.kind !== 'spell') continue
      // alle Buchstaben der Lösung sind als Bausteine vorhanden
      const need = Array.from(s.answer.replace(/\s+/g, '').toLowerCase())
      const have = [...s.letters]
      for (const ch of need) {
        const i = have.indexOf(ch)
        expect(i).toBeGreaterThan(-1)
        have.splice(i, 1)
      }
    }
  })

  it('wer schon übt, aber noch nicht sicher ist, schreibt mit Stütze statt ohne Hilfe', () => {
    const items = regular[0].items
    const ex = generateLesson({ items, pool: items, mastery: () => 1, allowListen: true })
    const types = ex.filter((e) => e.kind === 'type')
    expect(types.length).toBeGreaterThan(0)
    expect(types.every((e) => e.kind === 'type' && e.hint === true)).toBe(true)
    expect(ex.some((e) => e.kind === 'listen')).toBe(false)
  })

  it('gefestigte Wörter werden ohne Stütze geschrieben und diktiert', () => {
    const items = regular[0].items
    const ex = generateLesson({ items, pool: items, mastery: () => 2, allowListen: true })
    expect(ex.some((e) => e.kind === 'type' && !e.hint)).toBe(true)
    expect(ex.some((e) => e.kind === 'listen')).toBe(true)
  })

  it('bereits gelernte Wörter bekommen keine Erklärkarte', () => {
    const items = regular[0].items
    const ex = generateLesson({ items, pool: items, mastery: () => 1, allowListen: false })
    expect(ex.some((e) => e.kind === 'teach')).toBe(false)
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

describe('Aufwärmen mit fälligen alten Wörtern', () => {
  const old = regular[0].items.slice(0, WARMUP_SIZE)

  it('fragt jedes alte Wort genau einmal aus dem Gedächtnis ab und markiert die Aufgabe', () => {
    const ex = generateWarmup(old, regular[0].items)
    expect(ex).toHaveLength(old.length)
    expect(ex.every((e) => e.warm && e.kind === 'type')).toBe(true)
    expect(new Set(ex.map((e) => e.itemId)).size).toBe(old.length)
  })

  it('ohne fällige Wörter gibt es kein Aufwärmen', () => {
    expect(generateWarmup([], [])).toEqual([])
  })
})

describe('Übungstest mit Lernstand', () => {
  it('noch nie geübte Wörter werden gelegt, halb gelernte mit Stütze geschrieben, sichere frei', () => {
    const items = regular[0].items
    const kinds = (m: 0 | 1 | 2) => generateTest({ items, pool: items, focus: 'write', count: items.length, mastery: () => m, allowListen: false })
    expect(kinds(0).every((e) => e.kind === 'spell' || (e.kind === 'type' && e.hint))).toBe(true)
    expect(kinds(1).every((e) => e.kind === 'type' && e.hint === true)).toBe(true)
    expect(kinds(2).every((e) => e.kind === 'type' && !e.hint)).toBe(true)
  })
})
