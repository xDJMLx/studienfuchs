/** Tipp für Tippaufgaben: zeigt Länge und ersten Buchstaben jedes Wortes, z. B. "l'école" → "l'_____". */
export function makeHint(answer: string): string {
  return answer
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/\p{L}/gu, (ch, offset: number) => (offset === 0 ? ch : '_')))
    .join('   ')
}
