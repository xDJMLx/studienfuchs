/**
 * Postfach für Rückmeldungen der Studienfuchs-App (Fehlerberichte, Ideen, freiwillige Nutzungszähler).
 *
 * Läuft als Cloudflare Worker mit einem KV-Speicher. Es speichert nur, was die App schickt (Version, Gerätetyp, Zähler,
 * letzte Fehlermeldungen und die Nachricht), nie Lerninhalte. Berichte werden nach 120 Tagen von selbst gelöscht.
 *
 * Senden (App):   POST https://DEIN-WORKER.workers.dev/   mit JSON
 * Lesen (du):     GET  https://DEIN-WORKER.workers.dev/?key=DEIN_LESESCHLÜSSEL        (JSON-Liste, neueste zuerst)
 * Einrichtung: siehe relay/README.md. Gebraucht werden ein KV-Speicher (Name FEEDBACK) und ein Geheimnis READ_KEY.
 */

const ALLOWED_ORIGINS = ['https://xdjmlx.github.io', 'http://localhost:5173', 'http://localhost:4173']
const MAX_BYTES = 12 * 1024
const KEEP_SECONDS = 120 * 86400
/** Pro Absender-Kennung höchstens so viele Berichte pro Tag (Schutz vor Missbrauch). */
const PER_DAY = 20

const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors } })

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') ?? ''
    const allowed = ALLOWED_ORIGINS.includes(origin)
    const cors = allowed ? { 'access-control-allow-origin': origin, vary: 'origin', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } : { vary: 'origin' }
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors })

    // Lesen: nur mit Schlüssel, von überall (zum Beispiel per curl)
    if (request.method === 'GET') {
      if (!env.READ_KEY || url.searchParams.get('key') !== env.READ_KEY) return json({ error: 'forbidden' }, 403, cors)
      const list = await env.FEEDBACK.list({ prefix: 'r:', limit: 200 })
      const items = await Promise.all(list.keys.map(async (k) => ({ key: k.name, ...JSON.parse((await env.FEEDBACK.get(k.name)) ?? '{}') })))
      return json(items.sort((a, b) => (a.key < b.key ? 1 : -1)), 200, cors)
    }

    // Senden: nur von der App-Seite
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)
    if (!allowed) return json({ error: 'forbidden' }, 403, cors)
    const raw = await request.text()
    if (raw.length > MAX_BYTES) return json({ error: 'too_large' }, 413, cors)
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return json({ error: 'bad_json' }, 400, cors)
    }
    if (!data || typeof data !== 'object' || !['fehler', 'idee', 'lob', 'nutzung'].includes(data.art)) return json({ error: 'bad_report' }, 422, cors)

    const id = String(data.id ?? 'unbekannt').slice(0, 24)
    const day = new Date().toISOString().slice(0, 10)
    const counterKey = `n:${id}:${day}`
    const used = Number((await env.FEEDBACK.get(counterKey)) ?? 0)
    if (used >= PER_DAY) return json({ error: 'rate' }, 429, cors)
    await env.FEEDBACK.put(counterKey, String(used + 1), { expirationTtl: 2 * 86400 })

    const key = `r:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 7)}`
    await env.FEEDBACK.put(key, raw, { expirationTtl: KEEP_SECONDS })
    return json({ ok: true }, 200, cors)
  },
}
