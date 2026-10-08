import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiError, setAiGate, signInPuter } from '../../lib/ai'
import { Mascot } from '../mascot/Mascot'
import { Check } from './Icons'
import { Sheet } from './Sheet'

/** Offene Anfrage der KI nach einer Anmeldung: Wer sie ausgelöst hat, wartet auf `resolve` oder `reject`. */
interface Pending {
  resolve: () => void
  reject: (e: Error) => void
}
let pending: Pending | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Öffnet das Anmelde-Fenster und wartet, bis die KI bereit ist (oder der Nutzer abbricht). Mehrere Aufrufe teilen sich ein Fenster. */
export function requestAiSignIn(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const prev = pending
    pending = {
      resolve: () => {
        prev?.resolve()
        resolve()
      },
      reject: (e) => {
        prev?.reject(e)
        reject(e)
      },
    }
    emit()
  })
}

type Phase = 'ask' | 'working' | 'ok' | 'error'

const POINTS = [
  ['Kostenlos', 'Du brauchst kein eigenes Konto und keinen Schlüssel.'],
  ['Ein Fenster, nur kurz', 'Es öffnet sich ein Fenster von Puter und schließt sich von selbst.'],
  ['Du bestimmst, was gesendet wird', 'Nur das, was du abschickst, geht an die KI. Nichts passiert im Hintergrund.'],
] as const

/**
 * Das Fenster vor der KI-Anmeldung: erklärt in drei Zeilen, was passiert, führt durch das Puter-Fenster und zeigt bei Problemen
 * genau, was zu tun ist (Pop-ups erlauben, nochmal versuchen, ohne KI weitermachen). Hängt einmal in der App und reagiert auf `requestAiSignIn`.
 */
export function AiGateSheet() {
  const open = useSyncExternalStore(subscribe, () => pending !== null)
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('ask')
  const [error, setError] = useState('')
  const [slow, setSlow] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  // Beim Öffnen frisch starten; die App hängt sich als Tor vor die KI
  useEffect(() => {
    setAiGate(requestAiSignIn)
    return () => setAiGate(null)
  }, [])
  useEffect(() => {
    if (open) {
      setPhase('ask')
      setError('')
      setSlow(false)
    }
    return () => window.clearTimeout(timer.current)
  }, [open])

  const finish = (ok: boolean, err?: Error) => {
    const p = pending
    pending = null
    emit()
    if (ok) p?.resolve()
    else p?.reject(err ?? new AiError('Ohne Anmeldung kann die KI nicht antworten.', 'auth'))
  }

  const start = async () => {
    setPhase('working')
    setError('')
    setSlow(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSlow(true), 9000)
    try {
      await signInPuter()
      window.clearTimeout(timer.current)
      setPhase('ok')
      window.setTimeout(() => finish(true), reduce ? 0 : 900)
    } catch (e) {
      window.clearTimeout(timer.current)
      setError(e instanceof Error ? e.message : 'Das hat nicht geklappt.')
      setPhase('error')
    }
  }

  const cancel = () => finish(false)

  return (
    <Sheet open={open} onClose={() => (phase === 'working' ? undefined : cancel())} title="KI einschalten">
      <div className="pb-1">
        <div className="mb-3 flex items-center gap-3">
          <motion.div animate={phase === 'working' && !reduce ? { rotate: [0, -6, 6, 0] } : phase === 'ok' && !reduce ? { y: [0, -10, 0] } : {}} transition={{ duration: 1.2, repeat: phase === 'working' ? Infinity : 0 }}>
            <Mascot size={72} mood={phase === 'ok' ? 'cheer' : phase === 'error' ? 'sad' : 'happy'} />
          </motion.div>
          <p className="text-[15px] leading-snug text-muted">
            {phase === 'ask' && 'Die KI schreibt dir Karteikarten, Quiz und Klassenarbeiten. Dafür schaltest du sie einmal ein.'}
            {phase === 'working' && 'Ein Fenster von Puter ist offen. Lass es kurz offen, es schließt sich selbst.'}
            {phase === 'ok' && 'Fertig! Die KI ist eingeschaltet.'}
            {phase === 'error' && 'Das hat leider nicht geklappt.'}
          </p>
        </div>

        {phase === 'ask' && (
          <ul className="mb-4 grid gap-2.5">
            {POINTS.map(([t, d]) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good-soft text-good-dark">
                  <Check size={14} />
                </span>
                <span className="min-w-0 text-[15px] leading-snug">
                  <b>{t}</b>
                  <span className="block text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {phase === 'working' && (
          <div className="mb-4 rounded-2xl bg-snow p-4" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-line border-t-brand" aria-hidden />
              <span className="font-semibold">Warte auf Puter …</span>
            </div>
            {slow && (
              <p className="mt-3 text-sm text-muted">
                Siehst du das Fenster nicht? Es kann hinter der App liegen oder vom Browser blockiert sein: Erlaube Pop-ups für diese Seite, schließe dieses Fenster und tippe nochmal auf „KI einschalten“.
              </p>
            )}
          </div>
        )}

        {phase === 'ok' && (
          <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-good-soft p-4 font-extrabold text-good-dark" role="status">
            <Check size={22} /> Bereit
          </motion.div>
        )}

        {phase === 'error' && (
          <div className="mb-4 rounded-2xl bg-bad-soft p-4 text-bad-dark" role="alert">
            <p className="font-semibold">{error}</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              <li>Pop-ups erlauben: in der Adressleiste oder in den Browser-Einstellungen für diese Seite.</li>
              <li>Das Fenster von Puter nicht schließen, bis es sich selbst schließt.</li>
              <li>Mit Werbeblocker oder privatem Modus kann es hängen: kurz ausschalten.</li>
            </ul>
          </div>
        )}

        {phase !== 'ok' && (
          <div className="grid gap-2">
            <button type="button" className="btn btn-primary press w-full" onClick={start} disabled={phase === 'working'} autoFocus>
              {phase === 'working' ? 'Warte auf Puter …' : phase === 'error' ? 'Nochmal versuchen' : 'KI einschalten'}
            </button>
            <button type="button" className="btn btn-ghost press w-full" onClick={cancel} disabled={phase === 'working'}>
              Ohne KI weitermachen
            </button>
            <button
              type="button"
              className="press mx-auto min-h-11 rounded-xl px-3 text-sm font-extrabold text-sky-dark"
              disabled={phase === 'working'}
              onClick={() => {
                cancel()
                navigate('/settings/ki')
              }}
            >
              Lieber einen eigenen Schlüssel nutzen
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
