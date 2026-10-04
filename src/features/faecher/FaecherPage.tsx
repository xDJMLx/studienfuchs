import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Right } from '../../components/ui/Icons'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { HELP_SUBJECTS } from '../../lib/subjects'
import { useStore } from '../../store/useStore'

/**
 * Fächer: Hier gibt es keine Kurse. Was du in der Schule lernst, kannst du mit der KI vertiefen,
 * abfragen lassen und für Arbeiten üben. Französisch hat seinen eigenen Kurs im Lernpfad.
 */
export function FaecherPage() {
  const outfit = useStore((s) => s.outfit)
  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8" stagger={0.06}>
      <Item>
        <div className="mb-5 flex items-center gap-4">
          <Mascot size={64} mood="happy" blink outfit={outfit} />
          <div className="min-w-0 flex-1">
            <h1 className="page-title">Fächer</h1>
            <p className="text-muted">Du hattest eine Arbeit? Die KI hilft dir, den Stoff aus der Schule zu vertiefen.</p>
          </div>
        </div>
      </Item>

      <Item>
        <p className="mb-4 rounded-2xl bg-snow p-3.5 text-sm leading-relaxed text-muted">
          Hier lernst du nicht von vorn. Du sagst der KI, was ihr gerade durchnehmt, und sie erklärt, fragt dich ab und plant mit dir die Tage bis zur Arbeit. Das ersetzt keinen Unterricht, hilft aber, ihn zu festigen. Französisch lernst du im <Link to="/" className="font-semibold text-brand-dark underline">Lernpfad</Link>.
        </p>
      </Item>

      <StaggerList className="grid grid-cols-2 gap-3" stagger={0.04}>
        {HELP_SUBJECTS.map((s) => (
          <ItemLi key={s.id}>
            <Link
              to={`/faecher/${s.id}`}
              className="card press flex h-full flex-col gap-2.5 p-3.5"
              style={{ boxShadow: '0 4px 0 var(--shade-line)' }}
              aria-label={`${s.name}: ${s.blurb}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-[19px] font-black text-white" style={{ background: s.c, boxShadow: `0 3px 0 ${s.s}` }} aria-hidden>
                {s.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-extrabold leading-tight">{s.name}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{s.blurb}</span>
              </span>
              <Right size={14} className="self-end text-muted" />
            </Link>
          </ItemLi>
        ))}
      </StaggerList>
    </Stagger>
  )
}
