import { checkAnswer } from './answerCheck'
import { extractJson } from './ai'
import type { Item } from './types'

/**
 * Tests und Klassenarbeiten: von der KI erstellt (oder für den Kurztest direkt aus Kurs und Listen).
 * Eine Arbeit besteht aus Teilen: Hören, Lesen, Wortschatz, Lückentext, Schreiben.
 */
export interface Mcq {
  q: string
  options: string[]
  /** Index der richtigen Antwort */
  answer: number
}

export type ExamPart =
  | { kind: 'listening'; title: string; /** französischer Text, wird vorgelesen */ transcript: string; questions: Mcq[] }
  | { kind: 'reading'; title: string; text: string; questions: Mcq[] }
  | { kind: 'vocab'; title: string; items: { de: string; fr: string }[] }
  | { kind: 'cloze'; title: string; sentences: { text: string; answer: string; translation?: string }[] }
  | { kind: 'writing'; title: string; task: string; minWords: number; points: string[]; sample: string }

export interface ExamData {
  id: string
  type: 'kurztest' | 'arbeit'
  title: string
  /** Woraus der Test entstanden ist (z. B. "À plus! 2, Seite 50–62") */
  source: string
  minutes: number
  createdAt: string
  parts: ExamPart[]
}

/** Antworten pro Teil: MC = Index, sonst Text */
export type PartAnswers = (number | string | null)[]

export interface PartScore {
  points: number
  max: number
  /** falsch beantwortete Aufgaben mit richtiger Lösung (für die Auswertung) */
  misses: { question: string; yours: string; correct: string }[]
}

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function normalizeMcq(raw: unknown): Mcq | null {
  const r = raw as { q?: unknown; question?: unknown; options?: unknown; answer?: unknown; correct?: unknown }
  const q = clean(r?.q ?? r?.question)
  let options = list(r?.options).map(clean).filter(Boolean)
  // Buchstaben-Vorspann ("A Lucie", "B) Thomas") entfernen, wenn alle Antworten so beginnen
  if (options.length >= 2 && options.every((o, i) => new RegExp(`^${String.fromCharCode(65 + i)}[).:]?\\s+`).test(o))) options = options.map((o) => o.replace(/^[A-Z][).:]?\s+/, ''))
  const a = Number(r?.answer ?? r?.correct)
  if (!q || options.length < 2 || !Number.isInteger(a) || a < 0 || a >= options.length) return null
  return { q, options, answer: a }
}

/** Prüft und bereinigt die KI-Antwort. Unbrauchbare Teile entfallen; ohne einen einzigen brauchbaren Teil gibt es null. */
export function normalizeExam(raw: unknown, meta: { type: ExamData['type']; source: string; id?: string }): ExamData | null {
  const r = raw as { title?: unknown; minutes?: unknown; parts?: unknown; sections?: unknown }
  const parts: ExamPart[] = []
  for (const p of list(r?.parts ?? r?.sections)) {
    const x = p as Record<string, unknown>
    const kind = clean(x?.kind ?? x?.type)
    const title = clean(x?.title)
    if (kind === 'listening' || kind === 'reading') {
      const text = clean(kind === 'listening' ? (x.transcript ?? x.text) : (x.text ?? x.transcript))
      const questions = list(x.questions).map(normalizeMcq).filter((q): q is Mcq => !!q).slice(0, 8)
      if (!text || !questions.length) continue
      parts.push(kind === 'listening' ? { kind, title: title || 'Hörverstehen', transcript: text, questions } : { kind, title: title || 'Leseverstehen', text, questions })
    } else if (kind === 'vocab') {
      const items = list(x.items)
        .map((i) => ({ de: clean((i as { de?: unknown }).de), fr: clean((i as { fr?: unknown }).fr) }))
        .filter((i) => i.de && i.fr)
      // Eine Arbeit hat einen kurzen Wortschatzteil; beim Kurztest zählt die gewünschte Länge
      if (items.length) parts.push({ kind, title: title || 'Wortschatz', items: items.slice(0, meta.type === 'arbeit' ? 12 : 30) })
    } else if (kind === 'cloze') {
      const sentences = list(x.sentences)
        .map((s) => ({ text: clean((s as { text?: unknown }).text), answer: clean((s as { answer?: unknown }).answer), translation: clean((s as { translation?: unknown }).translation) || undefined }))
        .filter((s) => s.text.includes('___') && s.answer)
      if (sentences.length) parts.push({ kind, title: title || 'Lückentext', sentences: sentences.slice(0, 8) })
    } else if (kind === 'writing') {
      const task = clean(x.task)
      if (!task) continue
      const minWords = Math.min(200, Math.max(10, Number(x.minWords) || 40))
      parts.push({ kind, title: title || 'Schreiben', task, minWords, points: list(x.points).map(clean).filter(Boolean).slice(0, 8), sample: clean(x.sample) })
    }
  }
  if (!parts.length) return null
  return {
    id: meta.id ?? `exam-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    type: meta.type,
    title: clean(r?.title) || (meta.type === 'arbeit' ? 'Klassenarbeit' : 'Kurztest'),
    source: meta.source,
    minutes: Math.min(120, Math.max(5, Number(r?.minutes) || (meta.type === 'arbeit' ? 45 : 10))),
    createdAt: new Date().toISOString(),
    parts,
  }
}

/** KI-Text → fertige Arbeit (oder null, wenn nichts Brauchbares drinsteht). */
export function parseExamReply(reply: string, meta: { type: ExamData['type']; source: string }): ExamData | null {
  try {
    return normalizeExam(extractJson(reply), meta)
  } catch {
    return null
  }
}

/** Kurztest ohne KI: deutsches Wort links, Französisch rechts hinschreiben. */
export function buildVocabTest(items: Item[], opts: { title: string; source: string; count: number; rng?: () => number }): ExamData | null {
  const rng = opts.rng ?? Math.random
  const pool = items.filter((i) => i.front.trim() && i.back.trim())
  if (!pool.length) return null
  const picked = [...pool].sort(() => rng() - 0.5).slice(0, opts.count)
  return {
    id: `exam-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    type: 'kurztest',
    title: opts.title,
    source: opts.source,
    minutes: Math.max(3, Math.round(picked.length * 0.6)),
    createdAt: new Date().toISOString(),
    parts: [{ kind: 'vocab', title: 'Schreibe das Französische', items: picked.map((i) => ({ de: i.back, fr: i.front })) }],
  }
}

