import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Close, Coin, Sparkle, Speaker } from '../../components/ui/Icons'
import { SPRING } from '../../components/ui/motion'
import { AiError, ensureAiReady } from '../../lib/ai'
import { askAi, NeedAccountError } from '../../lib/aiAsk'
import { approxGrade, buildWritingPrompt, parseWritingFeedback, scorePart, spokenText, type ExamData, type ExamPart, type PartAnswers, type WritingFeedback } from '../../lib/exam'
import { hasFrenchVoice, speak } from '../../lib/speech'
import { useExams } from '../../store/useExams'
import { useStore } from '../../store/useStore'

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ']
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/** Eine Arbeit oder einen Test machen. Ganzer Bildschirm wie bei Lektionen. */
export function ExamPlayPage() {
  const { examId = '' } = useParams()
  const exam = useExams((s) => s.exams.find((e) => e.id === examId))
  if (!exam) return <Navigate to="/practice" replace />
  return <ExamPlay key={exam.id} exam={exam} />
}

function emptyAnswers(exam: ExamData): PartAnswers[] {
  return exam.parts.map((p) => {
    const n = p.kind === 'vocab' ? p.items.length : p.kind === 'cloze' ? p.sentences.length : p.kind === 'writing' ? 1 : p.questions.length
    return Array.from({ length: n }, () => null)
  })
}

/** Fügt ein Sonderzeichen in das gerade gewählte Eingabefeld ein (ohne den Fokus zu verlieren). */
function insertAccent(ch: string) {
  const el = document.activeElement
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, el.value.slice(0, start) + ch + el.value.slice(end))
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.setSelectionRange(start + ch.length, start + ch.length)
}

function AccentBar() {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 border-t border-line bg-surface px-3 py-2" aria-label="Sonderzeichen">
      {ACCENTS.map((c) => (
        <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertAccent(c)} className="h-9 w-9 rounded-lg border border-line bg-snow text-base font-bold">
          {c}
        </button>
      ))}
    </div>
  )
}

