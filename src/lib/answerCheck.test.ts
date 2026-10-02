import { evaluate } from './evaluate'
import { describe, expect, it } from 'vitest'
import { checkAnswer, normalize } from './answerCheck'
import { safeStorage } from './storage'

describe('answerCheck', () => {
  it('normalisiert Akzente und Satzzeichen', () => {
    expect(normalize("l’école")).toBe("l'école")
    expect(normalize('  Bonjour!  ')).toBe('bonjour')
  })

  it('akzeptiert passende Antworten und fast-Korrekturen', () => {
    expect(checkAnswer('bonjour', 'bonjour')).toEqual({ status: 'correct' })
    expect(checkAnswer('bonjou', 'bonjour')).toMatchObject({ status: 'almost' })
    expect(checkAnswer('falsch', 'bonjour')).toEqual({ status: 'wrong' })
  })
})

describe('safeStorage', () => {
  it('erlaubt Lesen und Schreiben ohne Browser-Storage', () => {
    safeStorage.setItem('studienfuchs:test', 'ok')
    expect(safeStorage.getItem('studienfuchs:test')).toBe('ok')
    safeStorage.removeItem('studienfuchs:test')
    expect(safeStorage.getItem('studienfuchs:test')).toBeNull()
  })
})

describe('Buchstaben legen (spell)', () => {
  const ex = { kind: 'spell' as const, id: 'x:spell', itemId: 'x', prompt: 'auf Wiedersehen', answer: 'au revoir', letters: ['a', 'u', 'r', 'e', 'v', 'o', 'i', 'r', 'm', 'n'], speak: 'au revoir' }
  it('richtig, wenn die Buchstaben der Lösung (ohne Leerzeichen) in Reihenfolge liegen', () => {
    expect(evaluate(ex, ['a', 'u', 'r', 'e', 'v', 'o', 'i', 'r']).status).toBe('correct')
  })
  it('falsch bei falscher Reihenfolge, "fast richtig" nur bei fehlendem Akzent', () => {
    expect(evaluate(ex, ['a', 'u', 'e', 'r', 'v', 'o', 'i', 'r']).status).toBe('wrong')
    const accent = { ...ex, answer: 'à bientôt', letters: ['a', 'b', 'i', 'e', 'n', 't', 'o', 't', 'x'] }
    expect(evaluate(accent, ['a', 'b', 'i', 'e', 'n', 't', 'o', 't']).status).toBe('almost')
  })
})
