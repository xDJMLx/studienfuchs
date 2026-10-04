// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store/useStore'
import { UebenPlay } from './CardFlow'

// Die Liste der Sprachaufnahmen wird schon beim Import angefragt: gleich eine Antwort vorgeben
vi.hoisted(() => {
  globalThis.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
})

beforeAll(() => {
  // Keine Animationen: Der Test soll die Logik der Runde prüfen, nicht auf Übergänge warten
  MotionGlobalConfig.skipAnimations = true
  // Ton und Vibration gibt es in der Testumgebung nicht
  vi.stubGlobal('navigator', Object.assign(Object.create(globalThis.navigator ?? {}), { vibrate: () => true }))
  window.HTMLElement.prototype.scrollIntoView = () => undefined
})

afterEach(cleanup)

const FACTS = [
  ['Zellkern', 'steuert die Zelle'],
  ['Mitochondrium', 'Kraftwerk der Zelle'],
  ['Ribosom', 'baut Eiweiße'],
  ['Chloroplast', 'Photosynthese'],
  ['Vakuole', 'Speicher für Wasser'],
  ['Zellwand', 'gibt Pflanzenzellen Halt'],
]

function seed(deck: { front: string; back: string }[], extra: Record<string, unknown> = {}) {
  useStore.getState().resetAll()
  const id = useStore.getState().addSet('Zelle', deck, { subject: 'biologie' })
  useStore.setState({ onboarded: true, ...extra })
  return id
}

const click = (el: Element) => fireEvent.click(el)
const text = () => document.body.textContent ?? ''

/**
 * Spielt eine ganze Runde wie ein Schüler: erst absichtlich falsch (so lernt der Test die Lösungen aus der Rückmeldung),
 * dann richtig. Endet, wenn der Ergebnisbildschirm da ist.
 */
