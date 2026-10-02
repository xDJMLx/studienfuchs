import { useEffect, useState } from 'react'

/** Kennung der Version, die gerade läuft (im Dev-Server "dev"). */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'

async function serverBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as { id?: unknown }
    return typeof json.id === 'string' ? json.id : null
  } catch {
    return null // offline oder Server nicht erreichbar: kein Update melden
  }
}

/** Fragt den Server, ob es eine neuere Version gibt, und stößt die Prüfung des Service Workers an. */
export async function checkForUpdate(): Promise<boolean> {
  if (import.meta.env.DEV) return false
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    void reg?.update().catch(() => undefined)
  } catch {
    /* kein Service Worker: egal */
  }
  const id = await serverBuildId()
  return !!id && id !== BUILD_ID
}

/** Räumt die Zwischenspeicher weg und lädt die Seite neu, am Browser-Cache vorbei. Der Lernfortschritt bleibt erhalten. */
export async function applyUpdate(): Promise<void> {
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    /* Cache-Speicher nicht verfügbar */
  }
  const url = new URL(location.href)
  url.searchParams.set('v', Date.now().toString(36))
  location.replace(url.toString())
}

/** Prüft beim Start, beim Zurückkehren in die App (wichtig auf dem Handy, dort läuft sie im Hintergrund weiter) und alle 10 Minuten. */
export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (import.meta.env.DEV) return
    let alive = true
    const run = () => void checkForUpdate().then((u) => alive && u && setAvailable(true))
    const onVisible = () => document.visibilityState === 'visible' && run()
    run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', run)
    const timer = window.setInterval(run, 10 * 60 * 1000)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', run)
      window.clearInterval(timer)
    }
  }, [])
  return available
}
