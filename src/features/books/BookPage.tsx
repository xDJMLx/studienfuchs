import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Camera, Right, Sparkle, Trash } from '../../components/ui/Icons'
import { BackLink } from '../../components/ui/BackLink'
import { Item, Stagger } from '../../components/ui/motion'
import { Sheet } from '../../components/ui/Sheet'
import { chapterOf, chapterRange, sortedChapters, sortedPages, type Book, type BookPage as Page } from '../../lib/books'
import { useBooks } from '../../store/useBooks'
import { AddPages } from './AddPages'

const field = 'rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none focus:border-brand'

/** Ein Buch: Stand der Klasse, Kapitel, gespeicherte Seiten und der Weg zur KI mit diesem Buch. */
export function BookPage() {
  const { bookId = '' } = useParams()
  const book = useBooks((s) => s.books.find((b) => b.id === bookId))
  if (!book) return <Navigate to="/books" replace />
  return <BookDetail key={book.id} book={book} />
}

function BookDetail({ book }: { book: Book }) {
  const navigate = useNavigate()
  const { setPosition, renameBook, deleteBook, deletePage, updatePage, touchBook } = useBooks()
  const [sheet, setSheet] = useState<null | 'pages' | 'toc'>(null)
  const [note, setNote] = useState<string | null>(null)
  const [edit, setEdit] = useState<Page | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pos, setPos] = useState(book.position === null ? '' : String(book.position))

  const pages = useMemo(() => sortedPages(book), [book])
  const chapters = useMemo(() => sortedChapters(book), [book])
  const here = chapterOf(book, book.position)

  const commitPos = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 3)
    setPos(clean)
    const n = Number(clean)
    setPosition(book.id, clean && n >= 1 ? n : null)
  }

  const ask = (q: string) => {
    touchBook(book.id)
    navigate(`/coach?q=${encodeURIComponent(q)}`)
  }
  const testRange = book.position !== null ? `Seite ${Math.max(1, book.position - 2)} bis ${book.position}` : 'Seite … bis …'

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-4 lg:py-8" stagger={0.06}>
      <Item>
        <BackLink to="/books" label="Bücher" size={20} />
        <input
          defaultValue={book.title}
          onBlur={(e) => renameBook(book.id, e.target.value)}
          aria-label="Name des Buchs"
          className="mb-1 w-full rounded-lg bg-transparent text-2xl font-bold outline-none focus:bg-snow"
        />
        <p className="mb-5 text-sm text-muted">
          Klasse {book.grade}, {book.pages.length} {book.pages.length === 1 ? 'Seite' : 'Seiten'} gespeichert, nur auf diesem Gerät
        </p>
      </Item>

      {note && (
        <p className="mb-4 rounded-xl bg-good-soft px-4 py-2.5 text-sm font-semibold text-good-dark" role="status">
          {note}
        </p>
      )}

      {/* Stand der Klasse */}
      <Item>
        <section className="card p-4" aria-label="Stand der Klasse">
          <label className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Wo seid ihr gerade?</span>
              <span className="block text-sm text-muted">{here ? `${here.title}. ` : ''}Die KI weiß damit, was gerade dran ist.</span>
            </span>
            <span className="text-sm font-semibold text-muted">Seite</span>
            <input inputMode="numeric" value={pos} onChange={(e) => commitPos(e.target.value)} placeholder="–" className={`${field} w-20 text-center`} aria-label="Aktuelle Seite der Klasse" />
          </label>
        </section>
      </Item>

      {/* Aktionen */}
      <Item className="mt-4">
        <div className="grid gap-2">
          <button type="button" className="btn btn-primary press w-full justify-center" onClick={() => setSheet('pages')}>
            <Camera size={20} /> Seiten hinzufügen
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!pages.length} className="btn btn-ghost press justify-center" onClick={() => ask(`Mach mir einen Vokabeltest aus meinem Buch „${book.title}“, ${testRange} (nur die Vokabeln). Achte auf genaue Schreibweise und Akzente.`)}>
              Vokabeltest
            </button>
            <button type="button" className="btn btn-ghost press justify-center" onClick={() => ask(`Erkläre mir den Stoff aus meinem Buch „${book.title}“${book.position !== null ? `, Seite ${book.position}` : ''}.`)}>
              <Sparkle size={18} /> Frag die KI
            </button>
          </div>
          {!pages.length && <p className="text-sm text-muted">Für den Vokabeltest brauchst du erst ein paar Seiten.</p>}
        </div>
      </Item>

      {/* Kapitel */}
      <Item className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inhaltsverzeichnis</h2>
          <button type="button" className="press min-h-11 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold" onClick={() => setSheet('toc')}>
            {chapters.length ? 'Bearbeiten' : 'Hinzufügen'}
          </button>
        </div>
        {chapters.length === 0 ? (
          <p className="rounded-2xl bg-snow p-4 text-sm text-muted">Noch keine Kapitel. Foto vom Inhaltsverzeichnis genügt, dann ordnet die App die Seiten den Kapiteln zu.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {chapters.map((c) => {
              const r = chapterRange(book, c.id)
              const count = r ? book.pages.filter((p) => p.num !== null && p.num >= r.from && p.num <= r.to).length : 0
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.title}</span>
                    <span className="block text-sm text-muted">
                      Seite {c.from}
                      {r && r.to > c.from ? `–${r.to}` : ''}, {count} gespeichert
                    </span>
                  </span>
                  {here?.id === c.id && <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">hier</span>}
                </li>
              )
            })}
          </ul>
        )}
      </Item>

      {/* Seiten */}
      <Item className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Seiten</h2>
        {pages.length === 0 ? (
          <p className="rounded-2xl bg-snow p-4 text-sm text-muted">Noch keine Seiten. Mit „Seiten hinzufügen“ fotografierst du sie, der Text wird auf deinem Handy erkannt.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {pages.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setEdit(p)} className="press flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft px-2 text-sm font-bold text-brand-dark">{p.num ?? '?'}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">{p.text.replace(/\s+/g, ' ').slice(0, 90)}</span>
                  <Right size={16} className="shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Item>

      <Item className="mt-10">
        <button
          type="button"
          className={`press flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${confirmDelete ? 'bg-bad text-white' : 'text-muted hover:text-bad'}`}
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true)
            deleteBook(book.id)
            navigate('/books', { replace: true })
          }}
          onBlur={() => setConfirmDelete(false)}
        >
          <Trash size={16} /> {confirmDelete ? 'Wirklich löschen? Seiten und Termine gehen verloren' : 'Buch löschen'}
        </button>
      </Item>

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'toc' ? 'Inhaltsverzeichnis' : 'Seiten hinzufügen'} wide>
        {sheet && (
          <AddPages
            key={sheet}
            book={book}
            mode={sheet}
            onDone={(m) => {
              setSheet(null)
              setNote(m)
            }}
          />
        )}
      </Sheet>

      <Sheet open={edit !== null} onClose={() => setEdit(null)} title={edit ? `Seite ${edit.num ?? '?'}` : ''} wide>
        {edit && (
          <EditPage
            key={edit.id}
            page={edit}
            onSave={(num, text) => {
              updatePage(book.id, edit.id, { num, text })
              setEdit(null)
            }}
            onDelete={() => {
              deletePage(book.id, edit.id)
              setEdit(null)
            }}
          />
        )}
      </Sheet>
    </Stagger>
  )
}

function EditPage({ page, onSave, onDelete }: { page: Page; onSave: (num: number | null, text: string) => void; onDelete: () => void }) {
  const [num, setNum] = useState(page.num === null ? '' : String(page.num))
  const [text, setText] = useState(page.text)
  return (
    <div className="grid gap-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        Seitenzahl
        <input inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 3))} className={`${field} w-24 text-center`} />
      </label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className={`${field} select-text font-mono text-xs leading-relaxed`} style={{ userSelect: 'text', WebkitUserSelect: 'text' }} aria-label="Text der Seite" />
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost press" onClick={onDelete}>
          <Trash size={16} /> Löschen
        </button>
        <button type="button" className="btn btn-primary press flex-1" disabled={!text.trim()} onClick={() => onSave(num ? Number(num) || null : null, text)}>
          Speichern
        </button>
      </div>
    </div>
  )
}
