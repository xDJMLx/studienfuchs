import { safeStorage } from './storage'

export const STORAGE = {
  state: 'studienfuchs-v1',
  ai: 'studienfuchs-ai',
} as const

const LEGACY: [from: string, to: string][] = [
  ['lernfuchs-v1', STORAGE.state],
  ['lernfuchs-ai', STORAGE.ai],
]

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
      // Storage unavailable: do nothing and keep app usable.
    }
  }
  return moved
}

if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
  try {
    migrateLegacyStorage(globalThis.localStorage)
  } catch {
    migrateLegacyStorage(safeStorage)
  }
}
