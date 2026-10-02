import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Back, Camera, Close } from '../../components/ui/Icons'
import { AiError, blobToJpegBase64, ensureAiReady, extractVocabFromImages } from '../../lib/ai'
import { parseVocabDetailed } from '../../lib/parseVocab'
import { useStore } from '../../store/useStore'
import { AiNotice } from '../settings/AiNotice'
import { ocrImages } from './ocr'
import { fixRowAccents, newRow, VocabTable, type Row } from './VocabTable'

type Source = 'photo' | 'manual'
type Method = 'ai' | 'ocr'

const SOURCES: { id: Source; label: string; hint: string }[] = [
  { id: 'photo', label: 'Fotos', hint: 'Seiten abfotografieren' },
  { id: 'manual', label: 'Von Hand', hint: 'selbst eintippen' },
]

/** Neues Lernset: aus Fotos von Buchseiten oder von Hand. Mit KI (genau, erzeugt auch Beispielsätze) oder offline per Texterkennung. */
export function CreateSetPage() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const addSet = useStore((s) => s.addSet)

  const [source, setSource] = useState<Source>('photo')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [raw, setRaw] = useState('')
  const [hint, setHint] = useState('')
  const [method, setMethod] = useState<Method>('ai')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState<{ label: string; pct: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Vorschaubilder der Fotos
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  const addFiles = useCallback((list: FileList | File[] | null) => {
    const imgs = Array.from(list ?? []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(f.name))
    if (!imgs.length) return setError('Das sind keine Bilder. Wähle Fotos (JPG, PNG).')
    setError(null)
    setFiles((prev) => [...prev, ...imgs].slice(0, 12))
  }, [])

  // Einfügen aus der Zwischenablage (Screenshot, kopiertes Bild)
  useEffect(() => {
    if (source !== 'photo') return
    const onPaste = (e: ClipboardEvent) => {
      const imgs = Array.from(e.clipboardData?.files ?? [])
      if (imgs.length) addFiles(imgs)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [source, addFiles])

  const toRowsFromText = (text: string) => {
    const { pairs, unmatched } = parseVocabDetailed(text)
    const list = [...pairs.map((p) => newRow(p.front, p.back)), ...unmatched.map((u) => newRow(u, ''))]
    setRows(list.length ? fixRowAccents(list) : [newRow(), newRow(), newRow()])
    setNotice(
      !pairs.length
        ? 'Ich habe keine Vokabelpaare erkannt. Prüfe den Text oder trage die Wörter von Hand ein.'
        : unmatched.length
          ? `${unmatched.length} Zeile(n) konnte ich nicht in zwei Spalten teilen. Sie stehen unten mit leerem Deutsch-Feld – bitte ergänzen oder löschen.`
          : null,
    )
  }

  const explain = (e: unknown) => (e instanceof Error ? e.message : 'Unbekannter Fehler.')

  const run = async () => {
    setError(null)
    setNotice(null)
    try {
      // Direkt aus dem Klick: legt beim ersten Mal das kostenlose KI-Gastkonto an (sonst blockt der Browser das Fenster)
      if (method === 'ai') await ensureAiReady()
      // 1) Seitenbilder besorgen
      const blobs: Blob[] = files
      if (!blobs.length) {
        setError('Wähle zuerst Seiten aus.')
        return
      }

      // 2) Vokabeln herausziehen
      if (method === 'ai') {
        setBusy({ label: 'Die KI liest die Seiten …', pct: 0.3 })
        const images = await Promise.all(blobs.map((b) => blobToJpegBase64(b)))
        const vocab = await extractVocabFromImages(images, hint, (d, t) => setBusy({ label: `Die KI liest die Seiten … (${d}/${t})`, pct: 0.3 + 0.65 * (d / t) }))
        if (!title) setTitle(vocab.title)
        setRows(vocab.items.length ? fixRowAccents(vocab.items.map((i) => newRow(i.front, i.back, { example: i.example, exampleDe: i.exampleDe, note: i.note }))) : [newRow(), newRow(), newRow()])
        setNotice(
          vocab.items.length
            ? `${vocab.items.length} Karten erstellt, inklusive Beispielsätzen. Bitte kurz prüfen.`
            : 'Die KI hat keine Vokabeln gefunden. Probiere andere Seiten oder einen Hinweis (z. B. „nur die Vokabelspalte“).',
        )
      } else {
        const text = await ocrImages(blobs, (p) => setBusy({ label: `Text wird erkannt (Seite ${p.fileIndex + 1}/${p.fileCount})`, pct: 0.3 + 0.65 * ((p.fileIndex + p.progress) / p.fileCount) }))
        setRaw(text)
        toRowsFromText(text)
      }
    } catch (e) {
      setError(
        method === 'ocr' && !(e instanceof AiError)
          ? `Die Texterkennung hat nicht geklappt (${explain(e)}). Du kannst es mit der KI versuchen oder den Text einfügen.`
          : explain(e),
      )
    } finally {
      setBusy(null)
    }
  }

  const save = () => {
    const valid = (rows ?? []).filter((r) => r.front.trim() && r.back.trim())
    if (!valid.length) return
    const id = addSet(
      title.trim() || `Set vom ${new Date().toLocaleDateString('de-DE')}`,
      valid.map((r) => ({
        front: r.front.trim(),
        back: r.back.trim(),
        ...(r.example?.trim() && r.exampleDe?.trim() ? { example: r.example.trim(), exampleDe: r.exampleDe.trim() } : {}),
        ...(r.note?.trim() ? { note: r.note.trim() } : {}),
      })),
    )
    navigate(`/sets/${id}`, { replace: true })
  }

  const validCount = (rows ?? []).filter((r) => r.front.trim() && r.back.trim()).length
  const canRun = files.length > 0
  const field = 'w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]'

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <Link to="/sets" className="mb-1 press -ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted hover:text-ink">
        <Back size={18} /> Meine Sets
      </Link>
      <h1 className="page-title">Neues Set</h1>
      <p className="mb-6 mt-1 text-muted">Seiten aus deinem Schulbuch abfotografieren, den Rest übernimmt die App. Oder Wörter selbst eintippen: fehlende Akzente ergänzt die App von allein.</p>

      <AnimatePresence mode="wait" initial={false}>
        {!rows ? (
          <motion.div key="source" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            <p className="eyebrow mb-2">1 · Woher kommen die Vokabeln?</p>
            <div className="mb-5 grid grid-cols-2 gap-2" role="tablist">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={source === s.id}
                  onClick={() => {
                    setSource(s.id)
                    setError(null)
                    if (s.id === 'manual') setRows([newRow(), newRow(), newRow()])
                  }}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${source === s.id ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-surface hover:bg-snow'}`}
                >
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-xs text-muted">{s.hint}</span>
                </button>
              ))}
            </div>

            {source === 'photo' && (
              <div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDrag(true)
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDrag(false)
                    addFiles(e.dataTransfer.files)
                  }}
                  className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${drag ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
                    <Camera size={28} />
                  </span>
                  <p className="font-semibold">Fotos hierher ziehen oder auswählen</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button className="btn btn-primary !px-4 !py-2 !text-sm" onClick={() => inputRef.current?.click()}>
                      Dateien wählen
                    </button>
                    <label className="btn btn-ghost cursor-pointer !px-4 !py-2 !text-sm">
                      Foto aufnehmen
                      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
                    </label>
                  </div>
                  <p className="text-xs text-muted">Du kannst auch ein Bild aus der Zwischenablage einfügen (Strg+V). Bis zu 12 Seiten.</p>
                  <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
                </div>
                {previews.length > 0 && (
                  <ul className="mt-4 flex gap-3 overflow-x-auto pb-2">
                    {previews.map((u, i) => (
                      <motion.li key={u} layout initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative shrink-0">
                        <img src={u} alt={`Seite ${i + 1}`} className="h-32 rounded-xl border border-line object-cover" />
                        <button
                          type="button"
                          aria-label={`Seite ${i + 1} entfernen`}
                          onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-surface shadow"
                        >
                          <Close size={12} />
                        </button>
                        <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 text-[11px] font-medium text-white">{i + 1}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {source === 'photo' && (
              <div className="mt-6">
                <p className="eyebrow mb-2">2 · Wie sollen die Karten entstehen?</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                  <button role="radio" aria-checked={method === 'ai'} onClick={() => setMethod('ai')} className={`rounded-xl border p-4 text-left transition-colors ${method === 'ai' ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-snow'}`}>
                    <span className="flex items-center gap-2 font-semibold">
                      Mit KI <span className="rounded-md bg-brand-strong px-1.5 text-[11px] font-semibold text-on-brand">empfohlen</span>
                    </span>
                    <span className="mt-1 block text-sm text-muted">Kostenlos und ohne eigenen Schlüssel. Liest Tabellen und Spalten sicher, korrigiert Akzente und schreibt Beispielsätze dazu.</span>
                  </button>
                  <button role="radio" aria-checked={method === 'ocr'} onClick={() => setMethod('ocr')} className={`rounded-xl border p-4 text-left transition-colors ${method === 'ocr' ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-snow'}`}>
                    <span className="font-semibold">Offline (Texterkennung)</span>
                    <span className="mt-1 block text-sm text-muted">Kostenlos, nichts verlässt dein Gerät. Du musst danach mehr korrigieren.</span>
                  </button>
                </div>
                {method === 'ai' && (
                  <div className="mt-4">
                    <AiNotice className="mb-4" />
                    <label htmlFor="hint" className="mb-1 block text-sm font-medium">
                      Welche Vokabeln genau? <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="z. B. nur die Vokabeln von Lektion 3, ohne Zahlen" className={field} />
                  </div>
                )}
                <button className="btn btn-primary mt-5 w-full sm:w-auto" disabled={!canRun || !!busy} onClick={run}>
                  {method === 'ai' ? 'Mit KI Lernset erstellen' : 'Text erkennen'}
                </button>
              </div>
            )}

            <AnimatePresence>
              {busy && (
                <motion.div key="busy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-xl border border-line bg-surface p-4" role="status">
                  <p className="mb-2 text-sm font-medium">{busy.label}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-snow">
                    <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${Math.round(busy.pct * 100)}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {error && (
              <p className="mt-4 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad-dark" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div key="review" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {notice && <p className="mb-4 rounded-xl bg-brand-soft p-3 text-sm font-medium text-brand-dark">{notice}</p>}
            {error && (
              <p className="mb-4 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad-dark" role="alert">
                {error}
              </p>
            )}
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Name des Sets
            </label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Unité 3 – Vokabeln" className={`mb-5 font-medium ${field}`} />
            <VocabTable rows={rows} onChange={setRows} />
            {raw && (
              <details className="mt-4 text-sm text-muted">
                <summary className="cursor-pointer font-medium">Erkannten Rohtext ansehen</summary>
                <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} className="mt-2 w-full rounded-xl border border-line bg-surface p-2 font-mono text-xs" />
                <button className="btn btn-ghost mt-2 !px-3 !py-2 !text-sm" onClick={() => toRowsFromText(raw)}>
                  Neu erkennen
                </button>
              </details>
            )}
            <div className="sticky bottom-20 mt-6 flex gap-3 rounded-2xl bg-page/90 py-3 backdrop-blur lg:bottom-4">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setRows(null)
                  setNotice(null)
                }}
              >
                Zurück
              </button>
              <button className="btn btn-primary flex-1" disabled={!validCount} onClick={save}>
                {validCount} Karten speichern
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
