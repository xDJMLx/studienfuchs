import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Plus, Right } from '../../components/ui/Icons'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { activeDecks, cardRefs } from '../../lib/decks'
import { levelOfSolid, subjectStats } from '../../lib/progress'
import { isDue } from '../../lib/srs'
import { HELP_SUBJECTS } from '../../lib/subjects'
import { useStore } from '../../store/useStore'

/**
 * Fächer: Im Unterricht lernst du, hier übst du. „Meine Fächer“ zeigen Level und was fällig ist;
 * weitere Fächer fügst du mit einem Tipp hinzu. Fächer mit Stapeln gehören automatisch dazu.
 */
export function FaecherPage() {
  const outfit = useStore((s) => s.outfit)
  const sets = useStore((s) => s.sets)
  const addedUnits = useStore((s) => s.addedUnits)
  const cards = useStore((s) => s.cards)
  const mySubjects = useStore((s) => s.mySubjects)
  const toggleSubject = useStore((s) => s.toggleSubject)

  const { stats, due, withDecks } = useMemo(() => {
    const decks = activeDecks({ sets, addedUnits: addedUnits ?? [] })
    const refs = cardRefs(decks)
    const now = new Date()
    const dueBy: Record<string, number> = {}
    for (const r of refs) if (isDue(cards[r.item.id], now)) dueBy[r.deck.subject] = (dueBy[r.deck.subject] ?? 0) + 1
    return { stats: subjectStats(decks, cards), due: dueBy, withDecks: new Set(decks.map((d) => d.subject)) }
  }, [sets, addedUnits, cards])

  const mine = HELP_SUBJECTS.filter((s) => (mySubjects ?? []).includes(s.id) || withDecks.has(s.id))
  const others = HELP_SUBJECTS.filter((s) => !mine.some((m) => m.id === s.id))
  // Fächer mit fälligen Karten zuerst
  const ordered = [...mine].sort((a, b) => (due[b.id] ?? 0) - (due[a.id] ?? 0))

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

      {ordered.length > 0 ? (
        <StaggerList className="grid grid-cols-2 gap-3" stagger={0.04}>
          {ordered.map((s) => {
            const st = stats[s.id]
            const lv = levelOfSolid(st?.solid ?? 0)
            return (
              <ItemLi key={s.id}>
                <Link to={`/faecher/${s.id}`} className="card press flex h-full flex-col gap-2.5 p-3.5" style={{ boxShadow: '0 4px 0 var(--shade-line)' }} aria-label={`${s.name}, Level ${lv.level}`}>
                  <span className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: s.c, boxShadow: `0 3px 0 ${s.s}` }} aria-hidden>
                      <HelpSubjectIcon id={s.id} ink={s.c} size={30} />
                    </span>
                    {(due[s.id] ?? 0) > 0 && <span className="rounded-full bg-brand-strong px-2 py-0.5 text-[12px] font-black text-on-brand">{due[s.id]}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-extrabold leading-tight">{s.name}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">{st?.total ? `${st.total} Karten · ${st.solid} sitzen` : s.blurb}</span>
                  </span>
                  <span>
                    <span className="mb-1 flex items-center justify-between text-[11px] font-extrabold text-muted">
                      <span>Level {lv.level} · {lv.name}</span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(4, Math.round(lv.pct * 100))}%`, background: s.c }} />
                    </span>
                  </span>
                </Link>
              </ItemLi>
            )
          })}
        </StaggerList>
      ) : (
        <Item>
          <p className="mb-4 rounded-2xl bg-snow p-4 text-sm leading-relaxed text-muted">Tippe unten auf die Fächer, die du hast. Dann stehen sie hier mit deinem Level, und du kannst Stapel und Arbeiten anlegen.</p>
        </Item>
      )}

      {others.length > 0 && (
        <Item>
          <h2 className="mb-2 mt-6 text-lg font-extrabold">{ordered.length ? 'Weitere Fächer' : 'Welche Fächer hast du?'}</h2>
          <ul className="flex flex-wrap gap-2">
            {others.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => toggleSubject(s.id)} className="press flex items-center gap-2 rounded-2xl border-2 border-line bg-surface py-1.5 pl-1.5 pr-3 text-[14px] font-extrabold hover:bg-snow" aria-label={`${s.name} hinzufügen`}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: s.c }}>
                    <HelpSubjectIcon id={s.id} ink={s.c} size={20} />
                  </span>
                  {s.name}
                  <Plus size={14} className="text-sky-dark" />
                </button>
              </li>
            ))}
          </ul>
        </Item>
      )}

      <Item>
        <Link to="/kalender" className="card press mt-6 flex items-center gap-3 p-3.5">
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Kalender</span>
            <span className="block text-sm text-muted">Arbeiten und Tests aller Fächer auf einen Blick.</span>
          </span>
          <Right size={16} className="text-muted" />
        </Link>
      </Item>
    </Stagger>
  )
}
