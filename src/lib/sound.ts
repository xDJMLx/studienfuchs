// Kleine selbst erzeugte Töne (WebAudio) – keine fremden Audiodateien nötig.
import { useStore } from '../store/useStore'

let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  if (!useStore.getState().soundOn) return
  try {
    ctx ??= new AudioContext()
    const t0 = ctx.currentTime + start
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(gain, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  } catch {
    /* Audio nicht verfügbar – egal */
  }
}

export const playCorrect = () => {
  tone(660, 0, 0.14)
  tone(880, 0.1, 0.22)
}
export const playWrong = () => {
  tone(220, 0, 0.18, 'triangle', 0.14)
  tone(165, 0.12, 0.26, 'triangle', 0.14)
}
export const playDone = () => {
  ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3))
}
