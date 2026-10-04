import { checkAnswer, type CheckResult } from './answerCheck'
import { close, gcd, parseNumber } from '../content/math/fmt'
import type { Exercise } from './types'

/** Antwort-Formen: choice/fill = Text, type/listen = Text, build = Wortliste, match = fertig mit Fehlerliste. */
export type Answer = string | string[] | { matchMistakes: string[] } | { selfGrade: SelfGrade }

/** Karteikarte: Der Schüler bewertet sich selbst. */
export type SelfGrade = 'again' | 'hard' | 'good'

export interface Evaluation extends CheckResult {
  correctAnswer?: string
  /** Items, bei denen etwas schiefging (für die Wiederholungsplanung). */
  mistakeItemIds: string[]
}

export function evaluate(ex: Exercise, answer: Answer): Evaluation {
  switch (ex.kind) {
    case 'teach':
      return { status: 'correct', mistakeItemIds: [] }
    case 'choice':
    case 'listenChoice':
    case 'mchoice':
    case 'qchoice':
    case 'fill': {
      const ok = answer === ex.answer
      return { status: ok ? 'correct' : 'wrong', correctAnswer: ex.answer, mistakeItemIds: ok ? [] : [ex.itemId] }
    }
    case 'speak': {
      // Spracherkennung ist ungenau: kleine Abweichungen (Akzente, Artikel, Tippfehler) zählen als richtig
      const r = checkAnswer(String(answer), ex.text, ex.accept)
      const ok = r.status !== 'wrong'
      return { status: ok ? 'correct' : 'wrong', correctAnswer: ex.text, mistakeItemIds: ok ? [] : [ex.itemId] }
    }
    case 'type':
    case 'listen': {
      const r = checkAnswer(String(answer), ex.answer, ex.accept)
      return { ...r, correctAnswer: ex.answer, mistakeItemIds: r.status === 'wrong' ? [ex.itemId] : [] }
    }
    case 'spell': {
      // Aus Buchstaben gelegt: Leerzeichen der Lösung entfallen, fehlende Akzente zählen als "fast richtig"
      const r = checkAnswer((answer as string[]).join(''), ex.answer.replace(/\s+/g, ''))
      return { ...r, correctAnswer: ex.answer, mistakeItemIds: r.status === 'wrong' ? [ex.itemId] : [] }
    }
    case 'build': {
      const typed = (answer as string[]).join(' ')
      const r = checkAnswer(typed, ex.answer)
      return { ...r, correctAnswer: ex.answer, mistakeItemIds: r.status === 'wrong' ? [ex.itemId] : [] }
    }
    case 'match': {
      const mistakes = (answer as { matchMistakes: string[] }).matchMistakes
      return { status: mistakes.length ? 'almost' : 'correct', mistakeItemIds: mistakes }
    }
    case 'mmatch': {
      // Mathe-Zuordnung: Fehler zählen für das Thema, nicht für die einzelnen Paare
      const mistakes = (answer as { matchMistakes: string[] }).matchMistakes
      return { status: mistakes.length ? 'almost' : 'correct', mistakeItemIds: mistakes.length ? [ex.itemId] : [] }
    }
    case 'calc':
      return evaluateCalc(ex, String(answer))
    case 'qtype': {
      const r = checkAnswer(String(answer), ex.answer, ex.accept)
      return { ...r, correctAnswer: ex.answer, mistakeItemIds: r.status === 'wrong' ? [ex.itemId] : [] }
    }
    case 'qcard': {
      // Selbstbewertung: "Nicht gewusst" zählt als Fehler, "Schwer" als fast richtig
      const g = (answer as { selfGrade?: SelfGrade }).selfGrade
      if (g === 'again') return { status: 'wrong', correctAnswer: ex.back, mistakeItemIds: [ex.itemId] }
      return { status: g === 'hard' ? 'almost' : 'correct', correctAnswer: ex.back, mistakeItemIds: [] }
    }
  }
}

/** Zahleneingabe prüfen: gleicher Wert zählt; bei Brüchen "fast richtig", wenn nicht gekürzt oder als Dezimalzahl statt Bruch. */
function evaluateCalc(ex: Extract<Exercise, { kind: 'calc' }>, input: string): Evaluation {
  const wrong = (feedback?: string): Evaluation => ({ status: 'wrong', feedback, correctAnswer: ex.answer, mistakeItemIds: [ex.itemId] })
  const p = parseNumber(input)
  if (!p) return wrong(input.trim() ? 'Das ist keine Zahl.' : undefined)
  const values = [ex.value, ...(ex.accept ?? [])]
  if (!values.some((v) => close(v, p.value))) return wrong()
  if (ex.reduce && !Number.isInteger(ex.value)) {
    if (p.kind === 'frac') {
      const g = gcd(p.num as number, p.den as number)
      if (g !== 1 || (p.den as number) < 0) return { status: 'almost', feedback: 'Richtig, aber kürze den Bruch noch ganz.', correctAnswer: ex.answer, mistakeItemIds: [] }
    } else {
      return { status: 'almost', feedback: 'Richtig. Schreibe die Lösung als Bruch.', correctAnswer: ex.answer, mistakeItemIds: [] }
    }
  }
  return { status: 'correct', correctAnswer: ex.answer, mistakeItemIds: [] }
}
