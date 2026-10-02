import type { Outfit } from '../../lib/shop'

export type Mood = 'happy' | 'cheer' | 'sad' | 'think'

/** Fenni, der Fuchs – unser eigenes Maskottchen (eigene Zeichnung, kein Duolingo-Asset). */
export function Mascot({ mood = 'happy', size = 120, className = '', blink = false, label, outfit }: { mood?: Mood; size?: number; className?: string; blink?: boolean; label?: string; outfit?: Outfit }) {
  const { kopf, gesicht, hals, hintergrund } = outfit ?? {}
  const sad = mood === 'sad'
  const cheer = mood === 'cheer'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`${blink ? 'mascot-blink' : ''} ${className}`} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      {/* Hintergrund (gekauft) */}
      {hintergrund === 'sonne' && (
        <g>
          <circle cx="60" cy="60" r="58" fill="#ffd75e" />
          <circle cx="60" cy="60" r="46" fill="#ffe99a" />
        </g>
      )}
      {hintergrund === 'nacht' && (
        <g>
          <circle cx="60" cy="60" r="58" fill="#1d2b64" />
          <path d="M96 16 a11 11 0 1 0 8 18 a9 9 0 1 1 -8 -18 Z" fill="#ffe99a" />
          <path d="M14 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z M22 98 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z M106 88 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 Z" fill="#fff" />
        </g>
      )}
      {hintergrund === 'aura' && (
        <g>
          <defs>
            <radialGradient id="aura-g" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="#ffd75e" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f5b82e" stopOpacity="0.15" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="58" fill="url(#aura-g)" />
          <circle cx="60" cy="60" r="56" fill="none" stroke="#f5b82e" strokeWidth="2.5" strokeDasharray="3 7" strokeLinecap="round" />
        </g>
      )}
      {/* Ohren */}
      <path className="mascot-ear-l" d="M18 14 L44 36 L22 52 Z" fill="#ff8a2a" />
      <path d="M102 14 L76 36 L98 52 Z" fill="#ff8a2a" />
      <path d="M24 26 L38 38 L26 46 Z" fill="#3b2a1a" opacity="0.85" />
      <path d="M96 26 L82 38 L94 46 Z" fill="#3b2a1a" opacity="0.85" />
      {/* Kopf */}
      <path d="M12 58 C12 36 34 26 60 26 C86 26 108 36 108 58 C108 86 86 104 60 104 C34 104 12 86 12 58 Z" fill="#ff8a2a" />
      {/* Weißes Gesicht */}
      <path d="M12 64 C26 60 38 66 48 80 C54 88 66 88 72 80 C82 66 94 60 108 64 C106 88 86 104 60 104 C34 104 14 88 12 64 Z" fill="#fff" />
      {/* Augen */}
      {cheer ? (
        <>
          <path d="M34 54 q6 -9 12 0" stroke="#3b2a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M74 54 q6 -9 12 0" stroke="#3b2a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <g className="mascot-eye">
            <ellipse cx="40" cy="54" rx="6" ry={sad ? 6 : 7.5} fill="#3b2a1a" />
            <circle cx="42" cy="51" r="2.2" fill="#fff" />
          </g>
          <g className="mascot-eye">
            <ellipse cx="80" cy="54" rx="6" ry={sad ? 6 : 7.5} fill="#3b2a1a" />
            <circle cx="82" cy="51" r="2.2" fill="#fff" />
          </g>
        </>
      )}
      {sad && (
        <>
          <path d="M31 44 l16 4" stroke="#3b2a1a" strokeWidth="3" strokeLinecap="round" />
          <path d="M89 44 l-16 4" stroke="#3b2a1a" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === 'think' && <path d="M72 40 l16 -4" stroke="#3b2a1a" strokeWidth="3" strokeLinecap="round" />}
      {/* Nase */}
      <ellipse cx="60" cy="76" rx="7" ry="5" fill="#3b2a1a" />
      {/* Mund */}
      {sad ? (
        <path d="M50 92 q10 -8 20 0" stroke="#3b2a1a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : cheer ? (
        <path d="M46 84 q14 20 28 0 Z" fill="#c63840" stroke="#3b2a1a" strokeWidth="3" strokeLinejoin="round" />
      ) : (
        <path d="M50 84 q10 10 20 0" stroke="#3b2a1a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
      {/* Wangen */}
      <circle cx="26" cy="72" r="5" fill="#ff9aa2" opacity="0.6" />
      <circle cx="94" cy="72" r="5" fill="#ff9aa2" opacity="0.6" />
      {/* Zubehör (gekauft) */}
      {hals === 'schal' && (
        <g>
          <path d="M16 90 C38 108 82 108 104 90 L108 102 C84 122 36 122 12 102 Z" fill="#e5484d" />
          <path d="M30 100 q30 14 60 0" stroke="#fff" strokeWidth="3" fill="none" opacity="0.7" strokeLinecap="round" />
          <path d="M78 104 l6 16 l14 -4 l-6 -16 Z" fill="#c93a40" />
        </g>
      )}
      {hals === 'fliege' && (
        <g strokeLinejoin="round">
          <path d="M60 103 L42 92 L42 114 Z" fill="#3b6fe0" stroke="#24429a" strokeWidth="2" />
          <path d="M60 103 L78 92 L78 114 Z" fill="#3b6fe0" stroke="#24429a" strokeWidth="2" />
          <rect x="54" y="97" width="12" height="12" rx="3" fill="#2a56c4" stroke="#24429a" strokeWidth="2" />
        </g>
      )}
      {hals === 'medaille' && (
        <g strokeLinejoin="round">
          <path d="M40 92 L60 112 L80 92" stroke="#e5484d" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="112" r="8" fill="#f5b82e" stroke="#b8860b" strokeWidth="2.5" />
          <path d="M60 107 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 Z" fill="#b8860b" />
        </g>
      )}
      {gesicht === 'brille' && (
        <g fill="none" stroke="#3b2a1a" strokeWidth="3.2">
          <circle cx="40" cy="54" r="12" fill="rgba(255,255,255,0.18)" />
          <circle cx="80" cy="54" r="12" fill="rgba(255,255,255,0.18)" />
          <path d="M52 53 q8 -5 16 0" strokeLinecap="round" />
          <path d="M28 52 l-8 -4 M92 52 l8 -4" strokeLinecap="round" />
        </g>
      )}
      {gesicht === 'sonnenbrille' && (
        <g>
          <path d="M24 46 h32 v10 a10 10 0 0 1 -10 10 h-12 a10 10 0 0 1 -10 -10 Z" fill="#1f1f24" />
          <path d="M64 46 h32 v10 a10 10 0 0 1 -10 10 h-12 a10 10 0 0 1 -10 -10 Z" fill="#1f1f24" />
          <path d="M56 49 q4 -3 8 0" stroke="#1f1f24" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M24 48 l-8 -3 M96 48 l8 -3" stroke="#1f1f24" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M30 50 l8 0 M70 50 l8 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
        </g>
      )}
      {gesicht === 'schnurrbart' && (
        <path d="M60 81 C54 75 42 76 38 84 C44 82 52 84 60 87 C68 84 76 82 82 84 C78 76 66 75 60 81 Z" fill="#3b2a1a" stroke="#3b2a1a" strokeWidth="2" strokeLinejoin="round" />
      )}
      {kopf === 'muetze' && (
        <g>
          <path d="M20 42 C22 12 98 12 100 42 C82 34 38 34 20 42 Z" fill="#3b82f6" />
          <path d="M20 42 C38 34 82 34 100 42 L98 50 C80 42 40 42 22 50 Z" fill="#1d4ed8" />
          <circle cx="60" cy="13" r="7" fill="#fff" />
        </g>
      )}
      {kopf === 'kappe' && (
        <g strokeLinejoin="round">
          <path d="M24 42 C24 14 96 14 96 42 C78 36 42 36 24 42 Z" fill="#e5484d" stroke="#b8343a" strokeWidth="2" />
          <path d="M70 39 C88 36 106 40 112 47 C96 49 80 47 68 44 Z" fill="#b8343a" />
          <circle cx="60" cy="19" r="3.2" fill="#b8343a" />
        </g>
      )}
      {kopf === 'zylinder' && (
        <g strokeLinejoin="round">
          <rect x="40" y="2" width="40" height="28" rx="3" fill="#2a2a30" />
          <rect x="40" y="20" width="40" height="7" fill="#e5484d" />
          <ellipse cx="60" cy="31" rx="36" ry="6" fill="#2a2a30" />
        </g>
      )}
      {kopf === 'krone' && (
        <g>
          <path d="M36 32 L42 10 L54 24 L60 6 L66 24 L78 10 L84 32 Z" fill="#f5b82e" stroke="#b8860b" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="60" cy="22" r="2.6" fill="#e5484d" />
        </g>
      )}
    </svg>
  )
}
