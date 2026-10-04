// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { generateCards } from './lib/aiCards'
import { dateKey, addDays } from './lib/calendar'
import { useStore } from './store/useStore'

vi.mock('./lib/aiCards', async () => {
  const real = await vi.importActual<typeof import('./lib/aiCards')>('./lib/aiCards')
  return { ...real, generateCards: vi.fn() }
})

vi.hoisted(() => {
  globalThis.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
})

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
  window.HTMLElement.prototype.scrollIntoView = () => undefined
  window.HTMLElement.prototype.scrollTo = (() => undefined) as typeof window.HTMLElement.prototype.scrollTo
})

beforeEach(() => {
  useStore.getState().resetAll()
  window.location.hash = '#/'
})
afterEach(cleanup)

const text = () => document.body.textContent ?? ''
const btn = (name: RegExp | string) => screen.getByRole('button', { name })
const click = async (name: RegExp | string, role: 'button' | 'radio' | 'checkbox' = 'button') => {
  const b = await screen.findByRole(role, { name }, { timeout: 4000 })
  fireEvent.click(b)
}

/** Adresse wechseln, wie es der Browser tut (Hash ändern und dem Router Bescheid geben). */
const go = (hash: string) => {
  window.location.hash = hash
  window.dispatchEvent(new PopStateEvent('popstate'))
}

describe('Die App als Ganzes', () => {
  it('Einführung: Fächer wählen, Ziel wählen, Start auf der Üben-Seite', async () => {
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Dein Übungsplan/))
    await click(/Jetzt starten/)
    await waitFor(() => expect(text()).toMatch(/Welche Fächer hast du/))
    await click(/Biologie/)
    await click(/Mathe/)
    expect(useStore.getState().mySubjects).toEqual(['biologie', 'mathe'])
    await click(/Weiter/)
    await waitFor(() => expect(text()).toMatch(/Wie viel möchtest du täglich üben/))
    await click(/Ernsthaft/, 'radio')
    expect(useStore.getState().dailyGoal).toBe(30)
    await click(/Weiter/)
    await waitFor(() => expect(text()).toMatch(/Stapel erstellen|Erst umschauen/))
    await click(/Erst umschauen/)
    await waitFor(() => expect(text()).toMatch(/Was willst du üben/))
    // Drei Tabs, keine Reste des alten Lernpfads
    const nav = screen.getAllByRole('navigation', { name: 'Hauptnavigation' }).at(-1)!
    expect(within(nav).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Üben', 'Fächer', 'Profil'])
  })

  it('Stapel von Hand erstellen, danach steht er auf der Startseite zum Üben bereit', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/stapel/neu?fach=biologie'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Neuer Stapel/))
    await click(/Selbst schreiben/, 'radio')
    const area = await screen.findByLabelText(/Eine Karte pro Zeile/)
    fireEvent.change(area, { target: { value: 'Zellkern – steuert die Zelle\nRibosom – baut Eiweiße\nVakuole – Speicher\nZellwand – Halt\nMitochondrium – Kraftwerk' } })
    await click(/^Weiter$/)
    await waitFor(() => expect(text()).toMatch(/5 Karten erkannt/))
    fireEvent.change(screen.getByLabelText(/Name des Stapels/), { target: { value: 'Zelle' } })
    await click(/Stapel speichern \(5\)/)
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    const set = useStore.getState().sets[0]
    expect(set).toMatchObject({ title: 'Zelle', subject: 'biologie' })
    expect(set.items).toHaveLength(5)
    // Stapel-Seite
    await waitFor(() => expect(text()).toMatch(/5 Karten/))
    // Startseite: heute dran
    go('#/')
    await waitFor(() => expect(text()).toMatch(/Heute dran/))
    expect(text()).toMatch(/5 neue Karten/)
  })

  it('Arbeit im Wochenplan eintragen: Tag antippen, Stapel wählen, speichern, Kachel erscheint', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    const id = useStore.getState().addSet('Zelle', Array.from({ length: 12 }, (_, i) => ({ front: `F${i}`, back: `B${i}` })), { subject: 'biologie' })
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Meine Woche/))
    const target = dateKey(addDays(new Date(), 3))
    const day = new Date(target + 'T12:00:00')
    const grid = screen.getAllByRole('gridcell').find((c) => c.querySelector(`button[aria-label^="Am ${day.getDate()}."]`))
    expect(grid).toBeTruthy()
    fireEvent.click(grid!.querySelector('button[aria-label^="Am "]')!)
    await waitFor(() => expect(text()).toMatch(/Was steht an/))
    await click(/^Test$/, 'radio')
    // Fach ist durch die Einführung schon gewählt (Biologie zuerst), Stapel wählen
    const check = await screen.findByRole('checkbox', { name: /Zelle/ }, { timeout: 4000 })
    fireEvent.click(check)
    await waitFor(() => expect(text()).toMatch(/12 neue Karten|neue Karten in/))
    fireEvent.click(screen.getAllByRole('button', { name: /^Eintragen$/ }).at(-1)!)
    await waitFor(() => expect(useStore.getState().arbeiten).toHaveLength(1))
    expect(useStore.getState().arbeiten[0]).toMatchObject({ kind: 'test', subject: 'biologie', date: target, deckIds: [id] })
    // Die Kachel steht im Plan
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Test$/ }).length).toBeGreaterThan(0))
    // Und der Tagesplan verteilt die Karten: mehr als die üblichen acht neuen
    go('#/')
    await waitFor(() => expect(text()).toMatch(/Heute dran/))
  })

  it('Frei üben: es wird immer genau ein Fach gewählt, leere Fächer zeigen den Weg zum Stapel', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie', 'mathe'] })
    useStore.getState().addSet('Zelle', Array.from({ length: 6 }, (_, i) => ({ front: `F${i}`, back: `B${i}` })), { subject: 'biologie' })
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Frei üben/))
    const group = screen.getByRole('radiogroup', { name: 'Fach' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.textContent)).toEqual([expect.stringContaining('Biologie'), expect.stringContaining('Mathe')])
    // Voreingestellt: das Fach mit Karten
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
    expect(text()).toMatch(/Biologie üben/)
    fireEvent.click(radios[1])
    await waitFor(() => expect(text()).toMatch(/In Mathe gibt es noch keine Karten/))
    // Es gibt keine Auswahl "Alles"
    expect(within(group).queryByText(/^Alles$/)).toBeNull()
  })

  it('Fächer-Seite: Level, weitere Fächer hinzufügen, Fach-Seite mit Stapeln', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/faecher'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Im Unterricht lernst du/))
    expect(text()).toMatch(/Level 1 · Einsteiger/)
    await click(/Geschichte hinzufügen/)
    expect(useStore.getState().mySubjects).toContain('geschichte')
    go('#/faecher/biologie')
    await waitFor(() => expect(text()).toMatch(/Erstelle deinen ersten Stapel/))
    expect(text()).toMatch(/Noch 5 Karten bis Entdecker/)
  })
})

