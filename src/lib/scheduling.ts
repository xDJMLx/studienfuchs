import { useEffect, useRef } from 'react'

/**
 * RequestIdleCallback Polyfill für Browser ohne nativen Support.
 * Führt Callback aus, wenn der Browser "frei" ist (nach Benutzer-Interaktion).
 */
const requestIdleCallback =
  typeof globalThis !== 'undefined' && 'requestIdleCallback' in globalThis
    ? globalThis.requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(cb as any, 1)

const cancelIdleCallback =
  typeof globalThis !== 'undefined' && 'cancelIdleCallback' in globalThis
    ? globalThis.cancelIdleCallback
    : clearTimeout

/**
 * Hook: Führt CPU-intensive Arbeit aus, wenn der Browser frei ist.
 * Nutzt für Daten-Verarbeitung, Indizierung, etc.
 */
export function useIdleCallback(callback: () => void, deps: any[] = []) {
  const idRef = useRef<ReturnType<typeof requestIdleCallback> | null>(null)

  useEffect(() => {
    idRef.current = requestIdleCallback(() => callback())
    return () => {
      if (idRef.current !== null) {
        cancelIdleCallback(idRef.current)
      }
    }
  }, deps)
}

/**
 * Hook: Lazy-Load Komponenten oder Daten beim Scrollen ins Sichtfeld.
 */
export function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  callback: (isVisible: boolean) => void,
  options = { threshold: 0.1 },
) {
  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(([entry]) => {
      callback(entry.isIntersecting)
    }, options)

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, callback, options])
}
