import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/**
 * Hält das App-Symbol (Tab, Startbildschirm-Symbol, Manifest) passend zu Hell oder Dunkel; es zeigt immer den Fuchs.
 * Läuft kurz nach dem Start und bei jedem Wechsel des Farbschemas. Im Test passiert nichts.
 */
export function useAppIcon() {
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    if (import.meta.env.MODE === 'test' || typeof window === 'undefined' || typeof document === 'undefined') return
    let alive = true
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const run = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      void Promise.all([import('../components/mascot/snapshot'), import('./appIcon')])
        .then(async ([snap, icon]) => {
          const markup = await snap.renderMascotMarkup('fuchs')
          if (alive) await icon.applyAppIcon(dark, markup)
        })
        .catch(() => undefined)
    }
    const id = window.setTimeout(run, 400)
    mq.addEventListener('change', run)
    return () => {
      alive = false
      clearTimeout(id)
      mq.removeEventListener('change', run)
    }
  }, [theme])
}
