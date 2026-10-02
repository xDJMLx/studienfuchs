import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Close, Plus, Right, Sparkle, Target } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { Sheet } from '../../components/ui/Sheet'
import { ProgressBar } from '../../components/ui/widgets'
import { catchUpStatus, unitLabel } from '../../lib/catchup'
import { daysTo } from '../../lib/coach'
import { chapterOf } from '../../lib/books'
import { dayKey } from '../../lib/streak'
import { useBooks } from '../../store/useBooks'
import { useStore } from '../../store/useStore'

const dayText = (days: number) => (days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`)
const field = 'rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none focus:border-brand'
const longDate = (d: string) => new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })

/**
 * Bücher: die eigenen Schulbücher (nur Text, nur auf dem Gerät), Stand der Klasse und Klassenarbeiten mit Stoff.
 * Die KI kennt das Buch und den Stand, ohne dass man es ihr jedes Mal erklären muss.
 */
export function BooksPage() {
  const navigate = useNavigate()
  const { classUnit, catchUpTarget, catchUpAll, lessons, sets, examDates, setExamDate, grade } = useStore()
  const { books, exams, addBook, addExam, deleteExam } = useBooks()
  const status = classUnit && catchUpTarget ? catchUpStatus(classUnit, catchUpTarget, lessons, new Date(), catchUpAll) : null

  const [newOpen, setNewOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [bookGrade, setBookGrade] = useState(grade)

  const [adding, setAdding] = useState(false)
  const [pick, setPick] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')

  const ordered = useMemo(() => [...books].sort((a, b) => b.lastUsed.localeCompare(a.lastUsed)), [books])

  // Klassenarbeiten: Stoff aus einem Buch oder (wie bisher) eine eigene Liste
  const rows = useMemo(() => {
    const now = new Date()
    const fromBooks = exams.flatMap((e) => {
      const b = books.find((x) => x.id === e.bookId)
      return b ? [{ key: e.id, kind: 'book' as const, title: `${b.title}, Seite ${e.from}${e.to > e.from ? `–${e.to}` : ''}`, sub: `${b.pages.filter((p) => p.num !== null && p.num >= e.from && p.num <= e.to).length} Seiten gespeichert`, date: e.date, days: daysTo(e.date, now), bookId: b.id, bookTitle: b.title, from: e.from, to: e.to }] : []
    })
    const fromSets = Object.entries(examDates).flatMap(([id, d]) => {
      const s = sets.find((x) => x.id === id)
      return s ? [{ key: id, kind: 'set' as const, title: s.title, sub: `${s.items.length} Wörter`, date: d, days: daysTo(d, now), setId: id }] : []
    })
    return [...fromBooks, ...fromSets].filter((r) => r.days >= 0).sort((a, b) => a.days - b.days)
  }, [exams, books, examDates, sets])

  const createBook = () => {
    const id = addBook(title, bookGrade)
    setNewOpen(false)
    setTitle('')
    navigate(`/books/${id}`)
  }

  const canAdd = pick && date && (pick.startsWith('set:') || (Number(from) >= 1 && Number(to) >= Number(from)))
  const saveExam = () => {
    if (!canAdd) return
    if (pick.startsWith('set:')) setExamDate(pick.slice(4), date)
    else addExam({ bookId: pick.slice(5), date, from: Number(from), to: Number(to) })
    setAdding(false)
    setPick('')
    setFrom('')
    setTo('')
    setDate('')
  }

  const prepare = (r: (typeof rows)[number]) => {
    if (r.kind === 'set') return navigate(`/sets/${r.setId}`)
    navigate(`/coach?q=${encodeURIComponent(`Ich schreibe am ${longDate(r.date)} eine Klassenarbeit. Stoff: „${r.bookTitle}“, Seite ${r.from} bis ${r.to}. Mach mir einen Lernplan für die Tage bis dahin und frag mich danach Vokabeln daraus ab.`)}`)
  }

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8" stagger={0.07}>
      <Item>
        <h1 className="page-title">Bücher</h1>
        <p className="mb-6 mt-1 text-muted">Deine eigenen Schulbücher. Die KI weiß dann, wo ihr gerade seid und was im Buch steht.</p>
      </Item>

      {/* Stand der Klasse im Kurs (Aufholen) */}
      <Item>
        <Link to="/catchup" className="card lift flex items-center gap-4 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
            <Target size={24} />
          </span>
          <span className="min-w-0 flex-1">
            {classUnit ? (
              <>
                <span className="block truncate font-semibold">{unitLabel(classUnit)}</span>
                {status && !status.finished ? (
                  <>
                    <span className="block text-sm text-muted">
                      Noch {status.remaining} Lektionen bis {new Date(catchUpTarget!).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}, heute {status.toGoToday}.
                    </span>
                    <ProgressBar pct={status.total ? (status.total - status.remaining) / status.total : 1} className="mt-2" />
                  </>
                ) : (
                  <span className="block text-sm text-muted">{status?.finished ? 'Du bist auf dem Stand deiner Klasse.' : 'Aufholplan anlegen oder Stand ändern.'}</span>
                )}
              </>
            ) : (
              <>
                <span className="block font-semibold">Wo ist deine Klasse im Kurs?</span>
                <span className="block text-sm text-muted">Sag es der App, und sie macht dir einen Tagesplan zum Aufholen.</span>
              </>
            )}
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </Link>
      </Item>

      {/* Bücherregal */}
      <Item className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meine Bücher</h2>
          {books.length > 0 && (
            <button type="button" onClick={() => setNewOpen(true)} className="press flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold">
              <Plus size={16} /> Buch
            </button>
          )}
        </div>
        {books.length === 0 ? (
          <div className="card flex flex-col items-center p-6 text-center">
            <Mascot size={84} mood="think" blink />
            <p className="mt-3 font-semibold">Noch kein Buch</p>
            <p className="mt-1 max-w-xs text-sm text-muted">Lege dein Französischbuch an und fotografiere die Seiten, die ihr gerade durchnehmt. Der Text bleibt auf deinem Handy, die KI nutzt ihn für Tests und Erklärungen.</p>
            <button type="button" className="btn btn-primary press mt-4" onClick={() => setNewOpen(true)}>
              <Plus size={18} /> Buch anlegen
            </button>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {ordered.map((b) => {
              const here = chapterOf(b, b.position)
              return (
                <li key={b.id}>
                  <Link to={`/books/${b.id}`} className="press flex items-center gap-3 px-4 py-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-lg font-bold text-brand-dark">{b.title.trim().charAt(0).toUpperCase() || '?'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{b.title}</span>
                      <span className="block truncate text-sm text-muted">
                        Klasse {b.grade} · {b.pages.length} Seiten{b.position !== null ? ` · Stand S. ${b.position}${here ? `, ${here.title}` : ''}` : ''}
                      </span>
                    </span>
                    <Right size={16} className="shrink-0 text-muted" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Item>

      {/* Klassenarbeiten */}
      <Item className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Klassenarbeiten</h2>
          {(books.length > 0 || sets.length > 0) && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="press flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold">
              <Plus size={16} /> Termin
            </button>
          )}
        </div>

        {adding && (
          <div className="card mb-3 grid gap-3 p-4">
            <label className="grid gap-1 text-sm font-medium">
              Was kommt dran?
              <select value={pick} onChange={(e) => setPick(e.target.value)} className={field}>
                <option value="">Wählen …</option>
                {books.map((b) => (
                  <option key={b.id} value={`book:${b.id}`}>
                    Buch: {b.title}
                  </option>
                ))}
                {sets.map((s) => (
                  <option key={s.id} value={`set:${s.id}`}>
                    Liste: {s.title}
                  </option>
                ))}
              </select>
            </label>
            {pick.startsWith('book:') && (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-medium">
                  Von Seite
                  <input inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, '').slice(0, 3))} className={`${field} text-center`} />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Bis Seite
                  <input inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, '').slice(0, 3))} className={`${field} text-center`} />
                </label>
              </div>
            )}
            <label className="grid gap-1 text-sm font-medium">
              Wann ist die Arbeit?
              <input type="date" min={dayKey()} value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost press" onClick={() => setAdding(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary press flex-1" disabled={!canAdd} onClick={saveExam}>
                Eintragen
              </button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="rounded-2xl bg-snow p-4 text-sm text-muted">Noch keine Termine. Trage Datum und Seiten ein, dann plant die KI die Tage bis zur Arbeit mit dir.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center gap-2 pr-2">
                <button type="button" onClick={() => prepare(r)} className="press flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
                  <span className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-center leading-none ${r.days <= 2 ? 'bg-bad-soft text-bad-dark' : 'bg-brand-soft text-brand-dark'}`}>
                    <span className="text-lg font-bold">{r.days}</span>
                    <span className="text-[10px] font-semibold">{r.days === 1 ? 'Tag' : 'Tage'}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {dayText(r.days)} · {longDate(r.date)} · {r.sub}
                    </span>
                  </span>
                  {r.kind === 'book' && <Sparkle size={18} className="shrink-0 text-brand-dark" />}
                </button>
                {r.kind === 'book' && (
                  <Link to={`/exam/new?type=arbeit&book=${r.bookId}&from=${r.from}&to=${r.to}`} className="press shrink-0 rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand-dark">
                    Probe
                  </Link>
                )}
                <button
                  type="button"
                  aria-label={`Termin für ${r.title} löschen`}
                  onClick={() => (r.kind === 'book' ? deleteExam(r.key) : setExamDate(r.key, null))}
                  className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-bad"
                >
                  <Close size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {rows.some((r) => r.kind === 'book') && <p className="mt-2 text-xs text-muted">Antippen öffnet die KI mit einem Lernplan für diese Arbeit.</p>}
      </Item>

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="Neues Buch">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Titel
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. À plus! 2" className={field} autoFocus />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Klasse
            <select value={bookGrade} onChange={(e) => setBookGrade(Number(e.target.value))} className={field}>
              {[7, 8, 9, 10].map((g) => (
                <option key={g} value={g}>
                  Klasse {g}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted">Gespeichert wird nur der erkannte Text deiner Fotos, und nur auf diesem Gerät. Fragst du die KI, gehen die dazu passenden Seiten an den KI-Anbieter.</p>
          <button type="button" className="btn btn-primary press" disabled={!title.trim()} onClick={createBook}>
            Anlegen
          </button>
        </div>
      </Sheet>
    </Stagger>
  )
}
