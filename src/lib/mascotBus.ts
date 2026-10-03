/**
 * Kleiner Nachrichtenkanal für den Fuchs: Die App sagt, was passiert ist (richtig, falsch, Stufe geschafft, Wort wird gesprochen),
 * und jeder Fuchs, der zuhört, reagiert darauf. So hängt das Maskottchen nicht an einzelnen Bildschirmen.
 */
export type MascotEvent = 'correct' | 'almost' | 'wrong' | 'cheer' | 'levelup' | 'pass' | 'fail' | 'speak:start' | 'speak:end'

type Listener = (e: MascotEvent) => void
const listeners = new Set<Listener>()

type LevelListener = (level: number, bright: number) => void
const levelListeners = new Set<LevelListener>()

export const mascotBus = {
  /** Lautstärke (0 bis 1) und Helligkeit des Klangs (0 bis 1) der gerade gesprochenen Aufnahme, einmal pro Bild. */
  emitLevel(level: number, bright: number) {
    for (const l of levelListeners) l(level, bright)
  },
  onLevel(l: LevelListener): () => void {
    levelListeners.add(l)
    return () => levelListeners.delete(l)
  },
  emit(e: MascotEvent) {
    for (const l of [...listeners]) l(e)
  },
  on(l: Listener): () => void {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

/**
 * Zeigerposition für die Augen: ein einziger Beobachter für die ganze App, der die angemeldeten Füchse
 * pro Bildschirmbild (requestAnimationFrame) einmal neu ausrichtet. Kein React-Zustand, damit nichts neu gezeichnet wird.
 */
type Target = { el: HTMLElement; gaze?: (dx: number, dy: number, dist: number) => void; wake: () => void }
const targets = new Set<Target>()
let pointer: { x: number; y: number } | null = null
let raf = 0
let started = false
let lastMove = Date.now()

function flush() {
  raf = 0
  if (!pointer) return
  for (const t of targets) {
    if (!t.gaze) continue
    const r = t.el.getBoundingClientRect()
    if (!r.width) continue
    const dx = pointer.x - (r.left + r.width / 2)
    const dy = pointer.y - (r.top + r.height * 0.42)
    t.gaze(dx, dy, Math.hypot(dx, dy))
  }
}

function onMove(ev: PointerEvent) {
  pointer = { x: ev.clientX, y: ev.clientY }
  lastMove = Date.now()
  for (const t of targets) t.wake()
  if (!raf) raf = requestAnimationFrame(flush)
}

export function trackGaze(t: Target): () => void {
  if (!started && typeof window !== 'undefined') {
    started = true
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
  }
  targets.add(t)
  if (pointer && !raf) raf = requestAnimationFrame(flush)
  return () => targets.delete(t)
}

/** Sekunden seit der letzten Bewegung des Zeigers (für das Einschlafen). */
export const idleSeconds = () => (Date.now() - lastMove) / 1000
