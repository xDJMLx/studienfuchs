// KI-Unterstützung: Vokabeln aus Buchseiten (Fotos) herausziehen und Lernkarten ergänzen.
// Standard: Puter.js. Jeder Besucher bekommt beim ersten Klick automatisch ein kostenloses Gastkonto bei Puter, ohne eigenen Schlüssel.
// Die Nutzung läuft über das Puter-Konto des Besuchers, nicht über ein Konto des Betreibers dieser Seite.
// Alternativ: eigener Anthropic-API-Schlüssel (nur lokal gespeichert, nicht Teil der Sicherung).
// Es werden nur dann Daten gesendet, wenn du auf "Mit KI erstellen" bzw. "Mit KI ergänzen" klickst.

import { STORAGE } from './migrate'

const STORAGE_KEY = STORAGE.ai
const API = 'https://api.anthropic.com/v1/messages'

export type AiProvider = 'puter' | 'anthropic'

export const AI_MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5 (empfohlen: genau und schnell)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (günstiger, für klare Seiten)' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5 (am genauesten, am teuersten)' },
] as const

/** Modelle bei Puter in dieser Reihenfolge; ist eines nicht verfügbar, wird das nächste probiert. */
export const PUTER_MODELS = ['claude-sonnet-5', 'gpt-5.6-luna', 'gemini-3.1-flash-lite'] as const

export interface AiConfig {
  provider: AiProvider
  /** nur beim Anthropic-Zugang */
  key: string
  model: string
}

/** Ohne gespeicherte Einstellung ist Puter aktiv (kostenlos, ohne Schlüssel). */
export function getAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const c = JSON.parse(raw) as Partial<AiConfig>
      if (c.provider === 'anthropic' && c.key) return { provider: 'anthropic', key: c.key, model: c.model ?? AI_MODELS[0].id }
    }
  } catch {
    /* ignorieren */
  }
  return { provider: 'puter', key: '', model: PUTER_MODELS[0] }
}

/** Anthropic mit Schlüssel speichern; `null` oder leerer Schlüssel setzt auf den Standard (Puter) zurück. */
export function setAiConfig(config: { provider: AiProvider; key?: string; model?: string } | null): void {
  try {
    if (config && config.provider === 'anthropic' && config.key?.trim()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: 'anthropic', key: config.key.trim(), model: config.model ?? AI_MODELS[0].id }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: 'no-key' | 'auth' | 'rate' | 'network' | 'format' | 'other' = 'other',
  ) {
    super(message)
  }
}

export interface AiItem {
  front: string
  back: string
  example?: string
  exampleDe?: string
  note?: string
}

export interface AiVocab {
  title: string
  items: AiItem[]
}

type Block = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

interface PuterLike {
  auth: {
    isSignedIn: () => boolean
    signIn: (o?: { attempt_temp_user_creation?: boolean }) => Promise<unknown>
  }
  ai: { chat: (...args: unknown[]) => Promise<unknown> }
}

async function loadPuter(): Promise<PuterLike> {
  try {
    const mod = await import('@heyputer/puter.js')
    return mod.puter as unknown as PuterLike
  } catch {
    throw new AiError('Der KI-Dienst konnte nicht geladen werden. Bist du online?', 'network')
  }
}

/**
 * Muss direkt aus einem Klick heraus aufgerufen werden (sonst blockiert der Browser das Anmeldefenster).
 * Legt beim ersten Mal das kostenlose Puter-Gastkonto an; danach passiert nichts mehr.
 */
export async function ensureAiReady(): Promise<void> {
  if (getAiConfig().provider !== 'puter') return
  const puter = await loadPuter()
  if (puter.auth.isSignedIn()) return
  try {
    await puter.auth.signIn({ attempt_temp_user_creation: true })
  } catch (e) {
    const code = (e as { error?: string })?.error
    if (code === 'popup_blocked') throw new AiError('Dein Browser hat das Anmeldefenster blockiert. Erlaube Pop-ups für diese Seite und klicke nochmal.', 'auth')
    if (code === 'auth_window_closed') throw new AiError('Das Anmeldefenster wurde geschlossen. Klicke nochmal und lass es offen, es dauert nur einen Moment.', 'auth')
    throw new AiError('Die Anmeldung beim KI-Dienst hat nicht geklappt. Versuch es nochmal.', 'auth')
  }
}

