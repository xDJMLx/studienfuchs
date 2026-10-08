// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { BackLink } from './BackLink'

afterEach(cleanup)

const Pages = () => (
  <Routes>
    <Route path="/" element={<Link to="/test/neu">Probearbeit</Link>} />
    <Route path="/faecher/biologie" element={<p>Biologie-Seite</p>} />
    <Route path="/test/neu" element={<BackLink to="/faecher/biologie" label="Biologie" />} />
  </Routes>
)

describe('Zurück-Knopf', () => {
  it('geht dorthin zurück, woher man kam (nicht auf eine feste Seite)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Pages />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Probearbeit'))
    // Mit Verlauf heißt er „Zurück“
    fireEvent.click(screen.getByRole('link', { name: /Zurück/ }))
    expect(screen.getByText('Probearbeit')).toBeTruthy()
    expect(screen.queryByText('Biologie-Seite')).toBeNull()
  })

  it('ohne Verlauf (Seite direkt geöffnet) führt er zur angegebenen Seite', () => {
    render(
      <MemoryRouter initialEntries={['/test/neu']}>
        <Pages />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Biologie/ })
    fireEvent.click(link)
    expect(screen.getByText('Biologie-Seite')).toBeTruthy()
  })
})
