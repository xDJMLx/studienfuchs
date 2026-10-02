import { useCallback, useSyncExternalStore } from 'react'

// "Als App installieren": Der Browser meldet mit einem Ereignis, dass die Seite installierbar ist (Chrome, Edge, Android).
// Das Ereignis kommt früh, deshalb wird es schon beim Laden dieses Moduls aufgefangen (siehe main.tsx).

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = 'installed' | 'prompt' | 'ios' | 'manual'

let deferred: InstallEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

const standalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

export const isIos = () =>
  typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    notify()
  })
}

function snapshot(): InstallState {
  if (installed || standalone()) return 'installed'
  if (deferred) return 'prompt'
  if (isIos()) return 'ios'
  return 'manual'
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useInstall() {
  const state = useSyncExternalStore(subscribe, snapshot, () => 'manual' as InstallState)
  /** Öffnet den Installationsdialog des Browsers; gibt zurück, ob die App installiert wurde. */
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false
    const ev = deferred
    await ev.prompt()
    const { outcome } = await ev.userChoice
    deferred = null
    notify()
    return outcome === 'accepted'
  }, [])
  return { state, install }
}
