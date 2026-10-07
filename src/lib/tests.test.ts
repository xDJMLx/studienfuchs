import { describe, expect, it, vi } from 'vitest'
import { buildTestPrompt, materialFrom, sizeOf } from './aiTests'
import type { CardRef, Deck } from './decks'
import { buildOfflineTest, gradeOf, normalizeTest, scoreAnswer, suggestSelfGrade, taskCount, testExercise, totalPoints } from './tests'
import type { Item } from './types'

const meta = { id: 't1', subject: 'biologie', kind: 'test' as const, source: 'Thema: Zelle', now: new Date('2026-10-05T10:00:00Z') }

describe('Test aus der KI-Antwort', () => {
  const raw = {
    title: 'Zelle',
    minutes: 25,
    sections: [
      {
        title: 'Teil A',
        tasks: [
          { t: 'mc', q: 'Was macht Energie?', options: ['Zellkern', 'Mitochondrium', 'Vakuole'], answer: 1, points: 1 },
          { t: 'tf', q: 'Wale sind Fische.', answer: false, points: 1 },
          { t: 'tf', q: 'Wale sind Fische.', answer: false },
          { t: 'unbekannt', q: 'x' },
        ],
      },
      { title: '', tasks: [{ t: 'calc', q: 'Rechne 6 * 7', expr: '6*7', points: 99 }, { t: 'short', q: 'Was ist Osmose?', sample: 'Wasser wandert durch eine Membran', keys: ['Wasser'] }] },
      { title: 'Leer', tasks: [] },
    ],
  }

  it('übernimmt gültige Aufgaben, wirft doppelte und unbrauchbare raus, begrenzt Punkte, benennt leere Titel', () => {
    const res = normalizeTest(raw, meta)!
    expect(res.dropped).toBe(2)
    expect(res.test.sections.map((s) => s.title)).toEqual(['Teil A', 'Teil 2'])
    expect(taskCount(res.test)).toBe(4)
    // 99 Punkte werden auf höchstens 8 begrenzt; fehlende Punkte nach Art (short = 3)
    expect(res.test.sections[1].tasks.map((t) => t.points)).toEqual([8, 3])
    expect(totalPoints(res.test)).toBe(1 + 1 + 8 + 3)
    expect(res.test).toMatchObject({ id: 't1', title: 'Zelle', minutes: 25, subject: 'biologie', source: 'Thema: Zelle' })
    expect(res.test.sections[0].tasks[0].id).toBe('t1:1')
  })

  it('flache Aufgabenliste geht auch; zu wenig Brauchbares ergibt keinen Test; Minuten haben Grenzen', () => {
    const flat = normalizeTest({ tasks: [{ t: 'tf', q: 'A', answer: true }, { t: 'tf', q: 'B', answer: true }, { t: 'tf', q: 'C', answer: false }], minutes: 999 }, meta)!
    expect(flat.test.sections).toHaveLength(1)
    expect(flat.test.minutes).toBe(20)
    expect(normalizeTest({ tasks: [{ t: 'tf', q: 'A', answer: true }] }, meta)).toBeNull()
    expect(normalizeTest('Quatsch', meta)).toBeNull()
  })

  it('Rechnungen mit unlösbarem Term fliegen raus', () => {
    const res = normalizeTest({ tasks: [{ t: 'calc', q: 'x', expr: '1/0' }, { t: 'tf', q: 'A', answer: true }, { t: 'tf', q: 'B', answer: true }, { t: 'tf', q: 'C', answer: true }] }, meta)!
    expect(res.dropped).toBe(1)
    expect(taskCount(res.test)).toBe(3)
  })
})