/** Lädt den KI-Dienst schon im Voraus, damit das Anmeldefenster beim Klick nicht vom Browser blockiert wird. Sendet nichts. */
export function preloadAi(): void {
  if (getAiConfig().provider === 'puter') void loadPuter().catch(() => undefined)
}

/** Trennt das Puter-Gastkonto von diesem Browser. */
export async function signOutAi(): Promise<void> {
  try {
    const puter = (await loadPuter()) as PuterLike & { auth: { signOut?: () => unknown } }
    await puter.auth.signOut?.()
  } catch {
    /* nichts zu trennen */
  }
}

/** Ob die KI sofort benutzbar ist (Anthropic-Schlüssel vorhanden oder Puter-Konto schon angelegt). */
export async function isAiReady(): Promise<boolean> {
  if (getAiConfig().provider !== 'puter') return true
  try {
    return (await loadPuter()).auth.isSignedIn()
  } catch {
    return false
  }
}

/** Fehlertext aus einer Puter-Antwort verständlich machen. */
export function describePuterError(e: unknown): AiError {
  if (e instanceof AiError) return e
  const err = e as { error?: { message?: string; code?: string } | string; message?: string; code?: string; status?: number }
  const msg = typeof err?.error === 'object' ? (err.error?.message ?? '') : typeof err?.error === 'string' ? err.error : (err?.message ?? '')
  const code = (typeof err?.error === 'object' ? err.error?.code : err?.code) ?? ''
  const both = `${msg} ${code}`
  if (/insufficient|credit|usage|limit|quota/i.test(both)) {
    return new AiError('Dein kostenloses KI-Kontingent bei Puter ist aufgebraucht. Versuch es später nochmal oder nutze einen eigenen Schlüssel (Einstellungen → KI).', 'rate')
  }
  if (/auth|unauthor|sign.?in|token|401|403/i.test(both) || err?.status === 401) {
    return new AiError('Du bist beim KI-Dienst nicht angemeldet. Klicke auf „KI aktivieren“ und versuche es nochmal.', 'auth')
  }
  return new AiError(msg ? `Die KI hat einen Fehler gemeldet: ${msg}` : 'Die KI hat nicht geantwortet. Versuch es nochmal.', 'other')
}

/** Text aus einer Puter-Antwort holen (normalisiertes Format oder Format des Herstellers). */
export function puterText(res: unknown): string {
  if (typeof res === 'string') return res
  const r = res as { message?: { content?: unknown }; text?: string }
  const content = r?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((b) => (typeof b === 'string' ? b : ((b as { text?: string })?.text ?? ''))).join('\n')
  return r?.text ?? ''
}

async function callPuter(system: string, content: Block[], maxTokens: number): Promise<string> {
  const puter = await loadPuter()
  if (!puter.auth.isSignedIn()) throw new AiError('Die KI ist noch nicht aktiviert. Klicke auf „KI aktivieren“.', 'auth')
  const images = content.flatMap((b) => (b.type === 'image' ? [`data:${b.source.media_type};base64,${b.source.data}`] : []))
  const text = content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n\n')
  const prompt = `${system}\n\n${text}`
  let last: AiError | null = null
  for (const model of PUTER_MODELS) {
    try {
      const opts = { model, max_tokens: maxTokens }
      const res = images.length ? await puter.ai.chat(prompt, images, opts) : await puter.ai.chat(prompt, opts)
      const out = puterText(res)
      if (out.trim()) return out
      last = new AiError('Die KI hat eine leere Antwort geliefert.', 'format')
    } catch (e) {
      last = describePuterError(e)
      // Bei fehlender Anmeldung oder leerem Kontingent hilft ein anderes Modell nicht
      if (last.kind === 'auth' || last.kind === 'rate') throw last
    }
  }
  throw last ?? new AiError('Die KI hat nicht geantwortet.')
}

async function callAnthropic(system: string, content: Block[], maxTokens: number): Promise<string> {
  const cfg = getAiConfig()
  let res: Response
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
    })
  } catch {
    throw new AiError('Keine Verbindung zur KI. Bist du online?', 'network')
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? ''
    } catch {
      /* ignore */
    }
    if (res.status === 401 || res.status === 403) throw new AiError('Der API-Schlüssel wurde abgelehnt. Prüfe ihn in den Einstellungen.', 'auth')
    if (res.status === 429) throw new AiError('Zu viele Anfragen oder Guthaben aufgebraucht. Warte kurz oder prüfe dein Konto.', 'rate')
    throw new AiError(`Die KI hat einen Fehler gemeldet (${res.status}). ${detail}`.trim())
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n')
}

