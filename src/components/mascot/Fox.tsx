import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import type { Outfit } from '../../lib/shop'
import { FoxEngine } from './engine'
import { eyeArc, eyeLid, eyeWindow, lidOpacity, shutScale, SHUT_PIVOT, EYE_RX, EYE_RY, type EyeParams } from './eye'
import type { Fx, Look } from './look'
import { mouthLine, mouthLower, mouthPath, tonguePos, type MouthParams } from './mouth'
import { skinOf, type SpeciesId } from './species'

/**
 * Fenni, der Fuchs: eigene Zeichnung aus Formen, in Teilen aufgebaut. Alle Bewegungen kommen aus dem Gerüst (engine.ts)
 * und landen als CSS-Variablen an der Zeichnung; Augen und Mund werden pro Bild direkt gesetzt. Dadurch rendert React
 * nicht bei jedem Bild neu. Koordinaten: 200 breit, 240 hoch. Kopf um (100, 90), Hals bei (100, 140).
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

const T = (css: string, ox: number, oy: number): React.CSSProperties => ({ transform: css, transformOrigin: `${ox}px ${oy}px`, transformBox: 'view-box' })
const stroke = (w: number, ink: string = C.brown) => ({ stroke: ink, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' })

/** Befehle von außen (Mascot.tsx). */
export interface FoxHandle {
  hop: (power?: number) => void
  boing: () => void
  shake: () => void
  wag: (seconds?: number) => void
  flickEar: (side?: 'l' | 'r') => void
  blink: () => void
  setPointer: (px: number, py: number, hx: number) => void
  setTalk: (level: number | null, bright?: number) => void
}

