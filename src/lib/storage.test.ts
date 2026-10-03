import { afterEach, describe, expect, it, vi } from 'vitest'
import { debouncedStorage, flushStorage, safeStorage } from './storage'

afterEach(() => {
  flushStorage()
  safeStorage.removeItem('t-key')
  vi.useRealTimers()
})

describe('gebündeltes Speichern', () => {
  it('schreibt nicht bei jeder Änderung, liest aber immer den neuesten Stand', () => {
    vi.useFakeTimers()
    debouncedStorage.setItem('t-key', 'eins')
    debouncedStorage.setItem('t-key', 'zwei')
    expect(safeStorage.getItem('t-key')).toBeNull()
    expect(debouncedStorage.getItem('t-key')).toBe('zwei')
    vi.advanceTimersByTime(600)
    expect(safeStorage.getItem('t-key')).toBe('zwei')
  })

  it('flushStorage schreibt sofort (beim Verlassen der App)', () => {
    debouncedStorage.setItem('t-key', 'jetzt')
    flushStorage()
    expect(safeStorage.getItem('t-key')).toBe('jetzt')
  })

  it('Löschen verwirft einen noch wartenden Schreibvorgang', () => {
    debouncedStorage.setItem('t-key', 'weg')
    debouncedStorage.removeItem('t-key')
    flushStorage()
    expect(safeStorage.getItem('t-key')).toBeNull()
  })
})
