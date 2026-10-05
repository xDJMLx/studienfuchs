/**
 * Klick-Gefühl: Jede Art von Knopf federt auf ihre eigene Weise zurück, sobald man ihn antippt.
 * Hier wird gewählt, welche Bewegung zu welchem Element passt (siehe FRAMES), und eine zufällige Richtung gesetzt,
 * damit zwei Klicks nie ganz gleich aussehen.
 *
 * - pop:    Knöpfe (.btn): kurz quetschen, dann überschießen
 * - wobble: Auswahl (Chips, Kacheln, Radio/Checkbox/Schalter): wackelt leicht seitlich
 * - nudge:  Karten und Zeilen: kleiner Ruck nach oben und zurück
 * - spin:   kleine runde Knöpfe: drehen kurz und federn
 * - soft:   alles andere zum Antippen
 *
 */
export type Feel = 'pop' | 'wobble' | 'nudge' | 'spin' | 'soft'

/** Was überhaupt reagiert. Absichtlich nur Elemente mit diesen Klassen oder Rollen, nicht jedes Fenster und jede Fläche. */
export const FEEL_SELECTOR = '.btn, .chip, .tile, .press, .lift, [role="radio"], [role="checkbox"], [role="switch"]'

const SIZE_SPIN = 56

export function feelOf(el: Element): Feel | null {
  if (el.closest('.tabbar, [data-no-feel]')) return null
  if (el.matches('[disabled], [aria-disabled="true"]')) return null
  // Elemente, die framer-motion selbst bewegt (inline transform), nicht überfahren
  if (el instanceof HTMLElement && el.style.transform && el.style.transform !== 'none') return null
  if (el.matches('.btn')) return 'pop'
  if (el.matches('.chip, .tile, [role="radio"], [role="checkbox"], [role="switch"]')) return 'wobble'
  if (el.matches('.card, .lift')) return 'nudge'
  if (el.matches('[class*="rounded-full"]')) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.width <= SIZE_SPIN && r.height <= SIZE_SPIN) return 'spin'
  }
  return 'soft'
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Bewegung je Art. `j` (1 oder -1) kippt die Drehrichtung. */
const FRAMES: Record<Feel, { frames: (j: number) => Keyframe[]; ms: number }> = {
  pop: {
    ms: 460,
    frames: () => [
      { transform: 'scale(0.95)', offset: 0 },
      { transform: 'scale(1.09, 0.95)', offset: 0.28 },
      { transform: 'scale(0.97, 1.05)', offset: 0.52 },
      { transform: 'scale(1.015, 0.99)', offset: 0.76 },
      { transform: 'scale(1)', offset: 1 },
    ],
  },
  wobble: {
    ms: 520,
    frames: (j) => [
      { transform: 'scale(0.94) rotate(0deg)', offset: 0 },
      { transform: `scale(1.07) rotate(${j * 3.2}deg)`, offset: 0.25 },
      { transform: `scale(0.99) rotate(${j * -2}deg)`, offset: 0.5 },
      { transform: `scale(1.01) rotate(${j * 0.8}deg)`, offset: 0.75 },
      { transform: 'scale(1) rotate(0deg)', offset: 1 },
    ],
  },
  nudge: {
    ms: 420,
    frames: (j) => [
      { transform: 'translateY(2px) scale(0.985)', offset: 0 },
      { transform: `translateY(-4px) skewX(${j * 0.7}deg)`, offset: 0.3 },
      { transform: `translateY(1.5px) skewX(${j * -0.3}deg)`, offset: 0.6 },
      { transform: 'translateY(0)', offset: 1 },
    ],
  },
  spin: {
    ms: 500,
    frames: (j) => [
      { transform: 'scale(0.88) rotate(0deg)', offset: 0 },
      { transform: `scale(1.16) rotate(${j * 16}deg)`, offset: 0.38 },
      { transform: `scale(0.97) rotate(${j * -6}deg)`, offset: 0.68 },
      { transform: 'scale(1) rotate(0deg)', offset: 1 },
    ],
  },
  soft: {
    ms: 340,
    frames: () => [
      { transform: 'scale(0.97)', offset: 0 },
      { transform: 'scale(1.035)', offset: 0.45 },
      { transform: 'scale(1)', offset: 1 },
    ],
  },
}

/**
 * Lässt ein Element federn. Bewusst mit der Web-Animations-API und nicht über eine CSS-Klasse:
 * React setzt die Klassen eines Knopfes beim Umschalten neu und würde eine Klasse mitten in der Bewegung löschen.
 * Läuft die Bewegung noch, startet sie neu.
 */
export function jiggle(el: Element, feel: Feel, random: () => number = Math.random): void {
  if (!(el instanceof HTMLElement) || typeof el.animate !== 'function') return
  for (const a of el.getAnimations?.() ?? []) if (a.id.startsWith('feel-')) a.cancel()
  const j = random() < 0.5 ? -1 : 1
  const { frames, ms } = FRAMES[feel]
  const anim = el.animate(frames(j), { duration: ms, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' })
  anim.id = `feel-${feel}`
}

/** Hört auf Klicks im ganzen Dokument (Delegation) und lässt das getroffene Element federn. Gibt eine Abmeldefunktion zurück. */
export function installFeel(doc: Document = document): () => void {
  const onClick = (e: Event) => {
    if (reducedMotion()) return
    const t = e.target
    if (!(t instanceof Element)) return
    const el = t.closest(FEEL_SELECTOR)
    if (!el) return
    const feel = feelOf(el)
    if (feel) jiggle(el, feel)
  }
  doc.addEventListener('click', onClick, true)
  return () => doc.removeEventListener('click', onClick, true)
}
