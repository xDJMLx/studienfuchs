export type Mood = 'happy' | 'cheer' | 'sad' | 'think'

/** Fenni, der Fuchs – unser eigenes Maskottchen (eigene Zeichnung, kein Duolingo-Asset). */
export function Mascot({ mood = 'happy', size = 120, className = '', blink = false, label }: { mood?: Mood; size?: number; className?: string; blink?: boolean; label?: string }) {
  const sad = mood === 'sad'
  const cheer = mood === 'cheer'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`${blink ? 'mascot-blink' : ''} ${className}`} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
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
    </svg>
  )
}
