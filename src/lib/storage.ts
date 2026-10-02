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
        // Fallback für Browser mit aktivierter Storage-Quota oder fehlendem Zugriff.
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
        // Ignore: der Key war bereits nicht verfügbar.
      }
    }
    MEMORY_STORAGE.delete(key)
  },
}
