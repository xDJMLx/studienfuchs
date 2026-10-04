import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Segmented } from '../../components/ui/controls'
import { Back, Camera, Close } from '../../components/ui/Icons'
import { blobToJpegBase64, preloadAi } from '../../lib/ai'
import { generateCards } from '../../lib/aiCards'
import { parseCards } from '../../lib/parseCards'
import { HELP_SUBJECTS, helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { AiNotice } from '../settings/AiNotice'
import { newRow, type Row } from '../upload/VocabTable'
import { CardTable } from './CardTable'

type Way = 'ai' | 'write'

const COUNTS = [10, 20, 30]
const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 font-semibold outline-none transition-colors focus:border-sky'

const EXAMPLES: Record<string, string> = {
  mathe: 'z. B. Bruchrechnen: Aufgaben mit Lösungen',
  deutsch: 'z. B. Stilmittel mit Beispielen',
  englisch: 'z. B. Vokabeln Unit 4: Shopping',
  biologie: 'z. B. Zellorganellen und ihre Aufgaben',
  geschichte: 'z. B. Die wichtigsten Daten der Französischen Revolution',
  physik: 'z. B. Formeln und Einheiten der Mechanik',
  chemie: 'z. B. Elemente und ihre Symbole',
  geografie: 'z. B. Hauptstädte und Flüsse Europas',
  politik: 'z. B. Staatsorgane und ihre Aufgaben',
  franzoesisch: 'z. B. Vokabeln zum Thema Essen und Trinken',
}

/** Neuer Stapel: von der KI erstellen lassen (Beschreibung und/oder Fotos) oder selbst schreiben. Vor dem Speichern prüft man alle Karten. */
export function DeckCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const addSet = useStore((s) => s.addSet)
  const [subject, setSubject] = useState(() => (helpSubject(params.get('fach') ?? '') ? (params.get('fach') as string) : (useStore.getState().mySubjects ?? []).find((id) => helpSubject(id)) ?? HELP_SUBJECTS[0].id))
  const sub = helpSubject(subject)
  const [way, setWay] = useState<Way>('ai')
  const [request, setRequest] = useState('')
  const [count, setCount] = useState(20)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [title, setTitle] = useState('')
  const [both, setBoth] = useState(!!sub?.lang)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => preloadAi(), [])
  useEffect(() => setBoth(!!helpSubject(subject)?.lang), [subject])
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  const run = async () => {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const images = await Promise.all(files.map((f) => blobToJpegBase64(f)))
      const vocab = await generateCards({ subjectId: subject, request, count, images })
      if (!title) setTitle(vocab.title)
      setRows(vocab.items.map((i) => newRow(i.front, i.back, { example: i.example, exampleDe: i.exampleDe, note: i.note })))
      setNotice(vocab.items.length ? `${vocab.items.length} Karten erstellt. Lies sie kurz durch: Die KI kann sich irren.` : 'Die KI hat keine Karten gefunden. Beschreibe genauer, was du brauchst.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Das hat nicht geklappt.')
    } finally {
      setBusy(false)
    }
  }

  const fromText = () => {
    const { cards, incomplete } = parseCards(text)
    setRows(cards.map((c) => newRow(c.front, c.back)))
    setNotice(
      !cards.length
        ? 'Ich habe keine Karten erkannt. Schreibe pro Zeile: Frage – Antwort.'
        : incomplete
          ? `${incomplete} Zeile(n) hatten keine Antwort. Sie stehen unten mit leerer Rückseite: bitte ergänzen oder löschen.`
          : `${cards.length} Karten erkannt.`,
    )
  }

  const valid = useMemo(() => (rows ?? []).filter((r) => r.front.trim() && r.back.trim()), [rows])

  const save = () => {
    const items = valid.map((r) => ({
      front: r.front.trim(),
      back: r.back.trim(),
      ...(r.example?.trim() && r.exampleDe?.trim() ? { example: r.example.trim(), exampleDe: r.exampleDe.trim() } : {}),
      ...(r.note?.trim() ? { note: r.note.trim() } : {}),
    }))
    const id = addSet(title.trim() || 'Neuer Stapel', items, { subject, lang: sub?.lang, both })
    navigate(`/stapel/${id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 lg:py-8">
      <Link to={`/faecher/${subject}`} className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
        <Back size={18} /> {sub?.name ?? 'Fächer'}
      </Link>
      <h1 className="page-title mb-4">Neuer Stapel</h1>

      {!rows && (
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-bold text-muted">
            Fach
            <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {HELP_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <Segmented
            label="Wie erstellen?"
            className="w-full [&>button]:flex-1 [&>button]:py-2"
            value={way}
            onChange={setWay}
            options={[
              { value: 'ai' as Way, label: 'Von der KI' },
              { value: 'write' as Way, label: 'Selbst schreiben' },
            ]}
          />

          {way === 'ai' ? (
            <>
              <label className="grid gap-1.5 text-sm font-bold text-muted">
                Was brauchst du?
                <textarea
                  className={`${field} min-h-28 resize-y font-medium`}
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder={EXAMPLES[subject] ?? 'z. B. Das Thema, das ihr gerade im Unterricht habt'}
                  maxLength={1500}
                />
              </label>
              <div>
                <p className="mb-1.5 text-sm font-bold text-muted">Wie viele Karten?</p>
                <div className="flex gap-2" role="radiogroup" aria-label="Anzahl der Karten">
                  {COUNTS.map((n) => (
                    <button key={n} role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={`chip ${count === n ? 'chip-on' : ''}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-bold text-muted">Fotos von Heft, Buch oder Arbeitsblatt (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {previews.map((u, i) => (
                    <span key={u} className="relative">
                      <img src={u} alt={`Foto ${i + 1}`} className="h-20 w-16 rounded-lg border-2 border-line object-cover" />
                      <button type="button" aria-label={`Foto ${i + 1} entfernen`} onClick={() => setFiles((f) => f.filter((_, k) => k !== i))} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-surface">
                        <Close size={12} />
                      </button>
                    </span>
                  ))}
                  {files.length < 8 && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="press flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-xs font-bold text-muted hover:bg-snow">
                      <Camera size={22} />
                      Foto
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, 8))} />
              </div>
              <button type="button" className="btn btn-primary btn-shine press w-full sm:w-72" disabled={busy || (!request.trim() && !files.length)} onClick={run}>
                {busy ? 'Die KI schreibt die Karten …' : 'Karten erstellen'}
              </button>
              <AiNotice />
            </>
          ) : (
            <>
              <label className="grid gap-1.5 text-sm font-bold text-muted">
                Eine Karte pro Zeile: Frage – Antwort
                <textarea className={`${field} min-h-48 resize-y font-medium`} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Zellkern – steuert die Zelle\nMitochondrium – Kraftwerk der Zelle\nRibosom – baut Eiweiße'} />
              </label>
              <p className="-mt-2 text-sm text-muted">Du kannst auch Zeilen aus einer Tabelle einfügen. Getrennt wird bei Gedankenstrich, Strich, Semikolon, Doppelpunkt oder Tabulator.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary press w-full sm:w-72" disabled={!text.trim()} onClick={fromText}>
                  Weiter
                </button>
                <button type="button" className="btn btn-ghost press w-full sm:w-auto" onClick={() => { setRows([newRow(), newRow(), newRow()]); setNotice(null) }}>
                  Einzeln eintippen
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad-dark" role="alert">
          {error}
        </p>
      )}

      {rows && (
        <div className="grid gap-4">
          {notice && <p className="rounded-xl bg-snow p-3 text-sm font-semibold" role="status">{notice}</p>}
          <label className="grid gap-1.5 text-sm font-bold text-muted">
            Name des Stapels
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Zelle" maxLength={60} />
          </label>
          <CardTable rows={rows} onChange={setRows} lang={sub?.lang} />
          <label className="flex items-start gap-3 rounded-xl bg-snow p-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--sky)]" checked={both} onChange={(e) => setBoth(e.target.checked)} />
            <span>
              <b>Auch rückwärts abfragen</b>
              <span className="block text-muted">Dann kommt manchmal die Rückseite als Frage, zum Beispiel erst Begriff → Definition, später Definition → Begriff. Gut für Vokabeln und Begriffe.</span>
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" className="btn btn-primary press w-full sm:w-64" disabled={valid.length === 0} onClick={save}>
              Stapel speichern ({valid.length})
            </button>
            <button type="button" className="btn btn-ghost press w-full sm:w-auto" onClick={() => { setRows(null); setNotice(null) }}>
              Zurück
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

