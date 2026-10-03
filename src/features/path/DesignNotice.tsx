import { useState } from 'react'
import { Close, Moon, Sparkle, Sun } from '../../components/ui/Icons'
import { useStore } from '../../store/useStore'

const KEY = 'studienfuchs-design-v3-seen'

const seen = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

/** Einmaliger Hinweis nach dem neuen Design: hell oder dunkel ausprobieren. Verschwindet nach der Wahl oder dem Schließen. */
export function DesignNotice() {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const [hidden, setHidden] = useState(seen)
  if (hidden) return null
  const done = () => {
    setHidden(true)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* Speicher nicht verfügbar */
    }
  }
  const pick = 'chip !min-h-10 flex-1 justify-center'
  return (
    <div className="card relative mb-3 p-4 pr-12">
      <button type="button" aria-label="Hinweis schließen" onClick={done} className="press absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-snow">
        <Close size={18} />
      </button>
      <p className="flex items-center gap-2 text-[16px] font-extrabold">
        <span className="text-violet"><Sparkle size={20} /></span> Neues Design!
      </p>
      <p className="mt-0.5 text-sm text-muted">Probier beide Varianten aus. Du kannst es jederzeit in den Einstellungen ändern.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={`${pick} ${theme === 'light' ? 'chip-on' : ''}`} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}>
          <Sun size={16} /> Hell
        </button>
        <button type="button" className={`${pick} ${theme === 'dark' ? 'chip-on' : ''}`} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>
          <Moon size={16} /> Dunkel
        </button>
      </div>
    </div>
  )
}
