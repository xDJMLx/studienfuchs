/**
 * Relais zwischen der Studienfuchs-Seite und WebUntis (iCal-Stundenplan).
 *
 * Warum? WebUntis erlaubt den Abruf des Kalender-Links meist nicht direkt aus dem Browser (CORS). Dieses kleine Programm läuft
 * als Cloudflare Worker, holt die iCal-Datei von seinem Server aus und reicht sie an die Seite weiter.
 * Es speichert nichts, schreibt nichts ins Protokoll und erlaubt nur Adressen von WebUntis/Untis über https.
 *
 * Aufruf: GET https://DEIN-WORKER.workers.dev/?url=<iCal-Link, url-codiert>
 * Einrichtung: siehe relay/README.md
 */

/** Nur diese Seiten dürfen das Relais benutzen. */
const ALLOWED_ORIGINS = ['https://xdjmlx.github.io', 'http://localhost:5173', 'http://localhost:4173']

/** Nur Untis-Server (https). So kann das Relais nicht für beliebige Seiten missbraucht werden. */
const ALLOWED_HOSTS = [/(^|\.)webuntis\.com$/i, /(^|\.)untis\.at$/i, /(^|\.)untis\.de$/i, /(^|\.)untis-sr\.ch$/i]

const MAX_BYTES = 3 * 1024 * 1024
const TIMEOUT_MS = 20000

const text = (body, status, cors, type = 'text/plain; charset=utf-8') => new Response(body, { status, headers: { 'content-type': type, ...cors } })

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') ?? ''
    const allowed = ALLOWED_ORIGINS.includes(origin)
    const cors = allowed ? { 'access-control-allow-origin': origin, vary: 'origin', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-max-age': '86400' } : { vary: 'origin' }

    if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors })
    if (!allowed) return text('forbidden', 403, cors)
    if (request.method !== 'GET') return text('method_not_allowed', 405, cors)

    let target
    try {
      target = new URL(new URL(request.url).searchParams.get('url') ?? '')
    } catch {
      return text('bad_url', 400, cors)
    }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.some((re) => re.test(target.hostname))) return text('host_not_allowed', 403, cors)

    let upstream
    try {
      upstream = await fetch(target.toString(), { headers: { accept: 'text/calendar, text/plain, */*', 'user-agent': 'Studienfuchs-Relais' }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) })
    } catch {
      return text('upstream_unreachable', 502, cors)
    }
    if (!upstream.ok) return text(`upstream_${upstream.status}`, upstream.status === 401 || upstream.status === 403 ? 403 : 502, cors)
    const body = await upstream.text()
    if (body.length > MAX_BYTES) return text('too_large', 413, cors)
    if (!/BEGIN:VCALENDAR/i.test(body)) return text('not_ical', 422, cors)
    return text(body, 200, cors, 'text/calendar; charset=utf-8')
  },
}
