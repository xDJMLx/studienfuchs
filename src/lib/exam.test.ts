import { describe, expect, it } from 'vitest'
import { approxGrade, buildExamPrompt, buildVocabTest, normalizeExam, parseExamReply, parseWritingFeedback, scorePart, spokenText } from './exam'

const meta = { type: 'arbeit' as const, source: 'À plus! 2, Seite 50–62' }

const raw = {
  title: 'Klassenarbeit Unité 2',
  minutes: 45,
  parts: [
    { kind: 'listening', title: 'Hörverstehen', transcript: 'Salut Léa !\nSalut Max, ça va ?', questions: [{ q: 'Wer begrüßt wen?', options: ['Max Léa', 'Léa Max', 'Niemand'], answer: 1 }, { q: 'kaputt', options: ['nur eine'], answer: 3 }] },
    { kind: 'vocab', title: 'Wortschatz', items: [{ de: 'das Haus', fr: 'la maison' }, { de: '', fr: 'x' }] },
    { kind: 'cloze', title: 'Grammatik', sentences: [{ text: 'Je ___ à Paris.', answer: 'vais' }, { text: 'ohne Lücke', answer: 'x' }] },
    { kind: 'writing', title: 'Schreiben', task: 'Schreibe eine E-Mail.', minWords: 5, points: ['Begrüßung'], sample: 'Salut !' },
    { kind: 'unbekannt' },
  ],
}

describe('Arbeit aus KI-Antwort', () => {
  it('übernimmt brauchbare Teile und verwirft kaputte Einträge', () => {
    const e = normalizeExam(raw, meta)!
    expect(e.parts.map((p) => p.kind)).toEqual(['listening', 'vocab', 'cloze', 'writing'])
    const listening = e.parts[0]
    if (listening.kind !== 'listening') throw new Error()
    expect(listening.questions).toHaveLength(1)
    expect(e.parts[1].kind === 'vocab' && e.parts[1].items).toHaveLength(1)
    expect(e.parts[2].kind === 'cloze' && e.parts[2].sentences).toHaveLength(1)
    expect(e.minutes).toBe(45)
    expect(e.source).toBe(meta.source)
  })

  it('liest die Antwort auch mit Text und Codezaun drumherum', () => {
    const reply = 'Hier ist deine Arbeit:\n```json\n' + JSON.stringify(raw) + '\n```\nViel Erfolg!'
    expect(parseExamReply(reply, meta)?.parts.length).toBe(4)
    expect(parseExamReply('Ich kann das nicht.', meta)).toBeNull()
    expect(parseExamReply('{"parts":[]}', meta)).toBeNull()
  })
})

describe('Antwortoptionen', () => {
  it('entfernt Buchstaben-Vorspann, wenn alle Antworten damit beginnen', () => {
    const e = normalizeExam({ parts: [{ kind: 'reading', text: 'Texte', questions: [{ q: 'Wer?', options: ['A Lucie', 'B Thomas', 'C Berlin'], answer: 0 }, { q: 'Wo?', options: ['A table', 'la maison'], answer: 1 }] }] }, meta)!
    const p = e.parts[0]
    if (p.kind !== 'reading') throw new Error()
    expect(p.questions[0].options).toEqual(['Lucie', 'Thomas', 'Berlin'])
    expect(p.questions[1].options).toEqual(['A table', 'la maison'])
  })
})

describe('Kurztest ohne KI', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, front: `mot${i}`, back: `Wort${i}` }))
  it('legt das Deutsche links und fragt das Französische ab', () => {
    const e = buildVocabTest(items, { title: 'Test', source: 'Kurs', count: 10 })!
    const p = e.parts[0]
    if (p.kind !== 'vocab') throw new Error()
    expect(p.items).toHaveLength(10)
    expect(p.items[0].de.startsWith('Wort')).toBe(true)
    expect(p.items[0].fr.startsWith('mot')).toBe(true)
    expect(e.type).toBe('kurztest')
  })
  it('gibt null ohne Wörter', () => {
    expect(buildVocabTest([], { title: 'x', source: 'y', count: 5 })).toBeNull()
  })
})

describe('Auswertung', () => {
  const e = normalizeExam(raw, meta)!
  it('zählt Multiple Choice und nennt Fehler mit Lösung', () => {
    const ok = scorePart(e.parts[0], [1])
    expect(ok).toMatchObject({ points: 1, max: 1 })
    const bad = scorePart(e.parts[0], [0])
    expect(bad.points).toBe(0)
    expect(bad.misses[0]).toMatchObject({ yours: 'Max Léa', correct: 'Léa Max' })
  })
  it('gibt für fehlende Akzente und kleine Tippfehler halbe Punkte', () => {
    const accent = { kind: 'vocab' as const, title: 't', items: [{ de: 'die Schule', fr: 'l’école' }, { de: 'das Haus', fr: 'la maison' }] }
    const s = scorePart(accent, ['l’ecole', 'la maison'])
    expect(s.points).toBe(1.5)
    expect(s.max).toBe(2)
    expect(s.misses).toHaveLength(1)
  })
  it('Note nach dem üblichen Schlüssel', () => {
    expect(approxGrade(95).note).toBe(1)
    expect(approxGrade(70).note).toBe(3)
    expect(approxGrade(50).note).toBe(4)
    expect(approxGrade(10).note).toBe(6)
  })
  it('liest die Bewertung eines Textes', () => {
    expect(parseWritingFeedback('{"points":7,"max":10,"feedback":"Gut, aber Akzente."}')).toEqual({ points: 7, max: 10, feedback: 'Gut, aber Akzente.' })
    expect(parseWritingFeedback('kein json')).toBeNull()
  })
})

describe('Anweisung an die KI', () => {
  it('nennt Niveau, Stoff und die vier Teile der Arbeit', () => {
    const p = buildExamPrompt({ type: 'arbeit', grade: 8, topic: 'Unité 2', size: 45, bookText: 'la cantine' })
    expect(p).toContain('Klasse 8')
    expect(p).toContain('Unité 2')
    expect(p).toContain('listening')
    expect(p).toContain('writing')
    expect(p).toContain('la cantine')
  })
  it('Kurztest verlangt genau die Anzahl Vokabeln', () => {
    expect(buildExamPrompt({ type: 'kurztest', grade: 7, topic: 'Familie', size: 12 })).toContain('genau 12 Einträgen')
  })
})

describe('Vorlesen und Obergrenzen', () => {
  it('entfernt Sprecherangaben', () => {
    expect(spokenText('Sprecher 1: Salut !\nSprecher 2 : Ça va ?\nLéa: Oui, très bien.')).toBe('Salut !\nÇa va ?\nOui, très bien.')
    expect(spokenText('Je suis à Paris.')).toBe('Je suis à Paris.')
  })
  it('begrenzt zu lange Teile', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ de: 'd' + i, fr: 'f' + i }))
    const e = normalizeExam({ parts: [{ kind: 'vocab', items }] }, meta)!
    expect(e.parts[0].kind === 'vocab' && e.parts[0].items.length).toBe(12)
    const k = normalizeExam({ parts: [{ kind: 'vocab', items }] }, { type: 'kurztest', source: 's' })!
    expect(k.parts[0].kind === 'vocab' && k.parts[0].items.length).toBe(30)
  })
})
