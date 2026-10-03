import { describe, expect, it, vi } from 'vitest'
import { mascotBus, type MascotEvent } from './mascotBus'

describe('Fuchs-Nachrichten', () => {
  it('verteilt Ereignisse an alle, die zuhören, und hört nach dem Abmelden auf', () => {
    const a = vi.fn()
    const b = vi.fn()
    const offA = mascotBus.on(a)
    mascotBus.on(b)
    mascotBus.emit('correct')
    expect(a).toHaveBeenCalledWith('correct')
    expect(b).toHaveBeenCalledWith('correct')
    offA()
    mascotBus.emit('wrong')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('übersteht, dass sich ein Zuhörer beim Ereignis abmeldet', () => {
    const seen: MascotEvent[] = []
    const off = mascotBus.on((e) => {
      seen.push(e)
      off()
    })
    mascotBus.emit('cheer')
    mascotBus.emit('cheer')
    expect(seen).toEqual(['cheer'])
  })
})
