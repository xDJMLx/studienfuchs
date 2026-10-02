import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { applyUpdate, useUpdateAvailable } from '../../lib/updates'
import { Sparkle } from './Icons'

/** Erscheint, sobald es eine neue Version gibt: ein Tipp lädt sie, ohne dass Lernfortschritt verloren geht. */
export function UpdateBanner() {
  const available = useUpdateAvailable()
  const [busy, setBusy] = useState(false)
  return (
    <AnimatePresence>
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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
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