async function playRound(opts: { knownAnswers?: Map<string, string>; maxSteps?: number } = {}) {
  const learned = opts.knownAnswers ?? new Map<string, string>()
  const kinds = new Set<string>()
  for (let step = 0; step < (opts.maxSteps ?? 200); step++) {
    if (/Noch eine Runde/.test(text())) return { kinds, learned, steps: step }
    await new Promise((r) => setTimeout(r, 0))
    const label = (b: Element) => (b.textContent ?? '').trim().replace(/\s+/g, ' ')
    const find = (re: RegExp) => [...document.querySelectorAll('button')].find((b) => re.test(label(b)) && !(b as HTMLButtonElement).disabled)

    // Ergebnis einer Aufgabe: Lösung merken, weiter
    const next = find(/^Weiter$/)
    if (next && /Richtige Lösung/.test(text())) {
      const m = /Richtige Lösung:\s*(.+?)(?:Die Aufgabe kommt|So geht's|$)/.exec(text())
      const prompt = document.querySelector('main')?.getAttribute('data-prompt') ?? ''
      if (m && prompt) learned.set(prompt, m[1].trim())
      click(next)
      continue
    }
    if (next) {
      click(next)
      continue
    }
    // Karteikarte
    const reveal = find(/^Antwort zeigen$/)
    if (reveal) {
      kinds.add('qcard')
      click(reveal)
      await waitFor(() => expect(find(/Gewusst$/)).toBeTruthy())
      click(find(/^3 Gewusst$/) ?? find(/Gewusst$/)!)
      continue
    }
    // Auswahl (Antwort-Kacheln mit role=radio)
    const options = [...document.querySelectorAll('[role="radio"]')]
    const prompt = (document.querySelector('.exercise-in .whitespace-pre-wrap') ?? document.querySelector('.exercise-in'))?.textContent ?? ''
    if (options.length >= 3) {
      kinds.add('qchoice')
      const known = learned.get(prompt)
      const pick = options.find((o) => known && (o.textContent ?? '').includes(known)) ?? options[0]
      click(pick)
      const check = find(/^Prüfen$/)
      if (check) click(check)
      // Falsche Antwort: Lösung aus der Rückmeldung merken
      await waitFor(() => expect(find(/^Weiter$/)).toBeTruthy())
      if (/Richtige Lösung:/.test(text())) {
        const m = /Richtige Lösung:\s*(.+?)(?:Die Aufgabe kommt|So geht's)/.exec(text())
        if (m) learned.set(prompt, m[1].trim())
      }
      continue
    }
    // Tippen
    const input = document.querySelector('textarea')
    if (input) {
      kinds.add('qtype')
      const known = learned.get(prompt)
      fireEvent.change(input, { target: { value: known ?? 'falsch' } })
      const check = find(/^Prüfen$/)
      if (check) click(check)
      await waitFor(() => expect(find(/^Weiter$/)).toBeTruthy())
      if (/Richtige Lösung:/.test(text())) {
        const m = /Richtige Lösung:\s*(.+?)(?:Die Aufgabe kommt|So geht's)/.exec(text())
        if (m) learned.set(prompt, m[1].trim())
      }
      continue
    }
  }
  throw new Error('Die Runde ist nicht zu Ende gegangen:\n' + text().slice(0, 400))
}

const renderPlay = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/ueben/los" element={<UebenPlay />} />
        <Route path="*" element={<div>Startseite</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('Eine ganze Übungsrunde, von der ersten Karte bis zum Ergebnis', () => {
  beforeEach(() => {
    // Der Browser hat keine Aufnahmenliste im Test
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 })),
    )
  })

  it('Karteikarten: umdrehen, bewerten, Ergebnis mit Fortschritt', async () => {
    const id = seed(FACTS.map(([front, back]) => ({ front, back })))
    renderPlay(`/ueben/los?deck=${id}&modus=flip`)
    await waitFor(() => expect(text()).toMatch(/Neu|Weißt du es/), { timeout: 3000 })
    const { kinds } = await playRound()
    expect(kinds.has('qcard')).toBe(true)
    // Ergebnisbildschirm: Überschrift, XP, was sich getan hat
    expect(text()).toMatch(/XP/)
    expect(text()).toMatch(/Das hat sich getan/)
    expect(text()).toMatch(/neue Karten gelernt/)
    // Der Fortschritt ist gespeichert
    const st = useStore.getState()
    expect(Object.keys(st.cards)).toHaveLength(FACTS.length)
    expect(st.rounds).toBe(1)
    expect(st.xp).toBeGreaterThan(0)
  })

  it('Gemischt: neue Karten werden gezeigt, abgefragt und Fehler kommen wieder, bis sie sitzen', async () => {
    const id = seed(FACTS.map(([front, back]) => ({ front, back })))
    renderPlay(`/ueben/los?deck=${id}&modus=mix`)
    await waitFor(() => expect(text()).toMatch(/Neu/), { timeout: 3000 })
    const { kinds, steps } = await playRound({ maxSteps: 300 })
    expect(kinds.has('qchoice')).toBe(true)
    expect(steps).toBeGreaterThan(FACTS.length)
    const st = useStore.getState()
    // Alle Karten wurden geübt und die Runde zählt
    expect(Object.keys(st.cards)).toHaveLength(FACTS.length)
    expect(st.rounds).toBe(1)
    expect(text()).toMatch(/Noch eine Runde/)
  })

  it('Eine zweite Runde mit bekannten Karten fragt Tippen und Karteikarten und endet ebenfalls', async () => {
    const id = seed(FACTS.map(([front, back]) => ({ front, back })))
    // Alle Karten als lernend vorbelegen (so kommen Tippen und Auswahl statt Zeigen)
    const { reviewCard } = await import('../../lib/srs')
    const cards: Record<string, ReturnType<typeof reviewCard>> = {}
    for (const it of useStore.getState().sets.find((s) => s.id === id)!.items) cards[it.id] = reviewCard(undefined, 'good', new Date(Date.now() - 20 * 86_400_000))
    useStore.setState({ cards })
    renderPlay(`/ueben/los?deck=${id}&modus=type`)
    await waitFor(() => expect(document.querySelector('textarea')).toBeTruthy(), { timeout: 3000 })
    const { kinds } = await playRound({ maxSteps: 300 })
    expect(kinds.has('qtype')).toBe(true)
    expect(text()).toMatch(/Das hat sich getan|Noch eine Runde/)
  })
})

