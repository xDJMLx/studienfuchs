// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IconNotice } from './IconNotice'

const standalone = (on: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('standalone'), addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Hinweis auf das neue Startbildschirm-Symbol', () => {
  it('erscheint nur in der installierten App', () => {
    standalone(false)
    render(<IconNotice />)
    expect(screen.queryByText(/Neues App-Symbol/)).toBeNull()
  })

  it('erscheint einmal und verschwindet beim Ausblenden', () => {
    standalone(true)
    const { unmount } = render(<IconNotice />)
    expect(screen.getByText('Neues App-Symbol')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Hinweis ausblenden'))
    expect(screen.queryByText(/Neues App-Symbol/)).toBeNull()
    unmount()
    render(<IconNotice />)
    expect(screen.queryByText(/Neues App-Symbol/)).toBeNull()
  })
})
