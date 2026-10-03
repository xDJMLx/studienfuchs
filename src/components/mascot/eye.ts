import type { Eyes } from './look'

/**
 * Die Augen werden wie der Mund aus Zahlen gezeichnet: Lid oben, Wangen unten, Neigung und Pupille.
 * Dadurch gehen offen, froh, zu, traurig und überrascht stufenlos ineinander über (kein Überblenden).
 */
export interface EyeParams {
  /** 0 = Lid zu, 1 = ganz offen */
  open: number
  /** Wange schiebt das Auge von unten hoch (froh/Blinzeln) */
  cheek: number
  /** Neigung des Oberlids: positiv = außen tiefer (traurig), negativ = innen tiefer (entschlossen) */
  tilt: number
  /** Pupillengröße (1 = normal) */
  pupil: number
  /** Bogenaugen "^" (froh) oder "u" (schlafend): Krümmung und Sichtbarkeit */
  arc: number
  arcOn: number
  /** Gesamtgröße (überrascht) */
  scale: number
}

export const EYE_OPEN: EyeParams = { open: 1, cheek: 0, tilt: 0, pupil: 1, arc: 0, arcOn: 0, scale: 1 }

/** Zielwerte je Augenform; beim Zwinkern ist das rechte Auge das froh-geschlossene. */
export function eyeTarget(eyes: Eyes, mirror: boolean): EyeParams {
  switch (eyes) {
    case 'happy':
      return { open: 0.04, cheek: 0.9, tilt: 0, pupil: 1, arc: -16, arcOn: 1, scale: 1 }
    case 'closed':
      return { open: 0.02, cheek: 0.3, tilt: 0, pupil: 1, arc: 10, arcOn: 1, scale: 1 }
    case 'wide':
      return { open: 1, cheek: 0, tilt: 0, pupil: 0.78, arc: 0, arcOn: 0, scale: 1.13 }
    case 'sad':
      return { open: 0.86, cheek: 0.08, tilt: 1, pupil: 1.1, arc: 0, arcOn: 0, scale: 1 }
    case 'wink':
      return mirror ? eyeTarget('happy', false) : { ...EYE_OPEN }
    default:
      return { ...EYE_OPEN }
  }
}

const KEYS: (keyof EyeParams)[] = ['open', 'cheek', 'tilt', 'pupil', 'arc', 'arcOn', 'scale']

/** Weiches Annähern an das Ziel (Lider sind schnell, daher hohe Geschwindigkeit). Gibt zurück, ob noch Bewegung ist. */
export function stepEye(cur: EyeParams, target: EyeParams, dtMs: number, speed = 0.03): boolean {
  const k = 1 - Math.exp(-Math.min(dtMs, 64) * speed)
  let moving = false
  for (const key of KEYS) {
    const d = target[key] - cur[key]
    if (Math.abs(d) < 0.003) cur[key] = target[key]
    else {
      cur[key] += d * k
      moving = true
    }
  }
  return moving
}

const r = (n: number) => Math.round(n * 100) / 100

export const EYE_RX = 15
export const EYE_RY = 19

/**
 * Sichtfenster des Auges (Lid oben, Wange unten) als Beschneidungspfad.
 * Das Lid sitzt oben bei 1 - open der Augenhöhe; tilt kippt es, cheek hebt die Unterkante.
 */
export function eyeWindow(p: EyeParams, cx: number, cy: number, mirror: boolean): string {
  const rx = EYE_RX + 4
  const top = cy - EYE_RY * p.scale + (1 - p.open) * EYE_RY * 2 * p.scale
  const tiltDy = p.tilt * 9
  // Außen = von der Nase weg: links ist außen links
  const outer = top + tiltDy
  const inner = top - tiltDy * 0.5
  const xl = cx - rx
  const xr = cx + rx
  const yl = mirror ? inner : outer
  const yr = mirror ? outer : inner
  const bottom = cy + EYE_RY * p.scale + 4
  const lift = p.cheek * EYE_RY * 1.5
  return `M${r(xl)} ${r(yl)} L${r(xr)} ${r(yr)} L${r(xr)} ${r(bottom)} Q${r(cx)} ${r(bottom - lift * 1.8)} ${r(xl)} ${r(bottom)} Z`
}

/** Bogenlinie für froh ("^") und schlafend ("u"). */
export function eyeArc(p: EyeParams, cx: number, cy: number): string {
  return `M${r(cx - 15)} ${r(cy + 6)} Q${r(cx)} ${r(cy + p.arc)} ${r(cx + 15)} ${r(cy + 6)}`
}
