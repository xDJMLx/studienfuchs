import { useId, type SVGProps } from 'react'

/*
 * Eigener Icon-Satz für Studienfuchs (selbst gezeichnet, kein fertiges Set).
 * Bildsprache: eckige Grundformen auf einem 24er-Raster, runde Enden, kräftige Linien (2,4).
 * Die wichtigsten Zeichen haben feste Farben: Serie (Flamme), XP (Wertmarke), Münze.
 */

type P = SVGProps<SVGSVGElement> & { size?: number }
const base = (size = 24): SVGProps<SVGSVGElement> => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true })
/** Eindeutige Maske je Icon: gleiche Ids in versteckten Teilen der Seite (z. B. Seitenleiste) würden sonst die Maske zerstören. */
const useMaskId = (name: string) => `${name}-${useId().replace(/:/g, '')}`
const line = (w = 2.4): SVGProps<SVGSVGElement> => ({ fill: 'none', stroke: 'currentColor', strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' })

/** Serie: eine eckig geschnittene Flamme in zwei Tönen. */
export const Flame = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12.6 1.8 17.6 8.2 19.2 13.6 17.2 19.2 12 22.2 6.8 19.2 4.9 13.8 7.4 9.4 9.7 12 10 6.6Z" fill="#ff7a1a" stroke="#ff7a1a" strokeWidth="1" strokeLinejoin="round" />
    <path d="M12 22.2 8.5 19.4 8.1 15.8 10.5 12.8 12 14.8 13.9 12.2 15.9 15.8 15.4 19.4Z" fill="#ffc233" stroke="#ffc233" strokeWidth="1" strokeLinejoin="round" />
  </svg>
)

/** XP: sechseckige Wertmarke mit "XP". */
export const Xp = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 1.9 20.6 6.9V17.1L12 22.1 3.4 17.1V6.9Z" fill="#ffc531" stroke="#c98f00" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M6.3 9.1 10.3 14.9M10.3 9.1 6.3 14.9M13.3 14.9V9.1H15.6a2.1 2.1 0 0 1 0 4.2H13.3" fill="none" stroke="#3a2700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
/** Früher ein Blitz; steht in der App immer für XP. */
export const Bolt = Xp

/** Münze: Goldstück mit Raute und Innenring. */
export const Coin = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9.6" fill="#ffc531" stroke="#c98f00" strokeWidth="1.4" />
    <circle cx="12" cy="12" r="6.4" fill="none" stroke="#c98f00" strokeWidth="1.2" opacity=".75" />
    <path d="M12 8.2 15.4 12 12 15.8 8.6 12Z" fill="#c98f00" />
  </svg>
)

export const Check = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(3.4)} {...p}>
    <path d="M4.6 12.9 9.4 17.5 19.6 6.6" />
  </svg>
)

export const Close = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(3.2)} {...p}>
    <path d="m6.2 6.2 11.6 11.6M17.8 6.2 6.2 17.8" />
  </svg>
)

export const Star = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m12 2.8 2.6 6.2 6.6.4-5.1 4.2 1.7 6.4-5.8-3.5-5.8 3.5 1.7-6.4L2.8 9.4l6.6-.4L12 2.8Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

export const Speaker = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.4)} {...p}>
    <path d="M4 9.6v4.8h3.6L12.6 19V5L7.6 9.6H4Z" fill="currentColor" />
    <path d="M15.8 9.2a4 4 0 0 1 0 5.6M18.4 6.6a7.6 7.6 0 0 1 0 10.8" />
  </svg>
)

export const Home = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m3.4 11.2 8.6-7.7 8.6 7.7V20.6H14.6V14.6H9.4V20.6H3.4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

export const Repeat = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.6)} {...p}>
    <path d="M19.4 12a7.4 7.4 0 1 1-2.3-5.4M17.6 3.4v4.2h-4.2" />
  </svg>
)

/** Buch: geschlossenes Heft mit Rücken und Lesezeichen. */
export const Book = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.3)} {...p}>
    <path d="M6.2 3.4h11.6a1.4 1.4 0 0 1 1.4 1.4V19.2a1.4 1.4 0 0 1-1.4 1.4H6.2a1.4 1.4 0 0 1-1.4-1.4V4.8a1.4 1.4 0 0 1 1.4-1.4Z" />
    <path d="M9.2 3.6v17" />
    <path d="M12.8 8h3.2M12.8 11.4h3.2" />
  </svg>
)

export const User = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.4)} {...p}>
    <circle cx="12" cy="8" r="3.8" fill="currentColor" />
    <path d="M4.4 20.6c0-4.2 3.3-6.6 7.6-6.6s7.6 2.4 7.6 6.6Z" fill="currentColor" />
  </svg>
)