describe('Test ohne KI aus Karteikarten', () => {
  const mkDeck = (over: Partial<Deck>): Deck => ({ id: 'd', title: 'Deck', subject: 'biologie', both: false, kind: 'own', items: [], ...over })
  const refsOf = (deck: Deck, items: Item[]): CardRef[] => items.map((item) => ({ item, deck: { ...deck, items } }))

  it('Vokabeltest: Wörter tippen, mehrere richtige Schreibweisen mit / oder ;', () => {
    const items: Item[] = [
      { id: '1', front: 'le chat', back: 'die Katze' },
      { id: '2', front: 'la maison', back: 'das Haus / das Heim' },
      { id: '3', front: 'bonjour', back: 'guten Tag' },
      { id: '4', front: "l'eau", back: 'das Wasser' },
    ]
    const t = buildOfflineTest({ refs: refsOf(mkDeck({ subject: 'franzoesisch', lang: 'fr', both: true }), items), kind: 'vokabeltest', subject: 'franzoesisch', count: 10, direction: 'toForeign', title: 'Test', id: 'v1', rng: () => 0.3 })!
    const tasks = t.sections[0].tasks.map((x) => x.task)
    expect(tasks.every((x) => x.t === 'type' && x.lang === 'fr')).toBe(true)
    expect(tasks.map((x) => (x.t === 'type' ? x.q : '')).sort()).toEqual(['die Katze', 'das Haus / das Heim', 'guten Tag', 'das Wasser'].sort())
    // Fremdwort ist die Lösung
    const heim = tasks.find((x) => x.t === 'type' && x.q.startsWith('das Haus'))!
    expect(heim).toMatchObject({ answer: 'la maison' })
    // Rückwärts: Alternativen auf der deutschen Seite werden zu "accept"
    const back = buildOfflineTest({ refs: refsOf(mkDeck({ lang: 'fr' }), items), kind: 'vokabeltest', subject: 'franzoesisch', count: 10, direction: 'toGerman', title: 'T', id: 'v2' })!
    expect(back.sections[0].tasks.map((x) => x.task).find((x) => x.t === 'type' && x.q === 'la maison')).toMatchObject({ answer: 'das Haus', accept: ['das Heim'] })
    expect(t.minutes).toBeGreaterThanOrEqual(5)
  })

  it('Test aus Wissens-Karten: Auswahl, Tippen und Kurzantwort; bestehende Aufgaben bleiben', () => {
    const items: Item[] = [
      { id: '1', front: 'Ribosom?', back: 'baut Eiweiße' },
      { id: '2', front: 'Mitochondrium?', back: 'Kraftwerk' },
      { id: '3', front: 'Vakuole?', back: 'Speicher' },
      { id: '4', front: 'Zellkern?', back: 'Steuerzentrale' },
      { id: '5', front: 'Was ist Osmose?', back: 'Wasser wandert durch eine halbdurchlässige Membran in die Lösung mit mehr gelösten Stoffen' },
      { id: '6', front: 'Rechne 12*3', back: '36', task: { t: 'calc', q: 'Rechne 12*3', expr: '12*3' } },
    ]
    const refs = refsOf(mkDeck({}), items)
    const t = buildOfflineTest({ refs, kind: 'test', subject: 'biologie', count: 6, title: 'Zelle', id: 'o1', rng: () => 0.2 })!
    const kinds = t.sections[0].tasks.map((x) => x.task.t)
    expect(kinds).toContain('short')
    expect(kinds).toContain('calc')
    expect(kinds.every((k) => ['mc', 'type', 'short', 'calc'].includes(k))).toBe(true)
    // Bei Auswahlfragen zeigt answer wirklich auf die richtige Antwort
    for (const x of t.sections[0].tasks) {
      if (x.task.t !== 'mc') continue
      const src = items.find((i) => i.front === (x.task as { q: string }).q)!
      expect(x.task.options[x.task.answer]).toBe(src.back)
    }
    expect(t.source).toMatch(/Karteikarten/)
    expect(buildOfflineTest({ refs: refs.slice(0, 2), kind: 'test', subject: 'biologie', count: 10, title: 'x', id: 'o2' })).toBeNull()
  })
})

