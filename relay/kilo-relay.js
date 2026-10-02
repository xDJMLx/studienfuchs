/**
 * Relais zwischen der Studienfuchs-Seite und den kostenlosen Modellen von Kilo (https://kilo.ai).
 *
 * Warum? Kilo erlaubt anonyme Anfragen an Gratis-Modelle (ohne Konto und ohne Schlüssel), blockiert aber
 * Aufrufe direkt aus dem Browser (CORS). Dieses kleine Programm läuft als Cloudflare Worker, nimmt die Frage
 * von der Seite an und fragt Kilo von seinem Server aus. Es speichert nichts und braucht keinen geheimen Schlüssel.
 *
 * Einrichtung: siehe relay/README.md
 */

const KILO = 'https://api.kilo.ai/api/gateway/chat/completions'

/** Nur diese Seiten dürfen das Relais benutzen (gegen fremde Seiten, die es mitbenutzen wollen). */
const ALLOWED_ORIGINS = ['https://xdjmlx.github.io', 'http://localhost:5173', 'http://localhost:4173']

/** Gratis-Modelle, in dieser Reihenfolge probiert; ist eines überlastet, kommt das nächste. */
const MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3.8-27b:free',
  'kilo-auto/free',
  'stepfun/step-3.7-flash:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
]

const MAX_CHARS = 40000
const MAX_MESSAGES = 30
const UPSTREAM_TIMEOUT_MS = 100000

const json = (data, status, cors) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors } })

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') ?? ''
    const allowed = ALLOWED_ORIGINS.includes(origin)
    const cors = allowed
      ? { 'access-control-allow-origin': origin, vary: 'origin', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' }
      : { vary: 'origin' }

    if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors })
    if (!allowed) return json({ error: 'forbidden' }, 403, cors)
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'bad_json' }, 400, cors)
    }
    const messages = Array.isArray(body?.messages) ? body.messages : null
    if (!messages || !messages.length || messages.length > MAX_MESSAGES) return json({ error: 'bad_messages' }, 400, cors)
    let chars = 0
    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || !['system', 'user', 'assistant'].includes(m.role)) return json({ error: 'bad_messages' }, 400, cors)
      chars += m.content.length
    }
    if (chars > MAX_CHARS) return json({ error: 'too_long' }, 413, cors)
    const maxTokens = Math.min(4000, Math.max(100, Number(body.max_tokens) || 1500))

    let lastStatus = 502
    for (const model of MODELS) {
      try {
        const res = await fetch(KILO, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })
        const data = await res.json().catch(() => null)
        const text = data?.choices?.[0]?.message?.content
        if (res.ok && typeof text === 'string' && text.trim()) return json({ text: text.trim(), model: data.model ?? model }, 200, cors)
        lastStatus = res.status === 429 || data?.error?.code === 429 ? 429 : 502
      } catch {
        lastStatus = 504
      }
    }
    return json({ error: lastStatus === 429 ? 'busy' : 'unavailable' }, lastStatus === 429 ? 429 : 503, cors)
  },
}
