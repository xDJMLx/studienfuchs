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
  /** Blinzeln: 0 = offen, 1 = Ober- und Unterlid treffen sich in der Augenmitte */
  shut: number
}

export const EYE_OPEN: EyeParams = { open: 1, cheek: 0, tilt: 0, pupil: 1, arc: 0, arcOn: 0, scale: 1, shut: 0 }

/** Zielwerte je Augenform; beim Zwinkern ist das rechte Auge das froh-geschlossene. */
export function eyeTarget(eyes: Eyes, mirror: boolean): EyeParams {
  switch (eyes) {
    case 'happy':
      return { open: 0.04, cheek: 0.9, tilt: 0, pupil: 1, arc: -16, arcOn: 1, scale: 1, shut: 0 }
    case 'closed':
      return { open: 0.02, cheek: 0.3, tilt: 0, pupil: 1, arc: 10, arcOn: 1, scale: 1, shut: 0 }
    case 'wide':
      return { open: 1, cheek: 0, tilt: 0, pupil: 0.78, arc: 0, arcOn: 0, scale: 1.13, shut: 0 }
    case 'sad':
      return { open: 0.86, cheek: 0.08, tilt: 1, pupil: 1.1, arc: 0, arcOn: 0, scale: 1, shut: 0 }
    case 'wink':
      return mirror ? eyeTarget('happy', false) : { ...EYE_OPEN }
    default:
      return { ...EYE_OPEN }
  }
}

const KEYS: (keyof EyeParams)[] = ['open', 'cheek', 'tilt', 'pupil', 'arc', 'arcOn', 'scale', 'shut']

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

/** Dauer eines Blinzelns in Sekunden: schnell zu, kurz geschlossen, langsamer wieder auf (wie ein echtes Lid). */
export const BLINK_TOTAL = 0.26
const BLINK_DOWN = 0.07
const BLINK_HOLD = 0.04

/** Wie weit das Lid zu ist (0 offen bis 1 zu), `d` Sekunden nach Beginn des Blinzelns. */
export function blinkClosed(d: number): number {
  if (d <= 0 || d >= BLINK_TOTAL) return 0
  if (d < BLINK_DOWN) {
    const u = d / BLINK_DOWN
    return u * u
  }
  if (d < BLINK_DOWN + BLINK_HOLD) return 1
  const u = (d - BLINK_DOWN - BLINK_HOLD) / (BLINK_TOTAL - BLINK_DOWN - BLINK_HOLD)
  return Math.pow(1 - u, 1.8)
}

/** Das Auge während des Blinzelns: Ober- und Unterlid laufen zur Augenmitte zusammen. */
export function blinked(base: EyeParams, k: number): EyeParams {
  if (k <= 0) return base
  return { ...base, shut: Math.max(base.shut, k) }
}

export const EYE_RX = 15
export const EYE_RY = 19

/** Beim Blinzeln staucht sich das ganze Auge senkrecht zusammen (wie bei Zeichentrickfiguren), erst ganz zu erscheint die Schlusslinie. */
const SHUT_Y = 4
const SHUT_SAG = 4
const SHUT_MIN = 0.06
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Senkrechter Stauchfaktor des Auges (1 = normal). */
export function shutScale(p: EyeParams): number {
  return lerp(1, SHUT_MIN, Math.max(0, Math.min(1, p.shut)))
}

/** Höhe, um die gestaucht wird: etwas unter der Augenmitte, damit die Lider zur Wange hin zugehen. */
export const SHUT_PIVOT = SHUT_Y

/** Sichtfenster des Auges (Lid oben, Wange unten) als Beschneidungspfad.
 * Das Lid sitzt oben bei 1 - open der Augenhöhe; tilt kippt es, cheek hebt die Unterkante. */
export function lidCurve(p: EyeParams, cx: number, cy: number, mirror: boolean): { xl: number; yl: number; xr: number; yr: number; cy: number } {
  const rx = EYE_RX + 4
  const top = cy - EYE_RY * p.scale + (1 - p.open) * EYE_RY * 2 * p.scale
  const tiltDy = p.tilt * 9
  // Außen = von der Nase weg: links ist außen links
  const outer = top + tiltDy
  const inner = top - tiltDy * 0.5
  const yl = mirror ? inner : outer
  const yr = mirror ? outer : inner
  // Ein sinkendes Lid wölbt sich in der Mitte nach unten, ein offenes liegt flach
  const sag = 7 * Math.max(0, Math.min(1, (1 - p.open) * 1.4)) * (1 - p.arcOn)
  return { xl: cx - rx, yl, xr: cx + rx, yr, cy: (yl + yr) / 2 + sag * 2 }
}

export function eyeWindow(p: EyeParams, cx: number, cy: number, mirror: boolean): string {
  const c = lidCurve(p, cx, cy, mirror)
  const bottom = cy + EYE_RY * p.scale + 4
  // Die Wange darf das Fenster nie über das Oberlid hinaus anheben, sonst kreuzen sich die Kanten und es bleiben Reste von Weiß und Pupille stehen
  const topMid = (c.yl + 2 * c.cy + c.yr) / 4
  const lift = Math.min(p.cheek * EYE_RY * 1.5, Math.max(0, (bottom - topMid) / 0.9))
  return `M${r(c.xl)} ${r(c.yl)} Q${r(cx)} ${r(c.cy)} ${r(c.xr)} ${r(c.yr)} L${r(c.xr)} ${r(bottom)} Q${r(cx)} ${r(bottom - lift * 1.8)} ${r(c.xl)} ${r(bottom)} Z`
}

/** Linie des Oberlids auf der Kante des Sichtfensters; beim fast geschlossenen Blinzeln stattdessen die Schlusslinie. */
export function eyeLid(p: EyeParams, cx: number, cy: number, mirror: boolean): string {
  if (p.shut > 0.5) {
    const y = cy + SHUT_Y
    return `M${r(cx - EYE_RX + 1)} ${r(y)} Q${r(cx)} ${r(y + SHUT_SAG * 2)} ${r(cx + EYE_RX - 1)} ${r(y)}`
  }
  const c = lidCurve(p, cx, cy, mirror)
  return `M${r(c.xl)} ${r(c.yl)} Q${r(cx)} ${r(c.cy)} ${r(c.xr)} ${r(c.yr)}`
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Wie deutlich die Lidlinie zu sehen ist: bei sinkendem Lid, und am Ende des Blinzelns als Schlusslinie; nicht bei Bogenaugen. */
export function lidOpacity(p: EyeParams): number {
  return Math.round(Math.max(0, Math.min(1, Math.max((1 - p.open) * 3, smooth(0.78, 0.97, p.shut)))) * (1 - p.arcOn) * 100) / 100
}

/** Bogenlinie für froh ("^") und schlafend ("u"). */
export function eyeArc(p: EyeParams, cx: number, cy: number): string {
  return `M${r(cx - 15)} ${r(cy + 6)} Q${r(cx)} ${r(cy + p.arc)} ${r(cx + 15)} ${r(cy + 6)}`
}
