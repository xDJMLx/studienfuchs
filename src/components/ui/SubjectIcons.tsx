import type { ReactNode } from 'react'

/**
 * Eigene Fach-Symbole als kleine Illustrationen (Raster 48 x 48): ein weißer Hauptgegenstand mit Schatten und hellem Ton aus der Fachfarbe,
 * dazu ein goldener oder korallenroter Akzent. `ink` ist die Farbe der Kachel; Tönungen und Schatten werden daraus berechnet.
 */
type Draw = (c: Palette) => ReactNode

interface Palette {
  /** Fachfarbe */
  ink: string
  /** heller Ton der Fachfarbe */
  tint: string
  /** dunkler Ton der Fachfarbe (Schatten, Linien) */
  deep: string
}

const GOLD = '#ffd23f'
const CORAL = '#ff7a6b'
const SKY = '#7cc4ff'
const MINT = '#7ee0a8'

const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
/** Mischt eine #rrggbb-Farbe mit Weiß (t > 0) oder Schwarz (t < 0). */
function shade(color: string, t: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color)
  if (!m) return color
  const n = parseInt(m[1], 16)
  const mix = (v: number) => (t >= 0 ? v + (255 - v) * t : v * (1 + t))
  return `#${hex(mix((n >> 16) & 255))}${hex(mix((n >> 8) & 255))}${hex(mix(n & 255))}`
}

