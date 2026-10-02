import { checkAnswer, type CheckResult } from './answerCheck'
import type { Exercise } from './types'

/** Antwort-Formen: choice/fill = Text, type/listen = Text, build = Wortliste, match = fertig mit Fehlerliste. */
export type Answer = string | string[] | { matchMistakes: string[] }

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
    case 'build': {
      const typed = (answer as string[]).join(' ')
      const r = checkAnswer(typed, ex.answer)
      return { ...r, correctAnswer: ex.answer, mistakeItemIds: r.status === 'wrong' ? [ex.itemId] : [] }
    }
    case 'match': {
      const mistakes = (answer as { matchMistakes: string[] }).matchMistakes
      return { status: mistakes.length ? 'almost' : 'correct', mistakeItemIds: mistakes }
    }
  }
}