/** Punkte für einen Teil. MC und Lückensätze: 1 Punkt; Wortschatz: 1 Punkt, "fast richtig" (Akzent, Tippfehler) die Hälfte; Schreiben zählt hier nicht. */
export function scorePart(part: ExamPart, answers: PartAnswers): PartScore {
  const misses: PartScore['misses'] = []
  let points = 0
  let max = 0
  if (part.kind === 'listening' || part.kind === 'reading') {
    part.questions.forEach((q, i) => {
      max += 1
      const a = answers[i]
      if (a === q.answer) points += 1
      else misses.push({ question: q.q, yours: typeof a === 'number' ? (q.options[a] ?? '') : '', correct: q.options[q.answer] })
    })
  } else if (part.kind === 'vocab') {
    part.items.forEach((it, i) => {
      max += 1
      const a = typeof answers[i] === 'string' ? (answers[i] as string) : ''
      const r = checkAnswer(a, it.fr)
      if (r.status === 'correct') points += 1
      else {
        if (r.status === 'almost') points += 0.5
        misses.push({ question: it.de, yours: a, correct: it.fr })
      }
    })
  } else if (part.kind === 'cloze') {
    part.sentences.forEach((s, i) => {
      max += 1
      const a = typeof answers[i] === 'string' ? (answers[i] as string) : ''
      const r = checkAnswer(a, s.answer)
      if (r.status === 'correct') points += 1
      else {
        if (r.status === 'almost') points += 0.5
        misses.push({ question: s.text, yours: a, correct: s.answer })
      }
    })
  }
  return { points, max, misses }
}

/** Ungefähre Note (1 bis 6) aus dem Anteil der Punkte, nach dem üblichen Berliner Schlüssel. Nur zur Orientierung: Jede Lehrkraft setzt die Grenzen selbst. */
export function approxGrade(percent: number): { note: number; label: string } {
  const note = percent >= 92 ? 1 : percent >= 81 ? 2 : percent >= 67 ? 3 : percent >= 50 ? 4 : percent >= 30 ? 5 : 6
  const label = ['', 'sehr gut', 'gut', 'befriedigend', 'ausreichend', 'mangelhaft', 'ungenügend'][note]
  return { note, label }
}

export interface WritingFeedback {
  points: number
  max: number
  feedback: string
}

/** Antwort der KI zur Bewertung eines Textes. */
export function parseWritingFeedback(reply: string): WritingFeedback | null {
  try {
    const r = extractJson(reply) as { points?: unknown; max?: unknown; feedback?: unknown }
    const max = Math.max(1, Number(r.max) || 10)
    const points = Math.min(max, Math.max(0, Number(r.points)))
    const feedback = clean(r.feedback)
    if (!Number.isFinite(points) || !feedback) return null
    return { points, max, feedback }
  } catch {
    return null
  }
}

const LEVEL: Record<number, string> = { 7: 'A1 (Anfänger, erstes Lernjahr)', 8: 'A1 bis A2 (zweites Lernjahr)', 9: 'A2 (drittes Lernjahr)', 10: 'A2 bis B1 (viertes Lernjahr)' }

export interface ExamRequest {
  type: ExamData['type']
  grade: number
  /** Stoff in Worten (z. B. Kapitel, Thema) */
  topic: string
  /** Wörter, die vorkommen sollen (aus Kurs oder Liste) */
  words?: string[]
  /** Textauszüge aus dem Buch des Schülers */
  bookText?: string
  /** Länge: Anzahl Vokabeln beim Kurztest, Minuten bei der Arbeit */
  size: number
}

