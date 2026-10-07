// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { AiError, ensureAiReady } from '../../lib/ai'
import { useStore } from '../../store/useStore'

const puter = vi.hoisted(() => {
  const state = { signed: false, failures: [] as unknown[] }
  return {
    state,
    api: {
      auth: {
        isSignedIn: () => state.signed,
        signIn: async () => {
          const f = state.failures.shift()
          if (f) throw f
          state.signed = true
        },
      },
      ai: { chat: async () => 'ok' },
    },
  }
})
vi.mock('@heyputer/puter.js', () => ({ puter: puter.api }))
vi.hoisted(() => {
  globalThis.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
})

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
  window.HTMLElement.prototype.scrollIntoView = () => undefined
})
beforeEach(() => {
  puter.state.signed = false
  puter.state.failures = []
  useStore.getState().resetAll()
  useStore.setState({ onboarded: true })
  window.location.hash = '#/'
})
afterEach(cleanup)

const text = () => document.body.textContent ?? ''

describe('Anmeldung zur KI: ein Fenster, das erklärt und hilft', () => {
  it('Erst erklärt die App, dann öffnet der Klick das Puter-Fenster, danach läuft die ursprüngliche Aktion weiter', async () => {
    render(<App />)
    let done = false
    const p = ensureAiReady().then(() => (done = true))
    await waitFor(() => expect(text()).toMatch(/KI einschalten/))
    expect(text()).toMatch(/Kostenlos/)
    expect(done).toBe(false)
    expect(puter.state.signed).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'KI einschalten' }))
    await act(async () => {
      await p
    })
    expect(puter.state.signed).toBe(true)
    expect(done).toBe(true)
  })

  it('Blockiertes Pop-up: verständliche Hilfe, dann klappt der zweite Versuch', async () => {
    puter.state.failures = [{ error: 'popup_blocked' }]
    render(<App />)
    const p = ensureAiReady()
    await screen.findByRole('button', { name: 'KI einschalten' })
    fireEvent.click(screen.getByRole('button', { name: 'KI einschalten' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Pop-ups erlauben/))
    expect(puter.state.signed).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Nochmal versuchen' }))
    await act(async () => {
      await p
    })
    expect(puter.state.signed).toBe(true)
  })

  it('Abbrechen: Die Aktion bekommt einen verständlichen Fehler, die App bleibt benutzbar', async () => {
    render(<App />)
    const p = ensureAiReady()
    const caught = p.catch((e) => e)
    fireEvent.click(await screen.findByRole('button', { name: 'Ohne KI weitermachen' }))
    const e = await caught
    expect(e).toBeInstanceOf(AiError)
    expect(e.kind).toBe('auth')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'KI einschalten' })).toBeNull())
  })

  it('Schon angemeldet: kein Fenster', async () => {
    puter.state.signed = true
    render(<App />)
    await ensureAiReady()
    expect(screen.queryByRole('button', { name: 'KI einschalten' })).toBeNull()
  })
})
