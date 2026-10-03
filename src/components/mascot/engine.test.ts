import { describe, expect, it } from 'vitest'
import { FoxEngine } from './engine'
import { NEUTRAL, POSES, resolveLook } from './look'
import { dampingRatio, spring, stepBallistic, stepSpring } from './spring'

const run = (e: FoxEngine, seconds: number, step = 16, each?: (t: number) => void): void => {
  for (let t = 0; t < seconds * 1000; t += step) {
    e.tick(step)
    each?.(t)
  }
}
const seeded = () => {
  let s = 7
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

describe('Federn', () => {
  it('schwingt über das Ziel hinaus, wenn schwach gedämpft, und kommt dann zur Ruhe', () => {
    const s = spring(0, 140, 14)
    expect(dampingRatio(s)).toBeLessThan(1)
    let max = 0
    for (let i = 0; i < 400; i++) {
      stepSpring(s, 10, 16)
      max = Math.max(max, s.x)
    }
    expect(max).toBeGreaterThan(10.3)
    expect(Math.abs(s.x - 10)).toBeLessThan(0.05)
  })

  it('verhält sich bei grober und feiner Bildrate ähnlich', () => {
    const a = spring(0, 170, 12)
    const b = spring(0, 170, 12)
    for (let i = 0; i < 20; i++) stepSpring(a, 50, 16)
    for (let i = 0; i < 40; i++) stepSpring(b, 50, 8)
    expect(Math.abs(a.x - b.x)).toBeLessThan(1.5)
  })

  it('Sprung: steigt, landet, prallt klein ab und liegt dann still', () => {
    const b = { y: 0, v: -400 }
    let landings = 0
    let top = 0
    for (let i = 0; i < 200; i++) {
      stepBallistic(b, 16, () => landings++)
      top = Math.min(top, b.y)
    }
    expect(top).toBeLessThan(-25)
    expect(top).toBeGreaterThan(-45)
    expect(landings).toBeGreaterThanOrEqual(2)
    expect(b.y).toBe(0)
    expect(b.v).toBe(0)
  })
})

describe('Fuchs-Gerüst', () => {
  it('kommt nach einer Posenänderung zur Ruhe, wenn er nicht lebt (spart Akku)', () => {
    const e = new FoxEngine({ idle: false })
    e.setLook(resolveLook('sad', false, false))
    let active = true
    for (let i = 0; i < 600 && active; i++) active = e.tick(16)
    expect(active).toBe(false)
    expect(e.out.vars.hr).toBeCloseTo(POSES.sad.headRot as number, 1)
  })

  it('gehobene Arme werden gestreckt und winken', () => {
    const e = new FoxEngine({ idle: false })
    e.setLook(resolveLook('cheer', false, false))
    run(e, 1)
    expect(e.out.vars.aL).toBeGreaterThan(90)
    expect(e.out.vars.aR).toBeLessThan(-90)
    expect(e.out.vars.aLs).toBeGreaterThan(1.15)
  })

  it('Arme überschwingen kurz über den Zielwinkel', () => {
    const e = new FoxEngine({ idle: false })
    e.setLook(resolveLook('cheer', false, false))
    let max = 0
    run(e, 1.5, 16, () => (max = Math.max(max, e.out.vars.aL)))
    expect(max).toBeGreaterThan(POSES.cheer.armL!)
  })

  it('Ohren bleiben zurück, wenn sich der Kopf dreht (Nachschwingen)', () => {
    const e = new FoxEngine({ idle: false })
    e.setLook({ ...NEUTRAL, headRot: 20 })
    let minEar = 0
    run(e, 0.4, 16, () => (minEar = Math.min(minEar, e.out.vars.eL)))
    expect(minEar).toBeLessThan(-1)
    run(e, 3)
    expect(Math.abs(e.out.vars.eL)).toBeLessThan(0.5)
  })

  it('Sprung hebt ihn an, staucht ihn beim Landen und endet in Ruhe', () => {
    const e = new FoxEngine({ idle: false })
    let impact = 0
    e.onLand = (i) => (impact = Math.max(impact, i))
    e.hop()
    let high = 0
    let squashed = 1
    run(e, 2, 16, () => {
      high = Math.min(high, e.out.vars.by)
      squashed = Math.min(squashed, e.out.vars.sy)
    })
    expect(high).toBeLessThan(-20)
    expect(squashed).toBeLessThan(0.93)
    expect(impact).toBeGreaterThan(300)
    expect(e.out.vars.by).toBe(0)
    expect(Math.abs(e.out.vars.sy - 1)).toBeLessThan(0.01)
  })

  it('blinzelt von selbst und schließt dabei beide offenen Augen', () => {
    const e = new FoxEngine({ idle: true, rnd: seeded() })
    let min = 1
    let reopened = false
    run(e, 9, 16, () => {
      min = Math.min(min, e.out.eyeL.open)
      if (min < 0.2 && e.out.eyeL.open > 0.9) reopened = true
    })
    expect(min).toBeLessThan(0.2)
    expect(reopened).toBe(true)
  })

  it('beim Zwinkern bleibt das linke Auge offen und das rechte geht zu', () => {
    const e = new FoxEngine({ idle: false })
    e.setLook(resolveLook('wink', false, false))
    run(e, 1)
    expect(e.out.eyeL.open).toBeGreaterThan(0.9)
    expect(e.out.eyeR.arcOn).toBeGreaterThan(0.9)
  })

  it('der Mund folgt der Lautstärke beim Sprechen und schließt sich danach', () => {
    const e = new FoxEngine({ idle: false })
    e.setTalk(0.9, 0.2)
    run(e, 0.6)
    expect(e.out.mouth.open).toBeGreaterThan(20)
    e.setTalk(0.1, 0.8)
    run(e, 0.6)
    expect(e.out.mouth.open).toBeLessThan(10)
    e.setTalk(null)
    run(e, 1.5)
    expect(e.out.mouth.open).toBeLessThan(1)
  })

  it('Blick folgt dem Zeiger und kehrt zurück', () => {
    const e = new FoxEngine({ idle: false })
    e.setPointer(5, -4, 3)
    run(e, 1)
    expect(e.out.vars.gx).toBeCloseTo(5, 0)
    expect(e.out.vars.gy).toBeCloseTo(-4, 0)
    e.setPointer(0, 0, 0)
    run(e, 1)
    expect(Math.abs(e.out.vars.gx)).toBeLessThan(0.2)
  })

  it('Bewegung reduzieren: springt direkt, ohne Sprung und Schütteln', () => {
    const e = new FoxEngine({ idle: true, reduced: true })
    e.setLook(resolveLook('sad', false, false))
    e.tick(16)
    expect(e.out.vars.hr).toBe(POSES.sad.headRot)
    e.hop()
    e.shake()
    run(e, 1)
    expect(e.out.vars.by).toBe(0)
  })

  it('Tanz bewegt die Arme im Wechsel', () => {
    const e = new FoxEngine({ idle: false })
    e.setLook(resolveLook('dance', false, false))
    let leftHigh = false
    let rightHigh = false
    run(e, 1.2, 16, () => {
      if (e.out.vars.aL > 80 && e.out.vars.aR > -40) leftHigh = true
      if (e.out.vars.aR < -80 && e.out.vars.aL < 40) rightHigh = true
    })
    expect(leftHigh).toBe(true)
    expect(rightHigh).toBe(true)
  })
})