export const Camera = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.3)} {...p}>
    <path d="M3.4 8.2h3.2l1.6-2.6h7.6l1.6 2.6h3.2v11.4H3.4Z" />
    <circle cx="12" cy="13.6" r="3.5" />
  </svg>
)

export const Back = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(3.2)} {...p}>
    <path d="M14.6 5.2 7.8 12l6.8 6.8" />
  </svg>
)

export const Trash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.3)} {...p}>
    <path d="M4 7h16M9.4 7V4.2h5.2V7M6.2 7l.9 13.4h9.8L17.8 7M10 11v5.4M14 11v5.4" />
  </svg>
)

export const Plus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(3.2)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Swap = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.6)} {...p}>
    <path d="M4 8.4h15.4M15.4 4.4l4 4-4 4M20 15.6H4.6M8.6 11.6l-4 4 4 4" />
  </svg>
)

export const Gear = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2.6" />
    <path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5.4 5.4l2.2 2.2M16.4 16.4l2.2 2.2M18.6 5.4l-2.2 2.2M7.6 16.4l-2.2 2.2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.9" fill="currentColor" />
  </svg>
)

export const Dots = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="10" width="4" height="4" rx="1.3" fill="currentColor" />
    <rect x="10" y="10" width="4" height="4" rx="1.3" fill="currentColor" />
    <rect x="17" y="10" width="4" height="4" rx="1.3" fill="currentColor" />
  </svg>
)

export const Shield = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2.4 20 5.4V11.6c0 5.1-3.3 8.6-8 10-4.7-1.4-8-4.9-8-10V5.4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

export const Chevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(3.2)} {...p}>
    <path d="m5.6 9.4 6.4 6.4 6.4-6.4" />
  </svg>
)

export const Lock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7.6 10.6V8a4.4 4.4 0 0 1 8.8 0v2.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M5.4 10.6h13.2v9.8H5.4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)

export const Trophy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.3)} {...p}>
    <path d="M7.4 3.6h9.2v5a4.6 4.6 0 0 1-9.2 0v-5Z" fill="currentColor" />
    <path d="M7.4 5.6H4v2.2A3.4 3.4 0 0 0 7.8 11M16.6 5.6H20v2.2a3.4 3.4 0 0 1-3.8 3.2M12 13.2v4M8.4 20.4h7.2M9.4 17.2h5.2v3.2H9.4Z" />
  </svg>
)

export const Search = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.6)} {...p}>
    <circle cx="10.6" cy="10.6" r="6.6" />
    <path d="m15.6 15.6 5 5" />
  </svg>
)

export const Right = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(3)} {...p}>
    <path d="m9.4 5.2 6.8 6.8-6.8 6.8" />
  </svg>
)

export const Bulb = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.3)} {...p}>
    <path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.2V16h7.2v-2A6.2 6.2 0 0 0 12 2.8Z" fill="currentColor" />
    <path d="M9.4 19h5.2M10.4 21.4h3.2" />
  </svg>
)

/** KI: Sprechblase mit "KI" (statt des üblichen Funkel-Sterns). */
export const Sparkle = ({ size, ...p }: P) => {
  const mid = useMaskId('sparkle')
  return (
  <svg {...base(size)} {...p}>
    <mask id={mid}>
      <rect width="24" height="24" fill="#fff" />
      <path d="M7.2 7.6v5.6M11.4 7.6 8 10.4l3.4 2.8M15.2 7.6v5.6" fill="none" stroke="#000" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </mask>
    <path mask={`url(#${mid})`} d="M4.2 3.6h15.6a1.7 1.7 0 0 1 1.7 1.7v9.6a1.7 1.7 0 0 1-1.7 1.7H11.6L7 21.2v-4.6H4.2a1.7 1.7 0 0 1-1.7-1.7V5.3a1.7 1.7 0 0 1 1.7-1.7Z" fill="currentColor" />
  </svg>
  )
}

export const Sun = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.4)} {...p}>
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5 6.9 6.9M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
  </svg>
)

export const Moon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20.4 14.4A8.6 8.6 0 0 1 9.6 3.6a8.6 8.6 0 1 0 10.8 10.8Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
  </svg>
)

export const Info = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.4)} {...p}>
    <circle cx="12" cy="12" r="9.4" />
    <path d="M12 11v5.4" />
    <circle cx="12" cy="7.7" r=".6" fill="currentColor" />
  </svg>
)

export const Download = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.5)} {...p}>
    <path d="M12 3.8v11M7.4 10.8 12 15.4l4.6-4.6M4.6 20h14.8" />
  </svg>
)

export const Upload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.5)} {...p}>
    <path d="M12 15.8v-11M7.4 9.2 12 4.6l4.6 4.6M4.6 20h14.8" />
  </svg>
)

