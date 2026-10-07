// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { generateCards } from './lib/aiCards'
import { generateTasks } from './lib/aiTasks'
import { generateTest } from './lib/aiTests'
import { normalizeTest } from './lib/tests'
import { normalizeTasks } from './lib/tasks'
import { dateKey, addDays } from './lib/calendar'
import { useStore } from './store/useStore'

vi.mock('./lib/aiCards', async () => {
  const real = await vi.importActual<typeof import('./lib/aiCards')>('./lib/aiCards')
  return { ...real, generateCards: vi.fn() }
})

vi.mock('./lib/aiTests', async () => {
  const real = await vi.importActual<typeof import('./lib/aiTests')>('./lib/aiTests')
  return { ...real, generateTest: vi.fn() }
})

vi.mock('./lib/aiTasks', async () => {
  const real = await vi.importActual<typeof import('./lib/aiTasks')>('./lib/aiTasks')
  return { ...real, generateTasks: vi.fn() }
})

vi.hoisted(() => {
  globalThis.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
})

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
  // happy-dom lässt das Versprechen einer abgebrochenen Animation scheitern, ohne dass jemand darauf wartet: Das meldete Vitest als Fehler (Exit-Code 1, der Deploy brach ab)
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
  localStorage.removeItem('studienfuchs-kalender-ansicht')
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
    // Einführung: vier Seiten, die zeigen, was man machen kann
    await waitFor(() => expect(text()).toMatch(/Karteikarten in Sekunden/))
    await click(/^Weiter$/)
    await waitFor(() => expect(text()).toMatch(/Üben, wann es sich lohnt/))
    await click(/^Weiter$/)
    await waitFor(() => expect(text()).toMatch(/Dein Plan mit Arbeiten/))
    await click(/^Weiter$/)
    await waitFor(() => expect(text()).toMatch(/Probearbeit mit Note/))
    await click(/^Einrichten$/)
    await waitFor(() => expect(text()).toMatch(/Welche Fächer hast du/))
    await click(/Biologie/)
    await click(/Mathe/)
    expect(useStore.getState().mySubjects).toEqual(['biologie', 'mathe'])
    await click(/Weiter/)
    await waitFor(() => expect(text()).toMatch(/In welcher Klasse bist du/))
    await click(/^9$/, 'radio')
    expect(useStore.getState().grade).toBe(9)
    await click(/Ernsthaft/, 'radio')
    expect(useStore.getState().dailyMinutes).toBe(15)
    await click(/Weiter/)
    // Schulstunden: Beispielzeiten sind vorgefüllt, eine Stunde lässt sich ändern
    await waitFor(() => expect(text()).toMatch(/Wann sind deine Schulstunden/))
    const first = (await screen.findAllByLabelText(/Stunde 1 bis/))[0]
    fireEvent.change(first, { target: { value: '08:40' } })
    fireEvent.blur(first)
    expect(useStore.getState().schoolPeriods[0]).toEqual({ start: '08:00', end: '08:40' })
    expect(useStore.getState().schoolPeriods).toHaveLength(7)
    await click(/Weiter/)
    await waitFor(() => expect(text()).toMatch(/Karteikarten erstellen|Erst umschauen/))
    await click(/Erst umschauen/)
    await waitFor(() => expect(text()).toMatch(/Was willst du üben/))
    // Drei Tabs, keine Reste des alten Lernpfads
    const nav = screen.getAllByRole('navigation', { name: 'Hauptnavigation' }).at(-1)!
    expect(within(nav).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Üben', 'Kalender', 'Profil'])
  })

  it('Karteikarten von Hand erstellen, danach steht er auf der Startseite zum Üben bereit', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/stapel/neu?fach=biologie'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Neu erstellen/))
    await click(/Selbst schreiben/, 'radio')
    const area = await screen.findByLabelText(/Eine Karte pro Zeile/)
    fireEvent.change(area, { target: { value: 'Zellkern – steuert die Zelle\nRibosom – baut Eiweiße\nVakuole – Speicher\nZellwand – Halt\nMitochondrium – Kraftwerk' } })
    await click(/^Weiter$/)
    await waitFor(() => expect(text()).toMatch(/5 Karten erkannt/))
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Zelle' } })
    await click(/Karteikarten speichern \(5\)/)
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    const set = useStore.getState().sets[0]
    expect(set).toMatchObject({ title: 'Zelle', subject: 'biologie' })
    expect(set.items).toHaveLength(5)
    // Seite der Karteikarten
    await waitFor(() => expect(text()).toMatch(/5 Karten/))
    // Startseite: heute dran
    go('#/')
    await waitFor(() => expect(text()).toMatch(/Heute dran/))
    expect(text()).toMatch(/5\s*Karten/)
    expect(text()).toMatch(/5 neu/)
  })

  it('Im Kalender eintragen: Tag wählen, Fach und Art wählen, speichern, Punkt im Kalender und Termin darunter', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    const id = useStore.getState().addSet('Zelle', Array.from({ length: 12 }, (_, i) => ({ front: `F${i}`, back: `B${i}` })), { subject: 'biologie' })
    window.location.hash = '#/kalender'
    render(<App />)
    await click(/^Monat$/, 'radio')
    await waitFor(() => expect(text()).toMatch(/Nichts geplant/))
    const target = dateKey(addDays(new Date(), 3))
    const day = new Date(target + 'T12:00:00')
    // Den Tag im Monatsraster antippen (liegt er im nächsten Monat, erst blättern)
    const find = () => screen.queryByRole('button', { name: new RegExp(`^[A-Za-zäöü]+, ${day.getDate()}\. ${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][day.getMonth()]}`) })
    if (!find()) fireEvent.click(screen.getByRole('button', { name: 'Nächster Monat' }))
    fireEvent.click(find()!)
    // Das runde Plus trägt für den gewählten Tag ein
    fireEvent.click(screen.getByRole('button', { name: 'Arbeit eintragen' }))
    await waitFor(() => expect(text()).toMatch(/In welchem Fach/))
    await click(/^Test$/, 'radio')
    // Ein Satz Karteikarten im Fach ist gleich dabei
    const check = await screen.findByRole('checkbox', { name: /Zelle/ }, { timeout: 4000 })
    expect(check.getAttribute('aria-checked')).toBe('true')
    await waitFor(() => expect(text()).toMatch(/12 neue Karten|neue Karten in/))
    fireEvent.click(screen.getAllByRole('button', { name: /^Eintragen$/ }).at(-1)!)
    await waitFor(() => expect(useStore.getState().arbeiten).toHaveLength(1))
    expect(useStore.getState().arbeiten[0]).toMatchObject({ kind: 'test', subject: 'biologie', date: target, deckIds: [id] })
    // Der Termin steht unter dem Kalender
    await waitFor(() => expect(text()).toMatch(/Biologie-Test/))
    // Und der Tagesplan verteilt die Karten: mehr als die üblichen acht neuen
    go('#/')
    await waitFor(() => expect(text()).toMatch(/Heute dran/))
    expect(text()).toMatch(/Biologie-Test/)
  })

  it('Ein Termin geht auch ohne Karteikarten und ist dann nur im Kalender', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['geschichte'] })
    window.location.hash = '#/kalender?neu=1'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/In welchem Fach/))
    await click(/^Klassenarbeit$/, 'radio')
    await click(/^Morgen$/)
    fireEvent.click(screen.getAllByRole('button', { name: /^Eintragen$/ }).at(-1)!)
    await waitFor(() => expect(useStore.getState().arbeiten).toHaveLength(1))
    expect(useStore.getState().arbeiten[0]).toMatchObject({ subject: 'geschichte', kind: 'klassenarbeit', deckIds: [] })
  })

  it('Der Kalender zeigt standardmäßig den Stundenplan und merkt sich die Ansicht', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/kalender'
    render(<App />)
    await waitFor(() => expect(screen.getByRole('region', { name: 'Stundenplan' })).toBeTruthy())
    await click(/^Monat$/, 'radio')
    await waitFor(() => expect(screen.getByRole('region', { name: /20\d\d$/ })).toBeTruthy())
    expect(localStorage.getItem('studienfuchs-kalender-ansicht')).toBe('monat')
    localStorage.removeItem('studienfuchs-kalender-ansicht')
  })

  it('Stundenplan: Termine mit Uhrzeit stehen als Block, ein Tipp auf eine freie Stelle trägt mit Uhrzeit ein', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    // Ein Wochentag in dieser (oder am Wochenende: der kommenden) Woche
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + ([0, 6].includes(new Date().getDay()) ? 7 : 0))
    const wed = dateKey(addDays(monday, 2))
    useStore.getState().addArbeit({ subject: 'biologie', kind: 'test', title: 'Bio-Test', date: wed, time: '09:00', duration: 45, deckIds: [] })
    window.location.hash = '#/kalender'
    render(<App />)
    const block = await screen.findByRole('button', { name: /Bio-Test, Test, 09:00 Uhr/ })
    expect(block).toBeTruthy()
    // Freie Stelle antippen (mit Maus/Finger, also mit Uhrzeit)
    const day = addDays(monday, 3)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Am Do, ${day.getDate()}\. eintragen`) }), { detail: 1, clientY: 0 })
    await waitFor(() => expect(text()).toMatch(/Uhrzeit \(optional\)/))
    expect((screen.getByLabelText('Uhrzeit') as HTMLInputElement).value).toBe('08:00')
    await click(/^Test$/, 'radio')
    fireEvent.click(screen.getAllByRole('button', { name: /^Eintragen$/ }).at(-1)!)
    await waitFor(() => expect(useStore.getState().arbeiten).toHaveLength(2))
    expect(useStore.getState().arbeiten.find((a) => a.date === dateKey(day))).toMatchObject({ time: '08:00', duration: 45, subject: 'biologie' })
  })

  it('Frei üben: es wird immer genau ein Fach gewählt, leere Fächer zeigen den Weg zum Stapel', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie', 'mathe'] })
    useStore.getState().addSet('Zelle', Array.from({ length: 6 }, (_, i) => ({ front: `F${i}`, back: `B${i}` })), { subject: 'biologie' })
    render(<App />)
    await click(/^Frei üben/)
    await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'Fach' })).toBeTruthy())
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

  it('Fächer ändert man in den Einstellungen, die Fach-Seite zeigt den Stand und die Karteikarten', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/settings/faecher'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Meine Fächer/))
    const geschichte = await screen.findByRole('switch', { name: 'Geschichte' })
    expect(geschichte.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(geschichte)
    expect(useStore.getState().mySubjects).toContain('geschichte')
    fireEvent.click(screen.getByRole('switch', { name: 'Geschichte' }))
    expect(useStore.getState().mySubjects).not.toContain('geschichte')
    go('#/faecher/biologie')
    await waitFor(() => expect(text()).toMatch(/Erstelle deine ersten Karteikarten/))
    expect(text()).toMatch(/Zusammenfassen, erklären, abfragen/)
  })

  it('Es gibt keine Serie mehr: weder in der Kopfzeile noch im Profil', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/profile'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Diese Woche/))
    expect(text()).not.toMatch(/Serie|Flamme/)
    expect(screen.queryByRole('button', { name: /Tage Serie/ })).toBeNull()
  })

  it('Die alte Fächer-Adresse führt zur Startseite', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/faecher'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Was willst du üben/))
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

describe('Fertige Karteikarten', () => {
  it('Aus der Fach-Seite hinzufügen, danach üben ohne eigene Arbeit', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/faecher/biologie'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Fertige Karteikarten/))
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

  it('Beim Erstellen: Wenn die KI nicht geht, gibt es fertige Karteikarten und Selbstschreiben als Ausweg', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/stapel/neu?fach=physik'
    render(<App />)
    await click(/^Karteikarten/, 'radio')
    await click(/Fertige/, 'radio')
    await waitFor(() => expect(text()).toMatch(/Größen, Einheiten und Formeln/))
  })
})

describe('Rechentraining in Mathe', () => {
  it('Themenliste, Training starten, falsche Antwort zeigt den Rechenweg', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['mathe'] })
    window.location.hash = '#/faecher/mathe?tab=mehr'
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

describe('Karteikarten mit der KI erstellen', () => {
  it('Beschreibung eingeben, Karten prüfen, speichern', async () => {
    vi.mocked(generateCards).mockResolvedValue({ title: 'Genetik', items: [{ front: 'DNA', back: 'Erbinformation' }, { front: 'Gen', back: 'Abschnitt der DNA' }, { front: 'Allel', back: 'Variante eines Gens' }] })
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/stapel/neu?fach=biologie'
    render(<App />)
    const area = await screen.findByLabelText(/Was brauchst du/)
    fireEvent.change(area, { target: { value: 'Genetik, Grundbegriffe' } })
    await click(/^Karteikarten/, 'radio')
    await click(/Karten erstellen/)
    await waitFor(() => expect(text()).toMatch(/3 Karten erstellt/))
    expect(vi.mocked(generateCards)).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 'biologie', request: 'Genetik, Grundbegriffe', count: 20 }))
    // Name wurde von der KI vorgeschlagen
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Genetik')
    await click(/Karteikarten speichern \(3\)/)
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    expect(useStore.getState().sets[0]).toMatchObject({ title: 'Genetik', subject: 'biologie' })
  })

  it('Rechenaufgaben: die KI schreibt nur die Rechnung, die App rechnet, und die Aufgaben laufen beim Üben', async () => {
    // Die KI "verrechnet" sich in ihrer eigenen Lösung: sie zählt nicht
    const { tasks } = normalizeTasks([
      { t: 'calc', q: 'Ein Auto fährt 150 km in 2 Stunden. Wie schnell ist es im Durchschnitt?', expr: '150/2', unit: 'km/h', answer: '70' },
      { t: 'solve', q: 'Löse nach x', equation: '3x - 4 = 11' },
      { t: 'mc', q: 'Welche Formel gilt für die Geschwindigkeit?', options: ['v = s / t', 'v = s * t', 'v = t / s'], answer: 0 },
    ])
    vi.mocked(generateTasks).mockResolvedValue({ title: 'Geschwindigkeit', tasks, dropped: 1 })
    useStore.setState({ onboarded: true, mySubjects: ['physik'] })
    window.location.hash = '#/stapel/neu?fach=physik'
    render(<App />)
    // Physik schlägt Rechenaufgaben vor
    expect((await screen.findByRole('radio', { name: /Rechenaufgaben/ })).getAttribute('aria-checked')).toBe('true')
    fireEvent.change(await screen.findByLabelText(/Was brauchst du/), { target: { value: 'Geschwindigkeit, Klasse 7' } })
    await click(/Aufgaben erstellen/)
    await waitFor(() => expect(text()).toMatch(/3 Aufgaben erstellt, bei 2 Rechenaufgaben hat die App das Ergebnis selbst ausgerechnet \(1 unbrauchbare/))
    expect(vi.mocked(generateTasks)).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 'physik', plan: 'rechnen', count: 20 }))
    // In der Liste: Frage und von der App berechnete Lösung
    expect(text()).toMatch(/75 km\/h|75/)
    await click(/Speichern \(3\)/)
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    const set = useStore.getState().sets[0]
    expect(set).toMatchObject({ title: 'Geschwindigkeit', subject: 'physik' })
    expect(set.items.map((i) => i.task?.t)).toEqual(['calc', 'solve', 'mc'])
    expect(set.items[0].back).toBe('75 km/h')
    expect(set.items[1].back).toBe('x = 5')
  })

  it('Wenn die KI nicht antwortet: Meldung mit Ausweg zu Selbstschreiben', async () => {
    vi.mocked(generateCards).mockRejectedValue(new Error('Der KI-Dienst konnte nicht geladen werden. Bist du online?'))
    useStore.setState({ onboarded: true })
    window.location.hash = '#/stapel/neu?fach=biologie'
    render(<App />)
    fireEvent.change(await screen.findByLabelText(/Was brauchst du/), { target: { value: 'x' } })
    await click(/^Karteikarten/, 'radio')
    await click(/Karten erstellen/)
    await waitFor(() => expect(text()).toMatch(/Bist du online/))
    await click(/selbst schreiben/)
    await waitFor(() => expect(text()).toMatch(/Eine Karte pro Zeile/))
  })
})

describe('Karten aus Notizen, ohne KI', () => {
  it('Text einfügen, Vorschläge prüfen, speichern', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['geschichte'] })
    window.location.hash = '#/stapel/neu?fach=geschichte'
    render(<App />)
    await click(/Aus Notizen/, 'radio')
    fireEvent.change(await screen.findByLabelText(/Deine Notizen/), { target: { value: '1789 Beginn der Französischen Revolution\nDie Reformation ist eine Erneuerungsbewegung der Kirche.\nBastille – Gefängnis in Paris' } })
    await click(/Karten vorschlagen/)
    await waitFor(() => expect(text()).toMatch(/3 Karten vorgeschlagen/))
    expect((screen.getAllByLabelText('Vorderseite') as HTMLTextAreaElement[]).map((t) => t.value)).toEqual(['Was geschah 1789?', 'Was ist die Reformation?', 'Bastille'])
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Revolution' } })
    await click(/Karteikarten speichern \(3\)/)
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    expect(useStore.getState().sets[0]).toMatchObject({ title: 'Revolution', subject: 'geschichte' })
  })
})

describe('Karteikarten teilen', () => {
  it('Link öffnen zeigt den Stapel, Speichern legt eine eigene Kopie an; kaputter Link zeigt Hinweis', async () => {
    const { encodeDeck } = await import('./lib/shareDeck')
    useStore.setState({ onboarded: true })
    const code = await encodeDeck({ title: 'Zellen', subject: 'biologie', items: [{ front: 'Was ist ein Ribosom?', back: 'Baut Eiweiße' }, { front: 'Mitochondrium', back: 'Kraftwerk' }] })
    window.location.hash = `#/stapel/teilen?d=${code}`
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Geteilte Karteikarten/))
    expect(text()).toMatch(/2 Karten/)
    await click(/Karteikarten speichern/)
    await waitFor(() => expect(useStore.getState().sets).toHaveLength(1))
    expect(useStore.getState().sets[0]).toMatchObject({ title: 'Zellen', subject: 'biologie' })
    expect(useStore.getState().sets[0].items).toHaveLength(2)

    go('#/stapel/teilen?d=z.kaputt')
    await waitFor(() => expect(text()).toMatch(/Link nicht lesbar/))
  })

  it('Auf der Seite der Karteikarten gibt es „Karteikarten teilen“ und der Link wird kopiert', async () => {
    useStore.setState({ onboarded: true })
    const id = useStore.getState().addSet('Zellen', [{ front: 'a', back: 'b' }], { subject: 'biologie' })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    window.location.hash = `#/stapel/${id}`
    render(<App />)
    await click(/Karteikarten teilen/)
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toMatch(/#\/stapel\/teilen\?d=[zp]\./)
    await waitFor(() => expect(text()).toMatch(/Link kopiert/))
  })
})

