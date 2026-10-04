export interface ParsedCard {
  front: string
  back: string
}

/** Trennzeichen in der Reihenfolge, in der sie versucht werden: Tabulator, Gedankenstrich, Bindestrich mit Leerzeichen, Semikolon, Strich, Gleichheitszeichen, Doppelpunkt. */
const SEPARATORS: (string | RegExp)[] = ['\t', ' – ', ' — ', ' - ', ';', ' | ', ' = ', /:\s/]

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * Karten aus Text: eine Karte pro Zeile, "Frage – Antwort". Erkannt werden Tabulator (aus Tabellen kopiert),
 * Gedankenstrich, Bindestrich mit Leerzeichen, Semikolon, senkrechter Strich, "=" und Doppelpunkt.
 * Zeilen ohne Trennzeichen kommen ohne Antwort zurück (der Schüler ergänzt sie).
 */
export function parseCards(text: string): { cards: ParsedCard[]; incomplete: number } {
  const cards: ParsedCard[] = []
  let incomplete = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()
    if (!line) continue
    let done = false
    for (const sep of SEPARATORS) {
      const idx = typeof sep === 'string' ? line.indexOf(sep) : line.search(sep)
      if (idx <= 0) continue
      const len = typeof sep === 'string' ? sep.length : (line.slice(idx).match(sep)?.[0].length ?? 1)
      const front = clean(line.slice(0, idx))
      const back = clean(line.slice(idx + len))
      if (front && back) {
        cards.push({ front, back })
        done = true
        break
      }
    }
    if (!done) {
      cards.push({ front: clean(line), back: '' })
      incomplete++
    }
  }
  return { cards, incomplete }
}
