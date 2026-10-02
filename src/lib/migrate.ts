import { safeStorage } from './storage'

export const STORAGE = {
  state: 'studienfuchs-v1',
  ai: 'studienfuchs-ai',
} as const

const LEGACY: [from: string, to: string][] = [
  ['lernfuchs-v1', STORAGE.state],
  ['lernfuchs-ai', STORAGE.ai],
]

/** Kopiert alte Einträge zu den neuen Schlüsseln (nur wenn der neue noch fehlt) und räumt die alten auf. */
export function migrateLegacyStorage(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = safeStorage): string[] {
  const moved: string[] = []
  for (const [from, to] of LEGACY) {
    try {
      const old = storage.getItem(from)
      if (old === null) continue
      if (storage.getItem(to) === null) {
        storage.setItem(to, old)
        moved.push(to)
      }
      storage.removeItem(from)
    } catch {
      /* Speicher nicht verfügbar: nichts zu tun */
    }
  }
  return moved
}

migrateLegacyStorage(safeStorage)
