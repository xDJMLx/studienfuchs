import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Mascot } from '../mascot/Mascot'

interface State {
  error: Error | null
}

/** Fängt Darstellungsfehler ab: statt weißem Bildschirm gibt es eine verständliche Meldung und einen Weg zurück. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Darstellungsfehler', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
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
        </div>
        <details className="mt-8 max-w-md text-left text-xs text-muted">
          <summary className="cursor-pointer text-center">Technische Details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-snow p-3">{this.state.error.message}</pre>
        </details>
      </div>
    )
  }
}
