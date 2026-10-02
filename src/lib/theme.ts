import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Setzt die Klasse "dark" auf <html> je nach Einstellung (System / Hell / Dunkel) und folgt dem System live. */
export function useApplyTheme() {
  const theme = useStore((s) => s.theme)
  const accent = useStore((s) => s.accent)
  // Farbe der App: 'orange' ist der Standard und braucht kein Attribut
  useEffect(() => {
    if (accent && accent !== 'orange') document.documentElement.dataset.accent = accent
    else delete document.documentElement.dataset.accent
  }, [accent])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15110e' : '#ffffff')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
