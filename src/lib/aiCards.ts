import { restoreAccents } from './accents'
import { AiError, chatCoach, ensureAiReady, extractJson, normalizeAiVocab, type AiVocab } from './ai'
import { chatFree, shouldUseFree } from './freeAi'
import { helpSubject } from './subjects'

/** Sprachvorgaben für die KI je Kartensprache. */
const LANG_NAME = { fr: 'Französisch', en: 'Englisch' } as const

/** Rolle der KI beim Erstellen von Karteikarten. */
export function buildCardsPrompt(subjectId: string, count: number): string {
  const subject = helpSubject(subjectId)
  const name = subject?.name ?? 'dem Fach'
  const lang = subject?.lang
  return [
    `Du erstellst Karteikarten für Schüler (Berliner Schulen) im Fach ${name}.`,
    'Antworte NUR mit JSON, ohne Text davor oder danach, in diesem Format:',
    '{"title": "kurzer Titel der Karteikarten", "items": [{"front": "...", "back": "...", "example": "...", "exampleDe": "..."}]}',
    'Regeln:',
    '- "front" ist die Vorderseite (Frage, Begriff, Aufgabe), "back" die Rückseite mit der richtigen, kurzen Antwort. Nur ein Gedanke pro Karte.',
    '- Die Antwort ist kurz: ein Wort, eine Zahl, eine Wendung oder höchstens zwei Sätze. Lange Erklärungen teilst du auf mehrere Karten auf.',
    '- Frage so, dass man sie aus dem Gedächtnis beantworten kann (keine Ja/Nein-Fragen, keine "Nenne alle ..."-Fragen mit langer Liste).',
    `- Erstelle höchstens ${count} Karten, so viele wie sinnvoll sind. Keine Duplikate, keine Karten, bei denen du dir nicht sicher bist.`,
    '- Wenn der Schüler Fotos mitschickt (Heftseiten, Arbeitsblätter, Buchseiten), nimm den Inhalt davon als Quelle und erfinde nichts dazu.',
    lang
      ? `- Das ist ein Sprachfach: "front" steht in ${LANG_NAME[lang]}, "back" auf Deutsch (auch wenn die Vorlage andersherum ist). Nomen mit Artikel, Verben im Infinitiv. Gib bei Vokabeln "example" (kurzer Beispielsatz, höchstens 10 Wörter) und "exampleDe" (Übersetzung) an.`
      : '- "example" und "exampleDe" lässt du weg.',
    ...(subject?.id === 'mathe' || subject?.id === 'physik' || subject?.id === 'chemie' ? ['- Rechne jede Aufgabe selbst nach: Die Antwort muss stimmen. Schreibe Formeln in Textschreibweise (3/4, x^2, H2O).'] : []),
  ].join('\n')
}

export interface CardRequest {
  subjectId: string
  /** Was der Schüler braucht, in seinen Worten */
  request: string
  count: number
  /** verkleinerte JPEGs (Base64) von Heftseiten und Arbeitsblättern */
  images?: string[]
}

/**
 * Eine Anfrage an die KI (kostenlose Stufe zuerst, sonst Puter) und der Antworttext zurück.
 * Muss direkt aus einem Klick aufgerufen werden (Anmeldefenster des KI-Dienstes).
 */
export async function callAi(system: string, content: string, images: string[] = [], maxTokens = 6000): Promise<string> {
  const messages = [{ role: 'user' as const, content }]
  const useFree = await shouldUseFree(images.length > 0)
  if (!useFree) await ensureAiReady()
  if (useFree) {
    try {
      return await chatFree(system, messages, fetch, Math.min(maxTokens, 4000))
    } catch (e) {
      if (e instanceof AiError && e.kind === 'network') throw e
      await ensureAiReady()
      return chatCoach(system, messages, images, maxTokens)
    }
  }
  return chatCoach(system, messages, images, maxTokens)
}

/** Karten von der KI erzeugen lassen. Muss direkt aus einem Klick aufgerufen werden (Anmeldefenster des KI-Dienstes). */
export async function generateCards({ subjectId, request, count, images = [] }: CardRequest): Promise<AiVocab> {
  const system = buildCardsPrompt(subjectId, count)
  const content = request.trim() || (images.length ? 'Mach Karteikarten aus diesen Seiten.' : '')
  if (!content) throw new AiError('Schreib kurz, wozu du Karten brauchst, oder hänge ein Foto an.', 'format')
  const text = await callAi(system, content, images)
  const vocab = normalizeAiVocab(extractJson<unknown>(text))
  const lang = helpSubject(subjectId)?.lang
  return {
    title: vocab.title === 'Neues Set' ? 'Neue Karteikarten' : vocab.title,
    // Bei Französisch fehlende Akzente ergänzen
    items: vocab.items.slice(0, Math.max(count, 5)).map((i) => (lang === 'fr' ? { ...i, front: restoreAccents(i.front), ...(i.example ? { example: restoreAccents(i.example) } : {}) } : i)),
  }
}
