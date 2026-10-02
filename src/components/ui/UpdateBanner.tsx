import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { applyUpdate, useJustUpdated, useUpdateAvailable } from '../../lib/updates'
import { Check, Sparkle } from './Icons'

/** Erscheint, sobald es eine neue Version gibt: ein Tipp lädt sie, ohne dass Lernfortschritt verloren geht. */
export function UpdateBanner() {
  const available = useUpdateAvailable()
  const justUpdated = useJustUpdated()
  const [busy, setBusy] = useState(false)
  const [showDone, setShowDone] = useState(justUpdated)
  // Der Hinweis "aktualisiert" verschwindet nach ein paar Sekunden von selbst
  useEffect(() => {
    if (!showDone) return
    const t = window.setTimeout(() => setShowDone(false), 6500)
    return () => window.clearTimeout(t)
  }, [showDone])
  return (
    <AnimatePresence>
      {showDone && !available && (
        <motion.div
          key="done"
          role="status"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={() => setShowDone(false)}
          className="glass fixed inset-x-3 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl p-3 pl-4"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.6rem)' }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-good-dark">
            <Check size={18} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">Die App wurde aktualisiert. Du hast die neueste Version.</span>
        </motion.div>
      )}
      {available && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="glass fixed inset-x-3 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl p-3 pl-4"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.6rem)' }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-brand-dark">
            <Sparkle size={18} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">Neue Version verfügbar</span>
          <button
            className="btn btn-primary press !px-4 !py-2 !text-sm"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void applyUpdate()
            }}
          >
            {busy ? 'Lädt …' : 'Aktualisieren'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
