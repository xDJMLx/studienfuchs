import { describe, expect, it } from 'vitest'
import { EYE_OPEN, eyeArc, eyeTarget, eyeWindow, stepEye } from './eye'
import { FoxEngine } from './engine'
import { resolveLook } from './look'

describe('Augen aus Zahlen', () => {
  it('Sichtfenster und Bogen sind gültige Pfade (die Zeichnung liest die Lidkante daraus)', () => {
    for (const eyes of ['open', 'happy', 'closed', 'wide', 'sad', 'wink'] as const) {
      for (const mirror of [false, true]) {
        const win = eyeWindow(eyeTarget(eyes, mirror), 69, 90, mirror)
        expect(win).not.toMatch(/NaN/)
        expect(/^M(-?[0-9.]+) (-?[0-9.]+) L(-?[0-9.]+) (-?[0-9.]+)/.test(win)).toBe(true)
        expect(eyeArc(eyeTarget(eyes, mirror), 69, 90)).not.toMatch(/NaN/)
      }
    }
  })

  it('traurige Augen haben das Lid außen tiefer, entschlossene innen', () => {
    const sadL = eyeWindow({ ...EYE_OPEN, tilt: 1 }, 69, 90, false)
    const [, , yl, , yr] = /^M(-?[0-9.]+) (-?[0-9.]+) L(-?[0-9.]+) (-?[0-9.]+)/.exec(sadL)!.map(Number)
    // linkes Auge: außen = links, also liegt die linke Lidkante tiefer (größeres y)
    expect(yl).toBeGreaterThan(yr)
  })

  it('Lid geht in endlicher Zeit zu und wieder auf', () => {
    const p = { ...EYE_OPEN }
    for (let i = 0; i < 20; i++) stepEye(p, eyeTarget('closed', false), 16)
    expect(p.open).toBeLessThan(0.1)
    for (let i = 0; i < 40; i++) stepEye(p, EYE_OPEN, 16)
    expect(p.open).toBeGreaterThan(0.98)
  })
})

describe('Rechenaufwand', () => {
  it('ein Schritt des Gerüsts ist so billig, dass mehrere lebende Füchse auf einem Handy reichen', () => {
    const e = new FoxEngine({ idle: true })
    e.setLook(resolveLook('cheer', false, false))
    const t0 = performance.now()
    for (let i = 0; i < 2000; i++) e.tick(16)
    const per = (performance.now() - t0) / 2000
    expect(per).toBeLessThan(0.25) // Millisekunden pro Bild, großzügig gerechnet
  })
})