describe('Lernzeit statt Tagesziel', () => {
  it('Ohne Arbeit gibt es kein Tagesziel, mit Arbeit steht die Lernzeit auf der Startseite', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    const id = useStore.getState().addSet('Zelle', Array.from({ length: 6 }, (_, i) => ({ front: `F${i}`, back: `B${i}` })), { subject: 'biologie' })
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Heute dran/))
    expect(text()).not.toMatch(/Minuten für|Tagesziel|Tagesaufgaben|Truhe/)
    useStore.getState().addArbeit({ subject: 'biologie', kind: 'test', title: 'Bio-Test', date: dateKey(addDays(new Date(), 2)), deckIds: [id] })
    await waitFor(() => expect(text()).toMatch(/10 Minuten für Bio-Test/))
    expect(text()).toMatch(/0 Min\. von 10/)
    // Nach einer Runde mit 4 Minuten fehlen noch 6
    useStore.getState().finishSession({ xp: 5, grades: {}, accuracy: 1, minutes: 4 })
    await waitFor(() => expect(text()).toMatch(/4 Min\. von 10, noch 6 Min\./))
    useStore.getState().finishSession({ xp: 5, grades: {}, accuracy: 1, minutes: 7 })
    await waitFor(() => expect(text()).toMatch(/Heute geschafft/))
  })
})

