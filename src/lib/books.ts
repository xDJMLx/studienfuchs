/**
 * Bücher: Schulbücher, die der Nutzer selbst fotografiert. Gespeichert wird nur der erkannte Text (keine Bilder),
 * und nur auf diesem Gerät. Die KI bekommt pro Frage einen kleinen, passenden Ausschnitt statt des ganzen Buchs.
 */
export interface BookPage {
  id: string
  /** Seitenzahl im Buch, null = unbekannt */
  num: number | null
  text: string
  addedAt: string
}

export interface Chapter {
  id: string
  title: string
  /** Erste Seite des Kapitels */
  from: number
}

export interface Book {
  id: string
  title: string
  grade: number
  createdAt: string
  /** Seite, bei der die Klasse gerade ist */
  position: number | null
  chapters: Chapter[]
  pages: BookPage[]
  /** Zuletzt benutzt (für die Reihenfolge und die "aktive" Buch-Auswahl) */
  lastUsed: string
}

/** Klassenarbeit mit Stoff aus einem Buch */
export interface BookExam {
  id: string
  bookId: string
  /** YYYY-MM-DD */
  date: string
  from: number
  to: number
}

/** Längste Zeichenzahl pro Seite, die gespeichert wird (eine volle Buchseite hat etwa 1500–3000) */
export const MAX_PAGE_CHARS = 6000

export const sortedPages = (b: Book): BookPage[] =>
  [...b.pages].sort((a, c) => (a.num ?? Number.MAX_SAFE_INTEGER) - (c.num ?? Number.MAX_SAFE_INTEGER) || a.addedAt.localeCompare(c.addedAt))

export const sortedChapters = (b: Book): Chapter[] => [...b.chapters].sort((a, c) => a.from - c.from)

/** Letzte Seite eines Kapitels: eine Seite vor dem nächsten Kapitel, beim letzten die höchste bekannte Seite. */
export function chapterRange(b: Book, chapterId: string): { from: number; to: number } | null {
  const list = sortedChapters(b)
  const i = list.findIndex((c) => c.id === chapterId)
  if (i < 0) return null
  const nums = b.pages.map((p) => p.num).filter((n): n is number => n !== null)
  const to = i + 1 < list.length ? list[i + 1].from - 1 : Math.max(list[i].from, ...nums)
  return { from: list[i].from, to: Math.max(list[i].from, to) }
}

/** In welchem Kapitel liegt die Seite? */
export function chapterOf(b: Book, page: number | null): Chapter | null {
  if (page === null) return null
  const list = sortedChapters(b).filter((c) => c.from <= page)
  return list.length ? list[list.length - 1] : null
}

const PAGE_NUMBER_LINE = /^\D{0,3}(\d{1,3})\D{0,3}$/
const PAGE_NUMBER_EDGE = /^(?:(\d{1,3})\s+\D.{1,23}|[^\d]{2,24}\s+(\d{1,3}))$/

/** Seitenzahl aus dem erkannten Text: meist eine einzelne Zahl am Anfang oder Ende der Seite. */
export function detectPageNumber(text: string): number | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return null
  const edges = [...lines.slice(-3).reverse(), ...lines.slice(0, 3)]
  const valid = (n: number) => n >= 1 && n <= 999
  for (const l of edges) {
    const m = PAGE_NUMBER_LINE.exec(l)
    if (m && valid(Number(m[1]))) return Number(m[1])
  }
  // Zahl neben einem kurzen Seitentitel ("38 Unité 2")
  for (const l of edges) {
    if (l.length > 28) continue
    const m = PAGE_NUMBER_EDGE.exec(l)
    const n = m ? Number(m[1] ?? m[2]) : NaN
    if (valid(n)) return n
  }
  return null
}

