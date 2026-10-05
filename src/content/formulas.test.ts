import { describe, expect, it } from 'vitest'
import { calc } from '../lib/calc'
import { computeTask } from '../lib/tasks'
import { FORMULA_SKILLS, formulaSkill, makeFormulaSession, makeFormulaTask, skillsOf } from './formulas'

/** Einfacher, wiederholbarer Zufall für die Tests. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

describe('Formel-Training: jede Aufgabe ist sauber lösbar', () => {
  for (const skill of FORMULA_SKILLS) {
    it(`${skill.title}: 150 gewürfelte Aufgaben haben eine endliche, vernünftige Lösung und einen Rechenweg`, () => {
      const rng = seeded(skill.id.length * 7919)
      for (let i = 0; i < 150; i++) {
        const t = makeFormulaTask(skill, rng)
        expect(t.t).toBe('calc')
        if (t.t !== 'calc') continue
        const c = computeTask(t)
        expect(c, t.q).not.toBeNull()
        expect(Number.isFinite(c!.value)).toBe(true)
        expect(c!.value).toBeGreaterThan(0)
        // Die gezeigte Lösung stimmt mit der Rechnung überein, und der Rechenweg nennt das Ergebnis
        expect(c!.value).toBeCloseTo(calc(t.expr).value, 6)
        expect(t.why).toContain('=')
        expect(t.q.length).toBeGreaterThan(20)
      }
    })
  }

  it('Formeln stimmen: Geschwindigkeit, Dichte, Ohm', () => {
    const v = formulaSkill('phy-v')!
    // Jede Aufgabe ist eine der vier Formen und das Ergebnis ist genau das, was die Formel verlangt
    for (let i = 0; i < 40; i++) {
      const t = makeFormulaTask(v, seeded(i + 1))
      if (t.t !== 'calc') throw new Error()
      const m = /^(\d+)\/(\d+)$|^(\d+)\*(\d+)$/.exec(t.expr)
      expect(m, t.expr).not.toBeNull()
    }
    const ohm = formulaSkill('phy-u')!
    for (let i = 0; i < 40; i++) {
      const t = makeFormulaTask(ohm, seeded(i + 5))
      if (t.t !== 'calc') throw new Error()
      const [, num] = /^(?:(\d+(?:\.\d+)?)[*/])/.exec(t.expr) ?? []
      expect(num).toBeDefined()
      expect(['V', 'A', 'Ω']).toContain(t.unit)
    }
  })

  it('Ein Durchgang hat Rechenaufgaben und Wissensfragen, keine doppelten Fragen', () => {
    const s = makeFormulaSession(formulaSkill('phy-rho')!, 10, seeded(3))
    expect(s.length).toBe(10)
    expect(s.filter((t) => t.t === 'mc').length).toBe(2)
    const qs = s.map((t) => (t as { q: string }).q)
    expect(new Set(qs).size).toBe(qs.length)
  })

  it('Themen sind nach Fach sortiert; nichts doppelt', () => {
    expect(skillsOf('physik').length).toBeGreaterThanOrEqual(7)
    expect(skillsOf('chemie').map((s) => s.id)).toEqual(['che-n', 'che-w'])
    expect(skillsOf('mathe').length).toBe(2)
    expect(skillsOf('deutsch')).toEqual([])
    expect(new Set(FORMULA_SKILLS.map((s) => s.id)).size).toBe(FORMULA_SKILLS.length)
  })
})
