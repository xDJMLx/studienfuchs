import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Fr, SpeakButton } from '../../components/exercises/common'
import { Close, Coin } from '../../components/ui/Icons'
import { grades } from '../../content'
import { checkAnswer } from '../../lib/answerCheck'
import { shuffle } from '../../lib/generateExercises'
import { listenOnce, recognitionAvailable, type Listening } from '../../lib/recognition'
import { itemsForScope, scopeLabel, type Scope } from '../../lib/scope'
import { speak } from '../../lib/speech'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'

const ROUND = 10

/** Die wichtigsten Stolpersteine der französischen Aussprache, mit Beispielwörtern zum Anhören. */
const TIPS: { title: string; text: string; words: string[] }[] = [
  { title: 'Nasale Laute (an, on, in)', text: 'Die Luft geht durch die Nase, das n am Ende hört man nicht richtig. Wie ein kurzes „ã“, nicht „an“.', words: ['enfant', 'bon', 'vin'] },
  { title: 'Das französische R', text: 'Es kommt hinten aus dem Rachen, wie ein leises Gurgeln. Nicht rollen und nicht wie ein deutsches R vorne.', words: ['rue', 'merci', 'rouge'] },
  { title: 'u und ou', text: '„ou“ ist wie das deutsche „u“. Das französische „u“ sprichst du, indem du „i“ sagst und dabei die Lippen spitzt.', words: ['vous', 'tu', 'rue'] },
  { title: 'Stumme Endungen', text: 'Konsonanten am Wortende sprichst du meist nicht: petit, grand, Paris, nous.', words: ['petit', 'grand', 'beaucoup'] },
  { title: 'Liaison', text: 'Vor einem Vokal wird ein stummer Endkonsonant mitgesprochen: les amis klingt wie „lezami“.', words: ['les amis', 'vous avez', 'un ami'] },
  { title: 'ch, j und g', text: '„ch“ ist wie „sch“. „j“ und „g“ vor e oder i sind ein weiches „sch“ wie in „Garage“.', words: ['chat', 'jour', 'manger'] },
  { title: 'é, è, ê', text: '„é“ klingt geschlossen (wie in „Tee“), „è“ und „ê“ offen (wie in „Bär“).', words: ['café', 'mère', 'fête'] },
  { title: 'Betonung', text: 'Im Französischen betonst du immer die letzte Silbe, und alle Silben sind etwa gleich lang.', words: ['important', 'chocolat', 'restaurant'] },
]

type Status = 'good' | 'almost' | 'bad'

const ERRORS: Record<string, string> = {
  'not-allowed': 'Das Mikrofon ist blockiert. Erlaube den Zugriff im Browser.',
  'service-not-allowed': 'Das Mikrofon ist blockiert. Erlaube den Zugriff im Browser.',
  'no-speech': 'Ich habe nichts gehört. Versuch es noch einmal.',
  'audio-capture': 'Kein Mikrofon gefunden.',
}

/** Kleine Aufnahme zum Vergleichen, wenn der Browser keine Spracherkennung hat (z. B. manche iPhones). */
function useRecorder() {
  const [url, setUrl] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const supported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      chunks.current = []
      r.ondataavailable = (e) => chunks.current.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType || 'audio/mp4' }))
        })
        setRecording(false)
      }
      rec.current = r
      r.start()
      setRecording(true)
    } catch {
      setRecording(false)
    }
  }
  const stop = () => rec.current?.stop()
  const clear = () => setUrl((old) => {
    if (old) URL.revokeObjectURL(old)
    return null
  })
  return { url, recording, supported, start, stop, clear }
}

