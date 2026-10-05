import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Back, Camera, Close } from '../../components/ui/Icons'
import { blobToJpegBase64, preloadAi } from '../../lib/ai'
import { generateTest, LENGTHS, materialFrom, type TestLength } from '../../lib/aiTests'
import { activeDecks, cardRefs } from '../../lib/decks'
import { HELP_SUBJECTS, helpSubject } from '../../lib/subjects'
import { buildOfflineTest, TEST_KINDS, type TestKind } from '../../lib/tests'
import { useStore } from '../../store/useStore'
import { AiNotice } from '../settings/AiNotice'

const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 font-semibold outline-none transition-colors focus:border-sky'
const COUNTS = [10, 20, 30]
const DIRECTIONS = [
  { id: 'toForeign' as const, label: 'Deutsch → Fremdsprache' },
  { id: 'toGerman' as const, label: 'Fremdsprache → Deutsch' },
  { id: 'both' as const, label: 'Gemischt' },
]

/**
 * Test, Klassenarbeit oder Vokabeltest erstellen, für jedes Fach: von der KI (aus Thema, Karteikarten oder Fotos)
 * oder ohne KI aus den eigenen Karteikarten. Vokabeltests brauchen keine KI.
 */
export function TestCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const arbeiten = useStore((s) => s.arbeiten)
  const addTest = useStore((s) => s.addTest)
  const decks = useMemo(() => activeDecks({ sets, addedUnits: addedUnits ?? [] }), [sets, addedUnits])

  // Aus einer eingetragenen Arbeit: Fach, Thema und Karteikarten sind schon da
  const fromArbeit = (arbeiten ?? []).find((a) => a.id === params.get('arbeit'))
  const startSubject = fromArbeit?.subject ?? (helpSubject(params.get('fach') ?? '') ? (params.get('fach') as string) : (useStore.getState().mySubjects ?? []).find((id) => helpSubject(id)) ?? HELP_SUBJECTS[0].id)
  const startKind: TestKind = fromArbeit ? (fromArbeit.kind === 'vokabeltest' ? 'vokabeltest' : fromArbeit.kind === 'test' ? 'test' : 'arbeit') : TEST_KINDS.some((k) => k.id === params.get('art')) ? (params.get('art') as TestKind) : 'test'

  const [kind, setKind] = useState<TestKind>(startKind)
  const [subject, setSubject] = useState(startSubject)
  const [topic, setTopic] = useState(fromArbeit?.title ?? '')
  const [picked, setPicked] = useState<string[]>(fromArbeit?.deckIds ?? [])
  const [length, setLength] = useState<TestLength>('normal')
  const [count, setCount] = useState(20)
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]['id']>('toForeign')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sub = helpSubject(subject)

  useEffect(() => preloadAi(), [])
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  const subjectDecks = useMemo(() => decks.filter((d) => d.subject === subject), [decks, subject])
  // Beim Fachwechsel gehören nur Karteikarten des neuen Fachs zur Auswahl; bei Vokabeln sind alle Sprach-Karteikarten gleich dabei
  useEffect(() => {
    setPicked((p) => {
      const keep = p.filter((id) => subjectDecks.some((d) => d.id === id))
      if (keep.length || fromArbeit) return keep
      return kind === 'vokabeltest' ? subjectDecks.filter((d) => d.lang).map((d) => d.id) : []
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, kind, subjectDecks])

  const chosen = subjectDecks.filter((d) => picked.includes(d.id))
  const refs = useMemo(() => cardRefs(chosen), [chosen])
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const vokabel = kind === 'vokabeltest'
  const kindInfo = TEST_KINDS.find((k) => k.id === kind)!
  const newId = () => `test-${Date.now().toString(36)}`

  const finish = (test: Parameters<typeof addTest>[0]) => {
    addTest(test)
    navigate(`/test/${test.id}`, { replace: true })
  }

  const offline = () => {
    setError(null)
    const test = buildOfflineTest({
      refs,
      kind,
      subject,
      count: vokabel ? count : kind === 'arbeit' ? 24 : 12,
      direction,
      title: topic.trim() || chosen.map((d) => d.title).join(', ').slice(0, 60) || `${kindInfo.label} ${sub?.name ?? ''}`.trim(),
      id: newId(),
    })
    if (!test) {
      setError(refs.length ? 'Dafür sind es zu wenige Karteikarten (mindestens 3).' : 'Wähle Karteikarten aus, aus denen der Test entstehen soll.')
      return
    }
    finish(test)
  }

  const withAi = async () => {
    setError(null)
    setBusy(true)
    try {
      const images = await Promise.all(files.map((f) => blobToJpegBase64(f)))
      const { test } = await generateTest({
        subjectId: subject,
        kind: kind as Exclude<TestKind, 'vokabeltest'>,
        length,
        topic,
        material: refs.length ? materialFrom(refs.map((r) => r.item)) : undefined,
        source: topic.trim() ? `Thema: ${topic.trim()}` : chosen.length ? `Karteikarten: ${chosen.map((d) => d.title).join(', ')}` : 'Fotos',
        images,
        id: newId(),
      })
      finish(test)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Das hat nicht geklappt.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 lg:py-8">
      <Link to={fromArbeit ? '/kalender' : `/faecher/${subject}`} className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
        <Back size={18} /> {fromArbeit ? 'Kalender' : (sub?.name ?? 'Zurück')}
      </Link>
      <h1 className="page-title mb-1">{fromArbeit ? 'Probearbeit' : 'Test erstellen'}</h1>
      <p className="mb-4 text-muted">{fromArbeit ? `Zu „${fromArbeit.title}“: Üb unter echten Bedingungen, mit Punkten und ungefährer Note.` : 'Ein Test, eine Klassenarbeit oder ein Vokabeltest, mit Punkten und ungefährer Note am Ende.'}</p>

      <div className="grid gap-4">
        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">Was soll es sein?</p>
          <div className="grid gap-2" role="radiogroup" aria-label="Art">
            {TEST_KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)} className={`tile w-full !py-2.5 ${kind === k.id ? 'tile-selected' : ''}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px]">{k.label}</span>
                  <span className="block text-xs font-medium opacity-70">{k.text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-1.5 text-sm font-bold text-muted">
          Fach
          <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
            {HELP_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {!vokabel && (
          <label className="grid gap-1.5 text-sm font-bold text-muted">
            Thema oder Kapitel
            <textarea className={`${field} min-h-24 resize-y font-medium`} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="z. B. Zellbau und Zellorganellen" maxLength={600} />
          </label>
        )}

        <div>
          <p className="mb-1.5 text-sm font-bold text-muted">{vokabel ? 'Welche Vokabeln?' : 'Stoff aus deinen Karteikarten (optional)'}</p>
          {subjectDecks.length === 0 ? (
            <p className="rounded-xl bg-snow p-3 text-sm text-muted">
              In {sub?.name} gibt es noch keine Karteikarten.{' '}
              <Link to={`/stapel/neu?fach=${subject}`} className="font-extrabold text-sky-dark underline">
                Karteikarten erstellen
              </Link>
            </p>
          ) : (
            <ul className="grid gap-2">
              {subjectDecks.map((d) => {
                const on = picked.includes(d.id)
                return (
                  <li key={d.id}>
                    <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(d.id)} className={`tile w-full !py-2.5 ${on ? 'tile-selected' : ''}`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-current text-[13px] ${on ? 'bg-sky text-white' : ''}`}>{on ? '✓' : ''}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{d.title}</span>
                        <span className="block text-xs font-medium opacity-70">{d.items.length} Karten</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {vokabel ? (
          <>
            <div>
              <p className="mb-1.5 text-sm font-bold text-muted">Wie viele Wörter?</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Anzahl der Wörter">
                {COUNTS.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={`chip ${count === n ? 'chip-on' : ''}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-bold text-muted">Richtung</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Richtung">
                {DIRECTIONS.map((d) => (
                  <button key={d.id} type="button" role="radio" aria-checked={direction === d.id} onClick={() => setDirection(d.id)} className={`chip ${direction === d.id ? 'chip-on' : ''}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="mb-1.5 text-sm font-bold text-muted">Länge</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Länge">
                {LENGTHS.map((l) => (
                  <button key={l.id} type="button" role="radio" aria-checked={length === l.id} onClick={() => setLength(l.id)} className={`chip ${length === l.id ? 'chip-on' : ''}`}>
                    {l.label}
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
                {files.length < 6 && (
                  <button type="button" onClick={() => fileRef.current?.click()} className="press flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-xs font-bold text-muted hover:bg-snow">
                    <Camera size={22} />
                    Foto
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, 6))} />
            </div>
          </>
        )}

        {error && (
          <p className="rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad-dark" role="alert">
            {error}
            {!vokabel && refs.length >= 3 && ' Ohne KI geht es auch: aus deinen Karteikarten.'}
          </p>
        )}

        <div className="grid gap-2">
          {!vokabel && (
            <>
              <button type="button" className="btn btn-primary btn-shine press w-full" disabled={busy} onClick={withAi}>
                {busy ? 'Die KI schreibt den Test …' : `${kindInfo.label} von der KI erstellen`}
              </button>
              <AiNotice />
            </>
          )}
          <button type="button" className={`btn press w-full ${vokabel ? 'btn-primary' : 'btn-ghost'}`} disabled={busy} onClick={offline}>
            {vokabel ? 'Vokabeltest erstellen' : 'Ohne KI aus meinen Karteikarten'}
          </button>
        </div>

        {subject === 'franzoesisch' && !vokabel && (
          <Link to="/exam/new" className="card press flex items-center gap-3 p-3.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Französisch mit Hörverstehen</span>
              <span className="block text-muted">Klassenarbeit mit vorgelesenen Texten und Schreibaufgabe.</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
