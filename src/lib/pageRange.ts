/**
 * "12-15, 18" → [12, 13, 14, 15, 18]. Gibt eine Fehlermeldung zurück, wenn die Eingabe nicht passt
 * (Seiten außerhalb des Dokuments, falsche Reihenfolge, zu viele Seiten).
 */
export function parsePageRange(input: string, maxPage: number, limit = 20): { pages: number[]; error?: string } {
  const text = input.trim()
  if (!text) return { pages: [], error: 'Bitte Seiten angeben, z. B. 12-15.' }
  const pages: number[] = []
  for (const part of text.split(/[,;]+/)) {
    const m = /^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*$/.exec(part)
    if (!m) return { pages: [], error: `„${part.trim()}“ verstehe ich nicht. Nutze Zahlen und Bindestriche, z. B. 12-15 oder 3, 5, 8.` }
    const from = Number(m[1])
    const to = m[2] ? Number(m[2]) : from
    if (from < 1 || to < 1) return { pages: [], error: 'Seitenzahlen beginnen bei 1.' }
    if (to < from) return { pages: [], error: `„${from}-${to}“: Die zweite Zahl muss größer sein.` }
    if (to > maxPage) return { pages: [], error: `Das Dokument hat nur ${maxPage} Seiten.` }
    for (let p = from; p <= to; p++) if (!pages.includes(p)) pages.push(p)
  }
  if (pages.length > limit) return { pages: [], error: `Bitte höchstens ${limit} Seiten auf einmal.` }
  return { pages }
}