describe('Punkte und Note', () => {
  const mk = (task: Parameters<typeof testExercise>[0]['task'], points: number) => ({ id: 'a', task, points })
  it('richtig = alle Punkte, fast richtig = halbe, falsch oder leer = 0', () => {
    const calc = mk({ t: 'calc', q: 'Bruch', expr: '1/2+1/3', as: 'frac' }, 2)
    const ex = testExercise(calc)
    expect(scoreAnswer(calc, ex, '5/6')).toBe(2)
    expect(scoreAnswer(calc, ex, '10/12')).toBe(1)
    expect(scoreAnswer(calc, ex, '1/2')).toBe(0)
    expect(scoreAnswer(calc, ex, null)).toBe(0)
    expect(scoreAnswer(calc, ex, '')).toBe(0)
  })

  it('Zuordnen: jeder Fehler kostet anteilig', () => {
    const t = mk({ t: 'match', q: 'zu', pairs: [{ l: 'a', r: '1' }, { l: 'b', r: '2' }, { l: 'c', r: '3' }, { l: 'd', r: '4' }] }, 4)
    const ex = testExercise(t)
    expect(scoreAnswer(t, ex, { matchMistakes: [] })).toBe(4)
    expect(scoreAnswer(t, ex, { matchMistakes: ['a'] })).toBe(3)
    expect(scoreAnswer(t, ex, { matchMistakes: ['a', 'b', 'c', 'd', 'a'] })).toBe(0)
  })

  it('Kurzantwort zählt die Selbstbewertung; Vorschlag aus den Stichwörtern', () => {
    const task = { t: 'short' as const, q: 'Was ist Osmose?', sample: 'x', keys: ['Wasser', 'Membran'] }
    const t = mk(task, 3)
    const ex = testExercise(t)
    expect(scoreAnswer(t, ex, 'egal', 'good')).toBe(3)
    expect(scoreAnswer(t, ex, 'egal', 'hard')).toBe(1.5)
    expect(scoreAnswer(t, ex, 'egal', 'again')).toBe(0)
    expect(suggestSelfGrade(task, 'Wasser wandert durch die Membran')).toBe('good')
    expect(suggestSelfGrade(task, 'durch Wasser')).toBe('hard')
    expect(suggestSelfGrade(task, 'keine Ahnung')).toBe('again')
    expect(suggestSelfGrade(task, '  ')).toBe('again')
    expect(suggestSelfGrade({ ...task, keys: undefined }, 'irgendwas')).toBe('hard')
  })

  it('im Test gibt es keinen Tipp', () => {
    const ex = testExercise(mk({ t: 'calc', q: 'Rechne', expr: '2+2', hint: 'Zähle' }, 1))
    expect(ex.kind === 'calc' && ex.hint).toBeUndefined()
  })

  it('Note aus Prozent', () => {
    expect(gradeOf(23, 25)).toEqual({ percent: 92, note: 1 })
    expect(gradeOf(10, 20)).toEqual({ percent: 50, note: 4 })
    expect(gradeOf(2, 20)).toEqual({ percent: 10, note: 6 })
    expect(gradeOf(0, 0)).toEqual({ percent: 0, note: 6 })
  })
})

describe('Anweisung an die KI für Tests', () => {
  it('Klassenarbeit hat drei Teile, in Mathe gilt: die App rechnet', () => {
    const p = buildTestPrompt({ subjectId: 'mathe', kind: 'arbeit', length: 'normal', material: materialFrom([{ front: 'Bruch kürzen', back: 'Zähler und Nenner teilen' }]) })
    expect(p).toContain('Klassenarbeit')
    expect(p).toContain('Teil A')
    expect(p).toContain('Du rechnest NICHT selbst')
    expect(p).toContain('- Bruch kürzen – Zähler und Nenner teilen')
    const bio = buildTestPrompt({ subjectId: 'biologie', kind: 'test', length: 'kurz' })
    expect(bio).not.toContain('Du rechnest NICHT selbst')
    expect(bio).toContain('nie mit dem Ergebnis')
  })

  it('Größen nach Art und Länge', () => {
    expect(sizeOf('test', 'normal')).toEqual({ tasks: 9, minutes: 20, sections: 1 })
    expect(sizeOf('arbeit', 'lang').tasks).toBeGreaterThan(sizeOf('arbeit', 'normal').tasks)
    expect(sizeOf('test', 'kurz').tasks).toBeGreaterThanOrEqual(6)
    expect(materialFrom(Array.from({ length: 200 }, (_, i) => ({ front: `f${i}`, back: 'b' })), 5).split('\n')).toHaveLength(5)
  })
})