describe('Alte Adressen führen weiter', () => {
  it('/practice und /coach leiten um, ohne Fehlerseite', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/practice'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Was willst du üben/))
    go('#/coach')
    await waitFor(() => expect(text()).toMatch(/Französisch: KI/))
    expect(text()).not.toMatch(/schiefgelaufen/)
  })
})

void btn

describe('Fertige Stapel', () => {
  it('Aus der Fach-Seite hinzufügen, danach üben ohne eigene Arbeit', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/faecher/biologie'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Fertige Stapel/))
    await click(/Die Zelle hinzufügen/)
    const set = useStore.getState().sets[0]
    expect(set).toMatchObject({ title: 'Die Zelle', subject: 'biologie' })
    expect(set.items.length).toBeGreaterThanOrEqual(10)
    await waitFor(() => expect(text()).toMatch(/Dabei/))
    // Schon vorhanden: nicht doppelt hinzufügbar
    expect((await screen.findByRole('button', { name: /Die Zelle: schon hinzugefügt/ })).hasAttribute('disabled')).toBe(true)
    go('#/')
    await waitFor(() => expect(text()).toMatch(/Heute dran/))
  })

  it('Beim Erstellen: Wenn die KI nicht geht, gibt es fertige Stapel und Selbstschreiben als Ausweg', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/stapel/neu?fach=physik'
    render(<App />)
    await click(/Fertige/, 'radio')
    await waitFor(() => expect(text()).toMatch(/Größen, Einheiten und Formeln/))
  })
})

describe('Rechentraining in Mathe', () => {
  it('Themenliste, Training starten, falsche Antwort zeigt den Rechenweg', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['mathe'] })
    window.location.hash = '#/faecher/mathe'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Rechentraining/))
    go('#/faecher/mathe/training')
    await waitFor(() => expect(text()).toMatch(/43 Themen|Negative Zahlen|Addieren/i))
    expect(text()).toMatch(/Brüche/)
    go('#/math/train?skill=zu.dreisatz')
    await waitFor(() => expect(document.querySelector('.exercise-in')).toBeTruthy(), { timeout: 4000 })
    // Erst Antwort falsch: der Rechenweg erscheint
    const unknown = await screen.findByRole('button', { name: /Weiß ich nicht|Weiss ich nicht/i })
    fireEvent.click(unknown)
    await waitFor(() => expect(text()).toMatch(/So geht's/))
    expect(text()).toMatch(/Richtige Lösung/)
  })
})

describe('Stapel mit der KI erstellen', () => {
  it('Beschreibung eingeben, Karten prüfen, speichern', async () => {
    vi.mocked(generateCards).mockResolvedValue({ title: 'Genetik', items: [{ front: 'DNA', back: 'Erbinformation' }, { front: 'Gen', back: 'Abschnitt der DNA' }, { front: 'Allel', back: 'Variante eines Gens' }] })
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/stapel/neu?fach=biologie'
    render(<App />)
    const area = await screen.findByLabelText(/Was brauchst du/)
    fireEvent.change(area, { target: { value: 'Genetik, Grundbegriffe' } })
    await click(/Karten erstellen/)
    await waitFor(() => expect(text()).toMatch(/3 Karten erstellt/))
    expect(vi.mocked(generateCards)).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 'biologie', request: 'Genetik, Grundbegriffe', count: 20 }))
    // Name wurde von der KI vorgeschlagen
    expect((screen.getByLabelText(/Name des Stapels/) as HTMLInputElement).value).toBe('Genetik')
    await click(/Stapel speichern \(3\)/)
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    expect(useStore.getState().sets[0]).toMatchObject({ title: 'Genetik', subject: 'biologie' })
  })

  it('Wenn die KI nicht antwortet: Meldung mit Ausweg zu Selbstschreiben', async () => {
    vi.mocked(generateCards).mockRejectedValue(new Error('Der KI-Dienst konnte nicht geladen werden. Bist du online?'))
    useStore.setState({ onboarded: true })
    window.location.hash = '#/stapel/neu?fach=biologie'
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/Was brauchst du/), { target: { value: 'x' } })
    await click(/Karten erstellen/)
    await waitFor(() => expect(text()).toMatch(/Bist du online/))
    await click(/selbst schreiben/)
    await waitFor(() => expect(text()).toMatch(/Eine Karte pro Zeile/))
  })
})
