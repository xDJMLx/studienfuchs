import { describe, expect, it, vi } from 'vitest'
import { cloudLoad, cloudSave, cloudSignIn, cloudStatus, type CloudLoader } from './cloudSync'

const fake = () => {
  const files = new Map<string, string>()
  let signed = false
  let temp = false
  const p = {
    auth: {
      isSignedIn: () => signed,
      signIn: vi.fn(async (): Promise<void> => {
        signed = true
        temp = false
      }),
      signOut: vi.fn(() => {
        signed = false
      }),
      getUser: async () => ({ username: 'maxi', is_temp: temp }),
    },
    fs: {
      write: vi.fn(async (path: string, data: string) => void files.set(path, data)),
      read: vi.fn(async (path: string) => {
        if (!files.has(path)) throw { code: 'item_does_not_exist' }
        return new Blob([files.get(path)!])
      }),
      stat: async () => ({ modified: 1_790_000_000 }),
    },
  }
  const load: CloudLoader = async () => p as never
  const setSigned = (s: boolean, t = false) => {
    signed = s
    temp = t
  }
  return { p, load, files, setSigned }
}

describe('Abgleich über das Puter-Konto', () => {
  it('ohne Anmeldung wird nichts gespeichert oder geladen', async () => {
    const { load, p } = fake()
    await expect(cloudSave('{}', load)).rejects.toMatchObject({ code: 'auth' })
    await expect(cloudLoad(load)).rejects.toMatchObject({ code: 'auth' })
    expect(p.fs.write).not.toHaveBeenCalled()
  })

  it('Speichern und Laden einer Sicherung', async () => {
    const { load, setSigned } = fake()
    setSigned(true)
    const json = JSON.stringify({ app: 'studienfuchs', version: 1, data: { xp: 5 } })
    await cloudSave(json, load)
    const r = await cloudLoad(load)
    expect(r.json).toBe(json)
    expect(r.modified?.getFullYear()).toBeGreaterThan(2020)
  })

  it('fehlende Sicherung und fremde Dateien werden erkannt', async () => {
    const { load, setSigned, files } = fake()
    setSigned(true)
    await expect(cloudLoad(load)).rejects.toMatchObject({ code: 'none' })
    files.set('studienfuchs-sicherung.json', '{"hallo":1}')
    await expect(cloudLoad(load)).rejects.toMatchObject({ code: 'format' })
    files.set('studienfuchs-sicherung.json', 'kein json')
    await expect(cloudLoad(load)).rejects.toMatchObject({ code: 'format' })
  })

  it('Gastkonto wird getrennt, bevor man sich richtig anmeldet', async () => {
    const { load, setSigned, p } = fake()
    setSigned(true, true)
    expect(await cloudStatus(load)).toMatchObject({ signedIn: true, guest: true })
    const st = await cloudSignIn(load)
    expect(p.auth.signOut).toHaveBeenCalled()
    expect(p.auth.signIn).toHaveBeenCalledWith()
    expect(st).toMatchObject({ signedIn: true, guest: false, username: 'maxi' })
  })

  it('abgebrochene Anmeldung ergibt eine verständliche Meldung', async () => {
    const { load, p } = fake()
    p.auth.signIn.mockRejectedValueOnce({ error: 'auth_window_closed' })
    await expect(cloudSignIn(load)).rejects.toThrow(/Anmeldefenster/)
  })
})
