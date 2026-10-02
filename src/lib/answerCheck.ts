export type CheckStatus = 'correct' | 'almost' | 'wrong'
export interface CheckResult {
  status: CheckStatus
  feedback?: string
}

const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[''`´]/g, "'")
    .replace(/…|\.{3}/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:!?¿¡"«»-]+|[\s.,;:!?¿¡"«»-]+$/g, '')
    .toLowerCase()
}

export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0)
    row[0] = i
    return row
  })
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[a.length][b.length]
}

const ARTICLES = /^(der|die|das|ein|eine|le|la|les|l'|un|une|des|du|de la)\s?/i

export function expandAnswers(answer: string): string[] {
  const out = new Set<string>()
  for (const part of answer.split(/[;/]/)) {
    const p = part.trim()
    if (!p) continue
    out.add(p)
    out.add(p.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim())
    out.add(p.replace(/[()]/g, '').replace(/\s+/g, ' ').trim())
  }
  return [...out].filter(Boolean)
}

export function checkAnswer(input: string, answer: string, extraAccept: string[] = []): CheckResult {
  const typed = normalize(input)
  if (!typed) return { status: 'wrong' }
  const accepted = [...expandAnswers(answer), ...extraAccept].map(normalize)

  if (accepted.includes(typed)) return { status: 'correct' }

  if (accepted.some((a) => stripDiacritics(a) === stripDiacritics(typed))) {
    return { status: 'almost', feedback: `Achte auf die Akzente: ${answer}` }
  }
  const noArt = (s: string) => s.replace(ARTICLES, '')
  if (accepted.some((a) => noArt(a) && noArt(a) === noArt(typed) && a !== noArt(a))) {
    return { status: 'almost', feedback: `Mit Artikel: ${answer}` }
  }
  if (accepted.some((a) => a.length >= 5 && levenshtein(stripDiacritics(a), stripDiacritics(typed)) === 1)) {
    return { status: 'almost', feedback: `Fast! Richtig wäre: ${answer}` }
  }
  return { status: 'wrong' }
}
