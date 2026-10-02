import { useState } from 'react'
import { backupDue, shareBackup, snoozeBackup } from '../../lib/backup'
import { useStore } from '../../store/useStore'
import { Close, Upload } from './Icons'

/** Erinnert nach zwei Wochen ohne Sicherung daran, den Fortschritt zu sichern (der liegt nur auf diesem Gerät). */
export function BackupBanner() {
  const hasProgress = useStore((s) => s.xp > 0 || Object.keys(s.lessons).length > 0)
  const exportData = useStore((s) => s.exportData)
  const [hidden, setHidden] = useState(false)
  const [due] = useState(() => backupDue(hasProgress))
  if (!due || hidden) return null
  return (
    <div className="card mb-4 flex items-center gap-3 p-3 pr-2">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
        <Upload size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">Fortschritt sichern</p>
        <p className="text-sm text-muted">Er liegt nur auf diesem Handy. Mit einer Sicherung geht nichts verloren.</p>
        <button
          type="button"
          className="press mt-2 rounded-lg bg-brand-strong px-3 py-1.5 text-sm font-semibold text-on-brand"
          onClick={async () => {
            const r = await shareBackup(exportData())
            if (r !== 'cancelled') setHidden(true)
          }}
        >
          Jetzt sichern
        </button>
      </div>
      <button
        type="button"
        aria-label="Später erinnern"
        onClick={() => {
          snoozeBackup(7)
          setHidden(true)
        }}
        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-ink"
      >
        <Close size={18} />
      </button>
    </div>
  )
}