/** Anweisung an die KI: liefert genau ein JSON-Objekt im Format von ExamData. */
export function buildExamPrompt(req: ExamRequest): string {
  const level = LEVEL[req.grade] ?? 'A1'
  const common = [
    `Du bist Französischlehrer an einer Berliner Schule und erstellst ${req.type === 'arbeit' ? 'eine Klassenarbeit' : 'einen Kurztest'} für Klasse ${req.grade} (Niveau ${level}).`,
    'Antworte NUR mit einem gültigen JSON-Objekt, ohne Text davor oder danach und ohne Codezaun. Anweisungen an die Schüler stehen auf Deutsch, der französische Inhalt auf Französisch.',
    'Verwende nur Wortschatz und Grammatik, die zum Niveau passen. Schreibe Akzente und Sonderzeichen genau. Erfinde keine Inhalte, die nicht zum genannten Stoff passen.',
  ]
  const material = [`Stoff: ${req.topic}`, req.words?.length ? `Wörter, die vorkommen sollen: ${req.words.slice(0, 80).join('; ')}` : '', req.bookText ? `Auszug aus dem Buch des Schülers (per Texterkennung, kann Fehler enthalten):\n${req.bookText.slice(0, 6000)}` : ''].filter(Boolean)
  if (req.type === 'kurztest') {
    return [
      ...common,
      `Erstelle einen Vokabel-Kurztest mit genau ${req.size} Einträgen, passend zum Stoff.`,
      'Format: {"title":"…","minutes":10,"parts":[{"kind":"vocab","title":"Schreibe das Französische","items":[{"de":"das Haus","fr":"la maison"}]}]}',
      '"de" ist das deutsche Wort (ohne Klammern und Zusätze), "fr" die französische Lösung mit Artikel bei Nomen und Infinitiv bei Verben.',
      ...material,
    ].join('\n')
  }
  return [
    ...common,
    `Erstelle eine Klassenarbeit, die etwa ${req.size} Minuten dauert, mit genau diesen vier Teilen in dieser Reihenfolge:`,
    '1. {"kind":"listening","title":"Hörverstehen","transcript":"kurzer französischer Dialog oder Text, 60 bis 90 Wörter, Sprecher durch Zeilenumbruch getrennt","questions":[{"q":"Frage auf Deutsch","options":["A","B","C"],"answer":0}]} mit 4 bis 5 Fragen, alle Antworten ergeben sich aus dem Text.',
    '2. {"kind":"vocab","title":"Wortschatz","items":[{"de":"deutsches Wort","fr":"französische Lösung"}]} mit 8 bis 10 Einträgen.',
    '3. {"kind":"cloze","title":"Grammatik","sentences":[{"text":"Je ___ à Paris.","answer":"vais","translation":"Ich fahre nach Paris."}]} mit 5 bis 6 Sätzen, in jedem fehlt genau ein Wort, das mit ___ markiert ist.',
    '4. {"kind":"writing","title":"Schreiben","task":"Aufgabe auf Deutsch mit Situation","minWords":40,"points":["worauf der Text eingehen soll, z. B. Begrüßung","zweiter Punkt"],"sample":"kurze Musterlösung auf Französisch"}',
    'Gesamtformat: {"title":"…","minutes":45,"parts":[…die vier Teile…]}',
    ...material,
  ].join('\n')
}

/** Anweisung zur Bewertung eines Schülertextes. */
export function buildWritingPrompt(part: Extract<ExamPart, { kind: 'writing' }>, text: string, grade: number): { system: string; user: string } {
  return {
    system: [
      `Du bewertest einen französischen Text einer Schülerin oder eines Schülers (Klasse ${grade}, Niveau ${LEVEL[grade] ?? 'A1'}) wohlwollend, aber genau.`,
      'Antworte NUR mit einem gültigen JSON-Objekt: {"points":0-10,"max":10,"feedback":"…"}.',
      'Vergib Punkte für Inhalt (Aufgabe erfüllt), Wortschatz und Grammatik, Rechtschreibung (Akzente). Im Feedback (Deutsch, höchstens 120 Wörter) nenne 2 bis 3 Stärken und die wichtigsten Fehler mit Verbesserung. Schreibe den Text nicht komplett neu.',
    ].join('\n'),
    user: `Aufgabe: ${part.task}\nZu beachten: ${part.points.join('; ') || '–'}\nMindestens ${part.minWords} Wörter.\n\nText des Schülers:\n${text}`,
  }
}

/** Text zum Vorlesen: ohne Sprecherangaben wie "Sprecher 1:" oder "Léa:", sonst würden sie mitgesprochen. */
export function spokenText(transcript: string): string {
  return transcript
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:sprecher(?:in)?\s*\d*|speaker\s*\d*|personne\s*\d*|[A-ZÀ-Ý][\p{L}'-]{1,14})\s*:\s*/iu, '').trim())
    .filter(Boolean)
    .join('\n')
}
