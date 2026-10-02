import { useEffect, useRef, useState } from 'react'
import { listenOnce, type Listening } from '../../lib/recognition'
import { checkAnswer } from '../../lib/answerCheck'
import { speak } from '../../lib/speech'
import { Instruction, SpeakButton, type ExerciseProps } from './common'

const ERRORS: Record<string, string> = {
  'not-allowed': 'Das Mikrofon ist blockiert. Erlaube den Zugriff im Browser oder überspringe die Aufgabe.',
  'service-not-allowed': 'Das Mikrofon ist blockiert. Erlaube den Zugriff im Browser oder überspringe die Aufgabe.',
  'no-speech': 'Ich habe nichts gehört. Versuch es noch einmal.',
  'audio-capture': 'Kein Mikrofon gefunden.',
  'not-supported': 'Dein Browser unterstützt keine Spracherkennung.',
}

/** Aussprache: Wort hören, nachsprechen, die Spracherkennung prüft das Ergebnis. */
export function SpeakExercise({ exercise: ex, onChange, result }: ExerciseProps<'speak'>) {
  const [state, setState] = useState<'idle' | 'listening'>('idle')
  const [heard, setHeard] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const session = useRef<Listening | null>(null)

  useEffect(() => {
    const t = setTimeout(() => speak(ex.text), 250)
    return () => {
      clearTimeout(t)
      session.current?.stop()
    }
  }, [ex.text])

  const start = () => {
    setError(null)
    setState('listening')
    session.current = listenOnce((alts, err) => {
      setState('idle')
      if (err || alts.length === 0) {
        setError(ERRORS[err ?? 'no-speech'] ?? 'Das hat nicht geklappt. Versuch es noch einmal.')
        return
      }
      // Beste Alternative wählen: die, die dem Soll am nächsten kommt
      const best = alts.find((a) => checkAnswer(a, ex.text, ex.accept).status !== 'wrong') ?? alts[0]
      setHeard(best)
      onChange(best)
    })
  }

  return (
    <div>
      <Instruction>Sprich nach</Instruction>
      <div className="card mb-5 flex items-center gap-4 p-4">
        <SpeakButton text={ex.text} size="lg" />
        <div className="min-w-0">
          <p className="text-2xl font-semibold">{ex.text}</p>
          <p className="text-muted">{ex.translation}</p>
        </div>
      </div>

      {!result && (
        <button type="button" onClick={start} disabled={state === 'listening'} className={`btn ${state === 'listening' ? 'btn-bad' : 'btn-primary'} w-full`}>
          {state === 'listening' ? 'Ich höre zu …' : heard ? 'Nochmal sprechen' : 'Mikrofon starten'}
        </button>
      )}
      {error && <p className="mt-3 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad-dark" role="alert">{error}</p>}
      {heard && (
        <p className="mt-3 text-muted">
          Verstanden: <b className="text-ink">{heard}</b>
        </p>
      )}
    </div>
  )
}