const DRAW: Record<string, Draw> = {
  // Eiffelturm mit Funkeln
  franzoesisch: ({ tint, deep }) => (
    <g>
      <ellipse cx="24" cy="43" rx="14" ry="2.2" fill={deep} opacity=".45" />
      <path d="M24 3.5 25.4 11h-2.8Z" fill="#fff" />
      <path d="M22.4 12.2h3.2l1.3 8.4h-5.8Z" fill="#fff" />
      <path d="M21.3 21.8h5.4l3.3 11.6 3.6 9.6h-5.6l-1.4-4.6h-8.2l-1.4 4.6h-5.6l3.6-9.6Z" fill="#fff" />
      <path d="M20.6 36.2c.6-3.6 2.1-5.5 3.4-5.5s2.8 1.9 3.4 5.5Z" fill={deep} />
      <path d="M21.8 17h4.4M20.4 26.6h7.2" stroke={tint} strokeWidth="1.6" strokeLinecap="round" />
      <path d="m38 9 1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1Z" fill={GOLD} />
      <path d="m9 17 .7 1.8 1.8.7-1.8.7L9 22l-.7-1.8-1.8-.7 1.8-.7Z" fill={GOLD} />
    </g>
  ),
  // Taschenrechner
  mathe: ({ tint, deep }) => (
    <g>
      <rect x="10" y="8.5" width="28" height="35" rx="6.5" fill={deep} opacity=".5" />
      <rect x="10" y="5" width="28" height="35" rx="6.5" fill="#fff" />
      <rect x="14" y="9" width="20" height="9" rx="2.6" fill={deep} />
      <path d="M17 14.6h5M29 12.2v4.8M26.6 14.6h4.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={17.6 + c * 6.4} cy={24 + r * 5.6} r="2.4" fill={r === 2 && c === 2 ? GOLD : tint} />),
      )}
    </g>
  ),
  // Heft mit Bleistift
  deutsch: ({ tint, deep }) => (
    <g>
      <rect x="8" y="9" width="26" height="33" rx="4.5" fill={deep} opacity=".5" />
      <rect x="8" y="6" width="26" height="33" rx="4.5" fill="#fff" />
      <path d="M14 15h14M14 21h14M14 27h9" stroke={tint} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 6v33" stroke={CORAL} strokeWidth="1.6" opacity=".9" />
      <g transform="rotate(38 35 27)">
        <rect x="32" y="8" width="6" height="26" rx="1.4" fill={GOLD} />
        <rect x="32" y="8" width="6" height="5" rx="1.4" fill={CORAL} />
        <path d="M32 34h6l-3 7Z" fill="#fde2bc" />
        <path d="M34 38.8h2l-1 2.2Z" fill={deep} />
      </g>
    </g>
  ),
  // Sprechblasen
  englisch: ({ tint, deep }) => (
    <g>
      <path d="M22 17h17a3.5 3.5 0 0 1 3.5 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-1.5v5.5l-6.3-5.5H22a3.5 3.5 0 0 1-3.5-3.5v-9A3.5 3.5 0 0 1 22 17Z" fill={tint} />
      <path d="M9 7h20a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H19.5L12 33v-7H9a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4Z" fill="#fff" />
      <text x="19" y="21" textAnchor="middle" fontSize="11.5" fontWeight="900" fill={deep} fontFamily="'Onest Variable', system-ui, sans-serif">
        Hi!
      </text>
    </g>
  ),
  // Keimling
  biologie: ({ tint, deep }) => (
    <g>
      <ellipse cx="24" cy="41.5" rx="13" ry="3.4" fill={deep} />
      <path d="M24 41V25" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 28C13.5 28 8.5 21 9.5 11.5 19 11.5 25.5 17.5 24 28Z" fill="#fff" />
      <path d="M24 24c0-9.5 6-15.5 15-15.5C40 18 34 25 24 24Z" fill={tint} />
      <path d="M12.5 14.5c4 1 7.6 4.2 9.6 9.3" stroke={deep} strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
      <circle cx="38" cy="33" r="1.8" fill={GOLD} />
      <circle cx="11" cy="35" r="1.4" fill={GOLD} />
    </g>
  ),
  // Schriftrolle mit Siegel
  geschichte: ({ tint, deep }) => (
    <g>
      <rect x="12" y="10" width="26" height="31" rx="3" fill={deep} opacity=".5" transform="translate(0 2.5)" />
      <rect x="10" y="7" width="30" height="7" rx="3.500" fill="#fff" />
      <rect x="10" y="7" width="30" height="7" rx="3.500" fill={tint} opacity=".6" />
      <path d="M13 12h24v23c0 3.400-2.600 5.500-5.500 5.500H13Z" fill="#fff" />
      <rect x="10" y="36" width="30" height="6" rx="3" fill={tint} />
      <path d="M17 18.500h16M17 24h16M17 29.500h9" stroke={tint} strokeWidth="2.200" strokeLinecap="round" />
      <circle cx="32" cy="34.500" r="4.600" fill={CORAL} />
      <path d="m32 31.800.9 1.800 2 .3-1.400 1.400.3 2-1.800-.9-1.800.9.3-2-1.400-1.400 2-.3Z" fill="#fff" />
    </g>
  ),
  // Atom
  physik: ({ tint, deep }) => (
    <g>
      <g fill="none" strokeWidth="2.6" stroke="#fff">
        <ellipse cx="24" cy="24" rx="19" ry="7.4" />
        <ellipse cx="24" cy="24" rx="19" ry="7.4" transform="rotate(60 24 24)" stroke={tint} />
        <ellipse cx="24" cy="24" rx="19" ry="7.4" transform="rotate(120 24 24)" />
      </g>
      <circle cx="24" cy="24" r="6" fill={deep} opacity=".5" transform="translate(0 1.2)" />
      <circle cx="24" cy="24" r="6" fill={GOLD} />
      <circle cx="22.2" cy="22.2" r="1.9" fill="#fff" opacity=".8" />
      <circle cx="42" cy="21" r="2.6" fill="#fff" />
      <circle cx="12" cy="36" r="2.6" fill={tint} />
      <circle cx="9" cy="14" r="2.6" fill="#fff" />
    </g>
  ),
  // Erlenmeyerkolben
  chemie: ({ tint, deep }) => (
    <g>
      <defs>
        <clipPath id="chemie-k">
          <path d="M19 5h10v11.5L40 36.5c1.6 3.2-.4 6.5-4 6.5H12c-3.6 0-5.6-3.300-4-6.5L19 16.5Z" />
        </clipPath>
      </defs>
      <path d="M19 5h10v11.5L40 36.5c1.6 3.2-.4 6.5-4 6.5H12c-3.6 0-5.6-3.300-4-6.5L19 16.5Z" fill="#fff" />
      <g clipPath="url(#chemie-k)">
        <rect x="4" y="29" width="40" height="16" fill={GOLD} />
        <path d="M4 29c6-3 10 3 16 0s10 3 16 0 6 0 8 0v-2H4Z" fill={GOLD} />
      </g>
      <rect x="16.5" y="3" width="15" height="4.6" rx="2.2" fill={deep} />
      <circle cx="19" cy="35" r="2.2" fill="#fff" opacity=".85" />
      <circle cx="28" cy="38" r="1.6" fill="#fff" opacity=".85" />
      <circle cx="26" cy="31.5" r="1.2" fill="#fff" opacity=".85" />
      <circle cx="12" cy="12" r="2" fill={tint} />
      <circle cx="37" cy="10" r="1.6" fill="#fff" />
    </g>
  ),
  // Globus
  geografie: ({ deep }) => (
    <g>
      <path d="M13 43h22M24 38v5" stroke={deep} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="24" cy="21" r="17" fill="#d7ecff" />
      <path d="M13 13c3-1 5 1 7 0s3-3 6-2c2 .7 1 3-1 4s-1 3-3 4-2 4-5 3-4-3-5-5 0-3 1-4Z" fill={MINT} />
      <path d="M28 25c2-1.4 5-1 6 1s-.6 4-2.600 5-4 .6-4.400-1.400 0-3.600 1-4.600Z" fill={MINT} />
      <path d="M24 4v34M8 21h32" stroke={deep} strokeWidth="1.3" opacity=".35" />
      <ellipse cx="24" cy="21" rx="8" ry="17" fill="none" stroke={deep} strokeWidth="1.3" opacity=".35" />
      <path d="M15.500 7.500A17 17 0 0 0 7 21" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" opacity=".0" />
      <circle cx="36" cy="9" r="2.300" fill={GOLD} />
    </g>
  ),
  // Parlament
  politik: ({ tint, deep }) => (
    <g>
      <path d="M24 3.500 42 14H6Z" fill="#fff" />
      <path d="M24 8.600 33.500 14h-19Z" fill={tint} />
      <rect x="9" y="16" width="30" height="3.600" rx="1.200" fill="#fff" />
      {[12.500, 20, 27.500, 35].map((x) => (
        <rect key={x} x={x - 2.600} y="21" width="5.200" height="16" rx="1.400" fill="#fff" />
      ))}
      <rect x="6" y="38.500" width="36" height="5" rx="1.800" fill="#fff" />
      <rect x="6" y="41" width="36" height="2.500" rx="1.200" fill={deep} opacity=".5" />
      <path d="M24 3.500V-1" stroke="#fff" strokeWidth="1.500" opacity="0" />
      <circle cx="24" cy="12.500" r="1.600" fill={GOLD} />
    </g>
  ),
  // Laptop mit Code
  informatik: ({ tint, deep }) => (
    <g>
      <rect x="9" y="8" width="30" height="22" rx="3.600" fill="#fff" />
      <rect x="12" y="11" width="24" height="16" rx="2" fill={deep} />
      <path d="m19 15.500-3.500 3.500 3.500 3.500M29 15.500l3.500 3.500-3.500 3.500" stroke={GOLD} strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="m25.700 14.600-3.400 8.800" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.500 33h39l-2.800 5.800c-.4.800-1.200 1.200-2 1.200H9.300c-.8 0-1.600-.4-2-1.200Z" fill="#fff" />
      <rect x="19" y="33" width="10" height="2.600" rx="1.300" fill={tint} />
      <circle cx="40" cy="8" r="2.200" fill={CORAL} />
    </g>
  ),
  // Farbpalette
  kunst: ({ deep }) => (
    <g>
      <path d="M24 5C12.500 5 4.500 13 4.500 23c0 9.500 7 16 15.500 16 3.300 0 4-2.300 3-4.300-1.200-2.500.5-5 3.200-5H34c5.500 0 9.500-3 9.500-8.500C43.500 12 35.500 5 24 5Z" fill={deep} opacity=".5" transform="translate(0 2.600)" />
      <path d="M24 5C12.500 5 4.500 13 4.500 23c0 9.500 7 16 15.500 16 3.300 0 4-2.300 3-4.300-1.200-2.500.5-5 3.200-5H34c5.500 0 9.500-3 9.500-8.500C43.500 12 35.500 5 24 5Z" fill="#fff" />
      <circle cx="15" cy="21" r="3.400" fill={CORAL} />
      <circle cx="22.500" cy="13.500" r="3.400" fill={GOLD} />
      <circle cx="32.500" cy="15.500" r="3.400" fill={SKY} />
      <circle cx="12.500" cy="30" r="3.400" fill={MINT} />
    </g>
  ),
  // Noten
  musik: ({ tint, deep }) => (
    <g>
      <path d="M17 35V13.500l20-4.500V30" stroke="#fff" strokeWidth="3.200" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M17 15.500 37 11v6L17 21.500Z" fill="#fff" />
      <ellipse cx="12.500" cy="36" rx="6" ry="4.800" fill="#fff" transform="rotate(-18 12.500 36)" />
      <ellipse cx="32.500" cy="31.500" rx="6" ry="4.800" fill="#fff" transform="rotate(-18 32.500 31.500)" />
      <ellipse cx="12.500" cy="37.500" rx="6" ry="3" fill={deep} opacity=".35" transform="rotate(-18 12.500 37.500)" />
      <circle cx="40" cy="38" r="2" fill={GOLD} />
      <circle cx="7" cy="14" r="1.800" fill={tint} />
    </g>
  ),
  // Glühbirne
  sonstiges: ({ tint, deep }) => (
    <g>
      <path d="M24 3C15.700 3 10 9 10 16.500c0 5 2.500 8 5 11 1.200 1.500 1.800 3 1.800 5h14.400c0-2 .6-3.500 1.800-5 2.500-3 5-6 5-11C38 9 32.300 3 24 3Z" fill="#fff" />
      <path d="M18.500 14c.8-3.200 3-5 5.500-5" stroke={tint} strokeWidth="2.400" strokeLinecap="round" fill="none" />
      <path d="M21 25.500 24 19l3 6.500" stroke={GOLD} strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="16.500" y="36" width="15" height="4.200" rx="2.100" fill={deep} />
      <rect x="19" y="41" width="10" height="3.200" rx="1.600" fill={deep} />
      <path d="M4 12l3 1.500M44 12l-3 1.500M2 22h3.500M42.500 22H46" stroke={GOLD} strokeWidth="2.200" strokeLinecap="round" />
    </g>
  ),
}

export function HelpSubjectIcon({ id, ink, size = 28 }: { id: string; ink: string; size?: number }) {
  const draw = DRAW[id] ?? DRAW.sonstiges
  const pal: Palette = { ink, tint: shade(ink, 0.72), deep: shade(ink, -0.4) }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      {draw(pal)}
    </svg>
  )
}

export const hasSubjectIcon = (id: string): boolean => id in DRAW

/** Fach-Symbol für farbige Blöcke: auf der Fachfarbe direkt, auf grauem Grund (ruhiger Block) in einer kleinen Kachel der Fachfarbe. */
export function FachIcon({ id, ink, size = 30, tile = false }: { id: string; ink: string; size?: number; tile?: boolean }) {
  if (!tile) return <HelpSubjectIcon id={id} ink={ink} size={size} />
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-[10px]" style={{ background: ink, width: size + 8, height: size + 8 }}>
      <HelpSubjectIcon id={id} ink={ink} size={size} />
    </span>
  )
}
