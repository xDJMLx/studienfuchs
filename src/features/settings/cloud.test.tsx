// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { useStore } from '../../store/useStore'

const cloud = vi.hoisted(() => {
  const state = { signed: false, files: new Map<string, string>() }
  const puter = {
    auth: {
      isSignedIn: () => state.signed,
      signIn: async () => {
        state.signed = true
      },
      signOut: () => {
        state.signed = false
      },
      getUser: async () => ({ username: 'maxi', is_temp: false }),
    },
    fs: {
      write: async (path: string, data: string) => void state.files.set(path, data),
      read: async (path: string) => {
        if (!state.files.has(path)) throw { code: 'item_does_not_exist' }
        return new Blob([state.files.get(path)!])
      },
      stat: async () => ({ modified: 1_790_000_000 }),
    },
  }
  return { state, puter }
})

vi.mock('@heyputer/puter.js', () => ({ puter: cloud.puter }))

vi.hoisted(() => {
  globalThis.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
})

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
  window.HTMLElement.prototype.scrollIntoView = () => undefined
})

beforeEach(() => {
  useStore.getState().resetAll()
  cloud.state.signed = false
  cloud.state.files.clear()
})
afterEach(cleanup)

describe('Einstellungen: Abgleich über das Puter-Konto', () => {
  it('anmelden, sichern, auf „anderem Gerät“ (zurückgesetzt) holen und erst nach Rückfrage ersetzen', async () => {
    useStore.setState({ onboarded: true })
    useStore.getState().addSet('Zellen', [{ front: 'Ribosom', back: 'baut Eiweiße' }], { subject: 'biologie' })
    window.location.hash = '#/settings/daten'
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Mit Puter anmelden/ }, { timeout: 4000 }))
    fireEvent.click(await screen.findByRole('button', { name: /In Puter sichern/ }, { timeout: 4000 }))
    await waitFor(() => expect(cloud.state.files.size).toBe(1))
    expect(JSON.parse([...cloud.state.files.values()][0]).app).toBe('studienfuchs')

    // Anderes Gerät: leerer Stand
    useStore.getState().resetAll()
    useStore.setState({ onboarded: true })
    expect(useStore.getState().sets).toHaveLength(0)

    fireEvent.click(await screen.findByRole('button', { name: /Von Puter holen/ }))
    // Erst die Rückfrage, noch nichts ersetzt
    await screen.findByText(/Dein Fortschritt auf diesem Gerät wird dadurch ersetzt/)
    expect(useStore.getState().sets).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /Ja, ersetzen/ }))
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    expect(useStore.getState().sets[0].title).toBe('Zellen')
  })

  it('Abbrechen lässt den lokalen Stand unverändert', async () => {
    useStore.setState({ onboarded: true })
    cloud.state.signed = true
    cloud.state.files.set('studienfuchs-sicherung.json', JSON.stringify({ app: 'studienfuchs', version: 1, data: { sets: [] } }))
    useStore.getState().addSet('Bleibt', [{ front: 'a', back: 'b' }], { subject: 'biologie' })
    window.location.hash = '#/settings/daten'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Von Puter holen/ }, { timeout: 4000 }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }))
    expect(useStore.getState().sets).toHaveLength(1)
  })
})