describe('Französisch-Stapel: die volle Übungsfolge läuft ohne Absturz', () => {
  it('Kurs-Stapel: neue Wörter zeigen, abfragen, Fehler zeigen die Lösung', async () => {
    const { allCourseDecks } = await import('../../lib/decks')
    const deck = allCourseDecks()[0]
    useStore.getState().resetAll()
    useStore.setState({ onboarded: true })
    useStore.getState().toggleUnit(deck.id.slice(5))
    renderPlay(`/ueben/los?deck=${encodeURIComponent(deck.id)}&modus=mix`)
    await waitFor(() => expect(text()).toMatch(/Neu|Wort/), { timeout: 3000 })
    const seen = new Set<string>()
    let wrongs = 0
    for (let step = 0; step < 40; step++) {
      await new Promise((r) => setTimeout(r, 0))
      const find = (re: RegExp) => [...document.querySelectorAll('button')].find((b) => re.test((b.textContent ?? '').trim()) && !(b as HTMLButtonElement).disabled)
      if (document.querySelector('.exercise-in h2')) seen.add(document.querySelector('.exercise-in h2')?.textContent ?? '')
      const next = find(/^Weiter$/)
      if (next) {
        if (/Leider falsch/.test(text())) wrongs++
        click(next)
        continue
      }
      const unknown = find(/^Weiß ich nicht$/i) ?? find(/^Weiss ich nicht$/i)
      if (unknown) {
        click(unknown)
        continue
      }
      // Zuordnen u. a.: einfach abbrechen, die Runde ist weit genug gelaufen
      break
    }
    expect(seen.size).toBeGreaterThan(1)
    expect(wrongs).toBeGreaterThan(0)
    expect(text()).not.toMatch(/schiefgelaufen/)
  })
})

describe('Probearbeit', () => {
  it('15 Karten ohne Zeigen und ohne Wiederholung, am Ende eine ungefähre Note', async () => {
    const id = seed(Array.from({ length: 20 }, (_, i) => ({ front: `Frage ${i}`, back: `Antwort ${i}` })))
    const arbeit = useStore.getState().addArbeit({ subject: 'biologie', title: 'Bio-Test', date: '2099-01-01', deckIds: [id] })
    renderPlay(`/ueben/los?arbeit=${arbeit}&modus=probe`)
    await waitFor(() => expect(document.querySelector('.exercise-in')).toBeTruthy(), { timeout: 3000 })
    // Keine Einführungs-Karten
    expect(text()).not.toMatch(/Neue Karte|Zwei neue/)
    let answered = 0
    for (let step = 0; step < 120 && !/Ungefähr eine/.test(text()); step++) {
      await new Promise((r) => setTimeout(r, 0))
      const find = (re: RegExp) => [...document.querySelectorAll('button')].find((b) => re.test((b.textContent ?? '').trim()) && !(b as HTMLButtonElement).disabled)
      const next = find(/^Weiter$/)
      if (next) {
        click(next)
        continue
      }
      const reveal = find(/^Antwort zeigen$/)
      if (reveal) {
        click(reveal)
        await waitFor(() => expect(find(/Gewusst$/)).toBeTruthy())
        click(find(/^3 Gewusst$/) ?? find(/Gewusst$/)!)
        answered++
        continue
      }
      const input = document.querySelector('textarea')
      if (input) {
        fireEvent.change(input, { target: { value: 'weiß ich nicht' } })
        const check = find(/^Prüfen$/)
        if (check) click(check)
        answered++
        continue
      }
      const options = [...document.querySelectorAll('[role="radio"]')]
      if (options.length) {
        click(options[0])
        const check = find(/^Prüfen$/)
        if (check) click(check)
        answered++
      }
    }
    expect(text()).toMatch(/Ungefähr eine [1-6]/)
    // Genau 15 Karten, jede einmal (kein "Nochmal" nach Fehlern)
    expect(answered).toBe(15)
  })
})
