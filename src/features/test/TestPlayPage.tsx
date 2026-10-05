import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ExerciseBody } from '../../components/exercises/ExerciseBody'
import { Check, Close } from '../../components/ui/Icons'
import { Sheet } from '../../components/ui/Sheet'
import { approxGrade } from '../../lib/exam'
import type { Answer, SelfGrade } from '../../lib/evaluate'
import { helpSubject } from '../../lib/subjects'
import { itemFromTask, taskAnswerText, taskQuestion } from '../../lib/tasks'
import { gradeOf, scoreAnswer, suggestSelfGrade, taskCount, testExercise, testKindLabel, totalPoints, type TestData, type TestTask } from '../../lib/tests'
import type { Exercise } from '../../lib/types'
import { useStore } from '../../store/useStore'

const mmss = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`
const pts = (n: number) => String(n).replace('.', ',')

/** Antwort als Text für die Auswertung. */
function answerText(a: Answer | null): string {
  if (a === null) return ''
  if (typeof a === 'string') return a
  if (Array.isArray(a)) return a.join(' → ')
  if ('matchMistakes' in a) return a.matchMistakes.length ? `${a.matchMistakes.length} Fehlversuch(e)` : 'alles richtig zugeordnet'
  return ''
}

/**
 * Test, Klassenarbeit oder Vokabeltest durchführen: erst Start, dann eine Aufgabe nach der anderen ohne Rückmeldung und ohne Hilfen,
 * am Ende Punkte, ungefähre Note und was falsch war. Kurzantworten bewertet man sich anhand der Musterlösung selbst.
 */
export function TestPlayPage() {
  const { testId = '' } = useParams()
  const test = useStore((s) => (s.tests ?? []).find((t) => t.id === testId))
  if (!test) return <Navigate to="/" replace />
  return <Runner key={test.id} test={test} />
}

function Runner({ test }: { test: TestData }) {
  const navigate = useNavigate()
  const addTestResult = useStore((s) => s.addTestResult)
  const addSet = useStore((s) => s.addSet)
  const allResults = useStore((s) => s.testResults)
  const results = useMemo(() => (allResults ?? []).filter((r) => r.testId === test.id), [allResults, test.id])
  const sub = helpSubject(test.subject)
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<'start' | 'run' | 'review'>('start')
  const flat = useMemo(() => test.sections.flatMap((s) => s.tasks.map((t) => ({ t, section: s.title }))), [test])
  // Pro Durchgang neue Übungen (neu gemischte Antworten)
  const exercises = useMemo<Exercise[]>(() => flat.map(({ t }) => testExercise(t)), [flat, round]) // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer | null>>({})
  const [self, setSelf] = useState<Record<string, SelfGrade>>({})
  const [leave, setLeave] = useState(false)
  const startedAt = useRef(Date.now())
  const [now, setNow] = useState(Date.now())
  const [seconds, setSeconds] = useState(0)
  const saved = useRef(false)

  useEffect(() => {
    if (phase !== 'run') return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [phase])

  const start = () => {
    startedAt.current = Date.now()
    setNow(Date.now())
    setAnswers({})
    setSelf({})
    setIdx(0)
    saved.current = false
    setPhase('run')
  }

  const finishRun = () => {
    const secs = Math.round((Date.now() - startedAt.current) / 1000)
    setSeconds(secs)
    // Vorschlag für die Kurzantworten aus den Stichwörtern
    const s: Record<string, SelfGrade> = {}
    for (const { t } of flat) if (t.task.t === 'short') s[t.id] = suggestSelfGrade(t.task, typeof answers[t.id] === 'string' ? (answers[t.id] as string) : '')
    setSelf(s)
    setPhase('review')
  }

  // ---- Auswertung ----
  const scored = useMemo(
    () =>
      flat.map(({ t, section }, i) => {
        const got = scoreAnswer(t, exercises[i], answers[t.id] ?? null, self[t.id])
        return { t, section, ex: exercises[i], got, answer: answers[t.id] ?? null }
      }),
    [flat, exercises, answers, self],
  )
  const points = scored.reduce((n, x) => n + x.got, 0)
  const max = totalPoints(test)
  const { percent, note } = gradeOf(points, max)

  const save = () => {
    if (saved.current || phase !== 'review') return
    saved.current = true
    addTestResult({ testId: test.id, at: new Date().toISOString(), points, max, percent, note, seconds })
  }
  // Wer die Seite verlässt, ohne "Fertig" zu drücken, behält sein Ergebnis trotzdem
  const latest = useRef(save)
  latest.current = save
  useEffect(() => () => latest.current(), [])

  const done = () => {
    save()
    navigate(`/faecher/${test.subject}`, { replace: true })
  }

  const practiceMistakes = () => {
    save()
    const wrong = scored.filter((x) => x.got < x.t.points)
    if (!wrong.length) return
    const lang = wrong.map((x) => (x.t.task.t === 'type' ? x.t.task.lang : undefined)).find(Boolean)
    const id = addSet(`Falsche aus: ${test.title}`.slice(0, 80), wrong.map((x) => {
      const { id: _id, ...rest } = itemFromTask(x.t.task, 'x')
      void _id
      return rest
    }), { subject: test.subject, ...(lang ? { lang } : {}) })
    navigate(`/ueben/los?deck=${id}&modus=mix`, { replace: true })
  }

  // ================= Start =================
  if (phase === 'start') {
    const best = results.length ? Math.max(...results.map((r) => r.percent)) : null
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col justify-center px-5 py-8">
        <Link to={`/faecher/${test.subject}`} className="press -ml-2 mb-4 inline-flex min-h-11 w-fit items-center rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
          ← {sub?.name ?? 'Zurück'}
        </Link>
        <p className="text-sm font-extrabold uppercase tracking-wide text-muted">{testKindLabel(test.kind)}</p>
        <h1 className="mt-1 text-[30px] font-black leading-tight">{test.title}</h1>
        <p className="mt-2 text-muted">{test.source}</p>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            [taskCount(test), 'Aufgaben'],
            [pts(max), 'Punkte'],
            [`${test.minutes}`, 'Minuten'],
          ].map(([v, k]) => (
            <div key={String(k)} className="card p-3">
              <dd className="text-[22px] font-black tabular-nums">{v}</dd>
              <dt className="text-xs font-bold text-muted">{k}</dt>
            </div>
          ))}
        </dl>
        <ul className="mt-5 grid gap-1 rounded-2xl bg-snow p-4 text-sm text-muted">
          <li>Du bekommst keine Hilfe und keine Rückmeldung zwischendurch.</li>
          <li>Am Ende siehst du Punkte, eine ungefähre Note und was falsch war.</li>
          {flat.some(({ t }) => t.task.t === 'short') && <li>Kurzantworten bewertest du dir danach selbst mit der Musterlösung.</li>}
        </ul>
        {best !== null && <p className="mt-3 text-sm font-bold text-muted">Bisher beste Leistung: {best} % ({approxGrade(best).label}).</p>}
        <button type="button" className="btn btn-primary btn-shine press mt-6 w-full" onClick={start} autoFocus>
          Starten
        </button>
      </div>
    )
  }

  // ================= Durchführen =================
  if (phase === 'run') {
    const cur = flat[idx]
    const ex = exercises[idx]
    const answer = answers[cur.t.id] ?? null
    const last = idx === flat.length - 1
    const left = test.minutes * 60 - Math.floor((now - startedAt.current) / 1000)
    const set = (a: Answer | null) => setAnswers((prev) => ({ ...prev, [cur.t.id]: a }))
    const open = cur.t.task.t === 'short'
    return (
      <div className="flex h-full flex-col bg-surface">
        <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <button type="button" onClick={() => setLeave(true)} aria-label="Test abbrechen" className="text-muted transition-colors hover:text-ink">
            <Close size={26} />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={flat.length} aria-valuenow={idx} aria-label="Fortschritt">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${(idx / flat.length) * 100}%` }} />
          </div>
          <span className={`min-w-[3.2rem] text-right text-sm font-extrabold tabular-nums ${left < 0 ? 'text-bad-dark' : 'text-muted'}`} aria-label={left < 0 ? 'Zeit überschritten' : 'Verbleibende Zeit'}>
            {left < 0 ? '+' : ''}
            {mmss(left)}
          </span>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-6 pt-1" key={cur.t.id}>
          <p className="mb-2 text-sm font-bold text-muted">
            {cur.section} · Aufgabe {idx + 1} von {flat.length} · {pts(cur.t.points)} {cur.t.points === 1 ? 'Punkt' : 'Punkte'}
          </p>
          {open ? <OpenAnswer task={cur.t} value={typeof answer === 'string' ? answer : ''} onChange={(v) => set(v || null)} /> : <ExerciseBody exercise={ex} answer={answer} onChange={set} result={null} />}
        </main>
        <footer className="safe-bottom border-t border-line">
          <div className="mx-auto flex w-full max-w-2xl gap-3 px-4 py-3">
            <button type="button" className="btn btn-primary press min-w-0 flex-1" onClick={() => (last ? finishRun() : setIdx(idx + 1))}>
              {last ? 'Abgeben' : answer === null ? 'Überspringen' : 'Weiter'}
            </button>
          </div>
        </footer>
        <Sheet open={leave} onClose={() => setLeave(false)} title="Test abbrechen?">
          <p className="mb-4 text-muted">Dein bisheriger Stand geht verloren.</p>
          <div className="flex gap-3">
            <button type="button" className="btn btn-ghost press flex-1" onClick={() => setLeave(false)}>
              Weitermachen
            </button>
            <button type="button" className="btn btn-bad press flex-1" onClick={() => navigate(`/faecher/${test.subject}`, { replace: true })}>
              Abbrechen
            </button>
          </div>
        </Sheet>
      </div>
    )
  }

  // ================= Auswertung =================
  const g = approxGrade(percent)
  const wrongCount = scored.filter((x) => x.got < x.t.points).length
  let lastSection = ''
  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-4 py-6">
      <section className="card mb-5 p-5 text-center" aria-label="Ergebnis">
        <p className="text-sm font-extrabold uppercase tracking-wide text-muted">{test.title}</p>
        <p className="mt-1 text-[44px] font-black leading-none tabular-nums">
          {pts(points)} <span className="text-[24px] text-muted">/ {pts(max)}</span>
        </p>
        <p className="mt-1 text-lg font-bold">
          {percent} %, ungefähr eine <span className="text-brand-dark">{g.note}</span> ({g.label})
        </p>
        <p className="mt-1 text-xs text-muted">Nur zur Orientierung: Jede Lehrkraft setzt die Grenzen selbst. Zeit: {mmss(seconds)} von {test.minutes} Minuten.</p>
      </section>

      <ul className="grid gap-3">
        {scored.map(({ t, section, got, answer }, i) => {
          const head = section !== lastSection
          lastSection = section
          const full = got >= t.points
          return (
            <li key={t.id}>
              {head && <h2 className="mb-2 mt-3 text-lg font-extrabold">{section}</h2>}
              <div className="card p-4">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <p className="font-bold">
                    {i + 1}. {taskQuestion(t.task)}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-black tabular-nums ${full ? 'bg-good-soft text-good-dark' : got > 0 ? 'bg-gold/20 text-gold-dark' : 'bg-bad-soft text-bad-dark'}`}>
                    {full && <Check size={12} className="mr-1 inline" />}
                    {pts(got)}/{pts(t.points)}
                  </span>
                </div>
                <p className="text-sm text-muted">Deine Antwort: {answerText(answer) || '–'}</p>
                {!full && <p className="text-sm font-semibold">Richtig: {taskAnswerText(t.task)}</p>}
                {t.task.t === 'short' && (
                  <div className="mt-2">
                    {t.task.keys && <p className="mb-1 text-xs text-muted">Das gehört dazu: {t.task.keys.join(', ')}</p>}
                    <p className="mb-1 text-xs font-bold text-muted">Wie gut war deine Antwort?</p>
                    <div className="flex gap-2" role="radiogroup" aria-label="Selbstbewertung">
                      {(
                        [
                          ['good', 'Voll'],
                          ['hard', 'Teilweise'],
                          ['again', 'Nicht'],
                        ] as [SelfGrade, string][]
                      ).map(([v, label]) => (
                        <button key={v} type="button" role="radio" aria-checked={self[t.id] === v} onClick={() => setSelf((s) => ({ ...s, [t.id]: v }))} className={`chip ${self[t.id] === v ? 'chip-on' : ''}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {'why' in t.task && t.task.why && !full && <p className="mt-1 text-sm text-muted">{t.task.why}</p>}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-0 -mx-4 mt-5 grid gap-2 bg-surface/95 px-4 py-3 backdrop-blur">
        {wrongCount > 0 && (
          <button type="button" className="btn btn-primary press w-full" onClick={practiceMistakes}>
            {wrongCount === 1 ? 'Die falsche Aufgabe üben' : `Die ${wrongCount} falschen Aufgaben üben`}
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost press flex-1"
            onClick={() => {
              save()
              setRound((r) => r + 1)
              setPhase('start')
            }}
          >
            Nochmal
          </button>
          <button type="button" className="btn btn-ghost press flex-1" onClick={done}>
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

/** Freie Antwort bei Kurzfragen: Es gibt keine Prüfung zwischendurch, die Auswertung kommt am Ende. */
function OpenAnswer({ task, value, onChange }: { task: TestTask; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h2 className="mb-4 text-[25px] font-extrabold leading-tight">Beantworte in ein bis drei Sätzen</h2>
      <p className="mb-4 rounded-2xl border-2 border-line px-4 py-3 text-[18px] font-bold">{taskQuestion(task.task)}</p>
      <label className="sr-only" htmlFor="open-answer">
        Deine Antwort
      </label>
      <textarea
        id="open-answer"
        className="min-h-40 w-full resize-y rounded-2xl border-2 border-line bg-snow px-4 py-3 text-[17px] font-medium outline-none focus:border-sky"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Deine Antwort"
        maxLength={1200}
      />
    </div>
  )
}
