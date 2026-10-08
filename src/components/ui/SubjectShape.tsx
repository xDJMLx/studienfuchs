import type { SVGProps } from 'react'

/**
 * Jedes Fach hat neben seiner Farbe eine feste Form (Dreieck, Kreis, Quadrat …). So erkennt man ein Fach auch ohne Farbensehen und
 * auf einen Blick, wie bei den Antwortblöcken von Kahoot. Die Formen sind bewusst einfach und gefüllt.
 */
const SHAPES: Record<string, string> = {
  triangle: 'M12 3 L22 20 H2 Z',
  circle: 'M12 3 a9 9 0 1 0 0.001 0 Z',
  square: 'M6 4 H18 a2 2 0 0 1 2 2 V18 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2 -2 V6 a2 2 0 0 1 2 -2 Z',
  diamond: 'M12 2 L22 12 L12 22 L2 12 Z',
  hexagon: 'M12 2 L21 7 V17 L12 22 L3 17 V7 Z',
  pentagon: 'M12 2 L22 9.5 L18 21 H6 L2 9.5 Z',
  plus: 'M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z',
  star: 'M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z',
  drop: 'M12 2 C12 2 20 10.5 20 15 a8 8 0 0 1 -16 0 C4 10.5 12 2 12 2 Z',
  moon: 'M20 14.5 A9 9 0 1 1 9.5 4 a7 7 0 0 0 10.5 10.5 Z',
  heart: 'M12 21 C12 21 3 14.5 3 8.8 A4.8 4.8 0 0 1 12 6.5 A4.8 4.8 0 0 1 21 8.8 C21 14.5 12 21 12 21 Z',
  ring: 'M12 3 a9 9 0 1 0 0.001 0 Z M12 8 a4 4 0 1 1 -0.001 0 Z',
  bolt: 'M13.5 2 L5 13.2 H11 L10 22 L19 10.5 H13 Z',
}

/** Welche Form zu welchem Fach gehört. */
const SHAPE_OF: Record<string, keyof typeof SHAPES> = {
  mathe: 'triangle',
  deutsch: 'circle',
  englisch: 'square',
  franzoesisch: 'diamond',
  biologie: 'hexagon',
  geschichte: 'pentagon',
  physik: 'bolt',
  chemie: 'drop',
  geografie: 'ring',
  politik: 'plus',
  informatik: 'star',
  kunst: 'heart',
  musik: 'moon',
  sonstiges: 'square',
}

export function SubjectShape({ id, size = 26, ...p }: { id: string; size?: number } & Omit<SVGProps<SVGSVGElement>, 'id'>) {
  const d = SHAPES[SHAPE_OF[id] ?? 'circle']
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" {...p}>
      <path d={d} />
    </svg>
  )
}