/** Sprechtraining: Wort hören, nachsprechen, Rückmeldung. Mit Spracherkennung (wo vorhanden) oder mit Aufnahme zum Vergleichen. */
export function SpeakTrainingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { cards, favorites, sets, grade, finishSession } = useStore(useShallow((s) => ({ cards: s.cards, favorites: s.favorites, sets: s.sets, grade: s.grade, finishSession: s.finishSession })))
  const scope = (params.get('scope') as Scope | null) ?? 'learned'
  const [stage, setStage] = useState<'intro' | 'play' | 'done'>('intro')
  const [tips, setTips] = useState(false)

  const pool = useMemo(() => {
    const g = grades.includes(grade) ? grade : grades[0]
    let items = itemsForScope(scope, { cards, favorites, sets })
    if (!items.length) items = itemsForScope(`grade:${g}` as Scope, { cards, favorites, sets })
    // Sprechen lohnt sich vor allem bei kurzen Wörtern und Wendungen
    return items.filter((i) => i.front.length <= 26)
  }, [scope, cards, favorites, sets, grade])

  const [round, setRound] = useState<Item[]>([])
  const [i, setI] = useState(0)
  const [results, setResults] = useState<Status[]>([])
  const [coins, setCoins] = useState(0)

  const begin = () => {
    setRound(shuffle(pool).slice(0, ROUND))
    setI(0)
    setResults([])
    setStage('play')
  }

  const finish = (all: Status[]) => {
    const good = all.filter((r) => r === 'good').length + all.filter((r) => r === 'almost').length * 0.5
    setCoins(finishSession({ xp: Math.max(3, Math.round(good * 2)), grades: {}, accuracy: all.length ? good / all.length : 0 }))
    setStage('done')
  }

  if (stage === 'intro') {
    return (
      <Screen onExit={() => navigate('/practice')}>
        <h1 className="page-title">Sprechtraining</h1>
        <p className="mb-5 mt-1 text-muted">
          Du hörst ein Wort, sprichst es nach und bekommst Rückmeldung. {recognitionAvailable ? 'Dein Browser hört über das Mikrofon zu und sagt dir, was er verstanden hat.' : 'Dein Browser kann nicht zuhören. Deshalb nimmst du dich auf und vergleichst mit dem Vorbild.'}
        </p>
        <p className="mb-4 rounded-xl bg-snow px-4 py-3 text-sm text-muted">
          {pool.length} Wörter aus „{scopeLabel(scope)}“. Pro Runde sind es {Math.min(ROUND, pool.length)}.
        </p>
        <button type="button" className="btn btn-primary btn-shine press mb-6 w-full justify-center" disabled={!pool.length} onClick={begin}>
          Runde starten
        </button>

        <button type="button" onClick={() => setTips((t) => !t)} aria-expanded={tips} className="press mb-2 w-full rounded-xl border border-line bg-surface px-4 py-3 text-left font-semibold">
          Lautschule: die wichtigsten Regeln {tips ? '▴' : '▾'}
        </button>
        {tips && (
          <ul className="grid gap-3">
            {TIPS.map((t) => (
              <li key={t.title} className="card p-4">
                <p className="font-semibold">{t.title}</p>
                <p className="mt-1 text-sm text-muted">{t.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.words.map((w) => (
                    <button key={w} type="button" onClick={() => speak(w)} className="press flex items-center gap-1.5 rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-dark">
                      <Fr>{w}</Fr> ▸
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Screen>
    )
  }

  if (stage === 'done') {
    const good = results.filter((r) => r === 'good').length
    return (
      <Screen onExit={() => navigate('/practice')}>
        <div className="text-center">
          <p className="text-5xl font-bold">
            {good} / {results.length}
          </p>
          <p className="mt-2 text-lg font-semibold">gut ausgesprochen</p>
          {coins > 0 && (
            <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-xl bg-gold/20 px-4 py-2 font-semibold text-gold-dark">
              <Coin size={20} /> +{coins} Münzen
            </p>
          )}
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted">Sprich die Wörter mehrmals laut, auch ohne Aufnahme: Die Mundbewegung zu üben bringt am meisten.</p>
        </div>
        <ul className="mt-5 grid gap-2">
          {round.map((w, k) => (
            <li key={w.id} className="card flex items-center gap-3 px-4 py-2.5">
              <span className={`h-3 w-3 shrink-0 rounded-full ${results[k] === 'good' ? 'bg-good' : results[k] === 'almost' ? 'bg-gold' : 'bg-bad'}`} aria-label={results[k] === 'good' ? 'gut' : results[k] === 'almost' ? 'fast' : 'nochmal üben'} />
              <Fr className="min-w-0 flex-1 truncate font-medium">{w.front}</Fr>
              <SpeakButton text={w.front} quiet />
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-3">
          <button className="btn btn-ghost press flex-1" onClick={begin}>
            Nochmal
          </button>
          <button className="btn btn-primary press flex-1" onClick={() => navigate('/practice')}>
            Fertig
          </button>
        </div>
      </Screen>
    )
  }

  const item = round[i]
  return (
    <Screen onExit={() => navigate('/practice')}>
      <div className="mb-4 flex gap-1.5" aria-hidden>
        {round.map((_, k) => (
          <span key={k} className={`h-1.5 flex-1 rounded-full ${k < i ? 'bg-brand' : k === i ? 'bg-brand/50' : 'bg-snow'}`} />
        ))}
      </div>
      <WordCard
        key={item.id + i}
        item={item}
        last={i === round.length - 1}
        onNext={(s) => {
          const all = [...results, s]
          setResults(all)
          if (i === round.length - 1) finish(all)
          else setI(i + 1)
        }}
      />
    </Screen>
  )
}

function Screen({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-2xl items-center px-4 py-3">
        <button type="button" onClick={onExit} aria-label="Schließen" className="press -ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:text-ink">
          <Close size={28} />
        </button>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-8">{children}</main>
    </div>
  )
}

function WordCard({ item, last, onNext }: { item: Item; last: boolean; onNext: (s: Status) => void }) {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'checked'>('idle')
  const [heard, setHeard] = useState('')
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const session = useRef<Listening | null>(null)
  const recorder = useRecorder()
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => speak(item.front), 300)
    return () => {
      clearTimeout(t)
      session.current?.stop()
    }
  }, [item.front])

  const listen = () => {
    setError(null)
    setPhase('listening')
    session.current = listenOnce((alts, err) => {
      if (err || !alts.length) {
        setPhase('idle')
        setError(ERRORS[err ?? 'no-speech'] ?? 'Das hat nicht geklappt. Versuch es noch einmal.')
        return
      }
      const verdicts = alts.map((a) => ({ a, r: checkAnswer(a, item.front) }))
      const best = verdicts.find((v) => v.r.status === 'correct') ?? verdicts.find((v) => v.r.status === 'almost') ?? verdicts[0]
      setHeard(best.a)
      setStatus(best.r.status === 'correct' ? 'good' : best.r.status === 'almost' ? 'almost' : 'bad')
      setPhase('checked')
    })
  }

  const playMine = () => {
    if (!recorder.url) return
    audio.current?.pause()
    audio.current = new Audio(recorder.url)
    void audio.current.play().catch(() => {})
  }

  const message =
    status === 'good' ? 'Sehr gut! Das hat der Browser genau so verstanden.' : status === 'almost' ? 'Fast. Achte noch auf die Endung und die Laute.' : 'Das war noch nicht ganz. Hör dir das Vorbild nochmal an, auch langsam.'

  return (
    <div>
      <p className="eyebrow mb-2">Sprich nach</p>
      <div className="card mb-5 p-5">
        <div className="flex items-start gap-4">
          <SpeakButton text={item.front} size="lg" />
          <div className="min-w-0 flex-1">
            <Fr className="block text-3xl font-semibold leading-tight">{item.front}</Fr>
            <p className="mt-1 text-lg text-muted">{item.back}</p>
          </div>
        </div>
        <button type="button" onClick={() => speak(item.front, 'fr-FR', 0.55)} className="press mt-4 rounded-lg bg-snow px-3 py-1.5 text-sm font-semibold text-brand-dark">
          Langsam anhören
        </button>
      </div>

      {recognitionAvailable ? (
        <>
          <button type="button" onClick={listen} disabled={phase === 'listening'} className={`btn ${phase === 'listening' ? 'btn-bad' : 'btn-primary'} w-full justify-center`}>
            {phase === 'listening' ? 'Ich höre zu …' : phase === 'checked' ? 'Nochmal sprechen' : 'Mikrofon starten und sprechen'}
          </button>
          {error && <p className="mt-3 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad-dark" role="alert">{error}</p>}
          {phase === 'checked' && status && (
            <div className={`mt-4 rounded-2xl p-4 ${status === 'good' ? 'bg-good-soft text-good-dark' : status === 'almost' ? 'bg-gold/15' : 'bg-bad-soft text-bad-dark'}`} role="status">
              <p className="font-semibold">{message}</p>
              <p className="mt-1 text-sm">
                Verstanden: <b>{heard}</b>
              </p>
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <button className="btn btn-ghost press" onClick={() => onNext('bad')}>
              Überspringen
            </button>
            <button className="btn btn-primary press flex-1" disabled={phase !== 'checked'} onClick={() => onNext(status ?? 'bad')}>
              {last ? 'Fertig' : 'Weiter'}
            </button>
          </div>
        </>
      ) : (
        <>
          {recorder.supported ? (
            <div className="grid gap-3">
              <button type="button" onClick={recorder.recording ? recorder.stop : recorder.start} className={`btn ${recorder.recording ? 'btn-bad' : 'btn-primary'} w-full justify-center`}>
                {recorder.recording ? 'Aufnahme beenden' : recorder.url ? 'Nochmal aufnehmen' : 'Aufnahme starten und sprechen'}
              </button>
              {recorder.url && (
                <button type="button" onClick={playMine} className="btn btn-ghost press w-full justify-center">
                  Meine Aufnahme anhören
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-snow px-4 py-3 text-sm text-muted">Dein Browser kann nicht aufnehmen. Sprich das Wort laut nach und beurteile dich selbst.</p>
          )}
          <p className="mt-4 text-sm text-muted">Vergleiche deine Aufnahme mit dem Vorbild. Wie klang es?</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="btn btn-ghost press" onClick={() => onNext('bad')}>
              Nochmal üben
            </button>
            <button className="btn btn-ghost press" onClick={() => onNext('almost')}>
              Fast
            </button>
            <button className="btn btn-primary press" onClick={() => onNext('good')}>
              {last ? 'Gut, fertig' : 'Gut'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
