import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Close } from '../../components/ui/Icons'
import { BackLink } from '../../components/ui/BackLink'
import { blobToJpegBase64, preloadAi } from '../../lib/ai'
import { generateCards } from '../../lib/aiCards'
import { SubjectShape } from '../../components/ui/SubjectShape'
import { defaultPlan, generateTasks, PLAN_LABEL, type TaskPlan } from '../../lib/aiTasks'
import { itemFromTask } from '../../lib/tasks'
import { cardsFromNotes } from '../../lib/notesToCards'
import { parseCards } from '../../lib/parseCards'
import { HELP_SUBJECTS, helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { AiNotice } from '../settings/AiNotice'
import { newRow, type Row } from '../upload/VocabTable'
import { CardTable } from './CardTable'
import { TemplateList } from './TemplateList'
import { templatesFor } from '../../content/templates'

type Way = 'ai' | 'notizen' | 'write' | 'vorlage'

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

/** Neue Karteikarten: von der KI erstellen lassen (Beschreibung und/oder Fotos) oder selbst schreiben. Vor dem Speichern prüft man alle Karten. */
/** Farbe und Form der drei Arten (wie bei den Fächern). */
const PLAN_LOOK: Record<TaskPlan, { c: string; shape: string }> = {
  karten: { c: '#2f6bff', shape: 'englisch' },
  aufgaben: { c: '#e5484d', shape: 'mathe' },
  rechnen: { c: '#1fb866', shape: 'franzoesisch' },
}

/** Schnelle Anweisungen für die KI, wenn Fotos dabei sind (man muss selten alles auf einer Seite lernen). */
const PHOTO_HINTS = ['Nur die Vokabeln', 'Nur das Fettgedruckte', 'Nur Merksätze und Definitionen', 'Ohne Beispielsätze', 'Nur die Aufgaben vom Arbeitsblatt']

export function DeckCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const addSet = useStore((s) => s.addSet)
  const [subject, setSubject] = useState(() => (helpSubject(params.get('fach') ?? '') ? (params.get('fach') as string) : (useStore.getState().mySubjects ?? []).find((id) => helpSubject(id)) ?? HELP_SUBJECTS[0].id))
  const sub = helpSubject(subject)
  const [way, setWay] = useState<Way>('ai')
  const [request, setRequest] = useState('')
  const [count, setCount] = useState(20)
  // Was die KI machen soll: Karteikarten, Quiz & Aufgaben oder Rechenaufgaben (die App rechnet nach)
  const [plan, setPlan] = useState<TaskPlan>(() => defaultPlan(subject))
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [reading, setReading] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [title, setTitle] = useState('')
  const [both, setBoth] = useState(!!sub?.lang)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => preloadAi(), [])
  useEffect(() => setBoth(!!helpSubject(subject)?.lang), [subject])
  useEffect(() => setPlan(defaultPlan(subject)), [subject])
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
      if (plan === 'karten') {
        const vocab = await generateCards({ subjectId: subject, request, count, images })
        if (!title) setTitle(vocab.title)
        setRows(vocab.items.map((i) => newRow(i.front, i.back, { example: i.example, exampleDe: i.exampleDe, note: i.note })))
        setNotice(vocab.items.length ? `${vocab.items.length} Karten erstellt. Lies sie kurz durch: Die KI kann sich irren.` : 'Die KI hat keine Karten gefunden. Beschreibe genauer, was du brauchst.')
      } else {
        const res = await generateTasks({ subjectId: subject, plan, request, count, images })
        if (!title) setTitle(res.title)
        setRows(res.tasks.map((t, i) => {
          const it = itemFromTask(t, `x${i}`)
          return newRow(it.front, it.back, { task: t })
        }))
        const calcs = res.tasks.filter((t) => t.t === 'calc' || t.t === 'solve').length
        setNotice(
          res.tasks.length
            ? `${res.tasks.length} Aufgaben erstellt${calcs ? `, bei ${calcs} Rechenaufgaben hat die App das Ergebnis selbst ausgerechnet` : ''}${res.dropped ? ` (${res.dropped} unbrauchbare habe ich aussortiert)` : ''}. Schau sie kurz an: Die KI kann sich bei Fragen zum Wissen irren.`
            : 'Die KI hat keine brauchbaren Aufgaben geliefert. Beschreibe genauer, was du brauchst, oder versuch es nochmal.',
        )
      }
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

  /** Text aus Fotos lesen: Die Texterkennung läuft auf dem Gerät, die Bilder verlassen es nicht. */
  const readPhotos = async () => {
    setError(null)
    setReading('Text wird erkannt …')
    try {
      const { ocrImages } = await import('../upload/ocr')
      const found = await ocrImages(files, (p) => setReading(`Text wird erkannt (Seite ${p.fileIndex + 1} von ${p.fileCount})`))
      setNotes((n) => (n.trim() ? n.trim() + '\n' : '') + found.trim())
      setFiles([])
    } catch (e) {
      setError(e instanceof Error ? 'Die Texterkennung hat nicht geklappt: ' + e.message : 'Die Texterkennung hat nicht geklappt.')
    } finally {
      setReading(null)
    }
  }

  const fromNotes = () => {
    const { cards, skipped } = cardsFromNotes(notes)
    setRows(cards.map((c) => newRow(c.front, c.back)))
    setNotice(
      cards.length
        ? `${cards.length} Karten vorgeschlagen${skipped ? `, ${skipped} Zeile(n) habe ich übersprungen` : ''}. Das sind Vorschläge aus deinem Text: Lies sie durch und ändere, was nicht passt.`
        : 'Aus diesem Text konnte ich keine Karten machen. Schreibe Merksätze („Die Zelle ist …“), Jahreszahlen („1789 Beginn …“) oder Paare („Frage – Antwort“).',
    )
  }

  const valid = useMemo(() => (rows ?? []).filter((r) => r.front.trim() && r.back.trim()), [rows])

  const save = (practice = false) => {
    const items = valid.map((r) => ({
      front: r.front.trim(),
      back: r.back.trim(),
      ...(r.example?.trim() && r.exampleDe?.trim() ? { example: r.example.trim(), exampleDe: r.exampleDe.trim() } : {}),
      ...(r.note?.trim() ? { note: r.note.trim() } : {}),
      ...(r.task ? { task: r.task } : {}),
    }))
    const id = addSet(title.trim() || (items.some((i) => i.task) ? 'Neue Aufgaben' : 'Neue Karteikarten'), items, { subject, lang: sub?.lang, both })
    navigate(practice ? `/ueben/los?deck=${id}` : `/stapel/${id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 lg:py-8">
      <BackLink to={`/faecher/${subject}`} label={sub?.name ?? 'Fächer'} size={18} />
      <h1 className="large-title mb-5">Neu erstellen</h1>

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

          <div>
            <p className="mb-1.5 text-sm font-bold text-muted">Was willst du erstellen?</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Art">
              {(Object.keys(PLAN_LABEL) as TaskPlan[]).map((p) => {
                const on = plan === p
                const look = PLAN_LOOK[p]
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setPlan(p)
                      if (p !== 'karten') setWay('ai')
                    }}
                    className={`shape-block press !min-h-[92px] ${on ? '' : 'shape-block-quiet'}`}
                    style={on ? ({ '--block': look.c, '--block-edge': `color-mix(in srgb, ${look.c} 55%, black)` } as React.CSSProperties) : undefined}
                  >
                    <SubjectShape id={look.shape} size={20} className={on ? 'text-white/95' : 'text-muted'} />
                    <span>
                      <span className="block text-[16px] font-extrabold leading-tight">{PLAN_LABEL[p].label}</span>
                      <span className="block text-xs font-medium opacity-80">{PLAN_LABEL[p].short}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {plan === 'karten' && (
            <div>
              <p className="mb-1.5 text-sm font-bold text-muted">Wie?</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wie erstellen?">
                {(
                  [
                    { id: 'ai' as Way, label: 'Von der KI' },
                    { id: 'notizen' as Way, label: 'Aus Notizen' },
                    { id: 'write' as Way, label: 'Selbst schreiben' },
                    ...(templatesFor(subject).length ? [{ id: 'vorlage' as Way, label: 'Fertige' }] : []),
                  ] as { id: Way; label: string }[]
                ).map((w) => (
                  <button key={w.id} type="button" role="radio" aria-checked={way === w.id} onClick={() => { setWay(w.id); if (w.id === 'write') { setRows([newRow(), newRow(), newRow()]); setNotice(null) } }} className={`chip ${way === w.id ? 'chip-on' : ''}`}>
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {way === 'notizen' ? (
            <>
              <label className="grid gap-1.5 text-sm font-bold text-muted">
                Deine Notizen oder dein Heft-Text
                <textarea className={`${field} min-h-48 resize-y font-medium`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={'Die Zelle ist die kleinste lebende Einheit.\n1789 Beginn der Französischen Revolution\nMitochondrien – Kraftwerke der Zelle'} />
              </label>
              <p className="-mt-2 text-sm text-muted">Ohne KI, nur auf deinem Gerät: Merksätze werden zu Fragen („Was ist …?“), Jahreszahlen zu „Was geschah …?“, Paare („Frage – Antwort“) bleiben Paare.</p>
              <div>
                <p className="mb-1.5 text-sm font-bold text-muted">Oder ein Foto: Der Text wird auf dem Gerät gelesen</p>
                <div className="flex flex-wrap items-center gap-2">
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
                  {files.length > 0 && (
                    <button type="button" className="btn btn-ghost press !min-h-10 !px-4 !text-sm" disabled={reading !== null} onClick={readPhotos}>
                      {reading ?? 'Text aus Fotos lesen'}
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, 8))} />
              </div>
              <button type="button" className="btn btn-primary press w-full sm:w-72" disabled={!notes.trim()} onClick={fromNotes}>
                Karten vorschlagen
              </button>
            </>
          ) : way === 'vorlage' ? (
            <>
              <p className="text-sm text-muted">Grundwissen, das in fast jedem Unterricht vorkommt. Du kannst die Karten danach bearbeiten und eigene ergänzen. Dein Lehrer setzt vielleicht andere Schwerpunkte: Gleiche es mit deinem Unterricht ab.</p>
              <TemplateList subject={subject} onAdded={(id) => navigate(`/stapel/${id}`, { replace: true })} />
            </>
          ) : way === 'ai' ? (
            <>
              <div>
                <p className="mb-1.5 text-sm font-bold text-muted">Foto von Heft, Buch oder Arbeitsblatt (optional)</p>
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
              <label className="grid gap-1.5 text-sm font-bold text-muted">
                {files.length > 0 ? 'Was soll die KI aus den Fotos machen?' : 'Was brauchst du?'}
                <textarea
                  className={`${field} min-h-28 resize-y font-medium`}
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder={files.length > 0 ? 'z. B. Nur die Vokabeln von Lektion 3, die Grammatik brauche ich nicht' : (EXAMPLES[subject] ?? 'z. B. Das Thema, das ihr gerade im Unterricht habt')}
                  maxLength={1500}
                />
              </label>
              {files.length > 0 && (
                <div className="-mt-2 flex flex-wrap gap-2" aria-label="Vorschläge für die Anweisung">
                  {PHOTO_HINTS.map((h) => (
                    <button key={h} type="button" className="chip !min-h-9 !text-[13px]" onClick={() => setRequest((r) => (r.trim() ? `${r.trim()}. ${h}` : h))}>
                      + {h}
                    </button>
                  ))}
                </div>
              )}
              <details className="group rounded-2xl border border-line bg-surface px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-extrabold">
                  <span>
                    Weitere Optionen
                    <span className="ml-2 text-[13px] font-semibold text-muted">
                      {count} {plan === 'karten' ? 'Karten' : 'Aufgaben'}
                      {files.length > 0 ? `, ${files.length} ${files.length === 1 ? 'Foto' : 'Fotos'}` : ''}
                    </span>
                  </span>
                  <span className="text-muted transition-transform group-open:rotate-90" aria-hidden>›</span>
                </summary>
                <div className="mt-3 grid gap-4">
              <div>
                <p className="mb-1.5 text-sm font-bold text-muted">{plan === 'karten' ? 'Wie viele Karten?' : 'Wie viele Aufgaben?'}</p>
                <div className="flex gap-2" role="radiogroup" aria-label="Anzahl">
                  {COUNTS.map((n) => (
                    <button key={n} role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={`chip ${count === n ? 'chip-on' : ''}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
                </div>
              </details>
              <button type="button" className="btn btn-primary press w-full sm:w-72" disabled={busy || (!request.trim() && !files.length)} onClick={run}>
                {busy ? 'Die KI schreibt …' : plan === 'karten' ? 'Karten erstellen' : 'Aufgaben erstellen'}
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
        <div className="mt-4 rounded-xl bg-bad-soft p-3 text-sm text-bad-dark" role="alert">
          <p className="font-semibold">{error}</p>
          <p className="mt-1">
            Ohne KI geht es auch: aus{' '}
            <button type="button" className="font-extrabold underline" onClick={() => { setError(null); setWay('notizen') }}>deinen Notizen</button>
            , oder du kannst die Karten{' '}
            <button type="button" className="font-extrabold underline" onClick={() => { setError(null); setWay('write') }}>selbst schreiben</button>
            {templatesFor(subject).length > 0 && (
              <>
                {' '}oder{' '}
                <button type="button" className="font-extrabold underline" onClick={() => { setError(null); setWay('vorlage') }}>fertige Karteikarten nehmen</button>
              </>
            )}
            .
          </p>
        </div>
      )}

      {rows && (
        <div className="grid gap-4">
          {notice && <p className="rounded-xl bg-snow p-3 text-sm font-semibold" role="status">{notice}</p>}
          <label className="grid gap-1.5 text-sm font-bold text-muted">
            Name
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Zelle" maxLength={60} />
          </label>
          <CardTable rows={rows} onChange={setRows} lang={sub?.lang} />
          {!valid.every((r) => r.task) && (
          <label className="flex items-start gap-3 rounded-xl bg-snow p-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--sky)]" checked={both} onChange={(e) => setBoth(e.target.checked)} />
            <span>
              <b>Auch rückwärts abfragen</b>
              <span className="block text-muted">Dann kommt manchmal die Rückseite als Frage, zum Beispiel erst Begriff → Definition, später Definition → Begriff. Gut für Vokabeln und Begriffe.</span>
            </span>
          </label>
          )}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" className="btn btn-primary press w-full sm:w-64" disabled={valid.length === 0} onClick={() => save(true)}>
              Speichern und üben ({valid.length})
            </button>
            <button type="button" className="btn btn-ghost press w-full sm:w-auto" disabled={valid.length === 0} onClick={() => save(false)}>
              Nur speichern
            </button>
            <button type="button" className="btn btn-ghost press w-full sm:w-auto" onClick={() => { setRows(null); setNotice(null) }}>
              {way === 'write' && !valid.length ? 'Viele auf einmal einfügen' : 'Zurück'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

