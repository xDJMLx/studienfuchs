import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Outfit } from '../../lib/shop'
import { idleSeconds, mascotBus, trackGaze, type MascotEvent } from '../../lib/mascotBus'
import { Fox, type FoxHandle } from './Fox'
import { resolveLook, type Mood, type PoseName } from './look'

export type { Mood } from './look'

const PHRASES: Partial<Record<PoseName, string[]>> = {
  wave: ['Salut !', 'Hallo!', 'Bonjour !'],
  love: ['Hihi!', 'Du bist super!', 'Merci !'],
  surprised: ['Oh!', 'Huch!', 'Ça va ?'],
  wink: ['Tu peux le faire !', 'Zwinker, zwinker!', 'Allez !'],
  laugh: ['Haha!', 'Das war lustig!', 'Hihihi!'],
  cheer: ['Bravo !', 'Weiter so!', 'Allez !'],
}

const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Wichtigere Reaktionen unterbrechen unwichtigere, nie umgekehrt (z. B. Jubel schlägt Winken). */
const PRIORITY: Record<PoseName, number> = {
  idle: 0, happy: 0, wave: 1, wink: 1, yawn: 1, sleep: 1, think: 2, proud: 2, love: 2, laugh: 2, surprised: 2, determined: 2, sad: 3, cheer: 3, dance: 4,
}

export interface MascotProps {
  mood?: Mood
  size?: number
  className?: string
  /** läuft in Ruhe: atmet, blinzelt, wedelt, schaut dem Zeiger nach (alter Name: blink) */
  blink?: boolean
  alive?: boolean
  /** reagiert auf Richtig/Falsch, Sprache und Erfolge aus der App */
  listen?: boolean
  /** Kopf und Oberkörper (Standard) oder ganzer Fuchs */
  pose?: 'bust' | 'full'
  label?: string
  outfit?: Outfit
  /** Begrüßung: winkt kurz nach dem Erscheinen und sagt diesen Satz */
  greet?: string
  /** Seite, an der die Sprechblase ansetzt (Standard: mittig über dem Fuchs) */
  bubbleSide?: 'center' | 'left' | 'right'
}

