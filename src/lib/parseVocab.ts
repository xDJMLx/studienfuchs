export interface VocabPair {
  front: string
  back: string
}

const FR_ACCENTS = /[éèêëàâçîïôûùœ]/gi
const DE_MARKERS = /[äöüß]|\b(der|die|das|ein|eine|sich|und|nicht)\b/gi
const FR_MARKERS = /\b(le|la|les|l'|un|une|des|je|tu|il|elle|nous|vous|ils|elles|de|du|est|et)\b/gi
const DE_ARTICLE_SPLIT = /^(.+?)\s+((?:der|die|das|ein|eine)\s.+)$/i

/** Wie "französisch" wirkt ein Text? Positive Werte → eher Französisch, negative → eher Deutsch. */
export function frenchScore(s: string): number {
  const fr = (s.match(FR_ACCENTS)?.length ?? 0) * 2 + (s.match(FR_MARKERS)?.length ?? 0)
  const de = (s.match(DE_MARKERS)?.length ?? 0) * 2
  return fr - de
}

const SEPARATORS = [/\t+/, /\s[–—]\s/, /\s=\s/, /\s->\s|\s→\s/, /\s\|\s/, /\s:\s/, /\s-\s/, /\s{2,}/]

function cleanLine(line: string): string {
  return line
    .replace(/^\s*(\d+[.)]|[•·▪■□●○*-])\s+/, '')
    .replace(/\s+/g, (m) => (m.includes('\t') ? '\t' : m))
    .trim()
}

function splitLine(line: string): VocabPair | null {
  for (const sep of SEPARATORS) {
    const m = line.split(sep)
    if (m.length >= 2) {
      const [a, ...rest] = m
      const b = rest.join(' ')
      if (a.trim() && b.trim()) return { front: a.trim(), back: b.trim() }
    }
  }
  // Zweispaltig ohne Trennzeichen: "la maison das Haus" – an der ersten deutschen Artikelstelle trennen
  const art = DE_ARTICLE_SPLIT.exec(line)
  if (art) return { front: art[1].trim(), back: art[2].trim() }
  return null
}

/**
 * Wandelt (OCR-)Text in Vokabelpaare um. Erkennt Trennzeichen, entfernt Nummerierung
 * und dreht die Spalten um, wenn Deutsch links und Französisch rechts steht.
 * `front` ist am Ende immer die Fremdsprache.
 */
export function parseVocab(text: string): VocabPair[] {
  return parseVocabDetailed(text).pairs
}

// Seitenzahlen, Überschriften und reine Zahlen/Satzzeichen sind kein Vokabelstoff.
const NOISE = /^(seite|page|unité|unit|lektion|übung|exercice)\b|^[\d\s.,;:!?()-]*$/i

/** Wie parseVocab, liefert aber zusätzlich Zeilen, die nicht als Paar erkannt wurden (zum manuellen Korrigieren). */
export function parseVocabDetailed(text: string): { pairs: VocabPair[]; unmatched: string[] } {
  const raw: VocabPair[] = []
  const unmatched: string[] = []
  for (const l of text.split(/\r?\n/)) {
    const line = cleanLine(l)
    if (line.length < 3 || NOISE.test(line)) continue
    const pair = splitLine(line)
    if (pair) raw.push(pair)
    else unmatched.push(line)
  }
  if (!raw.length) return { pairs: [], unmatched }

  const left = raw.reduce((n, p) => n + frenchScore(p.front), 0)
  const right = raw.reduce((n, p) => n + frenchScore(p.back), 0)
  const swapped = right > left

  const seen = new Set<string>()
  const out: VocabPair[] = []
  for (const p of raw) {
    // Spalten global drehen; einzelne Zeilen, die eindeutig andersherum stehen, zusätzlich korrigieren
    const diff = frenchScore(p.front) - frenchScore(p.back)
    const lineSwap = swapped ? diff >= 2 : diff <= -2
    const flip = swapped !== lineSwap
    const pair = flip ? { front: p.back, back: p.front } : p
    const key = pair.front.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(pair)
  }
  return { pairs: out, unmatched }
}
