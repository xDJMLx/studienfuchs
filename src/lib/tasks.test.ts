import { describe, expect, it } from 'vitest'
import { evaluate } from './evaluate'
import { generateCardSession } from './cardSession'
import type { CardRef, Deck } from './decks'
import { computeTask, itemFromTask, normalizeTask, normalizeTasks, shuffleNotSame, taskAnswerText, taskToExercise } from './tasks'
import type { Item, Mastery } from './types'

describe('KI-Aufgaben prüfen', () => {
  it('Quiz: Antwort als Zahl, Buchstabe oder Text; Buchstaben-Vorspann wird entfernt; Doppelte und zu wenige Antworten fliegen raus', () => {
    const base = { t: 'mc', q: 'Welches Organell macht Energie?', options: ['A) Zellkern', 'B) Mitochondrium', 'C) Vakuole'] }
    expect(normalizeTask({ ...base, answer: 1 })).toMatchObject({ t: 'mc', options: ['Zellkern', 'Mitochondrium', 'Vakuole'], answer: 1 })
    expect(normalizeTask({ ...base, answer: 'B' })).toMatchObject({ answer: 1 })
    expect(normalizeTask({ ...base, answer: 'Vakuole' })).toMatchObject({ answer: 2 })
    expect(normalizeTask({ ...base, answer: 7 })).toBeNull()
    expect(normalizeTask({ t: 'mc', q: 'x', options: ['a', 'A', 'b'], answer: 0 })).toBeNull()
    expect(normalizeTask({ t: 'mc', q: 'x', options: ['a', 'b'], answer: 0 })).toBeNull()
  })

  it('Richtig/Falsch, Lückentext (genau eine Lücke), Reihenfolge, Zuordnen, Kurzantwort', () => {
    expect(normalizeTask({ t: 'tf', q: 'Wale sind Fische.', answer: 'falsch', why: 'Säugetiere' })).toMatchObject({ t: 'tf', truth: false })
    expect(normalizeTask({ t: 'tf', q: 'x', answer: 'vielleicht' })).toBeNull()
    expect(normalizeTask({ t: 'cloze', text: 'Die ... ist die kleinste Einheit des Lebens.', answers: ['Zelle'] })).toMatchObject({ t: 'cloze', text: 'Die ___ ist die kleinste Einheit des Lebens.' })
    expect(normalizeTask({ t: 'cloze', text: 'Zwei ___ und ___', answers: ['a'] })).toBeNull()
    expect(normalizeTask({ t: 'order', q: 'Fotosynthese', steps: ['Licht', 'Wasser', 'Zucker'] })).toMatchObject({ t: 'order' })
    expect(normalizeTask({ t: 'order', q: 'x', steps: ['a', 'b'] })).toBeNull()
    expect(normalizeTask({ t: 'match', q: 'Ordne zu', pairs: [['H2O', 'Wasser'], ['NaCl', 'Salz'], ['CO2', 'Kohlenstoffdioxid']] })).toMatchObject({ t: 'match' })
    expect(normalizeTask({ t: 'match', pairs: [['a', 'x'], ['b', 'x'], ['c', 'y']] })).toBeNull()
    expect(normalizeTask({ t: 'short', q: 'Was ist Osmose?', sample: 'Diffusion von Wasser durch eine Membran', keys: ['Wasser', 'Membran'] })).toMatchObject({ t: 'short', keys: ['Wasser', 'Membran'] })
  })

  it('Rechenaufgaben: Die KI-Lösung zählt nicht, die App rechnet selbst', () => {
    // Die KI liefert sogar eine falsche "Lösung": sie wird ignoriert
    const t = normalizeTask({ t: 'calc', q: 'Berechne: 3/4 + 2/5 als Bruch', expr: '3/4 + 2/5', answer: '5/9', as: 'frac' })!
    expect(t.t).toBe('calc')
    const c = computeTask(t as Extract<typeof t, { t: 'calc' }>)!
    expect(c.text).toBe('23/20')
    expect(c.frac).toBe(true)
    expect(taskAnswerText(t)).toBe('23/20')
  })

  it('Rechnen: unendliche Dezimalzahlen nur mit Rundungshinweis, zu lange Dezimalzahlen und Unsinn werden verworfen', () => {
    expect(normalizeTask({ t: 'calc', q: 'Berechne 1/3', expr: '1/3' })).toBeNull()
    const r = normalizeTask({ t: 'calc', q: 'Berechne 1/3, auf zwei Nachkommastellen gerundet', expr: '1/3', digits: 2 })!
    expect(computeTask(r as Extract<typeof r, { t: 'calc' }>)).toMatchObject({ value: 0.33, text: '0,33', digits: 2 })
    expect(normalizeTask({ t: 'calc', q: 'x', expr: '1/0' })).toBeNull()
    expect(normalizeTask({ t: 'calc', q: 'x', expr: 'Hallo' })).toBeNull()
    expect(normalizeTask({ t: 'calc', q: 'Berechne', expr: '12,5 * 4' })).toMatchObject({ t: 'calc' })
  })

  it('Gleichungen: nur mit genau einer Lösung', () => {
    const t = normalizeTask({ t: 'solve', q: 'Löse nach x', equation: '3x - 4 = 11' })!
    expect(taskAnswerText(t)).toBe('x = 5')
    expect(normalizeTask({ t: 'solve', q: 'x', equation: 'x^2 = 4' })).toBeNull()
    expect(normalizeTask({ t: 'solve', q: 'x', equation: 'x + 1 = x + 2' })).toBeNull()
    expect(normalizeTask({ t: 'solve', q: 'x', equation: 'kein Gleichheitszeichen' })).toBeNull()
  })

  it('mehrere: doppelte Fragen entfallen, Unbrauchbares wird gezählt', () => {
    const { tasks, dropped } = normalizeTasks([
      { t: 'tf', q: 'Frage A', answer: true },
      { t: 'tf', q: 'frage a', answer: false },
      { t: 'zzz', q: 'x' },
      'Text',
      { t: 'tf', q: 'Frage B', answer: false },
    ])
    expect(tasks.map((t) => (t as { q: string }).q)).toEqual(['Frage A', 'Frage B'])
    expect(dropped).toBe(3)
  })
})

