import { dayKey } from './streak'

const LAST = 'studienfuchs-last-backup'
const SNOOZE = 'studienfuchs-backup-snooze'
/** Nach so vielen Tagen ohne Sicherung erinnert die Startseite. */
export const REMIND_AFTER_DAYS = 14

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export const lastBackup = (): Date | null => {
  const v = read(LAST)
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}
export const markBackup = () => write(LAST, new Date().toISOString())

export function daysSince(d: Date, now = new Date()): number {
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000)
}

/** Text wie "vor 3 Tagen" oder "noch nie". */
export function lastBackupText(now = new Date()): string {
  const d = lastBackup()
  if (!d) return 'noch nie gesichert'
  const n = daysSince(d, now)
  return n <= 0 ? 'heute gesichert' : n === 1 ? 'gestern gesichert' : `vor ${n} Tagen gesichert`
}

/** Soll die Startseite an die Sicherung erinnern? Nur wenn es etwas zu sichern gibt, lange nichts passiert ist und nicht verschoben wurde. */
export function backupDue(hasProgress: boolean, now = new Date()): boolean {
  if (!hasProgress) return false
  const snooze = read(SNOOZE)
  if (snooze && new Date(snooze).getTime() > now.getTime()) return false
  const last = lastBackup()
  return !last || daysSince(last, now) >= REMIND_AFTER_DAYS
}

export const snoozeBackup = (days = 7) => write(SNOOZE, new Date(Date.now() + days * 86_400_000).toISOString())

/** Sicherung teilen (z. B. per AirDrop oder Nachricht aufs neue Handy). Ohne Teilen-Menü wird die Datei heruntergeladen. */
export async function shareBackup(json: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = `studienfuchs-sicherung-${dayKey()}.json`
  const file = new File([json], name, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Studienfuchs Sicherung' })
      markBackup()
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      /* anderer Fehler: stattdessen herunterladen */
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  markBackup()
  return 'downloaded'
}
