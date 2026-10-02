import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gradeStats, grades, isLessonDone, isRegular, units } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { Book, Plus, Right } from '../../components/ui/Icons'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { ProgressBar } from '../../components/ui/widgets'
import { isDue, masteryOf } from '../../lib/srs'
import type { VocabSet } from '../../lib/types'
import { useStore } from '../../store/useStore'

const COVERS = [
  'from-orange-400 to-amber-500',
  'from-rose-400 to-orange-500',
  'from-amber-500 to-yellow-500',
  'from-orange-500 to-red-500',
]

/** Name des Lehrwerks, an dem sich der Kurs einer Klasse orientiert (aus der Einheiten-Beschriftung, z. B. "À plus ! 1"). */
const bookOfGrade = (g: number): string | null => units.find((u) => u.grade === g)?.book?.split(' · ')[0] ?? null

/** Bücher: Kurse der App zu deinem Lehrwerk und deine eigenen Bücher aus Fotos oder selbst getippten Wörtern. */
export function SetsPage() {
  const navigate = useNavigate()
  const sets = useStore((s) => s.sets)
  const cards = useStore((s) => s.cards)
  const examDates = useStore((s) => s.examDates)
  const lessons = useStore((s) => s.lessons)
  const setGrade = useStore((s) => s.setGrade)

  const appBooks = useMemo(
    () =>
      grades.map((g) => {
        const regular = units.filter((u) => u.grade === g).flatMap((u) => u.lessons.filter(isRegular))
        return { grade: g, book: bookOfGrade(g), regular, stats: gradeStats(g) }
      }),
    [],
  )

  // Eigene Sets nach Buch gruppieren; Sets ohne Buch kommen in eine eigene Gruppe
  const groups = useMemo(() => {
    const map = new Map<string, VocabSet[]>()
    for (const s of sets) {
      const key = s.book?.trim() ?? ''
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return [...map.entries()].sort((a, b) => (a[0] === '' ? 1 : b[0] === '' ? -1 : a[0].localeCompare(b[0], 'de')))
  }, [sets])

  return (
    <Stagger className="mx-auto max-w-3xl px-4 py-6 lg:py-8" stagger={0.08}>
      <Item className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Bücher</h1>
          <p className="mt-1 text-muted">Kurse der App zu deinem Lehrwerk und deine eigenen Bücher.</p>
        </div>
        <Link to="/sets/new" className="btn btn-primary press"><Plus size={18} /> Buch hinzufügen</Link>
      </Item>

      {/* Kurse der App */}
      <Item>
        <h2 className="mb-3 text-lg font-semibold">In der App</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {appBooks.map((b, i) => {
            const done = b.regular.filter((l) => isLessonDone(l, lessons[l.id])).length
            return (
              <button
                key={b.grade}
                type="button"
                onClick={() => {
                  setGrade(b.grade)
                  navigate('/')
                }}
                className="card lift flex items-center gap-4 p-4 text-left"
              >
                <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl font-bold text-white ${COVERS[i % COVERS.length]}`}>{b.grade}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.book ?? `Französisch Klasse ${b.grade}`}</span>
                  <span className="block truncate text-sm text-muted">
                    Klasse {b.grade} · {b.stats.lessons} Lektionen · {b.stats.words} Wörter
                  </span>
                  <ProgressBar pct={b.regular.length ? done / b.regular.length : 0} className="mt-2" />
                </span>
                <Right size={16} className="shrink-0 text-muted" />
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-sm text-muted">
          Die Kurse folgen den Themen und der Reihenfolge des Buchs, die Wörter und Texte sind aber eigene. Die Schulbücher selbst darf eine App nicht enthalten (Urheberrecht). Dein Buch kommt über Fotos unten dazu.
        </p>
      </Item>

      {/* Eigene Bücher */}
      <Item className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Meine Bücher</h2>
        {sets.length === 0 ? (
          <Link to="/sets/new" className="lift flex flex-col items-center rounded-2xl border-2 border-dashed border-line bg-surface px-6 py-12 text-center">
            <span className="animate-float mb-4"><Mascot size={80} mood="happy" blink /></span>
            <p className="text-lg font-semibold">Dein Schulbuch hinzufügen</p>
            <p className="mt-1 max-w-sm text-muted">Vokabelseiten abfotografieren oder Wörter tippen, ein Kapitel nach dem anderen. Die App fragt dich dann so ab, dass du dir alles dauerhaft merkst.</p>
            <span className="btn btn-primary btn-shine mt-5">Buch anlegen</span>
          </Link>
        ) : (
          <div className="grid gap-8">
            {groups.map(([book, list]) => {
              const words = list.reduce((n, s) => n + s.items.length, 0)
              return (
                <section key={book || 'ohne'} aria-label={book || 'Einzelne Sets'}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Book size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold leading-tight">{book || 'Einzelne Sets'}</h3>
                      <p className="text-sm text-muted">{list.length} Kapitel · {words} Wörter</p>
                    </div>
                    <Link to={`/sets/new${book ? `?book=${encodeURIComponent(book)}` : ''}`} className="press flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold">
                      <Plus size={16} /> Kapitel
                    </Link>
                  </div>
                  <StaggerList className="grid gap-4 sm:grid-cols-2" stagger={0.06}>
                    {list.map((s, i) => {
                      const known = s.items.filter((it) => masteryOf(cards[it.id]) === 2).length
                      const started = s.items.filter((it) => cards[it.id]).length
                      const dueNow = s.items.filter((it) => isDue(cards[it.id])).length
                      return (
                        <ItemLi key={s.id}>
                          <Link to={`/sets/${s.id}`} className="card lift block overflow-hidden">
                            <div className={`flex h-20 items-end justify-between bg-gradient-to-br p-4 text-white ${COVERS[i % COVERS.length]}`}>
                              <span className="text-3xl font-bold leading-none opacity-90">{s.title.trim().charAt(0).toUpperCase() || '?'}</span>
                              {dueNow > 0 && <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-dark">{dueNow} fällig</span>}
                            </div>
                            <div className="p-4">
                              <h4 className="truncate font-semibold">{s.title}</h4>
                              <p className="mb-3 text-sm text-muted">
                                {s.items.length} Wörter{examDates[s.id] ? ` · Test am ${new Date(examDates[s.id]).toLocaleDateString('de-DE')}` : ''}
                              </p>
                              <ProgressBar pct={s.items.length ? known / s.items.length : 0} color="bg-good" />
                              <p className="mt-2 text-xs text-muted">{started} begonnen · {known} gefestigt</p>
                            </div>
                          </Link>
                        </ItemLi>
                      )
                    })}
                  </StaggerList>
                </section>
              )
            })}
          </div>
        )}
      </Item>
    </Stagger>
  )
}
