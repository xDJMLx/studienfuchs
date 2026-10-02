import { describe, expect, it } from 'vitest'
import { restoreAccents } from './accents'

describe('restoreAccents', () => {
  it('ergänzt fehlende Akzente', () => {
    expect(restoreAccents('ecole')).toBe('école')
    expect(restoreAccents('la francaise')).toBe('la française')
    expect(restoreAccents('tres bien')).toBe('très bien')
    expect(restoreAccents('apres la classe')).toBe('après la classe')
    expect(restoreAccents('le frere et la soeur')).toContain('frère')
    expect(restoreAccents("l'eleve")).toBe("l'élève")
  })

  it('behält Groß-/Kleinschreibung', () => {
    expect(restoreAccents('Ecole')).toBe('École')
    expect(restoreAccents('ECOLE')).toBe('ÉCOLE')
    expect(restoreAccents('Ca va ?')).toBe('Ça va ?')
  })

  it('lässt Wörter mit Akzent und mehrdeutige Kleinwörter in Ruhe', () => {
    expect(restoreAccents('école')).toBe('école')
    expect(restoreAccents('il a un chat')).toBe('il a un chat')
    expect(restoreAccents('ou habites-tu')).toBe('ou habites-tu')
    expect(restoreAccents('la maison sur la table')).toBe('la maison sur la table')
    expect(restoreAccents('du pain, des amis, mais oui')).toBe('du pain, des amis, mais oui')
  })

  it('lässt unbekannte Wörter unverändert', () => {
    expect(restoreAccents('xyzabc')).toBe('xyzabc')
    expect(restoreAccents('le chat')).toBe('le chat')
  })
})
