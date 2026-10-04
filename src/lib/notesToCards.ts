import { parseCards } from './parseCards'

export interface NoteCard {
  front: string
  back: string
  /** Wie die Karte entstanden ist (für die Hinweise an den Schüler) */
  how: 'paar' | 'definition' | 'jahr'
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
/** Mitten im Fragesatz klein: "Was ist die Zelle?" statt "Was ist Die Zelle?" */
const midSentence = (s: string) => s.replace(/^(Die|Der|Das|Ein|Eine|Den|Dem|Des|Einer|Einen)\s/, (a) => a.toLowerCase())
const stripEnd = (s: string) => s.replace(/[\s.;,:!]+$/g, '')

/** "X ist Y", "X sind Y", "X bedeutet Y", "X heißt Y": Frage nach X, Antwort Y. */
const DEFINITION = /^(.{2,70}?)\s+(ist|sind|bedeutet|heißt|beschreibt|bezeichnet|nennt man|versteht man unter)\s+(.{4,})$/i
/** "Y nennt man X", "Y wird X genannt" */
const NAMED = /^(.{4,}?)\s+(?:nennt man|wird (?:als )?(.{2,40}?) (?:bezeichnet|genannt))\s*(.*)$/i
const YEAR = /^((?:1[0-9]|20)\d{2}(?:\s*[–-]\s*(?:1[0-9]|20)?\d{2,4})?)\s*[:–-]?\s+(.{4,})$/

/**
 * Karten aus Notizen, ohne KI: Zeilen wie „Frage – Antwort“, Merksätze („Die Zelle ist die kleinste Einheit des Lebens“ →
 * „Was ist die Zelle?“) und Jahreszahlen („1789 Beginn der Französischen Revolution“). Alles andere wird übersprungen.
 * Ergebnisse sind Vorschläge: Der Schüler prüft sie vor dem Speichern.
 */
export function cardsFromNotes(text: string): { cards: NoteCard[]; skipped: number } {
  const cards: NoteCard[] = []
  const seen = new Set<string>()
  let skipped = 0
  const push = (c: NoteCard) => {
    const key = c.front.toLowerCase()
    if (!c.front || !c.back || seen.has(key)) return
    seen.add(key)
    cards.push(c)
  }

  // Erst Zeilen mit Trennzeichen (Frage – Antwort); Zeilen ohne Antwort zählen hier nicht als Karte
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()).filter(Boolean)
  for (const raw of lines) {
    const line = clean(raw)
    // Jahreszahl zuerst (damit "1789 – Revolution" nicht als Paar mit leerer Frage endet)
    const y = YEAR.exec(line)
    if (y) {
      push({ front: `Was geschah ${clean(y[1])}?`, back: cap(stripEnd(clean(y[2]))), how: 'jahr' })
      continue
    }
    const pair = parseCards(line)
    if (pair.cards.length && !pair.incomplete) {
      push({ front: pair.cards[0].front, back: pair.cards[0].back, how: 'paar' })
      continue
    }
    // Merksätze: in Sätze zerlegen (eine Zeile kann mehrere enthalten)
    let found = false
    for (const sentence of line.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)) {
      const s = stripEnd(clean(sentence))
      const named = NAMED.exec(s)
      if (named && /nennt man/i.test(s) && named[1] && s.split(/nennt man/i)[1]?.trim()) {
        const [what, name] = s.split(/\s+nennt man\s+/i)
        if (what && name) {
          push({ front: `Wie nennt man ${midSentence(stripEnd(what))}?`, back: cap(clean(name)), how: 'definition' })
          found = true
          continue
        }
      }
      const d = DEFINITION.exec(s)
      if (d) {
        const subject = midSentence(clean(d[1]))
        const verb = d[2].toLowerCase()
        const rest = clean(d[3])
        // Zu allgemeine Anfänge (Pronomen, "Das", "Es") ergeben keine sinnvolle Frage
        if (/^(es|das|dies|dieser|diese|dieses|man|er|sie|wir|ich)$/i.test(subject)) continue
        const question = verb === 'sind' ? `Was sind ${subject}?` : verb === 'ist' ? `Was ist ${subject}?` : verb === 'bedeutet' ? `Was bedeutet ${subject}?` : verb === 'heißt' ? `Was heißt ${subject}?` : `Was ${verb} ${subject}?`
        push({ front: question, back: cap(rest), how: 'definition' })
        found = true
      }
    }
    if (!found) skipped++
  }
  return { cards, skipped }
}
