import { useDeferredValue, useMemo, useState } from 'react'
import { allItems, grades, itemMeta, units } from '../../content'
import { Fr, SpeakButton } from '../../components/exercises/common'
import { ChipTabs } from '../../components/ui/controls'
import { Check, Close, Search, Star } from '../../components/ui/Icons'
import { masteryOf } from '../../lib/srs'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { WordSheet } from './WordSheet'

type Status = 'all' | 'new' | 'learning' | 'mastered' | 'favorites'
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'new', label: 'Neu' },
  { value: 'learning', label: 'Lernend' },
  { value: 'mastered', label: 'Gefestigt' },
  { value: 'favorites', label: 'Merkliste' },
]
const PAGE = 60

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Lernstand eines Wortes als kleines Etikett mit Text (nicht nur Farbe). */
function StatusPill({ mastery }: { mastery: 0 | 1 | 2 }) {
  if (mastery === 0) return <span className="shrink-0 text-xs text-muted">neu</span>
  if (mastery === 1) return <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold-dark">lernt</span>
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-xs font-semibold text-good-dark">
      <Check size={11} /> fest
    </span>
  )
}

/** Wörterbuch: alle Wörter durchsuchen, nach Klasse, Einheit und Lernstand filtern, anhören und Details öffnen. */
export function WordsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const cards = useStore((s) => s.cards)
  const favorites = useStore((s) => s.favorites)
  const sets = useStore((s) => s.sets)
  const storedGrade = useStore((s) => s.grade)

  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [grade, setGrade] = useState<number | 'all'>(grades.includes(storedGrade) ? storedGrade : 'all')
  const [unitId, setUnitId] = useState('all')
  const [status, setStatus] = useState<Status>('all')
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState<Item | null>(null)

  const gradeUnits = useMemo(() => (grade === 'all' ? units : units.filter((u) => u.grade === grade)), [grade])

  const all = useMemo(() => {
    const rows: { item: Item; grade: number | null; unit: string }[] = []
    // Jedes Kurswort genau einmal (allItems enthält keine Wiederholungs- oder Testkopien)
    for (const item of allItems) {
      const meta = itemMeta.get(item.id)
      if (meta) rows.push({ item, grade: meta.unit.grade, unit: meta.unit.id })
    }
    for (const s of sets) for (const item of s.items) rows.push({ item, grade: null, unit: s.id })
    return rows
  }, [sets])

  const list = useMemo(() => {
    const q = norm(deferred.trim())
    const rank = (i: Item) => {
      const f = norm(i.front)
      const b = norm(i.back)
      if (f.startsWith(q) || b.startsWith(q)) return 0
      if (f.includes(q) || b.includes(q)) return 1
      return 2 // nur im Beispielsatz
    }
    const filtered = all.filter((r) => {
      if (grade !== 'all' && r.grade !== grade) return false
      if (unitId !== 'all' && r.unit !== unitId) return false
      const m = masteryOf(cards[r.item.id])
      if (status === 'new' && m !== 0) return false
      if (status === 'learning' && m !== 1) return false
      if (status === 'mastered' && m !== 2) return false
      if (status === 'favorites' && !favorites.includes(r.item.id)) return false
      if (!q) return true
      return norm(r.item.front).includes(q) || norm(r.item.back).includes(q) || norm(r.item.example ?? '').includes(q)
    })
    return q ? [...filtered].sort((a, b) => rank(a.item) - rank(b.item)) : filtered
  }, [all, deferred, grade, unitId, status, cards, favorites])

  return (
    <div className={embedded ? '' : 'mx-auto max-w-2xl px-4 py-6 lg:py-8'}>
      {!embedded && <h1 className="page-title">Wörter</h1>}
      <p className="mb-5 mt-1 text-muted">{all.length} Wörter und Wendungen zum Nachschlagen, Anhören und Merken.</p>

      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Search size={18} /></span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShown(PAGE)
          }}
          placeholder="Wort suchen …"
          aria-label="Wörter suchen"
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-11 pr-11 outline-none transition-shadow [&::-webkit-search-cancel-button]:hidden focus:border-brand focus:shadow-[0_0_0_4px_var(--brand-soft)]"
        />
        {query && (
          <button type="button" aria-label="Suche löschen" onClick={() => setQuery('')} className="press absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-snow text-muted hover:text-ink">
            <Close size={12} />
          </button>
        )}
      </div>

      <ChipTabs
        label="Klassenstufe"
        className="mb-2"
        value={grade}
        onChange={(g) => {
          setGrade(g)
          setUnitId('all')
          setShown(PAGE)
        }}
        options={[{ value: 'all' as const, label: 'Alle Klassen' }, ...grades.map((g) => ({ value: g, label: `Klasse ${g}` }))]}
      />
      <ChipTabs
        label="Lernstand"
        className="mb-3"
        value={status}
        onChange={(v) => {
          setStatus(v)
          setShown(PAGE)
        }}
        options={STATUS_OPTIONS}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <select
          value={unitId}
          onChange={(e) => {
            setUnitId(e.target.value)
            setShown(PAGE)
          }}
          aria-label="Einheit"
          className="max-w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium outline-none focus:border-brand"
        >
          <option value="all">Alle Einheiten</option>
          {gradeUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {grade === 'all' ? `Kl. ${u.grade} · ` : ''}{u.title}
            </option>
          ))}
          {sets.map((s) => (
            <option key={s.id} value={s.id}>Set: {s.title}</option>
          ))}
        </select>
        <p className="text-sm text-muted" aria-live="polite">{list.length} Treffer</p>
      </div>

      <p className="mb-2 text-xs text-muted">Lernstand: <b className="text-ink">neu</b> = noch nicht geübt · <b className="text-gold-dark">lernt</b> = wird gerade gelernt · <b className="text-good-dark">fest</b> = sitzt langfristig</p>

      <ul className="card divide-y divide-line overflow-hidden">
        {list.length === 0 && <li className="px-4 py-10 text-center text-muted">Nichts gefunden. Versuch es mit einem anderen Begriff oder Filter.</li>}
        {list.slice(0, shown).map(({ item }) => {
          const m = masteryOf(cards[item.id])
          const fav = favorites.includes(item.id)
          return (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <SpeakButton text={item.front} quiet />
              <button type="button" onClick={() => setSelected(item)} className="min-w-0 flex-1 py-1.5 text-left" aria-label={`${item.front}, Details öffnen`}>
                <Fr className="block truncate font-medium">{item.front}</Fr>
                <span className="block truncate text-sm text-muted">{item.back}</span>
              </button>
              {fav && <Star size={18} className="shrink-0 text-gold" />}
              <StatusPill mastery={m} />
            </li>
          )
        })}
      </ul>
      {list.length > shown && (
        <button className="btn btn-ghost press mx-auto mt-4 flex" onClick={() => setShown((n) => n + PAGE)}>
          Mehr anzeigen ({list.length - shown})
        </button>
      )}

      <WordSheet item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
