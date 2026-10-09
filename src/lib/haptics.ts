import { useStore } from '../store/useStore'
import { mascotBus, type MascotEvent } from './mascotBus'

/**
 * Fühlbares Feedback: Jeder Tipp auf etwas Bedienbares gibt einen winzigen Tick, richtig/falsch/geschafft haben je ihr eigenes Muster.
 * Android (Chrome) vibriert über die Vibrations-Schnittstelle. iPhones haben sie nicht: Dort löst ein verstecktes Schalter-Feld
 * (`<input type="checkbox" switch>`, Safari ab 17.4) denselben leisen Tick aus. Läuft zusammen mit den Tönen unter einem Schalter.
 */
export type Haptic = 'tick' | 'select' | 'success' | 'warn' | 'error' | 'celebrate'

/** Vibrationsmuster in Millisekunden (Zahl = ein Puls, Liste = Puls, Pause, Puls …). */
export const PATTERNS: Record<Haptic, number[]> = {
  tick: [6],
  select: [10],
  success: [10, 30, 18],
  warn: [18, 40, 18],
  error: [32, 50, 32],
  celebrate: [16, 40, 16, 40, 16, 40, 70],
}

let sw: HTMLLabelElement | null = null
let last = 0

function iosTick(): void {
  if (typeof document === 'undefined') return
  if (!sw) {
    sw = document.createElement('label')
    sw.setAttribute('aria-hidden', 'true')
    sw.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.setAttribute('switch', '')
    box.tabIndex = -1
    sw.appendChild(box)
    document.body.appendChild(sw)
  }
  sw.click()
}

export function haptic(kind: Haptic): void {
  if (!useStore.getState().soundOn) return
  const now = Date.now()
  if (now - last < 25) return
  last = now
  const pattern = PATTERNS[kind]
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
      return
    }
    // iPhone: ein Tick pro Puls, die Pausen zählen die Zeit
    let at = 0
    pattern.forEach((ms, i) => {
      if (i % 2 === 0) window.setTimeout(iosTick, at)
      at += ms
    })
  } catch {
    /* nicht unterstützt */
  }
}

const FOR_EVENT: Partial<Record<MascotEvent, Haptic>> = {
  correct: 'success',
  almost: 'warn',
  wrong: 'error',
  cheer: 'success',
  levelup: 'celebrate',
  pass: 'celebrate',
  fail: 'warn',
}

/** Was sich antippen lässt. Die untere Leiste macht ihr Feedback selbst (beim Wischen wechselt der Tab unter dem Finger). */
const TAPPABLE = 'button, a[href], summary, label, [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [role="tab"], .chip, .tile, .press'

export function installHaptics(doc: Document = document): () => void {
  const onDown = (e: Event) => {
    const t = e.target
    if (!(t instanceof Element)) return
    const el = t.closest(TAPPABLE)
    if (!el || el.closest('.tabbar, [data-no-haptic]')) return
    if (el.matches('[disabled], [aria-disabled="true"]')) return
    haptic('tick')
  }
  doc.addEventListener('pointerdown', onDown, true)
  // iOS Safari zeigt :active (das Eindrücken der Knöpfe) nur, wenn irgendwo ein Touch-Beobachter hängt
  const noop = () => undefined
  doc.addEventListener('touchstart', noop, { passive: true })
  const off = mascotBus.on((e) => {
    const h = FOR_EVENT[e]
    if (h) haptic(h)
  })
  return () => {
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('touchstart', noop)
    off()
  }
}
