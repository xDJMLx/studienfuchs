import { restoreAccents } from './accents'
import { normalizeAiVocab, type AiVocab } from './ai'

export interface SplitReply {
  /** Antwort ohne den Vokabel-Block */
  text: string
  vocab: AiVocab | null
  /** Der Block begann, wurde aber nicht beendet (Antwort zu lang abgeschnitten) */
  truncated: boolean
}

/**
 * Trennt aus der KI-Antwort den Vokabel-Block (```vokabeln {…}```) ab. Die App baut daraus den Test.
 * Fehlende Akzente an den französischen Wörtern werden ergänzt, Artikel und Schreibweise bleiben wie von der KI geliefert.
 */
export function splitVocabBlock(reply: string): SplitReply {
  const re = /```[ \t]*(?:vokabeln|vocab|json)?[ \t]*\r?\n?([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(reply))) {
    const body = m[1].trim()
    if (!body.startsWith('{') && !body.startsWith('[')) continue
    try {
      const vocab = normalizeAiVocab(JSON.parse(body))
      if (!vocab.items.length) continue
      const text = (reply.slice(0, m.index) + reply.slice(m.index + m[0].length)).replace(/\n{3,}/g, '\n\n').trim()
      return { text, vocab: { title: vocab.title, items: vocab.items.map((i) => ({ ...i, front: restoreAccents(i.front) })) }, truncated: false }
    } catch {
      /* kein gültiges JSON: weiter suchen */
    }
  }
  // Angefangener, aber nicht beendeter Block
  const open = /```[ \t]*vokabeln/i.exec(reply)
  if (open) return { text: reply.slice(0, open.index).trim(), vocab: null, truncated: true }
  return { text: reply, vocab: null, truncated: false }
}
