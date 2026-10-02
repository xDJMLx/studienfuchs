import { describe, expect, it } from 'vitest'
import { AiError } from './ai'
import { chatFree } from './freeAi'

const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('kostenlose KI', () => {
  it('liefert den Text des Relais', async () => {
    let sent: { messages: { role: string; content: string }[]; max_tokens: number } | null = null
    const f = (async (_u: unknown, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ text: ' Bonjour ! ' }), { status: 200 })
    }) as unknown as typeof fetch
    const out = await chatFree('Du bist Lehrer.', [{ role: 'user', content: 'Hallo' }], f)
    expect(out).toBe('Bonjour !')
    expect(sent!.messages[0]).toEqual({ role: 'system', content: 'Du bist Lehrer.' })
    expect(sent!.messages[1]).toEqual({ role: 'user', content: 'Hallo' })
  })

  it('meldet Auslastung und Fehler verständlich', async () => {
    await expect(chatFree('s', [{ role: 'user', content: 'x' }], reply(429, { error: 'busy' }))).rejects.toMatchObject({ kind: 'rate' })
    await expect(chatFree('s', [{ role: 'user', content: 'x' }], reply(503, { error: 'unavailable' }))).rejects.toMatchObject({ kind: 'rate' })
    await expect(chatFree('s', [{ role: 'user', content: 'x' }], reply(500, {}))).rejects.toBeInstanceOf(AiError)
    await expect(chatFree('s', [{ role: 'user', content: 'x' }], reply(200, { text: '  ' }))).rejects.toMatchObject({ kind: 'format' })
  })

  it('meldet fehlende Verbindung', async () => {
    const down = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(chatFree('s', [{ role: 'user', content: 'x' }], down)).rejects.toMatchObject({ kind: 'network' })
  })
})
