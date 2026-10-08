import { BUILD_ID } from './updates'

/**
 * Rückmeldungen: Fehler melden, Ideen schicken und (nur wenn man es einschaltet) anonyme Nutzungsdaten teilen.
 * Gesendet wird nie etwas im Hintergrund, ohne dass der Nutzer es eingeschaltet hat, und nie Lerninhalte, Namen oder Texte aus der App:
 * nur Version, Gerätetyp, Zähler (wie viele Karten, Runden, Fehler) und die letzten Fehlermeldungen.
 *
 * Wohin es geht: `FEEDBACK_URL` (Cloudflare Worker, siehe relay/README.md) oder VITE_FEEDBACK_URL. Ohne Adresse öffnet „Senden“
 * das Teilen-Fenster des Geräts, damit der Bericht per Nachricht beim Entwickler landet.
 */
export const DEFAULT_FEEDBACK_URL = ''
export const FEEDBACK_URL: string = ((import.meta.env.VITE_FEEDBACK_URL as string | undefined) ?? DEFAULT_FEEDBACK_URL).trim()

const ERR_KEY = 'studienfuchs-errors'
const USE_KEY = 'studienfuchs-usage'
const OPT_KEY = 'studienfuchs-usage-optin'
const ID_KEY = 'studienfuchs-anon-id'
const LAST_KEY = 'studienfuchs-usage-last'
const WEEK = 7 * 86_400_000

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* Speicher nicht verfügbar */
  }
}

// ---------- Fehlerprotokoll ----------

export interface LoggedError {
  at: string
  where: string
  message: string
  stack?: string
}

/** Merkt sich die letzten Fehler (nur auf diesem Gerät), damit ein Bericht erklären kann, was schiefging. */
export function logError(message: string, stack?: string, where = location.hash || '#/'): void {
  const list = read<LoggedError[]>(ERR_KEY, [])
  list.push({ at: new Date().toISOString(), where, message: message.slice(0, 240), ...(stack ? { stack: stack.split('\n').slice(0, 4).join('\n').slice(0, 400) } : {}) })
  write(ERR_KEY, list.slice(-15))
  track('fehler')
}
export const recentErrors = (): LoggedError[] => read<LoggedError[]>(ERR_KEY, [])
export const clearErrors = (): void => write(ERR_KEY, [])

let installed = false
/** Hängt sich einmal an die Fehlerereignisse des Browsers. */
export function installErrorLog(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (e) => logError(e.message || 'Fehler', (e.error as Error | undefined)?.stack))
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | string | undefined
    logError(typeof r === 'string' ? r : (r?.message ?? 'Abgelehntes Versprechen'), typeof r === 'object' ? r?.stack : undefined)
  })
}

// ---------- Zähler (nur lokal, geteilt nur mit Einwilligung) ----------

interface Usage {
  counts: Record<string, number>
  since: string
}
const usage = (): Usage => read<Usage>(USE_KEY, { counts: {}, since: new Date().toISOString() })

/** Zählt ein Ereignis hoch (zum Beispiel „runde“, „karten-ki“). Es werden nur Zähler gespeichert, keine Inhalte. */
export function track(event: string, n = 1): void {
  const u = usage()
  u.counts[event] = (u.counts[event] ?? 0) + n
  write(USE_KEY, u)
}
export const usageCounts = (): Record<string, number> => usage().counts

export const usageOptIn = (): boolean => read<boolean>(OPT_KEY, false) === true
export const setUsageOptIn = (on: boolean): void => write(OPT_KEY, on)

/** Eine zufällige Kennung, damit dieselbe Person nicht doppelt zählt. Kein Name, keine Verbindung zu einem Konto. */
export function anonId(): string {
  let id = read<string>(ID_KEY, '')
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('')
    write(ID_KEY, id)
  }
  return id
}

// ---------- Bericht ----------

export type FeedbackKind = 'fehler' | 'idee' | 'lob'
export const KIND_LABEL: Record<FeedbackKind, string> = { fehler: 'Fehler', idee: 'Idee', lob: 'Lob' }

export interface AppSnapshot {
  grade?: number
  subjects?: number
  sets?: number
  cards?: number
  arbeiten?: number
  untis?: boolean
  mascot?: string
  theme?: string
}

