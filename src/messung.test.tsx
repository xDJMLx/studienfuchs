// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { generateCards } from './lib/aiCards'
import { addDays, dateKey } from './lib/calendar'
import { useStore } from './store/useStore'

/**
 * Messung: Wie viele Tippen (und Eingaben) braucht man für die vier häufigsten Aufgaben, bei denen man etwas einträgt oder anlegt?
 * Jeder Klick und jede Eingabe zählt als 1. Dieselben Aufgaben wurden mit der Fassung vor der Überarbeitung (Commit 93a233f) gemessen:
 *   1. Einrichtung bis in die erste Lernrunde: vorher 11 (Mindestweg) bzw. 18 (mit Einführung, Tier, Klasse und Lernzeit), jetzt 5 bzw. 7
 *   2. Hausaufgabe „Gedicht lernen, Deutsch, bis übermorgen“ eintragen: vorher 5, jetzt 2
 *   3. Neue Karteikarten zu einem Thema anlegen und gleich üben (von „Üben“ aus): vorher 5, jetzt 3
 *   4. Arbeit „Bio-Test am Datum“ im Kalender eintragen: vorher 5, jetzt 2
 * Die Zahlen stehen mit Rechnung in docs/MESSUNG.md. Dieser Test hält sie fest, damit sie nicht wieder schlechter werden.
 */
vi.mock('./lib/aiCards', async () => {
  const real = await vi.importActual<typeof import('./lib/aiCards')>('./lib/aiCards')
  return { ...real, generateCards: vi.fn() }
})
vi.hoisted(() => {
  globalThis.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
})

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
  const anim = (window as unknown as { Animation?: { prototype: { cancel: () => void; finished?: Promise<unknown> } } }).Animation?.prototype
  if (anim) {
    const cancel = anim.cancel
    anim.cancel = function (this: { finished?: Promise<unknown> }) {
      this.finished?.catch(() => undefined)
      return cancel.call(this)
    }
  }
  window.HTMLElement.prototype.scrollIntoView = () => undefined
  window.HTMLElement.prototype.scrollTo = (() => undefined) as typeof window.HTMLElement.prototype.scrollTo
})
beforeEach(() => {
  useStore.getState().resetAll()
  window.location.hash = '#/'
  vi.mocked(generateCards).mockResolvedValue({ title: 'Zellorganellen', items: Array.from({ length: 12 }, (_, i) => ({ front: `Organell ${i}`, back: `Aufgabe ${i}` })) })
})
afterEach(cleanup)

const text = () => document.body.textContent ?? ''
let taps = 0
const tap = async (name: RegExp | string, role: 'button' | 'radio' | 'checkbox' | 'link' = 'button') => {
  taps++
  fireEvent.click(await screen.findByRole(role, { name }, { timeout: 4000 }))
}
const enter = async (label: string, value: string) => {
  taps++
  fireEvent.change(await screen.findByLabelText(label), { target: { value } })
}
beforeEach(() => {
  taps = 0
})

describe('Messung: Tippen bis zum Ziel', () => {
  it('1a. Einrichtung, Mindestweg: Start, ein Fach, Weiter, Thema, erste Runde', async () => {
    render(<App />)
    await tap(/Jetzt starten/)
    await tap(/Mathe/)
    await tap(/^Weiter$/)
    await tap(/Brüche kürzen/)
    await tap(/Los geht’s, erste Runde/)
    await waitFor(() => expect(text()).toMatch(/Organell \d/), { timeout: 4000 })
    expect(taps).toBe(5)
  })

  it('1b. Einrichtung, wie die meisten sie machen: Klasse, zwei Fächer, Thema', async () => {
    render(<App />)
    await tap(/Jetzt starten/)
    await tap(/^9$/, 'radio')
    await tap(/Biologie/)
    await tap(/Mathe/)
    await tap(/^Weiter$/)
    await tap(/Zellorganellen und ihre Aufgaben/)
    await tap(/Los geht’s, erste Runde/)
    await waitFor(() => expect(text()).toMatch(/Organell \d/), { timeout: 4000 })
    expect(taps).toBe(7)
  })

  it('2. Hausaufgabe mit anderem Fach und Tag: ein Satz und Enter', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['mathe', 'deutsch'] })
    window.location.hash = '#/hausaufgaben'
    render(<App />)
    taps++
    const box = await screen.findByLabelText('Hausaufgabe in einem Satz eintragen')
    fireEvent.change(box, { target: { value: 'Deutsch Gedicht lernen bis übermorgen' } })
    taps++
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(useStore.getState().hausaufgaben).toHaveLength(1))
    expect(useStore.getState().hausaufgaben[0]).toMatchObject({ subject: 'deutsch', text: 'Gedicht lernen', due: dateKey(addDays(new Date(), 2)) })
    expect(taps).toBe(2)
  })

  it('3. Neue Karteikarten zu einem Thema und gleich üben, von „Üben“ aus', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'], grade: 9 })
    useStore.getState().addSet('Schon da', [{ front: 'a', back: 'b' }], { subject: 'biologie' })
    render(<App />)
    await tap(/Neu erstellen/)
    await tap(/Zellorganellen und ihre Aufgaben/)
    await tap(/Los geht’s, erste Runde/)
    await waitFor(() => expect(text()).toMatch(/Organell \d/), { timeout: 4000 })
    expect(useStore.getState().sets).toHaveLength(2)
    expect(taps).toBe(3)
  })

  it('4. Arbeit im Kalender eintragen: ein Satz und Enter', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/kalender'
    render(<App />)
    const day = dateKey(addDays(new Date(), 6))
    const [, m, d] = day.split('-')
    taps++
    const box = await screen.findByLabelText('Arbeit in einem Satz eintragen')
    fireEvent.change(box, { target: { value: `Bio Test Zelle ${Number(d)}.${Number(m)}.` } })
    taps++
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(useStore.getState().arbeiten).toHaveLength(1))
    expect(useStore.getState().arbeiten[0]).toMatchObject({ subject: 'biologie', kind: 'test', title: 'Zelle', date: day })
    expect(taps).toBe(2)
    void enter
  })
})
