// Spracherkennung (Aussprache-Übung) über die Web Speech API. Nicht in allen Browsern verfügbar (z. B. nicht in Firefox).
interface RecognitionResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionResultLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => RecognitionLike

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const recognitionAvailable = ctor() !== null

export interface Listening {
  stop: () => void
}

/** Hört einmal zu und liefert die Alternativen als Text; `error` z. B. "not-allowed" (Mikrofon verweigert). */
export function listenOnce(onDone: (alternatives: string[], error?: string) => void, lang = 'fr-FR'): Listening {
  const C = ctor()
  if (!C) {
    onDone([], 'not-supported')
    return { stop: () => {} }
  }
  const rec = new C()
  rec.lang = lang
  rec.interimResults = false
  rec.maxAlternatives = 3
  let finished = false
  const finish = (alts: string[], error?: string) => {
    if (finished) return
    finished = true
    onDone(alts, error)
  }
  rec.onresult = (e) => finish(Array.from(e.results[0] ?? []).map((a) => a.transcript))
  rec.onerror = (e) => finish([], e.error)
  rec.onend = () => finish([], 'no-speech')
  try {
    rec.start()
  } catch {
    finish([], 'start-failed')
  }
  return { stop: () => rec.stop() }
}
