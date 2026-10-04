import { describe, expect, it } from 'vitest'
import { evaluate } from '../../lib/evaluate'
import { generateMathSession, makeMathExercise, mathUnits, SKILLS } from './index'
import { makeRng } from './rng'
import type { Level } from './core'

const LEVELS: Level[] = [1, 2, 3]
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const BAD = /NaN|undefined|Infinity|\[object|\bnull\b/

describe('Mathe: Aufbau', () => {
  it('jede Einheit hat Lektionen, jede Lektion bekannte Themen und eine Erklärung', () => {
    expect(mathUnits.length).toBeGreaterThanOrEqual(6)
    for (const u of mathUnits) {
      expect(u.lessons.length).toBeGreaterThan(1)
      for (const l of u.lessons.filter((x) => !x.review && !x.test)) {
        expect(l.explanation, `${l.id} ohne Erklärung`).toBeTruthy()
        expect(l.items.length).toBeGreaterThan(0)
      }
    }
  })

  it('alle Themen kommen im Lehrplan vor und haben Titel und Beschreibung', () => {
    const used = new Set(mathUnits.flatMap((u) => u.lessons.flatMap((l) => l.items.map((i) => i.id))))
    for (const s of Object.values(SKILLS)) {
      expect(used.has(s.id), `${s.id} steht in keiner Lektion`).toBe(true)
      expect(s.title.length).toBeGreaterThan(2)
      expect(s.blurb.length).toBeGreaterThan(5)
    }
  })
})

describe('Mathe: Aufgaben-Erzeuger', () => {
  for (const skill of Object.values(SKILLS)) {
    it(`${skill.id}: gültige Aufgaben bei allen Stufen`, () => {
      for (const level of LEVELS)
        for (const seed of SEEDS)
          for (const form of ['any', 'choice'] as const) {
            const r = makeRng(seed * 31 + level)
            const d = makeMathExercise(skill.id, level, form, r)
            const where = `${skill.id} L${level} s${seed} ${form}`
            if (d.kind === 'mmatch') {
              expect(d.pairs.length, where).toBeGreaterThanOrEqual(3)
              expect(new Set(d.pairs.map((p) => p.left)).size, `${where}: gleiche linke Seiten`).toBe(d.pairs.length)
              expect(new Set(d.pairs.map((p) => p.right)).size, `${where}: gleiche rechte Seiten`).toBe(d.pairs.length)
              for (const p of d.pairs) expect(BAD.test(p.left + p.right), `${where}: ${p.left} / ${p.right}`).toBe(false)
              continue
            }
            expect(d.prompt.length, where).toBeGreaterThan(3)
            expect(BAD.test(d.prompt), `${where}: ${d.prompt}`).toBe(false)
            expect(BAD.test(d.answer), `${where}: Lösung ${d.answer}`).toBe(false)
            if (d.solution) expect(BAD.test(d.solution), `${where}: ${d.solution}`).toBe(false)
            if (d.hint) expect(BAD.test(d.hint), `${where}: ${d.hint}`).toBe(false)
            if (d.kind === 'mchoice') {
              expect(d.options.length, `${where}: Optionen`).toBeGreaterThanOrEqual(3)
              expect(new Set(d.options).size, `${where}: doppelte Optionen ${d.options}`).toBe(d.options.length)
              expect(d.options, `${where}: Lösung fehlt`).toContain(d.answer)
              for (const o of d.options) expect(BAD.test(o), `${where}: Option ${o}`).toBe(false)
            } else {
              expect(Number.isFinite(d.value), `${where}: Wert`).toBe(true)
              expect(form, `${where}: bei Blitz nur Auswahl`).toBe('any')
            }
          }
    })

    it(`${skill.id}: die richtige Antwort wird als richtig gewertet, eine falsche nicht`, () => {
      for (const level of LEVELS)
        for (const seed of SEEDS) {
          const r = makeRng(seed * 17 + level)
          const [ex] = generateMathSession({ skillIds: [skill.id], count: 1, from: level, to: level, rng: r })
          const where = `${skill.id} L${level} s${seed}`
          if (ex.kind === 'mchoice') {
            expect(evaluate(ex, ex.answer).status, where).toBe('correct')
            const wrong = ex.options.find((o) => o !== ex.answer) as string
            expect(evaluate(ex, wrong).status, where).toBe('wrong')
          } else if (ex.kind === 'calc') {
            // Antwort in der Darstellung des Lösungsfelds: Brüche als a/b
            const typed = ex.answer.replace(/\{(-?\d+|−\d+)\|(\d+)\}/g, '$1/$2').replace(/ /g, '')
            const ev = evaluate(ex, typed)
            expect(ev.status, `${where}: Eingabe ${typed} für Lösung ${ex.answer}`).toBe('correct')
            expect(evaluate(ex, String(ex.value + 1234.5)).status, where).toBe('wrong')
          } else if (ex.kind === 'mmatch') {
            expect(evaluate(ex, { matchMistakes: [] }).status, where).toBe('correct')
          }
        }
    })
  }
})

describe('Mathe: Sitzung', () => {
  const ids = Object.keys(SKILLS).slice(0, 4)
  it('liefert die gewünschte Anzahl, mit Aufwärmen davor', () => {
    const list = generateMathSession({ skillIds: ids.slice(0, 2), count: 10, warm: [ids[3]], rng: makeRng(5) })
    expect(list.filter((e) => !e.warm)).toHaveLength(10)
    expect(list.filter((e) => e.warm)).toHaveLength(1)
    expect(list[0].warm).toBe(true)
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length)
  })

  it('wiederholt keine Aufgabe doppelt und steigert die Schwierigkeit', () => {
    const list = generateMathSession({ skillIds: ids, count: 12, from: 1, to: 3, rng: makeRng(9) })
    const keys = list.map((e) => (e.kind === 'mmatch' ? e.pairs.map((p) => p.left).join() : e.kind === 'calc' || e.kind === 'mchoice' ? e.prompt : ''))
    expect(new Set(keys).size).toBeGreaterThan(10)
  })

  it('"again" erzeugt eine frische Aufgabe zum selben Thema', () => {
    const [ex] = generateMathSession({ skillIds: ['rz.add'], count: 1, rng: makeRng(3) })
    const again = ex.again?.()
    expect(again).toBeTruthy()
    expect(again?.itemId).toBe('rz.add')
    expect(again?.id).toBe(ex.id)
  })

  it('unbekannte Themen werden ignoriert', () => {
    expect(generateMathSession({ skillIds: ['gibts.nicht'], count: 5 })).toEqual([])
  })
})