/** Technische Angaben zum Gerät und zur App. Keine Inhalte. */
export function deviceInfo(snapshot: AppSnapshot = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  return {
    version: BUILD_ID,
    seite: typeof location !== 'undefined' ? location.hash || '#/' : '',
    gerät: nav?.userAgent ?? '',
    sprache: nav?.language ?? '',
    fenster: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}` : '',
    installiert: typeof window !== 'undefined' && !!window.matchMedia?.('(display-mode: standalone)').matches,
    online: nav?.onLine ?? true,
    ...snapshot,
  }
}

export interface Report {
  art: FeedbackKind
  nachricht: string
  /** Wie man den Absender erreicht (freiwillig) */
  kontakt?: string
  technik?: ReturnType<typeof deviceInfo> & { fehler: LoggedError[] }
  zähler?: Record<string, number>
  id: string
  zeit: string
}

export function buildReport(input: { kind: FeedbackKind; message: string; contact?: string; withTech: boolean; snapshot?: AppSnapshot }): Report {
  return {
    art: input.kind,
    nachricht: input.message.trim().slice(0, 2000),
    ...(input.contact?.trim() ? { kontakt: input.contact.trim().slice(0, 120) } : {}),
    ...(input.withTech ? { technik: { ...deviceInfo(input.snapshot), fehler: recentErrors() }, zähler: usageCounts() } : {}),
    id: anonId(),
    zeit: new Date().toISOString(),
  }
}

/** Der Bericht als lesbarer Text (zum Teilen oder Kopieren). */
export function reportText(r: Report): string {
  const lines = [`Studienfuchs · ${KIND_LABEL[r.art]}`, '', r.nachricht]
  if (r.kontakt) lines.push('', `Kontakt: ${r.kontakt}`)
  if (r.technik) {
    const t = r.technik
    lines.push('', '— Technik —', `Version ${t.version} · Seite ${t.seite}`, `${t.fenster} · ${t.sprache} · ${t.installiert ? 'installiert' : 'im Browser'}`, t.gerät)
    if (t.fehler.length) lines.push('', 'Letzte Fehler:', ...t.fehler.slice(-5).map((e) => `${e.at.slice(11, 19)} ${e.where}: ${e.message}`))
  }
  return lines.join('\n')
}

export type SendResult = 'gesendet' | 'geteilt' | 'kopiert' | 'abgebrochen' | 'fehler'

/**
 * Schickt den Bericht ab: mit eingestellter Adresse direkt, sonst über das Teilen-Fenster des Geräts (oder in die Zwischenablage).
 * `doFetch` und `share` sind austauschbar, damit sich alle Wege testen lassen.
 */
export async function sendReport(
  r: Report,
  opts: { url?: string; doFetch?: typeof fetch; share?: (data: ShareData) => Promise<void>; copy?: (text: string) => Promise<void> } = {},
): Promise<SendResult> {
  const url = opts.url ?? FEEDBACK_URL
  if (url) {
    try {
      const res = await (opts.doFetch ?? fetch)(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r) })
      return res.ok ? 'gesendet' : 'fehler'
    } catch {
      return 'fehler'
    }
  }
  const text = reportText(r)
  const share = opts.share ?? (typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (d: ShareData) => navigator.share(d) : undefined)
  if (share) {
    try {
      await share({ title: 'Studienfuchs-Rückmeldung', text })
      return 'geteilt'
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'abgebrochen'
    }
  }
  try {
    await (opts.copy ?? ((t: string) => navigator.clipboard.writeText(t)))(text)
    return 'kopiert'
  } catch {
    return 'fehler'
  }
}

// ---------- Anonyme Nutzungsdaten (nur mit Einwilligung) ----------

/** Wöchentlich höchstens einmal: schickt die Zähler, falls der Nutzer es eingeschaltet hat und eine Adresse eingestellt ist. */
export async function maybeSendUsage(snapshot: AppSnapshot = {}, now = Date.now(), opts: { url?: string; doFetch?: typeof fetch } = {}): Promise<boolean> {
  const url = opts.url ?? FEEDBACK_URL
  if (!url || !usageOptIn()) return false
  if (now - read<number>(LAST_KEY, 0) < WEEK) return false
  const body = { art: 'nutzung', id: anonId(), zeit: new Date(now).toISOString(), technik: { ...deviceInfo(snapshot), fehler: [] as LoggedError[] }, zähler: usageCounts() }
  try {
    const res = await (opts.doFetch ?? fetch)(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) return false
    write(LAST_KEY, now)
    write(USE_KEY, { counts: {}, since: new Date(now).toISOString() })
    return true
  } catch {
    return false
  }
}
