/**
 * Debounce: verzögert eine Funktion, um häufige Aufrufe zu batchen.
 * Nützlich für Input-Validierung, KI-Anfragen, Speicherung.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttle: Funktion höchstens einmal pro Zeitraum ausführen.
 * Für Scroll-, Resize- und Mouse-Move-Events.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return function throttled(...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastCall >= interval) {
      lastCall = now
      fn(...args)
    }
  }
}

/**
 * Memoize: Cache für reine Funktionen mit simplem Argument-Matching.
 */
export function memoize<T extends (...args: any[]) => any>(fn: T, maxSize = 50): T {
  const cache = new Map<string, any>()

  return function memoized(...args: Parameters<T>) {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)

    const result = fn(...args)
    cache.set(key, result)

    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    return result
  } as T
}
