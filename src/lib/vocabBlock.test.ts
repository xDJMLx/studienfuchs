import { describe, expect, it } from 'vitest'
import { splitVocabBlock } from './vocabBlock'

const block = '```vokabeln\n{"title":"Unité 3, S. 12–14","items":[{"front":"la maison","back":"das Haus"},{"front":"l\'ecole","back":"die Schule"},{"front":"être","back":"sein"}]}\n```'

describe('Vokabel-Block aus der KI-Antwort', () => {
  it('trennt Block und Text und ergänzt fehlende Akzente', () => {
    const r = splitVocabBlock(`Ich habe 3 Wörter gefunden.\n\n${block}`)
    expect(r.text).toBe('Ich habe 3 Wörter gefunden.')
    expect(r.truncated).toBe(false)
    expect(r.vocab?.title).toBe('Unité 3, S. 12–14')
    expect(r.vocab?.items.map((i) => i.front)).toEqual(['la maison', "l'école", 'être'])
    expect(r.vocab?.items[0].back).toBe('das Haus')
  })

  it('lässt normale Antworten unverändert', () => {
    const r = splitVocabBlock('Das Passé composé bildest du mit avoir oder être.')
    expect(r.vocab).toBeNull()
    expect(r.text).toBe('Das Passé composé bildest du mit avoir oder être.')
  })

  it('erkennt abgeschnittene Blöcke', () => {
    const r = splitVocabBlock('Hier die Liste:\n```vokabeln\n{"title":"X","items":[{"front":"a","ba')
    expect(r.vocab).toBeNull()
    expect(r.truncated).toBe(true)
    expect(r.text).toBe('Hier die Liste:')
  })

  it('akzeptiert auch einen allgemeinen JSON-Block', () => {
    const r = splitVocabBlock('Bitte:\n```json\n{"title":"T","items":[{"front":"le chat","back":"die Katze"}]}\n```')
    expect(r.vocab?.items).toHaveLength(1)
  })
})