describe('Bessere KI-Arbeiten', () => {
  const meta2 = { id: 'q', subject: 'deutsch', kind: 'arbeit' as const, source: 'x' }
  it('Texte stehen im Teil, Aufgaben mit Bezug auf einen fehlenden Text oder ein Bild fliegen raus, Anforderungsbereiche werden gelesen', () => {
    const res = normalizeTest(
      {
        sections: [
          { title: 'Teil A', intro: 'Lena geht jeden Tag mit ihrem Hund Max in den Park.\n\n\n\nDort trifft sie Paul.', tasks: [{ t: 'mc', q: 'Wie heißt der Hund im Text?', options: ['Max', 'Paul', 'Lena'], answer: 0, afb: 1 }, { t: 'tf', q: 'Paul ist Lenas Bruder.', answer: false, afb: 2 }] },
          { title: 'Teil B', tasks: [{ t: 'mc', q: 'Was zeigt die Abbildung?', options: ['a', 'b', 'c'], answer: 1 }, { t: 'tf', q: 'Ein Satz hat immer ein Verb.', answer: true, afb: 7 }, { t: 'tf', q: 'Nomen schreibt man groß.', answer: true, afb: 1 }] },
        ],
      },
      meta2,
    )!
    expect(res.dropped).toBe(1)
    expect(res.test.sections[0].intro).toBe('Lena geht jeden Tag mit ihrem Hund Max in den Park.\n\nDort trifft sie Paul.')
    expect(res.test.sections[0].tasks.map((t) => t.afb)).toEqual([1, 2])
    expect(res.test.sections[1].intro).toBeUndefined()
    // Unbekannter Anforderungsbereich wird ignoriert
    expect(res.test.sections[1].tasks[0].afb).toBeUndefined()
  })

  it('Anweisung enthält Klassenstufe, Schwierigkeit und den Aufbau des Fachs', async () => {
    const { buildTestPrompt } = await import('./aiTests')
    const p = buildTestPrompt({ subjectId: 'englisch', kind: 'arbeit', length: 'normal', grade: 8, difficulty: 'schwer' })
    expect(p).toContain('Klassenstufe 8')
    expect(p).toContain('Reading')
    expect(p).toContain('Anspruchsvoll')
    expect(p).toContain('"intro"')
    expect(buildTestPrompt({ subjectId: 'geschichte', kind: 'arbeit', length: 'normal' })).toContain('Quellentext')
    expect(buildTestPrompt({ subjectId: 'mathe', kind: 'test', length: 'normal', grade: 99 })).not.toContain('Klassenstufe 99')
  })

  it('Ist die erste KI-Antwort zu dünn, fragt die App einmal nach und nimmt die bessere; ist sie gut, bleibt es bei einem Aufruf', async () => {
    const { generateTest, goodEnough: goodEnough0 } = await import('./aiTests')
    const mk = (n: number) =>
      JSON.stringify({
        sections: [{ title: 'A', tasks: Array.from({ length: n }, (_, i) => (i % 3 === 0 ? { t: 'tf', q: `Aussage ${i}`, answer: true } : i % 3 === 1 ? { t: 'mc', q: `Frage ${i}`, options: ['a', 'b', 'c'], answer: 1 } : { t: 'cloze', text: `Satz ${i} mit ___`, answers: ['x'] })) }],
      })
    const req = { subjectId: 'biologie', kind: 'test' as const, length: 'normal' as const, topic: 'Zelle', source: 's', id: 'g1' }
    const thin = vi.fn().mockResolvedValueOnce(mk(3)).mockResolvedValueOnce(mk(9))
    const out = await generateTest(req, thin)
    expect(thin).toHaveBeenCalledTimes(2)
    expect(out.retried).toBe(true)
    expect(taskCount(out.test)).toBe(9)
    // Zweiter Aufruf nennt das Problem
    expect(thin.mock.calls[1][1]).toContain('nur 3 von 9')

    const good = vi.fn().mockResolvedValue(mk(9))
    const out2 = await generateTest(req, good)
    expect(good).toHaveBeenCalledTimes(1)
    expect(out2.retried).toBe(false)
    expect(goodEnough0(out2.test, 9)).toBe(true)

    // Kaputtes JSON beim ersten Mal, brauchbar beim zweiten
    const broken = vi.fn().mockResolvedValueOnce('Hier ist deine Arbeit: leider kein JSON').mockResolvedValueOnce(mk(8))
    expect((await generateTest(req, broken)).test.sections[0].tasks).toHaveLength(8)
    // Zweimal Unsinn → verständlicher Fehler
    const bad = vi.fn().mockResolvedValue('nichts')
    await expect(generateTest(req, bad)).rejects.toThrow(/keinen brauchbaren Test/)
  })
})
