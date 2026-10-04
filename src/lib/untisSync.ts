import { useStore } from '../store/useStore'
import { fetchIcs, importUntis, syncDue, UntisError } from './untis'

/** Standard-Relais (leer = keins). Wird in den Einstellungen überschrieben; Einrichtung siehe relay/README.md. */
export const DEFAULT_UNTIS_RELAY = ''

export interface SyncResult {
  ok: boolean
  message: string
}

let running: Promise<SyncResult> | null = null
let lastTry = 0

/**
 * Gleicht mit WebUntis ab: Link abrufen (oder den Text einer hochgeladenen .ics-Datei nehmen), lesen und übernehmen.
 * Fehler werden gemeldet und gemerkt, die bisherigen Daten bleiben. Läuft nie doppelt.
 */
export function syncUntis(opts: { text?: string; doFetch?: typeof fetch } = {}): Promise<SyncResult> {
  if (running) return running
  running = (async (): Promise<SyncResult> => {
    const st = useStore.getState()
    if (!st.untis) return { ok: false, message: 'Nicht mit WebUntis verbunden.' }
    try {
      const text = opts.text ?? (await fetchIcs(st.untis.url, st.untis.relay || DEFAULT_UNTIS_RELAY || undefined, opts.doFetch))
      const imp = importUntis(text)
      useStore.getState().applyUntis(imp)
      return { ok: true, message: `${imp.lessons.length} Stunden und ${imp.exams.length} ${imp.exams.length === 1 ? 'Arbeit' : 'Arbeiten'} übernommen.` }
    } catch (e) {
      const message = e instanceof UntisError ? e.message : 'Der Abgleich mit WebUntis hat nicht geklappt.'
      useStore.getState().failUntis(message)
      return { ok: false, message }
    }
  })().finally(() => {
    running = null
  })
  return running
}

/** Beim Start und beim Zurückkehren in die App: Ist ein Abgleich fällig, läuft er leise im Hintergrund. */
export function autoSyncUntis(now = new Date()): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  // Nach einem Fehlversuch frühestens nach 15 Minuten erneut, sonst würde jeder Wechsel zur App wieder anfragen
  if (now.getTime() - lastTry < 15 * 60_000) return
  if (syncDue(useStore.getState().untis, now)) {
    lastTry = now.getTime()
    void syncUntis()
  }
}