describe('Aufgabe → Übung', () => {
  const rng = () => 0.3
  const mk = (raw: unknown): Item => {
    const t = normalizeTask(raw)!
    return itemFromTask(t, 'i1')
  }

  it('Quiz wird zur Auswahl mit allen Antworten gemischt; Fehler zeigt die Erklärung', () => {
    const item = mk({ t: 'mc', q: 'Frage?', options: ['a', 'b', 'c', 'd'], answer: 2, why: 'Darum' })
    const ex = taskToExercise(item, item.task!, { rng })
    expect(ex).toMatchObject({ kind: 'mchoice', answer: 'c', solution: 'Darum' })
    if (ex.kind !== 'mchoice') throw new Error()
    expect([...ex.options].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(evaluate(ex, 'c').status).toBe('correct')
    expect(evaluate(ex, 'a').status).toBe('wrong')
  })

  it('Lückentext wird getippt, andere Schreibweisen aus der Liste gelten auch', () => {
    const item = mk({ t: 'cloze', text: 'Die ___ liefert Energie.', answers: ['Mitochondrie', 'Mitochondrien'] })
    const ex = taskToExercise(item, item.task!, { rng })
    expect(ex).toMatchObject({ kind: 'qtype', answer: 'Mitochondrie', accept: ['Mitochondrien'] })
    expect(evaluate(ex, 'mitochondrien').status).toBe('correct')
    expect(evaluate(ex, 'Zelle').status).toBe('wrong')
  })

  it('Reihenfolge: nur die richtige Folge zählt, gemischt wird nie in Lösungsreihenfolge', () => {
    const item = mk({ t: 'order', q: 'Ordne', steps: ['eins', 'zwei', 'drei', 'vier'] })
    const ex = taskToExercise(item, item.task!, { rng: () => 0 })
    if (ex.kind !== 'order') throw new Error()
    expect(ex.shuffled).not.toEqual(ex.steps)
    expect(evaluate(ex, ['eins', 'zwei', 'drei', 'vier']).status).toBe('correct')
    const bad = evaluate(ex, ['zwei', 'eins', 'drei', 'vier'])
    expect(bad.status).toBe('wrong')
    expect(bad.correctAnswer).toContain('1. eins')
    expect(shuffleNotSame([1, 2, 3], () => 0.99)).not.toEqual([1, 2, 3])
  })

  it('Zuordnen wird zu Paaren, Kurzantwort zur Karte mit Selbstbewertung', () => {
    const m = mk({ t: 'match', q: 'Ordne zu', pairs: [['a', '1'], ['b', '2'], ['c', '3']] })
    expect(taskToExercise(m, m.task!, { rng })).toMatchObject({ kind: 'mmatch', pairs: [{ left: 'a', right: '1' }, { left: 'b', right: '2' }, { left: 'c', right: '3' }] })
    const s = mk({ t: 'short', q: 'Was ist Osmose?', sample: 'Wasser wandert durch eine Membran', keys: ['Wasser', 'Membran'] })
    const ex = taskToExercise(s, s.task!, { rng })
    expect(ex).toMatchObject({ kind: 'qcard', front: 'Was ist Osmose?' })
    expect(ex.kind === 'qcard' && ex.back).toContain('Das gehört dazu: Wasser, Membran')
  })

  it('Rechnen: Zahl wird geprüft, Bruch muss gekürzt sein, Gleichung hat „x =“, Fehler zeigt den Rechenweg', () => {
    const c = mk({ t: 'calc', q: 'Wie viele Meter sind 45 km in 0,5 h?  Rechne 45 / 0,5', expr: '45/0,5', unit: 'km/h' })
    const ex = taskToExercise(c, c.task!, { rng })
    expect(ex).toMatchObject({ kind: 'calc', value: 90, unit: 'km/h', solution: '45/0,5' })
    expect(evaluate(ex, '90').status).toBe('correct')
    expect(evaluate(ex, '9').status).toBe('wrong')
    const f = mk({ t: 'calc', q: 'Rechne als Bruch', expr: '1/2 + 1/3', as: 'frac' })
    const fx = taskToExercise(f, f.task!, { rng })
    expect(evaluate(fx, '5/6').status).toBe('correct')
    expect(evaluate(fx, '10/12').status).toBe('almost')
    const e = mk({ t: 'solve', q: 'Löse', equation: '2x + 3 = 11' })
    const ex2 = taskToExercise(e, e.task!, { rng })
    expect(ex2).toMatchObject({ kind: 'calc', lead: 'x =', value: 4 })
    expect(evaluate(ex2, '4').status).toBe('correct')
  })

  it('im Karteikarten-Modus werden Aufgaben zu Frage und Antwort (außer Reihenfolge und Zuordnen)', () => {
    const q = mk({ t: 'mc', q: 'Frage?', options: ['a', 'b', 'c'], answer: 0 })
    expect(taskToExercise(q, q.task!, { flip: true })).toMatchObject({ kind: 'qcard', front: 'Frage?', back: 'a' })
    const o = mk({ t: 'order', q: 'Ordne', steps: ['x', 'y', 'z'] })
    expect(taskToExercise(o, o.task!, { flip: true }).kind).toBe('order')
  })
})

describe('Runde mit Karten und Aufgaben gemischt', () => {
  const deck: Deck = { id: 'd', title: 'Bio', subject: 'biologie', both: false, kind: 'own', items: [] }
  const card = (id: string, front: string, back: string): Item => ({ id, front, back })
  const task = (id: string, raw: unknown): Item => itemFromTask(normalizeTask(raw)!, id)
  const items: Item[] = [
    card('c1', 'Was ist ein Ribosom?', 'Baut Eiweiße'),
    card('c2', 'Was ist ein Mitochondrium?', 'Kraftwerk'),
    card('c3', 'Was ist eine Vakuole?', 'Speicher'),
    card('c4', 'Was ist ein Zellkern?', 'Steuerzentrale'),
    task('t1', { t: 'tf', q: 'Wale sind Fische.', answer: false }),
    task('t2', { t: 'calc', q: 'Rechne 12 * 3', expr: '12*3' }),
  ]
  const refs: CardRef[] = items.map((item) => ({ item, deck: { ...deck, items } }))

  it('neue Karten werden gezeigt, neue Aufgaben sofort gefragt; Aufgaben sind nie Falschantworten für Karten', () => {
    const out = generateCardSession({ refs, pool: refs, mastery: () => 0 as Mastery, rng: () => 0.5 })
    const kinds = out.map((e) => e.kind)
    expect(kinds.filter((k) => k === 'teach')).toHaveLength(2)
    expect(kinds).toContain('mchoice')
    expect(kinds).toContain('calc')
    // Falschantworten der Kartenfragen enthalten nichts aus den Aufgaben
    for (const e of out) if (e.kind === 'qchoice') expect(e.options.some((o) => ['Richtig', 'Falsch', '36'].includes(o))).toBe(false)
    // Jede Aufgabe kommt genau einmal vor
    expect(out.filter((e) => e.itemId === 't1' && e.kind !== 'teach')).toHaveLength(1)
  })

  it('Karteikarten-Modus: alles zum Umdrehen', () => {
    const out = generateCardSession({ refs, pool: refs, mastery: () => 0 as Mastery, flipOnly: true, rng: () => 0.5 })
    expect(out.every((e) => e.kind === 'qcard' || e.kind === 'teach')).toBe(true)
  })
})