// ---------- Nachgerechnet: Der Ergebnis-Wert passt zur Aufgabe ----------

const toJs = (t: string) =>
  t
    .replace(/\{([^|}]+)\|([^}]+)\}/g, '(($1)/($2))')
    .replace(/−/g, '-')
    .replace(/·/g, '*')
    .replace(/ : /g, '/')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d)([x(])/g, '$1*$2')
    .replace(/\)\(/g, ')*(')
    .replace(/\^/g, '**')
const evalJs = (code: string, x = 0): number => new Function('x', `return (${code})`)(x) as number
const mathPart = (prompt: string): string => /\$([^$]+)\$/.exec(prompt)?.[1] ?? ''
/** Zahl aus einer Antwort wie "−2", "x = 5", "{3|4}" */
const answerNumber = (a: string): number => evalJs(toJs(a.replace(/^x = /, '').replace(/ ?[%€°a-z²³]+$/i, '')))

describe('Mathe: Rechenaufgaben stimmen nach', () => {
  const plain = ['rz.add', 'rz.sub', 'rz.mul', 'rz.div', 'rz.punkt', 'br.add', 'br.mul', 'br.div']
  for (const id of plain) {
    it(`${id}: Ergebnis passt zum Term`, () => {
      for (const level of LEVELS)
        for (const seed of SEEDS) {
          const d = makeMathExercise(id, level, 'any', makeRng(seed * 13 + level))
          if (d.kind === 'mmatch') continue
          const expr = mathPart(d.prompt)
          if (!expr) continue
          const expected = evalJs(toJs(expr))
          const got = d.kind === 'calc' ? d.value : answerNumber(d.answer)
          expect(got, `${id} L${level} s${seed}: ${expr} = ${expected}, Lösung ${d.answer}`).toBeCloseTo(expected, 6)
        }
    })
  }

  for (const id of ['gl.einfach', 'gl.zwei']) {
    it(`${id}: Lösung erfüllt die Gleichung`, () => {
      for (const level of LEVELS)
        for (const seed of SEEDS) {
          const d = makeMathExercise(id, level, 'any', makeRng(seed * 7 + level))
          if (d.kind === 'mmatch') continue
          const eq = mathPart(d.prompt)
          if (!eq.includes('=')) continue
          const [l, r] = eq.split('=')
          const x = d.kind === 'calc' ? d.value : answerNumber(d.answer)
          expect(evalJs(toJs(l), x), `${id} L${level} s${seed}: ${eq}, x = ${x}`).toBeCloseTo(evalJs(toJs(r), x), 6)
        }
    })
  }
})