interface FoxProps {
  look: Look
  outfit?: Outfit
  /** Kopf und Oberkörper ("bust") oder der ganze Fuchs ("full") */
  pose: 'bust' | 'full'
  /** läuft in Ruhe: Atmen, Schwanz, Blinzeln, Ohrenzucken, Blickwechsel */
  alive: boolean
  /** welches Tier (Standard: Fuchs) */
  species?: SpeciesId
  /** nur Kopf: ohne Schwanz, Körper und Arme (für das App-Symbol) */
  headOnly?: boolean
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Parts = Record<string, Element | null>

export const Fox = forwardRef<FoxHandle, FoxProps>(function Fox({ look, outfit, pose, alive, species, headOnly }, ref) {
  const uid = useId().replace(/:/g, '')
  const skin = skinOf(species)
  const { kopf, gesicht, hals, hintergrund } = outfit ?? {}
  const g = (n: string) => `${n}-${uid}`
  const ctx = { g }
  const viewBox = pose === 'full' ? '0 0 200 240' : '8 0 184 196'

  const root = useRef<SVGSVGElement>(null)
  const parts = useRef<Parts>({})
  const reg = (k: string) => (el: Element | null) => {
    parts.current[k] = el
  }
  const reduced = useMemo(reducedMotion, [])
  const engine = useMemo(() => new FoxEngine({ idle: false, reduced }), [reduced])
  const raf = useRef(0)
  const last = useRef(0)
  /** zuletzt geschriebene Werte: unveränderte werden nicht noch einmal ins Dokument geschrieben (spart Akku) */
  const written = useRef<Record<string, string>>({})

  useImperativeHandle(
    ref,
    () => ({
      hop: (p) => engine.hop(p),
      boing: () => engine.boing(),
      shake: () => engine.shake(),
      wag: (s) => engine.wagTail(s),
      flickEar: (s) => engine.flickEar(s),
      blink: () => engine.blinkNow(),
      setPointer: (x, y, h) => engine.setPointer(x, y, h),
      setTalk: (l, b) => engine.setTalk(l, b),
    }),
    [engine],
  )

  /** Werte des Gerüsts an die Zeichnung geben. */
  const apply = () => {
    const el = root.current
    if (!el) return
    const o = engine.out
    const w = written.current
    for (const k in o.vars) {
      const v = String(o.vars[k])
      if (w['--' + k] !== v) {
        w['--' + k] = v
        el.style.setProperty('--' + k, v)
      }
    }
    const set = (key: string, name: string, value: string) => {
      const id = key + '/' + name
      if (w[id] === value) return
      w[id] = value
      parts.current[key]?.setAttribute(name, value)
    }
    drawEye(o.eyeL, 69, 90, false, 'L', set, o.vars.gx, o.vars.gy)
    drawEye(o.eyeR, 131, 90, true, 'R', set, o.vars.gx, o.vars.gy)
    drawMouth(o.mouth, set)
  }

  // Pose ans Gerüst geben; kleine, ruhende Füchse springen einfach dorthin, lebende erst beim Erscheinen (kein Rohzustand im ersten Bild), danach gleiten sie
  const placed = useRef(false)
  useLayoutEffect(() => {
    engine.setLook(look)
    if (!alive || !placed.current) {
      engine.snap()
      apply()
      placed.current = true
    }
    // apply liest nur Refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, alive, engine])

  // Bildschleife: läuft nur, solange sich etwas bewegt (oder der Fuchs "lebt")
  useEffect(() => {
    if (!alive) return
    engine.setIdle(!reduced)
    // Außerhalb des Bildschirms oder bei verborgenem Tab rechnet der Fuchs nicht (spart Akku, besonders mit mehreren Füchsen)
    let onScreen = true
    const loop = (now: number) => {
      if (document.hidden || !onScreen) {
        raf.current = 0
        last.current = 0
        return
      }
      const dt = last.current ? now - last.current : 16
      last.current = now
      const more = engine.tick(dt)
      apply()
      raf.current = more ? requestAnimationFrame(loop) : 0
      if (!more) last.current = 0
    }
    const start = () => {
      if (!raf.current) {
        last.current = 0
        raf.current = requestAnimationFrame(loop)
      }
    }
    engine.onWake = start
    start()
    const el = root.current
    const io = el && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          onScreen = entries[entries.length - 1].isIntersecting
          if (onScreen) start()
        })
      : null
    if (el) io?.observe(el)
    const onVisible = () => {
      if (!document.hidden) start()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      cancelAnimationFrame(raf.current)
      raf.current = 0
      engine.onWake = () => {}
      engine.setIdle(false)
    }
    // apply liest nur Refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alive, engine, reduced])

  const arms = (
    <>
      <g style={T('rotate(calc(var(--aL, 0) * 1deg)) scale(1, var(--aLs, 1))', 64, 160)}>
        <path d="M62 154 C46 162 40 186 45 202 C48 210 61 211 64 201 C67 188 72 174 70 158 Z" fill={skin.arm ?? `url(#${g('fur')})`} />
        <path d="M44 198 C43 208 56 213 65 205 C65 199 61 195 54 195 Z" fill={skin.paw} />
      </g>
      <g style={T('rotate(calc(var(--aR, 0) * 1deg)) scale(1, var(--aRs, 1))', 136, 160)}>
        <path d="M138 154 C154 162 160 186 155 202 C152 210 139 211 136 201 C133 188 128 174 130 158 Z" fill={skin.arm ?? `url(#${g('fur')})`} />
        <path d="M156 198 C157 208 144 213 135 205 C135 199 139 195 146 195 Z" fill={skin.paw} />
      </g>
    </>
  )

  return (
    <svg ref={root} viewBox={viewBox} width="100%" height="100%" className="overflow-visible" preserveAspectRatio="xMidYMax meet" focusable="false">
      <defs>
        <linearGradient id={g('fur')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skin.fur[0]} />
          <stop offset="0.55" stopColor={skin.fur[1]} />
          <stop offset="1" stopColor={skin.fur[2]} />
        </linearGradient>
        <linearGradient id={g('face')} gradientUnits="userSpaceOnUse" x1="0" y1="28" x2="0" y2="148">
          <stop offset="0" stopColor={skin.fur[0]} />
          <stop offset="0.5" stopColor={skin.fur[1]} />
          <stop offset="1" stopColor={skin.fur[2]} />
        </linearGradient>
        <linearGradient id={g('white')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skin.light[0]} />
          <stop offset="1" stopColor={skin.light[1]} />
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
        <clipPath id={g('eyeL')}>
          <path ref={reg('clipL')} />
        </clipPath>
        <clipPath id={g('eyeR')}>
          <path ref={reg('clipR')} />
        </clipPath>
        <clipPath id={g('mouthClip')}>
          <path ref={reg('mClip')} />
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

      {/* Bodenschatten: wird kleiner und heller, wenn er springt */}
      {pose === 'full' && <ellipse cx="100" cy="234" rx="50" ry="6.5" fill="#000" style={{ ...T('scale(calc(1 + var(--by, 0) * 0.006), 1)', 100, 234), opacity: 'calc(0.2 + var(--by, 0) * 0.004)' as unknown as number }} />}

      <g style={T('translateY(calc(var(--by, 0) * 1px)) rotate(calc(var(--brot, 0) * 1deg)) scale(var(--sx, 1), var(--sy, 1))', 100, 232)}>
        {/* Schwanz */}
        {!headOnly && <g style={T('rotate(calc(var(--tail, 0) * 1deg))', 128, 202)}>{skin.tail(ctx)}</g>}

        {/* Körper */}
        {!headOnly && (
        <g>
          {/* Füße */}
          <path d="M64 210 C58 224 66 233 82 233 C96 233 99 222 94 212 Z" fill={skin.foot} />
          <path d="M136 210 C142 224 134 233 118 233 C104 233 101 222 106 212 Z" fill={skin.foot} />
          <path d="M70 224 q8 3 16 0 M114 224 q8 3 16 0" stroke="#4a2c18" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
          {/* Rumpf */}
          <path d="M56 150 C46 180 52 210 74 219 C90 225 110 225 126 219 C148 210 154 180 144 150 C126 136 74 136 56 150 Z" fill={`url(#${g('fur')})`} />
          {skin.belly && <path d="M72 146 C70 178 80 207 100 211 C120 207 130 178 128 146 C116 156 84 156 72 146 Z" fill={`url(#${g('white')})`} />}
          {skin.id === 'fuchs' && <path d="M82 200 C92 208 108 208 118 200" stroke="#f0c9a0" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />}
          {skin.body?.(ctx)}
          {/* Fellbüschel an der Brust */}
          {skin.id === 'fuchs' && <path d="M86 152 l4 9 l5 -7 l5 9 l5 -9 l5 7 l4 -9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />}
          {/* Zehen */}
          <path d="M72 228 v4 M80 229 v4 M120 228 v4 M128 229 v4" stroke="#14090a" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
          {/* Lichtkante links und Schatten rechts geben dem Körper Rundung */}
          <path d="M62 158 C55 182 59 204 72 214" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.28" />
          <path d="M140 160 C147 184 143 204 130 214" stroke={skin.shade} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.22" />
          {/* Schatten unter dem Kopf */}
          <ellipse cx="100" cy="148" rx="44" ry="8" fill={skin.shade} opacity="0.12" />
        </g>
        )}

        {!headOnly && !look.armFront && arms}

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
        <g style={T('translate(calc(var(--hx, 0) * 1px), calc(var(--hy, 0) * 1px)) rotate(calc(var(--hr, 0) * 1deg))', 100, 140)}>
          {skin.behind?.(ctx)}

          {/* Ohren */}
          <g style={T('rotate(calc(var(--eL, 0) * 1deg))', 56, 62)}>{skin.earL(ctx)}</g>
          <g style={T('rotate(calc(var(--eR, 0) * 1deg))', 144, 62)}>{skin.earR(ctx)}</g>

          {/* Kopfform und helle Schnauze */}
          <path d={skin.head ?? 'M100 28 C142 28 170 54 172 90 C173 121 146 148 100 148 C54 148 27 121 28 90 C30 54 58 28 100 28 Z'} fill={`url(#${g('face')})`} />
          {skin.muzzle && <path d={skin.muzzle} fill={`url(#${g('white')})`} />}
          <path d="M60 52 C74 40 92 36 106 36" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.28" />
          {skin.tuft && (
            <>
              <path d="M96 31 C90 17 102 8 112 14 C104 16 102 24 104 31 Z" fill={skin.fur[0]} />
              <path d="M104 31 C102 22 108 18 116 20 C110 23 110 28 112 31 Z" fill={skin.fur[1]} />
            </>
          )}
          {skin.face?.(ctx)}
          {skin.overlay?.(ctx)}

          {/* Augen */}
          <Eye cx={69} cy={90} clipId={g('eyeL')} flip={1} side="L" reg={reg} ink={skin.ink} />
          <Eye cx={131} cy={90} clipId={g('eyeR')} flip={-1} side="R" reg={reg} ink={skin.ink} />

          {/* Augenbrauen */}
          <g style={T('translateY(calc(var(--blY, 0) * 1px)) rotate(calc(var(--blR, 0) * 1deg))', 69, 66)}>
            <path d="M55 68 Q69 59 83 66" {...stroke(5, skin.id === 'panda' ? '#fff' : skin.ink)} />
          </g>
          <g style={T('translateY(calc(var(--brY, 0) * 1px)) rotate(calc(var(--brR, 0) * 1deg))', 131, 66)}>
            <path d="M117 66 Q131 59 145 68" {...stroke(5, skin.id === 'panda' ? '#fff' : skin.ink)} />
          </g>

          {/* Wangen */}
          <ellipse cx="46" cy="115" rx="8.5" ry="5.5" fill={skin.cheek ?? '#ff6f7a'} style={{ opacity: 'var(--blush, 0.35)' as unknown as number }} />
          <ellipse cx="154" cy="115" rx="8.5" ry="5.5" fill={skin.cheek ?? '#ff6f7a'} style={{ opacity: 'var(--blush, 0.35)' as unknown as number }} />

          {/* Sommersprossen */}
          {skin.freckles && (
            <g fill="#d9955f" opacity="0.75">
              <circle cx="76" cy="120" r="1.7" /><circle cx="70" cy="125" r="1.7" /><circle cx="77" cy="127" r="1.7" />
              <circle cx="124" cy="120" r="1.7" /><circle cx="130" cy="125" r="1.7" /><circle cx="123" cy="127" r="1.7" />
            </g>
          )}

          {/* Nase */}
          {skin.nose(ctx)}

          {/* Schnurrhaare */}
          {skin.whiskers && (
            <g stroke={skin.id === 'fuchs' ? '#e4bf9a' : '#ffffff'} strokeWidth="1.2" strokeLinecap="round" opacity="0.7">
              <path d="M80 124 l-12 -3 M80 128 l-13 3 M120 124 l12 -3 M120 128 l13 3" />
            </g>
          )}

          {/* Mund */}
          <g>
            <path ref={reg('mFill')} fill={C.mouth} />
            <g clipPath={`url(#${g('mouthClip')})`}>
              <ellipse ref={reg('tongue')} cx="100" fill={C.tongue} />
            </g>
            <path ref={reg('mStem')} {...stroke(3.4, skin.ink)} style={skin.noStem ? { display: 'none' } : undefined} />
            <path ref={reg('mUpper')} {...stroke(3.6, skin.ink)} />
            <path ref={reg('mLower')} {...stroke(3.6, skin.ink)} />
          </g>

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

        {!headOnly && look.armFront && arms}
      </g>

      <Effects fx={look.fx} />
    </svg>
  )
})

/** Ein Auge: Weiß mit Pupille, vom Sichtfenster (Lid/Wange) beschnitten, dazu Lidlinie und Bogen für "froh" und "schlafend". */
function Eye({ cx, cy, clipId, flip, side, reg, ink }: { cx: number; cy: number; clipId: string; flip: number; side: 'L' | 'R'; reg: (k: string) => (el: Element | null) => void; ink: string }) {
  return (
    <g>
      <g clipPath={`url(#${clipId})`}>
        <g ref={reg('scale' + side)}>
          <ellipse cx={cx} cy={cy} rx={EYE_RX} ry={EYE_RY} fill="#fff" />
          <ellipse cx={cx} cy={cy} rx={EYE_RX} ry={EYE_RY} fill="none" stroke="#f0d3b4" strokeWidth="1.5" />
          <g ref={reg('pup' + side)}>
            <ellipse cx={cx} cy={cy + 1} rx="10.5" ry="13.5" fill="#2a170a" />
            <ellipse cx={cx} cy={cy + 8} rx="7" ry="5" fill="#8a4a1c" opacity="0.5" />
            <circle cx={cx - 3.6 * flip} cy={cy - 5} r="4" fill="#fff" />
            <circle cx={cx + 4 * flip} cy={cy + 6} r="1.9" fill="#fff" opacity="0.9" />
          </g>
        </g>
      </g>
      <path ref={reg('lid' + side)} {...stroke(3.4, ink)} />
      <path ref={reg('arc' + side)} {...stroke(6.5, ink)} />
    </g>
  )
}

type Setter = (key: string, name: string, value: string) => void

function drawEye(p: EyeParams, cx: number, cy: number, mirror: boolean, side: 'L' | 'R', set: Setter, gx: number, gy: number) {
  const win = eyeWindow(p, cx, cy, mirror)
  set('clip' + side, 'd', win)
  // Lidlinie genau auf der Kante des Fensters, sichtbar sobald das Auge nicht mehr ganz offen ist
  set('lid' + side, 'd', eyeLid(p, cx, cy, mirror))
  set('lid' + side, 'stroke-opacity', String(lidOpacity(p)))
  set('arc' + side, 'd', eyeArc(p, cx, cy))
  set('arc' + side, 'stroke-opacity', String(Math.round(p.arcOn * 100) / 100))
  set('pup' + side, 'transform', 'translate(' + gx + ' ' + gy + ') translate(' + cx + ' ' + (cy + 1) + ') scale(' + Math.round(p.pupil * 100) / 100 + ') translate(' + -cx + ' ' + -(cy + 1) + ')')
  const piv = cy + SHUT_PIVOT * p.shut
  const sx = Math.round(p.scale * 100) / 100
  const sy = Math.round(p.scale * shutScale(p) * 1000) / 1000
  set('scale' + side, 'transform', 'translate(' + cx + ' ' + piv + ') scale(' + sx + ' ' + sy + ') translate(' + -cx + ' ' + -piv + ')')
}

function drawMouth(m: MouthParams, set: Setter) {
  const full = mouthPath(m)
  set('mFill', 'd', full)
  set('mFill', 'fill-opacity', String(Math.min(1, Math.round((m.open / 4) * 100) / 100)))
  set('mClip', 'd', full)
  set('mUpper', 'd', mouthLine(m))
  set('mLower', 'd', mouthLower(m))
  set('mLower', 'stroke-opacity', String(Math.min(1, Math.round((m.open / 4) * 100) / 100)))
  set('mStem', 'd', 'M100 121 V' + Math.round((m.centerY - 0.5) * 100) / 100)
  const t = tonguePos(m)
  set('tongue', 'cy', String(Math.round(t.cy * 100) / 100))
  set('tongue', 'rx', String(Math.round(t.rx * 100) / 100))
  set('tongue', 'ry', String(Math.round(t.ry * 100) / 100))
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
