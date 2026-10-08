// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store/useStore'
import { IconNotice } from './IconNotice'

const standalone = (on: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('standalone'), addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  useStore.getState().resetAll()
  useStore.getState().setMascot('tiger')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Hinweis auf das neue Startbildschirm-Symbol', () => {
  it('erscheint nur in der installierten App', () => {
    standalone(false)
    render(<IconNotice />)
    expect(screen.queryByText(/Neues Symbol/)).toBeNull()
  })

  it('erscheint einmal, verschwindet beim Ausblenden und kommt bei neuem Tier wieder', () => {
    standalone(true)
    const { unmount } = render(<IconNotice />)
    expect(screen.getByText('Neues Symbol für Rocco')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Hinweis ausblenden'))
    expect(screen.queryByText(/Neues Symbol/)).toBeNull()
    unmount()
    render(<IconNotice />)
    expect(screen.queryByText(/Neues Symbol/)).toBeNull()
    cleanup()
    useStore.getState().setMascot('panda')
    render(<IconNotice />)
    expect(screen.getByText('Neues Symbol für Momo')).toBeTruthy()
  })
})
