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
