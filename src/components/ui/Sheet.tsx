import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { Close } from './Icons'
import { EASE } from './motion'

/**
 * Overlay: auf dem Handy ein Sheet von unten (lässt sich am Griff nach unten wegziehen),
 * am Desktop ein zentriertes Fenster. Schließt mit Esc oder Klick auf den Hintergrund.
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
  const controls = useDragControls()
  // Nur schließen, wenn Drücken UND Loslassen auf dem Hintergrund passieren (nicht beim Markieren von Text im Fenster)
  const downOnBackdrop = useRef(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[3px] sm:items-center sm:p-4"
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
            className={`safe-bottom relative max-h-[88vh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-surface px-5 pb-5 pt-2 shadow-2xl sm:rounded-3xl sm:pt-5 ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`}
            {...panelMotion}
            transition={desktop ? { duration: 0.28, ease: EASE } : { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
            drag={desktop || reduce ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 520) onClose()
            }}
          >
            {/* Griff: hier lässt sich das Sheet nach unten ziehen */}
            <div
              onPointerDown={(e) => controls.start(e)}
              className="-mx-5 mb-1 flex cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing sm:hidden"
              aria-hidden
            >
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
