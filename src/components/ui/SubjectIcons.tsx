import type { ReactNode } from 'react'

/**
 * Eigene Fach-Symbole im Stil der übrigen Icons: weiße Formen auf der Farbfläche der Kachel.
 * `ink` ist die Farbe der Kachel, damit Aussparungen (Linien in einer weißen Fläche) passen.
 */
type Draw = (ink: string) => ReactNode

const stroke = { fill: 'none', stroke: '#fff', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const DRAW: Record<string, Draw> = {
  // Plus, Minus, Mal, Geteilt
  mathe: () => (
    <g {...stroke}>
      <path d="M4.5 7.5h6M7.5 4.5v6" />
      <path d="M13.5 7.5h6" />
      <path d="M5 14.5l5 5M10 14.5l-5 5" />
      <path d="M13.5 17h6" />
      <circle cx="16.5" cy="13.8" r=".6" fill="#fff" />
      <circle cx="16.5" cy="20.2" r=".6" fill="#fff" />
    </g>
  ),
  // Stift, der schreibt
  deutsch: (ink) => (
    <g>
      <path d="M4.2 19.8l1.1-4.3L16 4.8a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L8.5 18.7z" fill="#fff" />
      <path d="M13.6 7.2l3.2 3.2" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.5 21h7.5" {...stroke} />
    </g>
  ),
  // Sprechblase
  englisch: (ink) => (
    <g>
      <path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5v7A2.5 2.5 0 0 1 18.5 16H12l-4.6 4.2a.6.6 0 0 1-1-.4V16h-.9A2.5 2.5 0 0 1 3 13.5v-7A2.5 2.5 0 0 1 5.5 4Z" fill="#fff" />
      <path d="M7 8.2h10M7 11.8h6.2" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
    </g>
  ),
  // Blatt mit Ader
  biologie: (ink) => (
    <g>
      <path d="M4 20C3.4 11 8.5 4.6 20.5 3.5 21 15 15 20.8 4 20Z" fill="#fff" />
      <path d="M4.5 19.5 15 9" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
    </g>
  ),
  // Sanduhr
  geschichte: (ink) => (
    <g>
      <path d="M7 3h10M7 21h10" {...stroke} />
      <path d="M8 3c0 4.6 3 5.6 4 9-1 3.4-4 4.4-4 9M16 3c0 4.6-3 5.6-4 9 1 3.4 4 4.4 4 9" {...stroke} />
      <path d="M9.4 20h5.2L12 16Z" fill="#fff" />
      <path d="M10.2 6.4h3.6" stroke={ink} strokeWidth="1.2" />
    </g>
  ),
  // Atom
  physik: () => (
    <g>
      <g {...stroke} strokeWidth="1.8">
        <ellipse cx="12" cy="12" rx="9.6" ry="3.8" />
        <ellipse cx="12" cy="12" rx="9.6" ry="3.8" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9.6" ry="3.8" transform="rotate(120 12 12)" />
      </g>
      <circle cx="12" cy="12" r="2.2" fill="#fff" />
    </g>
  ),
  // Erlenmeyerkolben mit Blasen
  chemie: () => (
    <g>
      <path d="M9.5 3h5M10.5 3v6.2L4.8 18.6A2 2 0 0 0 6.5 21.6h11a2 2 0 0 0 1.7-3L13.5 9.2V3" {...stroke} />
      <path d="M7.4 15.6h9.2l2 3.2a1 1 0 0 1-.9 1.5H6.3a1 1 0 0 1-.9-1.5Z" fill="#fff" />
      <circle cx="10.4" cy="12" r=".9" fill="#fff" />
      <circle cx="13.4" cy="13.4" r="1.1" fill="#fff" />
    </g>
  ),
  // Globus
  geografie: () => (
    <g {...stroke} strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3.4 9.4h17.2M3.4 14.6h17.2" />
    </g>
  ),
  // Parlament mit Säulen
  politik: () => (
    <g>
      <path d="M2.8 9.2 12 3.6l9.2 5.6Z" fill="#fff" />
      <path d="M5.6 11.6v6.4M10 11.6v6.4M14 11.6v6.4M18.4 11.6v6.4" {...stroke} strokeWidth="2.2" />
      <path d="M3 20.4h18" {...stroke} strokeWidth="2.4" />
    </g>
  ),
  // Code-Klammern
  informatik: () => (
    <g {...stroke} strokeWidth="2.3">
      <path d="M8 7 3 12l5 5M16 7l5 5-5 5" />
      <path d="M13.4 4.8 10.6 19.2" />
    </g>
  ),
  // Farbpalette
  kunst: (ink) => (
    <g>
      <path d="M12 3a9 9 0 1 0 0 18c1.6 0 2.2-1.1 1.8-2.3-.4-1.2.4-2.4 1.7-2.4H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" fill="#fff" />
      <circle cx="7.6" cy="11.2" r="1.4" fill={ink} />
      <circle cx="10.4" cy="7.2" r="1.4" fill={ink} />
      <circle cx="15.2" cy="7.6" r="1.4" fill={ink} />
    </g>
  ),
  // Noten
  musik: () => (
    <g>
      <path d="M9.4 17.5V5.8L19 3.8v11.4" {...stroke} strokeWidth="2.2" />
      <path d="M9.4 9.3 19 7.3" {...stroke} strokeWidth="2.2" />
      <ellipse cx="7" cy="17.8" rx="3" ry="2.4" fill="#fff" />
      <ellipse cx="16.6" cy="15.6" rx="3" ry="2.4" fill="#fff" />
    </g>
  ),
  // Glühbirne
  sonstiges: (ink) => (
    <g>
      <path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.3V16.6h7.2v-2.5A6.2 6.2 0 0 0 12 2.8Z" fill="#fff" />
      <path d="M9.4 19.2h5.2M10.4 21.6h3.2" {...stroke} strokeWidth="2" />
      <path d="M10.4 10.2 12 12l1.6-1.8" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  ),
}

/** Symbol eines Fachs (weiß); `ink` ist die Farbe der Fläche dahinter. */
export function HelpSubjectIcon({ id, ink, size = 28 }: { id: string; ink: string; size?: number }) {
  const draw = DRAW[id] ?? DRAW.sonstiges
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      {draw(ink)}
    </svg>
  )
}

export const hasSubjectIcon = (id: string): boolean => id in DRAW
