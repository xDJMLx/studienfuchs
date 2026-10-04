import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { decodeDeck, type SharedDeck } from '../../lib/shareDeck'
import { helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'

/** Ein geteilter Stapel: ansehen und als eigene Kopie speichern. */
export function DeckImportPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const code = params.get('d') ?? ''
  const [deck, setDeck] = useState<SharedDeck | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    decodeDeck(code)
      .then((d) => alive && setDeck(d))
      .catch((e) => alive && setError(e instanceof Error && e.message ? e.message : 'Der Link konnte nicht gelesen werden.'))
    return () => {
      alive = false
    }
  }, [code])

  const save = () => {
    if (!deck) return
    const subject = helpSubject(deck.subject) ? deck.subject : 'franzoesisch'
    const id = useStore.getState().addSet(deck.title, deck.items, { subject, lang: deck.lang, both: deck.both })
    navigate(`/stapel/${id}`, { replace: true })
  }

  if (error)
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <h1 className="page-title mb-2">Link nicht lesbar</h1>
        <p className="mb-5 text-muted">{error} Bitte lass dir den Link noch einmal schicken.</p>
        <Link to="/" className="btn btn-primary press">Zur Startseite</Link>
      </div>
    )
  if (!deck) return <div role="status" aria-label="Lädt" className="flex min-h-[40vh] items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand" /></div>

  const sub = helpSubject(deck.subject)
  return (
    <div className="mx-auto max-w-2xl px-4 py-5 lg:py-8">
      <p className="text-sm font-bold text-muted">Geteilte Karteikarten</p>
      <h1 className="page-title">{deck.title}</h1>
      <p className="mb-4 mt-1 text-muted">{deck.items.length} Karten{sub ? ` · ${sub.name}` : ''}</p>
      <p className="mb-4 rounded-xl bg-snow p-3 text-sm text-muted">Du bekommst eine eigene Kopie. Dein Lernstand bleibt bei dir, und du kannst die Karten danach ändern.</p>
      <ul className="mb-5 grid gap-2">
        {deck.items.slice(0, 8).map((i, k) => (
          <li key={k} className="card px-4 py-2.5">
            <span className="block whitespace-pre-wrap font-bold">{i.front}</span>
            <span className="block whitespace-pre-wrap text-sm text-muted">{i.back}</span>
          </li>
        ))}
        {deck.items.length > 8 && <li className="px-1 text-sm text-muted">… und {deck.items.length - 8} weitere Karten</li>}
      </ul>
      <div className="flex gap-3">
        <Link to="/" className="btn btn-ghost press">Nicht speichern</Link>
        <button className="btn btn-primary press flex-1" onClick={save}>Karteikarten speichern</button>
      </div>
    </div>
  )
}
