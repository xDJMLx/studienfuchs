import { useState } from 'react'
import { useInstall } from '../../lib/install'
import { Close } from './Icons'
import { IconHelp } from './IconHelp'

const KEY = 'studienfuchs-icon-notice'
const VERSION = 'fuchs-2'

const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/**
 * Nachricht für alle, die die App schon auf dem Startbildschirm haben: Dort bleibt das alte Symbol, bis man es neu hinzufügt.
 * Erscheint einmal (gemerkt wird, dass man es gesehen hat).
 */
export function IconNotice() {
  const { state } = useInstall()
  const [seen, setSeen] = useState(read)
  const [help, setHelp] = useState(false)
  if (state !== 'installed' || seen === VERSION) return null
  const dismiss = () => {
    setSeen(VERSION)
    try {
      localStorage.setItem(KEY, VERSION)
    } catch {
      /* Speicher nicht verfügbar */
    }
  }
  return (
    <>
      <div className="card mb-3 flex items-center gap-3 py-2 pl-3 pr-1.5">
        <button type="button" onClick={() => setHelp(true)} className="press min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-extrabold">Neues App-Symbol</span>
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
      />
    </>
  )
}