/** Darstellung: Kreis, halb gefüllt (hell/dunkel). */
export const Palette = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <path d="M12 3.4a8.6 8.6 0 0 1 0 17.2Z" fill="currentColor" />
  </svg>
)

export const Target = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.4)} {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
)

export const Database = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.2)} {...p}>
    <path d="M4.2 6.2 12 3l7.8 3.2L12 9.4 4.2 6.2Z" fill="currentColor" />
    <path d="m4.2 11.2 7.8 3.2 7.8-3.2M4.2 16.2 12 19.4l7.8-3.2" />
  </svg>
)

export const Eye = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.3)} {...p}>
    <path d="M2.4 12S6 5.4 12 5.4 21.6 12 21.6 12 18 18.6 12 18.6 2.4 12 2.4 12Z" />
    <circle cx="12" cy="12" r="2.8" fill="currentColor" />
  </svg>
)

export const Hand = ({ size, ...p }: P) => {
  const mid = useMaskId('hand')
  return (
  <svg {...base(size)} {...p}>
    <mask id={mid}>
      <rect width="24" height="24" fill="#fff" />
      <path d="m8.4 12 2.6 2.6 4.6-5" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </mask>
    <path mask={`url(#${mid})`} d="M12 2.4 20 5.4V11.6c0 5.1-3.3 8.6-8 10-4.7-1.4-8-4.9-8-10V5.4Z" fill="currentColor" />
  </svg>
  )
}

export const Pencil = ({ size, ...p }: P) => {
  const mid = useMaskId('pencil')
  return (
  <svg {...base(size)} {...p}>
    <mask id={mid}>
      <rect width="24" height="24" fill="#fff" />
      <path d="m14.6 6.2 3.2 3.2" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
    </mask>
    <path mask={`url(#${mid})`} d="m4 20 .9-4.2L16.6 4.1a1.8 1.8 0 0 1 2.5 0l.8.8a1.8 1.8 0 0 1 0 2.5L8.2 19.1 4 20Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
  )
}

export const Headphones = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.4)} {...p}>
    <path d="M4.2 15.6V12a7.8 7.8 0 0 1 15.6 0v3.6" />
    <path d="M3.6 14.2h3.6v6.2H5.4a1.8 1.8 0 0 1-1.8-1.8v-4.4ZM16.8 14.2h3.6v4.4a1.8 1.8 0 0 1-1.8 1.8h-1.8v-6.2Z" fill="currentColor" />
  </svg>
)

export const Cards = ({ size, ...p }: P) => (
  <svg {...base(size)} {...line(2.3)} {...p}>
    <path d="M8.6 6.2 17.4 4.8a1.8 1.8 0 0 1 2.1 1.5L21 15.4" opacity=".55" />
    <path d="M3.4 8.2a1.8 1.8 0 0 1 1.8-1.8h9.6a1.8 1.8 0 0 1 1.8 1.8v11.2a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8V8.2Z" fill="currentColor" />
  </svg>
)

/** Shop: kleine Tasche mit Henkel und Münze. */
export const Bag = ({ size, ...p }: P) => {
  const mid = useMaskId('bag')
  return (
  <svg {...base(size)} {...p}>
    <mask id={mid}>
      <rect width="24" height="24" fill="#fff" />
      <circle cx="12" cy="14.2" r="2.3" fill="#000" />
    </mask>
    <path d="M8.4 8.4V7a3.6 3.6 0 0 1 7.2 0v1.4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path mask={`url(#${mid})`} d="M4.4 8.4h15.2l-1 12.2H5.4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
  )
}

/* Icons der unteren Leiste (bewusst unverändert gelassen) */
export const TabHome = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" fill="currentColor" />
  </svg>
)

export const TabRepeat = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3M20 13v2a3 3 0 0 1-3 3H6l3 3" />
  </svg>
)

export const TabKi = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2c.6 4.6 2.4 6.9 7 7.5-4.6.6-6.4 2.9-7 7.5-.6-4.6-2.4-6.9-7-7.5C9.6 8.9 11.4 6.6 12 2Z" fill="currentColor" />
    <path d="M19 15c.3 2 1 3 3 3.3-2 .3-2.7 1.3-3 3.3-.3-2-1-3-3-3.3 2-.3 2.7-1.3 3-3.3Z" fill="currentColor" opacity=".7" />
  </svg>
)

export const TabTarget = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
  </svg>
)

export const TabUser = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="7.5" r="4.5" fill="currentColor" />
    <path d="M3 21c0-4.5 4-7 9-7s9 2.5 9 7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" fill="currentColor" />
  </svg>
)

/** Bücher-Tab: gefülltes Buch im Stil der übrigen Leisten-Icons */
export const TabBooks = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Zm1.5 14a.5.5 0 0 0 0 1H17v-1H6.5ZM7 7v2h8V7H7Z" fill="currentColor" />
  </svg>
)
