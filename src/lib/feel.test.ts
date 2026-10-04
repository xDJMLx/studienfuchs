// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { feelOf, installFeel, jiggle } from './feel'

const make = (html: string): HTMLElement => {
  document.body.innerHTML = html
  return document.body.firstElementChild as HTMLElement
}
const spy = (el: HTMLElement) => {
  const fn = vi.fn(() => ({ id: '' }) as unknown as Animation)
  el.animate = fn as unknown as HTMLElement['animate']
  return fn
}
afterEach(() => {
  document.body.innerHTML = ''
})

describe('Klick-Gefühl', () => {
  it('jede Art von Element bekommt ihre eigene Bewegung', () => {
    expect(feelOf(make('<button class="btn btn-primary">Los</button>'))).toBe('pop')
    expect(feelOf(make('<button class="chip">Test</button>'))).toBe('wobble')
    expect(feelOf(make('<button role="radio" class="press">A</button>'))).toBe('wobble')
    expect(feelOf(make('<button role="switch" class="press">A</button>'))).toBe('wobble')
    expect(feelOf(make('<a class="card press">Karte</a>'))).toBe('nudge')
    expect(feelOf(make('<button class="press">Sonst</button>'))).toBe('soft')
  })

  it('nichts bewegt sich in der Tab-Leiste, bei gesperrten Knöpfen oder mit data-no-feel', () => {
    document.body.innerHTML = '<nav class="tabbar"><button class="press" id="t">Tab</button></nav>'
    expect(feelOf(document.getElementById('t')!)).toBeNull()
    expect(feelOf(make('<button class="btn" disabled>X</button>'))).toBeNull()
    expect(feelOf(make('<button class="btn" data-no-feel>X</button>'))).toBeNull()
    const moved = make('<button class="btn">X</button>')
    moved.style.transform = 'scale(1.1)'
    expect(feelOf(moved)).toBeNull()
  })

  it('jiggle startet eine Animation mit Überschwingen; die Drehrichtung ist zufällig', () => {
    const el = make('<button class="chip">X</button>')
    const fn = spy(el)
    jiggle(el, 'wobble', () => 0.1)
    jiggle(el, 'wobble', () => 0.9)
    expect(fn).toHaveBeenCalledTimes(2)
    const framesA = (fn.mock.calls[0] as unknown as [Keyframe[]])[0]
    const framesB = (fn.mock.calls[1] as unknown as [Keyframe[]])[0]
    const rot = (f: Keyframe[]) => String(f[1].transform).match(/rotate\((-?[\d.]+)deg\)/)![1]
    expect(Number(rot(framesA))).toBeLessThan(0)
    expect(Number(rot(framesB))).toBeGreaterThan(0)
    // Überschwingen: größer als 1, am Ende wieder genau 1
    expect(String(framesA[1].transform)).toContain('scale(1.07)')
    expect(String(framesA.at(-1)!.transform)).toContain('scale(1)')
  })

  it('ein Klick irgendwo im Knopf lässt den Knopf federn, danach nicht mehr', () => {
    const el = make('<button class="btn"><span id="inner">Text</span></button>')
    const fn = spy(el)
    const off = installFeel(document)
    document.getElementById('inner')!.click()
    expect(fn).toHaveBeenCalledTimes(1)
    off()
    document.getElementById('inner')!.click()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
