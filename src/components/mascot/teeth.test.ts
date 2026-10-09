import { describe, expect, it } from 'vitest'
import { MOUTHS, lowerY, teethLower, teethUpper, upperY } from './mouth'
import { SKINS } from './species'

describe('Zähne folgen der Mundlinie', () => {
  it('die Oberkante liegt in der Mitte auf der Mittelhöhe und an den Rändern auf der Mundwinkelhöhe', () => {
    const p = MOUTHS.grin
    expect(upperY(p, 100)).toBeCloseTo(p.centerY, 1)
    expect(upperY(p, 100 - p.w)).toBeCloseTo(p.cornerY, 1)
    expect(upperY(p, 100 + p.w)).toBeCloseTo(p.cornerY, 1)
  })

  it('die Unterkante liegt bei offenem Mund tiefer als die Oberkante', () => {
    const p = MOUTHS.laugh
    expect(lowerY(p, 100)).toBeGreaterThan(upperY(p, 100) + p.open * 0.5)
  })

  it('acht Zähne oben, vier unten, größer mit dem Faktor', () => {
    expect(teethUpper(MOUTHS.smile).split('Z').length - 1).toBe(8)
    expect(teethLower(MOUTHS.laugh).split('Z').length - 1).toBe(4)
    const y = (d: string) => Math.max(...[...d.matchAll(/ (\d+\.?\d*)(?= L| Z|$)/g)].map((m) => Number(m[1])))
    expect(y(teethUpper(MOUTHS.smile, 1.5))).toBeGreaterThan(y(teethUpper(MOUTHS.smile, 1)))
  })
})

describe('Wer wie spricht', () => {
  it('Pinguin spricht mit dem Schnabel, Elefant über den Rüssel, Krokodil mit Zähnen; alle anderen mit dem normalen Mund', () => {
    expect(SKINS.pinguin.speech).toBe('beak')
    expect(SKINS.elefant.speech).toBe('trunk')
    expect(SKINS.krokodil.teeth).toBeTruthy()
    for (const id of ['fuchs', 'giraffe', 'erdmaennchen', 'loewe', 'panda', 'nilpferd', 'zebra', 'affe', 'tiger'] as const) {
      expect(SKINS[id].speech, id).toBeUndefined()
    }
  })

  it('das Krokodil grinst über die ganze Schnauze', () => {
    const wide = SKINS.krokodil.shapeMouth!(MOUTHS.smile)
    expect(wide.w).toBeGreaterThan(MOUTHS.smile.w * 2.5)
    expect(wide.cornerY).toBeLessThan(MOUTHS.smile.cornerY)
  })
})