describe('Schulstunden im Kalender', () => {
  it('Mit Stundenraster zeigt der Plan Stunden, ein Tipp trägt die Stunde ein, und man wählt von bis', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    useStore.getState().setSchoolPeriods([
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
      { start: '10:00', end: '10:45' },
      { start: '10:55', end: '11:40' },
    ])
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + ([0, 6].includes(new Date().getDay()) ? 7 : 0))
    useStore.getState().addArbeit({ subject: 'biologie', kind: 'test', title: 'Bio-Test', date: dateKey(addDays(monday, 1)), time: '10:00', duration: 45, deckIds: [] })
    window.location.hash = '#/kalender'
    render(<App />)
    // Block mit Stundenangabe statt Uhrzeit
    expect(await screen.findByRole('button', { name: /Bio-Test, Test, 3\. Stunde/ })).toBeTruthy()
    // Freie Stelle: die Stunde ist vorgewählt
    const fri = addDays(monday, 4)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Am Fr, ${fri.getDate()}\\. eintragen`) }), { detail: 1, clientY: 0 })
    await waitFor(() => expect(text()).toMatch(/Welche Stunde/))
    expect(screen.getByRole('radio', { name: /1\. Stunde, 08:00 bis 08:45/ }).getAttribute('aria-checked')).toBe('true')
    // Bis zur 2. Stunde verlängern
    fireEvent.click(screen.getByRole('radio', { name: 'bis 2. Stunde' }))
    expect(text()).toMatch(/1\. bis 2\. Stunde, 08:00 bis 09:40 Uhr/)
    await click(/^Klassenarbeit$/, 'radio')
    fireEvent.click(screen.getAllByRole('button', { name: /^Eintragen$/ }).at(-1)!)
    await waitFor(() => expect(useStore.getState().arbeiten).toHaveLength(2))
    expect(useStore.getState().arbeiten.find((a) => a.date === dateKey(fri))).toMatchObject({ time: '08:00', duration: 100 })
  })

  it('In den Einstellungen lassen sich die Schulzeiten pflegen', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/settings/schulzeiten'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Stunden und Pausen/))
    fireEvent.click(await screen.findByRole('button', { name: /Beispiel einfüllen/ }))
    expect(useStore.getState().schoolPeriods).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Stunde 7 entfernen' }))
    expect(useStore.getState().schoolPeriods).toHaveLength(6)
  })
})

describe('WebUntis verbinden', () => {
  const ICS = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    ...['5', '6', '7'].flatMap((d) => [
      ...[['0800', '0845'], ['0855', '0940'], ['1000', '1045']].flatMap(([a, b], i) => ['BEGIN:VEVENT', `UID:l${d}${i}`, `DTSTART:202610${d.padStart(2, '0')}T${a}00`, `DTEND:202610${d.padStart(2, '0')}T${b}00`, `SUMMARY:${['Bio', 'Mathe', 'E'][i]}`, 'END:VEVENT']),
    ]),
    'BEGIN:VEVENT',
    'UID:exam1',
    `DTSTART:${dateKey(addDays(new Date(), 5)).replace(/-/g, '')}T085500`,
    `DTEND:${dateKey(addDays(new Date(), 5)).replace(/-/g, '')}T094000`,
    'SUMMARY:Mathe Klassenarbeit',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  it('Datei laden: Stundenraster, Unterricht und Klassenarbeit werden übernommen; Trennen räumt die Arbeit weg', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/settings/untis'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Mit WebUntis verbinden/))
    const input = await screen.findByLabelText('iCal-Datei')
    const file = new File([ICS], 'stundenplan.ics', { type: 'text/calendar' })
    Object.defineProperty(file, 'text', { value: async () => ICS })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(useStore.getState().untis?.lessons.length).toBe(9), { timeout: 4000 })
    const st = useStore.getState()
    expect(st.schoolPeriods).toEqual([
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
      { start: '10:00', end: '10:45' },
    ])
    expect(st.arbeiten.map((a) => [a.id, a.subject, a.kind])).toEqual([['untis:exam1', 'mathe', 'klassenarbeit']])
    await waitFor(() => expect(text()).toMatch(/Aus Datei geladen: 9 Stunden, 1 Arbeit/))
    // Trennen
    fireEvent.click(await screen.findByRole('button', { name: 'Trennen' }))
    await waitFor(() => expect(useStore.getState().untis).toBeNull())
    expect(useStore.getState().arbeiten).toHaveLength(0)
  })

  it('Mit Link verbinden ruft ab; ohne Relais gibt es eine verständliche Meldung statt eines Absturzes', async () => {
    useStore.setState({ onboarded: true })
    const real = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    try {
      window.location.hash = '#/settings/untis'
      render(<App />)
      fireEvent.change(await screen.findByLabelText('iCal-Link'), { target: { value: 'webcal://test.webuntis.com/WebUntis/Ical.do?school=x&key=1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Mit WebUntis verbinden' }))
      await waitFor(() => expect(useStore.getState().untis?.url).toBe('https://test.webuntis.com/WebUntis/Ical.do?school=x&key=1'))
      await waitFor(() => expect(useStore.getState().untis?.lastError).toMatch(/Relais/), { timeout: 4000 })
      await waitFor(() => expect(text()).toMatch(/Relais/))
    } finally {
      globalThis.fetch = real
    }
  })
})

describe('Tests, Klassenarbeiten und Vokabeltests', () => {
  const stage = (hash: string) => {
    window.location.hash = hash
    return render(<App />)
  }

  it('Vokabeltest ohne KI: aus den Vokabel-Karteikarten, tippen, Auswertung mit Punkten und Note, Falsche üben', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['englisch'] })
    useStore.getState().addSet(
      'Unit 4',
      [
        { front: 'apple', back: 'Apfel' },
        { front: 'house', back: 'Haus' },
        { front: 'dog', back: 'Hund' },
        { front: 'cat', back: 'Katze' },
      ],
      { subject: 'englisch', lang: 'en', both: true },
    )
    stage('#/test/neu?fach=englisch&art=vokabeltest')
    await waitFor(() => expect(text()).toMatch(/Welche Vokabeln/))
    // Alle Sprach-Karteikarten sind schon gewählt
    expect((await screen.findByRole('checkbox', { name: /Unit 4/ })).getAttribute('aria-checked')).toBe('true')
    await click(/Deutsch → Fremdsprache/, 'radio')
    await click(/^Vokabeltest erstellen$/)
    await waitFor(() => expect(useStore.getState().tests).toHaveLength(1))
    const t = useStore.getState().tests[0]
    expect(t).toMatchObject({ kind: 'vokabeltest', subject: 'englisch' })
    expect(t.sections[0].tasks).toHaveLength(4)
    // Startbildschirm, dann starten
    await screen.findByRole('button', { name: 'Starten' })
    expect(text()).toMatch(/4\s*Aufgaben/)
    await click(/^Starten$/)
    const answers: Record<string, string> = { Apfel: 'apple', Haus: 'house', Hund: 'dog', Katze: 'kitten' }
    for (let i = 0; i < 4; i++) {
      await waitFor(() => expect(document.querySelector('textarea')).toBeTruthy())
      const q = Object.keys(answers).find((k) => (document.querySelector('.exercise-in, main')?.textContent ?? '').includes(k))!
      fireEvent.change(document.querySelector('textarea')!, { target: { value: answers[q] } })
      fireEvent.click(screen.getByRole('button', { name: i === 3 ? 'Abgeben' : 'Weiter' }))
    }
    // Auswertung: 3 von 4 richtig, "Katze" falsch
    await waitFor(() => expect(text()).toMatch(/3 \/ 4/))
    expect(text()).toMatch(/75 %, ungefähr eine 3 \(befriedigend\)/)
    expect(text()).toMatch(/Richtig: cat/)
    // Das Ergebnis wird gespeichert
    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    await waitFor(() => expect(useStore.getState().testResults).toHaveLength(1))
    expect(useStore.getState().testResults[0]).toMatchObject({ points: 3, max: 4, percent: 75, note: 3 })
  })

  it('Klassenarbeit von der KI: Rechenaufgaben rechnet die App, Kurzantwort bewertet man selbst, Falsche werden zum Übungs-Set', async () => {
    const res = normalizeTest(
      {
        title: 'Brüche und Geschwindigkeit',
        minutes: 30,
        sections: [
          {
            title: 'Teil A: Wissen',
            tasks: [
              { t: 'mc', q: 'Welche Formel gilt?', options: ['v = s / t', 'v = s * t', 'v = t / s'], answer: 0, points: 1 },
              { t: 'tf', q: 'Ein Bruch darf null als Nenner haben.', answer: false, points: 1 },
            ],
          },
          {
            title: 'Teil B: Anwenden',
            tasks: [
              { t: 'calc', q: 'Ein Auto fährt 150 km in 2 Stunden. Wie schnell ist es?', expr: '150/2', unit: 'km/h', points: 2, answer: '300' },
              { t: 'short', q: 'Was ist Geschwindigkeit?', sample: 'Der Weg pro Zeit', keys: ['Weg', 'Zeit'], points: 3 },
            ],
          },
        ],
      },
      { id: 'ki-1', subject: 'physik', kind: 'arbeit', source: 'Thema: Geschwindigkeit' },
    )!
    vi.mocked(generateTest).mockResolvedValue({ ...res, retried: false })
    useStore.setState({ onboarded: true, mySubjects: ['physik'] })
    stage('#/test/neu?fach=physik')
    fireEvent.change(await screen.findByLabelText(/Thema oder Kapitel/), { target: { value: 'Geschwindigkeit' } })
    await click(/^Klassenarbeit/, 'radio')
    await click(/Klassenarbeit von der KI erstellen/)
    await waitFor(() => expect(vi.mocked(generateTest)).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 'physik', kind: 'arbeit', length: 'normal', topic: 'Geschwindigkeit' })))
    await waitFor(() => expect(useStore.getState().tests).toHaveLength(1))
    await waitFor(() => expect(text()).toMatch(/Brüche und Geschwindigkeit/))
    expect(text()).toMatch(/7\s*Punkte/)
    await click(/^Starten$/)
    // Aufgabe 1: Quiz (richtig), Aufgabe 2: falsch beantwortet
    fireEvent.click(await screen.findByRole('radio', { name: /v = s \/ t/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(await screen.findByRole('radio', { name: /Richtig/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    // Aufgabe 3: Rechnen, die App erwartet 75 (nicht die 300 der KI)
    await waitFor(() => expect(text()).toMatch(/Rechne aus/))
    for (const d of '75') fireEvent.click(screen.getByRole('button', { name: d }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    // Aufgabe 4: Kurzantwort
    fireEvent.change(await screen.findByLabelText('Deine Antwort'), { target: { value: 'Der Weg, den man pro Zeit zurücklegt' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abgeben' }))
    await waitFor(() => expect(text()).toMatch(/Ergebnis|ungefähr eine/))
    // Quiz 1 + Rechnen 2 + Kurzantwort (Stichwörter Weg und Zeit sind drin: voll) 3 = 6 von 7, "Richtig" statt "Falsch" kostet 1
    expect(text()).toMatch(/6 \/ 7/)
    expect(text()).toMatch(/86 %, ungefähr eine 2/)
    // Selbstbewertung ändern: nur teilweise
    fireEvent.click(screen.getByRole('radio', { name: 'Teilweise' }))
    await waitFor(() => expect(text()).toMatch(/4,5 \/ 7/))
    // Die falsche Aufgabe wird zu einem Übungs-Set
    fireEvent.click(screen.getByRole('button', { name: /falschen Aufgaben üben|falsche Aufgabe üben/ }))
    await waitFor(() => expect(useStore.getState().sets.some((x) => x.title.startsWith('Falsche aus'))).toBe(true))
    const wrongSet = useStore.getState().sets.find((x) => x.title.startsWith('Falsche aus'))!
    expect(wrongSet.subject).toBe('physik')
    expect(wrongSet.items.every((i) => !!i.task)).toBe(true)
    expect(useStore.getState().testResults).toHaveLength(1)
  })

  it('Die Fach-Seite listet die Tests; ohne Tests lädt sie zum Erstellen ein', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    stage('#/faecher/biologie?tab=tests')
    await waitFor(() => expect(text()).toMatch(/Tests zum Üben/))
    expect(text()).toMatch(/Test, Klassenarbeit oder Vokabeltest/)
    const res = normalizeTest({ tasks: [{ t: 'tf', q: 'A', answer: true }, { t: 'tf', q: 'B', answer: true }, { t: 'tf', q: 'C', answer: false }] }, { id: 'k1', subject: 'biologie', kind: 'test', source: 'x' })!
    res.test.title = 'Zelle-Test'
    useStore.getState().addTest(res.test)
    await waitFor(() => expect(text()).toMatch(/Zelle-Test/))
    expect(text()).toMatch(/Test · 3 Aufgaben · 20 Min\./)
  })
})

describe('Formel-Training ohne KI', () => {
  it('Physik hat Themen mit Formeln; ein Durchgang startet mit einer Rechenaufgabe oder Wissensfrage', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['physik', 'mathe'] })
    window.location.hash = '#/faecher/physik?tab=mehr'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Rechentraining/))
    expect(text()).toMatch(/8 Themen mit Formeln/)
    go('#/faecher/physik/rechnen')
    await waitFor(() => expect(text()).toMatch(/Ohmsches Gesetz/))
    expect(text()).toMatch(/U = R · I/)
    fireEvent.click(await screen.findByRole('link', { name: /Geschwindigkeit/ }))
    await waitFor(() => expect(text()).toMatch(/Rechne aus|Wähle die richtige Antwort/), { timeout: 4000 })
    // Mathe: Alltagsrechnen mit Prozent und Dreisatz
    go('#/faecher/mathe?tab=mehr')
    await waitFor(() => expect(text()).toMatch(/Prozent und Dreisatz/))
  })
})

describe('Einführung überspringen', () => {
  it('Wer die Einführung überspringt, landet direkt bei der Einrichtung', async () => {
    render(<App />)
    await click(/Jetzt starten/)
    await click(/Überspringen/)
    await waitFor(() => expect(text()).toMatch(/Welche Fächer hast du/))
  })
})

describe('Übersicht: Einstieg, Einstellungen als Liste', () => {
  it('Einstellungen zeigen erst eine Liste, jeder Bereich liegt auf einer eigenen Seite', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/settings'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Meine Fächer/))
    expect(text()).toMatch(/WebUntis/)
    // Noch kein Inhalt der Bereiche
    expect(text()).not.toMatch(/Sicherung teilen/)
    fireEvent.click(await screen.findByRole('link', { name: /Daten und Sicherung/ }))
    await waitFor(() => expect(text()).toMatch(/Sicherung teilen/))
    expect(text()).not.toMatch(/Mach die App zu deiner/)
    fireEvent.click(screen.getAllByRole('link', { name: /Einstellungen/ })[0])
    await waitFor(() => expect(text()).toMatch(/Schulzeiten/))
  })
})
