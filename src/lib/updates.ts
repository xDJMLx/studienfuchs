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

/** Prüft beim Start, beim Zurückkehren in die App (auf dem Handy läuft sie im Hintergrund weiter) und regelmäßig. */
export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (import.meta.env.DEV) return
    let alive = true
    const timers: number[] = []
    const run = () => void checkForUpdate().then((u) => alive && u && setAvailable(true))
    // Direkt nach dem Zurückkehren ist das Netz auf dem Handy oft noch nicht bereit: mehrmals nachfragen
    const onResume = () => {
      timers.forEach((t) => window.clearTimeout(t))
      timers.length = 0
      run()
      for (const ms of [1500, 5000, 12000]) timers.push(window.setTimeout(run, ms))
    }
    const onVisible = () => document.visibilityState === 'visible' && onResume()
    onResume()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onResume)
    window.addEventListener('pageshow', onResume)
    window.addEventListener('online', onResume)
    const timer = window.setInterval(run, 2 * 60 * 1000)
    return () => {
      alive = false
      timers.forEach((t) => window.clearTimeout(t))
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onResume)
      window.removeEventListener('pageshow', onResume)
      window.removeEventListener('online', onResume)
      window.clearInterval(timer)
    }
  }, [])
  return available
}

const SEEN_KEY = 'studienfuchs-seen-build'

/** Wahr, wenn diese Version zum ersten Mal läuft (nach einem Update); beim allerersten Start nie. */
export function useJustUpdated(): boolean {
  const [updated] = useState(() => {
    if (import.meta.env.DEV) return false
    try {
      const prev = localStorage.getItem(SEEN_KEY)
      localStorage.setItem(SEEN_KEY, BUILD_ID)
      return !!prev && prev !== BUILD_ID
    } catch {
      return false
    }
  })
  return updated
}
