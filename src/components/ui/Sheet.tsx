import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { Close } from './Icons'
import { EASE } from './motion'

/**
 * Overlay: auf dem Handy ein Sheet von unten, am Desktop ein zentriertes Fenster. Schließt mit Esc oder Klick auf den Hintergrund.
 * Auf dem Handy lässt sich das Sheet von überall nach unten wegziehen (wie bei iOS), solange der Inhalt oben steht.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  wide?: boolean
}) {
  const reduce = useReducedMotion()
  const desktop = useMediaQuery('(min-width: 640px)')
  const y = useMotionValue(0)
  const panel = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  // Nur schließen, wenn Drücken UND Loslassen auf dem Hintergrund passieren (nicht beim Markieren von Text im Fenster)
  const downOnBackdrop = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Ziehen per Touch: bewusst mit eigenen Ereignissen, weil das Fenster selbst scrollt und der Finger überall starten darf
  useEffect(() => {
    if (!open || desktop || reduce) return
    const el = panel.current
    const bd = backdrop.current
    if (!el || !bd) return
    let startY = 0
    let startX = 0
    let lastY = 0
    let lastT = 0
    let speed = 0
    let dragging = false
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      startY = lastY = t.clientY
      startX = t.clientX
      lastT = e.timeStamp
      speed = 0
      dragging = false
    }
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (el.scrollTop > 0) {
        // Inhalt ist nicht oben: normal scrollen, Ziehen erst ab hier zählen
        startY = t.clientY
        return
      }
      const dy = t.clientY - startY
      if (!dragging) {
        if (dy > 8 && dy > Math.abs(t.clientX - startX)) dragging = true
        else return
      }
      e.preventDefault()
      const dt = e.timeStamp - lastT
      if (dt > 0) speed = (t.clientY - lastY) / dt
      lastY = t.clientY
      lastT = e.timeStamp
      y.set(Math.max(0, dy))
    }
    const onEnd = () => {
      if (!dragging) return
      dragging = false
      if (y.get() > 90 || speed > 0.55) onCloseRef.current()
      else animate(y, 0, { type: 'spring', stiffness: 420, damping: 36 })
    }
    // Der abgedunkelte Hintergrund soll die Seite dahinter nicht mitscrollen
    const onBackdropMove = (e: TouchEvent) => {
      if (e.target === bd) e.preventDefault()
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    bd.addEventListener('touchmove', onBackdropMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      bd.removeEventListener('touchmove', onBackdropMove)
    }
  }, [open, desktop, reduce, y])

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : desktop
      ? {
          initial: { opacity: 0, scale: 0.96, y: 14 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.14 } },
        }
      : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%', transition: { duration: 0.22, ease: EASE } } }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={backdrop}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          style={{ WebkitBackdropFilter: 'blur(3px)', backdropFilter: 'blur(3px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            downOnBackdrop.current = e.target === e.currentTarget
          }}
          onClick={(e) => {
            if (downOnBackdrop.current && e.target === e.currentTarget) onClose()
            downOnBackdrop.current = false
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            ref={panel}
            className={`relative max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-surface px-5 pt-2 shadow-2xl sm:rounded-3xl sm:pt-5 ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`}
            style={{ y, paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.25rem)' }}
            {...panelMotion}
            transition={desktop ? { duration: 0.28, ease: EASE } : { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
          >
            {/* Griff als Hinweis: gezogen werden kann überall am Fenster */}
            <div className="-mx-5 mb-1 flex justify-center py-2.5 sm:hidden" aria-hidden>
              <span className="h-1.5 w-12 rounded-full bg-line" />
            </div>
            {title && (
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Schließen" className="press hidden rounded-lg p-1 text-muted hover:bg-snow hover:text-ink sm:block">
                  <Close size={22} />
                </button>
              </div>
            )}
            {!title && (
              <button type="button" onClick={onClose} aria-label="Schließen" className="press absolute right-4 top-4 hidden rounded-lg p-1 text-muted hover:bg-snow hover:text-ink sm:block">
                <Close size={22} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
