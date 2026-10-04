import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Right } from '../../components/ui/Icons'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { activeDecks, cardRefs } from '../../lib/decks'
import { isDue } from '../../lib/srs'
import { HELP_SUBJECTS } from '../../lib/subjects'
import { useStore } from '../../store/useStore'

/**
 * Fächer: Im Unterricht lernst du, hier übst du. Jedes Fach hat Karten-Stapel, Arbeiten mit Termin und KI-Hilfe.
 * Fächer, in denen schon Stapel liegen, stehen oben.
 */
export function FaecherPage() {
  const outfit = useStore((s) => s.outfit)
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const cards = useStore((s) => s.cards)

  const stats = useMemo(() => {
    const decks = activeDecks({ sets, addedUnits: addedUnits ?? [] })
    const refs = cardRefs(decks)
    const now = new Date()
    return Object.fromEntries(
      HELP_SUBJECTS.map((s) => [
        s.id,
        { decks: decks.filter((d) => d.subject === s.id).length, cards: refs.filter((r) => r.deck.subject === s.id).length, due: refs.filter((r) => r.deck.subject === s.id && isDue(cards[r.item.id], now)).length },
      ]),
    )
  }, [sets, addedUnits, cards])

  const ordered = useMemo(() => [...HELP_SUBJECTS].sort((a, b) => (stats[b.id].decks > 0 ? 1 : 0) - (stats[a.id].decks > 0 ? 1 : 0)), [stats])

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8" stagger={0.06}>
      <Item>
        <div className="mb-5 flex items-center gap-4">
          <Mascot size={64} mood="happy" blink outfit={outfit} />
          <div className="min-w-0 flex-1">
            <h1 className="page-title">Fächer</h1>
            <p className="text-muted">Im Unterricht lernst du, hier übst du.</p>
          </div>
        </div>
      </Item>

      <StaggerList className="grid grid-cols-2 gap-3" stagger={0.04}>
        {ordered.map((s) => {
          const st = stats[s.id]
          return (
            <ItemLi key={s.id}>
              <Link to={`/faecher/${s.id}`} className="card press flex h-full flex-col gap-2.5 p-3.5" style={{ boxShadow: '0 4px 0 var(--shade-line)' }} aria-label={`${s.name}: ${s.blurb}`}>
                <span className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: s.c, boxShadow: `0 3px 0 ${s.s}` }} aria-hidden>
                    <HelpSubjectIcon id={s.id} ink={s.c} size={30} />
                  </span>
                  {st.due > 0 && <span className="rounded-full bg-brand-strong px-2 py-0.5 text-[12px] font-black text-on-brand">{st.due}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-extrabold leading-tight">{s.name}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{st.cards > 0 ? `${st.decks} ${st.decks === 1 ? 'Stapel' : 'Stapel'} · ${st.cards} Karten` : s.blurb}</span>
                </span>
                <Right size={14} className="self-end text-muted" />
              </Link>
            </ItemLi>
          )
        })}
      </StaggerList>
    </Stagger>
  )
}
