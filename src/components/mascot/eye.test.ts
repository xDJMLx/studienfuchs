import { describe, expect, it } from 'vitest'
import { BLINK_TOTAL, EYE_OPEN, blinkClosed, blinked, eyeArc, eyeLid, eyeTarget, eyeWindow, lidCurve, lidOpacity, shutScale, stepEye } from './eye'
import { FoxEngine } from './engine'
import { resolveLook } from './look'

describe('Augen aus Zahlen', () => {
  it('Sichtfenster, Lidlinie und Bogen sind gültige Pfade', () => {
    for (const eyes of ['open', 'happy', 'closed', 'wide', 'sad', 'wink'] as const) {
      for (const mirror of [false, true]) {
        const p = eyeTarget(eyes, mirror)
        expect(eyeWindow(p, 69, 90, mirror)).not.toMatch(/NaN/)
        expect(eyeLid(p, 69, 90, mirror)).not.toMatch(/NaN/)
        expect(eyeArc(p, 69, 90)).not.toMatch(/NaN/)
      }
    }
  })

  it('traurige Augen haben das Lid außen tiefer', () => {
    const c = lidCurve({ ...EYE_OPEN, tilt: 1 }, 69, 90, false)
    // linkes Auge: außen = links, also liegt die linke Kante tiefer (größeres y)
    expect(c.yl).toBeGreaterThan(c.yr)
    const m = lidCurve({ ...EYE_OPEN, tilt: 1 }, 131, 90, true)
    expect(m.yr).toBeGreaterThan(m.yl)
  })

  it('das Lid wölbt sich beim Schließen in der Mitte nach unten, offen liegt es flach', () => {
    const open = lidCurve(EYE_OPEN, 69, 90, false)
    expect(open.cy).toBeCloseTo((open.yl + open.yr) / 2, 5)
    const half = lidCurve({ ...EYE_OPEN, open: 0.3 }, 69, 90, false)
    expect(half.cy).toBeGreaterThan((half.yl + half.yr) / 2 + 2)
  })

  it('Lid geht in endlicher Zeit zu und wieder auf', () => {
    const p = { ...EYE_OPEN }
    for (let i = 0; i < 20; i++) stepEye(p, eyeTarget('closed', false), 16)
    expect(p.open).toBeLessThan(0.1)
    for (let i = 0; i < 40; i++) stepEye(p, EYE_OPEN, 16)
    expect(p.open).toBeGreaterThan(0.98)
  })
})

describe('Blinzeln', () => {
  it('beginnt und endet offen, ist dazwischen ganz zu und bleibt immer zwischen 0 und 1', () => {
    expect(blinkClosed(0)).toBe(0)
    expect(blinkClosed(BLINK_TOTAL)).toBe(0)
    let max = 0
    for (let d = 0; d <= BLINK_TOTAL; d += 0.004) {
      const k = blinkClosed(d)
      expect(k).toBeGreaterThanOrEqual(0)
      expect(k).toBeLessThanOrEqual(1)
      max = Math.max(max, k)
    }
    expect(max).toBe(1)
  })

  it('schließt schneller, als es öffnet', () => {
    let down = 0
    let up = 0
    for (let d = 0; d < BLINK_TOTAL; d += 0.002) {
      if (blinkClosed(d) < 1 && down === 0 && d > 0 && blinkClosed(d + 0.002) >= 1) down = d
    }
    for (let d = BLINK_TOTAL; d > 0; d -= 0.002) {
      if (blinkClosed(d) > 0.99) { up = BLINK_TOTAL - d; break }
    }
    expect(down).toBeLessThan(up)
  })

  it('beim Blinzeln staucht sich das Auge senkrecht, die Pose selbst bleibt unverändert', () => {
    const base = { ...EYE_OPEN }
    const b = blinked(base, 1)
    expect(b.shut).toBe(1)
    expect(b.open).toBe(1)
    expect(base.shut).toBe(0)
    expect(blinked(base, 0)).toBe(base)
    expect(shutScale(base)).toBe(1)
    expect(shutScale(blinked(base, 0.5))).toBeLessThan(0.7)
    expect(shutScale(b)).toBeLessThan(0.1)
    expect(shutScale(b)).toBeGreaterThan(0)
  })

  it('die Stauchung läuft gleichmäßig und ohne Sprünge mit dem Blinzelverlauf', () => {
    let prev = shutScale(blinked(EYE_OPEN, blinkClosed(0)))
    for (let d = 0.004; d <= BLINK_TOTAL; d += 0.004) {
      const cur = shutScale(blinked(EYE_OPEN, blinkClosed(d)))
      expect(Math.abs(cur - prev)).toBeLessThan(0.35)
      prev = cur
    }
  })

  it('ganz zu liegt die Schlusslinie leicht unter der Augenmitte und im Auge', () => {
    const d = eyeLid(blinked(EYE_OPEN, 1), 69, 90, false)
    const nums = d.match(/-?[0-9]+(?:[.][0-9]+)?/g)!.map(Number)
    expect(nums[1]).toBeGreaterThan(90)
    expect(nums[1]).toBeLessThan(100)
    expect(nums[0]).toBeGreaterThan(69 - 16)
    expect(nums[4]).toBeLessThan(69 + 16)
  })

  it('die Lidlinie ist beim Blinzeln deckend und bei Bogenaugen aus', () => {
    expect(lidOpacity(blinked(EYE_OPEN, 1))).toBe(1)
    expect(lidOpacity(EYE_OPEN)).toBe(0)
    expect(lidOpacity(eyeTarget('happy', false))).toBe(0)
  })

  it('der Fuchs blinzelt von selbst oft genug und kommt jedes Mal ganz zurück', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const e = new FoxEngine({ idle: true, rnd })
    e.setLook(resolveLook('happy', false, false))
    e.snap()
    let blinks = 0
    let closed = false
    for (let i = 0; i < 60 * 40; i++) {
      e.tick(16)
      const o = e.out.eyeL.shut
      if (!closed && o > 0.95) { closed = true; blinks++ }
      if (closed && o < 0.02) closed = false
    }
    expect(blinks).toBeGreaterThanOrEqual(4)
    expect(blinks).toBeLessThanOrEqual(20)
    expect(e.out.eyeL.open).toBeGreaterThan(0.9)
    expect(e.out.eyeL.shut).toBeLessThan(0.5)
  })

  it('beim Zwinkern blinzelt das zwinkernde Auge nicht', () => {
    const e = new FoxEngine({ idle: true, rnd: () => 0.5 })
    e.setLook(resolveLook('wink', false, false))
    e.snap()
    let minR = 1
    for (let i = 0; i < 60 * 12; i++) {
      e.tick(16)
      minR = Math.min(minR, e.out.eyeR.open)
    }
    expect(minR).toBeLessThan(0.1) // rechtes Auge bleibt als Bogen zu
    expect(e.out.eyeR.arcOn).toBeGreaterThan(0.9)
  })
})

describe('Rechenaufwand', () => {
  it('ein Schritt des Gerüsts ist so billig, dass mehrere lebende Füchse auf einem Handy reichen', () => {
    const e = new FoxEngine({ idle: true })
    e.setLook(resolveLook('cheer', false, false))
    const t0 = performance.now()
    for (let i = 0; i < 2000; i++) e.tick(16)
    const per = (performance.now() - t0) / 2000
    expect(per).toBeLessThan(0.25)
  })
})