/** Inhaltsverzeichnis aus erkanntem Text: Zeilen, die mit einer Seitenzahl enden ("Unité 2 – Au collège ..... 38"). */
export function parseToc(text: string): { title: string; from: number }[] {
  const out: { title: string; from: number }[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const m = /^(.{3,80}?)[\s.·…_–—-]*?[\s.·…_]\s*(\d{1,3})$/.exec(line)
    if (!m) continue
    const title = m[1].replace(/[\s.·…_–—-]+$/, '').trim()
    const from = Number(m[2])
    if (!/[A-Za-zÀ-ÿ]{3}/.test(title) || from < 1 || from > 999) continue
    out.push({ title, from })
  }
  // Doppelte Seiten (zwei Einträge auf derselben Seite) behalten den ersten
  const seen = new Set<string>()
  return out.filter((c) => {
    const key = `${c.title.toLowerCase()}|${c.from}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Seitenbereiche aus einer Nachricht: "Seite 12", "S. 12-14", "Seiten 12 bis 14". */
export function parsePageRanges(message: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = []
  const re = /\b(?:seiten?|s\.?)\s*(\d{1,3})(?:\s*(?:-|–|—|bis)\s*(?:seite\s*)?(\d{1,3}))?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(message))) {
    const from = Number(m[1])
    const to = m[2] ? Number(m[2]) : from
    if (to >= from && to - from <= 40) out.push({ from, to })
  }
  return out
}

const STOP = new Set(['aber', 'also', 'auch', 'dann', 'dass', 'dazu', 'eine', 'einen', 'einem', 'einer', 'hier', 'ihre', 'kann', 'mach', 'machen', 'mich', 'mir', 'noch', 'oder', 'seite', 'seiten', 'unter', 'wann', 'warum', 'was', 'welche', 'wenn', 'wie', 'wird', 'wir', 'wörter', 'frag', 'erkläre', 'buch', 'kannst', 'bitte', 'diese', 'dieser', 'dieses', 'sind', 'nicht', 'dem', 'den', 'der', 'die', 'das', 'und', 'für', 'mit', 'von', 'aus', 'bei', 'ist'])

const words = (s: string): string[] => s.toLowerCase().match(/[a-zà-ÿœ]{4,}/g)?.filter((w) => !STOP.has(w)) ?? []

export interface ContextOptions {
  /** Höchstzahl Zeichen für alle Seitentexte zusammen */
  budget?: number
  /** Höchstzahl Seiten */
  maxPages?: number
  now?: Date
}

const NEAR = 2

/**
 * Welche Seiten braucht die KI für diese Frage? In dieser Reihenfolge der Wichtigkeit:
 * ausdrücklich genannte Seiten, genanntes Kapitel, Stoff der nächsten Klassenarbeit (wenn davon die Rede ist),
 * Wörter aus der Frage, die auf einer Seite vorkommen, sonst die Seiten rund um den Stand der Klasse.
 */
export function pickPages(book: Book, message: string, exams: BookExam[] = [], now = new Date()): BookPage[] {
  const pages = sortedPages(book).filter((p) => p.num !== null)
  const byNum = (from: number, to: number) => pages.filter((p) => (p.num as number) >= from && (p.num as number) <= to)
  const picked: BookPage[] = []
  const add = (list: BookPage[]) => {
    for (const p of list) if (!picked.includes(p)) picked.push(p)
  }

  for (const r of parsePageRanges(message)) add(byNum(r.from, r.to))

  const lower = message.toLowerCase()
  for (const c of sortedChapters(book)) {
    const key = c.title.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).slice(0, 2).join(' ')
    if (key.length >= 4 && lower.includes(key)) {
      const r = chapterRange(book, c.id)
      if (r) add(byNum(r.from, r.to))
    }
  }

  if (/klassenarbeit|arbeit|test|prüfung|schulaufgabe/i.test(message)) {
    const next = exams
      .filter((e) => e.bookId === book.id && daysFromNow(e.date, now) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    if (next) add(byNum(next.from, next.to))
  }

  if (!picked.length) {
    const terms = words(message)
    if (terms.length) {
      const scored = pages
        .map((p) => {
          const t = p.text.toLowerCase()
          return { p, score: terms.filter((w) => t.includes(w)).length }
        })
        .filter((x) => x.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
      add(scored.map((x) => x.p))
    }
  }

  if (!picked.length && book.position !== null) add(byNum(book.position - NEAR, book.position))
  return picked.sort((a, b) => (a.num as number) - (b.num as number))
}

function daysFromNow(date: string, now: Date): number {
  const [y, m, d] = date.split('-').map(Number)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((new Date(y, m - 1, d).getTime() - start) / 86_400_000)
}

/**
 * Text für die KI zu den Büchern des Schülers: Kopf je Buch (Titel, Stand, Kapitel) und ausgewählte Seitentexte.
 * Gibt einen leeren Text zurück, wenn es keine Bücher gibt.
 */
export function buildBookContext(books: Book[], exams: BookExam[], message: string, opts: ContextOptions = {}): string {
  if (!books.length) return ''
  const now = opts.now ?? new Date()
  let budget = opts.budget ?? 9000
  let slots = opts.maxPages ?? 8
  const ordered = [...books].sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
  const out: string[] = ['Bücher des Schülers (selbst fotografiert, Text per Texterkennung und deshalb manchmal fehlerhaft):']

  ordered.forEach((b, bi) => {
    const ch = sortedChapters(b)
    const here = chapterOf(b, b.position)
    const nums = b.pages.map((p) => p.num).filter((n): n is number => n !== null).sort((a, c) => a - c)
    out.push(
      `- "${b.title}" (Klasse ${b.grade}): ${b.pages.length} ${b.pages.length === 1 ? 'Seite' : 'Seiten'} gespeichert${nums.length ? ` (Seite ${nums[0]} bis ${nums[nums.length - 1]})` : ''}.` +
        (b.position !== null ? ` Die Klasse ist bei Seite ${b.position}${here ? `, ${here.title}` : ''}.` : '') +
        (ch.length ? ` Kapitel: ${ch.map((c) => `${c.title} (ab S. ${c.from})`).join('; ')}.` : ''),
    )
    const upcoming = exams.filter((e) => e.bookId === b.id && daysFromNow(e.date, now) >= 0).sort((x, y) => x.date.localeCompare(y.date))
    for (const e of upcoming) {
      const d = daysFromNow(e.date, now)
      out.push(`  Klassenarbeit ${d === 0 ? 'heute' : d === 1 ? 'morgen' : `in ${d} Tagen`} (${e.date}): Seite ${e.from} bis ${e.to}.`)
    }
    // Seiten nur aus dem zuletzt benutzten Buch, außer die Frage nennt ein anderes Buch beim Namen
    const named = message.toLowerCase().includes(b.title.toLowerCase())
    if (bi === 0 || named) {
      for (const p of pickPages(b, message, exams, now)) {
        if (slots <= 0 || budget <= 200) break
        const cap = Math.min(2500, budget)
        const text = p.text.length > cap ? `${p.text.slice(0, cap)} [gekürzt]` : p.text
        out.push(`--- ${b.title}, Seite ${p.num} ---\n${text.trim()}`)
        budget -= text.length
        slots -= 1
      }
    }
  })
  return out.join('\n')
}
