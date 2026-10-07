import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MARGIN = 8

/**
 * Sprechblase des Fuchses. Sie wird direkt in <body> gezeichnet, damit sie nie von umgebenden Kästen
 * (overflow: hidden, z. B. farbige Karten) abgeschnitten wird, und bleibt immer ganz im Bildschirm:
 * Sie steht mittig über dem Fuchs, rückt am Rand nach innen, und nur der Zipfel zeigt weiter auf den Fuchs.
 * Ist oben kein Platz, erscheint sie unter ihm.
 */
export function FoxBubble({ anchor, text }: { anchor: HTMLElement | null; text: string }) {
  const box = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; tail: number; below: boolean } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const el = box.current
      if (!anchor || !el) return
      const a = anchor.getBoundingClientRect()
      const b = el.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const centerX = a.left + a.width / 2
      const left = Math.max(MARGIN, Math.min(vw - MARGIN - b.width, centerX - b.width / 2))
      // knapp über dem Kopf (der obere Rand der Zeichnung ist etwas Luft)
      let top = a.top + a.height * 0.06 - b.height - 6
      let below = false
      if (top < MARGIN) {
        top = a.bottom + 6
        below = true
      }
      const tail = Math.max(14, Math.min(b.width - 14, centerX - left))
      setPos((p) => (p && p.left === left && p.top === top && p.tail === tail && p.below === below ? p : { left, top, tail, below }))
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor, text])

  return createPortal(
    <span
      ref={box}
      aria-hidden
      className="fox-bubble pointer-events-none fixed z-[70] w-max max-w-[min(15rem,calc(100vw-16px))] rounded-2xl border-2 border-line bg-surface px-3 py-1.5 text-center text-[13px] font-extrabold leading-snug text-ink"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? 'visible' : 'hidden', transformOrigin: pos ? `${pos.tail}px ${pos.below ? '0%' : '100%'}` : undefined }}
    >
      {text}
      <span
        aria-hidden
        className={`absolute h-3 w-3 -translate-x-1/2 rotate-45 bg-surface ${pos?.below ? '-top-[7px] border-l-2 border-t-2' : '-bottom-[7px] border-b-2 border-r-2'} border-line`}
        style={{ left: pos?.tail ?? 0 }}
      />
    </span>,
    document.body,
  )
}
