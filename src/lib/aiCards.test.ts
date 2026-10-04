import { beforeEach, describe, expect, it, vi } from 'vitest'

const chatCoach = vi.fn()
const chatFree = vi.fn()
const shouldUseFree = vi.fn()
const ensureAiReady = vi.fn()

vi.mock('./ai', async () => {
  const real = await vi.importActual<typeof import('./ai')>('./ai')
  return { ...real, chatCoach: (...a: unknown[]) => chatCoach(...a), ensureAiReady: () => ensureAiReady() }
})
vi.mock('./freeAi', () => ({ chatFree: (...a: unknown[]) => chatFree(...a), shouldUseFree: (...a: unknown[]) => shouldUseFree(...a) }))

import { AiError } from './ai'
import { generateCards } from './aiCards'

beforeEach(() => {
  chatCoach.mockReset()
  chatFree.mockReset()
  shouldUseFree.mockReset().mockResolvedValue(false)
  ensureAiReady.mockReset().mockResolvedValue(undefined)
})

const reply = (items: unknown[], title = 'Zelle') => '```json\n' + JSON.stringify({ title, items }) + '\n```'

describe('Karten von der KI', () => {
  it('liest die Antwort (auch mit Code-Zaun), entfernt Doppelte und begrenzt die Zahl', async () => {
    chatCoach.mockResolvedValue(
      reply([
        { front: 'Zellkern', back: 'steuert die Zelle' },
        { front: 'zellkern', back: 'doppelt' },
        { front: 'Ribosom', back: 'baut Eiweiße' },
        { front: '', back: 'leer' },
        { front: 'ohne Antwort', back: '' },
      ]),
    )
    const r = await generateCards({ subjectId: 'biologie', request: 'Zellorganellen', count: 10 })
    expect(r.title).toBe('Zelle')
    expect(r.items.map((i) => i.front)).toEqual(['Zellkern', 'Ribosom'])
    // Der Auftrag und die Regeln gehen an die KI
    const [system, messages] = chatCoach.mock.calls[0]
    expect(system).toContain('Biologie')
    expect(system).toContain('höchstens 10 Karten')
    expect(messages).toEqual([{ role: 'user', content: 'Zellorganellen' }])
  })

  it('Fotos gehen mit, ohne Text reicht ein Foto', async () => {
    chatCoach.mockResolvedValue(reply([{ front: 'a', back: 'b' }]))
    await generateCards({ subjectId: 'mathe', request: '', count: 20, images: ['AAAA'] })
    const [, messages, images] = chatCoach.mock.calls[0]
    expect(images).toEqual(['AAAA'])
    expect(messages[0].content).toMatch(/Karteikarten aus diesen Seiten/)
  })

  it('ohne Text und ohne Foto gibt es eine verständliche Meldung', async () => {
    await expect(generateCards({ subjectId: 'mathe', request: '  ', count: 10 })).rejects.toThrow(/Schreib kurz/)
    expect(chatCoach).not.toHaveBeenCalled()
  })

  it('Sprachfach: fehlende Akzente der Fremdsprache werden ergänzt', async () => {
    chatCoach.mockResolvedValue(reply([{ front: 'le cafe', back: 'der Kaffee' }, { front: "l'ecole", back: 'die Schule' }]))
    const r = await generateCards({ subjectId: 'franzoesisch', request: 'Essen', count: 10 })
    expect(r.items[0].front).toBe('le café')
  })

  it('kostenlose KI zuerst; fällt sie aus, geht es mit dem Gastkonto weiter', async () => {
    shouldUseFree.mockResolvedValue(true)
    chatFree.mockRejectedValue(new AiError('überlastet', 'rate'))
    chatCoach.mockResolvedValue(reply([{ front: 'a', back: 'b' }]))
    const r = await generateCards({ subjectId: 'physik', request: 'Einheiten', count: 10 })
    expect(r.items).toHaveLength(1)
    expect(ensureAiReady).toHaveBeenCalled()
  })

  it('kein Netz: Fehler wird weitergereicht (kein stiller Wechsel)', async () => {
    shouldUseFree.mockResolvedValue(true)
    chatFree.mockRejectedValue(new AiError('offline', 'network'))
    await expect(generateCards({ subjectId: 'physik', request: 'x', count: 10 })).rejects.toThrow('offline')
    expect(chatCoach).not.toHaveBeenCalled()
  })

  it('Antwort ohne brauchbares JSON: klare Meldung', async () => {
    chatCoach.mockResolvedValue('Entschuldigung, das kann ich nicht.')
    await expect(generateCards({ subjectId: 'physik', request: 'x', count: 10 })).rejects.toThrow(/nicht lesbar|unvollständig|gelesen/)
  })
})
