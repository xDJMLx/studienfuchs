import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { COURSE_STATS, isLessonDone, isRegular, units } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { Right, Sparkle, Trash } from '../../components/ui/Icons'
import { EASE } from '../../components/ui/motion'
import { AiError, chatCoach, ensureAiReady, preloadAi, type ChatMessage } from '../../lib/ai'
import { unitLabel } from '../../lib/catchup'
import { buildCoachPrompt } from '../../lib/coach'
import { streakNow, useStore } from '../../store/useStore'
import { CoachComposer } from '../../components/ui/CoachComposer'
import { useCoachComposer } from '../../lib/coachComposer'
import { AiNotice } from '../settings/AiNotice'

const KEY = 'studienfuchs-coach'

const load = (): ChatMessage[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as ChatMessage[]
    return Array.isArray(raw) ? raw.filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-40) : []
  } catch {
    return []
  }
}

const SUGGESTIONS = [
  'Frag mich Vokabeln ab, bei denen es bei mir hakt.',
  'Hilf mir, mich auf meine nächste Klassenarbeit vorzubereiten.',
  'Erkläre mir den Unterschied zwischen passé composé und imparfait.',
  'Wie lerne ich Vokabeln, damit sie wirklich hängen bleiben?',
]

/** Sehr einfache Darstellung von **fett**, Listen und Absätzen, ohne HTML zu übernehmen. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <i key={i}>{part.slice(1, -1)}</i>
    return part
  })
}
function Markdownish({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (!list.length) return
    blocks.push(
      <ul key={`l${blocks.length}`} className="my-1 grid list-disc gap-1 pl-5">
        {list.map((l, i) => (
          <li key={i}>{inline(l)}</li>
        ))}
      </ul>,
    )
    list = []
  }
  for (const line of text.split('\n')) {
    const m = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line)
    if (m) list.push(m[1])
    else {
      flush()
      if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{inline(line.replace(/^#+\s*/, ''))}</p>)
    }
  }
  flush()
  return <div className="grid gap-2 leading-relaxed">{blocks}</div>
}

/** KI-Chat: Gespräch mit der KI über Klassenarbeiten, schwache Wörter und Grammatik. Die KI kennt deinen Lernstand. */
export function CoachPage() {
  const reduce = useReducedMotion()
  const store = useStore()
  const [messages, setMessages] = useState<ChatMessage[]>(load)
  // Nur die (stabilen) Setter abonnieren, sonst löst jedes Setzen ein neues Rendern dieser Seite aus
  const setInput = useCoachComposer((c) => c.setInput)
  const setComposerBusy = useCoachComposer((c) => c.setBusy)
  const setSubmit = useCoachComposer((c) => c.setSubmit)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const end = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  // Vorgeschlagene Frage von der Startseite übernehmen
  useEffect(() => {
    const q = params.get('q')
    if (!q) return
    setInput(q)
    setParams({}, { replace: true })
    window.setTimeout(() => box.current?.focus(), 50)
  }, [params, setParams])

  // KI-Bibliothek schon laden, damit das Anmeldefenster beim ersten Senden nicht blockiert wird
  useEffect(() => preloadAi(), [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(messages.slice(-40)))
    } catch {
      /* Speicher nicht verfügbar */
    }
    end.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [messages, busy, reduce])

  const lessonsDone = useMemo(
    () => units.flatMap((u) => u.lessons).filter((l) => isRegular(l) && isLessonDone(l, store.lessons[l.id])).length,
    [store.lessons],
  )

  useEffect(() => {
    setComposerBusy(busy)
  }, [busy, setComposerBusy])

  const send = async (raw: string) => {
    const content = raw.trim()
    if (!content || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setError(null)
    setBusy(true)
    try {
      // Direkt aus dem Klick: legt beim ersten Mal das kostenlose Gastkonto an
      await ensureAiReady()
      const system = buildCoachPrompt({
        grade: store.grade,
        examDates: store.examDates,
        sets: store.sets,
        cards: store.cards,
        lessonsDone,
        lessonsTotal: COURSE_STATS.lessons,
        streak: streakNow(store.streak),
        classPosition: store.classUnit ? unitLabel(store.classUnit) : undefined,
      })
      const answer = await chatCoach(system, next)
      setMessages((m) => [...m, { role: 'assistant', content: answer.trim() }])
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Das hat nicht geklappt. Versuch es nochmal.')
    } finally {
      setBusy(false)
      box.current?.focus()
    }
  }

  // Die Senden-Funktion der Seite für das Eingabefeld bereitstellen (in der Leiste oder unten)
  useEffect(() => {
    setSubmit(() => void send(useCoachComposer.getState().input))
    return () => setSubmit(null)
  })

  const retry = () => {
    // letzte Nutzerfrage nochmal senden
    const last = [...messages].reverse().find((m) => m.role === 'user')
    if (!last) return
    setMessages((m) => (m[m.length - 1]?.role === 'user' ? m.slice(0, -1) : m))
    void send(last.content)
  }

  const empty = messages.length === 0

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-6 lg:py-8">
      <div className="mb-5 flex items-center gap-4">
        <Mascot size={64} mood={busy ? 'think' : 'cheer'} blink />
        <div className="min-w-0 flex-1">
          <h1 className="page-title">KI</h1>
          <p className="text-muted">Frag zu Arbeiten, Grammatik und Wörtern.</p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={() => {
              setMessages([])
              setError(null)
            }}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-snow hover:text-bad"
            aria-label="Neuer Chat"
            title="Neuer Chat"
          >
            <Trash size={20} />
          </button>
        )}
      </div>

      {empty && (
        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
          <AiNotice className="mb-4" />
          <p className="mb-3 text-sm text-muted">
            Die KI kennt deinen Lernstand (Klasse, Fortschritt, eingetragene Klassenarbeiten und Wörter, bei denen es hakt), aber nicht deinen Namen.{' '}
            <Link to="/sets" className="font-medium text-brand-dark underline">
              Klassenarbeit bei einem Kapitel eintragen
            </Link>
          </p>
          <div className="grid gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="press group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-snow">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                  <Sparkle size={18} />
                </span>
                <span className="flex-1 font-medium">{s}</span>
                <Right size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <ul className="grid gap-3" aria-live="polite" aria-label="Gespräch">
        {messages.map((m, i) => (
          <motion.li
            key={i}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={m.role === 'user' ? 'ml-10 justify-self-end' : 'mr-6'}
          >
            <div className={m.role === 'user' ? 'rounded-2xl rounded-br-md bg-brand-strong px-4 py-2.5 text-on-brand' : 'card rounded-bl-md px-4 py-3'}>
              {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdownish text={m.content} />}
            </div>
          </motion.li>
        ))}
        <AnimatePresence>
          {busy && (
            <motion.li key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mr-6" role="status" aria-label="Die KI schreibt">
              <div className="card inline-flex gap-1.5 rounded-bl-md px-4 py-3.5">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>

      {error && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad-dark" role="alert">
          <span className="min-w-0 flex-1">{error}</span>
          <button className="btn btn-ghost press !px-3 !py-1.5 !text-sm" onClick={retry}>
            Nochmal
          </button>
        </div>
      )}
      <div ref={end} />

      {/* Am Computer unten im Inhalt; auf dem Handy sitzt das Feld in der Tab-Leiste */}
      <div className="sticky bottom-0 mt-auto hidden bg-page pb-2 pt-3 lg:block">
        <CoachComposer />
      </div>
    </div>
  )
}
