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
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Parts = Record<string, Element | null>

export const Fox = forwardRef<FoxHandle, FoxProps>(function Fox({ look, outfit, pose, alive, species }, ref) {
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
        <g style={T('rotate(calc(var(--tail, 0) * 1deg))', 128, 202)}>{skin.tail(ctx)}</g>

        {/* Körper */}
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

        {!look.armFront && arms}

        {/* Halsschmuck (gekauft) */}
        {hals === 'schal' && (
          <g strokeLinejoin="round">
            {/* Wulst um den Hals mit Streifen */}
            <path d="M52 142 C74 162 126 162 148 142 L152 160 C128 182 72 182 48 160 Z" fill="#e5484d" />
            <path d="M50 150 C74 170 126 170 150 150" stroke="#fff" strokeWidth="3.2" fill="none" opacity="0.85" strokeLinecap="round" />
            <path d="M49 160 C73 180 127 180 151 160" stroke="#b8343a" strokeWidth="3.2" fill="none" opacity="0.6" strokeLinecap="round" />
            <path d="M62 146 C80 156 96 158 112 156" stroke="#ff8f93" strokeWidth="3" fill="none" opacity="0.7" strokeLinecap="round" />
            {/* hängendes Ende mit Fransen */}
            <path d="M114 166 l10 32 l22 -7 l-8 -32 Z" fill="#c93a40" />
            <path d="M118 178 l22 -7 M121 188 l22 -7" stroke="#fff" strokeWidth="3" opacity="0.85" strokeLinecap="round" />
            <path d="M126 198 l-1 7 M133 196 l-1 7 M140 194 l-1 7 M146 191 l0 6" stroke="#e5484d" strokeWidth="2.6" strokeLinecap="round" />
          </g>
        )}
        {hals === 'fliege' && (
          <g strokeLinejoin="round">
            <path d="M100 154 C86 140 70 134 62 140 C56 152 56 164 62 174 C70 178 86 168 100 154 Z" fill="#e5484d" stroke="#b8343a" strokeWidth="2.6" />
            <path d="M100 154 C114 140 130 134 138 140 C144 152 144 164 138 174 C130 178 114 168 100 154 Z" fill="#e5484d" stroke="#b8343a" strokeWidth="2.6" />
            <path d="M68 142 C76 144 86 148 92 153 M132 142 C124 144 114 148 108 153" stroke="#ff9a9d" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
            <rect x="91" y="144" width="18" height="20" rx="6" fill="#c93a40" stroke="#b8343a" strokeWidth="2.6" />
            <path d="M96 148 v12" stroke="#ff9a9d" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
          </g>
        )}
        {hals === 'medaille' && (
          <g strokeLinejoin="round">
            <path d="M70 142 L96 176 M130 142 L104 176" stroke="#e5484d" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M77 146 L93 168 M123 146 L107 168" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.8" />
            <circle cx="100" cy="188" r="17" fill="#f6b91a" stroke="#c98a00" strokeWidth="3.6" />
            <circle cx="100" cy="188" r="11.5" fill="none" stroke="#fff3b0" strokeWidth="2" opacity="0.9" />
            <path d="M100 178 l2.9 5.9 6.5 .9 -4.7 4.6 1.1 6.5 -5.8 -3.1 -5.8 3.1 1.1 -6.5 -4.7 -4.6 6.5 -.9 Z" fill="#c98a00" />
            <path d="M89 181 C92 176 97 174 102 174" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          </g>
        )}

        {/* Kopf */}
        <g style={T('translate(calc(var(--hx, 0) * 1px), calc(var(--hy, 0) * 1px)) rotate(calc(var(--hr, 0) * 1deg))', 100, 140)}>
          {skin.behind?.(ctx)}

          {/* Ohren */}
          <g style={T('rotate(calc(var(--eL, 0) * 1deg))', ...(skin.earPivot?.[0] ?? [56, 62]))}>{skin.earL(ctx)}</g>
          <g style={T('rotate(calc(var(--eR, 0) * 1deg))', ...(skin.earPivot?.[1] ?? [144, 62]))}>{skin.earR(ctx)}</g>

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

          {/* Rüssel, Zähne und anderes, das vor dem Mund liegt */}
          {skin.snout?.(ctx)}

          {/* Gesichtsschmuck (gekauft) */}
          {gesicht === 'brille' && (
            <g fill="none" strokeLinecap="round">
              <circle cx="69" cy="90" r="24" fill="rgba(190,220,255,0.18)" stroke="#2b2f4a" strokeWidth="4.2" />
              <circle cx="131" cy="90" r="24" fill="rgba(190,220,255,0.18)" stroke="#2b2f4a" strokeWidth="4.2" />
              <path d="M93 86 q7 -6 14 0" stroke="#2b2f4a" strokeWidth="4" />
              <path d="M46 84 l-15 -7 M154 84 l15 -7" stroke="#2b2f4a" strokeWidth="4" />
              <path d="M55 76 q7 -8 16 -8" stroke="#fff" strokeWidth="3.4" opacity="0.75" />
              <path d="M117 76 q7 -8 16 -8" stroke="#fff" strokeWidth="3.4" opacity="0.75" />
            </g>
          )}
          {gesicht === 'sonnenbrille' && (
            <g strokeLinecap="round" strokeLinejoin="round">
              <path d="M42 76 h54 v12 a17 17 0 0 1 -17 17 h-20 a17 17 0 0 1 -17 -17 Z" fill="#17171d" stroke="#0c0c10" strokeWidth="3" />
              <path d="M104 76 h54 v12 a17 17 0 0 1 -17 17 h-20 a17 17 0 0 1 -17 -17 Z" fill="#17171d" stroke="#0c0c10" strokeWidth="3" />
              <path d="M96 80 q4 -5 8 0" stroke="#0c0c10" strokeWidth="5" fill="none" />
              <path d="M42 80 l-13 -5 M158 80 l13 -5" stroke="#0c0c10" strokeWidth="5" fill="none" />
              <path d="M50 82 l16 0 M112 82 l16 0" stroke="#fff" strokeWidth="3.4" opacity="0.5" fill="none" />
              <path d="M54 92 l8 0 M116 92 l8 0" stroke="#fff" strokeWidth="2.6" opacity="0.3" fill="none" />
            </g>
          )}
          {gesicht === 'schnurrbart' && (
            <g strokeLinejoin="round" strokeLinecap="round">
              <path d="M100 126 C93 116 76 116 66 127 C61 133 67 137 73 134 C83 129 92 130 100 136 C108 130 117 129 127 134 C133 137 139 133 134 127 C124 116 107 116 100 126 Z" fill="#4a2b14" stroke="#33200f" strokeWidth="2" />
              <path d="M80 122 C88 120 94 123 98 128 M120 122 C112 120 106 123 102 128" stroke="#9a6a3c" strokeWidth="2.6" fill="none" opacity="0.7" />
            </g>
          )}

          {/* Kopfschmuck (gekauft) */}
          {kopf === 'muetze' && (
            <g transform="translate(0 -6)" strokeLinejoin="round" strokeLinecap="round">
              <path d="M60 58 C56 26 74 10 100 10 C126 10 144 26 140 58 Z" fill="#3f7df0" />
              <path d="M118 12 C134 20 143 36 140 58 L124 58 C128 40 124 24 108 11 Z" fill="#2c63cf" opacity="0.55" />
              <path d="M76 54 C74 36 80 22 90 14 M92 56 C91 38 93 24 97 12 M108 56 C109 38 107 24 103 12 M124 54 C126 36 120 22 110 14" stroke="#2c63cf" strokeWidth="2.4" fill="none" opacity="0.5" />
              <path d="M54 52 C72 61 128 61 146 52 L148 68 C128 78 72 78 52 68 Z" fill="#1f4fbf" />
              <path d="M54 52 C72 61 128 61 146 52" stroke="#7aa8ff" strokeWidth="2.6" fill="none" opacity="0.8" />
              <path d="M58 64 C76 72 124 72 142 64" stroke="#163b94" strokeWidth="2.4" fill="none" opacity="0.6" />
              <circle cx="100" cy="9" r="10.5" fill="#fff" />
              <circle cx="95.500" cy="5.500" r="4" fill="#eef2ff" />
              <path d="M91 12 C94 17 106 17 109 12" stroke="#dfe5fb" strokeWidth="2" fill="none" />
            </g>
          )}
          {kopf === 'kappe' && (
            <g transform="translate(0 -5)" strokeLinejoin="round" strokeLinecap="round">
              <path d="M60 58 C58 28 76 14 100 14 C124 14 142 28 140 58 Z" fill="#ef4444" />
              <path d="M112 16 C132 24 142 38 140 58 L124 58 C127 40 122 26 108 15 Z" fill="#c62828" opacity="0.5" />
              <path d="M100 14 L100 58 M100 14 C88 22 82 40 83 58 M100 14 C112 22 118 40 117 58" stroke="#c62828" strokeWidth="2.2" fill="none" opacity="0.6" />
              <circle cx="100" cy="14" r="5" fill="#c62828" />
              <path d="M58 54 C76 62 124 62 142 54 L143 63 C124 71 76 71 57 63 Z" fill="#b71c1c" />
              <path d="M64 58 C80 66 120 66 136 58 C142 62 140 69 132 71 C116 78 84 78 68 71 C60 69 58 62 64 58 Z" fill="#9f1717" />
              <path d="M72 66 C88 72 112 72 128 66" stroke="#ff8d8d" strokeWidth="2.4" fill="none" opacity="0.6" />
              <path d="M74 28 C80 22 88 19 96 18" stroke="#fff" strokeWidth="3.4" fill="none" opacity="0.4" />
            </g>
          )}
          {kopf === 'zylinder' && (
            <g transform="rotate(-6 100 48) translate(0 -4)" strokeLinejoin="round">
              <ellipse cx="100" cy="51" rx="52" ry="9.500" fill="#14141a" />
              <path d="M72 48 L74 8 C74 3 80 1 86 1 H114 C120 1 126 3 126 8 L128 48 C118 54 82 54 72 48 Z" fill="#2c2c35" />
              <path d="M73 34 C84 40 116 40 127 34 L128 46 C118 53 82 53 72 46 Z" fill="#e5484d" />
              <path d="M73 34 C84 40 116 40 127 34" stroke="#ff8f93" strokeWidth="2" fill="none" opacity="0.7" />
              <path d="M81 8 L80 30" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
              <ellipse cx="100" cy="47" rx="52" ry="8.500" fill="#1d1d24" />
              <path d="M52 47 C72 54 128 54 148 47" stroke="#3a3a46" strokeWidth="2" fill="none" />
            </g>
          )}
          {kopf === 'krone' && (
            <g transform="translate(0 -2)" strokeLinejoin="round" strokeLinecap="round">
              <path d="M62 56 L64 16 L84 38 L100 8 L116 38 L136 16 L138 56 Z" fill="#f6b91a" stroke="#c98a00" strokeWidth="3.600" />
              <path d="M62 47 C84 54 116 54 138 47 L138 57 C116 63 84 63 62 57 Z" fill="#e39a00" stroke="#c98a00" strokeWidth="2" />
              <path d="M70 22 L72 42 M96 18 L92 34" stroke="#fff" strokeWidth="3.200" opacity="0.55" />
              <circle cx="100" cy="35" r="5.500" fill="#e5484d" stroke="#fff" strokeWidth="1.600" />
              <circle cx="82" cy="51" r="3.600" fill="#3b82f6" stroke="#fff" strokeWidth="1.400" />
              <circle cx="118" cy="51" r="3.600" fill="#3b82f6" stroke="#fff" strokeWidth="1.400" />
              <circle cx="64" cy="14" r="4.200" fill="#fff6c0" stroke="#c98a00" strokeWidth="2" />
              <circle cx="100" cy="6" r="4.200" fill="#fff6c0" stroke="#c98a00" strokeWidth="2" />
              <circle cx="136" cy="14" r="4.200" fill="#fff6c0" stroke="#c98a00" strokeWidth="2" />
            </g>
          )}
        </g>

        {look.armFront && arms}
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
  // Bogenaugen (froh, zwinkernd, schlafend) sind nur die Linie: Weiß und Pupille blenden aus, damit keine Reste unter dem Bogen stehen
  set('scale' + side, 'opacity', String(Math.round((1 - Math.min(1, p.arcOn * 1.6)) * 100) / 100))
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
