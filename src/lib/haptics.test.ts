// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { haptic, installHaptics, PATTERNS } from './haptics'
import { mascotBus } from './mascotBus'
import { useStore } from '../store/useStore'

let vibrate: ReturnType<typeof vi.fn>
let off: () => void
let clock = new Date(2026, 0, 1, 12, 0, 0).getTime()

beforeEach(() => {
  vibrate = vi.fn(() => true)
  vi.stubGlobal('navigator', Object.assign(Object.create(globalThis.navigator ?? {}), { vibrate }))
  useStore.setState({ soundOn: true })
  vi.useFakeTimers()
  clock += 10_000
  vi.setSystemTime(clock)
  off = installHaptics()
})
afterEach(() => {
  off()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const later = () => vi.advanceTimersByTime(100)

describe('Fühlbares Feedback', () => {
  it('jedes Muster hat Pulse und Pausen im Wechsel und ist kurz genug', () => {
    for (const p of Object.values(PATTERNS)) {
      expect(p.length % 2).toBe(1)
      expect(p.reduce((a, b) => a + b, 0)).toBeLessThan(400)
    }
  })

  it('ein Tipp auf einen Knopf gibt einen Tick, ein Tipp auf Text nicht', () => {
    document.body.innerHTML = '<button id="b">Los</button><p id="p">Text</p>'
    document.getElementById('p')!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(vibrate).not.toHaveBeenCalled()
    document.getElementById('b')!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(vibrate).toHaveBeenCalledWith(PATTERNS.tick)
  })

  it('gesperrte Knöpfe und die untere Leiste bleiben still (sie machen ihr Feedback selbst)', () => {
    document.body.innerHTML = '<button id="d" disabled>x</button><nav class="tabbar"><button id="t">Üben</button></nav>'
    document.getElementById('d')!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    document.getElementById('t')!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('richtig, falsch und geschafft haben je ihr eigenes Muster', () => {
    mascotBus.emit('correct')
    expect(vibrate).toHaveBeenLastCalledWith(PATTERNS.success)
    later()
    mascotBus.emit('wrong')
    expect(vibrate).toHaveBeenLastCalledWith(PATTERNS.error)
    later()
    mascotBus.emit('levelup')
    expect(vibrate).toHaveBeenLastCalledWith(PATTERNS.celebrate)
  })

  it('bei ausgeschalteten Tönen und Vibration bleibt alles still', () => {
    useStore.setState({ soundOn: false })
    haptic('success')
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('ohne Vibrations-Schnittstelle (iPhone) tickt ein verstecktes Schalter-Feld', () => {
    vi.stubGlobal('navigator', Object.assign(Object.create(globalThis.navigator ?? {}), { vibrate: undefined }))
    haptic('success')
    vi.advanceTimersByTime(100)
    const box = document.querySelector('input[switch]') as HTMLInputElement | null
    expect(box).toBeTruthy()
    expect(box!.checked).toBe(false)
  })
})
