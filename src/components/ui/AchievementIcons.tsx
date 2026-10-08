import type { ReactNode } from 'react'

/**
 * Ein eigenes Symbol je Erfolg (Raster 48 x 48): weißer Gegenstand mit goldenem Akzent auf der Farbfläche der Kachel,
 * im Stil der Fach-Symbole. `deep` ist ein dunklerer Ton der Kachelfarbe für Schatten.
 */
const GOLD = '#ffd23f'
const CORAL = '#ff7a6b'

type Draw = (deep: string) => ReactNode

const star = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.45
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`
  })
  return `M${pts.join('L')}Z`
}

const text = (x: number, y: number, size: number, fill: string, t: string) => (
  <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="900" fill={fill} fontFamily="'Onest Variable', system-ui, sans-serif">
    {t}
  </text>
)

const DRAW: Record<string, Draw> = {
  // Erste Runde: Fahne im Ziel
  first: (deep) => (
    <g>
      <ellipse cx="24" cy="42" rx="13" ry="2.4" fill={deep} opacity=".5" />
      <path d="M15 42V6" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M17 8c7-3.500 11 3.500 18 0v15c-7 3.500-11-3.500-18 0Z" fill={GOLD} />
      <path d="M17 8c7-3.500 11 3.500 18 0" stroke="#fff" strokeWidth="1.400" fill="none" opacity=".6" />
    </g>
  ),
  // Zehn Runden: Medaille mit Zehn
  ten: (deep) => (
    <g>
      <path d="M16 4h6l3 12h-6Z" fill={CORAL} />
      <path d="M32 4h-6l-3 12h6Z" fill="#fff" />
      <circle cx="24" cy="30" r="13" fill={deep} opacity=".5" transform="translate(0 1.800)" />
      <circle cx="24" cy="30" r="13" fill={GOLD} />
      <circle cx="24" cy="30" r="9.500" fill="none" stroke="#fff" strokeWidth="1.600" opacity=".7" />
      {text(24, 34.500, 12, deep, '10')}
    </g>
  ),
  // Fünfzig Runden: Pokal
  fifty: (deep) => (
    <g>
      <path d="M14 7h20v10c0 6.500-4.500 11-10 11S14 23.500 14 17Z" fill={GOLD} />
      <path d="M14 10H8c0 6 2.500 9.500 7 10.500M34 10h6c0 6-2.500 9.500-7 10.500" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M21 28h6v7h-6Z" fill="#fff" />
      <rect x="14" y="35" width="20" height="6" rx="2.500" fill="#fff" />
      <rect x="14" y="38" width="20" height="3" rx="1.500" fill={deep} opacity=".4" />
      <path d="M19 11v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </g>
  ),
  // 25 Karten: kleiner Stapel
  words25: (deep) => (
    <g>
      <rect x="9" y="12" width="28" height="26" rx="4" fill={deep} opacity=".5" transform="rotate(-8 23 25)" />
      <rect x="9" y="10" width="28" height="26" rx="4" fill="#fff" opacity=".7" transform="rotate(-8 23 23)" />
      <rect x="11" y="10" width="28" height="26" rx="4" fill="#fff" />
      {text(25, 29, 15, deep, '25')}
      <path d="M33 6l1 2.400 2.400 1-2.400 1-1 2.400-1-2.400-2.400-1 2.400-1Z" fill={GOLD} />
    </g>
  ),
  // 100 Karten: großer Stapel
  words100: (deep) => (
    <g>
      <rect x="8" y="14" width="30" height="26" rx="4" fill={deep} opacity=".5" transform="rotate(-10 23 27)" />
      <rect x="9" y="11" width="30" height="26" rx="4" fill="#fff" opacity=".55" transform="rotate(-10 24 24)" />
      <rect x="10" y="10" width="30" height="27" rx="4" fill="#fff" opacity=".8" transform="rotate(-4 25 23)" />
      <rect x="11" y="9" width="30" height="27" rx="4" fill="#fff" />
      {text(26, 28, 14, deep, '100')}
      <path d="M38 4l1 2.400 2.400 1-2.400 1-1 2.400-1-2.400-2.400-1 2.400-1Z" fill={GOLD} />
    </g>
  ),
  // Sitzt fest: Reißzwecke
  mastered50: (deep) => (
    <g>
      <ellipse cx="24" cy="42" rx="9" ry="2" fill={deep} opacity=".5" />
      <path d="M24 28v13" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" />
      <path d="M17 6h14l-2 11 6 6v3H13v-3l6-6Z" fill={CORAL} />
      <path d="M13 26h22" stroke="#fff" strokeWidth="3.400" strokeLinecap="round" />
      <path d="M20 8h3l-1 8" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" opacity=".7" fill="none" />
    </g>
  ),
  // 1000 XP: Stern mit Funken
  xp1000: (deep) => (
    <g>
      <path d={star(24, 25, 18)} fill={deep} opacity=".5" transform="translate(0 2)" />
      <path d={star(24, 25, 18)} fill={GOLD} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      {text(24, 29, 9, deep, 'XP')}
      <circle cx="41" cy="9" r="2" fill="#fff" />
      <circle cx="7" cy="12" r="1.600" fill="#fff" />
    </g>
  ),
  // Eigener Stoff: Karte mit Stift
  set: (deep) => (
    <g>
      <rect x="7" y="13" width="30" height="24" rx="4" fill={deep} opacity=".5" transform="translate(0 2.500)" />
      <rect x="7" y="11" width="30" height="24" rx="4" fill="#fff" />
      <path d="M13 19h18M13 26h10" stroke={deep} strokeWidth="2.400" strokeLinecap="round" opacity=".45" />
      <g transform="rotate(40 35 26)">
        <rect x="32" y="9" width="6" height="22" rx="1.400" fill={GOLD} />
        <rect x="32" y="9" width="6" height="4.500" rx="1.400" fill={CORAL} />
        <path d="M32 31h6l-3 7Z" fill="#fde2bc" />
      </g>
    </g>
  ),
  // Sammler: gestapelte Kisten
  decks5: (deep) => (
    <g>
      <rect x="6" y="27" width="17" height="14" rx="3" fill="#fff" />
      <rect x="25" y="27" width="17" height="14" rx="3" fill="#fff" />
      <rect x="15.500" y="11" width="17" height="14" rx="3" fill={GOLD} />
      <path d="M10 33h9M29 33h9M19.500 17h9" stroke={deep} strokeWidth="2.200" strokeLinecap="round" opacity=".5" />
      <rect x="6" y="38" width="36" height="3" rx="1.500" fill={deep} opacity=".35" />
    </g>
  ),
  // Gut geplant: Kalender mit Haken
  arbeit1: (deep) => (
    <g>
      <rect x="7" y="11" width="34" height="31" rx="5" fill={deep} opacity=".5" transform="translate(0 2.500)" />
      <rect x="7" y="9" width="34" height="31" rx="5" fill="#fff" />
      <path d="M7 14.500A5.500 5.500 0 0 1 12.500 9h23A5.500 5.500 0 0 1 41 14.500V19H7Z" fill={CORAL} />
      <path d="M15 5v8M33 5v8" stroke="#fff" strokeWidth="3.200" strokeLinecap="round" />
      <path d="m16 29 6 6 11-12" stroke={deep} strokeWidth="3.600" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  // Allrounder: drei Formen
  subjects3: () => (
    <g>
      <path d="M14 8 24 25H4Z" fill="#fff" />
      <circle cx="34" cy="15" r="9" fill={GOLD} />
      <rect x="22" y="27" width="16" height="16" rx="3.400" fill={CORAL} />
      <circle cx="12" cy="35" r="7" fill="#fff" opacity=".55" />
    </g>
  ),
  // Gemeistert: drei Sterne
  star3: (deep) => (
    <g>
      <path d={star(24, 15, 11)} fill={GOLD} stroke="#fff" strokeWidth="1.800" strokeLinejoin="round" />
      <path d={star(11, 33, 9)} fill={GOLD} stroke="#fff" strokeWidth="1.800" strokeLinejoin="round" />
      <path d={star(37, 33, 9)} fill={GOLD} stroke="#fff" strokeWidth="1.800" strokeLinejoin="round" />
      <path d="M8 43h32" stroke={deep} strokeWidth="2.400" strokeLinecap="round" opacity=".4" />
    </g>
  ),
  // Profi-Status: Krone
  level5: (deep) => (
    <g>
      <path d="M7 36 4 14l11 9 9-15 9 15 11-9-3 22Z" fill={deep} opacity=".5" transform="translate(0 2.500)" />
      <path d="M7 36 4 14l11 9 9-15 9 15 11-9-3 22Z" fill={GOLD} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <rect x="7" y="37" width="34" height="5" rx="2.200" fill="#fff" />
      <circle cx="24" cy="29" r="3" fill={CORAL} />
      <circle cx="14" cy="30" r="2" fill="#fff" />
      <circle cx="34" cy="30" r="2" fill="#fff" />
    </g>
  ),
}

/** Dunklerer Ton einer #rrggbb-Farbe. */
function darker(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color)
  if (!m) return color
  const n = parseInt(m[1], 16)
  const f = (v: number) => Math.round(v * 0.6).toString(16).padStart(2, '0')
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`
}

export function AchievementIcon({ id, color, size = 36 }: { id: string; color: string; size?: number }) {
  const draw = DRAW[id] ?? DRAW.first
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      {draw(darker(color))}
    </svg>
  )
}
