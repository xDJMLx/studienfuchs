import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Back, Cards, Pencil, Star, Trash, Trophy } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { allCourseDecks, ownDeck, planToday } from '../../lib/decks'
import { deckStars } from '../../lib/progress'
import { deckLink, encodeDeck, MAX_LINK } from '../../lib/shareDeck'
import { masteryOf } from '../../lib/srs'
import { helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'
import { newRow, type Row } from '../upload/VocabTable'
import { ArbeitSheet } from './ArbeitSheet'
import { CardTable } from './CardTable'

/** Ein Stapel: üben, Karten ansehen und bearbeiten, für eine Arbeit einplanen. Kurs-Stapel (Französisch) sind nur zum Ansehen und Hinzufügen. */
export function DeckPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const sets = useStore((s) => s.sets)
  const cards = useStore((s) => s.cards)
  const addedUnits = useStore((s) => s.addedUnits)
  const arbeiten = useStore((s) => s.arbeiten)
  const { updateSet, deleteSet, toggleUnit } = useStore.getState()
  const [editing, setEditing] = useState<Row[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [arbeitSheet, setArbeitSheet] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  const set = sets.find((s) => s.id === deckId)
  const deck = useMemo(() => (set ? ownDeck(set) : allCourseDecks().find((d) => d.id === deckId)), [set, deckId])
  const isCourse = deck?.kind === 'course'
  const added = isCourse && (addedUnits ?? []).includes(deckId.slice(5))
  const plan = useMemo(() => (deck && (!isCourse || added) ? planToday([deck], arbeiten ?? [], cards) : null), [deck, isCourse, added, arbeiten, cards])
  if (!deck) return <Navigate to="/faecher" replace />

  const sub = helpSubject(deck.subject)
  const fr = deck.lang === 'fr'
  const startEdit = () => setEditing(deck.items.map((i) => newRow(i.front, i.back, { example: i.example, exampleDe: i.exampleDe, note: i.note })))
  const saveEdit = () => {
    if (!set) return
    const prev = new Map(set.items.map((i, idx) => [`${i.front}|${i.back}`, idx]))
    const items = (editing ?? [])
      .filter((r) => r.front.trim() && r.back.trim())
      .map((r, i) => {
        // Unveränderte Karten behalten ihre ID und damit ihren Lernfortschritt
        const old = prev.get(`${r.front.trim()}|${r.back.trim()}`)
        return {
          id: old !== undefined ? set.items[old].id : `${set.id}:n${Date.now().toString(36)}${i}`,
          front: r.front.trim(),
          back: r.back.trim(),
          ...(r.example?.trim() && r.exampleDe?.trim() ? { example: r.example.trim(), exampleDe: r.exampleDe.trim() } : {}),
          ...(r.note?.trim() ? { note: r.note.trim() } : {}),
        }
      })
    updateSet(set.id, { items })
    setEditing(null)
  }

  /** Link zum Stapel: Der Inhalt steckt im Link, ein Konto braucht es nicht. */
  const share = async () => {
    if (!set) return
    setShareMsg(null)
    const link = deckLink(await encodeDeck({ title: set.title, subject: set.subject, lang: set.lang, both: set.both, items: set.items }))
    if (link.length > MAX_LINK) {
      setShareMsg('Der Stapel ist für einen Link zu groß. Teile ihn in zwei kleinere Stapel auf oder nutze die Sicherung unter Profil.')
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: set.title, text: `Mein Stapel „${set.title}“ in Studienfuchs`, url: link })
        return
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(link)
      setShareMsg('Link kopiert. Schick ihn per Nachricht an dich selbst oder Freunde: Beim Öffnen können sie den Stapel speichern.')
    } catch {
      setShareMsg(link)
    }
  }

  const todayCount = plan ? Math.min(15, plan.due.length + plan.fresh.length) : 0
  const modes = [
    { modus: 'flip', label: 'Karteikarten', icon: <Cards size={22} /> },
    { modus: 'type', label: 'Tippen', icon: <Pencil size={22} /> },
    { modus: 'mix', label: 'Gemischt', icon: <Trophy size={22} /> },
  ]

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-5 lg:py-8" stagger={0.06}>
      <Item>
        <Link to={`/faecher/${deck.subject}`} className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
          <Back size={18} /> {sub?.name ?? 'Fächer'}
        </Link>
        <h1 className="page-title">{deck.title}</h1>
        <p className="mb-5 mt-1 flex flex-wrap items-center gap-x-2 text-muted">
          <span>{deck.items.length} Karten{deck.sub ? ` · ${deck.sub}` : ''}</span>
          <span className="flex text-gold" role="img" aria-label={`${deckStars(deck, cards)} von 3 Sternen`}>
            {[0, 1, 2].map((i) => (
              <Star key={i} size={18} className={i < deckStars(deck, cards) ? '' : 'opacity-25'} />
            ))}
          </span>
        </p>
      </Item>

      {isCourse && (
        <Item>
          <div className="card mb-5 p-5">
            <p className="mb-3 text-sm text-muted">{added ? 'Dieser Stapel ist beim Üben dabei: Neue Karten kommen Tag für Tag dazu, Gelerntes kommt zur Wiederholung.' : 'Füge den Stapel zum Üben hinzu, dann kommen seine Karten jeden Tag nach Plan dran.'}</p>
            <button type="button" className={`btn press w-full sm:w-64 ${added ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleUnit(deckId.slice(5))}>
              {added ? 'Wieder entfernen' : 'Zum Üben hinzufügen'}
            </button>
          </div>
        </Item>
      )}

      {plan && (
        <Item>
          <div className="card mb-5 p-5">
            <h2 className="mb-1 text-lg font-extrabold">Heute</h2>
            <p className="mb-3 text-sm text-muted">
              {plan.due.length > 0 && <>{plan.due.length} fällig · </>}
              {plan.fresh.length} neue Karten
            </p>
            <button className="btn btn-primary press w-full" disabled={deck.items.length === 0} onClick={() => navigate(`/ueben/los?deck=${encodeURIComponent(deck.id)}`)}>
              {todayCount > 0 ? 'Jetzt üben' : 'Trotzdem üben'}
            </button>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {modes.map((m) => (
                <Link key={m.modus} to={`/ueben/los?deck=${encodeURIComponent(deck.id)}&modus=${m.modus}`} className="press flex flex-col items-center gap-1 rounded-xl bg-snow px-2 py-2.5 text-center text-[13px] font-extrabold text-brand-dark hover:bg-brand-soft">
                  {m.icon}
                  {m.label}
                </Link>
              ))}
            </div>
          </div>
        </Item>
      )}

      {!isCourse && (
        <Item>
          <div className="card mb-5 p-5">
            <h2 className="mb-1 text-lg font-extrabold">Für eine Arbeit lernen</h2>
            <p className="mb-3 text-sm text-muted">Mit Datum verteilt die App die Karten so auf die Tage, dass du alles rechtzeitig kannst.</p>
            <button className="btn btn-ghost press" onClick={() => setArbeitSheet(true)}>Arbeit eintragen</button>
          </div>
        </Item>
      )}

      <Item>
        {editing ? (
          <div className="mb-5">
            <CardTable rows={editing} onChange={setEditing} lang={deck.lang} />
            <div className="mt-4 flex gap-3">
              <button className="btn btn-ghost press" onClick={() => setEditing(null)}>Abbrechen</button>
              <button className="btn btn-primary press flex-1" onClick={saveEdit}>Speichern</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Karten</h2>
              {!isCourse && <button className="press rounded-xl px-3 py-2 text-sm font-extrabold text-brand-dark hover:bg-brand-soft" onClick={startEdit}>Bearbeiten</button>}
            </div>
            <ul className="mb-6 grid gap-2">
              {deck.items.map((i) => {
                const m = masteryOf(cards[i.id])
                return (
                  <li key={i.id} className="card flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span lang={fr ? 'fr' : undefined} className="block whitespace-pre-wrap font-bold">{i.front}</span>
                      <span className="block whitespace-pre-wrap text-sm text-muted">{i.back}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${m === 2 ? 'bg-good-soft text-good-dark' : m === 1 ? 'bg-gold/20 text-gold-dark' : 'bg-snow text-muted'}`}>{m === 2 ? 'fest' : m === 1 ? 'lernt' : 'neu'}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Item>

      {set && !editing && (
        <Item>
          <div className="mb-4">
            <button type="button" className="btn btn-ghost press" onClick={share} disabled={set.items.length === 0}>Stapel teilen</button>
            {shareMsg && <p role="status" className="mt-2 break-all text-sm text-muted">{shareMsg}</p>}
          </div>
          <label className="mb-4 flex items-start gap-3 rounded-xl bg-snow p-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--sky)]" checked={deck.both} onChange={(e) => updateSet(set.id, { both: e.target.checked })} />
            <span>
              <b>Auch rückwärts abfragen</b>
              <span className="block text-muted">Manchmal kommt die Rückseite als Frage.</span>
            </span>
          </label>
          {confirmDelete ? (
            <div className="card p-4 text-center">
              <p className="mb-3 font-bold">Stapel und Lernfortschritt wirklich löschen?</p>
              <div className="flex gap-3">
                <button className="btn btn-ghost press flex-1" onClick={() => setConfirmDelete(false)}>Abbrechen</button>
                <button
                  className="btn btn-bad press flex-1"
                  onClick={() => {
                    deleteSet(set.id)
                    navigate(`/faecher/${deck.subject}`, { replace: true })
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          ) : (
            <button className="press flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted hover:text-bad-dark" onClick={() => setConfirmDelete(true)}>
              <Trash size={18} /> Stapel löschen
            </button>
          )}
        </Item>
      )}

      <ArbeitSheet open={arbeitSheet} onClose={() => setArbeitSheet(false)} subjectId={deck.subject} presetDeckId={deck.id} />
    </Stagger>
  )
}
