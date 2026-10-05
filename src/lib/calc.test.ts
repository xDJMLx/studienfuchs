import { describe, expect, it } from 'vitest'
import { calc, CalcError, formatFraction, formatNumber, solve, terminates } from './calc'

const val = (e: string) => calc(e).value

describe('Rechenkern: Terme', () => {
  it('Punkt vor Strich, Klammern, Minus, Hochzahlen', () => {
    expect(val('2+3*4')).toBe(14)
    expect(val('(2+3)*4')).toBe(20)
    expect(val('-3+5')).toBe(2)
    expect(val('2^10')).toBe(1024)
    expect(val('-2^2')).toBe(-4)
    expect(val('2^-1')).toBe(0.5)
  })

  it('deutsche Schreibweise: Komma, ×, ·, ÷, Doppelpunkt, Minuszeichen', () => {
    expect(val('1,5 × 4')).toBe(6)
    expect(val('12 : 4 · 2')).toBe(6)
    expect(val('10 ÷ 4')).toBe(2.5)
    expect(val('−3 − 4')).toBe(-7)
  })

  it('Brüche bleiben exakt: 0,1 + 0,2 = 0,3 und 1/3 + 1/6 = 1/2', () => {
    expect(val('0,1+0,2')).toBe(0.3)
    const r = calc('1/3+1/6')
    expect(r.exact).toEqual({ n: 1n, d: 2n })
    expect(formatFraction(r.exact!)).toBe('1/2')
    expect(formatFraction(calc('3/4 - 5/4').exact!)).toBe('−1/2')
    expect(calc('3/4 * 4/3').isInteger).toBe(true)
    expect(formatFraction(calc('(7/8) : (7/16)').exact!)).toBe('2')
  })

  it('Prozent, Wurzeln, Betrag', () => {
    expect(val('25%')).toBe(0.25)
    expect(val('200 * 15%')).toBe(30)
    expect(val('sqrt(144)')).toBe(12)
    expect(calc('sqrt(2/9)').exact).toBeNull()
    expect(val('sqrt(2)')).toBeCloseTo(1.41421356, 6)
    expect(val('abs(-7)')).toBe(7)
    expect(val('sqrt(0,25)')).toBe(0.5)
  })

  it('Fehler statt falscher Ergebnisse', () => {
    expect(() => calc('1/0')).toThrow(CalcError)
    expect(() => calc('2+')).toThrow(CalcError)
    expect(() => calc('(2+3')).toThrow(CalcError)
    expect(() => calc('2 + x')).toThrow(/Unbekannt/)
    expect(() => calc('sqrt(-4)')).toThrow(/negativen/)
    expect(() => calc('3 $ 4')).toThrow(/Zeichen/)
    expect(() => calc('2^0,5')).toThrow(CalcError)
  })

  it('große Zahlen ohne Rundungsfehler', () => {
    expect(calc('123456789*987654321').exact!.n).toBe(121932631112635269n)
  })
})

describe('Rechenkern: Gleichungen', () => {
  const x = (eq: string) => solve(eq).map((s) => s.value)
  it('lineare Gleichungen, auch mit Brüchen und Klammern', () => {
    expect(x('2x + 3 = 11')).toEqual([4])
    expect(x('3(x - 2) = 2x + 1')).toEqual([7])
    expect(x('x/2 + x/3 = 5')).toEqual([6])
    expect(x('5 = 2x - 1')).toEqual([3])
    expect(x('0,5x = 1,25')).toEqual([2.5])
  })

  it('quadratische Gleichungen: zwei, eine, keine Lösung; ganzzahlig oder mit Wurzel', () => {
    expect(x('x^2 - 5x + 6 = 0')).toEqual([2, 3])
    expect(x('x^2 - 4x + 4 = 0')).toEqual([2])
    expect(x('x^2 + 1 = 0')).toEqual([])
    const irr = solve('x^2 = 2')
    expect(irr.map((s) => s.value)[1]).toBeCloseTo(1.41421356, 6)
    expect(irr[0].exact).toBeNull()
  })

  it('Gleichungen ohne oder mit unendlich vielen Lösungen werden abgelehnt', () => {
    expect(() => solve('x + 1 = x + 2')).toThrow(/keine Lösung/)
    expect(() => solve('2x = 2x')).toThrow(/jedes x/)
    expect(() => solve('x = 1 = 2')).toThrow(/Gleichheitszeichen/)
    expect(() => solve('x^3 = 8')).toThrow(/zweiten Grad/)
    expect(() => solve('1/x = 2')).toThrow(/Unbekannte/)
  })
})

describe('Rechenkern: Anzeige', () => {
  it('deutsche Zahlen, Rundung, Minuszeichen', () => {
    expect(formatNumber(3.5)).toBe('3,5')
    expect(formatNumber(-2)).toBe('−2')
    expect(formatNumber(1 / 3, 3)).toBe('0,333')
    expect(formatNumber(1000)).toBe('1000')
    expect(formatNumber(0.1 + 0.2)).toBe('0,3')
  })
  it('endliche Dezimalzahlen', () => {
    expect(terminates(calc('3/8').exact!)).toBe(true)
    expect(terminates(calc('1/3').exact!)).toBe(false)
  })
})