async function call(system: string, content: Block[], maxTokens = 4096): Promise<string> {
  return getAiConfig().provider === 'anthropic' ? callAnthropic(system, content, maxTokens) : callPuter(system, content, maxTokens)
}

/** Holt das erste JSON-Objekt/-Array aus einer Antwort, auch wenn Text oder Code-Zäune drumherum stehen. */
export function extractJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.search(/[{[]/)
  if (start < 0) throw new AiError('Die Antwort der KI war nicht lesbar.', 'format')
  const open = body[start]
  const close = open === '{' ? '}' : ']'
  const end = body.lastIndexOf(close)
  if (end <= start) throw new AiError('Die Antwort der KI war unvollständig.', 'format')
  try {
    return JSON.parse(body.slice(start, end + 1)) as T
  } catch {
    throw new AiError('Die Antwort der KI konnte nicht gelesen werden. Versuch es nochmal.', 'format')
  }
}

const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')

export function normalizeAiVocab(raw: unknown): AiVocab {
  const obj = (Array.isArray(raw) ? { items: raw } : raw) as { title?: unknown; items?: unknown }
  const items: AiItem[] = []
  const seen = new Set<string>()
  for (const r of Array.isArray(obj.items) ? obj.items : []) {
    const it = r as Record<string, unknown>
    const front = clean(it.front)
    const back = clean(it.back)
    if (!front || !back || seen.has(front.toLowerCase())) continue
    seen.add(front.toLowerCase())
    const example = clean(it.example)
    const exampleDe = clean(it.exampleDe)
    items.push({ front, back, ...(example && exampleDe ? { example, exampleDe } : {}), ...(clean(it.note) ? { note: clean(it.note) } : {}) })
  }
  return { title: clean(obj.title) || 'Neues Set', items }
}

const SYSTEM_EXTRACT = `Du hilfst Schülern beim Vokabellernen. Du bekommst Fotos oder Scans von Seiten aus einem Französisch-Schulbuch.
Aufgabe: Zieh alle Vokabeln heraus und liefere sie als lernbare Karten.
Regeln:
- Antworte NUR mit JSON, ohne Text davor oder danach, in diesem Format:
  {"title": "kurzer Titel, z. B. Unité 3 – Vokabeln", "items": [{"front": "...", "back": "...", "example": "...", "exampleDe": "..."}]}
- "front" ist immer das Französische, "back" immer die deutsche Bedeutung – auch wenn im Buch die Spalten vertauscht sind.
- Nomen mit Artikel (le/la/l'/les), Verben im Infinitiv, Wendungen vollständig. Lies Akzente korrekt (é è ê à ç ù ô î œ …).
- Nimm nur echte Vokabeln. Lass Überschriften, Seitenzahlen, Grammatikkästen, Aufgabenstellungen und Dialoge weg.
- "example"/"exampleDe": Steht im Buch ein Beispielsatz zu dem Wort, nimm ihn. Sonst erfinde einen kurzen, einfachen französischen Satz (höchstens 10 Wörter), der das Wort enthält, mit deutscher Übersetzung.
- Keine Duplikate. Wenn etwas nicht lesbar ist, lass es weg statt zu raten.`

/** Aus Seitenbildern (base64, JPEG) Vokabelkarten erzeugen. `hint` schränkt ein, z. B. "nur Lektion 3" oder "nur Verben". */
export async function extractVocabFromImages(images: string[], hint?: string, onProgress?: (done: number, total: number) => void): Promise<AiVocab> {
  const all: AiItem[] = []
  let title = ''
  // Je Anfrage höchstens 3 Seiten: genauer und weniger Abbrüche bei langen Antworten
  const chunks: string[][] = []
  for (let i = 0; i < images.length; i += 3) chunks.push(images.slice(i, i + 3))
  let done = 0
  onProgress?.(0, chunks.length)
  for (const chunk of chunks) {
    const content: Block[] = chunk.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }))
    content.push({ type: 'text', text: hint?.trim() ? `Zusätzlicher Hinweis vom Schüler, bitte beachten: ${hint.trim()}` : 'Bitte alle Vokabeln dieser Seiten.' })
    const text = await call(SYSTEM_EXTRACT, content, 8000)
    const vocab = normalizeAiVocab(extractJson<unknown>(text))
    if (!title) title = vocab.title
    for (const it of vocab.items) if (!all.some((x) => x.front.toLowerCase() === it.front.toLowerCase())) all.push(it)
    onProgress?.(++done, chunks.length)
  }
  return { title: title || 'Neues Set', items: all }
}

