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
    await waitFor(() => expect(text()).toMatch(/Welche Fächer hast du/))
    await click(/Biologie/)
    await click(/Mathe/)
    expect(useStore.getState().mySubjects).toEqual(['biologie', 'mathe'])
    await click(/Weiter/)
    await waitFor(() => expect(text()).toMatch(/Wie viele Minuten am Tag/))
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
    await waitFor(() => expect(text()).toMatch(/Neue Karteikarten/))
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
    expect(text()).toMatch(/5 neue Karten/)
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

  it('Fächer ändert man in den Einstellungen, die Fach-Seite zeigt Level und Karteikarten', async () => {
    useStore.setState({ onboarded: true, mySubjects: ['biologie'] })
    window.location.hash = '#/settings'
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
    expect(text()).toMatch(/Noch 5 Karten bis Entdecker/)
  })

  it('Es gibt keine Serie mehr: weder in der Kopfzeile noch im Profil', async () => {
    useStore.setState({ onboarded: true })
    window.location.hash = '#/profile'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Statistik/))
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

describe('Karteikarten mit der KI erstellen', () => {
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
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Genetik')
    await click(/Karteikarten speichern \(3\)/)
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
    expect(text()).toMatch(/Pause/)
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
    window.location.hash = '#/settings'
    render(<App />)
    await waitFor(() => expect(text()).toMatch(/Stunden und Pausen/))
    fireEvent.click(await screen.findByRole('button', { name: /Beispiel einfüllen/ }))
    expect(useStore.getState().schoolPeriods).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Stunde 7 entfernen' }))
    expect(useStore.getState().schoolPeriods).toHaveLength(6)
  })
})
