import { describe, it, expect } from 'vitest'
import { debounce, throttle, memoize } from './perf'

describe('Performance Utilities', () => {
  it('debounce verzögert Funktion bis Aufrufe stoppen', (done) => {
    let callCount = 0
    const fn = debounce(() => callCount++, 50)
    fn()
    fn()
    fn()
    expect(callCount).toBe(0)
    setTimeout(() => {
      expect(callCount).toBe(1)
      done()
    }, 100)
  })

  it('throttle ruft Funktion maximal einmal pro Intervall auf', (done) => {
    let callCount = 0
    const fn = throttle(() => callCount++, 50)
    fn()
    fn()
    fn()
    expect(callCount).toBe(1)
    setTimeout(() => {
      fn()
      expect(callCount).toBe(2)
      done()
    }, 100)
  })

  it('memoize cached pure function results', () => {
    let callCount = 0
    const add = memoize((a: number, b: number) => {
      callCount++
      return a + b
    })
    expect(add(2, 3)).toBe(5)
    expect(add(2, 3)).toBe(5)
    expect(callCount).toBe(1)
  })
})
