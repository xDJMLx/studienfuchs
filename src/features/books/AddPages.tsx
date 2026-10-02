import { useRef, useState } from 'react'
import { Camera, Close, Plus } from '../../components/ui/Icons'
import { detectPageNumber, parseToc, type Book } from '../../lib/books'
import { useBooks } from '../../store/useBooks'
import { ocrEach } from '../upload/ocr'

const MAX_FILES = 12

interface PageRow {
  key: string
  num: string
  text: string
  /** Seitenzahl wurde nur vermutet (Vorgänger + 1) */
  guessed: boolean
}
interface ChapterRow {
  key: string
  title: string
  from: string
}

const key = () => Math.random().toString(36).slice(2, 9)
const toNum = (s: string): number | null => {
  const n = Number(s.trim())
  return s.trim() && Number.isInteger(n) && n >= 1 && n <= 999 ? n : null
}

/**
 * Seiten oder Inhaltsverzeichnis per Foto hinzufügen. Die Texterkennung läuft komplett auf dem Gerät,
 * gespeichert wird nur der Text (nie das Bild). Der Nutzer prüft das Ergebnis und speichert.
 */
export function AddPages({ book, mode, onDone }: { book: Book; mode: 'pages' | 'toc'; onDone: (message: string) => void }) {
  const { addPages, setChapters } = useBooks()
  const cam = useRef<HTMLInputElement>(null)
  const lib = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<PageRow[]>([])
  const [chapters, setChapterRows] = useState<ChapterRow[]>(() => book.chapters.map((c) => ({ key: c.id, title: c.title, from: String(c.from) })))

  const read = async (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, MAX_FILES)
    if (!files.length) return
    setError(null)
    try {
      setBusy('Text wird erkannt …')
      const texts = await ocrEach(files, (p) => setBusy(`Text wird erkannt (${p.fileIndex + 1}/${p.fileCount}) …`))
      if (mode === 'toc') {
        const found = parseToc(texts.join('\n'))
        if (!found.length) setError('Ich habe keine Kapitel mit Seitenzahl erkannt. Du kannst sie unten von Hand eintragen.')
        setChapterRows((prev) => [...prev, ...found.map((c) => ({ key: key(), title: c.title, from: String(c.from) }))])
      } else {
        setRows((prev) => {
          const out = [...prev]
          for (const t of texts) {
            const found = detectPageNumber(t)
            const last = toNum(out[out.length - 1]?.num ?? '')
            const guess = found === null && last !== null ? last + 1 : null
            out.push({ key: key(), num: String(found ?? guess ?? ''), text: t.trim(), guessed: found === null && guess !== null })
          }
          return out
        })
      }
    } catch (e) {
      setError(e instanceof Error ? `Die Texterkennung hat nicht geklappt (${e.message}).` : 'Die Texterkennung hat nicht geklappt.')
    } finally {
      setBusy(null)
      if (cam.current) cam.current.value = ''
      if (lib.current) lib.current.value = ''
    }
  }

  const savePages = () => {
    const valid = rows.filter((r) => r.text.trim())
    const replaced = addPages(book.id, valid.map((r) => ({ num: toNum(r.num), text: r.text })))
    onDone(`${valid.length} ${valid.length === 1 ? 'Seite' : 'Seiten'} gespeichert${replaced ? `, ${replaced} ersetzt` : ''}.`)
  }
  const saveChapters = () => {
    const valid = chapters.filter((c) => c.title.trim() && toNum(c.from) !== null)
    setChapters(book.id, valid.map((c) => ({ title: c.title, from: toNum(c.from) as number })))
    onDone(`${valid.length} Kapitel gespeichert.`)
  }

  const input = 'rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none focus:border-brand'

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        {mode === 'pages'
          ? 'Fotografiere eine Seite nach der anderen, am besten von oben und gut beleuchtet. Der Text wird auf deinem Handy erkannt, das Foto wird nicht gespeichert.'
          : 'Fotografiere das Inhaltsverzeichnis oder trage die Kapitel von Hand ein. Die KI und die App wissen dann, welche Seiten zu welchem Kapitel gehören.'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!!busy} onClick={() => cam.current?.click()} className="btn btn-primary press">
          <Camera size={20} /> Foto
        </button>
        <button type="button" disabled={!!busy} onClick={() => lib.current?.click()} className="btn btn-ghost press">
          Aus Fotos
        </button>
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void read(e.target.files)} />
        <input ref={lib} type="file" accept="image/*" multiple hidden onChange={(e) => void read(e.target.files)} />
      </div>

      {busy && (
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark" role="status">
          {busy}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-medium text-bad-dark" role="alert">
          {error}
        </p>
      )}

      {mode === 'pages' ? (
        <>
          {rows.length === 0 && !busy && <p className="rounded-2xl bg-snow p-4 text-center text-sm text-muted">Noch keine Seite. Mach ein Foto, dann prüfst du hier Seitenzahl und Text.</p>}
          <ul className="grid gap-3">
            {rows.map((r, i) => (
              <li key={r.key} className="card grid gap-2 p-3">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    Seite
                    <input
                      inputMode="numeric"
                      value={r.num}
                      onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, num: e.target.value.replace(/\D/g, '').slice(0, 3), guessed: false } : x)))}
                      className={`${input} w-20 text-center`}
                      aria-label={`Seitenzahl von Foto ${i + 1}`}
                    />
                  </label>
                  {r.guessed && <span className="text-xs text-muted">vermutet, bitte prüfen</span>}
                  <button type="button" aria-label="Seite verwerfen" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="press ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-bad">
                    <Close size={16} />
                  </button>
                </div>
                <textarea
                  value={r.text}
                  onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, text: e.target.value } : x)))}
                  rows={6}
                  className={`${input} select-text font-mono text-xs leading-relaxed`}
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  aria-label={`Erkannter Text von Foto ${i + 1}`}
                />
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary press w-full" disabled={!rows.some((r) => r.text.trim())} onClick={savePages}>
            {rows.length > 1 ? `${rows.length} Seiten speichern` : 'Seite speichern'}
          </button>
        </>
      ) : (
        <>
          <ul className="grid gap-2">
            {chapters.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <input value={c.title} onChange={(e) => setChapterRows((l) => l.map((x) => (x.key === c.key ? { ...x, title: e.target.value } : x)))} placeholder="Kapitel, z. B. Unité 2" className={`${input} min-w-0 flex-1`} aria-label="Kapitelname" />
                <input
                  inputMode="numeric"
                  value={c.from}
                  onChange={(e) => setChapterRows((l) => l.map((x) => (x.key === c.key ? { ...x, from: e.target.value.replace(/\D/g, '').slice(0, 3) } : x)))}
                  placeholder="ab S."
                  className={`${input} w-20 text-center`}
                  aria-label="Erste Seite"
                />
                <button type="button" aria-label="Kapitel entfernen" onClick={() => setChapterRows((l) => l.filter((x) => x.key !== c.key))} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-bad">
                  <Close size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost press" onClick={() => setChapterRows((l) => [...l, { key: key(), title: '', from: '' }])}>
            <Plus size={18} /> Kapitel hinzufügen
          </button>
          <button type="button" className="btn btn-primary press w-full" onClick={saveChapters}>
            Kapitel speichern
          </button>
        </>
      )}
    </div>
  )
}
