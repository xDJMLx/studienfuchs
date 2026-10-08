import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Fr } from '../../components/exercises/common'
import { ChipTabs } from '../../components/ui/controls'
import { Karteikasten, WeeklyReport } from '../profile/ProfileExtras'
import { Repeat, Right } from '../../components/ui/Icons'
import { BackLink } from '../../components/ui/BackLink'
import { CountUp, Item as FadeItem, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { activeDecks } from '../../lib/decks'
import { SegmentedBar, ProgressRing } from '../../components/ui/widgets'
import { isDue, masteryOf } from '../../lib/srs'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'

/** Alle bekannten Items (Kurs + eigene Sets) nach ID. */
export function useItemIndex(): Map<string, Item> {
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  return useMemo(() => {
    // Alles, was geübt wird: eigene Stapel aller Fächer und die hinzugefügten Kurs-Einheiten
    const m = new Map<string, Item>()
    for (const d of activeDecks({ sets, addedUnits: addedUnits ?? [] })) for (const i of d.items) m.set(i.id, i)
    return m
  }, [sets, addedUnits])
}

/** Das aktuelle Fach in Zahlen und Worten: wie viele Wörter bzw. Themen es gibt und wie man sie nennt. */
export function useCourse(): { math: boolean; total: number; noun: string; Noun: string } {
  // Alle Karten, die geübt werden (jedes Fach)
  const total = useItemIndex().size
  return { math: false, total, noun: 'Karten', Noun: 'Karten' }
}

export function useLearned() {
  const cards = useStore((s) => s.cards)
  const index = useItemIndex()
  return useMemo(() => {
    const now = new Date()
    const learned = Object.keys(cards).flatMap((id) => {
      const item = index.get(id)
      return item ? [{ item, card: cards[id] }] : []
    })
    return {
      learned,
      due: learned.filter((l) => isDue(l.card, now)),
      byMastery: [1, 2].map((m) => learned.filter((l) => masteryOf(l.card) === m).length),
    }
  }, [cards, index])
}

/** Wann ein Wort wieder dran ist, in einfachen Worten. */
export function dueLabel(due: Date, now = new Date()): string {
  const diff = due.getTime() - now.getTime()
  if (diff <= 0) return 'jetzt fällig'
  const min = diff / 60000
  if (min < 60) return `in ${Math.max(1, Math.round(min))} Min.`
  const h = min / 60
  if (h < 24) return `in ${Math.round(h)} Std.`
  const d = Math.round(h / 24)
  return d === 1 ? 'morgen' : `in ${d} Tagen`
}

/** Alle Wörter, die gerade wiederholt werden sollten (Kurs und eigene Sets). */
export function useDue() {
  const { due, learned } = useLearned()
  const next = useMemo(() => {
    const future = learned.filter((l) => !isDue(l.card)).map((l) => new Date(l.card.due).getTime())
    return future.length ? new Date(Math.min(...future)) : null
  }, [learned])
  return { due, next, learnedCount: learned.length }
}

function Strength({ stability }: { stability: number }) {
  const level = stability >= 7 ? 3 : stability >= 2 ? 2 : 1
  return (
    <span className="flex items-end gap-0.5" role="img" aria-label={['schwach', 'mittel', 'stark'][level - 1]}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`w-1.5 rounded-sm ${n <= level ? (level === 3 ? 'bg-good' : level === 2 ? 'bg-gold' : 'bg-bad') : 'bg-snow'}`} style={{ height: 6 + n * 4 }} />
      ))}
    </span>
  )
}

type Filter = 'all' | 'due' | 'weak'

