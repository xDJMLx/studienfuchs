// Sprachausgabe. Vorrang haben die mitgelieferten Aufnahmen (public/audio, mit Piper erzeugt): Sie klingen bei allen gleich gut.
// Fehlt eine Aufnahme (z. B. bei eigenen Sets), springt die Stimme des Geräts über die Web Speech API ein.
import { useStore } from '../store/useStore'
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

function playRecording(text: string, rate: number): void {
  current?.pause()
  const a = new Audio(`${audioBase}${audioKey(text)}.mp3`)
  a.playbackRate = rate
  a.preservesPitch = true
  current = a
  void a.play().catch(() => {})
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
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

// Aufnahmen-Liste direkt beim Start laden, damit der erste Klick sofort die gute Stimme nutzt.
void loadAudioIndex()
