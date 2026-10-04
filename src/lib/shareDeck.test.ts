import { describe, expect, it } from 'vitest'
import { decodeDeck, encodeDeck } from './shareDeck'

describe('Stapel teilen', () => {
  it('Link-Text hin und zurück, Umlaute bleiben', async () => {
    const code = await encodeDeck({ title: 'Zellen – Übersicht', subject: 'biologie', lang: undefined, items: [{ front: 'Was ist ein Ribosom?', back: 'Baut Eiweiße (ü, ö, ä, é)' }, { front: 'a', back: 'b', note: 'Merke' }] })
    expect(code).toMatch(/^[zp]\./)
    expect(code).not.toMatch(/[+/=\s]/)
    const d = await decodeDeck(code)
    expect(d.title).toBe('Zellen – Übersicht')
    expect(d.subject).toBe('biologie')
    expect(d.items).toEqual([{ front: 'Was ist ein Ribosom?', back: 'Baut Eiweiße (ü, ö, ä, é)' }, { front: 'a', back: 'b', note: 'Merke' }])
  })

  it('Lernstand und fremde Felder gehen nicht mit', async () => {
    const code = await encodeDeck({ title: 'T', items: [{ front: 'f', back: 'b', id: 'x', due: 1 } as never] })
    const d = await decodeDeck(code)
    expect(d.items[0]).toEqual({ front: 'f', back: 'b' })
  })

  it('kaputte oder leere Links werden abgelehnt', async () => {
    await expect(decodeDeck('')).rejects.toThrow()
    await expect(decodeDeck('z.@@@')).rejects.toThrow()
    await expect(decodeDeck('p.' + Buffer.from('{"title":"x","items":[]}').toString('base64url'))).rejects.toThrow(/keine Karteikarten/)
    await expect(decodeDeck('p.' + Buffer.from('{"title":"","items":[{"front":"a","back":"b"}]}').toString('base64url'))).rejects.toThrow()
  })

  it('unsichere Fachangaben werden verworfen', async () => {
    const d = await decodeDeck('p.' + Buffer.from(JSON.stringify({ title: 'x', subject: '<script>', items: [{ front: 'a', back: 'b' }] })).toString('base64url'))
    expect(d.subject).toBeUndefined()
  })
})
