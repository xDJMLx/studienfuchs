import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '../../lib/feedback'
import { Mascot } from '../mascot/Mascot'

interface State {
  error: Error | null
}

/** Eine Seiten-Datei ließ sich nicht laden (schlechtes Netz, oder es gibt eine neuere Version und die alte Datei ist weg). */
export const isLoadError = (e: Error | null): boolean => !!e && /dynamically imported module|Importing a module script|Failed to fetch|Load failed|ChunkLoadError|Unable to preload/i.test(`${e.name} ${e.message}`)

/** Lädt die App frisch (ohne alte Zwischenspeicher). Der Lernfortschritt liegt im Browser und bleibt erhalten. */
async function reloadFresh() {
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    /* kein Cache-Speicher */
  }
  const url = new URL(location.href)
  url.searchParams.set('v', Date.now().toString(36))
  location.replace(url.toString())
}

/** Fängt Darstellungsfehler ab: statt weißem Bildschirm gibt es eine verständliche Meldung und einen Weg zurück. */
export class ErrorBoundary extends Component<{ children: ReactNode; /** Ändert sich der Wert (z. B. die Seite), verschwindet die Fehlermeldung wieder */ resetKey?: string }, State> {
  state: State = { error: null }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Darstellungsfehler', error, info.componentStack)
    logError(error.message, error.stack)
  }

  render() {
    if (!this.state.error) return this.props.children
    if (isLoadError(this.state.error)) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center bg-bg px-6 py-12 text-center" role="alert">
          <Mascot mood="think" size={110} />
          <h1 className="mt-4 text-2xl font-bold">Die Seite konnte nicht laden</h1>
          <p className="mt-2 max-w-sm text-muted">Vielleicht ist die Verbindung kurz weg, oder es gibt eine neue Version der App. Dein Fortschritt ist sicher auf diesem Gerät.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {/* React merkt sich eine fehlgeschlagene Seite: nur ein frisches Laden holt sie wirklich neu */}
            <button className="btn btn-primary press" onClick={() => void reloadFresh()} autoFocus>Neu laden</button>
            <button className="btn btn-ghost press" onClick={() => { window.location.hash = '#/'; this.setState({ error: null }) }}>Zur Startseite</button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-bg px-6 py-12 text-center" role="alert">
        <Mascot mood="sad" size={110} />
        <h1 className="mt-4 text-2xl font-bold">Hier ist etwas schiefgelaufen</h1>
        <p className="mt-2 max-w-sm text-muted">Dein Fortschritt ist nicht verloren, er liegt sicher auf diesem Gerät. Versuch es noch einmal oder geh zur Startseite.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-primary press" onClick={() => window.location.reload()}>Seite neu laden</button>
          <button
            className="btn btn-ghost press"
            onClick={() => {
              window.location.hash = '#/'
              this.setState({ error: null })
            }}
          >
            Zur Startseite
          </button>
          <button
            className="btn btn-ghost press"
            onClick={() => {
              window.location.hash = '#/settings/feedback'
              this.setState({ error: null })
            }}
          >
            Fehler melden
          </button>
        </div>
        <details className="mt-8 max-w-md text-left text-xs text-muted">
          <summary className="cursor-pointer text-center">Technische Details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-snow p-3">{this.state.error.message}</pre>
        </details>
      </div>
    )
  }
}
