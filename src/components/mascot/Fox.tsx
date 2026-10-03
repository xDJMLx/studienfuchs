import { useId, useLayoutEffect, useRef } from 'react'
import type { Outfit } from '../../lib/shop'
import type { Fx, Look } from './look'
import { MOUTHS, mouthLine, mouthLower, mouthPath, stepMouth, tonguePos, type MouthName, type MouthParams } from './mouth'

/**
 * Fenni, der Fuchs: eigene Zeichnung aus Formen, in Teilen aufgebaut, damit jedes Teil einzeln wackeln, blinzeln,
 * winken oder die Pose wechseln kann. Hier steht nur das Bild; Verhalten und Reaktionen stecken in Mascot.tsx.
 * Koordinaten: 200 breit, 240 hoch. Kopf um (100, 90), Hals bei (100, 140).
 */
const C = {
  orange: '#ff8a1c',
  orangeLight: '#ffac4d',
  orangeDark: '#e6660a',
  cream: '#fff0dc',
  white: '#ffffff',
  brown: '#2e1a0d',
  mouth: '#6d1f2c',
  tongue: '#ff7a8d',
}

const rot = (deg: number, x: number, y: number, ms = 320, delay = 0): React.CSSProperties => ({
  transform: `rotate(${deg}deg)`,
  transformOrigin: `${x}px ${y}px`,
  transformBox: 'view-box',
  transition: `transform ${ms}ms cubic-bezier(0.34, 1.5, 0.5, 1) ${delay}ms`,
})

interface FoxProps {
  look: Look
  outfit?: Outfit
  /** Kopf und Oberkörper ("bust") oder der ganze Fuchs ("full") */
  pose: 'bust' | 'full'
  /** läuft in Ruhe: Atmen, Schwanz, Blinzeln, Ohrenzucken */
  alive: boolean
  /** Klassen zum erneuten Starten einer Bewegung, z. B. Hüpfen oder Schütteln */
  bodyClass?: string
  headClass?: string
  wagging?: boolean
  eyeDelay?: number
}