/** Fenni, der Fuchs: lebendiges Maskottchen mit Posen, Blick zum Zeiger, Tippen und Reaktionen. */
export function Mascot({ mood = 'happy', size = 120, className = '', blink = false, alive: aliveProp, listen = false, pose = 'bust', label, outfit, greet, bubbleSide = 'center' }: MascotProps) {
  const alive = (aliveProp ?? blink) && size >= 56
  const wrap = useRef<HTMLDivElement>(null)
  const [temp, setTemp] = useState<PoseName | null>(null)
  const tempRef = useRef<{ pose: PoseName; token: number } | null>(null)
  const token = useRef(0)
  const fox = useRef<FoxHandle>(null)
  const [talking, setTalking] = useState(false)
  const lastLevelAt = useRef(0)
  const [bubble, setBubble] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const taps = useRef<number[]>([])
  const mountedAt = useRef(Date.now())

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  /** Körperbewegungen laufen im Gerüst des Fuchses (Federn, Flugbahn), hier wird nur ausgelöst. */
  const fire = useCallback((name: 'hop' | 'boing' | 'shake' | 'dance') => {
    const f = fox.current
    if (!f) return
    if (name === 'hop') f.hop()
    else if (name === 'boing') f.boing()
    else if (name === 'shake') f.shake()
    else f.hop(0.8)
  }, [])

  /** Eine Pose für eine Weile zeigen. Läuft schon etwas Wichtigeres, passiert nichts; sonst gilt immer nur der neueste Auftrag. */
  const react = useCallback(
    (p: PoseName, ms = 1500) => {
      const running = tempRef.current
      if (running && PRIORITY[running.pose] > PRIORITY[p]) return
      const mine = ++token.current
      tempRef.current = { pose: p, token: mine }
      setTemp(p)
      later(() => {
        if (tempRef.current?.token !== mine) return
        tempRef.current = null
        setTemp(null)
      }, ms)
    },
    [later],
  )

  /** Dauerhafte Pose (Schlaf), die nur durch eine Berührung endet. */
  const hold = useCallback((p: PoseName) => {
    tempRef.current = { pose: p, token: ++token.current }
    setTemp(p)
  }, [])

  const say = useCallback(
    (text: string, ms = 1900) => {
      setBubble(text)
      later(() => setBubble((b) => (b === text ? null : b)), ms)
    },
    [later],
  )

  // Blick und Kopfdrehung zum Zeiger hin
  useEffect(() => {
    const el = wrap.current
    if (!alive || !el || reduced()) return
    return trackGaze({
      el,
      gaze: (dx, dy, dist) => {
        const m = Math.min(1, dist / 220)
        const nx = dist ? dx / dist : 0
        const ny = dist ? dy / dist : 0
        fox.current?.setPointer(Math.round(nx * 5 * m * 10) / 10, Math.round(ny * 4.5 * m * 10) / 10, Math.round(nx * 3 * m * 10) / 10)
      },
      wake: () => {
        if (tempRef.current?.pose === 'sleep') {
          tempRef.current = null
          react('surprised', 1400)
        }
      },
    })
  }, [alive, react])

  // kleine Eigenheiten, wenn nichts passiert: umschauen, Schwanz wedeln, zwinkern, gähnen und einschlafen
  useEffect(() => {
    if (!alive || reduced()) return
    let stop = false
    const tick = () => {
      if (stop) return
      const el = wrap.current
      const r = Math.random()
      const calm = mood === 'happy' && !tempRef.current
      if (el) {
        if (calm && idleSeconds() > 45 && Date.now() - mountedAt.current > 45000 && size >= 90) {
          // erst gähnen, dann einschlafen
          react('yawn', 1800)
          later(() => {
            if (!tempRef.current) hold('sleep')
          }, 1900)
        } else if (r < 0.5) {
          fox.current?.wag(1.7)
        } else if (calm && size >= 90 && r < 0.72) {
          react('wink', 1300)
        } else if (calm && size >= 90 && r < 0.84) {
          react('wave', 1700)
        }
      }
      later(tick, 4500 + Math.random() * 5000)
    }
    const first = later(tick, 3000 + Math.random() * 3000)
    return () => {
      stop = true
      clearTimeout(first)
    }
  }, [alive, size, mood, later, react, hold])

  // Meldungen aus der App
  useEffect(() => {
    if (!listen) return
    return mascotBus.on((e: MascotEvent) => {
      if (e === 'correct') {
        react('cheer', 1400)
        fire('hop')
      } else if (e === 'almost') {
        react('surprised', 1200)
        fire('boing')
      } else if (e === 'wrong') {
        react('sad', 1900)
        fire('shake')
      } else if (e === 'cheer') {
        react('cheer', 2200)
        fire('hop')
      } else if (e === 'pass') {
        react('proud', 2400)
        fire('hop')
      } else if (e === 'levelup') {
        react('dance', 2800)
        fire('dance')
      } else if (e === 'fail') {
        react('determined', 2200)
      } else if (e === 'speak:start') {
        setTalking(true)
      } else if (e === 'speak:end') {
        setTalking(false)
      }
    })
  }, [listen, react, fire])

  // Mund beim Sprechen: nach der echten Lautstärke der Aufnahme; fehlt sie (Gerätestimme), im ungefähren Takt
  useEffect(() => {
    if (!listen) return
    return mascotBus.onLevel((level, bright) => {
      lastLevelAt.current = Date.now()
      fox.current?.setTalk(level, bright)
    })
  }, [listen])
  useEffect(() => {
    if (!talking) {
      fox.current?.setTalk(null)
      return
    }
    const id = window.setInterval(() => {
      if (Date.now() - lastLevelAt.current < 250) return
      fox.current?.setTalk(0.25 + Math.random() * 0.6, Math.random())
    }, 110)
    const stop = window.setTimeout(() => setTalking(false), 6000)
    return () => {
      clearInterval(id)
      clearTimeout(stop)
    }
  }, [talking])

  const onTap = () => {
    if (!alive) return
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 2200), now]
    if (tempRef.current?.pose === 'sleep') {
      tempRef.current = null
      react('surprised', 1400)
      fire('boing')
      return
    }
    fire('boing')
    if (taps.current.length >= 4) {
      react('laugh', 2200)
      say('Hihi, das kitzelt!', 2200)
      taps.current = []
      return
    }
    const p = rnd<PoseName>(['wave', 'love', 'surprised', 'wink', 'laugh'])
    react(p, 1700)
    say(rnd(PHRASES[p] ?? ['Salut !']))
    if (p === 'love' || p === 'wave' || p === 'laugh') fire('hop')
  }

  const active: PoseName = temp ?? (mood === 'happy' ? 'idle' : mood)
  const look = useMemo(() => resolveLook(active, false, false), [active])

  // Beim ersten Zeigen einer jubelnden Pose hüpft er einmal
  const didIntro = useRef(false)
  useEffect(() => {
    if (didIntro.current || !alive || mood !== 'cheer' || reduced()) return
    didIntro.current = true
    fire('hop')
  }, [alive, mood, fire])

  // Begrüßung beim Erscheinen
  useEffect(() => {
    if (!greet || !alive || reduced()) return
    const id = window.setTimeout(() => {
      react('wave', 2400)
      say(greet, 3600)
    }, 900)
    return () => clearTimeout(id)
    // nur einmal pro Erscheinen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const full = pose === 'full'
  const style = {
    width: full ? size * (5 / 6) : size,
    height: size,
  } as React.CSSProperties

  return (
    <div
      ref={wrap}
      className={`${/(absolute|fixed)/.test(className) ? '' : 'relative '}inline-block shrink-0 ${alive && !className.includes('pointer-events-none') ? 'cursor-pointer' : ''} ${className}`}
      style={style}
      onClick={onTap}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <Fox ref={fox} look={look} outfit={outfit} pose={pose} alive={alive} />
      {bubble && (
        <span className={`${bubbleSide === 'center' ? 'fox-bubble' : 'fox-bubble-side'} pointer-events-none absolute -top-1 z-20 max-w-[220px] rounded-xl border-2 border-line bg-surface px-3 py-1 text-xs font-extrabold text-ink shadow-[0_3px_0_var(--shade-line)] ${bubbleSide === 'center' ? 'left-1/2 -translate-x-1/2 whitespace-nowrap' : bubbleSide === 'right' ? 'right-0 w-max' : 'left-0 w-max'}`}>
          {bubble}
        </span>
      )}
    </div>
  )
}
