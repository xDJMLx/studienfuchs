import { useEffect } from 'react'
import { skinOf } from '../components/mascot/species'
import { useStore } from '../store/useStore'

/**
 * Hält das App-Symbol (Tab, Startbildschirm-Symbol, Manifest) auf dem gewählten Lerntier und passend zu Hell oder Dunkel.
 * Läuft im Leerlauf nach dem Start und bei jedem Wechsel von Tier oder Farbschema. Im Test passiert nichts.
 */
export function useAppIcon() {
  const mascot = useStore((s) => s.mascot)
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    if (import.meta.env.MODE === 'test' || typeof window === 'undefined' || typeof document === 'undefined') return
    let alive = true
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const run = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      void Promise.all([import('../components/mascot/snapshot'), import('./appIcon')])
        .then(async ([snap, icon]) => {
          const species = skinOf(mascot).id
          const markup = await snap.renderMascotMarkup(species)
          if (alive) await icon.applyAppIcon(species, dark, markup)
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
  }, [mascot, theme])
}
