import { useState } from 'react'
import { skinOf } from '../mascot/species'
import { useInstall } from '../../lib/install'
import { useStore } from '../../store/useStore'
import { Close } from './Icons'
import { IconHelp } from './IconHelp'

const KEY = 'studienfuchs-icon-notice'

const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/**
 * Nachricht für alle, die die App schon auf dem Startbildschirm haben: Dort bleibt das alte Symbol, bis man es neu hinzufügt.
 * Erscheint einmal, und wieder, wenn ein anderes Tier gewählt wurde (gemerkt wird das Tier, das man schon gesehen hat).
 */
export function IconNotice() {
  const { state } = useInstall()
  const mascot = useStore((s) => s.mascot)
  const skin = skinOf(mascot)
  const [seen, setSeen] = useState(read)
  const [help, setHelp] = useState(false)
  if (state !== 'installed' || seen === skin.id) return null
  const dismiss = () => {
    setSeen(skin.id)
    try {
      localStorage.setItem(KEY, skin.id)
    } catch {
      /* Speicher nicht verfügbar */
    }
  }
  return (
    <>
      <div className="card mb-3 flex items-center gap-3 py-2 pl-3 pr-1.5">
        <button type="button" onClick={() => setHelp(true)} className="press min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-extrabold">Neues Symbol für {skin.name}</span>
          <span className="block truncate text-[13px] text-muted">Auf dem Startbildschirm ist noch das alte. So holst du es.</span>
        </button>
        <button type="button" aria-label="Hinweis ausblenden" onClick={dismiss} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-ink">
          <Close size={18} />
        </button>
      </div>
      <IconHelp
        open={help}
        onClose={() => {
          setHelp(false)
          dismiss()
        }}
        species={skin.id}
        name={skin.name}
      />
    </>
  )
}
