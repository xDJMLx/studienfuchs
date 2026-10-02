/** Lückensatz mit eingesetzter Antwort. Nach einem Apostroph (j', n', l') kommt kein Leerzeichen. */
export function fillSentence(sentence: string, answer: string): string {
  const filled = answer.endsWith("'") ? sentence.replace(/___ ?/, answer) : sentence.replace('___', answer)
  return filled.replace(/\s+/g, ' ').trim()
}