const SYSTEM_ENRICH = `Du hilfst Schülern beim Vokabellernen (Französisch → Deutsch, Klassen 7–10).
Du bekommst eine Liste von Vokabeln. Ergänze zu jeder Vokabel einen kurzen, einfachen französischen Beispielsatz (höchstens 10 Wörter, der das Wort wirklich enthält) mit deutscher Übersetzung und – wenn sinnvoll – einen kurzen Merktipp auf Deutsch (Eselsbrücke, Wortfamilie, Genus).
Antworte NUR mit JSON: {"items":[{"front":"…","example":"…","exampleDe":"…","note":"…"}]} – "front" unverändert übernehmen.`

/** Fehlende Beispielsätze und Merktipps ergänzen. */
export async function enrichItems(items: { front: string; back: string }[]): Promise<Record<string, { example: string; exampleDe: string; note?: string }>> {
  const out: Record<string, { example: string; exampleDe: string; note?: string }> = {}
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    const list = batch.map((b) => `${b.front} = ${b.back}`).join('\n')
    const text = await call(SYSTEM_ENRICH, [{ type: 'text', text: list }], 6000)
    const raw = extractJson<{ items?: { front?: string; example?: string; exampleDe?: string; note?: string }[] }>(text)
    for (const r of raw.items ?? []) {
      const front = clean(r.front)
      const example = clean(r.example)
      const exampleDe = clean(r.exampleDe)
      if (front && example && exampleDe) out[front.toLowerCase()] = { example, exampleDe, ...(clean(r.note) ? { note: clean(r.note) } : {}) }
    }
  }
  return out
}

/** Kurzer Test, ob die KI funktioniert. */
export async function testConnection(): Promise<void> {
  await call('Antworte nur mit dem Wort OK.', [{ type: 'text', text: 'Test' }], 16)
}

/** Datei als JPEG-Base64 für die API vorbereiten (verkleinert, damit Anfragen klein bleiben). */
export async function blobToJpegBase64(blob: Blob, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AiError('Bild konnte nicht verarbeitet werden.')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const url = canvas.toDataURL('image/jpeg', 0.85)
  return url.slice(url.indexOf(',') + 1)
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Antwort im Gespräch (Lern-Coach). `system` enthält Rolle und Kontext, `messages` den bisherigen Verlauf. */
export async function chatCoach(system: string, messages: ChatMessage[]): Promise<string> {
  const history = messages.slice(-24)
  if (getAiConfig().provider === 'anthropic') {
    const cfg = getAiConfig()
    let res: Response
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: cfg.model, max_tokens: 1500, system, messages: history }),
      })
    } catch {
      throw new AiError('Keine Verbindung zur KI. Bist du online?', 'network')
    }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new AiError('Der API-Schlüssel wurde abgelehnt. Prüfe ihn in den Einstellungen.', 'auth')
      if (res.status === 429) throw new AiError('Zu viele Anfragen oder Guthaben aufgebraucht. Warte kurz oder prüfe dein Konto.', 'rate')
      throw new AiError(`Die KI hat einen Fehler gemeldet (${res.status}).`)
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const out = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n')
    if (!out.trim()) throw new AiError('Die KI hat eine leere Antwort geliefert.', 'format')
    return out
  }
  const puter = await loadPuter()
  if (!puter.auth.isSignedIn()) throw new AiError('Die KI ist noch nicht aktiviert. Sende die Nachricht nochmal, dann wird sie aktiviert.', 'auth')
  let last: AiError | null = null
  for (const model of PUTER_MODELS) {
    try {
      const res = await puter.ai.chat([{ role: 'system', content: system }, ...history], { model, max_tokens: 1500 })
      const out = puterText(res)
      if (out.trim()) return out
      last = new AiError('Die KI hat eine leere Antwort geliefert.', 'format')
    } catch (e) {
      last = describePuterError(e)
      if (last.kind === 'auth' || last.kind === 'rate') throw last
    }
  }
  throw last ?? new AiError('Die KI hat nicht geantwortet.')
}