function ExamPlay({ exam }: { exam: ExamData }) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [answers, setAnswers] = useState<PartAnswers[]>(() => emptyAnswers(exam))
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [started] = useState(() => Date.now())
  const [now, setNow] = useState(Date.now())
  const part = exam.parts[idx]
  const last = idx === exam.parts.length - 1
  const needsKeys = part?.kind === 'vocab' || part?.kind === 'cloze' || part?.kind === 'writing'

  useEffect(() => {
    if (exam.type !== 'arbeit' || done) return
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [exam.type, done])

  const setAnswer = (partIdx: number, i: number, v: number | string | null) =>
    setAnswers((all) => all.map((a, p) => (p === partIdx ? a.map((x, k) => (k === i ? v : x)) : a)))

  const left = Math.max(0, exam.minutes - Math.floor((now - started) / 60000))

  if (done) return <Result exam={exam} answers={answers} onAgain={() => { setAnswers(emptyAnswers(exam)); setIdx(0); setDone(false) }} onExit={() => navigate('/practice')} />

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setConfirmExit(true)} aria-label="Beenden" className="text-muted transition-colors hover:text-ink">
          <Close size={28} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{exam.title}</p>
          <p className="truncate text-xs text-muted">
            Teil {idx + 1} von {exam.parts.length}: {part.title}
          </p>
        </div>
        {exam.type === 'arbeit' && <span className="shrink-0 rounded-lg bg-snow px-2.5 py-1 text-sm font-semibold text-muted" title="Zeit ungefähr">{left} Min.</span>}
      </header>
      <div className="mx-auto mb-2 flex w-full max-w-2xl gap-1.5 px-4" aria-hidden>
        {exam.parts.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-brand' : 'bg-snow'}`} />
        ))}
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-2">
        <motion.div key={idx} initial={reduce ? false : { opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <PartView part={part} answers={answers[idx]} setAnswer={(i, v) => setAnswer(idx, i, v)} />
        </motion.div>
      </main>

      {needsKeys && <AccentBar />}
      <footer className="safe-bottom border-t border-line">
        <div className="mx-auto flex w-full max-w-2xl gap-3 px-4 py-4">
          {idx > 0 && (
            <button className="btn btn-ghost press" onClick={() => setIdx(idx - 1)}>
              Zurück
            </button>
          )}
          <button className="btn btn-primary press flex-1" onClick={() => (last ? setDone(true) : setIdx(idx + 1))}>
            {last ? 'Abgeben' : 'Weiter'}
          </button>
        </div>
      </footer>

      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Beenden?">
          <div className="card w-full max-w-sm p-5">
            <p className="font-semibold">Wirklich abbrechen?</p>
            <p className="mt-1 text-sm text-muted">Deine Antworten gehen dann verloren.</p>
            <div className="mt-4 flex gap-2">
              <button className="btn btn-ghost press flex-1" onClick={() => setConfirmExit(false)}>
                Weitermachen
              </button>
              <button className="btn btn-primary press flex-1" onClick={() => navigate('/practice')}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Mcqs({ questions, answers, setAnswer }: { questions: { q: string; options: string[] }[]; answers: PartAnswers; setAnswer: (i: number, v: number) => void }) {
  return (
    <ol className="grid gap-5">
      {questions.map((q, i) => (
        <li key={i}>
          <p className="mb-2 font-semibold">
            {i + 1}. {q.q}
          </p>
          <div className="grid gap-2" role="radiogroup" aria-label={q.q}>
            {q.options.map((o, k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={answers[i] === k}
                onClick={() => setAnswer(i, k)}
                className={`press rounded-xl border-2 px-4 py-3 text-left transition-colors ${answers[i] === k ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}
              >
                {o}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

function PartView({ part, answers, setAnswer }: { part: ExamPart; answers: PartAnswers; setAnswer: (i: number, v: number | string | null) => void }) {
  const [plays, setPlays] = useState(0)
  const [showText, setShowText] = useState(false)
  const voice = hasFrenchVoice()

  if (part.kind === 'listening') {
    return (
      <div>
        <h2 className="mb-1 text-2xl font-semibold">{part.title}</h2>
        <p className="mb-4 text-muted">Du hörst den Text zweimal. Kreuze danach die richtige Antwort an.</p>
        <div className="card mb-5 flex items-center gap-4 p-4">
          <button
            type="button"
            disabled={plays >= 2 || !voice}
            onClick={() => {
              speak(spokenText(part.transcript))
              setPlays((p) => p + 1)
            }}
            className="btn btn-primary press flex-1 justify-center disabled:opacity-50"
          >
            <Speaker size={22} /> {plays === 0 ? 'Text anhören' : plays === 1 ? 'Noch einmal anhören' : 'Zweimal gehört'}
          </button>
          <span className="text-sm text-muted">{Math.min(plays, 2)} / 2</span>
        </div>
        {!voice && <p className="mb-4 rounded-xl bg-snow px-4 py-3 text-sm text-muted">Dein Gerät hat keine französische Stimme. Lies den Text deshalb hier.</p>}
        {(!voice || plays >= 2) && (
          <div className="mb-5">
            <button type="button" className="press text-sm font-semibold text-brand-dark" onClick={() => setShowText((s) => !s)}>
              {showText || !voice ? 'Text ausblenden' : 'Text anzeigen (Hilfe)'}
            </button>
            {(showText || !voice) && <p lang="fr" className="mt-2 whitespace-pre-line rounded-xl bg-snow p-4">{part.transcript}</p>}
          </div>
        )}
        <Mcqs questions={part.questions} answers={answers} setAnswer={(i, v) => setAnswer(i, v)} />
      </div>
    )
  }
  if (part.kind === 'reading') {
    return (
      <div>
        <h2 className="mb-3 text-2xl font-semibold">{part.title}</h2>
        <p lang="fr" className="mb-5 whitespace-pre-line rounded-xl bg-snow p-4">{part.text}</p>
        <Mcqs questions={part.questions} answers={answers} setAnswer={(i, v) => setAnswer(i, v)} />
      </div>
    )
  }
  if (part.kind === 'vocab') {
    return (
      <div>
        <h2 className="mb-1 text-2xl font-semibold">{part.title}</h2>
        <p className="mb-4 text-muted">Links steht das deutsche Wort, schreibe rechts das Französische.</p>
        <ul className="grid gap-2.5">
          {part.items.map((it, i) => (
            <li key={i} className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
              <span className="font-medium">{it.de}</span>
              <input
                value={typeof answers[i] === 'string' ? (answers[i] as string) : ''}
                onChange={(e) => setAnswer(i, e.target.value || null)}
                lang="fr"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`Französisch für ${it.de}`}
                className="w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 font-semibold outline-none focus:border-brand"
              />
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (part.kind === 'cloze') {
    return (
      <div>
        <h2 className="mb-1 text-2xl font-semibold">{part.title}</h2>
        <p className="mb-4 text-muted">Ergänze das fehlende Wort.</p>
        <ol className="grid gap-4">
          {part.sentences.map((s, i) => {
            const [a, b] = s.text.split('___')
            return (
              <li key={i}>
                <p lang="fr" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg">
                  <span>{a}</span>
                  <input
                    value={typeof answers[i] === 'string' ? (answers[i] as string) : ''}
                    onChange={(e) => setAnswer(i, e.target.value || null)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={`Lücke in Satz ${i + 1}`}
                    className="w-32 rounded-lg border-2 border-line bg-snow px-2 py-1.5 text-center font-semibold outline-none focus:border-brand"
                  />
                  <span>{b}</span>
                </p>
                {s.translation && <p className="text-sm text-muted">{s.translation}</p>}
              </li>
            )
          })}
        </ol>
      </div>
    )
  }
  const text = typeof answers[0] === 'string' ? (answers[0] as string) : ''
  const n = wordCount(text)
  return (
    <div>
      <h2 className="mb-1 text-2xl font-semibold">{part.title}</h2>
      <p className="mb-3">{part.task}</p>
      {part.points.length > 0 && (
        <ul className="mb-4 list-disc pl-5 text-sm text-muted">
          {part.points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      <textarea
        value={text}
        onChange={(e) => setAnswer(0, e.target.value || null)}
        rows={9}
        lang="fr"
        autoCapitalize="sentences"
        spellCheck={false}
        aria-label="Dein Text"
        className="w-full rounded-2xl border-2 border-line bg-snow p-4 text-lg outline-none focus:border-brand"
      />
      <p className={`mt-1 text-sm ${n >= part.minWords ? 'text-good-dark' : 'text-muted'}`}>
        {n} Wörter, mindestens {part.minWords}
      </p>
    </div>
  )
}

function Result({ exam, answers, onAgain, onExit }: { exam: ExamData; answers: PartAnswers[]; onAgain: () => void; onExit: () => void }) {
  const reduce = useReducedMotion()
  const addResult = useExams((s) => s.addResult)
  const finishSession = useStore((s) => s.finishSession)
  const grade = useStore((s) => s.grade)
  const addSet = useStore((s) => s.addSet)
  const [fb, setFb] = useState<Record<number, WritingFeedback>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [needAccount, setNeedAccount] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const reported = useRef(false)

  const scores = useMemo(() => exam.parts.map((p, i) => scorePart(p, answers[i])), [exam, answers])
  const writingIdx = exam.parts.map((p, i) => (p.kind === 'writing' ? i : -1)).filter((i) => i >= 0)
  const autoPoints = scores.reduce((a, s) => a + s.points, 0)
  const autoMax = scores.reduce((a, s) => a + s.max, 0)
  const wPoints = Object.values(fb).reduce((a, f) => a + f.points, 0)
  const wMax = Object.values(fb).reduce((a, f) => a + f.max, 0)
  const points = autoPoints + wPoints
  const max = autoMax + wMax
  const percent = max ? Math.round((points / max) * 100) : 0
  const grd = approxGrade(percent)

  // Ergebnis einmal speichern (zählt für Serie und Münzen)
  useEffect(() => {
    if (reported.current) return
    reported.current = true
    addResult(exam.id, { date: new Date().toISOString(), percent, note: grd.note })
    setCoins(finishSession({ xp: Math.min(30, 5 + Math.round(points / 2)), grades: {}, accuracy: max ? points / max : 0 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rate = async (i: number) => {
    const part = exam.parts[i]
    if (part.kind !== 'writing') return
    setBusy(true)
    setErr(null)
    setNeedAccount(false)
    try {
      const text = String(answers[i][0] ?? '')
      if (wordCount(text) < 3) throw new AiError('Schreibe erst einen Text, dann kann die KI ihn bewerten.')
      const { system, user } = buildWritingPrompt(part, text, grade)
      const f = parseWritingFeedback(await askAi(system, user, 900))
      if (!f) throw new AiError('Die KI hat keine brauchbare Bewertung geliefert. Versuch es nochmal.', 'format')
      setFb((o) => ({ ...o, [i]: f }))
    } catch (e) {
      if (e instanceof NeedAccountError) setNeedAccount(true)
      setErr(e instanceof AiError ? e.message : 'Das hat nicht geklappt. Versuch es nochmal.')
    } finally {
      setBusy(false)
    }
  }

  const missedWords = exam.parts.flatMap((p, i) => (p.kind === 'vocab' ? scores[i].misses.map((m) => ({ front: m.correct, back: m.question })) : []))

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-2xl items-center px-4 py-4">
        <button type="button" onClick={onExit} aria-label="Schließen" className="-ml-1 text-muted transition-colors hover:text-ink">
          <Close size={28} />
        </button>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-6">
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.bouncy} className="mb-6 text-center">
          <p className="text-6xl font-bold tabular-nums">{percent} %</p>
          <p className="mt-1 text-xl font-semibold">
            Ungefähr Note {grd.note} ({grd.label})
          </p>
          <p className="mt-1 text-sm text-muted">{Math.round(points * 10) / 10} von {Math.round(max * 10) / 10} Punkten, {exam.title}</p>
          {coins > 0 && (
            <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-xl bg-gold/20 px-4 py-2 font-semibold text-gold-dark">
              <Coin size={20} /> +{coins} Münzen
            </p>
          )}
          <p className="mx-auto mt-3 max-w-sm text-xs text-muted">Die Note ist nur eine Orientierung nach dem üblichen Schlüssel. Deine Lehrkraft legt die Grenzen selbst fest.</p>
        </motion.div>

        {exam.parts.map((p, i) => (
          <section key={i} className="card mb-4 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{p.title}</h2>
              {p.kind !== 'writing' ? <span className="text-sm font-semibold text-muted">{scores[i].points} / {scores[i].max}</span> : fb[i] ? <span className="text-sm font-semibold text-muted">{fb[i].points} / {fb[i].max}</span> : <span className="text-sm text-muted">noch nicht bewertet</span>}
            </div>
            {p.kind !== 'writing' && scores[i].misses.length > 0 && (
              <ul className="mt-3 grid gap-2 text-sm">
                {scores[i].misses.map((m, k) => (
                  <li key={k} className="rounded-xl bg-bad-soft px-3 py-2">
                    <span className="block font-medium">{m.question}</span>
                    <span className="block text-bad-dark">
                      Deine Antwort: {m.yours || '–'}
                    </span>
                    <span className="block text-good-dark">Richtig: {m.correct}</span>
                  </li>
                ))}
              </ul>
            )}
            {p.kind !== 'writing' && scores[i].misses.length === 0 && <p className="mt-2 text-sm text-good-dark">Alles richtig.</p>}
            {p.kind === 'writing' && (
              <div className="mt-3 grid gap-3 text-sm">
                {fb[i] ? (
                  <p className="whitespace-pre-line rounded-xl bg-snow p-3">{fb[i].feedback}</p>
                ) : (
                  <button type="button" disabled={busy} onClick={() => rate(i)} className="btn btn-primary press justify-center">
                    <Sparkle size={18} /> {busy ? 'Die KI liest deinen Text …' : 'Von der KI bewerten lassen'}
                  </button>
                )}
                {p.sample && (
                  <details>
                    <summary className="cursor-pointer font-semibold text-brand-dark">Musterlösung ansehen</summary>
                    <p lang="fr" className="mt-2 whitespace-pre-line rounded-xl bg-snow p-3">{p.sample}</p>
                  </details>
                )}
              </div>
            )}
          </section>
        ))}

        {err && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad-dark" role="alert">
            <span className="min-w-0 flex-1">{err}</span>
            {needAccount && (
              <button
                className="btn btn-primary press !px-3 !py-1.5 !text-sm"
                onClick={async () => {
                  try {
                    await ensureAiReady()
                    for (const i of writingIdx) if (!fb[i]) void rate(i)
                  } catch (e) {
                    setErr(e instanceof AiError ? e.message : 'Die Anmeldung hat nicht geklappt.')
                  }
                }}
              >
                Mit anderem Anbieter weiter
              </button>
            )}
          </div>
        )}

        {missedWords.length > 0 && (
          <div className="card mb-4 p-4">
            {saved ? (
              <p className="text-sm font-medium text-good-dark">{saved}</p>
            ) : (
              <button
                type="button"
                className="btn btn-ghost press w-full justify-center"
                onClick={() => {
                  addSet(`Fehler: ${exam.title}`, missedWords, 'Test-Fehler')
                  setSaved('Gespeichert unter Üben → „Eigene Listen“. Dort kannst du sie gezielt üben.')
                }}
              >
                Falsche Wörter als Liste speichern
              </button>
            )}
          </div>
        )}
      </main>
      <footer className="safe-bottom border-t border-line">
        <div className="mx-auto flex w-full max-w-2xl gap-3 px-4 py-4">
          <button className="btn btn-ghost press" onClick={onAgain}>
            Nochmal
          </button>
          <button className="btn btn-primary press flex-1" onClick={onExit}>
            Fertig
          </button>
        </div>
      </footer>
    </div>
  )
}
