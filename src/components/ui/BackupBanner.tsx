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
  const save = async () => {
    const r = await shareBackup(exportData())
    if (r !== 'cancelled') setHidden(true)
  }
  return (
    <div className="card mb-3 flex items-center gap-3 py-2 pl-3 pr-1.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-soft text-sky-dark">
        <Upload size={20} />
      </span>
      <button type="button" onClick={save} className="press min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-extrabold">Fortschritt sichern</span>
        <span className="block truncate text-[13px] text-muted">Er liegt nur auf diesem Gerät. Tippen zum Sichern.</span>
      </button>
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
