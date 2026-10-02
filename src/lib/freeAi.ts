import { AiError, getAiConfig, isAiReady, type ChatMessage } from './ai'

/**
 * Kostenlose KI ohne Anmeldung: Die Seite fragt ein kleines Relais (relay/kilo-relay.js), das die Gratis-Modelle von Kilo fragt.
 * Ohne Adresse (leer) ist diese Stufe aus, und es bleibt bei Puter.
 * Zum Testen lässt sich die Adresse mit VITE_FREE_AI_URL überschreiben.
 */
export const DEFAULT_FREE_AI_URL = ''
export const FREE_AI_URL: string = ((import.meta.env.VITE_FREE_AI_URL as string | undefined) ?? DEFAULT_FREE_AI_URL).trim()

const TIMEOUT_MS = 60000

/** Ist die kostenlose Stufe verfügbar (Adresse gesetzt, kein eigener Schlüssel)? */
export const freeAiConfigured = (): boolean => !!FREE_AI_URL && getAiConfig().provider === 'puter'

/**
 * Soll diese Nachricht zuerst an die kostenlose Stufe gehen?
 * Nein bei Fotos (die Bildauswertung bleibt bei Puter) und wenn schon ein Puter-Konto verbunden ist (das ist die bessere KI).
 */
export async function shouldUseFree(hasImages: boolean): Promise<boolean> {
  if (hasImages || !freeAiConfigured()) return false
  return !(await isAiReady())
}

/** Eine Chat-Antwort von der kostenlosen Stufe holen. */
export async function chatFree(system: string, messages: ChatMessage[], fetchImpl: typeof fetch = fetch, maxTokens = 1500): Promise<string> {
  const history = messages.slice(-24).map(({ role, content }) => ({ role, content }))
  let res: Response
  try {
    res = await fetchImpl(FREE_AI_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: system }, ...history], max_tokens: maxTokens }),
      signal: AbortSignal.timeout(maxTokens > 2000 ? 120000 : TIMEOUT_MS),
    })
  } catch {
    throw new AiError('Keine Verbindung zur kostenlosen KI. Bist du online?', 'network')
  }
  if (res.status === 429 || res.status === 503) throw new AiError('Die kostenlose KI ist gerade ausgelastet.', 'rate')
  if (!res.ok) throw new AiError(`Die kostenlose KI hat einen Fehler gemeldet (${res.status}).`)
  const data = (await res.json().catch(() => null)) as { text?: string } | null
  if (!data?.text?.trim()) throw new AiError('Die kostenlose KI hat eine leere Antwort geliefert.', 'format')
  return data.text.trim()
}
