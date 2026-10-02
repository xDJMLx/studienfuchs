import { describe, expect, it } from 'vitest'
import { buildBookContext, chapterOf, chapterRange, detectPageNumber, parsePageRanges, parseToc, pickPages, type Book, type BookExam } from './books'

const page = (num: number | null, text: string) => ({ id: `p${num}`, num, text, addedAt: '2026-10-01' })

const book: Book = {
  id: 'b1',
  title: 'À plus! 2',
  grade: 8,
  createdAt: '2026-10-01',
  lastUsed: '2026-10-02',
  position: 54,
  chapters: [
    { id: 'c1', title: 'Unité 1', from: 8 },
    { id: 'c2', title: 'Unité 2 – Au collège', from: 38 },
    { id: 'c3', title: 'Unité 3', from: 60 },
  ],
  pages: [
    page(40, 'la cantine le professeur'),
    page(52, 'les devoirs la récréation'),
    page(53, 'le cahier la trousse'),
    page(54, 'passé composé avec avoir'),
    page(62, 'le voyage la valise'),
  ],
}

describe('Seitenzahl erkennen', () => {
  it('findet eine einzelne Zahl am Seitenende', () => {
    expect(detectPageNumber('Les devoirs\nle cahier\n38')).toBe(38)
  })
  it('findet die Zahl neben einem kurzen Titel am Anfang', () => {
    expect(detectPageNumber('54 Unité 2\nle professeur\nla classe')).toBe(54)
  })
  it('ignoriert Vokabelzeilen mit Zahlen mitten im Text und liefert sonst null', () => {
    expect(detectPageNumber('le chat = die Katze\nla maison = das Haus')).toBeNull()
    expect(detectPageNumber('')).toBeNull()
  })
})

describe('Inhaltsverzeichnis', () => {
  it('liest Titel und Seitenzahl, auch mit Punktlinien', () => {
    const toc = parseToc('Unité 1 Bienvenue ........ 8\nUnité 2 – Au collège ..... 38\nVocabulaire 120\nInhalt')
    expect(toc).toEqual([
      { title: 'Unité 1 Bienvenue', from: 8 },
      { title: 'Unité 2 – Au collège', from: 38 },
      { title: 'Vocabulaire', from: 120 },
    ])
  })
})

describe('Seitenbereiche in der Frage', () => {
  it('versteht Seite, S. und bis', () => {
    expect(parsePageRanges('Mach einen Test von Seite 52 bis 54')).toEqual([{ from: 52, to: 54 }])
    expect(parsePageRanges('Was steht auf S. 40-41?')).toEqual([{ from: 40, to: 41 }])
    expect(parsePageRanges('Seite 12')).toEqual([{ from: 12, to: 12 }])
    expect(parsePageRanges('Hallo')).toEqual([])
  })
})

describe('Kapitel', () => {
  it('berechnet das Kapitelende aus dem nächsten Kapitel', () => {
    expect(chapterRange(book, 'c2')).toEqual({ from: 38, to: 59 })
    expect(chapterRange(book, 'c3')).toEqual({ from: 60, to: 62 })
  })
  it('findet das Kapitel einer Seite', () => {
    expect(chapterOf(book, 54)?.id).toBe('c2')
    expect(chapterOf(book, 3)).toBeNull()
  })
})

describe('Auswahl der Seiten für die KI', () => {
  it('nimmt die genannten Seiten', () => {
    expect(pickPages(book, 'Test von Seite 52 bis 53').map((p) => p.num)).toEqual([52, 53])
  })
  it('nimmt ein genanntes Kapitel', () => {
    expect(pickPages(book, 'Frag mich Unité 3 ab').map((p) => p.num)).toEqual([62])
  })
  it('nimmt bei einer Frage zur Klassenarbeit den Stoff des nächsten Termins', () => {
    const exams: BookExam[] = [{ id: 'e1', bookId: 'b1', date: '2026-10-09', from: 52, to: 54 }]
    expect(pickPages(book, 'Hilf mir bei der Klassenarbeit', exams, new Date(2026, 9, 2)).map((p) => p.num)).toEqual([52, 53, 54])
  })
  it('sucht sonst nach Wörtern der Frage', () => {
    expect(pickPages(book, 'Was heißt la valise und le voyage?').map((p) => p.num)).toEqual([62])
  })
  it('fällt auf die Seiten rund um den Stand der Klasse zurück', () => {
    expect(pickPages(book, 'Erkläre mir das nochmal').map((p) => p.num)).toEqual([52, 53, 54])
  })
})

describe('Text für die KI', () => {
  it('ist leer ohne Bücher', () => {
    expect(buildBookContext([], [], 'Hallo')).toBe('')
  })

  it('nennt Stand, Kapitel und die gewählten Seiten', () => {
    const t = buildBookContext([book], [], 'Test von Seite 52 bis 53')
    expect(t).toContain('À plus! 2')
    expect(t).toContain('Seite 54, Unité 2')
    expect(t).toContain('Unité 3 (ab S. 60)')
    expect(t).toContain('Seite 52 ---')
    expect(t).toContain('les devoirs')
    expect(t).not.toContain('la valise')
  })

  it('hält das Zeichenbudget ein und kürzt lange Seiten', () => {
    const long: Book = { ...book, pages: [page(52, 'x'.repeat(5000)), page(53, 'y'.repeat(5000)), page(54, 'z'.repeat(5000))] }
    const t = buildBookContext([long], [], 'Seite 52 bis 54', { budget: 3000 })
    expect(t).toContain('[gekürzt]')
    expect(t.length).toBeLessThan(3600)
  })
})
