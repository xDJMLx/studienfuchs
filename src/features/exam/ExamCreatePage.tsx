import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Back, Sparkle } from '../../components/ui/Icons'
import { grades, units } from '../../content'
import { AiError, ensureAiReady } from '../../lib/ai'
import { askAi, NeedAccountError } from '../../lib/aiAsk'
import { sortedPages } from '../../lib/books'
import { buildExamPrompt, buildVocabTest, parseExamReply, type ExamData } from '../../lib/exam'
import { useBooks } from '../../store/useBooks'
import { useExams } from '../../store/useExams'
import { useStore } from '../../store/useStore'

type Source = 'book' | 'unit' | 'set' | 'topic'

const field = 'rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none focus:border-brand'

/** Test oder Klassenarbeit erstellen: aus dem Buch, dem Kurs, einer Liste oder einem Thema. Die KI baut die Arbeit, der Kurztest aus Kurs und Listen geht auch ohne KI. */
export function ExamCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const grade = useStore((s) => s.grade)
  const sets = useStore((s) => s.sets)
  const books = useBooks((s) => s.books)
  const addExam = useExams((s) => s.addExam)

  const [type, setType] = useState<ExamData['type']>(params.get('type') === 'kurztest' ? 'kurztest' : 'arbeit')
  const startBook = params.get('book') ?? books[0]?.id ?? ''
  const [source, setSource] = useState<Source>(params.get('set') ? 'set' : params.get('book') ? 'book' : books.length ? 'book' : 'unit')
  const [bookId, setBookId] = useState(startBook)
  const [from, setFrom] = useState(params.get('from') ?? '')
  const [to, setTo] = useState(params.get('to') ?? '')
  const gradeUnits = useMemo(() => units.filter((u) => u.grade === (grades.includes(grade) ? grade : grades[0])), [grade])
  const [unitId, setUnitId] = useState(gradeUnits[0]?.id ?? '')
  const [setId, setSetId] = useState(params.get('set') ?? sets[0]?.id ?? '')
  const [topic, setTopic] = useState('')
  const [size, setSize] = useState(params.get('type') === 'kurztest' ? 15 : 45)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needAccount, setNeedAccount] = useState(false)

  const book = books.find((b) => b.id === bookId)
  const usesAi = type === 'arbeit' || source === 'book' || source === 'topic'

  const create = async () => {
    setError(null)
    setNeedAccount(false)
    // Direkt aus dem Klick bleiben, solange es geht (Anmeldefenster)
    setBusy(true)
    try {
      const unit = units.find((u) => u.id === unitId)
      const set = sets.find((s) => s.id === setId)
      let exam: ExamData | null = null
      let sourceText = ''
      let words: string[] = []
      let bookText = ''
      let topicText = ''
      if (source === 'book') {
        if (!book) throw new AiError('Wähle zuerst ein Buch.')
        const a = Number(from)
        const b = Number(to)
        if (!(a >= 1 && b >= a)) throw new AiError('Gib an, von welcher bis zu welcher Seite der Stoff geht.')
        const pages = sortedPages(book).filter((p) => p.num !== null && p.num >= a && p.num <= b)
        if (!pages.length) throw new AiError(`Von Seite ${a} bis ${b} sind noch keine Seiten im Buch gespeichert. Lege sie unter Bücher an.`)
        bookText = pages.map((p) => `--- Seite ${p.num} ---\n${p.text}`).join('\n')
        sourceText = `${book.title}, Seite ${a}${b > a ? `–${b}` : ''}`
        topicText = sourceText
      } else if (source === 'unit') {
        if (!unit) throw new AiError('Wähle eine Einheit.')
        const items = unit.lessons.filter((l) => !l.review && !l.test).flatMap((l) => l.items)
        sourceText = `${unit.title} (Klasse ${unit.grade})`
        topicText = unit.title
        words = items.map((i) => `${i.front} = ${i.back}`)
        if (type === 'kurztest') exam = buildVocabTest(items, { title: `Kurztest: ${unit.title}`, source: sourceText, count: size })
      } else if (source === 'set') {
        if (!set) throw new AiError('Wähle eine Liste.')
        sourceText = `Liste: ${set.title}`
        topicText = set.title
        words = set.items.map((i) => `${i.front} = ${i.back}`)
        if (type === 'kurztest') exam = buildVocabTest(set.items, { title: `Kurztest: ${set.title}`, source: sourceText, count: size })
      } else {
        if (!topic.trim()) throw new AiError('Schreibe, worum es gehen soll.')
        sourceText = topic.trim()
        topicText = topic.trim()
      }

      if (!exam) {
        const prompt = buildExamPrompt({ type, grade, topic: topicText, words, bookText, size: type === 'arbeit' ? size : size })
        // Die KI liefert manchmal Unbrauchbares: ein zweiter Versuch fängt das meist ab
        for (let attempt = 0; attempt < 2 && !exam; attempt++) {
          const reply = await askAi(prompt, 'Erstelle jetzt die Arbeit als JSON.', type === 'arbeit' ? 4000 : 2500)
          exam = parseExamReply(reply, { type, source: sourceText })
        }
        if (!exam) throw new AiError('Die KI hat keine brauchbare Arbeit geliefert. Versuch es nochmal.', 'format')
      }
      addExam(exam)
      navigate(`/exam/${exam.id}`)
    } catch (e) {
      if (e instanceof NeedAccountError) setNeedAccount(true)
      setError(e instanceof AiError ? e.message : 'Das hat nicht geklappt. Versuch es nochmal.')
    } finally {
      setBusy(false)
    }
  }

  const sizes = type === 'kurztest' ? [10, 15, 20] : [30, 45]
  const sizeLabel = type === 'kurztest' ? 'Wörter' : 'Minuten'
  const ready = type === 'kurztest' ? true : true

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 lg:py-8">
      <Link to="/practice" className="press -ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-semibold text-muted transition-colors hover:text-ink">
        <Back size={20} /> Üben
      </Link>
      <h1 className="page-title">Test erstellen</h1>
      <p className="mb-5 mt-1 text-muted">Ein Kurztest oder eine ganze Klassenarbeit zum Üben, am besten zu deinem Stoff.</p>

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Art">
          {(
            [
              ['kurztest', 'Kurztest', 'Deutsch links, du schreibst Französisch rechts'],
              ['arbeit', 'Klassenarbeit', 'Hören, Wortschatz, Grammatik und ein Text'],
            ] as const
          ).map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={type === id}
              onClick={() => {
                setType(id)
                setSize(id === 'kurztest' ? 15 : 45)
              }}
              className={`press rounded-2xl border-2 p-3 text-left transition-colors ${type === id ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}
            >
              <span className="block font-semibold">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </button>
          ))}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Worum geht es?</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ['book', 'Aus meinem Buch', books.length > 0],
                ['unit', 'Aus dem Kurs', true],
                ['set', 'Aus meiner Liste', sets.length > 0],
                ['topic', 'Eigenes Thema', true],
              ] as const
            )
              .filter(([, , show]) => show)
              .map(([id, label]) => (
                <button key={id} type="button" onClick={() => setSource(id)} className={`press min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${source === id ? 'bg-brand-strong text-on-brand' : 'bg-snow text-muted'}`}>
                  {label}
                </button>
              ))}
          </div>

          {source === 'book' && (
            <div className="card grid gap-3 p-4">
              <select value={bookId} onChange={(e) => setBookId(e.target.value)} className={field} aria-label="Buch">
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-medium">
                  Von Seite
                  <input inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, '').slice(0, 3))} className={`${field} text-center`} />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Bis Seite
                  <input inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, '').slice(0, 3))} className={`${field} text-center`} />
                </label>
              </div>
              <p className="text-xs text-muted">Genutzt werden die Seiten, die du im Buch gespeichert hast.</p>
            </div>
          )}
          {source === 'unit' && (
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={`${field} w-full`} aria-label="Einheit">
              {gradeUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          )}
          {source === 'set' && (
            <select value={setId} onChange={(e) => setSetId(e.target.value)} className={`${field} w-full`} aria-label="Liste">
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.items.length} Wörter)
                </option>
              ))}
            </select>
          )}
          {source === 'topic' && <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="z. B. passé composé, Essen und Trinken, Unité 3" className={`${field} w-full`} aria-label="Thema" />}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Länge ({sizeLabel})</h2>
          <div className="flex gap-2">
            {sizes.map((n) => (
              <button key={n} type="button" onClick={() => setSize(n)} className={`press min-h-11 min-w-11 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${size === n ? 'bg-brand-strong text-on-brand' : 'bg-snow text-muted'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad-dark" role="alert">
            <span className="min-w-0 flex-1">{error}</span>
            {needAccount && (
              <button
                className="btn btn-primary press !px-3 !py-1.5 !text-sm"
                onClick={async () => {
                  try {
                    // Direkt aus dem Klick, sonst blockiert der Browser das Anmeldefenster
                    await ensureAiReady()
                    void create()
                  } catch (e) {
                    setError(e instanceof AiError ? e.message : 'Die Anmeldung hat nicht geklappt.')
                  }
                }}
              >
                Mit anderem Anbieter weiter
              </button>
            )}
          </div>
        )}

        <button type="button" className="btn btn-primary btn-shine press w-full justify-center" disabled={busy || !ready} onClick={create}>
          {busy ? (
            'Wird erstellt …'
          ) : (
            <>
              {usesAi && <Sparkle size={18} />} {type === 'kurztest' ? 'Kurztest erstellen' : 'Klassenarbeit erstellen'}
            </>
          )}
        </button>
        {busy && usesAi && <p className="text-center text-sm text-muted">Die KI schreibt die Arbeit. Das kann bis zu einer Minute dauern.</p>}
        {!usesAi && <p className="text-center text-xs text-muted">Dieser Kurztest entsteht direkt aus deinen Wörtern, ganz ohne KI.</p>}
      </div>
    </div>
  )
}
