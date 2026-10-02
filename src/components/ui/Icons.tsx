import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
const base = (size = 24): SVGProps<SVGSVGElement> => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true })

export const Flame = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2c1 4-3 5-3 9 0 2 1.5 3 3 3s3-1 3-3c0-1-.5-2-1-3 3 1 5 4 5 7a7 7 0 0 1-14 0c0-6 5-7 7-13Z" fill="#ff8a2a" />
    <path d="M12 21a3.5 3.5 0 0 1-3.5-3.5c0-2 2-3 3.5-5 1.5 2 3.5 3 3.5 5A3.5 3.5 0 0 1 12 21Z" fill="#ffc531" />
  </svg>
)

export const Bolt = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#ffc531" stroke="#d9a000" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)

export const Check = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
)

export const Close = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

export const Star = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" fill="currentColor" />
  </svg>
)

export const Speaker = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
  </svg>
)

export const Home = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" fill="currentColor" />
  </svg>
)

export const Repeat = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3M20 13v2a3 3 0 0 1-3 3H6l3 3" />
  </svg>
)

export const Book = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Zm1.5 14a.5.5 0 0 0 0 1H17v-1H6.5ZM7 7v2h8V7H7Z" fill="currentColor" />
  </svg>
)

export const User = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="7.5" r="4.5" fill="currentColor" />
    <path d="M3 21c0-4.5 4-7 9-7s9 2.5 9 7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" fill="currentColor" />
  </svg>
)

export const Camera = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8 4 6.5 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.5L16 4H8Zm4 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fill="currentColor" />
  </svg>
)

export const Back = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m15 5-7 7 7 7" />
  </svg>
)

export const Trash = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
)

export const Plus = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Swap = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </svg>
)

export const Gear = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path
      d="M10.3 2.5h3.4l.6 2.6c.5.2 1 .4 1.4.7l2.5-.9 1.7 3-2 1.8c.1.5.1 1 0 1.5l2 1.8-1.7 3-2.5-.9c-.4.3-.9.5-1.4.7l-.6 2.6h-3.4l-.6-2.6c-.5-.2-1-.4-1.4-.7l-2.5.9-1.7-3 2-1.8a5 5 0 0 1 0-1.5l-2-1.8 1.7-3 2.5.9c.4-.3.9-.5 1.4-.7l.6-2.6ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
      fill="currentColor"
    />
  </svg>
)

export const Dots = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="5" cy="12" r="2.2" fill="currentColor" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    <circle cx="19" cy="12" r="2.2" fill="currentColor" />
  </svg>
)

export const Shield = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Z" fill="currentColor" />
  </svg>
)

export const Chevron = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const Lock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z" fill="currentColor" />
  </svg>
)

export const Trophy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 3h10v3h3v2a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V6h3V3Zm-1 5a2 2 0 0 0 1 1.7V8H6Zm12 0h-1v1.7A2 2 0 0 0 18 8Z" fill="currentColor" />
  </svg>
)

export const Search = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const Right = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m9 5 7 7-7 7" />
  </svg>
)

export const Bulb = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Z" fill="currentColor" />
    <path d="M9.5 20.5h5M10.5 22.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
)

export const Sparkle = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2c.6 4.6 2.4 6.9 7 7.5-4.6.6-6.4 2.9-7 7.5-.6-4.6-2.4-6.9-7-7.5C9.6 8.9 11.4 6.6 12 2Z" fill="currentColor" />
    <path d="M19 15c.3 2 1 3 3 3.3-2 .3-2.7 1.3-3 3.3-.3-2-1-3-3-3.3 2-.3 2.7-1.3 3-3.3Z" fill="currentColor" opacity=".7" />
  </svg>
)

export const Sun = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}>
    <circle cx="12" cy="12" r="4.2" fill="currentColor" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
  </svg>
)

export const Moon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" fill="currentColor" />
  </svg>
)

export const Info = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M12 11v5.5" stroke="var(--surface)" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="12" cy="7.6" r="1.5" fill="var(--surface)" />
  </svg>
)

export const Download = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </svg>
)

export const Upload = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 16V5M7 9l5-5 5 5M5 20h14" />
  </svg>
)

export const Palette = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2a10 10 0 1 0 0 20c1.4 0 2-1 2-1.9 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a5 5 0 0 0 5-5C22 6 17.5 2 12 2Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor" />
  </svg>
)

export const Target = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
  </svg>
)

export const Database = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" fill="currentColor" />
    <path d="M4 8.5v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4c0 1.7-3.6 3-8 3s-8-1.3-8-3Zm0 7v3c0 1.7 3.6 3 8 3s8-1.3 8-3v-3c0 1.7-3.6 3-8 3s-8-1.3-8-3Z" fill="currentColor" opacity=".85" />
  </svg>
)

export const Eye = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
)

export const Hand = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Z" fill="currentColor" />
    <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="var(--surface)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Pencil = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 21v-4.2L16.6 3.2a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8L7.2 21H3Z" fill="currentColor" />
    <path d="m14.5 5.3 4.2 4.2" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Headphones = ({ size, ...p }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <rect x="3" y="14" width="4.5" height="7" rx="1.8" fill="currentColor" />
    <rect x="16.5" y="14" width="4.5" height="7" rx="1.8" fill="currentColor" />
  </svg>
)

export const Cards = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="6" y="3" width="14" height="14" rx="2.5" fill="currentColor" opacity=".45" transform="rotate(8 13 10)" />
    <rect x="3" y="6" width="14" height="14" rx="2.5" fill="currentColor" />
  </svg>
)