export function Fox({ look, outfit, pose, alive, bodyClass = '', headClass = '', wagging = false, eyeDelay = 0 }: FoxProps) {
  const uid = useId().replace(/:/g, '')
  const { kopf, gesicht, hals, hintergrund } = outfit ?? {}
  const g = (n: string) => `${n}-${uid}`
  const viewBox = pose === 'full' ? '0 0 200 240' : '8 0 184 196'

  const arms = (
    <>
      <g style={rot(look.armL, 64, 160, 380)}>
        <g className={look.dance ? 'fox-dance-arm-l' : look.armL > 100 && !look.armFront && alive ? 'fox-arm-cheer-l' : ''} style={{ transformOrigin: '64px 160px', transformBox: 'view-box', transform: `scale(1, ${look.armL > 100 && !look.armFront ? 1.24 : 1})`, transition: 'transform 380ms cubic-bezier(0.34, 1.5, 0.5, 1)' }}>
          <path d="M62 154 C46 162 40 186 45 202 C48 210 61 211 64 201 C67 188 72 174 70 158 Z" fill={`url(#${g('fur')})`} />
          <path d="M44 198 C43 208 56 213 65 205 C65 199 61 195 54 195 Z" fill={C.brown} />
        </g>
      </g>
      <g style={rot(look.armR, 136, 160, 380)}>
        <g className={look.dance ? 'fox-dance-arm-r' : look.armR < -100 && !look.armFront && alive ? 'fox-arm-cheer-r' : ''} style={{ transformOrigin: '136px 160px', transformBox: 'view-box', transform: `scale(1, ${look.armR < -100 && !look.armFront ? 1.24 : 1})`, transition: 'transform 380ms cubic-bezier(0.34, 1.5, 0.5, 1)' }}>
          <path d="M138 154 C154 162 160 186 155 202 C152 210 139 211 136 201 C133 188 128 174 130 158 Z" fill={`url(#${g('fur')})`} />
          <path d="M156 198 C157 208 144 213 135 205 C135 199 139 195 146 195 Z" fill={C.brown} />
        </g>
      </g>

    </>
  )

  return (
    <svg viewBox={viewBox} width="100%" height="100%" className="overflow-visible" data-alive={alive ? '' : undefined} preserveAspectRatio="xMidYMax meet" focusable="false">
      <defs>
        <linearGradient id={g('fur')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.orangeLight} />
          <stop offset="0.55" stopColor={C.orange} />
          <stop offset="1" stopColor="#f2750f" />
        </linearGradient>
        <linearGradient id={g('face')} gradientUnits="userSpaceOnUse" x1="0" y1="28" x2="0" y2="148">
          <stop offset="0" stopColor="#ffa94a" />
          <stop offset="0.5" stopColor={C.orange} />
          <stop offset="1" stopColor="#f2750f" />
        </linearGradient>
        <linearGradient id={g('white')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffe9d0" />
        </linearGradient>
        <radialGradient id={g('aura')} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#ffd75e" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f5b82e" stopOpacity="0.15" />
        </radialGradient>
        <clipPath id={g('earTip')}>
          <rect x="0" y="0" width="200" height="25" />
        </clipPath>
        <clipPath id={g('tailTip')}>
          <rect x="140" y="120" width="70" height="48" />
        </clipPath>
      </defs>

      {/* Hintergrund (gekauft) */}
      {hintergrund === 'sonne' && (
        <g>
          <circle cx="100" cy="112" r="104" fill="#ffd75e" />
          <circle cx="100" cy="112" r="82" fill="#ffe99a" />
        </g>
      )}
      {hintergrund === 'nacht' && (
        <g>
          <circle cx="100" cy="112" r="104" fill="#1d2b64" />
          <path d="M160 24 a18 18 0 1 0 14 30 a15 15 0 1 1 -14 -30 Z" fill="#ffe99a" />
          <path d="M26 54 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z M34 170 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 Z M176 150 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#fff" />
        </g>
      )}
      {hintergrund === 'aura' && (
        <g>
          <circle cx="100" cy="112" r="104" fill={`url(#${g('aura')})`} />
          <circle cx="100" cy="112" r="100" fill="none" stroke="#f5b82e" strokeWidth="3" strokeDasharray="4 11" strokeLinecap="round" />
        </g>
      )}

      {pose === 'full' && <ellipse cx="100" cy="234" rx="50" ry="6.5" fill="#000" opacity="0.2" />}

      <g className={bodyClass} style={{ transformOrigin: '100px 232px', transformBox: 'view-box' }}>
        {/* Schwanz */}
        <g className={wagging ? 'fox-tail-wag' : alive ? 'fox-tail' : ''} style={{ transformOrigin: '128px 202px', transformBox: 'view-box' }}>
          <path d="M126 210 C160 222 200 204 198 164 C197 146 188 134 176 132 C176 146 170 160 158 170 C148 178 138 184 126 186 Z" fill={`url(#${g('fur')})`} />
          <path d="M126 210 C160 222 200 204 198 164" fill="none" stroke={C.orangeDark} strokeWidth="5" strokeLinecap="round" opacity="0.3" />
          <path d="M150 190 C164 188 176 178 182 166" fill="none" stroke={C.orangeLight} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
          <g clipPath={`url(#${g('tailTip')})`}>
            <path d="M126 210 C160 222 200 204 198 164 C197 146 188 134 176 132 C176 146 170 160 158 170 C148 178 138 184 126 186 Z" fill={`url(#${g('white')})`} />
          </g>
        </g>

        {/* Körper */}
        <g className={alive ? 'fox-breathe' : ''} style={{ transformOrigin: '100px 230px', transformBox: 'view-box' }}>
          {/* Füße */}
          <path d="M64 210 C58 224 66 233 82 233 C96 233 99 222 94 212 Z" fill={C.brown} />
          <path d="M136 210 C142 224 134 233 118 233 C104 233 101 222 106 212 Z" fill={C.brown} />
          <path d="M70 224 q8 3 16 0 M114 224 q8 3 16 0" stroke="#4a2c18" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
          {/* Rumpf */}
          <path d="M56 150 C46 180 52 210 74 219 C90 225 110 225 126 219 C148 210 154 180 144 150 C126 136 74 136 56 150 Z" fill={`url(#${g('fur')})`} />
          <path d="M72 146 C70 178 80 207 100 211 C120 207 130 178 128 146 C116 156 84 156 72 146 Z" fill={`url(#${g('white')})`} />
          <path d="M82 200 C92 208 108 208 118 200" stroke="#f0c9a0" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          {/* Lichtkante links und Schatten rechts geben dem Körper Rundung */}
          <path d="M62 158 C55 182 59 204 72 214" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.28" />
          <path d="M140 160 C147 184 143 204 130 214" stroke="#c4560a" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.22" />
          {/* Schatten unter dem Kopf */}
          <ellipse cx="100" cy="148" rx="44" ry="8" fill="#b84d00" opacity="0.12" />
        </g>

        {!look.armFront && arms}

        {/* Halsschmuck (gekauft) */}
        {hals === 'schal' && (
          <g>
            <path d="M54 140 C76 160 124 160 146 140 L150 158 C128 180 72 180 50 158 Z" fill="#e5484d" />
            <path d="M60 156 q40 18 80 0" stroke="#fff" strokeWidth="4" fill="none" opacity="0.7" strokeLinecap="round" />
            <path d="M116 164 l8 34 l20 -6 l-8 -34 Z" fill="#c93a40" />
            <path d="M122 190 l18 -5 M120 180 l18 -5" stroke="#fff" strokeWidth="3" opacity="0.7" strokeLinecap="round" />
          </g>
        )}
        {hals === 'fliege' && (
          <g strokeLinejoin="round">
            <path d="M100 152 L72 138 L72 168 Z" fill="#3b6fe0" stroke="#24429a" strokeWidth="3" />
            <path d="M100 152 L128 138 L128 168 Z" fill="#3b6fe0" stroke="#24429a" strokeWidth="3" />
            <rect x="91" y="143" width="18" height="18" rx="5" fill="#2a56c4" stroke="#24429a" strokeWidth="3" />
          </g>
        )}
        {hals === 'medaille' && (
          <g strokeLinejoin="round">
            <path d="M72 142 L100 180 L128 142" stroke="#e5484d" strokeWidth="9" fill="none" strokeLinecap="round" />
            <circle cx="100" cy="186" r="14" fill="#f5b82e" stroke="#b8860b" strokeWidth="3.5" />
            <path d="M100 178 l2.6 5.2 5.8 .8 -4.2 4 1 5.8 -5.2 -2.8 -5.2 2.8 1 -5.8 -4.2 -4 5.8 -.8 Z" fill="#b8860b" />
          </g>
        )}

      {/* Kopf */}
      <g style={{ transformOrigin: '100px 140px', transformBox: 'view-box', transform: `translateY(${look.headY}px) rotate(${look.headRot}deg)`, transition: 'transform 380ms cubic-bezier(0.34, 1.4, 0.5, 1)' }}>
        <g className={`${headClass} ${alive ? 'fox-head' : ''}`} style={{ transformOrigin: '100px 140px', transformBox: 'view-box' }}>
          <g className="fox-look" style={{ transformOrigin: '100px 140px', transformBox: 'view-box' }}>
            {/* Ohren */}
            <g style={rot(look.earL, 56, 62, 340, 60)}>
              <g className={alive ? 'fox-ear-l' : ''} style={{ transformOrigin: '56px 62px', transformBox: 'view-box' }}>
                <path d="M38 72 C20 46 20 20 32 4 C52 10 74 26 88 44 Z" fill={C.orange} />
                <path d="M48 58 C40 42 38 28 42 18 C54 24 66 32 74 44 Z" fill={C.cream} />
                <g clipPath={`url(#${g('earTip')})`}>
                  <path d="M38 72 C20 46 20 20 32 4 C52 10 74 26 88 44 Z" fill={C.brown} />
                </g>
              </g>
            </g>
            <g style={rot(look.earR, 144, 62, 340, 60)}>
              <g className={alive ? 'fox-ear-r' : ''} style={{ transformOrigin: '144px 62px', transformBox: 'view-box' }}>
                <path d="M162 72 C180 46 180 20 168 4 C148 10 126 26 112 44 Z" fill={C.orange} />
                <path d="M152 58 C160 42 162 28 158 18 C146 24 134 32 126 44 Z" fill={C.cream} />
                <g clipPath={`url(#${g('earTip')})`}>
                  <path d="M162 72 C180 46 180 20 168 4 C148 10 126 26 112 44 Z" fill={C.brown} />
                </g>
              </g>
            </g>

            {/* Kopfform und weißes Gesicht */}
            <path d="M100 28 C142 28 170 54 172 90 C173 101 177 109 184 117 C170 120 161 120 153 115 C145 135 125 148 100 148 C75 148 55 135 47 115 C39 120 30 120 16 117 C23 109 27 101 28 90 C30 54 58 28 100 28 Z" fill={`url(#${g('face')})`} />
            <path d="M28 98 C46 92 70 98 82 114 C88 122 94 127 100 127 C106 127 112 122 118 114 C130 98 154 92 172 98 C175 106 179 111 184 117 C170 120 161 120 153 115 C145 135 125 148 100 148 C75 148 55 135 47 115 C39 120 30 120 16 117 C21 111 25 106 28 98 Z" fill={`url(#${g('white')})`} />
            <path d="M60 52 C74 40 92 36 106 36" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.28" />
            {/* Haarbüschel, damit er nicht glatt wie ein Ball wirkt */}
            <path d="M96 31 C90 17 102 8 112 14 C104 16 102 24 104 31 Z" fill={C.orangeLight} />
            <path d="M104 31 C102 22 108 18 116 20 C110 23 110 28 112 31 Z" fill={C.orange} />

            {/* Augen */}
            <Eye cx={69} cy={90} look={look} lid={`url(#${g('face')})`} eyeDelay={eyeDelay} />
            <Eye cx={131} cy={90} look={look} lid={`url(#${g('face')})`} eyeDelay={eyeDelay} mirror />

            {/* Augenbrauen */}
            <g style={{ transform: `translateY(${look.browL[0]}px) rotate(${look.browL[1]}deg)`, transformOrigin: '69px 66px', transformBox: 'view-box', transition: 'transform 260ms cubic-bezier(0.34, 1.4, 0.5, 1)' }}>
              <path d="M55 68 Q69 59 83 66" stroke={C.brown} strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>
            <g style={{ transform: `translateY(${look.browR[0]}px) rotate(${look.browR[1]}deg)`, transformOrigin: '131px 66px', transformBox: 'view-box', transition: 'transform 260ms cubic-bezier(0.34, 1.4, 0.5, 1)' }}>
              <path d="M117 66 Q131 59 145 68" stroke={C.brown} strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>

            {/* Wangen */}
            <ellipse cx="42" cy="114" rx="9" ry="6" fill="#ff6f7a" opacity={look.blush} />
            <ellipse cx="158" cy="114" rx="9" ry="6" fill="#ff6f7a" opacity={look.blush} />

            {/* Sommersprossen */}
            <g fill="#d9955f" opacity="0.75">
              <circle cx="76" cy="120" r="1.7" /><circle cx="70" cy="125" r="1.7" /><circle cx="77" cy="127" r="1.7" />
              <circle cx="124" cy="120" r="1.7" /><circle cx="130" cy="125" r="1.7" /><circle cx="123" cy="127" r="1.7" />
            </g>

            {/* Nase */}
            <path d="M90 106 Q100 101 110 106 Q108 117 100 121 Q92 117 90 106 Z" fill={C.brown} />
            <ellipse cx="97" cy="107.5" rx="4" ry="1.7" fill="#fff" opacity="0.5" />

            {/* Mund */}
            <AnimatedMouth mouth={look.mouth} clipId={g('mouthClip')} />

            {/* Gesichtsschmuck (gekauft) */}
            {gesicht === 'brille' && (
              <g fill="none" stroke="#2e1a0d" strokeWidth="4">
                <circle cx="69" cy="90" r="23" fill="rgba(255,255,255,0.16)" />
                <circle cx="131" cy="90" r="23" fill="rgba(255,255,255,0.16)" />
                <path d="M92 88 q8 -6 16 0" strokeLinecap="round" />
                <path d="M46 86 l-14 -6 M154 86 l14 -6" strokeLinecap="round" />
                <path d="M56 76 q6 -6 14 -6" stroke="#fff" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
              </g>
            )}
            {gesicht === 'sonnenbrille' && (
              <g>
                <path d="M44 74 h50 v14 a16 16 0 0 1 -16 16 h-18 a16 16 0 0 1 -16 -16 Z" fill="#1d1d22" />
                <path d="M106 74 h50 v14 a16 16 0 0 1 -16 16 h-18 a16 16 0 0 1 -16 -16 Z" fill="#1d1d22" />
                <path d="M94 78 q6 -4 12 0" stroke="#1d1d22" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M44 78 l-14 -4 M156 78 l14 -4" stroke="#1d1d22" strokeWidth="5" strokeLinecap="round" />
                <path d="M52 82 l14 0 M114 82 l14 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
              </g>
            )}
            {gesicht === 'schnurrbart' && (
              <path d="M100 125 C94 117 78 118 72 130 C82 128 92 130 100 135 C108 130 118 128 128 130 C122 118 106 117 100 125 Z" fill={C.brown} stroke={C.brown} strokeWidth="2" strokeLinejoin="round" />
            )}

            {/* Kopfschmuck (gekauft) */}
            {kopf === 'muetze' && (
              <g>
                <path d="M62 62 C58 22 142 22 138 62 Z" fill="#3b82f6" />
                <path d="M60 60 C80 54 120 54 140 60 L138 74 C118 68 82 68 62 74 Z" fill="#1d4ed8" />
                <circle cx="100" cy="22" r="10" fill="#fff" />
              </g>
            )}
            {kopf === 'kappe' && (
              <g strokeLinejoin="round">
                <path d="M60 58 C60 22 140 22 140 58 C120 52 80 52 60 58 Z" fill="#e5484d" stroke="#b8343a" strokeWidth="3" />
                <path d="M96 56 C122 52 158 56 168 66 C146 70 118 68 94 62 Z" fill="#b8343a" />
                <circle cx="100" cy="27" r="5" fill="#b8343a" />
              </g>
            )}
            {kopf === 'zylinder' && (
              <g strokeLinejoin="round">
                <rect x="70" y="2" width="60" height="44" rx="4" fill="#2a2a30" />
                <rect x="70" y="32" width="60" height="10" fill="#e5484d" />
                <ellipse cx="100" cy="47" rx="48" ry="8" fill="#2a2a30" />
              </g>
            )}
            {kopf === 'krone' && (
              <g>
                <path d="M64 54 L68 14 L86 36 L100 8 L114 36 L132 14 L136 54 Z" fill="#f5b82e" stroke="#b8860b" strokeWidth="4" strokeLinejoin="round" />
                <circle cx="100" cy="34" r="4" fill="#e5484d" />
                <circle cx="78" cy="42" r="3" fill="#3b82f6" />
                <circle cx="122" cy="42" r="3" fill="#3b82f6" />
              </g>
            )}
          </g>
        </g>
      </g>

        {look.armFront && arms}
      </g>

      <Effects fx={look.fx} />
    </svg>
  )
}

function Eye({ cx, cy, look, lid, eyeDelay, mirror = false }: { cx: number; cy: number; look: Look; lid: string; eyeDelay: number; mirror?: boolean }) {
  const { eyes } = look
  const flip = mirror ? -1 : 1
  // Zwinkern: das rechte Auge ist zu, das linke offen
  const mode: 'open' | 'happy' | 'closed' = eyes === 'happy' || (eyes === 'wink' && mirror) ? 'happy' : eyes === 'closed' ? 'closed' : 'open'
  const rx = 15
  const ry = 19
  const fade = { transition: 'opacity 120ms ease-out' }
  return (
    <g>
      <path d={'M' + (cx - 15) + ' ' + (cy + 6) + ' Q' + cx + ' ' + (cy - 16) + ' ' + (cx + 15) + ' ' + (cy + 6)} stroke={C.brown} strokeWidth="6.5" strokeLinecap="round" fill="none" style={{ ...fade, opacity: mode === 'happy' ? 1 : 0 }} />
      <path d={'M' + (cx - 14) + ' ' + (cy - 2) + ' Q' + cx + ' ' + (cy + 10) + ' ' + (cx + 14) + ' ' + (cy - 2)} stroke={C.brown} strokeWidth="6" strokeLinecap="round" fill="none" style={{ ...fade, opacity: mode === 'closed' ? 1 : 0 }} />
      <g style={{ ...fade, opacity: mode === 'open' ? 1 : 0 }}>
        <g>
          <g style={{ transform: eyes === 'wide' ? 'scale(1.13)' : 'scale(1)', transformOrigin: cx + 'px ' + cy + 'px', transformBox: 'view-box', transition: 'transform 160ms cubic-bezier(0.34, 1.5, 0.5, 1)' }}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#f0d3b4" strokeWidth="1.5" />
            <g style={{ transform: 'translate(calc((var(--gx, 0) + var(--px, 0)) * 1px), calc((var(--gy, 0) + var(--py, 0)) * 1px))', transition: 'transform 140ms ease-out' }}>
              <ellipse cx={cx} cy={cy + 1} rx="10.5" ry="13.5" fill="#2a170a" />
              <ellipse cx={cx} cy={cy + 8} rx="7" ry="5" fill="#8a4a1c" opacity="0.5" />
              <circle cx={cx - 3.6 * flip} cy={cy - 5} r="4" fill="#fff" />
              <circle cx={cx + 4 * flip} cy={cy + 6} r="1.9" fill="#fff" opacity="0.9" />
            </g>
            {/* Lid zum Blinzeln: fährt von oben über das Auge, in Hautfarbe statt als weißer Strich */}
            <ellipse className="fox-lid" cx={cx} cy={cy} rx={rx + 1.4} ry={ry + 1.4} fill={lid} style={{ transformOrigin: cx + 'px ' + (cy - ry - 1.4) + 'px', transformBox: 'view-box', animationDelay: eyeDelay + 's' }} />
            {/* Oberlid, außen tiefer: gibt den traurigen Blick */}
            <path
              d={mirror ? 'M' + (cx - rx - 2) + ' ' + (cy - 26) + ' L' + (cx + rx + 2) + ' ' + (cy - 26) + ' L' + (cx + rx + 2) + ' ' + (cy - 4) + ' Q' + cx + ' ' + (cy - 20) + ' ' + (cx - rx - 2) + ' ' + (cy - 17) + ' Z' : 'M' + (cx - rx - 2) + ' ' + (cy - 26) + ' L' + (cx + rx + 2) + ' ' + (cy - 26) + ' L' + (cx + rx + 2) + ' ' + (cy - 17) + ' Q' + cx + ' ' + (cy - 20) + ' ' + (cx - rx - 2) + ' ' + (cy - 4) + ' Z'}
              fill={lid}
              style={{ ...fade, opacity: eyes === 'sad' ? 1 : 0 }}
            />
          </g>
        </g>
      </g>
    </g>
  )
}

/**
 * Mund: wird aus Zahlen gezeichnet und gleitet beim Wechsel der Stimmung weich zur neuen Form.
 * Die Pfade werden direkt gesetzt (ohne React), damit nicht bei jedem Bild neu gerendert wird.
 */
function AnimatedMouth({ mouth, clipId }: { mouth: MouthName; clipId: string }) {
  const fillRef = useRef<SVGPathElement>(null)
  const clipRef = useRef<SVGPathElement>(null)
  const upperRef = useRef<SVGPathElement>(null)
  const lowerRef = useRef<SVGPathElement>(null)
  const stemRef = useRef<SVGPathElement>(null)
  const tongueRef = useRef<SVGEllipseElement>(null)
  const cur = useRef<MouthParams>({ ...MOUTHS[mouth] })
  const raf = useRef(0)

  const draw = () => {
    const p = cur.current
    const full = mouthPath(p)
    fillRef.current?.setAttribute('d', full)
    fillRef.current?.setAttribute('fill-opacity', String(Math.min(1, p.open / 4)))
    clipRef.current?.setAttribute('d', full)
    upperRef.current?.setAttribute('d', mouthLine(p))
    lowerRef.current?.setAttribute('d', mouthLower(p))
    lowerRef.current?.setAttribute('stroke-opacity', String(Math.min(1, p.open / 4)))
    stemRef.current?.setAttribute('d', 'M100 121 V' + (p.centerY - 0.5))
    const t = tonguePos(p)
    tongueRef.current?.setAttribute('cy', String(t.cy))
    tongueRef.current?.setAttribute('rx', String(t.rx))
    tongueRef.current?.setAttribute('ry', String(t.ry))
  }

  useLayoutEffect(() => {
    const target = MOUTHS[mouth]
    cancelAnimationFrame(raf.current)
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      cur.current = { ...target }
      draw()
      return
    }
    let last = performance.now()
    const tick = (now: number) => {
      const moving = stepMouth(cur.current, target, Math.min(64, now - last))
      last = now
      draw()
      raf.current = moving ? requestAnimationFrame(tick) : 0
    }
    raf.current = requestAnimationFrame(tick)
    draw()
    return () => cancelAnimationFrame(raf.current)
    // draw liest nur Refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouth])

  const stroke = { stroke: C.brown, strokeWidth: 3.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  return (
    <g>
      <clipPath id={clipId}>
        <path ref={clipRef} />
      </clipPath>
      <path ref={fillRef} fill={C.mouth} />
      <g clipPath={'url(#' + clipId + ')'}>
        <ellipse ref={tongueRef} cx="100" fill={C.tongue} />
      </g>
      <path ref={stemRef} {...stroke} strokeWidth="3.4" />
      <path ref={upperRef} {...stroke} />
      <path ref={lowerRef} {...stroke} />
    </g>
  )
}

/** Kleine Effekte rund um den Fuchs: Funken, Träne, Fragezeichen, Zzz, Herzen, Konfetti. */
function Effects({ fx }: { fx: Fx }) {
  if (!fx) return null
  const star = (x: number, y: number, s: number, delay: number, color = '#ffd75e') => (
    <path key={`${x}-${y}`} className="fox-pop" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px`, transformBox: 'view-box' }} d={`M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`} fill={color} />
  )
  if (fx === 'sparkles' || fx === 'confetti') {
    return (
      <g aria-hidden>
        {star(26, 40, 11, 0)}
        {star(176, 34, 9, 0.12, '#fff')}
        {star(14, 118, 7, 0.22)}
        {star(188, 110, 10, 0.08)}
        {star(150, 8, 6, 0.3, '#fff')}
        {fx === 'confetti' && (
          <>
            <rect className="fox-fall" x="40" y="-6" width="7" height="12" rx="2" fill="#35d05c" style={{ animationDelay: '0s' }} />
            <rect className="fox-fall" x="84" y="-14" width="7" height="12" rx="2" fill="#3b82f6" style={{ animationDelay: '0.2s' }} />
            <rect className="fox-fall" x="124" y="-8" width="7" height="12" rx="2" fill="#e5484d" style={{ animationDelay: '0.1s' }} />
            <rect className="fox-fall" x="160" y="-16" width="7" height="12" rx="2" fill="#ffc233" style={{ animationDelay: '0.32s' }} />
          </>
        )}
      </g>
    )
  }
  if (fx === 'tear') {
    return <path className="fox-tear" d="M52 108 C46 118 46 124 52 126 C58 124 58 118 52 108 Z" fill="#7cc7ff" stroke="#3b9be0" strokeWidth="1.5" />
  }
  if (fx === 'question') {
    return (
      <text className="fox-float-in" x="150" y="30" fontSize="38" fontWeight="800" fill="#ffd75e" stroke="#c99200" strokeWidth="1.2" fontFamily="Inter Variable, system-ui, sans-serif">?</text>
    )
  }
  if (fx === 'zzz') {
    return (
      <g fontFamily="Inter Variable, system-ui, sans-serif" fontWeight="800" fill="#8da3b7">
        <text className="fox-zzz" x="148" y="44" fontSize="26" style={{ animationDelay: '0s' }}>z</text>
        <text className="fox-zzz" x="162" y="28" fontSize="20" style={{ animationDelay: '0.8s' }}>z</text>
        <text className="fox-zzz" x="174" y="14" fontSize="15" style={{ animationDelay: '1.6s' }}>z</text>
      </g>
    )
  }
  return (
    <g aria-hidden fill="#ff5a7a">
      {[
        [34, 38, 0],
        [170, 44, 0.25],
        [20, 96, 0.5],
      ].map(([x, y, d]) => (
        <path key={`${x}${y}`} className="fox-heart" style={{ animationDelay: `${d}s` }} transform={`translate(${x} ${y})`} d="M0 6 C-10 -2 -4 -12 0 -6 C4 -12 10 -2 0 6 Z" />
      ))}
    </g>
  )
}
