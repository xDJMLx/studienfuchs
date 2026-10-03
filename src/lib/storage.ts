const MEMORY_STORAGE = new Map<string, string>()

function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const safeStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem(key: string) {
    const storage = safeLocalStorage()
    if (storage) {
      try {
        return storage.getItem(key) ?? MEMORY_STORAGE.get(key) ?? null
      } catch {
        return MEMORY_STORAGE.get(key) ?? null
      }
    }
    return MEMORY_STORAGE.get(key) ?? null
  },

  setItem(key: string, value: string) {
    const storage = safeLocalStorage()
    if (storage) {
      try {
        storage.setItem(key, value)
        MEMORY_STORAGE.delete(key)
        return
      } catch {
        // Fallback when quota is exceeded or browser storage is unavailable.
      }
    }
    MEMORY_STORAGE.set(key, value)
  },

  removeItem(key: string) {
    const storage = safeLocalStorage()
    if (storage) {
      try {
        storage.removeItem(key)
      } catch {
        // Ignore: key was unavailable or already missing.
      }
    }
    MEMORY_STORAGE.delete(key)
  },
}

/**
 * Speicher für die großen Zustände (Lernstand, Bücher): Schreibt gebündelt statt bei jeder Antwort.
 * Bei jeder Übungsaufgabe ändert sich der Lernstand; ihn jedes Mal vollständig zu serialisieren und zu schreiben
 * kostet auf einem Handy spürbar Zeit. Gelesen wird immer der neueste Stand, und beim Verlassen, Wechseln der App
 * oder Schließen des Tabs wird sofort geschrieben, damit nichts verloren geht.
 */
const pending = new Map<string, string>()
let timer: ReturnType<typeof setTimeout> | undefined

export function flushStorage(): void {
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
  for (const [k, v] of pending) safeStorage.setItem(k, v)
  pending.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushStorage)
  window.addEventListener('beforeunload', flushStorage)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushStorage()
  })
}

export const debouncedStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: (key) => pending.get(key) ?? safeStorage.getItem(key),
  setItem(key, value) {
    pending.set(key, value)
    if (timer === undefined) timer = setTimeout(flushStorage, 500)
  },
  removeItem(key) {
    pending.delete(key)
    safeStorage.removeItem(key)
  },
}
