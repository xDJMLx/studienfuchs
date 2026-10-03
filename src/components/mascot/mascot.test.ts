import { describe, expect, it } from 'vitest'
import { NEUTRAL, POSES, resolveLook, type PoseName } from './look'
import { MOUTHS, mouthLine, mouthLower, mouthPath, stepMouth, tonguePos, type MouthName, type MouthParams } from './mouth'

describe('Mund aus Zahlen', () => {
  const names = Object.keys(MOUTHS) as MouthName[]

  it('liefert für jede Form gültige Pfade ohne NaN', () => {
    for (const n of names) {
      for (const d of [mouthPath(MOUTHS[n]), mouthLine(MOUTHS[n]), mouthLower(MOUTHS[n])]) {
        expect(d).not.toMatch(/NaN|undefined/)
        expect(d.startsWith('M')).toBe(true)
      }
      const t = tonguePos(MOUTHS[n])
      expect(t.rx).toBeGreaterThanOrEqual(0)
      expect(t.ry).toBeGreaterThanOrEqual(0)
    }
  })

  it('geschlossene Formen haben keinen offenen Mund, offene haben Tiefe', () => {
    expect(MOUTHS.smile.open).toBe(0)
    expect(MOUTHS.sad.open).toBe(0)
    expect(MOUTHS.laugh.open).toBeGreaterThan(MOUTHS.grin.open)
    expect(MOUTHS.yawn.open).toBeGreaterThan(MOUTHS.laugh.open)
  })

  it('gleitet in endlicher Zeit weich zur neuen Form, ohne über das Ziel zu schießen', () => {
    const cur: MouthParams = { ...MOUTHS.smile }
    const target = MOUTHS.laugh
    let frames = 0
    let maxOpen = 0
    while (stepMouth(cur, target, 16) && frames < 600) {
      frames++
      maxOpen = Math.max(maxOpen, cur.open)
    }
    expect(frames).toBeLessThan(120) // unter etwa zwei Sekunden
    expect(frames).toBeGreaterThan(8) // nicht in einem Bild
    expect(maxOpen).toBeLessThanOrEqual(target.open)
    expect(cur).toEqual(target)
  })

  it('ist unabhängig von der Bildrate: gleiche Zeit, ähnliches Ergebnis', () => {
    const a: MouthParams = { ...MOUTHS.smile }
    const b: MouthParams = { ...MOUTHS.smile }
    for (let i = 0; i < 10; i++) stepMouth(a, MOUTHS.o, 20)
    for (let i = 0; i < 20; i++) stepMouth(b, MOUTHS.o, 10)
    expect(Math.abs(a.open - b.open)).toBeLessThan(0.2)
  })
})

describe('Posen des Fuchses', () => {
  const poses = Object.keys(POSES) as PoseName[]

  it('jede Pose ergibt eine vollständige Beschreibung mit bekanntem Mund', () => {
    for (const p of poses) {
      const look = resolveLook(p, false, false)
      expect(Object.keys(MOUTHS)).toContain(look.mouth)
      expect(look.blush).toBeGreaterThanOrEqual(0)
      expect(look.browL).toHaveLength(2)
    }
  })

  it('Jubel hebt beide Arme, Schlaf schließt die Augen, Zwinkern lässt ein Auge offen', () => {
    expect(resolveLook('cheer', false, false).armL).toBeGreaterThan(90)
    expect(resolveLook('cheer', false, false).armR).toBeLessThan(-90)
    expect(resolveLook('sleep', false, false).eyes).toBe('closed')
    expect(resolveLook('wink', false, false).eyes).toBe('wink')
    expect(resolveLook('dance', false, false).dance).toBe(true)
  })

  it('beim Sprechen wechselt der Mund im Takt, aber nur bei ruhigen Mundformen', () => {
    expect(resolveLook('idle', true, true).mouth).toBe('talk')
    expect(resolveLook('idle', true, false).mouth).toBe('smile')
    expect(resolveLook('sad', true, true).mouth).toBe('sad')
    expect(resolveLook('idle', false, true).mouth).toBe(NEUTRAL.mouth)
  })
})
