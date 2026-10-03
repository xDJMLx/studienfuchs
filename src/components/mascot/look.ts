import type { MouthName } from './mouth'

export type Eyes = 'open' | 'happy' | 'closed' | 'wide' | 'sad' | 'wink'
export type Fx = 'sparkles' | 'tear' | 'question' | 'zzz' | 'hearts' | 'confetti' | null

/** Wie der Fuchs gerade aussieht: jedes Teil hat seinen eigenen Wert. */
export interface Look {
  eyes: Eyes
  mouth: MouthName
  /** Augenbrauen: [Verschiebung in y, Drehung in Grad] */
  browL: [number, number]
  browR: [number, number]
  earL: number
  earR: number
  armL: number
  armR: number
  /** Arme vor dem Kopf zeichnen (Hand am Kinn, Hände an den Wangen) */
  armFront?: boolean
  /** Arme wechselnd hoch und runter */
  dance?: boolean
  headRot: number
  headY: number
  blush: number
  fx: Fx
  /** Blickrichtung ohne Zeiger, in Zeichnungseinheiten */
  gaze: [number, number]
}

export const NEUTRAL: Look = { eyes: 'open', mouth: 'smile', browL: [0, 0], browR: [0, 0], earL: 0, earR: 0, armL: 0, armR: 0, headRot: 0, headY: 0, blush: 0.35, fx: null, gaze: [0, 0] }

export type Mood = 'happy' | 'cheer' | 'sad' | 'think' | 'wave' | 'sleep' | 'surprised' | 'love' | 'wink' | 'laugh' | 'yawn' | 'dance' | 'proud' | 'determined'
export type PoseName = Mood | 'idle'

/** Alle Posen als Abweichung von der ruhigen Grundhaltung. */
export const POSES: Record<PoseName, Partial<Look>> = {
  idle: {},
  happy: { mouth: 'grin', blush: 0.5, browL: [-2, -4], browR: [-2, 4] },
  cheer: { eyes: 'happy', mouth: 'grin', armL: 110, armR: -110, earL: -8, earR: 8, browL: [-4, -6], browR: [-4, 6], blush: 0.6, fx: 'sparkles', headY: -2 },
  sad: { eyes: 'sad', mouth: 'sad', browL: [2, -14], browR: [2, 14], earL: 16, earR: -16, headRot: -5, headY: 5, gaze: [0, 4], blush: 0.15, fx: 'tear', armL: 6, armR: -6 },
  think: { mouth: 'flat', browL: [-3, 0], browR: [-9, 10], headRot: 7, armR: 118, armFront: true, gaze: [5, -5], fx: 'question', earL: -4 },
  wave: { mouth: 'grin', armR: -112, headRot: -4, blush: 0.5 },
  sleep: { eyes: 'closed', mouth: 'flat', headRot: 9, headY: 7, earL: 10, earR: -10, armL: 4, armR: -4, fx: 'zzz', browL: [3, 0], browR: [3, 0] },
  surprised: { eyes: 'wide', mouth: 'o', browL: [-8, -6], browR: [-8, 6], earL: -10, earR: 10, armL: 28, armR: -28 },
  love: { eyes: 'happy', mouth: 'grin', blush: 0.75, fx: 'hearts', headRot: -4, armL: 128, armR: -128, armFront: true },
  wink: { eyes: 'wink', mouth: 'grin', headRot: -7, browL: [0, 0], browR: [-5, 7], blush: 0.55, fx: 'sparkles', armR: -20 },
  laugh: { eyes: 'happy', mouth: 'laugh', headRot: -5, headY: -3, blush: 0.7, earL: -6, earR: 6, armL: 18, armR: -18, browL: [-3, -5], browR: [-3, 5] },
  yawn: { eyes: 'closed', mouth: 'yawn', headRot: -3, headY: -3, earL: 8, earR: -8, browL: [-3, 0], browR: [-3, 0], armL: 6, armR: -6 },
  dance: { eyes: 'happy', mouth: 'laugh', dance: true, blush: 0.65, fx: 'confetti', earL: -8, earR: 8, headY: -2, browL: [-4, -6], browR: [-4, 6] },
  proud: { eyes: 'happy', mouth: 'smile', headRot: -3, headY: -4, blush: 0.55, armL: 16, armR: -16, browL: [-3, -3], browR: [-3, 3], fx: 'sparkles', earL: -5, earR: 5 },
  determined: { mouth: 'flat', browL: [4, 9], browR: [4, -9], armL: 14, armR: -14, headY: 1, earL: 3, earR: -3, blush: 0.2 },
}

/** Fertige Beschreibung für eine Pose; beim Sprechen bewegt sich der Mund im Takt. */
export function resolveLook(active: PoseName, talking: boolean, mouthOpen: boolean): Look {
  const look: Look = { ...NEUTRAL, ...POSES[active] }
  if (talking && (look.mouth === 'smile' || look.mouth === 'grin' || look.mouth === 'flat')) look.mouth = mouthOpen ? 'talk' : 'smile'
  return look
}
