import { useEffect, useRef, useState } from 'react'
import { Mascot } from '../../components/mascot/Mascot'
import { Camera, Close, Sparkle } from '../../components/ui/Icons'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { blobToJpegBase64, isAiReady, preloadAi } from '../../lib/ai'
import { generateCards } from '../../lib/aiCards'
import { helpSubject } from '../../lib/subjects'
import { topicSuggestions } from '../../lib/topics'
import type { AiItem } from '../../lib/ai'
import { useStore } from '../../store/useStore'

const COUNT = 12

/**
 * Die ersten Karteikarten in einem Bildschirm: Fach wählen, Thema antippen (oder selbst schreiben, oder ein Foto vom Heft), die KI macht
 * die Karten, man schaut sie kurz an und startet sofort die erste Runde. Wird in der Einrichtung und auf dem leeren Üben-Bildschirm benutzt.
 */
export function QuickCards({ subjects, grade, onStart, onSkip, skipLabel = 'Später', instant = true }: { subjects: string[]; grade: number; onStart: (setId: string) => void; onSkip?: () => void; skipLabel?: string; /** Ein Tipp auf einen Themenvorschlag startet die KI gleich (sonst füllt er nur das Feld) */ instant?: boolean }) {
  const addSet = useStore((s) => s.addSet)
  const ids = subjects.filter((id) => helpSubject(id))
  const [subject, setSubject] = useState(ids[0] ?? 'sonstiges')
  const [topic, setTopic] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [phase, setPhase] = useState<'ask' | 'busy' | 'preview' | 'error'>('ask')
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<AiItem[]>([])
  const [ready, setReady] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const sub = helpSubject(subject)
  const suggestions = topicSuggestions(subject, grade)

  useEffect(() => {
    preloadAi()
    void isAiReady().then(setReady)
  }, [])

  const run = async (override?: string) => {
    const request = override ?? topic
    setPhase('busy')
    setError('')
    try {
      const images = await Promise.all(files.map((f) => blobToJpegBase64(f)))
      const vocab = await generateCards({ subjectId: subject, request, count: COUNT, images })
      if (vocab.items.length === 0) throw new Error('Die KI hat keine Karten gefunden. Schreib genauer, was ihr lernt, oder nimm ein anderes Thema.')
      setItems(vocab.items)
      setTitle(request.trim() ? request.trim().slice(0, 50) : vocab.title)
      setPhase('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Das hat nicht geklappt.')
      setPhase('error')
    }
  }

  const start = () => {
    const id = addSet(
      title || 'Meine ersten Karten',
      items.map((i) => ({ front: i.front, back: i.back, ...(i.example && i.exampleDe ? { example: i.example, exampleDe: i.exampleDe } : {}), ...(i.note ? { note: i.note } : {}) })),
      { subject, lang: sub?.lang, both: !!sub?.lang },
    )
    onStart(id)
  }

  if (phase === 'busy') {
    return (
      <div className="flex flex-col items-center py-8 text-center" role="status" aria-live="polite">
        <Mascot size={110} mood="think" alive />
        <p className="mt-3 text-[19px] font-black">Die KI schreibt deine Karten …</p>
        <p className="mt-1 text-sm text-muted">{ready ? 'Das dauert nur ein paar Sekunden.' : 'Beim ersten Mal öffnet sich kurz ein Fenster von Puter (kostenlos, ohne E-Mail). Lass es offen, es schließt sich selbst.'}</p>
        <div className="mt-5 grid w-full max-w-sm gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-snow" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'preview') {
    const shown = items.slice(0, 5)
    return (
      <div>
        <p className="mb-1 text-[15px] font-bold text-muted">{sub?.name} · {items.length} Karten</p>
        <h2 className="mb-3 text-[22px] font-black leading-tight">{title}</h2>
        <ul className="list mb-2" style={{ '--inset': '1rem' } as React.CSSProperties}>
          {shown.map((c, i) => (
            <li key={i} className="row !block !py-2.5">
              <span className="block text-[16px] font-extrabold leading-tight">{c.front}</span>
              <span className="block text-[14px] text-muted">{c.back}</span>
            </li>
          ))}
        </ul>
        {items.length > shown.length && <p className="mb-3 px-1 text-sm text-muted">und {items.length - shown.length} weitere. Die KI kann sich irren: Schau sie dir beim Üben an.</p>}
        <button type="button" className="btn btn-primary btn-shine press w-full" onClick={start} autoFocus>
          Los geht’s, erste Runde
        </button>
        <div className="mt-1 flex justify-center">
          <button type="button" className="press min-h-11 rounded-xl px-3 text-sm font-extrabold text-sky-dark" onClick={() => void run()}>
            Andere Karten
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {ids.length > 1 && (
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Fach">
          {ids.map((id) => {
            const s = helpSubject(id)!
            const on = id === subject
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => { setSubject(id); setTopic('') }} className={`chip shrink-0 !pl-2 ${on ? 'chip-on' : ''}`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: s.c }}>
                  <HelpSubjectIcon id={id} ink={s.c} size={15} />
                </span>
                {s.name}
              </button>
            )
          })}
        </div>
      )}

      <p className="mb-2 text-[15px] font-extrabold">Was lernt ihr gerade in {sub?.name ?? 'dem Fach'}?</p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Themenvorschläge">
        {suggestions.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTopic(t)
              if (instant) void run(t)
            }}
            className={`chip !min-h-10 !text-[13px] ${topic === t ? 'chip-on' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>
      <label htmlFor="quick-topic" className="sr-only">
        Thema
      </label>
      <input
        id="quick-topic"
        className="w-full rounded-xl border-2 border-line bg-snow px-3 py-3 text-[16px] font-semibold outline-none transition-colors focus:border-sky"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Oder selbst schreiben …"
        maxLength={200}
        onKeyDown={(e) => e.key === 'Enter' && (topic.trim() || files.length) && void run()}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="press flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold text-sky-dark" onClick={() => fileRef.current?.click()}>
          <Camera size={18} /> Foto vom Heft
        </button>
        {files.length > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-sky-soft py-1 pl-3 pr-1 text-sm font-bold text-sky-dark">
            {files.length} {files.length === 1 ? 'Foto' : 'Fotos'}
            <button type="button" aria-label="Fotos entfernen" className="press flex h-7 w-7 items-center justify-center rounded-full" onClick={() => setFiles([])}>
              <Close size={14} />
            </button>
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" aria-label="Fotos auswählen" onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, 4))} />
      </div>

      {phase === 'error' && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad-dark">
          {error}
        </p>
      )}

      <button type="button" className="btn btn-primary btn-shine press mt-4 w-full" disabled={!topic.trim() && files.length === 0} onClick={() => void run()}>
        <Sparkle size={18} /> {phase === 'error' ? 'Nochmal versuchen' : 'Karteikarten machen'}
      </button>
      {!ready && phase === 'ask' && <p className="mt-2 text-center text-xs text-muted">Die KI ist kostenlos. Beim ersten Mal öffnet sich kurz ein Fenster von Puter, ohne E-Mail und ohne Passwort.</p>}
      {onSkip && (
        <div className="mt-1 flex justify-center">
          <button type="button" className="press min-h-11 rounded-xl px-3 text-sm font-extrabold text-muted" onClick={onSkip}>
            {skipLabel}
          </button>
        </div>
      )}
    </div>
  )
}
