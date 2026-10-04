// Sprachausgabe. Vorrang haben die mitgelieferten Aufnahmen (public/audio, mit Piper erzeugt): Sie klingen bei allen gleich gut.
// Fehlt eine Aufnahme (z. B. bei eigenen Sets), springt die Stimme des Geräts über die Web Speech API ein.
import { useStore } from '../store/useStore'
import { mascotBus } from './mascotBus'
import { audioKey, speechText } from './audioKey'

export const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window

const audioBase = (import.meta.env.BASE_URL ?? '/') + 'audio/'

// ---- mitgelieferte Aufnahmen ----
let available: Set<string> | null = null
let loading: Promise<void> | null = null

/** Liste der vorhandenen Aufnahmen einmal laden (audio/index.json). */
export function loadAudioIndex(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  loading ??= fetch(audioBase + 'index.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((keys: string[]) => {
      available = new Set(keys)
    })
    .catch(() => {
      available = new Set()
    })
  return loading
}

export function hasRecording(text: string): boolean {
  return available?.has(audioKey(text)) ?? false
}

let current: HTMLAudioElement | null = null

let audioCtx: AudioContext | null = null

/**
 * Lippenbewegung nach dem echten Klang: Lautstärke und Helligkeit der Aufnahme gehen an den Fuchs.
 * Nur wenn der Audio-Kontext schon läuft; sonst würde der Ton über einen angehaltenen Kontext verstummen.
 * Beim ersten Mal wird er nur gestartet, ab dem nächsten Wort bewegt sich der Mund im Takt der Stimme.
 */
function attachLevel(a: HTMLAudioElement): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    audioCtx ??= new AC()
    if (audioCtx.state !== 'running') {
      void audioCtx.resume()
      return
    }
    const ctx = audioCtx
    const src = ctx.createMediaElementSource(a)
    const an = ctx.createAnalyser()
    an.fftSize = 512
    an.smoothingTimeConstant = 0.35
    src.connect(an)
    an.connect(ctx.destination)
    const wave = new Uint8Array(an.fftSize)
    const freq = new Uint8Array(an.frequencyBinCount)
    const split = Math.max(2, Math.floor((1500 / (ctx.sampleRate / 2)) * freq.length))
    const loop = () => {
      an.getByteTimeDomainData(wave)
      let sum = 0
      for (const v of wave) {
        const d = (v - 128) / 128
        sum += d * d
      }
      an.getByteFrequencyData(freq)
      let lo = 0
      let hi = 0
      for (let i = 1; i < freq.length; i++) {
        if (i < split) lo += freq[i]
        else hi += freq[i]
      }
      mascotBus.emitLevel(Math.min(1, Math.sqrt(sum / wave.length) * 4.5), Math.min(1, (hi / (lo + hi + 1)) * 2))
      if (!a.paused && !a.ended) requestAnimationFrame(loop)
      else mascotBus.emitLevel(0, 0)
    }
    requestAnimationFrame(loop)
  } catch {
    // ohne Analyse läuft der Ton ganz normal weiter
  }
}

function playRecording(text: string, rate: number): void {
  current?.pause()
  const a = new Audio(`${audioBase}${audioKey(text)}.mp3`)
  a.playbackRate = rate
  a.preservesPitch = true
  current = a
  a.addEventListener('ended', () => mascotBus.emit('speak:end'), { once: true })
  a.addEventListener('pause', () => mascotBus.emit('speak:end'), { once: true })
  mascotBus.emit('speak:start')
  attachLevel(a)
  void a.play().catch(() => mascotBus.emit('speak:end'))
}

// ---- Stimmen des Geräts (Reserve) ----
/** Je höher, desto natürlicher klingt die Stimme meistens (neuronale/Online-Stimmen vor alten Robotern). */
export function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase()
  let s = 0
  if (/natural|neural/.test(n)) s += 100
  if (/premium|enhanced|erweitert/.test(n)) s += 80
  if (/google/.test(n)) s += 60
  if (/online/.test(n)) s += 50
  if (/(amélie|amelie|thomas|audrey|denise|henri|eloise|vivienne|remy|rémy)/.test(n)) s += 30
  if (v.lang.toLowerCase().replace('_', '-') === 'fr-fr') s += 10
  if (v.localService) s += 1
  return s
}

export function frenchVoices(): SpeechSynthesisVoice[] {
  if (!speechAvailable) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('fr'))
    .sort((a, b) => voiceScore(b) - voiceScore(a))
}

function deviceVoice(): SpeechSynthesisVoice | null {
  const voices = frenchVoices()
  const wanted = useStore.getState().voiceName
  return (wanted && voices.find((v) => v.name === wanted)) || voices[0] || null
}

/** Kann überhaupt etwas vorgelesen werden (Aufnahmen oder Gerätestimme)? Dann gibt es auch Hörübungen. */
export function hasFrenchVoice(): boolean {
  if (!useStore.getState().speechOn) return false
  return (available?.size ?? 0) > 0 || (speechAvailable && frenchVoices().length > 0)
}

/**
 * Liest einen französischen Text vor.
 * voiceName '' (Standard) = mitgelieferte Aufnahme, sonst/ersatzweise Gerätestimme; ein Stimmenname erzwingt die Gerätestimme.
 */
export function speak(text: string, lang = 'fr-FR', rateFactor = 1): void {
  const { speechOn, speechRate, voiceName } = useStore.getState()
  if (!speechOn) return
  const rate = Math.max(0.3, speechRate * rateFactor)

  if (!voiceName && hasRecording(text)) {
    playRecording(text, rate)
    return
  }
  if (!speechAvailable) return
  current?.pause()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(speechText(text))
  u.lang = lang
  u.rate = rate
  const v = deviceVoice()
  // Die gewählte Stimme ist eine französische: nur dort einsetzen, sonst spricht sie Englisch mit Akzent
  if (v && lang.startsWith('fr')) u.voice = v
  u.onstart = () => mascotBus.emit('speak:start')
  u.onend = () => mascotBus.emit('speak:end')
  u.onerror = () => mascotBus.emit('speak:end')
  window.speechSynthesis.speak(u)
}

// Aufnahmen-Liste direkt beim Start laden, damit der erste Klick sofort die gute Stimme nutzt.
void loadAudioIndex()

const warmed = new Set<string>()

/**
 * Lädt die Aufnahmen der nächsten Wörter im Hintergrund vor (landen im Browser- und App-Cache),
 * damit das Vorlesen im Mobilnetz ohne Wartezeit startet. Nur wenige, nur wenn nicht gespart werden soll.
 */
export function prefetchRecordings(texts: string[], max = 10): void {
  if (typeof window === 'undefined') return
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData) return
  void loadAudioIndex().then(() => {
    let n = 0
    for (const t of texts) {
      if (n >= max) break
      if (!t || !hasRecording(t)) continue
      const url = `${audioBase}${audioKey(t)}.mp3`
      if (warmed.has(url)) continue
      warmed.add(url)
      n++
      fetch(url, { priority: 'low' } as RequestInit).catch(() => warmed.delete(url))
    }
  })
}
