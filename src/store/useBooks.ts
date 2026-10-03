import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { MAX_PAGE_CHARS, type Book, type BookExam, type BookPage, type Chapter } from '../lib/books'
import { debouncedStorage } from '../lib/storage'

interface BooksData {
  books: Book[]
  exams: BookExam[]
}

interface BooksActions {
  addBook: (title: string, grade: number) => string
  renameBook: (id: string, title: string) => void
  deleteBook: (id: string) => void
  touchBook: (id: string) => void
  setPosition: (id: string, page: number | null) => void
  /** Seiten speichern; eine Seite mit gleicher Seitenzahl wird ersetzt. Gibt zurück, wie viele ersetzt wurden. */
  addPages: (id: string, pages: { num: number | null; text: string }[]) => number
  updatePage: (bookId: string, pageId: string, patch: { num?: number | null; text?: string }) => void
  deletePage: (bookId: string, pageId: string) => void
  setChapters: (id: string, chapters: { title: string; from: number }[]) => void
  addExam: (e: Omit<BookExam, 'id'>) => void
  deleteExam: (id: string) => void
  /** Für Sicherung und Zurücksetzen */
  replaceAll: (data: BooksData) => void
}

const initial: BooksData = { books: [], exams: [] }
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const clean = (t: string) => t.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_PAGE_CHARS)

const patchBook = (s: BooksData, id: string, fn: (b: Book) => Book): BooksData => ({ ...s, books: s.books.map((b) => (b.id === id ? fn(b) : b)) })

export const useBooks = create<BooksData & BooksActions>()(
  persist(
    (set) => ({
      ...initial,

      addBook: (title, grade) => {
        const id = uid('book')
        const now = new Date().toISOString()
        set((s) => ({ books: [{ id, title: title.trim() || 'Mein Buch', grade, createdAt: now, lastUsed: now, position: null, chapters: [], pages: [] }, ...s.books] }))
        return id
      },

      renameBook: (id, title) => set((s) => patchBook(s, id, (b) => ({ ...b, title: title.trim() || b.title }))),

      deleteBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id), exams: s.exams.filter((e) => e.bookId !== id) })),

      touchBook: (id) => set((s) => patchBook(s, id, (b) => ({ ...b, lastUsed: new Date().toISOString() }))),

      setPosition: (id, page) => set((s) => patchBook(s, id, (b) => ({ ...b, position: page, lastUsed: new Date().toISOString() }))),

      addPages: (id, pages) => {
        let replaced = 0
        const now = new Date().toISOString()
        set((s) =>
          patchBook(s, id, (b) => {
            let list: BookPage[] = [...b.pages]
            for (const p of pages) {
              const text = clean(p.text)
              if (!text) continue
              if (p.num !== null) {
                const before = list.length
                list = list.filter((x) => x.num !== p.num)
                replaced += before - list.length
              }
              list.push({ id: uid('pg'), num: p.num, text, addedAt: now })
            }
            return { ...b, pages: list, lastUsed: now }
          }),
        )
        return replaced
      },

      updatePage: (bookId, pageId, patch) =>
        set((s) =>
          patchBook(s, bookId, (b) => ({
            ...b,
            pages: b.pages.map((p) => (p.id === pageId ? { ...p, ...(patch.num !== undefined ? { num: patch.num } : {}), ...(patch.text !== undefined ? { text: clean(patch.text) } : {}) } : p)),
          })),
        ),

      deletePage: (bookId, pageId) => set((s) => patchBook(s, bookId, (b) => ({ ...b, pages: b.pages.filter((p) => p.id !== pageId) }))),

      setChapters: (id, chapters) =>
        set((s) =>
          patchBook(s, id, (b) => ({
            ...b,
            chapters: chapters
              .filter((c) => c.title.trim() && c.from >= 1)
              .map((c): Chapter => ({ id: uid('ch'), title: c.title.trim(), from: Math.round(c.from) }))
              .sort((a, c) => a.from - c.from),
          })),
        ),

      addExam: (e) => set((s) => ({ exams: [...s.exams, { ...e, id: uid('ex') }] })),
      deleteExam: (id) => set((s) => ({ exams: s.exams.filter((e) => e.id !== id) })),

      replaceAll: (data) => set({ books: Array.isArray(data?.books) ? data.books : [], exams: Array.isArray(data?.exams) ? data.exams : [] }),
    }),
    { name: 'studienfuchs-books', version: 1, storage: createJSONStorage(() => debouncedStorage), partialize: (s) => ({ books: s.books, exams: s.exams }) },
  ),
)

/** Für die Sicherung: nur die Daten, ohne Funktionen. */
export const booksSnapshot = (): BooksData => {
  const { books, exams } = useBooks.getState()
  return { books, exams }
}