export function ReviewPage() {
  const navigate = useNavigate()
  const math = false
  const noun = 'Karten'
  const { learned, due, byMastery } = useLearned()
  const [filter, setFilter] = useState<Filter>('all')

  const courseTotal = useItemIndex().size
  const [learning, mastered] = byMastery
  const notStarted = Math.max(0, courseTotal - learning - mastered)

  const list = useMemo(() => {
    const sorted = [...learned].sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime())
    const f = filter === 'due' ? sorted.filter((l) => isDue(l.card)) : filter === 'weak' ? sorted.filter((l) => l.card.stability < 2) : sorted
    return f.slice(0, 40)
  }, [learned, filter])

  const header = (
    <FadeItem>
      <BackLink to="/practice" label="Üben" size={18} />
      <h1 className="page-title mb-1">Lernstand</h1>
      <p className="mb-6 text-muted">Karten kommen kurz bevor du sie vergessen würdest wieder dran. So bleiben sie dauerhaft hängen.</p>
    </FadeItem>
  )

  if (learned.length === 0) {
    return (
      <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
        {header}
        <FadeItem>
          <div className="card p-8 text-center">
            <p className="text-lg font-semibold">Noch nichts zu wiederholen</p>
            <p className="mx-auto mb-5 mt-1 max-w-sm text-muted">Übe ein paar Karten. Danach planen wir automatisch, wann du welche Karte wieder üben solltest.</p>
            <Link to="/" className="btn btn-primary press">Zur Startseite</Link>
          </div>
        </FadeItem>
      </Stagger>
    )
  }

  const solidPct = courseTotal ? mastered / courseTotal : 0

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8" stagger={0.08}>
      {header}

      <FadeItem>
        <section className="card mb-4 grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center gap-4">
            <ProgressRing pct={solidPct} size={96} stroke={9} color="var(--good)">
              <span className="text-lg font-bold"><CountUp to={Math.round(solidPct * 100)} suffix="%" /></span>
            </ProgressRing>
            <div className="sm:hidden">
              <p className="eyebrow">Alle Fächer</p>
              <p className="font-semibold">fest gelernt</p>
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1">Jetzt dran</p>
            <p className="text-3xl font-bold">
              <CountUp to={due.length} /> <span className="text-base font-medium text-muted">{due.length === 1 ? 'Karte' : 'Karten'}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {due.length > 0 ? (
                <button className="btn btn-primary press" onClick={() => navigate('/review/play')}>
                  <Repeat size={18} /> Wiederholung starten <Right size={14} />
                </button>
              ) : (
                <button className="btn btn-ghost press" onClick={() => navigate('/review/play?free=1')}>Trotzdem üben</button>
              )}
            </div>
            {due.length === 0 && <p className="mt-2 text-sm text-good-dark">Alles auf dem neuesten Stand.</p>}
          </div>
        </section>
      </FadeItem>

      <FadeItem>
        <section className="card mb-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Deine Karten</h2>
            <span className="text-sm text-muted">{courseTotal} {noun}</span>
          </div>
          <SegmentedBar
            parts={[
              { value: mastered, color: 'bg-good', label: 'Gefestigt' },
              { value: learning, color: 'bg-gold', label: 'Lernend' },
              { value: notStarted, color: 'bg-line', label: 'Noch nicht gelernt' },
            ]}
          />
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-good" />Gefestigt <b className="text-ink">{mastered}</b></li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" />Lernend <b className="text-ink">{learning}</b></li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-line" />Offen <b className="text-ink">{notStarted}</b></li>
          </ul>
        </section>
      </FadeItem>

      <FadeItem>
        <Karteikasten />
        <WeeklyReport />
      </FadeItem>

      <FadeItem>
        <section>
          <h2 className="mb-3 font-semibold">Deine {noun}</h2>
          <ChipTabs
            label="Filter"
            className="mb-3"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all' as Filter, label: 'Alle' },
              { value: 'due' as Filter, label: 'Fällig' },
              { value: 'weak' as Filter, label: 'Schwach' },
            ]}
          />
          <StaggerList key={filter} className="card divide-y divide-line overflow-hidden" stagger={0.03}>
            {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Keine {noun} in dieser Ansicht.</li>}
            {list.map(({ item, card }) => (
              <ItemLi key={item.id} className="flex items-center gap-4 px-4 py-3">
                <Strength stability={card.stability} />
                <div className="min-w-0 flex-1">
                  {math ? <span className="block truncate font-medium">{item.front}</span> : <Fr className="block truncate font-medium">{item.front}</Fr>}
                  <p className="truncate text-sm text-muted">{item.back}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${isDue(card) ? 'text-brand-dark' : 'text-muted'}`}>{dueLabel(new Date(card.due))}</span>
              </ItemLi>
            ))}
          </StaggerList>
        </section>
      </FadeItem>
    </Stagger>
  )
}
