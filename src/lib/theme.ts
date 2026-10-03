import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Setzt die Klasse "dark" auf <html> je nach Einstellung (System / Hell / Dunkel) und folgt dem System live. */
export function useApplyTheme() {
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e1b28' : '#ffffff')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
