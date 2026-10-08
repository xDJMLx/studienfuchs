import { cloudSave, cloudStatus } from './cloudSync'

// Automatische Sicherung ins Puter-Gastkonto: nur wenn der Nutzer die Sicherung eingeschaltet hat, höchstens alle 6 Stunden,
// nur hoch (nie automatisch herunterladen) und nur bei Gastkonten (die gelten für diesen einen Browser, es kann also nichts von einem anderen Gerät überschrieben werden).
const KEY = 'studienfuchs-cloud-auto'
const EVERY_MS = 6 * 3_600_000

interface AutoState {
  on: boolean
  last: number
}

const read = (): AutoState => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<AutoState> | null
    return { on: v?.on === true, last: typeof v?.last === 'number' ? v.last : 0 }
  } catch {
    return { on: false, last: 0 }
  }
}
const write = (s: AutoState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export const autoCloudOn = (): boolean => read().on
export const enableAutoCloud = (now = Date.now()): void => write({ on: true, last: now })
export const disableAutoCloud = (): void => write({ on: false, last: 0 })

let running = false

/** Sichert leise, wenn es fällig ist. Fehler werden verschluckt (beim nächsten Start klappt es vielleicht). */
export async function autoCloudSave(exportData: () => string, now = Date.now()): Promise<boolean> {
  const st = read()
  if (!st.on || running || now - st.last < EVERY_MS) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  running = true
  try {
    const status = await cloudStatus()
    if (!status.signedIn || !status.guest) return false
    await cloudSave(exportData())
    write({ on: true, last: now })
    return true
  } catch {
    return false
  } finally {
    running = false
  }
}
